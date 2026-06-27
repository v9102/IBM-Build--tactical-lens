"""3 analyst agents — detailed prompts, few-shot, chain-of-thought, structured output.

Each agent uses the same chain (prompt | llm | str) and streams tokens as plain
text.  After generation the backend parses the full output for structured metadata
(confidence, key_factors) so the frontend can display confidence bars and factor
lists *without* blocking the live-typing UX.
"""
import json
import re

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

# ---------------------------------------------------------------------------
# Agent definitions
# ---------------------------------------------------------------------------

AGENTS = [
    # ── Tactical Analyst ──────────────────────────────────────────────
    {
        "key": "tactical",
        "label": "Tactical Analyst",
        "query": "formation shape pressing line spacing width overload trigger",
        "system": (
            "You are an elite football tactical analyst with 20 years of coaching experience. "
            "You read formations, pressing triggers, defensive shape, and spatial manipulation "
            "the way a grandmaster reads a chess board.\n\n"

            "YOUR TASK:\n"
            "Given a match moment (teams, minute, summary, pitch layout, facts) and "
            "optional reference notes, explain the TACTICAL cause of the moment.\n"
            "Focus on: formation choices, pressing traps, spacing and width, "
            "defensive line height, overloads, and structural mismatches.\n\n"

            "YOUR OUTPUT MUST INCLUDE:\n"
            "1. A 200-300 word analysis — detailed enough for a coach to learn from.\n"
            "2. 3‑5 bullet-point **Key Factors** that drove the moment.\n"
            "3. A **Confidence** score (0–100) reflecting how strongly the evidence\n"
            "   supports your reading.\n\n"

            "FORMAT YOUR RESPONSE EXACTLY LIKE THIS:\n"
            "## Analysis\n"
            "[your full analysis here, 200-300 words — use football terminology, "
            "reference specific positions, and explain WHY it worked]\n\n"
            "## Key Factors\n"
            "- [factor 1]\n"
            "- [factor 2]\n"
            "- [factor 3]\n\n"
            "## Confidence\n"
            "[0-100]/100\n\n"
            "## Sources\n"
            "[reference notes that informed your answer, or 'None']"
        ),
    },
    # ── Momentum Analyst ─────────────────────────────────────────────
    {
        "key": "momentum",
        "label": "Momentum Analyst",
        "query": "momentum shift turning point energy crowd substitution belief fatigue",
        "system": (
            "You are a football momentum analyst who has studied 1,000+ match "
            "transitions. You pinpoint the EXACT moment a game tilted and explain "
            "the psychological, physical, and tactical drivers behind the shift.\n\n"

            "YOUR TASK:\n"
            "Given a match moment, explain the MOMENTUM dynamics.\n"
            "Focus on: when the game changed, what triggered it (goal, sub, red card, "
            "crowd, fatigue), how each team responded emotionally, and whether the "
            "momentum was sustained or short-lived.\n\n"

            "YOUR OUTPUT MUST INCLUDE:\n"
            "1. A 200-300 word analysis — paint the emotional arc of the match.\n"
            "2. 3‑5 bullet-point **Key Factors** that drove the momentum shift.\n"
            "3. A **Confidence** score (0–100).\n\n"

            "FORMAT YOUR RESPONSE EXACTLY LIKE THIS:\n"
            "## Analysis\n"
            "[your full analysis here, 200-300 words — describe the emotional shift, "
            "who seized control, and why it mattered]\n\n"
            "## Key Factors\n"
            "- [factor 1]\n"
            "- [factor 2]\n\n"
            "## Confidence\n"
            "[0-100]/100\n\n"
            "## Sources\n"
            "[reference notes that informed your answer, or 'None']"
        ),
    },
    # ── Decision Explainer ───────────────────────────────────────────
    {
        "key": "decision",
        "label": "Decision Explainer",
        "query": "VAR referee penalty offside handball foul decision laws of the game IFAB",
        "system": (
            "You are a former professional referee turned analyst. You explain "
            "refereeing and VAR decisions in plain, precise language grounded in "
            "the IFAB Laws of the Game. You never use jargon without explaining it.\n\n"

            "YOUR TASK:\n"
            "Given a match moment, explain EVERY notable refereeing decision.\n"
            "Focus on: what the call was, why it was made (cite the relevant Law), "
            "whether VAR intervened and why, and whether the decision was correct "
            "or contentious. If there was no notable call, acknowledge it briefly.\n\n"

            "YOUR OUTPUT MUST INCLUDE:\n"
            "1. A 200-300 word analysis.\n"
            "2. 2‑4 bullet-point **Key Factors** (the specific decisions/rules).\n"
            "3. A **Confidence** score (0–100).\n\n"

            "FORMAT YOUR RESPONSE EXACTLY LIKE THIS:\n"
            "## Analysis\n"
            "[your full analysis here, 200-300 words — cite specific Laws where "
            "relevant, be fair to the officials, acknowledge controversy]\n\n"
            "## Key Factors\n"
            "- [decision / rule 1]\n"
            "- [decision / rule 2]\n\n"
            "## Confidence\n"
            "[0-100]/100\n\n"
            "## Sources\n"
            "[reference notes that informed your answer, or 'None']"
        ),
    },
]

