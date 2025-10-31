"""
Applications Insights Router

Provides DB-grounded pipeline summaries and contextual answers for the
admissions Applications board. This avoids using RAG for numeric truth and
instead computes facts from the database, then uses the AI runtime to compose
a concise, UK HE-specific narrative.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import datetime
import json
import logging

from app.db.db import fetch, execute, execute_returning
from app.ai.runtime import narrate
from app.ai.safe_llm import LLMCtx

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/applications/insights", tags=["applications-insights"])


# Diagnostic endpoint for debugging conversation history
@router.get("/debug/session/{session_id}")
async def debug_session(session_id: str):
    """Get conversation history for debugging"""
    try:
        history = await get_conversation_history(session_id, limit=10)
        return {
            "session_id": session_id,
            "message_count": len(history),
            "messages": [
                {
                    "role": msg.role,
                    "content_preview": msg.content[:150] + "..." if len(msg.content) > 150 else msg.content,
                    "backend_candidates": msg.backend_candidates,
                    "query_intent": msg.query_intent
                }
                for msg in history
            ]
        }
    except Exception as e:
        logger.exception(f"Failed to get session debug info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class InsightsFilters(BaseModel):
    stage: Optional[str] = None
    priority: Optional[str] = None
    urgency: Optional[str] = None
    program: Optional[str] = None  # programme_name filter
    application_ids: Optional[List[str]] = None


class PipelineSummary(BaseModel):
    total: int
    avgProgression: int
    highRisk: int
    highConfidence: int
    enrollmentEstimate: float = 0.0
    stageHistogram: List[Dict[str, Any]] = Field(default_factory=list)
    programHistogram: List[Dict[str, Any]] = Field(default_factory=list)
    topBlockers: List[Dict[str, Any]] = Field(default_factory=list)
    topAtRisk: List[Dict[str, Any]] = Field(default_factory=list)


class AskRequest(BaseModel):
    query: str
    filters: Optional[InsightsFilters] = None
    session_id: Optional[str] = None  # For conversation continuity


class Candidate(BaseModel):
    application_id: str
    name: str
    stage: Optional[str] = None
    programme_name: Optional[str] = None


class AskResponse(BaseModel):
    answer: str
    summary: PipelineSummary
    sources: List[Dict[str, str]] = Field(default_factory=list)
    confidence: float = 0.9
    query_type: str = "applications_insights"
    candidates: List[Candidate] = Field(default_factory=list)
    session_id: str  # Return session_id for subsequent queries


# Conversation memory models
class ConversationMessage(BaseModel):
    message_id: str
    role: str  # 'user' or 'assistant'
    content: str
    created_at: datetime
    mentioned_application_ids: Optional[List[str]] = None
    query_intent: Optional[str] = None
    backend_candidates: Optional[List[str]] = None


# ============================================================================
# CONVERSATION MEMORY FUNCTIONS (Phase 2)
# ============================================================================

async def get_or_create_session(user_id: Optional[str], board_context: str) -> str:
    """
    Get active session or create new one.
    Returns session_id.
    """
    try:
        # Check for active session (not expired)
        if user_id:
            sql = """
                SELECT session_id
                FROM public.ivy_conversation_sessions
                WHERE user_id = %s
                  AND board_context = %s
                  AND expires_at > NOW()
                ORDER BY updated_at DESC
                LIMIT 1
            """
            rows = await fetch(sql, user_id, board_context)
        else:
            # For anonymous users, just create a new session
            rows = []

        if rows and len(rows) > 0:
            session_id = str(rows[0]['session_id'])
            logger.info(f"Reusing existing session: {session_id}")
            return session_id

        # Create new session
        sql = """
            INSERT INTO public.ivy_conversation_sessions (user_id, board_context)
            VALUES (%s, %s)
            RETURNING session_id
        """
        rows = await execute_returning(sql, user_id, board_context)
        session_id = str(rows[0]['session_id'])
        logger.info(f"Created new session: {session_id}")
        return session_id

    except Exception as e:
        logger.exception(f"Failed to get/create session: {e}")
        # Return a temporary session_id if database fails
        import uuid
        return str(uuid.uuid4())


async def add_message_to_session(
    session_id: str,
    role: str,
    content: str,
    mentioned_application_ids: Optional[List[str]] = None,
    query_intent: Optional[str] = None,
    backend_candidates: Optional[List[str]] = None
) -> None:
    """
    Add a message to the conversation history.
    Updates session updated_at timestamp via trigger.
    """
    try:
        logger.info(f"💾 Attempting to save {role} message to session {session_id}")
        logger.info(f"   - content length: {len(content)}")
        logger.info(f"   - query_intent: {query_intent}")
        logger.info(f"   - backend_candidates: {backend_candidates or []}")

        sql = """
            INSERT INTO public.ivy_conversation_messages
            (session_id, role, content, mentioned_application_ids, query_intent, backend_candidates)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        await execute(
            sql,
            session_id,
            role,
            content,
            mentioned_application_ids or [],
            query_intent,
            backend_candidates or []
        )
        logger.info(f"✅ Added {role} message to session {session_id}")
    except Exception as e:
        logger.exception(f"❌ Failed to add message to session: {e}")
        logger.error(f"   - session_id: {session_id} (type: {type(session_id)})")
        logger.error(f"   - role: {role}")
        logger.error(f"   - backend_candidates: {backend_candidates}")
        # Don't fail the request if conversation history fails


async def get_conversation_history(session_id: str, limit: int = 10) -> List[ConversationMessage]:
    """
    Retrieve recent conversation history for context.
    Returns last N messages ordered by created_at.
    """
    try:
        sql = """
            SELECT message_id, role, content, created_at,
                   mentioned_application_ids, query_intent, backend_candidates
            FROM public.ivy_conversation_messages
            WHERE session_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """
        rows = await fetch(sql, session_id, limit)

        # Reverse to get chronological order
        messages = []
        for row in reversed(rows):
            messages.append(ConversationMessage(
                message_id=str(row['message_id']),
                role=row['role'],
                content=row['content'],
                created_at=row['created_at'],
                mentioned_application_ids=row.get('mentioned_application_ids'),
                query_intent=row.get('query_intent'),
                backend_candidates=row.get('backend_candidates')
            ))

        logger.info(f"Retrieved {len(messages)} messages from session {session_id}")
        return messages

    except Exception as e:
        logger.exception(f"Failed to get conversation history: {e}")
        return []


