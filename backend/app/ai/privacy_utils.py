"""
Privacy and safety helpers for Ivy.

These utilities are drop-in and code-agnostic. They avoid logging PII and
support anonymising only the free-text body while preserving citation/title lines.
"""

from __future__ import annotations

from typing import Dict, Iterable, List
import re


def safe_preview(data: Dict, keys: Iterable[str] = ("name", "status", "courseInterest", "leadScore", "email", "phone", "source", "touchpoint_count", "last_engagement_date", "latest_academic_year", "conversion_probability", "ai_insights", "triage_score", "forecast", "gdpr_opt_in", "application_status", "enrollment_status")) -> Dict:
    """Return a minimal, PII-safe preview of a lead-like dict.

    - Filters to a small allowlist of fields
    - Returns an empty dict if input is not a dict
    """
    if not isinstance(data, dict):
        return {}
    return {key: data.get(key) for key in keys if key in data}


def anonymise_body(content: str, enabled: bool) -> str:
    """Anonymise only the body while preserving [S#] citation/title lines.

    - Protects lines that look like citations: "[S1] ..."
    - Replaces common UK university names and patterns with a neutral phrase
    - No-ops if `enabled` is False
    """
    if not enabled:
        return content

    def protect_blocks(text: str) -> (str, List[str]):
        blocks: List[str] = []

        def repl(match: re.Match) -> str:
            blocks.append(match.group(0))
            return f"@@B{len(blocks) - 1}@@"

        protected = re.sub(r"^\[S\d+\].*$", repl, text, flags=re.M)
        return protected, blocks

    def unprotect(text: str, blocks: List[str]) -> str:
        for index, block in enumerate(blocks):
            text = text.replace(f"@@B{index}@@", block)
        return text

    body, blocks = protect_blocks(content)

    patterns = [
        r"\bUniversity of [A-Za-z ]+\b",
        r"\b(King's College London|UCL|LSE|QMUL|Imperial College|Oxford|Cambridge|Warwick|Bristol|Manchester|Birmingham|Leeds|Sheffield|Liverpool|Newcastle|Nottingham|Southampton|York|Durham|Exeter|Bath|Cardiff|Glasgow|Edinburgh|St Andrews)\b",
    ]
    for pattern in patterns:
        body = re.sub(pattern, "a UK university", body, flags=re.IGNORECASE)

    return unprotect(body, blocks)


