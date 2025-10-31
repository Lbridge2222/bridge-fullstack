# Testing Action Suggestions - Complete Guide

**Status:** 🟢 Dev servers running
- Frontend: http://localhost:5173/
- Backend: http://localhost:8000

---

## Testing Options

### Option 1: Manual Testing (Recommended - Start Here) ✅

**What You'll Test:**
- Backend candidates (PRIORITY 1)
- Name matching with variations
- Debug console logs
- Badge appearance
- Actions modal population

**Steps:**

1. **Open the Application**
   ```bash
   # Servers already running:
   # Frontend: http://localhost:5173/
   # Backend: http://localhost:8000
   ```

2. **Open Browser Console**
   - Press F12 or Cmd+Option+I
   - Go to Console tab
   - Filter for: `[Ask Ivy]` or `[Action Suggestion]`

3. **Navigate to Applications Board**
   - Log in to Bridge Dashboard
   - Go to CRM → Applications Board

4. **Test Scenarios**

   **Test A: Backend Candidates (Most Important)**
   ```
   Query: "Who should I follow up with urgently?"

   Expected Console Output:
   [Ask Ivy] Backend provided candidates: X
   [Action Suggestion] ✓ Using backend candidates: X
   [Ask Ivy] ✓ Suggesting actions for X applications

   Expected UI:
   ✅ Badge appears with count
   ✅ Clicking badge opens Actions modal
   ✅ Modal shows applications from backend
   ```

   **Test B: Name Matching - Exact**
   ```
   Query: "What about Harper Martin?"

   Expected Console Output:
   [Action Suggestion] Extracted names: ["Harper Martin"]
   [Action Suggestion] ✓ Matched: Harper Martin → abc123...

   Expected UI:
   ✅ Badge appears
   ✅ Modal shows Harper Martin's application
   ```

   **Test C: Name Matching - Variations**
   ```
   Query 1: "martin harper needs a call"
   Query 2: "Martin, Harper is at risk"
   Query 3: "harper should be contacted"

   Expected Console Output:
   [Action Suggestion] ✓ Matched: Harper Martin → abc123...
   (Should match despite different word order/format)

   Expected UI:
   ✅ All variations should match to same application
   ```

   **Test D: Multiple Names**
   ```
   Query: "Harper Martin and Marco Rossi need follow-ups"

   Expected Console Output:
   [Action Suggestion] Extracted names: ["Harper Martin", "Marco Rossi"]
   [Action Suggestion] ✓ Matched: Harper Martin → abc123...
   [Action Suggestion] ✓ Matched: Marco Rossi → def456...

   Expected UI:
   ✅ Badge shows count: 2
   ✅ Modal shows both applications
   ```

   **Test E: Word-Level Fallback**
   ```
   Query: "Harper needs urgent attention"

   Expected Console Output:
   [Action Suggestion] Word-level fallback matching...
   [Action Suggestion] ✓ Word matched: Harper → Harper Martin

   Expected UI:
   ✅ Badge appears
   ✅ Modal shows Harper Martin's application
   ```

5. **What to Look For**

   ✅ **Console Logs Show:**
   - Which matching strategy was used
   - How many candidates were found
   - Application names and IDs matched
   - Clear reasoning for success/failure

   ✅ **UI Shows:**
   - Badge appears when suggestions detected
   - Badge shows correct count
   - Modal opens on click
   - Modal shows correct applications
   - Applications have correct metadata (name, status, tags)

   ❌ **Failure Indicators:**
   - Console shows: "Found suggested IDs via name matching: Array []"
   - Badge doesn't appear when it should
   - Modal is empty or shows wrong applications
   - TypeScript errors in console

---

### Option 2: Unit Tests (Isolated Logic Testing) 🧪

I can create Jest/Vitest unit tests for the name matching logic.

**Tests to Create:**
- `normalizeName()` function
- `namesMatch()` function with all variations
- `detectActionableFollowups()` with mock data

**Would you like me to create these?**

---

### Option 3: Integration Test Script (Automated E2E) 🤖

I can create a Playwright or Cypress test that:
1. Logs into the app
2. Navigates to Applications Board
3. Opens Ask Ivy
4. Sends test queries
5. Verifies badge and modal behavior

**Would you like me to create this?**

---

### Option 4: Backend API Testing (Direct API Calls) 🔧

Test the RAG endpoint directly to see what candidates it returns.

**Quick Test:**

```bash
# Test the applications RAG endpoint
curl -X POST http://localhost:8000/api/applications/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Who should I follow up with urgently?",
    "application_ids": ["<your-app-id-1>", "<your-app-id-2>"]
  }' | jq '.candidates'
```

**Expected Response:**
```json
{
  "answer": "Based on urgency, you should follow up with Harper Martin and Marco Rossi...",
  "candidates": [
    {
      "application_id": "abc123...",
      "name": "Harper Martin",
      "score": 0.95
    },
    {
      "application_id": "def456...",
      "name": "Marco Rossi",
      "score": 0.87
    }
  ],
  "query_type": "follow_up_recommendation",
  "confidence": 0.9
}
```

---

### Option 5: Mock Backend Candidates (No Real Data Needed) 🎭

