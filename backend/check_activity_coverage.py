"""
Check Activity Coverage for ML Features

This script checks what activity types you're currently tracking
and how much data you have for the ML model's new features.

Run: python check_activity_coverage.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.db.db import fetch, fetchrow


async def check_activity_coverage():
    """Check what activities are being tracked"""
    
    print("\n" + "="*70)
    print("  ACTIVITY COVERAGE CHECK FOR ML FEATURES")
    print("="*70 + "\n")
    
    # 1. Check activity types being logged
    print("📊 ACTIVITY TYPES CURRENTLY IN DATABASE:\n")
    
    activity_types = await fetch("""
        SELECT 
            activity_type,
            COUNT(*) as count,
            MIN(created_at) as first_seen,
            MAX(created_at) as last_seen,
            COUNT(DISTINCT lead_id) as unique_people
        FROM lead_activities
        WHERE created_at > NOW() - INTERVAL '90 days'
        GROUP BY activity_type
        ORDER BY count DESC
    """)
    
    if not activity_types:
        print("   ⚠️  No activities found in last 90 days!")
        print("   💡 Start logging activities to improve ML predictions\n")
        return
    
    # Track which ML features we can use
    has_email_tracking = False
    has_portal_tracking = False
    has_document_tracking = False
    
    for row in activity_types:
        activity_type = row['activity_type']
        count = row['count']
        people = row['unique_people']
        
        # Check for ML-relevant activity types
        icon = "📧" if 'email' in activity_type.lower() else \
               "🌐" if 'portal' in activity_type.lower() else \
               "📄" if 'document' in activity_type.lower() else \
               "📝"
        
        print(f"   {icon} {activity_type:30s} → {count:6,d} events ({people:4d} people)")
        
        # Flag which features we can use
        if 'email' in activity_type.lower():
            has_email_tracking = True
        if 'portal' in activity_type.lower() or 'login' in activity_type.lower():
            has_portal_tracking = True
        if 'document' in activity_type.lower():
            has_document_tracking = True
    
    # 2. ML Feature Availability
    print("\n" + "-"*70)
    print("🤖 ML FEATURE AVAILABILITY:\n")
    
    features = [
        ("Email Engagement Tracking", has_email_tracking, 
         "Tracks email opens/clicks for engagement scoring"),
        ("Portal Engagement Tracking", has_portal_tracking,
         "Tracks portal logins for active engagement"),
        ("Document Activity Tracking", has_document_tracking,
         "Tracks document submissions for completion")
    ]
    
    available_count = sum(1 for _, available, _ in features if available)
    
    for feature_name, available, description in features:
        status = "✅ AVAILABLE" if available else "❌ NOT AVAILABLE"
        print(f"   {status:20s} {feature_name}")
        if not available:
            print(f"      💡 {description}")
    
    # 3. Overall Assessment
    print("\n" + "-"*70)
    print("📈 OVERALL ML ENHANCEMENT STATUS:\n")
    
    coverage_pct = (available_count / len(features)) * 100
    
    if coverage_pct == 100:
        print("   🎉 EXCELLENT! All ML features are available!")
        print("   ✅ Your model will use email, portal, and document engagement data")
    elif coverage_pct >= 66:
        print(f"   👍 GOOD! {int(coverage_pct)}% of ML features are available")
        print("   ✅ Your model is enhanced with most engagement tracking")
    elif coverage_pct >= 33:
        print(f"   ⚠️  PARTIAL: Only {int(coverage_pct)}% of ML features are available")
        print("   💡 Consider adding more activity logging for better predictions")
    else:
        print(f"   ❌ LIMITED: Only {int(coverage_pct)}% of ML features are available")
        print("   💡 Add activity logging to significantly improve ML accuracy")
    
    # 4. Sample people with good coverage
    print("\n" + "-"*70)
    print("👥 SAMPLE PEOPLE WITH ACTIVITY DATA:\n")
    
    sample_people = await fetch("""
        SELECT 
            p.id,
            p.first_name,
            p.last_name,
            COUNT(DISTINCT la.activity_type) as unique_activity_types,
            COUNT(*) as total_activities,
            MAX(la.created_at) as last_activity
        FROM people p
        JOIN lead_activities la ON la.lead_id = p.id::text
        WHERE la.created_at > NOW() - INTERVAL '90 days'
        GROUP BY p.id, p.first_name, p.last_name
        ORDER BY total_activities DESC
        LIMIT 5
    """)
    
    if sample_people:
        for person in sample_people:
            name = f"{person['first_name'] or ''} {person['last_name'] or ''}".strip() or 'Unknown'
            activities = person['total_activities']
            types = person['unique_activity_types']
            print(f"   • {name:30s} → {activities:4d} activities ({types} types)")
    else:
        print("   No people with recent activities found")
    
    # 5. Recommendations
    print("\n" + "-"*70)
    print("💡 RECOMMENDATIONS:\n")
    
    recommendations = []
    
    if not has_email_tracking:
        recommendations.append((
            "Add Email Tracking",
            "Log 'email_sent', 'email_opened', 'email_clicked' activities",
            "Impact: +8% to +13% prediction accuracy"
        ))
    
    if not has_portal_tracking:
        recommendations.append((
            "Add Portal Login Tracking",
            "Log 'portal_login' activities when users access the system",
            "Impact: +6% to +12% prediction accuracy"
        ))
    
    if not has_document_tracking:
        recommendations.append((
            "Add Document Tracking",
            "Log 'document_uploaded', 'document_submitted' activities",
            "Impact: +5% to +10% prediction accuracy"
        ))
    
    if recommendations:
        for i, (title, action, impact) in enumerate(recommendations, 1):
            print(f"   {i}. {title}")
            print(f"      → {action}")
            print(f"      💪 {impact}\n")
    else:
        print("   ✅ All key activities are being tracked!")
        print("   🎯 Your ML model has maximum feature coverage\n")
    
    # 6. Quick reference
    print("-"*70)
    print("📚 QUICK REFERENCE - Activity Types to Log:\n")
    print("   Essential (High Impact):")
    print("   • email_sent, email_opened, email_clicked")
    print("   • portal_login")
    print("   • document_uploaded, document_submitted")
    print("\n   Nice-to-Have (Medium Impact):")
    print("   • webinar_registered, webinar_attended")
    print("   • open_day_registered, open_day_attended")
    print("   • phone_call_made, phone_call_answered")
    print("\n   See NO_MIGRATION_ML_ENHANCEMENT.md for full guide")
    print("="*70 + "\n")


async def main():
    """Main entry point"""
    try:
        await check_activity_coverage()
    except Exception as e:
        print(f"\n❌ Error: {e}\n")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())

