# Phase 3: Intelligent Action Generation - Implementation Plan

**Date:** October 29, 2025
**Status:** 🚧 Planning → Implementation
**Part of:** Intelligent Pipeline Guardian Plan
**Depends On:**
- Phase 1 (Enhanced Pipeline Health) ✅
- Phase 2 (Deep Context Analysis) ✅

---

## Problem Statement

Currently, when Ivy asks "Would you like me to create personalised intervention plans?" and the user responds "yes", Ivy knows it's a follow-up (thanks to Phase 2) but doesn't have the capability to actually generate and present structured intervention plans.

**Current Experience:**
```
User: "How's the pipeline today?"
Ivy: "...Harper Martin stuck in review... Would you like me to create personalised intervention plans?"
User: "Yes"
Ivy: "Great! Let me create intervention plans for the 5 high-risk applicants I mentioned..."
[But plans are just text, not actionable]
```

**Desired Experience:**
```
User: "How's the pipeline today?"
Ivy: "...Harper Martin stuck in review... Would you like me to create personalised intervention plans?"
User: "Yes"
Ivy: "I've created personalised intervention plans:

📋 **Harper Martin** (0% probability, review_in_progress)
• Call admissions office to expedite review - Deadline: Today
• Send email with programme highlights and next steps - Deadline: Tomorrow
• Schedule follow-up call if no response - Deadline: 3 days

📋 **Noah Thompson** (15% probability, conditional_offer_no_response)
• Send SMS reminder about conditional offer acceptance - Deadline: Today
• Call to discuss any concerns about conditions - Deadline: 2 days
• Email with accommodation information - Deadline: 3 days

Would you like me to create these actions in your system?"

User: "Yes"
Ivy: ✅ "I've created 6 actions in the system. Click 'View Actions' to review and refine them."
[Opens TriageModal with pre-populated actions]
```

---

## Objectives

1. **Generate Structured Intervention Plans** - Use LLM to create personalised action plans for each at-risk applicant
2. **Present Plans as Markdown** - Format plans in readable, scannable format with emojis and clear structure
3. **Create Actions in System** - When user confirms, write actions to `public.actions` table
4. **Integrate with Existing Actions UI** - Trigger `ivy:suggestAction` event to open TriageModal with created actions
5. **Track Plan Execution** - Store plan generation and execution in conversation history

---

## Architecture

### Intervention Plan Structure

```typescript
interface InterventionPlan {
  application_id: string;
  applicant_name: string;
  stage: string;
  probability: number;
  actions: Action[];
}

interface Action {
  action_type: string; // 'call', 'email', 'sms', 'meeting', 'review'
  description: string;
  deadline: string; // 'today', 'tomorrow', '3 days', '1 week'
  priority: 'high' | 'medium' | 'low';
  reasoning: string; // Why this action is recommended
}
```

### LLM Prompt for Plan Generation

```
You are Ivy, a UK Higher Education admissions AI assistant creating personalised intervention plans.

CONTEXT:
The user has asked you to create intervention plans for these high-risk applicants:
1. Harper Martin - 0% probability, review_in_progress, critical blockers: interview not scheduled
2. Noah Thompson - 15% probability, conditional_offer_no_response
...

TASK:
For each applicant, generate 2-3 specific, actionable interventions.

RULES:
1. Each action must be SPECIFIC and ACTIONABLE (not vague like "follow up")
2. Include realistic deadlines (today, tomorrow, 2 days, 3 days, 1 week)
3. Prioritise based on urgency and probability
4. Use UK HE terminology (enrolment not enrollment, programme not program)
5. Consider the applicant's specific stage and blockers
6. Actions should be feasible for admissions staff

ACTION TYPES:
- call: Phone call to applicant or admissions office
- email: Personalised email with specific content
- sms: Text message reminder or update
- meeting: Schedule interview, campus visit, or meeting
- review: Internal review or documentation task

OUTPUT FORMAT (JSON):
[
  {
    "application_id": "uuid",
    "applicant_name": "Harper Martin",
    "actions": [
      {
        "action_type": "call",
        "description": "Call admissions office to expedite review and schedule interview",
        "deadline": "today",
        "priority": "high",
        "reasoning": "Application stuck in review for 2 weeks, interview not scheduled"
      },
      ...
    ]
  },
  ...
]
```

