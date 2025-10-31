# Phase 2: Deep Context Analysis (Conversation Memory) - COMPLETE ✅

**Date:** October 29, 2025
**Status:** ✅ Backend & Frontend Implemented - Ready for Testing
**Part of:** Intelligent Pipeline Guardian Plan
**Depends On:** Phase 1 (Enhanced Pipeline Health) ✅

---

## Overview

Phase 2 enables **multi-turn conversations** with Ivy. Users can now respond to Ivy's call-to-action prompts, ask follow-up questions, and have contextual conversations about applicants without repeating information.

**User Experience Transformation:**

**Before (Phase 1):**
```
User: "How's the pipeline today?"
Ivy: "...Harper Martin is stuck in review... Would you like me to create personalised intervention plans?"
User: "Yes"
Ivy: "I'm sorry, I don't have context about what you're referring to." ❌
```

**After (Phase 2):**
```
User: "How's the pipeline today?"
Ivy: "...Harper Martin is stuck in review... Would you like me to create personalised intervention plans?"
User: "Yes"
Ivy: "Great! Let me create intervention plans for the 5 high-risk applicants I mentioned..." ✅
```

---

## What Was Implemented

### 1. Database Schema ✅

**Migration:** `backend/db/migrations/0036_ivy_conversation_memory.sql`

**Tables Created:**
- `public.ivy_conversation_sessions` - Conversation sessions grouped by user and context
- `public.ivy_conversation_messages` - Individual messages within sessions

**Key Features:**
- Auto-expiring sessions (2 hours of inactivity)
- Trigger to update session timestamps on new messages
- Indexes for fast lookups by session_id, user_id, and expiration
- Cleanup function for expired sessions

### 2. Backend Session Management ✅

**File:** `backend/app/routers/applications_insights.py`

**Functions Added:**
- `get_or_create_session()` - Get active session or create new one
- `add_message_to_session()` - Store user/assistant messages
- `get_conversation_history()` - Retrieve recent conversation history
- `detect_followup_intent()` - Detect if query is a follow-up

**Models Added:**
- `ConversationMessage` - Pydantic model for conversation messages
- Updated `AskRequest` to include `session_id` (optional)
- Updated `AskResponse` to return `session_id`

### 3. Follow-up Detection Logic ✅

**Detects three types of follow-ups:**

1. **Affirmative Responses**
   - "yes", "yeah", "sure", "ok", "do it", "go ahead", "please"
   - Returns: `{followup_type: "affirmative", referenced_applicants: [...]}`

2. **Elaboration Requests**
   - "tell me more", "more details", "what else", "explain", "elaborate"
   - Returns: `{followup_type: "elaboration", referenced_applicants: [...]}`

3. **Questions**
   - "who is...", "tell me about...", "what about..."
   - Returns: `{followup_type: "question", referenced_applicants: [...]}`

### 4. Context-Aware Prompt Builder ✅

**Function:** `build_he_user_prompt_with_history()`

**Features:**
- Includes last 6 messages (3 turns) in conversation history
- Adds follow-up context indicators (✅ affirmative, ❓ question, 📖 elaboration)
- References previously mentioned applicants
- Instructs LLM to continue naturally from previous conversation

### 5. Modified `/ask` Endpoint ✅

**Flow:**
1. Get or create session → Load conversation history
2. Detect if query is a follow-up
3. Build context-aware prompts with history
4. Call LLM with enhanced context
5. Store user message and assistant response
6. Return response with `session_id`

### 6. Frontend Integration ✅

**Files Modified:**
- `frontend/src/ivy/applicationRagClient.ts` - Added `session_id` to query options and response
- `frontend/src/ivy/useApplicationIvy.tsx` - Added session_id state and storage

**Features:**
- Stores `session_id` in React state
- Passes `session_id` to backend on subsequent queries
- Logs session_id for debugging

---

## Testing Plan

### Test 1: Basic Conversation Continuity

**Test Steps:**
1. Open Ask Ivy dialog in Applications Board
2. Ask: "How's the pipeline today?"
3. Wait for response (should mention high-risk applicants)
4. Respond: "Yes"
5. Verify Ivy understands you're responding to the intervention plans question

**Expected Behaviour:**
- ✅ First query creates new session
- ✅ Second query reuses same session
- ✅ Ivy detects "yes" as affirmative response
- ✅ Ivy references "the 5 applicants I mentioned"
- ✅ Response is contextual and natural

**Logging to Check:**
```
[Ask Ivy] Storing session_id: <uuid>
[Backend] Using session: <uuid>
[Backend] Loaded 2 messages from conversation history
[Backend] Detected follow-up: affirmative, referenced 5 applicants
```

### Test 2: Applicant-Specific Follow-up

**Test Steps:**
1. Ask: "Show me high-risk applicants"
2. Wait for response (Ivy mentions specific names)
3. Ask: "Who is Harper Martin?"
4. Verify Ivy provides detailed info about Harper Martin

