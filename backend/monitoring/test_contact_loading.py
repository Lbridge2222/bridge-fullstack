#!/usr/bin/env python3
"""
Test Contact Page Loading Performance
Investigates slow loading when moving from lead management to contact page
"""

import asyncio
import aiohttp
import time
import statistics
import json
from typing import List, Dict

async def test_leads_loading():
    """Test leads management page loading performance"""
    print("🔍 Testing Leads Management Loading")
    print("=" * 50)
    
    response_times = []
    
    async with aiohttp.ClientSession() as session:
        for i in range(5):
            print(f"Test {i+1}/5: Loading leads...")
            
            try:
                start_time = time.time()
                
                async with session.get(
                    "http://localhost:8000/people/leads?limit=50",
                    timeout=30
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        end_time = time.time()
                        response_time = (end_time - start_time) * 1000
                        response_times.append(response_time)
                        print(f"  ✅ Leads loaded: {response_time:.2f}ms ({len(data)} records)")
                    else:
                        print(f"  ❌ Failed: HTTP {response.status}")
                        
            except Exception as e:
                print(f"  ❌ Error: {e}")
    
    if response_times:
        avg_time = statistics.mean(response_times)
        print(f"\n📊 Leads Loading Results:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Min: {min(response_times):.2f}ms")
        print(f"   Max: {max(response_times):.2f}ms")
        return avg_time
    return None

async def test_admissions_loading():
    """Test admissions management page loading performance"""
    print("\n🎓 Testing Admissions Management Loading")
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
                        print(f"  ✅ Admissions loaded: {response_time:.2f}ms ({len(data)} records)")
                    else:
                        print(f"  ❌ Failed: HTTP {response.status}")
                        
            except Exception as e:
                print(f"  ❌ Error: {e}")
    
    if response_times:
        avg_time = statistics.mean(response_times)
        print(f"\n📊 Admissions Loading Results:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Min: {min(response_times):.2f}ms")
        print(f"   Max: {max(response_times):.2f}ms")
        return avg_time
    return None

async def test_student_records_loading():
    """Test student records page loading performance"""
    print("\n👨‍🎓 Testing Student Records Loading")
    print("=" * 50)
    
    response_times = []
    
    async with aiohttp.ClientSession() as session:
        for i in range(5):
            print(f"Test {i+1}/5: Loading student records...")
            
            try:
                start_time = time.time()
                
                async with session.get(
                    "http://localhost:8000/people/student-records?limit=50",
                    timeout=30
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        end_time = time.time()
                        response_time = (end_time - start_time) * 1000
                        response_times.append(response_time)
                        print(f"  ✅ Student records loaded: {response_time:.2f}ms ({len(data)} records)")
                    else:
                        print(f"  ❌ Failed: HTTP {response.status}")
                        
            except Exception as e:
                print(f"  ❌ Error: {e}")
    
    if response_times:
        avg_time = statistics.mean(response_times)
        print(f"\n📊 Student Records Loading Results:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Min: {min(response_times):.2f}ms")
        print(f"   Max: {max(response_times):.2f}ms")
        return avg_time
    return None

async def test_individual_contact_loading():
    """Test individual contact loading performance"""
    print("\n👤 Testing Individual Contact Loading")
    print("=" * 50)
    
    # First get a list of leads to test individual contact loading
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                "http://localhost:8000/people/leads?limit=5",
                timeout=30
            ) as response:
                if response.status == 200:
                    leads = await response.json()
                    if leads:
                        # Test loading individual contacts
                        response_times = []
                        for i, lead in enumerate(leads[:3]):  # Test first 3 leads
                            person_id = lead.get('id')
                            if person_id:
                                print(f"Test {i+1}/3: Loading contact {person_id}...")
                                
                                try:
                                    start_time = time.time()
                                    
                                    async with session.get(
                                        f"http://localhost:8000/people/{person_id}",
                                        timeout=30
                                    ) as contact_response:
                                        if contact_response.status == 200:
                                            contact_data = await contact_response.json()
                                            end_time = time.time()
                                            response_time = (end_time - start_time) * 1000
                                            response_times.append(response_time)
                                            print(f"  ✅ Contact loaded: {response_time:.2f}ms")
                                        else:
                                            print(f"  ❌ Failed: HTTP {contact_response.status}")
                                            
                                except Exception as e:
                                    print(f"  ❌ Error: {e}")
                        
                        if response_times:
                            avg_time = statistics.mean(response_times)
                            print(f"\n📊 Individual Contact Loading Results:")
                            print(f"   Average: {avg_time:.2f}ms")
                            print(f"   Min: {min(response_times):.2f}ms")
                            print(f"   Max: {max(response_times):.2f}ms")
                            return avg_time
                else:
                    print("  ❌ Failed to get leads list")
        except Exception as e:
            print(f"  ❌ Error getting leads: {e}")
    
    return None

async def test_database_views_directly():
    """Test database views directly to identify bottlenecks"""
    print("\n🗄️ Testing Database Views Directly")
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
        
        views_to_test = [
            ("vw_leads_management", "SELECT COUNT(*) FROM vw_leads_management"),
            ("vw_admissions_management", "SELECT COUNT(*) FROM vw_admissions_management"),
            ("vw_student_records", "SELECT COUNT(*) FROM vw_student_records")
        ]
        
        for view_name, query in views_to_test:
            print(f"Testing {view_name}...")
            
            # Test count query
            start_time = time.time()
            cur.execute(query)
            count = cur.fetchone()[0]
            count_time = (time.time() - start_time) * 1000
            
            # Test full query with limit
            start_time = time.time()
            cur.execute(f"SELECT * FROM {view_name} LIMIT 50")
            results = cur.fetchall()
            full_time = (time.time() - start_time) * 1000
            
            print(f"  📊 Count query: {count_time:.2f}ms ({count} records)")
            print(f"  📊 Full query: {full_time:.2f}ms ({len(results)} records)")
            
            if count_time > 100 or full_time > 500:
                print(f"  ⚠️  SLOW: {view_name} is taking too long!")
            else:
                print(f"  ✅ OK: {view_name} performance is good")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"  ❌ Database error: {e}")

