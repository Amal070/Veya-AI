import logging
import uuid

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.rag.vector_store import collection

logger = logging.getLogger(__name__)


def ingest_resume(resume_text: str, session_id: str) -> int:
    """Chunk and store resume text in the vector store, scoped to session_id.

    This is a blocking call (Chroma's add() runs embeddings synchronously);
    callers from async code should wrap it with `asyncio.to_thread`.
    """
    if not resume_text or not resume_text.strip():
        return 0

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.rag_chunk_size,
        chunk_overlap=settings.rag_chunk_overlap,
    )

    chunks = splitter.split_text(resume_text)
    if not chunks:
        return 0

    try:
        # Clear any previous resume chunks for this session first, so a
        # re-uploaded resume doesn't get mixed with stale context.
        collection.delete(where={"session_id": session_id})
    except Exception as e:
        logger.warning("Could not clear previous resume chunks for session %s: %s", session_id, e)

    collection.add(
        ids=[str(uuid.uuid4()) for _ in chunks],
        documents=chunks,
        metadatas=[{"session_id": session_id} for _ in chunks],
    )

    return len(chunks)
