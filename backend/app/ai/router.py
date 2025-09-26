"""
AI Router - Multi-step orchestration for Ask Ivy
Routes queries to appropriate AI models and returns structured responses with actions
"""

from __future__ import annotations
import asyncio
import re
import uuid
import logging
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Import existing AI modules
from app.ai import ACTIVE_MODEL, OPENAI_API_KEY, OPENAI_MODEL, GEMINI_API_KEY, GEMINI_MODEL
from app.ai.triage import compute_rules_score, confidence_score, band_for
from app.ai.natural_language import interpret_natural_language_query, execute_lead_query
from app.routers.rag import query_rag, generate_person_profile, generate_suggestions_response
from app.routers.rag import SuggestionsQuery

# Import new narrator system
from app.ai.runtime import normalize_user_text, flash_parse_query, narrate, narrate_triage_bullets
from app.ai.prompts import IVY_SYSTEM_STYLE, SUGGESTIONS_JSON_SCHEMA, IVY_ORGANIC_SYSTEM_PROMPT
from app.ai.ivy_conversation_config import build_sampling_args
from app.ai.privacy_utils import safe_preview

# ───────────────────────── Intent Classification ─────────────────────────

INTENT_ORDER = [
    "update_property", "schedule", "lead_profile", "lead_info",
    "nba", "conversion_forecast", "attendance_willingness", "risk_check",
    "nlq_lead_query", "analytics", "course_info", "policy_info",
    "general_help", "unknown"
]

# Regex patterns for deterministic intent matching
INTENT_PATTERNS = {
    "lead_profile": [
        r"\btell me about\b", r"\bwho is\b", r"\bprofile\b", r"\bwhat do we know\b",
        r"\bsummar(y|ise)\b", r"\babout this person\b", r"\babout this lead\b"
    ],
    "lead_info": [
        r"\bwhat's the status\b", r"\bcontact details\b", r"\bwhen did they\b",
        r"\bhow many\b.*\bemails?\b", r"\blast activity\b", r"\bengagement\b"
    ],
    "nba": [
        r"\bwhat should i do\b", r"\bnext best action\b", r"\bhow to progress\b",
        r"\bwhat now\b", r"\bnext step\b", r"\bhow should i\b"
    ],
    "conversion_forecast": [
        r"\bchance to convert\b", r"\blikelihood\b", r"\bprobability\b",
        r"\bis this hot\b", r"\bis this warm\b", r"\bwill they convert\b",
        r"\bconversion chance\b", r"\bconvert\b"
    ],
    "call_action": [
        r"call\s+\w+", r"phone\s+\w+", r"\bcall\b", r"\bphone\b", r"\bring\b", r"\bcontact by phone\b",
        r"\"call\s+\w+\"", r"\"phone\s+\w+\"", r"'call\s+\w+'", r"'phone\s+\w+'"
    ],
    "email_action": [
        r"\"email\s+\w+\"", r"\"send\s+\w+\"", r"'email\s+\w+'", r"'send\s+\w+'",
        r"\bemail\b", r"\bsend email\b", r"\bwrite to\b", r"\bmessage\b"
    ],
    "schedule": [
        r"\bbook 1[- ]?1\b", r"\bschedule interview\b", r"\bset meeting\b",
        r"\barrange call\b", r"\bplan meeting\b", r"\bbook a meeting\b", 
        r"\bbook meeting\b", r"\bopen the meeting\b", r"\bopen meeting\b",
        r"\bmeeting\b", r"\bmeet\b", r"\bbook\b"
    ],
    "attendance_willingness": [
        r"\bshould i book\b", r"\bwilling to attend\b", r"\blikely to show\b"
    ],
    "risk_check": [
        r"\bred flags?\b", r"\brisky\b", r"\bconcerns?\b", r"\bwhy stalled\b",
        r"\bproblems?\b", r"\bissues?\b", r"\bworried\b"
    ],
    "update_property": [
        r"\bset status to\b", r"\bmark as\b", r"\bchange owner to\b",
        r"\badd note\b", r"\bupdate\b", r"\bedit\b", r"\bmodify\b"
    ],
    "nlq_lead_query": [
        r"\btop leads\b", r"\bhigh scoring\b", r"\bthis week\b", r"\bfrom ucas\b",
        r"\bstalled leads\b", r"\bshow me\b.*\bleads?\b", r"\bfind\b.*\bleads?\b"
    ],
    "analytics": [
        r"\btrends?\b", r"\banalytics\b", r"\bsegments?\b", r"\bpredictive\b",
        r"\bperformance\b", r"\bmetrics?\b", r"\binsights?\b"
    ],
    "course_info": [
        r"\bentry requirements\b", r"\bapel\b", r"\bvisa\b", r"\bportfolio\b",
        r"\bdeadline\b", r"\bapplication\b", r"\bcourse\b.*\binfo\b"
    ],
    "policy_info": [
        r"\bpolicy\b", r"\brules?\b", r"\bguidelines?\b", r"\bprocedures?\b",
        r"\bprocess\b", r"\bhow to\b"
    ],
    "cohort_analysis": [
        r"\bcohort\b", r"\bsegment\b", r"\bsimilar leads?\b", r"\bpeer analysis\b",
        r"\bgroup analysis\b", r"\bcompare to\b", r"\bperformance tier\b"
    ],
    "anomaly_detection": [
        r"\banomaly\b", r"\bunusual\b", r"\bstrange\b", r"\bdetect\b",
        r"\bflag\b", r"\bsuspicious\b", r"\boutlier\b", r"\bweird\b"
    ],
    "general_help": [
        r"\bexplain\b", r"\bhelp\b", r"\bwhat is\b", r"\bhow does\b",
        r"\bcan you\b", r"\bplease\b"
    ]
}

