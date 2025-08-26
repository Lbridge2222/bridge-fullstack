from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/ai/cohort-performance", tags=["cohort-performance"])

# Pydantic Models
class CohortMetrics(BaseModel):
    cohort_id: str
    cohort_name: str
    total_leads: int
    converted_leads: int
    conversion_rate: float
    avg_lead_score: float
    avg_time_to_conversion: float
    total_value: float
    roi: float
    growth_trend: str
    performance_tier: str

class LifecycleStage(BaseModel):
    stage: str
    lead_count: int
    conversion_rate: float
    avg_days_in_stage: float
    bottleneck_score: float

class CohortLifecycle(BaseModel):
    cohort_id: str
    cohort_name: str
    stages: List[LifecycleStage]
    total_pipeline_value: float
    conversion_funnel: Dict[str, float]

class ROIAnalysis(BaseModel):
    segment: str
    total_spend: float
    total_revenue: float
    roi: float
    cost_per_lead: float
    revenue_per_lead: float
    conversion_rate: float

class TrendData(BaseModel):
    date: str
    conversion_rate: float
    lead_count: int
    revenue: float

class CohortTrend(BaseModel):
    cohort_id: str
    cohort_name: str
    trends: List[TrendData]
    growth_rate: float
    seasonality_factor: float

class CohortPerformanceResponse(BaseModel):
    summary: Dict[str, Any]
    cohort_metrics: List[CohortMetrics]
    lifecycle_analysis: List[CohortLifecycle]
    roi_analysis: List[ROIAnalysis]
    trend_analysis: List[CohortTrend]
    insights: List[str]
    recommendations: List[str]
    generated_at: datetime

# Mock data for demonstration
MOCK_COHORT_DATA = {
    "tech_enthusiasts": {
        "name": "Tech Enthusiasts",
        "total_leads": 150,
        "converted_leads": 117,
        "avg_lead_score": 78.3,
        "avg_time_to_conversion": 22.5,
        "total_value": 234000,
        "roi": 3.2,
        "growth_trend": "increasing",
        "performance_tier": "high"
    },
    "international_students": {
        "name": "International Students",
        "total_leads": 95,
        "converted_leads": 67,
        "avg_lead_score": 72.1,
        "avg_time_to_conversion": 28.7,
        "total_value": 134000,
        "roi": 2.8,
        "growth_trend": "increasing",
        "performance_tier": "high"
    },
    "mature_learners": {
        "name": "Mature Learners",
        "total_leads": 120,
        "converted_leads": 82,
        "avg_lead_score": 69.5,
        "avg_time_to_conversion": 32.4,
        "total_value": 164000,
        "roi": 2.5,
        "growth_trend": "stable",
        "performance_tier": "medium"
    },
    "career_changers": {
        "name": "Career Changers",
        "total_leads": 220,
        "converted_leads": 136,
        "avg_lead_score": 65.8,
        "avg_time_to_conversion": 38.2,
        "total_value": 272000,
        "roi": 2.1,
        "growth_trend": "stable",
        "performance_tier": "medium"
    }
}

MOCK_LIFECYCLE_DATA = {
    "tech_enthusiasts": [
        {"stage": "lead", "lead_count": 150, "conversion_rate": 0.78, "avg_days_in_stage": 22.5, "bottleneck_score": 0.15},
        {"stage": "qualified", "lead_count": 117, "conversion_rate": 0.85, "avg_days_in_stage": 15.2, "bottleneck_score": 0.08},
        {"stage": "application", "lead_count": 99, "conversion_rate": 0.92, "avg_days_in_stage": 8.7, "bottleneck_score": 0.05},
        {"stage": "enrolled", "lead_count": 91, "conversion_rate": 1.0, "avg_days_in_stage": 0, "bottleneck_score": 0.0}
    ]
}

MOCK_ROI_DATA = [
    {"segment": "tech_enthusiasts", "total_spend": 45000, "total_revenue": 234000, "roi": 5.2, "cost_per_lead": 300, "revenue_per_lead": 1560, "conversion_rate": 0.78},
    {"segment": "international_students", "total_spend": 32000, "total_revenue": 134000, "roi": 4.2, "cost_per_lead": 337, "revenue_per_lead": 1411, "conversion_rate": 0.71},
    {"segment": "mature_learners", "total_spend": 38000, "total_revenue": 164000, "roi": 4.3, "cost_per_lead": 317, "revenue_per_lead": 1367, "conversion_rate": 0.68},
    {"segment": "career_changers", "total_spend": 55000, "total_revenue": 272000, "roi": 4.9, "cost_per_lead": 250, "revenue_per_lead": 1236, "conversion_rate": 0.62}
]

# Core Functions
def calculate_cohort_metrics() -> List[CohortMetrics]:
    """Calculate comprehensive metrics for all cohorts"""
    metrics = []
    
    for cohort_id, data in MOCK_COHORT_DATA.items():
        conversion_rate = data["converted_leads"] / data["total_leads"]
        
        metrics.append(CohortMetrics(
            cohort_id=cohort_id,
            cohort_name=data["name"],
            total_leads=data["total_leads"],
            converted_leads=data["converted_leads"],
            conversion_rate=conversion_rate,
            avg_lead_score=data["avg_lead_score"],
            avg_time_to_conversion=data["avg_time_to_conversion"],
            total_value=data["total_value"],
            roi=data["roi"],
            growth_trend=data["growth_trend"],
            performance_tier=data["performance_tier"]
        ))
    
    return metrics

