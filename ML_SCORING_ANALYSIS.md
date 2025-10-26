# ML Scoring System Analysis - Current State

## 📊 Overview

Your system has **TWO separate ML systems** working together:

### 1. **Lead Conversion ML** (`advanced_ml_hardened.py`)
- **Purpose:** Predicts whether a LEAD (enquiry) will become an APPLICATION
- **Target Variable:** `has_application` (0/1)
- **Stored In:** `people.conversion_probability`
- **Features Used:**
  - `lead_score` (manually set or calculated)
  - `engagement_score`
  - `touchpoint_count`
  - `days_since_creation`
  - Time-based features (month, day of week, hour)
  - Interaction features (score × engagement, score × time)

### 2. **Application Progression ML** (`application_ml.py`)
- **Purpose:** Predicts whether an APPLICATION will progress through stages to ENROLLMENT
- **Target Variables:**
  - `progression_probability` (next stage)
  - `enrollment_probability` (ultimate enrollment)
- **Stored In:** `applications.progression_probability`, `applications.enrollment_probability`
- **Features Used:**
  - Current stage + days in stage
  - Interview completion
  - Offer status
  - Email engagement (opens, clicks)
  - Portal logins
  - Document activity
  - Interview notes sentiment
  - Communication keywords (UCAS, visa, CAS, deposit, scholarship, APL/RPL)
  - Lead quality from person record (`lead_score`, `engagement_score`)

---

## 🎯 Current Scoring Logic

### Lead Score (People Table)
Currently this appears to be either:
1. **Manually set** by admissions staff, OR
2. **Calculated by `advanced_ml_hardened.py`** using Random Forest/Gradient Boosting

**Features considered:**
```python
- lead_score (base)
- engagement_score (0-100)
- touchpoint_count (activities)
- days_since_creation
- created_month (seasonality)
- created_day_of_week, created_hour
- application_source (if exists)
- programme_name, campus_name
```

**Problem for HE:** ❌ **This is generic CRM logic, not HE-specific**
- No UCAS points/tariff
- No entry requirements checking
- No firm/insurance offer status
- No fee status (home/international)
- No clearing period awareness

---

### Conversion Probability (People Table)
**What it predicts:** Probability that a LEAD will submit an APPLICATION

**Calculation:**
```python
# From advanced_ml_hardened.py
# Uses sklearn Random Forest or Gradient Boosting trained on historical data
# Target: has_application (binary)
# Returns: 0.0 - 1.0 probability
```

**Base Probabilities (implicit from training data):**
- Typical conversion rate: ~30-40% (enquiry → application)
- Adjusted by:
  - Lead score (+15% if excellent, -15% if poor)
  - Engagement level (+15% if high, -20% if very low)
  - Source quality (+10% if referral/direct, -10% if low quality)
  - Time pressure (approaching deadline)

---

### Progression Probability (Applications Table)
**What it predicts:** Probability that an APPLICATION will progress to the NEXT STAGE

**From `application_ml.py` lines 481-628:**

**Base Probabilities by Stage:**
```python
base_probabilities = {
    'enquiry': 0.35,                              # 35% → pre-application
    'pre_application': 0.60,                      # 60% → application_submitted
    'application_submitted': 0.70,                # 70% → fee_status_query
    'fee_status_query': 0.80,                     # 80% → interview
    'interview_portfolio': 0.75,                  # 75% → offer
    'review_in_progress': 0.85,                   # 85% → review_complete
    'review_complete': 0.90,                      # 90% → director_review
    'director_review_in_progress': 0.85,          # 85% → complete
    'director_review_complete': 0.80,             # 80% → offer
    'conditional_offer_no_response': 0.60,        # 60% → accepted  ⚠️
    'unconditional_offer_no_response': 0.60,      # 60% → accepted  ⚠️
    'conditional_offer_accepted': 0.90,           # 90% → ready to enrol
    'unconditional_offer_accepted': 0.90,         # 90% → ready to enrol
    'ready_to_enrol': 0.95,                       # 95% → enrolled
}
```