def classify_intent_regex(query: str, context: Dict[str, Any]) -> Tuple[Optional[str], float, Dict[str, Any]]:
    """Fast regex-based intent classification"""
    query_lower = query.lower().strip()
    
    # Check for lead-specific patterns first
    lead = context.get("lead", {})
    if lead and lead.get("name"):
        name = lead["name"].lower()
        if name in query_lower:
            # Only boost specific high-value intents when name is mentioned
            for intent, patterns in INTENT_PATTERNS.items():
                if intent in ["lead_profile", "nba", "conversion_forecast", "attendance_willingness", "risk_check", "cohort_analysis", "anomaly_detection", "call_action", "email_action", "schedule"]:
                    for pattern in patterns:
                        if re.search(pattern, query_lower, re.IGNORECASE):
                            return intent, 0.95, {"via": "regex", "name_mentioned": True}
    
    # General pattern matching with conflict resolution
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, query_lower, re.IGNORECASE):
                # Conflict resolution: check for overlapping intents
                if intent == "schedule":
                    if re.search(r"\b(call|phone)\b", query_lower): 
                        continue  # Skip schedule if call/phone mentioned
                    if re.search(r"\bemail\b", query_lower):
                        continue  # Skip schedule if email mentioned
                if intent == "analytics":
                    if re.search(r"\b(offer|make)\s+(them\s+)?(an?\s+)?offer\b", query_lower) or "offer a place" in query_lower:
                        continue  # Skip analytics if admissions decision mentioned
                
                confidence = 0.9 if intent in ["update_property", "schedule"] else 0.85
                return intent, confidence, {"via": "regex"}
    
    # Check for admissions decision queries (after other patterns to avoid conflicts)
    if re.search(r"\b(offer|make).*place\b", query_lower) or "offer a place" in query_lower:
        return "admissions_decision", 0.9, {"via": "regex"}
    
    return None, 0.0, {"via": "regex"}

async def classify_intent_llm(query: str, context: Dict[str, Any]) -> Tuple[str, float, Dict[str, Any]]:
    """LLM-based intent classification using existing RAG classifier"""
    try:
        from app.routers.rag import classify_intent as rag_classify_intent
        intent = await rag_classify_intent(query, context)
        return intent or "unknown", 0.86, {"via": "llm"}
    except Exception as e:
        return "unknown", 0.5, {"via": "llm", "error": str(e)}

# ───────────────────────── Request/Response Models ─────────────────────────

class RouterRequest(BaseModel):
    query: str
    context: Dict[str, Any] = {}
    ui_capabilities: List[str] = ["modals", "inline_edits", "toasts"]

class RouterResponse(BaseModel):
    intent: str
    confidence: float
    answer_markdown: str
    actions: List[Dict[str, Any]] = []
    sources: List[Dict[str, Any]] = []
    telemetry: Dict[str, Any] = {}
    session_id: str

# ───────────────────────── AI Router Class ─────────────────────────

