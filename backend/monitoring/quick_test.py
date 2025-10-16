#!/usr/bin/env python3
"""
Quick test to verify monitoring system works
"""

import asyncio
import aiohttp
import time
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_basic_connectivity():
    """Test basic connectivity to backend"""
    print("🔍 Testing Backend Connectivity...")
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test health endpoint
            async with session.get("http://localhost:8000/health/llm") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Health check passed: {data['status']}")
                    print(f"   Latency: {data['latency_ms']}ms")
                else:
                    print(f"❌ Health check failed: {response.status}")
                    return False
            
            # Test prediction endpoint
            print("\n🧪 Testing Prediction Endpoint...")
            payload = {"lead_ids": ["test_lead_1", "test_lead_2"]}
            
            start_time = time.time()
            async with session.post(
                "http://localhost:8000/ai/advanced-ml/predict-batch",
                json=payload,
                timeout=30
            ) as response:
                response_time = (time.time() - start_time) * 1000
                
                if response.status == 200:
                    print(f"✅ Prediction endpoint working: {response_time:.2f}ms")
                else:
                    print(f"❌ Prediction endpoint failed: {response.status}")
                    print(f"   Response time: {response_time:.2f}ms")
                    return False
            
            # Test RAG endpoint
            print("\n🔍 Testing RAG Endpoint...")
            rag_payload = {"query": "What are the admission requirements?"}
            
            start_time = time.time()
            async with session.post(
                "http://localhost:8000/rag/query",
                json=rag_payload,
                timeout=30
            ) as response:
                response_time = (time.time() - start_time) * 1000
                
                if response.status == 200:
                    print(f"✅ RAG endpoint working: {response_time:.2f}ms")
                else:
                    print(f"❌ RAG endpoint failed: {response.status}")
                    print(f"   Response time: {response_time:.2f}ms")
                    return False
            
            return True
            
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

async def test_performance_claims():
    """Test the specific performance claims"""
    print("\n📊 Testing Performance Claims...")
    
    results = {
        "prediction_latency": [],
        "rag_latency": []
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test prediction latency (5 requests)
            print("   Testing prediction latency...")
            for i in range(5):
                payload = {"lead_ids": [f"test_lead_{i}"]}
                
                start_time = time.time()
                async with session.post(
                    "http://localhost:8000/ai/advanced-ml/predict-batch",
                    json=payload,
                    timeout=30
                ) as response:
                    response_time = (time.time() - start_time) * 1000
                    results["prediction_latency"].append(response_time)
                    print(f"     Request {i+1}: {response_time:.2f}ms")
            
            # Test RAG latency (3 requests)
            print("   Testing RAG response time...")
            queries = [
                "What are the admission requirements?",
                "How do I apply for financial aid?",
                "What courses are available?"
            ]
            
            for i, query in enumerate(queries):
                payload = {"query": query}
                
                start_time = time.time()
                async with session.post(
                    "http://localhost:8000/rag/query",
                    json=payload,
                    timeout=30
                ) as response:
                    response_time = (time.time() - start_time) * 1000
                    results["rag_latency"].append(response_time)
                    print(f"     Query {i+1}: {response_time:.2f}ms")
            
            # Analyze results
            print("\n📈 Performance Analysis:")
            
            pred_avg = sum(results["prediction_latency"]) / len(results["prediction_latency"])
            pred_max = max(results["prediction_latency"])
            pred_min = min(results["prediction_latency"])
            
            rag_avg = sum(results["rag_latency"]) / len(results["rag_latency"])
            rag_max = max(results["rag_latency"])
            rag_min = min(results["rag_latency"])
            
            print(f"   Prediction Latency:")
            print(f"     Average: {pred_avg:.2f}ms")
            print(f"     Min: {pred_min:.2f}ms")
            print(f"     Max: {pred_max:.2f}ms")
            print(f"     Claim: < 200ms")
            print(f"     Status: {'✅ PASS' if pred_avg < 200 else '❌ FAIL'}")
            
            print(f"   RAG Response Time:")
            print(f"     Average: {rag_avg:.2f}ms")
            print(f"     Min: {rag_min:.2f}ms")
            print(f"     Max: {rag_max:.2f}ms")
            print(f"     Claim: 1-3s (1000-3000ms)")
            print(f"     Status: {'✅ PASS' if 1000 <= rag_avg <= 3000 else '❌ FAIL'}")
            
            return {
                "prediction_avg": pred_avg,
                "prediction_passes": pred_avg < 200,
                "rag_avg": rag_avg,
                "rag_passes": 1000 <= rag_avg <= 3000
            }
            
    except Exception as e:
        print(f"❌ Performance test failed: {e}")
        return None

async def main():
    """Run quick tests"""
    print("🚀 Quick Performance Test")
    print("=" * 40)
    
    # Test connectivity
    connectivity_ok = await test_basic_connectivity()
    if not connectivity_ok:
        print("\n❌ Backend connectivity failed. Make sure the server is running.")
        return
    
    # Test performance claims
    performance_results = await test_performance_claims()
    
    if performance_results:
        print("\n🎯 Summary:")
        print(f"   Prediction < 200ms: {'✅' if performance_results['prediction_passes'] else '❌'}")
        print(f"   RAG 1-3s: {'✅' if performance_results['rag_passes'] else '❌'}")
        
        if performance_results['prediction_passes'] and performance_results['rag_passes']:
            print("\n🎉 All performance claims verified!")
        else:
            print("\n⚠️  Some performance claims need attention.")
    else:
        print("\n❌ Performance testing failed.")

if __name__ == "__main__":
    asyncio.run(main())
