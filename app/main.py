import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.graph.interview_graph import compile_graph
from app.limiter import limiter
from app.logging_config import configure_logging
from app.routes.interview import router as interview_router
from app.routes.resume import router as resume_router
from app.routes.voice import router as voice_router
from app.services.resume_cache import resume_context_cache
from app.services.session_store import session_store

configure_logging()
logger = logging.getLogger(__name__)


async def _session_sweeper() -> None:
    """Periodically evict idle in-memory voice sessions and cached resume
    contexts so memory doesn't grow unbounded on a long-running server."""
    while True:
        await asyncio.sleep(300)
        try:
            session_store.sweep_expired()
            resume_context_cache.sweep_expired()
        except Exception as e:  # noqa: BLE001 - background task must never die silently
            logger.exception("Session sweeper failed: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.audio_dir, exist_ok=True)
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.chroma_db_path, exist_ok=True)

    # Async SQLite checkpointer for the LangGraph interview state machine.
    # Compiled once here (bound to this event loop) and reused by every
    # request via app.state — see app/graph/graph_runtime.py.
    try:
        from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

        async with AsyncSqliteSaver.from_conn_string(settings.checkpoint_db_path) as checkpointer:
            app.state.interview_graph = compile_graph(checkpointer)
            logger.info("Interview graph compiled with AsyncSqliteSaver checkpointer")

            sweeper_task = asyncio.create_task(_session_sweeper())
            logger.info("Veya started")
            try:
                yield
            finally:
                sweeper_task.cancel()
                logger.info("Veya shutting down")
    except ImportError:
        # Defensive fallback if langgraph-checkpoint-sqlite's async module
        # isn't available in this environment; falls back to the sync
        # saver (SqliteSaver still handles its own internal locking).
        logger.warning(
            "AsyncSqliteSaver unavailable, falling back to synchronous SqliteSaver. "
            "Install/upgrade langgraph-checkpoint-sqlite for full async support."
        )
        import sqlite3

        from langgraph.checkpoint.sqlite import SqliteSaver

        conn = sqlite3.connect(settings.checkpoint_db_path, check_same_thread=False)
        checkpointer = SqliteSaver(conn)
        app.state.interview_graph = compile_graph(checkpointer)

        sweeper_task = asyncio.create_task(_session_sweeper())
        logger.info("Veya started (sync checkpointer fallback)")
        try:
            yield
        finally:
            sweeper_task.cancel()
            conn.close()
            logger.info("Veya shutting down")


app = FastAPI(title="Veya", version="2.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


app.mount("/audio", StaticFiles(directory=settings.audio_dir), name="audio")

app.include_router(resume_router)
app.include_router(interview_router)
app.include_router(voice_router)


@app.get("/health")
async def health(request: Request):
    graph_ready = getattr(request.app.state, "interview_graph", None) is not None
    return {"status": "ok", "interview_graph_ready": graph_ready}
