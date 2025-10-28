"""
Intelligent Action Triage Engine
Generates prioritized, context-aware action recommendations
"""

from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from app.db.db import fetch, fetchrow, execute
from app.ai.application_ml import (
    extract_application_features,
    predict_stage_progression,
    detect_blockers,
    generate_next_best_actions
)
from app.ai.ucas_cycle import UcasCycleCalendar

logger = logging.getLogger(__name__)


# ============================================================================
# Constants for Priority Calculation
# ============================================================================

# Weight multipliers for priority formula
IMPACT_WEIGHT = 0.4      # How much will this action improve conversion?
URGENCY_WEIGHT = 0.35    # How time-sensitive is this action?
FRESHNESS_WEIGHT = 0.25  # How recent is our engagement?

# Urgency multipliers based on context
URGENCY_MULTIPLIERS = {
    "offer_expires_today": 5.0,
    "offer_expires_3d": 3.0,
    "offer_expires_7d": 2.0,
    "interview_tomorrow": 2.5,
    "unresponsive_7d": 2.0,
    "unresponsive_14d": 2.5,
    "clearing_period": 3.0,
    "results_week": 2.5,
    "equal_consideration": 1.8,
    "standard": 1.0,
}

# Action type definitions
ACTION_TYPES = {
    "email": {
        "label": "Send Email",
        "icon": "✉️",
        "avg_response_rate": 0.35,
        "avg_time_hours": 24,
    },
    "call": {
        "label": "Phone Call",
        "icon": "📞",
        "avg_response_rate": 0.65,
        "avg_time_hours": 2,
    },
    "flag": {
        "label": "Flag for Review",
        "icon": "🚩",
        "avg_response_rate": 1.0,
        "avg_time_hours": 0,
    },
    "unblock": {
        "label": "Remove Blocker",
        "icon": "🔓",
        "avg_response_rate": 1.0,
        "avg_time_hours": 1,
    }
}


# ============================================================================
# Priority Calculation Engine
# ============================================================================

def calculate_priority(
    conversion_probability: float,
    urgency_context: str,
    engagement_decay: float,
    impact_estimate: float
) -> float:
    """
    Calculate action priority using sophisticated multi-factor formula.

    Priority = (impact_weight * impact_estimate) +
               (urgency_weight * urgency_multiplier) +
               (freshness_weight * engagement_freshness)

    Args:
        conversion_probability: Current conversion probability (0-1)
        urgency_context: Key describing urgency (e.g., "offer_expires_3d")
        engagement_decay: How stale is engagement (0=fresh, 1=very stale)
        impact_estimate: Expected probability gain from action (0-1)

    Returns:
        Priority score (higher = more important)
    """
    urgency_mult = URGENCY_MULTIPLIERS.get(urgency_context, 1.0)
    engagement_freshness = 1.0 - engagement_decay  # Invert (fresh = high)

    # Normalize urgency multiplier to 0-1 range for fair weighting
    normalized_urgency = min(urgency_mult / 5.0, 1.0)

    priority = (
        (IMPACT_WEIGHT * impact_estimate) +
        (URGENCY_WEIGHT * normalized_urgency) +
        (FRESHNESS_WEIGHT * engagement_freshness)
    )

    # Boost by base conversion probability (high-probability leads get more attention)
    priority = priority * (0.5 + conversion_probability)

    return round(priority, 3)


def determine_urgency_context(features: Dict[str, Any], stage: str) -> str:
    """Determine urgency context from application features."""

    # Check offer expiry
    if 'offer' in stage:
        offer_date = features.get('latest_offer_date')
        if offer_date:
            try:
                days_since_offer = (datetime.now() - offer_date).days
                if days_since_offer >= 21:  # Typical offer response window
                    return "offer_expires_today"
                elif days_since_offer >= 18:
                    return "offer_expires_3d"
                elif days_since_offer >= 14:
                    return "offer_expires_7d"
            except:
                pass

    # Check engagement recency
    days_since = features.get('days_since_engagement', 999)
    if days_since >= 14:
        return "unresponsive_14d"
    elif days_since >= 7:
        return "unresponsive_7d"

    # Check UCAS cycle context
    ucas_period = features.get('ucas_period', 'unknown')
    if ucas_period == 'clearing':
        return "clearing_period"
    elif ucas_period == 'results_week':
        return "results_week"
    elif ucas_period == 'equal_consideration':
        return "equal_consideration"

    # Check interview timing
    if stage == 'interview_portfolio':
        # TODO: Check if interview is within 48h
        pass

    return "standard"


