"""
AI Router - Multi-step orchestration for Ask Ivy
Routes queries to appropriate AI models and returns structured responses with actions
"""

from __future__ import annotations
import asyncio
import os
import re
import uuid
import logging
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from pydantic import BaseModel

# Import the narrate function
from app.ai.runtime import narrate

logger = logging.getLogger(__name__)

# Stage timeout constants to prevent long tails
NARRATE_TIMEOUT_S = 2.5
SUGGESTIONS_TIMEOUT_S = 2.0
RAG_TIMEOUT_S = 1.5

async def _with_timeout(coro, timeout_secs, fallback):
    """Execute coroutine with timeout, return fallback on timeout or cancellation"""
    try:
        return await asyncio.wait_for(coro, timeout=timeout_secs)
    except asyncio.TimeoutError:
        logger.warning(f"Operation timed out after {timeout_secs}s, using fallback")
        return fallback
    except asyncio.CancelledError:
        logger.warning(f"Operation was cancelled after {timeout_secs}s, using fallback")
        return fallback

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
from app.ai.content_rewriter import rewrite_answer, validate_contract_compliance, guarded_retry_with_constraints
from app.ai.ui_models import ContentContract

def _friendly_status(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    lowered = str(value).strip().lower()
    mapping = {
        "lead": "enquirer",
        "prospect": "applicant",
    }
    return mapping.get(lowered, value)


def normalize_apel_query(query: str, context: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """
    Normalize APEL queries to prevent semantic misunderstandings.
    Returns (normalized_query, updated_context)
    """
    if not query:
        return query, context
    
    # Common APEL misinterpretations
    apel_patterns = [
        (r'\b(\w+)\s+apel\b', r'\1 APEL qualifications'),
        (r'\bapel\s+(\w+)\b', r'APEL qualifications for \1'),
    ]
    
    normalized_query = query
    disambiguation_notes = {}
    
    # Check for "is [name] apel?" pattern - be more aggressive
    name_apel_match = re.search(r'\bis\s+(\w+)\s+apel\?', query, re.IGNORECASE)
    if name_apel_match:
        name = name_apel_match.group(1)
        normalized_query = re.sub(r'\bis\s+\w+\s+apel\?', 'does this person have APEL qualifications?', query, flags=re.IGNORECASE)
        disambiguation_notes['apel_clarification'] = f"Interpreted '{name} apel' as APEL qualifications, not person name"
        # Force APEL mode
        disambiguation_notes['force_apel_mode'] = True
    
    # Also check for "does [name] have apel?" pattern
    has_apel_match = re.search(r'\bdoes\s+(\w+)\s+have\s+apel\?', query, re.IGNORECASE)
    if has_apel_match:
        name = has_apel_match.group(1)
        normalized_query = re.sub(r'\bdoes\s+\w+\s+have\s+apel\?', 'does this person have APEL qualifications?', query, flags=re.IGNORECASE)
        disambiguation_notes['apel_clarification'] = f"Interpreted '{name} has apel' as APEL qualifications, not person name"
    
    # Check for "[name] and apel" pattern
    name_and_apel_match = re.search(r'\b(\w+)\s+and\s+apel\b', query, re.IGNORECASE)
    if name_and_apel_match:
        name = name_and_apel_match.group(1)
        normalized_query = re.sub(r'\b\w+\s+and\s+apel\b', 'APEL qualifications for this person', query, flags=re.IGNORECASE)
        disambiguation_notes['apel_clarification'] = f"Interpreted '{name} and apel' as APEL qualifications, not person name"
    
    # Check for "tell [name] about APEL" pattern
    tell_apel_match = re.search(r'\btell\s+(\w+)\s+about\s+apel\b', query, re.IGNORECASE)
    if tell_apel_match:
        name = tell_apel_match.group(1)
        normalized_query = re.sub(r'\btell\s+\w+\s+about\s+apel\b', 'APEL qualifications guidance for this person', query, flags=re.IGNORECASE)
        disambiguation_notes['apel_clarification'] = f"Interpreted 'tell {name} about APEL' as APEL qualifications guidance, not person name"
    
    # Check for "is [name] an APEL applicant?" pattern
    apel_applicant_match = re.search(r'\bis\s+(\w+)\s+an\s+apel\s+applicant\?', query, re.IGNORECASE)
    if apel_applicant_match:
        name = apel_applicant_match.group(1)
        normalized_query = re.sub(r'\bis\s+\w+\s+an\s+apel\s+applicant\?', 'does this person have APEL qualifications?', query, flags=re.IGNORECASE)
        disambiguation_notes['apel_clarification'] = f"Interpreted '{name} APEL applicant' as APEL qualifications, not person name"
        disambiguation_notes['force_apel_mode'] = True
    
    # Check for other APEL patterns
    for pattern, replacement in apel_patterns:
        if re.search(pattern, query, re.IGNORECASE):
            normalized_query = re.sub(pattern, replacement, query, flags=re.IGNORECASE)
            disambiguation_notes['apel_normalized'] = True
    
    # Update context with disambiguation notes
    if disambiguation_notes:
        context = context.copy()
        context['disambiguation_notes'] = disambiguation_notes
    
    return normalized_query, context

# ───────────────────────── Intent Classification ─────────────────────────

INTENT_ORDER = [
    "update_property", "schedule", "lead_profile", "lead_info",
    "nba", "guidance", "conversion_forecast", "attendance_willingness", "risk_check",
    "nlq_lead_query", "analytics", "course_info", "policy_info",
    "general_help", "unknown"
]

# Regex patterns for deterministic intent matching
INTENT_PATTERNS = {
    "lead_profile": [
        r"\bwho is\b", r"\bprofile\b", r"\bwhat do we know\b",
        r"\bsummar(y|ise)\b", r"\babout this person\b", r"\babout this lead\b"
    ],
    "lead_info": [
        r"\bwhat's the status\b", r"\bcontact details\b", r"\bwhen did they\b",
        r"\bhow many\b.*\bemails?\b", r"\blast activity\b", r"\bengagement\b"
    ],
    "nba": [
        r"\bwhat should i do\b", r"\bnext best action\b", r"\bhow to progress\b",
        r"\bwhat now\b", r"\bnext step\b", r"\bhow should i\b", r"\bwhat should we do\b",
        r"\bwhat should we do next\b", r"\bnext steps\b", r"\bwhat's next\b"
    ],
    "guidance": [
        r"\bwhat should i say\b", r"\bwhat should i ask\b", r"\bhow should i approach\b",
        r"\bwhat should we say\b", r"\bwhat should we ask\b", r"\bhow should we reply\b",
        r"\bwhat to say\b", r"\bwhat to ask\b", r"\bsuggest\b.*\bscript\b",
        r"\bwrite.*script\b", r"\bwrite.*calling script\b", r"\bcalling script\b",
        r"\bquick checklist\b", r"\bsummarise.*interaction\b",
        r"\bneed guidance on what to say\b", r"\bguidance on.*approach\b",
        r"\bscript.*methodology\b", r"\bchallenger.*methodology\b",
        # Challenger Sales methodology patterns
        r"\bcommercial teaching\b", r"\bteach phase\b", r"\btailor phase\b", r"\btake control\b",
        r"\bindustry insight\b", r"\bmarket trend\b", r"\bcareer outcome\b", r"\bgraduate success\b",
        r"\bdiscovery questions\b", r"\bconsultative selling\b", r"\bsales methodology\b",
        # Objection handling patterns
        r"\bcompetitor\b", r"\bother university\b", r"\bother course\b", r"\belsewhere\b",
        r"\banother (uni|university|college)\b", r"\bgo(ing)? somewhere else\b", r"\bconsider(ing)? other options\b",
        r"\bafford\b", r"\bcost\b", r"\bexpensive\b", r"\bcheaper\b",
        r"\bworthwhile\b", r"\bnot worth\b", r"\bworth it\b",
        r"\bmum thinks\b", r"\bparent.*thinks\b", r"\bfamily.*thinks\b",
        r"\bthinking.*studying.*elsewhere\b", r"\bstudying.*somewhere.*else\b",
        r"\bgoing.*competitor\b", r"\bconsidering.*other\b", r"\bcompare.*options\b",
        r"\bwhy should.*study.*here\b", r"\bconvince.*stay\b", r"\bpersuade\b", r"\bconvince\b",
        # Approach/variety patterns
        r"\bvariety\b", r"\bapproach(es)?\b", r"\btalking points\b"
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
        r"\bemail\b", r"\bsend email\b", r"\bwrite to\b", r"\bmessage\b",
        r"\bwrite to them\b", r"\bwrite about\b", r"\bsend about\b", r"\bemail about\b"
    ],
    "schedule": [
        r"\bbook 1[- ]?1\b", r"\bschedule interview\b", r"\bset meeting\b",
        r"\bschedule a call\b", r"\bbook a call\b", r"\bschedule.*call.*for\b", r"\bbook.*call.*for\b",
        r"\barrange call\b", r"\bplan meeting\b", r"\bbook a meeting\b", 
        r"\bbook meeting\b", r"\bopen the meeting\b", r"\bopen meeting\b",
        r"\bmeeting\b", r"\bmeet\b", r"\bbook\b"
    ],
    "attendance_willingness": [
        r"\bshould i book\b", r"\bwilling to attend\b", r"\blikely to show\b"
    ],
    "risk_check": [
        r"\bred flags?\b", r"\brisks?\b", r"\brisky\b", r"\bconcerns?\b", r"\bwhy stalled\b",
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
        r"\bentry requirements\b", r"\bvisa\b", r"\bportfolio\b",
        r"\bdeadline\b", r"\bapplication\b", r"\bcourse\b.*\binfo\b",
        r"\btransfer credits?\b", r"\bcredit transfer\b"
    ],
    "policy_info": [
        r"\bpolic(y|ies)\b", r"\brules?\b", r"\bguidelines?\b", r"\bprocedures?\b",
        r"\bprocess\b", r"\bhow to\b", r"\bapel\b", r"\bchecklist\b",
        r"\bgdpr\b", r"\bconsent\b", r"\bdata protection\b", r"\bprivacy\b",
        r"\btell me about.*polic", r"\bwhat.*polic", r"\bexplain.*polic"
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
    query_lower = str(query).lower().strip()
    
    # Check for lead-specific patterns first
    lead = context.get("lead", {})
    if lead and lead.get("name"):
        name = str(lead["name"]).lower()
        if name in query_lower:
            # Only boost specific high-value intents when name is mentioned
            for intent, patterns in INTENT_PATTERNS.items():
                if intent in ["lead_profile", "nba", "guidance", "conversion_forecast", "attendance_willingness", "risk_check", "cohort_analysis", "anomaly_detection", "call_action", "email_action", "schedule", "policy_info"]:
                    for pattern in patterns:
                        if re.search(pattern, query_lower, re.IGNORECASE):
                            return intent, 0.95, {"via": "regex", "name_mentioned": True}
    
    # Check for APEL queries FIRST (highest priority for policy_info)
    if re.search(r"\bapel\b", query_lower) or "prior learning" in query_lower or "accreditation.*prior.*experiential" in query_lower:
        return "policy_info", 0.95, {"via": "regex", "apel_detected": True}
    
    # Check for admissions decision queries (high priority)
    if (re.search(r"\b(offer|make).*place.*(course|programme|degree)\b", query_lower) or 
        "offer a place" in query_lower or
        re.search(r"\b(make|can you make).*offer\b", query_lower) or
        re.search(r"\bshould we offer\b", query_lower)):
        return "admissions_decision", 0.9, {"via": "regex"}
    
    # Check for action intents FIRST (high priority to avoid conflicts with guidance/nba)
    # Order matters: schedule > email_action > call_action to avoid conflicts
    for intent in ["schedule", "email_action", "call_action"]:
        if intent in INTENT_PATTERNS:
            for pattern in INTENT_PATTERNS[intent]:
                if re.search(pattern, query_lower, re.IGNORECASE):
                    # Additional conflict resolution for action intents
                    if intent == "schedule" and re.search(r"\b(call|phone)\b", query_lower):
                        # If schedule pattern matches but "call" is mentioned, it's likely a meeting scheduler request
                        return intent, 0.95, {"via": "action_regex"}
                    elif intent == "call_action" and re.search(r"\b(schedule|book|meeting|tomorrow|tomorrow|next week)\b", query_lower):
                        # If call pattern matches but scheduling words are present, it's likely a meeting scheduler request
                        return "schedule", 0.95, {"via": "action_regex_override"}
                    return intent, 0.95, {"via": "action_regex"}
    
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
                
                confidence = 0.9 if intent in ["update_property", "schedule"] else 0.85
                return intent, confidence, {"via": "regex"}
    
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
    content_contract: Optional[ContentContract] = None
    contract_applied: bool = False

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
        
        # Apply APEL disambiguation first
        query, context = normalize_apel_query(query, context)
        
        # Early guard for untracked personal questions (more precise pattern)
        import re
        ql = str(query or "").lower()
        
        # Skip privacy guard for APEL-related queries
        if "apel" in ql:
            pass  # Allow APEL queries through
        else:
            # Only trigger on direct personal questions, not legitimate queries containing these words
            priv_patterns = [
                r"\b(are|is|do|does|have|has|what|who).*(boyfriend|girlfriend|married|religion|political views|pets?|dog|cat)\b",
                r"\b(do they|does.*have|are they).*(married|boyfriend|girlfriend|pets?|religion|political)\b"
            ]
            
            for pattern in priv_patterns:
                if re.search(pattern, ql, re.IGNORECASE):
                    return self._ok("personal_untracked", 0.9, 
                        "We don't track personal details like that — let's focus on course fit, entry requirements and the next steps."
                    )
        
        intent, confidence, meta = await self.classify(query, context)
        
        # DEBUG: Log intent classification result before handler dispatch
        logger.info(f"Intent classification result: intent={intent}, confidence={confidence}, meta={meta}")
        
        # Route to appropriate handler
        handler_map = {
            "update_property": self._handle_update_property,
            "schedule": self._handle_schedule,
            "call_action": self._handle_call_action,
            "email_action": self._handle_email_action,
            "lead_profile": self._handle_lead_profile,
            "lead_info": self._handle_lead_info,
            "nba": self._handle_nba,
            "guidance": self._handle_guidance,
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
        
        # Second-pass heuristic: if intent is unknown, try regex classification again
        if intent == "unknown":
            logger.info("Attempting second-pass intent classification for unknown intent")
            regex_intent, regex_confidence, regex_meta = classify_intent_regex(query, context)
            if regex_intent and regex_intent in handler_map:
                logger.info(f"Second-pass classification found: {regex_intent} -> using {regex_intent} handler")
                handler = handler_map[regex_intent]
                intent = regex_intent
                confidence = max(confidence, regex_confidence)
                meta = {**meta, **regex_meta, "second_pass": True}
        
        return await handler(query, context, intent, confidence, meta)
    
    # ───────────────────────── Handler Functions ─────────────────────────
    
    async def _handle_lead_profile(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle lead profile with person-first narration (organic style)."""
        try:
            lead = context.get("lead", {}) or {}
            # Build a safe, flat preview and include a few dynamic facts if present
            preview = safe_preview(lead)
            if lead.get("name"):
                preview["name"] = lead.get("name")
            if lead.get("courseInterest") or lead.get("latest_programme_name"):
                preview["courseInterest"] = lead.get("courseInterest") or lead.get("latest_programme_name")
            if lead.get("status") or lead.get("statusType"):
                preview["status"] = _friendly_status(lead.get("status") or lead.get("statusType"))
            if lead.get("touchpoint_count") is not None:
                preview["touchpoint_count"] = lead.get("touchpoint_count")
            if lead.get("last_engagement_date"):
                preview["last_engagement_date"] = lead.get("last_engagement_date")
            result = await narrate("Tell me about this person", person=preview, intent="lead_profile")
            text = result["text"]
            
            # Create profile contract for content rewriting
            contract = self._create_contract("profile", query, context)
            
            return self._ok(
                intent,
                max(confidence, 0.85),
                text,
                actions=[self._cta("View Full Profile", "view_profile")],
                contract=contract,
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
            # Early guard for untracked personal questions (more precise pattern)
            ql = str(query or "").lower()
            priv_pattern = re.compile(r"\b(are|is|do|does|have|has|what|who).*(boyfriend|girlfriend|married|religion|politics|pet|dog|cat)\b", re.I)
            if priv_pattern.search(ql):
                return self._ok(intent, 0.9, 
                    "We don't track personal details like that — let's focus on course fit, entry requirements and the next steps."
                )
            
            lead = context.get("lead", {})
            if not lead:
                return self._ok(intent, 0.5, "I don't have any lead information to work with right now.",
                              telemetry={"routed_to": ["llm"], "error": "no_lead_context"})
            
            # Direct contact info requests
            contact_terms = ("email", "phone", "contact", "number", "call")
            if any(term in ql for term in contact_terms):
                email = lead.get("email") or "Not recorded"
                phone = lead.get("phone") or "Not recorded"
                lines = [
                    f"Contact details for {lead.get('name', 'this person')}:",
                    f"• Email: {email}",
                    f"• Phone: {phone}",
                ]
                if lead.get("gdpr_opt_in") is False:
                    lines.append("⚠️ GDPR opt-in is missing; obtain consent before reaching out.")
                actions: List[Dict[str, Any]] = []
                if email != "Not recorded":
                    actions.append(self._cta("Open Email Composer", "open_email_composer"))
                if phone != "Not recorded":
                    actions.append(self._cta("Open Call Console", "open_call_console"))
                return self._ok(
                    intent,
                    max(confidence, 0.85),
                    "\n".join(lines),
                    actions=actions,
                    telemetry={"routed_to": ["contact_info"]},
                )

            # Use the narrator system for progressive, human-like responses,
            # blending in a few KB titles for extra grounding
            try:
                # Build facts for the narrator
                facts = {
                    "query": query,
                    "person": lead.get('name', 'this person'),
                    "email": lead.get('email', 'Not provided'),
                    "phone": lead.get('phone', 'Not provided'),
                    "course_interest": lead.get('courseInterest', 'Not specified'),
                    "academic_year": lead.get('latest_academic_year', 'Not specified'),
                    "status": _friendly_status(lead.get('status') or lead.get('statusType')) or 'Unknown',
                    "touchpoints": lead.get('touchpoint_count', 0),
                    "last_activity": lead.get('last_engagement_date', 'Unknown'),
                    "source": lead.get('source', 'Unknown'),
                    "next_action": lead.get('nextAction', 'Not specified')
                }
                
                # Try to fetch compact sources via RAG
                rag_sources: List[Dict[str, Any]] = []
                try:
                    from app.routers.rag import RagQuery, query_rag
                    rag_q = RagQuery(query=query, context=context, limit=3)
                    rag_resp = await query_rag(rag_q)
                    facts["kb_titles"] = [s.get("title") for s in (rag_resp.sources or [])][:3]
                    rag_sources = list(rag_resp.sources or [])
                except Exception:
                    facts["kb_titles"] = []
                    rag_sources = []

                # Use narrator for progressive language
                # Build safe preview with dynamic fields, plus pass intent for style control
                from app.ai.privacy_utils import safe_preview as _safe_preview
                preview = _safe_preview(lead)
                if lead.get('name'):
                    preview['name'] = lead.get('name')
                if lead.get('courseInterest') or lead.get('latest_programme_name'):
                    preview['courseInterest'] = lead.get('courseInterest') or lead.get('latest_programme_name')
                if lead.get('status') or lead.get('statusType'):
                    preview['status'] = _friendly_status(lead.get('status') or lead.get('statusType'))
                if lead.get('touchpoint_count') is not None:
                    preview['touchpoint_count'] = lead.get('touchpoint_count')
                if lead.get('last_engagement_date'):
                    preview['last_engagement_date'] = lead.get('last_engagement_date')
                result = await narrate(query, person=preview, kb_sources=rag_sources, intent="lead_info")
                answer = result["text"]
                sources: List[Dict[str, Any]] = []
                for src in rag_sources[:4]:
                    sources.append({
                        "title": src.get("title", "")[:120],
                        "document_type": src.get("document_type"),
                        "category": src.get("category"),
                        "similarity_score": float(src.get("similarity_score", 0.0) or 0.0),
                        "preview": (src.get("preview") or src.get("content") or "")[:200],
                    })

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
                              sources=sources,
                              telemetry={"routed_to": ["narrator"]})
                
            except Exception as e:
                logger.error("Narrator processing failed, using fallback: %s", e)
                # Fallback to simple response
                answer = f"I don't have that specific detail about {lead.get('name', 'this lead')}, but I can share what I do know. "
                
                details = []
                if lead.get('courseInterest'):
                    details.append(f"they're interested in {lead.get('courseInterest')}")
                if lead.get('status') and isinstance(lead.get('status'), str):
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
    
    async def _handle_risk_check(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle risk assessment and red flag queries"""
        try:
            lead = context.get("lead", {})
            lead_name = lead.get("name", "this student")
            course = lead.get("courseInterest", "their course")
            
            # Basic risk assessment based on available data
            risks = []
            blockers = []
            
            # Check for common risk indicators
            if not lead.get("gdpr_opt_in", False):
                risks.append("No GDPR consent - limited communication options")
            
            if lead.get("touchpoint_count", 0) == 0:
                risks.append("No engagement history - may be cold lead")
            
            if not lead.get("email") and not lead.get("phone"):
                risks.append("No contact information available")
            
            # Build risk assessment response
            if risks:
                answer = f"**Risk Assessment for {lead_name}:**\n\n"
                answer += "**Identified Risks:**\n"
                for risk in risks:
                    answer += f"• {risk}\n"
                answer += f"\n**Recommended Actions:**\n"
                answer += f"• Address consent and contact issues immediately\n"
                answer += f"• Schedule high-touch follow-up for {lead_name}\n"
                answer += f"• Review {course} application materials for completeness\n"
            else:
                answer = f"**Risk Assessment for {lead_name}:**\n\n"
                answer += "No major red flags identified. Standard follow-up recommended.\n\n"
                answer += f"**Next Steps:**\n"
                answer += f"• Continue regular engagement with {lead_name}\n"
                answer += f"• Monitor {course} application progress\n"
            
            # Create risk assessment contract
            contract = self._create_contract("guidance", query, context)
            
            return self._ok(intent, 0.8, answer, contract=contract, 
                          telemetry={"routed_to": ["risk_assessment"], "risks_identified": len(risks)})
        except Exception as e:
            return self._ok(intent, 0.7, f"Risk assessment temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["risk_assessment"], "error": str(e)})

    async def _handle_admissions_decision(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle admissions decision queries safely"""
        try:
            answer = "I can't make admission decisions here. Check eligibility against entry requirements and any APEL guidance, then log a recommendation for an admissions tutor to review."
            
            # Create admissions contract for content rewriting and personalization
            contract = self._create_contract("admissions", query, context)
            
            return self._ok(intent, 0.9, answer, contract=contract, telemetry={"routed_to": ["admissions_decision"]})
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
            # Wrap suggestions call with timeout to prevent long tails
            suggestions = await _with_timeout(
                generate_suggestions_response(suggestions_query),
                SUGGESTIONS_TIMEOUT_S,
                {"summary_bullets": [], "confidence": 0.3}  # Fallback for timeout
            )
            
            # Build coaching payload with structured headings and quoted script
            lead_name = lead.get("name", "the lead")
            course = lead.get("courseInterest", "their course")
            
            # Check if we need fallback guidance
            summary_bullets = suggestions.get("summary_bullets", [])
            confidence_score = suggestions.get("confidence", confidence)
            
            # Use fallback guidance if bullets are empty or confidence is low
            if not summary_bullets or confidence_score < 0.5 or any(keyword in query.lower() for keyword in ["risks", "red flags", "blockers", "concerns"]):
                answer = self._build_nba_fallback_guidance(lead, query)
                telemetry_flag = {"nba_fallback": True}
            else:
                coaching_payload = []
                
                # Add quoted script if available
                if suggestions.get("script"):
                    coaching_payload.append(f"**Recommended intro:**\n{suggestions['script']}\n")
                
                # Add key moves from summary bullets
                coaching_payload.append("**Key moves:**")
                for bullet in summary_bullets:
                    # Clean up bullet formatting - remove existing bullets and add our own
                    clean_bullet = bullet.strip().replace("•", "").strip()
                    coaching_payload.append(f"• {clean_bullet}")
                coaching_payload.append("")
                
                # Add next steps from suggestions
                if suggestions.get("next_steps"):
                    coaching_payload.append("**Next steps:**")
                    for step in suggestions.get("next_steps", []):
                        # Clean up step formatting
                        clean_step = step.strip().replace("•", "").strip()
                        coaching_payload.append(f"• {clean_step}")
                else:
                    # Fallback next steps
                    coaching_payload.append("**Next steps:**")
                    coaching_payload.append(f"• Follow up with {lead_name} within 24-48 hours")
                    coaching_payload.append(f"• Document the conversation and next actions")
                
                answer = "\n".join(coaching_payload)
                telemetry_flag = {}
            
            actions = []
            if suggestions.get("ui", {}).get("primary_cta"):
                actions.append(self._cta(suggestions["ui"]["primary_cta"]["label"], 
                                       suggestions["ui"]["primary_cta"]["action"]))
            
            # Create NBA contract for content rewriting and pass raw suggestions
            contract = self._create_contract("nba", query, context)
            contract.suggestions_data = suggestions  # Pass raw suggestions for rewriter
            
            return self._ok(intent, suggestions.get("confidence", confidence), answer,
                          actions=actions, contract=contract, telemetry={"routed_to": ["suggestions"], **telemetry_flag})
        except Exception as e:
            # Create NBA contract even for error cases to ensure consistent formatting
            contract = self._create_contract("nba", query, context)
            return self._ok(intent, 0.7, f"Next best action analysis temporarily unavailable: {str(e)}",
                          contract=contract, telemetry={"routed_to": ["suggestions"], "error": str(e)})

    async def _handle_guidance(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle guidance requests for what to say/ask next"""
        try:
            lead = context.get("lead", {})
            
            # Detect objection scenarios and fetch targeted KB if needed
            objection_keywords = ["competitor", "other university", "afford", "cant afford", "can't afford", 
                               "cost", "expensive", "pay the fees", "payment", "funding", "budget",
                               "worthwhile", "not worth", "thinking", "studying", "elsewhere", 
                               "somewhere else", "going", "considering", "compare", "convince", "persuade"]
            
            is_objection = any(keyword in query.lower() for keyword in objection_keywords)
            contract_mode = "objection" if is_objection else "guidance"
            
            # Fetch targeted KB for objection scenarios with improved query and caching
            kb_sources = []
            if is_objection:
                try:
                    from app.routers.rag import RagQuery, query_rag
                    course = lead.get('courseInterest', '') or ''
                    
                    # Check cache first to avoid repeated misses
                    cache_key = f"obj_kb_{course.replace(' ', '_')}"
                    # Note: In production, you'd use a proper cache like Redis
                    # For now, we'll skip caching and focus on better queries
                    
                    # Use safer keywords and lower similarity threshold
                    rq = RagQuery(
                        query=f"{course} value proposition OR graduate outcomes OR industry links",
                        context=context, 
                        categories=["Value Proposition", "Graduate Outcomes", "Industry Links"], 
                        similarity_threshold=0.35,  # Lower threshold for better matches
                        limit=3
                    )
                    # Wrap RAG query with timeout to prevent long tails
                    kb = await _with_timeout(query_rag(rq), RAG_TIMEOUT_S, None)
                    kb_sources = (kb.sources if kb else []) or []
                except Exception as e:
                    logger.warning(f"Competitor KB query failed: {e}")
                    kb_sources = []
            
            # Create contract first (needed for both paths)
            contract = self._create_contract(contract_mode, query, context)
            
            # Use playbook fallback if no KB sources found for objections
            if is_objection and not kb_sources:
                answer = self._build_objection_playbook(lead, query)
                sources = []
            else:
                # Use the narrator for guidance responses with audience awareness
                from app.ai.runtime import narrate
                
                # Only include lead context if the query is about a specific person
                lead_name = lead.get("name", "").lower()
                query_lower = query.lower()
                
                # Check if query mentions the lead by name or is person-specific
                person_specific = (lead_name and lead_name in query_lower) or any(
                    phrase in query_lower for phrase in [
                        "this person", "this lead", "this student", "this applicant",
                        "ruby", "anderson", "her", "his", "their"
                    ]
                )
                
                # Only pass lead context if the query is person-specific
                person_context = lead if person_specific else None
                
                # Wrap narrate call with timeout to prevent long tails
                result = await _with_timeout(
                    narrate(query, person=person_context, kb_sources=kb_sources, 
                           ui_ctx={"audience": contract.audience}, intent="guidance"),
                    NARRATE_TIMEOUT_S,
                    {"text": "Guidance temporarily unavailable due to timeout.", "sources": []}
                )
                answer = result.get("text", "Guidance temporarily unavailable.")
                sources = result.get("sources", []) + kb_sources  # Combine narrator and objection KB sources
            
            # Add appropriate actions
            actions = [self._cta("Open Call Console", "open_call_console")]
            
            return self._ok(intent, confidence, answer, actions=actions, sources=sources, contract=contract,
                          telemetry={"routed_to": ["narrator"], "competitor_kb": len(kb_sources), 
                                   "fallback_playbook": len(kb_sources) == 0})
        except Exception as e:
            # Create guidance contract even for error cases to ensure consistent formatting
            contract = self._create_contract("guidance", query, context)
            return self._ok(intent, 0.7, f"Guidance temporarily unavailable: {str(e)}",
                          contract=contract, telemetry={"routed_to": ["narrator"], "error": str(e)})
    
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
            
            # Create guidance contract for objection handling
            contract = self._create_contract("guidance", query, context)
            
            return self._ok(intent, 0.84, answer, actions=actions,
                          contract=contract, telemetry={"routed_to": ["triage"]})
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
            
            # Create update contract for content rewriting and actionable steps
            contract = self._create_contract("update", query, context)
            
            return self._ok(intent, 0.95, answer, actions=actions, contract=contract,
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
            ql = str(query or "").lower()
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
            
            # Determine contract mode based on query content
            mode = "apel" if "apel" in ql else "policy"
            contract = self._create_contract(mode, query, context)
            
            return self._ok(
                intent,
                getattr(rag_response, "confidence", confidence),
                getattr(rag_response, "answer", "Course information not found"),
                sources=sources,
                contract=contract,
                telemetry={"routed_to": ["rag"]},
            )
        except Exception as e:
            return self._ok(intent, 0.7, f"Course information temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["rag"], "error": str(e)})
    
    async def _handle_policy_info(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle policy information requests using RAG"""
        try:
            from app.routers.rag import RagQuery
            # Remove lead context for policy queries to avoid repetitive information
            policy_context = {k: v for k, v in context.items() if k != "lead"}
            rag_query = RagQuery(query=query, context=policy_context, limit=5)
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
            
            # Create contract for content rewriting - detect APEL questions
            contract_mode = "policy"
            if any(word in query.lower() for word in ["apel", "prior learning", "accreditation"]):
                contract_mode = "apel"
            
            contract = self._create_contract(contract_mode, query, context)
            
            return self._ok(
                intent,
                getattr(rag_response, "confidence", confidence),
                getattr(rag_response, "answer", "Policy information not found"),
                sources=sources,
                contract=contract,
                telemetry={"routed_to": ["rag"]},
            )
        except Exception as e:
            return self._ok(intent, 0.7, f"Policy information temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["rag"], "error": str(e)})
    
    async def _handle_general_help(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle general help requests with short LLM response"""
        # Check if this is an objection scenario that needs guidance contract
        objection_keywords = ["competitor", "cost", "afford", "cant afford", "can't afford", "pay the fees", 
                             "payment", "funding", "budget", "worthwhile", "worth it", "not worth", "expensive", "cheaper"]
        is_objection = any(keyword in query.lower() for keyword in objection_keywords)
        
        if is_objection:
            # Use guidance contract for objection handling
            contract = self._create_contract("guidance", query, context)
            lines = [
                "I can help with objections and concerns:",
                "• Addressing competitor comparisons",
                "• Cost and affordability discussions", 
                "• Value proposition and outcomes",
                "• Parental concerns about creative degrees",
                "Let me provide specific guidance for this situation.",
            ]
        else:
            # Standard general help
            contract = self._create_contract("general", query, context)
            lines = [
                "I can help with:",
                "• Person summaries and recent activity",
                "• Course and policy questions",
                "• Risks, blockers, and next best actions",
                "• Drafting outreach (email or call scripts)",
                "Let me know what you'd like to focus on.",
            ]
        
        return self._ok(intent, max(confidence, 0.6), "\n".join(lines), 
                       contract=contract, telemetry={"routed_to": ["help_static"]})
    
    async def _handle_unknown(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Final fallback - always returns something"""
        try:
            # Try to use better fallback functions first
            lead_ctx = {"lead": context.get("lead")} if context else {}
            
            # Check if this looks like a profile query
            if any(pattern in str(query).lower() for pattern in ["tell me about", "who is", "profile", "about this person", "about this lead"]):
                from app.routers.rag import generate_person_profile
                answer = await generate_person_profile(query, lead_ctx)
                return self._ok("lead_profile", 0.6, answer,
                              actions=[{"label": "View Full Profile", "action": "view_profile"}],
                              telemetry={"routed_to": ["fallback_profile"]})
            
            # Check if this looks like a lead info query
            elif any(pattern in str(query).lower() for pattern in ["what's the status", "contact details", "when did they", "how many", "last activity", "engagement"]):
                # Generate basic lead info response
                lead_name = lead_ctx.get("name", "this student")
                course = lead_ctx.get("courseInterest", "their course")
                touchpoints = lead_ctx.get("touchpoint_count", 0)
                last_engagement = lead_ctx.get("last_engagement_date", "unknown")
                
                answer = f"**Lead Information for {lead_name}:**\n\n"
                answer += f"• **Course Interest:** {course}\n"
                answer += f"• **Touchpoints:** {touchpoints}\n"
                answer += f"• **Last Engagement:** {last_engagement}\n"
                answer += f"• **Status:** {lead_ctx.get('status', 'Unknown')}\n\n"
                answer += f"**Next Steps:**\n"
                answer += f"• Review {lead_name}'s full profile for complete details\n"
                answer += f"• Schedule follow-up based on engagement level\n"
                
                return self._ok("lead_info", 0.6, answer,
                              actions=[{"label": "View Full Profile", "action": "view_profile"}],
                              telemetry={"routed_to": ["fallback_info"]})
            
            # Check if this looks like a guidance query using shared regex patterns
            elif any(re.search(pattern, query, re.IGNORECASE) for pattern in INTENT_PATTERNS["guidance"]):
                # Use the narrator for guidance responses
                from app.ai.runtime import narrate
                
                # Only include lead context if the query is about a specific person
                lead = context.get("lead", {})
                lead_name = lead.get("name", "").lower()
                query_lower = query.lower()
                
                # Check if query mentions the lead by name or is person-specific
                person_specific = (lead_name and lead_name in query_lower) or any(
                    phrase in query_lower for phrase in [
                        "this person", "this lead", "this student", "this applicant",
                        "ruby", "anderson", "her", "his", "their"
                    ]
                )
                
                # Only pass lead context if the query is person-specific
                person_context = lead if person_specific else None
                
                result = await narrate(query, person=person_context, intent="guidance")
                answer = result.get("text", "Guidance temporarily unavailable.")
                
                # Create guidance contract for content rewriting
                contract = self._create_contract("guidance", query, context)
                
                return self._ok("guidance", 0.7, answer,
                              actions=[{"label": "Open Call Console", "action": "open_call_console"}],
                              contract=contract,
                              telemetry={"routed_to": ["fallback_guidance"]})
            
            # Check if this looks like an NBA query using shared regex patterns
            elif any(re.search(pattern, query, re.IGNORECASE) for pattern in INTENT_PATTERNS["nba"]):
                # Use the narrator for NBA responses
                from app.ai.runtime import narrate
                
                # Only include lead context if the query is about a specific person
                lead = context.get("lead", {})
                lead_name = lead.get("name", "").lower()
                query_lower = query.lower()
                
                # Check if query mentions the lead by name or is person-specific
                person_specific = (lead_name and lead_name in query_lower) or any(
                    phrase in query_lower for phrase in [
                        "this person", "this lead", "this student", "this applicant",
                        "ruby", "anderson", "her", "his", "their"
                    ]
                )
                
                # Only pass lead context if the query is person-specific
                person_context = lead if person_specific else None
                
                result = await narrate(query, person=person_context, intent="nba")
                answer = result.get("text", "Next steps temporarily unavailable.")
                
                # Create NBA contract for content rewriting
                contract = self._create_contract("nba", query, context)
                
                return self._ok("nba", 0.7, answer,
                              actions=[{"label": "Open Call Console", "action": "open_call_console"}],
                              contract=contract,
                              telemetry={"routed_to": ["fallback_nba"]})
            
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
                
                # Create guidance contract for objection handling
                contract = self._create_contract("guidance", query, context)
                
                return self._ok(intent, 0.9, answer, actions=actions,
                              contract=contract, telemetry={"routed_to": ["anomaly_detection"]})
                
            except Exception as anomaly_error:
                logger.error("Anomaly detection failed: %s", anomaly_error)
                return self._ok(intent, 0.7, f"{router_header}Anomaly detection temporarily unavailable.",
                              telemetry={"routed_to": ["anomaly"], "error": str(anomaly_error)})
                
        except Exception as e:
            return self._ok(intent, 0.7, f"Anomaly detection temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["anomaly"], "error": str(e)})

    # ───────────────────────── Helper Functions ─────────────────────────
    
    def _ok(self, intent: str, confidence: float, answer: str, actions: List[Dict[str, Any]] = None, 
            sources: List[Dict[str, Any]] = None, telemetry: Dict[str, Any] = None, 
            contract: ContentContract = None) -> RouterResponse:
        """Create standardised response with optional content rewriting"""
        
        # Apply content rewriting if contract is provided
        rewritten_answer = answer
        contract_applied = False
        if contract:
            try:
                rewritten_answer = rewrite_answer(answer, contract, sources)
                contract_applied = True
                # Log contract application for telemetry
                if telemetry is None:
                    telemetry = {}
                telemetry["contract_applied"] = True
                telemetry["contract_mode"] = contract.mode
                telemetry["contract_requirements"] = contract.must
            except Exception as e:
                # Log contract enforcement failure but don't fail the response
                import logging
                logging.warning(f"Contract enforcement failed for {contract.mode}: {e}")
                if telemetry is None:
                    telemetry = {}
                telemetry["contract_failed"] = True
                telemetry["contract_error"] = str(e)
        
        return RouterResponse(
            intent=intent,
            confidence=confidence,
            answer_markdown=rewritten_answer,
            actions=actions or [],
            sources=sources or [],
            telemetry=telemetry or {},
            session_id=self.session_id,
            content_contract=contract,
            contract_applied=contract_applied
        )
    
    def _cta(self, label: str, action: str) -> Dict[str, Any]:
        """Create call-to-action button"""
        return {"label": label, "action": action}
    
    def _build_nba_fallback_guidance(self, lead: Dict[str, Any], query: str) -> str:
        """Build fallback NBA guidance when suggestions API fails or confidence is low"""
        import random
        
        lead_name = lead.get("name", "this student")
        course = lead.get("courseInterest", "their course")
        touchpoint_count = lead.get("touchpoint_count", 0)
        
        # Add variety to headings to reduce "stock" feel
        heading_sets = [
            ("**Recommended intro**", "**Key moves**", "**Next steps**"),
            ("**Opening line**", "**What to do now**", "**Follow-up**"),
            ("**Start like this**", "**Immediate actions**", "**Then**"),
        ]
        intro_h, moves_h, next_h = random.choice(heading_sets)
        
        # Detect query type for targeted guidance
        query_lower = query.lower()
        
        if any(keyword in query_lower for keyword in ["risks", "red flags", "blockers", "concerns"]):
            # Risk assessment guidance - more concise
            guidance = f"""{intro_h}:
"Hi {lead_name}, I'd like to share some insights about {course} that might help with your concerns."

{moves_h}:
• Schedule a quick 1-1 with {lead_name} to discuss their specific concerns
• Send tailored course information addressing their blockers
• Follow up on any immediate questions or hesitations

{next_h}:
• Book a call with {lead_name} within 24-48 hours
• Email {lead_name} a short checklist addressing their concerns
• Set up follow-up timeline based on their response"""
        
        elif any(keyword in query_lower for keyword in ["next", "best", "action", "should", "do"]):
            # General next best action guidance - more concise
            guidance = f"""{intro_h}:
"Hi {lead_name}, here's what I suggest as next steps for {course}."

{moves_h}:
• Book a quick 1-1 with {lead_name} to discuss their goals
• Send tailored course information based on their interests
• Follow up on any questions or next steps

{next_h}:
• Schedule a call with {lead_name} this week
• Email {lead_name} relevant course materials
• Set up follow-up based on their engagement"""
        
        else:
            # Generic fallback - more concise and personalized
            engagement_note = f" (they've had {touchpoint_count} touchpoints so far)" if touchpoint_count > 0 else ""
            guidance = f"""{intro_h}:
"Hi {lead_name}, I wanted to share some insights about {course} that might be valuable for your decision-making{engagement_note}."

{moves_h}:
• Book a quick 1-1 with {lead_name} to discuss their goals
• Send tailored course information based on their interests
• Follow up on any questions or next steps

{next_h}:
• Schedule a call with {lead_name} this week
• Email {lead_name} relevant course materials
• Set up follow-up based on their response"""
        
        return guidance

    def _build_objection_playbook(self, lead: Dict[str, Any], query: str) -> str:
        """Build objection playbook when KB returns 0 results"""
        import random
        
        lead_name = lead.get("name", "this student")
        course = lead.get("courseInterest", "their course")
        touchpoint_count = lead.get("touchpoint_count", 0)
        
        # Add variety to headings
        heading_sets = [
            ("**Recommended intro**", "**Key moves**", "**Next steps**"),
            ("**Opening line**", "**What to do now**", "**Follow-up**"),
            ("**Start like this**", "**Immediate actions**", "**Then**"),
        ]
        intro_h, moves_h, next_h = random.choice(heading_sets)
        
        # Course-specific differentiators (basic playbook)
        course_differentiators = {
            "music": ["industry connections", "performance opportunities", "state-of-the-art facilities"],
            "business": ["industry partnerships", "practical experience", "career support"],
            "art": ["creative freedom", "exhibition opportunities", "mentor support"],
        }
        
        # Find matching differentiators
        differentiators = ["industry connections", "practical experience", "career support"]
        for key, values in course_differentiators.items():
            if key in course.lower():
                differentiators = values
                break
        
        # Add dynamic fact to reduce "stock" feel
        engagement_note = f" (they've had {touchpoint_count} touchpoints so far)" if touchpoint_count > 0 else ""
        
        guidance = f"""{intro_h}:
"Hi {lead_name}, I'd like to share some insights about {course} that might be valuable for your decision-making{engagement_note}."

{moves_h}:
• Highlight {course}'s {differentiators[0]} and how it benefits students
• Share graduate success stories and industry connections
• Address their specific concerns with relevant examples
• Show how {course} aligns with their career goals

{next_h}:
• Schedule a call with {lead_name} to discuss their concerns
• Send tailored course information addressing their questions
• Follow up with specific examples relevant to their situation"""
        
        return guidance

    def _create_contract(self, mode: str, query: str, context: Dict[str, Any], 
                        must: List[str] = None) -> ContentContract:
        """Create content contract for different modes"""
        lead = context.get("lead", {})
        course = lead.get("courseInterest") or "MA Music Performance"
        
        # Set audience based on mode - student for direct communication, agent for coaching
        audience = "student" if mode in {"email_action", "call_action"} else "agent"
        
        if must is None:
            must = []
        
        # Mode-specific contract requirements - enhanced for Challenger Sales methodology
        if mode == "guidance":
            must.extend(["quoted_script", ">=5_bullets", "actionable", "empathy", "personalized", "commercial_teaching"])
        elif mode == "objection":
            must.extend(["quoted_script", ">=4_bullets", "actionable", "empathy", "differentiators", "personalized", "commercial_teaching", "challenger_approach"])
        elif mode == "apel":
            must.extend(["apel_definition_strict", "tie_to_course", "short_intro<=25w", "personalized"])
        elif mode == "policy":
            must.extend(["short_intro<=25w", "has_sources", "reasonable_length"])
        elif mode == "nba":
            must.extend(["script_and_bullets", "actionable", "empathy", "personalized"])
        elif mode == "admissions":
            must.extend(["personalized", "actionable", "empathy"])
        elif mode == "update":
            must.extend(["actionable", "personalized"])
        elif mode == "profile":
            must.extend(["personalized", "reasonable_length<=450"])
        elif mode == "fallback":
            must.extend(["reasonable_length<=200"])
        
        return ContentContract(
            mode=mode,
            course=course,
            must=must,
            context=lead,
            audience=audience
        )
    
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
            
            name = lead.get("name", "this person")
            actions = [self._cta("Open Call Console", "open_call_console")]

            ql = (query or "").lower()
            script_keywords = ["script", "call plan", "what should i say", "calling template", "talking points"]
            wants_script = any(k in ql for k in script_keywords)

            if wants_script:
                course = lead.get("courseInterest") or lead.get("latest_programme_name") or "the course"
                last_activity = lead.get("last_engagement_date")
                gdpr = lead.get("gdpr_opt_in")
                touchpoints = lead.get("touchpoint_count")

                script_lines = []
                script_lines.append(f"Intro: \"Hi {name}, it's the admissions team at [institution]. Thanks for your interest in {course}.\"")
                if gdpr is False:
                    script_lines.append("Consent: \"Before we go further, is it alright if we continue this call and share course updates with you?\"")
                script_lines.append("Explore: Ask how their application prep is going and what they need next.")
                if last_activity:
                    script_lines.append(f"Reference: Mention the most recent engagement on {last_activity[:10]}.")
                if touchpoints is not None:
                    script_lines.append(f"Engagement: Acknowledge we've spoken {touchpoints} time(s) so far to show continuity.")
                script_lines.append("Close: Offer to send a short follow-up email with key steps or book a 1-1 if helpful.")

                answer = "\n".join(script_lines)
                return self._ok(intent, 0.92, answer, actions=actions,
                                telemetry={"routed_to": ["call_action"], "script": True})

            answer = f"Opening call console for {name}..."
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
            
            name = lead.get("name", "this person")
            ql = (query or "").lower()
            wants_template = any(k in ql for k in ("template", "draft", "script", "email text", "email body"))
            
            actions = [self._cta("Open Email Composer", "open_email_composer")]
            
            if wants_template:
                try:
                    from app.routers.rag import _generate_json_tool_response
                    # Ask the tool to generate a minimal subject/body JSON
                    tool_query = '{"type":"email"}'
                    jb = await _generate_json_tool_response(tool_query, context, [])
                    import json as _json
                    data = _json.loads(jb)
                    subject = data.get("subject") or f"Quick follow-up"
                    body = data.get("body") or f"Hi {name},\n\nFollowing up on your interest."
                    answer = f"Subject: {subject}\n\n{body}"
                    return self._ok(intent, 0.92, answer, actions=actions,
                                    telemetry={"routed_to": ["email_action"], "template": True})
                except Exception as gen_err:
                    # Fall back to simple open message
                    answer = f"Opening email composer for {name}..."
                    return self._ok(intent, 0.9, answer, actions=actions,
                                    telemetry={"routed_to": ["email_action"], "template_error": str(gen_err)})
            
            # Default: simple open behaviour
            answer = f"Opening email composer for {name}..."
            return self._ok(intent, 0.9, answer, actions=actions,
                            telemetry={"routed_to": ["email_action"]})
        except Exception as e:
            return self._ok(intent, 0.7, f"Email action temporarily unavailable: {str(e)}",
                          telemetry={"routed_to": ["email_action"], "error": str(e)})

    async def _handle_general_help(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle general help requests"""
        try:
            # Deterministic fallback for simple queries
            if os.getenv("IVY_FORCE_SIMPLE_QA", "false").lower() == "true":
                from app.ai.safe_llm import LLMCtx
                llm = LLMCtx(temperature=0.1)
                answer = await llm.ainvoke([("system","British English. Two sentences max. Be clear."),
                                          ("human", query)])
                return self._ok(intent, 0.72, answer or "Let me try that again.")
            
            # Simple fallback for general queries
            lines = [
                "I can help with:",
                "• Person summaries and recent activity",
                "• Course and policy questions", 
                "• Risks, blockers, and next best actions",
                "• Drafting outreach (email or call scripts)",
                "What would you like to focus on?"
            ]
            answer = "\n".join(lines)
            contract = self._create_contract("general", query, context)
            return self._ok(intent, 0.7, answer, contract=contract, actions=[self._cta("Open Call Console", "open_call_console")])
        except Exception as e:
            logger.error(f"Error in general help handler: {e}")
            return self._ok(intent, 0.5, "I'm here to help with admissions support. Try asking about a lead, course requirements, or next steps.")
    
    async def _handle_conversion_forecast(self, query: str, context: Dict[str, Any], intent: str, confidence: float, meta: Dict[str, Any]) -> RouterResponse:
        """Handle conversion probability requests with ML data from AI Summary panel"""
        try:
            lead = context.get("lead", {})
            if not lead:
                return self._ok(intent, 0.5, "I don't have any student information to assess conversion probability.")
            
            name = lead.get("name", "this student")
            course = lead.get("courseInterest", "their chosen course")
            
            # Debug: log what data we're receiving
            logger.info(f"Conversion forecast - checking data sources:")
            logger.info(f"  context.mlForecast: {bool(context.get('mlForecast'))}")
            logger.info(f"  context.triage: {bool(context.get('triage'))}")
            logger.info(f"  lead.aiInsights: {bool(lead.get('aiInsights'))}")
            
            # PRIORITY 1: Use mlForecast data (has real conversion_probability)
            ml_forecast = context.get("mlForecast")
            conversion_prob = None
            key_drivers = []
            cohort_rate = None
            estimated_conversion_days = None
            
            if ml_forecast:
                logger.info(f"  Using mlForecast data with keys: {list(ml_forecast.keys())}")
                conversion_prob = ml_forecast.get("conversion_probability")
                key_drivers = list(ml_forecast.get("feature_importance", {}).items()) if ml_forecast.get("feature_importance") else []
                cohort_perf = ml_forecast.get("cohort_performance")
                if cohort_perf:
                    cohort_rate = cohort_perf.get("similar_leads_conversion_rate")
                estimated_conversion_days = ml_forecast.get("eta_days")
            
            # FALLBACK: Use triage data if mlForecast not available
            if not conversion_prob:
                forecast_data = context.get("triage") or lead.get("aiInsights")
                if forecast_data:
                    logger.info(f"  Falling back to triage data")
                    # Triage score is NOT conversion probability - it's a priority score
                    # Don't use it for conversion probability!
            
            # Also check direct lead properties
            if not conversion_prob:
                conversion_prob = lead.get("conversion_probability") or lead.get("leadScore") or lead.get("conversionProbability")
            
            if conversion_prob:
                # Build rich, formatted response with ML insights
                prob_pct = f"{float(conversion_prob):.1%}" if isinstance(conversion_prob, (int, float)) else str(conversion_prob)
                
                answer_parts = []
                
                # Opening with probability
                answer_parts.append(f"There's a **{prob_pct} chance** {name} will enrol based on our ML analysis.")
                
                # Add key drivers if available (from mlForecast feature_importance)
                if key_drivers and len(key_drivers) > 0:
                    answer_parts.append("\n**Key factors:**\n")
                    # Sort by importance value (descending)
                    sorted_drivers = sorted(key_drivers, key=lambda x: x[1] if isinstance(x, tuple) else 0, reverse=True)
                    driver_bullets = []
                    for driver in sorted_drivers[:4]:  # Top 4 drivers
                        if isinstance(driver, tuple) and len(driver) == 2:
                            # From feature_importance dict: (feature_name, importance_value)
                            feature_name = driver[0].replace('_', ' ').title()
                            importance_val = driver[1]
                            driver_bullets.append(f"• {feature_name}: {importance_val:.2f}")
                        elif isinstance(driver, dict):
                            driver_name = driver.get("name", driver.get("factor", driver.get("reason", "Unknown")))
                            driver_value = driver.get("value", driver.get("score", ""))
                            if driver_value:
                                driver_bullets.append(f"• {driver_name}: {driver_value}")
                            else:
                                driver_bullets.append(f"• {driver_name}")
                        else:
                            # Simple string reason
                            driver_bullets.append(f"• {driver}")
                    # Join with newlines to preserve list formatting
                    answer_parts.append("\n".join(driver_bullets))
                
                # Add cohort context if available
                if cohort_rate:
                    cohort_pct = f"{float(cohort_rate):.1%}" if isinstance(cohort_rate, (int, float)) else str(cohort_rate)
                    answer_parts.append(f"\n**Cohort benchmark:** Similar leads convert at {cohort_pct}")
                
                # Add timeline if available
                if estimated_conversion_days:
                    answer_parts.append(f"\n**Estimated timeline:** {estimated_conversion_days} days to conversion")
                
                # Add actionable recommendations (with proper line breaks)
                answer_parts.append("\n**To strengthen conversion:**\n")
                
                touchpoints = lead.get("touchpoint_count", 0)
                gdpr_status = lead.get("gdpr_opt_in", False)
                last_engagement = lead.get("last_engagement_date", "")
                
                recommendations = []
                if not gdpr_status:
                    recommendations.append("• **Priority:** Obtain GDPR consent to enable full communication")
                if touchpoints < 10:
                    recommendations.append(f"• Increase engagement touchpoints (currently {touchpoints})")
                if last_engagement and "2025" in str(last_engagement):
                    recommendations.append("• Maintain momentum with timely follow-up")
                else:
                    recommendations.append("• Re-engage with personalised course content")
                
                recommendations.append(f"• Address any course-specific questions about {course}")
                
                # Join with newlines to preserve list formatting
                answer_parts.append("\n".join(recommendations))
                
                answer = "\n".join(answer_parts)
                
                actions = [self._cta("View Full Analysis", "view_profile")]
                return self._ok(intent, 0.9, answer, actions=actions)
            else:
                # Fallback when no ML data available
                touchpoints = lead.get("touchpoint_count", 0)
                status = lead.get("status", "unknown")
                
                answer = f"I don't have ML conversion data for {name} yet. Based on basic signals:\n\n"
                answer += f"• **Status:** {status}\n"
                answer += f"• **Course interest:** {course}\n"
                answer += f"• **Engagement:** {touchpoints} touchpoints\n"
                answer += f"\n**To get precise ML forecast:** View the AI Summary panel on this page, which should show the conversion probability and key drivers."
                
                actions = [self._cta("View Profile", "view_profile")]
                return self._ok(intent, 0.7, answer, actions=actions)
                
        except Exception as e:
            logger.error(f"Error in conversion forecast handler: {e}")
            return self._ok(intent, 0.5, "Conversion analysis temporarily unavailable. Try viewing the profile for engagement data.")

    def _build_nba_fallback_guidance(self, lead: Dict[str, Any], query: str) -> str:
        """Build deterministic NBA fallback with varied headings and dynamic facts"""
        import random
        
        lead_name = lead.get("name", "the lead")
        course = lead.get("courseInterest", "their course")
        touchpoints = lead.get("touchpoint_count", 0)
        last_engagement = lead.get("last_engagement_date", "recently")
        gdpr_status = lead.get("gdpr_opt_in", False)
        
        # Rotate section labels for variety
        section_labels = [
            ("Opening line", "What to do now", "Follow-up"),
            ("Your approach", "Key actions", "Next steps"),
            ("Strategy", "Immediate actions", "Follow-through"),
            ("Opening", "Action plan", "Follow-up")
        ]
        opening_label, action_label, followup_label = random.choice(section_labels)
        
        # Build dynamic facts based on lead data
        dynamic_facts = []
        if touchpoints > 10:
            dynamic_facts.append(f"With {touchpoints} touchpoints, they're highly engaged")
        elif touchpoints > 5:
            dynamic_facts.append(f"At {touchpoints} touchpoints, they're moderately engaged")
        else:
            dynamic_facts.append(f"With only {touchpoints} touchpoints, they need more engagement")
            
        if not gdpr_status:
            dynamic_facts.append("No GDPR consent - prioritize consent collection")
        elif last_engagement and "2025" in str(last_engagement):
            dynamic_facts.append("Recent engagement shows active interest")
        
        # Build the response with varied structure
        response_parts = []
        
        # Add opening with dynamic fact
        if dynamic_facts:
            response_parts.append(f"**{opening_label}:**\n\n\"Hi {lead_name}, I wanted to follow up on your interest in {course}. {dynamic_facts[0]}.\"")
        else:
            response_parts.append(f"**{opening_label}:**\n\n\"Hi {lead_name}, I wanted to follow up on your interest in {course}.\"")
        
        # Add action plan with course-specific guidance (with paragraph break before)
        response_parts.append(f"\n**{action_label}:**")
        response_parts.append(f"• Address any questions about {course}")
        response_parts.append(f"• Share relevant course information and outcomes")
        response_parts.append(f"• Understand their specific goals and timeline")
        
        # Add follow-up with personalized next steps (with paragraph break before)
        response_parts.append(f"\n**{followup_label}:**")
        response_parts.append(f"• Schedule a follow-up call within 48 hours")
        response_parts.append(f"• Send course-specific materials via email")
        response_parts.append(f"• Update CRM with conversation notes")
        
        # Add gap notice if no KB evidence (with paragraph break before)
        response_parts.append("\n*Gap: no direct evidence found; using playbook*")
        
        return "\n".join(response_parts)

# ───────────────────────── Router Instance ─────────────────────────

router_instance = AIRouter()
