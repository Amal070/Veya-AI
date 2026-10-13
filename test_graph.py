"""Smoke test for the LangGraph interview graph.

Run manually: python test_graph.py
Requires GROQ_API_KEY in .env and a populated Chroma session for RAG context.
"""

from uuid import uuid4

from app.graph.interview_graph import graph

session_id = str(uuid4())

initial_state = {
    "session_id": session_id,
    "current_question": "",
    "current_answer": "",
    "score": 0,
    "feedback": "",
    "difficulty": "medium",
    "question_count": 0,
    "question_limit": 1,
    "history": [],
    "report": {},
    "finished": False,
}

config = {"configurable": {"thread_id": session_id}}

result = graph.invoke(initial_state, config=config)
interrupt = result.get("__interrupt__")
print("Interrupt:", interrupt[0].value if interrupt else None)

result = graph.invoke({"resume": "I built REST APIs with FastAPI and PostgreSQL."}, config=config)
print("Finished:", result.get("finished"))
print("Report keys:", list(result.get("report", {}).keys()))
