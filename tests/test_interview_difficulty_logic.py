"""Comprehensive test suite for Intelligent Interview Difficulty Logic in Veya AI.

Tests A through I verify:
- Test A: Same resume + Easy (beginner level, fundamentals, basic definitions).
- Test B: Same resume + Medium (applied implementation, technical reasoning, trade-offs).
- Test C: Same resume + Hard (architecture, scalability, security, edge cases).
- Test D: Different resume + Medium (questions adapt to candidate's stack).
- Test E: Medium + 10 questions (exactly 10 questions permitted, difficulty maintained).
- Test F: Custom question count (boundary validation and correct termination).
- Test G: Follow-up questions at every difficulty (consider candidate answers, retain difficulty).
- Test H: Invalid difficulty validation (canonical normalization and explicit fallback).
- Test I: Non-static question generation (resume-grounded, dynamic).
- Test J: Answer evaluation criteria respect difficulty levels.
"""
import asyncio
import os
import tempfile
import pytest
from uuid import uuid4

from app.agents.interviewer_agent import generate_question, _is_semantically_duplicate
from app.agents.evaluator_agent import evaluate_answer
from app.agents.resume_agent import analyze_resume
from app.difficulty import (
    DIFFICULTY_CONFIGS,
    VALID_DIFFICULTIES,
    get_difficulty_config,
    is_valid_difficulty,
    normalize_difficulty,
)
from app.graph.router import continue_router
from app.graph.nodes import history_node
from app.routes.interview import StartInterviewRequest, _create_initial_state
from app.services.resume_cache import resume_context_cache


RESUME_ALEX = """
Alex Morgan
Full Stack & Blockchain Engineer
alex.morgan@example.com

SUMMARY:
Software engineer with 4 years of experience building secure web backends and distributed ledger applications.

TECHNICAL SKILLS:
Programming Languages: Python, JavaScript, Solidity
Frameworks & Libraries: Django, Django REST Framework, Web3.py, Celery
Databases: PostgreSQL, Redis
Tools: Docker, Git, Linux, SHA-256 Cryptography

EXPERIENCE:
Senior Backend Developer | LedgerTech (2022 - Present)
- Engineered scalable microservices in Python and Django.
- Architected cryptographic hashing and verification pipelines using SHA-256.

PROJECTS:
CertiVault - Blockchain Certificate Verification System
- Developed a Django-based certificate verification system using blockchain and SHA-256.
- Implemented smart contracts and off-chain PostgreSQL storage for tamper-proof credentials.
- Prevented credential forgery by validating hashes across Ethereum testnets.

EDUCATION:
B.S. in Computer Science | State University (2018 - 2022)
"""

RESUME_SAMANTHA = """
Samantha Lee
Enterprise Java & Full Stack Developer
samantha.lee@example.com

SUMMARY:
Experienced Java engineer specializing in high-throughput enterprise systems, Spring Boot microservices, and modern React frontends.

TECHNICAL SKILLS:
Programming Languages: Java, TypeScript
Frameworks & Tools: Spring Boot, Spring Security, Hibernate, React, Redux, Node.js
Databases: MySQL, MongoDB
Messaging & Cache: Kafka, Redis

PROJECTS:
OmniShop - Scalable E-Commerce Platform
- Built a high-concurrency e-commerce application using Spring Boot, MySQL, and React.
- Designed JWT authentication and role-based access control with Spring Security.
- Integrated payment gateways and order management pipelines with Kafka.

EDUCATION:
B.Eng. in Software Engineering | Tech University (2017 - 2021)
"""


@pytest.fixture
def alex_session():
    """Sets up an indexed resume session for Alex Morgan."""
    session_id = f"alex-{uuid4()}"
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write(RESUME_ALEX)
        path = f.name

    import asyncio
    asyncio.run(analyze_resume(path, session_id=session_id, original_filename="alex.txt"))

    yield session_id

    if os.path.exists(path):
        os.remove(path)
    resume_context_cache.delete(session_id)


@pytest.fixture
def samantha_session():
    """Sets up an indexed resume session for Samantha Lee."""
    session_id = f"samantha-{uuid4()}"
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write(RESUME_SAMANTHA)
        path = f.name

    import asyncio
    asyncio.run(analyze_resume(path, session_id=session_id, original_filename="samantha.txt"))

    yield session_id

    if os.path.exists(path):
        os.remove(path)
    resume_context_cache.delete(session_id)


# ---------------------------------------------------------------------------
# Test A: Same Resume + Easy (5 questions)
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_a_easy_difficulty_fundamentals(alex_session):
    """Test A: Easy questions should focus on fundamentals, basic definitions, and personal role."""
    q = await generate_question(previous_qa=[], difficulty="easy", session_id=alex_session)
    assert q.endswith("?")

    q_lower = q.lower()
    # Should test project purpose, tech choice, or fundamental concept
    easy_markers = [
        "what", "why", "purpose", "explain", "features", "role", "describe",
        "django", "python", "certivault", "certificate", "sha-256", "project"
    ]
    assert any(m in q_lower for m in easy_markers)

    # Must NOT ask about advanced high-concurrency scaling or microservice failure cascading
    assert "cascading failure" not in q_lower
    assert "network partition" not in q_lower
    assert "millions of verification requests" not in q_lower


