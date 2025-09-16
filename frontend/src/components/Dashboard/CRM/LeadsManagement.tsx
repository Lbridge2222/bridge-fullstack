import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
// Prevent repeated dev console warnings
let __warnedApiBase = false;
import { 
  Users, Search, Filter, Clock, AlertTriangle, Phone, Mail, Calendar,
  MoreHorizontal, ChevronDown, Download, UserPlus, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Star, Users2, X, LayoutGrid, Grid3X3, List,
  SortAsc, SortDesc, BookmarkPlus, TrendingUp, Target, Zap, Eye, Command,
  Trash2, Edit3, Send, Clock3, BarChart3, Pencil,
  PieChart, Activity, Brain, Lightbulb, TrendingDown, CalendarDays,
  ArrowUpRight, Sparkles, Archive, RefreshCw, CheckCircle2, Sprout,
  MessageCircle, Snowflake, Loader2, Plus, Save, ArrowUpDown, User, Keyboard, FileText, Copy
} from "lucide-react";

// shadcn/ui primitives (assumes you've run the generator for these)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { usePeople } from "@/hooks/usePeople";
import EmailComposer, { type Lead as EmailComposerLead } from "@/components/EmailComposer";
import CallConsole, { type Lead as CallConsoleLead } from "@/components/CallConsole";
import MeetingBooker, { type Lead as MeetingBookerLead } from "@/components/MeetingBooker";
import { EditableLeadCard } from "@/components/CRM/EditableLeadCard";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Small utility
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// SSR-safe localStorage access
const safeGet = (key: string) => {
  if (typeof window === 'undefined') return null;
  try { 
    return localStorage.getItem(key); 
  } catch { 
    return null; 
  }
};

const safeSet = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, value); } catch {}
};

// Performance utilities
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Virtual scrolling hook
const useVirtualScrolling = <T,>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    
    return {
      start: Math.max(0, start - overscan),
      end
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => 
    items.slice(visibleRange.start, visibleRange.end),
    [items, visibleRange.start, visibleRange.end]
  );

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };
};

type Enquiry = {
  id: number;
  uid: string; // stable backend id (uuid as string)
  name: string;
  email: string;
  phone: string;
  courseInterest: string;
  academicYear: string;
  campusPreference: string;
  enquiryType: string;
  leadSource: string;
  status: string;
  statusType: "new" | "contacted" | "qualified" | "nurturing" | "cold";
  lifecycle_state: string; // from people table: lead, pre_applicant, applicant, etc.
  leadScore: number;
  createdDate: string;
  lastContact: string;
  nextAction: string;
  slaStatus: "urgent" | "warning" | "within_sla" | "met";
  contactAttempts: number;
  tags: string[];
  colorTag?: string; // New: color coding tag
  avatar?: string;
  aiInsights: {
    conversionProbability: number;
    bestContactTime: string;
    recommendedAction: string;
    urgency: "high" | "medium" | "low";
  };
  // ML Prediction fields
  mlPrediction?: boolean; // true = will convert, false = won't convert
  mlProbability?: number; // 0.0 to 1.0 conversion probability
  mlConfidence?: number; // 0.0 to 1.0 model confidence
};

type SavedView = {
  id: string;
  name: string;
  description?: string;
  filters?: Record<string, any>;
  created?: string;
  lastUsed?: string;
  isDefault?: boolean;
  isTeamDefault?: boolean;
  sharedBy?: string;
  archived?: boolean;
  sortBy?: "name" | "createdDate" | "lastContact" | "mlProbability" | "leadScore" | "engagementScore";
  sortOrder?: "asc" | "desc";
  selectedColorTag?: string;
  activeCustomFilterId?: string | null;
};

// API types for remote persistence
type ApiSavedFolder = { id: string; name: "My Views" | string; type: "personal" | "team" | "archived" };
type ApiSavedView = SavedView & { folder_id: string };

// Small helper for 404s
const isNotFound = (e: unknown) => (e instanceof Error) && /404/.test(e.message);

