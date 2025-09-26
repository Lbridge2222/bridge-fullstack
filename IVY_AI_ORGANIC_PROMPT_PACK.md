### Ivy AI — Organic Prompt + System Audit Pack

#### 1) Purpose

Make Ivy conversational, flexible, and accurate without hard-wiring behaviour. This pack gives:
- **one Organic System Prompt** (the only global system prompt for conversational mode),
- **runtime nudges** (sampling/length hints),
- **reliability & privacy guardrails** (code-agnostic patterns and drop-in examples),
- **minimal I/O contracts** (so FE/BE don’t surprise each other),
- **a short test checklist** you can run today.

---

#### 2) Organic System Prompt (use as the only system prompt for conversational mode)

Paste verbatim.

IVY — Organic System Prompt

You are Ivy, an admissions copilot for UK Higher Education teams.
Your job: help the human make progress right now in a way that feels natural, empathetic and precise. Use British English.

North Star
- Be a good colleague, not a policy engine.
- Treat every turn as a fresh conversation: listen, reflect, respond, then propose a small next step.

What to rely on
- If you’re given live person context (lead), start there.
- If you’re given knowledge docs, borrow facts sparingly and cite once with a short bracket like [S2] only when the fact materially matters.
- If evidence is thin, say so briefly and suggest how to confirm.

Conversational moves (use freely, not rigidly)
- Acknowledge & mirror: briefly reflect what you heard before answering.
- Ask tiny questions: one short question when it unlocks a better answer; otherwise don’t ask.
- Offer choices: propose one or two practical options (“Want me to book a quick 1-to-1 or draft an email?”).
- Change gears: if the user pivots topics, follow them; do not force the previous plan.
- Admit uncertainty: “I’m not fully sure on X; quickest check is Y.”
- Tighten when rushed: if urgency is high, reply in 2–3 crisp lines.

Tone & style
- Plain language, short paragraphs.
- Avoid boilerplate sections unless the user asks for structure.
- Never say “As an AI”.
- Use bullets only when enumerating options or steps the user requested.

Actions (only if helpful)
Return at most one primary action, using these names exactly:
open_call_console, open_email_composer, open_meeting_scheduler, view_profile.

Boundaries
- Don’t speculate about private life (relationships, pets, religion, politics).
- If a request is unsafe or out of scope, decline briefly and offer a safe alternative.

When unsure
Say the best-supported thing you can in one line, then either:
- ask one tiny clarifying question, or
- propose one small next step (possibly an action).

Light few-shot vibe (don’t memorise; use as feel)
- “Tell me about Priya; I might call her”: Respond with course, recent activity, status, offer 1-to-1; optional action: open_meeting_scheduler.
- “Entry requirements for MSc DS?”: Give concise criteria, one citation like [S1] if needed; offer email summary; optional action: open_email_composer.
- “She’s worried about cost.”: Normalise, link value to goals, offer finance chat.
- “Not sure he’s ready.”: Suggest fastest qualification check + next step (UCAS start or checklist).
- “Switching to Cyber Security.”: Acknowledge pivot, adapt expectations, offer draft or booking.

Minimal output contract
- Default to 1–3 short paragraphs.
- Only add a bullet list if the user asks for steps/options.
- At most one UI action when it clearly helps.

---

#### 3) Runtime nudges (outside the prompt)
- **Temperature**: 0.6–0.8; **Top-p**: 0.9
- **Presence penalty**: 0.6; **Frequency penalty**: 0.2
- **Length jitter**: randomly aim for ~60–120 words unless the user asks for detail.
- If your router/classifier isn’t confident, don’t force a mode; just pass the message + context to the prompt above.

---

#### 4) Reliability & privacy guardrails (code-agnostic patterns)

##### 4.1 PII-safe logging

Goal: never log raw emails/phones/full lead objects.

Pattern (drop-in idea):

```python
def safe_preview(d: dict, keys=("name","status","courseInterest","leadScore")):
    if not isinstance(d, dict): return {}
    return {k: d.get(k) for k in keys if k in d}

# Usage example:
logger.info("lead context (preview)=%s", safe_preview(context.get("lead", {})))
```

##### 4.2 Anonymisation that preserves citations and titles

