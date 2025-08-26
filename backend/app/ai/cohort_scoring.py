from __future__ import annotations

import datetime as dt
from typing import Dict, Any, List, Optional, Tuple
import math
from collections import defaultdict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .feature_utils import (
    transform_engagement,
    email_quality,
    phone_quality,
    source_quality,
    course_alignment_score,
)

router = APIRouter(prefix="/ai/cohort-scoring", tags=["AI Cohort Scoring"])


class CohortScoringRequest(BaseModel):
    lead_id: str
    lead_features: Dict[str, Any]
    include_performance_comparison: bool = True
    include_optimization_strategies: bool = True


class CohortPerformance(BaseModel):
    cohort_id: str
    cohort_name: str
    size: int
    conversion_rate: float
    avg_eta_days: float
    avg_score: float
    performance_tier: str
    growth_trend: str
    key_drivers: List[str]
    risk_factors: List[str]


class CohortComparison(BaseModel):
    primary_cohort: CohortPerformance
    comparison_cohorts: List[CohortPerformance]
    performance_gaps: Dict[str, Dict[str, float]]
    improvement_opportunities: List[str]


class OptimizationStrategy(BaseModel):
    strategy_type: str
    title: str
    description: str
    expected_impact: str
    implementation_effort: str
    priority: str
    target_metrics: List[str]
    success_criteria: List[str]


class CohortScoringResponse(BaseModel):
    lead_id: str
    primary_cohort: CohortPerformance
    cohort_comparison: Optional[CohortComparison] = None
    optimization_strategies: List[OptimizationStrategy] = Field(default_factory=list)
    cohort_score: float
    performance_percentile: float
    growth_potential: float
    risk_level: str
    generated_at: str


# ------------------------------
# Cohort Definitions & Performance Data
# ------------------------------

COHORT_DATA = {
    "tech_enthusiasts": {
        "name": "Tech Enthusiasts",
        "size": 150,
        "conversion_rate": 0.78,
        "avg_eta_days": 22.5,
        "avg_score": 78.3,
        "performance_tier": "high",
        "growth_trend": "increasing",
        "key_drivers": ["Course alignment", "High engagement", "Source quality"],
        "risk_factors": ["Market saturation", "Competition intensity"]
    },
    "career_changers": {
        "name": "Career Changers",
        "size": 220,
        "conversion_rate": 0.62,
        "avg_eta_days": 38.2,
        "avg_score": 65.8,
        "performance_tier": "medium",
        "growth_trend": "stable",
        "key_drivers": ["Career goals", "Financial planning", "Support needs"],
        "risk_factors": ["Economic uncertainty", "Time constraints"]
    },
    "recent_graduates": {
        "name": "Recent Graduates",
        "size": 180,
        "conversion_rate": 0.58,
        "avg_eta_days": 45.1,
        "avg_score": 61.2,
        "performance_tier": "medium",
        "growth_trend": "decreasing",
        "key_drivers": ["Timing sensitivity", "Career exploration", "Peer influence"],
        "risk_factors": ["Market timing", "Competition from experience"]
    },
    "international_students": {
        "name": "International Students",
        "size": 95,
        "conversion_rate": 0.71,
        "avg_eta_days": 28.7,
        "avg_score": 72.1,
        "performance_tier": "high",
        "growth_trend": "increasing",
        "key_drivers": ["Global perspective", "Diversity goals", "Language skills"],
        "risk_factors": ["Visa requirements", "Cultural adjustment"]
    },
    "mature_learners": {
        "name": "Mature Learners",
        "size": 120,
        "conversion_rate": 0.68,
        "avg_eta_days": 32.4,
        "avg_score": 69.5,
        "performance_tier": "medium",
        "growth_trend": "stable",
        "key_drivers": ["Life experience", "Clear goals", "Financial stability"],
        "risk_factors": ["Time availability", "Family commitments"]
    }
}


# ------------------------------
# Cohort-specific Scoring Algorithms
# ------------------------------

