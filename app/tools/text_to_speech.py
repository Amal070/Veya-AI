"""
Text-to-speech via edge-tts.

`generate_audio` synthesizes speech, writes an mp3 to disk, and returns a
`/audio/...` URL that the frontend's <audio> element fetches and plays.
This is the only TTS path the app needs now that the voice pipeline is a
simple "speak one line, wait for the next user action" flow rather than a
continuous streaming socket.
"""
import asyncio
import logging
import os
import time
import uuid

import edge_tts

from app.config import settings

logger = logging.getLogger(__name__)

os.makedirs(settings.audio_dir, exist_ok=True)

_cleanup_lock = asyncio.Lock()
_last_cleanup = 0.0


class TTSError(Exception):
    pass



async def _cleanup_old_audio_throttled() -> None:
    """Run cleanup at most once per `audio_cleanup_interval_seconds`, off the hot path."""
    global _last_cleanup
    now = time.time()
    if now - _last_cleanup < settings.audio_cleanup_interval_seconds:
        return
    async with _cleanup_lock:
        if time.time() - _last_cleanup < settings.audio_cleanup_interval_seconds:
            return
        _last_cleanup = time.time()
        await asyncio.to_thread(_cleanup_old_audio_sync)


def _cleanup_old_audio_sync() -> None:
    try:
        for file in os.listdir(settings.audio_dir):
            path = os.path.join(settings.audio_dir, file)
            try:
                if (
                    os.path.isfile(path)
                    and time.time() - os.path.getmtime(path) > settings.audio_cleanup_age_seconds
                ):
                    os.remove(path)
            except OSError:
                continue
    except OSError as e:
        logger.warning("Audio cleanup scan failed: %s", e)


async def generate_audio(text: str) -> str:
    """Synthesize speech and persist it to disk; returns a served URL."""
    if not text or not text.strip():
        raise TTSError("Cannot synthesize empty text")

    asyncio.create_task(_cleanup_old_audio_throttled())

    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(settings.audio_dir, filename)

    try:
        communicate = edge_tts.Communicate(text=text, voice=settings.tts_voice, rate=settings.tts_rate)
        await communicate.save(filepath)
    except Exception as e:
        logger.error("TTS generation failed: %s", e)
        raise TTSError(f"TTS generation failed: {e}") from e

    return f"/audio/{filename}"
