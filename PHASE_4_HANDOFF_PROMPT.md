# Phase 4: Ivy → Actions Integration - Context Handoff

## Current Status (As of 2025-10-31)

**Phases Complete**:
- ✅ **Phase 1: Enhanced Pipeline Health** - Multi-dimensional health metrics
- ✅ **Phase 2: Conversation Memory** - Session tracking and message history
- ✅ **Phase 3: Intelligent Action Generation** - 3-step intervention flow WORKING

**Phase 3 Just Completed**:
The 3-step conversation flow is fully operational:
1. User: "How's the pipeline today?" → Ivy lists at-risk applicants
2. User: "yes" → Ivy generates intervention plans with emojis (📞, ✉️, 🚩)
3. User: "yes" → Ivy creates actions in database

**Verified Working**:
- Session continuity (session_id persists in localStorage via Zustand)
- Backend conversation memory (PostgreSQL tables storing history)
- Follow-up detection (`detect_followup_intent()` working)
- Actions created successfully (10 actions IDs 227-236 confirmed in DB)
- Actions visible in TriageModal ("12 Ivy suggestions")

**User Feedback**: "ok so thats fine - i tink we need to work on those triage panels as they are a bit ropey- but before we do, whats next on the plan?"

---

## Your Mission: Implement Phase 4

**Goal**: Enhance the Ivy → Actions handoff with personalized intervention content.

Currently, actions are created with basic data (title, type, deadline). Phase 4 enriches them with:
1. **Personalized Scripts** - Call scripts, email drafts tailored to each applicant
2. **Rich Context** - Intervention rationale, applicant history, expected outcomes
3. **Feedback Loop** - When actions are executed, notify Ivy for follow-up recommendations

---

## Architecture Overview

### Backend: FastAPI + PostgreSQL (Supabase)

**Core Endpoint**: `POST /applications/insights/ask`
- File: `backend/app/routers/applications_insights.py`
- Handles pipeline queries and conversation flow
- Uses `detect_followup_intent()` to detect "yes" responses
- Calls `generate_intervention_plans()` for Step 2
- Calls `create_actions_from_plans()` for Step 3

**Conversation Memory**:
- Tables: `ivy_conversation_sessions`, `ivy_conversation_messages`
- Sessions track `board_context` (filters) and `backend_candidates` (applicant IDs)
- Messages store role, content, query_intent, and `backend_candidates` array

**Actions System**:
- Table: `action_queue`
- Endpoint: `backend/app/routers/actions.py` (NEW - created in Phase 3)
- Actions have: `user_id` (nullable), `application_id`, `action_type`, `priority`, `deadline`, `status`, `created_by_ivy` (boolean)

**Key Functions**:
```python
# In applications_insights.py

async def generate_intervention_plans(applicant_ids, dataset):
    """Step 2: Generate personalized intervention plans using LLM"""
    # Currently at line ~400
    # Uses Gemini 2.0 Flash with 30s timeout
    # Returns list of InterventionPlan objects

async def create_actions_from_plans(plans, user_id=None):
    """Step 3: Insert actions into action_queue"""
    # Currently at line ~450
    # Sets created_by_ivy=TRUE, user_id=NULL
    # Returns list of action IDs

def format_intervention_plans_markdown(plans):
    """Formats plans with emojis for chat display"""
    # Currently at line ~550
```

### Frontend: React + TypeScript + Zustand

**Ask Ivy Dialog**: `frontend/src/ivy/ApplicationIvyDialog.tsx`
- Main chat interface with Ivy
- Uses `useApplicationIvy` hook for state management

**Hook**: `frontend/src/ivy/useApplicationIvy.tsx`
- Manages conversation state and queries
- Uses `applicationRagClient.queryApplications()` to call backend
- Session ID persists via Zustand store

**Session Store**: `frontend/src/stores/sessionStore.ts`
- Zustand store with localStorage persistence
- Key field: `ivySessionId` (string | null)
- Methods: `setIvySessionId()`, `clearSession()`

