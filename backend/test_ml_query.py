#!/usr/bin/env python3
"""
Test Fixed ML Query
Test the corrected ML training data query
"""

import asyncio
from app.db.db import fetch

async def test_ml_query():
    """Test the fixed ML training data query"""
    
    print("🔍 Testing fixed ML query...")
    
    try:
        # Test the corrected query
        query = """
        SELECT 
            p.id, p.first_name, p.last_name, p.email, p.phone,
            p.lead_score, p.lifecycle_state, p.created_at,
            p.engagement_score, p.conversion_probability,
            p.touchpoint_count, p.status,
            EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400 as days_since_creation,
            CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as target,
            COALESCE(a.source, 'unknown') as source,
            COALESCE(pr.name, 'unknown') as course_declared,
            COALESCE(c.name, 'unknown') as campus_preference,
            CASE 
                WHEN p.engagement_score >= 80 THEN 'high'
                WHEN p.engagement_score >= 50 THEN 'medium'
                ELSE 'low'
            END as engagement_level
        FROM people p
        LEFT JOIN applications a ON p.id = a.person_id
        LEFT JOIN programmes pr ON a.programme_id = pr.id
        LEFT JOIN campuses c ON pr.campus_id = c.id
        WHERE p.lifecycle_state = 'lead'
        ORDER BY p.created_at DESC
        LIMIT 5
        """
        
        results = await fetch(query)
        print(f"✅ Query successful! Found {len(results)} leads")
        
        if results:
            print(f"\n📋 Sample data:")
            for i, lead in enumerate(results[:3], 1):
                print(f"  Lead {i}:")
                print(f"    Name: {lead.get('first_name', 'N/A')} {lead.get('last_name', 'N/A')}")
                print(f"    Score: {lead.get('lead_score', 'N/A')}")
                print(f"    Engagement: {lead.get('engagement_score', 'N/A')}")
                print(f"    Touchpoints: {lead.get('touchpoint_count', 'N/A')}")
                print(f"    Target: {lead.get('target', 'N/A')}")
                print(f"    Source: {lead.get('source', 'N/A')}")
                print(f"    Course: {lead.get('course_declared', 'N/A')}")
                print(f"    Campus: {lead.get('campus_preference', 'N/A')}")
                print(f"    Engagement Level: {lead.get('engagement_level', 'N/A')}")
                print()
        
        # Check target distribution
        targets = [r['target'] for r in results]
        target_counts = {0: targets.count(0), 1: targets.count(1)}
        print(f"🎯 Target distribution: {target_counts}")
        
        print("\n🎉 Query test passed! ML system should work now.")
        
    except Exception as e:
        print(f"❌ Query test failed: {e}")
        import traceback
        print(f"📋 Full traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_ml_query())
