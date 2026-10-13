import os
import tempfile
import pytest
from uuid import uuid4

from app.agents.interviewer_agent import (
    _content_tokens,
    _is_semantically_duplicate,
    generate_question,
)
from app.agents.resume_agent import analyze_resume, extract_structured_profile
from app.services.resume_cache import resume_context_cache
from app.tools.pdf_parser import (
    ResumeParseError,
    extract_text_from_file,
    extract_text_from_txt,
)

RESUME_A_TEXT = """
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

RESUME_B_TEXT = """
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

EXPERIENCE:
Software Engineer | CloudCommerce (2021 - Present)
- Developed enterprise REST APIs with Spring Boot and MySQL.
- Built interactive management portals with React and Redux.

PROJECTS:
OmniShop - Scalable E-Commerce Platform
- Built a high-concurrency e-commerce application using Spring Boot, MySQL, and React.
- Designed JWT authentication and role-based access control with Spring Security.
- Integrated payment gateways and order management pipelines with Kafka.

EDUCATION:
B.Eng. in Software Engineering | Tech University (2017 - 2021)
"""

RESUME_C_TEXT = """
Dr. David Chen
Machine Learning & Data Scientist
david.chen@example.com

SUMMARY:
Machine learning specialist with deep expertise in neural network architectures, predictive modeling, and scalable data pipelines.

TECHNICAL SKILLS:
Languages: Python, R, SQL
ML & Data Libraries: TensorFlow, PyTorch, Pandas, NumPy, Scikit-learn, XGBoost
Tools & Platforms: Jupyter, MLflow, Docker

PROJECTS:
NeuroForecast - Predictive Healthcare Analytics
- Built deep learning predictive models using TensorFlow and Pandas for patient admission forecasting.
- Processed over 2 million clinical time-series records using Pandas and NumPy.
- Optimized hyperparameter tuning pipelines achieving 94% ROC-AUC.

EDUCATION:
Ph.D. in Computer Science | Data Science Institute (2019 - 2023)
"""


def test_semantic_duplicate_checker():
    """Verify semantic deduplication detects both exact matches and close paraphrases."""
    asked = [
        "Can you explain the architecture of your Django certificate verification project?",
        "What challenges did you face when implementing SHA-256 hashing?",
    ]

    # Exact match
    assert _is_semantically_duplicate(
        "Can you explain the architecture of your Django certificate verification project?",
        asked,
    )

    # Paraphrase / reworded duplicate
    assert _is_semantically_duplicate(
        "Explain the architecture of the Django certificate verification system you built.",
        asked,
    )

    # Completely different question on same project
    assert not _is_semantically_duplicate(
        "How did you test and validate whether a certificate had been tampered with?",
        asked,
    )

    # Question on a different topic
    assert not _is_semantically_duplicate(
        "How do you handle connection pooling and transactions in PostgreSQL?",
        asked,
    )


def test_txt_resume_parsing():
    """Test extracting text from TXT files."""
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write(RESUME_A_TEXT)
        temp_path = f.name

    try:
        extracted = extract_text_from_file(temp_path)
        assert "CertiVault" in extracted
        assert "Django" in extracted
        assert "SHA-256" in extracted
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_empty_resume_handling():
    """Test proper error handling on empty files."""
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write("   \n\n  ")
        temp_path = f.name

    try:
        with pytest.raises(ResumeParseError):
            extract_text_from_file(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_structured_profile_extraction():
    """Test that structured profile extracts candidate name, skills, and projects."""
    import asyncio

    async def _run():
        profile = await extract_structured_profile(RESUME_A_TEXT)
        assert isinstance(profile, dict)

        skills_lower = [s.lower() for s in (profile.get("skills", []) + profile.get("technologies", []))]
        assert any("django" in s for s in skills_lower)
        assert any("python" in s for s in skills_lower)

        projects = profile.get("projects", [])
        assert len(projects) >= 1
        project_names = [p.get("name", "") if isinstance(p, dict) else str(p) for p in projects]
        assert any("certivault" in p.lower() or "certificate" in p.lower() for p in project_names)

    asyncio.run(_run())


def test_resume_differentiation():
    """Test that Resume A and Resume B generate distinct, resume-grounded questions."""
    import asyncio

    async def _run():
        session_a = str(uuid4())
        session_b = str(uuid4())

        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as fa:
            fa.write(RESUME_A_TEXT)
            path_a = fa.name

        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as fb:
            fb.write(RESUME_B_TEXT)
            path_b = fb.name

        try:
            # Ingest Resume A and Resume B
            await analyze_resume(path_a, session_id=session_a, original_filename="alex_morgan.txt")
            await analyze_resume(path_b, session_id=session_b, original_filename="samantha_lee.txt")

            # Generate Question 1 for Resume A
            q_a1 = await generate_question(previous_qa=[], difficulty="medium", session_id=session_a)
            # Generate Question 1 for Resume B
            q_b1 = await generate_question(previous_qa=[], difficulty="medium", session_id=session_b)

            assert q_a1.endswith("?")
            assert q_b1.endswith("?")
            # Must not be the same question
            assert q_a1.lower() != q_b1.lower()

            # Resume A question should reference Django / Blockchain / CertiVault / Python / SHA-256
            keywords_a = ["django", "blockchain", "certivault", "certificate", "sha-256", "python", "ledger"]
            has_kw_a = any(kw in q_a1.lower() for kw in keywords_a)
            assert has_kw_a, f"Expected Resume A question to mention relevant tech, got: '{q_a1}'"

            # Resume B question should reference Java / Spring / MySQL / React / OmniShop
            keywords_b = ["spring", "java", "react", "mysql", "omnishop", "commerce"]
            has_kw_b = any(kw in q_b1.lower() for kw in keywords_b)
            assert has_kw_b, f"Expected Resume B question to mention relevant tech, got: '{q_b1}'"

        finally:
            if os.path.exists(path_a):
                os.remove(path_a)
            if os.path.exists(path_b):
                os.remove(path_b)
            resume_context_cache.delete(session_a)
            resume_context_cache.delete(session_b)

    asyncio.run(_run())


def test_follow_up_context_awareness():
    """Test that answering a question produces a context-aware follow-up question."""
    import asyncio

    async def _run():
        session_id = str(uuid4())

        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
            f.write(RESUME_A_TEXT)
            path = f.name

        try:
            await analyze_resume(path, session_id=session_id, original_filename="resume_a.txt")

            q1 = "Can you explain the architecture of your CertiVault certificate verification system?"
            ans1 = "We used Django for the REST API and SHA-256 to hash certificate metadata before publishing the root hash to Ethereum testnet."

            history = [
                {
                    "question": q1,
                    "answer": ans1,
                    "score": 9,
                    "feedback": "Strong explanation of the hashing pipeline.",
                }
            ]

            q2 = await generate_question(previous_qa=history, difficulty="medium", session_id=session_id)

            assert q2.endswith("?")
            # Must not be identical or duplicate of q1
            assert not _is_semantically_duplicate(q2, [q1])
            # Follow-up should relate to SHA-256, Ethereum, Django, blockchain, or verification
            follow_up_keywords = ["sha-256", "hash", "ethereum", "blockchain", "django", "verification", "smart contract", "tamper", "certificate", "testnet"]
            has_followup_kw = any(kw in q2.lower() for kw in follow_up_keywords)
            assert has_followup_kw, f"Expected follow-up question to probe previous answer, got: '{q2}'"

        finally:
            if os.path.exists(path):
                os.remove(path)
            resume_context_cache.delete(session_id)

    asyncio.run(_run())
