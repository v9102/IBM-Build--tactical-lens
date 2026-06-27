"""Granite LLM + embeddings, with an offline MOCK path.

MOCK=1 → fake chat model / fake embeddings so the whole app runs with no
watsonx credentials (used by tests and offline dev).
"""
import itertools
from functools import lru_cache

from .config import settings


def get_llm():
    """Streaming chat model. Fresh mock instance per call (the fake model's
    message iterator is single-pass); cached real client."""
    if settings.mock:
        from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
        from langchain_core.messages import AIMessage

        canned = (
            "## Analysis\n"
            "The tactical shift here revolves around defensive line height and "
            "midfield spacing. The defending side held a high line approximately "
            "35 metres from goal, compressing the midfield zone but leaving "
            "significant space behind the full-backs. When possession turned over, "
            "the attacking side's wingers — positioned high and wide — exploited "
            "these channels instantly. The centre-forward's intelligent drift into "
            "the left half-space drew the centre-back out of position, creating a "
            "vacuum that the onrushing midfielder attacked. This is a textbook "
            "example of a 'pressing trap' baited and executed: the defending team "
            "was funnelled into a narrow corridor where numerical superiority was "
            "impossible to resist, and the subsequent transition punished the "
            "structural imbalance. The result was a 3v2 situation in the final "
            "third that the attack converted with clinical precision.\n\n"
            "## Key Factors\n"
            "- High defensive line created exploitable space in behind\n"
            "- Winger pinned the full-back, preventing him from tucking inside\n"
            "- Centre-forward's diagonal run disorganised the defensive block\n"
            "- Quick transition (3 passes in 7 seconds) caught defenders mid-shape\n\n"
            "## Confidence\n"
            "85/100\n\n"
            "## Sources\n"
            "Set MOCK=0 with watsonx credentials for real Granite output grounded in actual reports."
        )
        return GenericFakeChatModel(messages=itertools.cycle([AIMessage(content=canned)]))
    return _watsonx_llm()


@lru_cache(maxsize=1)
def _watsonx_llm():
    from langchain_ibm import ChatWatsonx

    return ChatWatsonx(
        model_id=settings.granite_model_id,
        url=settings.watsonx_url,
        project_id=settings.watsonx_project_id,
        apikey=settings.watsonx_apikey,
        params={"temperature": 0.3, "max_new_tokens": 1024, "top_p": 0.9},
        streaming=True,
    )


@lru_cache(maxsize=1)
def get_embeddings():
    if settings.mock:
        from langchain_core.embeddings import DeterministicFakeEmbedding

        return DeterministicFakeEmbedding(size=384)
    from langchain_ibm import WatsonxEmbeddings

    return WatsonxEmbeddings(
        model_id=settings.embed_model_id,
        url=settings.watsonx_url,
        project_id=settings.watsonx_project_id,
        apikey=settings.watsonx_apikey,
    )
