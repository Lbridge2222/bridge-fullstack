"""
Smoke tests for AI router health
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    """Test basic health endpoint"""
    r = client.get("/ai/natural-language/health")
    assert r.status_code == 200

def test_router_endpoint():
    """Test AI router endpoint exists"""
    r = client.post("/ai/router/", json={
        "query": "test query",
        "context": {},
        "ui_capabilities": []
    })
    # Should not return 404 (endpoint exists)
    assert r.status_code != 404