def calculate_engagement_decay(features: Dict[str, Any]) -> float:
    """
    Calculate engagement decay (0=fresh, 1=very stale).

    Uses exponential decay: decay = 1 - e^(-days/14)
    """
    import math

    days_since = features.get('days_since_engagement', 0)
    if days_since == 0:
        return 0.0

    # Exponential decay with half-life of 14 days
    decay = 1.0 - math.exp(-days_since / 14.0)
    return min(decay, 1.0)


def estimate_action_impact(
    action_type: str,
    features: Dict[str, Any],
    current_prob: float
) -> float:
    """
    Estimate expected probability gain from this action.

    Uses historical response rates and current engagement level.
    """
    # Base impact from action type
    action_config = ACTION_TYPES.get(action_type, {})
    base_response_rate = action_config.get("avg_response_rate", 0.5)

    # Adjust based on current engagement level
    engagement_level = features.get('engagement_level', 'medium')
    engagement_multiplier = {
        'very_high': 1.2,
        'high': 1.1,
        'medium': 1.0,
        'low': 0.8,
        'very_low': 0.6
    }.get(engagement_level, 1.0)

    # Estimated probability gain
    # High-probability leads have less room for improvement
    room_for_improvement = 1.0 - current_prob
    expected_gain = base_response_rate * engagement_multiplier * room_for_improvement * 0.15

    return min(expected_gain, 0.3)  # Cap at 30% gain


# ============================================================================
# Action Recommendation Logic
# ============================================================================

def recommend_action_type(features: Dict[str, Any], stage: str) -> str:
    """Determine best action type for this application."""

    # Unresponsive? Call is better than email
    days_since = features.get('days_since_engagement', 0)
    if days_since >= 7:
        return "call"

    # Offer stage? Email with urgency
    if 'offer' in stage and 'no_response' in stage:
        return "email"

    # Interview stage? Call to confirm
    if stage == 'interview_portfolio':
        return "call"

    # High engagement? Email works
    engagement = features.get('engagement_level', 'medium')
    if engagement in ['high', 'very_high']:
        return "email"

    # Default: call for personal touch
    return "call"


def generate_action_reason(
    action_type: str,
    features: Dict[str, Any],
    stage: str,
    urgency_context: str
) -> str:
    """Generate human-readable reason for this action."""

    name = features.get('first_name', 'Applicant')
    days_since = features.get('days_since_engagement', 0)

    # Urgency-driven reasons
    if "offer_expires" in urgency_context:
        days_left = 21 - features.get('days_in_pipeline', 0)
        return f"{name}'s offer expires in {days_left} days - needs response urgently"

    if "unresponsive" in urgency_context:
        return f"{name} hasn't responded in {days_since} days - re-engagement needed"

    if urgency_context == "clearing_period":
        return f"{name} is in clearing - high urgency, fast decision needed"

    if urgency_context == "results_week":
        return f"Results week - {name} likely reviewing options now"

    # Stage-driven reasons
    if stage == 'conditional_offer_no_response':
        return f"{name} has conditional offer pending - needs decision"

    if stage == 'unconditional_offer_no_response':
        return f"{name} has unconditional offer - encourage acceptance"

    if stage == 'interview_portfolio':
        return f"{name} needs interview scheduling - booking required"

    if stage == 'pre_application':
        return f"{name} showing interest - nurture to application"

    # Default
    return f"{name} - {stage.replace('_', ' ')} stage requires action"


