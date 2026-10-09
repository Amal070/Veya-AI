"""
System prompts and templates for resume parsing, question generation, and
interviewer persona.
"""
import json
from typing import Any

RESUME_EXTRACTION_SYSTEM_PROMPT = """You are an expert technical resume parser and analyzer.
Your task is to analyze the raw resume text provided and convert it into a highly accurate, structured JSON profile.

CRITICAL INSTRUCTIONS:
1. Extract REAL information directly from the resume. Do NOT fabricate, assume, or hallucinate skills, projects, degrees, or companies.
2. Return ONLY a valid JSON object. Do not include markdown fences (like ```json), commentary, or explanations.
3. If a section is not present in the resume, use an empty list [] or empty string "".

JSON Schema required:
{
  "candidate_name": string,
  "summary": string,
  "education": [
    {
      "degree": string,
      "institution": string,
      "year": string,
      "field_of_study": string
    }
  ],
  "experience": [
    {
      "job_title": string,
      "company": string,
      "dates": string,
      "responsibilities": [string],
      "technologies_used": [string]
    }
  ],
  "internships": [
    {
      "role": string,
      "company": string,
      "dates": string,
      "details": string,
      "technologies": [string]
    }
  ],
  "projects": [
    {
      "name": string,
      "description": string,
      "technologies": [string],
      "architecture": string,
      "highlights": [string]
    }
  ],
  "skills": [string],
  "programming_languages": [string],
  "frameworks": [string],
  "databases": [string],
  "cloud_technologies": [string],
  "certifications": [string],
  "achievements": [string],
  "job_roles": [string],
  "technologies": [string]
}
Ensure all identified technologies, tools, and libraries appear in the "technologies" array.
"""


from app.difficulty import get_difficulty_config


