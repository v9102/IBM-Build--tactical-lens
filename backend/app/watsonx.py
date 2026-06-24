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
            "MOCK ANALYSIS: the shift here comes down to space and timing — "
            "one side committed numbers forward and the other punished the gap "
            "left behind. Set MOCK=0 with watsonx credentials for real Granite output."
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
        params={"temperature": 0.4, "max_new_tokens": 400},
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
