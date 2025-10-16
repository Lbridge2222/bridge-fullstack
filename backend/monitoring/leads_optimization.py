#!/usr/bin/env python3
"""
Leads Management Cold Start Optimization
Target: Reduce 2.1s cold start to <500ms
"""

import asyncio
import aiohttp
import time
import statistics
import json
from typing import List, Dict

async def test_leads_cold_start():
    """Test leads cold start performance specifically"""
    print("🎯 Leads Management Cold Start Optimization")
    print("=" * 50)
    
    # Clear cache by restarting or using a different approach
    print("Testing cold start performance (no cache)...")
    
    response_times = []
    
    async with aiohttp.ClientSession() as session:
        for i in range(5):
            print(f"Cold start test {i+1}/5...")
            
            try:
                start_time = time.time()
                
                # Use a unique parameter to bypass cache
                async with session.get(
                    f"http://localhost:8000/people/leads?limit=20&_t={int(time.time())}",
                    timeout=30
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        end_time = time.time()
                        response_time = (end_time - start_time) * 1000
                        response_times.append(response_time)
                        print(f"  ✅ Cold start: {response_time:.2f}ms ({len(data)} records)")
                    else:
                        print(f"  ❌ Failed: HTTP {response.status}")
                        
            except Exception as e:
                print(f"  ❌ Error: {e}")
    
    if response_times:
        avg_time = statistics.mean(response_times)
        min_time = min(response_times)
        max_time = max(response_times)
        
        print(f"\n📊 Cold Start Results:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Min: {min_time:.2f}ms")
        print(f"   Max: {max_time:.2f}ms")
        
        # Performance assessment
        if avg_time < 500:
            status = "✅ EXCELLENT"
        elif avg_time < 1000:
            status = "✅ GOOD"
        elif avg_time < 1500:
            status = "⚠️  MODERATE"
        else:
            status = "❌ SLOW"
        
        print(f"   Status: {status}")
        
        return {
            "avg_time": avg_time,
            "min_time": min_time,
            "max_time": max_time,
            "status": status
        }
    return None

async def test_database_query_performance():
    """Test individual database query performance"""
    print(f"\n🗄️ Testing Database Query Performance")
    print("=" * 50)
    
    import psycopg2
    from psycopg2.extras import RealDictCursor
    
    try:
        # Connect to database
        conn = psycopg2.connect(
            host="localhost",
            database="ivyos",
            user="postgres",
            password="password"
        )
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        queries_to_test = [
            ("Count leads", "SELECT COUNT(*) FROM people WHERE lifecycle_state = 'lead'"),
            ("Basic leads query", """
                SELECT id, first_name, last_name, email, phone, lifecycle_state, lead_score, created_at
                FROM people 
                WHERE lifecycle_state = 'lead' 
                ORDER BY created_at DESC 
                LIMIT 20
            """),
            ("Leads with applications", """
                SELECT p.id, p.first_name, p.last_name, p.email, p.phone, p.lifecycle_state, p.lead_score, p.created_at,
                       a.stage as latest_application_stage
                FROM people p
                LEFT JOIN LATERAL (
                    SELECT ap.stage
                    FROM applications ap
                    WHERE ap.person_id = p.id
                    ORDER BY ap.created_at DESC
                    LIMIT 1
                ) a ON true
                WHERE p.lifecycle_state = 'lead'
                ORDER BY p.created_at DESC
                LIMIT 20
            """),
            ("Full leads view query", """
                SELECT 
                    p.id::text,
                    p.first_name,
                    p.last_name,
                    p.email,
                    p.phone,
                    p.lifecycle_state,
                    p.lead_score,
                    p.conversion_probability::float,
                    p.assigned_to,
                    p.status,
                    p.next_follow_up,
                    p.created_at,
                    p.updated_at,
                    a.stage as latest_application_stage,
                    pr.name as latest_programme_name,
                    c.name as latest_campus_name,
                    i.cycle_label as latest_academic_year,
                    COALESCE(p.updated_at, p.created_at) as last_activity_at
                FROM people p
                LEFT JOIN LATERAL (
                    SELECT 
                        ap.stage,
                        ap.programme_id,
                        ap.intake_id
                    FROM applications ap
                    WHERE ap.person_id = p.id
                    ORDER BY ap.created_at DESC
                    LIMIT 1
                ) a ON true
                LEFT JOIN programmes pr ON pr.id = a.programme_id
                LEFT JOIN campuses c ON c.id = pr.campus_id
                LEFT JOIN intakes i ON i.id = a.intake_id
                WHERE p.lifecycle_state = 'lead'
                ORDER BY p.lead_score DESC NULLS LAST, p.created_at DESC
                LIMIT 20
            """)
        ]
        
        for query_name, query in queries_to_test:
            print(f"Testing {query_name}...")
            
            start_time = time.time()
            cur.execute(query)
            results = cur.fetchall()
            query_time = (time.time() - start_time) * 1000
            
            print(f"  📊 {query_name}: {query_time:.2f}ms ({len(results)} records)")
            
            if query_time > 1000:
                print(f"  ⚠️  SLOW: {query_name} is taking too long!")
            elif query_time > 500:
                print(f"  ⚠️  MODERATE: {query_name} could be improved")
            else:
                print(f"  ✅ OK: {query_name} performance is good")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"  ❌ Database error: {e}")

