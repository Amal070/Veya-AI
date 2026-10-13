from app.graph.router import continue_router


def test_continue_router_to_report():
    state = {"question_count": 5, "question_limit": 5}
    assert continue_router(state) == "report"


def test_continue_router_to_question():
    state = {"question_count": 2, "question_limit": 5}
    assert continue_router(state) == "question"


def test_continue_router_at_boundary():
    state = {"question_count": 4, "question_limit": 5}
    assert continue_router(state) == "question"