If you don't have real application data yet, I can:
1. Create mock data with test applications
2. Add a debug mode to force backend candidates
3. Test the full flow with synthetic data

**Would you like me to set this up?**

---

## Debugging Checklist

If something doesn't work, check these in order:

### 1. **Console Logs Present?**
```javascript
// Should see these logs:
[Ask Ivy] Context applications: [...]
[Ask Ivy] Backend provided candidates: X
[Action Suggestion] ✓ Using backend candidates: X
```
- ❌ **If missing**: Function might not be called
- ✅ **If present**: Move to next check

### 2. **Backend Returning Candidates?**
```javascript
// Check backend response structure:
console.log('Backend response:', response);
// Look for: response.candidates
```
- ❌ **If undefined**: Backend not returning candidates (check API)
- ✅ **If present**: Move to next check

### 3. **Candidates Being Extracted?**
```javascript
// Should see:
[Ask Ivy] Backend provided candidates: 2
```
- ❌ **If 0 or undefined**: Check extraction logic
- ✅ **If > 0**: Move to next check

### 4. **Detection Function Receiving Candidates?**
```javascript
// Inside detectActionableFollowups:
console.log('Received candidates:', backendCandidates);
```
- ❌ **If undefined**: Check parameter passing
- ✅ **If array**: Move to next check

### 5. **Priority 1 Logic Triggered?**
```javascript
// Should see:
[Action Suggestion] ✓ Using backend candidates: 2
```
- ❌ **If not triggered**: Check PRIORITY 1 if condition
- ✅ **If triggered**: Move to next check

### 6. **Suggestions Returned?**
```javascript
// Should see:
[Ask Ivy] Detection returned IDs: ["abc...", "def..."]
```
- ❌ **If empty array**: Logic error in function
- ✅ **If populated**: Move to next check

### 7. **Badge Appearing?**
- Check Ivy panel for badge with count
- ❌ **If missing**: Check badge rendering logic
- ✅ **If visible**: Move to next check

### 8. **Modal Opening?**
- Click badge
- ❌ **If nothing happens**: Check event handlers
- ✅ **If opens**: Check content

### 9. **Modal Showing Applications?**
- Should see list of applications with metadata
- ❌ **If empty**: Check modal data source
- ✅ **If populated**: SUCCESS! 🎉

---

## Quick Start: Immediate Test (5 minutes)

**Do this right now:**

1. Open http://localhost:5173/ in browser
2. Press F12 to open console
3. Log in and navigate to Applications Board
4. Click "Ask Ivy" button
5. Type: **"Who should I follow up with urgently?"**
6. Press Enter
7. **Watch console for these exact logs:**

```
[Ask Ivy] Context applications: [...]
[Ask Ivy] Backend provided candidates: X
[Action Suggestion] ✓ Using backend candidates: X
[Ask Ivy] ✓ Suggesting actions for X applications
```

8. **Look at Ivy panel for:**
   - Badge with number (e.g., "2")
   - Badge is clickable

9. **Click badge and verify:**
   - Modal opens
   - Shows list of applications
   - Each application has name and metadata

**Expected Result:**
✅ Badge appears → Click opens modal → Modal shows applications

**If it fails:**
❌ Share the console output with me and I'll debug

---

## Test Data Recommendations

### Minimum Test Data Needed:
- **2-3 applications** in your database
- At least one with **name** like "Harper Martin" or "Marco Rossi"
- At least one marked as **is_at_risk: true** (for fallback testing)

### Creating Test Applications:
```sql
-- Quick test data insert
INSERT INTO applications (application_id, name, status, is_at_risk, created_at)
VALUES
  (gen_random_uuid(), 'Harper Martin', 'screening', true, NOW()),
  (gen_random_uuid(), 'Marco Rossi', 'interview', false, NOW()),
  (gen_random_uuid(), 'Sarah Johnson', 'offer', true, NOW());
```

---

## Success Criteria ✅

### Must Pass (Critical):
- ✅ Backend candidates used when available
- ✅ Name matching works for exact names
- ✅ Badge appears when suggestions detected
- ✅ Modal opens and shows applications
- ✅ Console logs show matching reasoning

### Should Pass (Important):
- ✅ Name variations match (e.g., "Harper" → "Harper Martin")
- ✅ Multiple names detected in one query
- ✅ Word-level fallback works
- ✅ High-risk fallback works when no matches

### Nice to Have (Optional):
- ✅ Badge shows correct count
- ✅ Modal has good UX (loading states, errors)
- ✅ Toast notification on suggestion
- ✅ Activity chips on board cards

---

## Need Help?

**If manual testing fails:**
1. Share the console logs
2. Tell me what query you tried
3. Tell me what you expected vs what happened

**If you want automated tests:**
- Say "create unit tests" for isolated logic tests
- Say "create E2E tests" for full browser automation
- Say "create mock data" for synthetic test data

**If you want to test without real data:**
- Say "set up mock backend" and I'll create test fixtures

---

**Current Status:** Ready to test! 🚀

**Recommended Next Step:** Do the "Quick Start: Immediate Test" above (5 minutes)

---

*Generated: October 27, 2025*
*Servers Running: Frontend (5173), Backend (8000)*
