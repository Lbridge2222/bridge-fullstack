"""
Smoke tests for AI parser schema
"""
import pytest
import asyncio
from app.ai.runtime import flash_parse_query

@pytest.mark.asyncio
async def test_parser_schema():
    """Test parser returns expected schema"""
    p = await flash_parse_query("show me high score leads")
    assert set(["intent","entities","time_range","limit"]).issubset(p.keys())
    assert isinstance(p["intent"], str)
    assert isinstance(p["entities"], dict)
    assert isinstance(p["time_range"], dict)
    assert isinstance(p["limit"], int)

@pytest.mark.asyncio
async def test_parser_fallback():
    """Test parser fallback on invalid input"""
    p = await flash_parse_query("")
    assert p["intent"] == "general_search"
    assert p["limit"] == 50
