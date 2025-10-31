# Phase 2: Deep Context Analysis - Implementation Plan

**Date:** October 29, 2025
**Status:** 🚧 In Progress
**Part of:** Intelligent Pipeline Guardian Plan
**Depends On:** Phase 1 (Enhanced Pipeline Health) ✅

---

## Problem Statement

Currently, each Ivy query is **stateless**. When Ivy asks "Would you like me to create personalised intervention plans for these applicants?", the user cannot respond "yes" because Ivy doesn't remember:
- What applicants were mentioned
- What the previous question was
- The context of the conversation

**User Experience Gap:**
```
User: "How's the pipeline today?"
Ivy: "...Harper Martin is stuck in review... Would you like me to create personalised intervention plans?"
User: "Yes"
Ivy: "I'm sorry, I don't have context about what you're referring to." ❌
```

**Desired Experience:**
```
User: "How's the pipeline today?"
Ivy: "...Harper Martin is stuck in review... Would you like me to create personalised intervention plans?"
User: "Yes"
Ivy: "Great! Let me create intervention plans for the 5 high-risk applicants I mentioned..." ✅
```

---

## Objectives

1. **Conversation History Storage** - Store Ivy conversation messages in database with session management
2. **Context-Aware Responses** - Pass conversation history to LLM so it can reference previous messages
3. **Follow-up Detection** - Detect when user is responding to a call-to-action (e.g., "yes", "tell me more", "who is Harper Martin?")
4. **Applicant Context Retention** - Remember which applicants were discussed in recent messages
5. **Session Management** - Group related queries into conversation sessions

---

## Architecture

### Database Schema

```sql
-- Conversation sessions for grouping related queries
CREATE TABLE public.ivy_conversation_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    board_context VARCHAR(50), -- 'applications', 'leads', 'people', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours')
);

-- Individual messages in conversations
CREATE TABLE public.ivy_conversation_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.ivy_conversation_sessions(session_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Structured context for applicant-related messages
    mentioned_application_ids TEXT[], -- Array of application IDs mentioned
    query_intent VARCHAR(50), -- 'pipeline_health', 'urgent_followup', 'enrolment_forecast', etc.
    backend_candidates TEXT[], -- Candidates suggested by backend (for call-to-action tracking)

    -- Metadata
    confidence FLOAT,
    query_type VARCHAR(50)
);

CREATE INDEX idx_ivy_messages_session ON public.ivy_conversation_messages(session_id, created_at);
CREATE INDEX idx_ivy_sessions_user ON public.ivy_conversation_sessions(user_id, updated_at);
CREATE INDEX idx_ivy_sessions_expires ON public.ivy_conversation_sessions(expires_at);
```

### Session Management Strategy

**Session Creation:**
- New session starts when:
  - No active session exists for user + board context
  - Previous session expired (>2 hours of inactivity)
  - User explicitly starts new conversation ("start over", "new query")

**Session Expiration:**
- Auto-expire after 2 hours of inactivity
- Clean up expired sessions daily via cron job

**Context Window:**
- Include last 10 messages (5 turns) in conversation history
- Older messages archived but not sent to LLM (cost/token management)

---

## Implementation Plan

### Step 1: Database Migrations ✅ (Ready)

**File:** `backend/db/migrations/0036_ivy_conversation_memory.sql`

Create tables for conversation sessions and messages.

### Step 2: Backend Models

**File:** `backend/app/routers/applications_insights.py`

Add Pydantic models:
```python
class ConversationMessage(BaseModel):
    message_id: str
    role: str  # 'user' or 'assistant'
    content: str
    created_at: datetime
    mentioned_application_ids: Optional[List[str]] = None
    query_intent: Optional[str] = None

class ConversationSession(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    board_context: str
    messages: List[ConversationMessage] = []
    created_at: datetime
    updated_at: datetime
```

### Step 3: Session Management Functions

**File:** `backend/app/routers/applications_insights.py`

```python
async def get_or_create_session(user_id: Optional[str], board_context: str) -> str:
    """
    Get active session or create new one.
    Returns session_id.
    """
    # Check for active session (not expired)
    # If none, create new session
    # Return session_id

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
    Updates session updated_at timestamp.
    """
    pass

async def get_conversation_history(session_id: str, limit: int = 10) -> List[ConversationMessage]:
    """
    Retrieve recent conversation history for context.
    Returns last N messages ordered by created_at.
    """
    pass

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
    # Check for affirmative responses: "yes", "sure", "ok", "do it", "create them"
    # Check for questions about mentioned applicants: "who is Harper?", "tell me more about..."
    # Check for elaboration requests: "tell me more", "what else", "details"
    # Extract referenced applicants from last assistant message if follow-up detected
    pass
```

### Step 4: Modify `/ask` Endpoint

