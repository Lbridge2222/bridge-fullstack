from __future__ import annotations

import datetime as dt
from typing import List, Dict, Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

# Reuse scoring helpers from triage for consistency
from app.ai.triage import (
    days_since,
    recency_points,
    engagement_points,
    source_points,
    contactability_points,
    course_fit_points,
)


router = APIRouter(prefix="/ai/forecast", tags=["AI Forecasting"])

# ------------------------------
# Config (in-memory for now)
# ------------------------------
class ForecastConfig(BaseModel):
    bias: float = -3.0
    weights: Dict[str, float] = Field(
        default_factory=lambda: {
            "engagement_points": 0.085,
            "recency_points": 0.070,
            "source_points": 0.060,
            "contactability_points": 0.055,
            "course_fit_points": 0.050,
        }
    )
    eta_base_days: int = 45
    eta_engagement_shortening_max: int = 20
    min_probability_for_eta: float = 0.25


CONFIG = ForecastConfig()
CONFIG_VERSION = 1


class ForecastLead(BaseModel):
    id: str
    last_activity_at: Optional[str] = None  # ISO8601
    source: Optional[str] = "unknown"
    has_email: bool = False
    has_phone: bool = False
    gdpr_opt_in: bool = False
    course_declared: Optional[str] = None
    degree_level: Optional[str] = None
    target_degree_level: Optional[str] = None
    course_supply_state: Optional[str] = None
    engagement: Dict[str, int] = Field(default_factory=dict)


class ForecastRequest(BaseModel):
    leads: List[ForecastLead]
    persist: bool = False  # optionally persist to DB


class ForecastItem(BaseModel):
    leadId: str
    probability: float  # 0.0–1.0 conversion probability (next 60–90 days)
    eta_days: Optional[int]  # estimated days to conversion if likely
    confidence: float  # 0.0–1.0
    drivers: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    explanation: Dict[str, Any] = Field(default_factory=dict)
    config_version: int = CONFIG_VERSION


class ForecastResponse(BaseModel):
    items: List[ForecastItem]


def _compute_rule_features(lead: ForecastLead) -> Dict[str, float]:
    d = days_since(lead.last_activity_at)
    rec = recency_points(d)
    eng = engagement_points(lead.engagement)
    src = source_points(lead.source)
    con = contactability_points(lead.has_email, lead.has_phone, lead.gdpr_opt_in)
    cft = course_fit_points(
        lead.course_declared,
        lead.degree_level,
        lead.target_degree_level,
        lead.course_supply_state,
    )
    return {
        "days_since_last_activity": float(d or 9999),
        "recency_points": float(rec),
        "engagement_points": float(eng),
        "source_points": float(src),
        "contactability_points": float(con),
        "course_fit_points": float(cft),
    }


def _probability_from_features(f: Dict[str, float]) -> float:
    """Simple interpretable logistic mapping from features to conversion probability.

    We weigh engagement and recency highest, then contactability, source quality, and course fit.
    We keep coefficients interpretable and bounded.
    """
    # Coefficients chosen to map typical ranges into a reasonable probability
    w = CONFIG.weights
    bias = CONFIG.bias  # baseline odds ~0.047 without positive signals

    z = (
        bias
        + w["engagement_points"] * f["engagement_points"]
        + w["recency_points"] * f["recency_points"]
        + w["source_points"] * f["source_points"]
        + w["contactability_points"] * f["contactability_points"]
        + w["course_fit_points"] * f["course_fit_points"]
    )
    # logistic
    import math

    p = 1.0 / (1.0 + math.exp(-z))
    # clamp for safety
    return max(0.01, min(0.99, p))


def _eta_days_from_features(f: Dict[str, float]) -> Optional[int]:
    """Heuristic ETA: more recent and engaged → sooner.

    Invert the recency curve: recency_points = 30 * 0.5^(days/7)
    → days ≈ 7 * log2(30 / recency_points)
    """
    import math

    # Normalize engagement to 0–1
    eng_norm = min(1.0, f["engagement_points"] / 40.0)

    rec_pts = max(0.01, min(30.0, f["recency_points"]))
    # If recency points are very high (~fresh), days ~ 0
    if rec_pts >= 29.0:
        approx_days = 0
    else:
        approx_days = int(round(7.0 * math.log2(30.0 / rec_pts)))

    # Base ETA windows
    base = CONFIG.eta_base_days  # days
    # Engagement shortens ETA up to ~20 days
    eta = base - int(eng_norm * CONFIG.eta_engagement_shortening_max)
    # Very recent activity shortens further based on approx_days
    if approx_days <= 7:
        eta -= 10
    elif approx_days <= 14:
        eta -= 5

    # Boundaries
    eta = max(7, min(90, eta))
    return eta


