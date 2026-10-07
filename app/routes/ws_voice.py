"""
Streaming voice pipeline over WebSocket.

This is the heart of the "fully automatic voice conversation" requirement:

    AI speaks -> mic OFF -> AI finishes -> mic ON automatically
    -> user speaks -> VAD detects speech end automatically
    -> audio sent automatically -> response generated -> AI speaks -> repeat

Protocol (JSON control messages + binary audio frames on one socket):

Client -> Server
  - binary frames: raw PCM16 mono @ 16kHz audio chunks (always being sent
    while the mic is open; the server's VAD decides what matters)
  - {"type": "start", "interview": {...} | null}   -- session init
  - {"type": "barge_in"}                            -- client-detected
    energy spike while AI is speaking; server stops TTS playback signal
    immediately (server VAD is the source of truth for *content*, but the
    client can short-circuit perceived latency for *stopping playback*)
  - {"type": "stop"}                                -- end session

Server -> Client
  - {"type": "state", "state": "idle"|"listening"|"thinking"|"speaking"}
  - {"type": "transcript", "role": "user"|"assistant", "text": "...", "final": bool}
  - {"type": "audio_start", "mime": "audio/mpeg"}  followed by binary mp3 frames,
    then {"type": "audio_end"}
  - {"type": "error", "code": "...", "message": "..."}
  - {"type": "interview_update", ...}               -- score/progress/report

Mic gating ("mic OFF while AI speaks") is enforced on the server by simply
ignoring/discarding incoming audio frames while `state == speaking`,
*except* that we still run them through a lightweight energy check so a
genuine user interruption (barge-in) can cut the AI off — this satisfies
both "prevent AI voice feedback loops" (we never transcribe our own TTS
output because we aren't listening to system audio, only the mic, and we
ignore mic frames during playback unless they're loud/sustained enough to
be a real interruption) and "support user interruption".
"""
import asyncio
import contextlib
import json
import logging
import time
from enum import Enum

import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langgraph.types import Command

from app.agents.assistant_agent import assistant_reply_stream
from app.config import settings
from app.services.session_store import session_store
from app.services.vad import UtteranceSegmenter, VADEvent
from app.tools.speech_to_text import transcribe_pcm
from app.tools.text_to_speech import TTSError, synthesize_stream

logger = logging.getLogger(__name__)
router = APIRouter()

# Simple energy threshold for "is this loud enough during AI playback to
# count as a deliberate interruption rather than mic bleed / background
# noise" — computed on raw PCM16 samples.
BARGE_IN_RMS_THRESHOLD = 1200
BARGE_IN_CONFIRM_FRAMES = 3


class PipelineState(str, Enum):
    IDLE = "idle"
    LISTENING = "listening"
    THINKING = "thinking"
    SPEAKING = "speaking"


