"""Legacy entry point — use `uvicorn app.main:app` instead."""

from app.main import app

__all__ = ["app"]