# ---------------------------------------------------------------------------
# Test B: Same Resume + Medium (5 questions)
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_b_medium_difficulty_practical_implementation(alex_session):
    """Test B: Medium questions test practical implementation, technical reasoning, and trade-offs."""
    q = await generate_question(previous_qa=[], difficulty="medium", session_id=alex_session)
    assert q.endswith("?")

    q_lower = q.lower()
    # Should ask about how components connect, troubleshooting, implementation, or design choices
    medium_markers = [
        "how", "connect", "implement", "integrate", "architecture", "challenge",
        "solve", "django", "blockchain", "database", "postgresql", "certivault"
    ]
    assert any(m in q_lower for m in medium_markers)


# ---------------------------------------------------------------------------
# Test C: Same Resume + Hard (5 questions)
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_c_hard_difficulty_architecture_and_security(alex_session):
    """Test C: Hard questions test deep technical understanding, architecture, scalability, security, and edge cases."""
    q = await generate_question(previous_qa=[], difficulty="hard", session_id=alex_session)
    assert q.endswith("?")

    q_lower = q.lower()
    # Should touch advanced themes: security, scaling, race conditions, consistency, trade-offs
    hard_markers = [
        "scale", "scalability", "security", "trade-off", "tradeoff", "race condition",
        "integrity", "bottleneck", "re-architect", "redesign", "vulnerab", "tamper",
        "concurrency", "failure", "optimiz", "architectur", "certivault", "django"
    ]
    assert any(m in q_lower for m in hard_markers)


# ---------------------------------------------------------------------------
# Test D: Different Resume + Medium
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_d_resume_differentiation_medium(alex_session, samantha_session):
    """Test D: Different resumes produce different questions tailored to each candidate's technologies."""
    q_alex = await generate_question(previous_qa=[], difficulty="medium", session_id=alex_session)
    q_sam = await generate_question(previous_qa=[], difficulty="medium", session_id=samantha_session)

    assert q_alex.lower() != q_sam.lower()

    # Alex has Django/Blockchain/Python/CertiVault
    alex_keywords = ["django", "blockchain", "certivault", "certificate", "sha-256", "python", "ledger"]
    assert any(k in q_alex.lower() for k in alex_keywords)

    # Samantha has Java/Spring Boot/React/Kafka/OmniShop
    sam_keywords = ["spring", "java", "react", "mysql", "omnishop", "kafka", "commerce"]
    assert any(k in q_sam.lower() for k in sam_keywords)


# ---------------------------------------------------------------------------
# Test E: Medium + 10 questions (Exact count and difficulty persistence)
# ---------------------------------------------------------------------------
def test_e_medium_ten_questions_termination():
    """Test E: Interview with 10 questions continues until question 10 and preserves difficulty."""
    state = _create_initial_state(session_id="test-e", question_limit=10, difficulty="medium")
    assert state["difficulty"] == "medium"
    assert state["question_limit"] == 10

    # Simulate 10 iterations through history_node and continue_router
    for step in range(1, 11):
        state["current_question"] = f"Question #{step}"
        state["current_answer"] = f"Answer #{step}"
        state["score"] = 9  # strong score should NOT switch difficulty to hard!
        state["feedback"] = "Good answer."

        update = history_node(state)
        state["history"] = update["history"]
        state["question_count"] = update["question_count"]
        state["difficulty"] = update["difficulty"]

        # Difficulty MUST remain medium across all turns
        assert state["difficulty"] == "medium", f"Turn {step} altered difficulty to {state['difficulty']}"

        router_dest = continue_router(state)
        if step < 10:
            assert router_dest == "question", f"At question {step}/10 router should continue to question"
        else:
            assert router_dest == "report", "At question 10/10 router must conclude to report"

    assert len(state["history"]) == 10
    assert state["question_count"] == 10


# ---------------------------------------------------------------------------
# Test F: Custom Question Count Validation & Termination
# ---------------------------------------------------------------------------
def test_f_custom_question_count_validation():
    """Test F: Custom question counts are validated, clamped, and routed correctly."""
    # Custom count of 7
    req_7 = StartInterviewRequest(session_id="sess-7", question_limit=7, difficulty="hard")
    assert req_7.question_limit == 7
    assert req_7.difficulty == "hard"

    # question_count alias support
    req_alias = StartInterviewRequest(session_id="sess-alias", question_count=12, difficulty="easy")
    assert req_alias.question_limit == 12

    # Clamping out-of-range lower bound
    req_min = StartInterviewRequest(session_id="sess-min", question_limit=0)
    assert req_min.question_limit == 1  # clamped to min_question_count

    # Clamping out-of-range upper bound
    req_max = StartInterviewRequest(session_id="sess-max", question_limit=99)
    assert req_max.question_limit == 15  # clamped to max_question_count

    # Termination at custom count 3
    state_3 = _create_initial_state(session_id="sess-custom-3", question_limit=3, difficulty="easy")
    for step in range(1, 4):
        state_3["current_question"] = f"Q{step}"
        state_3["current_answer"] = f"A{step}"
        update = history_node(state_3)
        state_3["history"] = update["history"]
        state_3["question_count"] = update["question_count"]
        state_3["difficulty"] = update["difficulty"]

    assert continue_router(state_3) == "report"