def calculate_cohort_score(lead_features: Dict[str, Any], cohort_id: str) -> float:
    """Calculate lead score using cohort-specific algorithms."""
    
    # Extract base features
    email = lead_features.get("email")
    phone = lead_features.get("phone")
    source = lead_features.get("source")
    engagement = lead_features.get("engagement_data", {})
    course = lead_features.get("course_declared")
    
    # Base quality scores
    email_q = email_quality(email)
    phone_q = phone_quality(phone)
    source_q = source_quality(source)
    course_q = course_alignment_score(course)
    
    # Engagement features
    engagement_tx = transform_engagement(engagement)
    engagement_level = engagement_tx.get("eng_composite", 0.0)
    
    # Cohort-specific scoring weights
    cohort_weights = {
        "tech_enthusiasts": {
            "course_alignment": 0.35,
            "engagement_level": 0.30,
            "source_quality": 0.20,
            "data_completeness": 0.15
        },
        "career_changers": {
            "course_alignment": 0.25,
            "engagement_level": 0.25,
            "source_quality": 0.20,
            "data_completeness": 0.30
        },
        "recent_graduates": {
            "course_alignment": 0.30,
            "engagement_level": 0.25,
            "source_quality": 0.25,
            "data_completeness": 0.20
        },
        "international_students": {
            "course_alignment": 0.30,
            "engagement_level": 0.20,
            "source_quality": 0.25,
            "data_completeness": 0.25
        },
        "mature_learners": {
            "course_alignment": 0.25,
            "engagement_level": 0.20,
            "source_quality": 0.25,
            "data_completeness": 0.30
        }
    }
    
    weights = cohort_weights.get(cohort_id, cohort_weights["tech_enthusiasts"])
    
    # Calculate weighted score
    data_completeness = (email_q + phone_q + (1.0 if course else 0.0)) / 3.0
    
    score = (
        weights["course_alignment"] * course_q +
        weights["engagement_level"] * engagement_level +
        weights["source_quality"] * source_q +
        weights["data_completeness"] * data_completeness
    ) * 100  # Scale to 0-100
    
    return min(100.0, max(0.0, score))


def identify_primary_cohort(lead_features: Dict[str, Any]) -> Tuple[str, float]:
    """Identify the primary cohort for a lead based on characteristics."""
    
    # Calculate scores for all cohorts
    cohort_scores = {}
    for cohort_id in COHORT_DATA.keys():
        score = calculate_cohort_score(lead_features, cohort_id)
        cohort_scores[cohort_id] = score
    
    # Find the cohort with highest score
    primary_cohort = max(cohort_scores.items(), key=lambda x: x[1])
    
    # Calculate confidence based on score difference from second best
    sorted_scores = sorted(cohort_scores.values(), reverse=True)
    if len(sorted_scores) > 1:
        confidence = min(1.0, max(0.1, (sorted_scores[0] - sorted_scores[1]) / 20.0 + 0.7))
    else:
        confidence = 0.8
    
    return primary_cohort[0], confidence


# ------------------------------
# Performance Analysis
# ------------------------------

def analyze_performance_gaps(primary_cohort: str, comparison_cohorts: List[str]) -> Dict[str, Any]:
    """Analyze performance gaps between primary and comparison cohorts."""
    primary_data = COHORT_DATA[primary_cohort]
    gaps = {}
    
    for cohort_id in comparison_cohorts:
        if cohort_id != primary_cohort:
            cohort_data = COHORT_DATA[cohort_id]
            
            # Calculate gaps in key metrics
            conversion_gap = cohort_data["conversion_rate"] - primary_data["conversion_rate"]
            score_gap = cohort_data["avg_score"] - primary_data["avg_score"]
            eta_gap = primary_data["avg_eta_days"] - cohort_data["avg_eta_days"]
            
            gaps[cohort_id] = {
                "conversion_rate": round(conversion_gap, 3),
                "avg_score": round(score_gap, 1),
                "avg_eta_days": round(eta_gap, 1)
            }
    
    return gaps


