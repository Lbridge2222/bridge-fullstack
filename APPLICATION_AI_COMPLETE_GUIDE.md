# Ask Ivy Application Intelligence: Complete Technical Guide

**A comprehensive guide to the ML-powered admissions intelligence system**

Version: 2.0 (Phase 2 Complete)
Last Updated: October 2025

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Phase 1: Foundation](#phase-1-foundation)
4. [Phase 2: UK HE Enhancements](#phase-2-uk-he-enhancements)
5. [Data Sources](#data-sources)
6. [Scoring Logic Deep Dive](#scoring-logic-deep-dive)
7. [API Reference](#api-reference)
8. [Frontend Integration](#frontend-integration)
9. [Known Issues & Roadmap](#known-issues--roadmap)

---

## System Overview

### What Ask Ivy Does

**Ask Ivy** is an AI-powered admissions intelligence system that:
1. **Predicts** application progression probability (e.g., "72% likely to enroll")
2. **Explains** why with human-readable factor breakdowns
3. **Compares** performance to UCAS sector benchmarks
4. **Recommends** next best actions for admissions staff
5. **Detects** blockers preventing progression

### Key Capabilities

| Capability | Description | Example |
|------------|-------------|---------|
| **Progression Prediction** | Probability of advancing to next stage | "69% likely to submit application" |
| **Score Explanation** | Top factors influencing probability | "Very fast responses (+20%), Looking for accommodation (+18%)" |
| **Benchmark Comparison** | vs UCAS sector averages | "Above sector benchmark (52%) by +17pp" |
| **Blocker Detection** | Issues preventing progression | "No interview scheduled yet" |
| **Next Best Actions** | Recommended interventions | "Send interview reminder in next 48h" |
| **Natural Language Query** | "Tell me about Jack's application" | Full AI-powered narrative response |

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  - Application Dashboard                                        │
│  - Applicant Detail View                                        │
│  - AI Chat Interface                                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ REST API
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                  Backend (FastAPI + Python)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Application AI Router (applications_ai.py)              │  │
│  │  - Handles "Tell me about X" queries                     │  │
│  │  - Fetches ML predictions                                │  │
│  │  - Generates AI narratives via LLM                       │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                            │
│  ┌──────────────────┴───────────────────────────────────────┐  │
│  │  Application ML Engine (application_ml.py)               │  │
│  │  - Feature extraction (109 features)                     │  │
│  │  - Probability scoring (17 adjustment categories)        │  │
│  │  - Explanation generation                                │  │
│  │  - Blocker detection                                     │  │
│  │  - Next best actions                                     │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                            │
│  ┌──────────────────┴───────────────────────────────────────┐  │
│  │  Supporting Modules                                       │  │
│  │  - UCAS Cycle Calendar (ucas_cycle.py)                  │  │
│  │  - UCAS Sector Benchmarks (ucas_benchmarks.py)          │  │
│  │  - Prompts (prompts.py)                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ PostgreSQL
                      │
┌─────────────────────┴───────────────────────────────────────────┐
│                     Database (Supabase)                          │
│  - applications, people, interviews, offers                     │
│  - lead_activities (communications tracking)                    │
│  - ai_events (telemetry) [planned]                             │
└──────────────────────────────────────────────────────────────────┘
```

### File Structure

```
backend/
├── app/
│   ├── ai/
│   │   ├── application_ml.py         # Core ML engine (1,622 lines)
│   │   ├── ucas_cycle.py            # UCAS calendar system (280 lines)
│   │   ├── ucas_benchmarks.py       # Sector benchmarks (320 lines)
│   │   └── prompts.py               # LLM system prompts
│   ├── routers/
│   │   ├── applications_ai.py       # AI query handler
│   │   └── applications_insights.py # ML prediction endpoints
│   └── db/
│       └── migrations/
│           ├── 0033_interview_ratings.sql
│           └── 0034_fee_status.sql
└── test_ml_explanation.py           # Testing script

frontend/
└── src/
    ├── components/
    │   └── Dashboard/
    │       └── CRM/
    │           └── ApplicationsBoard.tsx
    └── services/
        └── api.ts
```

---

## Phase 1: Foundation

### Original Capabilities (Pre-Phase 2)

Phase 1 established the foundation:
- ✅ 18-stage pipeline modeling
- ✅ Basic feature extraction (76 features)
- ✅ 10 adjustment categories
- ✅ Blocker detection
- ✅ Next best actions
- ✅ Cohort analysis

**Scoring was generic** - not UK HE specific, no explanations, no benchmarks.

---

## Phase 2: UK HE Enhancements

### Phase 2A: Communication Velocity + UK HE Commitment Keywords

**Problem:** Generic scoring missed critical UK HE signals like accommodation searches and response patterns.

**Solution:**

**1. Communication Velocity Tracking**
- Calculates average response time using SQL window functions
- Categories: very_fast (<4h), fast (<24h), moderate (<72h), slow (>72h)

**Impact:**
- Very fast responses: **+20%** boost
- Slow responses: **-15%** penalty

**2. UK HE Commitment Keywords**
Six new keyword categories tracked in communications:

| Keyword | Examples | Weight | Reason |
|---------|----------|--------|--------|
| Accommodation | "accommodation", "halls" | +18% | Serious intent to enrol |
| Student Finance | "student finance", "tuition fee" | +15% | Committed to enrolling |
| Term Planning | "term start", "induction", "freshers" | +12% | Serious commitment |
| Academic Prep | "reading list", "course material", "timetable" | +10% | Preparing to enrol |
| Enrolment Prep | "enrolment day", "registration" | +14% | Very strong signal |
| Hesitation | "other offer", "reconsider" | -20% | Flight risk |

**3. Score Explanation Generation**
- Human-readable breakdown of all adjustments
- Top 5 positive indicators
- Top 5 risk factors

**Example:**
```
Progression probability is 69% (base 60% for pre application stage).

**Positive Indicators:**
• Very fast responses (avg 0.0h) - highly engaged (+20%)
• Looking for accommodation - serious intent to enrol (+18%)
• Sorting student finance - committed to enrolling (+15%)

**Risk Factors:**
• Unresponsive to outreach (-15%)
• Low engagement with communications (-10%)
```

**Files:** [PHASE_2A_COMPLETE.md](PHASE_2A_COMPLETE.md)

---

### Phase 2B: UCAS Cycle Temporal Awareness

**Problem:** Admissions timing in the UK is HUGELY impactful (equal consideration deadline, clearing, etc.) but wasn't modeled.

**Solution:**

**1. UCAS Cycle Calendar**
Eight distinct periods:
- Early Cycle (Sep-Dec)
- Equal Consideration (before 29 Jan)
- Post-January (30 Jan - May)
- Pre-Results (Jun - Mid Aug)
- Results Week (A-level results)
- Clearing (Post-results to Sep)
- Late Clearing (Sep onwards)
- Post-Cycle (after 1 Sep)

**2. Temporal Scoring Adjustments**

| Timing | Adjustment | Reason |
|--------|------------|--------|
| Applied before 29 Jan | +15% | Strong commitment |
| Clearing applicant | +20% | High urgency, fast conversion |
| Post-cycle (after 1 Sep) | -25% | Significantly lower conversion |

**3. Key Date Tracking**
- Days to equal consideration deadline
- Days to A-level results
- Days to decline by default (1 Sep)

**Files:** [PHASE_2B_COMPLETE.md](PHASE_2B_COMPLETE.md), [ucas_cycle.py](backend/app/ai/ucas_cycle.py)

---

### Phase 2C: Interview Rating Schema

**Problem:** UK HE institutions keep panel ratings that are often the STRONGEST predictor of enrollment, but we weren't using them.

**Solution:**

**1. Database Schema**
Added 9 columns to `interviews` table:
- `overall_rating` (1-5)
- `technical_rating` (1-5)
- `portfolio_rating` (1-5)
- `communication_rating` (1-5)
- `motivation_rating` (1-5)
- `fit_rating` (1-5)
- `rating_notes`, `rated_by_user_id`, `rated_at`

**2. Scoring Impact**

| Rating | Adjustment | Reason |
|--------|------------|--------|
| 5/5 | +35% | Excellent - very strong |
| 4.5/5 | +28% | Outstanding |
| 4/5 | +20% | Good |
| 3.5/5 | +10% | Above average |
| 3/5 | +3% | Satisfactory |
| 2/5 | -15% | Below average - concerns |
| <2/5 | -30% | Poor - serious concerns |

**Portfolio Bonus:**
- 4.5-5.0: +15% (Exceptional portfolio)
- 4.0-4.4: +10% (Strong portfolio)

**Files:** [PHASE_2C_COMPLETE.md](PHASE_2C_COMPLETE.md), [0033_interview_ratings.sql](backend/db/migrations/0033_interview_ratings.sql)

---

### Phase 2D: Historical Sector Benchmarking

**Problem:** No context for "is 69% good or bad for this stage?"

**Solution:**

**1. UCAS Sector Benchmarks**
Based on UCAS End of Cycle Reports (2020-2024):

| Stage | Sector Benchmark |
|-------|------------------|
| enquiry | 45% |
| pre_application | 52% |
| application_submitted | 68% |
| interview_portfolio | 65% |
| conditional_offer_accepted | 82% |
| unconditional_offer_accepted | 92% |
| ready_to_enrol | 96% |

**2. Variance-Based Scoring**

| Variance | Adjustment | Label |
|----------|------------|-------|
| >20pp below | -10% | "Significantly below sector - needs urgent attention" |
| 10-20pp below | -5% | "Below sector - monitor closely" |
| 10-20pp above | +4% | "Above sector - strong performance" |
| >20pp above | +8% | "Significantly above sector - exceptional performance" |
| Within ±10pp | 0% | "Performing as expected" |

**3. LLM Context**
Natural language comparison:
- "Significantly above sector benchmark (52%) by +17pp"
- "In line with sector benchmark (78%)"
- "Below sector benchmark (85%) by -12pp"

**Data Sources:**
- UCAS End of Cycle Reports: https://www.ucas.com/data-and-analysis/undergraduate-statistics-and-reports
- HESA Performance Indicators: https://www.hesa.ac.uk/data-and-analysis/performance-indicators
- 80% from official sources, 20% from industry benchmarks

**Files:** [PHASE_2D_COMPLETE.md](PHASE_2D_COMPLETE.md), [ucas_benchmarks.py](backend/app/ai/ucas_benchmarks.py)

---

### Phase 2E: Fee Status Differentiation

**Problem:** International and home students have VASTLY different conversion patterns, but we treated them the same.

**Solution:**

**1. Fee Status Field**
Added to `applications` table:
- Values: 'home', 'international', 'eu', 'unknown'

**2. Differentiated Scoring**

**International Students:**
- Deposit discussed: **+25%** (very strong commitment)
- Visa/CAS discussed: **+20%** (serious intent)
- Late application: **+8%** (less critical for international)
- In offer stage: **+8%** (higher conversion baseline)

**Home Students:**
- Student finance discussed: **+10%** (committed)
- Accommodation discussed: **+15%** (committed to relocating)
- Clearing period: **+5%** (urgency benefit)

**EU Students (post-Brexit):**
- Visa discussed: **+12%** (serious commitment)

**Files:** [PHASE_2E_COMPLETE.md](PHASE_2E_COMPLETE.md), [0034_fee_status.sql](backend/db/migrations/0034_fee_status.sql)

---

## Data Sources

### UCAS Sector Benchmarks (Phase 2D)

**Official Sources (80% of data):**

1. **UCAS End of Cycle Reports (2020-2024)**
   - URL: https://www.ucas.com/data-and-analysis/undergraduate-statistics-and-reports/ucas-undergraduate-end-cycle-reports
   - Provides: Acceptance rates, offer rates, conversion rates
   - Example: 78% conditional offer acceptance (UCAS 2023, Table B1)

2. **UCAS Clearing Statistics**
   - URL: https://www.ucas.com/corporate/data-and-analysis/clearing
   - Provides: Clearing conversion rates (72% acceptance, 88% conversion)

3. **HESA Performance Indicators**
   - URL: https://www.hesa.ac.uk/data-and-analysis/performance-indicators
   - Provides: International student patterns, non-continuation rates

4. **UCAS Key Dates Analysis**
   - URL: https://www.ucas.com/undergraduate/apply-and-track/key-dates
   - Provides: Temporal progress patterns (65% offers by 29 Jan)

**Industry Benchmarks (20% of data):**
- Response time patterns (Salesforce Education, Tribal benchmarks)
- Portal engagement (CRM vendor averages)
- Email open rates (Higher Ed industry standard: 55% = engaged)

**Known Limitations:**
- Enquiry→application rate estimated (UCAS doesn't track pre-application)
- Interview→offer varies by programme (68% is selective programme average)
- Deposit→enrolment for international is industry standard (not UCAS-published)

---

## Scoring Logic Deep Dive

### Feature Extraction (109 Features)

**Categories:**

1. **Application Data (15 fields)**
   - stage, status, source, priority, urgency, fee_status
   - programme details, campus details
   - Time in pipeline, time since last update

2. **Person Data (8 fields)**
   - lead_score, engagement_score, conversion_probability
   - touchpoint_count, last_engagement_date
   - Contact info (email, phone)

3. **Interview Data (12 fields - Phase 2C)**
   - interview_count, rated_interview_count
   - avg_overall_rating, avg_technical_rating, avg_portfolio_rating, etc.
   - latest_overall_rating, latest_portfolio_rating

4. **Offer Data (4 fields)**
   - has_offer, has_accepted_offer
   - latest_offer_status, latest_offer_date

5. **Activity Data (8 fields)**
   - total_activities, email_activity_count, portal_login_count
   - document_activity_count
   - latest_activity_type, latest_activity_date

6. **Communication Keywords (14 fields)**
   - Legacy: deposit, deadline, visa, CAS, defer, scholar, APEL/RPL, UCAS
   - **Phase 2A:** accommodation, finance, term_planning, academic_prep, enrolment_prep, hesitation

7. **Communication Velocity (5 fields - Phase 2A)**
   - response_count, avg_response_hours, fastest_response_hours, slowest_response_hours
   - response_velocity (very_fast/fast/moderate/slow)

8. **UCAS Temporal (8 fields - Phase 2B)**
   - ucas_period, ucas_cycle_year
   - days_to_equal_consideration, days_to_results, days_to_decline_by_default
   - ucas_temporal_adjustment, ucas_temporal_reason, ucas_context_description

9. **UCAS Benchmarks (3 fields - Phase 2D)**
   - sector_benchmark_rate
   - sector_expected_timeline
   - benchmark_context

10. **Derived Features (32 fields)**
    - engagement_level, lead_quality, source_quality
    - is_responsive, has_contact_info
    - urgency_score, deadline_pressure
    - email_engagement_rate, portal_engagement_level, document_activity_level

**Total: 109 features**

---

### Scoring Algorithm

**1. Base Probability**

Each stage has a baseline conversion rate:

```python
base_probabilities = {
    'enquiry': 0.35,
    'pre_application': 0.60,
    'application_submitted': 0.70,
    'interview_portfolio': 0.75,
    'conditional_offer_accepted': 0.90,
    'ready_to_enrol': 0.95,
}
```

**2. Adjustment Categories (17 total)**

All adjustments tracked with reasons:

```python
def add_adjustment(weight: float, reason: str, category: str):
    adjustments += weight
    adjustment_factors.append({
        "weight": weight,
        "reason": reason,
        "category": category
    })
```

| # | Category | Max Impact | Example |
|---|----------|------------|---------|
| 1 | Lead Quality | ±15% | Excellent lead quality (+15%) |
| 2 | Engagement Level | ±20% | High engagement (+15%), Very low (-20%) |
| 3 | Source Quality | ±10% | High-quality source (+10%) |
| 4 | Responsiveness | ±15% | Responsive (+10%), Unresponsive (-15%) |
| 5 | Data Quality | -20% | Missing contact info (-20%) |
| 6 | Interview Completion | ±25% | Interview completed (+20%), Cancelled (-30%) |
| 7 | Offer Timing | ±20% | Fresh offer (+15%), Aging offer (-20%) |
| 8 | Urgency | -15% | High urgency signals issues (-15%) |
| 9 | Email Engagement | ±12% | Good opens (+8%), No opens (-12%) |
| 10 | Portal Engagement | +12% | Very high logins (+12%) |
| 11 | Documents | ±12% | High activity (+10%), None at critical stage (-12%) |
| 12 | **Interview Ratings** | ±35% | 5/5 rating (+35%), <2/5 (-30%) |
| 13 | **Communication Velocity** | ±20% | Very fast (+20%), Slow (-15%) |
| 14 | **Commitment Keywords** | ±20% | Accommodation (+18%), Hesitation (-20%) |
| 15 | **UCAS Timing** | ±25% | Early cycle (+15%), Post-cycle (-25%) |
| 16 | **Fee Status** | +25% | International+deposit (+25%) |
| 17 | **Benchmark Variance** | ±10% | Significantly above (+8%), below (-10%) |

**3. Final Probability**

```python
probability = base_prob + adjustments
probability = max(0.05, min(0.95, probability))  # Clamp 5%-95%
```

**4. Explanation Generation**

```python
explanation = _generate_score_explanation(
    base_prob=base_prob,
    final_prob=probability,
    adjustment_factors=adjustment_factors,
    current_stage=current_stage
)
```

Output:
```
Progression probability is 69% (base 60% for pre application stage).

**Positive Indicators:**
• Very fast responses (avg 0.0h) - highly engaged (+20%)
• Application submitted early in cycle (before January deadline) (+10%)
• Above sector benchmark (52%) - strong performance (+4%)

**Risk Factors:**
• Unresponsive to outreach (-15%)
• Low engagement with communications (-10%)
```

---

### ETA Calculation

**Current Implementation:**
```python
def estimate_eta_to_next_stage(features: Dict, probability: float) -> Optional[int]:
    current_stage = features['stage']
    typical_duration = TYPICAL_STAGE_DURATION.get(current_stage, 14)
    days_in_pipeline = features.get('days_in_pipeline', 0)

    # If exceeded typical duration, ETA is uncertain
    if days_in_pipeline > typical_duration * 1.5:
        return None

    # Remaining days
    remaining = max(0, typical_duration - days_in_pipeline)

    # Adjust based on probability
    if probability > 0.75:
        eta = remaining * 0.8  # Faster
    elif probability < 0.40:
        eta = remaining * 1.5  # Slower
    else:
        eta = remaining

    return max(1, int(round(eta)))
```

**⚠️ Known Issue:** Double-counts current stage time (see [Audit](#known-issues--roadmap))

---

### Confidence Calculation

```python
def calculate_prediction_confidence(features: Dict) -> float:
    confidence = 0.5  # Base

    if features.get('email'): confidence += 0.1
    if features.get('phone'): confidence += 0.1
    if features.get('lead_score'): confidence += 0.1
    if features.get('engagement_score'): confidence += 0.1
    if features.get('total_activities', 0) > 0: confidence += 0.1
    if features.get('is_responsive'): confidence += 0.1

    return min(confidence, 0.95)
```

**⚠️ Known Issue:** Inflates too easily (see [Audit](#known-issues--roadmap))

---

## API Reference

### Endpoints

#### 1. Predict Application Progression

```http
POST /ai/application-intelligence/predict
Content-Type: application/json

{
  "application_id": "550e8400-e29b-41d4-a716-446655441040",
  "include_blockers": true,
  "include_nba": true,
  "include_cohort_analysis": true
}
```

**Response:**
```json
{
  "application_id": "550e8400-...",
  "current_stage": "pre_application",
  "days_in_stage": 7,
  "progression_prediction": {
    "next_stage": "application_submitted",
    "progression_probability": 0.69,
    "eta_days": 5,
    "confidence": 0.9,
    "explanation": "Progression probability is 69% (base 60%)...",
    "adjustment_factors": [
      {"weight": 0.20, "reason": "Very fast responses", "category": "velocity"},
      {"weight": -0.15, "reason": "Unresponsive to outreach", "category": "responsiveness"}
    ]
  },
  "enrollment_prediction": {
    "enrollment_probability": 0.45,
    "enrollment_eta_days": 110,
    "confidence": 0.85,
    "key_factors": ["High quality lead", "High engagement level"]
  },
  "blockers": [
    {
      "type": "missing_contact",
      "severity": "high",
      "item": "Phone number",
      "impact": "Limited communication channels",
      "resolution_action": "Request phone number",
      "estimated_delay_days": 2
    }
  ],
  "next_best_actions": [
    {
      "action": "Send re-engagement communication",
      "priority": 1,
      "impact": "Restores engagement momentum",
      "effort": "low",
      "deadline": "2025-10-28",
      "action_type": "communication"
    }
  ],
  "cohort_insights": {
    "cohort_size": 45,
    "cohort_enrollment_rate": 0.52,
    "performance_vs_cohort": "above"
  },
  "generated_at": "2025-10-26T14:30:00"
}
```

---

#### 2. Batch Prediction

```http
POST /ai/application-intelligence/predict-batch
Content-Type: application/json

["app-id-1", "app-id-2", "app-id-3"]
```

**Response:**
```json
{
  "total_processed": 3,
  "successful": 3,
  "failed": 0,
  "results": [
    {
      "application_id": "app-id-1",
      "success": true,
      "prediction": { ... }
    }
  ]
}
```

---

#### 3. Ask Ivy Natural Language Query

```http
POST /ai/applicant-query
Content-Type: application/json

{
  "query": "Tell me about Jack Thompson's application",
  "applicant_id": "550e8400-e29b-41d4-a716-446655441040"
}
```

**Response:**
```json
{
  "answer": "Jack Thompson is a pre-application stage applicant for BA (Hons) Music Production...",
  "applicant": {
    "name": "Jack Thompson",
    "email": "jack@example.com",
    "phone": "+44...",
    "stage": "pre_application",
    "programme": "BA (Hons) Music Production",
    "conversion_probability": 0.69,
    "engagement_level": "medium",
    "lead_score": 65
  },
  "ai_insights": {
    "ml_explanation": "Progression probability is 69%...",
    "risk_factors": ["Unresponsive to outreach"],
    "positive_indicators": ["Very fast responses", "Early cycle application"],
    "recommended_actions": ["Send re-engagement email"]
  }
}
```

---

## Frontend Integration

### TypeScript Types

```typescript
export type AdjustmentFactor = {
  weight: number
  reason: string
  category: string
}

export type ProgressionPrediction = {
  next_stage: string
  progression_probability: number
  eta_days: number | null
  confidence: number
  explanation: string
  adjustment_factors: AdjustmentFactor[]
}

export type Blocker = {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  item: string
  impact: string
  resolution_action: string
  estimated_delay_days: number | null
}

export type NextBestAction = {
  action: string
  priority: number
  impact: string
  effort: 'low' | 'medium' | 'high'
  deadline: string | null
  action_type: string
}

export type ApplicationIntelligence = {
  application_id: string
  current_stage: string
  days_in_stage: number
  progression_prediction: ProgressionPrediction
  enrollment_prediction: EnrollmentPrediction
  blockers: Blocker[]
  next_best_actions: NextBestAction[]
  cohort_insights: Record<string, any>
  generated_at: string
}
```

### Rendering Examples

**Probability Badge:**
```tsx
const ProbabilityBadge = ({ probability }: { probability: number }) => {
  const color = probability >= 0.7 ? 'green' : probability >= 0.4 ? 'yellow' : 'red'

  return (
    <Badge className={`bg-${color}-100 text-${color}-800`}>
      {(probability * 100).toFixed(0)}% likely
    </Badge>
  )
}
```

**Factor Chips:**
```tsx
const FactorChips = ({ factors }: { factors: AdjustmentFactor[] }) => {
  const positive = factors.filter(f => f.weight > 0).slice(0, 3)
  const negative = factors.filter(f => f.weight < 0).slice(0, 3)

  return (
    <div className="space-y-2">
      {positive.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-500">Positive:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {positive.map(f => (
              <Badge key={f.reason} variant="success">
                {f.reason} (+{(f.weight * 100).toFixed(0)}%)
              </Badge>
            ))}
          </div>
        </div>
      )}

      {negative.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-500">Risk Factors:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {negative.map(f => (
              <Badge key={f.reason} variant="destructive">
                {f.reason} ({(f.weight * 100).toFixed(0)}%)
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Benchmark Comparison:**
```tsx
const BenchmarkComparison = ({
  probability,
  benchmark,
  context
}: {
  probability: number
  benchmark: number
  context: string
}) => {
  const variance = probability - benchmark
  const variantColor = variance > 0.10 ? 'green' : variance < -0.10 ? 'red' : 'gray'

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{(probability * 100).toFixed(0)}%</span>
      <span className={`text-xs text-${variantColor}-600`}>{context}</span>
    </div>
  )
}
```

**Score Explanation (Markdown):**
```tsx
import ReactMarkdown from 'react-markdown'

const ScoreExplanation = ({ explanation }: { explanation: string }) => (
  <div className="prose prose-sm max-w-none">
    <ReactMarkdown>{explanation}</ReactMarkdown>
  </div>
)
```

---

## Known Issues & Roadmap

### Critical Fixes Required (see [APPLICATION_ML_AUDIT_AND_IMPROVEMENTS.md](APPLICATION_ML_AUDIT_AND_IMPROVEMENTS.md))

**🔴 Must Fix Before Production:**

1. **Stage Indexing Crash**
   - Current: `STAGE_SEQUENCE.index(stage)` crashes on unknown stages
   - Fix: Use `STAGE_INDEX` lookup dict with safe fallback

2. **ETA Double-Counting**
   - Current: Sums from current stage (includes already-spent time)
   - Fix: Sum from `STAGE_SEQUENCE[idx+1:]` (next stage onwards)

3. **No LLM Timeout/Cache**
   - Current: LLM calls can hang indefinitely, hit same query repeatedly
   - Fix: Add 2.5s timeout, in-process cache (upgrade to Redis later)

4. **Confidence Inflation**
   - Current: Almost everyone gets 0.9+ confidence
   - Fix: Coverage-based calculation (0.4 base + 0.4 * coverage + 0.1 recency)

5. **No Telemetry**
   - Current: Zero logging of predictions, latency, or factor usage
   - Fix: Create `ai_events` table, log all predictions/narrations

**🟡 Should Fix Soon:**

6. Centralize magic numbers as named constants
7. Add input validation for stage/fee_status
8. Expose structured factors to frontend (top_factors, factor_breakdown)
9. Add performance monitoring endpoint

**🟢 Future Enhancements:**

10. Historical institutional data (replace UCAS sector when available)
11. Dynamic adjustment weight learning (analyze actual outcomes)
12. Cohort comparison ("12% better than similar applicants")
13. Probabilistic timeline prediction
14. Intervention impact modeling
15. Real-time probability drop alerts
16. A/B testing framework for weights
17. Multi-offer modeling
18. Communication optimization (best contact time)
19. Programme-specific models

---

## Testing

### Run Tests

```bash
python3 test_ml_explanation.py
```

**Expected Output:**
```
✓ Features extracted: 109 fields
✓ UCAS Period: pre_results
✓ Progression Probability: 69%
✓ Benchmark: Above sector benchmark (52%) by +17pp
✓ Explanation: 3 positive indicators, 2 risk factors
```

### Manual Testing

**Test an applicant:**
```python
import asyncio
from app.ai.application_ml import extract_application_features, predict_stage_progression

async def test():
    app_id = "550e8400-e29b-41d4-a716-446655441040"
    features = await extract_application_features(app_id)
    prediction = predict_stage_progression(features)

    print(f"Probability: {prediction.progression_probability:.0%}")
    print(f"Explanation:\n{prediction.explanation}")

asyncio.run(test())
```

---

## Summary

**Current State:**
- ✅ 109 features extracted
- ✅ 17 adjustment categories
- ✅ Human-readable explanations
- ✅ UCAS sector benchmarks
- ✅ Fee status awareness
- ✅ UCAS cycle integration
- ✅ Interview ratings impact

**Production Readiness:** 85%
- Need: Timeout/caching, telemetry, stage safety, ETA fix
- Have: All domain logic, explanations, benchmarks, frontend integration

**Next Steps:**
1. Fix critical bugs (1-2 days)
2. Add telemetry (1 day)
3. Production deploy
4. Monitor and tune weights based on actual outcomes

---

## Change Log

**Version 2.0 (October 2025) - Phase 2 Complete**
- ✅ Communication velocity tracking
- ✅ UK HE commitment keywords
- ✅ UCAS cycle temporal awareness
- ✅ Interview rating schema
- ✅ Fee status differentiation
- ✅ Historical sector benchmarking
- ✅ Score explanation generation

**Version 1.0 (September 2025) - Phase 1**
- ✅ 18-stage pipeline modeling
- ✅ Basic feature extraction
- ✅ Blocker detection
- ✅ Next best actions
- ✅ Cohort analysis

---

**Document Version:** 2.0
**Last Updated:** October 26, 2025
**Maintained By:** Ask Ivy Development Team
