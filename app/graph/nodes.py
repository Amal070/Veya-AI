import logging

from langgraph.types import interrupt

from app.agents.evaluator_agent import evaluate_answer
from app.agents.interviewer_agent import generate_question
from app.agents.report_agent import generate_report

logger = logging.getLogger(__name__)


async def question_node(state):
    question = await generate_question(
        previous_qa=state["history"],
        difficulty=state["difficulty"],
        session_id=state.get("session_id", ""),
    )

    # `interrupt()` pauses the graph here and returns control to the caller;
    # resuming with Command(resume=<answer>) feeds the answer back in.
    answer = interrupt({"question": question})

    return {
        "current_question": question,
        "current_answer": answer,
    }


async def evaluation_node(state):
    evaluation = await evaluate_answer(state["current_question"], state["current_answer"])

    return {
        "score": evaluation["score"],
        "feedback": evaluation["feedback"],
    }


def history_node(state):
    """Append the completed Q&A turn to history and adapt difficulty.

    Returns only the changed keys (LangGraph merges partial updates into
    state) instead of mutating + returning the whole state dict, which is
    safer under the graph's checkpoint/replay semantics.
    """
    new_entry = {
        "question": state["current_question"],
        "answer": state["current_answer"],
        "score": state["score"],
        "feedback": state["feedback"],
    }
    new_history = [*state["history"], new_entry]

    # Adaptive difficulty: trend-aware rather than single-answer reactive.
    # Look at the last up-to-3 scores so one lucky/unlucky answer doesn't
    # whiplash the difficulty.
    recent_scores = [h["score"] for h in new_history[-3:]]
    avg_recent = sum(recent_scores) / len(recent_scores)

    if avg_recent >= 7.5:
        difficulty = "hard"
    elif avg_recent <= 4:
        difficulty = "easy"
    else:
        difficulty = "medium"

    return {
        "history": new_history,
        "difficulty": difficulty,
        "question_count": state["question_count"] + 1,
    }


async def report_node(state):
    """Generate the final interview report.

    `generate_report` is `async` (this was previously a bug: the agent
    function was synchronous but called with `await`, raising a TypeError
    and breaking every interview at the final step).
    """
    report = await generate_report(state["history"])

    return {
        "report": report,
        "finished": True,
    }
