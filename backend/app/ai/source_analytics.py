from __future__ import annotations

import datetime as dt
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/ai/source-analytics", tags=["AI Source Analytics"])

# ------------------------------
# Source Quality Models
# ------------------------------

class SourceType(str, Enum):
    UCAS_DIRECT = "ucas_direct"
    SCHOOL_TOUR = "school_tour"
    REFERRAL = "referral"
    EVENT = "event"
    ORGANIC = "organic"
    PAID_SOCIAL = "paid_social"
    EMAIL_CAMPAIGN = "email_campaign"
    UNKNOWN = "unknown"

class SourcePerformance(BaseModel):
    source: str
    total_leads: int
    converted_leads: int
    conversion_rate: float
    avg_conversion_time_days: Optional[float]
    avg_lead_score: float
    avg_forecast_probability: float
    total_revenue: Optional[float]
    cost_per_acquisition: Optional[float]
    roi: Optional[float]
    quality_score: float  # 0-100 composite score
    trend: str  # "improving", "stable", "declining"
    last_updated: str

class SourceRecommendation(BaseModel):
    source: str
    action: str  # "increase_investment", "maintain", "reduce_investment", "optimize"
    reason: str
    expected_impact: str
    priority: str  # "high", "medium", "low"
    suggested_budget_change: Optional[float]  # percentage change

class SourceAnalyticsRequest(BaseModel):
    time_period_days: int = 90  # analyze last X days
    include_revenue: bool = False
    include_costs: bool = False

class SourceAnalyticsResponse(BaseModel):
    sources: List[SourcePerformance]
    recommendations: List[SourceRecommendation]
    summary: Dict[str, Any]
    generated_at: str

# ------------------------------
# Source Quality Scoring
# ------------------------------

def calculate_source_quality_score(
    conversion_rate: float,
    avg_lead_score: float,
    avg_forecast_probability: float,
    total_leads: int,
    trend: str
) -> float:
    """Calculate composite quality score (0-100) for a source"""
    
    # Base score from conversion rate (0-40 points)
    conversion_score = min(40.0, conversion_rate * 100)
    
    # Lead quality score (0-25 points)
    lead_quality_score = min(25.0, avg_lead_score / 100.0 * 25.0)
    
    # Forecast accuracy score (0-20 points)
    forecast_score = min(20.0, avg_forecast_probability * 20.0)
    
    # Volume bonus (0-10 points) - reward sources with good volume
    volume_bonus = min(10.0, min(total_leads / 50.0, 1.0) * 10.0)
    
    # Trend bonus/penalty (0-5 points)
    trend_score = {
        "improving": 5.0,
        "stable": 2.5,
        "declining": 0.0
    }.get(trend, 2.5)
    
    total_score = conversion_score + lead_quality_score + forecast_score + volume_bonus + trend_score
    
    return min(100.0, max(0.0, total_score))

def determine_trend(
    recent_conversion_rate: float,
    historical_conversion_rate: float,
    threshold: float = 0.05
) -> str:
    """Determine if source performance is improving, stable, or declining"""
    if abs(recent_conversion_rate - historical_conversion_rate) < threshold:
        return "stable"
    elif recent_conversion_rate > historical_conversion_rate:
        return "improving"
    else:
        return "declining"

def calculate_roi(
    total_revenue: Optional[float],
    total_cost: Optional[float]
) -> Optional[float]:
    """Calculate ROI: (revenue - cost) / cost"""
    if total_revenue is None or total_cost is None or total_cost == 0:
        return None
    return (total_revenue - total_cost) / total_cost

# ------------------------------
# Optimization Recommendations
# ------------------------------