def _drivers_and_risks(f: Dict[str, float]) -> (List[str], List[str]):
    drivers: List[str] = []
    risks: List[str] = []

    if f["engagement_points"] >= 20:
        drivers.append("Strong engagement signals")
    elif f["engagement_points"] <= 5:
        risks.append("Low or no engagement activity")

    if f["recency_points"] >= 15:
        drivers.append("Very recent activity")
    elif f["recency_points"] <= 3:
        risks.append("Stale activity recency")

    if f["contactability_points"] >= 14:
        drivers.append("Good contactability and consent")
    else:
        risks.append("Limited contactability or consent missing")

    if f["source_points"] >= 12:
        drivers.append("High-quality lead source")
    elif f["source_points"] <= 2:
        risks.append("Low-quality or unknown source")

    if f["course_fit_points"] >= 5:
        drivers.append("Good course fit and supply alignment")
    elif f["course_fit_points"] <= -1:
        risks.append("Course oversubscribed or poor fit")

    return drivers, risks


@router.post("/leads", response_model=ForecastResponse)
async def forecast_leads(req: ForecastRequest) -> ForecastResponse:
    items: List[ForecastItem] = []
    for lead in req.leads:
        f = _compute_rule_features(lead)
        p = _probability_from_features(f)
        # Confidence increases with information richness and alignment
        info_richness = sum([
            1 if lead.has_email else 0,
            1 if lead.has_phone else 0,
            1 if lead.gdpr_opt_in else 0,
            1 if bool(lead.course_declared) else 0,
        ]) / 4.0
        confidence = 0.55 + 0.35 * info_richness
        confidence = float(max(0.5, min(0.95, confidence)))

        eta = _eta_days_from_features(f) if p >= CONFIG.min_probability_for_eta else None
        drivers, risks = _drivers_and_risks(f)

        explanation = {
            "features": f,
            "weights": CONFIG.weights,
            "bias": CONFIG.bias,
            "eta_base_days": CONFIG.eta_base_days,
            "eta_engagement_shortening_max": CONFIG.eta_engagement_shortening_max,
            "min_probability_for_eta": CONFIG.min_probability_for_eta,
        }

        item = ForecastItem(
            leadId=lead.id,
            probability=round(p, 3),
            eta_days=eta,
            confidence=round(confidence, 2),
            drivers=drivers,
            risks=risks,
            explanation=explanation,
            config_version=CONFIG_VERSION,
        )
        items.append(item)

        # Optional persistence
        if req.persist:
            try:
                from app.db.db import execute
                # create table if not exists
                await execute(
                    """
                    create table if not exists forecast_predictions (
                        id bigserial primary key,
                        lead_id text not null,
                        probability double precision not null,
                        eta_days integer null,
                        confidence double precision not null,
                        features jsonb not null,
                        explanation jsonb not null,
                        created_at timestamptz default now()
                    )
                    """
                )
                await execute(
                    """
                    insert into forecast_predictions
                    (lead_id, probability, eta_days, confidence, features, explanation)
                    values ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
                    """,
                    lead.id,
                    float(item.probability),
                    int(item.eta_days) if item.eta_days is not None else None,
                    float(item.confidence),
                    __import__("json").dumps(f),
                    __import__("json").dumps(explanation),
                )
            except Exception as e:
                # non-fatal
                print(f"⚠️ forecast persistence failed for lead {lead.id}: {e}")

    return ForecastResponse(items=items)


@router.get("/config", response_model=ForecastConfig)
def get_config() -> ForecastConfig:
    return CONFIG


class UpdateConfigRequest(BaseModel):
    bias: Optional[float] = None
    weights: Optional[Dict[str, float]] = None
    eta_base_days: Optional[int] = None
    eta_engagement_shortening_max: Optional[int] = None
    min_probability_for_eta: Optional[float] = None


@router.post("/config", response_model=ForecastConfig)
def update_config(req: UpdateConfigRequest) -> ForecastConfig:
    global CONFIG, CONFIG_VERSION
    data = CONFIG.dict()
    if req.bias is not None:
        data["bias"] = req.bias
    if req.weights is not None:
        # merge
        merged = {**data.get("weights", {}), **req.weights}
        data["weights"] = merged
    if req.eta_base_days is not None:
        data["eta_base_days"] = req.eta_base_days
    if req.eta_engagement_shortening_max is not None:
        data["eta_engagement_shortening_max"] = req.eta_engagement_shortening_max
    if req.min_probability_for_eta is not None:
        data["min_probability_for_eta"] = req.min_probability_for_eta
    CONFIG = ForecastConfig(**data)
    CONFIG_VERSION += 1
    return CONFIG


