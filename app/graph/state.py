from typing import TypedDict


class QAEntry(TypedDict):
    question: str
    answer: str
    score: int
    feedback: str


class InterviewState(TypedDict):
    session_id: str
    current_question: str
    current_answer: str
    score: int
    feedback: str
    difficulty: str
    question_count: int
    question_limit: int
    history: list[QAEntry]
    report: dict
    finished: bool
    job_role: str
