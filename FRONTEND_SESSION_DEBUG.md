# Frontend Session ID Debugging Guide

## Test Procedure

1. **Clear browser state**:
   ```javascript
   localStorage.clear()
   ```

2. **Hard refresh**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

3. **Open browser console** (F12 → Console tab)

4. **Query 1**: "How is the pipeline today?"

   **Expected console output**:
   ```
   [Ask Ivy Hook] Current sessionId from store: null
   [RAG Client] Sending request with session_id: undefined
   [RAG Client] Full payload: { query: "...", session_id: undefined, ... }
   [Ask Ivy] Storing session_id: a4876cd0-2d09-4398-a1a3-809b642e8e9f
   [Session Store] Setting ivySessionId: a4876cd0-2d09-4398-a1a3-809b642e8e9f
   [Session Store] Current state before update: null
   [Session Store] State after update: a4876cd0-2d09-4398-a1a3-809b642e8e9f
   [Ask Ivy Hook] Current sessionId from store: a4876cd0-2d09-4398-a1a3-809b642e8e9f
   ```

5. **Query 2**: "yes"

   **Expected console output**:
   ```
   [Ask Ivy Hook] Current sessionId from store: a4876cd0-2d09-4398-a1a3-809b642e8e9f
   [RAG Client] Sending request with session_id: a4876cd0-2d09-4398-a1a3-809b642e8e9f
   [RAG Client] Full payload: { query: "yes", session_id: "a4876cd0-...", ... }
   [Ask Ivy] Storing session_id: a4876cd0-2d09-4398-a1a3-809b642e8e9f
   [Session Store] Setting ivySessionId: a4876cd0-2d09-4398-a1a3-809b642e8e9f
   [Session Store] Current state before update: a4876cd0-2d09-4398-a1a3-809b642e8e9f
   [Session Store] State after update: a4876cd0-2d09-4398-a1a3-809b642e8e9f
   ```

## Possible Failure Modes

### Scenario A: Session Store Not Updating
**Symptom**:
```
[Session Store] State after update: null  // Still null!
```
**Diagnosis**: Zustand `set()` isn't working
**Fix**: Check Zustand version, localStorage permissions

### Scenario B: Session Store Updates But Hook Doesn't Re-render
**Symptom**:
```
[Session Store] State after update: a4876cd0-...  // Updated!
[Ask Ivy Hook] Current sessionId from store: null  // But hook still sees null!
```
**Diagnosis**: Hook isn't subscribed to the right part of the store
**Fix**: Check Zustand selector

### Scenario C: sessionId Is Undefined Instead of String
**Symptom**:
```
[RAG Client] Sending request with session_id: undefined
```
**Diagnosis**: `sessionId || undefined` is converting null to undefined
**Fix**: This is expected - backend should handle undefined as "no session"

### Scenario D: localStorage Is Disabled
**Symptom**:
```
// No logs from [Session Store]
```
**Diagnosis**: Zustand persist middleware failing silently
**Fix**: Check browser localStorage permissions

## Backend Verification

Check backend logs for session IDs:
```bash
tail -f /private/tmp/backend.log | grep "Created new session"
```

**Expected**: Both queries use the SAME session ID
**Actual (broken)**: Each query creates a NEW session ID

## Current Status

- ✅ Backend: Intervention flow works via curl with session_id
- ✅ Backend: Database schema fixed (user_id nullable)
- ✅ Backend: Connections refreshed
- ❌ Frontend: session_id not persisting between queries
- ✅ Debugging: Comprehensive console logs added

## Files Modified

- `frontend/src/stores/sessionStore.ts` - Added `ivySessionId` field and debugging
- `frontend/src/ivy/useApplicationIvy.tsx` - Use persistent store + debug logging
- `frontend/src/ivy/applicationRagClient.ts` - Added request payload logging