def generate_source_recommendations(
    sources: List[SourcePerformance]
) -> List[SourceRecommendation]:
    """Generate actionable recommendations for source optimization"""
    recommendations = []
    
    # Sort by quality score for prioritization
    sorted_sources = sorted(sources, key=lambda s: s.quality_score, reverse=True)
    
    for source in sorted_sources:
        if source.quality_score >= 80:
            # High-performing source
            if source.conversion_rate >= 0.15:  # 15%+ conversion
                recommendations.append(SourceRecommendation(
                    source=source.source,
                    action="increase_investment",
                    reason=f"Excellent performance: {source.conversion_rate:.1%} conversion rate, {source.quality_score:.0f}/100 quality score",
                    expected_impact="High potential for increased conversions and revenue",
                    priority="high",
                    suggested_budget_change=25.0  # +25% budget
                ))
            else:
                recommendations.append(SourceRecommendation(
                    source=source.source,
                    action="maintain",
                    reason=f"Good performance: {source.quality_score:.0f}/100 quality score",
                    expected_impact="Maintain current performance levels",
                    priority="medium",
                    suggested_budget_change=0.0
                ))
                
        elif source.quality_score >= 60:
            # Medium-performing source
            if source.conversion_rate < 0.08:  # <8% conversion
                recommendations.append(SourceRecommendation(
                    source=source.source,
                    action="optimize",
                    reason=f"Moderate performance but low conversion rate ({source.conversion_rate:.1%})",
                    expected_impact="Potential for improvement with optimization",
                    priority="medium",
                    suggested_budget_change=-10.0  # -10% budget, reinvest in optimization
                ))
            else:
                recommendations.append(SourceRecommendation(
                    source=source.source,
                    action="maintain",
                    reason=f"Acceptable performance: {source.quality_score:.0f}/100 quality score",
                    expected_impact="Maintain current levels",
                    priority="low",
                    suggested_budget_change=0.0
                ))
                
        else:
            # Low-performing source
            if source.total_leads < 10:
                recommendations.append(SourceRecommendation(
                    source=source.source,
                    action="reduce_investment",
                    reason=f"Low quality ({source.quality_score:.0f}/100) and low volume ({source.total_leads} leads)",
                    expected_impact="Reduce waste, reallocate to better sources",
                    priority="high",
                    suggested_budget_change=-50.0  # -50% budget
                ))
            else:
                recommendations.append(SourceRecommendation(
                    source=source.source,
                    action="optimize",
                    reason=f"Low quality score ({source.quality_score:.0f}/100) but reasonable volume",
                    expected_impact="Potential for improvement with targeted optimization",
                    priority="medium",
                    suggested_budget_change=-20.0  # -20% budget, reinvest in optimization
                ))
    
    return recommendations

# ------------------------------
# Mock Data Generation (for development)
# ------------------------------

