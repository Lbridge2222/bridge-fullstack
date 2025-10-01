"""
Contract enforcement module for applying content contracts to AI responses.
"""

from typing import Optional, Dict, Any
import hashlib
import functools
from app.ai.content_rewriter import rewrite_answer
from app.ai.ui_models import ContentContract

# Simple in-memory cache for contract enforcement results
_contract_cache = {}


def enforce_contract(response_text: str, contract: Optional[ContentContract], context: Optional[Dict[str, Any]] = None) -> str:
    """
    Apply content contract to response text if contract is provided.
    Uses memoization to cache results for identical inputs.
    
    Args:
        response_text: The original response text
        contract: Content contract to apply (optional)
        context: Additional context for rewriting
        
    Returns:
        Rewritten text according to contract, or original text if no contract
    """
    if not contract:
        return response_text
    
    # Create cache key from response text and contract requirements
    cache_key = _create_cache_key(response_text, contract)
    
    # Check cache first
    if cache_key in _contract_cache:
        return _contract_cache[cache_key]
    
    try:
        # Apply the content rewriter with the contract
        rewritten = rewrite_answer(response_text, contract)
        
        # Clean email templates if this appears to be email content
        if _is_email_content(rewritten):
            rewritten = _clean_email_template(rewritten)
        
        # Cache the result (limit cache size to prevent memory issues)
        if len(_contract_cache) < 1000:  # Limit to 1000 cached results
            _contract_cache[cache_key] = rewritten
        
        return rewritten
    except Exception as e:
        # Log error but don't fail - return original text
        import logging
        logging.warning(f"Contract enforcement failed: {e}")
        return response_text


def _create_cache_key(response_text: str, contract: ContentContract) -> str:
    """Create a cache key from response text and contract requirements."""
    # Create a hash of the key components
    key_components = {
        "text": response_text,
        "mode": contract.mode,
        "course": contract.course,
        "must": sorted(contract.must),  # Sort for consistent hashing
        "context": contract.context or {}
    }
    
    # Create a hash of the key components
    key_string = str(key_components)
    return hashlib.md5(key_string.encode()).hexdigest()


def clear_contract_cache():
    """Clear the contract enforcement cache. Useful for testing."""
    global _contract_cache
    _contract_cache.clear()


def _is_email_content(text: str) -> bool:
    """Check if text appears to be email content."""
    email_indicators = [
        "Dear", "Sincerely", "Subject:", "I hope this email finds you",
        "Best regards", "Kind regards", "Thank you for your interest"
    ]
    return any(indicator in text for indicator in email_indicators)


def _clean_email_template(text: str) -> str:
    """Clean email templates by fixing common placeholder issues."""
    import re
    
    # Fix "I hope this email finds you ." -> "I hope this email finds you well."
    text = re.sub(
        r"I hope this email finds you\s*\.", 
        "I hope this email finds you well.", 
        text, 
        flags=re.IGNORECASE
    )
    
    # Fix other common dangling placeholders
    text = re.sub(r"Dear\s+\.", "Dear [Name],", text)
    text = re.sub(r"Sincerely,\s*\.", "Sincerely,\n[Your Name]", text)
    
    # Fix multiple consecutive spaces
    text = re.sub(r"\s{2,}", " ", text)
    
    # Fix trailing periods after empty content
    text = re.sub(r"\s+\.\s+", ". ", text)
    
    return text.strip()
