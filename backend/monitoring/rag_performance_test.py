#!/usr/bin/env python3
"""
RAG Performance Test - Tests the 1-3 second claim
"""

import asyncio
import aiohttp
import time
import statistics

async def test_rag_performance():
    """Test RAG response times to verify 1-3 second claim"""
    print("🔍 Testing RAG Performance (Claim: 1-3 seconds)")
    print("=" * 50)
    
    queries = [
        "What are the admission requirements?",
        "How do I apply for financial aid?", 
        "What courses are available?",
        "When is the application deadline?",
        "What is the tuition cost?",
        "How do I contact admissions?",
        "What are the entry requirements?",
        "When do classes start?",
        "What support services are available?",
        "How do I track my application?"
    ]
    
    response_times = []
    successful_queries = 0
    
    async with aiohttp.ClientSession() as session:
        for i, query in enumerate(queries):
            print(f"Query {i+1}/10: {query[:50]}...")
            
            try:
                start_time = time.time()
                async with session.post(
                    "http://localhost:8000/rag/query",
                    json={"query": query},
                    timeout=30
                ) as response:
                    end_time = time.time()
                    response_time_ms = (end_time - start_time) * 1000
                    
                    if response.status == 200:
                        response_times.append(response_time_ms)
                        successful_queries += 1
                        status = "✅" if 1000 <= response_time_ms <= 3000 else "⚠️"
                        print(f"  {status} {response_time_ms:.2f}ms")
                    else:
                        print(f"  ❌ Failed: HTTP {response.status}")
                        
            except asyncio.TimeoutError:
                print(f"  ❌ Timeout")
            except Exception as e:
                print(f"  ❌ Error: {e}")
    
    # Analyze results
    if response_times:
        avg_time = statistics.mean(response_times)
        min_time = min(response_times)
        max_time = max(response_times)
        p95_time = statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else max_time
        
        # Check SLA compliance
        compliant_queries = sum(1 for rt in response_times if 1000 <= rt <= 3000)
        compliance_rate = (compliant_queries / len(response_times)) * 100
        
        print(f"\n📊 RAG Performance Results:")
        print(f"   Total Queries: {len(queries)}")
        print(f"   Successful: {successful_queries}")
        print(f"   Average Response Time: {avg_time:.2f}ms")
        print(f"   Min Response Time: {min_time:.2f}ms")
        print(f"   Max Response Time: {max_time:.2f}ms")
        print(f"   P95 Response Time: {p95_time:.2f}ms")
        print(f"   SLA Compliance (1-3s): {compliance_rate:.1f}%")
        
        # Verify claim
        claim_met = 1000 <= avg_time <= 3000
        print(f"\n🎯 Claim Verification:")
        print(f"   Claim: 1-3 seconds (1000-3000ms)")
        print(f"   Actual Average: {avg_time:.2f}ms")
        print(f"   Status: {'✅ CLAIM VERIFIED' if claim_met else '❌ CLAIM NOT MET'}")
        
        if not claim_met:
            if avg_time < 1000:
                print(f"   Note: Response time is faster than claimed (under 1 second)")
            else:
                print(f"   Note: Response time exceeds 3 seconds")
    else:
        print("\n❌ No successful queries to analyze")

if __name__ == "__main__":
    asyncio.run(test_rag_performance())
