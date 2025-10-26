"""
Application-specific AI analysis endpoint
Provides personalized insights for individual applicants
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
from decimal import Decimal
import json
import logging

from app.db.db import fetch, fetchrow, execute
from app.ai.runtime import narrate as runtime_narrate
from app.ai.privacy_utils import safe_preview
from app.ai.application_ml import extract_application_features, predict_stage_progression

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/applications/ai", tags=["applications-ai"])

class ApplicationAnalysisRequest(BaseModel):
    query: str
    applicant_name: str
    application_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class ApplicationAnalysisResponse(BaseModel):
    answer: str
    applicant_name: str
    application_id: str
    current_stage: str
    conversion_probability: float
    lead_score: int
    engagement_level: str
    risk_factors: List[str]
    positive_indicators: List[str]
    recommended_actions: List[str]
    next_steps: List[str]
    confidence: float
    sources: List[Dict[str, str]] = []

@router.get("/debug")
async def debug_applicant(
    application_id: Optional[str] = None,
    applicant_name: Optional[str] = None
):
    """
    Debug endpoint to test applicant lookup without analysis.
    Returns the matched applicant data without performing full analysis.
    """
    try:
        logger.info(f"Debug lookup: application_id={application_id}, applicant_name={applicant_name}")

        if application_id:
            applicant = await find_applicant_by_id(application_id)
            lookup_method = "application_id"
        elif applicant_name:
            applicant = await find_applicant_by_name(applicant_name)
            lookup_method = "name"
        else:
            raise HTTPException(status_code=400, detail="Either applicant_name or application_id must be provided")

        if not applicant:
            detail = f"Application ID {application_id} not found" if application_id else f"Applicant '{applicant_name}' not found"
            raise HTTPException(status_code=404, detail=detail)

        logger.info(f"Debug lookup successful: {lookup_method} -> {applicant.get('name', 'Unknown')}")

        return {
            "found": True,
            "applicant": applicant,
            "lookup_method": lookup_method
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Debug lookup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Debug lookup error: {str(e)}")

@router.post("/analyze", response_model=ApplicationAnalysisResponse)
async def analyze_application(request: ApplicationAnalysisRequest):
    """
    Analyze a specific applicant's likelihood to convert and provide personalized insights.
    Never returns 500; always delivers HTTP 200 with structured fallback on errors.
    """
    try:
        # Prefer application_id if provided to avoid name ambiguity
        applicant = None
        if request.application_id:
            logger.info(f"Looking up applicant by ID: {request.application_id}")
            applicant = await find_applicant_by_id(request.application_id)

        if not applicant and request.applicant_name:
            logger.info(f"Looking up applicant by name: {request.applicant_name}")
            applicant = await find_applicant_by_name(request.applicant_name)

        if not applicant:
            # Return 404 for not found - this is expected behavior
            raise HTTPException(
                status_code=404,
                detail=f"Applicant not found (ID: {request.application_id or 'N/A'}, Name: {request.applicant_name or 'N/A'})"
            )

        # Safe type coercions for response construction
        def safe_str(val: Any, default: str = "") -> str:
            """Safely convert to string"""
            if val is None:
                return default
            return str(val)

        def safe_float(val: Any, default: float = 0.0) -> float:
            """Safely convert to float (handles Decimal, str, None)"""
            if val is None:
                return default
            try:
                if isinstance(val, Decimal):
                    return float(val)
                return float(val)
            except (ValueError, TypeError):
                logger.warning(f"Could not convert {val} ({type(val)}) to float, using {default}")
                return default

        def safe_int(val: Any, default: int = 0) -> int:
            """Safely convert to int"""
            if val is None:
                return default
            try:
                return int(val)
            except (ValueError, TypeError):
                logger.warning(f"Could not convert {val} ({type(val)}) to int, using {default}")
                return default

        # Perform deep analysis with graceful fallback
        analysis = None
        try:
            logger.info(f"Starting analysis for {applicant.get('name', 'Unknown')}")
            analysis = await perform_application_analysis(applicant, request.query)
        except Exception as e:
            logger.exception(f"perform_application_analysis failed for application {applicant.get('application_id')}: {e}")
            # Fallback: deliver a minimal structured answer without failing the request
            name = safe_str(applicant.get("name") or f"{applicant.get('first_name','')} {applicant.get('last_name','')}".strip(), "This applicant")
            stage = safe_str(applicant.get("stage"), "unknown")
            conv = safe_float(applicant.get("conversion_probability"))

            analysis = {
                "answer": (
                    f"**{name}'s Application**\n\n"
                    f"Stage: {stage}\n"
                    f"Conversion probability: {conv:.0%}\n\n"
                    "I couldn't access all analysis signals right now, but you can proceed with standard next steps:\n"
                    "• Review recent activity and follow up\n"
                    "• Confirm entry requirements\n"
                    "• Offer a short 1-1 to discuss next steps"
                ),
                "engagement_level": "unknown",
                "risk_factors": [],
                "positive_indicators": [],
                "recommended_actions": [
                    "Follow up by email and phone",
                    "Confirm outstanding documents",
                    "Offer a short 1-1 call"
                ],
                "next_steps": ["Review current stage requirements", "Plan next engagement"],
                "confidence": 0.4,
                "sources": []
            }

        # Build response with safe type coercions
        try:
            return ApplicationAnalysisResponse(
                answer=safe_str(analysis.get("answer"), "No analysis available"),
                applicant_name=safe_str(applicant.get("name"), "Unknown"),
                application_id=safe_str(applicant.get("application_id"), ""),
                current_stage=safe_str(applicant.get("stage"), "unknown"),
                conversion_probability=safe_float(applicant.get("conversion_probability")),
                lead_score=safe_int(applicant.get("lead_score")),
                engagement_level=safe_str(analysis.get("engagement_level"), "unknown"),
                risk_factors=analysis.get("risk_factors") or [],
                positive_indicators=analysis.get("positive_indicators") or [],
                recommended_actions=analysis.get("recommended_actions") or [],
                next_steps=analysis.get("next_steps") or [],
                confidence=safe_float(analysis.get("confidence"), 0.5),
                sources=analysis.get("sources") or []
            )
        except Exception as e:
            logger.exception(f"Failed to construct response: {e}")
            # Ultimate fallback - minimal valid response
            return ApplicationAnalysisResponse(
                answer="Analysis completed with limited data. Please review application details manually.",
                applicant_name=safe_str(applicant.get("name"), "Unknown"),
                application_id=safe_str(applicant.get("application_id"), ""),
                current_stage=safe_str(applicant.get("stage"), "unknown"),
                conversion_probability=safe_float(applicant.get("conversion_probability")),
                lead_score=safe_int(applicant.get("lead_score")),
                engagement_level="unknown",
                risk_factors=[],
                positive_indicators=[],
                recommended_actions=["Review application manually"],
                next_steps=["Contact applicant"],
                confidence=0.3,
                sources=[]
            )

    except HTTPException:
        # Pass through HTTP exceptions (404s)
        raise
    except Exception as e:
        logger.exception(f"Unexpected error in analyze_application: {e}")
        # Last resort: return minimal valid response instead of 500
        return ApplicationAnalysisResponse(
            answer="Unable to complete analysis. Please try again or review application manually.",
            applicant_name=request.applicant_name or "Unknown",
            application_id=request.application_id or "",
            current_stage="unknown",
            conversion_probability=0.0,
            lead_score=0,
            engagement_level="unknown",
            risk_factors=["Analysis error occurred"],
            positive_indicators=[],
            recommended_actions=["Review application manually", "Contact support if issue persists"],
            next_steps=["Manual review required"],
            confidence=0.1,
            sources=[]
        )

async def find_applicant_by_name(name: str) -> Optional[Dict[str, Any]]:
    """Find applicant by name with fuzzy matching. Returns None if not found."""
    try:
        if not name or not name.strip():
            logger.warning("find_applicant_by_name called with empty name")
            return None

        logger.info(f"find_applicant_by_name searching for: '{name}'")

        # Try exact match first against applications joined to people/programmes
        query = """
        SELECT
            a.id AS application_id,
            p.first_name,
            p.last_name,
            p.email,
            a.stage,
            COALESCE(a.progression_probability, 0.0) AS conversion_probability,
            0::int AS lead_score,
            pr.name AS programme_name,
            a.created_at,
            a.updated_at,
            NULL AS last_activity_at
        FROM applications a
        JOIN people p ON p.id = a.person_id
        LEFT JOIN programmes pr ON pr.id = a.programme_id
        WHERE LOWER(p.first_name) = LOWER(%s)
           OR LOWER(p.last_name) = LOWER(%s)
           OR LOWER(CONCAT(p.first_name, ' ', p.last_name)) = LOWER(%s)
        ORDER BY a.updated_at DESC
        LIMIT 1
        """

        result = await fetchrow(query, name, name, name)
        if result:
            logger.info(f"Exact match found for '{name}': {result.get('first_name')} {result.get('last_name')}")
            return _dict_from_row(result)

        # Try partial matching
        logger.info(f"No exact match for '{name}', trying partial match")
        partial_query = """
        SELECT
            a.id AS application_id,
            p.first_name,
            p.last_name,
            p.email,
            a.stage,
            COALESCE(a.progression_probability, 0.0) AS conversion_probability,
            0::int AS lead_score,
            pr.name AS programme_name,
            a.created_at,
            a.updated_at,
            NULL AS last_activity_at
        FROM applications a
        JOIN people p ON p.id = a.person_id
        LEFT JOIN programmes pr ON pr.id = a.programme_id
        WHERE LOWER(p.first_name) LIKE LOWER(%s)
           OR LOWER(p.last_name) LIKE LOWER(%s)
           OR LOWER(CONCAT(p.first_name, ' ', p.last_name)) LIKE LOWER(%s)
        ORDER BY a.updated_at DESC
        LIMIT 1
        """

        like = f"%{name}%"
        result = await fetchrow(partial_query, like, like, like)
        if result:
            logger.info(f"Partial match found for '{name}': {result.get('first_name')} {result.get('last_name')}")
            return _dict_from_row(result)

        logger.info(f"No match found for '{name}'")
        return None

    except Exception as e:
        logger.exception(f"Database query failed in find_applicant_by_name for '{name}': {e}")
        return None

async def find_applicant_by_id(application_id: str) -> Optional[Dict[str, Any]]:
    """Find applicant via application_id directly. Returns None if not found."""
    try:
        if not application_id or not application_id.strip():
            logger.warning("find_applicant_by_id called with empty application_id")
            return None

        logger.info(f"find_applicant_by_id searching for: '{application_id}'")

        query = """
        SELECT
            a.id AS application_id,
            p.first_name,
            p.last_name,
            p.email,
            a.stage,
            COALESCE(a.progression_probability, 0.0) AS conversion_probability,
            0::int AS lead_score,
            pr.name AS programme_name,
            a.created_at,
            a.updated_at,
            NULL AS last_activity_at
        FROM applications a
        JOIN people p ON p.id = a.person_id
        LEFT JOIN programmes pr ON pr.id = a.programme_id
        WHERE a.id = %s::uuid
        LIMIT 1
        """
        result = await fetchrow(query, application_id)
        if not result:
            logger.info(f"No match found for application_id: '{application_id}'")
            return None

        logger.info(f"Match found for application_id '{application_id}': {result.get('first_name')} {result.get('last_name')}")
        return _dict_from_row(result)

    except Exception as e:
        logger.exception(f"Lookup by application_id failed for '{application_id}': {e}")
        return None

def _dict_from_row(result: Dict[str, Any]) -> Dict[str, Any]:
    """Convert DB row to dict with safe type handling."""
    try:
        return {
            "application_id": str(result["application_id"]),
            "name": f"{result['first_name']} {result['last_name']}",
            "first_name": str(result["first_name"] or ""),
            "last_name": str(result["last_name"] or ""),
            "email": str(result["email"] or ""),
            "stage": str(result["stage"] or "unknown"),
            "conversion_probability": float(result["conversion_probability"]) if result.get("conversion_probability") is not None else 0.0,
            "lead_score": int(result["lead_score"]) if result.get("lead_score") is not None else 0,
            "programme_name": str(result["programme_name"] or ""),
            "created_at": result["created_at"],
            "updated_at": result["updated_at"],
            "last_activity_at": result.get("last_activity_at")
        }
    except Exception as e:
        logger.exception(f"Error converting row to dict: {e}")
        # Return minimal valid dict
        return {
            "application_id": str(result.get("application_id", "")),
            "name": "Unknown",
            "first_name": "",
            "last_name": "",
            "email": "",
            "stage": "unknown",
            "conversion_probability": 0.0,
            "lead_score": 0,
            "programme_name": "",
            "created_at": None,
            "updated_at": None,
            "last_activity_at": None
        }

async def perform_application_analysis(applicant: Dict[str, Any], query: str) -> Dict[str, Any]:
    """
    Perform deep analysis of the applicant's data.
    Returns dict with answer, engagement_level, risk_factors, etc.
    Raises on failure (caller must handle).
    """
    try:
        # Extract key metrics with safe type handling
        conversion_prob = float(applicant.get("conversion_probability") or 0.0)
        lead_score = int(applicant.get("lead_score") or 0)
        current_stage = str(applicant.get("stage") or "unknown")
        last_activity = applicant.get("last_activity_at")

        # Analyze engagement
        engagement_level = analyze_engagement(applicant)

        # Identify risk factors
        risk_factors = identify_risk_factors(applicant)

        # Identify positive indicators
        positive_indicators = identify_positive_indicators(applicant)

        # Generate recommendations
        recommended_actions = generate_recommendations(applicant, risk_factors, positive_indicators)

        # Determine next steps
        next_steps = determine_next_steps(applicant, current_stage, risk_factors)

        # Calculate confidence
        confidence = calculate_confidence(applicant)

        # NEW: Get ML score explanation from application_ml
        ml_explanation = None
        progression_prediction = None
        try:
            application_id = str(applicant.get("application_id", ""))
            if application_id:
                logger.info(f"Fetching ML score explanation for application {application_id}")
                features = await extract_application_features(application_id)
                progression_prediction = predict_stage_progression(features)
                ml_explanation = progression_prediction.explanation
                logger.info(f"ML explanation generated: {len(ml_explanation) if ml_explanation else 0} chars")
        except Exception as e:
            logger.warning(f"Could not fetch ML explanation: {e}")
            # Continue without ML explanation - not critical

        # Generate AI-powered answer
        answer = await generate_personalized_answer(
            applicant,
            query,
            conversion_prob,
            lead_score,
            engagement_level,
            risk_factors,
            positive_indicators,
            recommended_actions,
            ml_explanation=ml_explanation  # NEW: Pass explanation to answer generator
        )

        return {
            "answer": answer,
            "engagement_level": engagement_level,
            "risk_factors": risk_factors,
            "positive_indicators": positive_indicators,
            "recommended_actions": recommended_actions,
            "next_steps": next_steps,
            "confidence": confidence,
            "sources": [{
                "title": f"{applicant.get('name', 'Unknown')}'s Application Data",
                "snippet": f"Stage: {current_stage}, Conversion: {conversion_prob:.1%}, Score: {lead_score}"
            }]
        }
    except Exception as e:
        logger.exception(f"Error in perform_application_analysis: {e}")
        raise

def analyze_engagement(applicant: Dict[str, Any]) -> str:
    """Analyze engagement level based on activity. Never raises."""
    try:
        last_activity = applicant.get("last_activity_at")
        if not last_activity:
            return "low"

        # Calculate days since last activity
        now = datetime.now(timezone.utc)
        if isinstance(last_activity, str):
            last_activity = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
        elif not isinstance(last_activity, datetime):
            return "low"

        days_since_activity = (now - last_activity).days

        if days_since_activity <= 7:
            return "high"
        elif days_since_activity <= 14:
            return "medium"
        else:
            return "low"
    except Exception as e:
        logger.warning(f"Error analyzing engagement: {e}")
        return "unknown"

def identify_risk_factors(applicant: Dict[str, Any]) -> List[str]:
    """Identify risk factors for this applicant. Never raises."""
    try:
        risks = []

        conversion_prob = float(applicant.get("conversion_probability") or 0.0)
        lead_score = int(applicant.get("lead_score") or 0)
        last_activity = applicant.get("last_activity_at")

        if conversion_prob < 0.3:
            risks.append("Low conversion probability")

        if lead_score < 40:
            risks.append("Below average lead score")

        if last_activity:
            try:
                now = datetime.now(timezone.utc)
                if isinstance(last_activity, str):
                    last_activity = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))

                if isinstance(last_activity, datetime):
                    days_since_activity = (now - last_activity).days
                    if days_since_activity > 14:
                        risks.append("No recent activity")
            except Exception:
                pass

        return risks
    except Exception as e:
        logger.warning(f"Error identifying risk factors: {e}")
        return []

def identify_positive_indicators(applicant: Dict[str, Any]) -> List[str]:
    """Identify positive indicators. Never raises."""
    try:
        positives = []

        conversion_prob = float(applicant.get("conversion_probability") or 0.0)
        lead_score = int(applicant.get("lead_score") or 0)
        last_activity = applicant.get("last_activity_at")

        if conversion_prob > 0.7:
            positives.append("High conversion probability")

        if lead_score > 80:
            positives.append("Strong lead score")

        if last_activity:
            try:
                now = datetime.now(timezone.utc)
                if isinstance(last_activity, str):
                    last_activity = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))

                if isinstance(last_activity, datetime):
                    days_since_activity = (now - last_activity).days
                    if days_since_activity <= 7:
                        positives.append("Recent activity")
            except Exception:
                pass

        return positives
    except Exception as e:
        logger.warning(f"Error identifying positive indicators: {e}")
        return []

def generate_recommendations(applicant: Dict[str, Any], risk_factors: List[str], positives: List[str]) -> List[str]:
    """Generate personalized recommendations. Never raises."""
    try:
        recommendations = []

        if "Low conversion probability" in risk_factors:
            recommendations.append("Schedule personalized follow-up call")

        if "No recent activity" in risk_factors:
            recommendations.append("Send re-engagement email with program updates")

        if "Below average lead score" in risk_factors:
            recommendations.append("Invite to virtual campus tour or info session")

        if "High conversion probability" in positives:
            recommendations.append("Fast-track to next stage")

        if "Strong lead score" in positives:
            recommendations.append("Maintain current engagement level")

        if not recommendations:
            recommendations.append("Continue standard engagement process")

        return recommendations
    except Exception as e:
        logger.warning(f"Error generating recommendations: {e}")
        return ["Review application and plan next steps"]

def determine_next_steps(applicant: Dict[str, Any], current_stage: str, risk_factors: List[str]) -> List[str]:
    """Determine next steps based on current stage. Never raises."""
    try:
        next_steps = []

        if current_stage == "application_submitted":
            if risk_factors:
                next_steps.append("Review application completeness")
                next_steps.append("Schedule interview if required")
            else:
                next_steps.append("Proceed to interview stage")
        elif current_stage == "interview_scheduled":
            next_steps.append("Prepare interview questions")
            next_steps.append("Send interview confirmation")
        elif current_stage == "offer_pending":
            next_steps.append("Follow up on offer response")
            next_steps.append("Address any concerns")
        else:
            next_steps.append("Review current stage requirements")
            next_steps.append("Plan next engagement")

        return next_steps
    except Exception as e:
        logger.warning(f"Error determining next steps: {e}")
        return ["Review application", "Plan follow-up"]

def calculate_confidence(applicant: Dict[str, Any]) -> float:
    """Calculate confidence in the analysis. Never raises."""
    try:
        confidence = 0.5  # Base confidence

        if applicant.get("conversion_probability") is not None:
            confidence += 0.2
        if applicant.get("lead_score") is not None:
            confidence += 0.2
        if applicant.get("last_activity_at"):
            confidence += 0.1

        return min(0.95, confidence)
    except Exception as e:
        logger.warning(f"Error calculating confidence: {e}")
        return 0.5

async def generate_personalized_answer(
    applicant: Dict[str, Any],
    query: str,
    conversion_prob: float,
    lead_score: int,
    engagement_level: str,
    risk_factors: List[str],
    positive_indicators: List[str],
    recommended_actions: List[str],
    ml_explanation: Optional[str] = None
) -> str:
    """
    Generate AI-powered personalized answer.
    Uses runtime.narrate with correct signature.
    Falls back to structured template on error.
    """
    try:
        name = applicant.get('name', 'Unknown')
        stage = applicant.get('stage', 'unknown')
        programme = applicant.get('programme_name', 'unknown')

        # Build person context for narrate
        person_ctx = {
            "name": name,
            "status": stage,
            "courseInterest": programme,
            "conversion_probability": conversion_prob,
            "leadScore": lead_score,
            "ai_insights": {
                "engagement_level": engagement_level,
                "risk_factors": risk_factors,
                "positive_indicators": positive_indicators,
                "recommended_actions": recommended_actions,
                "ml_explanation": ml_explanation  # NEW: Include ML score explanation
            }
        }

        # Enhance query to ensure ML explanation is used when present
        enhanced_query = query
        if ml_explanation:
            # Add explicit instruction to use the ML explanation
            enhanced_query = f"{query}\n\nIMPORTANT: Include the ML score breakdown (ai_insights.ml_explanation) in your response to explain WHY the progression probability is what it is."

        # Call runtime narrate with correct signature
        # narrate(query, person, kb_sources, ui_ctx, intent) -> Dict with "text", "action", "sources"
        result = await runtime_narrate(
            query=enhanced_query,
            person=person_ctx,
            kb_sources=None,
            ui_ctx={"audience": "agent", "view": "applications"},
            intent="applications_analysis"
        )

        # Extract text from result
        if result and isinstance(result, dict) and "text" in result:
            return result["text"]
        else:
            logger.warning(f"Unexpected narrate result format: {result}")
            raise ValueError("Invalid narrate response")

    except Exception as e:
        logger.exception(f"AI generation failed: {e}")
        # Fallback to structured response
        fallback = f"""**{applicant.get('name', 'Unknown')}'s Application Analysis**

**Current Status:**
• Stage: {applicant.get('stage', 'unknown')}
• Programme: {applicant.get('programme_name', 'unknown')}
• Conversion Probability: {conversion_prob:.1%}
• Lead Score: {lead_score}/100
• Engagement Level: {engagement_level}
"""

        # Add ML explanation if available
        if ml_explanation:
            fallback += f"\n**Score Breakdown:**\n{ml_explanation}\n"

        fallback += f"""
**Risk Factors:** {', '.join(risk_factors) if risk_factors else 'None identified'}

**Positive Indicators:** {', '.join(positive_indicators) if positive_indicators else 'None identified'}

**Recommended Actions:**
{chr(10).join([f'• {action}' for action in recommended_actions]) if recommended_actions else '• Continue standard process'}
"""
        return fallback
