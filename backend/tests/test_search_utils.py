from app.routers.rag import mmr_select, dedupe_passages


def test_dedupe_passages():
    """Test passage content deduplication by SHA1 hash."""
    candidates = [
        {"id": "1", "content": "This is a long passage about computer science that should be deduplicated", "similarity_score": 0.9},
        {"id": "2", "content": "This is a long passage about computer science that should be deduplicated", "similarity_score": 0.88},  # Duplicate content
        {"id": "3", "content": "Different content about mathematics", "similarity_score": 0.86},
        {"id": "4", "content": "This is a long passage about computer science that should be deduplicated", "similarity_score": 0.84},  # Another duplicate
    ]
    out = dedupe_passages(candidates)
    # Should have only 2 unique passages
    assert len(out) == 2
    # Should keep the highest scoring duplicate
    assert out[0]["id"] == "1"  # Highest score kept
    assert out[1]["id"] == "3"  # Different content kept


def test_mmr_dedupe_and_category_diversity():
    candidates = [
        {"id": "1", "title": "Policy A", "content": "...", "document_type": "kb", "category": "policy", "similarity_score": 0.9},
        {"id": "2", "title": "Policy A", "content": "...", "document_type": "kb", "category": "policy", "similarity_score": 0.88},
        {"id": "3", "title": "Course Guide", "content": "...", "document_type": "kb", "category": "course", "similarity_score": 0.86},
        {"id": "4", "title": "Admissions Steps", "content": "...", "document_type": "kb", "category": "process", "similarity_score": 0.84},
        {"id": "5", "title": "Policy A", "content": "...", "document_type": "kb", "category": "policy", "similarity_score": 0.83},
    ]
    out = mmr_select([0.0], candidates, k=3)
    titles = [o["title"].lower() for o in out]
    assert len(titles) == len(set(titles))
    cats = [o.get("category") for o in out]
    assert len(set(cats)) >= 2

from backend.app.ai.search_utils import build_ilike_query


def test_build_ilike_query_empty_keywords_falls_back_to_broad_match():
    clause, params = build_ilike_query(query="data science", keywords="")
    assert "title ILIKE %s" in clause and "content ILIKE %s" in clause
    assert params == ["%data science%", "%data science%"]


def test_build_ilike_query_with_keywords_builds_pairs():
    clause, params = build_ilike_query(query="ignored when keywords", keywords="msc data")
    # Should have 2 terms * 2 columns = 4 placeholders
    assert clause.count("ILIKE %s") == 4
    assert params == ["%msc%", "%msc%", "%data%", "%data%"]


