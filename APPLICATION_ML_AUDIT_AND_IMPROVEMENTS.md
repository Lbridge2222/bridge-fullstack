# Application ML System: Technical Audit & Improvement Plan

## Executive Summary

Phase 2 delivered comprehensive UK HE domain expertise. Now we need production hardening:
- **Fix:** Stage indexing crashes, ETA double-counting, missing timeouts
- **Add:** Telemetry, caching, structured factor exposure
- **Improve:** Confidence calculation, constant centralization

---

## Critical Bugs to Fix

### 1. 🔴 CRITICAL: Unsafe Stage Indexing

**Problem:**
```python
stage_index = STAGE_SEQUENCE.index(current_stage)  # Crashes if stage not in list
eta_days = sum(TYPICAL_STAGE_DURATION[stage] for stage in STAGE_SEQUENCE[stage_index:])  # Double-counts current stage
```

**Impact:**
- Crashes on unknown stages
- ETA inflated by including time already spent in current stage

**Fix:**
```python
# Build lookup dict once (near constants)
STAGE_INDEX = {s: i for i, s in enumerate(STAGE_SEQUENCE)}

def safe_stage_index(stage: str) -> int:
    """Get stage index safely, returning -1 for unknown stages."""
    return STAGE_INDEX.get(stage, -1)

def estimate_eta_to_next_stage(features: Dict[str, Any], probability: float) -> Optional[int]:
    """Estimate days until next stage transition."""
    current = features.get("stage")
    idx = safe_stage_index(current)

    if idx < 0:
        return None  # Unknown stage

    # Sum from NEXT stage only (not current - that time is already spent)
    # Limit lookahead to 1-2 stages for believability
    remaining = STAGE_SEQUENCE[idx+1: idx+3]
    base_days = sum(TYPICAL_STAGE_DURATION.get(s, 7) for s in remaining)

    # Apply pace factor (capped to prevent absurd ETAs)
    typical = float(TYPICAL_STAGE_DURATION.get(current, 14))
    days_here = float(features.get("days_in_pipeline") or 0)
    pace = min(max(days_here / max(1.0, typical), 0.5), 2.0)  # Clamp 0.5x-2x

    # Reduce ETA for high probability (more likely to progress quickly)
    prob_factor = 1.0 - min(max(float(probability), 0.0), 1.0) * 0.4

    eta_days = int(max(1, round(base_days * pace * prob_factor)))
    return eta_days
```

**Status:** 🔴 Must fix before production

---

### 2. 🔴 CRITICAL: LLM Calls Have No Timeout or Cache

**Problem:**
```python
# applications_ai.py
result = await runtime_narrate(...)  # No timeout, no cache, no error handling
```

**Impact:**
- One slow LLM call freezes the entire dashboard
- Repeated queries to same applicant hit LLM every time ($$$ and slow)
- No sanitization of user input to LLM

**Fix:**
```python
import asyncio, hashlib, re, time

# Naive in-process cache (upgrade to Redis for production)
NARRATE_CACHE: dict[str, tuple[float, str]] = {}  # key -> (expiry_ts, text)

def _sanitize_llm_input(txt: str) -> str:
    """Sanitize text before sending to LLM."""
    txt = re.sub(r'https?://\S+', '[link]', txt)  # Strip URLs
    txt = re.sub(r'(?i)\b(system|assistant|user):', '', txt)  # Strip prompt injection attempts
    return txt.strip()[:800]  # Cap length

async def narrate_safe(
    enhanced_query: str,
    person_ctx: dict,
    cache_key: str,
    ttl: int = 3600
) -> str:
    """Safe LLM narration with timeout and cache."""
    now = time.time()

    # Check cache
    if cache_key in NARRATE_CACHE:
        exp, val = NARRATE_CACHE[cache_key]
        if exp > now:
            return val

    # Call LLM with timeout
    try:
        result = await asyncio.wait_for(
            runtime_narrate(
                query=_sanitize_llm_input(enhanced_query),
                person=person_ctx,
                kb_sources=None,
                ui_ctx={"audience": "agent", "view": "applications"},
                intent="applications_analysis",
            ),
            timeout=2.5  # 2.5 second timeout
        )
        text = result["text"] if isinstance(result, dict) and "text" in result else "Summary unavailable."
    except asyncio.TimeoutError:
        text = "Summary unavailable due to model timeout."
    except Exception as e:
        text = f"Summary unavailable: {str(e)}"

    # Cache result
    NARRATE_CACHE[cache_key] = (now + ttl, text)
    return text

# Usage in applications_ai.py:
cache_key = f"{app_id}:{current_stage}:{round(prob, 2)}:{hash(tuple(sorted(top_factors)))}"
answer = await narrate_safe(enhanced_query, person_ctx, cache_key)
```

