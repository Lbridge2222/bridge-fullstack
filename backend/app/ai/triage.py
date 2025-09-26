from __future__ import annotations
import math, datetime as dt
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import uuid

from fastapi import APIRouter
from pydantic import BaseModel, Field
from dateutil.parser import isoparse

# --- AI Configuration (Following Gospel Implementation) ---
from app.ai import AI_LEADS_ENABLED, ACTIVE_MODEL, GEMINI_API_KEY, OPENAI_API_KEY, GEMINI_MODEL, OPENAI_MODEL

# --- LLM (LangChain → Gemini/OpenAI) ---
# We'll import these conditionally based on ACTIVE_MODEL

# (Optional) ML for weekly optimisation
from sklearn.linear_model import LogisticRegression
import numpy as np

# ---------------------------------------------------
# Config & defaults
# ---------------------------------------------------

# AI configuration is now handled by app.ai module (following gospel implementation)
router = APIRouter(prefix="/ai/triage", tags=["AI Triage"])

DEFAULT_WEIGHTS = {
    # Suggested market-leading balance
    "engagement": 0.30,
    "recency": 0.25,
    "source_quality": 0.20,
    "contactability": 0.15,
    "course_fit": 0.10,
}

BANDS = [
    (85, "hot", "Call or schedule interview now"),
    (65, "warm", "Personalised follow-up; nudge to booking"),
    (45, "nurture", "Course info drip; periodic check-in"),
    (0,  "low", "Automated nurture only"),
]

# Example source multipliers by historic yield (tune from your data)
SOURCE_POINTS = {
    "ucas_direct": 20,
    "school_tour": 15,
    "organic": 12,
    "referral": 12,
    "event": 10,
    "paid_social": 5,
    "unknown": 0,
}

# Engagement mapping (per recent action window), tune as needed
ENGAGEMENT_POINTS = {
    "email_open": 5,
    "email_click": 10,
    "event_attended": 20,
    "portal_login": 15,
    "web_repeat_visit": 8,
}

# Course fit points (you can feed capacity/load here)
COURSE_POINTS = {
    "declared_specific_course": 8,   # specific > generic interest
    "degree_level_match": 2,         # BA for BA seeker, MA for MA seeker, etc.
    "undersupplied_course_bonus": 5, # where you want to drive demand
    "oversubscribed_course_penalty": -5,
}

# ---------------------------------------------------
# Request/Response models
# ---------------------------------------------------

class Lead(BaseModel):
    id: str
    last_activity_at: Optional[str] = None  # ISO8601
    source: Optional[str] = "unknown"
    has_email: bool = False
    has_phone: bool = False
    gdpr_opt_in: bool = False
    course_declared: Optional[str] = None
    degree_level: Optional[str] = None  # "BA" | "MA" | etc.
    target_degree_level: Optional[str] = None  # expected level from form
    course_supply_state: Optional[str] = None  # "undersupply" | "balanced" | "oversubscribed"
    # recent engagement events in the last X days (booleans or small counts)
    engagement: Dict[str, int] = Field(default_factory=dict)  # {"email_open": 2, "event_attended": 1, ...}

class TriageRequest(BaseModel):
    leads: List[Lead]
    # Optionally override weights at request time
    weights: Optional[Dict[str, float]] = None

class Blocker(BaseModel):
    type: str  # "data_completeness" | "engagement_stall" | "pipeline_blockage" | "source_quality" | "course_capacity"
    severity: str  # "low" | "medium" | "high" | "critical"
    description: str
    impact: str  # What this is preventing
    action: str  # How to resolve it
    evidence: Dict[str, Any]  # Supporting data


class TriageItem(BaseModel):
    leadId: str
    score: float
    band: str
    action: str
    confidence: float
    reasons: List[str]
    raw_factors: Dict[str, Any]
    blockers: List[Blocker] = Field(default_factory=list)  # New field for blockers

class TriageResponse(BaseModel):
    items: List[TriageItem]

# ---------------------------------------------------
# Helpers
# ---------------------------------------------------