def generate_ml_enhanced_reason(
    action_type: str,
    features: Dict[str, Any],
    stage: str,
    urgency_context: str,
    prediction: Any,
    blockers: List[Any],
    ml_actions: List[Any]
) -> str:
    """
    Generate intelligent action reason using ML insights.

    Combines:
    - Top blocker (if any) - most critical issue
    - Top positive ML factor - what's working
    - Top negative ML factor - what's at risk
    """
    name = features.get('first_name', 'Applicant')

    # Priority 1: Use top blocker if critical
    if blockers and blockers[0].severity in ['critical', 'high']:
        blocker = blockers[0]
        return f"{name}: {blocker.item} - {blocker.impact}"

    # Priority 2: Use ML adjustment factors for nuanced reason
    if hasattr(prediction, 'adjustment_factors') and prediction.adjustment_factors:
        factors = prediction.adjustment_factors

        # Get top positive and negative factors
        positive_factors = [f for f in factors if f.get('weight', 0) > 0]
        negative_factors = [f for f in factors if f.get('weight', 0) < 0]

        parts = [name]

        # Add top positive insight
        if positive_factors:
            top_positive = positive_factors[0]
            parts.append(f"{top_positive['reason']} (+{int(top_positive['weight']*100)}%)")

        # Add top negative/risk
        if negative_factors:
            top_negative = negative_factors[0]
            parts.append(f"but {top_negative['reason'].lower()} ({int(top_negative['weight']*100)}%)")

        # Add recommended action
        if blockers:
            parts.append(f"- {blockers[0].resolution_action}")
        elif ml_actions:
            parts.append(f"- {ml_actions[0].action}")

        return " ".join(parts)

    # Priority 3: Fall back to standard reason
    return generate_action_reason(action_type, features, stage, urgency_context)


# ============================================================================
# Artifact Generation (Message Drafts)
# ============================================================================

def generate_artifacts(
    action_type: str,
    features: Dict[str, Any],
    reason: str,
    prediction: Any
) -> Dict[str, Any]:
    """
    Generate action artifacts (email draft, call script, etc).

    For Phase A: Uses template-based generation (fast, reliable).
    Future: Can enhance with LLM generation for personalization.
    """
    name = features.get('first_name', 'there')
    stage = features.get('stage', 'unknown')
    programme = features.get('programme_name', 'your programme')
    prob = prediction.progression_probability

    # Build context bullets
    context = []

    if prob >= 0.7:
        context.append(f"High conversion probability ({prob:.0%})")
    elif prob <= 0.4:
        context.append(f"At-risk applicant ({prob:.0%})")

    days_since = features.get('days_since_engagement', 0)
    if days_since > 0:
        context.append(f"Last contact: {days_since} days ago")

    if features.get('kw_accommodation_count', 0) > 0:
        context.append("Interested in accommodation")

    if features.get('latest_overall_rating'):
        rating = features.get('latest_overall_rating')
        context.append(f"Interview rating: {rating}/5")

    # Generate message based on action type and stage
    artifacts = {
        "context": context,
        "applicant_context": {
            "name": name,
            "stage": stage,
            "programme": programme,
            "probability": prob
        }
    }

    if action_type == "email":
        artifacts.update(_generate_email_artifacts(name, stage, programme, features, reason))
    elif action_type == "call":
        artifacts.update(_generate_call_artifacts(name, stage, programme, features, reason))
    elif action_type == "flag":
        artifacts["message"] = f"Review required: {reason}"
    elif action_type == "unblock":
        artifacts["message"] = f"Remove blocker: {reason}"

    return artifacts


def generate_artifacts_with_ml(
    action_type: str,
    features: Dict[str, Any],
    reason: str,
    prediction: Any,
    blockers: List[Any],
    ml_actions: List[Any]
) -> Dict[str, Any]:
    """
    Generate artifacts enhanced with ML intelligence.

    Adds:
    - ML explanation from prediction
    - Top blockers with severity
    - Adjustment factors (positive/negative)
    - ML-recommended actions
    """
    # Start with standard artifacts
    artifacts = generate_artifacts(action_type, features, reason, prediction)

    # Add ML intelligence
    ml_intelligence = {}

    # Add ML explanation if available
    if hasattr(prediction, 'explanation') and prediction.explanation:
        ml_intelligence['explanation'] = prediction.explanation

    # Add adjustment factors for UI display
    if hasattr(prediction, 'adjustment_factors') and prediction.adjustment_factors:
        # Get top 5 factors
        factors = prediction.adjustment_factors[:5]
        ml_intelligence['factors'] = [
            {
                'reason': f['reason'],
                'weight': f['weight'],
                'type': 'positive' if f['weight'] > 0 else 'negative'
            }
            for f in factors
        ]

    # Add blockers
    if blockers:
        ml_intelligence['blockers'] = [
            {
                'item': b.item,
                'severity': b.severity,
                'impact': b.impact,
                'resolution': b.resolution_action
            }
            for b in blockers[:3]  # Top 3 blockers
        ]

    # Add ML recommended actions
    if ml_actions:
        ml_intelligence['recommended_actions'] = [
            {
                'action': a.action,
                'priority': a.priority,
                'impact': a.impact,
                'effort': a.effort
            }
            for a in ml_actions[:3]  # Top 3 actions
        ]

    # Add ML intelligence to artifacts
    artifacts['ml_intelligence'] = ml_intelligence

    # Enhance context with ML insights
    if blockers:
        artifacts['context'].insert(0, f"🚨 {blockers[0].item} (blocker)")

    if hasattr(prediction, 'adjustment_factors') and prediction.adjustment_factors:
        top_positive = next((f for f in prediction.adjustment_factors if f.get('weight', 0) > 0), None)
        if top_positive:
            artifacts['context'].insert(0, f"✅ {top_positive['reason']}")

    return artifacts


