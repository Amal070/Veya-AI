"""
Interview routes — thin HTTP wrapper around the LangGraph interview state
machine (see app/graph/). Both a text flow and a voice flow are exposed;
the voice flow simply adds transcription on the way in and TTS on the way
out around the same graph calls the text flow uses.

Flow per the product spec:
  1. POST /interview/start            -> first question (+ optional audio)
  2. user manually records an answer, mic stays off otherwise
  3. POST /interview/voice/answer     -> transcribes the clip, evaluates,
                                          returns next question (+ audio)
                                          or the final report
  (or POST /interview/answer with raw text, for non-voice testing/clients)
"""
import logging
import os
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from langgraph.types import Command
from pydantic import BaseModel, field_validator

from app.config import settings
from app.graph.graph_runtime import get_compiled_graph
from app.limiter import limiter
from app.agents.report_agent import generate_report
from app.agents.interviewer_agent import generate_question, _normalize, _is_semantically_duplicate
from app.services.resume_cache import resume_context_cache
from app.tools.speech_to_text import transcribe
from app.tools.text_to_speech import TTSError, generate_audio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interview", tags=["Interview"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_config(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}}


def _create_initial_state(session_id: str, question_limit: int, difficulty: str):
    return {
        "session_id": session_id,
        "current_question": "",
        "current_answer": "",
        "score": 0,
        "feedback": "",
        "difficulty": difficulty,
        "question_count": 0,
        "question_limit": question_limit,
        "history": [],
        "report": {},
        "finished": False,
    }


def _extract_interrupt(result: dict) -> dict | None:
    interrupts = result.get("__interrupt__")
    if interrupts:
        return interrupts[0].value
    return None


def _require_interrupt_question(interrupt_data: dict | None, context: str = "") -> str:
    if not interrupt_data or "question" not in interrupt_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Interview graph did not return a question{f' ({context})' if context else ''}.",
        )
    return interrupt_data["question"]


async def _safe_generate_audio(text: str) -> str | None:
    """Generate TTS audio but never let a TTS outage break the whole
    response — the frontend can still show text if audio_url is null."""
    try:
        return await generate_audio(text)
    except TTSError as e:
        logger.error("TTS generation failed, continuing without audio: %s", e)
        return None


_RETRY_MESSAGES = {
    "audio_too_short": "That was too short. Please try again.",
    "silent_or_empty": "I didn't catch any speech. Could you try again?",
    "no_speech_detected": "I didn't catch that. Could you say it again?",
    "low_confidence": "I'm not sure I understood that correctly. Could you repeat it?",
    "corrupted_audio": "That audio came through corrupted. Please try again.",
    "empty_audio": "I didn't receive any audio. Please try again.",
}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class StartInterviewRequest(BaseModel):
    session_id: str
    question_limit: int = settings.default_question_count
    difficulty: str = "medium"

    @field_validator("session_id")
    @classmethod
    def session_id_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("session_id must not be empty")
        return v.strip()

    @field_validator("difficulty")
    @classmethod
    def valid_difficulty(cls, v: str) -> str:
        if v not in ("easy", "medium", "hard"):
            raise ValueError("difficulty must be one of: easy, medium, hard")
        return v

    @field_validator("question_limit")
    @classmethod
    def clamp_question_limit(cls, v: int) -> int:
        return max(settings.min_question_count, min(settings.max_question_count, v))


class AnswerRequest(BaseModel):
    session_id: str
    answer: str

    @field_validator("session_id", "answer")
    @classmethod
    def must_not_be_empty(cls, v: str, info) -> str:
        if not v or not v.strip():
            raise ValueError(f"{info.field_name} must not be empty")
        return v.strip()


class SkipRequest(BaseModel):
    session_id: str

    @field_validator("session_id")
    @classmethod
    def session_id_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("session_id must not be empty")
        return v.strip()


class EndEarlyRequest(BaseModel):
    session_id: str

    @field_validator("session_id")
    @classmethod
    def session_id_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("session_id must not be empty")
        return v.strip()


# ---------------------------------------------------------------------------
# Start interview
# ---------------------------------------------------------------------------

@router.post("/start")
@limiter.limit("20/minute")
async def start_interview(req: StartInterviewRequest, request: Request):
    """Start a new interview thread (reusing the resume's session_id so the
    cached resume context from /resume/upload is picked up automatically)
    and return the first question, with spoken audio."""
    graph = get_compiled_graph(request.app)

    logger.info("[INTERVIEW] Interview ID: %s", req.session_id)
    logger.info("[INTERVIEW] Resume ID: %s", req.session_id)

    try:
        result = await graph.ainvoke(
            _create_initial_state(req.session_id, req.question_limit, req.difficulty),
            config=_build_config(req.session_id),
        )
    except Exception as e:
        logger.exception("Failed to start interview for session %s", req.session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start interview: {e}",
        )

    question = _require_interrupt_question(_extract_interrupt(result), "start")
    audio_url = await _safe_generate_audio(question)

    return {
        "session_id": req.session_id,
        "question": question,
        "audio_url": audio_url,
        "question_number": 1,
        "question_limit": req.question_limit,
    }


# ---------------------------------------------------------------------------
# Submit answer — text
# ---------------------------------------------------------------------------

