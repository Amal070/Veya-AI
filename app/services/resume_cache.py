"""
In-memory resume context cache.

The resume is parsed and analyzed exactly once on upload (see
app/agents/resume_agent.py). Rather than re-querying the vector store on
every single interview question, we resolve one summarized context blob and a
structured resume profile at upload time and cache it here, keyed by session_id.
Every later question-generation call reuses the cached structured profile and text —
no repeated retrieval, no repeated parsing, much lower latency per question.

Entries expire on the session idle timeout so memory does not grow unbounded on a
long-running server.
"""
import time
from dataclasses import dataclass, field
from threading import Lock
from typing import Any

from app.config import settings


@dataclass
class _CacheEntry:
    context: str
    profile: dict[str, Any] = field(default_factory=dict)
    raw_text: str = ""
    last_active: float = field(default_factory=time.time)


class ResumeContextCache:
    def __init__(self) -> None:
        self._entries: dict[str, _CacheEntry] = {}
        self._lock = Lock()

    def set(
        self,
        session_id: str,
        context: str,
        profile: dict[str, Any] | None = None,
        raw_text: str = "",
    ) -> None:
        with self._lock:
            self._entries[session_id] = _CacheEntry(
                context=context,
                profile=profile or {},
                raw_text=raw_text,
            )

    def get(self, session_id: str) -> str | None:
        """Returns the formatted resume context text for the session."""
        with self._lock:
            entry = self._entries.get(session_id)
            if entry is None:
                return None
            if time.time() - entry.last_active > settings.session_idle_timeout_seconds:
                del self._entries[session_id]
                return None
            entry.last_active = time.time()
            return entry.context

    def get_profile(self, session_id: str) -> dict[str, Any] | None:
        """Returns the structured resume profile for the session."""
        with self._lock:
            entry = self._entries.get(session_id)
            if entry is None:
                return None
            if time.time() - entry.last_active > settings.session_idle_timeout_seconds:
                del self._entries[session_id]
                return None
            entry.last_active = time.time()
            return entry.profile

    def get_raw_text(self, session_id: str) -> str | None:
        """Returns the raw extracted resume text for the session."""
        with self._lock:
            entry = self._entries.get(session_id)
            if entry is None:
                return None
            if time.time() - entry.last_active > settings.session_idle_timeout_seconds:
                del self._entries[session_id]
                return None
            entry.last_active = time.time()
            return entry.raw_text

    def has_session(self, session_id: str) -> bool:
        """Checks if active resume data exists for session_id."""
        with self._lock:
            entry = self._entries.get(session_id)
            if entry is None:
                return False
            if time.time() - entry.last_active > settings.session_idle_timeout_seconds:
                del self._entries[session_id]
                return False
            return True

    def delete(self, session_id: str) -> None:
        with self._lock:
            self._entries.pop(session_id, None)

    def sweep_expired(self) -> int:
        with self._lock:
            now = time.time()
            expired = [
                sid
                for sid, e in self._entries.items()
                if now - e.last_active > settings.session_idle_timeout_seconds
            ]
            for sid in expired:
                del self._entries[sid]
        return len(expired)


resume_context_cache = ResumeContextCache()