**Expected Behaviour:**
- ✅ Ivy recognises "Harper Martin" from previous message
- ✅ Provides applicant-specific details without asking "which Harper Martin?"
- ✅ References conversation context naturally

### Test 3: Session Expiration (Manual)

**Test Steps:**
1. Start a conversation with Ivy
2. Wait 2+ hours (or manually delete session from database)
3. Try to continue conversation
4. Verify Ivy starts fresh conversation

**Expected Behaviour:**
- ✅ Session expires after 2 hours
- ✅ New query creates new session
- ✅ No access to expired conversation history
- ✅ No error messages, just fresh start

### Test 4: Multi-Turn Refinement

**Test Steps:**
1. Ask: "How's the pipeline?"
2. Ask: "What about enrolment forecasts?"
3. Ask: "Which programmes are most at risk?"
4. Verify each response builds on previous context

**Expected Behaviour:**
- ✅ Each query reuses same session
- ✅ Ivy references "I just shared", "same pipeline", etc.
- ✅ No need to recompute pipeline stats
- ✅ Natural conversational flow

---

## Database Schema Details

### ivy_conversation_sessions

```sql
session_id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
board_context VARCHAR(50)  -- 'applications', 'leads', 'people'
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
expires_at TIMESTAMPTZ  -- Auto-updated on each message
total_messages INTEGER  -- Count of messages in session
last_query TEXT  -- Last user query for analytics
```

### ivy_conversation_messages

```sql
message_id UUID PRIMARY KEY
session_id UUID REFERENCES ivy_conversation_sessions(session_id)
role VARCHAR(20)  -- 'user' or 'assistant'
content TEXT
created_at TIMESTAMPTZ

-- Structured context
mentioned_application_ids TEXT[]  -- Applicants discussed
query_intent VARCHAR(50)  -- 'pipeline_health', 'urgent_followup', etc.
backend_candidates TEXT[]  -- Suggested action candidates

-- Metadata
confidence FLOAT
query_type VARCHAR(50)
```

---

## API Changes

### Request: POST /applications/insights/ask

**Before:**
```json
{
  "query": "How's the pipeline today?",
  "filters": {}
}
```

**After:**
```json
{
  "query": "How's the pipeline today?",
  "filters": {},
  "session_id": "550e8400-e29b-41d4-a716-446655440000"  // OPTIONAL
}
```

### Response

**Before:**
```json
{
  "answer": "...",
  "summary": {...},
  "candidates": [...]
}
```

**After:**
```json
{
  "answer": "...",
  "summary": {...},
  "candidates": [...],
  "session_id": "550e8400-e29b-41d4-a716-446655440000"  // NEW!
}
```

---

## Implementation Details

### Follow-up Detection Algorithm

```python
async def detect_followup_intent(query: str, history: List[ConversationMessage]):
    if not history or len(history) < 2:
        return {"is_followup": False}

    query_lower = query.lower().strip()

    # Get last assistant message
    last_assistant_msg = None
    for msg in reversed(history):
        if msg.role == "assistant":
            last_assistant_msg = msg
            break

    # Check for affirmative responses
    affirmative_keywords = ["yes", "yeah", "sure", "ok", "do it", ...]
    if query_lower in affirmative_keywords:
        return {
            "is_followup": True,
            "followup_type": "affirmative",
            "referenced_applicants": last_assistant_msg.backend_candidates or []
        }

    # Check for elaboration requests
    elaboration_keywords = ["tell me more", "more details", ...]
    if any(kw in query_lower for kw in elaboration_keywords):
        return {"is_followup": True, "followup_type": "elaboration", ...}

    # Check for questions about mentioned applicants
    if "who is" in query_lower or "tell me about" in query_lower:
        return {"is_followup": True, "followup_type": "question", ...}

    return {"is_followup": False}
```

### Conversation History in LLM Prompt

```python
def build_he_user_prompt_with_history(...):
    if followup_context.get("is_followup"):
        prompt_parts.append("CONVERSATION HISTORY:")
        for msg in history[-6:]:  # Last 3 turns
            prefix = "User" if msg.role == "user" else "Assistant"
            prompt_parts.append(f"{prefix}: {msg.content[:500]}")

        prompt_parts.append("---")

        if followup_type == "affirmative":
            prompt_parts.append("✅ The user has responded affirmatively.")
            prompt_parts.append(f"Continue about these {len(referenced)} applicants.")
```

---

## Success Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| User can respond "yes" to call-to-action prompts | ✅ Implemented | Follow-up detection + conversation history |
| Ivy remembers applicants mentioned in previous messages | ✅ Implemented | `backend_candidates` stored in messages |
| Conversation history persists within 2-hour window | ✅ Implemented | Auto-expiring sessions with trigger |
| Sessions expire correctly after 2 hours | ✅ Implemented | Database trigger + cleanup function |
| Multi-turn refinement works naturally | ✅ Implemented | LLM receives full conversation history |
| No performance degradation | ⏳ **Testing Required** | Need to measure with real queries |

---

## Files Modified

