from __future__ import annotations

from typing import Any, Dict, List, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass


@dataclass
class ScoreFactor:
    """Represents a single factor contributing to the lead score"""
    name: str
    weight: float
    contribution: float
    reason_code: str
    description: str
    evidence: List[str]


@dataclass
class ScoreBreakdown:
    """Complete breakdown of a lead's score"""
    total_score: float
    factors: List[ScoreFactor]
    next_action: str
    next_action_reason: str
    confidence: float


def calculate_score_breakdown(lead: Dict[str, Any]) -> ScoreBreakdown:
    """
    Calculate detailed score breakdown for a lead.
    Based on the existing _rule_score logic but with detailed factor analysis.
    """
    factors: List[ScoreFactor] = []
    total_score = 0.0
    
    # Factor 1: Lead Score (40% of total)
    lead_score = lead.get('lead_score', 0)
    if lead_score:
        contribution = min(lead_score, 100) * 0.4
        total_score += contribution
        
        if lead_score >= 80:
            reason_code = "LS_80_PLUS"
            description = "High lead score (80+)"
        elif lead_score >= 60:
            reason_code = "LS_60_PLUS"
            description = "Good lead score (60+)"
        elif lead_score >= 40:
            reason_code = "LS_40_PLUS"
            description = "Moderate lead score (40+)"
        else:
            reason_code = "LS_BELOW_40"
            description = "Low lead score"
        
        factors.append(ScoreFactor(
            name="lead_score",
            weight=0.4,
            contribution=contribution,
            reason_code=reason_code,
            description=description,
            evidence=[f"lead_score={lead_score}"]
        ))
    
    # Factor 2: Recency (30% of total)
    last_activity = lead.get('last_activity_at')
    if last_activity:
        # Handle timezone-aware vs naive datetime comparison
        if isinstance(last_activity, str):
            try:
                last_activity = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
            except ValueError:
                last_activity = None
        
        if last_activity and last_activity.tzinfo is None:
            last_activity = last_activity.replace(tzinfo=timezone.utc)
        
        if last_activity:
            now = datetime.now(timezone.utc)
            days_ago = (now - last_activity).days
            
            if days_ago <= 1:
                contribution = 30
                reason_code = "RECENT_24H"
                description = "Very recent activity"
            elif days_ago <= 7:
                contribution = 20
                reason_code = "RECENT_WEEK"
                description = "Recent activity (within week)"
            elif days_ago <= 30:
                contribution = 10
                reason_code = "RECENT_MONTH"
                description = "Recent activity (within month)"
            else:
                contribution = 0
                reason_code = "INACTIVE_30D"
                description = "Inactive (30+ days)"
            
            total_score += contribution
            factors.append(ScoreFactor(
                name="recency",
                weight=0.3,
                contribution=contribution,
                reason_code=reason_code,
                description=description,
                evidence=[f"days_since_activity={days_ago}"]
            ))
    else:
        # No activity data
        contribution = 5
        total_score += contribution
        factors.append(ScoreFactor(
            name="recency",
            weight=0.3,
            contribution=contribution,
            reason_code="NO_ACTIVITY_DATA",
            description="No recent activity data",
            evidence=["last_activity_at=null"]
        ))
    
    # Factor 3: Contactability (20% of total)
    email = lead.get('email')
    phone = lead.get('phone')
    if email or phone:
        contribution = 10
        reason_code = "HAS_CONTACT_INFO"
        description = "Has contact information"
        evidence = []
        if email:
            evidence.append("has_email=true")
        if phone:
            evidence.append("has_phone=true")
    else:
        contribution = 0
        reason_code = "NO_CONTACT_INFO"
        description = "No contact information"
        evidence = ["email=null", "phone=null"]
    
    total_score += contribution
    factors.append(ScoreFactor(
        name="contactability",
        weight=0.2,
        contribution=contribution,
        reason_code=reason_code,
        description=description,
        evidence=evidence
    ))
    
    # Factor 4: Course Interest (10% of total)
    course = lead.get('course') or lead.get('latest_programme_name')
    if course and course != "Unknown":
        contribution = 10
        reason_code = "SPECIFIC_COURSE"
        description = "Specific course interest"
        evidence = [f"course={course}"]
    else:
        contribution = 0
        reason_code = "NO_COURSE_INFO"
        description = "No specific course information"
        evidence = ["course=null_or_unknown"]
    
    total_score += contribution
    factors.append(ScoreFactor(
        name="course_interest",
        weight=0.1,
        contribution=contribution,
        reason_code=reason_code,
        description=description,
        evidence=evidence
    ))
    
    # Normalize to 0-100 scale
    total_score = min(100.0, max(0.0, total_score))
    
    # Determine next best action
    if total_score >= 80:
        next_action = "Schedule interview immediately"
        next_action_reason = "High score + recent activity"
    elif total_score >= 60:
        next_action = "Send personalized follow-up"
        next_action_reason = "Good score + some engagement"
    elif total_score >= 40:
        next_action = "Nurture with course information"
        next_action_reason = "Moderate score, needs nurturing"
    else:
        next_action = "Send general information"
        next_action_reason = "Low score, basic engagement needed"
    
    # Calculate confidence based on data completeness
    data_completeness = sum(1 for f in factors if f.evidence and any('null' not in e for e in f.evidence)) / len(factors)
    confidence = min(0.95, 0.7 + (data_completeness * 0.25))  # Base 0.7, max 0.95
    
    return ScoreBreakdown(
        total_score=round(total_score, 1),
        factors=factors,
        next_action=next_action,
        next_action_reason=next_action_reason,
        confidence=round(confidence, 2)
    )


def score_breakdown_to_dict(breakdown: ScoreBreakdown) -> Dict[str, Any]:
    """Convert ScoreBreakdown to dictionary format for API response"""
    return {
        "score": breakdown.total_score,
        "breakdown": [
            {
                "factor": factor.name,
                "weight": factor.weight,
                "contribution": round(factor.contribution, 1),
                "reason_code": factor.reason_code,
                "description": factor.description,
                "evidence": factor.evidence
            }
            for factor in breakdown.factors
        ],
        "next_action": {
            "label": breakdown.next_action,
            "reason": breakdown.next_action_reason
        },
        "confidence": breakdown.confidence
    }