const LeadsManagementPage: React.FC = () => {
  const { push } = useToast();
  // View state
  const [viewMode, setViewMode] = useState<"table" | "cards" | "compact" | "editable">("compact");
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Saved Views & Folders
  const [showSavedViews, setShowSavedViews] = useState(false);
  const [currentView, setCurrentView] = useState<SavedView | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  // Filters & sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "createdDate" | "lastContact" | "mlProbability" | "leadScore" | "engagementScore">("mlProbability");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Color Tag System
  const [selectedColorTag, setSelectedColorTag] = useState<string>("all");
  const [showColorTagModal, setShowColorTagModal] = useState(false);
  const [leadToColor, setLeadToColor] = useState<Enquiry | null>(null);

  // User-defined Tags (CRUD in localStorage) ---------------------------------
  type RuleOp = "eq" | "neq" | "gte" | "lte" | "contains";
  type UserTagRule = { field: keyof Enquiry; op: RuleOp; value: any };
  type UserTag = { id: string; name: string; color: string; rules?: UserTagRule[] };

  // Custom Filters types
  type PredicateCondition = {
    field: string; // Database field names
    op: "eq" | "neq" | "gte" | "lte" | "contains";
    value: any;
  };

  type PredicateNode = {
    type: "all" | "any";
    conditions: PredicateCondition[];
  };

  type CustomFilter = {
    id: string;
    name: string;
    description: string;
    predicate: PredicateNode;
    createdAt: string;
  };

  const [userTags, setUserTags] = useState<UserTag[]>(() => {
    const raw = safeGet("leadUserTags");
    return raw ? JSON.parse(raw) : [];
  });
  const saveUserTags = useCallback((tags: UserTag[]) => {
    setUserTags(tags);
    safeSet("leadUserTags", JSON.stringify(tags));
  }, []);

  // Manual per-lead tag assignments (multi-select)
  const [userTagAssignments, setUserTagAssignments] = useState<Record<string, string[]>>(() => {
    const raw = safeGet("leadUserTagAssignments");
    return raw ? JSON.parse(raw) : {};
  });
  const assignUserTag = useCallback((uid: string, tagId: string, checked: boolean) => {
    setUserTagAssignments(prev => {
      const current = new Set(prev[uid] ?? []);
      if (checked) current.add(tagId); else current.delete(tagId);
      const next = { ...prev, [uid]: Array.from(current) };
      safeSet("leadUserTagAssignments", JSON.stringify(next));
      return next;
    });
  }, []);

  // Rule evaluator + auto-application
  const evalRule = useCallback((lead: Enquiry, r: UserTagRule): boolean => {
    const v = (lead as any)[r.field];
    switch (r.op) {
      case "eq": return v === r.value;
      case "neq": return v !== r.value;
      case "gte": return Number(v) >= Number(r.value);
      case "lte": return Number(v) <= Number(r.value);
      case "contains": return String(v ?? "").toLowerCase().includes(String(r.value ?? "").toLowerCase());
      default: return false;
    }
  }, []);

  const autoTagsForLead = useCallback((lead: Enquiry): string[] => {
    return userTags
      .filter(t => (t.rules ?? []).every(r => evalRule(lead, r)))
      .map(t => t.id);
  }, [userTags, evalRule]);

  const getEffectiveUserTags = useCallback((lead: Enquiry): string[] => {
    const manual = userTagAssignments[lead.uid] ?? [];
    const auto = autoTagsForLead(lead);
    return Array.from(new Set([...manual, ...auto]));
  }, [userTagAssignments, autoTagsForLead]);

  // Manage Tags modal state
  const [showManageTags, setShowManageTags] = useState(false);
  const [draftTag, setDraftTag] = useState<UserTag>({ id: "", name: "", color: "hsl(var(--info))", rules: [] });

  // Custom Defaults modal state
  const [showCustomDefaults, setShowCustomDefaults] = useState(false);
  const [customDefaults, setCustomDefaults] = useState<string[]>(() => {
    const raw = safeGet("leadInlineTagDefaults");
    return raw ? JSON.parse(raw) : ["course", "campus"];
  });

  // Status Colors modal state
  const [showStatusColors, setShowStatusColors] = useState(false);

  // Custom Filters state
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>(() => {
    const raw = safeGet("leadCustomFilters");
    return raw ? JSON.parse(raw) : [];
  });
  const [activeCustomFilterId, setActiveCustomFilterId] = useState<string | null>(null);
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [editingFilter, setEditingFilter] = useState<CustomFilter | null>(null);
  const [filterDraft, setFilterDraft] = useState<CustomFilter>({
    id: "",
    name: "",
    description: "",
    predicate: { type: "all", conditions: [] },
    createdAt: new Date().toISOString()
  });
  const addDraftTag = () => {
    if (!draftTag.name) return;
    const tag: UserTag = { ...draftTag, id: crypto.randomUUID() };
    saveUserTags([...(userTags ?? []), tag]);
    setDraftTag({ id: "", name: "", color: "hsl(var(--info))", rules: [] });
  };

  // Inline field-based tags next to name (course/campus/source/status/year)
  const [inlineTagAssignments, setInlineTagAssignments] = useState<Record<string, string[]>>(() => {
    const raw = safeGet("leadInlineTags");
    return raw ? JSON.parse(raw) : {};
  });

  // Global defaults for inline field tags (applied when a lead has no custom selection)
  const [defaultInlineTagKeys, setDefaultInlineTagKeys] = useState<string[]>(() => {
    const raw = safeGet("leadInlineTagDefaults");
    return raw ? JSON.parse(raw) : ["course", "campus"]; // sensible default: course+campus
  });
  const saveDefaultInlineTagKeys = useCallback((keys: string[]) => {
    setDefaultInlineTagKeys(keys);
    safeSet("leadInlineTagDefaults", JSON.stringify(keys));
  }, []);

  // Available field options for custom defaults (remote-first with local fallback)
  const [availableFieldOptions, setAvailableFieldOptions] = useState<Array<{ key: string; label: string; description?: string }>>([
    { key: "course", label: "Course", description: "Programme name" },
    { key: "campus", label: "Campus", description: "Campus location" },
    { key: "year", label: "Academic Year", description: "Intake year" },
    { key: "status", label: "Status", description: "Lead status" },
    { key: "lifecycle", label: "Lifecycle", description: "Lifecycle stage" },
    { key: "source", label: "Source", description: "Lead source" },
    { key: "score", label: "Score", description: "Lead score" },
    { key: "stage", label: "Stage", description: "Application stage" }
  ]);

  useEffect(() => {
    (async () => {
      try {
        const fields = await api<Array<{ key: string; label: string; description?: string }>>('/crm/leads/field-options');
        if (Array.isArray(fields) && fields.length) setAvailableFieldOptions(fields);
      } catch {
        if (!__warnedApiBase) {
          console.warn('Field options API not available, using local defaults');
          __warnedApiBase = true;
        }
      }
    })();
  }, []);

  const toggleCustomDefault = useCallback((key: string) => {
    setCustomDefaults(prev => {
      const newDefaults = prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key];
      return newDefaults;
    });
  }, []);

  const saveCustomDefaults = useCallback(() => {
    saveDefaultInlineTagKeys(customDefaults);
    setShowCustomDefaults(false);
    push({ 
      title: "Defaults updated", 
      description: `Set default tags: ${customDefaults.join(", ")}`, 
      variant: "success" 
    });
  }, [customDefaults, saveDefaultInlineTagKeys, push]);

  // Custom Filters logic
  const evalPredicate = useCallback((lead: Enquiry, predicate: PredicateNode): boolean => {
    if (predicate.conditions.length === 0) return true;
    
    const results = predicate.conditions.map(condition => {
      // Map database field names to Lead object properties
      const getFieldValue = (dbField: string) => {
        // Direct mappings from database fields to Lead properties
        const fieldMap: Record<string, keyof Enquiry | string> = {
          'first_name': 'name', // Use name for first_name filtering
          'last_name': 'name', // Use name for last_name filtering
          'email': 'email',
          'phone': 'phone',
          'lifecycle_state': 'lifecycle_state',
          'status': 'status',
          'assigned_to': 'assignedTo',
          'lead_score': 'leadScore',
          'engagement_score': 'engagementScore',
          'conversion_probability': 'mlProbability',
          'touchpoint_count': 'touchpointCount',
          'last_engagement_date': 'lastContact',
          'course_preference': 'courseInterest',
          'campus_preference': 'campusPreference',
          'source_of_enquiry': 'leadSource',
          'created_at': 'createdDate',
          'updated_at': 'updatedDate',
          'date_of_birth': 'dateOfBirth',
          'nationality': 'nationality',
          'address_line1': 'addressLine1',
          'city': 'city',
          'postcode': 'postcode',
          'country': 'country',
          'preferred_contact_method': 'preferredContactMethod',
          'next_follow_up': 'nextFollowUp',
          'portfolio_provided': 'portfolioProvided',
          'primary_discipline': 'primaryDiscipline',
          'ucas_personal_id': 'ucasPersonalId',
          'ucas_application_number': 'ucasApplicationNumber',
          'ucas_track_status': 'ucasTrackStatus',
          'website_pages_viewed': 'websitePagesViewed',
          'website_time_spent': 'websiteTimeSpent',
          'number_of_sessions': 'numberOfSessions',
          'marketing_emails_opened': 'marketingEmailsOpened',
          'marketing_emails_clicked': 'marketingEmailsClicked',
          'next_best_action': 'nextBestAction',
          'next_best_action_confidence': 'nextBestActionConfidence'
        };
        
        const leadField = fieldMap[dbField] as keyof Enquiry;
        return leadField ? (lead as any)[leadField] : undefined;
      };
      
      const fieldValue = getFieldValue(condition.field);
      const { op, value } = condition;
      
      // Handle special cases for name filtering
      if (condition.field === 'first_name' || condition.field === 'last_name') {
        const name = String(lead.name || '');
        const searchValue = String(value || '').toLowerCase();
        switch (op) {
          case "eq": return name.toLowerCase() === searchValue;
          case "neq": return name.toLowerCase() !== searchValue;
          case "contains": return name.toLowerCase().includes(searchValue);
          default: return false;
        }
      }
      
      // Handle date fields
      if (condition.field.includes('_date') || condition.field.includes('_at')) {
        const dateValue = fieldValue ? new Date(String(fieldValue)) : null;
        const compareDate = value ? new Date(String(value)) : null;
        
        if (!dateValue || !compareDate || isNaN(+dateValue) || isNaN(+compareDate)) return false;
        
        switch (op) {
          case "eq": return dateValue.getTime() === compareDate.getTime();
          case "neq": return dateValue.getTime() !== compareDate.getTime();
          case "gte": return dateValue >= compareDate;
          case "lte": return dateValue <= compareDate;
          case "contains": return dateValue.toISOString().includes(String(value));
          default: return false;
        }
      }
      
      // Handle numeric fields
      if (condition.field.includes('_score') || condition.field.includes('_count') || condition.field.includes('_probability')) {
        const numValue = Number(fieldValue) || 0;
        const compareValue = Number(value) || 0;
        
        switch (op) {
          case "eq": return numValue === compareValue;
          case "neq": return numValue !== compareValue;
          case "gte": return numValue >= compareValue;
          case "lte": return numValue <= compareValue;
          case "contains": return String(numValue).includes(String(value));
          default: return false;
        }
      }
      
      // Handle boolean fields
      if (condition.field.includes('_provided') || condition.field.includes('_enabled')) {
        const boolValue = Boolean(fieldValue);
        const compareValue = value === 'true' || value === true;
        
        switch (op) {
          case "eq": return boolValue === compareValue;
          case "neq": return boolValue !== compareValue;
          default: return false;
        }
      }
      
      // Default string handling
      const stringValue = String(fieldValue || '');
      const stringCompare = String(value || '');
      
      switch (op) {
        case "eq": return stringValue === stringCompare;
        case "neq": return stringValue !== stringCompare;
        case "gte": return stringValue >= stringCompare;
        case "lte": return stringValue <= stringCompare;
        case "contains": return stringValue.toLowerCase().includes(stringCompare.toLowerCase());
        default: return false;
      }
    });
    
    return predicate.type === "all" ? results.every(Boolean) : results.some(Boolean);
  }, []);

  const saveCustomFilter = useCallback((filter: CustomFilter) => {
    if (editingFilter) {
      // Update existing filter
      const updated = customFilters.map(f => f.id === editingFilter.id ? filter : f);
      setCustomFilters(updated);
      safeSet("leadCustomFilters", JSON.stringify(updated));
      push({ title: "Filter updated", description: `"${filter.name}" has been updated`, variant: "success" });
    } else {
      // Create new filter
      const newFilter = { ...filter, id: filter.id || crypto.randomUUID(), createdAt: new Date().toISOString() };
      const updated = [...customFilters, newFilter];
      setCustomFilters(updated);
      safeSet("leadCustomFilters", JSON.stringify(updated));
      push({ title: "Filter saved", description: `"${filter.name}" added to My Filters`, variant: "success" });
    }
  }, [customFilters, editingFilter, push]);

  const applyCustomFilter = useCallback((filterId: string) => {
    setActiveCustomFilterId(filterId);
    push({ title: "Filter applied", description: "Custom filter is now active", variant: "success" });
  }, [push]);

  const clearCustomFilter = useCallback(() => {
    setActiveCustomFilterId(null);
    push({ title: "Filter cleared", description: "Custom filter removed", variant: "success" });
  }, [push]);

  const editCustomFilter = useCallback((filter: CustomFilter) => {
    setEditingFilter(filter);
    setFilterDraft({ ...filter });
    setShowAddFilter(true);
  }, []);

  const deleteCustomFilter = useCallback((filterId: string) => {
    const updated = customFilters.filter(f => f.id !== filterId);
    setCustomFilters(updated);
    safeSet("leadCustomFilters", JSON.stringify(updated));
    
    if (activeCustomFilterId === filterId) {
      setActiveCustomFilterId(null);
    }
    
    push({ title: "Filter deleted", description: "Custom filter removed", variant: "default" });
  }, [customFilters, activeCustomFilterId, push]);

  const getAvailableInlineTags = useCallback((lead: Enquiry): Record<string, string> => {
    const opts: Record<string, string> = {};
    // Map to real database fields from vw_leads_management
    if (lead.courseInterest) opts["course"] = lead.courseInterest;
    if (lead.campusPreference) opts["campus"] = lead.campusPreference;
    if (lead.leadSource) opts["source"] = lead.leadSource;
    if (lead.status) opts["status"] = lead.status;
    if (lead.academicYear) opts["year"] = lead.academicYear;
    if (lead.lifecycle_state) opts["lifecycle"] = lead.lifecycle_state.replaceAll('_',' ');
    return opts;
  }, []);

  const getSelectedInlineKeys = useCallback((lead: Enquiry): string[] => {
    return inlineTagAssignments[lead.uid] ?? defaultInlineTagKeys;
  }, [inlineTagAssignments, defaultInlineTagKeys]);

  const toggleInlineTag = useCallback((uid: string, key: string) => {
    setInlineTagAssignments(prev => {
      const current = new Set(prev[uid] ?? ["course", "campus"]);
      if (current.has(key)) current.delete(key); else current.add(key);
      const next = { ...prev, [uid]: Array.from(current) } as Record<string, string[]>;
      safeSet("leadInlineTags", JSON.stringify(next));
      return next;
    });
  }, []);

  // Apply defaults to many leads at once
  // Note: callers must pass the target leads to avoid referencing vars before declaration
  const applyInlineDefaults = useCallback((scope: "page" | "all", targetLeads: Enquiry[]) => {
    const target = targetLeads;
    setInlineTagAssignments(prev => {
      const next: Record<string, string[]> = { ...prev };
      for (const l of target) {
        next[l.uid] = [...defaultInlineTagKeys];
      }
      safeSet("leadInlineTags", JSON.stringify(next));
      return next;
    });
    push({ title: "Tags updated", description: scope === "page" ? "Applied inline tags to current page" : "Applied inline tags to all filtered enquiries", variant: "success" });
  }, [defaultInlineTagKeys, push]);
  
  // Manual color overrides (per-user via localStorage)
  const [colorOverrides, setColorOverrides] = useState<Record<string, string>>(() => {
    const raw = safeGet("leadColorOverrides");
    return raw ? JSON.parse(raw) : {};
  });
  const setColorOverride = useCallback((uid: string, tagId: string) => {
    setColorOverrides(prev => {
      const next = { ...prev, [uid]: tagId };
      safeSet("leadColorOverrides", JSON.stringify(next));
      return next;
    });
  }, []);


  // Sort key mapping helper
  const sortKeyMap: Record<string, keyof Enquiry | "mlProbability"> = {
    name: "name",
    createdDate: "createdDate",
    lastContact: "lastContact",
    mlProbability: "mlProbability",
    leadScore: "leadScore",
    engagementScore: "leadScore" /* TEMP until engagement is on Lead */
  };

  // Generic sort toggle helper
  const setSort = useCallback((key: typeof sortBy) => {
    setSortBy(prev => {
      if (prev === key) {
        setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
      }
      return key;
    });
  }, []);

  // UX Enhancements
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Array<{key: string, label: string, value: string}>>([]);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const focusedLeadRef = useRef<Enquiry | null>(null);
  const [slaOverrides, setSlaOverrides] = useState<Record<string, Enquiry["slaStatus"]>>({});
  const DEV_SHOW_ALT_VIEWS = false;
  const DEV_ENABLE_EDITABLE = false;

  // Data Visualization & AI
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedChart, setSelectedChart] = useState<"conversion" | "trends" | "sources" | "ai-insights">("conversion");
  const [aiInsights, setAiInsights] = useState<Array<{
    id: string;
    type: "opportunity" | "risk" | "recommendation" | "trend";
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    confidence: number;
    action: string;
    priority: number;
  }>>([]);

  // AI Triage State
  const [aiTriageExtras, setAiTriageExtras] = useState<Map<string, {
    i: number;
    score: number;
    reasons: string[];
    next_action: string;
    ml_confidence?: number;
    ml_probability?: number;
    ml_calibrated?: number;
    insight?: string;
    suggested_content?: string;
    action_rationale?: string;
    escalate_to_interview?: boolean;
    feature_coverage?: number;
  }>>(new Map());
  const [isAiTriageLoading, setIsAiTriageLoading] = useState(false);
  const [aiTriageSummary, setAiTriageSummary] = useState<{ cohort_size: number; top_reasons: string[] } | null>(null);
  const [isAiReordered, setIsAiReordered] = useState(false);

  // Simplified status color system - 4 core statuses + 2 custom user colors
  // Using custom color variables for proper semantic color mapping
  const DEFAULT_STATUS_PALETTE = {
    cold: { name: "Gone Cold", color: "hsl(var(--status-cold))", icon: "Snowflake", description: "Low engagement, no recent activity" },
    progressing: { name: "Progressing Lead", color: "hsl(var(--status-progressing))", icon: "TrendingUp", description: "Active engagement, moving through pipeline" },
    urgent: { name: "Urgent/Call Quick", color: "hsl(var(--status-urgent))", icon: "AlertTriangle", description: "High priority, requires immediate attention" },
    do_not_contact: { name: "Do Not Contact", color: "hsl(var(--status-do-not-contact))", icon: "X", description: "Not interested, should not be contacted" },
    custom1: { name: "Custom 1", color: "hsl(var(--slate-700))", icon: "Star", description: "Your custom status" },
    custom2: { name: "Custom 2", color: "hsl(var(--slate-500))", icon: "Target", description: "Your custom status" }
  };

  // User-customizable status palette (persisted in localStorage)
  const [statusPalette, setStatusPalette] = useState<typeof DEFAULT_STATUS_PALETTE>(() => {
    const saved = safeGet("leadStatusPalette");
    return saved ? { ...DEFAULT_STATUS_PALETTE, ...JSON.parse(saved) } : DEFAULT_STATUS_PALETTE;
  });

  const updateStatusPalette = useCallback((updates: Partial<typeof DEFAULT_STATUS_PALETTE>) => {
    const newPalette = { ...statusPalette, ...updates };
    setStatusPalette(newPalette);
    safeSet("leadStatusPalette", JSON.stringify(newPalette));
  }, [statusPalette]);

  // Infer status from lead data
  const inferStatusTag = useCallback((lead: Enquiry): string => {
    // Check for manual overrides first
    const override = colorOverrides[lead.uid];
    if (override) return override;

    // Auto-infer based on lead data
    if (lead.slaStatus === 'urgent' || lead.slaStatus === 'warning') {
      return 'urgent';
    }
    
    if (lead.mlProbability && lead.mlProbability > 0.7) {
      return 'progressing';
    }
    
    if (lead.leadScore && lead.leadScore > 60) {
      return 'progressing';
    }
    
    if (lead.statusType === 'cold' || (lead.leadScore && lead.leadScore < 20)) {
      return 'cold';
    }
    
    // Default to progressing for active leads
    return 'progressing';
  }, [colorOverrides]);

  // Get effective tag (override or inferred)
  const getEffectiveTag = useCallback((lead: Enquiry) => {
    return colorOverrides[lead.uid] ?? inferStatusTag(lead);
  }, [colorOverrides, inferStatusTag]);

  // Convert status to CSS color
  const statusToColor = useCallback((status: string) => {
    return statusPalette[status as keyof typeof statusPalette]?.color || statusPalette.cold.color;
  }, [statusPalette]);

  const ColorBar: React.FC<{ tag?: string; w?: number }> = ({ tag, w = 8 }) => (
    <div
      role="presentation"
      aria-hidden="true"
      style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: w, borderTopLeftRadius: w, borderBottomLeftRadius: w, background: statusToColor(tag ?? "") }}
    />
  );

  const AIScore: React.FC<{ prob?: number; conf?: number; tight?: boolean }> = ({ prob = 0, conf = 0, tight }) => {
    // Restore confidence gating
    const hasMl = (conf ?? 0) >= 0.2;
    
    if (!hasMl) {
      return (
        <div className={cn("space-y-1 text-right", tight && "space-y-0")}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        </div>
      );
    }
    
    return (
      <div className={cn("space-y-1 text-right tabular-nums", tight && "space-y-0")}> 
        <div className="text-sm font-medium text-foreground/90">{(prob * 100).toFixed(1)}%</div>
        <div className={cn("bg-muted rounded-full", tight ? "h-1 w-20" : "h-1 w-24")}>
          <div className={cn(tight ? "h-1" : "h-1", "rounded-full transition-all bg-muted-foreground/60")} style={{ width: `${prob * 100}%` }} />
        </div>
        {!tight && (
          <div className="text-[11px] text-muted-foreground">
            {conf > 0.8 ? 'Very high' : conf > 0.6 ? 'High' : conf > 0.4 ? 'Medium' : 'Low'}
          </div>
        )}
        <div className={cn("font-normal text-muted-foreground", tight ? "text-[11px]" : "text-xs")}>
          {tight ? 'Conversion Likelihood' : 'Conversion Likelihood'}
        </div>
      </div>
    );
  };

  // MLProbability component with proper alignment and tooltip
  const MLProbability = ({ value, loading, lead }: { value?: number; loading: boolean; lead?: Enquiry }) => {
    return (
      <div className="w-[100px] shrink-0">
        {loading ? (
          <div className="space-y-1 text-center">
            <div className="h-3 w-8 rounded bg-slate-200 animate-pulse mx-auto" />
            <div className="h-2 w-[60px] rounded-full bg-slate-200 animate-pulse mx-auto" />
            <div className="h-3 w-12 rounded bg-slate-200 animate-pulse mx-auto" />
          </div>
        ) : value == null ? (
          <div className="space-y-1 text-center opacity-60">
            <div className="text-[12px] text-slate-500">—</div>
            <div className="h-2 w-[60px] rounded-full bg-slate-200 mx-auto" />
            <div className="text-[11px] text-slate-500">Likelihood</div>
          </div>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1 text-center cursor-help" aria-label="Conversion probability details">
                  <div className="text-[12px] tabular-nums text-slate-700 font-medium">
                    {Math.round(value * 100)}%
                  </div>
                  <div className="relative h-2 w-[60px] rounded-full bg-slate-200 mx-auto">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-slate-600"
                      style={{ width: `${Math.round(value * 100)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500">Likelihood</div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm text-xs leading-relaxed text-white bg-black">
                <div className="font-medium mb-1">ML Prediction</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Probability</span>
                  <span className="tabular-nums text-right">{((value || 0) * 100).toFixed(1)}%</span>

                  <span className="text-muted-foreground">Confidence</span>
                  <span className="tabular-nums text-right">{((lead?.mlConfidence || 0) * 100).toFixed(0)}%</span>

                  {lead && (lead as any).mlCoverage && typeof (lead as any).mlCoverage === 'number' && (
                    <>
                      <span className="text-muted-foreground">Feature Coverage</span>
                      <span className="tabular-nums text-right">{Math.round(((lead as any).mlCoverage || 0) * 100)}%</span>
                    </>
                  )}

                  {lead && (lead as any).mlModelId && (
                    <>
                      <span className="text-muted-foreground">Model</span>
                      <span className="text-right truncate" title={String((lead as any).mlModelId)}>{String((lead as any).mlModelId)}</span>
                    </>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  // IconButton component with original styling
  const IconButton = ({ icon, onClick, ...props }: { icon: 'phone'|'mail'|'calendar'; onClick: () => void }) => {
    const IconComponent = icon === 'phone' ? Phone : icon === 'mail' ? Mail : Calendar;
    const getButtonClass = () => {
      switch (icon) {
        case 'phone':
          return "h-7 w-7 hover:bg-[hsl(var(--success))]/10 hover:text-[hsl(var(--success))]";
        case 'mail':
          return "h-7 w-7 hover:bg-blue-500/10 hover:text-blue-600";
        case 'calendar':
          return "h-7 w-7 hover:bg-[hsl(var(--warning))]/10 hover:text-[hsl(var(--warning))]";
        default:
          return "h-7 w-7 hover:bg-slate-50";
      }
    };
    
    return (
      <Button 
        size="icon" 
        variant="ghost" 
        className={getButtonClass()}
        onClick={onClick}
        {...props}
      >
        <IconComponent className="h-3 w-3" />
      </Button>
    );
  };

  // Performance optimizations
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Saved Views (folders + persistence) — remote-first with local fallback
  type SavedFolder = {
    id: string;
    name: string;
    type: "personal" | "team" | "archived";
    views: SavedView[];
  };

  const [persistenceMode, setPersistenceMode] = useState<'api' | 'local'>('api');
  const [savedFolders, setSavedFolders] = useState<SavedFolder[]>([]);
  const [isLoadingSavedViews, setIsLoadingSavedViews] = useState<boolean>(true);

  const loadSavedFromLocal = useCallback(() => {
    const raw = safeGet('leadSavedFolders');
    const local: SavedFolder[] = raw ? (JSON.parse(raw) as SavedFolder[]) : [
      { id: 'my-views', name: 'My Views', type: 'personal' as const, views: [] },
      { id: 'team-views', name: 'Team Views', type: 'team' as const, views: [] },
      { id: 'archived-views', name: 'Archived Views', type: 'archived' as const, views: [] },
    ];
    setSavedFolders(local);
    setPersistenceMode('local');
  }, []);

  const hydrateSaved = useCallback(async () => {
    setIsLoadingSavedViews(true);
    try {
      // Expect API to return folders with nested views
      const folders = await api<Array<ApiSavedFolder & { views?: ApiSavedView[] }>>('/crm/saved-views/folders?withViews=1');
      const mapped: SavedFolder[] = folders.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        views: (f.views || []).map(v => ({
          id: v.id,
          name: v.name,
          description: v.description,
          filters: v.filters,
          created: v.created,
          lastUsed: v.lastUsed,
          isDefault: v.isDefault,
          isTeamDefault: v.isTeamDefault,
          sharedBy: v.sharedBy,
          archived: v.archived,
          sortBy: v.sortBy,
          sortOrder: v.sortOrder,
          selectedColorTag: v.selectedColorTag,
          activeCustomFilterId: v.activeCustomFilterId,
        }))
      }));
      setSavedFolders(mapped);
      setPersistenceMode('api');
      safeSet('leadSavedFolders', JSON.stringify(mapped)); // cache
    } catch {
      loadSavedFromLocal();
      if (!__warnedApiBase) {
        console.warn('Saved Views API unavailable, using localStorage fallback.');
        __warnedApiBase = true;
      }
    } finally {
      setIsLoadingSavedViews(false);
    }
  }, [loadSavedFromLocal]);

  useEffect(() => { hydrateSaved(); }, [hydrateSaved]);

  const persistFolders = useCallback((folders: SavedFolder[]) => {
    setSavedFolders(folders);
    // Always cache locally; API writes happen in action functions
    safeSet('leadSavedFolders', JSON.stringify(folders));
  }, []);

  const buildCurrentView = useCallback((name: string, description?: string): SavedView => {
    return {
      id: crypto.randomUUID(),
      name,
      description,
      filters: {
        status: selectedStatus,
        source: selectedSource,
        course: selectedCourse,
        year: selectedYear,
        slaStatus: undefined,
        urgentOnly,
      },
      sortBy,
      sortOrder,
      selectedColorTag,
      activeCustomFilterId,
      created: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };
  }, [selectedStatus, selectedSource, selectedCourse, selectedYear, urgentOnly, sortBy, sortOrder, selectedColorTag, activeCustomFilterId]);

  const createFolder = useCallback(async (name: string, type: SavedFolder['type']) => {
    if (!name) return '';
    if (persistenceMode === 'api') {
      try {
        const created = await api<ApiSavedFolder>('/crm/saved-views/folders', {
          method: 'POST',
          body: JSON.stringify({ name, type }),
        });
        const next = [...savedFolders, { id: created.id, name: created.name, type: created.type, views: [] }];
        persistFolders(next);
        return created.id;
      } catch {
        setPersistenceMode('local'); // fall back
      }
    }
    const folder: SavedFolder = { id: crypto.randomUUID(), name, type, views: [] };
    const next = [...savedFolders, folder];
    persistFolders(next);
    return folder.id;
  }, [persistenceMode, savedFolders, persistFolders]);

  const saveCurrentViewToFolder = useCallback(async (folderId: string, name: string, description?: string, opts?: { isDefault?: boolean; isTeamDefault?: boolean }) => {
    const view: SavedView = { ...buildCurrentView(name, description), isDefault: opts?.isDefault, isTeamDefault: opts?.isTeamDefault };

    if (persistenceMode === 'api') {
      try {
        const payload: Partial<ApiSavedView> = { ...view, folder_id: folderId };
        const saved = await api<ApiSavedView>('/crm/saved-views', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const folders = savedFolders.map(f => f.id === folderId ? { ...f, views: [ { ...view, id: saved.id }, ...f.views ] } : f);
        persistFolders(folders);
        return;
      } catch {
        setPersistenceMode('local'); // fall back
      }
    }

    // Local fallback
    const folders = savedFolders.map(f => (f.id === folderId ? { ...f, views: [view, ...f.views] } : f));
    persistFolders(folders);
  }, [persistenceMode, savedFolders, buildCurrentView, persistFolders]);



  // Removed mock dataset in favor of live data

  // Real data via API - use dedicated enquiries endpoint which filters to enquiry stage
  const filters = useMemo(() => ({ limit: 200 }), []);
  const { people, fetchPeople } = usePeople('leads', filters);
  
  // Refresh function for updates
  const handleRefresh = useCallback(() => {
    fetchPeople();
  }, [fetchPeople]);
  
  // Temporary: use empty array to test if hook is causing re-renders
  // const people: any[] = [];

  // Unified API client
  const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
  
  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers||{}) },
      ...init,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  // ML Predictions state and fetching (moved before useMemo that uses it)
  const [mlPredictions, setMlPredictions] = useState<Record<string, { prediction: boolean; probability: number; confidence: number; coverage_ratio?: number; model_id?: string }>>({});
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);

  // Map API status text to Lead statusType union
  const mapStatus = (s: string): Enquiry['statusType'] => {
    const t = s.toLowerCase();
    if (t.includes('contact')) return 'contacted';
    if (t.includes('qualif'))  return 'qualified';
    if (t.includes('nurtur'))  return 'nurturing';
    if (t.includes('cold'))    return 'cold';
    return 'new';
  };

  const datasetLeads = useMemo((): Enquiry[] => {
    const now = Date.now();
    const leads = (people || []).map((p: any, idx: number) => {
      // Ensure unique IDs - use original ID if numeric, otherwise use index + 1000 to avoid conflicts
      const idNum = typeof p.id === 'number' ? p.id : (parseInt(p.id, 10) || (idx + 1000));
      const uidStr = String(p.id);
      
      const lastActivityIso: string = p.last_activity_at || p.created_at || new Date().toISOString();
      const hoursSinceLast = Math.max(0, (now - new Date(lastActivityIso).getTime()) / 36e5);
      
      // More realistic SLA calculation for mock data
      // For mock data with same timestamps, use lead_score and conversion_probability
      let slaStatus: Enquiry["slaStatus"];
      if (hoursSinceLast >= 24) {
        slaStatus = 'urgent';
      } else if (hoursSinceLast >= 12) {
        slaStatus = 'warning';
      } else if (p.lead_score && p.lead_score > 80) {
        // High-scoring leads are progressing (within SLA)
        slaStatus = 'within_sla';
      } else if (p.lead_score && p.lead_score < 30) {
        // Low-scoring leads might be cold (warning)
        slaStatus = 'warning';
      } else {
        slaStatus = 'within_sla';
      }

      return {
        id: idNum,
        uid: uidStr,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
        email: p.email || 'unknown@example.com',
        phone: p.phone || '+44 7000 000000',
        // Map to real database fields from vw_leads_management
        courseInterest: p.latest_programme_name || undefined,
        academicYear: p.latest_academic_year || undefined,
        campusPreference: p.latest_campus_name || undefined,
        enquiryType: p.last_activity_kind || 'Course Inquiry',
        leadSource: p.assigned_to || `Lead #${String(p.id).slice(-4)}`, // fallback to assigned_to or lead ID
        status: p.status || 'New Lead',
        statusType: mapStatus(p.status ?? 'New'),
        lifecycle_state: p.lifecycle_state || 'lead',
        leadScore: typeof p.lead_score === 'number' ? p.lead_score : 0,
        createdDate: p.created_at || lastActivityIso,
        lastContact: lastActivityIso,
        nextAction: p.last_activity_title || 'Initial contact required',
        slaStatus,
        contactAttempts: p.contact_attempts || 0, // Default to 0 since it's not in the view
        tags: [p.lifecycle_state ? `Lifecycle: ${p.lifecycle_state}` : null].filter(Boolean) as string[],
                 colorTag: (() => {
           // Assign color tags based on lead characteristics using professional business logic
           const score = p.lead_score ?? 0;
           const conversionProb = p.conversion_probability ?? 0;
           
           // Priority: Very high score + high conversion probability
           if (score >= 85 && conversionProb >= 0.8) return 'priority';
           
           // Hot: High score + good conversion probability
           if (score >= 70 && conversionProb >= 0.6) return 'hot';
           
           // Qualified: Good score + reasonable conversion probability
           if (score >= 50 && conversionProb >= 0.4) return 'qualified';
           
           // Nurture: Moderate score, needs engagement
           if (score >= 30) return 'nurture';
           
           // Research: Low score, needs investigation
           if (score >= 15) return 'research';
           
           // Cold: Very low score, low priority
           return 'cold';
         })(),
        avatar: (p.first_name && p.last_name) ? `${p.first_name[0]}${p.last_name[0]}`.toUpperCase() : undefined,
        aiInsights: {
          conversionProbability: Math.round(((p.conversion_probability ?? 0) as number) * 100),
          bestContactTime: 'Business hours',
          recommendedAction: 'Schedule call',
          urgency: ((): 'high' | 'medium' | 'low' => {
            const score = p.lead_score ?? 0;
            if (score >= 80) return 'high';
            if (score >= 50) return 'medium';
            return 'low';
          })(),
        },
        // ML Prediction fields - populated by batch prediction API
        mlPrediction: mlPredictions[p.id]?.prediction ?? undefined,
        mlProbability: mlPredictions[p.id]?.probability ?? 0,
        mlConfidence: mlPredictions[p.id]?.confidence ?? 0,
        // Extended properties for tooltip metadata
        mlCoverage: mlPredictions[p.id]?.coverage_ratio,
        mlModelId: mlPredictions[p.id]?.model_id,
      };
    });
    
    // (Debug logging for lead mapping removed)
    
    return leads;
  }, [people, mlPredictions]);

  // Function to fetch ML predictions for visible leads
  const fetchMLPredictions = useCallback(async () => {
    if (!datasetLeads.length || isLoadingPredictions) return;

    setIsLoadingPredictions(true);
    try {
      const leadIds = datasetLeads.map(lead => lead.uid);
      const result = await api<{ predictions: Array<{ lead_id: string; prediction: boolean; probability: number; confidence: number; coverage_ratio?: number; model_id?: string }>; meta?: { schema_version?: string; contract_version?: string } }>('/ai/advanced-ml/predict-batch', {
        method: 'POST',
        body: JSON.stringify(leadIds),
      });

      const predictionsMap: Record<string, { prediction: boolean; probability: number; confidence: number; coverage_ratio?: number; model_id?: string }> = {};
      for (const pred of result.predictions) {
        if (pred && pred.probability !== null && pred.probability !== undefined) {
          predictionsMap[String(pred.lead_id)] = {
              prediction: pred.prediction,
            probability: pred.probability ?? 0,
            confidence: pred.confidence ?? 0,
            coverage_ratio: pred.coverage_ratio,
            model_id: pred.model_id,
          };
        }
      }
      setMlPredictions(predictionsMap);
    } catch (error) {
      console.error('❌ Error fetching ML predictions:', error);
    } finally {
      setIsLoadingPredictions(false);
    }
  }, [datasetLeads, isLoadingPredictions, api]);

  // Auto-fetch predictions when leads change
  useEffect(() => {
    if (datasetLeads.length > 0 && Object.keys(mlPredictions).length === 0) {
      // Small delay to avoid too many requests
      const timer = setTimeout(() => {
        fetchMLPredictions();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [datasetLeads, mlPredictions, fetchMLPredictions]);

  // Map original UUID -> numeric id, and numeric id -> UUID, to align AI results with UI keys
  const uuidToNumericId = useMemo(() => {
    const m = new Map<string, number>();
    (people || []).forEach((p: any, idx: number) => {
      const idNum = typeof p.id === 'number' ? p.id : (parseInt(p.id, 10) || (idx + 1000));
      m.set(String(p.id), idNum);
    });
    return m;
  }, [people]);

  const numericIdToUuid = useMemo(() => {
    const m = new Map<number, string>();
    (people || []).forEach((p: any, idx: number) => {
      const idNum = typeof p.id === 'number' ? p.id : (parseInt(p.id, 10) || (idx + 1000));
      m.set(idNum, String(p.id));
    });
    return m;
  }, [people]);



  // Apply saved-view filters
  const applyViewFilters = (leads: Enquiry[], view: SavedView | null) => {
    if (!view?.filters) return leads;
    const f = view.filters;
    return leads.filter((lead) => {
      if (f.leadScore?.startsWith(">=")) {
        const min = parseInt(f.leadScore.substring(2), 10);
        if (lead.leadScore < min) return false;
      }
      if (f.status && f.status !== "all" && lead.statusType !== f.status) return false;
      if (f.source && f.source !== "all" && lead.leadSource !== f.source) return false;
      if (f.course && f.course !== "all" && lead.courseInterest !== f.course) return false;
      if (f.campus && f.campus !== "all" && lead.campusPreference !== f.campus) return false;
      if (f.year && f.year !== "all" && lead.academicYear !== f.year) return false;
      if (f.slaStatus && lead.slaStatus !== f.slaStatus) return false;
      if (f.urgentOnly && !["urgent", "warning"].includes(lead.slaStatus)) return false;
      return true;
    });
  };

  // Update active filters when filter values change
  useEffect(() => {
    const filters: Array<{key: string, label: string, value: string}> = [];
    
    if (selectedStatus !== "all") {
      filters.push({ key: "status", label: "Status", value: selectedStatus });
    }
    if (selectedSource !== "all") {
      filters.push({ key: "source", label: "Source", value: selectedSource });
    }
    if (selectedCourse !== "all") {
      filters.push({ key: "course", label: "Course", value: selectedCourse });
    }
    if (selectedYear !== "all") {
      filters.push({ key: "year", label: "Year", value: selectedYear });
    }
    if (urgentOnly) {
      filters.push({ key: "urgent", label: "Urgent Only", value: "Yes" });
    }
    
    setActiveFilters(filters);
  }, [selectedStatus, selectedSource, selectedCourse, selectedYear, urgentOnly]);

  // Remove filter
  const removeFilter = (key: string) => {
    switch (key) {
      case "status":
        setSelectedStatus("all");
        break;
      case "source":
        setSelectedSource("all");
        break;
      case "course":
        setSelectedCourse("all");
        break;
      case "year":
        setSelectedYear("all");
        break;
      case "urgent":
        setUrgentOnly(false);
        break;
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedStatus("all");
    setSelectedSource("all");
    setSelectedCourse("all");
    setSelectedYear("all");
    setSelectedColorTag("all");
    setUrgentOnly(false);
    setSearchTerm("");
  };

  // Search suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const suggestions: Array<{type: string, value: string, count: number}> = [];
    const term = searchTerm.toLowerCase();
    
    // Course suggestions
    const uniq = <T,>(a: T[]) => [...new Set(a)];
    const lower = (s?: string) => (s ?? '').toLowerCase();
    
    const courses = uniq(datasetLeads.map(l => l.courseInterest).filter(Boolean) as string[]);
    courses.forEach(course => {
      if (lower(course).includes(term)) {
        const count = datasetLeads.filter(l => l.courseInterest === course).length;
        suggestions.push({ type: "course", value: course, count });
      }
    });
    
    // Campus suggestions
    const campuses = uniq(datasetLeads.map(l => l.campusPreference).filter(Boolean) as string[]);
    campuses.forEach(campus => {
      if (lower(campus).includes(term)) {
        const count = datasetLeads.filter(l => l.campusPreference === campus).length;
        suggestions.push({ type: "campus", value: campus, count });
      }
    });
    
    // Source suggestions
    const sources = uniq(datasetLeads.map(l => l.leadSource).filter(Boolean) as string[]);
    sources.forEach(source => {
      if (lower(source).includes(term)) {
        const count = datasetLeads.filter(l => l.leadSource === source).length;
        suggestions.push({ type: "source", value: source, count });
      }
    });
    
    return suggestions.slice(0, 5);
  }, [searchTerm, datasetLeads]);

  // Transform Enquiry to CallConsole Lead format
  const transformEnquiryToCallConsoleLead = useCallback((enquiry: Enquiry): CallConsoleLead => {
    return {
      id: enquiry.id,
      uid: enquiry.uid,
      name: enquiry.name,
      email: enquiry.email,
      phone: enquiry.phone,
      courseInterest: enquiry.courseInterest,
      statusType: enquiry.statusType,
      nextAction: enquiry.status, // Map status to nextAction
      followUpDate: undefined, // Could be derived from enquiry data if available
      aiInsights: {
        conversionProbability: 0.5, // Default value, could be enhanced with ML
        callStrategy: "standard",
        recommendedAction: "Follow up"
      }
    };
  }, []);

  // Handler functions (needed for keyboard shortcuts)
  const handlePhoneClick = useCallback((lead: Enquiry) => {
    if (lead.phone) {
      setSelectedLeadForCall(lead);
      setShowCallConsole(true);
    } else {
      push({ title: "No phone number", description: `${lead.name} has no phone number`, variant: "destructive" });
    }
  }, []);

  const handleEmailClick = useCallback((lead: Enquiry) => {
    setSelectedLeadForEmail(lead);
    setShowEmailComposer(true);
  }, []);

  const handleMeetingClick = useCallback((lead: Enquiry) => {
    setSelectedLeadForMeeting(lead);
    setShowMeetingBooker(true);
  }, []);


  // Stable keyboard shortcuts handler
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
      // Ignore events when typing in inputs
      const isTyping = (el: EventTarget | null) =>
        el && (el as HTMLElement).closest('input,textarea,[contenteditable="true"]');
      if (isTyping(e.target)) return;
      
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
    // Alt + F for filters (avoid hijacking browser find)
    if (e.altKey && e.key === 'f') {
        e.preventDefault();
      // Note: Filters are now in dropdown, no toggle needed
      }
      
      // Escape to clear search
    if (e.key === 'Escape') {
        setSearchTerm("");
        setShowSearchSuggestions(false);
      }
      
      // Ctrl/Cmd + A for select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAllVisible();
      }
    
    // Row-level quick actions when a lead is focused/selected (Command/Ctrl + letter)
    if ((e.ctrlKey || e.metaKey) && focusedLeadRef.current) {
      const focused = focusedLeadRef.current;
      const key = e.key.toLowerCase();
      if (key === 'p') {
        e.preventDefault();
        handlePhoneClick(focused);
      }
      if (key === 'e') {
        e.preventDefault();
        handleEmailClick(focused);
      }
      if (key === 'm') {
        e.preventDefault();
        handleMeetingClick(focused);
      }
      if (key === 'u') {
        e.preventDefault();
        setSlaOverrides(prev => ({
          ...prev,
          [focused.uid]: prev[focused.uid] === 'urgent' ? 'within_sla' : 'urgent'
        }));
      }
    }
  }, [setSearchTerm, handlePhoneClick, handleEmailClick, handleMeetingClick, setSlaOverrides]);

  // Keyboard shortcuts
  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);


  // Memoized filtered leads with performance optimization
  const filteredLeads = useMemo(() => {
    if (isLoading) return [];
    
    let filtered = currentView ? applyViewFilters(datasetLeads, currentView) : datasetLeads;
    
    // Apply search filter only if search term is significant
    if (debouncedSearchTerm.trim().length > 0) {
      const q = debouncedSearchTerm.trim().toLowerCase();
      filtered = filtered.filter((lead) => {
        const name = (lead.name || '').toLowerCase();
        const email = (lead.email || '').toLowerCase();
        const course = (lead.courseInterest || '').toLowerCase();
        return name.includes(q) || email.includes(q) || course.includes(q);
      });
    }
    
    // Apply other filters
    filtered = filtered.filter((lead) => {
      const matchesStatus = selectedStatus === "all" || lead.statusType === (selectedStatus as Enquiry["statusType"]);
      const matchesSource = selectedSource === "all" || lead.leadSource === selectedSource;
      const matchesCourse = selectedCourse === "all" || lead.courseInterest === selectedCourse;
      const matchesYear = selectedYear === "all" || lead.academicYear === selectedYear;
      const matchesUrgent = !urgentOnly || ["urgent", "warning"].includes(lead.slaStatus);
      const effectiveTag = getEffectiveTag(lead);
      const matchesColorTag = selectedColorTag === "all" || effectiveTag === selectedColorTag;
      return matchesStatus && matchesSource && matchesCourse && matchesYear && matchesUrgent && matchesColorTag;
    });

    // Apply custom filter if active
    if (activeCustomFilterId) {
      const customFilter = customFilters.find(f => f.id === activeCustomFilterId);
      if (customFilter) {
        filtered = filtered.filter(lead => evalPredicate(lead, customFilter.predicate));
      }
    }

    // AI Triage Reordering - if AI has analyzed, use AI scores
    if (aiTriageExtras.size > 0) {
      filtered.sort((a, b) => {
        const aScore = aiTriageExtras.get(String(a.uid))?.score ?? -1;
        const bScore = aiTriageExtras.get(String(b.uid))?.score ?? -1;
        return bScore - aScore; // Higher scores first
      });
    } else {
      // Optimized sorting (original logic)
      if (sortBy && sortOrder) {
        filtered.sort((a, b) => {
          const key = sortKeyMap[sortBy] ?? "mlProbability";
          let aV, bV;
          
          if (key === "mlProbability") {
            const aHas = typeof a.mlProbability === 'number' && (a.mlConfidence ?? 0) > 0;
            const bHas = typeof b.mlProbability === 'number' && (b.mlConfidence ?? 0) > 0;
            if (!aHas && !bHas) return 0;
            if (!aHas) return 1; // push missing to bottom
            if (!bHas) return -1;
            aV = a.mlProbability as number;
            bV = b.mlProbability as number;
          } else {
            aV = (a as any)[key];
            bV = (b as any)[key];
          }
          
          // Defensive sorting to avoid NaN comparisons
          if (typeof aV === "number" && typeof bV === "number") {
            return sortOrder === "asc" ? (aV ?? 0) - (bV ?? 0) : (bV ?? 0) - (aV ?? 0);
          }
          
          const aStr = String(aV || "").toLowerCase();
          const bStr = String(bV || "").toLowerCase();
          return sortOrder === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        });
      }
    }

    return filtered;
  }, [datasetLeads, currentView, debouncedSearchTerm, selectedStatus, selectedSource, selectedCourse, selectedYear, urgentOnly, sortBy, sortOrder, isLoading, aiTriageExtras, selectedColorTag]);

  // Memoized pagination
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, filteredLeads.length);
    
    return {
      totalPages,
      start,
      end,
      paginatedLeads: filteredLeads.slice(start, end)
    };
  }, [filteredLeads, currentPage, itemsPerPage]);

  const selectAllVisible = () => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      paginationData.paginatedLeads.forEach((l) => newSet.add(l.uid));
      return newSet;
    });
  };

  // Memoized stats
  const stats = useMemo(() => ({
    total: filteredLeads.length,
    urgent: filteredLeads.filter((l) => l.slaStatus === "urgent").length,
    newToday: filteredLeads.filter((l) => new Date(l.createdDate).toDateString() === new Date().toDateString()).length,
    highScore: filteredLeads.filter((l) => (l.mlProbability || 0) >= 0.8).length,
    selected: selectedLeads.size,
  }), [filteredLeads, selectedLeads]);

  // Virtual scrolling is handled in TableView component

  // Handlers
  const toggleFolder = useCallback((id: string) => {
    const s = new Set(expandedFolders);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedFolders(s);
  }, [expandedFolders]);

  const selectView = useCallback((v: SavedView) => {
    setCurrentView(v);
    setCurrentPage(1);
    
    // Restore additional view state
    if (v.sortBy) setSortBy(v.sortBy);
    if (v.sortOrder) setSortOrder(v.sortOrder);
    if (v.selectedColorTag) setSelectedColorTag(v.selectedColorTag);
    if (v.activeCustomFilterId !== undefined) setActiveCustomFilterId(v.activeCustomFilterId);

    // Update lastUsed timestamp
    setSavedFolders(prev => {
      const next = prev.map(f => f.views.some(view => view.id === v.id) ? {
        ...f,
        views: f.views.map(view => view.id === v.id ? { ...view, lastUsed: new Date().toISOString() } : view)
      } : f);
      safeSet('leadSavedFolders', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearView = useCallback(() => {
    setCurrentView(null);
    setCurrentPage(1);
  }, []);


  const toggleLeadSelection = useCallback((uid: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uid)) {
        newSet.delete(uid);
      } else {
        newSet.add(uid);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedLeads(new Set()), []);

  const goToPage = useCallback((p: number) => setCurrentPage(Math.max(1, Math.min(p, paginationData.totalPages))), [paginationData.totalPages]);

  // UI helpers — use shadcn Badge variants instead of hard-coded colours
  const SLABadge = ({ sla }: { sla: Enquiry["slaStatus"] }) => {
    const map: Record<Enquiry["slaStatus"], { label: string; variant: "destructive" | "secondary" | "outline" | "default"; icon: React.ReactNode }> = {
      urgent: { label: "Urgent", variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> },
      warning: { label: "Warning", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      within_sla: { label: "On Track", variant: "outline", icon: <Target className="h-3 w-3" /> },
      met: { label: "Met", variant: "default", icon: <Eye className="h-3 w-3" /> },
    };
    const cfg = map[sla] ?? map.met;
    return (
      <Badge variant={cfg.variant} className="gap-1.5 px-2.5 py-1 text-xs font-medium">
        {cfg.icon}
        {cfg.label}
      </Badge>
    );
  };

  const StatusBadge = ({ status, statusType }: { status: string; statusType: Enquiry["statusType"] }) => {
    const map: Record<Enquiry["statusType"], { variant: "default" | "secondary" | "outline" | "destructive"; color: string }> = {
      new: { variant: "default", color: "bg-muted text-foreground border-border hover:bg-muted/80 hover:text-foreground" },
      contacted: { variant: "secondary", color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20 hover:bg-[hsl(var(--warning))] hover:text-white" },
      qualified: { variant: "outline", color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20 hover:bg-[hsl(var(--success))] hover:text-white" },
      nurturing: { variant: "secondary", color: "bg-muted text-foreground border-border hover:bg-muted/80 hover:text-foreground" },
      cold: { variant: "outline", color: "bg-muted/50 text-foreground border-border hover:bg-muted hover:text-foreground" },
    };
    const cfg = map[statusType];
    return (
      <Badge 
        variant={cfg.variant} 
        className={`${cfg.color} border font-medium px-3 py-1.5 text-xs transition-colors duration-200`}
      >
        {status}
      </Badge>
    );
  };

  const LeadScoreIndicator = ({ score }: { score: number }) => {
    const getScoreColor = (score: number) => {
      if (score >= 80) return "text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/20";
      if (score >= 60) return "text-muted-foreground bg-muted/50 border-border";
      if (score >= 40) return "text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/20";
      return "text-muted-foreground bg-muted/50 border-border";
    };

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${getScoreColor(score)}`}>
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4" />
          <span className="font-semibold text-sm">{score}</span>
        </div>
        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${
              score >= 80 ? 'bg-[hsl(var(--success))]' : 
              score >= 60 ? 'bg-muted-foreground' : 
              score >= 40 ? 'bg-[hsl(var(--warning))]' : 'bg-muted-foreground'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    );
  };

  const SavedViewsSidebar = () => (
    <div className="w-80 bg-gradient-to-b from-background to-muted/30 border-r border-border flex flex-col shadow-lg">
      <div className="p-6 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            Saved Views
            {isLoadingSavedViews && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </h3>
          <Button size="icon" variant="ghost" onClick={() => setShowSavedViews(false)} className="hover:bg-muted" aria-label="Close saved views">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <Button
          variant={currentView ? "outline" : "default"}
          className="w-full justify-start gap-3 h-14 text-left hover:shadow-md transition-all duration-200"
          onClick={clearView}
        >
          <div className="p-2 rounded-lg bg-muted">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold">All Enquiries</div>
            <div className={`text-xs ${currentView ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              <span className="tabular-nums">{datasetLeads.length.toLocaleString()}</span> total enquiries
            </div>
          </div>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {savedFolders.map((folder) => (
          <div key={folder.id} className="space-y-3">
            <button
              onClick={() => toggleFolder(folder.id)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted group-hover:bg-muted/80 transition-colors duration-200">
                  {expandedFolders.has(folder.id) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="p-2 rounded-lg bg-muted">
                  {folder.type === 'personal' && <Users className="h-4 w-4 text-muted-foreground" />}
                  {folder.type === 'team' && <Users2 className="h-4 w-4 text-muted-foreground" />}
                  {folder.type === 'archived' && <Archive className="h-4 w-4 text-muted-foreground" />}
                </div>
                <span className="text-sm font-semibold text-foreground">{folder.name}</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {folder.views.length}
              </span>
            </button>

            {expandedFolders.has(folder.id) && (
              <div className="ml-8 space-y-2">
                {folder.views.map((view: SavedView) => (
                  <div
                    key={view.id}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted transition-all duration-200 group",
                      currentView?.id === view.id && "ring-2 ring-border bg-muted/50 shadow-lg"
                    )}
                  >
                    <button
                      onClick={() => selectView(view)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold truncate text-foreground">{view.name}</span>
                        {view.isDefault && <Star className="h-3 w-3 text-warning fill-warning" />}
                        {view.isTeamDefault && <Users2 className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      {view.description && (
                        <p className="text-xs text-muted-foreground truncate mb-1">{view.description}</p>
                      )}
                      {view.sharedBy && (
                        <p className="text-xs text-muted-foreground">Shared by {view.sharedBy}</p>
                      )}
                      {view.lastUsed && (
                        <p className="text-xs text-muted-foreground">Last used: {view.lastUsed}</p>
                      )}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleRenameView(view)}>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateView(view)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteView(view)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="pt-6 border-t border-border space-y-3">
          <Button variant="ghost" className="w-full justify-start gap-3 h-12 hover:bg-muted" onClick={() => setShowSaveViewModal(true)} disabled={isLoadingSavedViews}>
            <div className="p-2 rounded-lg bg-[hsl(var(--success))]/10">
              <BookmarkPlus className="h-4 w-4 text-[hsl(var(--success))]" />
            </div>
            Save Current View
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 h-12 hover:bg-muted" onClick={() => setShowCreateFolderModal(true)} disabled={isLoadingSavedViews}>
            <div className="p-2 rounded-lg bg-muted">
              <Plus className="h-4 w-4" />
            </div>
            Create Folder
          </Button>
        </div>
      </div>
    </div>
  );

  function PlusIcon() {
    return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" className="stroke-current" strokeWidth="1.5" />
    </svg>;
  }

  // Optimized table row component with proper props
  const TableRow = React.memo(({ lead, index, selected, onToggle }: { 
    lead: Enquiry; 
    index: number; 
    selected: boolean; 
    onToggle: (uid: string) => void;
  }) => {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    
    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    };
    
    const assignColorTag = (colorTagId: string) => {
      setColorOverride(lead.uid, colorTagId); // persist to localStorage
      setShowContextMenu(false);
    };

    // User Tag toggle from context menu
    const toggleUserTag = (tagId: string, checked: boolean) => {
      assignUserTag(lead.uid, tagId, checked);
    };
    
    // Close context menu when clicking outside
    useEffect(() => {
      const handleClickOutside = () => setShowContextMenu(false);
      if (showContextMenu) {
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
      }
    }, [showContextMenu]);
    
    return (
      <>
        <tr 
          className={cn(
            "group hover:bg-muted/50 transition-colors duration-200", 
            selected && "bg-muted ring-1 ring-inset ring-border"
          )}
          style={{ position: 'relative' } as React.CSSProperties}
          onContextMenu={handleContextMenu}
        >
          <td className="px-4 py-4 relative">
            <ColorBar tag={getEffectiveTag(lead)} w={4} />
            <Checkbox
              checked={selectedLeads.has(lead.uid)}
              onCheckedChange={(val) => {
                const checked = val === true;
                if (checked) {
                  setSelectedLeads(prev => {
                    const newSet = new Set(prev);
                    newSet.add(lead.uid);
                    return newSet;
                  });
                } else {
                  setSelectedLeads(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(lead.uid);
                    return newSet;
                  });
                }
              }}
              aria-label={`Select ${lead.name}`}
            />
          </td>
          <td className="px-4 py-4">
            <div className="flex items-center">
              <div className="mr-3 sm:mr-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/80 text-muted-foreground text-sm font-bold border border-border">
                {lead.avatar || lead.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <button
                    className="text-sm font-semibold text-foreground truncate hover:text-red-600 text-left transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      lead.uid && navigate(`/directory/${lead.uid}`);
                    }}
                    title="View person record"
                  >
                    {lead.name}
                  </button>
                  {lead.colorTag && (
                    <div className="flex-shrink-0">
                      <ColorTagIndicator tagId={lead.colorTag} />
                    </div>
                  )}
                </div>
                {/* Inline field-based tags next to name */}
                <div className="flex items-center gap-1 mt-1">
                  {(() => {
                    const keys = getSelectedInlineKeys(lead);
                    const all = getAvailableInlineTags(lead);
                    return keys
                      .filter(k => all[k] !== undefined)
                      .map(k => (
                        <Badge key={k} variant="secondary" className="text-[10px] px-1.5 py-0.5 capitalize">
                          {all[k]}
                        </Badge>
                      ));
                  })()}
                  {/* Inline tag toggler (simple picker UI of DB-backed fields) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Edit inline tags">
                        <PlusIcon />
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {[
                      { key: "course", label: "Course", value: lead.courseInterest },
                      { key: "campus", label: "Campus", value: lead.campusPreference },
                      { key: "year", label: "Year", value: lead.academicYear },
                      { key: "status", label: "Status", value: lead.status },
                      { key: "lifecycle", label: "Lifecycle", value: lead.lifecycle_state?.replaceAll('_',' ') },
                      { key: "source", label: "Source", value: lead.leadSource },
                      { key: "score", label: "Score", value: lead.leadScore ? `${lead.leadScore}` : undefined },
                      { key: "stage", label: "Stage", value: lead.enquiryType }
                    ].map(({ key, label, value }) => {
                      const selected = getSelectedInlineKeys(lead).includes(key);
                      const displayValue = value || `(empty)`;
                      return (
                        <DropdownMenuItem key={key} onClick={(e) => { e.stopPropagation(); toggleInlineTag(lead.uid, key); }}>
                          <span className="text-xs">{label}: {displayValue}</span>
                          <span className="ml-auto text-xs">{selected ? "−" : "+"}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground truncate">{lead.courseInterest}</div>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md inline-block">
                {lead.academicYear}
              </div>
              <div className="text-xs text-muted-foreground truncate">{lead.campusPreference}</div>
            </div>
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-right align-middle tabular-nums w-[140px]">
            {isLoadingPredictions ? (
              <div role="status" aria-live="polite" className="flex items-center gap-2 text-muted-foreground justify-end">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading...</span>
              </div>
            ) : (
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="space-y-1 inline-block text-right cursor-help"
                      aria-label="Conversion probability details"
                      title="Hover for ML details"
                    >
                      <div className="text-sm font-medium text-foreground/90">
                  {((lead.mlProbability || 0) * 100).toFixed(1)}%
                </div>
                      <div className="w-24 ml-auto bg-muted rounded-full h-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((lead.mlProbability || 0) * 100)}>
                  <div
                          className="h-1 rounded-full bg-muted-foreground/60"
                    style={{ width: `${(lead.mlProbability || 0) * 100}%` }}
                  />
                </div>
                      <div className="text-[11px] text-muted-foreground">Conversion Probability</div>
                </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="end" className="max-w-sm text-xs leading-relaxed text-white bg-black">
                    <div className="font-medium mb-1">ML Prediction</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 items-center">
                      <span className="text-muted-foreground">Probability</span>
                      <span className="tabular-nums text-right">
                        {((lead.mlProbability || 0) * 100).toFixed(1)}%
                      </span>

                      <span className="text-muted-foreground">Confidence</span>
                      <span className="tabular-nums text-right">
                        {((lead.mlConfidence || 0) * 100).toFixed(0)}%
                      </span>

                      {(lead as any).mlCoverage !== undefined && typeof (lead as any).mlCoverage === 'number' && (
                        <>
                          <span className="text-muted-foreground">Feature Coverage</span>
                          <span className="tabular-nums text-right">
                            {Math.round(((lead as any).mlCoverage || 0) * 100)}%
                          </span>
                        </>
                      )}

                      {(lead as any).mlModelId && (
                        <>
                          <span className="text-muted-foreground">Model</span>
                          <span className="text-right truncate" title={String((lead as any).mlModelId)}>
                            {String((lead as any).mlModelId)}
                          </span>
                        </>
                      )}
              </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-muted-foreground mb-1">Prob. bar</div>
                        <div className="h-1.5 w-28 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-muted-foreground/60"
                            style={{ width: `${(lead.mlProbability || 0) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Conf. bar</div>
                        <div className="h-1.5 w-28 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-muted-foreground/60"
                            style={{ width: `${(lead.mlConfidence || 0) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </td>
          <td className="px-4 py-4">
              {isLoadingPredictions ? (
              <div role="status" aria-live="polite" className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-muted-foreground" />
                  <Badge
                    variant={lead.mlPrediction !== undefined ? (lead.mlPrediction ? "default" : "secondary") : "outline"}
                    className={`text-xs font-medium ${
                      lead.mlPrediction === undefined
                        ? 'bg-gray-100 text-gray-700 border-gray-200'
                        : lead.mlPrediction
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                    }`}
                  >
                    {lead.mlPrediction === undefined
                      ? 'No Prediction'
                      : lead.mlPrediction
                      ? 'Will Convert'
                      : 'Will Not Convert'}
                  </Badge>
                </div>
              )}
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-right align-middle tabular-nums w-[140px]">
            {isLoadingPredictions ? (
              <div role="status" aria-live="polite" className="flex items-center justify-end">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="sr-only">Loading...</span>
              </div>
            ) : (
              <div className="space-y-1 inline-block text-right">
                <div className="text-sm font-medium text-foreground/90">{((lead.mlConfidence || 0) * 100).toFixed(0)}%</div>
                <Progress value={(lead.mlConfidence || 0) * 100} className="w-24 h-1 ml-auto" />
                <div className="text-[11px] text-muted-foreground">
                  {(lead.mlConfidence || 0) > 0.8 ? 'Very high' :
                   (lead.mlConfidence || 0) > 0.6 ? 'High' :
                   (lead.mlConfidence || 0) > 0.4 ? 'Medium' : 'Low'}
                </div>
                <div className="text-[11px] text-muted-foreground">Confidence</div>
              </div>
            )}
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 align-middle">
            <div className="flex items-center gap-1 flex-wrap leading-none">
                <StatusBadge status={lead.status} statusType={lead.statusType} />
                <SLABadge sla={lead.slaStatus} />
              </div>
              {aiTriageExtras.has(String(lead.uid)) && (
              <div className="text-[11px] text-muted-foreground mt-1">
                  NBA: {aiTriageExtras.get(String(lead.uid))!.next_action}
                </div>
              )}
          </td>
          <td className="px-4 py-4">
            <div className="flex justify-end gap-1">
              <Button 
                size="icon" 
                variant="ghost" 
                aria-label="Call lead" 
                className="hover:bg-[hsl(var(--success))]/10 hover:text-[hsl(var(--success))] h-8 w-8 sm:h-9 sm:w-9"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePhoneClick(lead);
                }}
              >
                <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                aria-label="Email lead" 
                className="hover:bg-blue-500/10 hover:text-blue-600 h-8 w-8 sm:h-9 sm:w-9"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEmailClick(lead);
                }}
              >
                <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                aria-label="Schedule" 
                className="hover:bg-[hsl(var(--warning))]/10 hover:text-[hsl(var(--warning))] h-8 w-8 sm:h-9 sm:w-9"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMeetingClick(lead);
                }}
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-foreground hover:text-background" aria-label="Open actions menu">
                    <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    lead.uid && navigate(`/directory/${lead.uid}`);
                  }}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Person Record
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Debug: Show if AI data exists (development only) */}
            {import.meta.env.DEV && (
              <div className="text-xs text-muted-foreground">
                AI Data: {aiTriageExtras.has(String(lead.uid)) ? 'YES' : 'NO'} (UID: {lead.uid})
                {aiTriageExtras.has(String(lead.uid)) && (
                  <div className="text-xs text-green-600">
                    ✓ AI data found: {aiTriageExtras.get(String(lead.uid))?.score}%
                  </div>
                )}
              </div>
            )}
            
            {/* AI Triage Insights */}
            {aiTriageExtras.has(String(lead.uid)) && (
              <div className="mt-2 p-2 bg-muted/30 rounded border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-3 w-3 text-accent" />
                  <span className="text-xs font-medium text-foreground">
                    ML Score: {aiTriageExtras.get(String(lead.uid))!.score}%
                  </span>
                  {aiTriageExtras.get(String(lead.uid))!.ml_confidence && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0.5">
                      Confidence: {Math.round((aiTriageExtras.get(String(lead.uid))!.ml_confidence || 0) * 100)}%
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] px-1 py-0.5 ml-auto">
                    Next: {aiTriageExtras.get(String(lead.uid))!.next_action}
                  </Badge>
                </div>
                {aiTriageExtras.get(String(lead.uid))!.insight && (
                  <div className="text-xs text-muted-foreground mb-1 italic">
                    {aiTriageExtras.get(String(lead.uid))!.insight}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {(aiTriageExtras.get(String(lead.uid))!.reasons || []).slice(0, 2).map((reason, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0.5">
                      {reason}
                    </Badge>
                  ))}
                </div>
                {aiTriageExtras.get(String(lead.uid))!.feature_coverage && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Feature Coverage: {Math.round((aiTriageExtras.get(String(lead.uid))!.feature_coverage || 0) * 100)}%
                  </div>
                )}
              </div>
            )}
          </td>
        </tr>
        {showContextMenu && (
          <div 
            role="menu"
            tabIndex={-1}
            onKeyDown={(e) => e.key === 'Escape' && setShowContextMenu(false)}
            className="fixed z-50 outline-none" 
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          >
            <div className="bg-card border border-border rounded-lg shadow-lg p-1 min-w-40">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 border-b border-border">
                Color Tag
              </div>
              {Object.entries(statusPalette).map(([key, status]) => (
                 <button
                  key={key}
                  role="menuitem"
                  onClick={() => assignColorTag(key)}
                   className={`w-full text-left py-1.5 px-2 rounded text-xs hover:bg-muted transition-colors duration-200 flex items-center gap-2 ${
                    getEffectiveTag(lead) === key ? 'bg-muted/50' : ''
                   }`}
                 >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: status.color }}
                  />
                   <div className="flex items-center gap-2">
                    {renderIcon(status.icon)}
                    <span>{status.name}</span>
                   </div>
                  {getEffectiveTag(lead) === key && <span className="ml-auto text-xs text-muted-foreground">•</span>}
                 </button>
               ))}
              <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 border-t border-border">
                User Tags
              </div>
              <div className="px-1 py-1 space-y-1">
                {userTags.length === 0 && (
                  <div className="text-xs text-muted-foreground px-2 py-1">No user tags</div>
                )}
                {userTags.map((t) => {
                  const assigned = (userTagAssignments[lead.uid] ?? []).includes(t.id);
                  return (
                    <label key={t.id} className="w-full flex items-center gap-2 py-1 px-2 rounded hover:bg-muted cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assigned}
                        onChange={(e) => toggleUserTag(t.id, e.target.checked)}
                      />
                      <span className="w-3 h-3 rounded" style={{ background: t.color }} />
                      <span className="text-xs">{t.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </>
    );
  });

  const ROW_HEIGHT = 80;
  const TableView = () => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [containerH, setContainerH] = useState(600);

    // ResizeObserver to make virtual list height responsive
    useEffect(() => {
      if (!scrollRef.current) return;
      const ro = new ResizeObserver(entries => {
        for (const e of entries) setContainerH(e.contentRect.height);
      });
      ro.observe(scrollRef.current);
      return () => ro.disconnect();
    }, []);

    const { visibleItems, totalHeight, offsetY, onScroll } = useVirtualScrolling(
      paginationData.paginatedLeads,
      ROW_HEIGHT,
      containerH,
      5
    );

    return (
      <div className="overflow-hidden">
      <div className="overflow-x-auto">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="relative"
            style={{ height: containerH, overflowY: "auto", willChange: "transform" }}
            aria-label="Lead table scroll region"
          >
        <table className="w-full">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-4 text-left">
                <Checkbox
                      onCheckedChange={(val) => {
                        const checked = val === true;
                      const visibleIds = new Set(paginationData.paginatedLeads.map(l => l.uid));
                      setSelectedLeads(prev => {
                          const next = new Set(prev);
                          if (checked) visibleIds.forEach(id => next.add(id));
                          else visibleIds.forEach(id => next.delete(id));
                          return next;
                        });
                      }}
                      checked={
                        paginationData.paginatedLeads.length > 0 &&
                        paginationData.paginatedLeads.every(l => selectedLeads.has(l.uid))
                      }
                      aria-label="Select page"
                />
              </th>
              <th
                className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-muted-foreground transition-colors duration-200"
                    onClick={() => setSort("name")}
              >
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline">Lead Details</span>
                  <span className="sm:hidden">Lead</span>
                  {sortBy === "name" && (
                        sortOrder === "asc"
                          ? <SortAsc className="h-4 w-4 text-muted-foreground" />
                          : <SortDesc className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course</th>
              <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[140px]">
                <div className="inline-flex items-center gap-2 justify-end">
                  <Brain className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">Conversion Prob</span>
                  <span className="sm:hidden">Convert</span>
                </div>
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[140px]">
                <div className="inline-flex items-center gap-2 justify-end">
                  <Brain className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">ML Prediction</span>
                  <span className="sm:hidden">ML</span>
                </div>
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[140px]">
                <div className="inline-flex items-center gap-2 justify-end">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">ML Confidence</span>
                  <span className="sm:hidden">Conf</span>
                </div>
              </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
              <tbody className="bg-background">
                <tr style={{ height: totalHeight }} aria-hidden />
              </tbody>
            </table>

            <div className="absolute left-0 right-0" style={{ transform: `translateY(${offsetY}px)` }}>
              <table className="w-full border-separate border-spacing-0">
                <tbody className="divide-y divide-border/70">
            {visibleItems.map((lead, index) => (
              <TableRow 
                key={lead.uid} 
                lead={lead} 
                index={index} 
                selected={selectedLeads.has(lead.uid)}
                onToggle={toggleLeadSelection}
              />
            ))}
          </tbody>
        </table>
            </div>
          </div>
      </div>
    </div>
  );
  };

  // Cards view implementation
  const CardsView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {paginationData.paginatedLeads.map((lead) => (
        <Card 
          key={lead.uid} 
          className={cn(
            "hover:shadow-lg transition-all duration-200 cursor-pointer",
            selectedLeads.has(lead.uid) && "ring-1 ring-inset ring-primary bg-primary/5",
            // Add subtle background tint for color-coded leads
            (() => {
              const effectiveTag = getEffectiveTag(lead);
              if (!effectiveTag) return "";
              const status = statusPalette[effectiveTag as keyof typeof statusPalette];
              if (!status) return "";
              return `bg-[${status.color}20]`;
            })()
          )}
          onClick={() => toggleLeadSelection(lead.uid)}
        >
          <CardContent className="p-4">
            {/* Header with avatar and selection */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center text-sm font-bold border border-border">
                  {lead.avatar || lead.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{lead.name}</h3>
                    {getEffectiveTag(lead) && <ColorTagIndicator tagId={getEffectiveTag(lead) || ""} />}
                  </div>
                  {/* Inline field-based tags under name (compact) */}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {(() => {
                      const keys = getSelectedInlineKeys(lead);
                      const all = getAvailableInlineTags(lead);
                      return keys
                        .filter(k => all[k] !== undefined)
                        .map(k => (
                          <Badge key={k} variant="secondary" className="text-[10px] px-1.5 py-0.5 capitalize">
                            {all[k]}
                          </Badge>
                        ));
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                </div>
              </div>
              <Checkbox
                checked={selectedLeads.has(lead.uid)}
                onCheckedChange={(val) => {
                  const checked = val === true;
                  if (checked) {
                    setSelectedLeads(prev => {
                      const newSet: Set<string> = new Set(prev);
                      newSet.add(lead.uid);
                      return newSet;
                    });
                  } else {
                    setSelectedLeads(prev => {
                      const newSet: Set<string> = new Set(prev);
                      newSet.delete(lead.uid);
                      return newSet;
                    });
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Course info */}
            <div className="mb-3">
              <p className="text-sm font-medium text-foreground">{lead.courseInterest}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{lead.academicYear}</Badge>
                <Badge variant="secondary" className="text-xs">{lead.campusPreference}</Badge>
              </div>
            </div>

            {/* AI Score and conversion */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Conversion Probability</span>
                <span className="text-sm font-bold text-foreground">
                  {isLoadingPredictions ? '...' : `${((lead.mlProbability || 0) * 100).toFixed(1)}%`}
                </span>
              </div>
              <Progress value={(lead.mlProbability || 0) * 100} className="h-1.5 mb-1" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">ML Prediction</span>
                {lead.colorTag && <ColorTagIndicator tagId={lead.colorTag} />}
              </div>
            </div>

            {/* Status and SLA */}
            <div className="mb-3">
              <div className="flex items-center gap-1 flex-wrap mb-1">
                <StatusBadge status={lead.status} statusType={lead.statusType} />
                <SLABadge sla={lead.slaStatus} />
              </div>
              {aiTriageExtras.has(String(lead.uid)) && (
                <div className="text-xs text-muted-foreground">
                  NBA: {aiTriageExtras.get(String(lead.uid))!.next_action}
                </div>
              )}
            </div>

            {/* Debug: Show if AI data exists (development only) */}
            {import.meta.env.DEV && (
              <div className="text-xs text-muted-foreground mb-2">
                AI Data: {aiTriageExtras.has(String(lead.uid)) ? 'YES' : 'NO'} (UID: {lead.uid})
              </div>
            )}

            {/* AI Insights (compact) */}
            {aiTriageExtras.has(String(lead.uid)) && (
              <div className="mb-3 p-2 bg-muted/30 rounded border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-3 w-3 text-accent" />
                  <span className="text-xs font-medium text-foreground">
                    ML Score: {aiTriageExtras.get(String(lead.uid))!.score}%
                  </span>
                  {aiTriageExtras.get(String(lead.uid))!.ml_confidence && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0.5">
                      {Math.round((aiTriageExtras.get(String(lead.uid))!.ml_confidence || 0) * 100)}%
                    </Badge>
                  )}
                </div>
                {aiTriageExtras.get(String(lead.uid))!.insight && (
                  <div className="text-xs text-muted-foreground mb-1 italic">
                    {aiTriageExtras.get(String(lead.uid))!.insight}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {(aiTriageExtras.get(String(lead.uid))!.reasons || []).slice(0, 2).map((reason, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0.5">
                      {reason}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    Next: {aiTriageExtras.get(String(lead.uid))!.next_action}
                  </span>
                  {aiTriageExtras.get(String(lead.uid))!.feature_coverage && (
                    <span className="text-[10px] text-muted-foreground">
                      Coverage: {Math.round((aiTriageExtras.get(String(lead.uid))!.feature_coverage || 0) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1">
                          <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 hover:bg-[hsl(var(--success))]/10 hover:text-[hsl(var(--success))]"
              onClick={(e) => {
                e.stopPropagation();
                handlePhoneClick(lead);
              }}
            >
              <Phone className="h-3 w-3" />
            </Button>
                          <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-600"
              onClick={(e) => {
                e.stopPropagation();
                handleEmailClick(lead);
              }}
            >
              <Mail className="h-3 w-3" />
            </Button>
                          <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 hover:bg-[hsl(var(--warning))]/10 hover:text-[hsl(var(--warning))]"
              onClick={(e) => {
                e.stopPropagation();
                handleMeetingClick(lead);
              }}
            >
              <Calendar className="h-3 w-3" />
            </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-foreground hover:text-background" aria-label="Open actions menu">
                    <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    lead.uid && navigate(`/directory/${lead.uid}`);
                  }}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Person Record
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Compact view implementation
  const CompactView = () => (
    <div className="flex flex-col gap-2">
      {paginationData.paginatedLeads.map((lead) => {
        const effectiveTag = getEffectiveTag(lead);
        return (
        <div
          key={lead.uid}
          className={cn(
              "grid items-center gap-x-4 grid-cols-[auto,1fr,auto,auto] min-h-[72px] px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200 cursor-pointer tabular-nums ring-1 ring-inset ring-transparent focus-within:ring-slate-300",
              selectedLeads.has(lead.uid) && "ring-1 ring-inset ring-primary bg-primary/5"
          )}
          onClick={() => toggleLeadSelection(lead.uid)}
            onMouseEnter={() => { focusedLeadRef.current = lead; }}
            onFocus={() => { focusedLeadRef.current = lead; }}
        >
          {/* Lane 1: select + avatar */}
          <div className="flex items-center gap-3">
          <Checkbox
            checked={selectedLeads.has(lead.uid)}
              onCheckedChange={(val) => {
                const checked = val === true;
                setSelectedLeads(prev => {
                  const s = new Set(prev);
                  checked ? s.add(lead.uid) : s.delete(lead.uid);
                  return s;
                });
            }}
            onClick={(e) => e.stopPropagation()}
          />
            <div className="h-8 w-8 rounded-full bg-slate-100 grid place-items-center text-[11px] font-semibold">
              {lead.name.split(' ').map(w => w[0]).slice(0,2).join('')}
            </div>
          </div>
          
          {/* Lane 2: identity (name + tags) */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="font-medium text-slate-900 hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  lead.uid && navigate(`/directory/${lead.uid}`);
                }}
                title="View person record"
              >
                {lead.name}
              </button>
              {effectiveTag && <ColorTagIndicator tagId={effectiveTag} />}
              {/* Inline field tags (DB-backed) - now on the same line */}
              {(() => {
                const keys = getSelectedInlineKeys(lead);
                const all = getAvailableInlineTags(lead);
                const selectedTags = keys.filter(k => all[k] !== undefined);
                return selectedTags.map(k => (
                  <Badge key={k} variant="secondary" className="text-[10px] px-1.5 py-0.5 capitalize">
                    {all[k]}
                  </Badge>
                ));
              })()}
              {/* Picker */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Edit inline tags">
                    <PlusIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {[
                    { key: "course", label: "Course", value: lead.courseInterest },
                    { key: "campus", label: "Campus", value: lead.campusPreference },
                    { key: "year", label: "Year", value: lead.academicYear },
                    { key: "status", label: "Status", value: lead.status },
                    { key: "lifecycle", label: "Lifecycle", value: lead.lifecycle_state?.replaceAll('_',' ') },
                    { key: "source", label: "Source", value: lead.leadSource },
                    { key: "score", label: "Score", value: lead.leadScore ? `${lead.leadScore}` : undefined },
                    { key: "stage", label: "Stage", value: lead.enquiryType }
                  ].map(({ key, label, value }) => {
                    const selected = getSelectedInlineKeys(lead).includes(key);
                    const displayValue = value || `(empty)`;
                    return (
                      <DropdownMenuItem key={key} onClick={(e) => { e.stopPropagation(); toggleInlineTag(lead.uid, key); }}>
                        <span className="text-xs">{label}: {displayValue}</span>
                        <span className="ml-auto text-xs">{selected ? "−" : "+"}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Lane 3: Empty - tags now live in Lane 2 with the name */}
          <div className="flex items-center gap-2 overflow-hidden">
            {/* This space is now available for future features */}
            </div>
            
          {/* Lane 4: right-hand stack (status + ML + actions) */}
          <div className="flex items-center justify-end gap-3">
            {/* Status badges with colors */}
            <div className="flex items-center gap-1.5">
            <StatusBadge status={lead.status} statusType={lead.statusType} />
              <SLABadge sla={slaOverrides[lead.uid] ?? lead.slaStatus} />
          </div>
          
            {/* ML block with proper layout */}
            <MLProbability 
              value={lead.mlProbability} 
              loading={isLoadingPredictions && (lead.mlProbability === undefined || lead.mlProbability === null)}
              lead={lead}
            />

            {/* Actions (fixed size icons) */}
            <div className="flex items-center gap-2 pl-1">
              <IconButton icon="phone" onClick={() => handlePhoneClick(lead)} />
              <IconButton icon="mail" onClick={() => handleEmailClick(lead)} />
              <IconButton icon="calendar" onClick={() => handleMeetingClick(lead)} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50" aria-label="Open actions menu">
                    <MoreHorizontal className="h-[18px] w-[18px] stroke-[1.6]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                    lead.uid && navigate(`/directory/${lead.uid}`);
                  }}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Person Record
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setColorOverride(lead.uid, "priority"); }}>Mark Priority</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </div>

        {/* AI Insights - Using Bluey Slate Colors */}
            {aiTriageExtras.has(String(lead.uid)) && (
          <div className="col-span-4 mt-3">
            <div className="bg-[hsl(var(--surface-tertiary))] border border-[hsl(var(--semantic-info))]/20 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[hsl(var(--brand-accent))]/10 flex items-center justify-center">
                    <Brain className="h-3.5 w-3.5 text-[hsl(var(--brand-accent))]" />
              </div>
                  <span className="text-sm font-semibold text-[hsl(var(--text-primary))]">
                    {aiTriageExtras.get(String(lead.uid))!.score}%
                  </span>
                  <span className="text-xs text-[hsl(var(--text-primary))] font-medium">ML Score</span>
                </div>
                <div className="flex items-center gap-2">
                  {aiTriageExtras.get(String(lead.uid))!.escalate_to_interview && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[hsl(var(--brand-accent))]/10 text-[hsl(var(--brand-accent))] border border-[hsl(var(--brand-accent))]/20">Interview</span>
                  )}
                  <div className="text-xs text-[hsl(var(--text-primary))] bg-[hsl(var(--semantic-info))]/10 px-2 py-1 rounded-md font-medium capitalize">
                    {aiTriageExtras.get(String(lead.uid))!.next_action.replace(/_/g, ' ')}
                  </div>
                </div>
          </div>
          
              {aiTriageExtras.get(String(lead.uid))!.insight && (
                <div className="text-xs text-[hsl(var(--text-primary))] mb-2 leading-relaxed">
                  {aiTriageExtras.get(String(lead.uid))!.insight}
          </div>
              )}
              
              <div className="flex flex-wrap gap-1.5">
                {(aiTriageExtras.get(String(lead.uid))!.reasons || []).slice(0, 3).map((reason, i) => (
                  <div key={i} className="text-[11px] text-[hsl(var(--text-primary))] bg-white border border-[hsl(var(--semantic-info))]/20 px-2 py-0.5 rounded-md">
                    {reason}
        </div>
      ))}
              </div>

              {/* Action Rationale */}
              {aiTriageExtras.get(String(lead.uid))!.action_rationale && (
                <div className="mt-1 text-[11px] text-[hsl(var(--text-primary))] leading-relaxed">
                  {aiTriageExtras.get(String(lead.uid))!.action_rationale}
                </div>
              )}

              {/* Suggested Content */}
              {aiTriageExtras.get(String(lead.uid))!.suggested_content && (
                <div className="mt-2 p-2 bg-[hsl(var(--semantic-info))]/5 border border-[hsl(var(--semantic-info))]/20 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-4 h-4 rounded-full bg-[hsl(var(--semantic-info))]/20 flex items-center justify-center">
                      <FileText className="h-2.5 w-2.5 text-[hsl(var(--semantic-info))]" />
                    </div>
                    <span className="text-[11px] font-medium text-[hsl(var(--text-primary))]">Suggested Content</span>
                  </div>
                  <div className="text-[11px] text-[hsl(var(--text-primary))] leading-relaxed">
                    {aiTriageExtras.get(String(lead.uid))!.suggested_content}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[hsl(var(--semantic-info))]/20">
                <div className="text-[10px] text-[hsl(var(--text-primary))]/70">
                  Confidence: {Math.round((aiTriageExtras.get(String(lead.uid))!.ml_confidence || 0) * 100)}%
                </div>
                {aiTriageExtras.get(String(lead.uid))!.feature_coverage && (
                  <div className="text-[10px] text-[hsl(var(--text-primary))]/70">
                    Coverage: {Math.round((aiTriageExtras.get(String(lead.uid))!.feature_coverage || 0) * 100)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
        );
      })}
    </div>
  );

  // Editable Lead Card View - New functionality for inline editing
  const EditableLeadView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Edit Lead Information</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMLPredictions}
          disabled={isLoadingPredictions}
          className="gap-2"
        >
          <Brain className="h-4 w-4" />
          {isLoadingPredictions ? 'Loading ML...' : 'Refresh ML'}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {paginationData.paginatedLeads.slice(0, 4).map((lead) => {
          // Convert the Lead type to PersonEnriched for the EditableLeadCard
          const personEnriched: any = {
            id: lead.uid,
            first_name: lead.name.split(' ')[0] || '',
            last_name: lead.name.split(' ').slice(1).join(' ') || '',
            email: lead.email,
            phone: lead.phone,
            lifecycle_state: 'enquiry',
            lead_score: lead.leadScore,
            conversion_probability: lead.aiInsights.conversionProbability / 100,
            status: lead.statusType,
            created_at: lead.createdDate,
            last_activity_at: lead.lastContact
          };
          
          return (
            <EditableLeadCard
              key={lead.uid}
              lead={personEnriched}
              onUpdate={(updatedLead) => {
                console.log('Lead updated:', updatedLead);
                // In a real app, you might want to update the local state here
              }}
              onRefresh={handleRefresh}
            />
          );
        })}
      </div>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>This view demonstrates the new bidirectional data flow capabilities.</p>
        <p>Edit lead information inline and see updates reflected in Supabase in real-time.</p>
      </div>
    </div>
  );

  const FilterChips = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      {activeFilters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted transition-colors duration-200"
          onClick={() => removeFilter(filter.key)}
        >
          {filter.label}: {filter.value}
          <X className="h-3 w-3" />
        </Badge>
      ))}
      {activeFilters.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          Clear all
        </Button>
      )}
    </div>
  );

  const SearchSuggestions = () => (
    showSearchSuggestions && searchSuggestions.length > 0 && (
      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
        {searchSuggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.type}-${index}`}
            className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors duration-200 flex items-center justify-between"
            onMouseDown={(e) => {
              e.preventDefault();
              setSearchTerm(suggestion.value);
              setShowSearchSuggestions(false);
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded bg-muted">
                {suggestion.type === "course" && <BookmarkPlus className="h-3 w-3 text-muted-foreground" />}
                {suggestion.type === "campus" && <Target className="h-3 w-3 text-muted-foreground" />}
                {suggestion.type === "source" && <Zap className="h-3 w-3 text-muted-foreground" />}
              </div>
              <span className="text-sm font-medium text-foreground">{suggestion.value}</span>
              <span className="text-xs text-muted-foreground capitalize">({suggestion.type})</span>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {suggestion.count}
            </span>
          </button>
        ))}
      </div>
    )
  );


  // Consolidated Actions Menu (Apple-style)
  const ActionsMenu = () => (
    showActionsMenu && (
      <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 min-w-48">
        <div className="p-2 space-y-1">
          <button
            onClick={() => {
              setShowActionsMenu(false);
              setShowAddLeadDialog(true);
            }}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-foreground hover:text-background rounded-md transition-colors duration-200 flex items-center gap-3"
          >
            <Plus className="h-4 w-4" />
            Add Lead
          </button>
          <button
            onClick={() => {
              setShowActionsMenu(false);
              setShowSaveViewModal(true);
            }}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-foreground hover:text-background rounded-md transition-colors duration-200 flex items-center gap-3"
          >
            <Save className="h-4 w-4" />
            Save View
          </button>
          <button
            onClick={() => {
              setShowActionsMenu(false);
              setShowExportDialog(true);
            }}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-foreground hover:text-background rounded-md transition-colors duration-200 flex items-center gap-3"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <div className="border-t border-border my-1"></div>
          {/* Analytics removed - moved to separate Analytics section in nav */}
        </div>
      </div>
    )
  );

  const KeyboardShortcutsHelp = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <Card className="w-96 border-0 shadow-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-slate-900">Keyboard Shortcuts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-800 mb-2">General</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Search</span>
              <kbd className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">⌘K</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Toggle Filters</span>
              <kbd className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">⌥F</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Select All</span>
              <kbd className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">⌘A</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Clear Search</span>
              <kbd className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">Esc</kbd>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-800 mb-2">Row Actions (when lead selected)</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Call Lead</span>
              <kbd className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">⌘P</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Email Lead</span>
              <kbd className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">⌘E</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Book Meeting</span>
              <kbd className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">⌘M</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Toggle Urgent</span>
              <kbd className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">⌘U</kbd>
            </div>
          </div>
          <Button 
            className="w-full mt-4" 
            onClick={() => setShowKeyboardShortcuts(false)}
          >
            Got it
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Enhanced Analytics Data
  const analyticsData = useMemo(() => {
    const now = new Date();
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    // Conversion trends over time
    const conversionTrends = last30Days.map(date => {
      const dayLeads = datasetLeads.filter(lead => {
        const created = (lead.createdDate ?? '').toString();
        if (!created) return false;
        const createdDateOnly = created.slice(0, 10);
        return createdDateOnly === date;
      });
      const converted = dayLeads.filter(lead => 
        lead.statusType === "qualified" || lead.statusType === "nurturing"
      );
      return {
        date,
        leads: dayLeads.length,
        converted: converted.length,
        rate: dayLeads.length > 0 ? (converted.length / dayLeads.length) * 100 : 0
      };
    });

    // Lead source performance
    const sourcePerformance = Object.entries(
      datasetLeads.reduce((acc, lead) => {
        acc[lead.leadSource] = (acc[lead.leadSource] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
    .map(([source, count]) => ({
      source,
      count,
      conversionRate: (() => {
        const sourceLeads = datasetLeads.filter(l => l.leadSource === source);
        const converted = sourceLeads.filter(l => 
          l.statusType === "qualified" || l.statusType === "nurturing"
        );
        return sourceLeads.length > 0 ? (converted.length / sourceLeads.length) * 100 : 0;
      })()
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate);

    // Course performance
    const coursePerformance = Object.entries(
      datasetLeads.reduce((acc, lead) => {
        acc[lead.courseInterest] = (acc[lead.courseInterest] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
    .map(([course, count]) => ({
      course,
      count,
      avgScore: datasetLeads
        .filter(l => l.courseInterest === course)
        .reduce((sum, l) => sum + l.leadScore, 0) / count
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

    // AI-generated insights
    const insights = [
      {
        id: "1",
        type: "opportunity" as const,
        title: "High-Value Lead Cluster Detected",
        description: "5 leads from Brighton campus with 80+ scores are showing strong engagement signals. Consider expedited follow-up.",
        impact: "high" as const,
        confidence: 87,
        action: "Schedule priority calls within 24h",
        priority: 1
      },
      {
        id: "2",
        type: "trend" as const,
        title: "Music Production Course Surge",
        description: "23% increase in Music Production inquiries this week. Source: Google Ads performing exceptionally well.",
        impact: "medium" as const,
        confidence: 92,
        action: "Increase Google Ads budget for Music Production",
        priority: 2
      },
      {
        id: "3",
        type: "risk" as const,
        title: "SLA Breach Risk",
        description: "12 leads approaching 24h SLA threshold. Current response time: 18.5 hours average.",
        impact: "high" as const,
        confidence: 78,
        action: "Immediate outreach to prevent SLA breaches",
        priority: 1
      },
      {
        id: "4",
        type: "recommendation" as const,
        title: "Optimal Contact Timing",
        description: "Leads respond 3.2x better between 6-8 PM on weekdays. Current contact attempts: 40% outside optimal window.",
        impact: "medium" as const,
        confidence: 85,
        action: "Adjust contact scheduling to target 6-8 PM window",
        priority: 3
      }
    ];

    return {
      conversionTrends,
      sourcePerformance,
      coursePerformance,
      insights
    };
  }, [datasetLeads]);

  // AI Insights Component
  const AIInsightsPanel = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-semibold text-foreground">AI Insights & Recommendations</h3>
        <Badge variant="outline" className="ml-auto">
          <Sparkles className="h-3 w-3 mr-1" />
          Powered by AI
        </Badge>
      </div>
      
      <div className="space-y-3">
        {analyticsData.insights.map((insight) => (
          <Card key={insight.id} className="border-l-4 border-l-accent hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {insight.type === "opportunity" && <ArrowUpRight className="h-4 w-4 text-success" />}
                  {insight.type === "risk" && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  {insight.type === "recommendation" && <Lightbulb className="h-4 w-4 text-warning" />}
                  {insight.type === "trend" && <TrendingUp className="h-4 w-4 text-info" />}
                  <span className="text-sm font-medium text-foreground capitalize">{insight.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={insight.impact === "high" ? "destructive" : insight.impact === "medium" ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {insight.impact} impact
                  </Badge>
                  <span className="text-xs text-muted-foreground">{insight.confidence}% confidence</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{insight.action}</span>
                <Button size="sm" variant="outline" className="h-8">
                  Take Action
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Conversion Funnel Chart
  const ConversionFunnelChart = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          Conversion Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {[
            { stage: "Total Leads", count: stats.total, color: "bg-muted-foreground" },
            { stage: "Contacted", count: datasetLeads.filter(l => l.statusType === "contacted").length, color: "bg-[hsl(var(--info))]" },
            { stage: "Qualified", count: datasetLeads.filter(l => l.statusType === "qualified").length, color: "bg-[hsl(var(--success))]" },
            { stage: "Nurturing", count: datasetLeads.filter(l => l.statusType === "nurturing").length, color: "bg-[hsl(var(--accent))]" },
            { stage: "Converted", count: datasetLeads.filter(l => l.statusType === "qualified" && l.leadScore >= 80).length, color: "bg-[hsl(var(--success))]" }
          ].map((item, index) => {
            const percentage = (item.count / stats.total) * 100;
            return (
              <div key={item.stage} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{item.stage}</span>
                  <span className="text-muted-foreground">{item.count} ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`${item.color} h-2 rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  // Lead Source Performance Chart
  const LeadSourceChart = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-muted-foreground" />
          Lead Source Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {analyticsData.sourcePerformance.slice(0, 5).map((source, index) => (
            <div key={source.source} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  index === 0 ? 'bg-[hsl(var(--success))]' : 
                  index === 1 ? 'bg-[hsl(var(--info))]' : 
                  index === 2 ? 'bg-[hsl(var(--accent))]' : 
                  index === 3 ? 'bg-[hsl(var(--warning))]' : 'bg-muted-foreground'
                }`} />
                <span className="text-sm font-medium text-foreground">{source.source}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-foreground">{source.count}</div>
                <div className="text-xs text-muted-foreground">{source.conversionRate.toFixed(1)}% conv.</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Course Performance Chart
  const CoursePerformanceChart = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-muted-foreground" />
          Course Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {analyticsData.coursePerformance.slice(0, 6).map((course, index) => (
            <div key={course.course} className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground truncate flex-1">{course.course}</span>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">{course.count}</div>
                  <div className="text-xs text-muted-foreground">{course.avgScore.toFixed(0)} avg score</div>
                </div>
                <div className={`w-2 h-8 rounded-full ${
                  course.avgScore >= 80 ? 'bg-[hsl(var(--success))]' : 
                  course.avgScore >= 60 ? 'bg-[hsl(var(--info))]' : 
                  course.avgScore >= 40 ? 'bg-[hsl(var(--warning))]' : 'bg-muted-foreground'
                }`} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Trends Over Time Chart
  const TrendsChart = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          Lead Trends (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>New Leads</span>
            <span>Conversion Rate</span>
          </div>
          <div className="space-y-2">
            {analyticsData.conversionTrends.slice(-7).map((day) => (
              <div key={day.date} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16">{new Date(day.date ?? '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div 
                    className="bg-[hsl(var(--info))] h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(day.leads / Math.max(...analyticsData.conversionTrends.map(d => d.leads))) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{day.leads}</span>
                <span className="text-xs text-muted-foreground w-16 text-right">{day.rate.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Analytics Dashboard
  const AnalyticsDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Analytics & Insights</h2>
        <div className="flex gap-2">
          {["conversion", "trends", "sources", "ai-insights"].map((chart) => (
            <Button
              key={chart}
              variant={selectedChart === chart ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedChart(chart as any)}
              className="capitalize"
            >
              {chart.replace("-", " ")}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedChart === "conversion" && <ConversionFunnelChart />}
        {selectedChart === "trends" && <TrendsChart />}
        {selectedChart === "sources" && <LeadSourceChart />}
        {selectedChart === "ai-insights" && <AIInsightsPanel />}
        
        {selectedChart !== "ai-insights" && (
          <div className="space-y-6">
            <CoursePerformanceChart />
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Response Time Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">2.4h</div>
                    <div className="text-sm text-muted-foreground">Avg Response</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-destructive">12</div>
                    <div className="text-sm text-muted-foreground">SLA Breaches</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Response Time Target</span>
                    <span className="font-medium text-foreground">24h</span>
                  </div>
                  <Progress value={85} className="h-2" />
                  <div className="text-xs text-muted-foreground text-right">85% within target</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );

  // Optimized search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSearchSuggestions(value.length > 0);
    
    // Reset to first page when searching
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [currentPage]);

  // Optimized filter handlers
  const handleFilterChange = useCallback((filterType: string, value: string) => {
    setIsLoading(true);
    
    // Use setTimeout to batch filter changes
    setTimeout(() => {
      switch (filterType) {
        case 'status':
          setSelectedStatus(value);
          break;
        case 'source':
          setSelectedSource(value);
          break;
        case 'course':
          setSelectedCourse(value);
          break;
        case 'year':
          setSelectedYear(value);
          break;
      }
      
      setCurrentPage(1);
      setIsLoading(false);
    }, 100);
  }, []);

  // AI Triage Function
  const handleAiTriage = async () => {
    if (paginationData.paginatedLeads.length === 0) return;
    
    console.log("🚀 Starting AI triage...");
    setIsAiTriageLoading(true);
    try {
      // Analyze ALL filtered leads so results persist across pagination
      const visibleLeadIds = filteredLeads.map(l => l.uid);
      const payload = {
        lead_ids: visibleLeadIds,
        filters: {
          status: selectedStatus === "all" ? undefined : selectedStatus,
          source: selectedSource === "all" ? undefined : selectedSource,
          course: selectedCourse === "all" ? undefined : selectedCourse,
          year: selectedYear === "all" ? undefined : selectedYear,
          stalled_days_gte: urgentOnly ? 12 : undefined,
        }
      };

      console.log("📤 Sending payload:", payload);
      console.log("🌐 Calling:", `${API_BASE}/ai/leads/triage`);

      const json = await api<{ 
        summary: { cohort_size: number; top_reasons: string[] }; 
        items: { 
          id: string; 
          score: number; 
          reasons: string[];
          next_action: string;
          ml_confidence?: number;
          ml_probability?: number;
          ml_calibrated?: number;
          insight?: string;
          suggested_content?: string;
          action_rationale?: string;
          escalate_to_interview?: boolean;
          feature_coverage?: number;
        }[]
      }>('/ai/leads/triage', {
        method: "POST",
        body: JSON.stringify(payload)
      });

      console.log("🎯 AI Response:", json);
      console.log("🔍 Sample lead UIDs from frontend:", paginationData.paginatedLeads.slice(0, 3).map(l => l.uid));
      console.log("🔍 Sample IDs from AI response:", json.items.slice(0, 3).map(x => x.id));

      // Create ranking map for reordering (use UUIDs directly)
      const rank = new Map(
        json.items.map((x, i) => {
          // Use the UUID directly as the key since we're now using uid in the frontend
          const key = String(x.id);
          return [key, { 
            i, 
            score: x.score, 
            reasons: x.reasons, 
            next_action: x.next_action,
            ml_confidence: x.ml_confidence,
            ml_probability: x.ml_probability,
            ml_calibrated: x.ml_calibrated,
            insight: x.insight,
            suggested_content: x.suggested_content,
            action_rationale: x.action_rationale,
            escalate_to_interview: x.escalate_to_interview,
            feature_coverage: x.feature_coverage
          }];
        })
      );
      
      console.log("🗺️ Ranking map:", rank);
      console.log("🔍 First few items in rank:", Array.from(rank.entries()).slice(0, 3));
      setAiTriageExtras(rank);
      setAiTriageSummary(json.summary);
      setIsAiReordered(true);

      // Add AI insight card
      setAiInsights(prev => [
        ...prev.filter(x => x.type !== "recommendation"),
        {
          id: "triage-summary",
          type: "recommendation",
          title: "AI Explanations Generated",
          description: `Generated AI explanations for ${json.summary.cohort_size} leads. Top drivers: ${json.summary.top_reasons?.join(", ") || "High lead scores"}`,
          impact: "high",
          confidence: 90,
          action: "Work top 20 first",
          priority: 1
        }
      ] as any);

      console.log("✅ AI triage completed successfully!");

    } catch (error) {
      console.error("❌ AI triage error:", error);
      // Add error insight
      setAiInsights(prev => [
        ...prev.filter(x => x.id !== "triage-error"),
        {
          id: "triage-error",
          type: "risk",
          title: "AI Triage Failed",
          description: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          impact: "medium",
          confidence: 100,
          action: "Check backend logs",
          priority: 1
        }
      ] as any);
    } finally {
      setIsAiTriageLoading(false);
    }
  };

  // AI Outreach Composition
  const handleAiOutreach = async (intent: "book_interview" | "nurture" | "reengage" = "nurture") => {
    if (selectedLeads.size === 0) return;
    
    try {
      const leadIds = Array.from(selectedLeads); // these are uuids
      const uuids = leadIds;
      const draft = await api<{ content: string; subject?: string }>('/ai/leads/compose/outreach', {
        method: "POST",
        body: JSON.stringify({ 
          lead_ids: uuids,
          intent 
        })
      });
      
      // For now, just show the draft in console and alert
      // You can integrate this with your email composer later
      console.log("AI Draft:", draft);
      
    } catch (error) {
      console.error("AI outreach error:", error);
    }
  };

  // Bulk Color Tag Assignment
  const handleBulkColorTagAssignment = () => {
    if (selectedLeads.size === 0) return;
    setShowColorTagModal(true);
  };

  const assignColorTagToSelected = (colorTagId: string) => {
    Array.from(selectedLeads).forEach(uid => setColorOverride(uid, colorTagId));
    setShowColorTagModal(false);
    setSelectedLeads(new Set());
  };

  // Bulk user-tag assignment modal state
  const [showBulkUserTags, setShowBulkUserTags] = useState(false);
  const [bulkUserTagIds, setBulkUserTagIds] = useState<string[]>([]);
  const openBulkUserTagModal = () => {
    if (selectedLeads.size === 0) return;
    setShowBulkUserTags(true);
  };
  const applyBulkUserTags = () => {
    const ids = Array.from(selectedLeads);
    ids.forEach(uid => {
      bulkUserTagIds.forEach(tagId => assignUserTag(uid, tagId, true));
    });
    setShowBulkUserTags(false);
    setBulkUserTagIds([]);
  };

       // Helper function to render icons based on string names
  const renderIcon = (iconName: string, className: string = "h-3 w-3") => {
    switch (iconName) {
      case "AlertTriangle": return <AlertTriangle className={className} />;
      case "Zap": return <Zap className={className} />;
      case "CheckCircle2": return <CheckCircle2 className={className} />;
      case "Sprout": return <Sprout className={className} />;
      case "MessageCircle": return <MessageCircle className={className} />;
      case "Search": return <Search className={className} />;
      case "Snowflake": return <Snowflake className={className} />;
      case "Star": return <Star className={className} />;
      case "Target": return <Target className={className} />;
      default: return <Star className={className} />;
    }
  };

  const ColorTagIndicator = ({ tagId }: { tagId: string }) => {
    const status = statusPalette[tagId as keyof typeof statusPalette];
    if (!status) return null;
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm cursor-help ring-1 ring-border"
            style={{ backgroundColor: status.color }}
          />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="flex items-center gap-2 mb-1">
            {renderIcon(status.icon)}
            <span className="font-semibold">{status.name}</span>
          </div>
          <p className="text-xs text-muted-foreground">{status.description}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  // Email Composer State
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Enquiry | null>(null);

  // Call Composer State
  const [showCallConsole, setShowCallConsole] = useState(false);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<Enquiry | null>(null);

  // Meeting Booker State
  const [showMeetingBooker, setShowMeetingBooker] = useState(false);
  const [selectedLeadForMeeting, setSelectedLeadForMeeting] = useState<Enquiry | null>(null);


  // Handle Email Send
  const handleEmailSend = async (emailData: any) => {
    try {
      // In a real app, you'd send this via your email service
      console.log("Sending email:", {
        to: emailData.lead.email,
        subject: emailData.subject,
        body: emailData.body,
        lead: emailData.lead.name
      });
      
      // Log the email activity
      console.log(`Email sent to ${emailData.lead.name} for ${emailData.intent}`);
      
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error; // Re-throw to let EmailComposer handle the error
    }
  };

  // Handle Call Save (now works with CallConsole)
  const handleCallSave = async (callData: any) => {
    try {
      // The CallConsole already saves to the backend via API
      // This function can be used for additional local handling
      console.log("Call completed:", {
        lead: callData.lead?.name,
        callType: callData.callType,
        outcome: callData.outcome?.type,
        duration: callData.duration,
        notes: callData.notes?.length ?? 0,
        timestamp: callData.timestamp,
        compliance: callData.compliance,
      });
      
      // Log the call activity
      console.log(`Call with ${callData.lead?.name ?? "Unknown"} completed successfully`);
      
      // You could add additional logic here like:
      // - Refresh the leads list
      // - Update local state
      // - Show success notifications
      
    } catch (error) {
      console.error("Failed to handle call completion:", error);
      // Don't re-throw as CallConsole handles its own errors
    }
  };

  // Handle Meeting Book
  const handleMeetingBook = async (meetingData: any) => {
    try {
      // In a real app, you'd save this meeting data to your CRM and calendar
      console.log("Booking meeting:", {
        lead: meetingData.leadId,
        meetingType: meetingData.meetingType.name,
        date: meetingData.date,
        time: meetingData.startTime,
        location: meetingData.location,
        agenda: meetingData.agenda
      });
      
      // Log the meeting booking
      console.log(`Meeting scheduled with lead ${meetingData.leadId} for ${meetingData.meetingType.name}`);
      
    } catch (error) {
      console.error("Failed to book meeting:", error);
      throw error;
    }
  };






  // Add Lead / Export dialogs
  const [showAddLeadDialog, setShowAddLeadDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [newLead, setNewLead] = useState({ first: "", last: "", email: "", course: "", campus: "" });
  const [exportScope, setExportScope] = useState<"current" | "all">("current");
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");

  // Select All dialog
  const [showSelectAllDialog, setShowSelectAllDialog] = useState(false);

  // Sort menu
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // Save view form state
  const [saveViewForm, setSaveViewForm] = useState({
    name: "",
    description: "",
    folderId: "my-views",
    isDefault: false,
    isTeamDefault: false,
  });

  // Create folder form state
  const [createFolderForm, setCreateFolderForm] = useState({
    name: "",
    type: "personal" as SavedFolder['type'],
  });

  // View actions state
  const [showRenameViewModal, setShowRenameViewModal] = useState(false);
  const [editingView, setEditingView] = useState<SavedView | null>(null);
  const [renameViewForm, setRenameViewForm] = useState({
    name: "",
    description: "",
  });

  const handleSaveView = useCallback(async () => {
    if (!saveViewForm.name || !saveViewForm.folderId) return;
    await saveCurrentViewToFolder(
      saveViewForm.folderId,
      saveViewForm.name,
      saveViewForm.description,
      { isDefault: saveViewForm.isDefault, isTeamDefault: saveViewForm.isTeamDefault }
    );
    setShowSaveViewModal(false);
    setSaveViewForm({ name: "", description: "", folderId: "my-views", isDefault: false, isTeamDefault: false });
    push({ title: "View saved", description: `"${saveViewForm.name}" added`, variant: "success" });
    if (persistenceMode === 'api') hydrateSaved();
  }, [saveViewForm, saveCurrentViewToFolder, push, persistenceMode, hydrateSaved]);

  // View action functions
  const handleRenameView = useCallback((view: SavedView) => {
    setEditingView(view);
    setRenameViewForm({ name: view.name, description: view.description || "" });
    setShowRenameViewModal(true);
  }, []);

  const handleUpdateView = useCallback(async () => {
    if (!editingView || !renameViewForm.name.trim()) return;
    
    const updatedView = { ...editingView, name: renameViewForm.name.trim(), description: renameViewForm.description.trim() || undefined };
    
    // Update in savedFolders
    setSavedFolders(prev => {
      const next = prev.map(folder => ({
        ...folder,
        views: folder.views.map(view => view.id === editingView.id ? updatedView : view)
      }));
      safeSet('leadSavedFolders', JSON.stringify(next));
      return next;
    });

    // If this is the current view, update it
    if (currentView?.id === editingView.id) {
      setCurrentView(updatedView);
    }

    setShowRenameViewModal(false);
    setEditingView(null);
    setRenameViewForm({ name: "", description: "" });
    push({ title: "View updated", description: `"${updatedView.name}" has been updated`, variant: "success" });
  }, [editingView, renameViewForm, currentView, push]);

  const handleDeleteView = useCallback((view: SavedView) => {
    if (window.confirm(`Are you sure you want to delete "${view.name}"? This action cannot be undone.`)) {
      setSavedFolders(prev => {
        const next = prev.map(folder => ({
          ...folder,
          views: folder.views.filter(v => v.id !== view.id)
        }));
        safeSet('leadSavedFolders', JSON.stringify(next));
        return next;
      });

      // If this is the current view, clear it
      if (currentView?.id === view.id) {
        setCurrentView(null);
      }

      push({ title: "View deleted", description: `"${view.name}" has been deleted`, variant: "success" });
    }
  }, [currentView, push]);

  const handleDuplicateView = useCallback((view: SavedView) => {
    const duplicatedView = {
      ...view,
      id: crypto.randomUUID(),
      name: `${view.name} (Copy)`,
      created: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    };

    // Find the folder containing this view and add the duplicate
    setSavedFolders(prev => {
      const next = prev.map(folder => {
        if (folder.views.some(v => v.id === view.id)) {
          return { ...folder, views: [duplicatedView, ...folder.views] };
        }
        return folder;
      });
      safeSet('leadSavedFolders', JSON.stringify(next));
      return next;
    });

    push({ title: "View duplicated", description: `"${duplicatedView.name}" has been created`, variant: "success" });
  }, [push]);

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gradient-to-br from-background via-background to-muted/30">
        {/* Saved Views Sidebar (left) */}
        {showSavedViews ? (
          <SavedViewsSidebar />
        ) : (
          <button
            onClick={() => setShowSavedViews(true)}
            aria-expanded={showSavedViews}
            className="w-14 backdrop-blur-sm border-r border-border flex flex-col items-center justify-center transition-colors duration-200 shadow-lg cursor-pointer hover:bg-muted/50"
            style={{
              backgroundColor: 'hsl(var(--slate-50))'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--slate-100))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--slate-50))';
            }}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mt-2 -rotate-90 whitespace-nowrap font-medium">Views</span>
          </button>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Liquid Glass Apple-style Header */}
          <div className="bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-b border-border/30 sticky top-0 z-40 shadow-sm">
            {/* Title Row */}
            <div className="px-4 lg:px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <h1 className="text-xl lg:text-2xl font-bold text-foreground truncate">
                    {currentView ? currentView.name : "All Enquiries"}
                  </h1>
                  {currentView && (
                    <Button variant="ghost" size="sm" onClick={clearView} className="gap-1 h-7 px-2 text-xs hover:bg-muted">
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {filteredLeads.length.toLocaleString()} leads
                  </span>
                  {selectedLeads.size > 0 && (
                    <span className="text-xs bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] px-2 py-1 rounded-full font-medium">
                      {selectedLeads.size} selected
                    </span>
                  )}
                </div>

                {/* Primary Actions - Clean Layout */}
                <div className="flex items-center gap-2">
                  {selectedLeads.size > 0 && (
                    <>
                        <Button 
                          variant="outline"
                          size="default"
                        className="gap-2 h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:!bg-[hsl(var(--success))] hover:!text-white transition-all duration-200 text-foreground"
                        onClick={() => setShowColorTagModal(true)}
                        >
                        <Target className="h-4 w-4" />
                        Color Status ({selectedLeads.size})
                        </Button>
                      <Button variant="ghost" size="default" onClick={clearSelection} className="h-9 px-3 text-sm">
                        Clear
                      </Button>
                    </>
                  )}
                  
                  {/* AI Status Indicator */}
                  {isAiReordered && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2 py-1 bg-[hsl(var(--destructive))]/10 rounded border border-[hsl(var(--destructive))]/20">
                        <Brain className="h-3 w-3 text-[hsl(var(--destructive))]" />
                        <span className="text-xs font-medium text-[hsl(var(--destructive))]">Sorted by AI</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAiReordered(false);
                          setAiTriageExtras(new Map());
                          setAiTriageSummary(null);
                        }}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                  
                  {/* Debug Info */}
                  {aiTriageExtras.size > 0 && (
                    <div className="text-xs text-muted-foreground">
                      AI Data: {aiTriageExtras.size} leads analyzed (current page)
                    </div>
                  )}

                  {/* Primary AI Button - Black → Candy Apple Red */}
                  <Button 
                    variant="default"
                    size="default"
                    className={cn(
                      "gap-2 h-9 px-4 text-sm font-medium text-white shadow-sm transition-all duration-200",
                      isAiReordered 
                        ? "bg-[hsl(var(--brand-accent))] hover:bg-[hsl(var(--brand-accent))]/90" // Candy Apple Red when active
                        : "bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90" // Shadcn Black when inactive
                    )}
                    onClick={handleAiTriage}
                    disabled={isAiTriageLoading || filteredLeads.length === 0}
                  >
                    {isAiTriageLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Explaining…</span>
                        <span className="sm:hidden">AI…</span>
                      </>
                    ) : (
                      <>
                    <Brain className="h-4 w-4" /> 
                        <span className="hidden sm:inline">Explain with AI</span>
                        <span className="sm:hidden">AI</span>
                      </>
                    )}
                  </Button>

                  {/* Keyboard Shortcuts Button */}
                  <Button 
                    variant="outline"
                    size="default"
                    className="gap-2 h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all duration-200 text-foreground hover:text-foreground"
                    onClick={() => setShowKeyboardShortcuts(true)}
                  >
                    <Keyboard className="h-4 w-4" />
                    <span className="hidden lg:inline">Shortcuts</span>
                  </Button>

                  {/* Consolidated Actions Menu - Liquid Glass */}
                  <div className="relative">
                    <Button 
                      variant="outline"
                      size="default"
                      className="gap-2 h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all duration-200 text-foreground hover:text-foreground"
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="hidden lg:inline">Actions</span>
                    </Button>
                    <ActionsMenu />
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible Stats Section - Liquid Glass Style */}
            {false && (
              <div className="px-4 lg:px-6 pb-4 border-b border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-foreground/90">Quick Stats</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {/* Stats removed */}} 
                    className="h-8 px-3 text-sm hover:bg-muted/50 transition-all duration-200 group"
                  >
                    <span className="mr-2 text-muted-foreground group-hover:text-foreground transition-colors">Collapse Stats</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="flex items-center gap-3 bg-background/60 backdrop-blur-sm border border-border/30 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-background/80">
                    <div className="p-2 rounded-lg bg-muted/40 backdrop-blur-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{stats.total.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-destructive/10 backdrop-blur-sm border border-destructive/20 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-destructive/15">
                    <div className="p-2 rounded-lg bg-destructive/20 backdrop-blur-sm">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-destructive">{stats.urgent}</div>
                      <div className="text-xs text-destructive/80">Urgent</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-[hsl(var(--success))]/10 backdrop-blur-sm border border-[hsl(var(--success))]/20 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-[hsl(var(--success))]/15">
                    <div className="p-2 rounded-lg bg-[hsl(var(--success))]/20 backdrop-blur-sm">
                      <Zap className="h-4 w-4 text-[hsl(var(--success))]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-success">{stats.newToday}</div>
                      <div className="text-xs text-success/80">Today</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-background/60 backdrop-blur-sm border border-border/30 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-background/80">
                    <div className="p-2 rounded-lg bg-muted/40 backdrop-blur-sm">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{stats.highScore}</div>
                      <div className="text-xs text-muted-foreground">High AI Score</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-[hsl(var(--warning))]/10 backdrop-blur-sm border border-[hsl(var(--warning))]/20 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-[hsl(var(--warning))]/15">
                    <div className="p-2 rounded-lg bg-[hsl(var(--warning))]/20 backdrop-blur-sm">
                      <Target className="h-4 w-4 text-[hsl(var(--warning))]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-warning">{stats.selected}</div>
                      <div className="text-xs text-warning/80">Selected</div>
                    </div>
                  </div>
                  {aiTriageSummary && (
                    <div className="flex items-center gap-3 bg-[hsl(var(--accent))]/10 backdrop-blur-sm border border-[hsl(var(--accent))]/20 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-[hsl(var(--accent))]/15">
                      <div className="p-2 rounded-lg bg-[hsl(var(--accent))]/20 backdrop-blur-sm">
                        <Brain className="h-4 w-4 text-[hsl(var(--accent))]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-accent">{aiTriageSummary?.cohort_size || 0}</div>
                        <div className="text-xs text-accent/80">AI Analyzed</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Show Stats Toggle (when hidden) - Better UX */}
            {false && (
              <div className="px-4 lg:px-6 py-4 border-b border-border/50">
                <Button 
                  variant="ghost" 
                  size="default" 
                  onClick={() => {/* Stats removed */}} 
                  className="gap-3 h-10 px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 group"
                >
                  <div className="p-1.5 rounded-lg bg-muted/40 backdrop-blur-sm">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Show Quick Stats</span>
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            )}

            {/* Liquid Glass Controls */}
            <div className="px-4 lg:px-6 py-3 border-b border-border/30 bg-muted/10 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    ref={searchInputRef}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSearchSuggestions(searchTerm.length > 0)}
                    onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                    placeholder="Search leads… (⌘K)"
                    className="w-full pl-10 h-9 text-sm border-border/50 bg-background/60 backdrop-blur-sm focus:ring-2 focus:ring-ring/50 focus:bg-background/80 transition-all duration-200 hover:bg-background/70"
                  />
                  <SearchSuggestions />
                </div>

                {/* Controls Group */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedLeads.size > 0 ? (
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLeads(new Set())}
                      className="h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all duration-200"
                    >
                      Clear ({selectedLeads.size})
                  </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSelectAllDialog(true)}
                        className="h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:!bg-[hsl(var(--success))] hover:!text-white transition-all duration-200"
                      >
                        Select page
                      </Button>
                      <div className="relative">
                      <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className="h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:!bg-[hsl(var(--success))] hover:!text-white transition-all duration-200 gap-2"
                    >
                      <ArrowUpDown className="h-3 w-3" />
                      Sort
                  </Button>

                    {showSortMenu && (
                      <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 min-w-48">
                        <div className="p-2 space-y-1">
                          <div className="text-xs font-medium text-muted-foreground px-2 py-1">Sort by</div>
                    <button
                            onClick={() => { setSortBy("mlProbability"); setSortOrder("desc"); setShowSortMenu(false); }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-200 flex items-center gap-3 ${
                              sortBy === "mlProbability" && sortOrder === "desc" ? "bg-muted" : "hover:bg-muted/50"
                            }`}
                          >
                            <Brain className="h-4 w-4" />
                            AI Score (High to Low)
                    </button>
                    <button
                            onClick={() => { setSortBy("mlProbability"); setSortOrder("asc"); setShowSortMenu(false); }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-200 flex items-center gap-3 ${
                              sortBy === "mlProbability" && sortOrder === "asc" ? "bg-muted" : "hover:bg-muted/50"
                            }`}
                          >
                            <Brain className="h-4 w-4" />
                            AI Score (Low to High)
                    </button>
                    <button
                            onClick={() => { setSortBy("createdDate"); setSortOrder("desc"); setShowSortMenu(false); }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-200 flex items-center gap-3 ${
                              sortBy === "createdDate" && sortOrder === "desc" ? "bg-muted" : "hover:bg-muted/50"
                            }`}
                          >
                            <Calendar className="h-4 w-4" />
                            Newest First
                    </button>
                    <button
                            onClick={() => { setSortBy("createdDate"); setSortOrder("asc"); setShowSortMenu(false); }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-200 flex items-center gap-3 ${
                              sortBy === "createdDate" && sortOrder === "asc" ? "bg-muted" : "hover:bg-muted/50"
                            }`}
                          >
                            <Calendar className="h-4 w-4" />
                            Oldest First
                          </button>
                          <button
                            onClick={() => { setSortBy("name"); setSortOrder("asc"); setShowSortMenu(false); }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-200 flex items-center gap-3 ${
                              sortBy === "name" && sortOrder === "asc" ? "bg-muted" : "hover:bg-muted/50"
                            }`}
                          >
                            <User className="h-4 w-4" />
                            Name (A-Z)
                          </button>
                          <button
                            onClick={() => { setSortBy("name"); setSortOrder("desc"); setShowSortMenu(false); }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-200 flex items-center gap-3 ${
                              sortBy === "name" && sortOrder === "desc" ? "bg-muted" : "hover:bg-muted/50"
                            }`}
                          >
                            <User className="h-4 w-4" />
                            Name (Z-A)
                          </button>
                          <button
                            onClick={() => { setSortBy("leadScore"); setSortOrder("desc"); setShowSortMenu(false); }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-200 flex items-center gap-3 ${
                              sortBy === "leadScore" && sortOrder === "desc" ? "bg-muted" : "hover:bg-muted/50"
                            }`}
                          >
                            <Target className="h-4 w-4" />
                            Lead Score (High to Low)
                          </button>
                          <button
                            onClick={() => { setSortBy("engagementScore"); setSortOrder("desc"); setShowSortMenu(false); }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-200 flex items-center gap-3 ${
                              sortBy === "engagementScore" && sortOrder === "desc" ? "bg-muted" : "hover:bg-muted/50"
                            }`}
                          >
                            <Activity className="h-4 w-4" />
                            Engagement (High to Low)
                    </button>
                  </div>
                      </div>
                    )}
                      </div>
                    </>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="gap-2 h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:!bg-[hsl(var(--success))] hover:!text-white transition-all duration-200 text-foreground"
                      >
                        <Filter className="h-4 w-4" />
                        <span className="hidden sm:inline">Filters</span>
                        {activeCustomFilterId && (
                          <div className="w-2 h-2 bg-[hsl(var(--success))] rounded-full" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                      {/* Quick Filters Section */}
                      <div className="p-3 border-b">
                        <div className="text-sm font-medium mb-3">Quick Filters</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Status</span>
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                              <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="new">New</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="nurture">Nurture</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                  </SelectContent>
                </Select>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Course</span>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                  <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {Array.from(new Set(datasetLeads.map(l => l.courseInterest))).map(course => (
                                  <SelectItem key={course} value={course}>{course}</SelectItem>
                                ))}
                  </SelectContent>
                </Select>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Source</span>
                            <Select value={selectedSource} onValueChange={setSelectedSource}>
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                  <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {Array.from(new Set(datasetLeads.map(l => l.leadSource))).map(source => (
                                  <SelectItem key={source} value={source}>{source}</SelectItem>
                                ))}
                  </SelectContent>
                </Select>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Year</span>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                  <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {Array.from(new Set(datasetLeads.map(l => l.academicYear))).map(year => (
                                  <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                  </SelectContent>
                </Select>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Urgent Only</span>
                            <Checkbox 
                              checked={urgentOnly} 
                              onCheckedChange={(checked) => setUrgentOnly(checked === true)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* My Filters Section */}
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-medium">My Filters</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAddFilter(true)}
                            className="h-7 px-2 text-xs"
                          >
                            + Add Filter
                          </Button>
                        </div>
                        
                        {customFilters.length === 0 ? (
                          <div className="text-sm text-muted-foreground text-center py-4">
                            No saved filters yet
                          </div>
                        ) : (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {customFilters.map((filter) => (
                              <div
                                key={filter.id}
                                className={`flex items-center justify-between p-2 rounded hover:bg-muted/50 ${
                                  activeCustomFilterId === filter.id ? 'bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20' : ''
                                }`}
                              >
                                <div 
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => applyCustomFilter(filter.id)}
                                >
                                  <div className="font-medium text-sm truncate">{filter.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{filter.description}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {activeCustomFilterId === filter.id && (
                                    <div className="w-2 h-2 bg-[hsl(var(--success))] rounded-full flex-shrink-0" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-muted"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      editCustomFilter(filter);
                                    }}
                                    aria-label="Edit filter"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteCustomFilter(filter.id);
                                    }}
                                    aria-label="Delete filter"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {activeCustomFilterId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearCustomFilter}
                            className="w-full mt-2 h-7 text-xs"
                          >
                            Clear Active Filter
                          </Button>
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="gap-2 h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:!bg-[hsl(var(--success))] hover:!text-white transition-all duration-200 text-foreground"
                      >
                        <span>Tags</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowManageTags(true)}>Manage Tags…</DropdownMenuItem>
                      <div className="border-t my-1" />
                      <DropdownMenuItem onClick={() => setShowCustomDefaults(true)}>Custom Defaults…</DropdownMenuItem>
                      <div className="border-t my-1" />
                      <DropdownMenuItem onClick={() => saveDefaultInlineTagKeys(["course", "campus"])}>Set defaults: Course + Campus</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => saveDefaultInlineTagKeys(["course", "campus", "year"])}>Set defaults: Course + Campus + Year</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => saveDefaultInlineTagKeys(["status", "lifecycle"])}>Set defaults: Status + Lifecycle</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => saveDefaultInlineTagKeys(["course", "year", "status"])}>Set defaults: Course + Year + Status</DropdownMenuItem>
                      <div className="border-t my-1" />
                      <DropdownMenuItem onClick={() => applyInlineDefaults("page", paginationData.paginatedLeads)}>Apply defaults to current page</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => applyInlineDefaults("all", filteredLeads)}>Apply defaults to all filtered</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* View mode toggle removed: Compact is the sole visible view */}

                  {/* Per Page */}
                <Select
                    value={String(itemsPerPage)}
                    onValueChange={(v) => setItemsPerPage(Number(v))}
                >
                    <SelectTrigger className="w-20 h-9 border-border text-sm">
                      <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
                          </div>
                        </div>
              </div>

            {/* Filter Chips */}
            {activeFilters.length > 0 && <FilterChips />}

          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 xl:p-8">
            {false ? (
              <AnalyticsDashboard />
            ) : (
              <>
                <Card className="overflow-hidden border-0 shadow-xl">
                  <CardContent className="p-0">
                    {paginationData.paginatedLeads.length === 0 ? (
                      <Card className="p-8 text-center m-4">
                        <p className="text-sm text-muted-foreground mb-4">No leads match these filters.</p>
                        <div className="flex gap-2 justify-center">
                          <Button variant="outline" onClick={() => {
                            setSelectedStatus("all");
                            setSelectedSource("all");
                            setSelectedCourse("all");
                            setSelectedYear("all");
                            setUrgentOnly(false);
                            setSearchTerm("");
                            setSelectedColorTag("all");
                            setActiveCustomFilterId(null);
                          }}>Clear filters</Button>
                          <Button onClick={() => {
                            setCurrentView(null);
                            setSelectedStatus("all");
                            setSelectedSource("all");
                            setSelectedCourse("all");
                            setSelectedYear("all");
                            setUrgentOnly(false);
                            setSearchTerm("");
                            setSelectedColorTag("all");
                            setActiveCustomFilterId(null);
                          }}>Show All Enquiries</Button>
                        </div>
                      </Card>
                    ) : (
                      <>
                    {viewMode === "compact" && <CompactView />}
                        {/* Table/Cards temporarily disabled to preserve compact-only layout */}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Bridge Answer - AI Triage Summary */}
                {aiTriageSummary && (
                  <Card className="mt-6 border border-[hsl(var(--accent))]/20 bg-[hsl(var(--accent))]/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Brain className="h-4 w-4 text-accent" />
                        <span className="text-sm font-semibold text-foreground">Bridge Answer</span>
                        <Badge variant="outline" className="ml-auto text-[10px]">ML + AI</Badge>
                      </div>
                      <div className="text-sm text-foreground">
                        AI explanations generated for {aiTriageSummary?.cohort_size || 0} leads. Top drivers: {(aiTriageSummary?.top_reasons || []).join(', ') || 'High lead scores'}.
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ML scores with AI explanations to help understand why leads are ranked this way.
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Pagination */}
                {paginationData.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8">
                    <div className="text-sm text-muted-foreground font-medium text-center sm:text-left">
                      <span className="tabular-nums">Showing {paginationData.start + 1} to {paginationData.end} of {filteredLeads.length.toLocaleString()} results</span>
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => goToPage(1)} disabled={currentPage === 1} className="h-10 w-10">
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="h-10 w-10">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, paginationData.totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (paginationData.totalPages <= 5) pageNum = i + 1;
                          else if (currentPage <= 3) pageNum = i + 1;
                          else if (currentPage >= paginationData.totalPages - 2) pageNum = paginationData.totalPages - 4 + i;
                          else pageNum = currentPage - 2 + i;

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              onClick={() => goToPage(pageNum)}
                              className="w-10 h-10"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button variant="outline" size="icon" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === paginationData.totalPages} className="h-10 w-10">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => goToPage(paginationData.totalPages)} disabled={currentPage === paginationData.totalPages} className="h-10 w-10">
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-sm text-muted-foreground font-medium text-center sm:text-right">
                      Page {currentPage} of {paginationData.totalPages.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {filteredLeads.length === 0 && (
                  <div className="text-center py-16">
                    <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                      <Users className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No leads found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Save View Modal (simple inline for now) */}
        {showSaveViewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <Card className="w-96 border-0 shadow-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground">Save Current View</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">View Name</label>
                  <Input 
                    placeholder="e.g., High Priority Leads" 
                    className="h-12" 
                    value={saveViewForm.name}
                    onChange={(e) => setSaveViewForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Description</label>
                  <textarea 
                    className="w-full rounded-lg border border-border bg-background p-3 text-sm h-24 resize-none focus:ring-2 focus:ring-ring transition-all duration-200" 
                    placeholder="Describe this view..." 
                    value={saveViewForm.description}
                    onChange={(e) => setSaveViewForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Save to Folder</label>
                  <Select value={saveViewForm.folderId} onValueChange={(value) => setSaveViewForm(prev => ({ ...prev, folderId: value }))}>
                    <SelectTrigger className="h-12 border-border"><SelectValue placeholder="Folder" /></SelectTrigger>
                    <SelectContent>
                      {savedFolders.map(folder => (
                        <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <label className="inline-flex items-center gap-3 cursor-pointer">
                    <Checkbox 
                      checked={saveViewForm.isDefault}
                      onCheckedChange={(checked) => setSaveViewForm(prev => ({ ...prev, isDefault: checked === true }))}
                    /> 
                    <span className="text-sm font-medium text-foreground">Set as my default view</span>
                  </label>
                  <label className="inline-flex items-center gap-3 cursor-pointer">
                    <Checkbox 
                      checked={saveViewForm.isTeamDefault}
                      onCheckedChange={(checked) => setSaveViewForm(prev => ({ ...prev, isTeamDefault: checked === true }))}
                    /> 
                    <span className="text-sm font-medium text-foreground">Share with team</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12" 
                    onClick={() => {
                      setShowSaveViewModal(false);
                      setSaveViewForm({ name: "", description: "", folderId: "my-views", isDefault: false, isTeamDefault: false });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 h-12 shadow-lg" 
                    onClick={handleSaveView}
                    disabled={!saveViewForm.name.trim() || isLoadingSavedViews}
                  >
                    Save View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Folder Modal */}
        {showCreateFolderModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <Card className="w-96 border-0 shadow-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground">Create Folder</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Folder Name</label>
                  <Input 
                    placeholder="e.g., My Custom Views" 
                    className="h-12" 
                    value={createFolderForm.name}
                    onChange={(e) => setCreateFolderForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Folder Type</label>
                  <Select value={createFolderForm.type} onValueChange={(value) => setCreateFolderForm(prev => ({ ...prev, type: value as SavedFolder['type'] }))}>
                    <SelectTrigger className="h-12 border-border"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12" 
                    onClick={() => {
                      setShowCreateFolderModal(false);
                      setCreateFolderForm({ name: "", type: "personal" });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 h-12 shadow-lg" 
                    onClick={async () => {
                      if (!createFolderForm.name) return;
                      await createFolder(createFolderForm.name, createFolderForm.type);
                      setShowCreateFolderModal(false);
                      setCreateFolderForm({ name: "", type: "personal" });
                      push({ title: "Folder created", description: `"${createFolderForm.name}"`, variant: "success" });
                      if (persistenceMode === 'api') hydrateSaved();
                    }}
                    disabled={!createFolderForm.name.trim() || isLoadingSavedViews}
                  >
                    Create Folder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Rename View Modal */}
        {showRenameViewModal && editingView && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <Card className="w-96 border-0 shadow-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground">Rename View</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">View Name</label>
                  <Input 
                    placeholder="e.g., High Priority Leads" 
                    className="h-12" 
                    value={renameViewForm.name}
                    onChange={(e) => setRenameViewForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Description</label>
                  <textarea 
                    className="w-full rounded-lg border border-border bg-background p-3 text-sm h-24 resize-none focus:ring-2 focus:ring-ring transition-all duration-200" 
                    placeholder="Describe this view..." 
                    value={renameViewForm.description}
                    onChange={(e) => setRenameViewForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12" 
                    onClick={() => {
                      setShowRenameViewModal(false);
                      setEditingView(null);
                      setRenameViewForm({ name: "", description: "" });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 h-12 shadow-lg" 
                    onClick={handleUpdateView}
                    disabled={!renameViewForm.name.trim()}
                  >
                    Update View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Color Tag Assignment Modal */}
        {showColorTagModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <Card className="w-80 border-0 shadow-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                <CardTitle className="text-lg text-foreground">Color Tag</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selected
                </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStatusColors(true)}
                    className="text-xs"
                  >
                    Customize Colors
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                                 <div className="grid grid-cols-3 gap-2">
                   {Object.entries(statusPalette).map(([key, status]) => (
                     <button
                       key={key}
                       onClick={() => assignColorTagToSelected(key)}
                       className="p-3 rounded-lg border border-transparent hover:border-border transition-all duration-200 text-center group"
                       style={{ 
                         backgroundColor: `${status.color}20`,
                         borderColor: `${status.color}40`,
                         color: status.color
                       }}
                       title={status.description}
                     >
                       <div className="flex items-center justify-center mb-2">
                         {renderIcon(status.icon, "h-5 w-5")}
                       </div>
                       <div className="text-xs font-medium">{status.name}</div>
                     </button>
                   ))}
                 </div>
                
                <div className="flex gap-2 pt-3">
                  <Button variant="outline" className="flex-1 h-10" onClick={() => setShowColorTagModal(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Email Composer Component */}
        <EmailComposer
          isOpen={showEmailComposer}
          onClose={() => setShowEmailComposer(false)}
          lead={selectedLeadForEmail}
          onSendEmail={handleEmailSend}
        />

        {/* Call Console Component */}
        <CallConsole
          isOpen={showCallConsole}
          onClose={() => setShowCallConsole(false)}
          lead={selectedLeadForCall ? transformEnquiryToCallConsoleLead(selectedLeadForCall) : null}
          onSaveCall={handleCallSave}
          mode="compact"
          hasQueue={false}
        />

        {/* Meeting Booker Component */}
        <MeetingBooker
          isOpen={showMeetingBooker}
          onClose={() => setShowMeetingBooker(false)}
          lead={selectedLeadForMeeting}
          onBookMeeting={handleMeetingBook}
        />

        {/* Keyboard Shortcuts Help */}
        {showKeyboardShortcuts && <KeyboardShortcutsHelp />}

        {/* Add Lead Dialog */}
        <Dialog open={showAddLeadDialog} onOpenChange={setShowAddLeadDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="First name" value={newLead.first} onChange={(e) => setNewLead(prev => ({ ...prev, first: e.target.value }))} />
                <Input placeholder="Last name" value={newLead.last} onChange={(e) => setNewLead(prev => ({ ...prev, last: e.target.value }))} />
      </div>
              <Input placeholder="Email" value={newLead.email} onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Course" value={newLead.course} onChange={(e) => setNewLead(prev => ({ ...prev, course: e.target.value }))} />
                <Input placeholder="Campus" value={newLead.campus} onChange={(e) => setNewLead(prev => ({ ...prev, campus: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAddLeadDialog(false)}>Cancel</Button>
                <Button onClick={() => { console.log("Stub create lead", newLead); setShowAddLeadDialog(false); }}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Manage Tags Modal (MVP) */}
        <Dialog open={showManageTags} onOpenChange={setShowManageTags}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Manage Tags</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                {userTags.length === 0 && (
                  <div className="text-sm text-muted-foreground">No user tags yet.</div>
                )}
                {userTags.map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ background: t.color }} />
                    <div className="flex-1 text-sm">{t.name}</div>
                    <Button size="sm" variant="ghost" onClick={() => saveUserTags(userTags.filter(x => x.id !== t.id))}>Delete</Button>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2">
                <Input placeholder="Tag name" value={draftTag.name} onChange={e => setDraftTag({ ...draftTag, name: e.target.value })} />
                <div className="flex items-center justify-between">
                  <span className="text-sm">Color</span>
                  <input type="color" value={draftTag.color} onChange={e => setDraftTag({ ...draftTag, color: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select onValueChange={(v) => setDraftTag({ ...draftTag, rules: [{ ...(draftTag.rules?.[0]||{}), field: v as keyof Enquiry, op: (draftTag.rules?.[0]?.op || "eq") as any, value: draftTag.rules?.[0]?.value ?? "" }] })}>
                    <SelectTrigger><SelectValue placeholder="Field" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leadScore">leadScore</SelectItem>
                      <SelectItem value="courseInterest">courseInterest</SelectItem>
                      <SelectItem value="campusPreference">campusPreference</SelectItem>
                      <SelectItem value="leadSource">leadSource</SelectItem>
                      <SelectItem value="mlProbability">mlProbability</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select onValueChange={(v) => setDraftTag({ ...draftTag, rules: [{ ...(draftTag.rules?.[0]||{}), field: (draftTag.rules?.[0]?.field || "leadScore") as any, op: v as any, value: draftTag.rules?.[0]?.value ?? "" }] })}>
                    <SelectTrigger><SelectValue placeholder="Op" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eq">=</SelectItem>
                      <SelectItem value="neq">≠</SelectItem>
                      <SelectItem value="gte">≥</SelectItem>
                      <SelectItem value="lte">≤</SelectItem>
                      <SelectItem value="contains">contains</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Value" onChange={(e) => setDraftTag({ ...draftTag, rules: [{ ...(draftTag.rules?.[0]||{}), field: (draftTag.rules?.[0]?.field || "leadScore") as any, op: (draftTag.rules?.[0]?.op || "eq") as any, value: e.target.value }] })} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={addDraftTag}>Add Tag</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Custom Defaults Modal */}
        <Dialog open={showCustomDefaults} onOpenChange={setShowCustomDefaults}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Custom Default Tags</DialogTitle>
              <DialogDescription>
                Choose which fields should appear as tags by default for new leads.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {availableFieldOptions.map((option) => (
                  <div
                    key={option.key}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      customDefaults.includes(option.key)
                        ? 'border-[hsl(var(--success))] bg-[hsl(var(--success))]/10'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                    onClick={() => toggleCustomDefault(option.key)}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={customDefaults.includes(option.key)}
                        onChange={() => toggleCustomDefault(option.key)}
                        className="h-4 w-4"
                      />
                      <div>
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-sm text-muted-foreground">
                Selected: {customDefaults.length > 0 ? customDefaults.join(", ") : "None"}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomDefaults(false)}>
                Cancel
              </Button>
              <Button 
                onClick={saveCustomDefaults}
                className="hover:!bg-[hsl(var(--success))] hover:!text-white"
              >
                Save Defaults
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create New Filter Modal */}
        <Dialog open={showAddFilter} onOpenChange={(open) => {
          setShowAddFilter(open);
          if (!open) {
            setEditingFilter(null);
            setFilterDraft({ id: "", name: "", description: "", predicate: { type: "all", conditions: [] }, createdAt: new Date().toISOString() });
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingFilter ? 'Edit Custom Filter' : 'Create Custom Filter'}</DialogTitle>
              <DialogDescription>
                Build a custom filter using field conditions. Use "All" for AND logic, "Any" for OR logic.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Filter Name</label>
                  <Input
                    placeholder="e.g., High Value Leads"
                    value={filterDraft.name}
                    onChange={(e) => setFilterDraft(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="e.g., Leads with score > 80"
                    value={filterDraft.description}
                    onChange={(e) => setFilterDraft(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Logic</label>
                <Select
                  value={filterDraft.predicate.type}
                  onValueChange={(value: "all" | "any") => 
                    setFilterDraft(prev => ({ 
                      ...prev, 
                      predicate: { ...prev.predicate, type: value } 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All conditions must match (AND)</SelectItem>
                    <SelectItem value="any">Any condition can match (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Conditions</label>
                <div className="space-y-2">
                  {filterDraft.predicate.conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                      <Select
                        value={condition.field}
                        onValueChange={(value: string) => 
                          setFilterDraft(prev => ({
                            ...prev,
                            predicate: {
                              ...prev.predicate,
                              conditions: prev.predicate.conditions.map((c, i) => 
                                i === index ? { ...c, field: value } : c
                              )
                            }
                          }))
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Personal Information */}
                          <SelectItem value="first_name">First Name</SelectItem>
                          <SelectItem value="last_name">Last Name</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="date_of_birth">Date of Birth</SelectItem>
                          <SelectItem value="nationality">Nationality</SelectItem>
                          
                          {/* Contact Information */}
                          <SelectItem value="address_line1">Address Line 1</SelectItem>
                          <SelectItem value="city">City</SelectItem>
                          <SelectItem value="postcode">Postcode</SelectItem>
                          <SelectItem value="country">Country</SelectItem>
                          <SelectItem value="preferred_contact_method">Preferred Contact Method</SelectItem>
                          
                          {/* Lead Management */}
                          <SelectItem value="lifecycle_state">Lifecycle State</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="assigned_to">Assigned To</SelectItem>
                          <SelectItem value="next_follow_up">Next Follow Up</SelectItem>
                          
                          {/* Scoring & Analytics */}
                          <SelectItem value="lead_score">Lead Score</SelectItem>
                          <SelectItem value="engagement_score">Engagement Score</SelectItem>
                          <SelectItem value="conversion_probability">Conversion Probability</SelectItem>
                          <SelectItem value="touchpoint_count">Touchpoint Count</SelectItem>
                          <SelectItem value="last_engagement_date">Last Engagement Date</SelectItem>
                          
                          {/* Academic Preferences */}
                          <SelectItem value="course_preference">Course Preference</SelectItem>
                          <SelectItem value="campus_preference">Campus Preference</SelectItem>
                          <SelectItem value="primary_discipline">Primary Discipline</SelectItem>
                          <SelectItem value="portfolio_provided">Portfolio Provided</SelectItem>
                          
                          {/* Attribution */}
                          <SelectItem value="source_of_enquiry">Source of Enquiry</SelectItem>
                          <SelectItem value="hs_analytics_source">Analytics Source</SelectItem>
                          <SelectItem value="hs_latest_source">Latest Source</SelectItem>
                          
                          {/* UCAS (for applicants) */}
                          <SelectItem value="ucas_personal_id">UCAS Personal ID</SelectItem>
                          <SelectItem value="ucas_application_number">UCAS Application Number</SelectItem>
                          <SelectItem value="ucas_track_status">UCAS Track Status</SelectItem>
                          
                          {/* Engagement Metrics */}
                          <SelectItem value="website_pages_viewed">Website Pages Viewed</SelectItem>
                          <SelectItem value="website_time_spent">Website Time Spent</SelectItem>
                          <SelectItem value="number_of_sessions">Number of Sessions</SelectItem>
                          <SelectItem value="marketing_emails_opened">Marketing Emails Opened</SelectItem>
                          <SelectItem value="marketing_emails_clicked">Marketing Emails Clicked</SelectItem>
                          
                          {/* AI Insights */}
                          <SelectItem value="next_best_action">Next Best Action</SelectItem>
                          <SelectItem value="next_best_action_confidence">Action Confidence</SelectItem>
                          
                          {/* Timestamps */}
                          <SelectItem value="created_at">Created Date</SelectItem>
                          <SelectItem value="updated_at">Updated Date</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.op}
                        onValueChange={(value: "eq" | "neq" | "gte" | "lte" | "contains") => 
                          setFilterDraft(prev => ({
                            ...prev,
                            predicate: {
                              ...prev.predicate,
                              conditions: prev.predicate.conditions.map((c, i) => 
                                i === index ? { ...c, op: value } : c
                              )
                            }
                          }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eq">equals</SelectItem>
                          <SelectItem value="neq">not equals</SelectItem>
                          <SelectItem value="gte">≥</SelectItem>
                          <SelectItem value="lte">≤</SelectItem>
                          <SelectItem value="contains">contains</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder={
                          condition.field.includes('_date') || condition.field.includes('_at') 
                            ? "YYYY-MM-DD" 
                            : condition.field.includes('_score') || condition.field.includes('_count') || condition.field.includes('_probability')
                            ? "Number"
                            : condition.field.includes('_provided') || condition.field.includes('_enabled')
                            ? "true/false"
                            : "Value"
                        }
                        type={
                          condition.field.includes('_date') || condition.field.includes('_at')
                            ? "date"
                            : condition.field.includes('_score') || condition.field.includes('_count') || condition.field.includes('_probability')
                            ? "number"
                            : "text"
                        }
                        value={condition.value}
                        onChange={(e) => 
                          setFilterDraft(prev => ({
                            ...prev,
                            predicate: {
                              ...prev.predicate,
                              conditions: prev.predicate.conditions.map((c, i) => 
                                i === index ? { ...c, value: e.target.value } : c
                              )
                            }
                          }))
                        }
                        className="flex-1"
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => 
                          setFilterDraft(prev => ({
                            ...prev,
                            predicate: {
                              ...prev.predicate,
                              conditions: prev.predicate.conditions.filter((_, i) => i !== index)
                            }
                          }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={() => 
                      setFilterDraft(prev => ({
                        ...prev,
                        predicate: {
                          ...prev.predicate,
                          conditions: [...prev.predicate.conditions, { field: "lead_score", op: "gte", value: "" }]
                        }
                      }))
                    }
                    className="w-full"
                  >
                    + Add Condition
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddFilter(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  saveCustomFilter(filterDraft);
                  setFilterDraft({ id: "", name: "", description: "", predicate: { type: "all", conditions: [] }, createdAt: new Date().toISOString() });
                  setEditingFilter(null);
                  setShowAddFilter(false);
                }}
                disabled={!filterDraft.name || filterDraft.predicate.conditions.length === 0}
                className="hover:!bg-[hsl(var(--success))] hover:!text-white"
              >
                Save Filter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Status Colors Modal */}
        <Dialog open={showStatusColors} onOpenChange={setShowStatusColors}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Customize Status Colors</DialogTitle>
              <DialogDescription>
                Choose colors that make sense for each status type. You can customize the two custom statuses.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {Object.entries(statusPalette).map(([key, status]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: status.color }}
                    />
                    <div>
                      <div className="font-medium">{status.name}</div>
                      <div className="text-xs text-muted-foreground">{status.description}</div>
                    </div>
                  </div>
                  {(key === 'custom1' || key === 'custom2') ? (
                    <input
                      type="color"
                      value={status.color}
                      onChange={(e) => updateStatusPalette({ [key]: { ...status, color: e.target.value } })}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground">Fixed</div>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStatusColors(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk User Tags Modal */}
        <Dialog open={showBulkUserTags} onOpenChange={setShowBulkUserTags}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign User Tags</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {userTags.length === 0 && <div className="text-sm text-muted-foreground">No user tags defined.</div>}
              {userTags.map(t => {
                const checked = bulkUserTagIds.includes(t.id);
                return (
                  <label key={t.id} className="flex items-center gap-2 py-1">
                    <input type="checkbox" checked={checked} onChange={(e) => setBulkUserTagIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id))} />
                    <span className="w-3 h-3 rounded" style={{ background: t.color }} />
                    <span className="text-sm">{t.name}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowBulkUserTags(false)}>Cancel</Button>
              <Button onClick={applyBulkUserTags}>Apply</Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Export Leads</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">Scope</div>
                <div className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={exportScope === "current"} onChange={() => setExportScope("current")} value="current" /> Current view</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={exportScope === "all"} onChange={() => setExportScope("all")} value="all" /> All</label>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Format</div>
                <div className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={exportFormat === "csv"} onChange={() => setExportFormat("csv")} value="csv" /> CSV</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={exportFormat === "xlsx"} onChange={() => setExportFormat("xlsx")} value="xlsx" /> XLSX</label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancel</Button>
                <Button onClick={() => { console.log("Stub export", { exportScope, exportFormat }); setShowExportDialog(false); }}>Export</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>


  {/* Select All Dialog */}
  <Dialog open={showSelectAllDialog} onOpenChange={setShowSelectAllDialog}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Select All Enquiries</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Choose which enquiries to select:
        </div>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4 hover:!bg-[hsl(var(--success))] hover:!text-white transition-colors"
            onClick={() => {
              const visibleIds = new Set(paginationData.paginatedLeads.map(l => l.uid));
              setSelectedLeads(prev => {
                const next = new Set(prev);
                visibleIds.forEach(id => next.add(id));
                return next;
              });
              setShowSelectAllDialog(false);
            }}
          >
            <div className="text-left w-full">
              <div className="font-medium text-base">Current page only</div>
              <div className="text-sm text-muted-foreground mt-1 hover:!text-white">{paginationData.paginatedLeads.length} leads on this page</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4 hover:!bg-[hsl(var(--success))] hover:!text-white transition-colors"
            onClick={() => {
              const allIds = new Set(datasetLeads.map(l => l.uid));
              setSelectedLeads(allIds);
              setShowSelectAllDialog(false);
            }}
          >
            <div className="text-left w-full">
              <div className="font-medium text-base">All leads</div>
              <div className="text-sm text-muted-foreground mt-1 hover:!text-white">{datasetLeads.length} total leads across all pages</div>
            </div>
          </Button>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setShowSelectAllDialog(false)}>Cancel</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
      </div>
      
      {/* Sticky Mobile Bulk Actions Bar */}
      {selectedLeads.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50 lg:hidden">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {selectedLeads.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkUserTags(true)}
                className="h-8 px-3 text-xs"
              >
                <Target className="h-3 w-3 mr-1" />
                Tags
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColorTagModal(true)}
                className="h-8 px-3 text-xs"
              >
                <Star className="h-3 w-3 mr-1" />
                Color
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmailComposer(true)}
                className="h-8 px-3 text-xs"
              >
                <Mail className="h-3 w-3 mr-1" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                className="h-8 px-3 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-8 px-2 text-xs text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
};

export default LeadsManagementPage;