**Status:** 🔴 Must fix before production

---

### 3. 🟡 MEDIUM: Confidence Inflates Too Easily

**Problem:**
```python
def calculate_prediction_confidence(features: Dict[str, Any]) -> float:
    confidence = 0.5
    if features.get('email'): confidence += 0.1
    if features.get('phone'): confidence += 0.1
    # ... keeps adding ...
    return min(confidence, 0.95)  # Almost everyone gets 0.9+
```

**Impact:** Confidence loses meaning when everyone is "90% confident"

**Fix:**
```python
def calculate_prediction_confidence(features: Dict[str, Any]) -> float:
    """
    Calculate confidence based on data coverage and recency.

    Returns value between 0.1 (low) and 0.9 (high).
    """
    required = ["email", "phone", "lead_score", "engagement_score", "total_activities"]
    have = sum(1 for k in required if features.get(k))
    coverage = have / len(required)

    # Recency bonus (recent engagement = higher confidence)
    recency_bonus = 0.1 if (features.get("days_since_engagement") or 999) <= 7 else 0.0

    # Base confidence from coverage + recency
    base = 0.4 + (0.4 * coverage) + recency_bonus

    return max(0.1, min(0.9, base))
```

**Status:** 🟡 Important for user trust

---

### 4. 🟡 MEDIUM: No Telemetry or Logging

**Problem:** Zero logging of:
- Which rules fired for each applicant
- How long predictions took
- What factors were most influential
- Cache hit rates

**Impact:** Debugging is guesswork, optimization is impossible

**Fix:**

**Create events table:**
```sql
CREATE TABLE ai_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,  -- 'ml_prediction', 'ai_narration', 'cache_hit'
    application_id UUID,
    model TEXT,  -- 'application_ml', 'runtime_narrate'
    latency_ms INT,
    payload_json JSONB,  -- {prob, top_factors, cache_hit, etc}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_events_type_created ON ai_events(event_type, created_at DESC);
CREATE INDEX idx_ai_events_application ON ai_events(application_id);
```

**Log on ML prediction:**
```python
# application_ml.py
async def predict_stage_progression(features: Dict[str, Any]) -> ProgressionPrediction:
    start = time.time()

    # ... existing prediction logic ...

    # Log prediction
    await execute(
        """
        INSERT INTO ai_events (event_type, application_id, model, latency_ms, payload_json)
        VALUES ($1, $2, $3, $4, $5)
        """,
        "ml_prediction",
        features.get("application_id"),
        "application_ml",
        int((time.time() - start) * 1000),
        json.dumps({
            "progression_probability": prediction.progression_probability,
            "top_factors": [f["reason"] for f in prediction.adjustment_factors[:3]],
            "adjustment_count": len(prediction.adjustment_factors),
            "stage": features.get("stage"),
            "fee_status": features.get("fee_status")
        })
    )

    return prediction
```

**Log on AI narration:**
```python
# applications_ai.py
await execute(
    """
    INSERT INTO ai_events (event_type, application_id, model, latency_ms, payload_json)
    VALUES ($1, $2, $3, $4, $5)
    """,
    "ai_narration",
    app_id,
    "runtime_narrate",
    latency_ms,
    json.dumps({
        "cache_hit": was_cache_hit,
        "query_length": len(query),
        "response_length": len(answer)
    })
)
```

**Status:** 🟡 Critical for production debugging

---

### 5. 🟢 NICE-TO-HAVE: Expose Structured Factors to Frontend

**Problem:** Frontend can't easily render factor chips/badges

**Fix:**

**Update ApplicationIntelligence model:**
```python
class ApplicationIntelligence(BaseModel):
    application_id: str
    current_stage: str
    days_in_stage: int
    progression_prediction: ProgressionPrediction
    enrollment_prediction: EnrollmentPrediction
    blockers: List[Blocker] = Field(default_factory=list)
    next_best_actions: List[NextBestAction] = Field(default_factory=list)
    cohort_insights: Dict[str, Any] = Field(default_factory=dict)
    generated_at: str

    # NEW: Structured factors for UI
    top_factors: List[str] = Field(default_factory=list)  # Top 3 reasons
    factor_breakdown: List[Dict[str, Any]] = Field(default_factory=list)  # Full list with weights
```

