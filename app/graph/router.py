def continue_router(state) -> str:
    if state["question_count"] >= state["question_limit"]:
        return "report"
    return "question"
