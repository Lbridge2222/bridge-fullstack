#!/usr/bin/env python3
"""
Debug script to test the exact API endpoints the frontend is calling
"""

import asyncio
import json
from app.db.db import fetch

async def test_leads_endpoint():
    """Test the exact endpoint the frontend calls"""
    print("🔍 Testing /people/leads endpoint (frontend calls this)...")
    
    try:
        # This is what the frontend calls
        sql = """
        SELECT 
            id::text,
            first_name,
            last_name,
            email,
            lifecycle_state,
            latest_application_stage,
            lead_score,
            conversion_probability::float,
            created_at,
            created_at as last_activity_at,
            'enquiry' as last_activity_kind,
            'Initial contact required' as last_activity_title
        FROM vw_leads_management
        ORDER BY created_at DESC
        LIMIT 50
        """
        
        result = await fetch(sql)
        print(f"✅ Query returned {len(result)} leads")
        
        if result:
            print("📋 Sample data structure:")
            sample = result[0]
            for key, value in sample.items():
                print(f"   {key}: {value} (type: {type(value).__name__})")
        
        return result
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

async def test_ml_endpoint():
    """Test the ML endpoint the frontend calls"""
    print("\n🤖 Testing /ai/leads/predict-batch endpoint...")
    
    try:
        # Test with the exact payload format the frontend sends
        from app.routers.ai_leads import predict_batch_leads
        
        payload = {
            "lead_ids": [
                "550e8400-e29b-41d4-a716-446655440031",
                "550e8400-e29b-41d4-a716-446655440032"
            ]
        }
        
        result = await predict_batch_leads(payload)
        print(f"✅ ML endpoint returned: {json.dumps(result, indent=2, default=str)}")
        return result
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

async def main():
    """Main debug function"""
    print("🚀 Debugging frontend data flow...\n")
    
    # Test leads endpoint
    leads = await test_leads_endpoint()
    
    # Test ML endpoint
    ml_data = await test_ml_endpoint()
    
    print(f"\n📊 Debug Summary:")
    print(f"   • /people/leads returned: {len(leads) if leads else 0} leads")
    print(f"   • /ai/leads/predict-batch returned: {'✅' if ml_data else '❌'}")
    
    if leads:
        print(f"\n🔍 First 3 leads:")
        for i, lead in enumerate(leads[:3]):
            print(f"   {i+1}. {lead['first_name']} {lead['last_name']} (Score: {lead['lead_score']})")
    
    print(f"\n💡 If leads > 0 but frontend shows 0, the issue is in:")
    print(f"   1. Frontend API call failing")
    print(f"   2. Data structure mismatch")
    print(f"   3. CORS/network issues")

if __name__ == "__main__":
    asyncio.run(main())
