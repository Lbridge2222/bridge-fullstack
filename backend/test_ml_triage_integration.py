#!/usr/bin/env python3
"""
Test script for ML-first AI triage integration.
Tests the new unified system that uses ML pipeline as primary scoring engine.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

async def test_ml_triage_integration():
    """Test the ML-first triage integration"""
    print("🧪 Testing ML-first AI triage integration...")
    
    try:
        # Import the new ML-first triage function
        from app.ai.tools.leads import leads_triage, sql_query_leads
        
        print("✅ Successfully imported ML-first triage functions")
        
        # Test 1: Test data query with enriched data
        print("\n📊 Testing enriched data query...")
        filters = {"status": None, "source": None, "course": None, "year": None}
        leads = await sql_query_leads(filters)
        
        if leads:
            print(f"✅ Query returned {len(leads)} leads")
            print(f"📋 Sample lead fields: {list(leads[0].__dict__.keys()) if leads else 'None'}")
            
            # Check if we have the new ML fields
            sample_lead = leads[0]
            ml_fields = ['engagement_score', 'conversion_probability', 'touchpoint_count', 'days_since_creation']
            available_fields = [field for field in ml_fields if hasattr(sample_lead, field) and getattr(sample_lead, field) is not None]
            print(f"✅ ML fields available: {available_fields}")
        else:
            print("⚠️ No leads returned from query")
            return False
        
        # Test 2: Test ML-first triage with small sample
        print("\n🤖 Testing ML-first triage...")
        test_leads = leads[:5]  # Test with first 5 leads
        
        try:
            triage_results = await leads_triage(test_leads)
            
            if triage_results:
                print(f"✅ Triage completed for {len(triage_results)} leads")
                
                # Check the structure of results
                sample_result = triage_results[0]
                expected_fields = ['id', 'score', 'ml_confidence', 'ml_probability', 'reasons', 'next_action']
                available_result_fields = [field for field in expected_fields if field in sample_result]
                print(f"✅ Result fields: {available_result_fields}")
                
                # Display sample results
                print("\n📋 Sample triage results:")
                for i, result in enumerate(triage_results[:3]):
                    print(f"  {i+1}. Lead {result['id']}: {result['score']:.1f}% (ML conf: {result.get('ml_confidence', 0):.2f})")
                    print(f"     Reasons: {result.get('reasons', [])}")
                    print(f"     Next action: {result.get('next_action', 'N/A')}")
                    if result.get('insight'):
                        print(f"     Insight: {result['insight']}")
                    print()
                
                return True
            else:
                print("❌ Triage returned no results")
                return False
                
        except Exception as e:
            print(f"❌ Triage failed: {e}")
            import traceback
            traceback.print_exc()
            return False
            
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_fallback_behavior():
    """Test fallback behavior when ML fails"""
    print("\n🔄 Testing fallback behavior...")
    
    try:
        from app.ai.tools.leads import leads_triage_rules_fallback, LeadLite
        from datetime import datetime
        
        # Create test leads
        test_leads = [
            LeadLite(
                id="test-1",
                name="Test Lead 1",
                email="test1@example.com",
                lead_score=85.0,
                last_activity_at=datetime.now()
            ),
            LeadLite(
                id="test-2", 
                name="Test Lead 2",
                email="test2@example.com",
                lead_score=45.0,
                last_activity_at=datetime.now()
            )
        ]
        
        fallback_results = await leads_triage_rules_fallback(test_leads)
        
        if fallback_results:
            print(f"✅ Fallback completed for {len(fallback_results)} leads")
            print("📋 Fallback results:")
            for result in fallback_results:
                print(f"  Lead {result['id']}: {result['score']:.1f}% (Rules-based)")
            return True
        else:
            print("❌ Fallback returned no results")
            return False
            
    except Exception as e:
        print(f"❌ Fallback test failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting ML-first AI triage integration tests...\n")
    
    # Test 1: Main integration
    test1_passed = await test_ml_triage_integration()
    
    # Test 2: Fallback behavior
    test2_passed = await test_fallback_behavior()
    
    # Summary
    print("\n" + "="*50)
    print("📊 TEST SUMMARY")
    print("="*50)
    print(f"ML-first triage integration: {'✅ PASSED' if test1_passed else '❌ FAILED'}")
    print(f"Fallback behavior: {'✅ PASSED' if test2_passed else '❌ FAILED'}")
    
    if test1_passed and test2_passed:
        print("\n🎉 All tests passed! ML-first AI triage is ready.")
        return True
    else:
        print("\n⚠️ Some tests failed. Please check the implementation.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
