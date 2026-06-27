import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse

from .agents import AGENTS, agent_inputs, build_chain, parse_output
from .config import settings
from .data import load_moments, match_summary
from .rag import build_store, load_reports, retrieve_context
from .schemas import AnalyzeRequest, CompareRequest, RegenerateRequest
from .watsonx import get_embeddings, get_llm

MOMENTS: dict[str, dict] = {}
STORE = None


# ── helpers ──────────────────────────────────────────────────────────

def _agent_map() -> dict[str, dict]:
    return {a["key"]: a for a in AGENTS}


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


def _estimate_confidence(context: str) -> int:
    """Heuristic pre-flight confidence based on RAG context quality."""
    if not context or context == "(no documents retrieved)":
        return 40
    words = len(context.split())
    if words > 100:
        return 80
    if words > 50:
        return 65
    return 50


async def _stream_agent(agent: dict, moment: dict):
    """Stream a single agent's output, returning the full text for parsing."""
    lm = get_llm()
    context, sources = retrieve_context(STORE, moment["id"], agent["query"])
    pre_conf = _estimate_confidence(context)

    yield _sse({
        "type": "agent_start",
        "key": agent["key"],
        "label": agent["label"],
        "confidence": pre_conf,
    })

    chain = build_chain(agent, lm)
    tokens: list[str] = []
    try:
        async for token in chain.astream(agent_inputs(agent, moment, context)):
            if token:
                tokens.append(token)
                yield _sse({"type": "token", "key": agent["key"], "content": token})
    except Exception as e:
        yield _sse({"type": "error", "key": agent["key"], "content": str(e)})
        return

    full = "".join(tokens)
    meta = parse_output(agent["key"], full)

    yield _sse({
        "type": "agent_done",
        "key": agent["key"],
        "sources": sources,
        "confidence": meta.get("confidence", pre_conf),
        "key_factors": meta.get("key_factors", []),
    })


# ── lifespan ─────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(_: FastAPI):
    global MOMENTS, STORE
    MOMENTS = load_moments()
    if settings.rag:
        try:
            docs = load_reports()
            STORE = build_store(docs, get_embeddings())
            print(f"[rag] indexed {len(docs)} report chunks")
        except Exception as e:
            print(f"[rag] disabled — ingest failed: {e}")
            STORE = None
    yield


app = FastAPI(title="Tactical Lens", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── GET /matches ─────────────────────────────────────────────────────

@app.get("/matches")
def list_matches():
    return [match_summary(m) for m in MOMENTS.values()]


# ── GET /matches/{id} ────────────────────────────────────────────────

@app.get("/matches/{match_id}")
def get_match(match_id: str):
    if match_id not in MOMENTS:
        raise HTTPException(404, "unknown match")
    return MOMENTS[match_id]


# ── POST /analyze (all 3 agents) ─────────────────────────────────────

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    moment = MOMENTS.get(req.match_id)
    if moment is None:
        raise HTTPException(404, "unknown match")

    async def stream():
        for agent in AGENTS:
            async for event in _stream_agent(agent, moment):
                yield event
        yield _sse({"type": "done"})

    return StreamingResponse(stream(), media_type="text/event-stream")


# ── POST /analyze/{match_id}/{agent_key}  (regenerate one agent) ─────

@app.post("/analyze/{match_id}/{agent_key}")
async def analyze_single(match_id: str, agent_key: str):
    moment = MOMENTS.get(match_id)
    if moment is None:
        raise HTTPException(404, "unknown match")
    agent = _agent_map().get(agent_key)
    if agent is None:
        raise HTTPException(404, f"unknown agent '{agent_key}'")

    async def stream():
        async for event in _stream_agent(agent, moment):
            yield event
        yield _sse({"type": "done"})

    return StreamingResponse(stream(), media_type="text/event-stream")


# ── POST /analyze/compare  (two matches side-by-side) ────────────────

@app.post("/analyze/compare")
async def compare(req: CompareRequest):
    m1 = MOMENTS.get(req.match_id_1)
    m2 = MOMENTS.get(req.match_id_2)
    if m1 is None:
        raise HTTPException(404, f"unknown match '{req.match_id_1}'")
    if m2 is None:
        raise HTTPException(404, f"unknown match '{req.match_id_2}'")

    async def stream():
        yield _sse({"type": "compare_start", "match_1": req.match_id_1, "match_2": req.match_id_2})
        for agent in AGENTS:
            label = agent["label"]
            yield _sse({"type": "compare_agent_start", "key": agent["key"], "label": label})
            # Match 1
            yield _sse({"type": "compare_side_start", "key": agent["key"], "side": 1, "match_id": req.match_id_1})
            async for event in _stream_agent(agent, m1):
                yield event
            yield _sse({"type": "compare_side_done", "key": agent["key"], "side": 1})
            # Match 2
            yield _sse({"type": "compare_side_start", "key": agent["key"], "side": 2, "match_id": req.match_id_2})
            async for event in _stream_agent(agent, m2):
                yield event
            yield _sse({"type": "compare_side_done", "key": agent["key"], "side": 2})
            yield _sse({"type": "compare_agent_done", "key": agent["key"]})
        yield _sse({"type": "done"})

    return StreamingResponse(stream(), media_type="text/event-stream")


# ── GET /analyze/{match_id}/export ───────────────────────────────────

@app.get("/analyze/{match_id}/export")
async def export(match_id: str):
    moment = MOMENTS.get(match_id)
    if moment is None:
        raise HTTPException(404, "unknown match")

    teams = moment.get("teams", {})
    lines = [
        f"# Tactical Lens — {moment.get('title', 'Match Analysis')}",
        "",
        f"**{teams.get('home', '?')} vs {teams.get('away', '?')}** — minute {moment.get('minute', '?')}",
        "",
        f"_{moment.get('summary', '')}_",
        "",
        "---",
        "",
        "_Run the POST /analyze endpoint to generate live AI analysis for this match._",
        "",
        "## Match Facts",
        f"```json\n{json.dumps(moment.get('facts', {}), indent=2, ensure_ascii=False)}\n```",
        "",
        "---",
        "",
        "*Generated by Tactical Lens — AI-powered football analysis with IBM Granite*",
    ]
    return PlainTextResponse("\n".join(lines), media_type="text/markdown")