async def detect_followup_intent(query: str, history: List[ConversationMessage]) -> Dict[str, Any]:
    """
    Detect if query is a follow-up to previous message.

    Returns:
    {
        "is_followup": bool,
        "followup_type": "affirmative" | "question" | "elaboration" | None,
        "referenced_applicants": List[str],  # From previous message
        "previous_intent": str  # From previous assistant message
    }
    """
    if not history or len(history) < 2:
        return {
            "is_followup": False,
            "followup_type": None,
            "referenced_applicants": [],
            "previous_intent": None
        }

    query_lower = query.lower().strip()

    # Get last assistant message
    last_assistant_msg = None
    for msg in reversed(history):
        if msg.role == "assistant":
            last_assistant_msg = msg
            break

    if not last_assistant_msg:
        return {
            "is_followup": False,
            "followup_type": None,
            "referenced_applicants": [],
            "previous_intent": None
        }

    # Check for affirmative responses
    affirmative_keywords = [
        "yes", "yeah", "yep", "sure", "ok", "okay", "do it", "go ahead",
        "please", "create them", "make them", "yes please", "sounds good"
    ]
    if query_lower in affirmative_keywords or any(query_lower.startswith(kw) for kw in affirmative_keywords):
        return {
            "is_followup": True,
            "followup_type": "affirmative",
            "referenced_applicants": last_assistant_msg.backend_candidates or [],
            "previous_intent": last_assistant_msg.query_intent
        }

    # Check for elaboration requests
    elaboration_keywords = [
        "tell me more", "more details", "what else", "explain", "elaborate",
        "more info", "more information", "details", "continue"
    ]
    if any(kw in query_lower for kw in elaboration_keywords):
        return {
            "is_followup": True,
            "followup_type": "elaboration",
            "referenced_applicants": last_assistant_msg.backend_candidates or [],
            "previous_intent": last_assistant_msg.query_intent
        }

    # Check for questions about mentioned applicants (simple name check)
    if "who is" in query_lower or "tell me about" in query_lower or "what about" in query_lower:
        return {
            "is_followup": True,
            "followup_type": "question",
            "referenced_applicants": last_assistant_msg.backend_candidates or [],
            "previous_intent": last_assistant_msg.query_intent
        }

    return {
        "is_followup": False,
        "followup_type": None,
        "referenced_applicants": [],
        "previous_intent": None
    }


# ============================================================================
# END CONVERSATION MEMORY FUNCTIONS
# ============================================================================


# ============================================================================
# INTERVENTION PLAN GENERATION (Phase 3)
# ============================================================================

def build_intervention_plan_prompt(
    applicant_ids: List[str],
    dataset: List[Dict[str, Any]]
) -> str:
    """
    Build prompt for generating personalised intervention plans.
    Phase 3: Enables Ivy to create structured action recommendations.
    """
    prompt_parts = []

    prompt_parts.append(
        "You are Ivy, a UK Higher Education admissions AI assistant creating "
        "personalised intervention plans.\n\n"
    )

    prompt_parts.append("APPLICANTS REQUIRING INTERVENTION:\n")
    for i, app_id in enumerate(applicant_ids[:5], 1):  # Limit to 5 applicants
        # Find applicant in dataset
        app = next((a for a in dataset if str(a.get('application_id')) == app_id), None)
        if not app:
            continue

        name = f"{app.get('first_name', '')} {app.get('last_name', '')}".strip()
        stage = app.get('stage', 'unknown')
        prob = app.get('progression_probability', 0) or 0
        blockers = app.get('progression_blockers', [])

        prompt_parts.append(f"{i}. {name}")
        prompt_parts.append(f"   - Application ID: {app_id}")
        prompt_parts.append(f"   - Stage: {stage.replace('_', ' ')}")
        prompt_parts.append(f"   - Progression probability: {int(prob * 100)}%")

        if blockers:
            blocker_items = [b.get('item', '') for b in blockers[:3] if isinstance(b, dict)]
            if blocker_items:
                prompt_parts.append(f"   - Key blockers: {', '.join(blocker_items)}")
        prompt_parts.append("")

    prompt_parts.append("\nTASK:")
    prompt_parts.append("Generate 2-3 specific, actionable interventions for EACH applicant.\n")

    prompt_parts.append("RULES:")
    prompt_parts.append("1. Each action must be SPECIFIC (not vague like 'follow up')")
    prompt_parts.append("2. Include realistic deadlines: 'today', 'tomorrow', '2 days', '3 days', '1 week'")
    prompt_parts.append("3. Prioritise based on urgency and probability")
    prompt_parts.append("4. Use UK HE terminology (enrolment, programme, conditional offer)")
    prompt_parts.append("5. Consider applicant's specific stage and blockers")
    prompt_parts.append("6. Actions must be feasible for admissions staff\n")

    prompt_parts.append("ACTION TYPES:")
    prompt_parts.append("- call: Phone call to applicant or admissions office")
    prompt_parts.append("- email: Personalised email with specific content")
    prompt_parts.append("- sms: Text message reminder or update")
    prompt_parts.append("- flag: Flag application for review")
    prompt_parts.append("- unblock: Address specific blocker\n")

    prompt_parts.append("OUTPUT FORMAT (valid JSON array):")
    prompt_parts.append("""[
  {
    "application_id": "uuid",
    "applicant_name": "Full Name",
    "actions": [
      {
        "action_type": "call",
        "description": "Specific action description",
        "deadline": "today",
        "priority": "high",
        "reasoning": "Why this action is needed",
        "script": "Personalized call script or email draft",
        "context": "Background context about applicant's situation",
        "expected_outcome": "What success looks like for this intervention"
      }
    ]
  }
]

PHASE 4: PERSONALIZED CONTENT
For EACH action, you MUST generate:

1. **script**: Personalized intervention content
   - For CALL: Full call script with greeting, context, questions, and closing
     Example: "Hi [Name], this is [Your Name] from [University] Admissions. I'm calling about your application for [Programme]. I noticed you're at the [Stage] stage and wanted to check if you need any help with [Blocker]. [Questions]. We're excited to have you join us!"
   - For EMAIL: Complete email with subject line, greeting, body paragraphs, and signature
     Example: "Subject: Your [Programme] Application - Next Steps\n\nDear [Name],\n\nI hope this email finds you well. I'm writing regarding your application for [Programme] which is currently at the [Stage] stage.\n\n[Specific details about their situation and what's needed]\n\nPlease don't hesitate to reach out if you need any support.\n\nBest regards,\n[Admissions Team]"
   - For FLAG: Specific notes about what to flag and why
   - For UNBLOCK: Detailed steps to address the specific blocker

2. **context**: Rich background explaining why this specific intervention is needed
   - Applicant's current situation and stage
   - Specific blockers or concerns
   - Historical context if relevant
   - Risk factors or opportunities
   Example: "Sarah is at the conditional_offer stage with only 3 weeks until enrolment deadline. She has outstanding document requirements (proof of qualifications) which is blocking progression. Her high engagement score (85%) suggests she's motivated but may need guidance on document submission process."

3. **expected_outcome**: Clear success criteria for this intervention
   - What should happen after the action
   - Metrics or indicators of success
   - Next steps if successful
   Example: "Sarah uploads required documents within 48 hours, moves to unconditional_offer stage, progression probability increases to 90%+. Follow-up with enrolment confirmation email."

Make ALL content highly personalized using the applicant's actual name, programme, stage, and specific blockers.""")

    return "\n".join(prompt_parts)