# ---------------------------------------------------------------------------
# Shared human prompt template
# ---------------------------------------------------------------------------

_HUMAN = """Match: {title} — {teams}, around minute {minute}.
What happened: {summary}
Facts: {facts}

Reference notes (retrieved from tactical reports):
{context}

Now provide your analysis using the format specified in your system prompt.
Be thorough — think step by step. Explain WHY, not just what."""

# Few-shot examples appended to the human message (one per agent type)
_FEW_SHOT = {
    "tactical": (
        "\n\n--- EXAMPLE (from a different match) ---\n"
        "Match: Brazil 1-2 Belgium (2018 QF) — around minute 31.\n"
        "What happened: Belgium's counter-attack caught Brazil's full-backs high, "
        "leading to De Bruyne's assist for the second goal.\n\n"
        "## Analysis\n"
        "Brazil's 4-3-3 pushed both full-backs (Marcelo and Fagner) into the "
        "attacking half, leaving only two centre-backs against Belgium's front three. "
        "When Fernandinho's pass was intercepted, Belgium transitioned in a 3v2. "
        "De Bruyne's diagonal run dragged Silva wide, opening the corridor for "
        "Chadli's cut-back. The structural risk — full-backs committed forward "
        "with no midfield cover — was exposed by a single misplaced pass.\n"
        "This is a textbook example of why modern coaches preach 'covering the "
        "space behind the full-back' against rapid transitions.\n\n"
        "## Key Factors\n"
        "- High full-back positioning with no cover from deep midfield\n"
        "- Belgium's 3-4-3 naturally loaded the transition channels\n"
        "- Fernandinho's interception was the trigger, but the structural weakness preceded it\n\n"
        "## Confidence\n"
        "90/100\n\n"
        "## Sources\n"
        "tactical-report-qf-2018.md"
    ),
    "momentum": (
        "\n\n--- EXAMPLE (from a different match) ---\n"
        "Match: Liverpool 3-3 AC Milan (2005 UCL Final) — around minute 39.\n"
        "What happened: Milan led 3-0 at half-time; Liverpool scored 3 in 6 second-half minutes.\n\n"
        "## Analysis\n"
        "Milan's 3-0 half-time lead felt unassailable, but Liverpool's first goal "
        "(54', Gerrard) changed everything. The crowd at Atatürk Stadium, previously "
        "silent, erupted. Milan, comfortable at 3-0, suddenly faced uncertainty — "
        "every decision became hesitant. The second goal (56', Smicer) turned "
        "uncertainty into panic. By the third (60', Alonso), the momentum had fully "
        "inverted: Liverpool believed they would win, while Milan feared they would lose.\n"
        "The psychological shift was complete within six minutes. This is the classic "
        "'death by quick goals' pattern — the leading team has no time to reset "
        "mentally between blows.\n\n"
        "## Key Factors\n"
        "- Rapid succession of goals (3 in 6 minutes) denied Milan time to reorganise\n"
        "- Crowd energy inversion from silent to deafening\n"
        "- Gerrard's goal shifted belief — Milan went from certain to uncertain\n\n"
        "## Confidence\n"
        "95/100\n\n"
        "## Sources\n"
        "tactical-analysis-2005-final.md"
    ),
    "decision": (
        "\n\n--- EXAMPLE (from a different match) ---\n"
        "Match: England 2-1 Germany (2021 R16) — around minute 51.\n"
        "What happened: Sterling's goal was reviewed by VAR for a potential offside.\n\n"
        "## Analysis\n"
        "The key question was whether Sterling was in an offside position when "
        "Kane played the through-ball. Under Law 11 — Offside, a player is "
        "penalised if 'any part of the head, body or feet is nearer to the "
        "opponent's goal line than both the ball and the second-last opponent.'\n"
        "The VAR check showed Sterling's shoulder was level with the last "
        "defender's hip — not offside. The 'daylight principle' (requiring clear "
        "space between attacker and defender) was correctly applied. The decision "
        "stood, and replays confirmed it was correct.\n"
        "This was a textbook VAR intervention: efficient, correct, and minimally "
        "disruptive.\n\n"
        "## Key Factors\n"
        "- Sterling's shoulder was level with the defender's hip (no clear offside)\n"
        "- Law 11 — Offside correctly interpreted with the de minimis threshold\n"
        "- VAR check was quick and conclusive; no prolonged stoppage\n\n"
        "## Confidence\n"
        "95/100\n\n"
        "## Sources\n"
        "ifab-laws-of-the-game.md"
    ),
}