def identify_improvement_opportunities(primary_cohort: str, gaps: Dict[str, float]) -> List[str]:
    """Identify improvement opportunities based on performance gaps."""
    opportunities = []
    
    for cohort_id, gap_data in gaps.items():
        cohort_name = COHORT_DATA[cohort_id]["name"]
        
        if gap_data["conversion_rate"] > 0:
            opportunities.append(f"Learn from {cohort_name} conversion strategies (+{gap_data['conversion_rate']*100:.1f}%)")
        
        if gap_data["avg_score"] > 0:
            opportunities.append(f"Adopt {cohort_name} scoring approaches (+{gap_data['avg_score']:.1f} points)")
        
        if gap_data["avg_eta_days"] > 0:
            opportunities.append(f"Implement {cohort_name} acceleration tactics (-{gap_data['avg_eta_days']:.1f} days)")
    
    return opportunities[:5]  # Top 5 opportunities


# ------------------------------
# Optimization Strategies
# ------------------------------

def generate_optimization_strategies(primary_cohort: str, performance_gaps: Dict[str, float]) -> List[OptimizationStrategy]:
    """Generate cohort-specific optimization strategies."""
    
    strategies = []
    cohort_data = COHORT_DATA[primary_cohort]
    
    # Base strategies for all cohorts
    base_strategies = [
        {
            "strategy_type": "engagement_optimization",
            "title": "Enhanced Engagement Campaigns",
            "description": "Develop cohort-specific engagement sequences based on behavioral patterns",
            "expected_impact": "15-25% increase in engagement rates",
            "implementation_effort": "Medium",
            "priority": "High",
            "target_metrics": ["Email open rates", "Portal logins", "Event attendance"],
            "success_criteria": ["20% engagement increase", "15% conversion lift"]
        },
        {
            "strategy_type": "content_personalization",
            "title": "Personalized Content Strategy",
            "description": "Create cohort-specific content and messaging approaches",
            "expected_impact": "20-30% improvement in content relevance",
            "implementation_effort": "Medium",
            "priority": "High",
            "target_metrics": ["Content engagement", "Lead quality scores", "Conversion rates"],
            "success_criteria": ["25% content engagement increase", "10% conversion improvement"]
        }
    ]
    
    # Add base strategies first
    for strategy in base_strategies:
        strategies.append(OptimizationStrategy(**strategy))
    
    # Add cohort-specific strategies
    if primary_cohort == "tech_enthusiasts":
        strategies.append(OptimizationStrategy(
            strategy_type="technical_showcase",
            title="Advanced Technical Demonstrations",
            description="Provide hands-on technical workshops and advanced course previews",
            expected_impact="30-40% increase in technical engagement",
            implementation_effort="High",
            priority="High",
            target_metrics=["Technical workshop attendance", "Advanced course interest", "Peer referrals"],
            success_criteria=["35% technical engagement increase", "25% peer referral growth"]
        ))
    
    elif primary_cohort == "career_changers":
        strategies.append(OptimizationStrategy(
            strategy_type="career_guidance",
            title="Comprehensive Career Transition Support",
            description="Offer career counseling, industry insights, and transition planning",
            expected_impact="25-35% improvement in career confidence",
            implementation_effort="Medium",
            priority="High",
            target_metrics=["Career counseling sessions", "Industry research engagement", "Transition planning completion"],
            success_criteria=["30% career confidence increase", "20% transition planning completion"]
        ))
    
    elif primary_cohort == "recent_graduates":
        strategies.append(OptimizationStrategy(
            strategy_type="timing_optimization",
            title="Strategic Timing Optimization",
            description="Leverage academic calendar and market timing for maximum impact",
            expected_impact="20-30% improvement in timing-sensitive conversions",
            implementation_effort="Low",
            priority="Medium",
            target_metrics=["Seasonal conversion rates", "Market timing alignment", "Academic calendar optimization"],
            success_criteria=["25% seasonal conversion improvement", "15% market timing alignment"]
        ))
    
    return strategies[:5]  # Top 5 strategies


# ------------------------------
# Main Cohort Scoring Logic
# ------------------------------

