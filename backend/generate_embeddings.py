#!/usr/bin/env python3
"""
Generate embeddings for existing knowledge documents
"""

import asyncio
import hashlib
import random
import json
from app.db.db import fetch, execute

async def get_embedding(text: str) -> list:
    """Generate mock embedding for text"""
    # Create deterministic but varied embeddings based on text content
    hash_obj = hashlib.md5(text.encode())
    seed = int(hash_obj.hexdigest()[:8], 16)
    random.seed(seed)
    
    # Generate 1536-dimensional embedding (OpenAI ada-002 dimension)
    embedding = [random.uniform(-1, 1) for _ in range(1536)]
    return embedding

async def generate_all_embeddings():
    """Generate embeddings for all knowledge documents"""
    
    # Get all documents without embeddings
    documents = await fetch("""
        SELECT id, title, content 
        FROM knowledge_documents 
        WHERE embedding IS NULL
    """)
    
    print(f"Found {len(documents)} documents without embeddings")
    
    for doc in documents:
        doc_id = doc['id']
        title = doc['title']
        content = doc['content']
        
        print(f"Generating embedding for: {title}")
        
        # Generate embedding for the content
        embedding = await get_embedding(content)
        embedding_str = "[" + ",".join(map(str, embedding)) + "]"
        
        # Update the document with the embedding
        await execute("""
            UPDATE knowledge_documents 
            SET embedding = %s 
            WHERE id = %s
        """, embedding_str, doc_id)
        
        print(f"✅ Updated {title}")
    
    print("🎉 All embeddings generated successfully!")

if __name__ == "__main__":
    asyncio.run(generate_all_embeddings())