async def generate_intervention_plans(
    applicant_ids: List[str],
    dataset: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Generate personalised intervention plans using LLM.
    Returns structured plans as list of dicts.
    Phase 3: Core intelligence for action generation.
    """
    try:
        prompt = build_intervention_plan_prompt(applicant_ids, dataset)

        # Use longer timeout (30s) for complex intervention plan generation
        llm = LLMCtx(model="gemini-2.0-flash", temperature=0.3, timeout_ms=30000)
        messages = [
            ("system", "You are a helpful AI assistant that generates structured JSON output for intervention plans. Return ONLY valid JSON, no markdown formatting."),
            ("human", prompt)
        ]

        result = await llm.ainvoke(messages)

        if not result:
            logger.warning("LLM returned empty result for intervention plans")
            return []

        # Parse JSON from result
        # LLM might wrap in markdown code blocks, so clean it
        json_str = result.strip()
        if json_str.startswith("```json"):
            json_str = json_str[7:]  # Remove ```json
        if json_str.startswith("```"):
            json_str = json_str[3:]  # Remove ```
        if json_str.endswith("```"):
            json_str = json_str[:-3]  # Remove ```
        json_str = json_str.strip()

        plans = json.loads(json_str)
        logger.info(f"Generated {len(plans)} intervention plans with {sum(len(p.get('actions', [])) for p in plans)} total actions")

        return plans

    except json.JSONDecodeError as e:
        logger.exception(f"Failed to parse intervention plans JSON: {e}")
        logger.error(f"Raw LLM output: {result[:500] if result else 'None'}")
        return []
    except Exception as e:
        logger.exception(f"Failed to generate intervention plans: {e}")
        return []


def format_intervention_plans_markdown(plans: List[Dict[str, Any]]) -> str:
    """
    Format intervention plans as readable markdown.
    Phase 3: User-facing presentation of generated plans.
    """
    if not plans:
        return "I couldn't generate specific intervention plans. Please try again or contact admissions directly."

    parts = ["I've created personalised intervention plans:\n"]

    total_actions = 0
    action_emojis = {
        "call": "📞",
        "email": "✉️",
        "sms": "📱",
        "flag": "🚩",
        "unblock": "🔓"
    }

    for plan in plans:
        name = plan.get("applicant_name", "Unknown")
        actions = plan.get("actions", [])

        if not actions:
            continue

        parts.append(f"\n**{name}**")

        for action in actions:
            emoji = action_emojis.get(action.get("action_type", ""), "•")
            desc = action.get("description", "")
            deadline = action.get("deadline", "soon")
            priority = action.get("priority", "medium")

            priority_tag = " (HIGH)" if priority == "high" else ""
            parts.append(f"{emoji} {desc} - Deadline: {deadline.capitalize()}{priority_tag}")
            total_actions += 1

    parts.append(f"\n**Total: {total_actions} actions for {len(plans)} applicants**")
    parts.append("\nWould you like me to create these actions in your system?")

    return "\n".join(parts)


async def create_actions_from_plans(
    plans: List[Dict[str, Any]],
    user_id: Optional[str] = None
) -> List[int]:
    """
    Create actions in public.action_queue table from intervention plans.
    Returns list of created action queue IDs.
    Phase 3: Persistence layer for Ivy-generated actions.
    """
    try:
        # Keep user_id as None for Ivy-generated actions (will be NULL in database)
        # Actions can be assigned to users later

        action_ids = []

        for plan in plans:
            app_id = plan.get("application_id")
            if not app_id:
                continue

            for action in plan.get("actions", []):
                # Map deadline to expiration timestamp
                deadline_map = {
                    "today": "NOW() + INTERVAL '1 day'",
                    "tomorrow": "NOW() + INTERVAL '2 days'",
                    "2 days": "NOW() + INTERVAL '2 days'",
                    "3 days": "NOW() + INTERVAL '3 days'",
                    "1 week": "NOW() + INTERVAL '7 days'",
                }
                deadline_str = action.get("deadline", "3 days")
                expires_sql = deadline_map.get(deadline_str, "NOW() + INTERVAL '3 days'")

                # Map priority to numeric score
                priority_map = {
                    "high": 10.0,
                    "medium": 5.0,
                    "low": 2.0
                }
                priority_score = priority_map.get(action.get("priority", "medium"), 5.0)

                # Map action_type (ensure it matches enum constraint)
                action_type = action.get("action_type", "email")
                if action_type not in ["call", "email", "sms", "flag", "unblock"]:
                    action_type = "email"  # Default fallback

                description = action.get("description", "")
                reasoning = action.get("reasoning", "")

                # Phase 4: Extract personalized content for artifacts
                script = action.get("script", "")
                context = action.get("context", "")
                expected_outcome = action.get("expected_outcome", "")

                # Build artifacts JSON
                artifacts = {
                    "script": script,
                    "context": context,
                    "expected_outcome": expected_outcome,
                    "description": description,
                    "reasoning": reasoning
                }

                sql = f"""
                    INSERT INTO public.action_queue
                    (user_id, application_id, action_type, reason, description, priority, created_by_ivy, artifacts, expires_at)
                    VALUES (%s, %s, %s, %s, %s, %s, TRUE, %s, {expires_sql})
                    RETURNING id
                """

                rows = await fetch(
                    sql,
                    user_id,
                    app_id,
                    action_type,
                    reasoning,  # reason field
                    description,  # description field
                    priority_score,
                    json.dumps(artifacts)  # artifacts JSONB
                )

                if rows and len(rows) > 0:
                    action_ids.append(int(rows[0]['id']))

        logger.info(f"Created {len(action_ids)} actions in action_queue from intervention plans")
        return action_ids

    except Exception as e:
        logger.exception(f"Failed to create actions from plans: {e}")
        return []


# ============================================================================
# END INTERVENTION PLAN GENERATION
# ============================================================================


async def _load_dataset(filters: Optional[InsightsFilters]) -> List[Dict[str, Any]]:
    """Load the current applications dataset from the materialised view.

    We prefer vw_board_applications as it already joins person/programme labels
    and exposes ML fields. Fall back to an empty list on failure.
    """
    try:
        where = []
        params: List[Any] = []

        if filters and filters.stage and filters.stage != "all":
            where.append("stage = %s")
            params.append(filters.stage)
        if filters and filters.priority and filters.priority != "all":
            where.append("priority = %s")
            params.append(filters.priority)
        if filters and filters.urgency and filters.urgency != "all":
            where.append("urgency = %s")
            params.append(filters.urgency)
        if filters and filters.program and filters.program != "all":
            where.append("programme_name = %s")
            params.append(filters.program)
        if filters and filters.application_ids:
            where.append("application_id = ANY(%s::uuid[])")
            params.append(filters.application_ids)

        sql = (
            "SELECT application_id, stage, programme_name, progression_probability, "
            "       enrollment_probability, progression_blockers, recommended_actions, "
            "       first_name, last_name, last_activity_at "
            "FROM vw_board_applications "
        )
        if where:
            sql += "WHERE " + " AND ".join(where) + " "
        sql += "ORDER BY created_at DESC LIMIT 1000"

        rows = await fetch(sql, *params)
        return [dict(r) for r in rows]
    except Exception as e:
        logger.exception(f"Failed to load dataset: {e}")
        return []


def extract_action_candidates(dataset: List[Dict[str, Any]], intent: str, query: str) -> List[Candidate]:
    """
    Extract candidate applications for action suggestions based on query intent.
    This is PRIORITY 1 for the frontend - backend is source of truth for suggested actions.
    """
    candidates = []

    # Check if query is about urgent follow-ups or at-risk applicants
    urgent_keywords = [
        'urgent', 'follow up', 'follow-up', 'at risk', 'at-risk', 'attention',
        'unresponsive', 'no response', 'needs action', 'should i', 'who should',
        'which applicants', 'contact', 'reach out', 'call', 'email'
    ]

    query_lower = query.lower()
    is_urgent_query = any(keyword in query_lower for keyword in urgent_keywords)

    logger.info(f"Extracting candidates: intent={intent}, is_urgent_query={is_urgent_query}")

    if not is_urgent_query and intent not in ['risk', 'urgent', 'follow_up']:
        # Not an action-oriented query, return empty
        return candidates

    # Extract high-risk applications for action suggestions
    # Priority order: critical blockers > low probability (< 0.35)
    # Exclude terminal states (no actions possible)
    terminal_stages = {'rejected', 'offer_withdrawn', 'offer_declined', 'enrolled'}

    high_priority = []  # Critical blockers
    medium_priority = []  # Low probability

    for app in dataset:
        stage = app.get('stage', '')

        # Skip terminal states - no point suggesting actions
        if stage in terminal_stages:
            continue

        prog_prob = app.get('progression_probability') or app.get('enrollment_probability')
        blockers = app.get('progression_blockers') or []

        # Check if has critical blockers
        has_critical_blocker = False
        if isinstance(blockers, list):
            for blocker in blockers:
                if isinstance(blocker, dict) and blocker.get('severity') == 'critical':
                    has_critical_blocker = True
                    break

        first_name = app.get('first_name', '')
        last_name = app.get('last_name', '')
        full_name = f"{first_name} {last_name}".strip() if first_name or last_name else "Unknown"

        candidate = Candidate(
            application_id=str(app.get('application_id', '')),
            name=full_name,
            stage=app.get('stage'),
            programme_name=app.get('programme_name')
        )

        # Highest priority: critical blockers
        if has_critical_blocker:
            high_priority.append(candidate)
        # Medium priority: low progression probability (< 0.35) or missing data (0)
        elif prog_prob is not None and prog_prob < 0.35:
            medium_priority.append(candidate)

    # Combine: high priority first, then medium
    candidates = high_priority + medium_priority

    # Limit to top 10 most urgent
    candidates = candidates[:10]

    logger.info(f"Extracted {len(candidates)} candidates: {[c.name for c in candidates[:5]]}")

    return candidates


def _summarise(dataset: List[Dict[str, Any]]) -> PipelineSummary:
    if not dataset:
        return PipelineSummary(
            total=0,
            avgProgression=0,
            highRisk=0,
            highConfidence=0,
            enrollmentEstimate=0.0,
            stageHistogram=[],
            programHistogram=[],
            topBlockers=[],
            topAtRisk=[],
        )

    total = len(dataset)
    probs: List[float] = []
    highRisk = 0
    highConfidence = 0
    enroll_sum = 0.0
    stage_counts: Dict[str, int] = {}
    prog_counts: Dict[str, int] = {}
    blocker_counts: Dict[str, int] = {}

    for row in dataset:
        p = row.get("progression_probability")
        if p is None:
            p = row.get("conversion_probability")  # view may expose both
        try:
            p_float = float(p or 0)
        except Exception:
            p_float = 0.0
        probs.append(p_float)
        if p_float <= 0.35:
            highRisk += 1
        if p_float >= 0.7:
            highConfidence += 1

        try:
            enroll_sum += float(row.get("enrollment_probability") or 0)
        except Exception:
            pass

        stage = (row.get("stage") or "unknown").strip()
        stage_counts[stage] = stage_counts.get(stage, 0) + 1

        prog = (row.get("programme_name") or "unknown").strip()
        prog_counts[prog] = prog_counts.get(prog, 0) + 1

        # blockers as JSON array
        blockers = row.get("progression_blockers") or []
        try:
            if isinstance(blockers, str):
                blockers = json.loads(blockers)
        except Exception:
            blockers = []
        if isinstance(blockers, list):
            for b in blockers:
                item = (b or {}).get("item")
                if not item:
                    continue
                blocker_counts[item] = blocker_counts.get(item, 0) + 1

    avgProgression = int(round((sum(probs) / max(1, total)) * 100))

    stageHistogram = [
        {"stage": k, "count": v} for k, v in sorted(stage_counts.items(), key=lambda x: x[1], reverse=True)
    ]
    programHistogram = [
        {"programme": k, "count": v} for k, v in sorted(prog_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    ]
    topBlockers = [
        {"item": k, "count": v} for k, v in sorted(blocker_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]
    # top at risk list (first_name last_name if available)
    at_risk_sorted = sorted(
        dataset,
        key=lambda r: float(r.get("progression_probability") or r.get("conversion_probability") or 0)
    )[:10]
    topAtRisk = [
        {
            "application_id": str(r.get("application_id")),
            "name": f"{(r.get('first_name') or '').strip()} {(r.get('last_name') or '').strip()}".strip() or "Unknown",
            "probability": float(r.get("progression_probability") or r.get("conversion_probability") or 0),
            "stage": r.get("stage")
        }
        for r in at_risk_sorted
    ]

    return PipelineSummary(
        total=total,
        avgProgression=avgProgression,
        highRisk=highRisk,
        highConfidence=highConfidence,
        enrollmentEstimate=round(float(enroll_sum), 2),
        stageHistogram=stageHistogram,
        programHistogram=programHistogram,
        topBlockers=topBlockers,
        topAtRisk=topAtRisk,
    )


def detect_query_intent(query: str) -> str:
    """
    Detect the intent of the query to provide contextually relevant answers.
    Returns: 'enrolment_forecast', 'stage_analysis', 'programme_comparison',
             'blocker_analysis', 'offer_analysis', 'general_overview'
    """
    query_lower = query.lower()

    # UK HE specific terms
    if any(word in query_lower for word in ["forecast", "enrolment", "enrol", "yield", "projected", "how many", "numbers"]):
        return "enrolment_forecast"
    elif any(word in query_lower for word in ["stage", "stuck", "bottleneck", "where are", "which stage", "pipeline"]):
        return "stage_analysis"
    elif any(word in query_lower for word in ["programme", "program", "course", "which programme", "best performing"]):
        return "programme_comparison"
    elif any(word in query_lower for word in ["blocker", "problem", "issue", "risk", "concern", "stopping"]):
        return "blocker_analysis"
    elif any(word in query_lower for word in ["offer", "conditional", "unconditional", "firm", "insurance", "ucas"]):
        return "offer_analysis"
    elif any(word in query_lower for word in ["health", "overview", "summary", "general", "status"]):
        return "general_overview"
    else:
        return "general_overview"


def build_he_specific_context(summary: PipelineSummary, intent: str) -> Dict[str, Any]:
    """
    Build UK Higher Education-specific context for the LLM based on query intent.
    """
    base_context = {
        "total": summary.total,
        "avg_progression": summary.avgProgression,
        "high_risk": summary.highRisk,
        "high_confidence": summary.highConfidence,
        "enrolment_estimate": summary.enrollmentEstimate,
        "top_blockers": summary.topBlockers[:3],
        "top_at_risk": summary.topAtRisk[:5],
    }

    # Add intent-specific context
    if intent == "enrolment_forecast":
        base_context["forecast_details"] = {
            "projected_enrolment": summary.enrollmentEstimate,
            "conversion_rate": f"{(summary.enrollmentEstimate / max(1, summary.total) * 100):.1f}%",
            "high_confidence_count": summary.highConfidence,
            "at_risk_count": summary.highRisk,
        }

    elif intent == "stage_analysis":
        base_context["stage_details"] = {
            "top_stages": summary.stageHistogram[:8],
            "total_stages": len(summary.stageHistogram),
            "offer_stages": [s for s in summary.stageHistogram if "offer" in s.get("stage", "").lower()],
        }

    elif intent == "programme_comparison":
        base_context["programme_details"] = {
            "top_programmes": summary.programHistogram[:10],
            "total_programmes": len(summary.programHistogram),
        }

    elif intent == "blocker_analysis":
        base_context["blocker_details"] = {
            "all_blockers": summary.topBlockers,
            "blocker_affected_apps": sum(b.get("count", 0) for b in summary.topBlockers),
        }

    elif intent == "offer_analysis":
        offer_stages = [s for s in summary.stageHistogram if "offer" in s.get("stage", "").lower()]
        base_context["offer_details"] = {
            "offer_stages": offer_stages,
            "total_offers": sum(s.get("count", 0) for s in offer_stages),
            "conditional_offers": [s for s in offer_stages if "conditional" in s.get("stage", "").lower()],
            "unconditional_offers": [s for s in offer_stages if "unconditional" in s.get("stage", "").lower()],
        }

    return base_context


def build_he_system_prompt(intent: str) -> str:
    """
    Build UK Higher Education-specific system prompt based on query intent.
    Uses UK English spelling and HE terminology.
    Enhanced to be proactive and action-oriented.
    """
    base_prompt = (
        "You are Ivy, a proactive UK Higher Education admissions AI assistant. "
        "Your role is to identify pipeline risks, suggest interventions, and guide users to action. "
        "\n\n"
        "Response Structure:\n"
        "1. **Summary**: Start with overall pipeline health (1-2 sentences)\n"
        "2. **Risk Stratification**: Identify high-risk applications by name with emoji indicators:\n"
        "   - 🔴 CRITICAL (0-20% probability): Immediate action required\n"
        "   - 🟡 HIGH RISK (20-35% probability): Urgent attention needed\n"
        "   - 🟠 MEDIUM RISK (35-50% probability): Monitor closely\n"
        "3. **Call to Action**: End with: \"Would you like me to create personalised intervention plans for these applicants?\"\n"
        "\n"
        "Style Guidelines:\n"
        "- Use UK English spelling (enrolment not enrollment, programme not program)\n"
        "- Be conversational but precise\n"
        "- Reference specific applicant names from top_at_risk\n"
        "- Include stage context (e.g., 'conditional offer with no response')\n"
        "- Use ONLY the provided statistics - do not invent data\n"
        "\n"
    )

    intent_specific = {
        "enrolment_forecast": (
            "Focus on projected enrolment numbers, conversion rates, and yield optimisation. "
            "Reference typical UK HE benchmarks (30-40% yield is standard). "
            "Consider UCAS cycle context and clearing implications."
        ),
        "stage_analysis": (
            "Focus on stage distribution, identify bottlenecks, and highlight where applications are concentrating. "
            "Consider UK HE stages: director review, conditional/unconditional offers, ready to enrol. "
            "Flag if too many applications are stuck at offer stages (may indicate decision deadline pressure)."
        ),
        "programme_comparison": (
            "Focus on programme performance comparison. "
            "Identify strongest and weakest programmes by application volume and progression. "
            "Suggest resource reallocation if needed."
        ),
        "blocker_analysis": (
            "Focus on blockers preventing progression. "
            "Prioritise by severity and count affected applications. "
            "For UK HE context: highlight consent issues (GDPR), missing CAS (international students), deposit delays."
        ),
        "offer_analysis": (
            "Focus on conditional vs unconditional offers, response rates, and UCAS firm/insurance context. "
            "Flag if offer response rates are low (may need decision deadline reminders). "
            "Consider A-level results period (mid-August) and clearing implications."
        ),
        "general_overview": (
            "Provide a balanced overview of pipeline health. "
            "Cover total applications, progression rate, high-risk cohort, and key blockers. "
            "Frame in UK HE context with actionable recommendations."
        ),
    }

    return base_prompt + intent_specific.get(intent, intent_specific["general_overview"])


def build_he_user_prompt(query: str, context: Dict[str, Any], intent: str) -> str:
    """
    Build UK Higher Education-specific user prompt with rich context.
    """
    prompt = f"Question: {query}\n\n"
    prompt += f"Pipeline Statistics (JSON):\n{json.dumps(context, indent=2)}\n\n"
    prompt += "Rules:\n"
    prompt += "• Do not invent numbers - use only the provided statistics\n"
    prompt += "• Use UK English spelling throughout\n"
    prompt += "• Reference UK HE concepts where relevant (UCAS, conditional offers, clearing, enrolment)\n"
    prompt += "• Justify all recommendations with specific data points\n"

    return prompt


def build_he_user_prompt_with_history(
    query: str,
    context: Dict[str, Any],
    intent: str,
    history: List[ConversationMessage],
    followup_context: Dict[str, Any]
) -> str:
    """
    Build user prompt with conversation history for context-aware responses.
    Phase 2: Enables multi-turn conversations.
    """
    prompt_parts = []

    # If this is a follow-up, include previous conversation
    if followup_context.get("is_followup") and len(history) > 0:
        prompt_parts.append("CONVERSATION HISTORY:")
        # Include last 6 messages (3 turns)
        recent_history = history[-6:]
        for msg in recent_history:
            prefix = "User" if msg.role == "user" else "Assistant"
            # Truncate long messages for context window
            content_preview = msg.content[:500] + "..." if len(msg.content) > 500 else msg.content
            prompt_parts.append(f"{prefix}: {content_preview}")

        prompt_parts.append("\n---\n")

        # Add follow-up context
        followup_type = followup_context.get("followup_type")
        if followup_type == "affirmative":
            prompt_parts.append("✅ The user has responded affirmatively to your previous question.")
            referenced = followup_context.get("referenced_applicants", [])
            if referenced:
                prompt_parts.append(f"Continue the conversation about these {len(referenced)} applicants you mentioned.")
                prompt_parts.append(f"Application IDs: {', '.join(referenced[:5])}")
        elif followup_type == "question":
            prompt_parts.append("❓ The user is asking a follow-up question about your previous response.")
            referenced = followup_context.get("referenced_applicants", [])
            if referenced:
                prompt_parts.append(f"Context: You previously discussed {len(referenced)} applicants.")
        elif followup_type == "elaboration":
            prompt_parts.append("📖 The user wants more details about your previous response.")

        prompt_parts.append("\n")

    # Add current query
    prompt_parts.append(f"CURRENT QUERY: {query}\n")

    # Add context (pipeline stats)
    prompt_parts.append(f"PIPELINE DATA (JSON):\n{json.dumps(context, indent=2)}\n\n")

    # Add rules
    prompt_parts.append("Rules:\n")
    prompt_parts.append("• Do not invent numbers - use only the provided statistics\n")
    prompt_parts.append("• Use UK English spelling throughout\n")
    prompt_parts.append("• Reference UK HE concepts where relevant (UCAS, conditional offers, clearing, enrolment)\n")
    prompt_parts.append("• Justify all recommendations with specific data points\n")
    if followup_context.get("is_followup"):
        prompt_parts.append("• Continue naturally from the previous conversation\n")
        prompt_parts.append("• Reference what you said before (e.g., 'As I mentioned...', 'The 5 applicants I identified...')\n")

    return "\n".join(prompt_parts)


def build_uk_he_fallback(summary: PipelineSummary, intent: str) -> str:
    """
    Build UK HE-specific fallback response when LLM narration fails.
    Uses UK English spelling and HE terminology.
    Enhanced to be proactive and action-oriented.
    """
    # Overall health summary
    health_status = "strong" if summary.avgProgression > 60 else "moderate" if summary.avgProgression > 40 else "concerning"
    parts = [
        f"Your pipeline looks {health_status} overall. "
        f"{summary.total} applications with {summary.avgProgression}% average progression."
    ]

    # Projected conversions
    if summary.enrollmentEstimate > 0:
        parts.append(f"Projected enrolment: {int(summary.enrollmentEstimate)} students.")

    # Risk stratification
    if summary.highRisk > 0:
        risk_pct = int(summary.highRisk/max(1,summary.total)*100)
        parts.append(f"\nHowever, {summary.highRisk} applications ({risk_pct}%) are at high risk:")

        # List top at-risk applicants with emoji indicators
        for i, app in enumerate(summary.topAtRisk[:5], 1):
            prob = app.get('probability', 0)
            if prob <= 0.20:
                emoji = "🔴"
                risk_level = "CRITICAL"
            elif prob <= 0.35:
                emoji = "🟡"
                risk_level = "HIGH RISK"
            else:
                emoji = "🟠"
                risk_level = "MEDIUM RISK"

            stage = app.get('stage', 'unknown stage').replace('_', ' ')
            parts.append(f"{emoji} **{app.get('name', 'Unknown')}** ({stage}) - {risk_level}")

    if summary.topBlockers:
        top_blocker = summary.topBlockers[0]
        parts.append(f"\nTop blocker: {top_blocker['item']} ({top_blocker['count']} applications)")

    # Intent-specific insights
    if intent == "enrolment_forecast":
        yield_rate = (summary.enrollmentEstimate / max(1, summary.total)) * 100
        parts.append(f"Projected enrolment: {summary.enrollmentEstimate:.0f} students ({yield_rate:.1f}% yield)")
        insights = [
            f"Yield rate of {yield_rate:.1f}% {'is below' if yield_rate < 30 else 'aligns with' if yield_rate < 40 else 'exceeds'} typical UK HE benchmarks (30-40%)",
            f"High-risk cohort ({summary.highRisk} apps) needs immediate attention to improve conversion",
            f"High-confidence applicants ({summary.highConfidence}) should be fast-tracked to enrolment",
        ]
        actions = [
            "Run targeted outreach campaign for high-risk applicants",
            "Send decision deadline reminders to conditional offer holders",
            "Fast-track high-confidence applicants through remaining stages",
        ]

    elif intent == "stage_analysis":
        top_stages = summary.stageHistogram[:3]
        stage_names = [s['stage'] for s in top_stages]
        insights = [
            f"Top stages: {', '.join(stage_names)} - check for bottlenecks",
            f"Offer stages have {sum(s['count'] for s in summary.stageHistogram if 'offer' in s.get('stage','').lower())} applications awaiting response",
            f"Director review stages may indicate capacity constraints" if any('director' in s.get('stage','').lower() for s in top_stages) else "Stage distribution appears balanced",
        ]
        actions = [
            "Review capacity at bottleneck stages",
            "Chase conditional offer responses approaching decision deadlines",
            "Consider expediting director reviews if backlogged",
        ]

    elif intent == "blocker_analysis":
        insights = [
            f"Primary blocker affects {summary.topBlockers[0]['count'] if summary.topBlockers else 0} applications",
            "Consent issues (GDPR) prevent outreach - run consent capture campaign" if any('consent' in b.get('item','').lower() for b in summary.topBlockers) else "Review blocker resolution timelines",
            "Portal engagement low - applicants may not be actively engaged" if any('portal' in b.get('item','').lower() for b in summary.topBlockers) else "Focus on top 3 blockers for maximum impact",
        ]
        actions = [
            f"Address top blocker: {summary.topBlockers[0]['item']}" if summary.topBlockers else "Review and prioritise blockers",
            "Run consent capture campaign if GDPR blocking outreach",
            "Send portal login instructions to re-engage inactive applicants",
        ]

    elif intent == "offer_analysis":
        offer_stages = [s for s in summary.stageHistogram if "offer" in s.get("stage", "").lower()]
        total_offers = sum(s.get("count", 0) for s in offer_stages)
        insights = [
            f"{total_offers} applications at offer stages (conditional/unconditional)",
            "Offer response rates may be impacted by UCAS firm/insurance decisions elsewhere",
            "Consider pre-results deposit campaigns for conditional offer holders",
        ]
        actions = [
            "Send decision deadline reminders to offer holders",
            "Run pre-results deposit campaign to secure commitments",
            "Flag unconditional offers not responded to (may have firmed elsewhere)",
        ]

    else:  # general_overview
        insights = [
            f"High-risk cohort ({summary.highRisk}) needs attention - below 35% progression probability",
            "Concentration in top stages may indicate bottleneck" if summary.stageHistogram else "Review pipeline balance",
            f"Projected enrolment ({summary.enrollmentEstimate:.0f}) suggests {'potential yield improvement needed' if summary.enrollmentEstimate < summary.total * 0.3 else 'healthy conversion trajectory'}",
        ]
        actions = [
            "Prioritise outreach to high-risk applications",
            f"Address top blocker with targeted campaign: {summary.topBlockers[0]['item']}" if summary.topBlockers else "Review and resolve blockers",
            "Review stage bottlenecks and rebalance capacity",
        ]

    answer = " ".join(parts)
    answer += "\n\n**Insights:**\n" + "\n".join([f"• {i}" for i in insights])
    answer += "\n\n**Next Actions:**\n" + "\n".join([f"• {a}" for a in actions])

    # Add call-to-action for high-risk applications
    if summary.highRisk > 0:
        answer += "\n\n**Would you like me to create personalised intervention plans for these applicants?**"

    return answer


@router.post("/summary", response_model=PipelineSummary)
async def summary_ep(filters: InsightsFilters):
    dataset = await _load_dataset(filters)
    return _summarise(dataset)


@router.post("/ask", response_model=AskResponse)
async def ask_ep(req: AskRequest):
    try:
        logger.info(f"Applications insights query: {req.query}")

        # Phase 2: Get or create conversation session
        session_id = req.session_id or await get_or_create_session(
            user_id=None,  # TODO: Get from auth context
            board_context="applications"
        )
        logger.info(f"Using session: {session_id}")

        # Phase 2: Load conversation history
        history = await get_conversation_history(session_id, limit=10)
        logger.info(f"Loaded {len(history)} messages from conversation history")

        # Phase 2: Detect if this is a follow-up query
        followup_context = await detect_followup_intent(req.query, history)
        if followup_context.get("is_followup"):
            logger.info(f"Detected follow-up: {followup_context.get('followup_type')}, "
                       f"referenced {len(followup_context.get('referenced_applicants', []))} applicants")
            logger.info(f"DEBUG: Referenced applicant IDs: {followup_context.get('referenced_applicants', [])}")
        else:
            logger.info("DEBUG: Not a follow-up query")

        # PHASE 3: Check if user is confirming action creation
        if followup_context.get("is_followup") and followup_context.get("followup_type") == "affirmative":
            # Check if previous message asked about creating actions in system
            last_assistant_msg = next(
                (msg for msg in reversed(history) if msg.role == "assistant"),
                None
            )

            if last_assistant_msg and "create these actions in your system" in last_assistant_msg.content.lower():
                # User is confirming action creation!
                logger.info("User confirmed action creation - executing intervention plans")

                # Get referenced applicants from last message
                applicant_ids = followup_context.get("referenced_applicants", [])

                if applicant_ids:
                    # Load dataset
                    dataset = await _load_dataset(req.filters)

                    # Generate intervention plans
                    plans = await generate_intervention_plans(applicant_ids, dataset)
                    logger.info(f"📋 Generated {len(plans)} plans, now creating actions in database...")

                    # Create actions in database
                    action_ids = await create_actions_from_plans(plans, user_id=None)
                    logger.info(f"💾 Created {len(action_ids) if action_ids else 0} actions, IDs: {action_ids}")

                    if action_ids:
                        answer = f"✅ I've created {len(action_ids)} actions in the system for {len(plans)} applicants.\n\n"
                        answer += "You can view and refine them in the Actions panel. The actions include:\n"

                        # Summarise created actions
                        action_types = {}
                        for plan in plans:
                            for action in plan.get("actions", []):
                                atype = action.get("action_type", "other")
                                action_types[atype] = action_types.get(atype, 0) + 1

                        for atype, count in action_types.items():
                            answer += f"• {count} {atype} actions\n"

                        answer += "\nClick the Actions badge to review and execute them."

                        # Store message and return
                        await add_message_to_session(
                            session_id=session_id,
                            role="user",
                            content=req.query,
                            query_intent="confirm_action_creation"
                        )

                        await add_message_to_session(
                            session_id=session_id,
                            role="assistant",
                            content=answer,
                            mentioned_application_ids=applicant_ids,
                            backend_candidates=applicant_ids
                        )

                        return AskResponse(
                            answer=answer,
                            summary=_summarise(dataset),
                            candidates=[],
                            session_id=session_id
                        )
                    else:
                        logger.warning(f"❌ Action creation returned no IDs - falling through to normal flow")
                else:
                    logger.warning(f"❌ No applicant IDs found for action creation - falling through")

            # Check if user is saying yes to "create intervention plans"
            if last_assistant_msg:
                logger.info(f"DEBUG: Last assistant message preview: {last_assistant_msg.content[:200]}...")
                logger.info(f"DEBUG: Contains intervention plans text: {'would you like me to create personalised intervention plans' in last_assistant_msg.content.lower()}")
                logger.info(f"DEBUG: Backend candidates from last message: {last_assistant_msg.backend_candidates}")

            if last_assistant_msg and "would you like me to create personalised intervention plans" in last_assistant_msg.content.lower():
                # User wants intervention plans generated (but not created yet)
                logger.info("✅ User requested intervention plan generation (Step 1)")

                applicant_ids = followup_context.get("referenced_applicants", [])
                logger.info(f"DEBUG: Applicant IDs from followup_context: {applicant_ids}")

                if applicant_ids:
                    logger.info(f"✅ Generating intervention plans for {len(applicant_ids)} applicants")
                    dataset = await _load_dataset(req.filters)
                    plans = await generate_intervention_plans(applicant_ids, dataset)
                    answer = format_intervention_plans_markdown(plans)

                    await add_message_to_session(
                        session_id=session_id,
                        role="user",
                        content=req.query,
                        query_intent="request_intervention_plans"
                    )

                    await add_message_to_session(
                        session_id=session_id,
                        role="assistant",
                        content=answer,
                        mentioned_application_ids=applicant_ids,
                        query_intent="show_intervention_plans",
                        backend_candidates=applicant_ids
                    )

                    return AskResponse(
                        answer=answer,
                        summary=_summarise(dataset),
                        candidates=[],  # Plans are in the message, not candidates
                        session_id=session_id
                    )
                else:
                    logger.warning(f"❌ No applicant IDs found - cannot generate intervention plans")

        # Load dataset and compute summary
        dataset = await _load_dataset(req.filters)
        summary = _summarise(dataset)

        # Detect query intent for UK HE context
        intent = detect_query_intent(req.query)
        logger.info(f"Detected query intent: {intent}")

        # Build UK HE-specific context
        context = build_he_specific_context(summary, intent)

        # Build UK HE-specific prompts WITH conversation history
        system_prompt = build_he_system_prompt(intent)
        user_prompt = build_he_user_prompt_with_history(
            req.query,
            context,
            intent,
            history=history,
            followup_context=followup_context
        )

        # Attempt LLM narration with UK HE-specific system prompt
        answer = None
        try:
            logger.info("Calling LLM with UK HE-specific prompts and conversation history")

            # Use LLMCtx directly to pass our custom system prompt
            llm = LLMCtx(model="gemini-2.0-flash", temperature=0.4)
            messages = [
                ("system", system_prompt),
                ("human", user_prompt)
            ]

            result = await llm.ainvoke(messages)

            if result and isinstance(result, str):
                answer = result.strip()
                logger.info(f"LLM narration successful, length: {len(answer)}")
            else:
                logger.warning(f"Unexpected LLM result format: {type(result)}")
                answer = None

        except Exception as e:
            logger.exception(f"LLM narration failed: {e}")
            answer = None

        # Fallback to UK HE-specific deterministic template
        if not answer:
            logger.info(f"Using UK HE fallback template for intent: {intent}")
            answer = build_uk_he_fallback(summary, intent)

        # Extract candidates for action suggestions (PRIORITY 1 for frontend)
        candidates = extract_action_candidates(dataset, intent, req.query)
        logger.info(f"Extracted {len(candidates)} candidates for action suggestions")

        # PHASE 3: If answer asks about creating intervention plans but candidates is empty,
        # extract applicant IDs mentioned in the response
        candidate_ids_for_history = [c.application_id for c in candidates]
        if not candidate_ids_for_history and answer and "create personalised intervention plans" in answer.lower():
            logger.info("🔍 Response asks about intervention plans but candidates empty - extracting from topAtRisk")
            # Get applicant names mentioned in the response and map to IDs
            import re
            mentioned_names = []
            # Look for patterns like "Harper Martin", "Marco Rossi" in the response
            logger.info(f"🔍 Checking top {min(15, len(summary.topAtRisk))} at-risk applicants for name matches")
            for app in summary.topAtRisk[:15]:  # Check top 15 to be safe
                name = app.get('name', '')
                if name and name in answer:
                    mentioned_names.append(name)
                    logger.info(f"  ✅ Found '{name}' in response")

            logger.info(f"🔍 Found {len(mentioned_names)} mentioned names: {mentioned_names}")

            # Map names to IDs
            top_at_risk_ids = []
            for app in summary.topAtRisk:
                if app.get('name', '') in mentioned_names:
                    app_id = str(app.get('application_id', ''))
                    if app_id:
                        top_at_risk_ids.append(app_id)
                        logger.info(f"  ✅ Mapped '{app.get('name')}' → {app_id}")

            candidate_ids_for_history = top_at_risk_ids
            logger.info(f"✅ Extracted {len(candidate_ids_for_history)} at-risk IDs for intervention plans")

        # Phase 2: Store user message in conversation history
        await add_message_to_session(
            session_id=session_id,
            role="user",
            content=req.query,
            query_intent=intent
        )

        # Phase 2: Store assistant response in conversation history
        await add_message_to_session(
            session_id=session_id,
            role="assistant",
            content=answer,
            mentioned_application_ids=candidate_ids_for_history,
            query_intent=intent,
            backend_candidates=candidate_ids_for_history
        )

        return AskResponse(
            answer=answer,
            summary=summary,
            confidence=0.9 if answer else 0.7,
            candidates=candidates,
            session_id=session_id  # Phase 2: Return session_id for next query
        )

    except Exception as e:
        logger.exception(f"Insights endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Insights failed: {str(e)}")
