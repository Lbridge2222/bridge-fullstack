## Ivy v2 Envelopes – Frontend Integration Guide

This doc shows how to consume the v2 AI Router envelopes in the UI and how to map actions to the four canonical handlers.

### Envelopes

Conversational:

```json
{
  "kind": "conversational",
  "answer_markdown": "string of markdown",
  "actions": [ { "label": "Send email", "action": "open_email_composer" } ],
  "sources": [ { "title": "KB Doc", "content": "...", "document_type": "kb", "category": "sales", "similarity_score": 0.78 } ]
}
```

Modal:

```json
{
  "kind": "modal",
  "modal": { "type": "suggestions", "payload": { "modal_title": "AI Suggestions", "summary_bullets": ["…"], "ui": { "primary_cta": { "label": "Send email", "action": "open_email_composer" }, "chips": ["lead", "nba"] } } },
  "actions": [ { "label": "Send email", "action": "open_email_composer" } ]
}
```

### Canonical actions

- open_call_console → open the softphone/call tray
- open_email_composer → open the email composer
- open_meeting_scheduler → open the booking UI
- view_profile → navigate to lead profile

FE dispatch function should map these directly. See `src/actions/dispatch.ts`.

### SuggestionsModal props (minimal)

Use either the full payload or the minimal props:

```ts
type Props = {
  isOpen: boolean;
  onClose: () => void;
  data?: any; // raw payload from /rag/suggestions
  modalTitle?: string;
  summaryBullets?: string[];
  keyMetrics?: Record<string, any>;
  primaryCta?: { label: string; action: string } | null;
  secondaryCta?: { label: string; action: string } | null;
  chips?: string[];
  onAction?: (action: string) => void; // dispatch canonical action
}
```

### Usage

1. Call `aiRouterApi.routerV2({ query, context })`.
2. If `response.kind === 'modal'`, render `SuggestionsModal` with `response.modal.payload` and wire `primaryCta` to the action dispatcher.
3. If conversational, render `answer_markdown` and map `actions` to the canonical dispatcher.


