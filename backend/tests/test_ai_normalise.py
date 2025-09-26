"""
Smoke tests for AI normalization
"""
import pytest
import asyncio
from app.ai.runtime import normalize_user_text

@pytest.mark.asyncio
async def test_normalise_basic():
    """Test basic text normalization"""
    out = await normalize_user_text("plz show me leeds from las week")
    assert "leads" in out.lower()
    assert len(out) > 0

@pytest.mark.asyncio
async def test_normalise_empty():
    """Test empty input handling"""
    out = await normalize_user_text("")
    assert out == ""

@pytest.mark.asyncio
async def test_normalise_typos():
    """Test typo correction"""
    out = await normalize_user_text("converstion probablity")
    assert len(out) > 0
