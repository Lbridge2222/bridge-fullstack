// Centralized dispatcher for canonical UI actions
// Maps: open_call_console | open_email_composer | open_meeting_scheduler | view_profile

import { apiFetch, type UIAction } from "@/services/api";
import type { RagContext } from "@/services/callConsoleApi";
import type { IvyCommand, IvyContext } from "@/ivy/types";

// Minimal mapping to existing command system to avoid broad refactors
const ACTION_TO_COMMAND_ID: Record<UIAction["action"], string> = {
  open_call_console: "call.open",
  open_email_composer: "email.compose",
  open_meeting_scheduler: "meeting.book",
  view_profile: "panel.properties",
};

export function dispatchUIAction(
  action: UIAction,
  commands: IvyCommand[] = [],
  ctx?: IvyContext
): void {
  const commandId = ACTION_TO_COMMAND_ID[action.action];
  const target = commands.find((c) => c.id === commandId)
    || commands.find((c) => c.label?.toLowerCase() === action.label?.toLowerCase());

  if (target) {
    try {
      // Prefill for email composer via /rag/query?json_mode=true
      if (action.action === "open_email_composer" && ctx?.openEmailComposer && ctx?.personData) {
        const lead = ctx.personData;
        const ragCtx: RagContext = {
          lead: {
            id: lead.id || 0,
            uid: lead.uid || ctx.personId || "",
            name: ctx.personName || lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
            email: lead.email,
            phone: lead.phone,
            courseInterest: lead.latest_programme_name || lead.courseInterest,
            statusType: lead.lifecycle_state || lead.statusType,
            nextAction: lead.next_best_action || lead.nextAction,
            followUpDate: lead.follow_up_date || lead.last_activity_at,
            aiInsights: { conversionProbability: lead.conversion_probability || 0, callStrategy: 'email_outreach', recommendedAction: lead.next_best_action }
          },
          transcriptWindow: [],
          consentGranted: true,
        };
        apiFetch(`/rag/query`, { method: 'POST', body: JSON.stringify({ query: '{"type":"email"}', context: ragCtx, limit: 3, json_mode: true }) })
          .then((resp: any) => {
            try {
              const data = typeof resp?.answer === 'string' ? JSON.parse(resp.answer) : resp?.answer;
              ctx.openEmailComposer?.({ template: "Prefilled" });
              // Emit event carrying subject/body for composer to subscribe and set state quickly
              window.dispatchEvent(new CustomEvent('email.prefill', { detail: { subject: data?.subject || '', body: data?.body || '' } }));
            } catch {
              ctx.openEmailComposer?.({ template: "CourseOverview" });
            }
          })
          .catch(() => ctx.openEmailComposer?.({ template: "CourseOverview" }));
        return;
      }
      target.run?.(ctx as IvyContext);
      return;
    } catch (_) {}
  }

  // Fallbacks: emit lightweight custom events that existing UIs can listen for
  const eventName = action.action;
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { label: action.label } }));
  } catch (_) {
    // no-op
  }
}