class AIRouter:
    def __init__(self):
        self.session_id = str(uuid.uuid4())
    
    async def classify(self, query: str, context: Dict[str, Any]) -> Tuple[str, float, Dict[str, Any]]:
        """Classify query intent using regex first, then LLM fallback"""
        # 1. Try regex classification first (fast path)
        intent, confidence, meta = classify_intent_regex(query, context)
        if intent:
            return intent, confidence, meta
        
        # 2. Fall back to LLM classification
        return await classify_intent_llm(query, context)
    
    async def route(self, query: str, context: Dict[str, Any]) -> RouterResponse:
        """Main routing function - always returns a response"""
        
        # Early guard for untracked personal questions
        ql = (query or "").lower()
        personal_untracked = ["dog","cat","pet","married","boyfriend","girlfriend","religion","politics"]
        if any(w in ql for w in personal_untracked):
            from app.ai.text_sanitiser import cleanse_conversational
            return self._ok("personal_untracked", 0.9, cleanse_conversational(
                "We don't record personal details like that. Let's focus on the course fit, entry requirements, and the next sensible step."
            ))
        
        intent, confidence, meta = await self.classify(query, context)
        
        # Route to appropriate handler
        handler_map = {
            "update_property": self._handle_update_property,
            "schedule": self._handle_schedule,
            "call_action": self._handle_call_action,
            "email_action": self._handle_email_action,
            "lead_profile": self._handle_lead_profile,
            "lead_info": self._handle_lead_info,
            "nba": self._handle_nba,
            "conversion_forecast": self._handle_conversion_forecast,
            "attendance_willingness": self._handle_attendance_willingness,
            "risk_check": self._handle_risk_check,
            "cohort_analysis": self._handle_cohort_analysis,
            "anomaly_detection": self._handle_anomaly_detection,
            "nlq_lead_query": self._handle_nlq_lead_query,
            "analytics": self._handle_analytics,
            "admissions_decision": self._handle_admissions_decision,
            "course_info": self._handle_course_info,
            "policy_info": self._handle_policy_info,
            "general_help": self._handle_general_help,
            "unknown": self._handle_unknown
        }
        
        handler = handler_map.get(intent, self._handle_unknown)
        return await handler(query, context, intent, confidence, meta)
    
    # ───────────────────────── Handler Functions ─────────────────────────
    
    async def _handle_lead_profile(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle lead profile with person-first narration (organic style)."""
        try:
            lead = context.get("lead", {}) or {}
            facts = {
                "person": lead.get("name", "this lead"),
                "course": lead.get("courseInterest") or lead.get("latest_programme_name"),
                "status": lead.get("status") or lead.get("statusType"),
                "last_activity": lead.get("last_engagement_date"),
                "touchpoints": lead.get("touchpoint_count", 0),
                "source": lead.get("source"),
            }
            text = await narrate("lead-profile", facts)
            return self._ok(
                intent,
                max(confidence, 0.85),
                text,
                actions=[self._cta("View Full Profile", "view_profile")],
                telemetry={"routed_to": ["narrator_profile"]},
            )
        except Exception as e:
            return self._ok(
                intent,
                0.7,
                f"Profile information temporarily unavailable: {str(e)}",
                telemetry={"routed_to": ["profile"], "error": str(e)},
            )
    
    async def _handle_lead_info(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle lead information requests with intelligent LLM-powered responses"""
        try:
            # Early guard for untracked personal questions
            ql = (query or "").lower()
            personal_untracked = ["dog","cat","pet","married","boyfriend","girlfriend","religion","politics"]
            if any(w in ql for w in personal_untracked):
                from app.ai.text_sanitiser import cleanse_conversational
                return self._ok(intent, 0.9, cleanse_conversational(
                    "We don't record personal details like that. Let's focus on the course fit, entry requirements, and the next sensible step."
                ))
            
            lead = context.get("lead", {})
            if not lead:
                return self._ok(intent, 0.5, "I don't have any lead information to work with right now.",
                              telemetry={"routed_to": ["llm"], "error": "no_lead_context"})
            
            # Use the narrator system for progressive, human-like responses,
            # blending in a few KB titles for extra grounding
            try:
                # Build facts for the narrator
                facts = {
                    "query": query,
                    "person": lead.get('name', 'this lead'),
                    "email": lead.get('email', 'Not provided'),
                    "phone": lead.get('phone', 'Not provided'),
                    "course_interest": lead.get('courseInterest', 'Not specified'),
                    "academic_year": lead.get('latest_academic_year', 'Not specified'),
                    "status": lead.get('status', 'Unknown'),
                    "touchpoints": lead.get('touchpoint_count', 0),
                    "last_activity": lead.get('last_engagement_date', 'Unknown'),
                    "source": lead.get('source', 'Unknown'),
                    "next_action": lead.get('nextAction', 'Not specified')
                }
                
                # Try to fetch compact sources via RAG
                try:
                    from app.routers.rag import RagQuery, query_rag
                    rag_q = RagQuery(query=query, context=context, limit=3)
                    rag_resp = await query_rag(rag_q)
                    facts["kb_titles"] = [s.get("title") for s in (rag_resp.sources or [])][:3]
                except Exception:
                    facts["kb_titles"] = []

                # Use narrator for progressive language
                answer = await narrate("lead-info", facts)
                
                # Add gap detection if information is missing
                missing_info = []
                if not lead.get('courseInterest') and not lead.get('latest_programme_name'):
                    missing_info.append("course interest")
                if not lead.get('status'):
                    missing_info.append("current status")
                if not lead.get('last_engagement_date'):
                    missing_info.append("recent activity")
                
                if missing_info:
                    answer += f"\n\n**Gap:** We're missing {', '.join(missing_info)} - consider asking about these during your next conversation."
                
                actions = [self._cta("View Full Profile", "view_profile")]
                
                return self._ok(intent, 0.9, answer, actions=actions,
                              telemetry={"routed_to": ["narrator"]})
                
            except Exception as e:
                logger.error("Narrator processing failed, using fallback: %s", e)
                # Fallback to simple response
                answer = f"I don't have that specific detail about {lead.get('name', 'this lead')}, but I can share what I do know. "
                
                details = []
                if lead.get('courseInterest'):
                    details.append(f"they're interested in {lead.get('courseInterest')}")
                if lead.get('status'):
                    details.append(f"their current status is {lead.get('status').lower()}")
                if lead.get('touchpoint_count', 0) > 0:
                    details.append(f"we've had {lead.get('touchpoint_count')} interactions with them")
                if lead.get('last_engagement_date'):
                    last_date = lead.get('last_engagement_date', '')[:10]
                    details.append(f"they were last active on {last_date}")
                
                if details:
                    answer += f"{', '.join(details)}. "
                
                answer += f"Is there something specific you'd like to know about {lead.get('name', 'this lead')}?"
                
                actions = [self._cta("View Full Profile", "view_profile")]
                
                return self._ok(intent, 0.8, answer, actions=actions,
                              telemetry={"routed_to": ["fallback"]})
                
        except Exception as e:
            return self._ok(intent, 0.7, f"Lead information temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["llm"], "error": str(e)})
    
    async def _handle_admissions_decision(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle admissions decision queries safely"""
        try:
            from app.ai.text_sanitiser import cleanse_conversational
            answer = cleanse_conversational(
                "I can't make admission decisions here. Check eligibility against entry requirements and any APEL guidance, then log a recommendation for an admissions tutor to review."
            )
            return self._ok(intent, 0.9, answer, telemetry={"routed_to": ["admissions_decision"]})
        except Exception as e:
            return self._ok(intent, 0.7, f"Admissions guidance temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["admissions_decision"], "error": str(e)})
    
    async def _handle_nba(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle next best action requests using suggestions API"""
        try:
            lead = context.get("lead", {})
            suggestions_query = SuggestionsQuery(
                query=query,
                lead={
                    "id": lead.get("id", 0),
                    "name": lead.get("name", "Unknown"),
                    "email": lead.get("email"),
                    "phone": lead.get("phone"),
                    "status": lead.get("status"),
                    "statusType": lead.get("statusType"),
                    "nextAction": lead.get("nextAction"),
                    "followUpDate": lead.get("followUpDate"),
                    "courseInterest": lead.get("courseInterest"),
                    "latest_programme_name": lead.get("latest_programme_name"),
                    "latest_academic_year": lead.get("latest_academic_year"),
                    "source": lead.get("source"),
                    "campusPreference": lead.get("campusPreference"),
                    "last_engagement_date": lead.get("last_engagement_date"),
                    "touchpoint_count": lead.get("touchpoint_count", 0),
                    "gdpr_opt_in": lead.get("gdpr_opt_in", False),
                    "consent_status": lead.get("consent_status")
                }
            )
            suggestions = await generate_suggestions_response(suggestions_query)
            answer = "\n".join(suggestions.get("summary_bullets", ["No specific recommendations available."]))
            actions = []
            if suggestions.get("ui", {}).get("primary_cta"):
                actions.append(self._cta(suggestions["ui"]["primary_cta"]["label"], 
                                       suggestions["ui"]["primary_cta"]["action"]))
            return self._ok(intent, suggestions.get("confidence", confidence), answer,
                          actions=actions, telemetry={"routed_to": ["suggestions"]})
        except Exception as e:
            return self._ok(intent, 0.7, f"Next best action analysis temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["suggestions"], "error": str(e)})
    
    async def _handle_conversion_forecast(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle conversion forecasting using advanced ML models"""
        try:
            lead = context.get("lead", {})
            if not lead:
                return self._ok(intent, 0.5, "No lead context available for conversion forecasting.",
                              telemetry={"routed_to": ["forecast"], "error": "no_lead_context"})
            
            router_header = ""
            
            # Try advanced ML forecasting first
            try:
                from app.ai.forecast import forecast_leads, ForecastRequest, ForecastLead
                
                # Convert lead to ForecastLead format
                forecast_lead = ForecastLead(
                    id=str(lead.get("id", "unknown")),
                    last_activity_at=lead.get("last_engagement_date"),
                    source=lead.get("source", "unknown"),
                    has_email=bool(lead.get("email")),
                    has_phone=bool(lead.get("phone")),
                    gdpr_opt_in=lead.get("gdpr_opt_in", False),
                    course_declared=lead.get("courseInterest"),
                    degree_level=lead.get("latest_academic_year"),
                    engagement_data={
                        "email_opens": lead.get("email_opens", 0),
                        "email_clicks": lead.get("email_clicks", 0),
                        "website_visits": lead.get("website_visits", 0),
                        "call_duration": lead.get("call_duration", 0)
                    }
                )
                
                forecast_req = ForecastRequest(leads=[forecast_lead])
                forecast_response = await forecast_leads(forecast_req)
                
                if forecast_response.items:
                    item = forecast_response.items[0]
                    prob_pct = int(item.probability * 100)
                    eta_days = item.eta_days
                    drivers = item.drivers[:3]  # Top 3 drivers
                    risks = item.risks[:2]     # Top 2 risks
                    
                    answer = f"Based on the data, there's a **{prob_pct}% chance** they'll convert, likely within **{eta_days} days**.\n\n"
                    
                    if drivers:
                        answer += f"The main factors driving this are: {', '.join(drivers)}.\n\n"
                    
                    if risks:
                        answer += f"Keep an eye on: {', '.join(risks)}.\n\n"
                    
                    actions = []
                    if prob_pct >= 70:
                        actions.append(self._cta("Book 1-1 Meeting", "schedule_121"))
                    elif prob_pct >= 40:
                        actions.append(self._cta("Send Follow-up", "open_email"))
                    
                    return self._ok(intent, 0.95, answer, actions=actions,
                                  telemetry={"routed_to": ["advanced_ml_forecast"]})
                
            except Exception as ml_error:
                logger.error("Advanced ML forecast failed, falling back to triage: %s", ml_error)
            
            # Fallback to triage scoring
            from app.ai.triage import Lead, compute_rules_score, band_for
            lead_obj = Lead(
                id=str(lead.get("id", "unknown")),
                last_activity_at=lead.get("last_engagement_date"),
                source=lead.get("source", "unknown"),
                has_email=bool(lead.get("email")),
                has_phone=bool(lead.get("phone")),
                gdpr_opt_in=lead.get("gdpr_opt_in", False),
                course_declared=lead.get("courseInterest"),
                degree_level=lead.get("latest_academic_year"),
                engagement={
                    "email_opens": lead.get("email_opens", 0),
                    "email_clicks": lead.get("email_clicks", 0),
                    "website_visits": lead.get("website_visits", 0),
                    "call_duration": lead.get("call_duration", 0)
                }
            )
            
            triage_score, triage_details = compute_rules_score(lead_obj, {})
            band, action = band_for(triage_score)
            prob_pct = int(triage_score)
            
            answer = f"**{prob_pct}% conversion chance** - that puts them in the **{band}** category. I'd recommend **{action}**."
            
            actions = []
            if prob_pct >= 70:
                actions.append(self._cta("Book 1-1 Meeting", "schedule_121"))
            elif prob_pct >= 40:
                actions.append(self._cta("Send Follow-up", "open_email"))
            
            return self._ok(intent, 0.85, answer, actions=actions,
                          telemetry={"routed_to": ["triage_fallback"]})
            
        except Exception as e:
            return self._ok(intent, 0.7, f"Conversion forecasting temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["forecast"], "error": str(e)})
    
    async def _handle_attendance_willingness(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle attendance willingness assessment"""
        try:
            lead = context.get("lead", {})
            if not lead:
                return self._ok(intent, 0.5, "No lead context available for attendance assessment.",
                              telemetry={"routed_to": ["attendance"], "error": "no_lead_context"})
            
            # Use engagement data and recent activity
            last_activity = lead.get("last_engagement_date")
            touchpoint_count = lead.get("touchpoint_count", 0)
            status = lead.get("status", "unknown")
            
            router_header = ""
            if touchpoint_count > 3 and status in ["contacted", "qualified"]:
                answer = f"{router_header}**High likelihood** to attend a 1-1 this week based on strong engagement and recent activity."
                confidence = 0.88
            elif touchpoint_count > 1:
                answer = f"{router_header}**Moderate likelihood** to attend. Recent engagement suggests they're interested but may need a gentle nudge."
                confidence = 0.75
            else:
                answer = f"{router_header}**Low likelihood** based on limited engagement. Consider warming them up first with course information or a lighter touchpoint."
                confidence = 0.65
            
            actions = [self._cta("Book 1-1 Meeting", "open_meeting_scheduler")]
            if touchpoint_count <= 1:
                actions.append(self._cta("Send Course Info", "open_email_composer"))
            
            return self._ok(intent, confidence, answer, actions=actions,
                          telemetry={"routed_to": ["attendance"]})
        except Exception as e:
            return self._ok(intent, 0.7, f"Attendance assessment temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["attendance"], "error": str(e)})
    
    async def _handle_risk_check(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle risk assessment using triage scoring"""
        try:
            lead = context.get("lead", {})
            if not lead:
                return self._ok(intent, 0.5, "No lead context available for risk assessment.",
                              telemetry={"routed_to": ["risk"], "error": "no_lead_context"})
            
            # Use triage scoring for risk assessment
            # Convert lead dict to Lead object for triage functions
            from app.ai.triage import Lead
            lead_obj = Lead(
                id=str(lead.get("id", "unknown")),
                last_activity_at=lead.get("last_engagement_date"),
                source=lead.get("source", "unknown"),
                has_email=bool(lead.get("email")),
                has_phone=bool(lead.get("phone")),
                gdpr_opt_in=lead.get("gdpr_opt_in", False),
                course_declared=lead.get("courseInterest"),
                degree_level=lead.get("latest_academic_year"),
                engagement={
                    "email_opens": lead.get("email_opens", 0),
                    "email_clicks": lead.get("email_clicks", 0),
                    "website_visits": lead.get("website_visits", 0),
                    "call_duration": lead.get("call_duration", 0)
                }
            )
            
            triage_score, triage_details = compute_rules_score(lead_obj, {})
            conf_score = confidence_score(lead_obj)
            
            # Simple risk assessment based on score and confidence
            router_header = ""
            if triage_score < 30 or conf_score < 0.5:
                answer = f"This looks like a **high-risk** situation (score: {int(triage_score)}/100). They've got low engagement and we don't have much data on them. I'd suggest a re-engagement strategy."
                actions = [self._cta("Send Nudge Email", "open_email_composer"), self._cta("Review Lead", "view_profile")]
            elif triage_score < 60:
                answer = f"**Medium risk** here (score: {int(triage_score)}/100). Their engagement is moderate - they might need some extra nurturing to keep them interested."
                actions = [self._cta("Send Follow-up", "open_email_composer")]
            else:
                answer = f"**Low risk** - they're scoring {int(triage_score)}/100 with good engagement patterns. Keep doing what you're doing."
                actions = [self._chip("Continue current approach")]
            
            return self._ok(intent, 0.84, answer, actions=actions,
                          telemetry={"routed_to": ["triage"]})
        except Exception as e:
            return self._ok(intent, 0.7, f"Risk assessment temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["risk"], "error": str(e)})
    
    async def _handle_update_property(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle property updates with safety checks"""
        try:
            mutation = self._extract_mutation(query)
            if not mutation:
                return self._ok(intent, 0.5, "Could not understand what to update. Please be more specific (e.g., 'set status to pre-applicant').",
                              telemetry={"routed_to": ["update"], "error": "no_mutation"})
            
            # Safety whitelist for allowed properties
            allowed_properties = ["statusType", "owner", "courseInterest", "followUpDate", "notes", "priority"]
            if mutation["path"] not in allowed_properties:
                return self._ok(intent, 0.8, f"Property '{mutation['path']}' requires confirmation. Please confirm this update.",
                              actions=[{"type": "CONFIRM_UPDATE", "mutation": mutation}],
                              telemetry={"routed_to": ["update"], "requires_confirmation": True})
            
            answer = f"Will update **{mutation['path']}** → **{mutation['value']}**"
            actions = [
                {"type": "UPDATE_PROPERTY", **mutation},
                {"type": "TOAST", "variant": "success", "text": "Property updated successfully"}
            ]
            
            return self._ok(intent, 0.95, answer, actions=actions,
                          telemetry={"routed_to": ["update"]})
        except Exception as e:
            return self._ok(intent, 0.7, f"Property update temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["update"], "error": str(e)})
    
    async def _handle_schedule(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle scheduling requests"""
        lead = context.get("lead", {})
        if not lead:
            return self._ok(intent, 0.5, "No lead context available for scheduling.",
                          telemetry={"routed_to": ["schedule"], "error": "no_lead_context"})
        
        name = lead.get("name", "this lead")
        answer = f"Opening meeting scheduler for {name}..."
        
        actions = [{"label": "Book Meeting", "action": "open_meeting_scheduler"}]
        
        return self._ok(intent, 0.92, answer, actions=actions,
                      telemetry={"routed_to": ["schedule"]})
    
    async def _handle_nlq_lead_query(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle natural language queries for lead lists"""
        try:
            interpretation = interpret_natural_language_query(query)
            rows = await execute_lead_query(interpretation["query_type"], interpretation["parameters"], limit=25)
            answer = f"Found **{len(rows)} leads** • {interpretation['description']}"
            return self._ok(intent, interpretation["confidence"], answer,
                          telemetry={"routed_to": ["nlq"]})
        except Exception as e:
            return self._ok(intent, 0.7, f"Lead query temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["nlq"], "error": str(e)})
    
    async def _handle_analytics(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle analytics requests"""
        answer = "Analytics dashboard ready with trends, segments, and predictive insights."
        actions = [self._cta("Open Analytics", "open_analytics_panel")]
        return self._ok(intent, 0.85, answer, actions=actions,
                      telemetry={"routed_to": ["analytics"]})
    
    async def _handle_course_info(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle course information requests using RAG"""
        try:
            from app.routers.rag import RagQuery
            cats = None
            ql = (query or "").lower()
            if "apel" in ql:
                cats = ["APEL", "policy", "entry_requirements"]
            rag_query = RagQuery(query=query, context=context, limit=5, categories=cats)
            rag_response = await query_rag(rag_query)
            # Limit and compact sources per organic pack
            raw_sources = getattr(rag_response, "sources", []) or []
            sources = []
            for s in raw_sources[:4]:
                sources.append({
                    "title": s.get("title", "")[:120],
                    "document_type": s.get("document_type"),
                    "category": s.get("category"),
                    "similarity_score": float(s.get("similarity_score", 0.0)),
                    "preview": (s.get("preview") or s.get("content") or "")[:200],
                })
            return self._ok(
                intent,
                getattr(rag_response, "confidence", confidence),
                getattr(rag_response, "answer", "Course information not found"),
                sources=sources,
                telemetry={"routed_to": ["rag"]},
            )
        except Exception as e:
            return self._ok(intent, 0.7, f"Course information temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["rag"], "error": str(e)})
    
    async def _handle_policy_info(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle policy information requests using RAG"""
        try:
            from app.routers.rag import RagQuery
            rag_query = RagQuery(query=query, context=context, limit=5)
            rag_response = await query_rag(rag_query)
            raw_sources = getattr(rag_response, "sources", []) or []
            sources = []
            for s in raw_sources[:4]:
                sources.append({
                    "title": s.get("title", "")[:120],
                    "document_type": s.get("document_type"),
                    "category": s.get("category"),
                    "similarity_score": float(s.get("similarity_score", 0.0)),
                    "preview": (s.get("preview") or s.get("content") or "")[:200],
                })
            return self._ok(
                intent,
                getattr(rag_response, "confidence", confidence),
                getattr(rag_response, "answer", "Policy information not found"),
                sources=sources,
                telemetry={"routed_to": ["rag"]},
            )
        except Exception as e:
            return self._ok(intent, 0.7, f"Policy information temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["rag"], "error": str(e)})
    
    async def _handle_general_help(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle general help requests with short LLM response"""
        try:
            # Minimal context pass with safe preview, organic prompt, and sampling
            try:
                lead_preview = safe_preview(context.get("lead", {})) if context else {}
            except Exception:
                lead_preview = {}
            sampling = build_sampling_args()
            from app.ai.safe_llm import LLMCtx
            llm = LLMCtx(temperature=sampling.get("temperature", 0.7))
            messages = [
                ("system", IVY_ORGANIC_SYSTEM_PROMPT),
                ("human", f"User: {query}\n\nContext (preview): {lead_preview}")
            ]
            answer = await llm.ainvoke(messages)
            return self._ok(intent, 0.7, answer,
                          telemetry={"routed_to": ["llm_general"]})
        except Exception as e:
            return self._ok(intent, 0.5, f"Help temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["llm_general"], "error": str(e)})
    
    async def _handle_unknown(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Final fallback - always returns something"""
        try:
            # Try to use better fallback functions first
            lead_ctx = {"lead": context.get("lead")} if context else {}
            
            # Check if this looks like a profile query
            if any(pattern in query.lower() for pattern in ["tell me about", "who is", "profile", "about this person", "about this lead"]):
                from app.routers.rag import generate_person_profile
                answer = await generate_person_profile(query, lead_ctx)
                return self._ok("lead_profile", 0.6, answer,
                              actions=[{"label": "View Full Profile", "action": "view_profile"}],
                              telemetry={"routed_to": ["fallback_profile"]})
            
            # Check if this looks like a lead info query
            elif any(pattern in query.lower() for pattern in ["what's the status", "contact details", "when did they", "how many", "last activity", "engagement"]):
                from app.routers.rag import generate_person_answer
                answer = await generate_person_answer(query, [], lead_ctx)
                return self._ok("lead_info", 0.6, answer,
                              actions=[{"label": "View Full Profile", "action": "view_profile"}],
                              telemetry={"routed_to": ["fallback_info"]})
            
            # Fall back to LLM for general queries
            answer = await self._llm_short_answer(query, context)
            note = "_This answer isn't grounded to your knowledge base; refine or ask to search._"
            return self._ok("unknown", 0.55, f"{answer}\n\n{note}",
                          telemetry={"routed_to": ["llm_fallback"]})
        except Exception as e:
            # Ultimate fallback
            return self._ok("unknown", 0.3, 
                          "I'm having trouble processing that request right now. Try asking about a specific lead, or ask for help with common tasks like 'book a meeting' or 'tell me about this lead'.",
                          actions=[
                              self._chip("Book Meeting"),
                              self._chip("View Lead Profile"),
                              self._chip("Get Help")
                          ],
                          telemetry={"routed_to": ["fallback"], "error": str(e)})
    
    async def _handle_cohort_analysis(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle cohort analysis using advanced ML models"""
        try:
            lead = context.get("lead", {})
            if not lead:
                return self._ok(intent, 0.5, "No lead context available for cohort analysis.",
                              telemetry={"routed_to": ["cohort"], "error": "no_lead_context"})
            
            router_header = ""
            
            try:
                from app.ai.cohort_scoring import analyze_cohort_scoring, CohortScoringRequest
                
                # Prepare lead features for cohort analysis
                lead_features = {
                    "source": lead.get("source", "unknown"),
                    "course_interest": lead.get("courseInterest", ""),
                    "academic_year": lead.get("latest_academic_year", ""),
                    "campus_preference": lead.get("campusPreference", ""),
                    "has_email": bool(lead.get("email")),
                    "has_phone": bool(lead.get("phone")),
                    "gdpr_opt_in": lead.get("gdpr_opt_in", False),
                    "engagement_score": lead.get("touchpoint_count", 0),
                    "last_activity_days": 0  # Would need to calculate from last_engagement_date
                }
                
                cohort_req = CohortScoringRequest(
                    lead_id=str(lead.get("id", "unknown")),
                    lead_features=lead_features,
                    include_performance_comparison=True,
                    include_optimization_strategies=True
                )
                
                cohort_response = await analyze_cohort_scoring(cohort_req)
                
                answer = f"{router_header}**Cohort Analysis for {lead.get('name', 'this lead')}:**\n\n"
                answer += f"**Primary Cohort:** {cohort_response.primary_cohort.cohort_name}\n"
                answer += f"**Cohort Size:** {cohort_response.primary_cohort.size} leads\n"
                answer += f"**Conversion Rate:** {cohort_response.primary_cohort.conversion_rate:.1%}\n"
                answer += f"**Performance Tier:** {cohort_response.primary_cohort.performance_tier}\n\n"
                
                if cohort_response.primary_cohort.key_drivers:
                    answer += f"**Key Drivers:**\n"
                    for driver in cohort_response.primary_cohort.key_drivers[:3]:
                        answer += f"• {driver}\n"
                    answer += "\n"
                
                if cohort_response.optimization_strategies:
                    answer += f"**Optimization Strategies:**\n"
                    for strategy in cohort_response.optimization_strategies[:2]:
                        answer += f"• {strategy.strategy_type}: {strategy.description}\n"
                    answer += "\n"
                
                actions = [self._cta("View Detailed Analysis", "open_ai_analysis")]
                
                return self._ok(intent, 0.9, answer, actions=actions,
                              telemetry={"routed_to": ["cohort_analysis"]})
                
            except Exception as cohort_error:
                logger.error("Cohort analysis failed: %s", cohort_error)
                return self._ok(intent, 0.7, f"{router_header}Cohort analysis temporarily unavailable. Using basic lead insights instead.",
                              telemetry={"routed_to": ["cohort"], "error": str(cohort_error)})
                
        except Exception as e:
            return self._ok(intent, 0.7, f"Cohort analysis temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["cohort"], "error": str(e)})
    
    async def _handle_anomaly_detection(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle anomaly detection using advanced ML models"""
        try:
            lead = context.get("lead", {})
            if not lead:
                return self._ok(intent, 0.5, "No lead context available for anomaly detection.",
                              telemetry={"routed_to": ["anomaly"], "error": "no_lead_context"})
            
            router_header = ""
            
            try:
                from app.ai.anomaly_detection import detect_anomalies, AnomalyRequest
                
                anomaly_req = AnomalyRequest(
                    lead_id=str(lead.get("id", "unknown")),
                    engagement_data={
                        "email_opens": lead.get("email_opens", 0),
                        "email_clicks": lead.get("email_clicks", 0),
                        "website_visits": lead.get("website_visits", 0),
                        "call_duration": lead.get("call_duration", 0),
                        "touchpoint_count": lead.get("touchpoint_count", 0)
                    },
                    lead_data={
                        "source": lead.get("source", "unknown"),
                        "course_interest": lead.get("courseInterest", ""),
                        "academic_year": lead.get("latest_academic_year", ""),
                        "created_date": lead.get("createdAt", ""),
                        "last_activity": lead.get("last_engagement_date", "")
                    },
                    source_data={
                        "source": lead.get("source", "unknown"),
                        "referrer": lead.get("referrer", ""),
                        "campaign": lead.get("campaign", "")
                    },
                    time_period_days=30
                )
                
                anomalies = detect_anomalies(
                    anomaly_req.lead_id,
                    anomaly_req.engagement_data,
                    anomaly_req.lead_data,
                    anomaly_req.source_data
                )
                
                if anomalies:
                    answer = f"{router_header}**Anomaly Detection Results:**\n\n"
                    answer += f"**{len(anomalies)} anomaly(ies) detected**\n\n"
                    
                    for anomaly in anomalies[:3]:  # Show top 3
                        severity_emoji = {"low": "🟡", "medium": "🟠", "high": "🔴", "critical": "🚨"}.get(anomaly.severity, "⚪")
                        answer += f"{severity_emoji} **{anomaly.anomaly_type.replace('_', ' ').title()}** ({anomaly.severity})\n"
                        answer += f"   {anomaly.description}\n"
                        answer += f"   Risk Score: {anomaly.risk_score:.1f}/100\n\n"
                    
                    if anomalies[0].recommendations:
                        answer += f"**Recommendations:**\n"
                        for rec in anomalies[0].recommendations[:2]:
                            answer += f"• {rec}\n"
                        answer += "\n"
                    
                    actions = [self._cta("Investigate Anomalies", "open_ai_analysis")]
                else:
                    answer = f"{router_header}**No anomalies detected** - Lead shows normal engagement patterns and data quality."
                    actions = [self._chip("Continue monitoring")]
                
                return self._ok(intent, 0.9, answer, actions=actions,
                              telemetry={"routed_to": ["anomaly_detection"]})
                
            except Exception as anomaly_error:
                logger.error("Anomaly detection failed: %s", anomaly_error)
                return self._ok(intent, 0.7, f"{router_header}Anomaly detection temporarily unavailable.",
                              telemetry={"routed_to": ["anomaly"], "error": str(anomaly_error)})
                
        except Exception as e:
            return self._ok(intent, 0.7, f"Anomaly detection temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["anomaly"], "error": str(e)})

    # ───────────────────────── Helper Functions ─────────────────────────
    
    def _ok(self, intent: str, confidence: float, answer: str, actions: List[Dict[str, Any]] = None, 
            sources: List[Dict[str, Any]] = None, telemetry: Dict[str, Any] = None) -> RouterResponse:
        """Create standardised response"""
        return RouterResponse(
            intent=intent,
            confidence=confidence,
            answer_markdown=answer,
            actions=actions or [],
            sources=sources or [],
            telemetry=telemetry or {},
            session_id=self.session_id
        )
    
    def _cta(self, label: str, action: str) -> Dict[str, Any]:
        """Create call-to-action button"""
        return {"type": "CTA", "label": label, "action": action}
    
    def _chip(self, label: str) -> Dict[str, Any]:
        """Create chip/tag element"""
        return {"type": "CHIP", "label": label}
    
    def _extract_mutation(self, query: str) -> Optional[Dict[str, Any]]:
        """Extract property update from natural language with hardened patterns"""
        import re
        from datetime import datetime
        
        # Safe patterns with strict validation
        SAFE_PATTERNS = [
            (r"\bset status to ([A-Za-z_-]{2,30})\b", "statusType"),
            (r"\bmark as ([A-Za-z_-]{2,30})\b", "statusType"),
            (r"\bchange owner to ([A-Za-z0-9._-]{2,64})\b", "owner"),
            (r"\badd note:\s*(.{1,280})$", "notes"),
            (r"\bset priority to (low|medium|high|urgent)\b", "priority"),
            (r"\bupdate course to ([A-Za-z0-9 &()/+\-]{2,80})\b", "courseInterest"),
            (r"\b(academic year) to (\d{4}/\d{2})\b", "latest_academic_year"),
            (r"\b(date of birth|dob|birth date) to ((\d{2}/\d{2}/\d{4})|(\d{4}-\d{2}-\d{2}))\b", "date_of_birth"),
        ]
        
        def _valid_date(s: str) -> bool:
            for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
                try:
                    datetime.strptime(s, fmt)
                    return True
                except ValueError:
                    pass
            return False
        
        q = query.strip().lower()
        for pat, prop in SAFE_PATTERNS:
            m = re.search(pat, q)
            if m:
                val = (m.group(2) if prop in ("latest_academic_year","date_of_birth") else m.group(1)).strip()
                if prop == "date_of_birth" and not _valid_date(val): 
                    continue
                return {"path": prop, "value": val}
        return None
    
    async def _llm_short_answer(self, query: str, context: Dict[str, Any]) -> str:
        """Generate short LLM answer for general queries"""
        try:
            from app.ai.safe_llm import LLMCtx
            prompt = f"Briefly answer this question about UK higher education admissions (max 2 sentences): {query}"
            llm = LLMCtx(temperature=0.3)
            out = await llm.ainvoke(prompt)
            return out or "AI assistance temporarily unavailable."
        except Exception as e:
            return f"Unable to generate response: {str(e)}"

    async def _handle_call_action(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle call action requests - opens call console"""
        try:
            lead = context.get("lead", {})
            if not lead:
                return self._ok(intent, 0.5, "No lead context available for calling.",
                              telemetry={"routed_to": ["call_action"], "error": "no_lead_context"})
            
            name = lead.get("name", "this lead")
            answer = f"Opening call console for {name}..."
            
            actions = [self._cta("Open Call Console", "open_call_console")]
            
            return self._ok(intent, 0.9, answer, actions=actions,
                          telemetry={"routed_to": ["call_action"]})
        except Exception as e:
            return self._ok(intent, 0.7, f"Call action temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["call_action"], "error": str(e)})
    
    async def _handle_email_action(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle email action requests - opens email composer"""
        try:
            lead = context.get("lead", {})
            if not lead:
                return self._ok(intent, 0.5, "No lead context available for emailing.",
                              telemetry={"routed_to": ["email_action"], "error": "no_lead_context"})
            
            name = lead.get("name", "this lead")
            answer = f"Opening email composer for {name}..."
            
            actions = [self._cta("Open Email Composer", "open_email_composer")]
            
            return self._ok(intent, 0.9, answer, actions=actions,
                          telemetry={"routed_to": ["email_action"]})
        except Exception as e:
            return self._ok(intent, 0.7, f"Email action temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["email_action"], "error": str(e)})

# ───────────────────────── Router Instance ─────────────────────────

router_instance = AIRouter()