def _generate_email_artifacts(name: str, stage: str, programme: str, features: Dict, reason: str) -> Dict:
    """Generate email-specific artifacts."""

    # Email templates by stage
    if 'offer' in stage and 'no_response' in stage:
        subject = f"{name}, your offer is waiting"
        message = f"""Hi {name},

I wanted to follow up on your offer for {programme}.

We'd love to have you join us, and I wanted to make sure you have everything you need to make your decision.

Is there anything I can help clarify? Any questions about:
• Accommodation options
• Student finance
• Course structure
• Campus facilities

I'm here to help. Let me know if you'd like to arrange a quick call.

Best regards"""

    elif stage == 'interview_portfolio':
        subject = f"{name}, let's schedule your interview"
        message = f"""Hi {name},

Thank you for your application to {programme}!

We'd like to invite you for an interview. Could you let me know your availability over the next 2 weeks?

I have the following slots available:
• [Date/Time options]

Looking forward to meeting you!

Best regards"""

    elif stage == 'pre_application':
        subject = f"{name}, next steps for {programme}"
        message = f"""Hi {name},

I hope this email finds you well!

I wanted to check in regarding your interest in {programme}.

Have you had a chance to review the course details? I'd be happy to answer any questions or arrange a campus visit.

What would be most helpful for you right now?

Best regards"""

    else:
        # Generic template
        subject = f"Following up on your application"
        message = f"""Hi {name},

I wanted to reach out regarding your application for {programme}.

{reason}

Please let me know if there's anything I can help with.

Best regards"""

    return {
        "suggested_subject": subject,
        "message": message
    }


def _generate_call_artifacts(name: str, stage: str, programme: str, features: Dict, reason: str) -> Dict:
    """Generate call script artifacts."""

    prob = features.get('conversion_probability', 0.5)

    # Call script template
    script = f"""**Call Script: {name}**

**Opening:**
"Hi {name}, this is [Your Name] from [University]. Do you have a few minutes to chat about your application for {programme}?"

**Purpose:** {reason}

**Key Points to Cover:**
"""

    if 'offer' in stage:
        script += """
• Confirm they received the offer
• Ask if they have any questions
• Discuss accommodation/finance if relevant
• Clarify decision timeline (offer expires [DATE])
"""
    elif stage == 'interview_portfolio':
        script += """
• Schedule interview date/time
• Explain interview format
• Discuss portfolio requirements (if applicable)
• Answer any preparation questions
"""
    else:
        script += """
• Check their level of interest
• Address any concerns or questions
• Clarify next steps in process
• Offer additional information/visit
"""

    script += f"""
**Conversion Probability:** {prob:.0%} ({"high" if prob >= 0.7 else "medium" if prob >= 0.4 else "at-risk"})

**Notes:**
- Listen for hesitation or concerns
- Offer specific help (not generic)
- Get commitment to next action
- Log outcome immediately after call
"""

    return {
        "message": script
    }


# ============================================================================
# Main Triage Function
# ============================================================================