class VoiceConnection:
    """Owns all per-connection state for one WebSocket voice session."""

    # Hard ceiling on how long we'll wait for the client to confirm actual
    # playback finished, in case the `playback_finished` message is lost
    # (e.g. tab backgrounded, dropped frame). Chosen comfortably above any
    # realistic single TTS utterance length so we don't unmute mid-sentence
    # under normal conditions, while still guaranteeing forward progress.
    PLAYBACK_ACK_TIMEOUT_SECONDS = 10.0

    def __init__(self, ws: WebSocket):
        self.ws = ws
        self.state = PipelineState.IDLE
        self.segmenter = UtteranceSegmenter()
        self.session = session_store.create()
        self.interview_graph = None  # set lazily if interview mode is requested
        self.interview_session_id: str | None = None
        self._speaking_task: asyncio.Task | None = None
        self._barge_in_voiced_frames = 0
        self._closed = False
        # Set by the `playback_finished` client message once the browser's
        # <audio> element actually finishes playing (or errors) — this is
        # the real signal that it's safe to unmute the mic, as opposed to
        # the server merely finishing the *send* of audio bytes, which can
        # happen seconds before playback completes and was the root cause
        # of the AI's own voice being picked up and mis-transcribed.
        self._playback_done = asyncio.Event()
        # Bumped on every speak() call; the client echoes it back so a
        # stale ack belonging to an interrupted/earlier utterance (e.g. one
        # triggered by stopPlayback() itself firing onerror) can't be
        # mistaken for the current utterance finishing.
        self._speak_generation = 0
        # Updated on every inbound message (audio or control) — drives the
        # server-side idle-timeout safeguard that runs alongside the
        # heartbeat ping loop.
        self._last_client_activity = time.monotonic()

    def mark_client_activity(self) -> None:
        self._last_client_activity = time.monotonic()

    # --- outbound helpers -------------------------------------------------

    async def send_json(self, payload: dict) -> None:
        if self._closed:
            return
        try:
            await self.ws.send_text(json.dumps(payload))
        except Exception as e:
            logger.debug("send_json failed (socket likely closed): %s", e)

    async def set_state(self, state: PipelineState) -> None:
        self.state = state
        await self.send_json({"type": "state", "state": state.value})

    async def send_transcript(self, role: str, text: str, final: bool = True) -> None:
        await self.send_json({"type": "transcript", "role": role, "text": text, "final": final})

    async def send_error(self, code: str, message: str) -> None:
        await self.send_json({"type": "error", "code": code, "message": message})

    async def speak(self, text: str) -> None:
        """Synthesize and stream TTS audio for a single, already-complete
        piece of text (used for short, fixed lines: greetings, retry
        prompts, interview questions). For longer LLM-generated replies,
        prefer `speak_stream`, which overlaps generation and synthesis."""
        if not text or not text.strip():
            return

        async def single_sentence():
            yield text

        await self.speak_stream(single_sentence())

    async def speak_stream(self, sentence_stream) -> None:
        """
        Speak a stream of sentence chunks as one continuous audio turn.

        This overlaps LLM generation with TTS synthesis: as soon as the
        first sentence is available from `sentence_stream`, we start
        synthesizing and sending its audio while the *next* sentence is
        still being generated/synthesized in the background. All chunks
        for the whole turn are sent inside a single audio_start/audio_end
        envelope so the client's MediaSource buffer treats it as one
        continuous stream rather than restarting playback per sentence.

        Mic gating works exactly as before: the connection stays in
        SPEAKING for the whole turn, and we don't flip to LISTENING until
        the client confirms actual playback finished (see the
        `_playback_done` wait below) — this is what prevents AI voice
        feedback loops regardless of how many sentences make up the reply.
        """
        await self.set_state(PipelineState.SPEAKING)
        self._barge_in_voiced_frames = 0
        self._speak_generation += 1
        my_generation = self._speak_generation
        self._playback_done = asyncio.Event()

        audio_queue: asyncio.Queue[bytes | None | Exception] = asyncio.Queue(maxsize=4)
        spoken_text_parts: list[str] = []

        async def producer() -> None:
            """Consume sentence chunks, synthesize each one's TTS, and push
            raw mp3 bytes onto the queue — running concurrently with the
            sentence_stream still generating later sentences."""
            try:
                async for sentence in sentence_stream:
                    sentence = sentence.strip()
                    if not sentence:
                        continue
                    if self._closed or self.state != PipelineState.SPEAKING:
                        return
                    spoken_text_parts.append(sentence)
                    # Stream this sentence's transcript to the client as soon
                    # as we know it, rather than waiting for the whole reply.
                    await self.send_transcript(
                        "assistant", " ".join(spoken_text_parts), final=False
                    )
                    try:
                        async for mp3_chunk in synthesize_stream(sentence):
                            if self._closed or self.state != PipelineState.SPEAKING:
                                return
                            await audio_queue.put(mp3_chunk)
                    except TTSError as e:
                        logger.error("TTS failed for sentence chunk: %s", e)
                        # Skip this sentence's audio but keep going — a missed
                        # sentence is better than going silent for the whole turn.
                        continue
            except Exception as e:  # noqa: BLE001
                await audio_queue.put(e)
                return
            finally:
                await audio_queue.put(None)  # sentinel: no more audio coming

        producer_task = asyncio.create_task(producer())

        try:
            sent_any_audio = False
            while True:
                item = await audio_queue.get()
                if item is None:
                    break
                if isinstance(item, Exception):
                    logger.error("speak_stream producer failed: %s", item)
                    break
                if self._closed or self.state != PipelineState.SPEAKING:
                    break
                if not sent_any_audio:
                    await self.send_json(
                        {"type": "audio_start", "mime": "audio/mpeg", "generation": my_generation}
                    )
                    sent_any_audio = True
                await self.ws.send_bytes(item)
                await asyncio.sleep(0)  # yield control so barge-in messages can be processed
        finally:
            if not producer_task.done():
                producer_task.cancel()
                with contextlib.suppress(asyncio.CancelledError):
                    await producer_task
            if sent_any_audio:
                await self.send_json({"type": "audio_end"})

        full_text = " ".join(spoken_text_parts).strip()
        if full_text:
            await self.send_transcript("assistant", full_text, final=True)
            self.session.add_turn("assistant", full_text)

        if self._closed:
            return

        if not sent_any_audio:
            # TTS failed for every sentence — nothing was ever sent, so
            # there's no playback to wait for; just go back to listening.
            if self.state == PipelineState.SPEAKING:
                self.segmenter.reset()
                await self.set_state(PipelineState.LISTENING)
            return

        if self.state == PipelineState.SPEAKING:
            # Wait for the browser to confirm it actually finished playing
            # the audio (or for the safety timeout) before unmuting. This is
            # the real signal — sending bytes finishes long before a
            # multi-sentence reply actually finishes being spoken aloud.
            wait_start = time.monotonic()
            try:
                await asyncio.wait_for(
                    self._playback_done.wait(), timeout=self.PLAYBACK_ACK_TIMEOUT_SECONDS
                )
                logger.info(
                    "speak_stream timing: sentences=%d playback_wait=%.2fs (session=%s)",
                    len(spoken_text_parts), time.monotonic() - wait_start, self.session.session_id,
                )
            except asyncio.TimeoutError:
                logger.warning(
                    "Timed out waiting for playback_finished ack (session=%s); "
                    "unmuting anyway as a safety fallback.",
                    self.session.session_id,
                )

        if not self._closed and self.state == PipelineState.SPEAKING:
            self.segmenter.reset()
            await self.set_state(PipelineState.LISTENING)

    def acknowledge_playback_finished(self, generation: int | None = None) -> None:
        """Called when the client reports its <audio> element actually
        finished playing (or errored). If a generation id is provided
        (normal case), it must match the current speak() call's generation
        or the ack is ignored — this prevents a stale ack from an
        interrupted/earlier utterance (e.g. stopPlayback() itself
        triggering onerror during a barge-in) from prematurely completing
        a *different*, currently-playing utterance."""
        if generation is not None and generation != self._speak_generation:
            logger.debug(
                "Ignoring stale playback_finished ack (got gen=%s, current gen=%s)",
                generation,
                self._speak_generation,
            )
            return
        self._playback_done.set()

    async def interrupt_playback(self, reason: str = "barge_in") -> None:
        """User started talking while AI was speaking — stop gating audio
        out, tell the client to stop playback, and start listening to the
        new utterance immediately."""
        if self.state != PipelineState.SPEAKING:
            return
        logger.info("Barge-in detected (%s) for session %s", reason, self.session.session_id)
        await self.send_json({"type": "audio_interrupt"})
        self._playback_done.set()  # unblock speak()'s wait so it doesn't hang on a late/lost ack
        self.segmenter.reset()
        await self.set_state(PipelineState.LISTENING)

    # --- inbound handling ---------------------------------------------------

    async def handle_audio_chunk(self, chunk: bytes) -> None:
        if self.state == PipelineState.THINKING:
            return  # don't accept new audio while we're generating a response

        if self.state == PipelineState.SPEAKING:
            await self._check_barge_in(chunk)
            return

        if self.state == PipelineState.IDLE:
            return

        events = self.segmenter.feed(chunk)
        for event in events:
            await self._handle_vad_event(event)

    async def _check_barge_in(self, chunk: bytes) -> None:
        if len(chunk) < 2:
            return
        samples = np.frombuffer(chunk, dtype=np.int16)
        if samples.size == 0:
            return
        rms = float(np.sqrt(np.mean(samples.astype(np.float64) ** 2)))

        if rms >= BARGE_IN_RMS_THRESHOLD:
            self._barge_in_voiced_frames += 1
        else:
            self._barge_in_voiced_frames = 0

        if self._barge_in_voiced_frames >= BARGE_IN_CONFIRM_FRAMES:
            self._barge_in_voiced_frames = 0
            await self.interrupt_playback()

    async def _handle_vad_event(self, event) -> None:
        if event.event == VADEvent.SPEECH_STARTED:
            await self.set_state(PipelineState.LISTENING)
            await self.send_json({"type": "vad", "event": "speech_started"})

        elif event.event == VADEvent.SPEECH_CONTINUING:
            pass  # no-op; could emit volume meter data here in future

        elif event.event in (VADEvent.SPEECH_ENDED, VADEvent.MAX_DURATION):
            await self._process_utterance(event.audio)

        elif event.event == VADEvent.TIMEOUT:
            await self.send_json({"type": "vad", "event": "timeout"})

    async def _process_utterance(self, pcm_audio: bytes | None) -> None:
        if not pcm_audio:
            await self.send_error("empty_audio", "No audio captured.")
            await self.set_state(PipelineState.LISTENING)
            return

        await self.set_state(PipelineState.THINKING)

        try:
            result = await asyncio.wait_for(
                transcribe_pcm(pcm_audio, sample_rate=settings.vad_sample_rate),
                timeout=15.0,
            )
        except asyncio.TimeoutError:
            await self.send_error("stt_timeout", "Transcription took too long. Please try again.")
            await self.set_state(PipelineState.LISTENING)
            return
        except Exception as e:
            logger.exception("Transcription failed: %s", e)
            await self.send_error("stt_failed", "I couldn't process that audio. Please try again.")
            await self.set_state(PipelineState.LISTENING)
            return

        if not result.confident:
            reason_messages = {
                "audio_too_short": "That was too short — could you repeat that?",
                "silent_or_empty": "I didn't catch any speech. Could you try again?",
                "no_speech_detected": "I didn't catch that. Could you say it again?",
                "low_confidence": "I'm not sure I understood that correctly. Could you repeat it?",
                "empty_audio": "I didn't receive any audio. Please try again.",
                "corrupted_audio": "That audio came through corrupted. Please try again.",
            }
            message = reason_messages.get(result.reason, "Could you repeat that, please?")
            await self.send_json({"type": "vad", "event": "unclear_speech", "reason": result.reason})
            await self.speak(message)
            return

        await self.send_transcript("user", result.text, final=True)
        self.session.add_turn("user", result.text)

        await self.set_state(PipelineState.THINKING)

        if self.interview_graph is not None:
            try:
                reply_text = await self._advance_interview(result.text)
            except Exception as e:
                logger.exception("Interview response generation failed: %s", e)
                reply_text = "Sorry, something went wrong on my end. Let's try that again."
            # speak() wraps this single string into the same speak_stream()
            # pipeline and handles adding it to session history.
            await self.speak(reply_text)
            return

        # Assistant (free-chat) mode: stream sentence-by-sentence so TTS for
        # the first sentence starts while the LLM is still generating the
        # rest of the reply, instead of waiting for the full text first.
        # speak_stream() handles adding the assembled reply to session
        # history once the full text is known, so we don't duplicate that
        # here the way the old (pre-streaming) code path did.
        try:
            reply_stream = assistant_reply_stream(result.text, self.session.history_as_dicts())
            await self.speak_stream(reply_stream)
        except Exception as e:
            logger.exception("Response generation failed: %s", e)
            await self.speak("Sorry, something went wrong on my end. Let's try that again.")

    async def _advance_interview(self, answer_text: str) -> str:
        """Resume the LangGraph interview with the transcribed answer and
        return the next spoken line (next question, follow-up, or closing
        report summary)."""
        from app.graph.router import continue_router  # local import avoids cycles

        config = {"configurable": {"thread_id": self.interview_session_id}}

        try:
            result = await self.interview_graph.ainvoke(Command(resume=answer_text), config=config)
        except Exception as e:
            logger.exception("Interview graph step failed: %s", e)
            await self.send_error("interview_step_failed", "I had trouble processing that answer.")
            return "Sorry, I had trouble with that. Could you answer again?"

        history = result.get("history", [])
        latest = history[-1] if history else {}
        interrupts = result.get("__interrupt__")

        if interrupts:
            next_question = interrupts[0].value.get("question", "")
            await self.send_json(
                {
                    "type": "interview_update",
                    "finished": False,
                    "score": latest.get("score", 0),
                    "feedback": latest.get("feedback", ""),
                    "difficulty": result.get("difficulty", "medium"),
                    "questions_answered": len(history),
                    "question_limit": result.get("question_limit"),
                }
            )
            return next_question

        report = result.get("report", {})
        await self.send_json(
            {
                "type": "interview_update",
                "finished": True,
                "report": report,
                "questions_answered": len(history),
            }
        )
        self.interview_graph = None  # interview is over; fall back to assistant mode
        return "That's the end of the interview. Great work — check your report for the full breakdown."

    async def start_interview(self, session_id: str, question_limit: int, difficulty: str) -> str:
        """Initialize a LangGraph interview thread and return the first question."""
        from app.graph.graph_runtime import get_compiled_graph

        self.interview_graph = get_compiled_graph(self.ws.app)
        self.interview_session_id = session_id
        config = {"configurable": {"thread_id": session_id}}
        initial_state = {
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

        result = await self.interview_graph.ainvoke(initial_state, config=config)
        interrupts = result.get("__interrupt__")
        if not interrupts:
            raise RuntimeError("Interview graph did not pause for the first question")

        return interrupts[0].value["question"]

    async def close(self) -> None:
        self._closed = True


async def _heartbeat_loop(conn: "VoiceConnection") -> None:
    """
    Proactively pings the client at a fixed interval (well under typical
    proxy/load-balancer idle timeouts) and independently watches for the
    connection going quiet for too long on the *receive* side, closing it
    server-side if so. Runs as a background task alongside the main
    receive loop for the lifetime of the connection.
    """
    while not conn._closed:
        await asyncio.sleep(settings.ws_heartbeat_interval_seconds)
        if conn._closed:
            return

        idle_for = time.monotonic() - conn._last_client_activity
        if idle_for > settings.ws_client_idle_timeout_seconds:
            logger.info(
                "Closing voice WS due to client inactivity (%.0fs, session=%s)",
                idle_for, conn.session.session_id,
            )
            with contextlib.suppress(Exception):
                await conn.ws.close(code=1001, reason="idle timeout")
            return

        await conn.send_json({"type": "ping"})


@router.websocket("/ws/voice")
async def voice_ws(ws: WebSocket) -> None:
    await ws.accept()
    conn = VoiceConnection(ws)
    logger.info("Voice WS connected: session=%s", conn.session.session_id)

    # Initial greeting on connect — "add initial greeting on app launch".
    await conn.send_json({"type": "session", "session_id": conn.session.session_id})
    greeting = (
        "Hi, I'm Veya. You can ask me anything, or say \"start an interview\" "
        "to begin a mock interview."
    )
    # speak() -> speak_stream() adds this to session history once spoken;
    # no need to add it here too (that would double-count the turn).
    await conn.speak(greeting)

    heartbeat_task = asyncio.create_task(_heartbeat_loop(conn))

    try:
        while True:
            message = await ws.receive()
            conn.mark_client_activity()

            if message.get("type") == "websocket.disconnect":
                break

            if "bytes" in message and message["bytes"] is not None:
                chunk = message["bytes"]
                if len(chunk) > settings.ws_max_message_bytes:
                    await conn.send_error("payload_too_large", "Audio chunk too large.")
                    continue
                await conn.handle_audio_chunk(chunk)
                continue

            if "text" in message and message["text"] is not None:
                try:
                    payload = json.loads(message["text"])
                except json.JSONDecodeError:
                    await conn.send_error("invalid_json", "Could not parse control message.")
                    continue

                msg_type = payload.get("type")

                if msg_type == "start_interview":
                    session_id = payload.get("session_id") or conn.session.session_id
                    question_limit = int(payload.get("question_limit", settings.default_question_count))
                    question_limit = max(
                        settings.min_question_count, min(settings.max_question_count, question_limit)
                    )
                    difficulty = payload.get("difficulty", "medium")
                    try:
                        question = await conn.start_interview(session_id, question_limit, difficulty)
                    except Exception as e:
                        logger.exception("Failed to start interview: %s", e)
                        await conn.send_error("interview_start_failed", "Couldn't start the interview. Please try again.")
                        continue
                    # speak() adds this to session history internally; no
                    # separate add_turn call needed here.
                    await conn.speak(question)

                elif msg_type == "barge_in":
                    await conn.interrupt_playback(reason="client_signal")

                elif msg_type == "playback_finished":
                    conn.acknowledge_playback_finished(payload.get("generation"))

                elif msg_type == "stop":
                    break

                elif msg_type == "ping":
                    await conn.send_json({"type": "pong"})

                elif msg_type == "pong":
                    pass  # client acking our heartbeat ping; mark_client_activity() above already covers it

                else:
                    await conn.send_error("unknown_message_type", f"Unknown message type: {msg_type}")

    except WebSocketDisconnect:
        logger.info("Voice WS disconnected: session=%s", conn.session.session_id)
    except Exception as e:
        logger.exception("Voice WS error: %s", e)
        with contextlib.suppress(Exception):
            await conn.send_error("internal_error", "Something went wrong. Please reconnect.")
    finally:
        await conn.close()
        heartbeat_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await heartbeat_task