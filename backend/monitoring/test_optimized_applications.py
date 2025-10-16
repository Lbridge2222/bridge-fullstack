#!/usr/bin/env python3
"""
Test Optimized Application Performance
Compares regular vs optimized application endpoints
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

async def test_application_board_comparison():
    """Test application board performance comparison"""
    print("🎯 Application Board Performance Comparison")
    print("=" * 60)
    
    # Test regular board
    regular_board = await test_endpoint_performance("/applications/board", "Regular Board", 3)
    
    # Test optimized board
    optimized_board = await test_endpoint_performance("/applications/board-optimized", "Optimized Board", 3)
    
    # Test fast board
    fast_board = await test_endpoint_performance("/applications/board-fast", "Fast Board", 3)
    
    return regular_board, optimized_board, fast_board

async def test_application_stages_comparison():
    """Test application stages performance comparison"""
    print("\n🎯 Application Stages Performance Comparison")
    print("=" * 60)
    
    # Test regular stages
    regular_stages = await test_endpoint_performance("/applications/stages", "Regular Stages", 3)
    
    # Test optimized stages
    optimized_stages = await test_endpoint_performance("/applications/stages-optimized", "Optimized Stages", 3)
    
    return regular_stages, optimized_stages

async def test_application_board_stats():
    """Test application board stats endpoint"""
    print("\n📊 Testing Application Board Stats")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        try:
            start_time = time.time()
            
            async with session.get(
                "http://localhost:8000/applications/board-stats",
                timeout=30
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000
                    print(f"  ✅ Board stats: {response_time:.2f}ms")
                    print(f"  📊 Total applications: {data.get('total_applications', 'N/A')}")
                    print(f"  📊 Submitted: {data.get('submitted', 'N/A')}")
                    print(f"  📊 In review: {data.get('in_review', 'N/A')}")
                    print(f"  📊 Overdue: {data.get('overdue', 'N/A')}")
                    return response_time
                else:
                    print(f"  ❌ Failed: HTTP {response.status}")
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    return None

async def test_application_performance_stats():
    """Test application performance stats endpoint"""
    print("\n📊 Testing Application Performance Stats")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        try:
            start_time = time.time()
            
            async with session.get(
                "http://localhost:8000/applications/performance-stats",
                timeout=30
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    end_time = time.time()
                    response_time = (end_time - start_time) * 1000
                    print(f"  ✅ Performance stats: {response_time:.2f}ms")
                    print(f"  📊 Cache size: {data.get('cache_stats', {}).get('cache_size', 'N/A')}")
                    print(f"  📊 DB query time: {data.get('database_performance', {}).get('board_view_count_ms', 'N/A')}ms")
                    return response_time
                else:
                    print(f"  ❌ Failed: HTTP {response.status}")
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    return None

async def test_application_board_filters():
    """Test application board with different filters"""
    print("\n🔍 Testing Application Board with Filters")
    print("=" * 50)
    
    filters = [
        ("No filter", "?limit=20"),
        ("Stage filter", "?stage=application_submitted&limit=20"),
        ("Priority filter", "?priority=high&limit=20"),
        ("Urgency filter", "?urgency=high&limit=20"),
    ]
    
    results = []
    
    async with aiohttp.ClientSession() as session:
        for filter_name, query_params in filters:
            print(f"Testing {filter_name}...")
            
            response_times = []
            for i in range(3):
                try:
                    start_time = time.time()
                    
                    async with session.get(
                        f"http://localhost:8000/applications/board-optimized{query_params}",
                        timeout=30
                    ) as response:
                        if response.status == 200:
                            data = await response.json()
                            end_time = time.time()
                            response_time = (end_time - start_time) * 1000
                            response_times.append(response_time)
                        else:
                            print(f"  ❌ Failed: HTTP {response.status}")
                            
                except Exception as e:
                    print(f"  ❌ Error: {e}")
            
            if response_times:
                avg_time = statistics.mean(response_times)
                print(f"  📊 {filter_name}: {avg_time:.2f}ms")
                results.append((filter_name, avg_time))
    
    return results

async def main():
    """Run all optimized application performance tests"""
    print("🎯 Optimized Application Performance Test")
    print("=" * 60)
    
    # Test application board comparison
    regular_board, optimized_board, fast_board = await test_application_board_comparison()
    
    # Test application stages comparison
    regular_stages, optimized_stages = await test_application_stages_comparison()
    
    # Test board stats
    board_stats_time = await test_application_board_stats()
    
    # Test performance stats
    performance_stats_time = await test_application_performance_stats()
    
    # Test board filters
    filter_results = await test_application_board_filters()
    
    # Compare results
    print("\n" + "=" * 60)
    print("📊 PERFORMANCE COMPARISON")
    print("=" * 60)
    
    comparisons = []
    
    if regular_board and optimized_board:
        improvement = ((regular_board['avg_time'] - optimized_board['avg_time']) / regular_board['avg_time']) * 100
        print(f"Application Board:")
        print(f"  Regular:    {regular_board['avg_time']:.2f}ms")
        print(f"  Optimized:  {optimized_board['avg_time']:.2f}ms")
        print(f"  Improvement: {improvement:+.1f}%")
        comparisons.append(("Application Board", improvement))
    
    if fast_board:
        print(f"  Fast:       {fast_board['avg_time']:.2f}ms")
        if regular_board:
            fast_improvement = ((regular_board['avg_time'] - fast_board['avg_time']) / regular_board['avg_time']) * 100
            print(f"  Fast Improvement: {fast_improvement:+.1f}%")
            comparisons.append(("Fast Board", fast_improvement))
    
    if regular_stages and optimized_stages:
        improvement = ((regular_stages['avg_time'] - optimized_stages['avg_time']) / regular_stages['avg_time']) * 100
        print(f"\nApplication Stages:")
        print(f"  Regular:    {regular_stages['avg_time']:.2f}ms")
        print(f"  Optimized:  {optimized_stages['avg_time']:.2f}ms")
        print(f"  Improvement: {improvement:+.1f}%")
        comparisons.append(("Application Stages", improvement))
    
    if filter_results:
        print(f"\nFilter Performance:")
        for filter_name, avg_time in filter_results:
            print(f"  {filter_name:15} {avg_time:8.2f}ms")
    
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
    print("2. Use fast board for quick overviews")
    print("3. Monitor cache hit rates and adjust TTL as needed")
    print("4. Consider database indexing for frequently queried columns")
    print("5. Use board stats for dashboard metrics")

if __name__ == "__main__":
    asyncio.run(main())
