// src/ivy/contactRegistry.ts
// Contact page command registry for Ask Ivy

import type { IvyCommand } from "./types";

export const contactRegistry: IvyCommand[] = [
  // === ACTIONS ===
  {
    id: "email.compose",
    label: "Send follow-up email",
    keywords: ["email", "send", "follow", "compose", "message"],
    shortcut: "E",
    group: "Actions",
    description: "Open Email Composer with course overview template",
    run: (ctx) => ctx.openEmailComposer?.({ template: "CourseOverview" }),
    when: (ctx) => !!ctx.openEmailComposer
  },
  {
    id: "call.open",
    label: "Schedule / start call",
    keywords: ["call", "phone", "dial", "ring"],
    shortcut: "C",
    group: "Actions", 
    description: "Open Call Console for this contact",
    run: (ctx) => ctx.openCallConsole?.(),
    when: (ctx) => !!ctx.openCallConsole
  },
  {
    id: "meeting.book",
    label: "Book campus visit",
    keywords: ["meeting", "visit", "book", "schedule", "demo"],
    shortcut: "M",
    group: "Actions",
    description: "Schedule a campus visit or demo meeting",
    run: (ctx) => ctx.openMeetingBooker?.({ type: "Visit" }),
    when: (ctx) => !!ctx.openMeetingBooker
  },
  {
    id: "email.history",
    label: "Show email history",
    keywords: ["emails", "history", "correspondence", "messages"],
    shortcut: "H",
    group: "Actions",
    description: "View all email correspondence with this contact",
    run: (ctx) => ctx.openEmailHistory?.(),
    when: (ctx) => !!ctx.openEmailHistory
  },
  
  // === PANELS ===
  {
    id: "panel.properties",
    label: "Edit properties",
    keywords: ["properties", "fields", "data", "details", "info", "edit", "update", "change", "modify"],
    group: "Panels",
    description: "Open properties panel to edit contact details",
    run: (ctx) => ctx.expandPanel?.("properties")
  },
  {
    id: "edit.inline",
    label: "Edit property inline",
    keywords: ["edit", "update", "change", "set", "date of birth", "dob", "phone", "email", "name", "address", "course", "programme", "inline"],
    group: "Data",
    description: "Edit a specific property inline without opening modals",
    run: (ctx) => {
      // This will trigger inline editing mode
      ctx.startInlineEdit?.();
      console.log("Starting inline property edit");
    }
  },
  {
    id: "panel.activities", 
    label: "Show activities",
    keywords: ["activities", "timeline", "history", "events"],
    group: "Panels",
    description: "Expand activity timeline panel",
    run: (ctx) => ctx.expandPanel?.("activities")
  },
  {
    id: "panel.ai",
    label: "Show AI insights",
    keywords: ["ai", "insights", "analysis", "predictions", "score"],
    group: "Panels", 
    description: "Expand AI analysis and recommendations",
    run: (ctx) => ctx.expandPanel?.("ai")
  },
  
  // === SMART QUERIES ===
  {
    id: "query.conversion",
    label: "Analyze conversion factors",
    keywords: ["conversion", "probability", "likelihood", "factors"],
    group: "Navigation",
    description: "Show detailed conversion analysis",
    run: (ctx) => {
      ctx.expandPanel?.("ai");
      // Could also trigger specific AI analysis
    }
  },
  {
    id: "query.engagement",
    label: "Show engagement summary", 
    keywords: ["engagement", "activity", "touchpoints", "interactions"],
    group: "Navigation",
    description: "Display engagement metrics and patterns",
    run: (ctx) => {
      ctx.expandPanel?.("activities");
    }
  },
  {
    id: "query.next_action",
    label: "Get next best action",
    keywords: ["next", "action", "recommend", "suggest", "should"],
    group: "Navigation", 
    description: "Show AI-recommended next steps",
    run: (ctx) => {
      ctx.expandPanel?.("ai");
    }
  },

  // === GRANULAR DATA MANAGEMENT ===
  {
    id: "data.update_lifecycle",
    label: "Update lifecycle stage",
    keywords: ["lifecycle", "stage", "status", "move", "progress", "advance"],
    group: "Data",
    description: "Move person to next lifecycle stage",
    run: (ctx) => {
      ctx.expandPanel?.("properties");
      console.log("Updating lifecycle stage");
    }
  },
  {
    id: "data.update_score",
    label: "Recalculate lead score",
    keywords: ["score", "recalculate", "refresh", "update", "points"],
    group: "Data",
    description: "Trigger lead score recalculation",
    run: (ctx) => {
      console.log("Recalculating lead score for", ctx.personName || ctx.personData?.first_name);
    }
  },
  {
    id: "data.add_tag",
    label: "Add tags",
    keywords: ["tag", "label", "categorize", "mark", "flag"],
    group: "Data",
    description: "Add tags to person profile",
    run: (ctx) => {
      ctx.expandPanel?.("properties");
      console.log("Adding tags");
    }
  },
  {
    id: "data.update_source",
    label: "Update lead source",
    keywords: ["source", "attribution", "channel", "origin", "campaign"],
    group: "Data",
    description: "Update how this person was acquired",
    run: (ctx) => {
      ctx.expandPanel?.("properties");
      console.log("Updating lead source");
    }
  },

  // === ADVANCED ANALYSIS ===
  {
    id: "analysis.journey",
    label: "Map customer journey",
    keywords: ["journey", "timeline", "progression", "stages", "funnel"],
    group: "Analysis",
    description: "Visualize person's journey through the funnel",
    run: (ctx) => {
      ctx.expandPanel?.("activities");
      console.log("Mapping customer journey");
    }
  },
  {
    id: "analysis.risk",
    label: "Assess churn risk",
    keywords: ["churn", "risk", "dropout", "likelihood", "retention"],
    group: "Analysis",
    description: "Evaluate risk of person dropping out",
    run: (ctx) => {
      ctx.expandPanel?.("ai");
      console.log("Assessing churn risk");
    }
  },
  {
    id: "analysis.engagement_score",
    label: "Calculate engagement score",
    keywords: ["engagement", "score", "activity", "interactions"],
    group: "Analysis",
    description: "Calculate person's engagement level",
    run: (ctx) => {
      console.log("Calculating engagement score");
    }
  },

  // === WORKFLOW & AUTOMATION ===
  {
    id: "workflow.trigger_sequence",
    label: "Trigger email sequence",
    keywords: ["sequence", "automation", "workflow", "drip", "campaign"],
    group: "Automation",
    description: "Start automated email sequence",
    run: (ctx) => {
      console.log("Triggering email sequence for", ctx.personName || ctx.personData?.first_name);
    }
  },
  {
    id: "workflow.set_reminder",
    label: "Set follow-up reminder",
    keywords: ["reminder", "follow-up", "alert", "notification", "schedule"],
    group: "Automation",
    description: "Schedule a follow-up reminder",
    run: (ctx) => {
      console.log("Setting follow-up reminder");
    }
  },
  {
    id: "workflow.assign_owner",
    label: "Reassign owner",
    keywords: ["assign", "owner", "transfer", "handoff", "responsible"],
    group: "Automation",
    description: "Change person's assigned owner",
    run: (ctx) => {
      ctx.expandPanel?.("properties");
      console.log("Reassigning owner");
    }
  },

  // === COMPLIANCE & PRIVACY ===
  {
    id: "compliance.gdpr_export",
    label: "Export personal data",
    keywords: ["export", "gdpr", "data", "download", "privacy"],
    group: "Compliance",
    description: "Export all personal data (GDPR)",
    run: (ctx) => {
      console.log("Exporting personal data for", ctx.personName || ctx.personData?.first_name);
    }
  },
  {
    id: "compliance.consent_status",
    label: "Check consent status",
    keywords: ["consent", "permission", "gdpr", "opt-in", "marketing"],
    group: "Compliance",
    description: "Review marketing consent status",
    run: (ctx) => {
      console.log("Checking consent status");
    }
  },

  // === CONTEXTUAL ACTIONS ===
  {
    id: "context.duplicate_check",
    label: "Check for duplicates",
    keywords: ["duplicate", "merge", "similar", "same", "identical"],
    group: "Data",
    description: "Find potential duplicate records",
    run: (ctx) => {
      console.log("Checking for duplicate records");
    }
  },
  {
    id: "context.similar_profiles",
    label: "Find similar profiles",
    keywords: ["similar", "like", "comparable", "matching"],
    group: "Analysis",
    description: "Find people with similar characteristics",
    run: (ctx) => {
      console.log("Finding similar profiles");
    }
  }
];