async def test_optimization_strategies():
    """Test different optimization strategies"""
    print(f"\n🚀 Testing Optimization Strategies")
    print("=" * 50)
    
    strategies = [
        ("Smaller limit", "/people/leads?limit=10"),
        ("No search", "/people/leads"),
        ("With search", "/people/leads?q=test"),
    ]
    
    results = []
    
    async with aiohttp.ClientSession() as session:
        for strategy_name, endpoint in strategies:
            print(f"Testing {strategy_name}...")
            
            response_times = []
            for i in range(3):
                try:
                    start_time = time.time()
                    
                    async with session.get(
                        f"http://localhost:8000{endpoint}&_t={int(time.time())}",
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
                print(f"  📊 {strategy_name}: {avg_time:.2f}ms")
                results.append((strategy_name, avg_time))
    
    if results:
        print(f"\n📊 Strategy Comparison:")
        for strategy_name, avg_time in results:
            print(f"  {strategy_name:15} {avg_time:8.2f}ms")

async def main():
    """Run all leads optimization tests"""
    print("🎯 Leads Management Cold Start Optimization")
    print("=" * 60)
    
    # Test current cold start performance
    cold_start = await test_leads_cold_start()
    
    # Test database query performance
    await test_database_query_performance()
    
    # Test optimization strategies
    await test_optimization_strategies()
    
    # Summary and recommendations
    print("\n" + "=" * 60)
    print("📊 OPTIMIZATION SUMMARY")
    print("=" * 60)
    
    if cold_start:
        print(f"Current Cold Start: {cold_start['avg_time']:.2f}ms")
        
        if cold_start['avg_time'] < 500:
            print("✅ EXCELLENT: Cold start is already fast!")
        elif cold_start['avg_time'] < 1000:
            print("✅ GOOD: Cold start is acceptable")
        elif cold_start['avg_time'] < 1500:
            print("⚠️  MODERATE: Cold start could be improved")
        else:
            print("❌ SLOW: Cold start needs optimization")
    
    print(f"\n💡 Optimization Recommendations:")
    print("1. Add database indexes on frequently queried columns")
    print("2. Optimize the LATERAL JOIN queries")
    print("3. Consider materialized views for complex queries")
    print("4. Implement query result caching")
    print("5. Use connection pooling for database connections")
    print("6. Consider pagination for large datasets")
    print("7. Pre-warm the cache on server startup")

if __name__ == "__main__":
    asyncio.run(main())
