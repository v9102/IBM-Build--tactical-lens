# Tactical Lens

An AI web app that explains **why** moments happen in World Cup matches — not the stats
("what"), but the causes: *why momentum shifted, why a VAR call was right, what changed
tactically.* Pick a preset moment and three IBM Granite agents break it down over a live pitch
diagram.

Built for the **IBM Builders Challenge** using **IBM Granite (watsonx.ai) + LangChain + Docling**.

## How it works

```
Next.js (3000) ──HTTP / SSE──► FastAPI (8000)
 match selector               GET  /matches        list the 3 preset moments
 pitch SVG + 3 panels         GET  /matches/{id}   full moment + pitch positions
 live streaming text   ◄─SSE─ POST /analyze        stream the 3 agents' analysis
                                                     │
                          per agent: Docling RAG retrieve → Granite → token stream
```

Three agents run in sequence, each grounded in a tactical report via RAG:

1. **Tactical Analyst** — formation, pressing, spacing
2. **Momentum Analyst** — when & why the game tilted
3. **Decision Explainer** — VAR / referee calls in plain language

Preset moments: **Götze's 2014 final winner**, **France 4-3 Argentina (2018)**, **Messi vs
Mbappé in the 2022 final**.

## Tech

- **Frontend** — Next.js (App Router) + Tailwind, pure-SVG pitch, SSE streaming consumer.
- **Backend** — FastAPI, **LangChain** orchestration, **IBM Granite** via `langchain-ibm`
  (`ChatWatsonx`), **Docling** RAG (`langchain-docling` → in-memory vector store, IBM `slate`
  embeddings).

## Run it locally

### 1. Backend (port 8000)

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate           # Windows.  macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt  # heavy: pulls Docling + torch on first install
cp .env.example .env             # then fill in your watsonx.ai credentials
uvicorn app.main:app --reload --port 8000
```

Get `WATSONX_APIKEY` / `WATSONX_PROJECT_ID` from your [watsonx.ai](https://dataplatform.cloud.ibm.com/wx)
project. Confirm the model ids in `.env` exist in your region (e.g. a Granite instruct model and a
`slate` embedding model).

**No credentials yet?** Run fully offline with fake models:

```bash
MOCK=1 RAG=0 uvicorn app.main:app --port 8000   # canned text, no watsonx, no Docling
```

### 2. Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev          # open http://localhost:3000
```

If your backend isn't on `localhost:8000`, set `NEXT_PUBLIC_API_URL` in `frontend/.env.local`.

## Test

Offline pipeline check — asserts all 3 agents produce output and RAG retrieval is match-filtered.
No watsonx credentials needed:

```bash
cd backend
MOCK=1 python -m pytest
```

## 3-minute demo script

1. **Open** `localhost:3000` — show the three moment cards.
2. **Click "Götze's extra-time winner"** — the pitch renders instantly; the three panels stream
   in sequence (*queued → analyzing → done*), each citing a tactical report.
3. **Call out the framing:** stats tell you Schürrle assisted Götze; Tactical Lens tells you *why*
   the goal happened — fresh legs and movement against a tired, deep back line.
4. **Back → "Messi vs Mbappé 2022"** — let the **Decision Explainer** walk through the three
   penalties in plain language (the strongest "why a call was right" example).
5. **Close on the stack:** Granite + LangChain + Docling RAG, multi-agent, streaming, end-to-end.

## Project layout

```
backend/   FastAPI + LangChain agents + Docling RAG + curated match data
frontend/  Next.js selector, results page, SVG pitch, SSE consumer
```

## Notes / next steps

- Match data is **curated JSON** per moment (reliable for a demo). The schema is the same shape
  StatsBomb open event data could populate later.
- Docling currently ingests markdown reports; it parses PDF/DOCX identically — drop a PDF into
  `backend/data/reports/` (named `<match_id>.pdf`) to demo that.
- Vector store is in-memory (rebuilt at startup) — fine for this corpus; swap for a persisted
  store if it grows.
