"""Centralized interview difficulty configuration and normalization for Veya AI.

Defines the core taxonomy, technical depth, reasoning complexity, prompt guidance,
and evaluation criteria for EASY, MEDIUM, and HARD interview tiers.
"""
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class DifficultyConfig:
    key: str  # "easy" | "medium" | "hard"
    level: str  # "Beginner" | "Intermediate" | "Advanced"
    complexity: str  # "Low" | "Moderate" | "High"
    reasoning: str  # "Basic" | "Applied" | "Deep analytical"
    scenario_complexity: str  # "Simple" | "Multi-step" | "Complex real-world situations"
    expected_answer_depth: str  # "Short explanation" | "Detailed explanation with examples" | "Detailed technical reasoning"
    technical_depth: str  # "Fundamentals" | "Implementation and trade-offs" | "Architecture, optimization, security, and edge cases"
    question_guide: str
    evaluation_guide: str


DIFFICULTY_CONFIGS: dict[str, DifficultyConfig] = {
    "easy": DifficultyConfig(
        key="easy",
        level="Beginner",
        complexity="Low",
        reasoning="Basic",
        scenario_complexity="Simple",
        expected_answer_depth="Short explanation",
        technical_depth="Fundamentals",
        question_guide=(
            "Generate questions that test fundamental knowledge, basic definitions, and the "
            "candidate's ability to explain their resume. Characteristics: basic definitions and "
            "concepts, simple questions about skills listed on the resume, basic project descriptions "
            "and technology choices, straightforward personal contributions, and direct, single-concept "
            "questions. DO NOT ask advanced architectural questions, high-concurrency scaling, "
            "security exploits, or deep distributed systems theory."
        ),
        evaluation_guide=(
            "Evaluate for fundamental correctness, basic conceptual understanding, and clarity of explanation. "
            "DO NOT penalize the candidate for omitting advanced implementation details, distributed scale, "
            "or edge-case optimization that were not required by the beginner-level question."
        ),
    ),
    "medium": DifficultyConfig(
        key="medium",
        level="Intermediate",
        complexity="Moderate",
        reasoning="Applied",
        scenario_complexity="Multi-step",
        expected_answer_depth="Detailed explanation with examples",
        technical_depth="Implementation and trade-offs",
        question_guide=(
            "Generate questions that test practical implementation, technical reasoning, problem-solving, "
            "and the ability to explain design decisions. Characteristics: questions involving multiple "
            "related concepts, practical implementation scenarios, project architecture and technical decisions, "
            "debugging and troubleshooting, comparisons between technologies, and trade-offs between solutions. "
            "Questions should require practical experience with the technologies mentioned on the resume."
        ),
        evaluation_guide=(
            "Evaluate for technical accuracy, practical application, logical reasoning, and implementation knowledge. "
            "The candidate should explain the rationale behind technical choices, debug logically, and demonstrate "
            "hands-on proficiency with their stack."
        ),
    ),
    "hard": DifficultyConfig(
        key="hard",
        level="Advanced",
        complexity="High",
        reasoning="Deep analytical",
        scenario_complexity="Complex real-world situations",
        expected_answer_depth="Detailed technical reasoning",
        technical_depth="Architecture, optimization, security, and edge cases",
        question_guide=(
            "Generate challenging questions that test deep technical understanding, architecture, scalability, "
            "performance optimization under high load, security vulnerabilities, edge cases, root-cause analysis, "
            "and multi-step reasoning. Ground every question strictly in the technologies, tools, and projects "
            "actually present on the resume or required by the target job role. DO NOT ask questions about "
            "unrelated technologies never mentioned on the resume."
        ),
        evaluation_guide=(
            "Evaluate for deep technical depth, analytical reasoning, sound architecture, awareness of security "
            "and performance trade-offs, and failure handling. DO NOT award high scores merely because an answer "
            "contains technical buzzwords — look for true correctness, depth, and rigorous technical justification."
        ),
    ),
}

VALID_DIFFICULTIES: tuple[str, ...] = ("easy", "medium", "hard")
DEFAULT_DIFFICULTY: str = "medium"

_DIFFICULTY_ALIASES: dict[str, str] = {
    "easy": "easy",
    "beginner": "easy",
    "basic": "easy",
    "low": "easy",
    "medium": "medium",
    "intermediate": "medium",
    "mid": "medium",
    "moderate": "medium",
    "hard": "hard",
    "advanced": "hard",
    "senior": "hard",
    "high": "hard",
}


def normalize_difficulty(val: Any, default: str = DEFAULT_DIFFICULTY) -> str:
    """Normalize user/client input into a canonical difficulty string ('easy' | 'medium' | 'hard').

    Gracefully falls back to default ('medium') if input is None, empty, or unrecognized.
    """
    if val is None:
        return default
    cleaned = str(val).strip().lower()
    return _DIFFICULTY_ALIASES.get(cleaned, default)


def is_valid_difficulty(val: Any) -> bool:
    """Check whether a given value maps to a valid recognized difficulty."""
    if val is None:
        return False
    cleaned = str(val).strip().lower()
    return cleaned in _DIFFICULTY_ALIASES


def get_difficulty_config(difficulty: str) -> DifficultyConfig:
    """Retrieve the DifficultyConfig for a difficulty string, falling back safely to medium."""
    norm = normalize_difficulty(difficulty)
    return DIFFICULTY_CONFIGS[norm]