def build_question_generation_prompt(
    profile: dict[str, Any] | None,
    raw_context: str,
    previous_qa: list[dict[str, Any]],
    difficulty: str,
    target_category: str,
    asked_questions: list[str],
    job_role: str = "",
) -> str:
    """Build a strongly grounded, difficulty-enforced prompt for the LLM interviewer."""
    profile = profile or {}
    diff_cfg = get_difficulty_config(difficulty)

    # Format structured profile highlights for the prompt
    projects_summary = []
    for p in profile.get("projects", []):
        if isinstance(p, dict):
            name = p.get("name", "Project")
            desc = p.get("description", "")
            techs = ", ".join(p.get("technologies", [])) or "None specified"
            arch = p.get("architecture", "")
            projects_summary.append(f"- Project: {name} | Tech: {techs} | Details: {desc} {arch}".strip())
        elif isinstance(p, str):
            projects_summary.append(f"- {p}")

    skills_list = profile.get("skills", [])
    techs_list = profile.get("technologies", [])
    frameworks_list = profile.get("frameworks", [])
    dbs_list = profile.get("databases", [])
    languages_list = profile.get("programming_languages", [])

    all_tech = list(dict.fromkeys(languages_list + frameworks_list + dbs_list + techs_list + skills_list))

    candidate_name = profile.get("candidate_name") or "the candidate"
    summary = profile.get("summary", "")

    # Analyze last answer and build follow-up guidance
    last_turn_guidance = ""
    if previous_qa:
        last = previous_qa[-1]
        last_q = last.get("question", "")
        last_a = last.get("answer", "")
        last_score = last.get("score", 10)
        is_skipped = any(
            kw in (last_a or "").lower()
            for kw in ("skip", "skipped", "opted to skip", "chose to skip", "pass", "no answer")
        )

        if is_skipped:
            last_turn_guidance = f"""
The candidate explicitly SKIPPED the previous question: "{last_q}".
CRITICAL: Do NOT follow up or re-ask anything related to that skipped topic. Move to a completely fresh topic from their resume at {difficulty.upper()} difficulty.
"""
        elif last_a and len(last_a.strip()) > 3:
            last_turn_guidance = f"""
Previous Q: "{last_q}"
Candidate's Answer: "{last_a}" (Score: {last_score}/10)

FOLLOW-UP DIRECTIVE:
If this turn is a follow-up, build naturally upon the candidate's previous response while STRICTLY MAINTAINING THE {difficulty.upper()} ({diff_cfg.level}) DIFFICULTY LEVEL.
- Under EASY: ask a clear clarifying question on basic concepts, why a tool was used, or their specific role. DO NOT escalate to system optimization or distributed architecture.
- Under MEDIUM: probe practical implementation details, troubleshooting, or technical rationale behind their choices.
- Under HARD: probe system resilience, security implications, scalability limits, or concurrency edge cases.
CRITICAL CONSTRAINT: Do NOT increase or decrease complexity based on whether the candidate answered well or poorly. The selected difficulty ({difficulty.upper()}) must remain the controlling constraint across the entire interview.
"""

    category_instructions = {
        "resume_project": (
            f"Focus on a specific PROJECT from the candidate's resume. "
            f"For {difficulty.upper()}, match technical depth: {diff_cfg.technical_depth}."
        ),
        "technical_skill": (
            f"Focus on a specific TECHNICAL SKILL, LANGUAGE, or FRAMEWORK explicitly present in the resume. "
            f"For {difficulty.upper()}, test: {diff_cfg.technical_depth}."
        ),
        "role_specific": (
            f"Ask an applied engineering question for the role {job_role or 'software engineer'} "
            f"using the tech stack present in their resume at {difficulty.upper()} depth."
        ),
        "behavioral": (
            "Ask a targeted engineering collaboration or problem-solving question grounded in their actual project experiences "
            "or work history (e.g. debugging under pressure, code reviews, or design decisions)."
        ),
        "problem_solving": (
            f"Present an engineering scenario related to their tech stack matching {difficulty.upper()} complexity "
            f"({diff_cfg.scenario_complexity}) and ask how they would handle it."
        ),
        "follow_up": (
            f"Formulate a context-aware follow-up question building directly upon the candidate's previous answer "
            f"at the strict {difficulty.upper()} difficulty level."
        ),
    }

    selected_category_desc = category_instructions.get(
        target_category, category_instructions["resume_project"]
    )

    resume_section = f"""<verified_resume_profile>
Candidate: {candidate_name}
Target Role: {job_role or "Software Engineer"}
Summary: {summary or "N/A"}
Explicit Technologies/Skills: {", ".join(all_tech) if all_tech else "Not specified"}
Projects:
{chr(10).join(projects_summary) if projects_summary else "No explicit projects found"}
Work Experience / Internships:
{json.dumps(profile.get("experience", []), indent=2)}
</verified_resume_profile>

<raw_resume_text>
{raw_context[:3500] if raw_context else "(No resume text available)"}
</raw_resume_text>"""

    prompt = f"""You are an elite AI technical interviewer conducting a live voice mock interview.

INTERVIEW SPECIFICATIONS:
- Target Difficulty: {difficulty.upper()} ({diff_cfg.level} Level)
- Complexity Level: {diff_cfg.complexity}
- Required Reasoning: {diff_cfg.reasoning}
- Scenario Complexity: {diff_cfg.scenario_complexity}
- Technical Depth: {diff_cfg.technical_depth}
- Target Job Role: {job_role or "Software Engineer"}
- Target Question Category: {target_category} ({selected_category_desc})
- Current Question Number: {len(previous_qa) + 1}

DIFFICULTY DIRECTIVE:
{diff_cfg.question_guide}

{resume_section}

QUESTIONS ALREADY ASKED IN THIS SESSION:
{json.dumps(asked_questions, indent=2) if asked_questions else "None yet (this is the first question)."}

{last_turn_guidance}

STRICT INTERVIEWER RULES:
1. GROUNDED IN RESUME: Every question must be grounded in the candidate's verified resume (their projects, technologies, tools, or past experience). If the target job role requires a standard concept, relate it to their background.
2. NEVER HALLUCINATE: Do NOT assume or invent technologies that are NOT present in the resume. If the resume has Python, Django, PostgreSQL, and Blockchain, do NOT ask about AWS, Kubernetes, or React unless they explicitly appear in the resume!
3. STRICT DIFFICULTY ENFORCEMENT:
   - EASY: Beginner level. Ask about fundamental definitions, purpose of projects, why a technology was chosen, or core language concepts (e.g., list vs tuple, primary keys, project features). DO NOT ask about architecture tradeoffs, scalability, or distributed systems.
   - MEDIUM: Intermediate level. Ask about practical implementation, how components integrate, troubleshooting, trade-offs between technologies, and design choices.
   - HARD: Advanced level. Ask about system scalability under high concurrency, security exploits & mitigation, edge-case failure modes, architectural trade-offs, and root-cause debugging.
4. STRICT UNIQUENESS: NEVER repeat, rephrase, or ask a question semantically equivalent to any question already asked.
5. VOICE-FRIENDLY & NATURAL: The question will be spoken aloud to the candidate via Text-to-Speech. Keep it concise (15 to 28 words), natural, and clear. Avoid robotic phrases like "Based on section 2 of your resume".
6. NO CODE PUZZLES: Do NOT ask the candidate to write syntax on a whiteboard or solve LeetCode algorithm puzzles line-by-line. Focus on conceptual clarity, engineering reasoning, and practical experience appropriate to {difficulty.upper()}.
7. OUTPUT FORMAT: Return ONLY the exact question text. No introductory remarks, no numbering, no markdown formatting, no explanations. Exactly one question ending with a question mark.
"""
    return prompt.strip()
