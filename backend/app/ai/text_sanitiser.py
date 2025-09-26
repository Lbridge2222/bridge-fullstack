"""
Conversational text sanitizer to ensure clean, natural responses.
Removes headings, meta self-talk, and enforces 1-2 sentence format.
"""
import re
from typing import Optional

# Forbidden heading patterns (case-insensitive)
FORBIDDEN_HEADINGS = [
    r"\*\*what you know\*\*",
    r"\*\*say\*\*", 
    r"\*\*ask\*\*",
    r"\*\*next steps\*\*",
    r"\*\*what you know\*\*",
    r"\*\*ask\*\*",
    r"\*\*say\*\*",
    r"\*\*next steps\*\*",
]

# Forbidden meta self-talk phrases
FORBIDDEN_META_PHRASES = [
    r"\bokay,?\s*i['']m ready to assist\b",
    r"\bi can open\b",
    r"\bi can pull up\b", 
    r"\blet me\b",
    r"\bi can help\b",
    r"\bi will\b",
    r"\bi'll\b",
    r"\bhere's what i can\b",
    r"\bto help you\b",
    r"\bto assist you\b",
]

def cleanse_conversational(text: str) -> str:
    """
    Clean conversational text by removing headings, meta self-talk, and 
    enforcing 1-2 sentence format with British English tone.
    
    Args:
        text: Raw text to clean
        
    Returns:
        Cleaned text with 1-2 natural sentences
    """
    if not text:
        return text

    t = text.strip()

    # Strip common headings (case-insensitive)
    for heading in FORBIDDEN_HEADINGS:
        t = re.sub(heading, "", t, flags=re.IGNORECASE)

    # Remove bullet/markdown scaffolding
    t = re.sub(r"^[•\-\*]\s+", "", t, flags=re.MULTILINE)
    t = re.sub(r"\n{2,}", "\n", t)

    # Remove meta self-talk
    for phrase in FORBIDDEN_META_PHRASES:
        t = re.sub(phrase, "", t, flags=re.IGNORECASE)

    # Collapse to 1-2 sentences max
    sentences = re.split(r"(?<=[.!?])\s+", t)
    clean_sentences = [s.strip() for s in sentences if s.strip()]
    
    # Take first 2 sentences, ensure they're substantial
    if len(clean_sentences) >= 2:
        t = " ".join(clean_sentences[:2])
    elif len(clean_sentences) == 1:
        t = clean_sentences[0]
    else:
        t = "I can help with that."

    # Light whitespace tidy
    t = re.sub(r"\s{2,}", " ", t).strip()
    
    # Ensure it ends with proper punctuation
    if t and not t.endswith(('.', '!', '?')):
        t += "."
        
    return t

def _should_show_contact(query: str) -> bool:
    """
    Check if query is about contacting someone (email/phone/call).
    
    Args:
        query: User query text
        
    Returns:
        True if query is about contact methods
    """
    if not query:
        return False
    q = query.lower()
    contact_keywords = ["email", "phone", "call", "contact", "reach out", "get in touch"]
    return any(keyword in q for keyword in contact_keywords)

def scrub_contact_info(text: str, query: str) -> str:
    """
    Remove contact information (emails/phones) from text unless query is about contact.
    
    Args:
        text: Text that may contain contact info
        query: Original user query
        
    Returns:
        Text with contact info removed if not relevant
    """
    if _should_show_contact(query):
        return text
        
    # Remove email addresses and phone numbers
    text = re.sub(r"\b(?:\+?\d[\d\s\-()]{6,}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b", "", text, flags=re.IGNORECASE)
    
    return text
