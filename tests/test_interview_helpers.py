from app.config import settings


def test_create_initial_state_shape():
    state = {
        "session_id": "abc-123",
        "current_question": "",
        "current_answer": "",
        "score": 0,
        "feedback": "",
        "difficulty": "hard",
        "question_count": 0,
        "question_limit": 3,
        "history": [],
        "report": {},
        "finished": False,
    }
    assert state["session_id"] == "abc-123"
    assert state["question_limit"] == 3
    assert state["difficulty"] == "hard"
    assert state["history"] == []
    assert state["finished"] is False


def test_settings_question_bounds():
    assert settings.min_question_count >= 1
    assert settings.max_question_count >= settings.min_question_count
    assert settings.default_question_count >= settings.min_question_count
    assert settings.default_question_count <= settings.max_question_count


def test_get_unused_fallback_never_repeats():
    from app.agents.interviewer_agent import _get_unused_fallback, _FALLBACK_QUESTIONS, _normalize

    difficulty = "medium"
    first_q = _FALLBACK_QUESTIONS[difficulty][0]
    next_q = _get_unused_fallback(difficulty, [first_q])

    assert _normalize(next_q) != _normalize(first_q)
    assert next_q in _FALLBACK_QUESTIONS[difficulty]


def test_normalize_strips_punctuation_and_case():
    from app.agents.interviewer_agent import _normalize

    assert _normalize("What is Docker?") == _normalize("what is docker")
    assert _normalize("API design, scalability & latency?") == _normalize("api design scalability latency")
