"""
Full end-to-end verification script for Veya AI Resume-to-Question generation.
Tests 3 completely different resumes across multiple turns:
- Resume A: Python + Django + PostgreSQL + Blockchain
- Resume B: Java + Spring Boot + MySQL + React
- Resume C: Python + Machine Learning + Pandas + TensorFlow
"""
import asyncio
import os
import sys
import tempfile
from uuid import uuid4

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.interviewer_agent import generate_question, _is_semantically_duplicate
from app.agents.resume_agent import analyze_resume
from app.services.resume_cache import resume_context_cache

RESUME_A = """
Alex Morgan
Backend & Blockchain Engineer
Email: alex.morgan@example.com

SUMMARY:
Software Engineer with 4 years of experience building secure web architectures and distributed ledger applications.

SKILLS:
Python, Django, Django REST Framework, Solidity, PostgreSQL, Redis, SHA-256 Cryptography, Celery, Docker, Git

EXPERIENCE:
Senior Backend Developer | LedgerTech Solutions (2022 - Present)
- Designed and built cryptographic hashing and verification pipelines using SHA-256.
- Maintained high-throughput PostgreSQL databases with custom indexing strategies.

PROJECTS:
CertiVault - Blockchain Certificate Verification System
- Developed a Django-based certificate verification system using blockchain and SHA-256.
- Connected Django backend with Ethereum smart contracts for immutable academic credential hashes.
- Implemented tamper-detection mechanism ensuring instant validation against on-chain records.

EDUCATION:
B.S. in Computer Science | State University (2018 - 2022)
"""

RESUME_B = """
Samantha Lee
Enterprise Java & Full Stack Developer
Email: samantha.lee@example.com

SUMMARY:
Senior Full Stack Engineer with 5 years building scalable e-commerce systems, high-concurrency Spring Boot microservices, and React frontends.

SKILLS:
Java, Spring Boot, Spring Security, Hibernate, MySQL, React, Redux, Node.js, Kafka, Redis, REST APIs, Microservices

EXPERIENCE:
Senior Software Engineer | OmniCommerce Inc. (2021 - Present)
- Architected RESTful microservices using Spring Boot, JPA, and MySQL handling 10,000 requests/sec.
- Built customer-facing e-commerce web applications using React and Redux Toolkit.

PROJECTS:
OmniShop - Scalable Multi-Tenant E-Commerce Platform
- Built a React and Node.js with Spring Boot e-commerce application supporting real-time checkout and payment processing.
- Designed schema migrations and query caching in MySQL using Redis.
- Implemented stateless authentication using JWT and Spring Security filters.

EDUCATION:
B.Eng. in Software Engineering | Tech University (2017 - 2021)
"""

RESUME_C = """
Dr. David Chen
AI & Machine Learning Research Engineer
Email: david.chen@example.com

SUMMARY:
Machine Learning Engineer with PhD background focusing on deep learning architectures, time-series forecasting, and scalable data pipelines.

SKILLS:
Python, TensorFlow, PyTorch, Pandas, NumPy, Scikit-learn, XGBoost, Docker, MLflow, SQL, Model Training, Hyperparameter Tuning

EXPERIENCE:
Lead ML Engineer | HealthAI Labs (2022 - Present)
- Trained multi-layer neural network models using TensorFlow for predictive healthcare analytics.
- Architected data wrangling and feature engineering pipelines in Pandas for 10M+ medical time series records.

PROJECTS:
NeuroForecast - Clinical Admission Forecasting System
- Built deep learning models using Python, TensorFlow, and Pandas to forecast hospital patient admissions.
- Optimized model training pipelines, reducing inference latency by 45% using TensorFlow Lite.
- Implemented rigorous cross-validation and feature selection with Scikit-learn and Pandas.

EDUCATION:
Ph.D. in Computer Science | AI Research Institute (2018 - 2022)
"""


