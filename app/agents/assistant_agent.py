import logging

from app.llm import LLMUnavailableError, safe_ainvoke, strip_think_tags

logger = logging.getLogger(__name__)

_FALLBACK_REPLY = (
    "Sorry, I'm having trouble responding right now. Could you say that again?"
)

_SYSTEM_PREAMBLE = """You are Veya, a friendly, concise voice assistant.

Rules:
- Never show your thinking process
- Never output <think> tags
- Give only the final spoken answer
- Keep responses short (1-3 sentences) since this is a voice conversation
- Be warm and natural, like a helpful human assistant
"""


async def assistant_reply(message: str, history: list[dict] | None = None) -> str:
    """Generate a conversational assistant reply. Never raises — falls back
    to a safe apology message if the LLM is unavailable, so the voice loop
    never goes silent."""
    history = history or []
    transcript = ""
    if history:
        recent = history[-6:]
        transcript = "\n".join(f"{turn['role']}: {turn['text']}" for turn in recent)

    prompt = f"""{_SYSTEM_PREAMBLE}

Conversation so far:
{transcript or '(no prior turns)'}

User:
{message}
"""

    try:
        reply = await safe_ainvoke(prompt)
        return strip_think_tags(reply)
    except LLMUnavailableError as e:
        logger.error("assistant_reply: LLM unavailable: %s", e)
        return _FALLBACK_REPLY
