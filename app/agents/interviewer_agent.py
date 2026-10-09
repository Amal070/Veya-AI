import logging
import re
from typing import Any

from app.difficulty import normalize_difficulty
from app.llm import LLMUnavailableError, safe_ainvoke, strip_think_tags
from app.prompts.interview_prompts import build_question_generation_prompt
from app.services.resume_cache import resume_context_cache

logger = logging.getLogger(__name__)

_FALLBACK_QUESTIONS = {
    "easy": [
        "Can you explain the main purpose and features of your project?",
        "What is Django, and why did you use it in your project?",
        "What is the difference between a list and a tuple in Python?",
        "What is a primary key in a relational database?",
        "Can you tell me about a project on your resume you are most proud of?",
        "What core skills and technologies did you contribute to your most recent project?",
    ],
    "medium": [
        "How did you connect your backend services with your database in your project?",
        "How would you optimize a slow database query in your project?",
        "How would you implement secure JWT authentication in a web application?",
        "How would you debug an API endpoint that returns unexpected or incorrect results?",
        "Walk me through a technical challenge you faced recently and how you solved it.",
        "How do you prevent race conditions and manage state in asynchronous systems?",
    ],
    "hard": [
        "How would you redesign your system to handle millions of requests while maintaining data integrity?",
        "What security risks could arise from your authentication design, and how would you mitigate them?",
        "How would you investigate a database bottleneck under heavy concurrent traffic?",
        "How would you prevent race conditions and duplicate processing in a high-traffic API?",
        "Describe a difficult architectural trade-off you made and what constraints guided your decision.",
        "How do you ensure data consistency across distributed microservices under network partitions?",
    ],
}


def _get_unused_fallback(difficulty: str, asked_questions: list[str]) -> str:
    diff = normalize_difficulty(difficulty)
    pool = _FALLBACK_QUESTIONS.get(diff, _FALLBACK_QUESTIONS["medium"])
    asked_norm = {_normalize(q) for q in asked_questions}
    for candidate in pool:
        if _normalize(candidate) not in asked_norm:
            return candidate
    return f"Can you describe an important engineering lesson you learned while solving a {diff}-level technical problem?"


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
    diff = normalize_difficulty(difficulty)
    profile = profile or {}
    projects = profile.get("projects", [])
    technologies = profile.get("technologies", []) or profile.get("skills", [])

    candidates: list[str] = []

    # 1. Project-specific candidates based on difficulty
    for p in projects:
        p_name = p.get("name", "") if isinstance(p, dict) else str(p)
        p_techs = p.get("technologies", []) if isinstance(p, dict) else []
        tech_str = p_techs[0] if p_techs else ""

        if not p_name:
            continue

        if diff == "easy":
            candidates.append(
                f"Can you explain the main purpose and key features of your {p_name} project?"
            )
            if tech_str:
                candidates.append(
                    f"What led you to choose {tech_str} for your {p_name} project?"
                )
            candidates.append(
                f"What were your primary responsibilities and contributions on the {p_name} project?"
            )
        elif diff == "hard":
            candidates.append(
                f"How would you redesign {p_name} to handle millions of requests while maintaining data integrity?"
            )
            candidates.append(
                f"What security risks or vulnerabilities could arise in {p_name}, and how would you mitigate them?"
            )
            if tech_str:
                candidates.append(
                    f"What architectural trade-offs did you make when implementing {p_name} using {tech_str}?"
                )
            candidates.append(
                f"How would you prevent race conditions and duplicate operations in {p_name} under heavy concurrency?"
            )
        else:  # medium
            if tech_str:
                candidates.append(
                    f"How did you connect {tech_str} with the rest of your architecture in the {p_name} project?"
                )
            candidates.append(
                f"What technical challenge did you face while building {p_name}, and how did you solve it?"
            )
            candidates.append(
                f"How did you test and validate the components of your {p_name} system?"
            )

    # 2. Technology / skill candidates based on difficulty
    for tech in technologies:
        if not tech:
            continue
        if diff == "easy":
            candidates.append(
                f"What is {tech}, and what are its core advantages in modern development?"
            )
            candidates.append(
                f"What fundamental concepts of {tech} did you use most frequently in your work?"
            )
        elif diff == "hard":
            candidates.append(
                f"How would you investigate and resolve severe performance bottlenecks or memory leaks when using {tech}?"
            )
            candidates.append(
                f"What are the most critical architectural failure modes and edge cases when working with {tech} at scale?"
            )
        else:  # medium
            candidates.append(
                f"How do you approach error handling and testing when developing applications with {tech}?"
            )
            candidates.append(
                f"In your experience with {tech}, what key trade-offs do you consider during implementation?"
            )

    # Filter out questions that have already been asked
    for cand in candidates:
        if not _is_semantically_duplicate(cand, asked_questions):
            return cand

    # If all profile-specific candidates exhausted or no profile, return non-repeating difficulty-matched technical question
    if diff == "easy":
        generic_pool = [
            "What is the difference between a list and a tuple in Python?",
            "What is a primary key in a relational database, and why is it important?",
            "Can you explain how you approach debugging when an application throws a simple error?",
            "What are the key differences between synchronous and asynchronous code execution?",
        ]
    elif diff == "hard":
        generic_pool = [
            "How would you investigate a database bottleneck under heavy concurrent traffic?",
            "How do you ensure data consistency across distributed microservices under network partitions?",
            "How would you architect a zero-downtime schema migration strategy for high-throughput tables?",
            "How do you mitigate cascading failures and rate-limit abusive traffic across distributed clusters?",
        ]
    else:  # medium
        generic_pool = [
            "How would you optimize a slow SQL database query in your application?",
            "How would you implement JWT authentication and authorization in a backend API?",
            "How do you design RESTful APIs for high reliability, clean error handling, and versioning?",
            "How do you prevent race conditions and manage state in asynchronous systems?",
        ]

    for g in generic_pool:
        if not _is_semantically_duplicate(g, asked_questions):
            return g

    return _get_unused_fallback(diff, asked_questions)


