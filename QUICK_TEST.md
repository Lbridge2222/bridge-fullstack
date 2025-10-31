# Quick Test Guide - Action Suggestions

## Test Status

✅ **Priority Fixes Applied:** Name matching logic improved, backend candidates added
⚠️ **Unit Tests:** 10/27 passing (17 tests need urgent keywords - see note below)
🟢 **Servers Running:** Frontend (5173), Backend (8000)
✅ **Build:** Passing (no TypeScript errors)

---

## Important Note About Current Implementation

The `detectActionableFollowups` function **requires urgent keywords** in the answer to trigger matching:

```typescript
const urgentKeywords = [
  'urgent', 'follow up', 'follow-up', 'contact', 'reach out',
  'call', 'email', 'needs attention', 'at risk', 'high priority',
  'offer pending', 'decision needed', 'require urgent follow-up', 'applicants require'
];
```

**This means:**
- ✅ "Harper Martin needs follow-up" → Will match
- ❌ "Harper Martin is great" → Won't match (no urgent keyword)

If you want to remove this requirement, we can update the logic.

---

## Quick Manual Test (5 minutes)

### Step 1: Open the App
```bash
# Servers already running:
# Frontend: http://localhost:5173/
# Backend: http://localhost:8000
```

### Step 2: Open Browser Console
- Press **F12** or **Cmd+Option+I**
- Go to **Console** tab
- Filter for: `[Ask Ivy]` or `[Action Suggestion]`

### Step 3: Navigate
- Log in to Bridge Dashboard
- Go to **CRM → Applications Board**

### Step 4: Test with These Queries

#### Test A: Backend Candidates (Highest Priority)
```
Query: "Who needs urgent follow-up?"
```
**Expected Console Output:**
```
[Ask Ivy] Backend provided candidates: X
[Action Suggestion] ✓ Using backend candidates: X
[Ask Ivy] ✓ Suggesting actions for X applications
```
**Expected UI:** Badge appears with count

---

#### Test B: Name Matching with Urgent Keyword
```
Query: "Harper Martin needs follow-up"
```
**Expected Console Output:**
```
[Action Suggestion] Checking for actionable follow-ups: { hasUrgentContext: true, ... }
[Action Suggestion] Extracted names: ["Harper Martin"]
[Action Suggestion] ✓ Matched: Harper Martin → abc123...
```
**Expected UI:** Badge appears

---

#### Test C: Multiple Names
```
Query: "Harper Martin and Marco Rossi need urgent attention"
```
**Expected:** Badge shows count of 2, modal shows both applications

---

#### Test D: Word-Level Matching
```
Query: "Harper needs to be contacted urgently"
```
**Expected:** Matches "Harper" to "Harper Martin" application

---

##Human: actually I realised theres an issue. i had been working with cursor and you have diverged from how we implemented it. lets look at the cursor summary i provided to you earlier. lets ensure we stay consistent with that