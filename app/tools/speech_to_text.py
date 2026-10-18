"""
Speech-to-text with Groq Whisper Cloud API (whisper-large-v3-turbo) as primary
ultra-fast engine (~500ms, zero server RAM usage) and faster-whisper as local fallback.
"""
import asyncio
import logging
import os

from faster_whisper import WhisperModel

from app.config import settings

logger = logging.getLogger(__name__)

_model: WhisperModel | None = None
_model_lock = asyncio.Lock()

MIN_AUDIO_DURATION_SEC = 0.3


class TranscriptionResult:
    __slots__ = ("text", "confident", "reason")

    def __init__(self, text: str, confident: bool, reason: str = ""):
        self.text = text
        self.confident = confident
        self.reason = reason

    def __repr__(self) -> str:
        return f"TranscriptionResult(text={self.text!r}, confident={self.confident}, reason={self.reason!r})"


async def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        async with _model_lock:
            if _model is None:
                logger.info("Loading local Whisper fallback model: %s", settings.whisper_model_size)
                _model = await asyncio.to_thread(
                    WhisperModel,
                    settings.whisper_model_size,
                    device=settings.whisper_device,
                    compute_type=settings.whisper_compute_type,
                )
    return _model


def _score_segments(segments: list, duration: float) -> TranscriptionResult:
    if duration < MIN_AUDIO_DURATION_SEC:
        return TranscriptionResult("", False, "audio_too_short")

    if not segments:
        return TranscriptionResult("", False, "silent_or_empty")

    text = "".join(s.text for s in segments).strip()
    avg_logprob = sum(s.avg_logprob for s in segments) / len(segments)

    if not text:
        return TranscriptionResult("", False, "no_speech_detected")

    if avg_logprob < settings.whisper_min_confidence_logprob:
        return TranscriptionResult(text, False, "low_confidence")

    return TranscriptionResult(text, True)


def _transcribe_path_sync(model: WhisperModel, audio_path: str) -> TranscriptionResult:
    try:
        segments, info = model.transcribe(audio_path, vad_filter=True)
        segments = list(segments)
    except Exception as e:
        logger.error("Whisper failed on %s: %s", audio_path, e)
        return TranscriptionResult("", False, "corrupted_audio")

    return _score_segments(segments, info.duration)


async def _transcribe_groq(audio_path: str) -> TranscriptionResult | None:
    if not settings.groq_api_key:
        return None

    try:
        from groq import AsyncGroq

        client = AsyncGroq(api_key=settings.groq_api_key)
        filename = os.path.basename(audio_path)
        with open(audio_path, "rb") as f:
            audio_bytes = f.read()

        if len(audio_bytes) < 100:
            return TranscriptionResult("", False, "empty_audio")

        response = await asyncio.wait_for(
            client.audio.transcriptions.create(
                file=(filename, audio_bytes),
                model="whisper-large-v3-turbo",
                response_format="verbose_json",
                temperature=0.0,
            ),
            timeout=15.0,
        )

        text = (response.text or "").strip()
        duration = getattr(response, "duration", 1.0) or 1.0

        if duration < MIN_AUDIO_DURATION_SEC:
            return TranscriptionResult("", False, "audio_too_short")
        if not text:
            return TranscriptionResult("", False, "no_speech_detected")

        logger.info("Groq Whisper transcribed audio (%d bytes, %.1fs) -> '%s'", len(audio_bytes), duration, text[:50])
        return TranscriptionResult(text, True)
    except Exception as e:
        logger.warning("Groq Whisper transcription failed, falling back to local model: %s", e)
        return None


async def transcribe(audio_path: str) -> TranscriptionResult:
    """Transcribe an audio file on disk with Groq LPU primary and local fallback."""
    if not audio_path or not os.path.exists(audio_path):
        return TranscriptionResult("", False, "empty_audio")

    # 1. Primary: Groq Cloud Whisper (<1s, zero server RAM)
    groq_result = await _transcribe_groq(audio_path)
    if groq_result is not None:
        return groq_result

    # 2. Fallback: local faster-whisper
    try:
        model = await _get_model()
        return await asyncio.to_thread(_transcribe_path_sync, model, audio_path)
    except Exception as e:
        logger.error("All transcription engines failed on %s: %s", audio_path, e)
        return TranscriptionResult("", False, "corrupted_audio")
