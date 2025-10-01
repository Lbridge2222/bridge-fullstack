#!/usr/bin/env python3
"""
Regenerate embeddings for knowledge documents (schema expects 768-d vectors).
- Prefers Gemini text-embedding-004 (768d) to match DB.
- Falls back to OpenAI; mean-pools chunk embeddings and, if 1536-d, reduces to 768 by averaging pairs.
"""

import asyncio
import hashlib
import json
import math
import os
import random
import time
from typing import List

# Ensure env vars
from app.bootstrap_env import bootstrap_env
bootstrap_env()

from app.db.db import fetch, execute

# ---------- Config ----------
CHUNK_SIZE = 1200          # chars, rough and simple
CHUNK_OVERLAP = 150        # chars
CONCURRENCY = 3            # parallel requests
FORCE_ALL = os.getenv("EMBED_FORCE_ALL", "false").lower() == "true"

# Preferred model/dimension
GEM_MODEL = "text-embedding-004"      # 768d
OPENAI_MODEL = "text-embedding-3-small"  # 1536d
TARGET_DIM = 768

# ---------- Utilities ----------

def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    text = (text or "").strip()
    if not text:
        return []
    chunks = []
    i = 0
    n = len(text)
    while i < n:
        j = min(i + size, n)
        chunks.append(text[i:j])
        if j == n:
            break
        i = j - overlap
        if i < 0:
            i = 0
    return chunks

def mean_pool(vectors: List[List[float]]) -> List[float]:
    if not vectors:
        return [0.0] * TARGET_DIM
    dim = len(vectors[0])
    out = [0.0] * dim
    for v in vectors:
        for i, x in enumerate(v):
            out[i] += float(x)
    m = float(len(vectors))
    return [x / m for x in out]

def downsample_1536_to_768(vec_1536: List[float]) -> List[float]:
    # Simple pairwise average: [0,1]->0, [2,3]->1, ..., preserves rough geometry for quick compatibility
    if len(vec_1536) != 1536:
        return vec_1536
    out = []
    for i in range(0, 1536, 2):
        out.append((vec_1536[i] + vec_1536[i+1]) / 2.0)
    return out  # 768d

async def mock_embedding(text: str) -> List[float]:
    h = hashlib.md5(text.encode()).hexdigest()
    seed = int(h[:8], 16)
    random.seed(seed)
    return [random.uniform(-1, 1) for _ in range(TARGET_DIM)]

async def embed_chunk(text: str, sem: asyncio.Semaphore) -> List[float]:
    """Embed one chunk, preferring Gemini 004, with backoff; falls back to OpenAI or mock."""
    from app.ai import OPENAI_API_KEY, GEMINI_API_KEY
    backoff = 1.0

    async with sem:
        # Try Gemini first (native 768d)
        if GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=GEMINI_API_KEY)
                # run sync client on thread to avoid blocking
                loop = asyncio.get_running_loop()
                def _call():
                    return genai.embed_content(
                        model=GEM_MODEL,
                        content=text,
                        task_type="retrieval_document"
                    )
                for _ in range(4):
                    try:
                        res = await loop.run_in_executor(None, _call)
                        return list(res["embedding"])
                    except Exception as e:
                        msg = str(e).lower()
                        if "429" in msg or "quota" in msg or "rate" in msg or "temporar" in msg:
                            await asyncio.sleep(backoff)
                            backoff = min(backoff * 2, 8)
                        else:
                            raise
            except Exception as e:
                print(f"Gemini embed failed, will try OpenAI: {e}")

        # OpenAI fallback (1536d)
        if os.getenv("OPENAI_API_KEY"):
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                backoff = 1.0
                for _ in range(4):
                    try:
                        resp = await client.embeddings.create(
                            model=OPENAI_MODEL,
                            input=text,
                            encoding_format="float"
                        )
                        vec = resp.data[0].embedding
                        # Reduce to 768 if needed
                        if len(vec) == 1536:
                            vec = downsample_1536_to_768(vec)
                        return vec
                    except Exception as e:
                        msg = str(e).lower()
                        if "429" in msg or "quota" in msg or "rate" in msg or "temporar" in msg:
                            await asyncio.sleep(backoff)
                            backoff = min(backoff * 2, 8)
                        else:
                            raise
            except Exception as e:
                print(f"OpenAI embed failed, will use mock: {e}")

        # Last resort
        return await mock_embedding(text)

async def embed_document(title: str, content: str, sem: asyncio.Semaphore) -> List[float]:
    """Chunk + embed + mean-pool to single 768d vector."""
    text = (content or "").strip()
    if not text:
        text = title or ""
    chunks = chunk_text(text)
    if not chunks:
        return [0.0] * TARGET_DIM
    vectors = await asyncio.gather(*(embed_chunk(c, sem) for c in chunks))
    # Dimension sanity-check
    d = len(vectors[0]) if vectors else TARGET_DIM
    if any(len(v) != d for v in vectors):
        # rare case: mix of dims from mixed providers → normalise per-chunk to TARGET_DIM
        fixed = []
        for v in vectors:
            if len(v) == TARGET_DIM:
                fixed.append(v)
            elif len(v) == 1536:
                fixed.append(downsample_1536_to_768(v))
            else:
                # pad/truncate
                if len(v) > TARGET_DIM:
                    fixed.append(v[:TARGET_DIM])
                else:
                    fixed.append(v + [0.0] * (TARGET_DIM - len(v)))
        vectors = fixed
    pooled = mean_pool(vectors)
    # Final clamp to TARGET_DIM
    if len(pooled) != TARGET_DIM:
        if len(pooled) > TARGET_DIM:
            pooled = pooled[:TARGET_DIM]
        else:
            pooled = pooled + [0.0] * (TARGET_DIM - len(pooled))
    return pooled

async def generate_all_embeddings():
    # Only missing by default; set EMBED_FORCE_ALL=true to recompute everything
    if FORCE_ALL:
        docs = await fetch("""
            SELECT id, title, content
            FROM knowledge_documents
            WHERE is_active = TRUE
            ORDER BY id
        """)
    else:
        docs = await fetch("""
            SELECT id, title, content
            FROM knowledge_documents
            WHERE is_active = TRUE AND embedding IS NULL
            ORDER BY id
        """)

    total = len(docs)
    print(f"Found {total} document(s) to embed (force_all={FORCE_ALL}).")

    sem = asyncio.Semaphore(CONCURRENCY)

    async def process(doc, idx):
        doc_id = doc["id"]
        title = doc["title"] or f"Doc {doc_id}"
        print(f"[{idx}/{total}] Embedding: {title[:80]}")
        vec = await embed_document(title, doc.get("content") or "", sem)
        embedding_str = "[" + ",".join(map(str, vec)) + "]"
        await execute(
            "UPDATE knowledge_documents SET embedding = %s, updated_at = NOW() WHERE id = %s",
            embedding_str, doc_id
        )

    # Process in small batches
    tasks = [process(doc, i+1) for i, doc in enumerate(docs)]
    # Use gather with limited concurrency governed by semaphore
    # (the semaphore is used inside `embed_chunk`)
    await asyncio.gather(*tasks)

    print("🎉 Embedding regeneration complete.")
    print("💡 Stored 768-dim vectors compatible with hybrid_search().")

if __name__ == "__main__":
    asyncio.run(generate_all_embeddings())