async def generate_question(
    previous_qa: list[dict[str, Any]] | None = None,
    difficulty: str = "medium",
    session_id: str = "",
    job_role: str = "",
) -> str:
    """Generate a dynamic, resume-grounded interview question with deduplication and context-awareness."""
    diff = normalize_difficulty(difficulty)
    previous_qa = previous_qa or []
    asked_questions = [qa["question"] for qa in previous_qa if "question" in qa]
    question_number = len(previous_qa) + 1

    # Retrieve cached profile and context for this session
    context = resume_context_cache.get(session_id) or ""
    profile = resume_context_cache.get_profile(session_id) or {}

    has_resume = bool(context or (profile and (profile.get("skills") or profile.get("projects"))))

    # Determine target category
    target_category = _get_target_category(question_number, previous_qa)

    logger.info(
        "[AI] Generating question %d (difficulty=%s, role=%s)",
        question_number,
        diff,
        job_role or "N/A",
    )
    logger.info("[AI] Previous questions: %d", len(asked_questions))
    logger.info("[AI] Resume context included: %s", "YES" if has_resume else "NO")

    # Build prompt
    prompt = build_question_generation_prompt(
        profile=profile,
        raw_context=context,
        previous_qa=previous_qa,
        difficulty=diff,
        target_category=target_category,
        asked_questions=asked_questions,
        job_role=job_role,
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
                logger.info("[AI] Generated question (%s): %s", diff, question)
                return question

            logger.warning(
                "[AI] Attempt %d generated duplicate or invalid question ('%s'). Retrying...",
                attempt + 1,
                question,
            )
            # Add explicit anti-duplicate reminder to prompt for retry
            prompt += f"\nCRITICAL: The question '{question}' was duplicate or too similar to past questions. Ask about a completely different project or technology from the resume at {diff.upper()} difficulty."

        except (LLMUnavailableError, Exception) as e:
            logger.error("[AI] LLM question generation failed (attempt %d): %s", attempt + 1, e)

    # Dynamic fallback grounded in actual resume
    fallback_question = _build_dynamic_resume_fallback(profile, diff, asked_questions)
    logger.info("[AI] Generated question (grounded fallback - %s): %s", diff, fallback_question)
    return fallback_question
