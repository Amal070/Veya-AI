import logging
import re
from typing import Any

from app.llm import LLMUnavailableError, safe_ainvoke, strip_think_tags
from app.prompts.interview_prompts import build_question_generation_prompt
from app.services.resume_cache import resume_context_cache

logger = logging.getLogger(__name__)

_FALLBACK_QUESTIONS = {
    "easy": [
        "Can you tell me about a project you're proud of and what your role was?",
        "How do you approach debugging when an application throws an unexpected error?",
        "What is your process for collaborating with teammates during code reviews?",
        "How do you prioritize your work when balancing multiple competing deadlines?",
        "Describe a time you had to quickly learn and adopt a new tool or technology.",
        "How do you ensure your code is maintainable and well-documented for others?",
    ],
    "medium": [
        "Walk me through a technical challenge you faced recently and how you solved it.",
        "How do you design RESTful or GraphQL APIs for high reliability and clean versioning?",
        "Explain how you identify and resolve database query performance bottlenecks.",
        "How do you prevent race conditions and manage state in asynchronous systems?",
        "Describe your approach to designing resilient error handling and retry mechanisms.",
        "What strategies do you use for containerization and automated CI/CD deployments?",
    ],
    "hard": [
        "Describe a difficult architectural trade-off you made and what constraints guided your decision.",
        "How do you ensure data consistency across distributed microservices under network partitions?",
        "Walk me through how you design a multi-tier caching layer to prevent cache stampedes.",
        "How would you architect a zero-downtime schema migration strategy for high-throughput tables?",
        "Explain how you structure observability, distributed tracing, and MTTR alerting at scale.",
        "How do you mitigate cascading failures and rate-limit abusive traffic across clusters?",
    ],
}


def _get_unused_fallback(difficulty: str, asked_questions: list[str]) -> str:
    pool = _FALLBACK_QUESTIONS.get(difficulty, _FALLBACK_QUESTIONS["medium"])
    asked_norm = {_normalize(q) for q in asked_questions}
    for candidate in pool:
        if _normalize(candidate) not in asked_norm:
            return candidate
    return f"Can you describe an important engineering lesson you learned while solving a complex {difficulty}-level problem?"


STOPWORDS = {
    "what", "why", "how", "when", "where", "who", "which", "can", "you",
    "could", "would", "tell", "me", "about", "explain", "describe",
    "elaborate", "discuss", "the", "a", "an", "in", "on", "at", "to",
    "for", "of", "with", "by", "from", "your", "my", "our", "is",
    "are", "was", "were", "worked", "work", "working", "used", "use",
    "using", "project", "system", "application"
}

CATEGORY_SEQUENCE = [
    "resume_project",
    "follow_up",
    "technical_skill",
    "role_specific",
    "problem_solving",
    "resume_project",
    "technical_skill",
    "behavioral",
    "problem_solving",
    "follow_up",
]


def _normalize(text: str) -> str:
    """Strip punctuation, whitespace, and lowercase for reliable deduplication."""
    return re.sub(r"[^a-z0-9]", "", text.lower()) if text else ""


def _content_tokens(text: str) -> set[str]:
    """Extract significant content keywords from question text."""
    words = re.findall(r"\b[a-z0-9]+\b", text.lower())
    return {w for w in words if w not in STOPWORDS and len(w) > 2}


def _is_semantically_duplicate(candidate_q: str, asked_questions: list[str], threshold: float = 0.70) -> bool:
    """Check if candidate question is an exact or semantic duplicate of any previously asked question."""
    norm_candidate = _normalize(candidate_q)
    cand_tokens = _content_tokens(candidate_q)

    for asked in asked_questions:
        # Check 1: Exact normalized character match
        if norm_candidate == _normalize(asked):
            return True

        # Check 2: Content-word token overlap
        asked_tokens = _content_tokens(asked)
        if cand_tokens and asked_tokens:
            intersection = len(cand_tokens & asked_tokens)
            min_len = min(len(cand_tokens), len(asked_tokens))
            if min_len > 0 and (intersection / min_len) >= threshold:
                return True

    return False


def _get_target_category(question_index: int, previous_qa: list[dict[str, Any]]) -> str:
    """Select the interview category based on turn number and whether the last question was answered."""
    if question_index == 1:
        return "resume_project"

    if previous_qa:
        last_answer = (previous_qa[-1].get("answer", "") or "").strip().lower()
        is_skipped = any(
            kw in last_answer
            for kw in ("skip", "skipped", "opted to skip", "chose to skip", "pass", "no answer")
        )
        # If candidate provided a meaningful answer, follow up immediately
        if not is_skipped and len(last_answer) > 15 and question_index in (2, 4, 7):
            return "follow_up"

    idx = (question_index - 1) % len(CATEGORY_SEQUENCE)
    return CATEGORY_SEQUENCE[idx]


