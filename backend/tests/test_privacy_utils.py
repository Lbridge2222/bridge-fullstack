from backend.app.ai.privacy_utils import anonymise_body, safe_preview


def test_anonymise_preserves_citation_lines_and_masks_universities():
    content = (
        "[S1] MSc Data Science Entry Requirements\n"
        "The University of Bristol is highly ranked.\n"
        "We also see interest in UCL and Oxford.\n"
    )
    out = anonymise_body(content, enabled=True)
    # Citation/title line remains intact
    assert out.splitlines()[0].startswith("[S1]")
    # Known names are masked
    assert "Bristol" not in out
    assert "UCL" not in out
    assert "Oxford" not in out
    assert out.count("a UK university") >= 2


def test_safe_preview_filters_to_allowlist():
    lead = {
        "name": "Priya",
        "status": "new",
        "courseInterest": "MSc DS",
        "leadScore": 72,
        "email": "priya@example.com",
        "phone": "+44123456789",
    }
    preview = safe_preview(lead)
    assert set(preview.keys()) == {"name", "status", "courseInterest", "leadScore"}
    assert "email" not in preview and "phone" not in preview