def analyze_cohort_lifecycle() -> List[CohortLifecycle]:
    """Analyze how leads move through different lifecycle stages"""
    lifecycle_data = []
    
    for cohort_id, stages in MOCK_LIFECYCLE_DATA.items():
        cohort_name = MOCK_COHORT_DATA[cohort_id]["name"]
        
        # Calculate conversion funnel
        conversion_funnel = {}
        total_leads = stages[0]["lead_count"]
        
        for stage in stages:
            conversion_funnel[stage["stage"]] = stage["lead_count"] / total_leads
        
        lifecycle_data.append(CohortLifecycle(
            cohort_id=cohort_id,
            cohort_name=cohort_name,
            stages=[LifecycleStage(**stage) for stage in stages],
            total_pipeline_value=MOCK_COHORT_DATA[cohort_id]["total_value"],
            conversion_funnel=conversion_funnel
        ))
    
    return lifecycle_data

def calculate_roi_by_segment() -> List[ROIAnalysis]:
    """Calculate ROI and cost metrics by segment"""
    roi_data = []
    
    for data in MOCK_ROI_DATA:
        roi_data.append(ROIAnalysis(**data))
    
    return roi_data

def analyze_trends() -> List[CohortTrend]:
    """Analyze performance trends over time"""
    trends = []
    
    for cohort_id, data in MOCK_COHORT_DATA.items():
        # Generate mock trend data for the last 6 months
        trend_data = []
        base_date = datetime.now() - timedelta(days=180)
        
        for i in range(6):
            date = base_date + timedelta(days=i * 30)
            # Simulate realistic trend variations
            month_factor = 1 + (i - 2.5) * 0.1  # Peak in middle months
            trend_data.append(TrendData(
                date=date.strftime("%Y-%m-%d"),
                conversion_rate=data["converted_leads"] / data["total_leads"] * month_factor,
                lead_count=int(data["total_leads"] / 6 * month_factor),
                revenue=data["total_value"] / 6 * month_factor
            ))
        
        # Calculate growth rate
        if len(trend_data) >= 2:
            growth_rate = (trend_data[-1].conversion_rate - trend_data[0].conversion_rate) / trend_data[0].conversion_rate
        else:
            growth_rate = 0.0
        
        trends.append(CohortTrend(
            cohort_id=cohort_id,
            cohort_name=data["name"],
            trends=trend_data,
            growth_rate=growth_rate,
            seasonality_factor=1.2 if data["growth_trend"] == "increasing" else 0.9
        ))
    
    return trends

def generate_insights_and_recommendations() -> tuple[List[str], List[str]]:
    """Generate insights and recommendations based on data analysis"""
    insights = [
        "Tech Enthusiasts cohort shows highest conversion rate (78%) with strong ROI (5.2x)",
        "International Students have high conversion rates but longer sales cycles",
        "Career Changers represent largest opportunity pool with 220 leads",
        "Mature Learners show stable performance but room for optimization"
    ]
    
    recommendations = [
        "Increase investment in Tech Enthusiasts segment due to high ROI",
        "Optimize conversion funnel for International Students to reduce sales cycle",
        "Develop targeted campaigns for Career Changers to improve conversion rates",
        "Implement lead nurturing programs for Mature Learners to boost performance"
    ]
    
    return insights, recommendations

# API Endpoints
@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "cohort-performance"}

@router.post("/analyze")
async def analyze_cohort_performance() -> CohortPerformanceResponse:
    """Analyze comprehensive cohort performance metrics"""
    try:
        # Calculate all metrics
        cohort_metrics = calculate_cohort_metrics()
        lifecycle_analysis = analyze_cohort_lifecycle()
        roi_analysis = calculate_roi_by_segment()
        trend_analysis = analyze_trends()
        insights, recommendations = generate_insights_and_recommendations()
        
        # Calculate summary statistics
        total_leads = sum(m.total_leads for m in cohort_metrics)
        total_conversions = sum(m.converted_leads for m in cohort_metrics)
        overall_conversion_rate = total_conversions / total_leads if total_leads > 0 else 0
        total_revenue = sum(m.total_value for m in cohort_metrics)
        avg_roi = sum(m.roi for m in cohort_metrics) / len(cohort_metrics) if cohort_metrics else 0
        
        summary = {
            "total_cohorts": len(cohort_metrics),
            "total_leads": total_leads,
            "total_conversions": total_conversions,
            "overall_conversion_rate": overall_conversion_rate,
            "total_revenue": total_revenue,
            "average_roi": avg_roi,
            "top_performing_cohort": max(cohort_metrics, key=lambda x: x.conversion_rate).cohort_name,
            "fastest_growing_cohort": max(cohort_metrics, key=lambda x: x.growth_trend == "increasing").cohort_name
        }
        
        return CohortPerformanceResponse(
            summary=summary,
            cohort_metrics=cohort_metrics,
            lifecycle_analysis=lifecycle_analysis,
            roi_analysis=roi_analysis,
            trend_analysis=trend_analysis,
            insights=insights,
            recommendations=recommendations,
            generated_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze cohort performance: {str(e)}")

@router.get("/metrics")
async def get_cohort_metrics():
    """Get basic cohort metrics"""
    try:
        return {"cohort_metrics": calculate_cohort_metrics()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cohort metrics: {str(e)}")

@router.get("/lifecycle")
async def get_lifecycle_analysis():
    """Get cohort lifecycle analysis"""
    try:
        return {"lifecycle_analysis": analyze_cohort_lifecycle()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get lifecycle analysis: {str(e)}")

@router.get("/roi")
async def get_roi_analysis():
    """Get ROI analysis by segment"""
    try:
        return {"roi_analysis": calculate_roi_by_segment()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ROI analysis: {str(e)}")

@router.get("/trends")
async def get_trend_analysis():
    """Get trend analysis for cohorts"""
    try:
        return {"trend_analysis": analyze_trends()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trend analysis: {str(e)}")
