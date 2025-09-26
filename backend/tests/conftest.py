import json
import os
import pytest


@pytest.fixture(autouse=True)
def stub_embeddings(monkeypatch):
    from app.routers import rag as rag_module

    async def fake_get_embedding(text: str, model: str = "text-embedding-004"):
        # Deterministic mock vector (small dim ok for tests that don't assert dim)
        seed = sum(ord(c) for c in (text or "")) % 97
        return [((seed * i) % 17) / 17.0 for i in range(64)]

    monkeypatch.setattr(rag_module, "get_embedding", fake_get_embedding)


@pytest.fixture(autouse=True)
def stub_llm(monkeypatch):
    from app.ai.safe_llm import LLMCtx

    async def fake_ainvoke(self, messages, max_retries: int = 2) -> str:
        if isinstance(messages, list):
            text = "\n".join(m[1] for m in messages if isinstance(m, tuple) and len(m) == 2)
        else:
            text = str(messages)

        if "Return ONLY valid JSON" in text or text.strip().startswith("{"):
            return json.dumps({
                "intent": "lead_profile",
                "entities": {"lead_name": "Isla"},
                "time_range": {"from": None, "to": None, "preset": "last_30d"},
                "limit": 50
            })
        return "Short summary: likely lead, light recent engagement; consider brief follow-up."

    monkeypatch.setattr(LLMCtx, "ainvoke", fake_ainvoke)