def _build_dynamic_resume_fallback(
    profile: dict[str, Any] | None,
    difficulty: str,
    asked_questions: list[str],
) -> str:
    """Synthesize a dynamic question grounded strictly in candidate's resume when LLM is unavailable."""
    profile = profile or {}
    projects = profile.get("projects", [])
    technologies = profile.get("technologies", []) or profile.get("skills", [])

    candidates: list[str] = []

    # 1. Project-specific candidates
    for p in projects:
        p_name = p.get("name", "") if isinstance(p, dict) else str(p)
        p_techs = p.get("technologies", []) if isinstance(p, dict) else []
        tech_str = p_techs[0] if p_techs else ""

        if p_name:
            if tech_str:
                candidates.append(
                    f"In your {p_name} project using {tech_str}, what was the most complex architectural decision you had to make?"
                )
                candidates.append(
                    f"How did you test and validate the implementation of your {p_name} system?"
                )
            else:
                candidates.append(
                    f"Can you explain the system architecture and data flow of your {p_name} project?"
                )
                candidates.append(
                    f"What technical challenges did you encounter while building {p_name}, and how did you resolve them?"
                )

    # 2. Technology / skill candidates
    for tech in technologies:
        if tech:
            candidates.append(
                f"How do you approach performance optimization and error handling when working with {tech}?"
            )
            candidates.append(
                f"In your experience with {tech}, what are the key trade-offs you consider during system design?"
            )

    # Filter out questions that have already been asked
    for cand in candidates:
        if not _is_semantically_duplicate(cand, asked_questions):
            return cand

    # If all profile-specific candidates exhausted or no profile, return non-repeating general technical question
    generic_pool = [
        f"Walk me through a difficult technical debugging scenario you resolved in a {difficulty} engineering task.",
        f"How do you approach designing resilient API contracts and data models under changing requirements?",
        f"What strategies do you employ to prevent performance bottlenecks and data inconsistencies in production systems?",
        f"Describe an architectural trade-off where you had to balance development speed against long-term maintainability.",
    ]
    for g in generic_pool:
        if not _is_semantically_duplicate(g, asked_questions):
            return g

    return f"Can you describe a key technical decision you made while solving a complex {difficulty}-level engineering challenge?"


async def generate_question(
    previous_qa: list[dict[str, Any]] | None = None,
    difficulty: str = "medium",
    session_id: str = "",
) -> str:
    """Generate a dynamic, resume-grounded interview question with deduplication and context-awareness."""
    previous_qa = previous_qa or []
    asked_questions = [qa["question"] for qa in previous_qa if "question" in qa]
    question_number = len(previous_qa) + 1

    # Retrieve cached profile and context for this session
    context = resume_context_cache.get(session_id) or ""
    profile = resume_context_cache.get_profile(session_id) or {}

    has_resume = bool(context or (profile and (profile.get("skills") or profile.get("projects"))))

    # Determine target category
    target_category = _get_target_category(question_number, previous_qa)

    # Logging as specified in Step 13
    logger.info("[AI] Generating question %d", question_number)
    logger.info("[AI] Previous questions: %d", len(asked_questions))
    logger.info("[AI] Resume context included: %s", "YES" if has_resume else "NO")

    # Build prompt
    prompt = build_question_generation_prompt(
        profile=profile,
        raw_context=context,
        previous_qa=previous_qa,
        difficulty=difficulty,
        target_category=target_category,
        asked_questions=asked_questions,
    )

    # Try LLM generation with deduplication retry
    for attempt in range(2):
        try:
            raw_response = await safe_ainvoke(prompt, max_tokens=60)
            question = strip_think_tags(raw_response).strip()

            # Take the first line and clean up quotes/numbering
            question = question.split("\n")[0].strip()
            question = re.sub(r'^(?:Question\s*\d*[:\-]?\s*|\d+[\.\)]\s*|Q[:\-]\s*|["\'])', '', question).strip()
            question = question.rstrip('"\'')

            # Ensure proper question mark
            if not question.endswith("?"):
                question += "?"

            # Enforce reasonable spoken length (voice-friendly: 10 to 32 words)
            words = question.split()
            if len(words) > 32:
                question = " ".join(words[:30]) + "?"

            # Verify question is non-empty and non-duplicate
            if question and len(question) > 10 and not _is_semantically_duplicate(question, asked_questions):
                logger.info("[AI] Generated question: %s", question)
                return question

            logger.warning(
                "[AI] Attempt %d generated duplicate or invalid question ('%s'). Retrying...",
                attempt + 1,
                question,
            )
            # Add explicit anti-duplicate reminder to prompt for retry
            prompt += f"\nCRITICAL: The question '{question}' was duplicate or too similar to past questions. Ask about a completely different project or technology from the resume."

        except (LLMUnavailableError, Exception) as e:
            logger.error("[AI] LLM question generation failed (attempt %d): %s", attempt + 1, e)

    # Dynamic fallback grounded in actual resume
    fallback_question = _build_dynamic_resume_fallback(profile, difficulty, asked_questions)
    logger.info("[AI] Generated question (grounded fallback): %s", fallback_question)
    return fallback_question
