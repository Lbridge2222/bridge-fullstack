#!/usr/bin/env python3
"""
Check Lead Distribution
Check how many leads have applications vs don't
"""

import asyncio
from app.db.db import fetch

async def check_lead_distribution():
    """Check the distribution of leads with and without applications"""
    
    print("🔍 Checking lead distribution...")
    
    try:
        # Count total leads
        total_query = "SELECT COUNT(*) as total FROM people WHERE lifecycle_state = 'lead'"
        total_result = await fetch(total_query)
        total_leads = total_result[0]['total']
        
        # Count leads with applications
        with_apps_query = """
        SELECT COUNT(DISTINCT p.id) as total
        FROM people p
        INNER JOIN applications a ON p.id = a.person_id
        WHERE p.lifecycle_state = 'lead'
        """
        with_apps_result = await fetch(with_apps_query)
        with_apps = with_apps_result[0]['total']
        
        # Count leads without applications
        without_apps = total_leads - with_apps
        
        print(f"📊 Lead Distribution:")
        print(f"  Total Leads: {total_leads}")
        print(f"  With Applications: {with_apps}")
        print(f"  Without Applications: {without_apps}")
        print(f"  Application Rate: {(with_apps/total_leads)*100:.1f}%")
        
        # Check if we have enough data for ML training
        print(f"\n🎯 ML Training Data Assessment:")
        if total_leads >= 20:
            print(f"  ✅ Sufficient total leads: {total_leads}")
        else:
            print(f"  ⚠️  Limited total leads: {total_leads} (need at least 20)")
            
        if with_apps >= 5:
            print(f"  ✅ Sufficient positive examples: {with_apps}")
        else:
            print(f"  ⚠️  Limited positive examples: {with_apps} (need at least 5)")
            
        if without_apps >= 5:
            print(f"  ✅ Sufficient negative examples: {without_apps}")
        else:
            print(f"  ⚠️  Limited negative examples: {without_apps} (need at least 5)")
        
        # Check lead scores distribution
        print(f"\n📊 Lead Score Distribution:")
        score_query = """
        SELECT 
            CASE 
                WHEN lead_score >= 80 THEN 'High (80+)'
                WHEN lead_score >= 50 THEN 'Medium (50-79)'
                ELSE 'Low (<50)'
            END as score_range,
            COUNT(*) as count
        FROM people 
        WHERE lifecycle_state = 'lead' AND lead_score IS NOT NULL
        GROUP BY 
            CASE 
                WHEN lead_score >= 80 THEN 'High (80+)'
                WHEN lead_score >= 50 THEN 'Medium (50-79)'
                ELSE 'Low (<50)'
            END
        ORDER BY score_range
        """
        
        score_results = await fetch(score_query)
        for result in score_results:
            print(f"  {result['score_range']}: {result['count']} leads")
        
        print(f"\n💡 Recommendations:")
        if total_leads < 20:
            print("  - Add more sample leads to reach at least 20 total")
        if with_apps < 5:
            print("  - Need more leads with applications for positive examples")
        if without_apps < 5:
            print("  - Need more leads without applications for negative examples")
        
        if total_leads >= 20 and with_apps >= 5 and without_apps >= 5:
            print("  🎉 Ready for ML training!")
        else:
            print("  ⚠️  Consider adding more sample data for better ML training")
        
    except Exception as e:
        print(f"❌ Error checking distribution: {e}")
        import traceback
        print(f"📋 Full traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(check_lead_distribution())