def generate_mock_source_data() -> List[SourcePerformance]:
    """Generate realistic mock data for development and testing"""
    mock_sources = [
        {
            "source": "ucas_direct",
            "total_leads": 150,
            "converted_leads": 45,
            "avg_conversion_time_days": 28.5,
            "avg_lead_score": 78.2,
            "avg_forecast_probability": 0.82,
            "total_revenue": 45000.0,
            "cost_per_acquisition": 200.0,
            "trend": "improving"
        },
        {
            "source": "school_tour",
            "total_leads": 85,
            "converted_leads": 25,
            "avg_conversion_time_days": 35.2,
            "avg_lead_score": 72.8,
            "avg_forecast_probability": 0.76,
            "total_revenue": 25000.0,
            "cost_per_acquisition": 150.0,
            "trend": "stable"
        },
        {
            "source": "referral",
            "total_leads": 65,
            "converted_leads": 28,
            "avg_conversion_time_days": 22.1,
            "avg_lead_score": 85.4,
            "avg_forecast_probability": 0.89,
            "total_revenue": 28000.0,
            "cost_per_acquisition": 50.0,
            "trend": "improving"
        },
        {
            "source": "event",
            "total_leads": 120,
            "converted_leads": 18,
            "avg_conversion_time_days": 42.8,
            "avg_lead_score": 65.3,
            "avg_forecast_probability": 0.68,
            "total_revenue": 18000.0,
            "cost_per_acquisition": 300.0,
            "trend": "declining"
        },
        {
            "source": "organic",
            "total_leads": 200,
            "converted_leads": 22,
            "avg_conversion_time_days": 55.3,
            "avg_lead_score": 58.7,
            "avg_forecast_probability": 0.61,
            "total_revenue": 22000.0,
            "cost_per_acquisition": 0.0,
            "trend": "stable"
        },
        {
            "source": "paid_social",
            "total_leads": 95,
            "converted_leads": 12,
            "avg_conversion_time_days": 48.7,
            "avg_lead_score": 52.4,
            "avg_forecast_probability": 0.54,
            "total_revenue": 12000.0,
            "cost_per_acquisition": 400.0,
            "trend": "declining"
        }
    ]
    
    sources = []
    for mock in mock_sources:
        conversion_rate = mock["converted_leads"] / mock["total_leads"]
        roi = calculate_roi(mock["total_revenue"], mock["cost_per_acquisition"] * mock["converted_leads"])
        quality_score = calculate_source_quality_score(
            conversion_rate,
            mock["avg_lead_score"],
            mock["avg_forecast_probability"],
            mock["total_leads"],
            mock["trend"]
        )
        
        sources.append(SourcePerformance(
            source=mock["source"],
            total_leads=mock["total_leads"],
            converted_leads=mock["converted_leads"],
            conversion_rate=conversion_rate,
            avg_conversion_time_days=mock["avg_conversion_time_days"],
            avg_lead_score=mock["avg_lead_score"],
            avg_forecast_probability=mock["avg_forecast_probability"],
            total_revenue=mock["total_revenue"],
            cost_per_acquisition=mock["cost_per_acquisition"],
            roi=roi,
            quality_score=quality_score,
            trend=mock["trend"],
            last_updated=dt.datetime.now(dt.timezone.utc).isoformat()
        ))
    
    return sources

# ------------------------------
# API Endpoints
# ------------------------------

@router.post("/analyze", response_model=SourceAnalyticsResponse)
async def analyze_source_quality(req: SourceAnalyticsRequest) -> SourceAnalyticsResponse:
    """Analyze source quality and generate optimization recommendations"""
    
    # TODO: Replace with real database queries
    # For now, use mock data
    sources = generate_mock_source_data()
    
    # Generate recommendations
    recommendations = generate_source_recommendations(sources)
    
    # Calculate summary statistics
    total_leads = sum(s.total_leads for s in sources)
    total_conversions = sum(s.converted_leads for s in sources)
    overall_conversion_rate = total_conversions / total_leads if total_leads > 0 else 0
    avg_quality_score = sum(s.quality_score for s in sources) / len(sources) if sources else 0
    
    # Find best and worst performing sources
    best_source = max(sources, key=lambda s: s.quality_score) if sources else None
    worst_source = min(sources, key=lambda s: s.quality_score) if sources else None
    
    summary = {
        "total_leads": total_leads,
        "total_conversions": total_conversions,
        "overall_conversion_rate": round(overall_conversion_rate, 3),
        "average_quality_score": round(avg_quality_score, 1),
        "best_performing_source": best_source.source if best_source else None,
        "worst_performing_source": worst_source.source if worst_source else None,
        "sources_analyzed": len(sources),
        "high_priority_recommendations": len([r for r in recommendations if r.priority == "high"])
    }
    
    return SourceAnalyticsResponse(
        sources=sources,
        recommendations=recommendations,
        summary=summary,
        generated_at=dt.datetime.now(dt.timezone.utc).isoformat()
    )

@router.get("/sources", response_model=List[SourcePerformance])
async def get_source_performance() -> List[SourcePerformance]:
    """Get current source performance data"""
    return generate_mock_source_data()

@router.get("/recommendations", response_model=List[SourceRecommendation])
async def get_source_recommendations() -> List[SourceRecommendation]:
    """Get current source optimization recommendations"""
    sources = generate_mock_source_data()
    return generate_source_recommendations(sources)