**Populate in predict_application_progression:**
```python
# Pick top 3 by absolute weight
top_factors = sorted(
    progression.adjustment_factors,
    key=lambda f: abs(f["weight"]),
    reverse=True
)[:3]

return ApplicationIntelligence(
    ...
    top_factors=[f["reason"] for f in top_factors],
    factor_breakdown=progression.adjustment_factors,
    ...
)
```

**Frontend can then render:**
```typescript
// Factor chips
{intelligence.top_factors.map(factor => (
  <Badge key={factor}>{factor}</Badge>
))}

// Detailed breakdown
{intelligence.factor_breakdown.map(f => (
  <div>
    <span>{f.reason}</span>
    <span className={f.weight > 0 ? 'text-green-600' : 'text-red-600'}>
      {f.weight > 0 ? '+' : ''}{(f.weight * 100).toFixed(0)}%
    </span>
  </div>
))}
```

**Status:** 🟢 Enhances UX significantly

---

### 6. 🟢 NICE-TO-HAVE: Centralize Magic Numbers

**Problem:** Constants scattered everywhere:
- `1.5` appears in multiple places
- `0.95` probability cap repeated
- `14` days appears with no context

**Fix:**
```python
# ============================================================================
# System Constants
# ============================================================================

# Probability bounds
PROB_MIN = 0.05  # Minimum probability (5%)
PROB_MAX = 0.95  # Maximum probability (95%)

# ETA calculation
ETA_PACE_CAP = 2.0  # Maximum pace multiplier (2x typical duration)
ETA_PACE_FLOOR = 0.5  # Minimum pace multiplier (0.5x typical duration)
ETA_STAGES_LOOKAHEAD = 2  # How many stages to project ETA

# Default durations
DEFAULT_STAGE_DURATION = 7  # Default days if stage not in map
DEFAULT_INTERVIEW_DURATION = 14  # Typical interview scheduling time

# Engagement thresholds
RECENT_ENGAGEMENT_DAYS = 7  # Activity within 7 days = "recent"
STALE_ENGAGEMENT_DAYS = 14  # No activity for 14+ days = "stale"

# Adjustment caps
MAX_POSITIVE_ADJUSTMENT = 0.40  # Cap single factor at +40%
MAX_NEGATIVE_ADJUSTMENT = -0.30  # Cap single factor at -30%

# Use throughout:
probability = max(PROB_MIN, min(PROB_MAX, probability))
pace = min(max(pace, ETA_PACE_FLOOR), ETA_PACE_CAP)
```

**Status:** 🟢 Improves maintainability

---

## Proposed Improvements

### A. Add Batch Factor Output

**Current:** Batch prediction returns probabilities but not why

**Improvement:**
```python
# Batch endpoint response
{
  "application_id": "...",
  "probability": 0.72,
  "top_factors": ["Student finance in progress", "Very fast responses"],
  "factor_breakdown": [
    {"reason": "Student finance in progress", "weight": 0.15, "category": "commitment"},
    {"reason": "Very fast responses", "weight": 0.20, "category": "velocity"},
    ...
  ]
}
```

**Benefit:** Analytics dashboard can show "top factors across cohort"

---

### B. Add Performance Monitoring Endpoint

```python
@router.get("/ai/application-intelligence/metrics")
async def get_ml_metrics():
    """Get ML system performance metrics."""

    # Last 24 hours
    rows = await fetch("""
        SELECT
            event_type,
            COUNT(*) as count,
            AVG(latency_ms) as avg_latency_ms,
            MAX(latency_ms) as max_latency_ms,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency_ms
        FROM ai_events
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY event_type
    """)

    return {
        "metrics": [dict(r) for r in rows],
        "cache_stats": {
            "size": len(NARRATE_CACHE),
            "hit_rate": calculate_cache_hit_rate()
        }
    }
```

**Benefit:** Monitor LLM costs, latency, cache effectiveness

---

### C. Add Input Validation and Sanitization

**Problem:** No validation of stage names, fee status, etc.

**Fix:**
```python
# Constants
VALID_STAGES = set(STAGE_SEQUENCE)
VALID_FEE_STATUSES = {"home", "international", "eu", "unknown"}

def validate_and_normalize_stage(stage: str) -> str:
    """Validate and normalize stage name."""
    normalized = (stage or "").lower().strip().replace(" ", "_")
    if normalized not in VALID_STAGES:
        raise HTTPException(400, f"Invalid stage: {stage}. Must be one of {VALID_STAGES}")
    return normalized

def validate_fee_status(fee_status: str) -> str:
    """Validate and normalize fee status."""
    normalized = (fee_status or "unknown").lower().strip()
    if normalized not in VALID_FEE_STATUSES:
        raise HTTPException(400, f"Invalid fee_status: {fee_status}. Must be one of {VALID_FEE_STATUSES}")
    return normalized
```