**File:** `backend/app/routers/applications_insights.py`

Add `session_id` to request/response:

```python
class AskRequest(BaseModel):
    query: str
    filters: InsightsFilters = Field(default_factory=InsightsFilters)
    session_id: Optional[str] = None  # NEW: For conversation continuity

class AskResponse(BaseModel):
    answer: str
    summary: PipelineSummary
    sources: List[Dict[str, str]] = Field(default_factory=list)
    confidence: float = 0.9
    query_type: str = "applications_insights"
    candidates: List[Candidate] = Field(default_factory=list)
    session_id: str  # NEW: Return session_id for subsequent queries

@router.post("/ask", response_model=AskResponse)
async def ask_ep(req: AskRequest):
    try:
        logger.info(f"Applications insights query: {req.query}")

        # Get or create conversation session
        session_id = req.session_id or await get_or_create_session(
            user_id=None,  # TODO: Get from auth context
            board_context="applications"
        )

        # Load conversation history
        history = await get_conversation_history(session_id, limit=10)
        logger.info(f"Loaded {len(history)} messages from session {session_id}")

        # Detect if this is a follow-up query
        followup_context = await detect_followup_intent(req.query, history)

        # Load dataset and compute summary (existing logic)
        dataset = await _load_dataset(req.filters)
        summary = _summarise(dataset)

        # Detect query intent (existing logic)
        intent = detect_query_intent(req.query)

        # Build context with conversation history
        context = build_he_specific_context(summary, intent)

        # Build prompts WITH conversation history
        system_prompt = build_he_system_prompt(intent)
        user_prompt = build_he_user_prompt_with_history(
            req.query,
            context,
            intent,
            history=history,
            followup_context=followup_context
        )

        # Call LLM (existing logic)
        llm = LLMCtx(model="gemini-2.0-flash", temperature=0.4)
        messages = [
            ("system", system_prompt),
            ("human", user_prompt)
        ]
        result = await llm.ainvoke(messages)

        # Extract candidates (existing logic)
        candidates = extract_action_candidates(dataset, intent, req.query)

        # Store user message
        await add_message_to_session(
            session_id=session_id,
            role="user",
            content=req.query,
            query_intent=intent
        )

        # Store assistant response
        await add_message_to_session(
            session_id=session_id,
            role="assistant",
            content=result,
            mentioned_application_ids=[c.application_id for c in candidates],
            query_intent=intent,
            backend_candidates=[c.application_id for c in candidates]
        )

        return AskResponse(
            answer=result,
            summary=summary,
            sources=[],
            confidence=0.9,
            query_type="applications_insights",
            candidates=candidates,
            session_id=session_id  # NEW: Return session_id
        )
    except Exception as e:
        logger.exception(f"Applications insights failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

### Step 5: Enhanced User Prompt Builder

**File:** `backend/app/routers/applications_insights.py`

```python
def build_he_user_prompt_with_history(
    query: str,
    context: str,
    intent: str,
    history: List[ConversationMessage],
    followup_context: Dict[str, Any]
) -> str:
    """
    Build user prompt with conversation history for context-aware responses.
    """
    prompt_parts = []

    # If this is a follow-up, include previous conversation
    if followup_context.get("is_followup") and len(history) > 0:
        prompt_parts.append("CONVERSATION HISTORY:")
        # Include last 3 message pairs (6 messages)
        recent_history = history[-6:]
        for msg in recent_history:
            prefix = "User" if msg.role == "user" else "Assistant"
            prompt_parts.append(f"{prefix}: {msg.content}")

        prompt_parts.append("\n---\n")

        # Add follow-up context
        if followup_context.get("followup_type") == "affirmative":
            prompt_parts.append("The user has responded affirmatively to your previous question.")
            if followup_context.get("referenced_applicants"):
                ids = followup_context["referenced_applicants"]
                prompt_parts.append(f"Continue the conversation about these {len(ids)} applicants you mentioned.")
        elif followup_context.get("followup_type") == "question":
            prompt_parts.append("The user is asking a follow-up question about your previous response.")

    # Add current query
    prompt_parts.append(f"CURRENT QUERY: {query}\n")

    # Add context (pipeline stats)
    prompt_parts.append(f"PIPELINE DATA:\n{context}")

    return "\n".join(prompt_parts)
```

### Step 6: Frontend Integration

**File:** `frontend/src/ivy/useApplicationIvy.tsx`

Store and pass `session_id`:

```typescript
const [sessionId, setSessionId] = useState<string | null>(null);

