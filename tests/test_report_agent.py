import pytest

from app.agents.report_agent import _validate_report


def test_validate_report_clamps_score():
    report = _validate_report({"overall_score": 150, "strengths": "not a list"})
    assert report["overall_score"] == 100
    assert report["strengths"] == []


def test_validate_report_invalid_score():
    report = _validate_report({"overall_score": "bad"})
    assert report["overall_score"] == 0
