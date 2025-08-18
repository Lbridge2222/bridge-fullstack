import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  Users, Search, Filter, Clock, AlertTriangle, Phone, Mail, Calendar,
  MoreHorizontal, ChevronDown, Download, UserPlus, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Star, Users2, X, LayoutGrid, Grid3X3, List,
  SortAsc, SortDesc, BookmarkPlus, TrendingUp, Target, Zap, Eye, Command,
  Trash2, Edit3, Send, Clock3, BarChart3,
  PieChart, Activity, Brain, Lightbulb, TrendingDown, CalendarDays,
  ArrowUpRight, Sparkles, Archive
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
  avatar?: string;
  aiInsights: {
    conversionProbability: number;
    bestContactTime: string;
    recommendedAction: string;
    urgency: "high" | "medium" | "low";
  };
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
  const [viewMode, setViewMode] = useState<"table" | "cards" | "compact">("table");
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());

  // Saved Views & Folders
  const [showSavedViews, setShowSavedViews] = useState(true);
  const [currentView, setCurrentView] = useState<SavedView | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["my-views", "team-views"]));
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



  // Mock data
  const generateLargeDataset = (): Lead[] => {
    const baseLeads = [
      {
        name: "Emma Thompson", email: "emma.thompson@gmail.com", phone: "+44 7812 345678",
        courseInterest: "Music Production", academicYear: "2025/26", campusPreference: "Brighton",
        enquiryType: "Web Form", leadSource: "Google Ads", status: "New Lead", statusType: "new" as const,
        leadScore: 85, slaStatus: "urgent" as const, avatar: "ET",
      },
      {
        name: "Marcus Johnson", email: "m.johnson@college.ac.uk", phone: "+44 7923 456789",
        courseInterest: "Audio Engineering", academicYear: "2026/27", campusPreference: "Sheffield",
        enquiryType: "School Visit", leadSource: "School Partnership", status: "Contacted", statusType: "contacted" as const,
        leadScore: 72, slaStatus: "met" as const, avatar: "MJ",
      },
      {
        name: "Sofia Rodriguez", email: "sofia.r@hotmail.com", phone: "+44 7634 567890",
        courseInterest: "Songwriting", academicYear: "2025/26", campusPreference: "Online",
        enquiryType: "Recruitment Event", leadSource: "UCAS Fair", status: "Qualified", statusType: "qualified" as const,
        leadScore: 91, slaStatus: "met" as const, avatar: "SR",
      },
    ];

    const courses = ["Music Production", "Audio Engineering", "Songwriting", "Electronic Music", "Music Business", "Live Sound"];
    const sources = ["Google Ads", "School Partnership", "UCAS Fair", "Social Media", "Prospectus Download"];
    const statuses = ["New Lead", "Contacted", "Qualified", "Nurturing", "Cold"] as const;
    const statusTypeMap = {
      "New Lead": "new",
      "Contacted": "contacted",
      "Qualified": "qualified",
      "Nurturing": "nurturing",
      "Cold": "cold",
    } as const;
    const years = ["2025/26", "2026/27"];
    const campuses = ["Brighton", "Sheffield", "Online"];

    const leads: Lead[] = [];
    for (let i = 0; i < 1200; i++) {
      const base = baseLeads[i % baseLeads.length];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      leads.push({
        ...base,
        id: i + 1,
        name: `${base.name.split(" ")[0]} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 999)}`,
        email: `lead${i + 1}@example.com`,
        courseInterest: courses[Math.floor(Math.random() * courses.length)],
        leadSource: sources[Math.floor(Math.random() * sources.length)],
        status,
        statusType: statusTypeMap[status],
        academicYear: years[Math.floor(Math.random() * years.length)],
        campusPreference: campuses[Math.floor(Math.random() * campuses.length)],
        leadScore: Math.floor(Math.random() * 100),
        createdDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastContact: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        nextAction: ["Initial contact required", "Send prospectus", "Schedule call", "Follow up", "Book open day"][Math.floor(Math.random() * 5)],
        slaStatus: (["urgent", "warning", "within_sla", "met"] as Lead["slaStatus"][])[Math.floor(Math.random() * 4)],
        contactAttempts: Math.floor(Math.random() * 6),
        tags: [["High Interest", "Direct Course Match"], ["School Partnership", "Future Entry"], ["Hot Lead", "Open Day Interest"]][Math.floor(Math.random() * 3)],
        aiInsights: {
          conversionProbability: Math.floor(Math.random() * 100),
          bestContactTime: ["Weekday evenings", "Business hours", "Weekends"][Math.floor(Math.random() * 3)],
          recommendedAction: ["Send portfolio examples", "Schedule campus visit", "Convert to application"][Math.floor(Math.random() * 3)],
          urgency: (["high", "medium", "low"] as const)[Math.floor(Math.random() * 3)],
        },
      });
    }
    return leads;
  };

  const mockLeads = useMemo(() => generateLargeDataset(), []);

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
    const courses = [...new Set(mockLeads.map(l => l.courseInterest))];
    courses.forEach(course => {
      if (course.toLowerCase().includes(term)) {
        const count = mockLeads.filter(l => l.courseInterest === course).length;
        suggestions.push({ type: "course", value: course, count });
      }
    });
    
    // Campus suggestions
    const campuses = [...new Set(mockLeads.map(l => l.campusPreference))];
    campuses.forEach(campus => {
      if (campus.toLowerCase().includes(term)) {
        const count = mockLeads.filter(l => l.campusPreference === campus).length;
        suggestions.push({ type: "campus", value: campus, count });
      }
    });
    
    // Source suggestions
    const sources = [...new Set(mockLeads.map(l => l.leadSource))];
    sources.forEach(source => {
      if (source.toLowerCase().includes(term)) {
        const count = mockLeads.filter(l => l.leadSource === source).length;
        suggestions.push({ type: "source", value: source, count });
      }
    });
    
    return suggestions.slice(0, 5);
  }, [searchTerm, mockLeads]);

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
    
    const leadIds = Array.from(selectedLeads);
    
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
        // Send email to selected leads
        console.log(`Sending email to ${leadIds.length} leads`);
        break;
    }
    
    setShowBulkActions(false);
    setBulkAction("");
  };

  // Memoized filtered leads with performance optimization
  const filteredLeads = useMemo(() => {
    if (isLoading) return [];
    
    let filtered = currentView ? applyViewFilters(mockLeads, currentView) : mockLeads;
    
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
      return matchesStatus && matchesSource && matchesCourse && matchesYear && matchesUrgent;
    });

    // Optimized sorting
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

    return filtered;
  }, [mockLeads, currentView, debouncedSearchTerm, selectedStatus, selectedSource, selectedCourse, selectedYear, urgentOnly, sortBy, sortOrder, isLoading]);

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

  const toggleLeadSelection = useCallback((id: number) => {
    const s = new Set(selectedLeads);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedLeads(s);
  }, [selectedLeads]);

  const selectAllVisible = useCallback(() => {
    const s = new Set(selectedLeads);
    paginationData.paginatedLeads.forEach((l) => s.add(l.id));
    setSelectedLeads(s);
  }, [selectedLeads, paginationData.paginatedLeads]);

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
              {mockLeads.length.toLocaleString()} total leads
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
  const TableRow = React.memo(({ lead, index }: { lead: Lead; index: number }) => (
    <tr className={cn(
      "hover:bg-muted/50 transition-colors duration-200", 
      selectedLeads.has(lead.id) && "bg-muted ring-1 ring-border"
    )}>
      <td className="px-6 py-5">
        <Checkbox
          checked={selectedLeads.has(lead.id)}
          onCheckedChange={() => toggleLeadSelection(lead.id)}
          aria-label={`Select ${lead.name}`}
        />
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center">
          <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/80 text-muted-foreground text-sm font-bold border border-border">
            {lead.avatar || lead.name.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{lead.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Mail className="h-3 w-3" />
              {lead.email}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Zap className="h-3 w-3" />
              {lead.leadSource}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="space-y-1">
          <div className="text-sm font-medium text-foreground">{lead.courseInterest}</div>
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md inline-block">
            {lead.academicYear}
          </div>
          <div className="text-xs text-muted-foreground">{lead.campusPreference}</div>
        </div>
      </td>
      <td className="px-6 py-5">
        <LeadScoreIndicator score={lead.leadScore} />
        <div className="text-xs text-muted-foreground mt-2">
          {lead.aiInsights.conversionProbability}% conversion probability
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="space-y-2">
          <StatusBadge status={lead.status} statusType={lead.statusType} />
          <SLABadge sla={lead.slaStatus} />
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" aria-label="Call lead" className="hover:bg-success/10 hover:text-success">
            <Phone className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Email lead" className="hover:bg-muted hover:text-muted-foreground">
            <Mail className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="Schedule" className="hover:bg-warning/10 hover:text-warning">
            <Calendar className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" aria-label="More actions" className="hover:bg-muted">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  ));

  // Optimized table view with virtual scrolling
  const TableView = () => (
    <div className="overflow-hidden" ref={tableContainerRef}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left">
                <Checkbox
                  onCheckedChange={(v) => (v ? selectAllVisible() : clearSelection())}
                  checked={paginationData.paginatedLeads.every((l) => selectedLeads.has(l.id)) && paginationData.paginatedLeads.length > 0}
                  aria-label="Select all visible"
                />
              </th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-muted-foreground transition-colors duration-200"
                onClick={() => setSortBy("name")}
              >
                <div className="flex items-center gap-2">
                  Lead Details
                  {sortBy === "name" && (
                    sortOrder === "asc" ? 
                      <SortAsc className="h-4 w-4 text-muted-foreground" /> : 
                      <SortDesc className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Course</th>
              <th
                className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-muted-foreground transition-colors duration-200"
                onClick={() => setSortBy("leadScore")}
              >
                <div className="flex items-center gap-2">
                  Score
                  {sortBy === "leadScore" && (
                    sortOrder === "asc" ? 
                      <SortAsc className="h-4 w-4 text-muted-foreground" /> : 
                      <SortDesc className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody 
            className="divide-y divide-border bg-background"
            style={{ height: totalHeight }}
            onScroll={onScroll}
          >
            {visibleItems.map((lead, index) => (
              <TableRow key={lead.id} lead={lead} index={index} />
            ))}
          </tbody>
        </table>
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
      <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 min-w-48">
        <div className="p-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">Bulk Actions ({selectedLeads.size} selected)</h4>
        </div>
        <div className="p-2 space-y-1">
          <button
            onClick={() => handleBulkAction("status")}
            className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-md transition-colors duration-200 flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Update Status
          </button>
          <button
            onClick={() => handleBulkAction("email")}
            className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-md transition-colors duration-200 flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Send Email
          </button>
          <button
            onClick={() => handleBulkAction("export")}
            className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 rounded-md transition-colors duration-200 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Selected
          </button>
          <div className="border-t border-border my-1"></div>
          <button
            onClick={() => handleBulkAction("delete")}
            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors duration-200 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
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
      const dayLeads = mockLeads.filter(lead => 
        lead.createdDate.startsWith(date)
      );
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
      mockLeads.reduce((acc, lead) => {
        acc[lead.leadSource] = (acc[lead.leadSource] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
    .map(([source, count]) => ({
      source,
      count,
      conversionRate: (() => {
        const sourceLeads = mockLeads.filter(l => l.leadSource === source);
        const converted = sourceLeads.filter(l => 
          l.statusType === "qualified" || l.statusType === "nurturing"
        );
        return sourceLeads.length > 0 ? (converted.length / sourceLeads.length) * 100 : 0;
      })()
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate);

    // Course performance
    const coursePerformance = Object.entries(
      mockLeads.reduce((acc, lead) => {
        acc[lead.courseInterest] = (acc[lead.courseInterest] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
    .map(([course, count]) => ({
      course,
      count,
      avgScore: mockLeads
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
  }, [mockLeads]);

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
            { stage: "Contacted", count: mockLeads.filter(l => l.statusType === "contacted").length, color: "bg-info" },
            { stage: "Qualified", count: mockLeads.filter(l => l.statusType === "qualified").length, color: "bg-success" },
            { stage: "Nurturing", count: mockLeads.filter(l => l.statusType === "nurturing").length, color: "bg-accent" },
            { stage: "Converted", count: mockLeads.filter(l => l.statusType === "qualified" && l.leadScore >= 80).length, color: "bg-success" }
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
                <span className="text-xs text-muted-foreground w-16">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
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
          {/* Compact Header - Glass Effect */}
          <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border p-3 sm:p-4 lg:p-6 shadow-sm sticky top-0 z-40">
            {/* Title Row */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate">
                  {currentView ? currentView.name : "All Leads"}
                </h1>
                {currentView && (
                  <Button variant="secondary" size="sm" onClick={clearView} className="gap-1 h-7 px-2 text-xs hover:shadow-md transition-all duration-200">
                    <X className="h-3 w-3" /> Clear
                  </Button>
                )}
                <span className="text-xs sm:text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {filteredLeads.length.toLocaleString()} leads
                </span>
                {selectedLeads.size > 0 && (
                  <span className="text-xs bg-info/10 text-info px-2 py-1 rounded-full font-medium">
                    {selectedLeads.size} selected
                  </span>
                )}
              </div>

              {/* Action Buttons - Compact */}
              <div className="flex items-center gap-2">
                {selectedLeads.size > 0 && (
                  <>
                    <div className="relative">
                      <Button 
                        size="sm"
                        className="gap-1 h-7 px-2 text-xs shadow-sm hover:shadow-md transition-all duration-200"
                        onClick={() => setShowBulkActions(!showBulkActions)}
                      >
                        Bulk ({selectedLeads.size})
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <BulkActionsMenu />
                    </div>
                    <Button variant="secondary" size="sm" onClick={clearSelection} className="h-7 px-2 text-xs hover:shadow-md transition-all duration-200">
                      Clear
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" className="gap-1 h-7 px-2 text-xs hover:shadow-md transition-all duration-200">
                  <Download className="h-3 w-3" /> Export
                </Button>
                <Button size="sm" className="gap-1 h-7 px-2 text-xs shadow-sm hover:shadow-md transition-all duration-200" onClick={() => setShowSaveViewModal(true)}>
                  <BookmarkPlus className="h-3 w-3" /> Save
                </Button>
                <Button 
                  variant={showAnalytics ? "default" : "outline"}
                  size="sm"
                  className="gap-1 h-7 px-2 text-xs shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={() => setShowAnalytics(!showAnalytics)}
                >
                  <BarChart3 className="h-3 w-3" /> Analytics
                </Button>
                <Button size="sm" className="gap-1 h-7 px-2 text-xs shadow-sm hover:shadow-md transition-all duration-200">
                  <UserPlus className="h-3 w-3" /> Add
                </Button>
              </div>
            </div>

            {/* Compact Quick Stats - Inline Row */}
            <div className="flex items-center gap-4 mb-4 overflow-x-auto pb-2">
              <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg border border-border flex-shrink-0">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{stats.total.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <div className="flex items-center gap-2 bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20 flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">{stats.urgent}</span>
                <span className="text-xs text-destructive">Urgent</span>
              </div>
              <div className="flex items-center gap-2 bg-success/10 px-3 py-2 rounded-lg border border-success/20 flex-shrink-0">
                <Zap className="h-4 w-4 text-success" />
                <span className="text-sm font-semibold text-success">{stats.newToday}</span>
                <span className="text-xs text-success">Today</span>
              </div>
              <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg border border-border flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{stats.highScore}</span>
                <span className="text-xs text-muted-foreground">High Score</span>
              </div>
              <div className="flex items-center gap-2 bg-warning/10 px-3 py-2 rounded-lg border border-warning/20 flex-shrink-0">
                <Target className="h-4 w-4 text-warning" />
                <span className="text-sm font-semibold text-warning">{stats.selected}</span>
                <span className="text-xs text-warning">Selected</span>
              </div>
            </div>

            {/* Compact Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    ref={searchInputRef}
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSearchSuggestions(searchTerm.length > 0)}
                    onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                    placeholder="Search leads… (⌘K)"
                    className="w-full pl-9 h-8 text-sm border-border focus:ring-2 focus:ring-ring transition-all duration-200"
                  />
                  <SearchSuggestions />
                </div>

                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  onClick={() => setShowFilters((s) => !s)}
                  className="gap-1 h-8 px-3 text-xs hover:shadow-md transition-all duration-200"
                >
                  <Filter className="h-3 w-3" /> Filters
                </Button>



                <div className="flex rounded-lg border border-border overflow-hidden shadow-sm">
                  <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("table")} className="h-8 w-8">
                    <List className="h-3 w-3" />
                  </Button>
                  <Button variant={viewMode === "cards" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("cards")} className="h-8 w-8">
                    <LayoutGrid className="h-3 w-3" />
                  </Button>
                  <Button variant={viewMode === "compact" ? "secondary" : "ghost"} size="icon" onClick={() => setViewMode("compact")} className="h-8 w-8">
                    <Grid3X3 className="h-3 w-3" />
                  </Button>
                </div>

                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(v) => setItemsPerPage(Number(v))}
                >
                  <SelectTrigger className="w-20 h-8 border-border text-xs">
                    <SelectValue placeholder="25" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowKeyboardShortcuts(true)}
                      className="h-8 w-8"
                    >
                      <Command className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Keyboard shortcuts</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Filter Chips */}
            {activeFilters.length > 0 && <FilterChips />}

            {/* Compact Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-3 border-t border-border">
                <Select value={selectedStatus} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger className="h-8 border-border text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
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
                  <SelectTrigger className="h-8 border-border text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
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
                  <SelectTrigger className="h-8 border-border text-xs"><SelectValue placeholder="Course" /></SelectTrigger>
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
                  <SelectTrigger className="h-8 border-border text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
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
                  <SelectTrigger className="h-8 border-border text-xs">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leadScore">Score</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="createdDate">Created</SelectItem>
                    <SelectItem value="lastContact">Last Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            {showAnalytics ? (
              <AnalyticsDashboard />
            ) : (
              <>
                <Card className="overflow-hidden border-0 shadow-xl">
                  <CardContent className="p-0">
                    {viewMode === "table" && <TableView />}
                    {/* You can add Cards/Compact renderers later; table covers your ask */}
                  </CardContent>
                </Card>

                {/* Pagination */}
                {paginationData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-8">
                    <div className="text-sm text-muted-foreground font-medium">
                      Showing {paginationData.start + 1} to {paginationData.end} of {filteredLeads.length.toLocaleString()} results
                    </div>

                    <div className="flex items-center gap-2">
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

                    <div className="text-sm text-muted-foreground font-medium">
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

        {/* Keyboard Shortcuts Help */}
        {showKeyboardShortcuts && <KeyboardShortcutsHelp />}
      </div>
    </TooltipProvider>
  );
};

export default LeadsManagementPage;