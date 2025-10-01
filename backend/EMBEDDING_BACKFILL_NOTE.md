# Embedding Backfill Required

## Current Status
The RAG system is currently throttled due to missing or incompatible embeddings in the knowledge base.

## Impact
- Ivy will over-rely on CRM context instead of knowledge base
- Reduced quality of policy and course-related responses
- Missing citations and source references

## Solution
Run the updated embedding generation script to backfill with proper 768-dimensional vectors:

```bash
# Process only missing embeddings (recommended first run)
cd backend && python generate_embeddings.py

# Or regenerate all embeddings (if needed)
EMBED_FORCE_ALL=true python generate_embeddings.py
```

## What Changed
- Script now uses Gemini `text-embedding-004` (768d) as primary
- Falls back to OpenAI `text-embedding-3-small` (1536d) with auto-downsampling
- Chunks long documents for better retrieval quality
- Mean-pools chunk embeddings back to single vector per document
- Compatible with existing `hybrid_search()` function

## Expected Results
- Improved RAG quality and source citations
- Better policy and course-related responses
- Reduced over-reliance on CRM context
- More accurate knowledge base retrieval