async def main():
    """Run all contact loading performance tests"""
    print("🎯 Contact Page Loading Performance Investigation")
    print("=" * 60)
    
    # Test leads loading
    leads_avg = await test_leads_loading()
    
    # Test admissions loading
    admissions_avg = await test_admissions_loading()
    
    # Test student records loading
    student_avg = await test_student_records_loading()
    
    # Test individual contact loading
    contact_avg = await test_individual_contact_loading()
    
    # Test database views directly
    await test_database_views_directly()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 CONTACT LOADING PERFORMANCE SUMMARY")
    print("=" * 60)
    
    if leads_avg:
        print(f"Leads Management:     {leads_avg:.2f}ms")
        if leads_avg > 1000:
            print("  ⚠️  SLOW: Consider optimization")
        elif leads_avg > 500:
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
    
    if student_avg:
        print(f"Student Records:      {student_avg:.2f}ms")
        if student_avg > 1000:
            print("  ⚠️  SLOW: Consider optimization")
        elif student_avg > 500:
            print("  ⚠️  MODERATE: Could be improved")
        else:
            print("  ✅ GOOD: Performance is acceptable")
    
    if contact_avg:
        print(f"Individual Contact:   {contact_avg:.2f}ms")
        if contact_avg > 500:
            print("  ⚠️  SLOW: Consider optimization")
        elif contact_avg > 200:
            print("  ⚠️  MODERATE: Could be improved")
        else:
            print("  ✅ GOOD: Performance is acceptable")
    
    print("\n💡 Optimization Recommendations:")
    print("1. Add database indexes on frequently queried columns")
    print("2. Optimize the get_people_by_system_area function")
    print("3. Add caching for frequently accessed data")
    print("4. Consider materialized views for complex queries")
    print("5. Implement pagination for large datasets")

if __name__ == "__main__":
    asyncio.run(main())