async def generate_triage_queue(
    user_id: str,
    limit: int = 5,
    filters: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Generate prioritized action queue for user.

    Args:
        user_id: User UUID
        limit: Max actions to return
        filters: Optional filters (stage, programme, etc)

    Returns:
        List of triage items sorted by priority (descending)
    """
    logger.info(f"Generating triage queue for user {user_id}, limit={limit}, filters={filters}")

    # Get applications that need action
    # Exclude: enrolled, rejected, withdrawn
    where_clauses = ["a.stage NOT IN ('enrolled', 'rejected', 'offer_withdrawn', 'offer_declined')"]
    params = []
    param_index = 1

    # Apply filters if provided
    if filters:
        if 'application_ids' in filters and filters['application_ids']:
            # Filter to specific application IDs (from Ivy suggestions)
            logger.info(f"Filtering triage to specific application IDs: {filters['application_ids']}")
            # Use %s style placeholders for psycopg
            where_clauses.append("a.id = ANY(%s::uuid[])")
            params.append(filters['application_ids'])

    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            a.id AS application_id,
            a.stage,
            a.status,
            a.created_at,
            p.id AS person_id,
            p.first_name,
            p.last_name,
            pr.name AS programme_name
        FROM applications a
        JOIN people p ON p.id = a.person_id
        LEFT JOIN programmes pr ON pr.id = a.programme_id
        WHERE {where_sql}
        ORDER BY a.created_at DESC
        LIMIT 50  -- Consider top 50, then prioritize
    """

    logger.info(f"Executing query: {query}")
    logger.info(f"With params: {params}")
    
    rows = await fetch(query, *params) if params else await fetch(query)
    logger.info(f"Found {len(rows)} applications for triage")
    
    if filters and 'application_ids' in filters and filters['application_ids']:
        logger.info(f"Expected to find applications with IDs: {filters['application_ids']}")
        if len(rows) == 0:
            logger.warning("⚠️ No applications found matching the suggested IDs!")

    if not rows:
        logger.info("No applications found for triage")
        return []

    triage_items = []

    for row in rows:
        try:
            # Extract ML features
            app_id = str(row['application_id'])
            features = await extract_application_features(app_id)

            # Get ML prediction and intelligence
            prediction = predict_stage_progression(features)
            current_prob = prediction.progression_probability

            # Get ML-detected blockers and recommended actions
            blockers = detect_blockers(features, prediction)
            ml_actions = generate_next_best_actions(features, prediction, blockers)

            # Determine action type
            action_type = recommend_action_type(features, row['stage'])

            # Calculate priority
            urgency_context = determine_urgency_context(features, row['stage'])
            engagement_decay = calculate_engagement_decay(features)
            impact_estimate = estimate_action_impact(action_type, features, current_prob)

            priority = calculate_priority(
                current_prob,
                urgency_context,
                engagement_decay,
                impact_estimate
            )

            # Generate ML-enhanced reason and artifacts
            reason = generate_ml_enhanced_reason(
                action_type,
                features,
                row['stage'],
                urgency_context,
                prediction,
                blockers,
                ml_actions
            )
            artifacts = generate_artifacts_with_ml(
                action_type,
                features,
                reason,
                prediction,
                blockers,
                ml_actions
            )

            # Build triage item
            triage_item = {
                "application_id": app_id,
                "applicant_name": f"{row['first_name']} {row['last_name']}",
                "programme_name": row.get('programme_name', 'Unknown Programme'),
                "stage": row['stage'],
                "action_type": action_type,
                "reason": reason,
                "priority": float(priority),
                "expected_gain": float(impact_estimate),
                "artifacts": artifacts,
                "expires_at": (datetime.now() + timedelta(hours=24)).isoformat(),
                "conversion_probability": float(current_prob),
                "_debug": {
                    "urgency_context": urgency_context,
                    "engagement_decay": engagement_decay,
                    "current_probability": current_prob
                }
            }

            triage_items.append(triage_item)

        except Exception as e:
            logger.error(f"Error processing application {row['application_id']}: {e}")
            continue

    # Sort by priority descending
    triage_items.sort(key=lambda x: x['priority'], reverse=True)

    # Return top N
    return triage_items[:limit]


# ============================================================================
# Queue Persistence
# ============================================================================

async def persist_triage_to_queue(user_id: str, triage_items: List[Dict[str, Any]]) -> int:
    """
    Persist triage items to action_queue table.

    Returns number of items inserted.
    """
    if not triage_items:
        return 0

    # Clear existing queue for user (fresh start each triage)
    await execute("DELETE FROM action_queue WHERE user_id = %s", user_id)

    # Insert new items
    inserted = 0
    for item in triage_items:
        try:
            await execute(
                """
                INSERT INTO action_queue
                    (user_id, application_id, action_type, reason, priority, expected_gain, artifacts, expires_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                user_id,
                item['application_id'],
                item['action_type'],
                item['reason'],
                item['priority'],
                item['expected_gain'],
                item['artifacts'],
                item['expires_at']
            )
            inserted += 1
        except Exception as e:
            logger.error(f"Failed to insert triage item: {e}")

    logger.info(f"Persisted {inserted} triage items to queue for user {user_id}")
    return inserted
