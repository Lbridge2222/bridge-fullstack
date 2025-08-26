from __future__ import annotations

import datetime as dt
import math
from typing import Dict, Any, List, Optional


def compute_seasonality_features(reference_date: Optional[str | dt.datetime] = None) -> Dict[str, float]:
    """Return basic monthly seasonality features and academic calendar helpers.
    - month_number: 1-12
    - month_sin, month_cos: cyclic encodings
    - academic_week: 1-52 index based on current date
    - is_peak_season: Sept-Nov
    - is_clearing_season: Jun-Aug
    - is_holiday_season: Dec-Jan
    """
    if reference_date is None:
        now = dt.datetime.now(dt.timezone.utc)
    elif isinstance(reference_date, str):
        # Accept ISO strings
        now = dt.datetime.fromisoformat(reference_date.replace('Z', '+00:00'))
    elif isinstance(reference_date, dt.datetime):
        now = reference_date
    else:
        now = dt.datetime.now(dt.timezone.utc)

    month = now.month
    # Academic week proxy
    iso_week = now.isocalendar().week
    academic_week = ((iso_week - 1) % 52) + 1

    month_sin = math.sin(2 * math.pi * month / 12.0)
    month_cos = math.cos(2 * math.pi * month / 12.0)

    is_peak = 1.0 if month in (9, 10, 11) else 0.0
    is_clearing = 1.0 if month in (6, 7, 8) else 0.0
    is_holiday = 1.0 if month in (12, 1) else 0.0

    return {
        "month_number": float(month),
        "month_sin": float(month_sin),
        "month_cos": float(month_cos),
        "academic_week": float(academic_week),
        "is_peak_season": float(is_peak),
        "is_clearing_season": float(is_clearing),
        "is_holiday_season": float(is_holiday),
    }


def transform_engagement(engagement: Dict[str, Any]) -> Dict[str, float]:
    """Lightweight transforms for engagement signals suitable for per-lead inference.
    Uses log1p to compress heavy tails and simple composites.
    """
    email_opens = float(engagement.get("email_opens", 0) or 0)
    email_clicks = float(engagement.get("email_clicks", 0) or 0)
    events_attended = float(engagement.get("events_attended", 0) or 0)
    portal_logins = float(engagement.get("portal_logins", 0) or 0)
    web_visits = float(engagement.get("web_visits", 0) or 0)

    def log1p(x: float) -> float:
        try:
            return math.log1p(max(0.0, x))
        except Exception:
            return 0.0

    log_open = log1p(email_opens)
    log_click = log1p(email_clicks)
    log_events = log1p(events_attended)
    log_logins = log1p(portal_logins)
    log_visits = log1p(web_visits)

    # Click rate proxy
    click_rate = 0.0
    if email_opens > 0:
        click_rate = min(1.0, max(0.0, email_clicks / email_opens))

    # Composite engagement score (normalized roughly 0-1)
    composite = min(1.0, (log_open * 0.25 + log_click * 0.3 + log_events * 0.2 + log_logins * 0.1 + log_visits * 0.15))

    return {
        "eng_log_opens": log_open,
        "eng_log_clicks": log_click,
        "eng_log_events": log_events,
        "eng_log_logins": log_logins,
        "eng_log_visits": log_visits,
        "eng_click_rate": float(click_rate),
        "eng_composite": float(composite),
    }


def email_quality(email: Optional[str]) -> float:
    if not email or "@" not in email:
        return 0.0
    domain = email.split("@")[-1].lower()
    score = 0.5
    if domain in {"gmail.com", "yahoo.com", "outlook.com"}:
        score += 0.2
    if domain in {"temp.com", "test.com", "example.com", "mailinator.com"}:
        score -= 0.4
    if "." in domain:
        score += 0.1
    local = email.split("@")[0]
    if "." in local:
        score += 0.1
    return max(0.0, min(1.0, score))


def phone_quality(phone: Optional[str]) -> float:
    if not phone:
        return 0.0
    digits = "".join([c for c in phone if c.isdigit()])
    if len(digits) == 10:
        return 1.0
    if len(digits) == 11 and digits.startswith("1"):
        return 0.95
    if len(digits) >= 7:
        return 0.8
    return 0.3


def source_quality(source: Optional[str]) -> float:
    mapping = {
        "referral": 1.0,
        "direct": 0.9,
        "organic_search": 0.8,
        "paid_social": 0.7,
        "email_campaign": 0.6,
        "unknown": 0.3,
    }
    return float(mapping.get((source or "unknown").lower(), 0.5))


def course_alignment_score(course: Optional[str]) -> float:
    if not course:
        return 0.0
    course_l = course.lower()
    for kw in ("computer", "data", "business", "engineering", "production"):
        if kw in course_l:
            return 1.0
    return 0.7


def seasonal_adjustment_factor(month_number: int) -> float:
    # Tunable heuristic monthly factors
    factors = {
        1: 0.85,
        2: 0.90,
        3: 1.05,
        4: 1.10,
        5: 1.15,
        6: 1.20,
        7: 1.25,
        8: 1.30,
        9: 1.25,
        10: 1.15,
        11: 0.95,
        12: 0.80,
    }
    return float(factors.get(int(month_number), 1.0))


def sigmoid(x: float) -> float:
    try:
        return 1.0 / (1.0 + math.exp(-x))
    except OverflowError:
        return 0.0 if x < 0 else 1.0


def disagreement_confidence_interval(probabilities: List[float], clamp: bool = True) -> Dict[str, float]:
    """Compute a simple CI from model disagreement.
    - standard_error ≈ std(probabilities)
    - 95% CI using 1.96 * std
    """
    if not probabilities:
        return {"lower": 0.0, "upper": 0.0, "standard_error": 0.0}
    mean_p = sum(probabilities) / len(probabilities)
    variance = sum((p - mean_p) ** 2 for p in probabilities) / max(1, len(probabilities) - 1)
    std = math.sqrt(max(0.0, variance))
    lower = mean_p - 1.96 * std
    upper = mean_p + 1.96 * std
    if clamp:
        lower = max(0.0, lower)
        upper = min(1.0, upper)
    return {"lower": round(lower, 3), "upper": round(upper, 3), "standard_error": round(std, 3)}
