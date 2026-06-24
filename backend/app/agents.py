"""The 3 analyst agents: declarative prompts + a shared chain builder.

Each agent is the same chain shape (prompt | granite | str), differing only in
persona, retrieval query, and instruction. Orchestration (sequential streaming)
lives in main.py.
"""
import json

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

AGENTS = [
    {
        "key": "tactical",
        "label": "Tactical Analyst",
        "query": "formation shape pressing line spacing width overload",
        "system": "You are an elite football tactical analyst. You read formations, "
        "pressing triggers, and spacing the way a coach does.",
        "instruction": "Explain the TACTICAL cause: formation, pressing, and spacing. "
        "What structural choice created this moment?",
    },
    {
        "key": "momentum",
        "label": "Momentum Analyst",
        "query": "momentum shift turning point energy crowd substitution belief",
        "system": "You are a football momentum analyst. You pinpoint WHEN a match "
        "tilted and WHY the psychological and physical balance shifted.",
        "instruction": "Explain the MOMENTUM: when did the game tilt, and what shifted "
        "the balance (a sub, a goal, fatigue, belief)?",
    },
    {
        "key": "decision",
        "label": "Decision Explainer",
        "query": "VAR referee penalty offside handball foul decision laws of the game",
        "system": "You explain refereeing and VAR decisions in plain language, "
        "grounded in the Laws of the Game, without jargon.",
        "instruction": "Explain any KEY DECISION (VAR / penalty / offside / card) in plain "
        "language — why it was correct or contentious. If there was no notable call, say so briefly.",
    },
]

_HUMAN = """Match: {title} — {teams}, around minute {minute}.
What happened: {summary}
Facts: {facts}

Reference notes (retrieved from tactical reports):
{context}

{instruction}
Answer in 2-4 tight sentences. Explain WHY, not just what. If the reference notes
informed your answer, weave them in naturally."""


def build_prompt(agent: dict) -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages([("system", agent["system"]), ("human", _HUMAN)])


def build_chain(agent: dict, llm):
    """prompt | llm | str — streamable (astream yields str tokens)."""
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
        "instruction": agent["instruction"],
    }


def run_agent(agent: dict, moment: dict, context: str, llm) -> str:
    """Non-streaming single-shot — used by tests."""
    return build_chain(agent, llm).invoke(agent_inputs(agent, moment, context))
