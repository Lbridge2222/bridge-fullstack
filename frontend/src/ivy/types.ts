// src/ivy/types.ts
// Core types for Ask Ivy command palette system

export interface IvyContext {
  // Person context
  personId?: string;
  personName?: string;
  personData?: any;
  person?: any; // Add person property for consistency with intelligentProcessor
  
  // Modal openers
  openEmailComposer?: (opts?: { template?: string }) => void;
  openCallConsole?: () => void;
  openMeetingBooker?: (opts?: { type?: string }) => void;
  openEmailHistory?: () => void;
  
  // Page panel controls
  expandPanel?: (key: "properties" | "activities" | "ai") => void;
  
  // Inline editing
  startInlineEdit?: () => void;
  
  // Activity management
  appendActivity?: (activity: any) => void;
}

export interface IvyCommand {
  id: string;
  label: string;
  keywords?: string[];
  shortcut?: string;
  run: (ctx: IvyContext) => void;
  group: "Actions" | "Panels" | "Navigation" | "Analysis" | "Data" | "Automation" | "Compliance";
  when?: (ctx: IvyContext) => boolean;
  description?: string;
}

export interface IvyResponse {
  answer: string;
  sources?: Array<{
    title: string;
    url?: string;
    snippet: string;
  }>;
  actions?: IvyCommand[];
}
