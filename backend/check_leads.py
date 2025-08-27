#!/usr/bin/env python3
"""
Check current lead data in the database
"""

import asyncio
from app.db.db import fetch

async def check_leads():
    """Check how many leads are available for ML training"""
    
    print("🔍 Checking current lead data...")
    
    try:
        # Count total leads
        count_query = "SELECT COUNT(*) as total FROM people WHERE lifecycle_state = 'lead'"
        count_result = await fetch(count_query)
        total_leads = count_result[0]['total'] if count_result else 0
        
        # Count leads with applications
        app_query = "SELECT COUNT(*) as total FROM people WHERE lifecycle_state = 'lead' AND has_application = true"
        app_result = await fetch(app_query)
        app_leads = app_result[0]['total'] if app_result else 0
        
        # Count leads with scores
        score_query = "SELECT COUNT(*) as total FROM people WHERE lifecycle_state = 'lead' AND lead_score IS NOT NULL"
        score_result = await fetch(score_query)
        scored_leads = score_result[0]['total'] if score_result else 0
        
        print(f"📊 Lead Data Summary:")
        print(f"   Total Leads: {total_leads}")
        print(f"   With Applications: {app_leads}")
        print(f"   With Scores: {scored_leads}")
        
        if total_leads >= 10:
            print(f"✅ Sufficient data for ML training!")
        elif total_leads >= 5:
            print(f"⚠️  Limited data - ML training may have limited accuracy")
        else:
            print(f"❌ Insufficient data - need at least 5 leads for ML training")
            
    except Exception as e:
        print(f"❌ Error checking leads: {e}")

if __name__ == "__main__":
    asyncio.run(check_leads())
