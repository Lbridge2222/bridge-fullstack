"""
Actions API Router
Intelligent action triage, simulation, and execution
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime
import logging
import time
import hashlib

from app.db.db import fetch, fetchrow, execute
from app.ai.triage_engine import generate_triage_queue, persist_triage_to_queue
from app.ai.application_ml import extract_application_features, predict_stage_progression

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/actions", tags=["actions"])


# ============================================================================
# Helper Functions
# ============================================================================

async def get_current_user_id() -> str:
    """
    Get current user ID from database.
    TODO: Replace with proper auth once implemented.
    For now, returns first user from public.users table.
    """
    row = await fetchrow("SELECT id, name, email FROM public.users ORDER BY created_at DESC LIMIT 1")
    if not row:
        raise HTTPException(status_code=500, detail="No users found in public.users table")
    logger.info(f"Using user: {row['name']} ({row['email']}) with ID {row['id']}")
    return str(row['id'])


# ============================================================================
# Request/Response Models
# ============================================================================

class TriageRequest(BaseModel):
    limit: Optional[int] = 5
    filters: Optional[Dict[str, Any]] = None


class TriageItem(BaseModel):
    id: Optional[int] = None
    application_id: str
    applicant_name: str
    stage: str
    action_type: str
    reason: str
    priority: float
    expected_gain: Optional[float] = None
    artifacts: Optional[Dict[str, Any]] = None
    expires_at: Optional[str] = None


class TriageResponse(BaseModel):
    queue: List[TriageItem]
    generated_at: str
    count: int


class SimulateRequest(BaseModel):
    queue_id: Optional[int] = None
    application_id: Optional[str] = None
    action_type: str


class SimulateResponse(BaseModel):
    artifacts: Dict[str, Any]
    recommended: bool
    expected_gain: float
    reason: str


class ExecuteRequest(BaseModel):
    queue_id: Optional[int] = None
    application_id: str
    action_type: str
    artifacts: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class ExecuteResponse(BaseModel):
    ok: bool
    execution_id: int
    result: str
    message: str


class CompleteActionRequest(BaseModel):
    """Phase 4: Action completion with outcome tracking"""
    action_id: int
    outcome_notes: str
    success: bool = True


class CompleteActionResponse(BaseModel):
    """Phase 4: Action completion response with Ivy follow-up"""
    ok: bool
    action_id: int
    follow_up_message: Optional[str] = None
    suggested_next_actions: Optional[List[str]] = None


class SessionPatchRequest(BaseModel):
    delta: Dict[str, Any]


class ConversationSyncRequest(BaseModel):
    """Sync conversation context from frontend to backend."""
    application_id: str
    messages: List[Dict[str, str]]  # [{role: 'user'|'ai', content: str, timestamp: str}]
    key_concerns: Optional[List[str]] = None


# ============================================================================
# Session Management
# ============================================================================

@router.get("/session")
async def get_session():
    """
    Get user session context.

    Returns:
        session_ctx: Current session state
    """
    user_id = await get_current_user_id()

    try:
        row = await fetchrow(
            "SELECT session_ctx FROM user_session_memory WHERE user_id = %s",
            user_id
        )

        if row:
            return {"session_ctx": row['session_ctx']}
        else:
            # Initialize empty session
            default_ctx = {
                "activeStage": None,
                "viewedApplications": [],
                "lastTriageIds": [],
                "preferences": {"comms": "email"}
            }

            await execute(
                """
                INSERT INTO user_session_memory (user_id, session_ctx)
                VALUES (%s, %s)
                ON CONFLICT (user_id) DO NOTHING
                """,
                user_id,
                default_ctx
            )

            return {"session_ctx": default_ctx}

    except Exception as e:
        logger.exception(f"Failed to get session: {e}")
        raise HTTPException(status_code=500, detail=f"Session fetch failed: {str(e)}")


@router.patch("/session")
async def patch_session(request: SessionPatchRequest):
    """
    Update session context (merge delta).

    Args:
        delta: Partial update to session_ctx

    Returns:
        ok: Success indicator
    """
    user_id = await get_current_user_id()

    try:
        # Merge delta into existing session
        await execute(
            """
            UPDATE user_session_memory
            SET session_ctx = session_ctx || %s::jsonb,
                updated_at = NOW()
            WHERE user_id = %s
            """,
            request.delta,
            user_id
        )

        return {"ok": True}

    except Exception as e:
        logger.exception(f"Failed to patch session: {e}")
        raise HTTPException(status_code=500, detail=f"Session update failed: {str(e)}")


@router.post("/session/conversation")
async def sync_conversation(request: ConversationSyncRequest):
    """
    Sync conversation context from frontend to backend for action personalization.

    Stores recent conversation for a specific application to enable:
    - Conversation-aware action generation
    - Personalized call scripts
    - Context-aware reasoning

    Args:
        application_id: Application being discussed
        messages: Recent conversation messages
        key_concerns: Optional extracted concerns

    Returns:
        ok: Success indicator
    """
    user_id = await get_current_user_id()

    try:
        # Get current session
        row = await fetchrow(
            "SELECT session_ctx FROM user_session_memory WHERE user_id = %s",
            user_id
        )

        if not row:
            # Initialize session if missing
            try:
                await execute(
                    """
                    INSERT INTO user_session_memory (user_id, session_ctx)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id) DO NOTHING
                    """,
                    user_id,
                    {"recent_conversations": {}}
                )
            except Exception as insert_error:
                # If FK constraint fails, user doesn't exist in users table
                # Fall back to in-memory only (log warning but don't fail)
                logger.warning(f"Failed to create session memory (user not in users table): {insert_error}")
                # Return success anyway - conversation will be tracked in frontend only
                return {"ok": True, "warning": "Session not persisted (user not in database)"}

            session_ctx = {"recent_conversations": {}}
        else:
            session_ctx = row['session_ctx']

        # Ensure recent_conversations exists
        if 'recent_conversations' not in session_ctx:
            session_ctx['recent_conversations'] = {}

        # Store conversation for this application
        session_ctx['recent_conversations'][request.application_id] = {
            'messages': request.messages[-10:],  # Keep last 10 messages
            'key_concerns': request.key_concerns or [],
            'last_updated': datetime.now().isoformat()
        }

        # Keep only last 20 conversations (limit storage)
        conversations = session_ctx['recent_conversations']
        if len(conversations) > 20:
            # Sort by last_updated and keep newest 20
            sorted_convos = sorted(
                conversations.items(),
                key=lambda x: x[1].get('last_updated', ''),
                reverse=True
            )
            session_ctx['recent_conversations'] = dict(sorted_convos[:20])

        # Update session
        await execute(
            """
            UPDATE user_session_memory
            SET session_ctx = %s::jsonb,
                updated_at = NOW()
            WHERE user_id = %s
            """,
            session_ctx,
            user_id
        )

        logger.info(f"Synced conversation for application {request.application_id}, {len(request.messages)} messages")

        return {"ok": True}

    except Exception as e:
        logger.exception(f"Failed to sync conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Conversation sync failed: {str(e)}")


# ============================================================================
# Triage Queue Generation
# ============================================================================

@router.post("/triage", response_model=TriageResponse)
async def generate_triage(request: TriageRequest):
    """
    Generate prioritized action queue using sophisticated triage engine.

    Priority formula:
    priority = (impact_weight * conversion_delta) +
               (urgency_weight * stage_sla_breach_risk) +
               (freshness_weight * engagement_decay)

    Returns:
        queue: List of TriageItems sorted by priority (descending)
        generated_at: Timestamp
        count: Number of items
    """
    user_id = await get_current_user_id()
    start_time = time.time()

    try:
        logger.info(f"Generating triage for user {user_id}, limit={request.limit}")

        # Generate triage queue using ML engine
        triage_items = await generate_triage_queue(
            user_id=user_id,
            limit=request.limit or 5,
            filters=request.filters
        )

        # Persist to database
        if triage_items:
            await persist_triage_to_queue(user_id, triage_items)

        # Convert to response model
        queue = [TriageItem(**item) for item in triage_items]

        latency_ms = int((time.time() - start_time) * 1000)

        # Log telemetry (skip user_id to avoid FK constraint issues)
        try:
            await execute(
                """
                INSERT INTO ai_events (event_type, action, model, latency_ms, payload_json)
                VALUES (%s, %s, %s, %s, %s)
                """,
                "triage",
                "generate_queue",  # action column
                "triage_engine",
                latency_ms,
                {
                    "count": len(queue),
                    "limit": request.limit,
                    "filters": request.filters,
                    "user_id": user_id  # Store in payload instead
                }
            )
        except Exception as telemetry_error:
            logger.warning(f"Telemetry logging failed: {telemetry_error}")

        logger.info(f"Generated {len(queue)} triage items in {latency_ms}ms")

        return TriageResponse(
            queue=queue,
            generated_at=datetime.now().isoformat(),
            count=len(queue)
        )

    except Exception as e:
        logger.exception(f"Triage generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Triage failed: {str(e)}")


# ============================================================================
# Action Simulation (Preview)
# ============================================================================

@router.post("/simulate", response_model=SimulateResponse)
async def simulate_action(
    request: SimulateRequest,
    
):
    """
    Simulate an action to preview artifacts without executing.

    Used for "preview" functionality in UI before sending.

    Args:
        queue_id: Optional queue item ID (if from queue)
        application_id: Required if not from queue
        action_type: Type of action to simulate

    Returns:
        artifacts: Generated message/script/etc
        recommended: Whether this action is recommended
        expected_gain: Expected probability increase
        reason: Why this action is recommended
    """
    user_id = await get_current_user_id()
    
    try:
        # Get application details
        if request.queue_id:
            # From queue
            queue_item = await fetchrow(
                "SELECT * FROM action_queue WHERE id = %s AND user_id = %s",
                request.queue_id,
                user_id
            )
            if not queue_item:
                raise HTTPException(status_code=404, detail="Queue item not found")

            app_id = str(queue_item['application_id'])
            artifacts = queue_item['artifacts']
            expected_gain = float(queue_item['expected_gain'] or 0.0)
            reason = queue_item['reason']

        else:
            # Direct simulation
            if not request.application_id:
                raise HTTPException(status_code=400, detail="application_id required")

            app_id = request.application_id

            # Generate artifacts on-the-fly
            features = await extract_application_features(app_id)
            prediction = predict_stage_progression(features)

            from app.ai.triage_engine import (
                generate_artifacts,
                determine_urgency_context,
                generate_action_reason
            )

            stage = features.get('stage', 'unknown')
            urgency_context = determine_urgency_context(features, stage)
            reason = generate_action_reason(request.action_type, features, stage, urgency_context)
            artifacts = generate_artifacts(request.action_type, features, reason, prediction)

            # Rough estimate of expected gain
            expected_gain = 0.1  # TODO: More sophisticated estimate

        return SimulateResponse(
            artifacts=artifacts,
            recommended=expected_gain > 0.05,
            expected_gain=expected_gain,
            reason=reason
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


# ============================================================================
# Action Execution
# ============================================================================

@router.post("/execute", response_model=ExecuteResponse)
async def execute_action(
    request: ExecuteRequest,
    
):
    """
    Execute an action (send email, log call, flag, etc).

    For Phase A:
    - Email: Logs as "sent" (actual sending deferred to integration)
    - Call: Logs as "sent" (assumes manual call)
    - Flag: Marks application for review
    - Unblock: Logs blocker removal

    Args:
        queue_id: Optional queue item ID
        application_id: Required
        action_type: Type of action
        artifacts: Optional custom artifacts (overrides queue)
        metadata: Optional execution metadata

    Returns:
        ok: Success indicator
        execution_id: ID of execution record
        result: 'sent'|'failed'|'skipped'
        message: Human-readable result
    """
    user_id = await get_current_user_id()
    start_time = time.time()

    try:
        logger.info(f"Executing action: {request.action_type} for {request.application_id}")

        # Validate application exists
        app_row = await fetchrow(
            "SELECT id, stage FROM applications WHERE id = %s",
            request.application_id
        )
        if not app_row:
            raise HTTPException(status_code=404, detail="Application not found")

        # Get artifacts (from request or queue)
        artifacts = request.artifacts
        if not artifacts and request.queue_id:
            queue_item = await fetchrow(
                "SELECT artifacts FROM action_queue WHERE id = %s AND user_id = %s",
                request.queue_id,
                user_id
            )
            if queue_item:
                artifacts = queue_item['artifacts']

        # Execute based on action type
        result = "sent"
        message = ""

        if request.action_type == "email":
            # Phase A: Log as sent (actual email sending deferred)
            # Future: Integrate with SendGrid/Mailgun
            message = "Email logged as sent (integration pending)"
            result = "simulated"  # Mark as simulated for now

        elif request.action_type == "call":
            # Phase A: Log call as completed
            message = "Call logged (manual execution)"
            result = "sent"

        elif request.action_type == "flag":
            # Mark application as flagged
            await execute(
                "UPDATE applications SET priority = 'high' WHERE id = %s",
                request.application_id
            )
            message = "Application flagged for review"
            result = "sent"

        elif request.action_type == "unblock":
            # Log unblock action (specific unblocking logic TBD)
            message = "Blocker removal logged"
            result = "sent"

        else:
            raise HTTPException(status_code=400, detail=f"Unknown action type: {request.action_type}")

        # Insert execution record
        execution_id = await fetchrow(
            """
            INSERT INTO action_executions
                (queue_id, user_id, application_id, action_type, result, metadata)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            request.queue_id,
            user_id,
            request.application_id,
            request.action_type,
            result,
            {
                **(request.metadata or {}),
                "artifacts": artifacts,
                "executed_via": "api"
            }
        )

        # Remove from queue if executed via queue
        if request.queue_id:
            await execute(
                "DELETE FROM action_queue WHERE id = %s",
                request.queue_id
            )

        latency_ms = int((time.time() - start_time) * 1000)

        # Log telemetry (skip user_id to avoid FK constraint issues)
        try:
            await execute(
                """
                INSERT INTO ai_events (event_type, action, model, latency_ms, payload_json)
                VALUES (%s, %s, %s, %s, %s)
                """,
                "action_execution",
                request.action_type,  # action column (email/call/flag/unblock)
                "actions_system",
                latency_ms,
                {
                    "application_id": request.application_id,
                    "action_type": request.action_type,
                    "result": result,
                    "user_id": user_id  # Store in payload instead
                }
            )
        except Exception as telemetry_error:
            logger.warning(f"Telemetry logging failed: {telemetry_error}")

        logger.info(f"Action executed successfully: {execution_id['id']}, result={result}")

        return ExecuteResponse(
            ok=True,
            execution_id=int(execution_id['id']),
            result=result,
            message=message
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Execution failed: {e}")

        # Log failed execution
        try:
            await execute(
                """
                INSERT INTO action_executions
                    (user_id, application_id, action_type, result, metadata)
                VALUES (%s, %s, %s, %s, %s)
                """,
                user_id,
                request.application_id,
                request.action_type,
                "failed",
                {"error": str(e)}
            )
        except:
            pass

        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


# ============================================================================
# Action Completion (Phase 4: Feedback Loop)
# ============================================================================

@router.patch("/{action_id}/complete", response_model=CompleteActionResponse)
async def complete_action(action_id: int, request: CompleteActionRequest):
    """
    Phase 4: Mark action as complete and generate Ivy follow-up suggestions.

    When an Ivy-generated action is completed, this endpoint:
    1. Updates the action status/execution record
    2. Analyzes the outcome
    3. Generates follow-up recommendations from Ivy
    4. Stores follow-up in conversation session for Ask Ivy to display

    Args:
        action_id: Action queue ID to complete
        outcome_notes: User's notes about the outcome
        success: Whether the action was successful

    Returns:
        ok: Success indicator
        action_id: Completed action ID
        follow_up_message: Ivy's analysis and recommendations
        suggested_next_actions: List of suggested next steps
    """
    user_id = await get_current_user_id()

    try:
        # Get action details from queue
        action = await fetchrow(
            """
            SELECT aq.*,
                   a.stage,
                   p.first_name || ' ' || p.last_name AS applicant_name,
                   pr.name AS programme_name
            FROM action_queue aq
            JOIN applications a ON a.id = aq.application_id
            JOIN people p ON p.id = a.person_id
            LEFT JOIN programmes pr ON pr.id = a.programme_id
            WHERE aq.id = %s
            """,
            action_id
        )

        if not action:
            raise HTTPException(status_code=404, detail="Action not found")

        # Log execution as completed
        execution_result = "sent" if request.success else "failed"
        execution_id = await fetchrow(
            """
            INSERT INTO action_executions
                (queue_id, user_id, application_id, action_type, result, metadata)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            action_id,
            user_id,
            str(action['application_id']),
            action['action_type'],
            execution_result,
            {
                "outcome_notes": request.outcome_notes,
                "success": request.success,
                "completed_at": datetime.now().isoformat()
            }
        )

        # Remove from queue
        await execute("DELETE FROM action_queue WHERE id = %s", action_id)

        logger.info(f"✅ Action {action_id} completed: {action['action_type']} for {action['applicant_name']}")

        # Phase 4: Generate Ivy follow-up if action was created by Ivy
        follow_up_message = None
        suggested_next_actions = []

        if action.get('created_by_ivy'):
            try:
                from app.ai.safe_llm import LLMCtx

                # Build prompt for follow-up analysis
                prompt = f"""You are Ivy, a UK Higher Education admissions AI assistant.

An action you recommended has been completed. Analyze the outcome and suggest next steps.

**Action Completed:**
- Applicant: {action['applicant_name']}
- Programme: {action.get('programme_name', 'Unknown')}
- Stage: {action['stage']}
- Action Type: {action['action_type']}
- Original Reason: {action.get('reason', 'N/A')}
- Success: {'Yes' if request.success else 'No'}
- Outcome Notes: {request.outcome_notes}

**Task:**
Provide a brief analysis (2-3 sentences) and suggest 1-3 specific next actions.

**Response Format:**
Analysis: [Your 2-3 sentence analysis]

Next Steps:
1. [Specific action 1]
2. [Specific action 2]
3. [Specific action 3]"""

                llm = LLMCtx(model="gemini-2.0-flash", temperature=0.5, timeout_ms=15000)
                messages = [
                    ("system", "You are Ivy, a helpful AI assistant for UK Higher Education admissions. Provide concise, actionable recommendations."),
                    ("human", prompt)
                ]

                result = await llm.ainvoke(messages)

                if result:
                    follow_up_message = result.strip()

                    # Extract suggested actions (lines starting with numbers)
                    import re
                    action_pattern = r'^\d+\.\s*(.+)$'
                    for line in follow_up_message.split('\n'):
                        match = re.match(action_pattern, line.strip())
                        if match:
                            suggested_next_actions.append(match.group(1))

                    logger.info(f"💡 Generated Ivy follow-up with {len(suggested_next_actions)} suggestions")

            except Exception as e:
                logger.warning(f"Failed to generate Ivy follow-up: {e}")
                # Don't fail the whole request if follow-up generation fails
                follow_up_message = f"Action completed successfully. Check back with me for next steps on {action['applicant_name']}'s application."

        return CompleteActionResponse(
            ok=True,
            action_id=action_id,
            follow_up_message=follow_up_message,
            suggested_next_actions=suggested_next_actions if suggested_next_actions else None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to complete action: {e}")
        raise HTTPException(status_code=500, detail=f"Action completion failed: {str(e)}")


# ============================================================================
# Queue Management
# ============================================================================

@router.get("/queue")
async def get_queue(user_id: str = "mock-user-id"):  # TODO: Get from auth
    """
    Get current action queue for user.

    Returns items sorted by priority (descending).
    """
    try:
        rows = await fetch(
            """
            SELECT
                aq.*,
                p.first_name || ' ' || p.last_name AS applicant_name
            FROM action_queue aq
            JOIN applications a ON a.id = aq.application_id
            JOIN people p ON p.id = a.person_id
            WHERE aq.user_id = %s
              AND (aq.expires_at IS NULL OR aq.expires_at > NOW())
            ORDER BY aq.priority DESC, aq.created_at ASC
            """,
            user_id
        )

        queue = [dict(row) for row in rows]

        return {
            "queue": queue,
            "count": len(queue)
        }

    except Exception as e:
        logger.exception(f"Failed to get queue: {e}")
        raise HTTPException(status_code=500, detail=f"Queue fetch failed: {str(e)}")


@router.delete("/queue/{queue_id}")
async def remove_from_queue(
    queue_id: int,
    
):
    """Remove item from queue (skip/dismiss)."""
    try:
        result = await execute(
            "DELETE FROM action_queue WHERE id = %s AND user_id = %s",
            queue_id,
            user_id
        )

        return {"ok": True, "deleted": result == "DELETE 1"}

    except Exception as e:
        logger.exception(f"Failed to remove from queue: {e}")
        raise HTTPException(status_code=500, detail=f"Remove failed: {str(e)}")


# ============================================================================
# Analytics / History
# ============================================================================

@router.get("/executions")
async def get_execution_history(
    limit: int = 20,
    
):
    """
    Get recent action execution history.

    Returns last N executions for user.
    """
    try:
        rows = await fetch(
            """
            SELECT
                ae.*,
                p.first_name || ' ' || p.last_name AS applicant_name,
                a.stage
            FROM action_executions ae
            JOIN applications a ON a.id = ae.application_id
            JOIN people p ON p.id = a.person_id
            WHERE ae.user_id = %s
            ORDER BY ae.executed_at DESC
            LIMIT %s
            """,
            user_id,
            limit
        )

        executions = [dict(row) for row in rows]

        return {
            "executions": executions,
            "count": len(executions)
        }

    except Exception as e:
        logger.exception(f"Failed to get execution history: {e}")
        raise HTTPException(status_code=500, detail=f"History fetch failed: {str(e)}")


# ============================================================================
# Debug Endpoints
# ============================================================================

@router.get("/debug/users")
async def debug_users():
    """Debug endpoint to check users table"""
    try:
        public_users = await fetch("SELECT id, name, email, role, org_id, created_at FROM public.users ORDER BY created_at DESC")

        # Try to get auth.users
        try:
            auth_users = await fetch("SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10")
        except Exception:
            auth_users = []

        return {
            "public_users": {
                "count": len(public_users),
                "users": [dict(row) for row in public_users]
            },
            "auth_users": {
                "count": len(auth_users),
                "users": [dict(row) for row in auth_users]
            }
        }
    except Exception as e:
        logger.exception(f"Failed to query users: {e}")
        raise HTTPException(status_code=500, detail=f"Users query failed: {str(e)}")


@router.get("/debug/session-memory")
async def debug_session_memory():
    """Debug endpoint to check session memory table and constraints"""
    try:
        # Check if table exists
        table_check = await fetchrow("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'user_session_memory'
            )
        """)

        # Get FK constraint details using pg_catalog
        fk_details = await fetch("""
            SELECT
                conname AS constraint_name,
                conrelid::regclass AS table_name,
                confrelid::regclass AS referenced_table,
                a.attname AS column_name,
                af.attname AS referenced_column
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
            JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)
            WHERE contype = 'f'
            AND conrelid = 'public.user_session_memory'::regclass;
        """)

        # Get current data
        sessions = await fetch("SELECT user_id, updated_at FROM public.user_session_memory ORDER BY updated_at DESC LIMIT 5")

        # Get current user ID
        user_id = await get_current_user_id()

        return {
            "table_exists": table_check['exists'],
            "fk_constraints": [dict(fk) for fk in fk_details],
            "sessions": [dict(s) for s in sessions],
            "current_user_id": user_id
        }
    except Exception as e:
        logger.exception(f"Failed to debug session memory: {e}")
        raise HTTPException(status_code=500, detail=f"Session debug failed: {str(e)}")