// Fuzzy command matching utility
export const findCommand = (input: string, commands: IvyCommand[]): IvyCommand | null => {
  const query = input.toLowerCase().trim();
  
  // Direct ID match
  const directMatch = commands.find(cmd => cmd.id === query);
  if (directMatch) return directMatch;
  
  // Label match
  const labelMatch = commands.find(cmd => cmd.label.toLowerCase().includes(query));
  if (labelMatch) return labelMatch;
  
  // Keyword match
  const keywordMatch = commands.find(cmd => 
    cmd.keywords?.some(keyword => 
      keyword.includes(query) || query.includes(keyword)
    )
  );
  if (keywordMatch) return keywordMatch;
  
  return null;
};

// Enhanced natural language processing with fuzzy matching and synonyms
export const processNaturalLanguage = (input: string, context: any): IvyCommand | null => {
  const query = input.toLowerCase().trim();
  
  // Define synonym groups for better matching
  const synonyms = {
    email: ['email', 'message', 'mail', 'correspondence', 'send', 'write'],
    call: ['call', 'phone', 'ring', 'dial', 'contact', 'reach out'],
    meeting: ['meeting', 'visit', 'demo', 'appointment', 'schedule', 'book', 'arrange'],
    properties: ['properties', 'details', 'fields', 'data', 'info', 'information', 'profile', 'contact info'],
    activities: ['activities', 'timeline', 'history', 'events', 'log', 'track record'],
    ai: ['ai', 'insights', 'analysis', 'recommendations', 'suggestions', 'intelligence'],
    edit: ['edit', 'update', 'change', 'modify', 'adjust', 'revise', 'fix'],
    show: ['show', 'display', 'view', 'open', 'expand', 'reveal', 'see'],
    send: ['send', 'compose', 'write', 'draft', 'create'],
    history: ['history', 'past', 'previous', 'old', 'correspondence', 'conversations']
  };
  
  // Helper function to check if query contains any synonyms
  const hasSynonyms = (group: string[]): boolean => {
    return group.some(synonym => query.includes(synonym));
  };
  
  // Helper function to calculate match strength
  const getMatchStrength = (patterns: string[]): number => {
    return patterns.reduce((score, pattern) => {
      if (query.includes(pattern)) return score + 1;
      return score;
    }, 0);
  };
  
  // Email patterns with better matching
  if (hasSynonyms(synonyms.email)) {
    if (hasSynonyms(synonyms.send) || query.includes('compose') || query.includes('draft')) {
      return contactRegistry.find(cmd => cmd.id === 'email.compose') || null;
    }
    if (hasSynonyms(synonyms.history) || query.includes('correspondence') || query.includes('messages')) {
      return contactRegistry.find(cmd => cmd.id === 'email.history') || null;
    }
    // Default to compose if just "email" mentioned
    return contactRegistry.find(cmd => cmd.id === 'email.compose') || null;
  }
  
  // Call patterns with better matching
  if (hasSynonyms(synonyms.call)) {
    if (hasSynonyms(['start', 'begin', 'initiate', 'make']) || hasSynonyms(['schedule', 'book', 'arrange'])) {
      return contactRegistry.find(cmd => cmd.id === 'call.open') || null;
    }
    // Default to call if just "call" or "phone" mentioned
    return contactRegistry.find(cmd => cmd.id === 'call.open') || null;
  }
  
  // Meeting patterns with better matching
  if (hasSynonyms(synonyms.meeting)) {
    return contactRegistry.find(cmd => cmd.id === 'meeting.book') || null;
  }
  
  // Panel patterns with much better matching
  const actionWords = [...synonyms.edit, ...synonyms.show, 'can i', 'how do i', 'i want to', 'let me'];
  const hasAction = actionWords.some(word => query.includes(word));
  
  if (hasAction || query.includes('?')) {
    // Properties panel - most comprehensive matching
    if (hasSynonyms(synonyms.properties) || 
        query.includes('contact') || 
        query.includes('personal') ||
        query.includes('address') ||
        query.includes('phone number') ||
        query.includes('email address')) {
      return contactRegistry.find(cmd => cmd.id === 'panel.properties') || null;
    }
    
    // Activities panel
    if (hasSynonyms(synonyms.activities) || 
        query.includes('what happened') ||
        query.includes('recent activity') ||
        query.includes('last contact')) {
      return contactRegistry.find(cmd => cmd.id === 'panel.activities') || null;
    }
    
    // AI panel
    if (hasSynonyms(synonyms.ai) || 
        query.includes('recommend') ||
        query.includes('suggest') ||
        query.includes('analysis') ||
        query.includes('score') ||
        query.includes('probability')) {
      return contactRegistry.find(cmd => cmd.id === 'panel.ai') || null;
    }
  }
  
  // Question patterns that should open properties
  if (query.includes('?') && (
    query.includes('what') || 
    query.includes('where') || 
    query.includes('when') || 
    query.includes('how') ||
    query.includes('can i') ||
    query.includes('is it possible')
  )) {
    if (hasSynonyms(synonyms.properties) || 
        query.includes('contact') || 
        query.includes('details') ||
        query.includes('information')) {
      return contactRegistry.find(cmd => cmd.id === 'panel.properties') || null;
    }
  }
  
  // Intent-based matching for common user intents
  const intents = {
    'edit_contact': ['edit', 'update', 'change', 'modify', 'fix', 'correct'],
    'view_info': ['show', 'see', 'view', 'display', 'what is', 'tell me about'],
    'communicate': ['contact', 'reach', 'get in touch', 'talk to', 'speak with'],
    'schedule': ['schedule', 'book', 'arrange', 'set up', 'plan', 'organize']
  };
  
  for (const [intent, patterns] of Object.entries(intents)) {
    if (patterns.some(pattern => query.includes(pattern))) {
      switch (intent) {
        case 'edit_contact':
          if (hasSynonyms(synonyms.properties)) {
            return contactRegistry.find(cmd => cmd.id === 'panel.properties') || null;
          }
          break;
        case 'view_info':
          if (hasSynonyms(synonyms.properties)) {
            return contactRegistry.find(cmd => cmd.id === 'panel.properties') || null;
          }
          if (hasSynonyms(synonyms.activities)) {
            return contactRegistry.find(cmd => cmd.id === 'panel.activities') || null;
          }
          break;
        case 'communicate':
          if (hasSynonyms(synonyms.email)) {
            return contactRegistry.find(cmd => cmd.id === 'email.compose') || null;
          }
          if (hasSynonyms(synonyms.call)) {
            return contactRegistry.find(cmd => cmd.id === 'call.open') || null;
          }
          break;
        case 'schedule':
          if (hasSynonyms(synonyms.meeting)) {
            return contactRegistry.find(cmd => cmd.id === 'meeting.book') || null;
          }
          break;
      }
    }
  }
  
  return null;
};
