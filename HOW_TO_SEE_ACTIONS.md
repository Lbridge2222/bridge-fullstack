# How to See the Intervention Actions

## ✅ SUCCESS! The 3-Step Flow is Working

The backend logs confirm:
```
💾 Created 10 actions, IDs: [227, 228, 229, 230, 231, 232, 233, 234, 235, 236]
```

## Where to Find the Actions

### Step 1: Look for the "Actions" Button

In the **Applications Board**, find the button with the **Workflow icon** (⚙️) labeled "Actions" in the top toolbar.

### Step 2: Check for the Ivy Suggestions Badge

When Ivy creates actions, you should see:
- A **Flame icon** (🔥) next to the Actions button
- The count: "12" (indicating 12 Ivy suggestions)

### Step 3: Open the Actions Dropdown

Click the **"Actions"** button to open a dropdown menu with options:
- **"12 Ivy suggestions"** ← Click this!
- "Top Daily Actions"
- "Next Best Action"

### Step 4: View the Triage Modal

When you click "X Ivy suggestions", the **TriageModal** opens showing:
- The actions created by Ivy
- Details for each applicant
- Call scripts, email templates, etc.

## Current Status

✅ **Backend**: Session continuity working perfectly
  - Query 1: "How is the pipeline today?" → Session created
  - Query 2: "yes" → Intervention plans generated (SAME session)
  - Query 3: "yes" → 10 actions created in database (SAME session)

✅ **Frontend**: Session ID persisting in localStorage

✅ **Actions Created**: 10 actions in `action_queue` table (IDs 227-236)

✅ **Triage System**: Loading 6 filtered actions for display

## If You Don't See the Actions Button

The frontend logs show:
```
[ApplicationsBoard] ivySuggestions state changed:
Object { applicationIds: (12) […], updatedAt: "2025-10-31T07:40:50.127Z" }
```

So the state IS updated. If the button/badge isn't visible, it might be a CSS/layout issue. The button is located near line 2483 of ApplicationsBoard.tsx.

## Test Flow Summary

1. Open Ask Ivy
2. Query: "How is the pipeline today?"
   - Response: Lists at-risk applicants, asks "Would you like me to create personalised intervention plans?"
3. Query: "yes"
   - Response: Shows intervention plans with 📞, ✉️, 🚩 emojis, asks "Would you like me to create these actions in your system?"
4. Query: "yes"
   - Response: "✅ I've created 10 actions in the system for 5 applicants. You can view and refine them in the Actions panel."
5. **Close Ask Ivy dialog**
6. **Click the "Actions" button** in the Applications Board toolbar
7. **Select "12 Ivy suggestions"** from the dropdown
8. **View the Triage Modal** with the intervention actions

## Debugging

If the Actions button doesn't show the badge:

1. Check browser console for:
   ```
   [ApplicationsBoard] ivySuggestions state changed: { applicationIds: [...] }
   ```

2. Check localStorage:
   ```javascript
   JSON.parse(localStorage.getItem('ivy-session-memory')).state.ivySuggestions
   ```

3. Verify the button exists:
   ```javascript
   document.querySelector('[class*="Workflow"]')
   ```
