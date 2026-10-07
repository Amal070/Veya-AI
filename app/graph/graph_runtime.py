"""
Accessor for the compiled interview graph stored on `app.state`.

The graph is compiled once during the FastAPI lifespan (see app/main.py)
with an `AsyncSqliteSaver` checkpointer bound to the running event loop,
then reused by every request — avoiding the original bug of opening a
single raw `sqlite3` connection with `check_same_thread=False` and no
locking, which is unsafe for concurrent async access.
"""
from fastapi import FastAPI


def get_compiled_graph(app: FastAPI):
    graph = getattr(app.state, "interview_graph", None)
    if graph is None:
        raise RuntimeError(
            "Interview graph is not initialized. This should be set up in "
            "the FastAPI lifespan before any requests are served."
        )
    return graph
