from __future__ import annotations

import datetime as dt
from typing import Dict, Any, List, Optional
import math

from fastapi import APIRouter
from pydantic import BaseModel, Field

from .feature_utils import (
    compute_seasonality_features,
    transform_engagement,
    email_quality,
    phone_quality,
    source_quality,
    course_alignment_score,
    seasonal_adjustment_factor,
    sigmoid,
    disagreement_confidence_interval,
)

router = APIRouter(prefix="/ai/ml-models", tags=["AI ML Models"])


class MLForecastRequest(BaseModel):
    lead_id: str
    lead_features: Dict[str, Any]
    include_confidence_intervals: bool = True
    include_cohort_analysis: bool = True
    forecast_horizon_days: int = 90


class MLForecastResponse(BaseModel):
    lead_id: str
    conversion_probability: float
    confidence_interval: Dict[str, float]
    eta_days: Optional[int]
    cohort_performance: Dict[str, Any] = Field(default_factory=dict)
    feature_importance: Dict[str, float] = Field(default_factory=dict)
    model_confidence: float
    seasonal_factors: Dict[str, float] = Field(default_factory=dict)
    generated_at: str


# ------------------------------
# Internal scoring helpers
# ------------------------------

FEATURE_WEIGHTS: Dict[str, float] = {
    "email_quality": 0.22,
    "phone_quality": 0.18,
    "source_quality": 0.18,
    "eng_composite": 0.18,
    "course_alignment": 0.14,
    "seasonality": 0.10,
}


def extract_features(lead_features: Dict[str, Any]) -> Dict[str, float]:
    email = lead_features.get("email")
    phone = lead_features.get("phone")
    source = lead_features.get("source")
    engagement = lead_features.get("engagement_data", {})
    course = lead_features.get("course_declared")
    now_iso = lead_features.get("reference_date")

    seasonal = compute_seasonality_features(now_iso)
    engagement_tx = transform_engagement(engagement)

    feats: Dict[str, float] = {
        "email_quality": email_quality(email),
        "phone_quality": phone_quality(phone),
        "source_quality": source_quality(source),
        "course_alignment": course_alignment_score(course),
        "seasonality": seasonal_adjustment_factor(seasonal.get("month_number", 6)),
        **engagement_tx,
        # expose a couple of seasonal flags that may be useful downstream
        "is_peak_season": seasonal.get("is_peak_season", 0.0),
        "is_clearing_season": seasonal.get("is_clearing_season", 0.0),
    }
    return feats


def weighted_probability(feats: Dict[str, float]) -> float:
    # Normalize weighted sum to 0..1 via sigmoid around 0.5
    score = 0.0
    total_w = 0.0
    for name, w in FEATURE_WEIGHTS.items():
        val = feats.get(name, 0.0)
        score += w * val
        total_w += w
    if total_w <= 0:
        return 0.0
    norm = score / total_w  # 0..1-ish
    # center at 0.5 and scale
    z = 5.0 * (norm - 0.5)
    return sigmoid(z)


def committee_probabilities(feats: Dict[str, float]) -> List[float]:
    base = weighted_probability(feats)
    # Seasonally adjusted variant
    season = feats.get("seasonality", 1.0)
    adj = max(0.0, min(1.0, base * (0.85 + 0.3 * (season - 1.0))))
    # Engagement-lift variant
    eng = feats.get("eng_composite", 0.0)
    lift = max(0.0, min(1.0, base + 0.15 * (eng - 0.5)))
    return [base, adj, lift]


def estimate_eta_days(prob: float, feats: Dict[str, float]) -> Optional[int]:
    if prob < 0.1:
        return None
    # Base by source quality
    src_q = feats.get("source_quality", 0.5)
    base_days = 30 if src_q > 0.8 else 45 if src_q > 0.6 else 60
    # Probability adjustment
    if prob > 0.8:
        mult = 0.6
    elif prob > 0.6:
        mult = 0.8
    elif prob > 0.4:
        mult = 1.1
    else:
        mult = 1.4
    # Engagement adjustment
    eng = feats.get("eng_composite", 0.5)
    if eng > 0.8:
        mult *= 0.85
    elif eng < 0.3:
        mult *= 1.25
    days = int(base_days * mult)
    return max(7, min(180, days))


def compute_feature_importance(feats: Dict[str, float]) -> Dict[str, float]:
    out: Dict[str, float] = {}
    for k, w in FEATURE_WEIGHTS.items():
        out[k] = round(w * feats.get(k, 0.0), 3)
    # Include top engagement contributors for transparency
    for k in ("eng_log_opens", "eng_log_clicks", "eng_click_rate"):
        if k in feats:
            out[k] = round(0.05 * feats[k], 3)
    return out


@router.post("/forecast", response_model=MLForecastResponse)
async def ml_forecast(req: MLForecastRequest) -> MLForecastResponse:
    feats = extract_features(req.lead_features)

    # Committee of simple estimators for stability
    probs = committee_probabilities(feats)
    probability = sum(probs) / len(probs)

    # Confidence via disagreement
    if req.include_confidence_intervals:
        ci = disagreement_confidence_interval(probs)
        model_confidence = max(0.0, 1.0 - ci.get("standard_error", 0.0))
    else:
        ci = {"lower": probability, "upper": probability, "standard_error": 0.0}
        model_confidence = 1.0

    eta_days = estimate_eta_days(probability, feats)

    # Lightweight cohort placeholder (no DB writes)
    cohort_perf = {
        "cohort_size": 150,
        "similar_leads_conversion_rate": round(max(0.0, min(1.0, probability * 0.9)), 3),
        "performance_tier": ("high" if probability > 0.7 else "medium" if probability > 0.4 else "low"),
    }

    # Seasonal factors for UI
    now = dt.datetime.now(dt.timezone.utc)
    seasonal = compute_seasonality_features(now)
    seasonal_factors = {
        "current_month_factor": seasonal_adjustment_factor(seasonal.get("month_number", 6)),
        "next_peak_month": 9 if seasonal.get("month_number", 1) < 9 else 1,
    }

    return MLForecastResponse(
        lead_id=req.lead_id,
        conversion_probability=round(probability, 3),
        confidence_interval=ci,
        eta_days=eta_days,
        cohort_performance=cohort_perf,
        feature_importance=compute_feature_importance(feats),
        model_confidence=round(model_confidence, 3),
        seasonal_factors=seasonal_factors,
        generated_at=now.isoformat(),
    )


@router.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "healthy", "service": "ml-models"}