### Presentation Format (Markdown)

```markdown
I've created personalised intervention plans:

📋 **Harper Martin** (0% probability, review_in_progress)
• 📞 Call admissions office to expedite review - Deadline: Today (HIGH)
• ✉️ Send email with programme highlights - Deadline: Tomorrow
• 📅 Schedule follow-up call if no response - Deadline: 3 days

📋 **Noah Thompson** (15% probability, conditional_offer_no_response)
• 📱 Send SMS reminder about offer acceptance - Deadline: Today (HIGH)
• 📞 Call to discuss condition concerns - Deadline: 2 days
• ✉️ Email with accommodation info - Deadline: 3 days

Total: 6 actions for 2 applicants

Would you like me to create these actions in your system?
```

---

## Implementation Plan

### Step 1: Create LLM Prompt for Intervention Plans

**File:** `backend/app/routers/applications_insights.py`

Add function to build intervention plan generation prompt:

```python
def build_intervention_plan_prompt(
    applicants: List[Dict[str, Any]],
    dataset: List[Dict[str, Any]]
) -> str:
    """
    Build prompt for generating personalised intervention plans.
    """
    prompt_parts = []

    prompt_parts.append(
        "You are Ivy, a UK Higher Education admissions AI assistant creating "
        "personalised intervention plans.\n\n"
    )

    prompt_parts.append("APPLICANTS REQUIRING INTERVENTION:\n")
    for i, app_id in enumerate(applicants[:5], 1):  # Limit to 5 applicants
        # Find applicant in dataset
        app = next((a for a in dataset if str(a.get('application_id')) == app_id), None)
        if not app:
            continue

        name = f"{app.get('first_name', '')} {app.get('last_name', '')}".strip()
        stage = app.get('stage', 'unknown')
        prob = app.get('progression_probability', 0)
        blockers = app.get('progression_blockers', [])

        prompt_parts.append(f"{i}. {name}")
        prompt_parts.append(f"   - Application ID: {app_id}")
        prompt_parts.append(f"   - Stage: {stage.replace('_', ' ')}")
        prompt_parts.append(f"   - Progression probability: {int(prob * 100)}%")

        if blockers:
            blocker_items = [b.get('item', '') for b in blockers[:3] if isinstance(b, dict)]
            if blocker_items:
                prompt_parts.append(f"   - Key blockers: {', '.join(blocker_items)}")
        prompt_parts.append("")

    prompt_parts.append("\nTASK:")
    prompt_parts.append("Generate 2-3 specific, actionable interventions for EACH applicant.\n")

    prompt_parts.append("RULES:")
    prompt_parts.append("1. Each action must be SPECIFIC (not vague like 'follow up')")
    prompt_parts.append("2. Include realistic deadlines (today, tomorrow, 2 days, 3 days, 1 week)")
    prompt_parts.append("3. Prioritise based on urgency and probability")
    prompt_parts.append("4. Use UK HE terminology (enrolment, programme, conditional offer)")
    prompt_parts.append("5. Consider applicant's specific stage and blockers")
    prompt_parts.append("6. Actions must be feasible for admissions staff\n")

    prompt_parts.append("ACTION TYPES:")
    prompt_parts.append("- call: Phone call to applicant or admissions office")
    prompt_parts.append("- email: Personalised email with specific content")
    prompt_parts.append("- sms: Text message reminder or update")
    prompt_parts.append("- meeting: Schedule interview, campus visit, or meeting")
    prompt_parts.append("- review: Internal review or documentation task\n")

    prompt_parts.append("OUTPUT FORMAT (valid JSON array):")
    prompt_parts.append("""[
  {
    "application_id": "uuid",
    "applicant_name": "Full Name",
    "actions": [
      {
        "action_type": "call",
        "description": "Specific action description",
        "deadline": "today",
        "priority": "high",
        "reasoning": "Why this action is needed"
      }
    ]
  }
]""")

    return "\n".join(prompt_parts)
```

