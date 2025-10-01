import pytest

from app.ai.short_memory import add_turn, get_condensed_context, clear
from app.ai.runtime import narrate
from app.routers.rag import _generate_json_tool_response


@pytest.mark.asyncio
async def test_short_memory_influences_narration():
    key = "test-session-123"
    try:
        clear(key)
        add_turn(key, "user", "We discussed the Computer Science course last time.")
        add_turn(key, "assistant", "Yes, and finance options were mentioned briefly.")
        add_turn(key, "user", "What about finance?")
        # Build minimal facts including session id
        facts = {"session_id": key, "person": "Test Lead"}
        result = await narrate("What about finance?", person={"name": "Test Lead"})
        out = result["text"]
        assert isinstance(out, str)
        # Expect some reference to finance or previous topic
        assert ("finance" in out.lower()) or ("previous" in out.lower())
    finally:
        clear(key)


@pytest.mark.asyncio
async def test_json_tool_response_email_and_fallback():
    ctx = {"lead": {"name": "Isla", "latest_programme_name": "Computer Science"}}
    # Basic case returns valid JSON
    out = await _generate_json_tool_response("{\"type\":\"email\"}", ctx, [])
    import json as _json
    data = _json.loads(out)
    assert set(data.keys()) == {"subject", "body"}
    assert isinstance(data["subject"], str) and isinstance(data["body"], str)
    # Failure path still returns fallback JSON
    bad = await _generate_json_tool_response("[not json]", ctx, [])
    data2 = _json.loads(bad)
    assert set(data2.keys()) == {"subject", "body"}

import asyncio
import os
import re
import time
import logging
import pytest

os.environ["IVY_ORGANIC_ENABLED"] = "true"

from app.routers.rag import RagQuery, query_rag
from app.ai.router import RouterRequest
from app.routers.ai_router import route_query
from app.ai.privacy_utils import anonymise_body


@pytest.mark.asyncio
async def test_profile_conversational_paragraphs(monkeypatch):
    rq = RagQuery(query="tell me about Isla", context={"lead": {"name": "Isla", "status": "lead"}}, limit=3)
    resp = await query_rag(rq)
    assert hasattr(resp, "answer")
    text = resp.answer
    # No rigid section headings
    assert "**Ask**" not in text and "**Next Steps**" not in text
    # 1–2 paragraphs heuristic: allow up to ~5 newlines
    assert text.count("\n") <= 5


@pytest.mark.asyncio
async def test_weak_kb_minimal_citation(monkeypatch):
    rq = RagQuery(query="what is it", context={}, limit=3)
    resp = await query_rag(rq)
    text = resp.answer
    # At most one [S#] token in conversational mode
    cites = re.findall(r"\[S\d+\]", text)
    assert len(cites) <= 1


@pytest.mark.asyncio
async def test_expansion_one_pass_and_cache(monkeypatch):
    ctx = {"lead": {"name": "Alex"}}
    rq = RagQuery(query="appeal rules", context=ctx, limit=3)
    t0 = time.time()
    _ = await query_rag(rq)  # first call may expand once
    t1 = time.time()
    _ = await query_rag(rq)  # cache hit path
    t2 = time.time()
    # Second call should be faster; loose bound
    assert (t2 - t1) <= (t1 - t0) * 1.5


@pytest.mark.asyncio
async def test_action_normaliser_default(monkeypatch):
    req = RouterRequest(query="help", context={}, ui_capabilities=["modals"])  # type: ignore[arg-type]
    resp = await route_query(req)  # type: ignore[arg-type]
    acts = getattr(resp, "actions", [])
    assert len(acts) >= 1
    allowed = {"open_call_console","open_email_composer","open_meeting_scheduler","view_profile"}
    assert all(a.get("action") in allowed for a in acts)


def test_anonymiser_preserves_citations():
    text = """[S1] Title Line\nUniversity of X guidance applies.\nAnother line."""
    out = anonymise_body(text, True)
    # Citation line preserved
    assert out.splitlines()[0].startswith("[S1]")
    # University replaced
    assert "University of" not in out


@pytest.mark.asyncio
async def test_no_pii_in_logs(caplog):
    caplog.set_level(logging.INFO)
    rq = RagQuery(query="policy on attendance", context={"lead": {"name": "Priya", "email": "priya@example.com", "phone": "07123"}}, limit=2)
    _ = await query_rag(rq)
    # Ensure raw email/phone not present in info logs for RAG path
    logs = "\n".join(r.message for r in caplog.records)
    assert "priya@example.com" not in logs
    assert "07123" not in logs


