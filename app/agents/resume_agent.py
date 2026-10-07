import asyncio
import logging

from app.rag.ingest import ingest_resume
from app.services.resume_cache import resume_context_cache
from app.tools.pdf_parser import ResumeParseError, extract_text_from_pdf

logger = logging.getLogger(__name__)

# Resumes are short enough (a few pages of text) that we can keep the full
# extracted text as the "resume context" used during question generation,
# instead of paying for a vector similarity query before every question.
# This is what "process resume only once, reuse throughout interview" means
# in practice: one PDF parse + one cache write at upload time, zero further
# retrieval calls for the rest of the interview.
MAX_CONTEXT_CHARS = 6000


async def analyze_resume(file_path: str, session_id: str) -> dict:
    """Extract text from the resume PDF, cache it for reuse, and (optionally)
    store it in the vector store for future semantic search needs.

    Both the PDF parse and the embedding step are CPU-bound/blocking, so we
    push them to threads to avoid stalling the event loop for other
    concurrent requests.
    """
    try:
        resume_text = await asyncio.to_thread(extract_text_from_pdf, file_path)
    except ResumeParseError:
        raise
    except Exception as e:
        logger.error("Unexpected PDF parsing failure: %s", e)
        raise ResumeParseError(f"Could not parse PDF: {e}") from e

    # Cache the resume text once — every question-generation call during
    # this interview reuses it directly with no further parsing/retrieval.
    resume_context_cache.set(session_id, resume_text[:MAX_CONTEXT_CHARS])

    # Still index into the vector store in case future features want
    # targeted semantic search, but this is no longer on the hot path of
    # generating each question.
    chunks = await asyncio.to_thread(ingest_resume, resume_text, session_id)

    return {
        "resume_text": resume_text,
        "chunks_stored": chunks,
    }