**Adjustments Applied** (lines 500-628):
```python
# Positive adjustments (+):
+0.15  if lead_quality == 'excellent'
+0.15  if engagement_level == 'high'
+0.10  if source_quality == 'high'
+0.10  if is_responsive (engaged < 7 days ago)
+0.20  if interview completed
+0.25  if interview outcome == 'completed'
+0.15  if offer < 3 days old (fresh)
+0.08  if email_engagement_rate > 50%
+0.12  if portal_engagement == 'very_high'
+0.10  if document_activity == 'high'
+0.08  if positive interview notes
+0.05  if deposit discussed in comms
+0.03  if UCAS/APL/visa keywords present

# Negative adjustments (-):
-0.15  if lead_quality == 'poor'
-0.10  if engagement_level == 'low'
-0.20  if engagement_level == 'very_low'
-0.10  if source_quality == 'low'
-0.15  if not responsive (>7 days)
-0.20  if missing contact info
-0.25  if no interview scheduled (at application stage)
-0.30  if interview cancelled
-0.20  if offer > 14 days old (stale)
-0.12  if emails sent but no opens
-0.12  if no document activity
-0.12  if negative interview notes
-0.15  if high urgency score (usually means problems)
```

**Final Formula:**
```python
progression_probability = base_prob + sum(adjustments)
# Clamped between 0.05 and 0.95
```

---

### Enrollment Probability (Applications Table)
**What it predicts:** Probability that an APPLICATION will ultimately reach ENROLLED status (from any current stage)

**Base Probabilities by Stage** (lines 646-661):
```python
base_enrollment_probs = {
    'enquiry': 0.12,                              # 12% ultimate enrollment
    'pre_application': 0.25,                      # 25%
    'application_submitted': 0.35,                # 35%
    'fee_status_query': 0.45,                     # 45%
    'interview_portfolio': 0.60,                  # 60%
    'review_in_progress': 0.65,                   # 65%
    'review_complete': 0.70,                      # 70%
    'director_review_in_progress': 0.75,          # 75%
    'director_review_complete': 0.80,             # 80%
    'conditional_offer_no_response': 0.60,        # 60%  ⚠️
    'unconditional_offer_no_response': 0.60,      # 60%  ⚠️
    'conditional_offer_accepted': 0.90,           # 90%
    'unconditional_offer_accepted': 0.90,         # 90%
    'ready_to_enrol': 0.95,                       # 95%
}
```

**Additional Enrollment-Specific Adjustments** (lines 665-727):
```python
# Strong positive signals:
+0.40  if offer accepted  (huge boost!)
+0.15  if interview completed
+0.12  if engagement == 'high'
+0.10  if lead_quality == 'excellent/good'
+0.10  if deposit discussed
+0.08  if responsive
+0.08  if positive interview indicators
+0.05  if scholarship mentioned

# Negative signals:
-0.15  if engagement == 'very_low'
-0.12  if interview concerns
```

**Final Formula:**
```python
enrollment_prob = base_prob × (0.7 + 0.3 × progression_prob)
enrollment_prob = enrollment_prob + sum(adjustments)
# Clamped between 0.05 and 0.95
```

---

## ⚠️ Issues for Higher Education UK Context

### 1. **Offer Response Stages Are Too Pessimistic**

```python
'conditional_offer_no_response': 0.60,        # Only 60%?
'unconditional_offer_no_response': 0.60,      # Only 60%?
```

**Problem:** In UK HE, **conditional offers are the norm** for most applicants. A 60% progression rate assumes 40% will decline/ignore, which is too pessimistic.

**Reality:**
- Conditional offers (with grades) typically have **70-80% acceptance** rates for strong institutions
- Unconditional offers (no grades required) typically have **75-85% acceptance** rates
- The key differentiator is **firm vs insurance offer** (UCAS context)

**Missing Context:**
- ❌ Is this their **firm choice** (first preference)?
- ❌ Is this their **insurance choice** (backup)?
- ❌ Have they firmed elsewhere?
- ❌ Days until decision deadline (UCAS deadlines)

---

### 2. **No UCAS-Specific Logic**

**Missing Features:**
- UCAS points/tariff (predicted vs required)
- Firm/insurance offer status
- Clearing eligibility
- RPA (Results Plus Adjustment) period
- Confirmation day (A-level results day)

**Impact:** System treats all offers equally, when firm offers should have **+20-30%** higher enrollment probability than insurance offers.

---

### 3. **No Entry Requirements Checking**

Current system doesn't factor in:
- Predicted grades vs required grades
- Likelihood of meeting conditions
- Alternative entry routes (APL/RPL, mature students, portfolio-based)

**Example:** An applicant with predicted AAB applying for a BBB course should have **higher enrollment probability** than predicted BBC applying for AAB.

