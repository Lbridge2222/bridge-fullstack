#!/usr/bin/env python3
"""
Test script for AI endpoints
"""

import asyncio
import json
from app.db.db import fetch

async def test_leads_endpoint():
    """Test the leads endpoint"""
    print("🔍 Testing /people/leads endpoint...")
    
    try:
        # Test the view directly
        count = await fetch("SELECT COUNT(*) as count FROM vw_leads_management")
        print(f"✅ View has {count[0]['count']} leads")
        
        # Get sample leads
        leads = await fetch("SELECT id, first_name, last_name, lead_score, conversion_probability FROM vw_leads_management LIMIT 3")
        print(f"✅ Sample leads:")
        for lead in leads:
            print(f"   • {lead['first_name']} {lead['last_name']}: Score {lead['lead_score']}, Conversion {lead['conversion_probability']*100:.1f}%")
            
        return leads
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

async def test_ml_pipeline():
    """Test the ML pipeline"""
    print("\n🤖 Testing ML pipeline...")
    
    try:
        from app.ai.advanced_ml import AdvancedMLPipeline
        
        # Initialize pipeline
        ml_pipeline = AdvancedMLPipeline()
        print("✅ ML pipeline initialized")
        
        # Test with sample lead IDs
        sample_ids = ['550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440032']
        
        # Get predictions
        predictions = await ml_pipeline.predict_batch(sample_ids)
        print(f"✅ ML predictions: {json.dumps(predictions, indent=2, default=str)}")
        
        return predictions
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

async def main():
    """Main test function"""
    print("🚀 Testing AI endpoints...\n")
    
    # Test leads
    leads = await test_leads_endpoint()
    
    # Test ML pipeline
    ml_data = await test_ml_pipeline()
    
    print(f"\n📊 Summary:")
    print(f"   • Leads available: {len(leads) if leads else 0}")
    print(f"   • ML pipeline working: {'✅' if ml_data else '❌'}")
    
    if leads and ml_data:
        print("\n🎯 Ready for AI chat testing!")
    else:
        print("\n⚠️ Some components need fixing")

if __name__ == "__main__":
    asyncio.run(main())
