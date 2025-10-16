#!/usr/bin/env python3
"""
Test Application Page Performance
Investigates performance of application-related endpoints
"""

import asyncio
import aiohttp
import time
import statistics
import json
from typing import List, Dict

async def test_application_board_performance():
    """Test application board performance"""
    print("🎯 Testing Application Board Performance")
    print("=" * 50)
    
    response_times = []
    
    async with aiohttp.ClientSession() as session:
        for i in range(5):
            print(f"Test {i+1}/5: Loading application board...")
            
            try:
                start_time = time.time()
                
                async with session.get(
                    "http://localhost:8000/applications/board?limit=50",
                    timeout=30
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        end_time = time.time()
                        response_time = (end_time - start_time) * 1000
                        response_times.append(response_time)
                        print(f"  ✅ Application board: {response_time:.2f}ms ({len(data)} records)")
                    else:
                        print(f"  ❌ Failed: HTTP {response.status}")
                        
            except Exception as e:
                print(f"  ❌ Error: {e}")
    
    if response_times:
        avg_time = statistics.mean(response_times)
        min_time = min(response_times)
        max_time = max(response_times)
        
        print(f"\n📊 Application Board Results:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Min: {min_time:.2f}ms")
        print(f"   Max: {max_time:.2f}ms")
        
        # Performance assessment
        if avg_time < 200:
            status = "✅ EXCELLENT"
        elif avg_time < 500:
            status = "✅ GOOD"
        elif avg_time < 1000:
            status = "⚠️  MODERATE"
        else:
            status = "❌ SLOW"
        
        print(f"   Status: {status}")
        return avg_time
    return None

async def test_admissions_performance():
    """Test admissions management performance"""
    print("\n🎓 Testing Admissions Management Performance")
    print("=" * 50)
    
    response_times = []
    
    async with aiohttp.ClientSession() as session:
        for i in range(5):
            print(f"Test {i+1}/5: Loading admissions...")
            
            try:
                start_time = time.time()
                
                async with session.get(
                    "http://localhost:8000/people/admissions?limit=50",
                    timeout=30
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        end_time = time.time()
                        response_time = (end_time - start_time) * 1000
                        response_times.append(response_time)
                        print(f"  ✅ Admissions: {response_time:.2f}ms ({len(data)} records)")
                    else:
                        print(f"  ❌ Failed: HTTP {response.status}")
                        
            except Exception as e:
                print(f"  ❌ Error: {e}")
    
    if response_times:
        avg_time = statistics.mean(response_times)
        min_time = min(response_times)
        max_time = max(response_times)
        
        print(f"\n📊 Admissions Results:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Min: {min_time:.2f}ms")
        print(f"   Max: {max_time:.2f}ms")
        
        # Performance assessment
        if avg_time < 200:
            status = "✅ EXCELLENT"
        elif avg_time < 500:
            status = "✅ GOOD"
        elif avg_time < 1000:
            status = "⚠️  MODERATE"
        else:
            status = "❌ SLOW"
        
        print(f"   Status: {status}")
        return avg_time
    return None

async def test_application_stages_performance():
    """Test application stages endpoint performance"""
    print("\n📋 Testing Application Stages Performance")
    print("=" * 50)
    
    response_times = []
    
    async with aiohttp.ClientSession() as session:
        for i in range(5):
            print(f"Test {i+1}/5: Loading application stages...")
            
            try:
                start_time = time.time()
                
                async with session.get(
                    "http://localhost:8000/applications/stages",
                    timeout=30
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        end_time = time.time()
                        response_time = (end_time - start_time) * 1000
                        response_times.append(response_time)
                        print(f"  ✅ Application stages: {response_time:.2f}ms ({len(data)} stages)")
                    else:
                        print(f"  ❌ Failed: HTTP {response.status}")
                        
            except Exception as e:
                print(f"  ❌ Error: {e}")
    
    if response_times:
        avg_time = statistics.mean(response_times)
        min_time = min(response_times)
        max_time = max(response_times)
        
        print(f"\n📊 Application Stages Results:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Min: {min_time:.2f}ms")
        print(f"   Max: {max_time:.2f}ms")
        
        # Performance assessment
        if avg_time < 50:
            status = "✅ EXCELLENT"
        elif avg_time < 100:
            status = "✅ GOOD"
        elif avg_time < 200:
            status = "⚠️  MODERATE"
        else:
            status = "❌ SLOW"
        
        print(f"   Status: {status}")
        return avg_time
    return None

async def test_application_board_filtered():
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
                        f"http://localhost:8000/applications/board{query_params}",
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

async def test_application_details_performance():
    """Test individual application details performance"""
    print("\n📄 Testing Application Details Performance")
    print("=" * 50)
    
    # First get a list of applications to test individual details
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                "http://localhost:8000/applications/board?limit=5",
                timeout=30
            ) as response:
                if response.status == 200:
                    applications = await response.json()
                    if applications:
                        # Test loading individual application details
                        response_times = []
                        for i, app in enumerate(applications[:3]):  # Test first 3 applications
                            app_id = app.get('application_id')
                            if app_id:
                                print(f"Test {i+1}/3: Loading application {app_id}...")
                                
                                try:
                                    start_time = time.time()
                                    
                                    async with session.get(
                                        f"http://localhost:8000/applications/{app_id}/details",
                                        timeout=30
                                    ) as details_response:
                                        if details_response.status == 200:
                                            details_data = await details_response.json()
                                            end_time = time.time()
                                            response_time = (end_time - start_time) * 1000
                                            response_times.append(response_time)
                                            print(f"  ✅ Application details: {response_time:.2f}ms")
                                        else:
                                            print(f"  ❌ Failed: HTTP {details_response.status}")
                                            
                                except Exception as e:
                                    print(f"  ❌ Error: {e}")
                        
                        if response_times:
                            avg_time = statistics.mean(response_times)
                            min_time = min(response_times)
                            max_time = max(response_times)
                            
                            print(f"\n📊 Application Details Results:")
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
                            return avg_time
                else:
                    print("  ❌ Failed to get applications list")
        except Exception as e:
            print(f"  ❌ Error getting applications: {e}")
    
    return None

async def main():
    """Run all application performance tests"""
    print("🎯 Application Page Performance Investigation")
    print("=" * 60)
    
    # Test application board
    board_avg = await test_application_board_performance()
    
    # Test admissions management
    admissions_avg = await test_admissions_performance()
    
    # Test application stages
    stages_avg = await test_application_stages_performance()
    
    # Test application board with filters
    filter_results = await test_application_board_filtered()
    
    # Test application details
    details_avg = await test_application_details_performance()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 APPLICATION PERFORMANCE SUMMARY")
    print("=" * 60)
    
    if board_avg:
        print(f"Application Board:     {board_avg:.2f}ms")
        if board_avg > 1000:
            print("  ⚠️  SLOW: Consider optimization")
        elif board_avg > 500:
            print("  ⚠️  MODERATE: Could be improved")
        else:
            print("  ✅ GOOD: Performance is acceptable")
    
    if admissions_avg:
        print(f"Admissions Management: {admissions_avg:.2f}ms")
        if admissions_avg > 1000:
            print("  ⚠️  SLOW: Consider optimization")
        elif admissions_avg > 500:
            print("  ⚠️  MODERATE: Could be improved")
        else:
            print("  ✅ GOOD: Performance is acceptable")
    
    if stages_avg:
        print(f"Application Stages:    {stages_avg:.2f}ms")
        if stages_avg > 200:
            print("  ⚠️  SLOW: Consider optimization")
        elif stages_avg > 100:
            print("  ⚠️  MODERATE: Could be improved")
        else:
            print("  ✅ GOOD: Performance is acceptable")
    
    if details_avg:
        print(f"Application Details:   {details_avg:.2f}ms")
        if details_avg > 500:
            print("  ⚠️  SLOW: Consider optimization")
        elif details_avg > 300:
            print("  ⚠️  MODERATE: Could be improved")
        else:
            print("  ✅ GOOD: Performance is acceptable")
    
    if filter_results:
        print(f"\nFilter Performance:")
        for filter_name, avg_time in filter_results:
            print(f"  {filter_name:15} {avg_time:8.2f}ms")
    
    print(f"\n💡 Optimization Recommendations:")
    print("1. Add caching for application board queries")
    print("2. Optimize materialized view refresh strategy")
    print("3. Add database indexes for filtering")
    print("4. Implement pagination for large datasets")
    print("5. Consider query result caching")
    print("6. Optimize individual application detail queries")

if __name__ == "__main__":
    asyncio.run(main())
