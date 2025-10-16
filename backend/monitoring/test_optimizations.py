#!/usr/bin/env python3
"""
Test RAG Performance Optimizations
Tests streaming, caching, and other optimizations
"""

import asyncio
import aiohttp
import time
import statistics
import json
from typing import List, Dict

async def test_streaming_rag():
    """Test streaming RAG endpoint"""
    print("🚀 Testing Streaming RAG (Expected: 78% improvement)")
    print("=" * 50)
    
    queries = [
        "What are the admission requirements?",
        "How do I apply for financial aid?",
        "What courses are available?",
        "When is the application deadline?",
        "What is the tuition cost?"
    ]
    
    response_times = []
    
    async with aiohttp.ClientSession() as session:
        for i, query in enumerate(queries):
            print(f"Query {i+1}/5: {query[:30]}...")
            
            try:
                start_time = time.time()
                
                # Test streaming endpoint
                async with session.post(
                    "http://localhost:8000/rag/query-streaming",
                    json={
                        "query": query,
                        "stream": True
                    },
                    timeout=30
                ) as response:
                    if response.status == 200:
                        # Read streaming response
                        content = ""
                        async for line in response.content:
                            if line:
                                line_str = line.decode('utf-8').strip()
                                if line_str.startswith('data: '):
                                    try:
                                        data = json.loads(line_str[6:])
                                        if data.get('type') == 'chunk':
                                            content += data.get('content', '')
                                        elif data.get('type') == 'response':
                                            content = data.get('content', '')
                                    except json.JSONDecodeError:
                                        pass
                        
                        end_time = time.time()
                        response_time = (end_time - start_time) * 1000
                        response_times.append(response_time)
                        print(f"  ✅ Streaming: {response_time:.2f}ms")
                    else:
                        print(f"  ❌ Failed: HTTP {response.status}")
                        
            except Exception as e:
                print(f"  ❌ Error: {e}")
    
    if response_times:
        avg_time = statistics.mean(response_times)
        print(f"\n📊 Streaming Results:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Min: {min(response_times):.2f}ms")
        print(f"   Max: {max(response_times):.2f}ms")
        return avg_time
    return None

