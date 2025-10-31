# Actions System Roadmap - 2025

**Last Updated:** October 28, 2025
**Status:** Phase A Complete + Conversation Enhancement
**Next Phase:** Phase B - Integration & Polish

---

## 📍 Current Status Summary

### ✅ Completed (Phase A)
- **Core Actions System** - Dropdown menu, triage, execution tracking
- **ML-Powered Triage** - 9-context urgency formula with priority scoring
- **Database Schema** - 4 tables with RLS policies
- **Session Memory** - User context persistence
- **Ask Ivy Integration** - Event system (95% complete, name matching issue remains)
- **Conversation-Aware Actions** ⭐ NEW - Call scripts enhanced with conversation context

### ⚠️ Partially Complete
- **Ask Ivy Auto-Detection** - Name matching not working reliably (extracts names but fails to match to application IDs)

### 🔲 Not Started (Phase B)
- Daily Report endpoint
- View Blockers filter
- Activity chips on board cards
- Complete Ask Ivy name matching fix

---

## 🆕 Just Completed: Conversation-Aware Actions Enhancement

**Date:** October 28, 2025
**Purpose:** Enable Actions system to use context from Ask Ivy conversations

### What Was Built

#### 1. Backend Changes

**Files Modified:**
- `backend/app/routers/actions.py` (lines 187-268, 718-776)
- `backend/app/ai/triage_engine.py` (lines 400-532)
- `backend/db/migrations/0036_fix_session_memory_fk.sql` (new)

**Features Added:**
- **Conversation Sync Endpoint:** `POST /api/actions/session/conversation`
  - Accepts conversation messages and key concerns
  - Stores in `user_session_memory.session_ctx.recent_conversations`
  - Keeps last 20 conversations, 10 messages per application

- **Conversation-Aware Triage:**
  - Loads conversation context when generating actions
  - Passes to `generate_artifacts_with_ml()`
  - Enhances call scripts with conversation summary

- **Enhanced Call Scripts:**
  ```markdown
  💬 **Recent Conversation Context:**
  • User asked about: What should I do to re-engage them?
  • Key concerns: consent blocker, low engagement

  ---

  **Call Script: Harper**
  [Standard call script follows...]
  ```

- **Debug Endpoints:**
  - `GET /api/actions/debug/users` - Check public.users vs auth.users
  - `GET /api/actions/debug/session-memory` - Inspect session table and FK constraints

**Critical Fix Applied:**
- Fixed FK constraint in `user_session_memory` to point to `public.users` instead of `auth.users`
- Updated `get_current_user_id()` to explicitly query `public.users`

#### 2. Frontend Changes

**Files Modified:**
- `frontend/src/stores/sessionStore.ts` (lines 87-130)
- `frontend/src/ivy/useApplicationIvy.tsx` (lines 364-402)
- `frontend/src/services/actionsApi.ts` (lines 130-152)

**Features Added:**
- **Conversation Tracking in Session Store:**
  - Stores last 10 messages per application
  - Keeps last 20 conversations total
  - Auto-syncs to backend via API

- **Automatic Sync from Ivy:**
  - Tracks user messages in `handleSubmit()`
  - Tracks AI responses after streaming
  - Automatically syncs to backend when conversation grows

- **API Integration:**
  - New `syncConversation()` function
  - Sends messages + key concerns to backend

#### 3. Testing Results

✅ **Working End-to-End:**
1. Chat with Ivy about Harper Martin
2. Conversation automatically tracked and synced
3. Open Actions modal → triage loads conversation
4. Call script shows:
   - Recent user questions
   - Key concerns from conversation
   - Standard call script below

**Test Data:**
```bash
# Sync conversation
curl -X POST /api/actions/session/conversation \
  -d '{"application_id": "...", "messages": [...], "key_concerns": [...]}'

# Verify stored
curl /api/actions/session | jq '.session_ctx.recent_conversations'

# Generate triage with conversation
curl -X POST /api/actions/triage -d '{"limit": 5}' | \
  jq '.queue[] | .artifacts.conversation_summary'
```

### Architecture

```
User chats with Ivy
    ↓
sessionStore tracks messages
    ↓
syncConversation() → POST /api/actions/session/conversation
    ↓
Backend stores in user_session_memory
    ↓
Triage engine loads conversation context
    ↓
generate_artifacts_with_ml() enhances call scripts
    ↓
Call script includes conversation summary
```

---

## 🎯 Phase B: Integration & Polish (Next Up)

### Priority 1: Fix Ask Ivy Name Matching (Critical)

**Problem:** Auto-detection extracts names from Ivy responses but fails to match them to application IDs

