import asyncio
import logging
import os
import uuid

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status

from app.agents.resume_agent import analyze_resume
from app.config import settings
from app.limiter import limiter
from app.tools.pdf_parser import ResumeParseError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resume", tags=["Resume"])

ALLOWED_CONTENT_TYPES = {"application/pdf"}

os.makedirs(settings.upload_dir, exist_ok=True)


@router.post("/upload")
@limiter.limit("10/minute")
async def upload_resume(
    request: Request,
    session_id: str,
    file: UploadFile = File(...),
):
    if not session_id or not session_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="session_id must not be empty.",
        )

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF files are accepted.",
        )

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File must have a .pdf extension.",
        )

    contents = await file.read()
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Resume file exceeds {settings.max_upload_bytes // (1024 * 1024)}MB limit.",
        )
    if not contents.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is not a valid PDF.",
        )

    safe_name = f"{uuid.uuid4()}.pdf"
    file_path = os.path.join(settings.upload_dir, safe_name)

    def _write_sync() -> None:
        with open(file_path, "wb") as f:
            f.write(contents)

    # Synchronous disk I/O blocks the event loop, which would otherwise
    # stall every other concurrent request for the duration of the write.
    # Push it to a thread, same as the PDF parse/embedding steps in
    # analyze_resume().
    await asyncio.to_thread(_write_sync)

    try:
        result = await analyze_resume(file_path, session_id=session_id)
    except ResumeParseError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error analyzing resume for session %s", session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze resume: {e}",
        )
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

    if result["chunks_stored"] == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract any text from the PDF (it may be a scanned image with no text layer).",
        )

    return {
        "success": True,
        "session_id": session_id,
        "next_step": "question_count",
        "message": "How many questions would you like?",
    }