const handleQuery = async (query: string) => {
  try {
    setIsLoading(true);
    setError(null);

    const response = await applicationRagClient.query(query, {
      session_id: sessionId,  // Pass session_id
      // ... other params
    });

    // Store session_id for subsequent queries
    if (response.session_id) {
      setSessionId(response.session_id);
    }

    // Rest of existing logic...
  } catch (err) {
    // Error handling...
  }
};
```

**File:** `frontend/src/ivy/applicationRagClient.ts`

Update query method:

```typescript
export async function query(
  query: string,
  options: {
    session_id?: string;
    // ... other options
  } = {}
): Promise<ApplicationInsightsResponse> {
  const response = await fetch('/applications/insights/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      session_id: options.session_id,
      filters: options.filters || {}
    })
  });

  return await response.json();
}
```

---

## Testing Plan

### Test 1: Basic Conversation Continuity

```
User: "How's the pipeline today?"
Ivy: "...116 applications flagged as high-risk... Would you like me to create personalised intervention plans for these applicants?"

User: "Yes"
Ivy: "Great! I'll create intervention plans for the 5 high-risk applicants I mentioned: Harper Martin, Marco Rossi, Amelia Walker, David Williams, and Jennifer Thompson..."
```

**Expected:**
- ✅ Ivy remembers the 5 applicants mentioned
- ✅ Ivy understands "yes" refers to creating intervention plans
- ✅ Session persists across both queries

### Test 2: Applicant-Specific Follow-up

```
User: "Show me high-risk applicants"
Ivy: "...Harper Martin is stuck in review_in_progress..."

User: "Who is Harper Martin?"
Ivy: "Harper Martin is applying to BA (Hons) Professional Music. Currently at 0% progression probability, stuck in review_in_progress stage. Key blockers: No recorded consent for outreach, interview not scheduled..."
```

**Expected:**
- ✅ Ivy recognises "Harper Martin" from previous message
- ✅ Ivy provides applicant-specific details
- ✅ Context includes application_id for detailed lookup

### Test 3: Session Expiration

```
[Wait 2+ hours]

User: "Tell me more about Harper"
Ivy: "I don't have context about which applicant you're referring to. Could you provide more details?"
```

**Expected:**
- ✅ Session expires after 2 hours
- ✅ New session created for new query
- ✅ No access to expired conversation history

### Test 4: Multi-Turn Refinement

```
User: "How's the pipeline?"
Ivy: "...28% average progression... 116 high-risk..."

User: "What about enrolment forecasts?"
Ivy: "Based on the pipeline data I just shared, the enrolment estimate is 49 students. This is concerning because..."

User: "Which programmes are most at risk?"
Ivy: "Looking at the same pipeline, the programmes with highest risk are..."
```

**Expected:**
- ✅ Each query builds on previous context
- ✅ Ivy references "I just shared", "same pipeline", etc.
- ✅ No need to recompute pipeline stats (could cache summary in session)

---

## Success Criteria

| Criterion | How to Test | Status |
|-----------|-------------|--------|
| User can respond "yes" to call-to-action prompts | Test 1 | ⏳ |
| Ivy remembers applicants mentioned in previous messages | Test 2 | ⏳ |
| Conversation history persists within 2-hour window | Multi-query testing | ⏳ |
| Sessions expire correctly after 2 hours | Test 3 | ⏳ |
| Multi-turn refinement works naturally | Test 4 | ⏳ |
| No performance degradation (conversation history adds <100ms) | Load testing | ⏳ |

---

## Migration Path

1. ✅ Create database migration
2. ⏳ Deploy migration to database
3. ⏳ Implement backend session management functions
4. ⏳ Modify `/ask` endpoint to use sessions
5. ⏳ Test backend with curl/Postman
6. ⏳ Update frontend to pass/store session_id
7. ⏳ Test end-to-end conversation flows
8. ⏳ Monitor performance and adjust context window if needed

---

## Open Questions

1. **User ID integration:** How do we get user_id from request context? Do we have authentication middleware?
2. **Session cleanup:** Should we use a cron job or database trigger for expired session cleanup?
3. **Context window size:** Is 10 messages (5 turns) the right balance between context and cost?
4. **Performance:** Should we cache `summary` in session to avoid recomputing for follow-ups?
5. **Frontend session persistence:** Should session_id be stored in localStorage or just in-memory (resets on page reload)?

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token costs increase with conversation history | Medium | Limit context window to 10 messages, use cheaper model for follow-ups |
| Sessions table grows unbounded | High | Auto-expire after 2 hours, daily cleanup job, add retention policy |
| User confusion if session expires mid-conversation | Low | Show "Starting new conversation" message when session expires |
| Performance degradation with large history | Medium | Index on session_id, limit to 10 messages, consider Redis for session storage |

---

## Next Steps (Immediate)

1. Create database migration
2. Test migration in local environment
3. Implement `get_or_create_session()` function
4. Implement `add_message_to_session()` function
5. Implement `get_conversation_history()` function
6. Start with simple follow-up detection (affirmative responses only)

---

*Generated: October 29, 2025*
*Status: Planning → Implementation*