async def test_fast_rag():
    """Test fast RAG endpoint"""
    print("\n⚡ Testing Fast RAG (Expected: 30% improvement)")
    print("=" * 50)
    
    queries = [
        "What are the admission requirements?",
        "How do I apply for financial aid?",
        "What courses are available?",
        "When is the application deadline?",
        "What is the tuition cost?"
    ]
    
    response_times = []
    
    async with aiohttp.ClientSession() as session:
        for i, query in enumerate(queries):
            print(f"Query {i+1}/5: {query[:30]}...")
            
            try:
                start_time = time.time()
                
                # Test fast endpoint
                async with session.post(
                    "http://localhost:8000/rag/query-fast",
                    json={"query": query},
                    timeout=30
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        end_time = time.time()
                        response_time = (end_time - start_time) * 1000
                        response_times.append(response_time)
                        print(f"  ✅ Fast: {response_time:.2f}ms")
                    else:
                        print(f"  ❌ Failed: HTTP {response.status}")
                        
            except Exception as e:
                print(f"  ❌ Error: {e}")
    
    if response_times:
        avg_time = statistics.mean(response_times)
        print(f"\n📊 Fast Results:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Min: {min(response_times):.2f}ms")
        print(f"   Max: {max(response_times):.2f}ms")
        return avg_time
    return None

async def test_regular_rag():
    """Test regular RAG endpoint for comparison"""
    print("\n🐌 Testing Regular RAG (Baseline)")
    print("=" * 50)
    
    queries = [
        "What are the admission requirements?",
        "How do I apply for financial aid?",
        "What courses are available?",
        "When is the application deadline?",
        "What is the tuition cost?"
    ]
    
    response_times = []
    
    async with aiohttp.ClientSession() as session:
        for i, query in enumerate(queries):
            print(f"Query {i+1}/5: {query[:30]}...")
            
            try:
                start_time = time.time()
                
                # Test regular endpoint
                async with session.post(
                    "http://localhost:8000/rag/query",
                    json={"query": query},
                    timeout=30
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        end_time = time.time()
                        response_time = (end_time - start_time) * 1000
                        response_times.append(response_time)
                        print(f"  ✅ Regular: {response_time:.2f}ms")
                    else:
                        print(f"  ❌ Failed: HTTP {response.status}")
                        
            except Exception as e:
                print(f"  ❌ Error: {e}")
    
    if response_times:
        avg_time = statistics.mean(response_times)
        print(f"\n📊 Regular Results:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Min: {min(response_times):.2f}ms")
        print(f"   Max: {max(response_times):.2f}ms")
        return avg_time
    return None

async def test_caching():
    """Test caching with repeated queries"""
    print("\n💾 Testing Caching (Expected: 50-80% improvement for repeated queries)")
    print("=" * 50)
    
    # Test queries with some repeats
    queries = [
        "What are the admission requirements?",
        "How do I apply for financial aid?",
        "What courses are available?",
        "What are the admission requirements?",  # Repeat
        "When is the application deadline?",
        "How do I apply for financial aid?",     # Repeat
        "What courses are available?",           # Repeat
        "What is the tuition cost?",
        "What are the admission requirements?",  # Repeat again
        "What courses are available?"            # Repeat again
    ]
    
    response_times = []
    cache_hits = 0
    
    async with aiohttp.ClientSession() as session:
        for i, query in enumerate(queries):
            print(f"Query {i+1}/10: {query[:30]}...")
            
            try:
                start_time = time.time()
                
                async with session.post(
                    "http://localhost:8000/rag/query",
                    json={"query": query},
                    timeout=30
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        end_time = time.time()
                        response_time = (end_time - start_time) * 1000
                        response_times.append(response_time)
                        
                        # Check if this looks like a cache hit (very fast response)
                        if response_time < 100:  # Less than 100ms likely cached
                            cache_hits += 1
                            print(f"  🚀 Cached: {response_time:.2f}ms")
                        else:
                            print(f"  🔍 Fresh: {response_time:.2f}ms")
                    else:
                        print(f"  ❌ Failed: HTTP {response.status}")
                        
            except Exception as e:
                print(f"  ❌ Error: {e}")
    
    if response_times:
        avg_time = statistics.mean(response_times)
        cache_hit_rate = (cache_hits / len(queries)) * 100
        
        print(f"\n📊 Caching Results:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Cache Hits: {cache_hits}/{len(queries)} ({cache_hit_rate:.1f}%)")
        print(f"   Min: {min(response_times):.2f}ms")
        print(f"   Max: {max(response_times):.2f}ms")
        return avg_time, cache_hit_rate
    return None, 0

async def main():
    """Run all optimization tests"""
    print("🎯 RAG Performance Optimization Tests")
    print("=" * 60)
    
    # Test regular RAG (baseline)
    regular_avg = await test_regular_rag()
    
    # Test fast RAG
    fast_avg = await test_fast_rag()
    
    # Test streaming RAG
    streaming_avg = await test_streaming_rag()
    
    # Test caching
    cache_avg, cache_hit_rate = await test_caching()
    
    # Compare results
    print("\n" + "=" * 60)
    print("📊 PERFORMANCE COMPARISON")
    print("=" * 60)
    
    if regular_avg:
        print(f"Regular RAG:     {regular_avg:.2f}ms (baseline)")
        
        if fast_avg:
            improvement = ((regular_avg - fast_avg) / regular_avg) * 100
            print(f"Fast RAG:        {fast_avg:.2f}ms ({improvement:+.1f}% improvement)")
        
        if streaming_avg:
            improvement = ((regular_avg - streaming_avg) / regular_avg) * 100
            print(f"Streaming RAG:   {streaming_avg:.2f}ms ({improvement:+.1f}% improvement)")
        
        if cache_avg:
            improvement = ((regular_avg - cache_avg) / regular_avg) * 100
            print(f"Cached RAG:      {cache_avg:.2f}ms ({improvement:+.1f}% improvement, {cache_hit_rate:.1f}% hit rate)")
    
    print("\n🎯 Optimization Status:")
    if streaming_avg and regular_avg:
        if streaming_avg < regular_avg * 0.5:  # 50% improvement
            print("✅ Streaming: EXCELLENT improvement")
        elif streaming_avg < regular_avg * 0.8:  # 20% improvement
            print("✅ Streaming: GOOD improvement")
        else:
            print("⚠️  Streaming: Limited improvement")
    
    if cache_hit_rate > 30:
        print("✅ Caching: GOOD hit rate")
    elif cache_hit_rate > 10:
        print("⚠️  Caching: MODERATE hit rate")
    else:
        print("❌ Caching: LOW hit rate")
    
    print("\n💡 Recommendations:")
    print("1. Use streaming endpoint for real-time responses")
    print("2. Use fast endpoint for batch processing")
    print("3. Implement caching for repeated queries")
    print("4. Monitor cache hit rates and adjust TTL")

if __name__ == "__main__":
    asyncio.run(main())
