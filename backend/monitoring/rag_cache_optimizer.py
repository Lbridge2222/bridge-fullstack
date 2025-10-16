#!/usr/bin/env python3
"""
RAG Cache Optimizer - Simple caching to improve response times
"""

import asyncio
import aiohttp
import time
import hashlib
import json
from typing import Dict, Optional

class RAGCache:
    """Simple in-memory cache for RAG responses"""
    
    def __init__(self, max_size: int = 1000):
        self.cache: Dict[str, Dict] = {}
        self.max_size = max_size
        self.hits = 0
        self.misses = 0
    
    def _get_cache_key(self, query: str) -> str:
        """Generate cache key from query"""
        return hashlib.md5(query.lower().strip().encode()).hexdigest()
    
    def get(self, query: str) -> Optional[Dict]:
        """Get cached response"""
        key = self._get_cache_key(query)
        if key in self.cache:
            self.hits += 1
            return self.cache[key]
        self.misses += 1
        return None
    
    def set(self, query: str, response: Dict) -> None:
        """Cache response"""
        if len(self.cache) >= self.max_size:
            # Remove oldest entry (simple LRU)
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        key = self._get_cache_key(query)
        self.cache[key] = response
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": round(hit_rate, 2),
            "cache_size": len(self.cache)
        }

# Global cache instance
rag_cache = RAGCache()

async def optimized_rag_query(query: str, session: aiohttp.ClientSession) -> Dict:
    """Optimized RAG query with caching"""
    
    # Check cache first
    cached_response = rag_cache.get(query)
    if cached_response:
        print(f"  🚀 Cache HIT: {query[:30]}...")
        return cached_response
    
    print(f"  🔍 Cache MISS: {query[:30]}...")
    
    # Make API call
    start_time = time.time()
    try:
        async with session.post(
            "http://localhost:8000/rag/query",
            json={"query": query},
            timeout=30
        ) as response:
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            if response.status == 200:
                data = await response.json()
                # Add timing info
                data["response_time_ms"] = response_time
                data["cached"] = False
                
                # Cache the response
                rag_cache.set(query, data)
                
                return data
            else:
                return {"error": f"HTTP {response.status}", "response_time_ms": response_time}
                
    except Exception as e:
        return {"error": str(e), "response_time_ms": 0}

async def test_cached_performance():
    """Test RAG performance with caching"""
    print("🚀 Testing RAG Performance with Caching")
    print("=" * 50)
    
    # Test queries (some repeated for cache testing)
    queries = [
        "What are the admission requirements?",
        "How do I apply for financial aid?",
        "What courses are available?",
        "What are the admission requirements?",  # Repeat for cache
        "When is the application deadline?",
        "How do I apply for financial aid?",     # Repeat for cache
        "What is the tuition cost?",
        "What courses are available?",           # Repeat for cache
        "How do I contact admissions?",
        "What are the admission requirements?"   # Repeat for cache
    ]
    
    response_times = []
    cached_responses = 0
    
    async with aiohttp.ClientSession() as session:
        for i, query in enumerate(queries):
            print(f"\nQuery {i+1}/10: {query[:50]}...")
            
            result = await optimized_rag_query(query, session)
            
            if "response_time_ms" in result:
                response_times.append(result["response_time_ms"])
                if result.get("cached", True):
                    cached_responses += 1
                    print(f"  ✅ Cached: {result['response_time_ms']:.2f}ms")
                else:
                    print(f"  🔍 Fresh: {result['response_time_ms']:.2f}ms")
            else:
                print(f"  ❌ Error: {result.get('error', 'Unknown error')}")
    
    # Analyze results
    if response_times:
        avg_time = sum(response_times) / len(response_times)
        min_time = min(response_times)
        max_time = max(response_times)
        
        # Get cache stats
        cache_stats = rag_cache.get_stats()
        
        print(f"\n📊 Performance Results with Caching:")
        print(f"   Total Queries: {len(queries)}")
        print(f"   Cached Responses: {cached_responses}")
        print(f"   Average Response Time: {avg_time:.2f}ms")
        print(f"   Min Response Time: {min_time:.2f}ms")
        print(f"   Max Response Time: {max_time:.2f}ms")
        print(f"   Cache Hit Rate: {cache_stats['hit_rate']}%")
        
        # Compare with original performance
        original_avg = 2640.57  # From previous test
        improvement = ((original_avg - avg_time) / original_avg) * 100
        
        print(f"\n🎯 Performance Improvement:")
        print(f"   Original Average: {original_avg:.2f}ms")
        print(f"   Cached Average: {avg_time:.2f}ms")
        print(f"   Improvement: {improvement:.1f}%")
        
        if improvement > 0:
            print(f"   ✅ Performance improved by {improvement:.1f}%")
        else:
            print(f"   ⚠️  No significant improvement (may need more cache hits)")

if __name__ == "__main__":
    asyncio.run(test_cached_performance())
