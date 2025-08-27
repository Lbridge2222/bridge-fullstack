#!/usr/bin/env python3
"""
Test ML Database Connection
Simple script to verify the ML system can connect and load data
"""

import asyncio
from app.db.db import fetch

async def test_ml_connection():
    """Test if the ML system can connect to the database"""
    
    print("🔍 Testing ML database connection...")
    
    try:
        # Test basic connection
        print("📊 Testing basic query...")
        result = await fetch("SELECT COUNT(*) as total FROM people")
        print(f"✅ Basic query successful: {result}")
        
        # Test lead data query
        print("📊 Testing lead data query...")
        lead_query = """
        SELECT 
            p.id, p.first_name, p.last_name, p.email, p.phone,
            p.lead_score, p.lifecycle_state, p.created_at,
            p.has_application, p.source, p.course_declared,
            p.campus_preference, p.engagement_level
        FROM people p
        WHERE p.lifecycle_state = 'lead'
        LIMIT 5
        """
        
        leads = await fetch(lead_query)
        print(f"✅ Lead query successful: {len(leads)} leads found")
        
        if leads:
            print(f"📋 Sample lead data:")
            for i, lead in enumerate(leads[:3], 1):
                print(f"  Lead {i}: {lead.get('first_name', 'N/A')} {lead.get('last_name', 'N/A')} - Score: {lead.get('lead_score', 'N/A')}")
        
        # Test target calculation
        print("📊 Testing target calculation...")
        target_query = """
        SELECT 
            p.id, p.has_application,
            CASE WHEN p.has_application THEN 1 ELSE 0 END as target
        FROM people p
        WHERE p.lifecycle_state = 'lead'
        LIMIT 5
        """
        
        targets = await fetch(target_query)
        print(f"✅ Target calculation successful: {len(targets)} targets found")
        
        if targets:
            print(f"📋 Sample targets:")
            for i, target in enumerate(targets[:3], 1):
                print(f"  Target {i}: has_application={target.get('has_application')}, target={target.get('target')}")
        
        print("\n🎯 All tests passed! ML system should work correctly.")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        print(f"📋 Full traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_ml_connection())
