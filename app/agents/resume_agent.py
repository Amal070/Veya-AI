import asyncio
import json
import logging
import re
from typing import Any

from app.llm import LLMUnavailableError, safe_ainvoke, strip_think_tags
from app.prompts.interview_prompts import RESUME_EXTRACTION_SYSTEM_PROMPT
from app.rag.ingest import ingest_resume
from app.services.resume_cache import resume_context_cache
from app.tools.pdf_parser import ResumeParseError, extract_text_from_file

logger = logging.getLogger(__name__)

MAX_CONTEXT_CHARS = 7000


def _heuristic_resume_profile(raw_text: str) -> dict[str, Any]:
    """Fallback heuristic extractor if LLM structured extraction is unavailable."""
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    candidate_name = lines[0] if lines else "Candidate"
    # Basic cleanup if first line looks like a header
    if any(h in candidate_name.lower() for h in ("resume", "curriculum", "cv", "page")):
        candidate_name = lines[1] if len(lines) > 1 else "Candidate"

    common_tech_patterns = [
        "python", "django", "fastapi", "flask", "java", "spring", "spring boot",
        "react", "angular", "vue", "next.js", "node.js", "express", "javascript",
        "typescript", "c++", "c#", ".net", "golang", "go", "rust", "php", "ruby",
        "rails", "postgresql", "mysql", "mongodb", "redis", "sqlite", "cassandra",
        "docker", "kubernetes", "aws", "gcp", "azure", "graphql", "rest", "blockchain",
        "ethereum", "solidity", "sha-256", "cryptography", "pandas", "numpy",
        "tensorflow", "pytorch", "scikit-learn", "machine learning", "deep learning",
        "nlp", "ci/cd", "git", "linux", "html", "css", "tailwind"
    ]

    lower_text = raw_text.lower()
    found_tech = [tech.title() for tech in common_tech_patterns if re.search(rf"\b{re.escape(tech)}\b", lower_text)]

    # Attempt to extract project lines
    projects = []
    current_section = ""
    for line in lines:
        lower_line = line.lower()
        if any(h in lower_line for h in ("project", "personal projects", "academic projects")):
            current_section = "projects"
            continue
        elif any(h in lower_line for h in ("experience", "work", "education", "skills", "certif")):
            if current_section == "projects":
                current_section = ""

        if current_section == "projects" and len(line) > 10:
            if re.match(r"^([•\-\*]|\d+\.|\b[A-Z][a-zA-Z0-9\s]{2,30}:)", line):
                projects.append({
                    "name": line.split(":")[0].strip("•-*0123456789. "),
                    "description": line,
                    "technologies": [t for t in found_tech if t.lower() in line.lower()],
                })

    return {
        "candidate_name": candidate_name[:50],
        "summary": raw_text[:300],
        "education": [],
        "experience": [],
        "internships": [],
        "projects": projects[:5],
        "skills": found_tech[:15],
        "programming_languages": [t for t in found_tech if t.lower() in ("python", "java", "javascript", "typescript", "c++", "golang", "rust")],
        "frameworks": [t for t in found_tech if t.lower() in ("django", "fastapi", "flask", "react", "spring boot", "node.js", "next.js")],
        "databases": [t for t in found_tech if t.lower() in ("postgresql", "mysql", "mongodb", "redis", "sqlite")],
        "cloud_technologies": [t for t in found_tech if t.lower() in ("aws", "gcp", "azure", "docker", "kubernetes")],
        "certifications": [],
        "achievements": [],
        "job_roles": [],
        "technologies": found_tech,
    }


def _clean_json_output(output: str) -> str:
    """Extract valid JSON from LLM response, stripping markdown code blocks."""
    cleaned = strip_think_tags(output).strip()
    if cleaned.startswith("```"):
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
        if match:
            cleaned = match.group(1).strip()
        else:
            cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned).strip()
    return cleaned


