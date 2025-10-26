// src/ivy/applicationRegistry.ts
// Application board command registry for Ask Ivy

import type { IvyCommand } from "./types";
import { applicationsApi } from "@/services/api";

export const applicationRegistry: IvyCommand[] = [
  // === APPLICATION ACTIONS ===
  {
    id: "app.view_details",
    label: "View application details",
    keywords: ["view", "details", "application", "profile", "open"],
    shortcut: "V",
    group: "Actions",
    description: "Open detailed view of selected application",
    run: (ctx) => {
      if (ctx.selectedApplicationId) {
        ctx.navigate?.(`/admissions/applications/${ctx.selectedApplicationId}`);
      }
    },
    when: (ctx) => !!ctx.selectedApplicationId
  },
  {
    id: "app.email_applicant",
    label: "Email applicant",
    keywords: ["email", "contact", "applicant", "send", "message"],
    shortcut: "E",
    group: "Actions",
    description: "Send email to selected applicant",
    run: (ctx) => ctx.openEmailComposer?.(),
    when: (ctx) => !!ctx.selectedApplicationId
  },
  {
    id: "app.call_applicant",
    label: "Call applicant",
    keywords: ["call", "phone", "contact", "applicant"],
    shortcut: "C",
    group: "Actions",
    description: "Make a call to selected applicant",
    run: (ctx) => ctx.openCallConsole?.(),
    when: (ctx) => !!ctx.selectedApplicationId && !!ctx.hasPhoneNumber
  },
  {
    id: "app.schedule_meeting",
    label: "Schedule meeting",
    keywords: ["meeting", "schedule", "book", "interview", "visit"],
    shortcut: "M",
    group: "Actions",
    description: "Schedule a meeting with applicant",
    run: (ctx) => ctx.openMeetingBooker?.(),
    when: (ctx) => !!ctx.selectedApplicationId
  },

  // === BULK ACTIONS ===
  {
    id: "bulk.update_stage",
    label: "Update stage (bulk)",
    keywords: ["bulk", "stage", "move", "update", "selected"],
    group: "Actions",
    description: "Move selected applications to different stage",
    run: (ctx) => ctx.openBulkActions?.(),
    when: (ctx) => (ctx.selectedApplications?.length || 0) > 0
  },
  {
    id: "bulk.update_priority",
    label: "Update priority (bulk)",
    keywords: ["bulk", "priority", "update", "selected"],
    group: "Actions",
    description: "Update priority for selected applications",
    run: (ctx) => ctx.openBulkActions?.(),
    when: (ctx) => (ctx.selectedApplications?.length || 0) > 0
  },
  {
    id: "bulk.email_selected",
    label: "Email selected applicants",
    keywords: ["bulk", "email", "selected", "applicants"],
    group: "Actions",
    description: "Send email to all selected applicants",
    run: (ctx) => ctx.openBulkActions?.(),
    when: (ctx) => (ctx.selectedApplications?.length || 0) > 0
  },

  // === VIEW CONTROLS ===
  {
    id: "view.toggle_board",
    label: "Switch to board view",
    keywords: ["board", "kanban", "view", "switch"],
    shortcut: "B",
    group: "Navigation",
    description: "Switch to Kanban board view",
    run: (ctx) => ctx.setView?.("board")
  },
  {
    id: "view.toggle_table",
    label: "Switch to table view",
    keywords: ["table", "list", "view", "switch"],
    shortcut: "T",
    group: "Navigation",
    description: "Switch to table view",
    run: (ctx) => ctx.setView?.("table")
  },
  {
    id: "view.toggle_filters",
    label: "Toggle filters panel",
    keywords: ["filters", "filter", "toggle", "show", "hide"],
    shortcut: "F",
    group: "Navigation",
    description: "Show/hide the filters panel",
    run: (ctx) => ctx.toggleFilters?.()
  },
  {
    id: "view.ai_focus",
    label: "Toggle AI focus mode",
    keywords: ["ai", "focus", "mode", "toggle", "highlight"],
    group: "Navigation",
    description: "Highlight applications with high AI scores",
    run: (ctx) => ctx.toggleAiFocus?.()
  },

  // === FILTERING & SEARCH ===
  {
    id: "filter.by_program",
    label: "Filter by program",
    keywords: ["filter", "program", "course", "subject"],
    group: "Data",
    description: "Filter applications by specific program",
    run: (ctx) => ctx.openFilterModal?.("program")
  },
  {
    id: "filter.by_stage",
    label: "Filter by stage",
    keywords: ["filter", "stage", "status", "phase"],
    group: "Data",
    description: "Filter applications by admission stage",
    run: (ctx) => ctx.openFilterModal?.("stage")
  },
  {
    id: "filter.by_priority",
    label: "Filter by priority",
    keywords: ["filter", "priority", "urgent", "important"],
    group: "Data",
    description: "Filter applications by priority level",
    run: (ctx) => ctx.openFilterModal?.("priority")
  },
  {
    id: "filter.high_risk",
    label: "Show high-risk applications",
    keywords: ["high", "risk", "at-risk", "urgent", "critical"],
    group: "Data",
    description: "Show applications with low conversion probability",
    run: (ctx) => ctx.setFilter?.("risk", "high")
  },
  {
    id: "filter.multi_applications",
    label: "Show multi-applications only",
    keywords: ["multi", "multiple", "applications", "duplicate"],
    group: "Data",
    description: "Show only applicants with multiple applications",
    run: (ctx) => ctx.setFilter?.("multiOnly", true)
  },

  // === ANALYTICS & INSIGHTS ===
  {
    id: "analytics.pipeline_summary",
    label: "Show pipeline summary",
    keywords: ["pipeline", "summary", "overview", "stats", "analytics"],
    group: "Analysis",
    description: "Display pipeline progression statistics",
    run: (ctx) => ctx.showAnalytics?.("pipeline")
  },
  {
    id: "analytics.conversion_rates",
    label: "Show conversion rates",
    keywords: ["conversion", "rates", "success", "analytics"],
    group: "Analysis",
    description: "Display conversion rate analytics",
    run: (ctx) => ctx.showAnalytics?.("conversion")
  },
  {
    id: "analytics.stage_breakdown",
    label: "Show stage breakdown",
    keywords: ["stage", "breakdown", "distribution", "analytics"],
    group: "Analysis",
    description: "Show applications distribution across stages",
    run: (ctx) => ctx.showAnalytics?.("stages")
  },
  {
    id: "analytics.refresh_insights",
    label: "Refresh AI insights",
    keywords: ["refresh", "insights", "ai", "update", "recalculate"],
    group: "Analysis",
    description: "Refresh AI progression insights for visible applications",
    run: (ctx) => ctx.refreshInsights?.()
  },

  // === APPLICATION MANAGEMENT ===
  {
    id: "app.create_new",
    label: "Create new application",
    keywords: ["create", "new", "application", "add"],
    shortcut: "N",
    group: "Actions",
    description: "Create a new application record",
    run: (ctx) => ctx.createApplication?.()
  },
  {
    id: "app.export_selected",
    label: "Export selected applications",
    keywords: ["export", "download", "selected", "applications"],
    group: "Data",
    description: "Export selected applications to CSV",
    run: (ctx) => ctx.exportApplications?.(ctx.selectedApplications || [])
  },
  {
    id: "app.bulk_assign_owner",
    label: "Assign owner (bulk)",
    keywords: ["assign", "owner", "bulk", "selected"],
    group: "Data",
    description: "Assign owner to selected applications",
    run: (ctx) => ctx.openBulkActions?.()
  },

  // === AI INSIGHTS ===
  {
    id: "ai.explain_score",
    label: "Explain AI score",
    keywords: ["explain", "score", "ai", "why", "reason"],
    group: "Analysis",
    description: "Get explanation for application's AI score",
    run: (ctx) => ctx.explainScore?.(ctx.selectedApplicationId),
    when: (ctx) => !!ctx.selectedApplicationId
  },
  {
    id: "ai.recommend_actions",
    label: "Get AI recommendations",
    keywords: ["recommend", "suggestions", "ai", "actions", "next"],
    group: "Analysis",
    description: "Get AI-recommended actions for application",
    run: (ctx) => ctx.getRecommendations?.(ctx.selectedApplicationId),
    when: (ctx) => !!ctx.selectedApplicationId
  },
  {
    id: "ai.move_next_stage",
    label: "Move to predicted next stage",
    keywords: ["ai", "next", "stage", "move", "predict"],
    group: "Actions",
    description: "Use AI prediction to move the selected application forward",
    when: (ctx) => !!ctx.selectedApplicationId,
    run: async (ctx) => {
      try {
        const applicationId = ctx.selectedApplicationId as string;
        const intel = await applicationsApi.getProgressionIntelligence(applicationId, {
          include_blockers: false,
          include_nba: false,
          include_cohort_analysis: false,
        });
        const nextStage = intel?.progression_prediction?.next_stage;
        if (!nextStage) return;
        try {
          await applicationsApi.moveStage(applicationId, { to_stage: nextStage });
          await applicationsApi.logIvyActionOutcome(applicationId, {
            outcome: "stage_changed",
            details: { to: nextStage },
          });
        } catch (e) {
          // Ignore failures (e.g., unchanged stage) to avoid disrupting UX
        }
        ctx.refreshData?.();
      } catch (e) {
        // Silent failure
      }
    }
  },
  {
    id: "ai.identify_blockers",
    label: "Identify blockers",
    keywords: ["blockers", "issues", "problems", "ai", "identify"],
    group: "Analysis",
    description: "Identify potential blockers for application progression",
    run: (ctx) => ctx.identifyBlockers?.(ctx.selectedApplicationId),
    when: (ctx) => !!ctx.selectedApplicationId
  },

  // === QUICK ACTIONS ===
  {
    id: "quick.select_all",
    label: "Select all visible",
    keywords: ["select", "all", "visible", "current"],
    group: "Actions",
    description: "Select all applications in current view",
    run: (ctx) => ctx.selectAll?.()
  },
  {
    id: "quick.clear_selection",
    label: "Clear selection",
    keywords: ["clear", "selection", "deselect", "none"],
    group: "Actions",
    description: "Clear current selection",
    run: (ctx) => ctx.clearSelection?.()
  },
  {
    id: "quick.refresh_data",
    label: "Refresh data",
    keywords: ["refresh", "reload", "update", "data"],
    shortcut: "R",
    group: "Actions",
    description: "Refresh application data",
    run: (ctx) => ctx.refreshData?.()
  }
];