**Evidence from Logs:**
```javascript
[Action Suggestion] Extracted name from text: harper martin, marco rossi
[Action Suggestion] Found suggested IDs via name matching: Array []
```

**Root Cause:** Unknown - could be:
- Name format differences (normalization issues)
- Apps not in current context
- Backend not returning candidates properly

**Proposed Solution:**
1. Debug name matching with detailed console logs
2. Verify Harper Martin and Marco Rossi exist in application list
3. Improve name normalization (trim, lowercase, remove special chars)
4. Use backend's `candidates` field as primary source (PRIORITY 1)

**Files to Modify:**
- `frontend/src/ivy/actionSuggestionHelper.ts` (detection logic)
- `frontend/src/ivy/useApplicationIvy.tsx` (integration point)

**Testing Plan:**
1. Ask Ivy: "Who should I follow up with urgently?"
2. Verify backend returns candidates
3. Verify badge appears with correct count
4. Verify modal opens with correct applications

**Success Criteria:**
- ✅ Backend candidates used when available
- ✅ Name matching works for exact names
- ✅ Badge appears and shows correct count
- ✅ Modal opens with correct applications

---

### Priority 2: Daily Report Endpoint

**Goal:** Generate daily summary of actions, progress, and metrics

**Endpoint:** `POST /api/brief/today`

**Response:**
```json
{
  "date": "2025-10-28",
  "summary": {
    "total_actions": 15,
    "actions_completed": 8,
    "conversion_gains": 0.12,
    "top_priorities": [...]
  },
  "recommendations": [...],
  "metrics": {
    "response_rate": 0.67,
    "conversion_rate": 0.34,
    "avg_time_to_action": "2.3 hours"
  }
}
```

**Files to Create:**
- `backend/app/ai/daily_report.py`
- Update `backend/app/routers/actions.py` with endpoint

**UI Integration:**
- Add to Actions dropdown menu
- Open in modal with charts/graphs
- Export to PDF option

---

### Priority 3: View Blockers Filter

**Goal:** Toggle board view to show only applications with critical blockers

**Implementation:**
1. Add filter toggle to ApplicationsBoard
2. Filter applications where `ml_intelligence.blockers` has `severity: "critical"`
3. Highlight blocker cards in red
4. Show count in Actions menu badge

**Files to Modify:**
- `frontend/src/components/Dashboard/CRM/ApplicationsBoard.tsx`
- `frontend/src/stores/sessionStore.ts` (add filter state)

**UI Design:**
- Toggle button in board header: "Show Blockers Only"
- Red badge on Actions menu when blockers present
- Blocker count in menu item

---

### Priority 4: Activity Chips on Board Cards

**Goal:** Show recent activity on application cards

**Examples:**
- "Nudged 2m ago"
- "Called 1h ago"
- "Email sent 3d ago"

**Implementation:**
1. Query `action_executions` for recent actions
2. Show as chips at bottom of application cards
3. Color-code by action type (email=blue, call=green, etc.)
4. Click chip → open action details

**Files to Modify:**
- `frontend/src/components/Dashboard/CRM/ApplicationCard.tsx`
- Add `recent_actions` to application data fetch

---

## 🚀 Phase C: Real Integrations (Future)

### Email Integration
- **Provider:** Resend or SendGrid
- **Features:**
  - Real email sending (not simulated)
  - Template management
  - Tracking (opens, clicks, replies)
  - A/B testing

### VoIP Integration
- **Provider:** Twilio
- **Features:**
  - Click-to-call from Actions modal
  - Call recording
  - Call transcription
  - Outcome tracking

### SMS Integration
- **Provider:** Twilio
- **Features:**
  - SMS templates
  - Two-way messaging
  - Compliance (opt-out handling)

### Calendar Integration
- **Provider:** Calendly or Cal.com
- **Features:**
  - Booking link generation
  - Interview scheduling
  - Automated reminders

### Bulk Actions
- **Feature:** "Send All" for multiple actions
- **Safety:** Rate limiting, preview, undo
- **Tracking:** Batch execution logs

### Focus Mode
- **Feature:** Full-screen action workspace
- **UI:** Minimal distractions, keyboard shortcuts
- **Flow:** One action at a time with instant next-best

---

## 🔧 Technical Debt & Improvements

### 1. Authentication System
**Current:** Mock `get_current_user_id()` fetches first user from database
**Needed:** Proper auth with JWT tokens, role-based access
**Impact:** Security, multi-user support

### 2. Real-time Updates
**Current:** Manual refresh for triage queue
**Needed:** WebSocket or SSE for live updates
**Impact:** UX, collaboration