**RAG Client**: `frontend/src/ivy/applicationRagClient.ts`
- Makes API calls to `/applications/insights/ask`
- Passes `session_id` in payload for conversation continuity

**Triage System**:
- `frontend/src/components/Dashboard/CRM/ApplicationsBoard.tsx` - Main board with "Actions" button
- `frontend/src/components/Actions/TriageModal.tsx` - Modal showing action queue
- Currently shows actions but with basic information

**Actions API**: `frontend/src/services/actionsApi.ts`
- Frontend client for actions endpoints
- Functions: `fetchActions()`, `updateAction()`, `deleteAction()`

---

## Phase 4 Implementation Plan

### Part 1: Backend - Enrich Action Payloads

**1.1 Update InterventionPlan Schema**

File: `backend/app/routers/applications_insights.py` (around line 50)

Current:
```python
class InterventionAction(BaseModel):
    type: str  # 'call', 'email', 'flag'
    description: str
    deadline_hours: int
    priority: str
```

**Add**:
```python
class InterventionAction(BaseModel):
    type: str
    description: str
    deadline_hours: int
    priority: str
    # Phase 4: Personalized content
    script: Optional[str] = None  # Call script or email draft
    context: Optional[str] = None  # Why this action, applicant background
    expected_outcome: Optional[str] = None  # What success looks like
```

**1.2 Update LLM Prompt for Script Generation**

File: `backend/app/routers/applications_insights.py` (function `generate_intervention_plans`, around line 400)

Enhance prompt to generate:
- Call scripts with greeting, context, questions, closing
- Email drafts with subject line, body, signature
- Contextual notes about applicant's specific situation

**1.3 Store Scripts in action_queue**

File: `backend/app/routers/applications_insights.py` (function `create_actions_from_plans`, around line 450)

Check if `action_queue` table has JSON column for metadata. If not:
- Create migration to add `metadata` JSONB column
- Store `script`, `context`, `expected_outcome` in metadata

### Part 2: Frontend - Display Personalized Content

**2.1 Update Action Type**

File: `frontend/src/types/actions.ts`

```typescript
export interface Action {
  id: number;
  application_id: string;
  action_type: 'call' | 'email' | 'flag';
  priority: 'high' | 'medium' | 'low';
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_by_ivy: boolean;
  user_id: string | null;
  created_at: string;
  // Phase 4: Personalized content
  metadata?: {
    script?: string;
    context?: string;
    expected_outcome?: string;
  };
}
```

**2.2 Enhance TriageModal Action Cards**

File: `frontend/src/components/Actions/TriageModal.tsx`

Update action card rendering to show:
- Collapsible "Call Script" / "Email Draft" section
- "Context" section explaining why this action
- "Expected Outcome" section
- Copy-to-clipboard button for scripts

**2.3 Add Action Detail View**

Consider creating `ActionDetailDialog.tsx` for full-screen view of action with all personalized content.

### Part 3: Feedback Loop

**3.1 Backend Endpoint for Action Completion**

File: `backend/app/routers/actions.py`

When action is marked complete, trigger Ivy analysis:
```python
@router.patch("/{action_id}/complete")
async def complete_action(action_id: int, outcome_notes: str):
    # Update action status
    # If created_by_ivy, analyze outcome and suggest follow-ups
    # Store follow-up suggestions in session or new message
```

**3.2 Frontend Action Completion Flow**

When user clicks "Mark Complete" on action:
- Show modal to capture outcome notes
- Send to backend
- Display Ivy's follow-up suggestions

---

## Key Files Reference

### Implementation Plan
- `INTELLIGENT_PIPELINE_GUARDIAN_PLAN_2025-10-28.md` - Full roadmap (Phases 1-6)
- `PHASE_2_CONVERSATION_MEMORY_COMPLETE.md` - Phase 2 completion notes
- `PHASE_4_HANDOFF_PROMPT.md` (THIS FILE) - Phase 4 context

