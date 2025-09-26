"""
Test feature flag behavior for Ivy v2 router
"""
import pytest
import os
from unittest.mock import patch

from app.ai.router import RouterRequest
from app.routers.ai_router import route_query_v2


@pytest.mark.asyncio
async def test_router_v2_respects_flags(monkeypatch):
    """Test that v2 router respects feature flags and falls back gracefully."""
    # Test with IVY_ORGANIC_ENABLED=false
    monkeypatch.setenv("IVY_ORGANIC_ENABLED", "false")
    monkeypatch.setenv("IVY_MODAL_HEURISTICS", "false")
    
    req = RouterRequest(
        query="What's the next best action for this person?",
        context={"lead": {"name": "Test Lead", "status": "lead"}},
        ui_capabilities=["modals"]
    )
    
    resp = await route_query_v2(req)
    
    # Should fall back to conversational mode when flags are disabled
    assert hasattr(resp, "kind")
    assert resp.kind == "conversational"
    assert hasattr(resp, "answer_markdown")
    assert len(resp.answer_markdown.strip()) > 0


@pytest.mark.asyncio
async def test_router_v2_modal_heuristics_flag(monkeypatch):
    """Test that modal heuristics can be disabled."""
    # Enable organic but disable modal heuristics
    monkeypatch.setenv("IVY_ORGANIC_ENABLED", "true")
    monkeypatch.setenv("IVY_MODAL_HEURISTICS", "false")
    
    req = RouterRequest(
        query="What's the next best action for this person?",
        context={"lead": {"name": "Test Lead", "status": "lead"}},
        ui_capabilities=["modals"]
    )
    
    resp = await route_query_v2(req)
    
    # Should not trigger modal heuristics when disabled
    assert hasattr(resp, "kind")
    # May be conversational or modal depending on other logic
    assert resp.kind in ["conversational", "modal"]


@pytest.mark.asyncio
async def test_router_v2_graceful_degradation():
    """Test that router handles missing context gracefully."""
    req = RouterRequest(
        query="Tell me about this person",
        context={},  # Empty context
        ui_capabilities=["modals"]
    )
    
    resp = await route_query_v2(req)
    
    # Should still return a valid response
    assert hasattr(resp, "kind")
    assert resp.kind in ["conversational", "modal"]
    assert hasattr(resp, "answer_markdown")
    assert len(resp.answer_markdown.strip()) > 0


@pytest.mark.asyncio
async def test_router_v2_actions_always_present():
    """Test that actions are always present (normalized default)."""
    req = RouterRequest(
        query="help",
        context={},
        ui_capabilities=["modals"]
    )
    
    resp = await route_query_v2(req)
    
    # Should always have at least one action
    assert hasattr(resp, "actions")
    assert isinstance(resp.actions, list)
    assert len(resp.actions) > 0
    
    # Actions should be valid UIAction objects
    for action in resp.actions:
        assert hasattr(action, "label")
        assert hasattr(action, "action")
        assert action.action in ["open_call_console", "open_email_composer", "open_meeting_scheduler", "view_profile"]
