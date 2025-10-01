"""
Application Progression ML - Predicts how applicants will progress through stages

This module provides ML-powered predictions for:
1. Stage advancement probability (applicant → interview → offer → enrolled)
2. Time to next stage (ETA)
3. Enrollment probability from any stage
4. Intelligent blocker detection
5. Next best action recommendations

Separate from lead conversion ML (enquiry → applicant) which is in advanced_ml.py
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
import json
import math

from app.db.db import fetch, fetchrow, execute

router = APIRouter(prefix="/ai/application-intelligence", tags=["Application Intelligence"])


# ============================================================================
# Data Models
# ============================================================================

class ApplicationProgressionRequest(BaseModel):
    application_id: str
    include_blockers: bool = True
    include_nba: bool = True
    include_cohort_analysis: bool = True


class Blocker(BaseModel):
    type: str  # missing_document, engagement_decay, deadline_approaching, etc.
    severity: str  # critical, high, medium, low
    item: str
    impact: str
    resolution_action: str
    estimated_delay_days: Optional[int] = None


class NextBestAction(BaseModel):
    action: str
    priority: int
    impact: str
    effort: str  # low, medium, high
    deadline: Optional[str] = None
    action_type: str  # communication, documentation, scheduling, review


class ProgressionPrediction(BaseModel):
    next_stage: str
    progression_probability: float
    eta_days: Optional[int] = None
    confidence: float


class EnrollmentPrediction(BaseModel):
    enrollment_probability: float
    enrollment_eta_days: Optional[int] = None
    confidence: float
    key_factors: List[str] = Field(default_factory=list)


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


# ============================================================================
# Stage Configuration
# ============================================================================

STAGE_SEQUENCE = ['enquiry', 'applicant', 'interview', 'offer', 'enrolled']

STAGE_TRANSITIONS = {
    'enquiry': 'applicant',
    'applicant': 'interview',
    'interview': 'offer',
    'offer': 'enrolled',
    'enrolled': None  # Terminal state
}

# Typical stage durations in days (based on historical data)
TYPICAL_STAGE_DURATION = {
    'enquiry': 14,
    'applicant': 21,
    'interview': 7,
    'offer': 14,
    'enrolled': 0
}


# ============================================================================
# Feature Engineering
# ============================================================================

async def extract_application_features(application_id: str) -> Dict[str, Any]:
    """Extract comprehensive features for an application"""
    
    # Get application data with all related information
    query = """
        SELECT 
            a.id as application_id,
            a.stage,
            a.status,
            a.source,
            a.sub_source,
            a.priority,
            a.urgency,
            a.created_at,
            a.updated_at,
            
            -- Person data
            p.id as person_id,
            p.first_name,
            p.last_name,
            p.email,
            p.phone,
            p.lead_score,
            p.engagement_score,
            p.conversion_probability,
            p.touchpoint_count,
            p.last_engagement_date,
            
            -- Programme data
            pr.name as programme_name,
            pr.code as programme_code,
            pr.level as programme_level,
            
            -- Campus data
            c.name as campus_name,
            
            -- Cycle data
            i.cycle_label,
            i.application_deadline,
            i.decision_deadline,
            
            -- Time calculations
            EXTRACT(EPOCH FROM (NOW() - a.created_at)) / 86400.0 as days_in_pipeline,
            EXTRACT(EPOCH FROM (NOW() - a.updated_at)) / 86400.0 as days_since_last_update,
            EXTRACT(EPOCH FROM (NOW() - COALESCE(p.last_engagement_date, a.created_at))) / 86400.0 as days_since_engagement,
            
            -- Related entities checks
            EXISTS(SELECT 1 FROM interviews iv WHERE iv.application_id = a.id) as has_interview,
            EXISTS(SELECT 1 FROM interviews iv WHERE iv.application_id = a.id AND iv.outcome = 'completed') as has_completed_interview,
            EXISTS(SELECT 1 FROM offers o WHERE o.application_id = a.id) as has_offer,
            EXISTS(SELECT 1 FROM offers o WHERE o.application_id = a.id AND o.status = 'accepted') as has_accepted_offer,
            
            -- Interview data
            (SELECT COUNT(*) FROM interviews iv WHERE iv.application_id = a.id) as interview_count,
            (SELECT outcome FROM interviews iv WHERE iv.application_id = a.id ORDER BY scheduled_at DESC LIMIT 1) as latest_interview_outcome,
            (SELECT scheduled_at FROM interviews iv WHERE iv.application_id = a.id ORDER BY scheduled_at DESC LIMIT 1) as latest_interview_date,
            
            -- Offer data
            (SELECT status FROM offers o WHERE o.application_id = a.id ORDER BY created_at DESC LIMIT 1) as latest_offer_status,
            (SELECT created_at FROM offers o WHERE o.application_id = a.id ORDER BY created_at DESC LIMIT 1) as latest_offer_date,
            
            -- Activity data
            (SELECT COUNT(*) FROM lead_activities la WHERE la.person_id = p.id) as total_activities,
            (SELECT activity_type FROM lead_activities la WHERE la.person_id = p.id ORDER BY created_at DESC LIMIT 1) as latest_activity_type,
            (SELECT created_at FROM lead_activities la WHERE la.person_id = p.id ORDER BY created_at DESC LIMIT 1) as latest_activity_date,
            
            -- Email engagement (calculated from activities)
            (SELECT COUNT(*) FROM lead_activities la WHERE la.person_id = p.id AND la.activity_type IN ('email_sent', 'email_opened', 'email_clicked')) as email_activity_count,
            (SELECT COUNT(*) FROM lead_activities la WHERE la.person_id = p.id AND la.activity_type = 'email_opened') as email_open_count,
            (SELECT MAX(created_at) FROM lead_activities la WHERE la.person_id = p.id AND la.activity_type = 'email_opened') as last_email_opened_at,
            
            -- Document tracking (calculated from custom_values or metadata)
            -- You can track documents via activities or custom properties
            (SELECT COUNT(*) FROM lead_activities la WHERE la.person_id = p.id AND la.activity_type LIKE '%document%') as document_activity_count,
            
            -- Portal engagement (if tracked in activities)
            (SELECT COUNT(*) FROM lead_activities la WHERE la.person_id = p.id AND la.activity_type = 'portal_login') as portal_login_count,
            (SELECT MAX(created_at) FROM lead_activities la WHERE la.person_id = p.id AND la.activity_type = 'portal_login') as last_portal_login_at
            
        FROM applications a
        LEFT JOIN people p ON p.id = a.person_id
        LEFT JOIN programmes pr ON pr.id = a.programme_id
        LEFT JOIN campuses c ON c.id = a.campus_id
        LEFT JOIN intake_cycles i ON i.id = a.intake_cycle_id
        WHERE a.id = %s
    """
    
    row = await fetchrow(query, application_id)
    
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Convert to feature dictionary
    features = dict(row)
    
    # Calculate derived features
    features['stage_index'] = STAGE_SEQUENCE.index(row['stage']) if row['stage'] in STAGE_SEQUENCE else -1
    features['is_responsive'] = (row['days_since_engagement'] or 999) < 7
    features['has_contact_info'] = bool(row['email']) and bool(row['phone'])
    features['engagement_level'] = categorize_engagement(row['engagement_score'])
    features['lead_quality'] = categorize_lead_score(row['lead_score'])
    features['source_quality'] = categorize_source(row['source'])
    features['urgency_score'] = calculate_urgency_score(features)
    
    # NEW: Email engagement metrics (calculated without DB changes)
    features['email_engagement_rate'] = (
        row.get('email_open_count', 0) / max(row.get('email_activity_count', 1), 1)
        if row.get('email_activity_count', 0) > 0 else 0.0
    )
    features['has_recent_email_engagement'] = (
        row.get('last_email_opened_at') and 
        (datetime.now() - row['last_email_opened_at']).days < 7
    ) if row.get('last_email_opened_at') else False
    
    # NEW: Portal engagement (calculated from activities)
    features['portal_engagement_level'] = categorize_portal_engagement(row.get('portal_login_count', 0))
    features['has_recent_portal_login'] = (
        row.get('last_portal_login_at') and
        (datetime.now() - row['last_portal_login_at']).days < 14
    ) if row.get('last_portal_login_at') else False
    
    # NEW: Document activity indicator (proxy for completion)
    features['document_activity_level'] = 'high' if row.get('document_activity_count', 0) > 3 else \
                                         'medium' if row.get('document_activity_count', 0) > 1 else \
                                         'low' if row.get('document_activity_count', 0) > 0 else 'none'
    
    # Time-based features
    if row['application_deadline']:
        days_to_deadline = (row['application_deadline'] - datetime.now()).days
        features['days_to_deadline'] = max(0, days_to_deadline)
        features['deadline_pressure'] = 'high' if days_to_deadline < 7 else 'medium' if days_to_deadline < 30 else 'low'
    else:
        features['days_to_deadline'] = None
        features['deadline_pressure'] = 'none'
    
    return features


def categorize_engagement(score: Optional[int]) -> str:
    """Categorize engagement score"""
    if score is None:
        return 'unknown'
    if score >= 75:
        return 'high'
    if score >= 50:
        return 'medium'
    if score >= 25:
        return 'low'
    return 'very_low'


def categorize_lead_score(score: Optional[int]) -> str:
    """Categorize lead score"""
    if score is None:
        return 'unknown'
    if score >= 80:
        return 'excellent'
    if score >= 60:
        return 'good'
    if score >= 40:
        return 'fair'
    return 'poor'


def categorize_source(source: Optional[str]) -> str:
    """Categorize application source quality"""
    high_quality = ['referral', 'direct', 'open_day', 'agent_high_tier']
    medium_quality = ['organic', 'paid_search', 'email_campaign']
    
    if not source:
        return 'unknown'
    
    if source in high_quality:
        return 'high'
    if source in medium_quality:
        return 'medium'
    return 'low'


def categorize_portal_engagement(login_count: int) -> str:
    """Categorize portal engagement level based on login count"""
    if login_count >= 10:
        return 'very_high'
    if login_count >= 5:
        return 'high'
    if login_count >= 2:
        return 'medium'
    if login_count >= 1:
        return 'low'
    return 'none'


def calculate_urgency_score(features: Dict[str, Any]) -> float:
    """Calculate urgency score based on multiple factors"""
    score = 0.0
    
    # Deadline pressure
    if features.get('deadline_pressure') == 'high':
        score += 0.4
    elif features.get('deadline_pressure') == 'medium':
        score += 0.2
    
    # Time in stage vs typical duration
    days_in_pipeline = features.get('days_in_pipeline', 0)
    current_stage = features.get('stage', 'applicant')
    typical_duration = TYPICAL_STAGE_DURATION.get(current_stage, 14)
    
    if days_in_pipeline > typical_duration * 1.5:
        score += 0.3  # Overdue
    elif days_in_pipeline > typical_duration:
        score += 0.2  # Approaching overdue
    
    # Engagement decay
    days_since_engagement = features.get('days_since_engagement', 0)
    if days_since_engagement > 7:
        score += 0.3
    elif days_since_engagement > 3:
        score += 0.15
    
    return min(score, 1.0)


# ============================================================================
# Progression Prediction Model
# ============================================================================

def predict_stage_progression(features: Dict[str, Any]) -> ProgressionPrediction:
    """Predict probability of advancing to next stage"""
    
    current_stage = features['stage']
    next_stage = STAGE_TRANSITIONS.get(current_stage)
    
    if not next_stage:
        # Already at terminal stage (enrolled)
        return ProgressionPrediction(
            next_stage='enrolled',
            progression_probability=1.0,
            eta_days=0,
            confidence=1.0
        )
    
    # Calculate base probability based on current stage
    base_probabilities = {
        'enquiry': 0.35,      # 35% enquiries become applicants
        'applicant': 0.60,    # 60% applicants reach interview
        'interview': 0.75,    # 75% interviewed get offers
        'offer': 0.80,        # 80% offers convert to enrollment
    }
    
    base_prob = base_probabilities.get(current_stage, 0.5)
    
    # Adjustment factors
    adjustments = 0.0
    
    # 1. Lead quality adjustment
    if features['lead_quality'] == 'excellent':
        adjustments += 0.15
    elif features['lead_quality'] == 'good':
        adjustments += 0.10
    elif features['lead_quality'] == 'poor':
        adjustments -= 0.15
    
    # 2. Engagement level adjustment
    if features['engagement_level'] == 'high':
        adjustments += 0.15
    elif features['engagement_level'] == 'medium':
        adjustments += 0.05
    elif features['engagement_level'] == 'low':
        adjustments -= 0.10
    elif features['engagement_level'] == 'very_low':
        adjustments -= 0.20
    
    # 3. Source quality adjustment
    if features['source_quality'] == 'high':
        adjustments += 0.10
    elif features['source_quality'] == 'low':
        adjustments -= 0.10
    
    # 4. Responsiveness adjustment
    if features['is_responsive']:
        adjustments += 0.10
    else:
        adjustments -= 0.15
    
    # 5. Contact info adjustment
    if not features['has_contact_info']:
        adjustments -= 0.20
    
    # 6. Stage-specific adjustments
    if current_stage == 'applicant':
        if not features['has_interview']:
            adjustments -= 0.25  # No interview scheduled
        elif features['has_completed_interview']:
            adjustments += 0.20  # Interview completed
    
    elif current_stage == 'interview':
        if features['latest_interview_outcome'] == 'completed':
            adjustments += 0.25
        elif features['latest_interview_outcome'] == 'cancelled':
            adjustments -= 0.30
    
    elif current_stage == 'offer':
        if features['has_offer']:
            offer_age_days = (datetime.now() - features['latest_offer_date']).days if features['latest_offer_date'] else 999
            if offer_age_days < 3:
                adjustments += 0.15  # Fresh offer
            elif offer_age_days > 14:
                adjustments -= 0.20  # Stale offer
    
    # 7. Time pressure adjustment
    if features['urgency_score'] > 0.7:
        adjustments -= 0.15  # High urgency often means problems
    
    # 8. Email engagement adjustment (NEW - no DB changes needed)
    email_engagement_rate = features.get('email_engagement_rate', 0)
    if email_engagement_rate > 0.5:
        adjustments += 0.08  # Good email engagement
    elif email_engagement_rate == 0 and features.get('email_activity_count', 0) > 3:
        adjustments -= 0.12  # Sent emails but no opens = disengaged
    
    if features.get('has_recent_email_engagement'):
        adjustments += 0.05  # Recent email activity is positive
    
    # 9. Portal engagement adjustment (NEW - calculated from activities)
    portal_level = features.get('portal_engagement_level', 'none')
    if portal_level == 'very_high':
        adjustments += 0.12
    elif portal_level == 'high':
        adjustments += 0.08
    elif portal_level == 'medium':
        adjustments += 0.04
    
    if features.get('has_recent_portal_login'):
        adjustments += 0.06  # Recent portal activity shows active interest
    
    # 10. Document activity adjustment (NEW - proxy for completion)
    doc_level = features.get('document_activity_level', 'none')
    if doc_level == 'high':
        adjustments += 0.10  # Lots of document activity = committed
    elif doc_level == 'medium':
        adjustments += 0.05
    elif doc_level == 'none' and current_stage in ['applicant', 'interview']:
        adjustments -= 0.12  # No document activity is a blocker
    
    # Calculate final probability
    probability = base_prob + adjustments
    probability = max(0.05, min(0.95, probability))  # Clamp between 5% and 95%
    
    # Estimate ETA
    eta_days = estimate_eta_to_next_stage(features, probability)
    
    # Calculate confidence based on data completeness
    confidence = calculate_prediction_confidence(features)
    
    return ProgressionPrediction(
        next_stage=next_stage,
        progression_probability=round(probability, 3),
        eta_days=eta_days,
        confidence=round(confidence, 3)
    )


def predict_enrollment(features: Dict[str, Any], progression_prob: float) -> EnrollmentPrediction:
    """Predict ultimate enrollment probability from current stage"""
    
    current_stage = features['stage']
    
    # If already enrolled
    if current_stage == 'enrolled':
        return EnrollmentPrediction(
            enrollment_probability=1.0,
            enrollment_eta_days=0,
            confidence=1.0,
            key_factors=['Already enrolled']
        )
    
    # Base enrollment probabilities from each stage
    base_enrollment_probs = {
        'enquiry': 0.12,      # 12% of enquiries ultimately enroll
        'applicant': 0.35,    # 35% of applicants ultimately enroll
        'interview': 0.60,    # 60% of interviewed ultimately enroll
        'offer': 0.80,        # 80% of offered ultimately enroll
    }
    
    base_prob = base_enrollment_probs.get(current_stage, 0.3)
    
    # Multiply by progression probability (if strong at current stage, stronger enrollment)
    enrollment_prob = base_prob * (0.7 + 0.3 * progression_prob)
    
    # Additional enrollment-specific adjustments
    adjustments = 0.0
    key_factors = []
    
    # High quality leads enroll more
    if features['lead_quality'] in ['excellent', 'good']:
        adjustments += 0.10
        key_factors.append(f"High quality lead ({features['lead_quality']})")
    
    # High engagement predicts enrollment
    if features['engagement_level'] == 'high':
        adjustments += 0.12
        key_factors.append("High engagement level")
    elif features['engagement_level'] == 'very_low':
        adjustments -= 0.15
        key_factors.append("Low engagement risk")
    
    # Source quality matters for enrollment
    if features['source_quality'] == 'high':
        adjustments += 0.08
        key_factors.append(f"Quality source: {features['source']}")
    
    # Completed activities predict enrollment
    if features['has_completed_interview']:
        adjustments += 0.15
        key_factors.append("Interview completed successfully")
    
    if features['has_accepted_offer']:
        adjustments += 0.40  # Huge boost
        key_factors.append("Offer accepted")
    
    # Responsiveness
    if features['is_responsive']:
        adjustments += 0.08
        key_factors.append("Responsive applicant")
    
    # Apply adjustments
    enrollment_prob = enrollment_prob + adjustments
    enrollment_prob = max(0.05, min(0.95, enrollment_prob))
    
    # Estimate enrollment ETA
    stage_index = STAGE_SEQUENCE.index(current_stage)
    remaining_stages = len(STAGE_SEQUENCE) - stage_index - 1
    
    # Sum typical durations for remaining stages
    eta_days = sum(TYPICAL_STAGE_DURATION[stage] for stage in STAGE_SEQUENCE[stage_index:])
    
    # Adjust based on current pace
    days_in_pipeline = features.get('days_in_pipeline', 0)
    typical_for_stage = TYPICAL_STAGE_DURATION.get(current_stage, 14)
    
    if days_in_pipeline > typical_for_stage:
        pace_factor = days_in_pipeline / typical_for_stage
        eta_days = int(eta_days * pace_factor)
    
    confidence = calculate_prediction_confidence(features)
    
    return EnrollmentPrediction(
        enrollment_probability=round(enrollment_prob, 3),
        enrollment_eta_days=eta_days,
        confidence=round(confidence, 3),
        key_factors=key_factors[:3]  # Top 3 factors
    )


def estimate_eta_to_next_stage(features: Dict[str, Any], probability: float) -> Optional[int]:
    """Estimate days until next stage transition"""
    
    current_stage = features['stage']
    typical_duration = TYPICAL_STAGE_DURATION.get(current_stage, 14)
    days_in_pipeline = features.get('days_in_pipeline', 0)
    
    # If we've exceeded typical duration, ETA is uncertain
    if days_in_pipeline > typical_duration * 1.5:
        return None
    
    # Remaining days in typical duration
    remaining = max(0, typical_duration - days_in_pipeline)
    
    # Adjust based on probability (higher prob = sooner)
    if probability > 0.75:
        eta = int(remaining * 0.8)  # Faster than typical
    elif probability < 0.40:
        eta = int(remaining * 1.5)  # Slower than typical
    else:
        eta = remaining
    
    return max(1, eta)  # At least 1 day


def calculate_prediction_confidence(features: Dict[str, Any]) -> float:
    """Calculate confidence in prediction based on data completeness"""
    
    confidence = 0.5  # Base confidence
    
    # More data = higher confidence
    if features.get('email'):
        confidence += 0.1
    if features.get('phone'):
        confidence += 0.1
    if features.get('lead_score'):
        confidence += 0.1
    if features.get('engagement_score'):
        confidence += 0.1
    if features.get('total_activities', 0) > 0:
        confidence += 0.1
    
    # Recent engagement increases confidence
    if features.get('is_responsive'):
        confidence += 0.1
    
    return min(confidence, 0.95)


# ============================================================================
# Main Prediction Endpoint
# ============================================================================

@router.post("/predict", response_model=ApplicationIntelligence)
async def predict_application_progression(request: ApplicationProgressionRequest):
    """
    Predict application progression, blockers, and next best actions
    
    Returns comprehensive intelligence about an application's likelihood to progress
    """
    
    # Extract features
    features = await extract_application_features(request.application_id)
    
    # Predict progression to next stage
    progression = predict_stage_progression(features)
    
    # Predict enrollment
    enrollment = predict_enrollment(features, progression.progression_probability)
    
    # Detect blockers (if requested)
    blockers = []
    if request.include_blockers:
        blockers = detect_blockers(features, progression)
    
    # Generate next best actions (if requested)
    next_actions = []
    if request.include_nba:
        next_actions = generate_next_best_actions(features, progression, blockers)
    
    # Get cohort insights (if requested)
    cohort_insights = {}
    if request.include_cohort_analysis:
        cohort_insights = await get_cohort_insights(features)
    
    return ApplicationIntelligence(
        application_id=request.application_id,
        current_stage=features['stage'],
        days_in_stage=int(features.get('days_in_pipeline', 0)),
        progression_prediction=progression,
        enrollment_prediction=enrollment,
        blockers=blockers,
        next_best_actions=next_actions,
        cohort_insights=cohort_insights,
        generated_at=datetime.now().isoformat()
    )


# ============================================================================
# Blocker Detection
# ============================================================================

def detect_blockers(features: Dict[str, Any], progression: ProgressionPrediction) -> List[Blocker]:
    """Detect blockers preventing progression"""
    
    blockers = []
    current_stage = features['stage']
    
    # Missing contact information
    if not features.get('email'):
        blockers.append(Blocker(
            type='missing_contact',
            severity='critical',
            item='Email address',
            impact='Cannot send communications or schedule interviews',
            resolution_action='Request email address immediately',
            estimated_delay_days=3
        ))
    
    if not features.get('phone'):
        blockers.append(Blocker(
            type='missing_contact',
            severity='high',
            item='Phone number',
            impact='Limited communication channels',
            resolution_action='Request phone number for better contact',
            estimated_delay_days=2
        ))
    
    # Stage-specific blockers
    if current_stage == 'applicant':
        if not features.get('has_interview'):
            blockers.append(Blocker(
                type='missing_milestone',
                severity='critical',
                item='Interview not scheduled',
                impact='Cannot progress to interview stage',
                resolution_action='Schedule interview immediately',
                estimated_delay_days=7
            ))
    
    elif current_stage == 'interview':
        if not features.get('has_completed_interview'):
            blockers.append(Blocker(
                type='incomplete_process',
                severity='high',
                item='Interview not completed',
                impact='Cannot make offer decision',
                resolution_action='Complete interview or reschedule if cancelled',
                estimated_delay_days=7
            ))
    
    elif current_stage == 'offer':
        if not features.get('has_offer'):
            blockers.append(Blocker(
                type='missing_milestone',
                severity='critical',
                item='No formal offer made',
                impact='Cannot proceed to enrollment',
                resolution_action='Generate and send formal offer',
                estimated_delay_days=3
            ))
        elif not features.get('has_accepted_offer'):
            offer_age = (datetime.now() - features['latest_offer_date']).days if features.get('latest_offer_date') else 0
            if offer_age > 7:
                blockers.append(Blocker(
                    type='engagement_decay',
                    severity='high',
                    item=f'Offer pending for {offer_age} days',
                    impact='Risk of offer decline or applicant loss',
                    resolution_action='Follow up on offer status',
                    estimated_delay_days=5
                ))
    
    # Engagement blockers
    days_since_engagement = features.get('days_since_engagement', 0)
    if days_since_engagement > 7:
        blockers.append(Blocker(
            type='engagement_decay',
            severity='high' if days_since_engagement > 14 else 'medium',
            item=f'No engagement for {int(days_since_engagement)} days',
            impact=f'Reduces progression probability by ~{int(days_since_engagement * 2)}%',
            resolution_action='Send re-engagement communication',
            estimated_delay_days=int(days_since_engagement * 0.5)
        ))
    
    # Deadline pressure blockers
    if features.get('days_to_deadline') and features['days_to_deadline'] < 7:
        blockers.append(Blocker(
            type='deadline_approaching',
            severity='critical',
            item=f'Deadline in {features["days_to_deadline"]} days',
            impact='Urgent action required to meet deadline',
            resolution_action='Expedite all pending actions',
            estimated_delay_days=0
        ))
    
    # Low progression probability blocker
    if progression.progression_probability < 0.40:
        blockers.append(Blocker(
            type='low_probability',
            severity='high',
            item=f'Low progression probability ({int(progression.progression_probability * 100)}%)',
            impact='Application at risk of stalling',
            resolution_action='Review and address underlying issues',
            estimated_delay_days=7
        ))
    
    # NEW: Email engagement blockers (calculated from activities)
    email_engagement_rate = features.get('email_engagement_rate', 0)
    email_count = features.get('email_activity_count', 0)
    if email_count > 3 and email_engagement_rate == 0:
        blockers.append(Blocker(
            type='disengaged_email',
            severity='high',
            item=f'No email opens despite {email_count} emails sent',
            impact='Applicant may not be receiving or reading communications',
            resolution_action='Try alternative contact method (phone/SMS) or verify email address',
            estimated_delay_days=5
        ))
    
    # NEW: Portal engagement blocker
    portal_level = features.get('portal_engagement_level', 'none')
    if portal_level == 'none' and current_stage in ['applicant', 'interview']:
        blockers.append(Blocker(
            type='no_portal_engagement',
            severity='medium',
            item='No portal logins recorded',
            impact='May not be actively engaged with application',
            resolution_action='Send portal login instructions and encourage engagement',
            estimated_delay_days=7
        ))
    
    # NEW: Document activity blocker
    doc_level = features.get('document_activity_level', 'none')
    if doc_level == 'none' and current_stage in ['applicant', 'interview', 'offer']:
        blockers.append(Blocker(
            type='no_document_activity',
            severity='high',
            item='No document submission activity detected',
            impact='Required documents may be missing, preventing progression',
            resolution_action='Request missing documents and provide submission guidance',
            estimated_delay_days=10
        ))
    
    # Sort by severity
    severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    blockers.sort(key=lambda b: severity_order.get(b.severity, 4))
    
    return blockers


# ============================================================================
# Next Best Actions
# ============================================================================

def generate_next_best_actions(
    features: Dict[str, Any], 
    progression: ProgressionPrediction,
    blockers: List[Blocker]
) -> List[NextBestAction]:
    """Generate prioritized next best actions"""
    
    actions = []
    current_stage = features['stage']
    
    # Actions from blockers (highest priority)
    for idx, blocker in enumerate(blockers[:3]):  # Top 3 blockers
        actions.append(NextBestAction(
            action=blocker.resolution_action,
            priority=idx + 1,
            impact=blocker.impact,
            effort='low' if blocker.estimated_delay_days and blocker.estimated_delay_days < 3 else 'medium',
            deadline=(datetime.now() + timedelta(days=blocker.estimated_delay_days or 7)).strftime('%Y-%m-%d') if blocker.estimated_delay_days else None,
            action_type='resolution'
        ))
    
    # Stage-specific proactive actions
    if current_stage == 'applicant' and features.get('has_interview') and not features.get('has_completed_interview'):
        interview_date = features.get('latest_interview_date')
        if interview_date and (interview_date - datetime.now()).days <= 2:
            actions.append(NextBestAction(
                action='Send interview reminder and preparation materials',
                priority=len(actions) + 1,
                impact='Improves interview attendance and performance',
                effort='low',
                deadline=(interview_date - timedelta(days=1)).strftime('%Y-%m-%d'),
                action_type='communication'
            ))
    
    if current_stage == 'interview' and features.get('has_completed_interview'):
        actions.append(NextBestAction(
            action='Prepare and send offer letter',
            priority=len(actions) + 1,
            impact=f'+{int(progression.progression_probability * 100)}% enrollment probability',
            effort='medium',
            deadline=(datetime.now() + timedelta(days=3)).strftime('%Y-%m-%d'),
            action_type='documentation'
        ))
    
    if current_stage == 'offer' and features.get('has_offer'):
        actions.append(NextBestAction(
            action='Follow up on offer acceptance',
            priority=len(actions) + 1,
            impact='Accelerates decision and prevents applicant loss',
            effort='low',
            deadline=(datetime.now() + timedelta(days=2)).strftime('%Y-%m-%d'),
            action_type='communication'
        ))
    
    # Engagement actions
    if not features.get('is_responsive'):
        actions.append(NextBestAction(
            action='Multi-channel re-engagement campaign (email + SMS)',
            priority=len(actions) + 1,
            impact='Restores engagement and progression momentum',
            effort='low',
            deadline=(datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
            action_type='communication'
        ))
    
    # Quality improvement actions
    if features.get('lead_score', 0) < 50:
        actions.append(NextBestAction(
            action='Qualify applicant through detailed consultation',
            priority=len(actions) + 1,
            impact='Improves understanding and personalizes approach',
            effort='medium',
            deadline=(datetime.now() + timedelta(days=5)).strftime('%Y-%m-%d'),
            action_type='review'
        ))
    
    # Sort by priority
    actions.sort(key=lambda a: a.priority)
    
    return actions[:5]  # Top 5 actions


# ============================================================================
# Cohort Analysis
# ============================================================================

async def get_cohort_insights(features: Dict[str, Any]) -> Dict[str, Any]:
    """Get cohort performance insights for similar applications"""
    
    # Find similar applications (same stage, programme, source)
    query = """
        SELECT 
            COUNT(*) as cohort_size,
            AVG(CASE WHEN a.stage = 'enrolled' THEN 1 ELSE 0 END) as enrollment_rate,
            AVG(EXTRACT(EPOCH FROM (a.updated_at - a.created_at)) / 86400.0) as avg_days_to_current_stage,
            AVG(p.lead_score) as avg_lead_score
        FROM applications a
        JOIN people p ON p.id = a.person_id
        WHERE a.stage = %s
          AND a.programme_id = (SELECT programme_id FROM applications WHERE id = %s)
          AND a.source = %s
          AND a.id != %s
          AND a.created_at > NOW() - INTERVAL '12 months'
    """
    
    row = await fetchrow(
        query,
        features['stage'],
        features['application_id'],
        features['source'],
        features['application_id']
    )
    
    if not row or row['cohort_size'] == 0:
        return {
            'cohort_size': 0,
            'message': 'Insufficient cohort data'
        }
    
    return {
        'cohort_size': int(row['cohort_size']),
        'cohort_enrollment_rate': round(float(row['enrollment_rate'] or 0), 3),
        'avg_days_to_current_stage': round(float(row['avg_days_to_current_stage'] or 0), 1),
        'avg_cohort_lead_score': round(float(row['avg_lead_score'] or 0), 1),
        'performance_vs_cohort': 'above' if features.get('lead_score', 0) > row['avg_lead_score'] else 'below'
    }


# ============================================================================
# Batch Prediction
# ============================================================================

@router.post("/predict-batch")
async def predict_batch_applications(application_ids: List[str]):
    """Predict progression for multiple applications"""
    
    results = []
    
    for app_id in application_ids[:100]:  # Limit to 100 at a time
        try:
            prediction = await predict_application_progression(
                ApplicationProgressionRequest(
                    application_id=app_id,
                    include_blockers=True,
                    include_nba=True,
                    include_cohort_analysis=False  # Skip for batch to save time
                )
            )
            results.append({
                'application_id': app_id,
                'success': True,
                'prediction': prediction.dict()
            })
        except Exception as e:
            results.append({
                'application_id': app_id,
                'success': False,
                'error': str(e)
            })
    
    return {
        'total_processed': len(results),
        'successful': sum(1 for r in results if r['success']),
        'failed': sum(1 for r in results if not r['success']),
        'results': results
    }