_HUMAN_WITH_EXAMPLE = (
    _HUMAN + "\n\n{example}"
)

# ---------------------------------------------------------------------------
# Prompt building
# ---------------------------------------------------------------------------


def build_prompt(agent: dict) -> ChatPromptTemplate:
    temp = ChatPromptTemplate.from_messages([
        ("system", agent["system"]),
        ("human", _HUMAN_WITH_EXAMPLE),
    ])
    return temp


# ---------------------------------------------------------------------------
# Chain
# ---------------------------------------------------------------------------


def build_chain(agent: dict, llm):
    return build_prompt(agent) | llm | StrOutputParser()


def agent_inputs(agent: dict, moment: dict, context: str) -> dict:
    teams = moment.get("teams", {})
    return {
        "title": moment.get("title", ""),
        "teams": f"{teams.get('home', '?')} vs {teams.get('away', '?')}",
        "minute": moment.get("minute", "?"),
        "summary": moment.get("summary", ""),
        "facts": json.dumps(moment.get("facts", {}), ensure_ascii=False),
        "context": context or "(no documents retrieved)",
        "example": _FEW_SHOT.get(agent["key"], ""),
    }


# ---------------------------------------------------------------------------
# Output parsing  (post-hoc, after streaming completes)
# ---------------------------------------------------------------------------

_OUTPUT_RE = re.compile(
    r"## Confidence\s*\n\s*(\d+)\s*/\s*100",
    re.IGNORECASE,
)
_FACTORS_RE = re.compile(
    r"## Key Factors\s*\n(.*?)(?=\n##\s|$)",
    re.DOTALL,
)


def parse_output(agent_key: str, full_text: str) -> dict:
    """Parse structured metadata from LLM output after streaming finishes."""
    confidence = 50  # default
    factors: list[str] = []
    m = _OUTPUT_RE.search(full_text)
    if m:
        confidence = min(100, max(0, int(m.group(1))))

    fm = _FACTORS_RE.search(full_text)
    if fm:
        factors = [
            line.strip().lstrip("- ")
            for line in fm.group(1).strip().splitlines()
            if line.strip() and not line.strip().startswith("##")
        ]

    return {"confidence": confidence, "key_factors": factors}


# ---------------------------------------------------------------------------
# Non-streaming invoke (used by tests)
# ---------------------------------------------------------------------------


def run_agent(agent: dict, moment: dict, context: str, llm) -> str:
    return build_chain(agent, llm).invoke(agent_inputs(agent, moment, context))
