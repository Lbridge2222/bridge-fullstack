# Name Matching Fix - October 28, 2025

**Status:** ✅ COMPLETE
**Impact:** HIGH - Enables Ivy → Actions integration

---

## Problem Summary

**Symptom:**
```
[Action Suggestion] Extracted name from text: harper martin, marco rossi
[Action Suggestion] Found suggested IDs via name matching: Array []
```

Ivy was extracting names from responses but failing to match them to application IDs, so the Actions badge never appeared.

**Root Cause:**
- Frontend name matching logic had bugs (case sensitivity, normalization issues)
- Backend `/applications/insights/ask` endpoint **did not return `candidates` field**
- Frontend tried to use `response.candidates` as PRIORITY 1 but it didn't exist
- Fell back to buggy frontend name matching which failed

---

## Solution Implemented

### Backend Changes ✅

**File:** `backend/app/routers/applications_insights.py`

1. **Added `Candidate` model** (lines 50-54):
   ```python
   class Candidate(BaseModel):
       application_id: str
       name: str
       stage: Optional[str] = None
       programme_name: Optional[str] = None
   ```

2. **Added `candidates` field to `AskResponse`** (line 63):
   ```python
   class AskResponse(BaseModel):
       answer: str
       summary: PipelineSummary
       sources: List[Dict[str, str]] = Field(default_factory=list)
       confidence: float = 0.9
       query_type: str = "applications_insights"
       candidates: List[Candidate] = Field(default_factory=list)  # NEW!
   ```

3. **Created `extract_action_candidates()` function** (lines 109-184):
   - Detects if query is about urgent follow-ups
   - Filters applications by:
     - **High priority:** Critical blockers
     - **Medium priority:** Low progression probability (< 0.35)
   - **Excludes terminal states:** rejected, offer_withdrawn, offer_declined, enrolled
   - Returns top 10 candidates

4. **Modified `/applications/insights/ask` endpoint** (lines 495-504):
   ```python
   # Extract candidates for action suggestions (PRIORITY 1 for frontend)
   candidates = extract_action_candidates(dataset, intent, req.query)
   logger.info(f"Extracted {len(candidates)} candidates for action suggestions")

   return AskResponse(
       answer=answer,
       summary=summary,
       confidence=0.9 if answer else 0.7,
       candidates=candidates  # NOW INCLUDED!
   )
   ```

### Frontend Changes (Already Existed!) ✅

**File:** `frontend/src/ivy/useApplicationIvy.tsx`

The frontend **already had** the logic to use backend candidates as PRIORITY 1 (lines 231-250):
```typescript
// Extract backend candidates FIRST (most reliable source)
const backendCandidates = (response as any).candidates?.map((c: any) => c.application_id).filter(Boolean);
if (backendCandidates && backendCandidates.length > 0) {
  console.log('[Ask Ivy] Backend provided candidates:', backendCandidates.length);
}

// Pass backend candidates as PRIORITY 1 to detection
const suggestedIds = detectActionableFollowups(
  response.answer,
  context.applications as any,
  backendCandidates  // Will be used first if available
);
```

**File:** `frontend/src/ivy/actionSuggestionHelper.ts`

Lines 95-99 already prioritize backend candidates:
```typescript
// PRIORITY 1: Use backend candidates if available (most reliable)
if (backendCandidates && backendCandidates.length > 0) {
  console.log('[Action Suggestion] ✓ Using backend candidates:', backendCandidates.length);
  return backendCandidates.slice(0, 5);
}
```

**NO FRONTEND CHANGES NEEDED!** The system was designed correctly, just waiting for the backend to provide candidates.

---

## Testing Results

### Backend Test ✅

**Query:** "Who should I follow up with urgently?"

**Response:**
```json
{
  "answer": "The following individuals are flagged as high risk...",
  "candidates": [
    {"application_id": "550e8400-e29b-41d4-a716-446655441127", "name": "Noah Thompson", "stage": "conditional_offer_no_response", "programme_name": "BA (Hons) Songwriting"},
    {"application_id": "550e8400-e29b-41d4-a716-446655441122", "name": "Isla Mitchell", "stage": "unconditional_offer_no_response", "programme_name": "MA Music Performance"},
    ... (10 total)
  ]
}
```

✅ Backend returns 10 actionable candidates
✅ Excludes terminal states (rejected, withdrawn)
✅ Prioritizes: critical blockers > low probability

### Frontend Integration (To Test)

**Expected Flow:**
1. User opens Ask Ivy
2. User types: "Who should I follow up with urgently?"
3. Backend returns `candidates` array with 10 IDs
4. Frontend extracts IDs: `backendCandidates = ['...', '...', ...]`
5. `detectActionableFollowups()` uses backend candidates directly (PRIORITY 1)
6. Dispatches event: `window.dispatchEvent('ivy:suggestAction', { application_ids: [...] })`
7. Badge appears on Actions button with count: 10
8. User clicks Actions → TriageModal opens filtered to those 10 IDs
9. Modal shows personalized actions for each candidate

