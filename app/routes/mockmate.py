"""
Small utility routes. The original `/veya/chat` endpoint duplicated
`/voice/chat`'s intent-routing logic with a separate, disconnected
in-memory dict and was never wired into the real interview graph — it has
been removed in favor of the single source of truth (`SessionStore` +
the `/ws/voice` pipeline). This module now just exposes session
introspection, useful for the frontend to check whether a session is
still alive after a refresh/reconnect.
"""
from fastapi import APIRouter, HTTPException, status

from app.services.session_store import session_store

router = APIRouter(prefix="/veya", tags=["Veya"])


@router.get("/session/{session_id}")
def get_session(session_id: str):
    session = session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found or expired.")

    return {
        "session_id": session.session_id,
        "mode": session.mode,
        "question_count": session.question_count,
        "difficulty": session.difficulty,
        "resume_uploaded": session.resume_uploaded,
        "turns": len(session.history),
    }
