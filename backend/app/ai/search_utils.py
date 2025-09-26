"""
Text search helpers with an empty-keyword fallback that never throws.
"""

from __future__ import annotations

from typing import Iterable, List, Sequence, Tuple


def _extract_terms(keywords: str) -> List[str]:
    if not keywords:
        return []
    return [t for t in (keywords or "").split() if t]


def build_ilike_query(
    *,
    query: str,
    keywords: str | None,
    title_col: str = "title",
    content_col: str = "content",
) -> Tuple[str, List[str]]:
    """Build a simple ILIKE clause and params.

    - If `keywords` is empty/None, fallback to broad match on the raw `query` across title/content
    - Otherwise build pairs for each term: (title ILIKE %s OR content ILIKE %s) OR ...
    - Returns (sql_clause, params)
    """
    terms = _extract_terms(keywords or "")
    if not terms:
        where_parts = [f"{title_col} ILIKE %s", f"{content_col} ILIKE %s"]
        params = [f"%{query}%", f"%{query}%"]
        return "(" + " OR ".join(where_parts) + ")", params

    where_parts: List[str] = []
    params: List[str] = []
    for term in terms:
        where_parts.append(f"{title_col} ILIKE %s")
        where_parts.append(f"{content_col} ILIKE %s")
        params.append(f"%{term}%")
        params.append(f"%{term}%")
    return "(" + " OR ".join(where_parts) + ")", params


