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
        job_role=state.get("job_role", ""),
    )

    # `interrupt()` pauses the graph here and returns control to the caller;
    # resuming with Command(resume=<answer>) feeds the answer back in.
    answer = interrupt({"question": question})

    return {
        "current_question": question,
        "current_answer": answer,
    }


async def evaluation_node(state):
    evaluation = await evaluate_answer(
        question=state["current_question"],
        answer=state["current_answer"],
        difficulty=state.get("difficulty", "medium"),
    )

    return {
        "score": evaluation["score"],
        "feedback": evaluation["feedback"],
    }


def history_node(state):
    """Append the completed Q&A turn to history and preserve selected difficulty.

    The user-selected difficulty remains the controlling constraint across the
    entire interview session, preventing arbitrary level switching.
    """
    new_entry = {
        "question": state["current_question"],
        "answer": state["current_answer"],
        "score": state["score"],
        "feedback": state["feedback"],
    }
    new_history = [*state["history"], new_entry]

    return {
        "history": new_history,
        "difficulty": state["difficulty"],
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
