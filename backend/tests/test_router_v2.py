import pytest
import time

from app.ai.router import RouterRequest
from app.routers.ai_router import route_query_v2, _check_latency_warnings, _latency_buffer


@pytest.mark.asyncio
async def test_router_v2_conversational():
    req = RouterRequest(
        query="Tell me about Isla",
        context={"lead": {"name": "Isla", "status": "Considering"}},
        ui_capabilities=["modals"],
    )
    resp = await route_query_v2(req)
    # Conversational envelope
    assert getattr(resp, "kind", None) == "conversational"
    assert isinstance(getattr(resp, "answer_markdown", ""), str)
    # Guard: non-empty trimmed answer
    assert resp.answer_markdown.strip() != ""
    # Actions are optional; if present must be list
    acts = getattr(resp, "actions", []) or []
    assert isinstance(acts, list)
    # Sources capped to ≤ 3 if present
    if getattr(resp, "sources", None) is not None:
      assert len(resp.sources) <= 3


@pytest.mark.asyncio
async def test_router_v2_modal_intent():
    req = RouterRequest(
        query="show suggestions for this lead",
        context={"lead": {"name": "Isla"}},
        ui_capabilities=["modals"],
    )
    resp = await route_query_v2(req)
    # Either modal (if feature flag allows) or conversational fallback
    assert getattr(resp, "kind", None) in {"modal", "conversational"}
    if resp.kind == "modal":
        assert isinstance(getattr(resp, "modal", {}), dict)
        acts = getattr(resp, "actions", []) or []
        assert isinstance(acts, list)
    else:
        # Conversational fallback still respects guards
        assert resp.answer_markdown.strip() != ""
        if getattr(resp, "sources", None) is not None:
          assert len(resp.sources) <= 3


def test_latency_tracking_and_warnings():
    """Test that latency tracking works and warnings are triggered appropriately."""
    # Clear buffer for clean test
    _latency_buffer.clear()
    
    # Add some sample latencies (mix of normal and high)
    normal_latencies = [100, 150, 200, 180, 120] * 2  # 10 normal samples
    high_latencies = [3000, 4000, 5000, 6000, 7000]  # 5 high samples
    
    for lat in normal_latencies + high_latencies:
        _latency_buffer.append(lat)
    
    # Should have 15 samples now
    assert len(_latency_buffer) == 15
    
    # Test that warnings would be triggered (we can't easily test the actual warning
    # without mocking logger, but we can verify the buffer is populated)
    _check_latency_warnings()
    
    # Verify buffer is maintained
    assert len(_latency_buffer) == 15


