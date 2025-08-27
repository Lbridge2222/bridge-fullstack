import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { 
  Users, Search, Filter, Clock, AlertTriangle, Phone, Mail, Calendar,
  MoreHorizontal, ChevronDown, Download, UserPlus, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Star, Users2, X, LayoutGrid, Grid3X3, List,
  SortAsc, SortDesc, BookmarkPlus, TrendingUp, Target, Zap, Eye, Command,
  Trash2, Edit3, Send, Clock3, BarChart3,
  PieChart, Activity, Brain, Lightbulb, TrendingDown, CalendarDays,
  ArrowUpRight, Sparkles, Archive, RefreshCw, CheckCircle2, Sprout,
  MessageCircle, Snowflake, Loader2
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
import CallComposer, { type Lead as CallComposerLead } from "@/components/CallComposer";
import MeetingBooker, { type Lead as MeetingBookerLead } from "@/components/MeetingBooker";
import { EditableLeadCard } from "@/components/CRM/EditableLeadCard";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Small utility
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

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

type Lead = {
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
};

const LeadsManagementPage: React.FC = () => {
  // View state
  const [viewMode, setViewMode] = useState<"table" | "cards" | "compact" | "editable">("table");
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Saved Views & Folders
  const [showSavedViews, setShowSavedViews] = useState(false);
  const [currentView, setCurrentView] = useState<SavedView | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);

  // Filters & sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [sortBy, setSortBy] = useState<keyof Lead | "createdDate" | "lastContact">("leadScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // UX Enhancements
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Array<{key: string, label: string, value: string}>>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  const [aiTriageExtras, setAiTriageExtras] = useState<Map<string, { i: number; score: number; reasons: string[]; next_action: string }>>(new Map());
  const [isAiTriageLoading, setIsAiTriageLoading] = useState(false);
  const [aiTriageSummary, setAiTriageSummary] = useState<{ cohort_size: number; top_reasons: string[] } | null>(null);

  // Color Tag System
  const [selectedColorTag, setSelectedColorTag] = useState<string>("all");
  const [showColorTagModal, setShowColorTagModal] = useState(false);
  const [leadToColor, setLeadToColor] = useState<Lead | null>(null);
  
  // Predefined color tags using professional colors aligned with index.css design system
  const colorTags = [
    { 
      id: "priority", 
      name: "Priority", 
      color: "bg-red-500/20 border-red-500/40 text-red-700", 
      icon: "AlertTriangle",
      description: "High-priority leads requiring immediate attention"
    },
    { 
      id: "hot", 
      name: "Hot Lead", 
      color: "bg-orange-500/20 border-orange-500/40 text-orange-700", 
      icon: "Zap",
      description: "High-scoring leads with strong conversion potential"
    },
    { 
      id: "qualified", 
      name: "Qualified", 
      color: "bg-green-600/20 border-green-600/40 text-green-700", 
      icon: "CheckCircle2",
      description: "Leads that meet qualification criteria"
    },
    { 
      id: "nurture", 
      name: "Nurture", 
      color: "bg-blue-500/20 border-blue-500/40 text-blue-700", 
      icon: "Sprout",
      description: "Leads requiring ongoing engagement"
    },
    { 
      id: "follow-up", 
      name: "Follow Up", 
      color: "bg-purple-500/20 border-purple-500/40 text-purple-700", 
      icon: "MessageCircle",
      description: "Leads awaiting follow-up communication"
    },
    { 
      id: "research", 
      name: "Research", 
      color: "bg-yellow-500/20 border-yellow-500/40 text-yellow-700", 
      icon: "Search",
      description: "Leads requiring additional research"
    },
    { 
      id: "cold", 
      name: "Cold", 
      color: "bg-slate-200 border-slate-300 text-slate-700", 
      icon: "Snowflake",
      description: "Inactive or low-priority leads"
    },
    { 
      id: "custom-1", 
      name: "Custom 1", 
      color: "bg-slate-300/20 border-slate-400/40 text-slate-600", 
      icon: "Star",
      description: "Custom categorization tag"
    },
    { 
      id: "custom-2", 
      name: "Custom 2", 
      color: "bg-slate-400/20 border-slate-500/40 text-slate-600", 
      icon: "Target",
      description: "Custom categorization tag"
    },
  ];

  // Performance optimizations
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Mock saved views
  const savedViewsData = {
    folders: [
      {
        id: "my-views",
        name: "My Views",
        type: "personal",
        icon: <Users className="h-4 w-4 text-muted-foreground" />,
        views: [
          {
            id: "hot-leads",
            name: "Hot Leads (80+ Score)",
            description: "High-scoring leads requiring immediate attention",
            filters: { leadScore: ">=80", urgentOnly: true },
            created: "2025-08-05",
            lastUsed: "2025-08-09",
            isDefault: true,
          },
          {
            id: "new-web-leads",
            name: "New Web Form Leads",
            description: "Web form submissions in last 48 hours",
            filters: { status: "new", source: "Web Form", timeframe: "48h" },
            created: "2025-08-03",
            lastUsed: "2025-08-08",
          },
          {
            id: "interview-ready",
            name: "Interview Ready",
            description: "Qualified leads ready for interview booking",
            filters: { status: "qualified", leadScore: ">=60" },
            created: "2025-08-01",
            lastUsed: "2025-08-07",
          },
        ] as SavedView[],
      },
      {
        id: "team-views",
        name: "Team Views",
        type: "team",
        icon: <Users2 className="h-4 w-4 text-muted-foreground" />,
        views: [
          {
            id: "sla-urgent",
            name: "SLA Breaches",
            description: "All leads exceeding 24-hour SLA",
            filters: { slaStatus: "urgent" },
            created: "2025-07-28",
            lastUsed: "2025-08-09",
            sharedBy: "Sarah Wilson (Admissions Manager)",
            isTeamDefault: true,
          },
          {
            id: "brighton-leads",
            name: "Brighton Campus Leads",
            description: "All leads interested in Brighton campus",
            filters: { campus: "Brighton" },
            created: "2025-07-25",
            lastUsed: "2025-08-08",
            sharedBy: "James Miller (Regional Lead)",
          },
          {
            id: "music-production-2025",
            name: "Music Production 2025/26",
            description: "Music Production course leads for Sept 2025",
            filters: { course: "Music Production", year: "2025/26" },
            created: "2025-07-20",
            lastUsed: "2025-08-09",
            sharedBy: "Emma Davis (Course Leader)",
          },
        ] as SavedView[],
      },
      {
        id: "archived-views",
        name: "Archived Views",
        type: "archived",
        icon: <Archive className="h-4 w-4 text-muted-foreground" />,
        views: [
          {
            id: "old-cycle-leads",
            name: "2024/25 Cycle Leads",
            description: "Previous academic year leads",
            filters: { year: "2024/25" },
            created: "2024-09-01",
            lastUsed: "2025-06-15",
            archived: true,
          },
        ] as SavedView[],
      },
    ],
  };



  // Removed mock dataset in favor of live data

  // Real data via API - use dedicated leads endpoint which filters to enquiry stage
  const filters = useMemo(() => ({ limit: 200 }), []);
  const { people, fetchPeople } = usePeople('leads', filters);
  
  // Refresh function for updates
  const handleRefresh = useCallback(() => {
    fetchPeople();
  }, [fetchPeople]);
  
  // Temporary: use empty array to test if hook is causing re-renders
  // const people: any[] = [];

  // ML Predictions state and fetching (moved before useMemo that uses it)
  const [mlPredictions, setMlPredictions] = useState<Record<string, { prediction: boolean; probability: number; confidence: number }>>({});
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);

  const datasetLeads = useMemo((): Lead[] => {
    const now = Date.now();
    const leads = (people || []).map((p: any, idx: number) => {
      // Ensure unique IDs - use original ID if numeric, otherwise use index + 1000 to avoid conflicts
      const idNum = typeof p.id === 'number' ? p.id : (parseInt(p.id, 10) || (idx + 1000));
      const uidStr = String(p.id);
      
      const lastActivityIso: string = p.last_activity_at || p.created_at || new Date().toISOString();
      const hoursSinceLast = Math.max(0, (now - new Date(lastActivityIso).getTime()) / 36e5);
      const slaStatus: Lead["slaStatus"] = hoursSinceLast >= 24 ? 'urgent' : hoursSinceLast >= 12 ? 'warning' : 'within_sla';

      return {
        id: idNum,
        uid: uidStr,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
        email: p.email || 'unknown@example.com',
        phone: p.phone || '+44 7000 000000', // Default phone since it's not in the view
        courseInterest: p.latest_programme_name || 'Music Production', // Default course since it's not in the view
        academicYear: p.latest_academic_year || '2025/26', // Default year since it's not in the view
        campusPreference: p.latest_campus_name || 'Brighton', // Default campus since it's not in the view
        enquiryType: p.last_activity_kind || 'Course Inquiry',
        leadSource: p.source || 'Web Form', // Default source since it's not in the view
        status: 'New Lead',
        statusType: 'new' as Lead['statusType'],
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
      };
    });
    
    return leads;
  }, [people, mlPredictions]);

  // Function to fetch ML predictions for visible leads
  const fetchMLPredictions = useCallback(async () => {
    if (!datasetLeads.length || isLoadingPredictions) return;

    setIsLoadingPredictions(true);
    try {
      const leadIds = datasetLeads.map(lead => lead.uid);

      const response = await fetch('http://localhost:8000/ai/advanced-ml/predict-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadIds),
      });

      if (response.ok) {
        const result = await response.json();
        const predictionsMap: Record<string, { prediction: boolean; probability: number; confidence: number }> = {};

        result.predictions.forEach((pred: any) => {
          if (pred.probability !== null) {
            predictionsMap[pred.lead_id] = {
              prediction: pred.prediction,
              probability: pred.probability,
              confidence: pred.confidence,
            };
          }
        });

        setMlPredictions(predictionsMap);
      }
    } catch (error) {
      console.error('Failed to fetch ML predictions:', error);
    } finally {
      setIsLoadingPredictions(false);
    }
  }, [datasetLeads, isLoadingPredictions]);

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
  const applyViewFilters = (leads: Lead[], view: SavedView | null) => {
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
    setUrgentOnly(false);
    setSearchTerm("");
  };

  // Search suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const suggestions: Array<{type: string, value: string, count: number}> = [];
    const term = searchTerm.toLowerCase();
    
    // Course suggestions
    const courses = [...new Set(datasetLeads.map(l => l.courseInterest))];
    courses.forEach(course => {
      if (course.toLowerCase().includes(term)) {
        const count = datasetLeads.filter(l => l.courseInterest === course).length;
        suggestions.push({ type: "course", value: course, count });
      }
    });
    
    // Campus suggestions
    const campuses = [...new Set(datasetLeads.map(l => l.campusPreference))];
    campuses.forEach(campus => {
      if (campus.toLowerCase().includes(term)) {
        const count = datasetLeads.filter(l => l.campusPreference === campus).length;
        suggestions.push({ type: "campus", value: campus, count });
      }
    });
    
    // Source suggestions
    const sources = [...new Set(datasetLeads.map(l => l.leadSource))];
    sources.forEach(source => {
      if (source.toLowerCase().includes(term)) {
        const count = datasetLeads.filter(l => l.leadSource === source).length;
        suggestions.push({ type: "source", value: source, count });
      }
    });
    
    return suggestions.slice(0, 5);
  }, [searchTerm, datasetLeads]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Ctrl/Cmd + F for filters
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowFilters(prev => !prev);
      }
      
      // Escape to clear search
      if (e.key === 'Escape' && searchTerm) {
        setSearchTerm("");
        setShowSearchSuggestions(false);
      }
      
      // Ctrl/Cmd + A for select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAllVisible();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm]);

  // Bulk actions
  const handleBulkAction = (action: string) => {
    if (selectedLeads.size === 0) return;
    
    const leadIds = Array.from(selectedLeads); // these are uids already

    switch (action) {
      case "status":
        // Update status for all selected leads
        console.log(`Updating status for ${leadIds.length} leads`);
        break;
      case "export":
        // Export selected leads
        console.log(`Exporting ${leadIds.length} leads`);
        break;
      case "delete":
        // Delete selected leads (with confirmation)
        if (confirm(`Are you sure you want to delete ${leadIds.length} leads?`)) {
          console.log(`Deleting ${leadIds.length} leads`);
          setSelectedLeads(new Set());
        }
        break;
      case "email":
        // AI-powered email composition
        handleAiOutreach("nurture");
        break;
      case "interview":
        // AI-powered interview booking email
        handleAiOutreach("book_interview");
        break;
      case "reengage":
        // AI-powered re-engagement email
        handleAiOutreach("reengage");
        break;
      case "color":
        // Assign color tag to selected leads
        handleBulkColorTagAssignment();
        break;
    }
    
    setShowBulkActions(false);
    setBulkAction("");
  };

  // Memoized filtered leads with performance optimization
  const filteredLeads = useMemo(() => {
    if (isLoading) return [];
    
    let filtered = currentView ? applyViewFilters(datasetLeads, currentView) : datasetLeads;
    
    // Apply search filter only if search term is significant
    if (debouncedSearchTerm.trim().length > 0) {
      const q = debouncedSearchTerm.trim().toLowerCase();
      filtered = filtered.filter((lead) => {
        return lead.name.toLowerCase().includes(q) ||
               lead.email.toLowerCase().includes(q) ||
               lead.courseInterest.toLowerCase().includes(q);
      });
    }
    
    // Apply other filters
    filtered = filtered.filter((lead) => {
      const matchesStatus = selectedStatus === "all" || lead.statusType === (selectedStatus as Lead["statusType"]);
      const matchesSource = selectedSource === "all" || lead.leadSource === selectedSource;
      const matchesCourse = selectedCourse === "all" || lead.courseInterest === selectedCourse;
      const matchesYear = selectedYear === "all" || lead.academicYear === selectedYear;
      const matchesUrgent = !urgentOnly || ["urgent", "warning"].includes(lead.slaStatus);
      const matchesColorTag = selectedColorTag === "all" || lead.colorTag === selectedColorTag;
      return matchesStatus && matchesSource && matchesCourse && matchesYear && matchesUrgent && matchesColorTag;
    });

    // AI Triage Reordering - if AI has analyzed, use AI scores
    if (aiTriageExtras.size > 0) {
      filtered.sort((a, b) => {
        const aScore = aiTriageExtras.get(String(a.id))?.score ?? -1;
        const bScore = aiTriageExtras.get(String(b.id))?.score ?? -1;
        return bScore - aScore; // Higher scores first
      });
    } else {
      // Optimized sorting (original logic)
      if (sortBy && sortOrder) {
        filtered.sort((a, b) => {
          const aV = (a as any)[sortBy];
          const bV = (b as any)[sortBy];
          
          if (typeof aV === "number" && typeof bV === "number") {
            return sortOrder === "asc" ? aV - bV : bV - aV;
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

  // Memoized stats
  const stats = useMemo(() => ({
    total: filteredLeads.length,
    urgent: filteredLeads.filter((l) => l.slaStatus === "urgent").length,
    newToday: filteredLeads.filter((l) => new Date(l.createdDate).toDateString() === new Date().toDateString()).length,
    highScore: filteredLeads.filter((l) => l.leadScore >= 80).length,
    selected: selectedLeads.size,
  }), [filteredLeads, selectedLeads]);

  // Virtual scrolling for table
  const { visibleItems, totalHeight, offsetY, onScroll } = useVirtualScrolling(
    paginationData.paginatedLeads,
    80, // Approximate row height
    600, // Container height
    3 // Overscan
  );

  // Handlers
  const toggleFolder = useCallback((id: string) => {
    const s = new Set(expandedFolders);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedFolders(s);
  }, [expandedFolders]);

  const selectView = useCallback((v: SavedView) => {
    setCurrentView(v);
    setCurrentPage(1);
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

  const selectAllVisible = useCallback(() => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      paginationData.paginatedLeads.forEach((l) => newSet.add(l.uid));
      return newSet;
    });
  }, [paginationData.paginatedLeads]);

  const clearSelection = useCallback(() => setSelectedLeads(new Set()), []);

  const goToPage = useCallback((p: number) => setCurrentPage(Math.max(1, Math.min(p, paginationData.totalPages))), [paginationData.totalPages]);

  // UI helpers — use shadcn Badge variants instead of hard-coded colours
  const SLABadge = ({ sla }: { sla: Lead["slaStatus"] }) => {
    const map: Record<Lead["slaStatus"], { label: string; variant: "destructive" | "secondary" | "outline" | "default"; icon: React.ReactNode }> = {
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

  const StatusBadge = ({ status, statusType }: { status: string; statusType: Lead["statusType"] }) => {
    const map: Record<Lead["statusType"], { variant: "default" | "secondary" | "outline" | "destructive"; color: string }> = {
      new: { variant: "default", color: "bg-muted text-muted-foreground border-border" },
      contacted: { variant: "secondary", color: "bg-warning/10 text-warning border-warning/20" },
      qualified: { variant: "outline", color: "bg-success/10 text-success border-success/20" },
      nurturing: { variant: "secondary", color: "bg-muted text-muted-foreground border-border" },
      cold: { variant: "outline", color: "bg-muted/50 text-muted-foreground border-border" },
    };
    const cfg = map[statusType];
    return (
      <Badge 
        variant={cfg.variant} 
        className={`${cfg.color} border font-medium px-3 py-1.5 text-xs`}
      >
        {status}
      </Badge>
    );
  };

  const LeadScoreIndicator = ({ score }: { score: number }) => {
    const getScoreColor = (score: number) => {
      if (score >= 80) return "text-success bg-success/10 border-success/20";
      if (score >= 60) return "text-muted-foreground bg-muted/50 border-border";
      if (score >= 40) return "text-warning bg-warning/10 border-warning/20";
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
              score >= 80 ? 'bg-success' : 
              score >= 60 ? 'bg-muted-foreground' : 
              score >= 40 ? 'bg-warning' : 'bg-muted-foreground'
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
          <h3 className="text-xl font-bold text-foreground">
            Saved Views
          </h3>
          <Button size="icon" variant="ghost" onClick={() => setShowSavedViews(false)} className="hover:bg-muted">
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
            <div className="text-sm font-semibold">All Leads</div>
            <div className={`text-xs ${currentView ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              {datasetLeads.length.toLocaleString()} total leads
            </div>
          </div>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {savedViewsData.folders.map((folder) => (
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
                  {folder.icon}
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
                  <button
                    key={view.id}
                    onClick={() => selectView(view)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl text-left hover:bg-muted transition-all duration-200 group",
                      currentView?.id === view.id && "ring-2 ring-border bg-muted/50 shadow-lg"
                    )}
                  >
                    <div className="flex-1 min-w-0">
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
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="pt-6 border-t border-border space-y-3">
          <Button variant="ghost" className="w-full justify-start gap-3 h-12 hover:bg-muted" onClick={() => setShowSaveViewModal(true)}>
            <div className="p-2 rounded-lg bg-success/10">
              <BookmarkPlus className="h-4 w-4 text-success" />
            </div>
            Save Current View
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 h-12 hover:bg-muted">
            <div className="p-2 rounded-lg bg-muted">
              <PlusIcon />
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

  // Optimized table row component
  const TableRow = React.memo(({ lead, index }: { lead: Lead; index: number }) => {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    
    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    };
    
    const assignColorTag = (colorTagId: string) => {
      // In a real app, you'd make an API call here
      console.log(`Assigning color tag ${colorTagId} to lead ${lead.name}`);
      setShowContextMenu(false);
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
            "hover:bg-muted/50 transition-colors duration-200", 
            selectedLeads.has(lead.uid) && "bg-muted ring-1 ring-border",
            // Add subtle background tint for color-coded leads
            lead.colorTag && (() => {
              const tag = colorTags.find(t => t.id === lead.colorTag);
              if (!tag) return "";
              if (tag.id === "priority") return "bg-red-500/6";
              if (tag.id === "hot") return "bg-accent/6";
              if (tag.id === "qualified") return "bg-success/6";
              if (tag.id === "nurture") return "bg-info/6";
              if (tag.id === "follow-up") return "bg-forest-green/6";
              if (tag.id === "research") return "bg-warning/6";
              if (tag.id === "cold") return "bg-slate-100/55";
              if (tag.id === "custom-1") return "bg-slate-200/40";
              if (tag.id === "custom-2") return "bg-slate-300/35";
              return "";
            })()
          )}
          onContextMenu={handleContextMenu}
        >
          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5">
            <Checkbox
              checked={selectedLeads.has(lead.uid)}
              onCheckedChange={(checked) => {
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
          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5">
            <div className="flex items-center">
              <div className="mr-3 sm:mr-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/80 text-muted-foreground text-sm font-bold border border-border">
                {lead.avatar || lead.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <button
                    className="text-sm font-semibold text-foreground truncate hover:text-red-600 text-left transition-colors"
                    onClick={() => lead.uid && navigate(`/people/${lead.uid}`)}
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
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{lead.email}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Zap className="h-3 w-3" />
                  <span className="truncate">{lead.leadSource}</span>
                </div>
              </div>
            </div>
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground truncate">{lead.courseInterest}</div>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md inline-block">
                {lead.academicYear}
              </div>
              <div className="text-xs text-muted-foreground truncate">{lead.campusPreference}</div>
            </div>
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5">
            <LeadScoreIndicator score={lead.leadScore} />
            <div className="text-xs text-muted-foreground mt-2">
              {lead.aiInsights.conversionProbability}% conversion probability
            </div>
            {/* Add prominent color indicator */}
            {lead.colorTag && (
              <div className="mt-2 flex items-center gap-2">
                <ColorTagIndicator tagId={lead.colorTag} />
                <span className="text-xs text-muted-foreground">
                  {colorTags.find(t => t.id === lead.colorTag)?.name}
                </span>
              </div>
            )}
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5">
            <div className="flex items-center justify-center">
              {isLoadingPredictions ? (
                <div className="flex items-center gap-2 text-muted-foreground">
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
            </div>
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5">
            {isLoadingPredictions ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-lg font-bold text-foreground">
                  {((lead.mlProbability || 0) * 100).toFixed(1)}%
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(lead.mlProbability || 0) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5">
            {isLoadingPredictions ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-lg font-bold text-foreground">
                  {((lead.mlConfidence || 0) * 100).toFixed(0)}%
                </div>
                <Progress value={(lead.mlConfidence || 0) * 100} className="w-full h-2" />
                <div className="text-xs text-muted-foreground">
                  {(lead.mlConfidence || 0) > 0.8 ? 'Very High' :
                   (lead.mlConfidence || 0) > 0.6 ? 'High' :
                   (lead.mlConfidence || 0) > 0.4 ? 'Medium' : 'Low'}
                </div>
              </div>
            )}
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5">
            <div className="space-y-2">
              <StatusBadge status={lead.status} statusType={lead.statusType} />
              <SLABadge sla={lead.slaStatus} />
              {aiTriageExtras.has(String(lead.uid)) && (
                <div className="text-xs text-muted-foreground">
                  NBA: {aiTriageExtras.get(String(lead.uid))!.next_action}
                </div>
              )}
            </div>
          </td>
          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5">
            <div className="flex gap-1">
              <Button 
                size="icon" 
                variant="ghost" 
                aria-label="Call lead" 
                className="hover:bg-success/10 hover:text-success h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => handlePhoneClick(lead)}
              >
                <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                aria-label="Email lead" 
                className="hover:bg-blue-500/10 hover:text-blue-600 h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => handleEmailClick(lead)}
              >
                <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                aria-label="Schedule" 
                className="hover:bg-warning/10 hover:text-warning h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => handleMeetingClick(lead)}
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-foreground hover:text-background">
                    <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => lead.uid && navigate(`/people/${lead.uid}`)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Person Record
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* AI Triage Insights */}
            {aiTriageExtras.has(String(lead.uid)) && (
              <div className="mt-2 p-2 bg-muted/30 rounded border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-3 w-3 text-accent" />
                  <span className="text-xs font-medium text-foreground">AI Score: {aiTriageExtras.get(String(lead.uid))!.score}</span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0.5 ml-auto">
                    Next: {aiTriageExtras.get(String(lead.uid))!.next_action}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(aiTriageExtras.get(String(lead.uid))!.reasons || []).slice(0, 2).map((reason, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0.5">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </td>
        </tr>
        {showContextMenu && (
          <div 
            className="fixed z-50" 
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          >
            <div className="bg-card border border-border rounded-lg shadow-lg p-1 min-w-40">
              <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 border-b border-border">
                Color Tag
              </div>
                             {colorTags.map((tag) => (
                 <button
                   key={tag.id}
                   onClick={() => assignColorTag(tag.id)}
                   className={`w-full text-left py-1.5 px-2 rounded text-xs hover:bg-muted transition-colors duration-200 flex items-center gap-2 ${
                     lead.colorTag === tag.id ? 'bg-muted/50' : ''
                   }`}
                 >
                   <div className={`w-2 h-2 rounded-full ${tag.color.split(' ')[0]} ${tag.color.split(' ')[1]} ${tag.color.split(' ')[2]}`} />
                   <div className="flex items-center gap-2">
                     {renderIcon(tag.icon)}
                     <span>{tag.name}</span>
                   </div>
                   {lead.colorTag === tag.id && <span className="ml-auto text-xs text-muted-foreground">•</span>}
                 </button>
               ))}
            </div>
          </div>
        )}
      </>
    );
  });

  // Optimized table view with virtual scrolling
  const TableView = () => (
    <div className="overflow-hidden" ref={tableContainerRef}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left">
                <Checkbox
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // Select all visible leads
                      const visibleIds = new Set(paginationData.paginatedLeads.map(l => l.uid));
                      setSelectedLeads(prev => new Set([...prev, ...visibleIds]));
                    } else {
                      // Deselect all visible leads
                      const visibleIds = new Set(paginationData.paginatedLeads.map(l => l.uid));
                      setSelectedLeads(prev => {
                        const newSet = new Set(prev);
                        visibleIds.forEach(id => newSet.delete(id));
                        return newSet;
                      });
                    }
                  }}
                  checked={paginationData.paginatedLeads.length > 0 && 
                          paginationData.paginatedLeads.every((l) => selectedLeads.has(l.uid))}
                  aria-label="Select all visible"
                />
              </th>
              <th
                className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-muted-foreground transition-colors duration-200"
                onClick={() => setSortBy("name")}
              >
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline">Lead Details</span>
                  <span className="sm:hidden">Lead</span>
                  {sortBy === "name" && (
                    sortOrder === "asc" ? 
                      <SortAsc className="h-4 w-4 text-muted-foreground" /> : 
                      <SortDesc className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="hidden sm:inline">Course</span>
                <span className="sm:hidden">Course</span>
              </th>
              <th
                className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-muted-foreground transition-colors duration-200"
                onClick={() => setSortBy("leadScore")}
              >
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline">Score</span>
                  <span className="sm:hidden">Score</span>
                  {sortBy === "leadScore" && (
                    sortOrder === "asc" ?
                      <SortAsc className="h-4 w-4 text-muted-foreground" /> :
                      <SortDesc className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">ML Prediction</span>
                  <span className="sm:hidden">ML</span>
                </div>
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">ML Probability</span>
                  <span className="sm:hidden">Prob</span>
                </div>
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">ML Confidence</span>
                  <span className="sm:hidden">Conf</span>
                </div>
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="hidden sm:inline">Status</span>
                <span className="sm:hidden">Status</span>
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="hidden sm:inline">Actions</span>
                <span className="sm:hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody 
            className="divide-y divide-border bg-background"
            style={{ height: totalHeight }}
            onScroll={onScroll}
          >
            {visibleItems.map((lead, index) => (
              <TableRow key={lead.uid} lead={lead} index={index} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Cards view implementation
  const CardsView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {paginationData.paginatedLeads.map((lead) => (
        <Card 
          key={lead.uid} 
          className={cn(
            "hover:shadow-lg transition-all duration-200 cursor-pointer",
            selectedLeads.has(lead.uid) && "ring-2 ring-primary bg-primary/5",
            // Add subtle background tint for color-coded leads
            lead.colorTag && (() => {
              const tag = colorTags.find(t => t.id === lead.colorTag);
              if (!tag) return "";
              if (tag.id === "priority") return "bg-red-500/10";
              if (tag.id === "hot") return "bg-accent/10";
              if (tag.id === "qualified") return "bg-success/10";
              if (tag.id === "nurture") return "bg-info/10";
              if (tag.id === "follow-up") return "bg-forest-green/10";
              if (tag.id === "research") return "bg-warning/10";
              if (tag.id === "cold") return "bg-slate-100/50";
              if (tag.id === "custom-1") return "bg-slate-200/35";
              if (tag.id === "custom-2") return "bg-slate-300/30";
              return "";
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
                    {lead.colorTag && <ColorTagIndicator tagId={lead.colorTag} />}
                  </div>
                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                </div>
              </div>
              <Checkbox
                checked={selectedLeads.has(lead.uid)}
                onCheckedChange={(checked) => {
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

            {/* Lead score and conversion */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Lead Score</span>
                <span className="text-sm font-bold text-foreground">{lead.leadScore}</span>
              </div>
              <Progress value={lead.leadScore} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {lead.aiInsights.conversionProbability}% conversion probability
              </p>
              {/* Add prominent color indicator */}
              {lead.colorTag && (
                <div className="mt-2 flex items-center gap-2">
                  <ColorTagIndicator tagId={lead.colorTag} />
                  <span className="text-xs text-muted-foreground">
                    {colorTags.find(t => t.id === lead.colorTag)?.name}
                  </span>
                </div>
              )}
            </div>

            {/* Status and SLA */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status={lead.status} statusType={lead.statusType} />
                <SLABadge sla={lead.slaStatus} />
              </div>
              {aiTriageExtras.has(String(lead.uid)) && (
                <div className="text-xs text-muted-foreground">
                  NBA: {aiTriageExtras.get(String(lead.uid))!.next_action}
                </div>
              )}
            </div>

            {/* AI Insights (compact) */}
            {aiTriageExtras.has(String(lead.uid)) && (
              <div className="mb-3 p-2 bg-muted/30 rounded border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-3 w-3 text-accent" />
                  <span className="text-xs font-medium text-foreground">AI Score: {aiTriageExtras.get(String(lead.uid))!.score}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(aiTriageExtras.get(String(lead.uid))!.reasons || []).slice(0, 2).map((reason, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0.5">
                      {reason}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1">
                          <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 hover:bg-success/10 hover:text-success"
              onClick={() => handlePhoneClick(lead)}
            >
              <Phone className="h-3 w-3" />
            </Button>
                          <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-600"
              onClick={() => handleEmailClick(lead)}
            >
              <Mail className="h-3 w-3" />
            </Button>
                          <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 hover:bg-warning/10 hover:text-warning"
              onClick={() => handleMeetingClick(lead)}
            >
              <Calendar className="h-3 w-3" />
            </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-foreground hover:text-background">
                    <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => lead.uid && navigate(`/people/${lead.uid}`)}>
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
    <div className="space-y-2">
      {paginationData.paginatedLeads.map((lead) => (
        <div
          key={lead.uid}
          className={cn(
            "flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer",
            selectedLeads.has(lead.uid) && "ring-2 ring-primary bg-primary/5",
            // Add subtle background tint for color-coded leads
            lead.colorTag && (() => {
              const tag = colorTags.find(t => t.id === lead.colorTag);
              if (!tag) return "";
              if (tag.id === "priority") return "bg-red-500/30";
              if (tag.id === "hot") return "bg-orange-500/30";
              if (tag.id === "qualified") return "bg-green-500/30";
              if (tag.id === "nurture") return "bg-blue-500/30";
              if (tag.id === "follow-up") return "bg-purple-500/30";
              if (tag.id === "research") return "bg-yellow-500/30";
              if (tag.id === "cold") return "bg-gray-500/30";
              if (tag.id === "custom-1") return "bg-indigo-500/30";
              if (tag.id === "custom-2") return "bg-pink-500/30";
              return "";
            })()
          )}
          onClick={() => toggleLeadSelection(lead.uid)}
        >
          <Checkbox
            checked={selectedLeads.has(lead.uid)}
            onCheckedChange={(checked) => {
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
          
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center text-xs font-bold border border-border flex-shrink-0">
            {lead.avatar || lead.name.charAt(0)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="font-medium text-foreground truncate">{lead.name}</span>
              {lead.colorTag && <ColorTagIndicator tagId={lead.colorTag} />}
              <span className="text-sm text-muted-foreground">{lead.email}</span>
              <Badge variant="outline" className="text-xs">{lead.courseInterest}</Badge>
              <Badge variant="secondary" className="text-xs">{lead.campusPreference}</Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="text-sm font-bold text-foreground">{lead.leadScore}</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            
            <StatusBadge status={lead.status} statusType={lead.statusType} />
            <SLABadge sla={lead.slaStatus} />
            
            {aiTriageExtras.has(String(lead.uid)) && (
              <div className="flex items-center gap-1 px-2 py-1 bg-accent/10 rounded border border-accent/20">
                <Brain className="h-3 w-3 text-accent" />
                <span className="text-xs text-accent">{aiTriageExtras.get(String(lead.uid))!.score}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7 hover:bg-success/10 hover:text-success"
              onClick={() => handlePhoneClick(lead)}
            >
              <Phone className="h-3 w-3" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7 hover:bg-blue-500/10 hover:text-blue-600"
              onClick={() => handleEmailClick(lead)}
            >
              <Mail className="h-3 w-3" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-7 w-7 hover:bg-warning/10 hover:text-warning"
              onClick={() => handleMeetingClick(lead)}
            >
              <Calendar className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
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
            onClick={() => {
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

  const BulkActionsMenu = () => (
    showBulkActions && (
      <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 min-w-56">
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Bulk Actions ({selectedLeads.size} selected)</h4>
        </div>
        <div className="p-2 space-y-1">
          <button
            onClick={() => handleBulkAction("status")}
            className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 rounded-md transition-colors duration-200 flex items-center gap-3"
          >
            <Edit3 className="h-4 w-4" />
            Update Status
          </button>
          <button
            onClick={() => handleBulkAction("email")}
            className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 rounded-md transition-colors duration-200 flex items-center gap-3"
          >
            <Send className="h-4 w-4" />
            Send Nurture Email (AI)
          </button>
          <button
            onClick={() => handleBulkAction("interview")}
            className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 rounded-md transition-colors duration-200 flex items-center gap-3"
          >
            <Calendar className="h-4 w-4" />
            Book Interview Email (AI)
          </button>
          <button
            onClick={() => handleBulkAction("reengage")}
            className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 rounded-md transition-colors duration-200 flex items-center gap-3"
          >
            <Zap className="h-4 w-4" />
            Re-engage Email (AI)
          </button>
                     <button
             onClick={() => handleBulkAction("color")}
             className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 rounded-md transition-colors duration-200 flex items-center gap-3"
           >
             <Target className="h-4 w-4" />
             Color Tag
           </button>
          <button
            onClick={() => handleBulkAction("export")}
            className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 rounded-md transition-colors duration-200 flex items-center gap-3"
          >
            <Download className="h-4 w-4" />
            Export Selected
          </button>
          <div className="border-t border-border my-2"></div>
          <button
            onClick={() => handleBulkAction("delete")}
            className="w-full text-left px-4 py-3 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors duration-200 flex items-center gap-3"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </button>
        </div>
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
              // Handle add lead action
            }}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-foreground hover:text-background rounded-md transition-colors duration-200 flex items-center gap-3"
          >
            <UserPlus className="h-4 w-4" />
            Add Lead
          </button>
          <button
            onClick={() => {
              setShowActionsMenu(false);
              setShowSaveViewModal(true);
            }}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-foreground hover:text-background rounded-md transition-colors duration-200 flex items-center gap-3"
          >
            <BookmarkPlus className="h-4 w-4" />
            Save View
          </button>
          <button
            onClick={() => {
              setShowActionsMenu(false);
              // Handle export action
            }}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-foreground hover:text-background rounded-md transition-colors duration-200 flex items-center gap-3"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <div className="border-t border-border my-1"></div>
          <button
            onClick={() => {
              setShowActionsMenu(false);
              setShowAnalytics(!showAnalytics);
            }}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-foreground hover:text-background rounded-md transition-colors duration-200 flex items-center gap-3"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </button>
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
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Search</span>
              <kbd className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">⌘K</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Toggle Filters</span>
              <kbd className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono">⌘F</kbd>
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
            { stage: "Contacted", count: datasetLeads.filter(l => l.statusType === "contacted").length, color: "bg-info" },
            { stage: "Qualified", count: datasetLeads.filter(l => l.statusType === "qualified").length, color: "bg-success" },
            { stage: "Nurturing", count: datasetLeads.filter(l => l.statusType === "nurturing").length, color: "bg-accent" },
            { stage: "Converted", count: datasetLeads.filter(l => l.statusType === "qualified" && l.leadScore >= 80).length, color: "bg-success" }
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
                  index === 0 ? 'bg-success' : 
                  index === 1 ? 'bg-info' : 
                  index === 2 ? 'bg-accent' : 
                  index === 3 ? 'bg-warning' : 'bg-muted-foreground'
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
                  course.avgScore >= 80 ? 'bg-success' : 
                  course.avgScore >= 60 ? 'bg-info' : 
                  course.avgScore >= 40 ? 'bg-warning' : 'bg-muted-foreground'
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
                    className="bg-info h-2 rounded-full transition-all duration-1000 ease-out"
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
    if (filteredLeads.length === 0) return;
    
    console.log("🚀 Starting AI triage...");
    setIsAiTriageLoading(true);
    try {
      const payload = {
        filters: {
          status: selectedStatus === "all" ? undefined : selectedStatus,
          source: selectedSource === "all" ? undefined : selectedSource,
          course: selectedCourse === "all" ? undefined : selectedCourse,
          year: selectedYear === "all" ? undefined : selectedYear,
          stalled_days_gte: urgentOnly ? 12 : undefined,
        }
      };

      console.log("📤 Sending payload:", payload);
      console.log("🌐 Calling:", "http://127.0.0.1:8000/ai/leads/triage");

      const res = await fetch("http://127.0.0.1:8000/ai/leads/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      console.log("📥 Response status:", res.status, res.statusText);

      if (!res.ok) {
        throw new Error(`AI triage failed: ${res.statusText}`);
      }

      const json: { 
        summary: { cohort_size: number; top_reasons: string[] }; 
        items: { id: string; score: number; reasons: string[]; next_action: string }[] 
      } = await res.json();

      console.log("🎯 AI Response:", json);

      // Create ranking map for reordering (use UUIDs directly)
      const rank = new Map(
        json.items.map((x, i) => {
          // Use the UUID directly as the key since we're now using uid in the frontend
          const key = String(x.id);
          return [key, { i, score: x.score, reasons: x.reasons, next_action: x.next_action }];
        })
      );
      
      console.log("🗺️ Ranking map:", rank);
      setAiTriageExtras(rank);
      setAiTriageSummary(json.summary);

      // Add AI insight card
      setAiInsights(prev => [
        ...prev.filter(x => x.type !== "recommendation"),
        {
          id: "triage-summary",
          type: "recommendation",
          title: "AI Triage Completed",
          description: `Analysed ${json.summary.cohort_size} leads. Top drivers: ${json.summary.top_reasons?.join(", ") || "High lead scores"}`,
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
      const res = await fetch("http://127.0.0.1:8000/ai/leads/compose/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lead_ids: uuids,
          intent 
        })
      });

      if (!res.ok) {
        throw new Error(`AI composition failed: ${res.statusText}`);
      }

      const draft = await res.json();
      
      // For now, just show the draft in console and alert
      // You can integrate this with your email composer later
      console.log("AI Draft:", draft);
      alert(`AI Draft Ready!\n\nSubject: ${draft.subject}\n\nBody: ${draft.body}\n\nMerge Fields: ${draft.merge_fields?.join(", ")}`);
      
    } catch (error) {
      console.error("AI outreach error:", error);
      alert(`AI composition failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Bulk Color Tag Assignment
  const handleBulkColorTagAssignment = () => {
    if (selectedLeads.size === 0) return;
    setShowColorTagModal(true);
  };

  const assignColorTagToSelected = (colorTagId: string) => {
    // In a real app, you'd make an API call here
    console.log(`Assigning color tag ${colorTagId} to ${selectedLeads.size} leads`);
    
    // For demo purposes, update the local state
    // In production, this would update the backend
    // Note: In a real implementation, you'd update the backend and refresh the data
    // For now, we'll just log the action
    console.log(`Would assign color tag ${colorTagId} to leads:`, Array.from(selectedLeads));
    
    setShowColorTagModal(false);
    setSelectedLeads(new Set()); // Clear selection after assignment
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
    const tag = colorTags.find(t => t.id === tagId);
    if (!tag) return null;
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`w-3 h-3 rounded-full border-2 border-white shadow-sm opacity-70 cursor-help ${tag.color.split(' ')[0]} ${tag.color.split(' ')[1]} ${tag.color.split(' ')[2]}`}
          />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="flex items-center gap-2 mb-1">
            {renderIcon(tag.icon)}
            <span className="font-semibold">{tag.name}</span>
          </div>
          <p className="text-xs text-muted-foreground">{tag.description}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  // Email Composer State
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Lead | null>(null);

  // Call Composer State
  const [showCallComposer, setShowCallComposer] = useState(false);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<Lead | null>(null);

  // Meeting Booker State
  const [showMeetingBooker, setShowMeetingBooker] = useState(false);
  const [selectedLeadForMeeting, setSelectedLeadForMeeting] = useState<Lead | null>(null);

  // Handle Email Button Click
  const handleEmailClick = (lead: Lead) => {
    setSelectedLeadForEmail(lead);
    setShowEmailComposer(true);
  };

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

  // Handle Call Save
  const handleCallSave = async (callData: any) => {
    try {
      // In a real app, you'd save this call data to your CRM system
      console.log("Saving call:", {
        lead: callData.lead.name,
        callType: callData.callType,
        outcome: callData.callOutcome.type,
        duration: callData.duration,
        notes: callData.notes.length
      });
      
      // Log the call activity
      console.log(`Call with ${callData.lead.name} saved successfully`);
      
    } catch (error) {
      console.error("Failed to save call:", error);
      throw error; // Re-throw to let CallComposer handle the error
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

  // Handle Phone Button Click
  const handlePhoneClick = (lead: Lead) => {
    if (lead.phone) {
      // Open Call Composer
      setSelectedLeadForCall(lead);
      setShowCallComposer(true);
    } else {
      alert(`No phone number available for ${lead.name}`);
    }
  };



  // Handle Meeting Button Click
  const handleMeetingClick = (lead: Lead) => {
    // Open Meeting Booker
    setSelectedLeadForMeeting(lead);
    setShowMeetingBooker(true);
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gradient-to-br from-background via-background to-muted/30">
        {/* Saved Views Sidebar (left) */}
        {showSavedViews ? (
          <SavedViewsSidebar />
        ) : (
          <button
            onClick={() => setShowSavedViews(true)}
            className="w-14 backdrop-blur-sm border-r border-border flex flex-col items-center justify-center transition-colors duration-200 shadow-lg"
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
                    {currentView ? currentView.name : "All Leads"}
                  </h1>
                  {currentView && (
                    <Button variant="ghost" size="sm" onClick={clearView} className="gap-1 h-7 px-2 text-xs hover:bg-muted">
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {filteredLeads.length.toLocaleString()} leads
                  </span>
                  {selectedLeads.size > 0 && (
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-medium">
                      {selectedLeads.size} selected
                    </span>
                  )}
                </div>

                {/* Primary Actions - Clean Layout */}
                <div className="flex items-center gap-2">
                  {selectedLeads.size > 0 && (
                    <>
                      <div className="relative">
                        <Button 
                          variant="outline"
                          size="default"
                          className="gap-2 h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all duration-200 text-foreground hover:text-foreground"
                          onClick={() => setShowBulkActions(!showBulkActions)}
                        >
                          Bulk ({selectedLeads.size})
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <BulkActionsMenu />
                      </div>
                      <Button variant="ghost" size="default" onClick={clearSelection} className="h-9 px-3 text-sm">
                        Clear
                      </Button>
                    </>
                  )}
                  
                  {/* AI Status Indicator */}
                  {aiTriageSummary && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg">
                      <Brain className="h-3 w-3 text-accent" />
                      <span className="text-xs font-medium text-accent">AI Active</span>
                    </div>
                  )}
                  
                  {/* Primary AI Button - Liquid Glass */}
                  <Button 
                    variant="default"
                    size="default"
                    className="gap-2 h-9 px-4 text-sm font-medium bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={handleAiTriage}
                    disabled={isAiTriageLoading || filteredLeads.length === 0}
                  >
                    <Brain className="h-4 w-4" /> 
                    <span className="hidden sm:inline">
                      {isAiTriageLoading ? "AI Thinking..." : "Prioritise with AI"}
                    </span>
                    <span className="sm:hidden">
                      {isAiTriageLoading ? "AI..." : "AI"}
                    </span>
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
            {showStats && (
              <div className="px-4 lg:px-6 pb-4 border-b border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-foreground/90">Quick Stats</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowStats(false)} 
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
                  <div className="flex items-center gap-3 bg-success/10 backdrop-blur-sm border border-success/20 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-success/15">
                    <div className="p-2 rounded-lg bg-success/20 backdrop-blur-sm">
                      <Zap className="h-4 w-4 text-success" />
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
                      <div className="text-xs text-muted-foreground">High Score</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-warning/10 backdrop-blur-sm border border-warning/20 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-warning/15">
                    <div className="p-2 rounded-lg bg-warning/20 backdrop-blur-sm">
                      <Target className="h-4 w-4 text-warning" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-warning">{stats.selected}</div>
                      <div className="text-xs text-warning/80">Selected</div>
                    </div>
                  </div>
                  {aiTriageSummary && (
                    <div className="flex items-center gap-3 bg-accent/10 backdrop-blur-sm border border-accent/20 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-accent/15">
                      <div className="p-2 rounded-lg bg-accent/20 backdrop-blur-sm">
                        <Brain className="h-4 w-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-accent">{aiTriageSummary.cohort_size}</div>
                        <div className="text-xs text-accent/80">AI Analyzed</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Show Stats Toggle (when hidden) - Better UX */}
            {!showStats && (
              <div className="px-4 lg:px-6 py-4 border-b border-border/50">
                <Button 
                  variant="ghost" 
                  size="default" 
                  onClick={() => setShowStats(true)} 
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
                <div className="flex items-center gap-2">
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    onClick={() => setShowFilters((s) => !s)}
                    className="gap-2 h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all duration-200 text-foreground hover:text-foreground"
                  >
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filters</span>
                  </Button>

                  {/* View Mode Toggle - Clean Design */}
                  <div className="flex rounded-lg border border-border/50 overflow-hidden bg-background/60 backdrop-blur-sm">
                    <button
                      onClick={() => setViewMode("table")}
                      className={`h-9 px-3 flex items-center justify-center transition-all duration-200 ${
                        viewMode === "table" 
                          ? "bg-foreground text-background" 
                          : "bg-transparent text-foreground hover:bg-foreground/10"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("cards")}
                      className={`h-9 px-3 flex items-center justify-center transition-all duration-200 ${
                        viewMode === "cards" 
                          ? "bg-foreground text-background" 
                          : "bg-transparent text-foreground hover:bg-foreground/10"
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("compact")}
                      className={`h-9 px-3 flex items-center justify-center transition-all duration-200 ${
                        viewMode === "compact" 
                          ? "bg-foreground text-background" 
                          : "bg-transparent text-foreground hover:bg-foreground/10"
                      }`}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("editable")}
                      className={`h-9 px-3 flex items-center justify-center transition-all duration-200 ${
                        viewMode === "editable" 
                          ? "bg-foreground text-background" 
                          : "bg-transparent text-foreground hover:bg-foreground/10"
                      }`}
                      title="Edit Lead Information"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>

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

            {/* Compact Advanced Filters - Responsive Grid */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-6 border-t border-border px-4 lg:px-6">
                <Select value={selectedStatus} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger className="h-10 border-border text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New Lead</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="nurturing">Nurturing</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedSource} onValueChange={(value) => handleFilterChange('source', value)}>
                  <SelectTrigger className="h-10 border-border text-sm"><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="Google Ads">Google Ads</SelectItem>
                    <SelectItem value="School Partnership">School Partnership</SelectItem>
                    <SelectItem value="UCAS Fair">UCAS Fair</SelectItem>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Prospectus Download">Prospectus Download</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedCourse} onValueChange={(value) => handleFilterChange('course', value)}>
                  <SelectTrigger className="h-10 border-border text-sm"><SelectValue placeholder="Course" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    <SelectItem value="Music Production">Music Production</SelectItem>
                    <SelectItem value="Audio Engineering">Audio Engineering</SelectItem>
                    <SelectItem value="Songwriting">Songwriting</SelectItem>
                    <SelectItem value="Electronic Music">Electronic Music</SelectItem>
                    <SelectItem value="Music Business">Music Business</SelectItem>
                    <SelectItem value="Live Sound">Live Sound</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={(value) => handleFilterChange('year', value)}>
                  <SelectTrigger className="h-10 border-border text-sm"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="2025/26">2025/26</SelectItem>
                    <SelectItem value="2026/27">2026/27</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={String(sortBy)}
                  onValueChange={(v) => setSortBy(v as any)}
                >
                  <SelectTrigger className="h-10 border-border text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leadScore">Score</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="createdDate">Created</SelectItem>
                    <SelectItem value="lastContact">Last Contact</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedColorTag} onValueChange={setSelectedColorTag}>
                  <SelectTrigger className="h-10 border-border text-sm">
                    <SelectValue placeholder="Color Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Colors</SelectItem>
                    {colorTags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${tag.color.split(' ')[0]} ${tag.color.split(' ')[1]} ${tag.color.split(' ')[2]}`} />
                          <div className="flex items-center gap-2">
                            {renderIcon(tag.icon)}
                            <span>{tag.name}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 xl:p-8">
            {showAnalytics ? (
              <AnalyticsDashboard />
            ) : (
              <>
                <Card className="overflow-hidden border-0 shadow-xl">
                  <CardContent className="p-0">
                    {viewMode === "table" && <TableView />}
                    {viewMode === "cards" && <CardsView />}
                    {viewMode === "compact" && <CompactView />}
                    {viewMode === "editable" && <EditableLeadView />}
                    {/* You can add Cards/Compact renderers later; table covers your ask */}
                  </CardContent>
                </Card>

                {/* Bridge Answer - AI Triage Summary */}
                {aiTriageSummary && (
                  <Card className="mt-6 border border-accent/20 bg-accent/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Brain className="h-4 w-4 text-accent" />
                        <span className="text-sm font-semibold text-foreground">Bridge Answer</span>
                        <Badge variant="outline" className="ml-auto text-[10px]">AI</Badge>
                      </div>
                      <div className="text-sm text-foreground">
                        Analysed {aiTriageSummary.cohort_size} leads. Top drivers: {(aiTriageSummary.top_reasons || []).join(', ') || 'High lead scores'}.
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Pagination */}
                {paginationData.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8">
                    <div className="text-sm text-muted-foreground font-medium text-center sm:text-left">
                      Showing {paginationData.start + 1} to {paginationData.end} of {filteredLeads.length.toLocaleString()} results
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
                  <Input placeholder="e.g., High Priority Leads" className="h-12" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Description</label>
                  <textarea className="w-full rounded-lg border border-border bg-background p-3 text-sm h-24 resize-none focus:ring-2 focus:ring-ring transition-all duration-200" placeholder="Describe this view..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Save to Folder</label>
                  <Select defaultValue="my-views">
                    <SelectTrigger className="h-12 border-border"><SelectValue placeholder="Folder" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="my-views">My Views</SelectItem>
                      <SelectItem value="team-views">Team Views</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="inline-flex items-center gap-3 cursor-pointer">
                  <Checkbox /> <span className="text-sm font-medium text-foreground">Share with team</span>
                </label>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => setShowSaveViewModal(false)}>Cancel</Button>
                  <Button className="flex-1 h-12 shadow-lg" onClick={() => setShowSaveViewModal(false)}>Save View</Button>
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
                <CardTitle className="text-lg text-foreground">Color Tag</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selected
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                                 <div className="grid grid-cols-3 gap-2">
                   {colorTags.map((tag) => (
                     <button
                       key={tag.id}
                       onClick={() => assignColorTagToSelected(tag.id)}
                       className={`p-3 rounded-lg border border-transparent hover:border-border transition-all duration-200 text-center group ${tag.color}`}
                       title={tag.description}
                     >
                       <div className="flex items-center justify-center mb-2">
                         {renderIcon(tag.icon, "h-5 w-5")}
                       </div>
                       <div className="text-xs font-medium">{tag.name}</div>
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

        {/* Call Composer Component */}
        <CallComposer
          isOpen={showCallComposer}
          onClose={() => setShowCallComposer(false)}
          lead={selectedLeadForCall}
          onSaveCall={handleCallSave}
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
      </div>
    </TooltipProvider>
  );
};

export default LeadsManagementPage;