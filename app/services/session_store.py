"""
Lightweight conversation memory for assistant (free-chat) mode.

This is intentionally separate from the LangGraph-backed interview flow,
which persists its own state via the SQLite checkpointer keyed by
session_id/thread_id. This store only tracks the last few turns of casual
conversation so the assistant has short-term memory, and expires idle
sessions so memory doesn't grow unbounded on a long-running server.
"""
import logging
import time
from dataclasses import dataclass, field
from threading import Lock
from uuid import uuid4

from app.config import settings
from app.services.resume_cache import resume_context_cache

logger = logging.getLogger(__name__)

MAX_HISTORY_TURNS = 12  # keep memory bounded; only recent turns matter for context


@dataclass
class ConversationTurn:
    role: str  # "user" | "assistant"
    text: str
    ts: float = field(default_factory=time.time)


@dataclass
class VoiceSession:
    session_id: str
    history: list[ConversationTurn] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)

    def touch(self) -> None:
        self.last_active = time.time()

    def add_turn(self, role: str, text: str) -> None:
        self.history.append(ConversationTurn(role=role, text=text))
        if len(self.history) > MAX_HISTORY_TURNS:
            self.history = self.history[-MAX_HISTORY_TURNS:]
        self.touch()

    def history_as_dicts(self) -> list[dict]:
        return [{"role": t.role, "text": t.text} for t in self.history]


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, VoiceSession] = {}
        self._lock = Lock()

    def create(self) -> VoiceSession:
        session = VoiceSession(session_id=str(uuid4()))
        with self._lock:
            self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> VoiceSession | None:
        with self._lock:
            session = self._sessions.get(session_id)
        if session and self._is_expired(session):
            self.delete(session_id)
            return None
        return session

    def get_or_create(self, session_id: str | None) -> VoiceSession:
        if session_id:
            existing = self.get(session_id)
            if existing:
                return existing
        return self.create()

    def delete(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)
        resume_context_cache.delete(session_id)

    def _is_expired(self, session: VoiceSession) -> bool:
        return (time.time() - session.last_active) > settings.session_idle_timeout_seconds

    def sweep_expired(self) -> int:
        with self._lock:
            expired = [sid for sid, s in self._sessions.items() if self._is_expired(s)]
            for sid in expired:
                del self._sessions[sid]
        for sid in expired:
            resume_context_cache.delete(sid)
        if expired:
            logger.info("Swept %d expired voice sessions", len(expired))
        return len(expired)


session_store = SessionStore()
