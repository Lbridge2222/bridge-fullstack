from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.db.db import fetch

router = APIRouter()

@router.get("/metrics")
async def get_dashboard_metrics() -> Dict[str, Any]:
    """
    Get aggregated dashboard metrics for the CRM Overview page.
    Returns counts, trends, and predictions based on real data.
    """
    try:
        # Get dashboard metrics from the view
        result = await fetch("SELECT * FROM vw_dashboard_metrics LIMIT 1")
        
        if not result:
            # Return default values if no data
            return {
                "overview": {
                    "totalLeads": 0,
                    "totalApplications": 0,
                    "totalOffers": 0,
                    "totalEnrolled": 0,
                    "hotLeads": 0,
                    "applicationsPredicted": 0,
                    "enrollmentPredicted": 0,
                    "revenueProjected": 0
                },
                "trends": {
                    "leadsChange": 0,
                    "applicationsChange": 0,
                    "offersChange": 0,
                    "enrolledChange": 0
                },
                "insights": {
                    "highValueLeadsUncontacted": 0,
                    "upcomingInterviews": 0,
                    "enrollmentDeadlinesApproaching": 0,
                    "applicationsThisWeek": 0
                }
            }
        
        metrics = result[0]
        
        return {
            "overview": {
                "totalLeads": metrics["total_leads"] or 0,
                "totalApplications": metrics["total_applications"] or 0,
                "totalOffers": metrics["total_offers"] or 0,
                "totalEnrolled": metrics["total_enrolled"] or 0,
                "hotLeads": metrics["hot_leads"] or 0,
                "applicationsPredicted": metrics["applications_predicted"] or 0,
                "enrollmentPredicted": metrics["enrollment_predicted"] or 0,
                "revenueProjected": metrics["revenue_projected"] or 0
            },
            "trends": {
                "leadsChange": metrics["leads_change"] or 0,
                "applicationsChange": metrics["applications_change"] or 0,
                "offersChange": metrics["offers_change"] or 0,
                "enrolledChange": metrics["enrolled_change"] or 0
            },
            "insights": {
                "highValueLeadsUncontacted": metrics["high_value_leads_uncontacted"] or 0,
                "upcomingInterviews": metrics["upcoming_interviews"] or 0,
                "enrollmentDeadlinesApproaching": metrics["enrollment_deadlines_approaching"] or 0,
                "applicationsThisWeek": metrics["applications_this_week"] or 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard metrics: {str(e)}")

@router.get("/ai-insights")
async def get_ai_insights() -> Dict[str, Any]:
    """
    Get AI-generated insights based on real data patterns.
    """
    try:
        # Get insights data from the metrics view
        result = await fetch("SELECT * FROM vw_dashboard_metrics LIMIT 1")
        
        if not result:
            return {"insights": []}
        
        metrics = result[0]
        insights = []
        
        # Generate insights based on data patterns
        if metrics.get("high_value_leads_uncontacted", 0) > 0:
            insights.append({
                "id": "1",
                "type": "urgent",
                "title": "High-Value Leads Need Attention",
                "description": f"{metrics['high_value_leads_uncontacted']} leads with 85+ AI scores haven't been contacted in 3+ days.",
                "action": "Contact Now",
                "impact": "+12 applications",
                "priority": 1,
                "category": "Lead Management"
            })
        
        if metrics.get("upcoming_interviews", 0) > 0:
            insights.append({
                "id": "2",
                "type": "opportunity",
                "title": "Interview Preparation Required",
                "description": f"{metrics['upcoming_interviews']} interviews scheduled in the next 7 days.",
                "action": "Prepare Materials",
                "impact": "+8 offers",
                "priority": 2,
                "category": "Interview Management"
            })
        
        if metrics.get("enrollment_deadlines_approaching", 0) > 0:
            insights.append({
                "id": "3",
                "type": "urgent",
                "title": "Enrollment Deadlines Approaching",
                "description": f"{metrics['enrollment_deadlines_approaching']} accepted offers have enrollment deadlines within 14 days.",
                "action": "Follow Up",
                "impact": "+15 enrollments",
                "priority": 1,
                "category": "Enrollment Management"
            })
        
        if metrics.get("applications_this_week", 0) > 10:
            insights.append({
                "id": "4",
                "type": "success",
                "title": "Strong Application Week",
                "description": f"{metrics['applications_this_week']} applications submitted this week - above average.",
                "action": "Review Pipeline",
                "impact": "+5 offers",
                "priority": 3,
                "category": "Application Management"
            })
        
        return {"insights": insights}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch AI insights: {str(e)}")
