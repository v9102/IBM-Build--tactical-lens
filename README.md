# Tactical Lens

An AI web app that explains **why** moments happen in World Cup matches — not the stats
("what"), but the causes: *why a tactical shape collapsed, why momentum shifted, why a VAR
decision was correct.* Pick a moment and three IBM Granite agents stream their analysis over a
live, interactive pitch diagram.

Built for the **IBM Builders Challenge** using **IBM Granite (watsonx.ai) + LangChain + Docling**.

## How it works

```
Next.js (3000) ──HTTP / SSE──► FastAPI (8000)
                                GET  /matches                7 curated moments
                                GET  /matches/{id}           full moment + pitch positions
                        ◄─SSE── POST /analyze                all 3 agents
                        ◄─SSE── POST /analyze/{id}/{key}     regenerate one agent
                        ◄─SSE── POST /analyze/compare        side-by-side comparison
                                GET  /analyze/{id}/export    markdown export

per agent: Docling RAG (optional) → IBM Granite → token stream over SSE
```

**3 AI agents** run in sequence, each with rich prompts (few-shot, chain-of-thought, 200+ words):

| Agent | Focus | Output |
|-------|-------|--------|
| **Tactical Analyst** | Formation, pressing traps, spacing, overloads | Analysis + key factors + confidence score |
| **Momentum Analyst** | When & why the game tilted (subs, fatigue, crowd) | Analysis + key factors + confidence score |
| **Decision Explainer** | VAR/referee calls in plain language + Law citations | Analysis + key factors + confidence score |

## 7 Preset Moments

| # | Moment | Year | Tactical story |
|---|--------|------|----------------|
| 1 | Götze's extra-time winner | 2014 | Fresh substitutes exploit a fatigued deep block |
| 2 | France 4-3 Argentina | 2018 | Mbappé's pace shreds a high defensive line |
| 3 | Messi vs Mbappé final | 2022 | Tactical battle with three VAR penalties |
| 4 | Germany 7-1 Brazil | 2014 | Defensive collapse without captain + star |
| 5 | Belgium 3-2 Japan | 2018 | The fastest counter-attack in WC history |
| 6 | Morocco 1-0 Portugal | 2022 | Low-block masterclass — first African semi-finalist |
| 7 | Argentina 3-0 Croatia | 2022 | Messi's dribble dismantles Croatia's shape |

## Features

- **Interactive pitch** — hover any player for name + role + highlight status; movement arrows with labels
- **Live streaming** — tokens appear word-by-word as Granite generates them over SSE
- **Confidence scores** — pre-flight estimate + parsed confidence from model output
- **Key Factors** — structured bullet points extracted from each agent's analysis
- **Regenerate** — re-run any single agent without re-running all three
- **Compare** — side-by-side analysis of two moments with synchronized panels
- **Export** — download match data as markdown
- **Copy to clipboard** — per-panel copy button
- **7 curated moments** — covering different tactical situations across 3 tournaments
- **Mock mode** — fully offline demo with no watsonx credentials needed

## Tech

- **Frontend** — Next.js 15 (App Router) + Tailwind v4 + TypeScript
- **Backend** — FastAPI + LangChain + IBM Granite (`langchain-ibm` / `ChatWatsonx`)
- **RAG** (optional) — Docling + langchain-docling → InMemoryVectorStore (IBM `slate` embeddings)
- **AI** — IBM Granite 3 8B Instruct (configurable model ID)
- **Streaming** — Server-Sent Events (SSE) from FastAPI to Next.js

## Run it locally

### 1. Backend (port 8000)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate         # macOS/Linux
pip install -r requirements.txt
cp .env.example .env              # fill in watsonx credentials (or use mock mode)
uvicorn app.main:app --port 8000
```

**Mock mode** (no credentials needed, canned text):
```bash
MOCK=1 RAG=0 uvicorn app.main:app --port 8000
```

### 2. Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev          # open http://localhost:3000
```

Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` if your backend isn't on `:8000`.

## Test

```bash
cd backend
MOCK=1 python -m pytest    # 3 tests — agents, streaming, RAG filtering
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/matches` | List all curated moments |
| GET | `/matches/{id}` | Full moment data (pitch, players, arrows) |
| POST | `/analyze` | Run all 3 agents, SSE stream |
| POST | `/analyze/{id}/{agent_key}` | Regenerate a single agent |
| POST | `/analyze/compare` | Compare two moments side-by-side |
| GET | `/analyze/{id}/export` | Markdown export of match data |

## 3-minute demo script

1. **Open** `localhost:3000` — show the 7 moment cards with skeleton loading animation.
2. **Click "Germany's 7-1 demolition of Brazil"** — the pitch renders instantly; hover a player to see
   their role; the three panels stream in sequence, each with a confidence bar and key factors.
3. **Call out the framing:** stats tell you Kroos scored; Tactical Lens tells you *why* — Silva's
   absence broke Brazil's defensive coordination and Fernandinho's positional discipline collapsed.
4. **Click "Regenerate"** on the Tactical Analyst panel — only that agent re-runs, the others stay.
5. **Back → Compare two moments** — select "Belgium's 3-2 comeback" vs "Morocco's defensive
   masterclass" to see contrasting tactical approaches side-by-side.
6. **Close on the stack:** IBM Granite + LangChain multi-agent orchestration + Docling RAG,
   structured output with confidence scoring, streaming SSE, interactive SVG pitch.

## Notes

- Match data is curated JSON — schema matches StatsBomb open data format for future enrichment.
- Vector store is in-memory (rebuilt at startup) — swap for a persistent store if corpus grows.
- CORS allows `localhost:3000` and `3001` — update for deployment.