---

### 4. **No Fee Status Differentiation**

**Missing:** Home vs International student flag

**Impact:**
- International students have **different** deposit/visa timelines
- International students have **higher** drop-off at visa stage
- International students need **CAS** (Confirmation of Acceptance for Studies)
- Should track: deposit paid, visa application status, CAS issued

---

### 5. **No Temporal/Seasonal Context**

**Missing:**
- Current cycle stage (pre-clearing, clearing, post-clearing)
- Days until UCAS deadlines (15 Jan for most courses, earlier for Oxbridge/Medicine)
- Days until A-level results (mid-August)
- Days until enrollment deadline

**Impact:** A conditional offer in **May** (2 months before results) should be treated differently from one in **September** (post-results).

---

### 6. **Generic Lead Score Not HE-Specific**

Current `lead_score` in `people` table considers:
- Engagement (email opens, portal logins) ✅
- Touchpoints (activities) ✅
- Source quality (referral, direct, agent) ✅

**Missing for HE:**
- Academic profile (predicted grades, previous qualifications)
- Subject interest alignment
- Open day attendance (HUGE signal in HE)
- Accommodation interest/application
- Finance application status
- Guardian/parent engagement (for under-18s)

---

## 🎓 Recommended HE-Specific Enhancements

### Priority 1: Add UCAS Context Fields

**New Database Fields Needed:**
```sql
ALTER TABLE applications
ADD COLUMN ucas_offer_type VARCHAR(20), -- 'firm', 'insurance', 'unknown'
ADD COLUMN predicted_grades VARCHAR(50), -- 'AAB', 'BBC', etc.
ADD COLUMN required_grades VARCHAR(50), -- 'BBB', 'CCC', etc.
ADD COLUMN meets_entry_requirements BOOLEAN DEFAULT true,
ADD COLUMN fee_status VARCHAR(20), -- 'home', 'international', 'unknown'
ADD COLUMN deposit_paid BOOLEAN DEFAULT false,
ADD COLUMN deposit_amount DECIMAL(10,2),
ADD COLUMN deposit_paid_at TIMESTAMP,
ADD COLUMN visa_application_status VARCHAR(20), -- 'not_required', 'pending', 'approved', 'rejected'
ADD COLUMN cas_issued BOOLEAN DEFAULT false,
ADD COLUMN cas_issued_at TIMESTAMP;
```

### Priority 2: Enhance Progression Probability Logic

**For Conditional/Unconditional Offers:**
```python
# NEW logic for offers (lines 490-496)
def calculate_offer_progression_uk_he(features):
    base = 0.60  # Start conservative

    # UCAS offer type (HUGE signal)
    if features['ucas_offer_type'] == 'firm':
        base += 0.25  # Firm choice = much higher
    elif features['ucas_offer_type'] == 'insurance':
        base += 0.10  # Insurance = moderate boost

    # Entry requirements match
    if features['meets_entry_requirements']:
        base += 0.10  # Realistic grades
    elif features['predicted_exceeds_required']:
        base += 0.15  # Over-qualified (very likely)
    elif features['predicted_below_required']:
        base -= 0.20  # Under-qualified (risky)

    # Deposit paid (STRONG signal)
    if features['deposit_paid']:
        base += 0.20  # Committed financially

    # Fee status
    if features['fee_status'] == 'international':
        if features['cas_issued']:
            base += 0.10  # CAS = committed
        elif features['visa_application_status'] == 'approved':
            base += 0.15  # Visa approved = very likely
        else:
            base -= 0.05  # Visa uncertainty

    # Time pressure (UCAS deadlines)
    if features['days_until_decision_deadline'] < 7:
        base -= 0.10  # Last minute = risky
    elif features['days_until_decision_deadline'] > 60:
        base -= 0.05  # Too early, may change mind

    return min(0.95, max(0.15, base))
```

### Priority 3: Add HE-Specific Blocker Detection

