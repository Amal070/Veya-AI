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

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "application/octet-stream",
}

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

    filename = (file.filename or "").strip()
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{ext}'. Supported formats: PDF, DOCX, TXT.",
        )

    contents = await file.read()
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Resume file exceeds {settings.max_upload_bytes // (1024 * 1024)}MB limit.",
        )

    if not contents or len(contents.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded resume file is empty.",
        )

    # Magic byte validation for binary formats
    if ext == ".pdf" and not contents.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File has .pdf extension but is not a valid PDF document.",
        )
    elif ext == ".docx" and not contents.startswith(b"PK\x03\x04"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File has .docx extension but is not a valid Word document.",
        )

    safe_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.upload_dir, safe_name)

    def _write_sync() -> None:
        with open(file_path, "wb") as f:
            f.write(contents)

    await asyncio.to_thread(_write_sync)

    try:
        result = await analyze_resume(file_path, session_id=session_id, original_filename=filename)
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

    resume_text = result.get("resume_text", "")
    if not resume_text or len(resume_text.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract any readable text from the file (it may be a scanned image with no text layer).",
        )

    profile = result.get("profile", {})
    return {
        "success": True,
        "session_id": session_id,
        "next_step": "question_count",
        "message": "Resume analyzed successfully. How many questions would you like?",
        "candidate_name": profile.get("candidate_name", ""),
        "skills_detected": profile.get("skills", [])[:10],
    }