### Backend
1. **`backend/db/migrations/0036_ivy_conversation_memory.sql`** - Database schema
2. **`backend/app/routers/applications_insights.py`**
   - Lines 47-49: Added `session_id` to `AskRequest`
   - Lines 59-77: Added `ConversationMessage` model and updated `AskResponse`
   - Lines 84-276: Added session management functions
   - Lines 663-723: Added `build_he_user_prompt_with_history()`
   - Lines 857-953: Modified `/ask` endpoint to use conversation history

### Frontend
1. **`frontend/src/ivy/applicationRagClient.ts`**
   - Lines 75-76: Added `session_id` to options
   - Lines 87-88: Added `session_id` to response type
   - Lines 150: Pass `session_id` in payload
   - Line 178: Return `session_id` from response

2. **`frontend/src/ivy/useApplicationIvy.tsx`**
   - Lines 107-108: Added `sessionId` state
   - Lines 228-236: Pass and store `session_id`

---

## Open Questions & Next Steps

### Answered During Implementation:
1. ✅ **User ID integration:** Currently using `None` for user_id (anonymous sessions). Can integrate with auth later.
2. ✅ **Session cleanup:** Database trigger auto-extends expiration, cleanup function provided for cron.
3. ✅ **Context window size:** Using 10 messages (5 turns), passing last 6 to LLM.
4. ❌ **Performance caching:** NOT implemented - recalculating stats on each query. Consider for optimization.
5. ✅ **Frontend session persistence:** Stored in React state (resets on page reload). This is acceptable for MVP.

### Still Open:
1. **User authentication:** How do we get `user_id` from request context?
2. **Session cleanup cron:** Need to set up scheduled task to call `cleanup_expired_ivy_sessions()`
3. **Performance monitoring:** Need to measure actual response times with conversation history
4. **Summary caching:** Should we cache `PipelineSummary` in session to avoid recomputing?

---

## Known Limitations

### 1. Session Resets on Page Reload
**Issue:** `session_id` stored in React state, not localStorage
**Impact:** User loses conversation history if they reload the page
**Mitigation:** For MVP, this is acceptable. Can add localStorage persistence later.

### 2. No Per-User Session Management
**Issue:** `user_id` is currently `None` for all sessions
**Impact:** All users share anonymous sessions
**Mitigation:** Works for single-user demo. Need auth integration for multi-user.

### 3. Pipeline Stats Recalculated Every Query
**Issue:** We compute `_summarise(dataset)` on every query, even follow-ups
**Impact:** Slightly slower response times for follow-up queries
**Mitigation:** Could cache summary in session, but adds complexity.

### 4. Limited Follow-up Detection
**Issue:** Simple keyword matching for follow-up detection
**Impact:** May miss some valid follow-ups or false-positive on casual "yes" in new query
**Mitigation:** Good enough for MVP, can use LLM for more sophisticated detection later.

---

## Next Steps (Immediate)

1. ✅ Backend implementation complete
2. ✅ Frontend integration complete
3. ⏳ **Manual testing required:**
   - Test basic conversation continuity
   - Test applicant-specific follow-ups
   - Test multi-turn refinement
   - Measure performance impact
4. ⏳ **Database cron setup:**
   - Schedule `cleanup_expired_ivy_sessions()` to run daily
5. ⏳ **Logging review:**
   - Check backend logs for session management
   - Verify conversation history being loaded correctly

---

## Phase 3 Preview

With Phase 2 complete, we're ready for **Phase 3: Intelligent Action Generation**.

**Phase 3 will enable:**
- User: "Yes" (to "Would you like intervention plans?")
- Ivy: "Great! Here are personalised intervention plans:

  **Harper Martin** (0% probability, review_in_progress)
  - Action 1: Call admissions to expedite review
  - Action 2: Send email with programme details
  - Deadline: Today

  Would you like me to create these actions in the system?"
- User: "Yes"
- Ivy creates actions → User clicks "View Actions" → Opens TriageModal

**Dependencies:**
- ✅ Phase 1: Enhanced pipeline health prompts
- ✅ Phase 2: Conversation memory to understand "yes"
- ⏳ Phase 3: LLM generates structured action recommendations

---

## Conclusion

Phase 2 is **complete at the code level** and ready for testing. Multi-turn conversations with Ivy are now possible:

✅ Session management with auto-expiration
✅ Conversation history storage and retrieval
✅ Follow-up intent detection (affirmative, elaboration, questions)
✅ Context-aware LLM prompts with conversation history
✅ Frontend session_id storage and passthrough

**Key Achievement:** Users can now have natural, multi-turn conversations with Ivy without repeating context. The "Would you like me to create personalised intervention plans?" prompt is no longer a dead-end - users can respond "yes" and Ivy will remember the context.

---

**Recommendation:** Test Phase 2 with real queries to verify conversation continuity, then proceed to Phase 3 (Intelligent Action Generation).

---

*Generated: October 29, 2025*
*Backend: ✅ Complete | Frontend: ✅ Complete | Testing: ⏳ Required*
