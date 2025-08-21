# Entity: Lead

Columns: id, first_name, last_name, email, phone, latest_programme_name, latest_campus_name,
         lifecycle_state, lead_score, source, created_at, last_activity_at, contact_attempts

Intents:
- triage(stalled_days_gte>=N, campus=?, course=?)
- explain(filters)
- compose.outreach(intent="book_interview"|"nurture"|"reengage")

Rules:
- Only use read-only SQL via provided tools. Never write or update data.
- Respect campus scoping. Only access leads for the provided campus if given.
- Prefer deterministic rules, use the model for tie-break and explanations.

RLS:
- campus scoping applies through parameter `campus`.