---

## Implementation Priority

### Phase 1: Production Blockers (Complete Before Launch) 🔴
1. ✅ Fix stage indexing with safe_stage_index()
2. ✅ Fix ETA calculation (don't double-count current stage)
3. ✅ Add LLM timeout and caching
4. ✅ Add basic telemetry (ai_events table)
5. ✅ Fix confidence calculation

**Effort:** 4-6 hours
**Impact:** Prevents crashes, freezes, and user confusion

---

### Phase 2: Production Hygiene (Week 1) 🟡
6. ✅ Centralize constants
7. ✅ Add input validation
8. ✅ Expose structured factors to frontend
9. ✅ Add batch factor output
10. ✅ Add error messages with context

**Effort:** 4-6 hours
**Impact:** Easier debugging, better UX, maintainable code

---

### Phase 3: Observability (Week 2) 🟢
11. ✅ Add performance monitoring endpoint
12. ✅ Add cache hit rate tracking
13. ✅ Add factor frequency analytics
14. ✅ Add stage progression funnel tracking

**Effort:** 6-8 hours
**Impact:** Data-driven optimization, cost monitoring

---

## Further Brainstorming: Next-Level Improvements

### 1. **Historical Institutional Benchmarks**
**When institutional data becomes available:**
```python
# Replace UCAS sector benchmarks with actual conversion data
INSTITUTIONAL_BENCHMARKS = {
    "BA_Music_Production": {
        "conditional_acceptance": 0.82,  # Actual rate for this programme
        "avg_interview_rating": 3.8,
        "typical_offer_to_acceptance_days": 12
    },
    # ... per-programme benchmarks
}
```

**Benefit:** More accurate predictions tailored to your institution

---

### 2. **Dynamic Adjustment Learning**
**Use actual outcomes to tune weights:**
```python
# After enrollment season, analyze what factors predicted enrollment
# Adjust weights based on correlation strength

async def tune_adjustment_weights():
    """Analyze last cycle and suggest weight adjustments."""

    enrolled = await fetch("""
        SELECT application_id, payload_json->'factor_breakdown' as factors
        FROM ai_events e
        JOIN applications a ON a.id = e.application_id
        WHERE a.stage = 'enrolled'
          AND e.event_type = 'ml_prediction'
          AND e.created_at > '2024-09-01'
    """)

    not_enrolled = await fetch("""
        SELECT application_id, payload_json->'factor_breakdown' as factors
        FROM ai_events e
        JOIN applications a ON a.id = e.application_id
        WHERE a.stage IN ('rejected', 'offer_declined', 'offer_withdrawn')
          AND e.event_type = 'ml_prediction'
          AND e.created_at > '2024-09-01'
    """)

    # Analyze which factors correlated most with enrollment
    # Return suggested weight adjustments
```

**Benefit:** Self-improving system

---

### 3. **Cohort Comparison**
**Compare applicant to similar cohort:**
```python
def get_cohort_performance(features: Dict[str, Any]) -> Dict:
    """Compare to applicants with similar profile."""

    similar = await fetch("""
        SELECT
            AVG(CASE WHEN stage = 'enrolled' THEN 1 ELSE 0 END) as cohort_enrollment_rate,
            AVG(progression_probability) as avg_probability,
            COUNT(*) as cohort_size
        FROM applications
        WHERE programme_id = $1
          AND source = $2
          AND fee_status = $3
          AND lead_score BETWEEN $4 - 10 AND $4 + 10
          AND created_at > NOW() - INTERVAL '2 years'
    """, prog_id, source, fee_status, lead_score)

    return {
        "cohort_size": similar["cohort_size"],
        "cohort_enrollment_rate": similar["cohort_enrollment_rate"],
        "your_probability": current_probability,
        "vs_cohort": current_probability - similar["avg_probability"]
    }
```

**UI:** "Jack is performing 12% better than similar applicants"

---

### 4. **Timeline Prediction Refinement**
**Not just "expected days" but probabilistic timeline:**
```python
def predict_progression_timeline(features: Dict) -> Dict:
    """Predict timeline with probability distribution."""

    return {
        "optimistic": 14,  # 10th percentile (fast)
        "typical": 21,     # 50th percentile (median)
        "pessimistic": 35, # 90th percentile (slow)
        "probability_by_date": {
            "2024-12-01": 0.25,  # 25% chance by Dec 1
            "2024-12-15": 0.60,  # 60% chance by Dec 15
            "2025-01-01": 0.90   # 90% chance by Jan 1
        }
    }
```

**UI:** Timeline chart showing probability of progression by date

---

### 5. **Intervention Recommendations**
**Suggest specific actions with predicted impact:**
```python
def suggest_interventions(features: Dict, prediction: Prediction) -> List[Intervention]:
    """Suggest interventions with impact estimates."""

    suggestions = []

    # If low engagement
    if features["engagement_level"] == "low":
        suggestions.append({
            "action": "Send personalized SMS from programme leader",
            "predicted_impact": +0.12,  # +12% probability
            "effort": "low",
            "best_time": "within 48h"
        })

    # If missing student finance
    if features["kw_finance_count"] == 0 and features["fee_status"] == "home":
        suggestions.append({
            "action": "Send student finance guidance email",
            "predicted_impact": +0.08,
            "effort": "low",
            "best_time": "immediately"
        })

    return sorted(suggestions, key=lambda s: s["predicted_impact"], reverse=True)
```

**UI:** Action cards with "Predicted +12% boost" badges

---

### 6. **Real-Time Alerts**
**Trigger alerts when probability drops:**
```python
async def check_probability_drops():
    """Alert when probability drops significantly."""

    # Compare today's probability to 7 days ago
    drops = await fetch("""
        WITH latest AS (
            SELECT application_id, (payload_json->>'progression_probability')::float as prob
            FROM ai_events
            WHERE event_type = 'ml_prediction'
              AND created_at > NOW() - INTERVAL '24 hours'
        ),
        previous AS (
            SELECT application_id, (payload_json->>'progression_probability')::float as prob
            FROM ai_events
            WHERE event_type = 'ml_prediction'
              AND created_at BETWEEN NOW() - INTERVAL '8 days' AND NOW() - INTERVAL '7 days'
        )
        SELECT l.application_id, p.prob as was, l.prob as now, (l.prob - p.prob) as drop
        FROM latest l
        JOIN previous p ON p.application_id = l.application_id
        WHERE (l.prob - p.prob) < -0.15  -- Dropped 15%+
    """)

    # Send alerts to admissions team
    for drop in drops:
        send_alert(f"⚠️ {drop['application_id']} probability dropped {drop['drop']*100:.0f}%")
```

---

### 7. **A/B Testing Framework**
**Test different adjustment weights:**
```python
# Randomly assign applicants to variant A or B
# Variant A: Current weights
# Variant B: Increased weight on accommodation keyword (+0.20 instead of +0.18)

# Track which variant predicts enrollment better
# Roll out winner to all applicants
```

---

### 8. **Multi-Offer Modeling**
**Account for competing offers:**
```python
features["has_competing_offers"] = check_ucas_track_data()
features["offer_strength_vs_competitors"] = compare_offers()

if features["has_competing_offers"]:
    add_adjustment(-0.12, "Multiple offers - higher flight risk", "competition")
```

---

### 9. **Communication Optimization**
**Suggest optimal contact time:**
```python
def suggest_contact_time(features: Dict) -> str:
    """When is best to contact this applicant?"""

    # Analyze past response times by day/hour
    best_day = analyze_response_patterns(features["person_id"])

    return f"Best contact time: {best_day} between 2-4pm (92% response rate)"
```

---

### 10. **Programme-Specific Models**
**Different models for different programme types:**
```python
# Creative programmes: Portfolio weight 0.30
# Academic programmes: Interview academic rating 0.30
# Professional programmes: Work experience 0.25

MODEL_REGISTRY = {
    "creative": CreativeProgrammeModel,
    "academic": AcademicProgrammeModel,
    "professional": ProfessionalProgrammeModel
}

model = MODEL_REGISTRY.get(programme_type, DefaultModel)
prediction = model.predict(features)
```

---

## Summary

**Immediate fixes (Phase 1):**
1. Safe stage indexing
2. Fixed ETA calculation
3. LLM timeout + caching
4. Basic telemetry
5. Improved confidence

**Short-term improvements (Phase 2):**
6. Centralized constants
7. Input validation
8. Structured factor exposure
9. Better error messages

**Future enhancements:**
10. Historical institutional data
11. Dynamic weight learning
12. Cohort comparison
13. Probabilistic timelines
14. Intervention recommendations
15. Real-time alerts
16. A/B testing
17. Multi-offer modeling
18. Communication optimization
19. Programme-specific models

**Your call:** Which fixes/improvements do you want to tackle first?