### Backend Core Files
- `backend/app/routers/applications_insights.py` (1400+ lines) - Main Ivy endpoint
- `backend/app/routers/actions.py` (NEW) - Actions CRUD endpoints
- `backend/app/ai/triage_engine.py` - Intervention plan generation logic
- `backend/db/migrations/0038_action_queue_nullable_user.sql` - Latest migration

### Frontend Core Files
- `frontend/src/ivy/ApplicationIvyDialog.tsx` - Chat UI
- `frontend/src/ivy/useApplicationIvy.tsx` - Conversation hook
- `frontend/src/stores/sessionStore.ts` - Session persistence
- `frontend/src/components/Actions/TriageModal.tsx` - Action queue UI
- `frontend/src/services/actionsApi.ts` - Actions API client

### Database Schema
- `ivy_conversation_sessions` - Session tracking with backend_candidates
- `ivy_conversation_messages` - Message history with query_intent
- `action_queue` - Actions with created_by_ivy flag, user_id nullable

---

## Testing Strategy

1. **Backend Testing**: Use `test_intervention_flow.sh` to test 3-step flow via curl
2. **Frontend Testing**: Use Ask Ivy dialog, check localStorage for session_id
3. **Database Verification**: Query `action_queue` and `ivy_conversation_messages` tables
4. **Integration Testing**: Full flow from "How's the pipeline?" to action completion

---

## Development Commands

```bash
# Backend (from project root)
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend (from project root)
cd frontend
pnpm run dev  # Runs on port 5173

# Database migrations
psql <supabase_connection_string> -f backend/db/migrations/0039_action_metadata.sql

# Clear Vite cache if needed
cd frontend
rm -rf node_modules/.vite
pnpm run dev
```

---

## Known Issues & Solutions

**Issue**: Vite cache not picking up changes
**Solution**: Kill Vite, `rm -rf node_modules/.vite`, restart

**Issue**: Session not persisting
**Solution**: Check Zustand store in localStorage: `localStorage.getItem('ivy-session-memory')`

**Issue**: Actions not creating
**Solution**: Check backend logs for database errors, verify user_id is NULL

**Issue**: Follow-up detection not working
**Solution**: Ensure `session_id` is passed in API request payload

---

## Success Criteria for Phase 4

1. ✅ Actions include personalized call scripts or email drafts
2. ✅ TriageModal displays scripts with copy-to-clipboard
3. ✅ Action cards show context and expected outcomes
4. ✅ Completing an action triggers Ivy follow-up suggestions
5. ✅ Follow-up suggestions appear in Ask Ivy dialog

---

## Next Steps (Your Task)

1. Read this document thoroughly
2. Review the key files listed above
3. Start with Part 1: Backend schema updates and script generation
4. Test with curl to verify scripts are generated and stored
5. Move to Part 2: Frontend display enhancements
6. Implement Part 3: Feedback loop
7. Test full cycle: pipeline query → intervention → action creation → completion → follow-up

---

## User's Request

> "no lets kee going with the raodmap i really dont wan to lose the thread"

The user wants to maintain momentum and follow the planned roadmap (Phase 4). The triage panels will be improved as part of Phase 4's UI enhancements.

**User confirmed Phase 3 working**: "ok so thats fine" (referring to the 3-step flow and action creation)

---

## Tips for Success

- Use TodoWrite tool to track progress (user likes visibility)
- Add comprehensive logging with emojis (💾, 🔍, ✅, ❌) for easy scanning
- Test backend with curl before frontend changes
- Kill and restart servers after schema changes
- Check browser console and backend logs frequently
- User prefers thorough testing over "should work" assumptions

---

Good luck! Phase 4 will make the Ivy → Actions handoff truly intelligent with personalized intervention content. 🚀
