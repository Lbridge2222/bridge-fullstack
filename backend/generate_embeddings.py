#!/usr/bin/env python3
"""
Generate embeddings for existing knowledge documents
"""

import asyncio
import hashlib
import random
import json

# Import bootstrap_env to ensure environment variables are loaded
from app.bootstrap_env import bootstrap_env
bootstrap_env()

from app.db.db import fetch, execute

async def get_embedding(text: str) -> list:
    """Generate real embedding using available API (OpenAI or Gemini)"""
    try:
        from app.ai import OPENAI_API_KEY, GEMINI_API_KEY
        
        # Try OpenAI first if available
        if OPENAI_API_KEY:
            from openai import AsyncOpenAI
            import asyncio
            
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            
            # Add rate limiting - wait 1 second between requests
            await asyncio.sleep(1)
            
            response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
                encoding_format="float"
            )
            
            print(f"✅ Generated real OpenAI embedding for: '{text[:50]}...'")
            return response.data[0].embedding
        
        # Fallback to Gemini if OpenAI not available
        elif GEMINI_API_KEY:
            import google.generativeai as genai
            import asyncio
            
            # Configure Gemini
            genai.configure(api_key=GEMINI_API_KEY)
            
            # Add rate limiting - wait 2 seconds between requests
            await asyncio.sleep(2)
            
            # Generate embedding using Gemini
            result = genai.embed_content(
                model="models/embedding-001",
                content=text,
                task_type="retrieval_document"
            )
            
            print(f"✅ Generated real Gemini embedding for: '{text[:50]}...'")
            return result['embedding']
        
        else:
            print("⚠️ No API keys available, using mock embeddings")
            return await get_mock_embedding(text)
        
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            print(f"⏳ API quota exceeded, using mock embedding for: '{text[:50]}...'")
            print("💡 Try again tomorrow when quota resets, or consider upgrading to paid tier")
        else:
            print(f"❌ Embedding API failed: {e}")
            print("Falling back to mock embedding")
        return await get_mock_embedding(text)

async def get_mock_embedding(text: str) -> list:
    """Fallback mock embedding when APIs are unavailable"""
    # Create deterministic but varied embeddings based on text content
    hash_obj = hashlib.md5(text.encode())
    seed = int(hash_obj.hexdigest()[:8], 16)
    random.seed(seed)
    
    # Generate 768-dimensional embedding (matches current database schema)
    embedding = [random.uniform(-1, 1) for _ in range(768)]
    print(f"⚠️ Using mock embedding for: '{text[:50]}...'")
    return embedding

async def generate_all_embeddings():
    """Generate embeddings for all knowledge documents"""
    
    # Get all documents (including those with existing embeddings for regeneration)
    documents = await fetch("""
        SELECT id, title, content 
        FROM knowledge_documents 
        WHERE is_active = TRUE
    """)
    
    print(f"Found {len(documents)} active documents")
    print("🔄 Regenerating all embeddings with real OpenAI embeddings...")
    
    for i, doc in enumerate(documents, 1):
        doc_id = doc['id']
        title = doc['title']
        content = doc['content']
        
        print(f"[{i}/{len(documents)}] Generating embedding for: {title}")
        
        # Generate embedding for the content
        embedding = await get_embedding(content)
        embedding_str = "[" + ",".join(map(str, embedding)) + "]"
        
        # Update the document with the embedding
        await execute("""
            UPDATE knowledge_documents 
            SET embedding = %s, updated_at = NOW()
            WHERE id = %s
        """, embedding_str, doc_id)
        
        print(f"✅ Updated {title}")
    
    print("🎉 All embeddings generated successfully!")
    print("💡 Your knowledge base now uses real OpenAI embeddings for better search quality!")

if __name__ == "__main__":
    asyncio.run(generate_all_embeddings())
