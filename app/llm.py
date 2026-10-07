"""
Central LLM client.

All call sites go through `safe_ainvoke` rather than calling `llm.ainvoke`
directly, so timeouts/retries/logging are applied consistently everywhere
(assistant replies, question generation, evaluation, report generation).
"""
import asyncio
import logging
import os

from dotenv import load_dotenv

load_dotenv()

# Guard against stale/broken SSL cert paths often left by renamed Conda environments
for _var in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE"):
    _val = os.environ.get(_var)
    if _val and not os.path.isfile(_val):
        os.environ.pop(_var, None)

from langchain_groq import ChatGroq

from app.config import settings

logger = logging.getLogger(__name__)

llm = ChatGroq(
    model=settings.llm_model,
    api_key=settings.groq_api_key or None,
    timeout=settings.llm_timeout_seconds,
    max_retries=0,  # we implement our own bounded retry below, with logging
)


class LLMUnavailableError(Exception):
    """Raised when the LLM cannot produce a usable response after retries."""


async def safe_ainvoke(prompt: str, *, max_retries: int | None = None) -> str:
    """
    Invoke the LLM with a timeout and bounded retries.
    Returns the cleaned text content. Raises LLMUnavailableError if every
    attempt fails, so callers can fall back to a safe default instead of
    crashing the request or hanging forever.
    """
    retries = settings.llm_max_retries if max_retries is None else max_retries
    last_error: Exception | None = None

    for attempt in range(retries + 1):
        try:
            response = await asyncio.wait_for(
                llm.ainvoke(prompt), timeout=settings.llm_timeout_seconds
            )
            content = (response.content or "").strip()
            if not content:
                raise LLMUnavailableError("LLM returned empty content")
            return content
        except asyncio.TimeoutError as e:
            last_error = e
            logger.warning("LLM call timed out (attempt %s/%s)", attempt + 1, retries + 1)
        except Exception as e:  # noqa: BLE001 - we want to retry on any provider error
            last_error = e
            logger.warning(
                "LLM call failed (attempt %s/%s): %s", attempt + 1, retries + 1, e
            )
        if attempt < retries:
            await asyncio.sleep(min(0.5 * (2**attempt), 4))

    raise LLMUnavailableError(str(last_error) if last_error else "Unknown LLM failure")


def strip_think_tags(text: str) -> str:
    """Remove any reasoning/think block some models prepend to output."""
    if "</think>" in text:
        text = text.split("</think>")[-1]
    return text.strip()