async def simulate_interview(resume_text: str, candidate_name: str, sample_answers: list[str]):
    session_id = str(uuid4())
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write(resume_text)
        temp_path = f.name

    try:
        # Step 1 & 2 & 3: Upload, extract, structure
        result = await analyze_resume(temp_path, session_id=session_id, original_filename=f"{candidate_name}.txt")
        profile = result.get("profile", {})
        print(f"\n{'='*70}")
        print(f"INTERVIEW FOR: {candidate_name.upper()} (Session ID: {session_id[:8]}...)")
        print(f"Detected Skills: {', '.join(profile.get('skills', [])[:8])}")
        print(f"Detected Projects: {[p.get('name') if isinstance(p, dict) else p for p in profile.get('projects', [])]}")
        print(f"{'='*70}")

        history = []
        questions = []

        for turn in range(len(sample_answers) + 1):
            q = await generate_question(previous_qa=history, difficulty="medium", session_id=session_id)
            questions.append(q)
            print(f"  Q{turn+1}: {q}")

            await asyncio.sleep(0.5)

            # Verify no duplication with prior questions in this interview
            prior_questions = questions[:-1]
            if prior_questions:
                assert not _is_semantically_duplicate(q, prior_questions), f"Duplicate question detected: {q}"

            if turn < len(sample_answers):
                ans = sample_answers[turn]
                print(f"  A{turn+1}: {ans}")
                history.append({
                    "question": q,
                    "answer": ans,
                    "score": 8,
                    "feedback": "Clear and detailed answer.",
                })

        return questions

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        resume_context_cache.delete(session_id)


async def main():
    print("RUNNING 3-RESUME COMPLETE DYNAMIC QUESTION GENERATION VERIFICATION...")

    # Candidate A Simulation
    answers_a = [
        "In CertiVault, we used Django to expose REST endpoints and calculated SHA-256 hashes of certificate records, which were batched and stored on Ethereum.",
        "We chose SHA-256 because it provides collision resistance and is natively supported by Ethereum EVM precompiles like sha256().",
        "We used Celery workers to asynchronously monitor transaction confirmations and update status in PostgreSQL.",
        "We tested tampering by modifying certificate payloads and verifying that the recalculated hash failed on-chain verification.",
    ]
    questions_a = await simulate_interview(RESUME_A, "Alex Morgan (Django + Blockchain)", answers_a)

    # Candidate B Simulation
    answers_b = [
        "In OmniShop, Spring Boot handles the core REST APIs, Hibernate manages MySQL persistence, and React handles the user cart state.",
        "We implemented JWT stateless authentication with Spring Security filters and refresh tokens stored in Redis.",
        "We used Kafka topic partitioning to distribute order events across fulfillment microservices.",
        "We optimized MySQL queries by creating composite indexes on merchant_id and created_at timestamps.",
    ]
    questions_b = await simulate_interview(RESUME_B, "Samantha Lee (Java + Spring Boot + React)", answers_b)

    # Candidate C Simulation
    answers_c = [
        "In NeuroForecast, we built LSTM neural networks in TensorFlow trained on historical admission data preprocessed with Pandas.",
        "Pandas allowed us to handle missing sensor values and resample irregular hospital time-series data into 1-hour intervals.",
        "We used early stopping and dropout layers in TensorFlow to avoid overfitting on the clinical dataset.",
        "We converted the trained model to TensorFlow Lite and evaluated inference latency on edge deployment.",
    ]
    questions_c = await simulate_interview(RESUME_C, "Dr. David Chen (Python + ML + TensorFlow)", answers_c)

    # Verify cross-resume differentiation
    print("\n" + "="*70)
    print("VERIFYING CROSS-RESUME DIFFERENTIATION:")
    print("="*70)

    # Check Candidate A questions focus on Django/Blockchain/SHA-256/CertiVault
    print(f"Resume A Q1: {questions_a[0]}")
    assert any(k in questions_a[0].lower() for k in ["certivault", "django", "blockchain", "certificate", "sha-256", "python"])

    # Check Candidate B questions focus on Spring/Java/MySQL/React/OmniShop
    print(f"Resume B Q1: {questions_b[0]}")
    assert any(k in questions_b[0].lower() for k in ["omnishop", "spring", "java", "react", "mysql", "commerce"])

    # Check Candidate C questions focus on TensorFlow/Pandas/ML/NeuroForecast
    print(f"Resume C Q1: {questions_c[0]}")
    assert any(k in questions_c[0].lower() for k in ["neuroforecast", "tensorflow", "pandas", "machine learning", "forecasting", "model"])

    # Ensure no intersection between Question 1 of different resumes
    assert questions_a[0].lower() != questions_b[0].lower()
    assert questions_a[0].lower() != questions_c[0].lower()
    assert questions_b[0].lower() != questions_c[0].lower()

    print("\nSUCCESS: All 3 resumes generated completely unique, tailored interview questions!")


if __name__ == "__main__":
    asyncio.run(main())