**New Blockers** (`application_ml.py` lines 858-1017):
```python
# UCAS-specific blockers
if current_stage in ['conditional_offer_no_response', 'conditional_offer_accepted']:
    days_until_results = (results_day - datetime.now()).days
    if days_until_results < 30 and not features['deposit_paid']:
        blockers.append(Blocker(
            type='pre_results_commitment',
            severity='high',
            item=f'Deposit not paid with {days_until_results} days until results',
            impact='May firm elsewhere or enter clearing',
            resolution_action='Contact to secure deposit before results day',
            estimated_delay_days=7
        ))

if features['fee_status'] == 'international':
    if not features['cas_issued'] and current_stage in ['conditional_offer_accepted', 'unconditional_offer_accepted']:
        blockers.append(Blocker(
            type='visa_documentation',
            severity='critical',
            item='CAS not yet issued for international student',
            impact='Cannot apply for visa, enrollment at risk',
            resolution_action='Issue CAS immediately',
            estimated_delay_days=3
        ))

    if features['visa_application_status'] == 'pending' and features['days_until_enrollment'] < 30:
        blockers.append(Blocker(
            type='visa_timeline_risk',
            severity='high',
            item='Visa still pending with enrollment approaching',
            impact='May miss enrollment deadline',
            resolution_action='Arrange visa fast-track or defer offer',
            estimated_delay_days=14
        ))
```

### Priority 4: Add UK English Responses

**Replace all US spelling:**
```python
# applications_ai.py and applications_insights.py
"enrollment" → "enrolment"
"enrollment_probability" → "enrolment_probability"  # Keep field name for DB compatibility
"program" → "programme" (already correct in some places)
"organization" → "organisation"
"optimize" → "optimise"
"analyze" → "analyse"
```

**Update language:**
```python
# Instead of: "Follow up on offer acceptance"
"Chase conditional offer response"

# Instead of: "Schedule interview"
"Arrange interview/portfolio review"

# Instead of: "Focus outreach on high-risk applications"
"Prioritise outreach to at-risk applicants"

# Instead of: "Enrollment estimate"
"Projected enrolment numbers"
```

---

## 📋 Implementation Roadmap

### Phase 1: Fix Immediate Issues (This Session)
1. ✅ Fix `narrate()` call in `applications_insights.py` (wrong signature)
2. ✅ Add query intent detection for pipeline queries
3. ✅ Convert all responses to UK English
4. ✅ Add HE-specific prompt context (UCAS, offers, clearing)

### Phase 2: Enhance ML Scoring (Next Sprint)
1. Add UCAS context fields to database
2. Update `application_ml.py` progression logic for UK HE
3. Add firm/insurance offer detection
4. Add deposit payment tracking
5. Add fee status (home/international) logic

### Phase 3: Add Temporal Intelligence (Following Sprint)
1. Add cycle calendar (UCAS deadlines, results days, clearing dates)
2. Add time-based urgency scoring
3. Add results day preparation workflows
4. Add clearing period special handling

---

## 💡 Key Insights

### What's Working Well ✅
1. **Two-tier ML system** (lead → application, application → enrollment) is **architecturally sound**
2. **Blocker detection** is comprehensive and actionable
3. **Feature engineering** (email engagement, portal logins, document activity) is **good practice**
4. **Error handling** is robust (never crashes, always returns valid data)
5. **Grounded data** (no hallucinated numbers)

### What Needs HE-Specific Work ⚠️
1. **Offer response probabilities** too generic (need firm/insurance differentiation)
2. **No UCAS context** (biggest gap)
3. **No entry requirements logic** (predicted vs required grades)
4. **No fee status differentiation** (home vs international)
5. **No temporal/seasonal awareness** (UCAS calendar, clearing, results day)
6. **Lead score** not HE-specific (needs academic profile, open days, accommodation interest)

---

## 🎯 Summary

Your system has a **solid foundation** but is currently built for **generic admissions**, not **UK Higher Education** specifically.

**Strengths:**
- Excellent architecture (separate lead and application ML)
- Comprehensive feature engineering
- Robust error handling
- Grounded in real data

**To make it HE-ready:**
- Add UCAS context (firm/insurance, predicted grades, fee status)
- Adjust offer response probabilities upward (60% → 75-85%)
- Add HE-specific blockers (CAS, visa, deposit, results day)
- Convert to UK English
- Add temporal awareness (UCAS cycle, clearing, deadlines)

**Estimated effort:**
- Phase 1 (immediate fixes): **2-4 hours**
- Phase 2 (ML enhancements): **1-2 days**
- Phase 3 (temporal intelligence): **1-2 days**

---

**Ready to proceed with Phase 1 fixes?** I'll:
1. Fix the `narrate()` signature issue
2. Add query intent detection
3. Convert to UK English
4. Add HE-specific context to prompts
