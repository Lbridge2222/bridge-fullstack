#!/usr/bin/env python3
"""
Simple test to verify basic API connectivity without full database dependency
"""

import asyncio
import aiohttp
import time
import sys
import os
import json

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_basic_connectivity():
    """Test basic connectivity to backend health and RAG endpoints"""
    print("🔍 Testing Backend Connectivity (Health & RAG)...")
    
    async with aiohttp.ClientSession() as session:
        # Test LLM health endpoint
        print("\n--- LLM Health Check ---")
        try:
            async with session.get("http://localhost:8000/health/llm") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ LLM Health check passed: {data.get('status', 'N/A')}")
                    print(f"   Latency: {data.get('latency_ms', 'N/A')}ms")
                else:
                    print(f"❌ LLM Health check failed: {response.status} - {await response.text()}")
        except aiohttp.ClientError as e:
            print(f"❌ LLM Health check connection error: {e}")

        # Test RAG query endpoint
        print("\n--- RAG Query Test ---")
        rag_payload = {"query": "What is Ivy OS?"}
        try:
            start_time = time.time()
            async with session.post(
                "http://localhost:8000/rag/query",
                json=rag_payload,
                timeout=30
            ) as response:
                end_time = time.time()
                response_time_ms = (end_time - start_time) * 1000
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ RAG query successful (Latency: {response_time_ms:.2f}ms)")
                    print(f"   Response snippet: {str(data)[:100]}...")
                else:
                    print(f"❌ RAG query failed: {response.status} - {await response.text()}")
        except aiohttp.ClientError as e:
            print(f"❌ RAG query connection error: {e}")
        except asyncio.TimeoutError:
            print("❌ RAG query timed out.")

    print("\n--- Note ---")
    print("The prediction endpoint requires a working database connection to fetch lead data.")
    print("Please ensure your PostgreSQL database is running and accessible for full testing.")

if __name__ == "__main__":
    asyncio.run(test_basic_connectivity())