### Step 2: Generate Intervention Plans

**File:** `backend/app/routers/applications_insights.py`

Add function to call LLM and parse JSON response:

```python
async def generate_intervention_plans(
    applicant_ids: List[str],
    dataset: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Generate personalised intervention plans using LLM.
    Returns structured plans as list of dicts.
    """
    try:
        prompt = build_intervention_plan_prompt(applicant_ids, dataset)

        llm = LLMCtx(model="gemini-2.0-flash", temperature=0.3)
        messages = [
            ("system", "You are a helpful AI assistant that generates structured JSON output for intervention plans."),
            ("human", prompt)
        ]

        result = await llm.ainvoke(messages)

        if not result:
            logger.warning("LLM returned empty result for intervention plans")
            return []

        # Parse JSON from result
        # LLM might wrap in markdown code blocks, so clean it
        json_str = result.strip()
        if json_str.startswith("```json"):
            json_str = json_str[7:]  # Remove ```json
        if json_str.startswith("```"):
            json_str = json_str[3:]  # Remove ```
        if json_str.endswith("```"):
            json_str = json_str[:-3]  # Remove ```
        json_str = json_str.strip()

        plans = json.loads(json_str)
        logger.info(f"Generated {len(plans)} intervention plans")

        return plans

    except json.JSONDecodeError as e:
        logger.exception(f"Failed to parse intervention plans JSON: {e}")
        return []
    except Exception as e:
        logger.exception(f"Failed to generate intervention plans: {e}")
        return []
```

### Step 3: Format Plans as Markdown

**File:** `backend/app/routers/applications_insights.py`

```python
def format_intervention_plans_markdown(plans: List[Dict[str, Any]]) -> str:
    """
    Format intervention plans as readable markdown.
    """
    if not plans:
        return "I couldn't generate specific intervention plans. Please try again or contact admissions directly."

    parts = ["I've created personalised intervention plans:\n"]

    total_actions = 0
    action_emojis = {
        "call": "📞",
        "email": "✉️",
        "sms": "📱",
        "meeting": "📅",
        "review": "📋"
    }

    for plan in plans:
        name = plan.get("applicant_name", "Unknown")
        app_id = plan.get("application_id", "")
        actions = plan.get("actions", [])

        if not actions:
            continue

        # Find applicant info for header
        # parts.append(f"\n📋 **{name}**")
        parts.append(f"\n**{name}**")

        for action in actions:
            emoji = action_emojis.get(action.get("action_type", ""), "•")
            desc = action.get("description", "")
            deadline = action.get("deadline", "soon")
            priority = action.get("priority", "medium")

            priority_tag = " (HIGH)" if priority == "high" else ""
            parts.append(f"{emoji} {desc} - Deadline: {deadline.capitalize()}{priority_tag}")
            total_actions += 1

    parts.append(f"\n**Total: {total_actions} actions for {len(plans)} applicants**")
    parts.append("\nWould you like me to create these actions in your system?")

    return "\n".join(parts)
