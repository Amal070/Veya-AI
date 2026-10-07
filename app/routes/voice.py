"""
Voice assistant routes (simple, stable, stateless-per-request flow).

The whole voice loop is intentionally dumb:

    user records a clip -> POST /voice/chat -> transcript + reply + audio_url
    <audio> element plays audio_url -> user records the next clip -> repeat

No WebSocket, no VAD, no server-driven mic gating, no barge-in detection.
The client owns the mic lifecycle entirely (manual start/stop recording),
which is exactly what the product spec calls for and is far easier to
reason about and keep stable than a streaming pipeline.
"""
import logging
import os
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from app.tools.text_cleaner import clean_for_tts
from app.agents.assistant_agent import assistant_reply
from app.limiter import limiter
from app.services.session_store import session_store
from app.tools.speech_to_text import transcribe
from app.tools.text_to_speech import TTSError, generate_audio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voice", tags=["Voice"])

MAX_AUDIO_UPLOAD_BYTES = 10 * 1024 * 1024

_RETRY_MESSAGES = {
    "audio_too_short": "That was too short. Please try again.",
    "silent_or_empty": "I didn't catch any speech. Could you try again?",
    "no_speech_detected": "I didn't catch that. Could you say it again?",
    "low_confidence": "I'm not sure I understood that correctly. Could you repeat it?",
    "corrupted_audio": "That audio came through corrupted. Please try again.",
    "empty_audio": "I didn't receive any audio. Please try again.",
}


async def _save_and_transcribe(audio: UploadFile):
    contents = await audio.read()
    if len(contents) > MAX_AUDIO_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio file too large.",
        )
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio upload.")

    suffix = (audio.filename or "audio.webm").split(".")[-1][:8]
    temp_file = f"temp_{uuid4()}.{suffix}"
    try:
        with open(temp_file, "wb") as f:
            f.write(contents)
        return await transcribe(temp_file)
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)


async def _safe_generate_audio(text: str) -> str | None:
    try:
        return await generate_audio(text)
    except TTSError as e:
        logger.error("TTS generation failed: %s", e)
        return None


@router.post("/chat")
@limiter.limit("30/minute")
async def voice_chat(request: Request, audio: UploadFile = File(...), session_id: str | None = None):
    """Transcribe one recorded clip, generate an assistant reply, and return
    text + an audio URL to play. Used by the general voice-assistant mode."""
    result = await _save_and_transcribe(audio)

    if not result.confident:
        message = _RETRY_MESSAGES.get(result.reason, "Sorry, I couldn't understand clearly. Could you please repeat that?")
        audio_url = await _safe_generate_audio(message)
        return {"retry": True, "message": message, "audio_url": audio_url}

    text = result.text
    session = session_store.get_or_create(session_id)
    session.add_turn("user", text)

    reply = await assistant_reply(text, session.history_as_dicts())
    tts_text = clean_for_tts(reply)
    session.add_turn("assistant", reply)
    audio_url = await _safe_generate_audio(tts_text)

    return {
        "session_id": session.session_id,
        "transcript": text,
        "message": reply,
        "audio_url": audio_url,
    }


@router.post("/transcribe")
@limiter.limit("30/minute")
async def voice_transcribe(
    request: Request,
    audio: UploadFile = File(...)
):
    result = await _save_and_transcribe(audio)

    if not result.confident:
        message = _RETRY_MESSAGES.get(
            result.reason,
            "Could you repeat that, please?"
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message,
        )

    return {"transcript": result.text}