@router.post("/answer")
@limiter.limit("30/minute")
async def answer_question(req: AnswerRequest, request: Request):
    """Submit a text answer and receive the next question (+ audio) or the
    final report."""
    graph = get_compiled_graph(request.app)
    return await _advance_interview(graph, req.session_id, req.answer)


# ---------------------------------------------------------------------------
# Submit answer — voice
# ---------------------------------------------------------------------------

@router.post("/voice/answer")
@limiter.limit("30/minute")
async def answer_voice(request: Request, session_id: str, audio: UploadFile = File(...)):
    """Accept a recorded answer clip, transcribe it, advance the graph, and
    return the next question (or final report) with spoken audio."""
    if not session_id or not session_id.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="session_id must not be empty.")

    graph = get_compiled_graph(request.app)
    extension = (audio.filename or "webm").split(".")[-1][:8]
    temp_file = f"temp_{uuid4()}.{extension}"

    try:
        contents = await audio.read()
        with open(temp_file, "wb") as f:
            f.write(contents)

        transcription = await transcribe(temp_file)

        if not transcription.confident:
            message = _RETRY_MESSAGES.get(transcription.reason, "Could you repeat that, please?")
            audio_url = await _safe_generate_audio(message)
            return {"retry": True, "message": message, "audio_url": audio_url}

        logger.info("Voice interview answer received for session %s", session_id)
        result = await _advance_interview(graph, session_id, transcription.text)
        result["transcript"] = transcription.text
        return result

    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)


async def _advance_interview(graph, session_id: str, answer_text: str) -> dict:
    """Shared step logic for both the text and voice answer routes: resume
    the graph with the answer, then shape either a "next question" or
    "final report" response, including spoken audio either way."""
    try:
        result = await graph.ainvoke(Command(resume=answer_text), config=_build_config(session_id))
    except Exception as e:
        logger.exception("Failed to process answer for session %s", session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process answer: {e}",
        )

    history = result.get("history", [])
    latest = history[-1] if history else {}
    interrupt_data = _extract_interrupt(result)

    if interrupt_data:
        next_question = _require_interrupt_question(interrupt_data, "answer")
        asked_questions = [h.get("question", "") for h in history if "question" in h]
        if _is_semantically_duplicate(next_question, asked_questions):
            logger.warning(
                "Duplicate next_question detected in _advance_interview ('%s'). Generating fresh question.",
                next_question,
            )
            next_question = await generate_question(
                previous_qa=history,
                difficulty=result.get("difficulty", "medium"),
                session_id=session_id,
            )
        audio_url = await _safe_generate_audio(next_question)
        return {
            "finished": False,
            "score": latest.get("score", 0),
            "feedback": latest.get("feedback", ""),
            "next_question": next_question,
            "audio_url": audio_url,
            "questions_answered": len(history),
            "question_limit": result.get("question_limit"),
        }

    report = result.get("report")
    if not report:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Interview ended but no report was generated.",
        )

    audio_url = await _safe_generate_audio("That's the end of the interview. Great work — check your report for the full breakdown.")
    resume_context_cache.delete(session_id)  # interview over; release cached resume context

    return {
        "finished": True,
        "questions_answered": len(history),
        "report": report,
        "audio_url": audio_url,
    }


# ---------------------------------------------------------------------------
# Skip question
# ---------------------------------------------------------------------------

@router.post("/skip")
@limiter.limit("30/minute")
async def skip_interview_question(req: SkipRequest, request: Request):
    """Skip the current question and advance to the next question or report."""
    graph = get_compiled_graph(request.app)
    result = await _advance_interview(graph, req.session_id, "Candidate opted to skip this question.")
    result["transcript"] = "(Question skipped)"
    return result


# ---------------------------------------------------------------------------
# End interview early
# ---------------------------------------------------------------------------

@router.post("/end")
@limiter.limit("20/minute")
async def end_interview_early(req: EndEarlyRequest, request: Request):
    """Conclude an in-progress interview early and generate a report from history."""
    graph = get_compiled_graph(request.app)
    try:
        state = await graph.aget_state(_build_config(req.session_id))
    except Exception as e:
        logger.exception("Failed to retrieve session state for %s", req.session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve session state: {e}",
        )

    if not state or not state.values:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{req.session_id}' not found.")

    history = state.values.get("history", [])
    report = await generate_report(history)
    audio_url = await _safe_generate_audio("Your interview has concluded. Please check your evaluation report.")
    resume_context_cache.delete(req.session_id)

    return {
        "finished": True,
        "questions_answered": len(history),
        "report": report,
        "audio_url": audio_url,
    }


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

@router.get("/report/{session_id}")
async def get_report(session_id: str, request: Request):
    """Retrieve the full state and report for an interview session."""
    if not session_id or not session_id.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="session_id must not be empty.")

    graph = get_compiled_graph(request.app)

    try:
        state = await graph.aget_state(_build_config(session_id))
    except Exception as e:
        logger.exception("Failed to retrieve session state for %s", session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve session state: {e}",
        )

    if not state or not state.values:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found.")

    return {
        "finished": state.values.get("finished", False),
        "difficulty": state.values.get("difficulty", "medium"),
        "question_count": state.values.get("question_count", 0),
        "history": state.values.get("history", []),
        "report": state.values.get("report", {}),
    }
