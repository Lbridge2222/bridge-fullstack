#!/usr/bin/env python3
"""
Test Optimized Contact Loading Performance
Compares regular vs optimized contact loading endpoints
"""

import asyncio
import aiohttp
import time
import statistics
import json
from typing import List, Dict

async def test_endpoint_performance(endpoint: str, name: str, iterations: int = 5):
    """Test performance of a specific endpoint"""
    print(f"\n🔍 Testing {name}")
    print("=" * 50)
    
    response_times = []
    
    async with aiohttp.ClientSession() as session:
        for i in range(iterations):
            print(f"Test {i+1}/{iterations}: {name}...")
            
            try:
                start_time = time.time()
                
                async with session.get(
                    f"http://localhost:8000{endpoint}?limit=50",
                    timeout=30
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        end_time = time.time()
                        response_time = (end_time - start_time) * 1000
                        response_times.append(response_time)
                        print(f"  ✅ {name}: {response_time:.2f}ms ({len(data)} records)")
                    else:
                        print(f"  ❌ Failed: HTTP {response.status}")
                        
            except Exception as e:
                print(f"  ❌ Error: {e}")
    
    if response_times:
        avg_time = statistics.mean(response_times)
        min_time = min(response_times)
        max_time = max(response_times)
        
        print(f"\n📊 {name} Results:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Min: {min_time:.2f}ms")
        print(f"   Max: {max_time:.2f}ms")
        
        # Performance assessment
        if avg_time < 100:
            status = "✅ EXCELLENT"
        elif avg_time < 300:
            status = "✅ GOOD"
        elif avg_time < 500:
            status = "⚠️  MODERATE"
        else:
            status = "❌ SLOW"
        
        print(f"   Status: {status}")
        
        return {
            "name": name,
            "endpoint": endpoint,
            "avg_time": avg_time,
            "min_time": min_time,
            "max_time": max_time,
            "status": status,
            "times": response_times
        }
    return None

async def test_performance_stats():
    """Test performance statistics endpoint"""
    print(f"\n📊 Testing Performance Stats")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        try:
            start_time = time.time()
            
            async with session.get(
                "http://localhost:8000/people/performance-stats",
                timeout=30
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000
                    print(f"  ✅ Performance stats: {response_time:.2f}ms")
                    print(f"  📊 Cache size: {data.get('cache_stats', {}).get('cache_size', 'N/A')}")
                    print(f"  📊 DB count query: {data.get('database_performance', {}).get('count_query_ms', 'N/A')}ms")
                    return data
                else:
                    print(f"  ❌ Failed: HTTP {response.status}")
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    return None

async def main():
    """Run all optimized contact loading performance tests"""
    print("🎯 Optimized Contact Loading Performance Test")
    print("=" * 60)
    
    # Test regular endpoints
    regular_leads = await test_endpoint_performance("/people/leads", "Regular Leads", 3)
    regular_admissions = await test_endpoint_performance("/people/admissions", "Regular Admissions", 3)
    regular_students = await test_endpoint_performance("/people/student-records", "Regular Students", 3)
    
    # Test optimized endpoints
    optimized_leads = await test_endpoint_performance("/people/leads-optimized", "Optimized Leads", 3)
    optimized_admissions = await test_endpoint_performance("/people/admissions-optimized", "Optimized Admissions", 3)
    optimized_students = await test_endpoint_performance("/people/student-records-optimized", "Optimized Students", 3)
    
    # Test performance stats
    stats = await test_performance_stats()
    
    # Compare results
    print("\n" + "=" * 60)
    print("📊 PERFORMANCE COMPARISON")
    print("=" * 60)
    
    comparisons = []
    
    if regular_leads and optimized_leads:
        improvement = ((regular_leads['avg_time'] - optimized_leads['avg_time']) / regular_leads['avg_time']) * 100
        print(f"Leads:")
        print(f"  Regular:    {regular_leads['avg_time']:.2f}ms")
        print(f"  Optimized:  {optimized_leads['avg_time']:.2f}ms")
        print(f"  Improvement: {improvement:+.1f}%")
        comparisons.append(("Leads", improvement))
    
    if regular_admissions and optimized_admissions:
        improvement = ((regular_admissions['avg_time'] - optimized_admissions['avg_time']) / regular_admissions['avg_time']) * 100
        print(f"\nAdmissions:")
        print(f"  Regular:    {regular_admissions['avg_time']:.2f}ms")
        print(f"  Optimized:  {optimized_admissions['avg_time']:.2f}ms")
        print(f"  Improvement: {improvement:+.1f}%")
        comparisons.append(("Admissions", improvement))
    
    if regular_students and optimized_students:
        improvement = ((regular_students['avg_time'] - optimized_students['avg_time']) / regular_students['avg_time']) * 100
        print(f"\nStudents:")
        print(f"  Regular:    {regular_students['avg_time']:.2f}ms")
        print(f"  Optimized:  {optimized_students['avg_time']:.2f}ms")
        print(f"  Improvement: {improvement:+.1f}%")
        comparisons.append(("Students", improvement))
    
    # Overall assessment
    print(f"\n🎯 Overall Assessment:")
    if comparisons:
        avg_improvement = statistics.mean([imp for _, imp in comparisons])
        if avg_improvement > 20:
            print(f"  ✅ EXCELLENT: {avg_improvement:.1f}% average improvement")
        elif avg_improvement > 10:
            print(f"  ✅ GOOD: {avg_improvement:.1f}% average improvement")
        elif avg_improvement > 0:
            print(f"  ⚠️  MODERATE: {avg_improvement:.1f}% average improvement")
        else:
            print(f"  ❌ NO IMPROVEMENT: {avg_improvement:.1f}% average change")
    
    print(f"\n💡 Recommendations:")
    print("1. Use optimized endpoints for better performance")
    print("2. Monitor cache hit rates and adjust TTL as needed")
    print("3. Consider database indexing for frequently queried columns")
    print("4. Implement pagination for large datasets")
    print("5. Use materialized views for complex queries")

if __name__ == "__main__":
    asyncio.run(main())
