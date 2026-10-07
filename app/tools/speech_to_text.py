"""
Speech-to-text via faster-whisper.

The whole app uses one transcription path: the client records a clip with
MediaRecorder, uploads it as a file, and we transcribe it here. There is no
streaming/PCM path — that machinery only existed to support a continuous
WebSocket voice pipeline this app intentionally does not have.
"""
import asyncio
import logging

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

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"TranscriptionResult(text={self.text!r}, confident={self.confident}, reason={self.reason!r})"


async def _get_model() -> WhisperModel:
    global _model
    if _model is None:
        async with _model_lock:
            if _model is None:  # double-checked locking
                logger.info("Loading Whisper model: %s", settings.whisper_model_size)
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


async def transcribe(audio_path: str) -> TranscriptionResult:
    """Transcribe an audio file on disk (webm/wav/mp3 — anything ffmpeg supports)."""
    if not audio_path:
        return TranscriptionResult("", False, "empty_audio")
    model = await _get_model()
    return await asyncio.to_thread(_transcribe_path_sync, model, audio_path)