Goal: anonymise only the body text when requested; keep [S#] citation lines/titles intact.

Pattern:

```python
def anonymise_body(content: str, enabled: bool) -> str:
    if not enabled: return content
    import re
    def protect_blocks(txt):
        blocks = []
        def repl(m): blocks.append(m.group(0)); return f"@@B{len(blocks)-1}@@"
        txt = re.sub(r"^\[S\d+\].*$", repl, txt, flags=re.M)
        return txt, blocks
    def unprotect(txt, blocks):
        for i,b in enumerate(blocks): txt = txt.replace(f"@@B{i}@@", b)
        return txt
    body, blocks = protect_blocks(content)
    patterns = [
        r"\bUniversity of [A-Za-z ]+\b",
        r"\b(King's College London|UCL|LSE|QMUL|Imperial College|Oxford|Cambridge|Warwick|Bristol|Manchester|Birmingham|Leeds|Sheffield|Liverpool|Newcastle|Nottingham|Southampton|York|Durham|Exeter|Bath|Cardiff|Glasgow|Edinburgh|St Andrews)\b"
    ]
    for p in patterns: body = re.sub(p, "a UK university", body, flags=re.I)
    return unprotect(body, blocks)
```

##### 4.3 Text search must not fail on “empty” keywords

Goal: if keyword extraction yields nothing, fall back to a broad match on the raw query.

Pattern:

```python
keywords = extract_keywords(query)  # may be ""
terms = [t for t in keywords.split() if t]
if not terms:
    where = ["title ILIKE %s", "content ILIKE %s"]
    params = [f"%{query}%", f"%{query}%"]
else:
    where = sum(([ "title ILIKE %s", "content ILIKE %s" ] for _ in terms), [])
    params = sum(([f"%{t}%", f"%{t}%"] for t in terms), [])
# Build SQL with " OR ".join(where)
```

##### 4.4 Expansion control (reduce drift & latency)

Goal: add expansions only when needed, and only one extra variation.

Pattern:

```python
def strong(rs, threshold, limit):
    scores = [float(r.get("similarity_score", 0)) for r in rs]
    return sum(s >= threshold for s in scores) >= max(3, limit//2)

primary = search(query)
results = list(primary)
if not strong(primary, threshold, limit):
    alt = generate_one_expansion(query)  # cheap, with topic guard
    if alt and alt != query:
        results.extend(search(alt))
```

##### 4.5 Classifier guard (don’t hard-gate behaviour)

Goal: if intent classification is uncertain, don’t force a rigid path; let the organic prompt handle it.

Pattern:

```python
intent = None
try:
    intent = classify(query, context)  # may raise/return None
except Exception:
    pass
# Pass intent as a hint only; don’t make it a gate.
```

##### 4.6 Per-request time budgets

Goal: prevent cascading waits.

Pattern:
- Soft total budget per request (e.g., ~10s).
- Light classifier/expansion timeout (e.g., 2–4s).
- Main generation timeout (e.g., 6–8s).
- If a step times out, skip and use a fallback (no user-visible error).

##### 4.7 Caching (cheap wins)
- Cache embeddings for identical (text, model) pairs (LRU).
- Cache search results for (query, filters) for ~60–120s.
- Optionally cache one expansion per (session, query).

##### 4.8 Observability without PII
- Log a trace dict: {session_id, steps, timeouts, cache_hits, expansions_used, classifier_hint, kb_top_score, latency_ms}.
- Never log raw email/phone/freeform notes.

---

#### 5) Minimal I/O contracts (small, stable, adaptable)

##### 5.1 Input context (to the model)
- Allowed keys: lead, call, ai, anonymise.
- If lead exists, useful fields: name?, status?, courseInterest?, aiInsights?.
- Unknown/huge keys are ignored (keep prompts small).

##### 5.2 Output actions (from the model)
- At most one action; if present, it’s one of:
  - open_call_console
  - open_email_composer
  - open_meeting_scheduler
  - view_profile
- If nothing clearly helps, return no action (or one sensible default if the caller requires at least one).

##### 5.3 RAG sources (to enable light citations)
- Each source: title (≤120 chars), document_type, category?, similarity_score ∈ [0,1], content preview (≤200 chars).
- Provide at most 3–4 sources to the model.

---

#### 6) Keep what’s working
- Adaptive confidence & brief “gap” language (use sparingly).
- Person-context synthesis (start with the person if present).
- Action normalisation with a simple, known set.
- Separate modal/JSON endpoints with their own dedicated prompts (don’t mix with conversational prompt).

---

#### 7) Test checklist (quick wins)

Unit-ish
- Text search with an empty/stop-word query does not throw; returns a polite, minimal result.
- Anonymiser preserves [S#] lines/titles; only body is anonymised.
- MMR/selection returns ≤ k unique items; no duplicates.
- Action normaliser: string action, dict action, empty action ⇒ always ends in a valid shape (or none if optional).

Integration
- Long “vague” query returns a friendly, short answer + small next step (no crash).
- Simulated slow LLM: you still return a useful answer + optional action (fallback path).
- No embedding service: system gracefully uses text search.
- Anonymise toggle flips only the body, not citations/titles.

Privacy
- Grep logs for @ or phone regex: nothing sensitive shows up.

UX
- Multi-turn with pivots (“Priya → cost → switch to Cyber”): Ivy follows the pivot, doesn’t force previous structure, and doesn’t spam citations.

---

#### 8) Optional: modal/JSON prompt stays separate

If you power a “Suggestions” modal or any structured UI, keep a separate mode-specific prompt for that endpoint. The conversational prompt above should not emit JSON unless explicitly asked.

---

#### 9) Next steps (you choose)
- Plug the Organic System Prompt in as your single conversational system prompt.
- Apply the guardrails above where they fit (no need to rename existing functions).
- If you want, I can provide:
  - a tiny config object (prompt + sampling) you can import,
  - a minimal pytest-style harness with stubs/mocks to verify the checklist,
  - a drop-in anonymiser + safe logger utility module.

---

#### FE/BE I/O snippet (minimal contract)

- **FE → BE context keys**: `lead`, `ai`, `anonymise`, `call` (optional)
- **Lead preview fields**: `name?`, `status?`, `courseInterest?`, `aiInsights?`
- **Actions returned**: at most one of `open_call_console`, `open_email_composer`, `open_meeting_scheduler`, `view_profile`

Example BE call shape:

```json
{
  "query": "Tell me about Priya; I might call her",
  "context": {
    "lead": { "name": "Priya", "status": "contacted", "courseInterest": "MSc DS" },
    "ai": { "sources": [ { "title": "MSc DS Entry [S1]", "similarity_score": 0.82, "preview": "..." } ] },
    "anonymise": false
  }
}
```

That’s the whole pack in one place — no hidden assumptions, and you can implement pieces incrementally without breaking what already works.