```

### Step 4: Create Actions in Database

**File:** `backend/app/routers/applications_insights.py`

```python
async def create_actions_from_plans(
    plans: List[Dict[str, Any]],
    user_id: Optional[str] = None
) -> List[str]:
    """
    Create actions in public.actions table from intervention plans.
    Returns list of created action IDs.
    """
    try:
        action_ids = []

        for plan in plans:
            app_id = plan.get("application_id")
            if not app_id:
                continue

            for action in plan.get("actions", []):
                # Map deadline to actual date
                deadline_map = {
                    "today": "NOW() + INTERVAL '1 day'",
                    "tomorrow": "NOW() + INTERVAL '2 days'",
                    "2 days": "NOW() + INTERVAL '2 days'",
                    "3 days": "NOW() + INTERVAL '3 days'",
                    "1 week": "NOW() + INTERVAL '7 days'",
                }
                deadline_str = action.get("deadline", "3 days")
                deadline_sql = deadline_map.get(deadline_str, "NOW() + INTERVAL '3 days'")

                # Map action_type to existing action types
                action_type_map = {
                    "call": "call",
                    "email": "email",
                    "sms": "sms",
                    "meeting": "schedule_interview",
                    "review": "review_application"
                }
                action_type = action_type_map.get(action.get("action_type", "email"), "email")

                sql = f"""
                    INSERT INTO public.actions
                    (application_id, action_type, description, deadline, priority, status, created_by_ivy)
                    VALUES (%s, %s, %s, {deadline_sql}, %s, 'pending', TRUE)
                    RETURNING action_id
                """

                rows = await fetch(
                    sql,
                    app_id,
                    action_type,
                    action.get("description", ""),
                    action.get("priority", "medium")
                )

                if rows and len(rows) > 0:
                    action_ids.append(str(rows[0]['action_id']))

        logger.info(f"Created {len(action_ids)} actions from intervention plans")
        return action_ids

    except Exception as e:
        logger.exception(f"Failed to create actions from plans: {e}")
        return []
```

### Step 5: Modify `/ask` Endpoint for "Yes" Follow-ups

**File:** `backend/app/routers/applications_insights.py`

Update the `/ask` endpoint to detect when user says "yes" to creating actions:

```python
@router.post("/ask", response_model=AskResponse)
async def ask_ep(req: AskRequest):
    try:
        # ... existing session and history loading ...

        followup_context = await detect_followup_intent(req.query, history)

        # PHASE 3: Check if user is confirming action creation
        if followup_context.get("is_followup") and followup_context.get("followup_type") == "affirmative":
            # Check if previous message asked about creating actions
            last_assistant_msg = next(
                (msg for msg in reversed(history) if msg.role == "assistant"),
                None
            )

            if last_assistant_msg and "create these actions in your system" in last_assistant_msg.content.lower():
                # User is confirming action creation!
                logger.info("User confirmed action creation - executing intervention plans")

                # Get referenced applicants from last message
                applicant_ids = followup_context.get("referenced_applicants", [])

                if applicant_ids:
                    # Load dataset
                    dataset = await _load_dataset(req.filters)

                    # Generate intervention plans
                    plans = await generate_intervention_plans(applicant_ids, dataset)

                    # Create actions in database
                    action_ids = await create_actions_from_plans(plans, user_id=None)

                    if action_ids:
                        answer = f"✅ I've created {len(action_ids)} actions in the system for {len(plans)} applicants.\n\n"
                        answer += "You can view and refine them in the Actions panel. The actions include:\n"

                        # Summarise created actions
                        action_types = {}
                        for plan in plans:
                            for action in plan.get("actions", []):
                                atype = action.get("action_type", "other")
                                action_types[atype] = action_types.get(atype, 0) + 1

                        for atype, count in action_types.items():
                            answer += f"• {count} {atype} actions\n"

                        answer += "\nClick the Actions badge to review and execute them."

                        # Store message and return
                        await add_message_to_session(
                            session_id=session_id,
                            role="user",
                            content=req.query,
                            query_intent="confirm_action_creation"
                        )

                        await add_message_to_session(
                            session_id=session_id,
                            role="assistant",
                            content=answer,
                            mentioned_application_ids=applicant_ids,
                            backend_candidates=applicant_ids
                        )

                        return AskResponse(
                            answer=answer,
                            summary=_summarise(dataset),
                            candidates=[],
                            session_id=session_id
                        )

            # Check if user is saying yes to "create intervention plans"
            if last_assistant_msg and "would you like me to create personalised intervention plans" in last_assistant_msg.content.lower():
                # User wants intervention plans generated (but not created yet)
                logger.info("User requested intervention plan generation")

                applicant_ids = followup_context.get("referenced_applicants", [])

                if applicant_ids:
                    dataset = await _load_dataset(req.filters)
                    plans = await generate_intervention_plans(applicant_ids, dataset)
                    answer = format_intervention_plans_markdown(plans)

                    await add_message_to_session(
                        session_id=session_id,
                        role="user",
                        content=req.query,
                        query_intent="request_intervention_plans"
                    )

                    await add_message_to_session(
                        session_id=session_id,
                        role="assistant",
                        content=answer,
                        mentioned_application_ids=applicant_ids,
                        backend_candidates=applicant_ids
                    )

                    return AskResponse(
                        answer=answer,
                        summary=_summarise(dataset),
                        candidates=[],  # Plans are in the message, not candidates
                        session_id=session_id
                    )

        # ... existing flow for non-follow-up queries ...