async def extract_structured_profile(raw_text: str) -> dict[str, Any]:
    """Call LLM to parse raw resume text into structured profile with heuristic fallback."""
    prompt = f"{RESUME_EXTRACTION_SYSTEM_PROMPT}\n\nRESUME CONTENT:\n{raw_text[:MAX_CONTEXT_CHARS]}"

    try:
        response_text = await safe_ainvoke(prompt, max_tokens=900)
        cleaned_json = _clean_json_output(response_text)
        profile = json.loads(cleaned_json)
        if isinstance(profile, dict) and (profile.get("skills") or profile.get("projects") or profile.get("technologies")):
            return profile
        logger.warning("LLM profile extraction returned incomplete schema, using heuristic merge.")
    except (LLMUnavailableError, json.JSONDecodeError, Exception) as e:
        logger.warning("LLM structured profile extraction failed (%s), using heuristic extraction.", e)

    return _heuristic_resume_profile(raw_text)


def _format_context_summary(profile: dict[str, Any], raw_text: str) -> str:
    """Format structured profile and raw text into a cohesive context string for LLM."""
    name = profile.get("candidate_name") or "Candidate"
    skills = ", ".join(profile.get("skills", []) or profile.get("technologies", []))
    techs = ", ".join(profile.get("technologies", []))

    projects_lines = []
    for p in profile.get("projects", []):
        if isinstance(p, dict):
            p_name = p.get("name", "Project")
            p_desc = p.get("description", "")
            p_tech = ", ".join(p.get("technologies", []))
            projects_lines.append(f"- {p_name} ({p_tech}): {p_desc}")
        elif isinstance(p, str):
            projects_lines.append(f"- {p}")

    summary_block = f"""Candidate Name: {name}
Key Skills: {skills or 'N/A'}
All Technologies: {techs or 'N/A'}
Projects:
{chr(10).join(projects_lines) if projects_lines else 'None explicitly listed'}
"""
    return f"{summary_block}\n\nFull Resume Extract:\n{raw_text[:4000]}"


async def analyze_resume(file_path: str, session_id: str, original_filename: str | None = None) -> dict[str, Any]:
    """Extract text from the resume (PDF, DOCX, TXT), create a structured profile,
    and cache it for the interview session.
    """
    logger.info("[RESUME] Resume uploaded: %s for session %s", original_filename or file_path, session_id)

    try:
        resume_text = await asyncio.to_thread(
            extract_text_from_file, file_path, filename=original_filename or file_path
        )
    except ResumeParseError:
        raise
    except Exception as e:
        logger.error("Unexpected file parsing failure: %s", e)
        raise ResumeParseError(f"Could not parse resume file: {e}") from e

    if not resume_text or not resume_text.strip():
        raise ResumeParseError("The uploaded resume file contains no readable text.")

    char_count = len(resume_text)
    logger.info("[RESUME] Text extracted: %d characters", char_count)

    # Generate structured profile via LLM (or heuristic fallback)
    structured_profile = await extract_structured_profile(resume_text)

    # Extract detected skills and projects for logging and context
    detected_skills = structured_profile.get("skills", []) or structured_profile.get("technologies", [])
    detected_projects = [
        p.get("name", "") if isinstance(p, dict) else str(p)
        for p in structured_profile.get("projects", [])
    ]
    detected_projects = [p for p in detected_projects if p]

    logger.info("[RESUME] Skills detected: %s", ", ".join(detected_skills[:12]) if detected_skills else "None")
    logger.info("[RESUME] Projects detected: %s", ", ".join(detected_projects[:5]) if detected_projects else "None")

    # Format context summary
    context_summary = _format_context_summary(structured_profile, resume_text)

    # Cache structured profile, context, and raw text
    resume_context_cache.set(
        session_id=session_id,
        context=context_summary,
        profile=structured_profile,
        raw_text=resume_text,
    )

    # Index into vector store asynchronously in background
    chunks = await asyncio.to_thread(ingest_resume, resume_text, session_id)

    return {
        "resume_text": resume_text,
        "chunks_stored": chunks,
        "profile": structured_profile,
    }
