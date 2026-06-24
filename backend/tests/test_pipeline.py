"""Offline pipeline checks — no watsonx credentials needed.

Run from the backend/ dir:  MOCK=1 python -m pytest
"""
import itertools

from langchain_core.documents import Document
from langchain_core.embeddings import DeterministicFakeEmbedding
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage

from app import rag
from app.agents import AGENTS, build_chain, agent_inputs, run_agent

MOMENT = {
    "id": "goetze2014",
    "title": "Götze's winner",
    "teams": {"home": "Germany", "away": "Argentina"},
    "minute": 113,
    "summary": "Schürrle crossed, Götze volleyed home.",
    "facts": {"score": "1-0", "var": None},
}


def _mock_llm():
    return GenericFakeChatModel(
        messages=itertools.cycle([AIMessage(content="Because fresh legs exploited tired spacing.")])
    )


def test_all_three_agents_produce_output():
    keys = [a["key"] for a in AGENTS]
    assert keys == ["tactical", "momentum", "decision"]
    for agent in AGENTS:
        out = run_agent(agent, MOMENT, "context note", _mock_llm())
        assert out.strip(), f"{agent['key']} produced nothing"


async def test_agent_streams_tokens():
    agent = AGENTS[0]
    chain = build_chain(agent, _mock_llm())
    tokens = [t async for t in chain.astream(agent_inputs(agent, MOMENT, ""))]
    assert "".join(tokens).strip()


def test_rag_retrieval_is_match_filtered():
    docs = [
        Document(page_content="Germany pressed high and rotated in extra time.",
                 metadata={"match_id": "goetze2014", "source": "goetze2014.md"}),
        Document(page_content="France countered fast through Mbappé.",
                 metadata={"match_id": "fra-arg2018", "source": "fra-arg2018.md"}),
    ]
    store = rag.build_store(docs, DeterministicFakeEmbedding(size=64))
    text, sources = rag.retrieve_context(store, "goetze2014", "pressing shape")
    assert "Germany" in text
    assert "France" not in text  # filtered to the right match
    assert sources == ["goetze2014.md"]
