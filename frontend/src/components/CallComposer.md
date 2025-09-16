# CallComposer Component

A comprehensive, AI‑powered call management component for lead interactions in the Ivy system.

## Overview

The CallComposer provides a complete solution for managing phone calls with leads, including:
- **Call Outcomes & Dispositions**: Standardised disposition codes, priority and next actions
- **Smart Notes**: Real‑time notes with timestamps, tags and quick‑add
- **Recording & Transcription**: Record calls with AI‑powered analysis
- **AI Scripts & Insights**: Personalized scripts plus conversion probability and strategy
- **Compliance**: Consent capture and Do‑Not‑Call markers
- **Wrap‑up**: Validated save flow that prevents saving while a call is active
- **Autosave**: Drafts persist per lead and reload automatically
- **Prospect Snapshot**: Inline badges for status, score, conversion %, best contact time, source, tags
- **Quick Dispositions**: One‑click common outcomes (Connected, Callback, Voicemail, No Answer)
- **Smart Follow‑up Chips**: Instant scheduling shortcuts (+2h, Tomorrow 09:00, Next Mon 10:00)
- **History Tab**: Optional recent interactions list for fast context
- **Compact Mode**: Minimal, focused layout; depth lives in a right‑side Details sheet
- **Compact Mode**: Minimal, focused layout; depth lives in a right‑side Details sheet
- **Progressive Disclosure**: Aircall‑style call states — Idle (summary) → Dialing → In Call (notes) → Wrap‑up (bottom sheet)
- **Transcript Drawer**: On-demand right drawer with simple search, available in-call or when a recording exists
- **After-Call Work (ACW)**: Wrap-up countdown with optional auto-end when required fields are completed
- **Tags & Assign**: Add tags and assign ownership in wrap-up
- **Power Dialer Hook**: Optional “Save & Start Next” if a queue exists

## Feature Details

### Call Outcomes & Dispositions
- **Disposition Codes** (industry‑style):
  - `connected_interested`, `connected_not_interested`, `callback_scheduled`, `left_voicemail`, `no_answer`, `wrong_number`, `escalated`, `resolved`
- **Priority**: `low`, `medium`, `high`, `urgent`
- **Fields**: description, next action, optional follow‑up datetime

### Smart Notes
- Add notes instantly (Enter to submit) and with **⌘/Ctrl+S** to save the call
- Types: `general`, `action_item`, `follow_up`, `escalation`, `feedback`

### Recording & Transcription
- Start/stop during the call. When stopped, a `CallRecording` artefact is created with duration, transcription (placeholder), quality score, and sentiment.

### AI Scripts & Insights
- Shows conversion probability with a progress bar, current call strategy and recommended follow‑ups.
- `Analyze Call` button simulates backend analysis (wire to `/ai/calls/analyze`).

### Compliance
- **Consent recorded** toggle
- **Do not call** toggle (persisted in call payload)

### Wrap‑up & Validation
- You **cannot save while the call timer is running**.
- Save requires at least one of: a selected outcome **or** one note.
- Copy a **plain‑text summary** to clipboard for email/CRM comments.

### Autosave
- Drafts are saved to `localStorage` under `call_draft:{lead.uid}` and restored automatically when reopening the composer.

## Usage

```tsx
import CallComposer, { type Lead } from "@/components/CallComposer";

function MyComponent() {
  const [open, setOpen] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);

  const handleSave = (data: CallComposerData) => {
    // POST to your backend: /calls
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Start Call</Button>
      <CallComposer isOpen={open} onClose={() => setOpen(false)} lead={lead} onSaveCall={handleSave} />
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility of the modal |
| `onClose` | `() => void` | Yes | Called when the modal is closed |
| `lead` | `Lead \| null` | Yes | Lead data for the call |
| `onSaveCall` | `(data: CallComposerData) => void` | Yes | Called on validated save |
| `history` | `{ id; type; title; timestamp; channel?; summary? }[]` | No | Optional recent interactions rendered in the History tab |
| `mode` | `'compact' \| 'full'` | No | Visual density; `compact` (default) shows a single page with Outcome + Quick Note and a Details sheet; `full` shows tabs and all context inline |
| `hasQueue` | `boolean` | No | If true, shows a "Save & Start Next" CTA in wrap-up |
| `onStartNextCall` | `() => void` | No | Callback when user wants to start the next call |

## Interfaces

```ts
export type DispositionCode =
  | "connected_interested"
  | "connected_not_interested"
  | "callback_scheduled"
  | "left_voicemail"
  | "no_answer"
  | "wrong_number"
  | "escalated"
  | "resolved";

export interface CallComposerData {
  lead: Lead | null;
  callType: "incoming" | "outgoing";
  duration: number; // seconds
  timestamp: string; // ISO
  outcome: CallOutcome | null;
  notes: CallNote[];
  recording: CallRecording | null;
  scripts: CallScript[];
  aiInsights: {
    callStrategy: string;
    followUpRecommendations: string[];
    riskAssessment: string;
    conversionProbability: number;
  };
  compliance: {
    consentRecorded: boolean;
    doNotCall: boolean;
  };
}
```

## Keyboard Shortcuts
- **R** – Toggle recording (while a call is active)
- **N** – Add the current note
- **⌘/Ctrl + S** – Save
  - Hint appears in full mode only and can be hidden

## Styling
- Tailwind + shadcn/ui, responsive, accessible labels, keyboard navigation.

## Integration Notes
- Wire recording/transcription to your telephony provider (e.g., Twilio) and store `callSid` on `CallRecording`.
- Post `CallComposerData` to your backend on save and link to the lead timeline.
- Provide `history` from your CRM timeline API for best results (e.g., last emails, calls, notes, meetings).

## Design Rationale (Less‑is‑More)
- Primary jobs appear on one screen: Start/End, add a quick note, then wrap‑up.
- Outcome entry is revealed only after hang‑up in a bottom Wrap‑up sheet.
- Secondary depth (AI, full notes, transcript, history, compliance) moves to a Details sheet to keep cognitive load low.
- Minimal color and typography emphasize content; badges and chips are reduced or hidden in compact mode.
 - Transcript is on-demand to avoid visual noise during the call; search supports quick retrieval of key moments.
 - ACW timer nudges timely completion without forcing long forms; auto-end mirrors industry patterns (Aircall).
