#!/usr/bin/env python3
"""
Test RAG functionality
"""

import asyncio
from app.routers.rag import hybrid_search, get_embedding

async def test_hybrid_search():
    """Test the hybrid search function"""
    
    # Generate a test embedding
    query_text = "Computer Science course overview"
    query_embedding = await get_embedding(query_text)
    
    print(f"Generated embedding with {len(query_embedding)} dimensions")
    
    # Test hybrid search
    results = await hybrid_search(
        query_text=query_text,
        query_embedding=query_embedding,
        document_types=None,
        categories=None,
        limit_count=3,
        similarity_threshold=0.1  # Lower threshold for testing
    )
    
    print(f"Found {len(results)} results:")
    for result in results:
        print(f"- {result['title']} (score: {result['similarity_score']:.3f})")

if __name__ == "__main__":
    asyncio.run(test_hybrid_search())