```

---

## Testing Plan

### Test 1: Generate Intervention Plans

**Steps:**
1. Ask: "How's the pipeline today?"
2. Ivy responds with call-to-action
3. Respond: "Yes"
4. Verify Ivy generates structured intervention plans

**Expected Output:**
```markdown
I've created personalised intervention plans:

**Harper Martin** (0% probability, review_in_progress)
📞 Call admissions office to expedite review - Deadline: Today (HIGH)
✉️ Send email with programme highlights - Deadline: Tomorrow
📅 Schedule follow-up call if no response - Deadline: 3 days

**Noah Thompson** (15% probability, conditional_offer_no_response)
📱 Send SMS reminder about offer acceptance - Deadline: Today (HIGH)
📞 Call to discuss condition concerns - Deadline: 2 days

Total: 5 actions for 2 applicants

Would you like me to create these actions in your system?
```

### Test 2: Create Actions in System

**Steps:**
1. Continue from Test 1
2. Respond: "Yes"
3. Verify actions created in database
4. Check Actions panel in UI

**Expected:**
- ✅ Actions inserted into `public.actions` table
- ✅ Actions have `created_by_ivy = TRUE`
- ✅ Correct application_ids, deadlines, priorities
- ✅ Actions visible in TriageModal

### Test 3: Multi-Step Conversation

**Steps:**
1. Ask: "Show me high-risk applicants"
2. Ivy lists applicants
3. Ask: "Create intervention plans for the top 3"
4. Ivy generates plans
5. Respond: "Yes"
6. Verify actions created

---

## Success Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| LLM generates structured intervention plans | ⏳ | JSON parsing works, realistic actions |
| Plans formatted as readable markdown | ⏳ | Emojis, clear structure, scannable |
| User can confirm plan creation with "yes" | ⏳ | Follow-up detection + plan generation |
| Actions created in public.actions table | ⏳ | Database inserts successful |
| Actions visible in TriageModal | ⏳ | UI shows Ivy-generated actions |
| Actions marked as Ivy-generated | ⏳ | created_by_ivy = TRUE flag |

---

## Database Schema (Actions Table)

Need to add `created_by_ivy` column to track Ivy-generated actions:

```sql
ALTER TABLE public.actions
ADD COLUMN IF NOT EXISTS created_by_ivy BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_actions_created_by_ivy
ON public.actions(created_by_ivy)
WHERE created_by_ivy = TRUE;
```

---

## Next Steps (Immediate)

1. ⏳ Add `created_by_ivy` column to actions table
2. ⏳ Implement intervention plan generation functions
3. ⏳ Update `/ask` endpoint to handle two-step confirmation
4. ⏳ Test with real queries
5. ⏳ Verify actions appear in TriageModal

---

*Generated: October 29, 2025*
*Status: Planning Complete → Ready for Implementation*