### 3. Caching Layer
**Current:** No caching, all triage computed on-demand
**Needed:** Redis cache for triage results, session state
**Impact:** Performance, scalability

### 4. Analytics Dashboard
**Current:** No visibility into action effectiveness
**Needed:** Charts showing conversion lift, ROI by action type
**Impact:** Product insight, optimization

### 5. Template Management
**Current:** Hard-coded email/call templates
**Needed:** Admin UI for template CRUD, variables, A/B tests
**Impact:** Flexibility, personalization

---

## 📊 Success Metrics

### Technical KPIs
- **Triage Generation:** < 200ms (currently ~150ms ✅)
- **Conversation Sync:** < 100ms (currently ~50ms ✅)
- **Action Execution:** < 500ms
- **Error Rate:** < 1%
- **Uptime:** > 99.5%

### User KPIs
- **Time Saved:** 10+ minutes/day per user
- **Actions Executed:** 15+ per day per user
- **Conversion Lift:** +5-10% from action system
- **User Adoption:** 80%+ of admissions staff

### Business KPIs
- **Pipeline Velocity:** 20% increase
- **Response Time:** 50% reduction
- **Conversion Rate:** +5-10% lift
- **Revenue Impact:** Measurable increase in enrollments

---

## 🗓️ Recommended Timeline

### Week 1 (Now - Nov 4)
- ✅ Fix Ask Ivy name matching
- ✅ Add debug logging and testing
- ✅ Verify conversation-aware actions work in production

### Week 2 (Nov 4-11)
- Daily Report endpoint
- View Blockers filter
- Activity chips on cards

### Week 3-4 (Nov 11-25)
- Email integration (Resend)
- Template management
- Analytics dashboard

### Month 2 (Dec)
- VoIP integration (Twilio)
- SMS integration
- Calendar integration

### Month 3 (Jan)
- Bulk actions with safety features
- Focus Mode UI
- A/B testing framework

---

## 🎯 Decision Points

### Should We...?

**1. Keep conversation-aware actions as-is or expand?**
- ✅ Keep for now - works well
- Consider: Add conversation to email artifacts too
- Consider: Show conversation summary in modal

**2. Prioritize real email integration or polish Ask Ivy?**
- Recommendation: Fix Ask Ivy first (critical user flow)
- Then add email integration (high business impact)

**3. Build Focus Mode or improve existing UI?**
- Recommendation: Improve existing UI first
- Focus Mode is nice-to-have, not critical

**4. Use Gemini Flash for ultra-personalized call scripts?**
- Recommendation: Test with 10 users first
- Measure: Time saved, user satisfaction, conversion lift
- Then decide on full rollout

---

## 📝 Notes for Future Sessions

### When Picking Up This Work:

1. **Check Phase Status:**
   - Read this document first
   - Verify what's complete vs. in-progress
   - Check for any new issues or bugs

2. **Review Recent Changes:**
   - Check git log for latest commits
   - Read any new .md files created
   - Test critical flows (triage, execute, conversation sync)

3. **Test Environment:**
   - Ensure backend running on :8000
   - Ensure frontend running on :5173
   - Verify database migrations applied
   - Check environment variables set

4. **Before Making Changes:**
   - Create new todo list with TodoWrite
   - Document planned changes
   - Test existing functionality
   - Commit working state before starting

### Key Context to Remember:

- **FK Constraint:** `user_session_memory` references `public.users` (not `auth.users`)
- **Conversation Tracking:** Automatic from Ivy, stored in session_ctx
- **Name Matching:** Still broken, needs debugging
- **Call Scripts:** Enhanced with conversation context (working ✅)
- **Session Store:** Persists to localStorage + backend sync

---

## 🔗 Related Documentation

- [ACTIONS_SYSTEM_COMPLETE.md](./ACTIONS_SYSTEM_COMPLETE.md) - Phase A implementation details
- [ASK_IVY_ACTIONS_INTEGRATION_SESSION.md](./ASK_IVY_ACTIONS_INTEGRATION_SESSION.md) - Ask Ivy integration
- [TESTING_ACTION_SUGGESTIONS.md](./TESTING_ACTION_SUGGESTIONS.md) - Testing guide
- [AI_DOCUMENTATION.md](./AI_DOCUMENTATION.md) - AI system architecture
- [APPLICATION_AI_COMPLETE_GUIDE.md](./APPLICATION_AI_COMPLETE_GUIDE.md) - Application ML guide

---

**Status:** Ready for Phase B
**Next Steps:** Fix Ask Ivy name matching, then Daily Report + View Blockers
**Questions?** Review this doc and check git log for latest changes