@router.post("/analyze", response_model=CohortScoringResponse)
async def analyze_cohort_scoring(req: CohortScoringRequest) -> CohortScoringResponse:
    """Analyze cohort-based scoring and provide insights."""
    
    try:
        # Identify primary cohort
        primary_cohort_id, confidence = identify_primary_cohort(req.lead_features)
        primary_cohort_data = COHORT_DATA[primary_cohort_id]
        
        # Calculate cohort-specific score
        cohort_score = calculate_cohort_score(req.lead_features, primary_cohort_id)
        
        # Create primary cohort performance object
        primary_cohort = CohortPerformance(
            cohort_id=primary_cohort_id,
            cohort_name=primary_cohort_data["name"],
            size=primary_cohort_data["size"],
            conversion_rate=primary_cohort_data["conversion_rate"],
            avg_eta_days=primary_cohort_data["avg_eta_days"],
            avg_score=primary_cohort_data["avg_score"],
            performance_tier=primary_cohort_data["performance_tier"],
            growth_trend=primary_cohort_data["growth_trend"],
            key_drivers=primary_cohort_data["key_drivers"],
            risk_factors=primary_cohort_data["risk_factors"]
        )
    
        # Calculate performance percentile within cohort
        performance_percentile = min(100.0, max(0.0, (cohort_score / primary_cohort_data["avg_score"]) * 100))
        
        # Calculate growth potential
        growth_potential = min(1.0, max(0.0, (100 - cohort_score) / 100))
        
        # Determine risk level
        if cohort_score >= 80:
            risk_level = "low"
        elif cohort_score >= 60:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        # Generate cohort comparison if requested
        cohort_comparison = None
        if req.include_performance_comparison:
            # Select top 3 comparison cohorts
            comparison_cohorts = []
            for cohort_id in COHORT_DATA.keys():
                if cohort_id != primary_cohort_id:
                    cohort_data = COHORT_DATA[cohort_id]
                    comparison_cohorts.append(CohortPerformance(
                        cohort_id=cohort_id,
                        cohort_name=cohort_data["name"],
                        size=cohort_data["size"],
                        conversion_rate=cohort_data["conversion_rate"],
                        avg_eta_days=cohort_data["avg_eta_days"],
                        avg_score=cohort_data["avg_score"],
                        performance_tier=cohort_data["performance_tier"],
                        growth_trend=cohort_data["growth_trend"],
                        key_drivers=cohort_data["key_drivers"],
                        risk_factors=cohort_data["risk_factors"]
                    ))
            
            # Sort by conversion rate for comparison
            comparison_cohorts.sort(key=lambda x: x.conversion_rate, reverse=True)
            top_comparison_cohorts = comparison_cohorts[:3]
            
            # Analyze performance gaps
            performance_gaps = analyze_performance_gaps(primary_cohort_id, [c.cohort_id for c in top_comparison_cohorts])
            improvement_opportunities = identify_improvement_opportunities(primary_cohort_id, performance_gaps)
            
            cohort_comparison = CohortComparison(
                primary_cohort=primary_cohort,
                comparison_cohorts=top_comparison_cohorts,
                performance_gaps=performance_gaps,
                improvement_opportunities=improvement_opportunities
            )
        
        # Generate optimization strategies if requested
        optimization_strategies = []
        if req.include_optimization_strategies:
            performance_gaps = cohort_comparison.performance_gaps if cohort_comparison else {}
            optimization_strategies = generate_optimization_strategies(primary_cohort_id, performance_gaps)
        
        return CohortScoringResponse(
            lead_id=req.lead_id,
            primary_cohort=primary_cohort,
            cohort_comparison=cohort_comparison,
            optimization_strategies=optimization_strategies,
            cohort_score=round(cohort_score, 1),
            performance_percentile=round(performance_percentile, 1),
            growth_potential=round(growth_potential, 3),
            risk_level=risk_level,
            generated_at=dt.datetime.now(dt.timezone.utc).isoformat()
        )
    
    except Exception as e:
        print(f"❌ Cohort scoring error: {e}")
        raise HTTPException(status_code=500, detail=f"Cohort scoring failed: {str(e)}")


@router.get("/cohorts")
async def get_cohorts() -> Dict[str, Any]:
    """Get all available cohorts and their performance data."""
    return {
        "cohorts": COHORT_DATA,
        "total_count": len(COHORT_DATA),
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat()
    }


@router.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "healthy", "service": "cohort-scoring"}