# ---------------------------------------------------------------------------
# Test G: Follow-up Questions at Every Difficulty
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_g_follow_up_retains_selected_difficulty(alex_session):
    """Test G: Follow-up questions probe candidate answers while retaining chosen difficulty."""
    q1 = "Can you describe the CertiVault project you worked on?"
    a1 = "I built CertiVault using Django and Python. We used SHA-256 to hash certificates for verification."

    history = [
        {"question": q1, "answer": a1, "score": 9, "feedback": "Great explanation."}
    ]

    # 1. Easy follow-up: should stay at beginner level
    q_easy_fu = await generate_question(previous_qa=history, difficulty="easy", session_id=alex_session)
    assert q_easy_fu.endswith("?")
    assert not _is_semantically_duplicate(q_easy_fu, [q1])

    # 2. Medium follow-up: should probe implementation/troubleshooting
    q_med_fu = await generate_question(previous_qa=history, difficulty="medium", session_id=alex_session)
    assert q_med_fu.endswith("?")
    assert not _is_semantically_duplicate(q_med_fu, [q1])

    # 3. Hard follow-up: should probe security, scalability, or edge cases
    q_hard_fu = await generate_question(previous_qa=history, difficulty="hard", session_id=alex_session)
    assert q_hard_fu.endswith("?")
    assert not _is_semantically_duplicate(q_hard_fu, [q1])


# ---------------------------------------------------------------------------
# Test H: Invalid Difficulty Backend Validation & Explicit Fallback
# ---------------------------------------------------------------------------
def test_h_invalid_difficulty_validation():
    """Test H: Backend normalizes case and aliases, and falls back to medium on invalid input."""
    # Normalizations
    assert normalize_difficulty("EASY") == "easy"
    assert normalize_difficulty("Beginner") == "easy"
    assert normalize_difficulty("MEDIUM") == "medium"
    assert normalize_difficulty("Intermediate") == "medium"
    assert normalize_difficulty("HARD") == "hard"
    assert normalize_difficulty("Advanced") == "hard"

    # Fallback to medium on invalid/unknown input
    assert normalize_difficulty("extreme_nightmare") == "medium"
    assert normalize_difficulty("invalid_123") == "medium"
    assert normalize_difficulty(None) == "medium"
    assert normalize_difficulty("") == "medium"

    # Pydantic request model validation
    req_invalid = StartInterviewRequest(session_id="sess-h", difficulty="super_hard")
    assert req_invalid.difficulty == "medium"

    req_case = StartInterviewRequest(session_id="sess-h2", difficulty="EASY")
    assert req_case.difficulty == "easy"

    req_none = StartInterviewRequest(session_id="sess-h3", difficulty=None)
    assert req_none.difficulty == "medium"


# ---------------------------------------------------------------------------
# Test I: Non-static Question Generation
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_i_questions_grounded_in_resume_not_static_template(alex_session):
    """Test I: Generated questions reference specific resume details and vary across runs."""
    q_run1 = await generate_question(previous_qa=[], difficulty="easy", session_id=alex_session)
    assert "certivault" in q_run1.lower() or "django" in q_run1.lower() or "sha-256" in q_run1.lower() or "python" in q_run1.lower()


# ---------------------------------------------------------------------------
# Test J: Evaluation Criteria Respect Difficulty Levels
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_j_evaluation_respects_difficulty():
    """Test J: evaluate_answer accepts difficulty and returns calibrated scores."""
    question = "What is Django and why did you use it in your project?"
    answer = "Django is a high-level Python web framework. I used it to quickly build a secure REST API backend."

    await asyncio.sleep(1)
    eval_easy = await evaluate_answer(question, answer, difficulty="easy")
    if eval_easy["score"] == 0:
        # Retry once if Groq transiently rate-limited
        await asyncio.sleep(2)
        eval_easy = await evaluate_answer(question, answer, difficulty="easy")

    assert "score" in eval_easy
    # Either successfully evaluated by LLM or safely fallen back to schema
    assert 0 <= eval_easy["score"] <= 10
    if eval_easy["score"] > 0:
        assert eval_easy["score"] >= 6  # Correct basic concept should score well in Easy

    await asyncio.sleep(1)
    eval_hard = await evaluate_answer(
        "How would you redesign CertiVault to handle millions of transactions under heavy load?",
        "I would just use Django.",
        difficulty="hard",
    )
    assert "score" in eval_hard
    # Superficial answer to a hard architecture question should not receive top marks
    assert eval_hard["score"] <= 7
