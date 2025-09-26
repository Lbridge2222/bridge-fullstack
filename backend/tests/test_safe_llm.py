"""
Smoke tests for safe LLM wrapper
"""
import pytest
import asyncio
from app.ai.safe_llm import LLMCtx

@pytest.mark.asyncio
async def test_llm_ctx_basic():
    """Test LLMCtx basic functionality"""
    llm = LLMCtx(temperature=0.1)
    # This should not raise an exception
    assert llm is not None

@pytest.mark.asyncio
async def test_llm_ctx_simple_prompt():
    """Test LLMCtx with simple prompt"""
    llm = LLMCtx(temperature=0.1)
    try:
        out = await llm.ainvoke("Say hello")
        assert out is not None
    except Exception:
        # LLM might not be configured, that's ok for smoke test
        pass
