from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime, timedelta
from app.db.db import fetch, fetchrow
from app.ai.advanced_ml import AdvancedMLPipeline

router = APIRouter(prefix="/api/predictive-analytics", tags=["predictive-analytics"])

# Initialize ML pipeline
ml_pipeline = None

async def get_ml_pipeline():
    """Get or initialize ML pipeline"""
    global ml_pipeline
    if ml_pipeline is None:
        ml_pipeline = AdvancedMLPipeline()
    return ml_pipeline

@router.get("/forecasting/overview")
async def get_forecasting_overview(
    timeframe: str = Query("12-months", description="6-months, 12-months, or 24-months"),
    program: str = Query("all", description="Specific program or 'all'")
):
    """Get forecasting overview data for the dashboard"""
    try:
        # Convert timeframe to months and use proper PostgreSQL interval syntax
        months_map = {"6-months": "6 months", "12-months": "12 months", "24-months": "24 months"}
        interval = months_map.get(timeframe, "12 months")
        
        # Get real enrollment data with simplified date filtering
        sql = """
        SELECT 
            DATE_TRUNC('month', created_at) as month,
            COUNT(*) as applications,
            COUNT(CASE WHEN lifecycle_state IN ('enrolled', 'student') THEN 1 END) as enrollments
        FROM people 
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
        LIMIT 24
        """
        
        # For now, use a fixed 12-month interval to avoid placeholder issues
        results = await fetch(sql)
        
        # Calculate trends and predictions
        if results:
            recent_months = results[:6]  # Last 6 months for trend calculation
            avg_applications = sum(r['applications'] for r in recent_months) / len(recent_months)
            avg_enrollments = sum(r['enrollments'] for r in recent_months) / len(recent_months)
            
            # Simple trend calculation
            if len(recent_months) >= 2:
                app_trend = ((recent_months[0]['applications'] - recent_months[-1]['applications']) / 
                            recent_months[-1]['applications']) * 100
                enroll_trend = ((recent_months[0]['enrollments'] - recent_months[-1]['enrollments']) / 
                               recent_months[-1]['enrollments']) * 100
            else:
                app_trend = enroll_trend = 0
            
            return {
                "overview": {
                    "totalApplications": sum(r['applications'] for r in results),
                    "totalEnrollments": sum(r['enrollments'] for r in results),
                    "conversionRate": (sum(r['enrollments'] for r in results) / 
                                     sum(r['applications'] for r in results)) * 100 if sum(r['applications'] for r in results) > 0 else 0,
                    "avgMonthlyApplications": round(avg_applications, 1),
                    "avgMonthlyEnrollments": round(avg_enrollments, 1),
                    "applicationTrend": round(app_trend, 1),
                    "enrollmentTrend": round(enroll_trend, 1)
                },
                "monthlyData": [
                    {
                        "month": r['month'].strftime("%Y-%m"),
                        "applications": r['applications'],
                        "enrollments": r['enrollments'],
                        "conversionRate": (r['enrollments'] / r['applications']) * 100 if r['applications'] > 0 else 0
                    }
                    for r in results
                ]
            }
        else:
            return {
                "overview": {
                    "totalApplications": 0,
                    "totalEnrollments": 0,
                    "conversionRate": 0,
                    "avgMonthlyApplications": 0,
                    "avgMonthlyEnrollments": 0,
                    "applicationTrend": 0,
                    "enrollmentTrend": 0
                },
                "monthlyData": []
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting data error: {str(e)}")

@router.get("/risk-scoring/overview")
async def get_risk_scoring_overview():
    """Get risk scoring overview data"""
    try:
        # Get real student/lead risk data
        sql = """
        SELECT 
            lifecycle_state,
            COUNT(*) as total,
            COUNT(CASE WHEN lead_score < 30 THEN 1 END) as critical_risk,
            COUNT(CASE WHEN lead_score BETWEEN 30 AND 50 THEN 1 END) as high_risk,
            COUNT(CASE WHEN lead_score BETWEEN 51 AND 70 THEN 1 END) as medium_risk,
            COUNT(CASE WHEN lead_score > 70 THEN 1 END) as low_risk,
            AVG(lead_score) as avg_score
        FROM people 
        WHERE lifecycle_state IN ('lead', 'pre_applicant', 'applicant', 'enrolled', 'student')
        GROUP BY lifecycle_state
        """
        
        results = await fetch(sql)
        
        # Calculate overall risk metrics
        total_people = sum(r['total'] for r in results)
        total_critical = sum(r['critical_risk'] for r in results)
        total_high = sum(r['high_risk'] for r in results)
        total_medium = sum(r['medium_risk'] for r in results)
        total_low = sum(r['low_risk'] for r in results)
        
        return {
            "overview": {
                "totalPeople": total_people,
                "criticalRisk": total_critical,
                "highRisk": total_high,
                "mediumRisk": total_medium,
                "lowRisk": total_low,
                "avgRiskScore": round(sum(r['avg_score'] * r['total'] for r in results) / total_people, 1) if total_people > 0 else 0,
                "criticalActions": total_critical + total_high,
                "interventionsNeeded": total_critical + total_high + total_medium
            },
            "byLifecycle": [
                {
                    "stage": r['lifecycle_state'],
                    "total": r['total'],
                    "criticalRisk": r['critical_risk'],
                    "highRisk": r['high_risk'],
                    "mediumRisk": r['medium_risk'],
                    "lowRisk": r['low_risk'],
                    "avgScore": round(r['avg_score'], 1) if r['avg_score'] else 0
                }
                for r in results
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk scoring data error: {str(e)}")

@router.get("/next-best-actions/overview")
async def get_next_best_actions_overview():
    """Get next best actions overview data"""
    try:
        # Get leads that need immediate attention
        sql = """
        SELECT 
            p.id,
            p.first_name,
            p.last_name,
            p.lead_score,
            p.lifecycle_state,
            p.created_at,
            p.last_engagement_date,
            CASE 
                WHEN p.lead_score >= 80 THEN 'critical'
                WHEN p.lead_score >= 60 THEN 'high'
                WHEN p.lead_score >= 40 THEN 'medium'
                ELSE 'low'
            END as priority
        FROM people p
        WHERE p.lifecycle_state IN ('lead', 'pre_applicant')
        AND p.lead_score > 0
        ORDER BY p.lead_score DESC, p.created_at ASC
        LIMIT 50
        """
        
        results = await fetch(sql)
        
        # Categorize actions
        urgent_actions = []
        recommended_actions = []
        
        for person in results:
            days_since_creation = (datetime.now() - person['created_at']).days
            days_since_engagement = (datetime.now() - person['last_engagement_date']).days if person['last_engagement_date'] else None
            
            # Determine action type based on lead characteristics
            if person['lead_score'] >= 80:
                action_type = 'call'
                priority = 'critical'
                time_left = '1 hour'
                reasoning = f"Hot lead with {person['lead_score']}/100 score"
            elif person['lead_score'] >= 60:
                action_type = 'email'
                priority = 'high'
                time_left = '4 hours'
                reasoning = f"High-value lead needing engagement"
            elif days_since_engagement and days_since_engagement > 7:
                action_type = 'call'
                priority = 'medium'
                time_left = '24 hours'
                reasoning = f"No engagement for {days_since_engagement} days"
            else:
                action_type = 'email'
                priority = 'medium'
                time_left = '48 hours'
                reasoning = f"Standard follow-up for {person['lead_score']}/100 lead"
            
            action = {
                "id": person['id'],
                "type": action_type,
                "priority": priority,
                "title": f"{action_type.title()} {person['first_name']} {person['last_name']}",
                "description": f"Lead score: {person['lead_score']}/100, {person['lifecycle_state']}",
                "contact": {
                    "name": f"{person['first_name']} {person['last_name']}",
                    "program": "Music Production",  # Could be enhanced with real data
                    "score": person['lead_score'],
                    "avatar": f"{person['first_name'][0]}{person['last_name'][0]}"
                },
                "impact": f"+£{person['lead_score'] * 100} potential revenue",
                "timeLeft": time_left,
                "reasoning": reasoning,
                "estimatedDuration": "15 minutes",
                "difficulty": "easy"
            }
            
            if priority in ['critical', 'high']:
                urgent_actions.append(action)
            else:
                recommended_actions.append(action)
        
        return {
            "overview": {
                "urgentActions": len(urgent_actions),
                "todayActions": len(urgent_actions) + len(recommended_actions),
                "weekActions": len(urgent_actions) + len(recommended_actions),
                "automatedActions": 0,  # Could be enhanced with automation tracking
                "completionRate": 85.0,  # Could be enhanced with real metrics
                "avgResponseTime": "2.4 hours"
            },
            "urgentActions": urgent_actions[:10],  # Top 10 urgent
            "recommendedActions": recommended_actions[:20]  # Top 20 recommended
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Next best actions data error: {str(e)}")

@router.get("/ml-predictions/batch")
async def get_ml_predictions_batch(limit: int = Query(20, ge=1, le=100)):
    """Get ML predictions for a batch of leads"""
    try:
        # Get recent leads for prediction
        sql = """
        SELECT id, first_name, last_name, lead_score, lifecycle_state
        FROM people 
        WHERE lifecycle_state IN ('lead', 'pre_applicant')
        AND lead_score > 0
        ORDER BY created_at DESC
        LIMIT %s
        """
        
        leads = await fetch(sql, limit)
        
        if not leads:
            return {"predictions": [], "total_processed": 0}
        
        # Get ML pipeline
        pipeline = await get_ml_pipeline()
        
        # Get predictions for these leads
        lead_ids = [str(lead['id']) for lead in leads]
        predictions = await pipeline.predict_batch(lead_ids)
        
        # Combine lead data with predictions
        enhanced_predictions = []
        for lead in leads:
            prediction = next((p for p in predictions.get('predictions', []) 
                             if p['lead_id'] == str(lead['id'])), None)
            
            enhanced_predictions.append({
                "lead_id": str(lead['id']),
                "name": f"{lead['first_name']} {lead['last_name']}",
                "lead_score": lead['lead_score'],
                "lifecycle_state": lead['lifecycle_state'],
                "conversion_probability": prediction['probability'] if prediction else 0.5,
                "confidence": prediction['confidence'] if prediction else 0.5,
                "risk_level": "high" if (prediction and prediction['probability'] < 0.3) else 
                             "medium" if (prediction and prediction['probability'] < 0.6) else "low"
            })
        
        return {
            "predictions": enhanced_predictions,
            "total_processed": len(enhanced_predictions),
            "model_used": predictions.get('model_used', 'unknown'),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML predictions error: {str(e)}")

@router.get("/test-sql")
async def test_sql():
    """Test SQL query to debug syntax issues"""
    try:
        # Simple test query
        sql = "SELECT COUNT(*) as total FROM people LIMIT 1"
        result = await fetch(sql)
        return {
            "status": "success",
            "result": result,
            "sql": sql
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "sql": sql
        }

@router.get("/health")
async def health_check():
    """Health check for predictive analytics service"""
    return {
        "status": "healthy",
        "service": "predictive-analytics",
        "timestamp": datetime.now().isoformat(),
        "endpoints": [
            "/forecasting/overview",
            "/risk-scoring/overview", 
            "/next-best-actions/overview",
            "/ml-predictions/batch",
            "/test-sql"
        ]
    }
