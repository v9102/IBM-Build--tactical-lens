"""Docling RAG: parse tactical reports -> embed -> in-memory store -> match-filtered retrieval.

Split into two halves on purpose:
  - load_reports(): the Docling-dependent ingest (heavy import, lazy).
  - build_store()/retrieve_context(): pure vector-store logic, testable offline
    with fake embeddings and hand-made Documents.
"""
import re
from pathlib import Path

from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore

REPORTS_DIR = Path(__file__).resolve().parent.parent / "data" / "reports"


def load_reports(reports_dir: Path = REPORTS_DIR) -> list[Document]:
    """Parse every report through Docling, split on '## ' headings, tag with match_id.

    match_id is the filename stem (e.g. goetze2014.md -> 'goetze2014'), which must
    match the moment id so retrieval can filter by match.
    """
    from langchain_docling import DoclingLoader  # heavy; import only when ingesting
    from langchain_docling.loader import ExportType

    docs: list[Document] = []
    for path in sorted(reports_dir.glob("*")):
        if path.suffix.lower() not in {".md", ".pdf", ".html", ".docx", ".txt"}:
            continue
        match_id = path.stem
        loaded = DoclingLoader(file_path=str(path), export_type=ExportType.MARKDOWN).load()
        markdown = "\n\n".join(d.page_content for d in loaded)
        for chunk in _split_sections(markdown):
            docs.append(Document(page_content=chunk, metadata={"match_id": match_id, "source": path.name}))
    return docs


def _split_sections(markdown: str) -> list[str]:
    # ponytail: split on H2 headings; good enough for short reports. Swap for a
    # token-aware splitter if reports grow long.
    parts = re.split(r"\n(?=##\s)", markdown.strip())
    return [p.strip() for p in parts if p.strip()]


def build_store(docs: list[Document], embeddings) -> InMemoryVectorStore:
    return InMemoryVectorStore.from_documents(docs, embeddings)


def retrieve_context(store: InMemoryVectorStore, match_id: str, query: str, k: int = 2):
    """Return (joined_text, sources) for the top-k chunks of THIS match."""
    if store is None:
        return "", []
    hits = store.similarity_search(
        query, k=k, filter=lambda d: d.metadata.get("match_id") == match_id
    )
    text = "\n\n".join(h.page_content for h in hits)
    sources = sorted({h.metadata.get("source", "report") for h in hits})
    return text, sources
