"""
Builds the LangGraph interview state machine.

The graph itself (`builder`) is defined at import time, but the *compiled*
graph (which needs a checkpointer) is created lazily via `build_graph()`
and stored on `app.state` during the FastAPI lifespan, because the async
SQLite checkpointer needs to be opened/closed around the event loop
lifetime rather than at module import time.

Previously this module opened a single shared `sqlite3.connect(...,
check_same_thread=False)` connection at import time with no locking,
which is unsafe under concurrent async requests (SQLite connections are
not safe for concurrent use from multiple coroutines without explicit
serialization). Using `AsyncSqliteSaver` fixes this: it manages its own
connection lifecycle correctly for async access patterns.
"""
import logging

from langgraph.graph import END, START, StateGraph

from app.graph.nodes import evaluation_node, history_node, question_node, report_node
from app.graph.router import continue_router
from app.graph.state import InterviewState

logger = logging.getLogger(__name__)

builder = StateGraph(InterviewState)

builder.add_node("question", question_node)
builder.add_node("evaluation", evaluation_node)
builder.add_node("history", history_node)
builder.add_node("report", report_node)

builder.add_edge(START, "question")
builder.add_edge("question", "evaluation")
builder.add_edge("evaluation", "history")
builder.add_conditional_edges(
    "history", continue_router, {"question": "question", "report": "report"}
)
builder.add_edge("report", END)


def compile_graph(checkpointer):
    """Compile the graph with the given checkpointer instance."""
    return builder.compile(checkpointer=checkpointer)
