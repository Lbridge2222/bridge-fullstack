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

def cleanse_conversational(text: str, intent: str = None, extra: dict = None) -> str:
    """
    Clean conversational text by removing headings, meta self-talk, and 
    enforcing 2-3 sentence format with British English tone.
    
    Args:
        text: Raw text to clean
        
    Returns:
        Cleaned text with 2-3 natural sentences
    """
    if not text:
        return text

    t = text.strip()

    # Strip common headings (case-insensitive)
    for heading in FORBIDDEN_HEADINGS:
        t = re.sub(heading, "", t, flags=re.IGNORECASE)

    # Remove bullet/markdown scaffolding only for basic intents
    # Preserve bullets for structured intents (policy, course, guidance, nba, apel) or when contract applied
    preserve_bullets = intent in ["policy_info", "course_info", "guidance", "nba", "lead_profile", "lead_info", "apel"] or (extra and extra.get("contract_applied"))
    if not preserve_bullets:
        t = re.sub(r"^[•\-\*]\s+", "", t, flags=re.MULTILINE)
        t = re.sub(r"\n{2,}", "\n", t)

    # Remove meta self-talk
    for phrase in FORBIDDEN_META_PHRASES:
        t = re.sub(phrase, "", t, flags=re.IGNORECASE)

    # Allow full responses for guidance and NBA intents (Content Contracts handle structure)
    sentences = re.split(r"(?<=[.!?])\s+", t)
    clean_sentences = [s.strip() for s in sentences if s.strip()]
    
    # Check if contract was applied - if so, preserve full structure
    contract_applied = extra and extra.get("contract_applied")
    
    # Only limit for basic intents, allow full responses for coaching/guidance/policy
    if intent in ["guidance", "nba", "lead_profile", "lead_info", "policy_info", "course_info", "general_help"] or contract_applied:
        # Let Content Contracts handle structure - don't truncate
        t = " ".join(clean_sentences)
    else:
        # Basic limitation for other intents
        max_sentences = 4
        if len(clean_sentences) > max_sentences:
            t = " ".join(clean_sentences[:max_sentences])
        else:
            t = " ".join(clean_sentences)

    # Fix mid-token line breaks (but preserve intentional paragraph breaks)
    t = re.sub(r":\s*\n\s*", ": ", t)                            # 'score: \n0.5' → 'score: 0.5'
    t = re.sub(r"(\d{4})\s*/\s*\n\s*(\d{2})", r"\1/\2", t)       # '2026/\n27' → '2026/27'
    t = re.sub(r"(\d{4})-\s*\n\s*(\d{2})-\s*\n\s*(\d{2})", r"\1-\2-\3", t)  # dates
    t = re.sub(r"(\d+)\s*/\s*\n\s*(\d+)", r"\1/\2", t)           # '123/\n456' → '123/456'
    t = re.sub(r"(\w+)\s*:\s*\n\s*(\w+)", r"\1: \2", t)          # 'key:\nvalue' → 'key: value'
    t = re.sub(r"(\w+)\s*=\s*\n\s*(\w+)", r"\1=\2", t)           # 'key=\nvalue' → 'key=value'
    t = re.sub(r"(\w+)\s*-\s*\n\s*(\w+)", r"\1-\2", t)           # 'word-\nword' → 'word-word'
    
    # Preserve paragraph breaks for readability - convert 2+ newlines to proper markdown paragraph breaks
    t = re.sub(r"\n{3,}", "\n\n", t)                             # Max 2 newlines (paragraph break)
    
    # Only collapse single stray newlines that aren't part of lists or paragraphs
    # Preserve newlines before bullets/list items
    t = re.sub(r"(?<!\n)\n(?![•\-\*\d])\s*(?!\n)", " ", t)      # Single \n → space (but not before bullets)
    
    # Clean up extra spaces (but not newlines)
    t = re.sub(r"[ \t]{2,}", " ", t).strip()
    
    # Avoid forcing specific role labels; keep original wording
    
    # Remove common filler phrases that slip past prompt instructions
    filler_phrases = [
        r'\bRight then\b',
        r'\bOkay\b',
        r'\bAlright\b',
        r'\bWell\b',
        r'\bSo\b'
    ]
    for phrase in filler_phrases:
        t = re.sub(phrase, '', t, flags=re.IGNORECASE)
    
    # Clean up any double spaces created by removals
    t = re.sub(r'\s{2,}', ' ', t)
    
    # Enforce British English spellings
    british_corrections = {
        r'\banalyze\b': 'analyse',
        r'\banalyzing\b': 'analysing',
        r'\banalyzed\b': 'analysed',
        r'\borganize\b': 'organise',
        r'\borganizing\b': 'organising',
        r'\borganized\b': 'organised',
        r'\brecognize\b': 'recognise',
        r'\brecognizing\b': 'recognising',
        r'\brecognized\b': 'recognised',
        r'\boptimize\b': 'optimise',
        r'\boptimizing\b': 'optimising',
        r'\boptimized\b': 'optimised',
        r'\bcenter\b': 'centre',
        r'\bcentered\b': 'centred',
        r'\bfavor\b': 'favour',
        r'\bfavored\b': 'favoured',
        r'\bhonor\b': 'honour',
        r'\bhonored\b': 'honoured',
        r'\blabor\b': 'labour',
        r'\blabored\b': 'laboured',
    }
    for american, british in british_corrections.items():
        t = re.sub(american, british, t, flags=re.IGNORECASE)
    
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

def scrub_contact_info(text: str, query: str | None = None) -> str:
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