def days_since(iso: Optional[str]) -> Optional[int]:
    if not iso:
        return None
    try:
        dt_val = isoparse(iso)
        delta = dt.datetime.now(dt.timezone.utc) - dt_val.replace(tzinfo=dt.timezone.utc)
        return max(0, int(delta.total_seconds() // 86400))
    except Exception:
        return None

def recency_points(days: Optional[int]) -> float:
    # Smooth exponential decay: 30 pts at day 0 decaying with half-life ~7 days
    if days is None:
        return 5.0  # weak fallback if unknown
    base = 30.0
    half_life = 7.0
    return base * (0.5 ** (days / half_life))

def contactability_points(has_email: bool, has_phone: bool, gdpr_opt_in: bool) -> float:
    # Channel breadth & legality matter
    points = 0.0
    if has_email: points += 6
    if has_phone: points += 6
    if gdpr_opt_in: points += 8
    return min(points, 20.0)  # cap

def source_points(source: Optional[str]) -> float:
    return float(SOURCE_POINTS.get((source or "unknown").lower(), SOURCE_POINTS["unknown"]))

def engagement_points(eng: Dict[str, int]) -> float:
    pts = 0.0
    for k, v in (eng or {}).items():
        pts += ENGAGEMENT_POINTS.get(k, 0) * min(v, 3)  # cap small counts per factor
    return min(pts, 40.0)  # cap

def course_fit_points(course_declared: Optional[str],
                      degree_level: Optional[str],
                      target_degree_level: Optional[str],
                      supply_state: Optional[str]) -> float:
    pts = 0.0
    if course_declared: pts += COURSE_POINTS["declared_specific_course"]
    if degree_level and target_degree_level and degree_level.upper() == target_degree_level.upper():
        pts += COURSE_POINTS["degree_level_match"]
    if supply_state == "undersupply":
        pts += COURSE_POINTS["undersupplied_course_bonus"]
    elif supply_state == "oversubscribed":
        pts += COURSE_POINTS["oversubscribed_course_penalty"]
    return pts

def confidence_score(lead: Lead) -> float:
    # 0.70 base + completeness bonus + source reliability bonus, cap 0.95
    conf = 0.70
    completeness = sum([
        0.05 if lead.has_email else 0.0,
        0.05 if lead.has_phone else 0.0,
        0.05 if lead.gdpr_opt_in else 0.0,
        0.05 if bool(lead.course_declared) else 0.0,
    ])
    source_bonus = 0.05 if (lead.source or "").lower() in ("ucas_direct", "school_tour", "referral") else 0.0
    return min(0.95, conf + completeness + source_bonus)

def band_for(score: float) -> Tuple[str, str]:
    for threshold, name, action in BANDS:
        if score >= threshold:
            return name, action
    return "low", "Automated nurture only"

# ---------------------------------------------------
# Blocker Detection Logic
# ---------------------------------------------------

def detect_data_completeness_blockers(lead: Lead) -> List[Blocker]:
    """Detect blockers related to missing or incomplete data"""
    blockers = []
    
    if not lead.has_email and not lead.has_phone:
        blockers.append(Blocker(
            type="data_completeness",
            severity="critical",
            description="No contact information available",
            impact="Cannot reach the lead for follow-up",
            action="Request contact details through alternative channels",
            evidence={"has_email": lead.has_email, "has_phone": lead.has_phone}
        ))
    elif not lead.has_email:
        blockers.append(Blocker(
            type="data_completeness",
            severity="high",
            description="Missing email address",
            impact="Limited communication channels available",
            action="Request email address or use phone/SMS outreach",
            evidence={"has_email": lead.has_email, "has_phone": lead.has_phone}
        ))
    
    if not lead.gdpr_opt_in:
        blockers.append(Blocker(
            type="data_completeness",
            severity="medium",
            description="GDPR consent not confirmed",
            impact="Limited marketing outreach capabilities",
            action="Obtain explicit consent for communications",
            evidence={"gdpr_opt_in": lead.gdpr_opt_in}
        ))
    
    if not lead.course_declared:
        blockers.append(Blocker(
            type="data_completeness",
            severity="medium",
            description="No specific course interest declared",
            impact="Cannot provide targeted course information",
            action="Engage to understand academic interests and goals",
            evidence={"course_declared": lead.course_declared}
        ))
    
    return blockers

def detect_engagement_stall_blockers(lead: Lead, days_since_activity: Optional[int]) -> List[Blocker]:
    """Detect blockers related to stalled engagement"""
    blockers = []
    
    if days_since_activity is not None:
        if days_since_activity > 30:
            blockers.append(Blocker(
                type="engagement_stall",
                severity="high",
                description=f"No activity for {days_since_activity} days",
                impact="Lead may have lost interest or moved to competitor",
                action="Re-engage with personalized content or special offers",
                evidence={"days_since_activity": days_since_activity}
            ))
        elif days_since_activity > 14:
            blockers.append(Blocker(
                type="engagement_stall",
                severity="medium",
                description=f"No activity for {days_since_activity} days",
                impact="Engagement momentum is declining",
                action="Send follow-up email or make phone call",
                evidence={"days_since_activity": days_since_activity}
            ))
    
    # Check engagement levels
    total_engagement = sum(lead.engagement.values()) if lead.engagement else 0
    if total_engagement == 0:
        blockers.append(Blocker(
            type="engagement_stall",
            severity="medium",
            description="No engagement activity recorded",
            impact="Cannot assess lead interest or readiness",
            action="Initiate first meaningful touchpoint",
            evidence={"total_engagement": total_engagement, "engagement": lead.engagement}
        ))
    
    return blockers

def detect_source_quality_blockers(lead: Lead) -> List[Blocker]:
    """Detect blockers related to lead source quality"""
    blockers = []
    
    low_quality_sources = ["paid_social", "unknown", "organic"]
    if lead.source and lead.source.lower() in low_quality_sources:
        blockers.append(Blocker(
            type="source_quality",
            severity="medium",
            description=f"Low-quality lead source: {lead.source}",
            impact="Higher likelihood of low conversion",
            action="Implement additional qualification steps",
            evidence={"source": lead.source, "source_points": SOURCE_POINTS.get(lead.source.lower(), 0)}
        ))
    
    return blockers

def detect_course_capacity_blockers(lead: Lead) -> List[Blocker]:
    """Detect blockers related to course capacity and supply"""
    blockers = []
    
    if lead.course_supply_state == "oversubscribed":
        blockers.append(Blocker(
            type="course_capacity",
            severity="high",
            description="Course is oversubscribed",
            impact="Limited availability may reduce conversion chances",
            action="Suggest alternative courses or waitlist options",
            evidence={"course_supply_state": lead.course_supply_state, "course": lead.course_declared}
        ))
    
    return blockers

def detect_all_blockers(lead: Lead, days_since_activity: Optional[int]) -> List[Blocker]:
    """Detect all types of blockers for a lead"""
    blockers = []
    
    blockers.extend(detect_data_completeness_blockers(lead))
    blockers.extend(detect_engagement_stall_blockers(lead, days_since_activity))
    blockers.extend(detect_source_quality_blockers(lead))
    blockers.extend(detect_course_capacity_blockers(lead))
    
    return blockers

# ---------------------------------------------------
# Phase 1.3: Alert Generation & Escalation
# ---------------------------------------------------


def get_next_actions(blockers: List[Blocker], triage_score: float) -> List[str]:
    """Generate prioritized next actions based on blockers and score"""
    actions = []

    # Sort blockers by severity (critical first)
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    sorted_blockers = sorted(blockers, key=lambda b: severity_order.get(b.severity, 4))

    for blocker in sorted_blockers:
        if blocker.severity == "critical":
            actions.append(f"🚨 IMMEDIATE: {blocker.action}")
        elif blocker.severity == "high":
            actions.append(f"⚠️ URGENT: {blocker.action}")
        elif blocker.severity == "medium":
            actions.append(f"📋 PRIORITY: {blocker.action}")
        else:
            actions.append(f"ℹ️ MONITOR: {blocker.action}")

    # Add score-based actions
    if triage_score >= 80:
        actions.append("🎯 High-value lead - prioritize resolution")
    elif triage_score >= 60:
        actions.append("📊 Good potential - resolve blockers to improve conversion")

    return actions

# ---------------------------------------------------
# Rules scoring
# ---------------------------------------------------

def compute_rules_score(lead: Lead, weights: Dict[str, float]) -> Tuple[float, Dict[str, Any]]:
    d = days_since(lead.last_activity_at)
    rec = recency_points(d)
    eng = engagement_points(lead.engagement)
    src = source_points(lead.source)
    con = contactability_points(lead.has_email, lead.has_phone, lead.gdpr_opt_in)
    cft = course_fit_points(lead.course_declared, lead.degree_level, lead.target_degree_level, lead.course_supply_state)

    # Weighted sum projected to 0–100
    # First normalise raw features to roughly 0–30 blocks before weight
    # (eng up to ~40, rec up to 30, src up to 20, contact up to 20, course up to ~15)
    raw = {
        "recency_points": round(rec, 2),
        "engagement_points": round(eng, 2),
        "source_points": round(src, 2),
        "contactability_points": round(con, 2),
        "course_fit_points": round(cft, 2),
        "days_since_last_activity": d,
        "source": lead.source,
        "supply_state": lead.course_supply_state,
    }

    score = (
        weights["engagement"]     * eng +
        weights["recency"]        * rec +
        weights["source_quality"] * src +
        weights["contactability"] * con +
        weights["course_fit"]     * cft
    )

    # Scale to 0–100 (empirical: features are bounded by caps set above)
    # Max possible approx: 40*.30 + 30*.25 + 20*.20 + 20*.15 + 15*.10 = 12 + 7.5 + 4 + 3 + 1.5 = 28
    # Scale by ~3.6 to land ~0–100
    score = max(0.0, min(100.0, score * 3.6))
    return score, raw

# ---------------------------------------------------
# LLM explanations (LangChain → Gemini)
# ---------------------------------------------------

def llm_explain(items: List[Dict[str, Any]]) -> List[str]:
    """
    items: [{'leadId': '123', 'raw_factors': {...}, 'score': 78.2, 'band': 'warm'}]
    returns: list of reason strings for each item (concise bullet sentences)
    """
    try:
        from app.ai.runtime import narrate_triage_bullets
        import asyncio
        
        outs = []
        for it in items:
            facts = {
                "score": round(it["score"],1),
                "band": it["band"],
                "drivers_hint": it["raw_factors"],
                "blockers": [b.type for b in it.get("blockers", [])]
            }
            text = asyncio.run(narrate_triage_bullets(facts))
            # normalise to 1 line string
            lines = [ln.strip("- ").strip() for ln in text.splitlines() if ln.strip().startswith("-")]
            outs.append("; ".join(lines[:2]) if lines else "Scored on engagement/recency; check blockers.")
        return outs
    except Exception:
        return ["Ranked by engagement, recency, source, contactability, course fit."] * len(items)

# ---------------------------------------------------
# API endpoint
# ---------------------------------------------------

@router.post("/leads", response_model=TriageResponse)
def triage_leads(req: TriageRequest) -> TriageResponse:
    weights = req.weights or DEFAULT_WEIGHTS
    # Normalise any missing keys
    for k in DEFAULT_WEIGHTS:
        weights.setdefault(k, DEFAULT_WEIGHTS[k])

    provisional: List[Dict[str, Any]] = []
    for lead in req.leads:
        score, raw = compute_rules_score(lead, weights)
        band, action = band_for(score)
        conf = confidence_score(lead)
        
        # Detect blockers for this lead
        days_since_activity = days_since(lead.last_activity_at)
        blockers = detect_all_blockers(lead, days_since_activity)
        
        provisional.append({
            "leadId": lead.id,
            "score": score,
            "band": band,
            "action": action,
            "confidence": conf,
            "raw_factors": raw,
            "blockers": blockers
        })

    # LLM explanations
    reasons_list = llm_explain(provisional)
    items: List[TriageItem] = []
    for it, reason in zip(provisional, reasons_list):
        items.append(TriageItem(
            leadId=it["leadId"],
            score=round(it["score"], 1),
            band=it["band"],
            action=it["action"],
            confidence=round(it["confidence"], 2),
            reasons=[reason],
            raw_factors=it["raw_factors"],
            blockers=it["blockers"]
        ))
    return TriageResponse(items=items)

# ---------------------------------------------------
# Weekly optimiser sketch (train on outcomes → weight nudges)
# ---------------------------------------------------

@dataclass
class OutcomeRow:
    engagement_points: float
    recency_points: float
    source_points: float
    contactability_points: float
    course_fit_points: float
    enrolled: int  # 1 if enrolled, else 0

def optimise_weights_weekly(rows: List[OutcomeRow]) -> Dict[str, float]:
    """
    Train a simple logistic model to estimate which factors drive enrolment.
    Convert coefficients → normalised weights (non-negative, summing to 1).
    """
    if not rows:
        return DEFAULT_WEIGHTS.copy()

    X = np.array([[r.engagement_points, r.recency_points, r.source_points, r.contactability_points, r.course_fit_points] for r in rows])
    y = np.array([r.enrolled for r in rows])
    # Keep it interpretable
    lr = LogisticRegression(max_iter=200, solver="liblinear")
    lr.fit(X, y)
    coefs = lr.coef_[0]  # shape (5,)

    # Clip negatives to zero to avoid penalising a factor outright; renormalise
    coefs = np.clip(coefs, 0, None)
    if coefs.sum() == 0:
        return DEFAULT_WEIGHTS.copy()
    weights = coefs / coefs.sum()

    new_w = {
        "engagement": float(weights[0]),
        "recency": float(weights[1]),
        "source_quality": float(weights[2]),
        "contactability": float(weights[3]),
        "course_fit": float(weights[4]),
    }
    return new_w