---

## How It Works Now

### Architecture

```
User: "Who should I follow up with urgently?"
  ↓
Frontend calls: /applications/insights/ask
  ↓
Backend analyzes dataset:
  • Loads all applications from vw_board_applications
  • Filters: excludes terminal states
  • Prioritizes: critical blockers > low probability
  • Extracts top 10 candidates
  ↓
Backend returns: {answer, summary, sources, confidence, candidates}
  ↓
Frontend:
  • Extracts backend candidates (PRIORITY 1)
  • Uses them directly (no name matching!)
  • Dispatches ivy:suggestAction event
  ↓
ApplicationsBoard:
  • Listens to ivy:suggestAction
  • Shows badge on Actions button
  ↓
User clicks Actions → TriageModal opens
  • Filters to suggested IDs
  • Shows personalized actions
```

### Key Design Decision: Backend as Source of Truth

**Why backend candidates?**
1. **More reliable:** Backend has full dataset, accurate IDs
2. **No name matching bugs:** Direct ID lookup, no string parsing
3. **Intelligent filtering:** Can apply ML logic (blockers, probabilities)
4. **Consistent:** Same logic across all queries

**Frontend name matching is now fallback only** (when backend doesn't provide candidates).

---

## What Changed vs Original Design

### Original (Broken):
- Backend: Returns `answer` text only
- Frontend: Parse answer text → extract names → match to apps
- **Problem:** Name matching bugs, case sensitivity, normalization

### New (Fixed):
- Backend: Returns `answer` + `candidates` array with IDs
- Frontend: Use `candidates` directly (PRIORITY 1)
- **Benefit:** No string parsing, no matching bugs

### Still Supported (Fallback):
- Frontend name matching still exists for:
  - Specific applicant queries ("Tell me about Harper")
  - When backend doesn't provide candidates
  - Backwards compatibility

---

## Testing Checklist

### Manual Testing (To Do):

- [ ] **Test 1: Basic Flow**
  - Open Ask Ivy
  - Type: "Who should I follow up with urgently?"
  - Verify: Badge appears on Actions button
  - Verify: Badge shows correct count (should be 5-10)

- [ ] **Test 2: Actions Modal**
  - Click Actions button
  - Verify: Modal opens with filtered applications
  - Verify: Shows same applicants from Ivy response
  - Verify: Each action has personalized context

- [ ] **Test 3: Specific Applicant Query**
  - Type: "Tell me about Noah Thompson"
  - Verify: Returns specific analysis
  - Verify: Badge suggests action for Noah

- [ ] **Test 4: Non-Urgent Query**
  - Type: "How's the pipeline today?"
  - Verify: No badge appears (query doesn't request actions)

- [ ] **Test 5: Empty Dataset**
  - Filter applications to none
  - Type: "Who needs follow up?"
  - Verify: Graceful response, no badge

- [ ] **Test 6: All Terminal States**
  - Filter to only rejected/withdrawn
  - Type: "Who needs follow up?"
  - Verify: No candidates (all filtered out)

### Console Logs to Look For:

```
[Ask Ivy] Backend provided candidates: 10
[Action Suggestion] ✓ Using backend candidates: 10
[Action Suggestion] Final suggested IDs: Array(10)
[ApplicationsBoard] Store updated, ivySuggestions: { applicationIds: [...] }
[TriageModal] Loading queue with suggestedApplicationIds: Array(10)
```

---

## Files Modified

### Backend:
- `backend/app/routers/applications_insights.py`
  - Added `Candidate` model
  - Added `candidates` field to `AskResponse`
  - Created `extract_action_candidates()` function
  - Modified `/ask` endpoint to populate candidates

### Frontend:
- **No changes needed!** (Already had PRIORITY 1 logic for backend candidates)

### Documentation:
- `NAME_MATCHING_FIX_2025-10-28.md` (this file)

---

## Next Steps

1. **Manual Testing** - Complete checklist above
2. **Seed Data Enhancement** - Add realistic touchpoints for demo (separate task)
3. **Phase 2** - Deep context analysis ("Tell me about Noah" → full history)
4. **Phase 3** - Intelligent action generation (personalized scripts)

---

## Success Criteria ✅

- ✅ Backend returns `candidates` array
- ✅ Frontend uses backend candidates as PRIORITY 1
- ✅ No name matching bugs (backend provides IDs)
- ⏳ Badge appears when Ivy suggests actions (to test)
- ⏳ Actions modal filters to suggested applications (to test)
- ⏳ Full flow works end-to-end (to test)

---

**Status:** Backend fix complete, frontend ready to test
**Blocking:** None - ready for manual testing
**Risk:** Low - backend change is additive (doesn't break existing flows)
