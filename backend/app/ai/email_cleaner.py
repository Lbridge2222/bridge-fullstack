"""
Email template cleaning utilities to fix common placeholder issues.
"""

import re
from typing import str


def clean_email_template(email_text: str) -> str:
    """
    Clean email templates by fixing common placeholder issues.
    
    Args:
        email_text: Raw email text from LLM
        
    Returns:
        Cleaned email text with fixed placeholders
    """
    if not email_text:
        return email_text
    
    # Fix "I hope this email finds you ." -> "I hope this email finds you well."
    email_text = re.sub(
        r"I hope this email finds you\s*\.", 
        "I hope this email finds you well.", 
        email_text, 
        flags=re.IGNORECASE
    )
    
    # Fix other common dangling placeholders
    email_text = re.sub(r"Dear\s+\.", "Dear [Name],", email_text)
    email_text = re.sub(r"Sincerely,\s*\.", "Sincerely,\n[Your Name]", email_text)
    
    # Fix multiple consecutive spaces
    email_text = re.sub(r"\s{2,}", " ", email_text)
    
    # Fix trailing periods after empty content
    email_text = re.sub(r"\s+\.\s+", ". ", email_text)
    
    return email_text.strip()