// Enhanced natural language processing for applications
export const processApplicationQuery = (input: string, context: any): IvyCommand | null => {
  const query = input.toLowerCase().trim();
  
  // Application-specific synonyms
  const synonyms = {
    application: ['application', 'app', 'candidate', 'applicant', 'student'],
    stage: ['stage', 'phase', 'step', 'status', 'progress'],
    priority: ['priority', 'urgent', 'important', 'critical', 'high'],
    view: ['view', 'show', 'display', 'see', 'look'],
    filter: ['filter', 'find', 'search', 'show only', 'where'],
    bulk: ['bulk', 'multiple', 'selected', 'all', 'batch'],
    analytics: ['analytics', 'stats', 'summary', 'overview', 'insights'],
    ai: ['ai', 'artificial intelligence', 'smart', 'intelligent', 'score']
  };
  
  // Helper functions
  const hasSynonyms = (group: string[]): boolean => {
    return group.some(synonym => query.includes(synonym));
  };
  
  // Application-specific patterns
  if (hasSynonyms(synonyms.application)) {
    if (query.includes('view') || query.includes('open') || query.includes('details')) {
      return applicationRegistry.find(cmd => cmd.id === 'app.view_details') || null;
    }
    if (query.includes('email') || query.includes('contact')) {
      return applicationRegistry.find(cmd => cmd.id === 'app.email_applicant') || null;
    }
    if (query.includes('call') || query.includes('phone')) {
      return applicationRegistry.find(cmd => cmd.id === 'app.call_applicant') || null;
    }
    if (query.includes('meeting') || query.includes('schedule')) {
      return applicationRegistry.find(cmd => cmd.id === 'app.schedule_meeting') || null;
    }
  }
  
  // Stage-related patterns
  if (hasSynonyms(synonyms.stage)) {
    if (query.includes('move') || query.includes('update') || query.includes('change')) {
      return applicationRegistry.find(cmd => cmd.id === 'bulk.update_stage') || null;
    }
    if (query.includes('filter') || query.includes('show')) {
      return applicationRegistry.find(cmd => cmd.id === 'filter.by_stage') || null;
    }
  }
  
  // View control patterns
  if (hasSynonyms(synonyms.view)) {
    if (query.includes('board') || query.includes('kanban')) {
      return applicationRegistry.find(cmd => cmd.id === 'view.toggle_board') || null;
    }
    if (query.includes('table') || query.includes('list')) {
      return applicationRegistry.find(cmd => cmd.id === 'view.toggle_table') || null;
    }
    if (query.includes('filter')) {
      return applicationRegistry.find(cmd => cmd.id === 'view.toggle_filters') || null;
    }
  }
  
  // Analytics patterns
  if (hasSynonyms(synonyms.analytics)) {
    if (query.includes('pipeline') || query.includes('summary')) {
      return applicationRegistry.find(cmd => cmd.id === 'analytics.pipeline_summary') || null;
    }
    if (query.includes('conversion')) {
      return applicationRegistry.find(cmd => cmd.id === 'analytics.conversion_rates') || null;
    }
  }
  
  // AI patterns
  if (hasSynonyms(synonyms.ai)) {
    if (query.includes('explain') || query.includes('why')) {
      return applicationRegistry.find(cmd => cmd.id === 'ai.explain_score') || null;
    }
    if (query.includes('recommend') || query.includes('suggest')) {
      return applicationRegistry.find(cmd => cmd.id === 'ai.recommend_actions') || null;
    }
  }
  
  return null;
};
