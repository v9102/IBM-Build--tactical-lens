import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .agents import AGENTS, agent_inputs, build_chain
from .config import settings
from .data import load_moments, match_summary
from .rag import build_store, load_reports, retrieve_context
from .schemas import AnalyzeRequest
from .watsonx import get_embeddings, get_llm

MOMENTS: dict[str, dict] = {}
STORE = None  # InMemoryVectorStore or None if RAG disabled/failed


@asynccontextmanager
async def lifespan(_: FastAPI):
    global MOMENTS, STORE
    MOMENTS = load_moments()
    if settings.rag:
        try:
            docs = load_reports()
            STORE = build_store(docs, get_embeddings())
            print(f"[rag] indexed {len(docs)} report chunks")
        except Exception as e:  # Docling/embeddings hiccup must not kill the demo
            print(f"[rag] disabled — ingest failed: {e}")
            STORE = None
    yield


app = FastAPI(title="Tactical Lens", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/matches")
def list_matches():
    return [match_summary(m) for m in MOMENTS.values()]


@app.get("/matches/{match_id}")
def get_match(match_id: str):
    if match_id not in MOMENTS:
        raise HTTPException(404, "unknown match")
    return MOMENTS[match_id]


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


async def _analyze_stream(moment: dict):
    llm = get_llm()
    for agent in AGENTS:
        yield _sse({"type": "agent_start", "key": agent["key"], "label": agent["label"]})
        context, sources = retrieve_context(STORE, moment["id"], agent["query"])
        chain = build_chain(agent, llm)
        try:
            async for token in chain.astream(agent_inputs(agent, moment, context)):
                if token:
                    yield _sse({"type": "token", "key": agent["key"], "content": token})
        except Exception as e:
            yield _sse({"type": "error", "key": agent["key"], "content": str(e)})
        yield _sse({"type": "agent_done", "key": agent["key"], "sources": sources})
    yield _sse({"type": "done"})


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    moment = MOMENTS.get(req.match_id)
    if moment is None:
        raise HTTPException(404, "unknown match")
    return StreamingResponse(_analyze_stream(moment), media_type="text/event-stream")
