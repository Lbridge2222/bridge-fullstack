import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from 'react-router-dom';
import {
  Search, Grid, List, Plus, Mail, Calendar as CalIcon,
  Phone, Eye, Edit, Filter, TrendingUp, MoreHorizontal,
  Clock, AlertTriangle, CheckCircle, XCircle, Star,
  Users, Target, BarChart3, Zap,
  RefreshCw, BookmarkPlus, Sparkles, ChevronRight, X, ChevronLeft
} from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Sheet, SheetContent, SheetHeader as SheetHdr, SheetTitle as SheetTtl, SheetDescription as SheetDesc, SheetFooter } from "@/components/ui/sheet";

// Custom hooks and utilities
import { useApplicationsQuery } from "@/hooks/useApplicationsQuery";
import { useStages } from "@/hooks/useStages";
import { getApplicationCardDisplay, getPriorityColor, mapStageToDisplay, mapStageToFrontendStage } from "@/utils/dataMapping";
import { type ApplicationCard } from "@/services/api";
import { ApplicationDetailsDrawer } from "./ApplicationDetailsDrawer";
import { BulkActionsModal } from "./BulkActionsModal";
import MeetingBooker, { type Lead as MeetingBookerLead } from "@/components/MeetingBooker";
import EmailComposer, { type Lead as EmailComposerLead } from "@/components/EmailComposer";
import CallConsole, { type Lead as CallConsoleLead } from "@/components/CallConsole";
import { useIvy } from "@/ivy/useIvy";
// Drag and drop
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableStateSnapshot,
} from "@hello-pangea/dnd";

// Frontend stage IDs for the Kanban board
type StageId = 
  | 'enquiry' 
  | 'pre_application' 
  | 'application_submitted' 
  | 'fee_status_query' 
  | 'interview_portfolio' 
  | 'review_in_progress' 
  | 'review_complete' 
  | 'director_review_in_progress' 
  | 'director_review_complete' 
  | 'conditional_offer_no_response' 
  | 'unconditional_offer_no_response' 
  | 'conditional_offer_accepted' 
  | 'unconditional_offer_accepted' 
  | 'ready_to_enrol' 
  | 'enrolled' 
  | 'rejected' 
  | 'offer_withdrawn' 
  | 'offer_declined';

type StageTone = "neutral" | "success" | "danger";

type StageToneStyle = {
  iconWrapper: string;
  badge: string;
  chevron: string;
  dropRing: string;
  dropBorder: string;
  dropBg: string;
  dropText: string;
  emptyBorder: string;
  emptyText: string;
  collapsedShell: string;
  collapsedChevron: string;
  collapsedCount: string;
  collapsedLabel: string;
};

const stageToneStyles: Record<StageTone, StageToneStyle> = {
  neutral: {
    iconWrapper: "border-slate-200 bg-white text-slate-500",
    badge: "border-slate-200 bg-white text-slate-600",
    chevron: "border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300",
    dropRing: "ring-slate-200/80 bg-slate-100/70",
    dropBorder: "border-slate-300/70",
    dropBg: "bg-slate-100/80",
    dropText: "text-slate-600",
    emptyBorder: "border-slate-200/70",
    emptyText: "text-slate-500",
    collapsedShell: "border border-dashed border-slate-300 bg-slate-50",
    collapsedChevron: "border-slate-200 text-slate-500",
    collapsedCount: "border-slate-200 bg-white text-slate-600",
    collapsedLabel: "text-slate-600",
  },
  success: {
    iconWrapper: "border-success/40 bg-success/10 text-success",
    badge: "border-success/40 bg-success/10 text-success",
    chevron: "border-success/40 text-success hover:bg-success/10 hover:border-success/50",
    dropRing: "ring-success/40 bg-success/10",
    dropBorder: "border-success/40",
    dropBg: "bg-success/10",
    dropText: "text-success",
    emptyBorder: "border-success/40",
    emptyText: "text-success",
    collapsedShell: "border border-dashed border-success/40 bg-success/10",
    collapsedChevron: "border-success/40 text-success",
    collapsedCount: "border-success/40 bg-white text-success",
    collapsedLabel: "text-success/90",
  },
  danger: {
    iconWrapper: "border-destructive/40 bg-destructive/10 text-destructive",
    badge: "border-destructive/40 bg-destructive/10 text-destructive",
    chevron: "border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/50",
    dropRing: "ring-destructive/40 bg-destructive/10",
    dropBorder: "border-destructive/40",
    dropBg: "bg-destructive/10",
    dropText: "text-destructive",
    emptyBorder: "border-destructive/40",
    emptyText: "text-destructive",
    collapsedShell: "border border-dashed border-destructive/40 bg-destructive/10",
    collapsedChevron: "border-destructive/40 text-destructive",
    collapsedCount: "border-destructive/40 bg-white text-destructive",
    collapsedLabel: "text-destructive",
  },
};

const getStageConfig = (stageId: string) => {
  const configs: Record<string, { 
    name: string; 
    description: string;
    color: string;
    tone: StageTone;
    icon: React.ReactNode;
  }> = {
    'enquiry': { 
      name: "Enquiry", 
      description: "Initial enquiries received",
      color: "bg-muted/40 border-border",
      tone: "neutral",
      icon: <Users className="h-4 w-4" />
    },
    'pre_application': { 
      name: "Pre Application", 
      description: "Pre-application stage",
      color: "bg-muted/40 border-border",
      tone: "neutral",
      icon: <BookmarkPlus className="h-4 w-4" />
    },
    'application_submitted': { 
      name: "Application Submitted", 
      description: "Applications submitted for review",
      color: "bg-muted/40 border-border",
      tone: "neutral",
      icon: <Eye className="h-4 w-4" />
    },
    'fee_status_query': { 
      name: "Fee Status Query", 
      description: "Fee status being verified",
      color: "bg-muted/40 border-border",
      tone: "neutral",
      icon: <TrendingUp className="h-4 w-4" />
    },
    'interview_portfolio': { 
      name: "Interview/Portfolio", 
      description: "Interview or portfolio review",
      color: "bg-muted/40 border-border",
      tone: "neutral",
      icon: <CalIcon className="h-4 w-4" />
    },
    'review_in_progress': { 
      name: "Review in Progress", 
      description: "Application under review",
      color: "bg-muted/40 border-border",
      tone: "neutral",
      icon: <Clock className="h-4 w-4" />
    },
    'review_complete': { 
      name: "Review Complete", 
      description: "Initial review completed",
      color: "bg-muted/40 border-border",
      tone: "neutral",
      icon: <CheckCircle className="h-4 w-4" />
    },
    'director_review_in_progress': { 
      name: "Director Review In Progress", 
      description: "Under director review",
      color: "bg-muted/40 border-border",
      tone: "neutral",
      icon: <Users className="h-4 w-4" />
    },
    'director_review_complete': { 
      name: "Director Review Complete", 
      description: "Director review completed",
      color: "bg-muted/40 border-border",
      tone: "neutral",
      icon: <CheckCircle className="h-4 w-4" />
    },
    'conditional_offer_no_response': { 
      name: "Conditional Offer (No Response)", 
      description: "Conditional offer pending response",
      color: "bg-muted/40 border-border",
      tone: "neutral",
      icon: <Star className="h-4 w-4" />
    },
    'unconditional_offer_no_response': { 
      name: "Unconditional Offer (No Response)", 
      description: "Unconditional offer pending response",
      color: "bg-muted/40 border-border",
      tone: "neutral",
      icon: <Star className="h-4 w-4" />
    },
    'conditional_offer_accepted': { 
      name: "Conditional Offer (Accepted)", 
      description: "Conditional offer accepted",
      color: "bg-success/10 border-success/20",
      tone: "success",
      icon: <CheckCircle className="h-4 w-4" />
    },
    'unconditional_offer_accepted': { 
      name: "Unconditional Offer (Accepted)", 
      description: "Unconditional offer accepted",
      color: "bg-success/10 border-success/20",
      tone: "success",
      icon: <CheckCircle className="h-4 w-4" />
    },
    'ready_to_enrol': { 
      name: "Ready to Enrol", 
      description: "Ready for enrollment",
      color: "bg-success/10 border-success/20",
      tone: "success",
      icon: <Target className="h-4 w-4" />
    },
    'enrolled': { 
      name: "Enrolled", 
      description: "Students enrolled",
      color: "bg-success/10 border-success/20",
      tone: "success",
      icon: <Target className="h-4 w-4" />
    },
    'rejected': { 
      name: "Rejected", 
      description: "Application rejected",
      color: "bg-destructive/10 border-destructive/20",
      tone: "danger",
      icon: <XCircle className="h-4 w-4" />
    },
    'offer_withdrawn': { 
      name: "Offer Withdrawn", 
      description: "Offer withdrawn by institution",
      color: "bg-destructive/10 border-destructive/20",
      tone: "danger",
      icon: <XCircle className="h-4 w-4" />
    },
    'offer_declined': { 
      name: "Offer Declined", 
      description: "Offer declined by applicant",
      color: "bg-destructive/10 border-destructive/20",
      tone: "danger",
      icon: <XCircle className="h-4 w-4" />
    },
  };
  
  return configs[stageId] || {
    name: stageId,
    description: "Unknown stage",
    color: "bg-slate-100 border-slate-200",
    tone: "neutral",
    icon: <Users className="h-4 w-4" />
  };
};

const toNumericId = (id: string | number | null | undefined): number => {
  const str = String(id ?? "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash || 0;
};

const dragCurve = "cubic-bezier(0.33, 0, 0.2, 1)";
const settleCurve = "cubic-bezier(0.22, 0.75, 0.2, 1)";
const dropCurve = "cubic-bezier(0.18, 0, 0.15, 1)";

const getSoftDragStyle = (
  style: React.CSSProperties | undefined,
  snapshot: DraggableStateSnapshot,
): React.CSSProperties | undefined => {
  if (!style) return undefined;

  const transition = snapshot.isDropAnimating
    ? `transform 110ms ${dropCurve}, opacity 110ms ease`
    : snapshot.isDragging
      ? `transform 60ms ${dragCurve}`
      : `transform 120ms ${settleCurve}`;

  return {
    ...style,
    transition,
    willChange: "transform",
  };
};

let dragPortalEl: HTMLElement | null = null;
const getDragPortal = () => {
  if (typeof window === "undefined") return null;
  if (!dragPortalEl) {
    dragPortalEl = document.getElementById("dnd-portal");
    if (!dragPortalEl) {
      dragPortalEl = document.createElement("div");
      dragPortalEl.id = "dnd-portal";
      dragPortalEl.style.position = "fixed";
      dragPortalEl.style.inset = "0";
      dragPortalEl.style.pointerEvents = "none";
      dragPortalEl.style.zIndex = "9999";
      document.body.appendChild(dragPortalEl);
    }
  }
  return dragPortalEl;
};

const PortalAwareItem: React.FC<{ snapshot: DraggableStateSnapshot; children: React.ReactNode }> = ({ snapshot, children }) => {
  const portalNode = React.useMemo(() => getDragPortal(), []);
  if (snapshot.isDragging && portalNode) {
    return createPortal(children, portalNode);
  }
  return <>{children}</>;
};

function PriorityBadge({ priority }: { priority: string }) {
  const colorClasses = getPriorityColor(priority);
  
  return (
    <Badge variant="outline" className={`${colorClasses} text-xs font-medium`}>
      {priority === "critical" && <AlertTriangle className="h-3 w-3 mr-1" />}
      {priority === "high" && <Zap className="h-3 w-3 mr-1" />}
      {priority}
    </Badge>
  );
}


function ProgressionIndicator({ probability, label }: { probability: number | undefined; label?: string }) {
  if (probability === undefined) return <span className="text-xs text-slate-400">N/A</span>;
  
  const percentage = Math.round(probability * 100);
  const getColor = (prob: number) => {
    if (prob >= 75) return "bg-success";
    if (prob >= 50) return "bg-warning";
    return "bg-destructive";
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(percentage)} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600">{percentage}%</span>
      {label && <span className="text-xs text-slate-500">to {label}</span>}
    </div>
  );
}

function BlockerBadge({ count, severity }: { count: number; severity?: string }) {
  if (count === 0) return null;
  
  const colorClasses = severity === 'critical' ? 'text-destructive bg-destructive/10 border-destructive/20' :
                       severity === 'high' ? 'text-warning bg-warning/10 border-warning/20' :
                       'text-slate-600 bg-slate-100 border-slate-200';
  
  return (
    <Badge variant="outline" className={`${colorClasses} text-xs font-medium gap-1`}>
      <AlertTriangle className="h-3 w-3" />
      {count} blocker{count !== 1 ? 's' : ''}
    </Badge>
  );
}

export default function ApplicationsBoardPage() {
  const { push: toast } = useToast();
  const navigate = useNavigate();
  const [view, setView] = React.useState<"board" | "table">("board");
  const [search, setSearch] = React.useState("");
  const [program, setProgram] = React.useState<string>("all");
  const [urgency, setUrgency] = React.useState<string>("all");
  const [priority, setPriority] = React.useState<string>("all");
  const [deliveryMode, setDeliveryMode] = React.useState<'all' | 'online' | 'onsite' | 'hybrid'>('all');
  const [studyPattern, setStudyPattern] = React.useState<'all' | 'full_time' | 'part_time' | 'accelerated'>('all');
  const [multiOnly, setMultiOnly] = React.useState<boolean>(false);
  const [compactCards, setCompactCards] = React.useState<boolean>(() => localStorage.getItem('appsCompact') === '1');
  const [aiFocus, setAiFocus] = React.useState<boolean>(() => localStorage.getItem('appsAiFocus') === '1');
  const [selectedApps, setSelectedApps] = React.useState<string[]>([]);
  const [showFilters, setShowFilters] = React.useState<boolean>(() => {
    try { return localStorage.getItem('appsShowFilters') === '1'; } catch { return false; }
  });
  const [selectedApplicationId, setSelectedApplicationId] = React.useState<string | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = React.useState(false);
  const [showBulkActions, setShowBulkActions] = React.useState(false);
  const boardScrollRef = React.useRef<HTMLDivElement | null>(null);
  const columnRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const lastDragOverRef = React.useRef<string | null>(null);
  const autoExpandedStageRef = React.useRef<string | null>(null);
  // Modal state - simple pattern like LeadsManagement
  const [showEmailComposer, setShowEmailComposer] = React.useState(false);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = React.useState<EmailComposerLead | null>(null);
  
  const [showCallConsole, setShowCallConsole] = React.useState(false);
  const [selectedLeadForCall, setSelectedLeadForCall] = React.useState<CallConsoleLead | null>(null);
  
  const [showMeetingBooker, setShowMeetingBooker] = React.useState(false);
  const [selectedLeadForMeeting, setSelectedLeadForMeeting] = React.useState<MeetingBookerLead | null>(null);
  const { IvyOverlay, openIvy } = useIvy();
  
  const [draggedApplicationId, setDraggedApplicationId] = React.useState<string | null>(null);

  React.useEffect(() => { localStorage.setItem('appsCompact', compactCards ? '1' : '0'); }, [compactCards]);
  React.useEffect(() => { localStorage.setItem('appsAiFocus', aiFocus ? '1' : '0'); }, [aiFocus]);
  React.useEffect(() => { try { localStorage.setItem('appsShowFilters', showFilters ? '1' : '0'); } catch {} }, [showFilters]);


  const activeFilterCount = React.useMemo(() => {
    let c = 0;
    if ((search || '').trim().length > 0) c++;
    if (program !== 'all') c++;
    if (urgency !== 'all') c++;
    if (priority !== 'all') c++;
    if (deliveryMode !== 'all') c++;
    if (studyPattern !== 'all') c++;
    if (multiOnly) c++;
    return c;
  }, [search, program, urgency, priority, deliveryMode, studyPattern, multiOnly]);

  // Persist collapsed stages
  const [collapsedStages, setCollapsedStages] = React.useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('appsCollapsedStages') || '{}'); } catch { return {}; }
  });
  React.useEffect(() => { try { localStorage.setItem('appsCollapsedStages', JSON.stringify(collapsedStages)); } catch {} }, [collapsedStages]);
  const toggleStageCollapse = React.useCallback((stageId: string) => {
    setCollapsedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  }, []);

  const collapseAutoExpandedStage = React.useCallback((excludeId?: string | null) => {
    const stageToCollapse = autoExpandedStageRef.current;
    if (!stageToCollapse || stageToCollapse === excludeId) return;
    setCollapsedStages(prev => {
      if (prev[stageToCollapse] === true) {
        autoExpandedStageRef.current = null;
        return prev;
      }
      autoExpandedStageRef.current = null;
      return { ...prev, [stageToCollapse]: true };
    });
  }, []);

  const clearAllFilters = React.useCallback(() => {
    setSearch('');
    setProgram('all');
    setUrgency('all');
    setPriority('all');
    setDeliveryMode('all');
    setStudyPattern('all');
    setMultiOnly(false);
  }, []);

  // Saved Views (local)
  type AppSavedView = {
    id: string;
    name: string;
    description?: string;
    search?: string;
    program: string;
    urgency: string;
    priority: string;
    deliveryMode: 'all'|'online'|'onsite'|'hybrid';
    studyPattern: 'all'|'full_time'|'part_time'|'accelerated';
    multiOnly: boolean;
    created?: string;
    lastUsed?: string;
  };
  const [savedViews, setSavedViews] = React.useState<AppSavedView[]>(() => {
    try { return JSON.parse(localStorage.getItem('applicationsSavedViews') || '[]') as AppSavedView[]; } catch { return []; }
  });
  const [currentViewId, setCurrentViewId] = React.useState<string | null>(null);
  const persistViews = (views: AppSavedView[]) => {
    setSavedViews(views);
    localStorage.setItem('applicationsSavedViews', JSON.stringify(views));
  };
  const buildCurrentView = React.useCallback((name: string, description?: string): AppSavedView => ({
    id: crypto.randomUUID(),
    name,
    description,
    search: search || undefined,
    program,
    urgency,
    priority,
    deliveryMode,
    studyPattern,
    multiOnly,
    created: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  }), [search, program, urgency, priority, deliveryMode, studyPattern, multiOnly]);
  const applyView = React.useCallback((v: AppSavedView) => {
    setSearch(v.search || '');
    setProgram(v.program);
    setUrgency(v.urgency);
    setPriority(v.priority);
    setDeliveryMode(v.deliveryMode);
    setStudyPattern(v.studyPattern);
    setMultiOnly(v.multiOnly);
    setCurrentViewId(v.id);
    const next = savedViews.map(sv => sv.id === v.id ? { ...sv, lastUsed: new Date().toISOString() } : sv);
    persistViews(next);
    toast({ title: 'View applied', description: `"${v.name}" active`, variant: 'success' });
  }, [savedViews, toast]);
  const clearView = React.useCallback(() => { setCurrentViewId(null); toast({ title: 'View cleared' }); }, [toast]);
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [saveForm, setSaveForm] = React.useState<{ name: string; description?: string }>({ name: '', description: '' });
  const saveCurrentView = React.useCallback(() => {
    if (!saveForm.name.trim()) return;
    const v = buildCurrentView(saveForm.name.trim(), saveForm.description?.trim() || undefined);
    const next = [v, ...savedViews];
    persistViews(next);
    setCurrentViewId(v.id);
    setShowSaveDialog(false);
    setSaveForm({ name: '', description: '' });
    toast({ title: 'View saved', description: `"${v.name}" added`, variant: 'success' });
  }, [buildCurrentView, savedViews, saveForm, toast]);
  const [showManageDialog, setShowManageDialog] = React.useState(false);
  const deleteView = React.useCallback((id: string) => {
    const next = savedViews.filter(v => v.id !== id);
    persistViews(next);
    if (currentViewId === id) setCurrentViewId(null);
    toast({ title: 'View deleted' });
  }, [savedViews, currentViewId, toast]);

  // Use the custom hooks for data
  const { stages, loading: stagesLoading, error: stagesError } = useStages();
  const {
    applications,
    loading,
    error,
    moveStage,
    updatePriority,
    refreshBoard,
    refreshProgressionInsights,
    getApplicationsByStage,
    getPriorityDistribution,
    getUrgencyDistribution,
    isMovingStage,
    isUpdatingPriority,
    isRefreshing,
  } = useApplicationsQuery({
    priority: priority === "all" ? undefined : priority,
    urgency: urgency === "all" ? undefined : urgency,
  });

  // Helpers to derive delivery mode and study pattern from existing fields
  const deriveDeliveryMode = React.useCallback((app: any): 'online'|'onsite'|'hybrid'|'unknown' => {
    const text = `${app.programme_name || ''} ${app.campus_name || ''} ${app.source || ''}`.toLowerCase();
    if (/hybrid|blended/.test(text)) return 'hybrid';
    if (/online|remote|distance/.test(text)) return 'online';
    if (app.campus_name && !/online/.test(text)) return 'onsite';
    return 'unknown';
  }, []);

  const deriveStudyPattern = React.useCallback((app: any): 'full_time'|'part_time'|'accelerated'|'unknown' => {
    const text = `${app.programme_name || ''} ${app.cycle_label || ''}`.toLowerCase();
    if (/accelerated|fast.?track/.test(text)) return 'accelerated';
    if (/part.?time|\bpt\b/.test(text)) return 'part_time';
    if (/full.?time|\bft\b|full/.test(text)) return 'full_time';
    return 'unknown';
  }, []);


  // Filter applications based on search and program
  const filtered = React.useMemo(() => {
    if (!applications || !Array.isArray(applications)) return [];
    return applications.filter((app: ApplicationCard) => {
      const matchesSearch = search === "" || 
        app.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        app.last_name?.toLowerCase().includes(search.toLowerCase()) ||
        app.email?.toLowerCase().includes(search.toLowerCase()) ||
        app.programme_name.toLowerCase().includes(search.toLowerCase());
      
      const matchesProgram = program === "all" || app.programme_name === program;
      const mode = deriveDeliveryMode(app);
      const pattern = deriveStudyPattern(app);
      const matchesDelivery = deliveryMode === 'all' || mode === deliveryMode;
      const matchesPattern = studyPattern === 'all' || pattern === studyPattern;
      
      // Multi-application filter: keep only applicants that appear more than once
      // We'll compute counts below and apply after this filter
      
      return matchesSearch && matchesProgram && matchesDelivery && matchesPattern;
    });
  }, [applications, search, program, deliveryMode, studyPattern, deriveDeliveryMode, deriveStudyPattern]);

  // Build person->application count and optionally filter to only multi-application applicants
  const personAppCounts = React.useMemo(() => {
    const m = new Map<string, number>();
    (filtered || []).forEach(app => {
      const id = String(app.person_id);
      m.set(id, (m.get(id) || 0) + 1);
    });
    return m;
  }, [filtered]);

  const filteredWithMulti = React.useMemo(() => {
    if (!multiOnly) return filtered;
    return filtered.filter((app: ApplicationCard) => (personAppCounts.get(String(app.person_id)) || 0) > 1);
  }, [filtered, multiOnly, personAppCounts]);

  const [isRefreshingInsights, setIsRefreshingInsights] = React.useState(false);

  const handleRefreshInsights = React.useCallback(async () => {
    const dataset = filteredWithMulti || [];
    if (!dataset.length) {
      toast({ title: 'Nothing to refresh', description: 'No applications in view to update.', variant: 'default' });
      return;
    }

    setIsRefreshingInsights(true);
    const ids = Array.from(new Set(dataset.map(app => app.application_id).filter(Boolean)));
    const success = await refreshProgressionInsights(ids as string[]);
    setIsRefreshingInsights(false);

    if (success) {
      toast({ title: 'Insights refreshed', description: `Updated progression data for ${ids.length} applications.`, variant: 'success' });
    } else {
      toast({ title: 'Refresh failed', description: 'Could not update progression insights. Please try again.', variant: 'destructive' });
    }
  }, [filteredWithMulti, refreshProgressionInsights, toast]);

  // Group applications by stage for Kanban columns
  const grouped = React.useMemo(() => {
    const g: Record<string, ApplicationCard[]> = {};
    
    // Initialize with all available stages
    stages.forEach(stage => {
      g[stage.id] = [];
    });
    
    filteredWithMulti.forEach((app: ApplicationCard) => {
      const frontendStage = mapStageToFrontendStage(app.stage);
      if (g[frontendStage]) {
        g[frontendStage].push(app);
      }
    });
    
    return g;
  }, [filteredWithMulti, stages]);

  // Aggregation: single card per applicant (choose primary stage)
  const stageOrder: StageId[] = [
    'enquiry',
    'pre_application', 
    'application_submitted',
    'fee_status_query',
    'interview_portfolio',
    'review_in_progress',
    'review_complete',
    'director_review_in_progress',
    'director_review_complete',
    'conditional_offer_no_response',
    'unconditional_offer_no_response',
    'conditional_offer_accepted',
    'unconditional_offer_accepted',
    'ready_to_enrol',
    'enrolled',
    'rejected',
    'offer_withdrawn',
    'offer_declined'
  ];
  const stageRank = (s: string) => Math.max(0, stageOrder.findIndex(x => x === (s as StageId)));
  // Aggregate info per person (counts + modes/patterns)
  const personAggregates = React.useMemo(() => {
    const map = new Map<string, { count: number; modes: string[]; patterns: string[]; apps: ApplicationCard[] }>();
    const temp: Record<string, { count: number; modes: Set<string>; patterns: Set<string>; apps: ApplicationCard[] }> = {} as any;
    filtered.forEach((app: ApplicationCard) => {
      const pid = String(app.person_id);
      if (!temp[pid]) temp[pid] = { count: 0, modes: new Set<string>(), patterns: new Set<string>(), apps: [] as ApplicationCard[] };
      temp[pid].count += 1;
      temp[pid].modes.add(deriveDeliveryMode(app));
      temp[pid].patterns.add(deriveStudyPattern(app));
      (temp[pid].apps as ApplicationCard[]).push(app);
    });
    Object.entries(temp).forEach(([pid, v]) => {
      map.set(pid, { count: v.count, modes: Array.from(v.modes).filter(x => x !== 'unknown'), patterns: Array.from(v.patterns).filter(x => x !== 'unknown'), apps: v.apps });
    });
    return map;
  }, [filtered, deriveDeliveryMode, deriveStudyPattern]);

  // Aggregate ML-driven progression insights for summary tiles
  const progressionStats = React.useMemo(() => {
    const dataset = Array.isArray(filteredWithMulti) ? filteredWithMulti : [];
    if (dataset.length === 0) {
      return {
        total: 0,
        avgProgression: 0,
        highRisk: 0,
        highConfidence: 0,
        blockersTotal: 0,
        blockersApps: 0,
        topBlocker: null as { item: string; count: number } | null,
        totalRecommendedActions: 0,
      };
    }

    let progressSum = 0;
    let highRisk = 0;
    let highConfidence = 0;
    let blockersTotal = 0;
    let blockersApps = 0;
    let totalRecommendedActions = 0;
    const blockerCounts: Record<string, number> = {};

    dataset.forEach((app: ApplicationCard) => {
      const probability = app.progression_probability ?? app.conversion_probability ?? 0;
      progressSum += probability;
      if (probability <= 0.35) highRisk += 1;
      if (probability >= 0.7) highConfidence += 1;

      const blockers = Array.isArray(app.progression_blockers) ? app.progression_blockers : [];
      if (blockers.length > 0) {
        blockersApps += 1;
        blockersTotal += blockers.length;
        blockers.forEach((blocker) => {
          const key = blocker?.item;
          if (!key) return;
          blockerCounts[key] = (blockerCounts[key] || 0) + 1;
        });
      }

      const actions = Array.isArray(app.recommended_actions) ? app.recommended_actions : [];
      totalRecommendedActions += actions.length;
    });

    const avgProgression = Math.round((progressSum / dataset.length) * 100);
    let topBlocker: { item: string; count: number } | null = null;
    Object.entries(blockerCounts).forEach(([item, count]) => {
      if (!topBlocker || count > topBlocker.count) {
        topBlocker = { item, count };
      }
    });

    return {
      total: dataset.length,
      avgProgression,
      highRisk,
      highConfidence,
      blockersTotal,
      blockersApps,
      topBlocker,
      totalRecommendedActions,
    };
  }, [filteredWithMulti]);

  // Get unique programmes for filter dropdown
  const uniqueProgrammes = React.useMemo(() => {
    if (!applications || !Array.isArray(applications)) return [];
    return [...new Set(applications.map((app: ApplicationCard) => app.programme_name))];
  }, [applications]);

  // Build app lookup for drag overlay rendering
  const appById = React.useMemo(() => {
    const m = new Map<string, ApplicationCard>();
    (filteredWithMulti || []).forEach((a: ApplicationCard) => m.set(a.application_id, a));
    return m;
  }, [filteredWithMulti]);

  // Dnd container view of columns and helpers
  const handleDragEnd = React.useCallback(async ({ draggableId, source, destination }: DropResult, fallbackDestinationId?: string) => {
    const targetStage = destination?.droppableId ?? fallbackDestinationId;
    if (!targetStage || targetStage === source.droppableId) return;

    const noteStage = destination?.droppableId ?? fallbackDestinationId ?? targetStage;

    const success = await moveStage(draggableId, {
      to_stage: targetStage,
      note: `Moved to ${noteStage} via drag and drop`,
      changed_by: "550e8400-e29b-41d4-a716-446655440104",
    });
    
    if (!success) {
      console.error('❌ Failed to move application');
    }
  }, [moveStage]);

  const toggleSelection = (id: string) => {
    setSelectedApps(prev => 
      prev.includes(id) ? prev.filter(appId => appId !== id) : [...prev, id]
    );
  };

  const openDetailsDrawer = (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    setShowDetailsDrawer(true);
  };

  const closeDetailsDrawer = () => {
    setShowDetailsDrawer(false);
    setSelectedApplicationId(null);
  };

  const openBulkActions = () => {
    setShowBulkActions(true);
  };

  const closeBulkActions = () => {
    setShowBulkActions(false);
  };

  const handleBulkActionSuccess = () => {
    setSelectedApps([]);
    closeBulkActions();
    // The data will be refreshed automatically by React Query
  };

  // Simple handlers like LeadsManagement
  const handleEmailClick = React.useCallback((app: ApplicationCard) => {
    const mapped = {
      id: toNumericId(app.person_id),
      uid: String(app.person_id ?? app.application_id ?? ''),
      name: `${app.first_name || ''} ${app.last_name || ''}`.trim(),
      email: app.email || '',
      phone: app.phone || '',
      courseInterest: app.programme_name || '',
      academicYear: app.cycle_label || '',
      campusPreference: app.campus_name || '',
      enquiryType: app.source || '',
      leadSource: app.source || '',
      status: app.stage || '',
      statusType: (app.stage as any) || 'new',
      leadScore: app.lead_score || 0,
      createdDate: app.created_at || '',
      lastContact: app.last_activity_at || '',
      nextAction: 'Follow up',
      slaStatus: app.urgency === 'high' ? 'urgent' as const : 'within_sla' as const,
      contactAttempts: 0,
      tags: [],
      aiInsights: {
        conversionProbability: app.conversion_probability || 0,
        bestContactTime: 'Business hours',
        recommendedAction: 'Follow up',
        urgency: (app.urgency as any) || 'medium',
      }
    } satisfies EmailComposerLead;
    
    setSelectedLeadForEmail(mapped);
    setShowEmailComposer(true);
  }, []);

  const handlePhoneClick = React.useCallback((app: ApplicationCard) => {
    if (app.phone) {
      const mapped = {
        id: toNumericId(app.person_id),
        uid: String(app.person_id ?? app.application_id ?? ''),
        name: `${app.first_name || ''} ${app.last_name || ''}`.trim(),
        email: app.email || '',
        phone: app.phone || '',
        courseInterest: app.programme_name || '',
        statusType: (app.stage as any) || 'new',
        nextAction: 'Follow up',
        followUpDate: app.last_activity_at || '',
        aiInsights: {
          conversionProbability: app.conversion_probability || 0,
          recommendedAction: 'Follow up',
          callStrategy: 'Follow up'
        }
      } satisfies CallConsoleLead;
      
      setSelectedLeadForCall(mapped);
      setShowCallConsole(true);
    } else {
      toast({ title: "No phone number", description: `${app.first_name} ${app.last_name} has no phone number`, variant: "destructive" });
    }
  }, [toast]);

  const handleMeetingClick = React.useCallback((app: ApplicationCard) => {
    const mapped = {
      id: toNumericId(app.person_id),
      uid: String(app.person_id ?? app.application_id ?? ''),
      name: `${app.first_name || ''} ${app.last_name || ''}`.trim(),
      email: app.email || '',
      phone: app.phone || '',
      courseInterest: app.programme_name || '',
      academicYear: app.cycle_label || '',
      campusPreference: app.campus_name || '',
      enquiryType: app.source || '',
      leadSource: app.source || '',
      status: app.stage || '',
      statusType: (app.stage as any) || 'new',
      leadScore: app.lead_score || 0,
      createdDate: app.created_at || '',
      lastContact: app.last_activity_at || '',
      nextAction: 'Follow up',
      slaStatus: app.urgency === 'high' ? 'urgent' as const : 'within_sla' as const,
      contactAttempts: 0,
      tags: [],
      aiInsights: {
        conversionProbability: app.conversion_probability || 0,
        bestContactTime: '9:00 AM',
        recommendedAction: 'Follow up',
        urgency: (app.urgency as any) || 'medium',
      }
    } satisfies MeetingBookerLead;
    
    setSelectedLeadForMeeting(mapped);
    setShowMeetingBooker(true);
  }, [toast]);

  const AppCardView = ({ app, agg, compact }: { app: ApplicationCard; agg?: { count: number; modes: string[]; patterns: string[]; apps: ApplicationCard[] }, compact?: boolean }) => {
    const displayData = getApplicationCardDisplay(app);
    const priorityToColor = (p?: string) => {
      const t = (p || '').toLowerCase();
      if (t === 'critical') return 'hsl(var(--destructive))';
      if (t === 'high') return 'hsl(var(--warning))';
      if (t === 'medium') return 'hsl(var(--info))';
      return 'hsl(var(--slate-500))';
    };
    const Rail = ({ color, w = 6 }: { color: string; w?: number }) => (
      <div aria-hidden className="opacity-90 group-hover:opacity-100 transition-opacity" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: w, borderTopLeftRadius: w, borderBottomLeftRadius: w, background: color, boxShadow: '0 0 0 1px rgba(0,0,0,0.03)' }} />
    );
    
    const isAiHigh = ((app as any).progression_probability ?? (app as any).conversion_probability ?? 0) >= 0.7;
    const isCompact = !!compact;
    return (
      <Card 
        className={`relative flex flex-col select-none border transition-transform duration-150 ease-out group ${
          draggedApplicationId === app.application_id
            ? 'opacity-60 scale-[0.97] shadow-2xl border-[hsl(var(--brand-secondary))] z-[70] cursor-grabbing'
            : 'hover:-translate-y-0.5 hover:shadow-lg cursor-grab'
         } ${aiFocus ? (isAiHigh ? 'border-accent/40 shadow-md' : 'border-slate-200 opacity-60') : 'border-slate-200 hover:shadow-md hover:border-slate-300'}`}
      >
        <Rail color={priorityToColor(app.priority)} />
        <CardHeader className="relative pb-2 pr-10">
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <Checkbox 
                  data-no-drag
                  onPointerDown={(e) => e.stopPropagation()}
                  checked={selectedApps.includes(app.application_id)}
                  onCheckedChange={() => toggleSelection(app.application_id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="min-w-0 flex flex-col">
                  <CardTitle className="text-sm font-semibold text-slate-900 leading-tight">
                  {displayData.studentName}
                </CardTitle>
                  {agg && agg.count > 1 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="mt-1 w-fit text-[10px] cursor-help">{agg.count} applications</Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <div className="text-xs font-medium mb-1">Applications</div>
                          <div className="text-xs space-y-1">
                            {(agg.apps as any[]).slice(0,6).map((a) => (
                              <div key={a.application_id} className="flex items-center gap-2">
                                <span className="truncate">{a.programme_name}</span>
                                <span className="text-muted-foreground">• {mapStageToDisplay(a.stage)}</span>
              </div>
                            ))}
                            {agg.apps.length > 6 && (
                              <div className="text-muted-foreground">+{agg.apps.length - 6} more…</div>
                            )}
              </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
            </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className={`${isCompact ? 'hidden group-hover:block' : 'block'} space-y-4 pt-2`}>
          <p className="text-xs text-slate-500 truncate">{app.email || 'No email'}</p>
          {agg && (agg.modes.length > 0 || agg.patterns.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {agg.modes.slice(0,2).map(m => (
                <Badge key={m} variant="secondary" className="h-5 capitalize">{m}</Badge>
              ))}
              {agg.patterns.slice(0,2).map(s => (
                <Badge key={s} variant="secondary" className="h-5 capitalize">{s.replace('_',' ')}
                </Badge>
              ))}
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Program</span>
              <span className="font-medium text-slate-700 text-right leading-tight max-w-[65%] truncate">{displayData.program}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Lead Score</span>
              <span className="font-medium text-slate-700">{displayData.leadScore}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Progression</span>
              <ProgressionIndicator probability={app.progression_probability || app.conversion_probability} />
            </div>
            {app.enrollment_probability && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Enrollment</span>
                <ProgressionIndicator probability={app.enrollment_probability} />
              </div>
            )}
          </div>
          
          {/* Blockers display */}
          {app.progression_blockers && app.progression_blockers.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 mb-1">
                <BlockerBadge 
                  count={app.progression_blockers.length} 
                  severity={app.progression_blockers[0]?.severity} 
                />
            </div>
              {app.progression_blockers.slice(0, 2).map((blocker, idx) => (
                <div key={idx} className="text-xs text-slate-600 mb-1">
                  <span className="font-medium">{blocker.item}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="space-y-2">
              <div className="text-xs text-slate-500">
                <span className="font-medium">Recommended:</span>
              </div>
              {Array.isArray(app.recommended_actions) && app.recommended_actions.length > 0 ? (
                <ul className="space-y-1 text-xs text-slate-600">
                  {app.recommended_actions.slice(0, 3).map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-slate-400">{idx + 1}.</span>
                      <div className="flex-1">
                        <span className="font-medium text-slate-700">{action.action}</span>
                        {action.deadline && (
                          <span className="ml-2 text-[11px] text-slate-400">Due {action.deadline}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-400">No actions queued</div>
              )}
            </div>
            <div className="text-xs text-slate-400">
              {displayData.nextFollowUp} • {displayData.lastActivity}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                data-no-drag
                onPointerDown={(event) => event.stopPropagation()}
                className="flex-1 min-w-[96px] h-8 text-xs justify-center"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/admissions/applications/${app.application_id}`);
                }}
              >
                <Eye className="mr-1.5 h-3 w-3" /> View
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-no-drag
                onPointerDown={(event) => event.stopPropagation()}
                className="flex-1 min-w-[96px] h-8 text-xs justify-center"
                onClick={(event) => {
                  event.stopPropagation();
                  handleEmailClick(app);
                }}
              >
                <Mail className="mr-1.5 h-3 w-3" /> Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-no-drag
                onPointerDown={(event) => event.stopPropagation()}
                className="flex-1 min-w-[96px] h-8 text-xs justify-center"
                onClick={(event) => {
                  event.stopPropagation();
                  handleMeetingClick(app);
                }}
              >
                <CalIcon className="mr-1.5 h-3 w-3" /> Schedule
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-no-drag
                onPointerDown={(event) => event.stopPropagation()}
                className="flex-1 min-w-[96px] h-8 text-xs justify-center"
                onClick={(event) => {
                  event.stopPropagation();
                  handlePhoneClick(app);
                }}
              >
                <Phone className="mr-1.5 h-3 w-3" /> Call
                </Button>
          </div>
            </div>
        </CardContent>
      </Card>
    );
  };


  // Aggregated card: one per applicant, listing their applications

  if (loading || stagesLoading) {
    return (
      <div className="px-6 py-6 bg-slate-50/50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-slate-500">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error || stagesError) {
    return (
      <div className="px-6 py-6 bg-slate-50/50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <p className="text-destructive mb-2">Error loading data</p>
          <p className="text-slate-500 text-sm mb-4">{error || stagesError}</p>
          <Button onClick={() => refreshBoard()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 bg-gradient-to-br from-background via-background to-muted/30 min-h-screen">
      {/* Sticky Glass Header */}
      <div className="relative bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-b border-border/30 sticky top-0 z-40 shadow-sm overflow-hidden mb-6">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 h-56 w-56 rounded-full blur-2xl glow-white" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-2xl glow-green" />
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground truncate">Admissions Pipeline</h1>
              <p className="text-xs text-muted-foreground">CRM → Admissions → Applications</p>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                <TabsList className="bg-muted/60 backdrop-blur-sm border border-border">
                  <TabsTrigger value="board" className="gap-2 data-[state=active]:bg-background">
                    <Grid className="h-4 w-4" /> Board
                  </TabsTrigger>
                  <TabsTrigger value="table" className="gap-2 data-[state=active]:bg-background">
                    <List className="h-4 w-4" /> Table
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {/* Header Search */}
              <div className="hidden md:block relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 bg-background/60 backdrop-blur-sm border-border/50"
                  placeholder="Search applications…"
              />
            </div>
              {/* Filters Sheet */}
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <Button
                  variant="outline"
                  size="default"
                  className="gap-2 h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all"
                  onClick={() => setShowFilters(true)}
                  title="Open filters"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-slate-900 text-white text-[10px] h-5 min-w-[20px] px-1">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
                <SheetContent side="right" className="sm:max-w-sm">
                  <SheetHdr>
                    <SheetTtl>Filters</SheetTtl>
                    <SheetDesc>Refine the applications shown on the board.</SheetDesc>
                  </SheetHdr>
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-2">
                      <label className="text-xs text-muted-foreground">Program</label>
            <Select value={program} onValueChange={setProgram}>
                        <SelectTrigger className="w-full border-slate-200">
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {uniqueProgrammes.map(prog => (
                  <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                ))}
              </SelectContent>
            </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <label className="text-xs text-muted-foreground">Urgency</label>
            <Select value={urgency} onValueChange={setUrgency}>
                          <SelectTrigger className="w-full border-slate-200">
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
                      </div>
                      <div className="grid gap-2">
                        <label className="text-xs text-muted-foreground">Priority</label>
            <Select value={priority} onValueChange={setPriority}>
                          <SelectTrigger className="w-full border-slate-200">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs text-muted-foreground">Delivery Mode</label>
            <Select value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as any)}>
                        <SelectTrigger className="w-full border-slate-200">
                <SelectValue placeholder="Delivery Mode" />
              </SelectTrigger>
              <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                <SelectItem value="onsite">Onsite</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs text-muted-foreground">Study Pattern</label>
            <Select value={studyPattern} onValueChange={(v) => setStudyPattern(v as any)}>
                        <SelectTrigger className="w-full border-slate-200">
                <SelectValue placeholder="Study Pattern" />
              </SelectTrigger>
              <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                <SelectItem value="full_time">Full-time</SelectItem>
                <SelectItem value="part_time">Part-time</SelectItem>
                <SelectItem value="accelerated">Accelerated</SelectItem>
              </SelectContent>
            </Select>
            </div>
            <div className="flex items-center gap-2 text-sm px-2 py-1 rounded-md border border-slate-200 bg-white">
                      <Checkbox checked={multiOnly} onCheckedChange={(v) => setMultiOnly(v === true)} id="multiOnlySheet" />
                      <label htmlFor="multiOnlySheet" className="text-slate-600">Multi-application only</label>
            </div>
          </div>
                  <SheetFooter className="mt-6">
                    <Button variant="outline" onClick={clearAllFilters}>Clear all</Button>
                    <Button onClick={() => setShowFilters(false)}>Apply</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="default" className="gap-2 h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Views Section */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Views</div>
                  <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
                    <BookmarkPlus className="h-4 w-4 mr-2" /> Save current view…
                  </DropdownMenuItem>
                  {savedViews.length > 0 && (
                    <div className="max-h-32 overflow-auto">
                      {savedViews.map(v => (
                        <DropdownMenuItem key={v.id} onClick={() => applyView(v)} className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{v.name}</div>
                            {v.description && <div className="text-xs text-muted-foreground truncate">{v.description}</div>}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{v.lastUsed ? new Date(v.lastUsed).toLocaleDateString() : ''}</span>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}
                  
                  <div className="border-t my-1" />
                  
                  {/* Display Options */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Display</div>
                  <DropdownMenuItem onClick={() => setAiFocus(v => !v)}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Focus
                      </div>
                      {aiFocus && <div className="w-2 h-2 rounded-full bg-accent" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCompactCards(v => !v)}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <Grid className="h-4 w-4 mr-2" />
                        {compactCards ? 'Expanded View' : 'Compact View'}
                      </div>
                      {compactCards && <div className="w-2 h-2 rounded-full bg-muted-foreground" />}
                    </div>
                  </DropdownMenuItem>
                  
                  <div className="border-t my-1" />
                  
                  {/* Actions */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Actions</div>
                  <DropdownMenuItem 
                    onClick={handleRefreshInsights}
                    disabled={isRefreshingInsights || isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingInsights ? 'animate-spin' : ''}`} />
                    Refresh insights
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="default"
                className="gap-2 h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all"
                onClick={() => openIvy({})}
                title="Ask Ivy"
              >
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="hidden sm:inline">Ask Ivy</span>
              </Button>
              <Button onClick={refreshBoard} variant="outline" className="gap-2 h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all" disabled={isRefreshing}>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
              </Button>
              <Button className="gap-2 h-9 px-4 text-sm font-medium text-white shadow-sm transition-all bg-[hsl(var(--brand-accent))] hover:bg-[hsl(var(--brand-accent))]/90">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Application</span>
                </Button>
              </div>
            </div>
        </div>
      </div>

        {/* Applied Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {(search || '').trim().length > 0 && (
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">
                  Search: <span className="ml-1 font-medium">{search}</span>
                  <button className="ml-2" onClick={() => setSearch('')} aria-label="Clear search">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {program !== 'all' && (
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">
                  Program: <span className="ml-1 font-medium">{program}</span>
                  <button className="ml-2" onClick={() => setProgram('all')} aria-label="Clear program">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {urgency !== 'all' && (
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">
                  Urgency: <span className="ml-1 font-medium capitalize">{urgency}</span>
                  <button className="ml-2" onClick={() => setUrgency('all')} aria-label="Clear urgency">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {priority !== 'all' && (
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">
                  Priority: <span className="ml-1 font-medium capitalize">{priority}</span>
                  <button className="ml-2" onClick={() => setPriority('all')} aria-label="Clear priority">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {deliveryMode !== 'all' && (
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">
                  Delivery: <span className="ml-1 font-medium capitalize">{deliveryMode}</span>
                  <button className="ml-2" onClick={() => setDeliveryMode('all')} aria-label="Clear delivery mode">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {studyPattern !== 'all' && (
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">
                  Pattern: <span className="ml-1 font-medium capitalize">{studyPattern.replace('_',' ')}</span>
                  <button className="ml-2" onClick={() => setStudyPattern('all')} aria-label="Clear study pattern">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {multiOnly && (
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">
                  Multi-application
                  <button className="ml-2" onClick={() => setMultiOnly(false)} aria-label="Clear multi-only">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-600" onClick={clearAllFilters}>Clear all</Button>
        </div>
          </div>
        )}

        {/* Pipeline Progression Insights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Applications</div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{progressionStats.total}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {progressionStats.highConfidence} high-confidence (≥70%)
                </div>
              </div>
              <div className="p-2 rounded-md bg-muted/60">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Avg Progression Likelihood</div>
                  <div className="text-sm font-semibold text-success tabular-nums">{progressionStats.avgProgression}%</div>
                </div>
                <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-success rounded-full transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, progressionStats.avgProgression))}%` }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  Target ≥ 65% • lift driven by ML progression scores
                </div>
              </div>
              <div className="p-2 rounded-md bg-success/10 border border-success/20 ml-3">
                <Sparkles className="h-4 w-4 text-success" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">At-Risk Applicants</div>
                <div className="text-2xl font-bold text-destructive tabular-nums">{progressionStats.highRisk}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {progressionStats.total > 0
                    ? `${Math.round((progressionStats.highRisk / progressionStats.total) * 100)}% of active pipeline`
                    : '—'}
                </div>
              </div>
              <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Blockers Spotlight</div>
                <div className="mt-1 text-sm font-semibold text-foreground leading-snug truncate">
                  {progressionStats.topBlocker ? progressionStats.topBlocker.item : 'No blockers flagged'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {progressionStats.blockersApps > 0
                    ? `${progressionStats.blockersApps} apps with blockers • ${progressionStats.topBlocker?.count ?? 0} mentions`
                    : 'All clear across the pipeline'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {progressionStats.totalRecommendedActions > 0
                    ? `${progressionStats.totalRecommendedActions} recommended actions ready`
                    : 'No actions queued'}
                </div>
              </div>
              <div className="p-2 rounded-md bg-muted/60 ml-3">
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Save View Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Save Current View</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="View name" value={saveForm.name} onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))} />
              <Input placeholder="Description (optional)" value={saveForm.description || ''} onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
                <Button onClick={saveCurrentView}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Actions */}
        {selectedApps.length > 0 && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-accent font-medium">
                {selectedApps.length} application{selectedApps.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs"
                  onClick={openBulkActions}
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Bulk Actions
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedApps([])}
                  className="h-8 text-xs text-slate-500"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>
        )}

      {/* Enhanced Board View */}
      {view === "board" ? (
        loading || stagesLoading ? (
          <div ref={boardScrollRef} className="flex gap-6 overflow-x-auto pb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-80 flex-shrink-0">
                <Card className="mb-3 border border-border bg-card">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-6 rounded-md" />
                        <div>
                          <Skeleton className="h-4 w-28 mb-1" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-8 rounded-full" />
                    </div>
                  </CardHeader>
                </Card>
                <div className="space-y-3 min-h-96">
                  {Array.from({ length: 3 }).map((__, j) => (
                    <Card key={j} className="border border-border">
                      <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16 rounded" />
                          <Skeleton className="h-5 w-16 rounded" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
        <div className="overflow-x-auto pb-6" ref={boardScrollRef}>
          <DragDropContext
            onDragStart={({ draggableId, source }) => {
              setDraggedApplicationId(draggableId);
              lastDragOverRef.current = source.droppableId;
              collapseAutoExpandedStage();
            }}
            onDragUpdate={(update) => {
              const currentStage = update.destination?.droppableId ?? null;
              if (currentStage) {
                lastDragOverRef.current = currentStage;
              }

              if (autoExpandedStageRef.current && autoExpandedStageRef.current !== currentStage) {
                collapseAutoExpandedStage(currentStage);
              }

              if (currentStage) {
                setCollapsedStages(prev => {
                  if (prev[currentStage]) {
                    autoExpandedStageRef.current = currentStage;
                    return { ...prev, [currentStage]: false };
                  }
                  return prev;
                });
              }
            }}
            onDragEnd={async (result) => {
              setDraggedApplicationId(null);
              const fallbackStage = result.destination?.droppableId ?? lastDragOverRef.current ?? undefined;
              lastDragOverRef.current = null;
              await handleDragEnd(result, fallbackStage);
              collapseAutoExpandedStage();
            }}
          >
            <div className="flex gap-4 px-3">
          {stages.map((stage) => {
            const config = getStageConfig(stage.id);
                 const columnItems = grouped[stage.id] || [];
                 const isCollapsed = !!collapsedStages[stage.id];
                 return (
                   <Droppable droppableId={stage.id} key={stage.id} direction="vertical" ignoreContainerClipping>
                     {(provided, snapshot) => {
                       const toneVariant = stageToneStyles[config.tone];
                       const columnBase = isCollapsed
                         ? 'w-12 px-0 pb-0 rounded-2xl h-96'
                         : `w-[21rem] px-4 pb-6 rounded-[26px] bg-white/75 backdrop-blur-lg border border-slate-200/40 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.75)] min-h-screen`;
                       const columnHover = snapshot.isDraggingOver
                         ? `ring-1 ${toneVariant.dropRing} shadow-[0_24px_48px_-32px_rgba(15,23,42,0.55)]`
                         : 'hover:border-slate-200/70 hover:shadow-[0_22px_42px_-34px_rgba(15,23,42,0.45)]';

            return (
              <div 
                           ref={provided.innerRef}
                           {...provided.droppableProps}
                           className={`group relative flex flex-col flex-shrink-0 transition-all duration-200 ease-out ${columnBase} ${columnHover} overflow-visible ${isCollapsed ? 'h-96' : 'h-full'}`}
                         >
                           {isCollapsed ? (
                             <div className="flex h-96 w-full">
                               <button
                                 type="button"
                                 onClick={() => toggleStageCollapse(stage.id)}
                                 className={`group/collapse relative flex w-full items-stretch justify-center rounded-xl transition-colors ${toneVariant.collapsedShell} hover:brightness-[0.97]`}
                                 style={{ minHeight: 'calc(24rem - 8px)' }}
                                 title={`Expand ${config.name}`}
                               >
                                 <div className="flex h-full flex-col items-center gap-3 py-3">
                                   <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border bg-white ${toneVariant.collapsedChevron}`}>
                                     <ChevronRight className="h-3 w-3" />
                                   </span>
                                   <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold ${toneVariant.collapsedCount}`}>
                                     {columnItems.length}
                                   </span>
                                   <span
                                     className={`text-[11px] font-medium uppercase tracking-[0.22em] ${toneVariant.collapsedLabel}`}
                                     style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                                   >
                                     {config.name}
                                   </span>
                        </div>
                                 <div className="hidden">
                                   {provided.placeholder}
                        </div>
                               </button>
                      </div>
                           ) : (
                             <>
                               <Card className={`mb-6 mt-3 border ${config.color} relative min-h-[96px] rounded-2xl shadow-sm hover:shadow-md transition-shadow`} >
                                 {/* Drop indicator */}
                                 {snapshot.isDraggingOver && (
                                   <div className={`pointer-events-none absolute inset-1 border border-dashed rounded-lg flex items-center justify-center z-20 transition-all duration-200 ease-out shadow ${toneVariant.dropBorder} ${toneVariant.dropBg}`}>
                                     <div className={`text-xs font-medium bg-white/95 px-2 py-1 rounded shadow-sm ${toneVariant.dropText}`}>
                                       Drop here
                                     </div>
                                   </div>
                                 )}
                                 <CardHeader className="py-3 h-full pr-12">
                                   <TooltipProvider delayDuration={150}>
                                     <Tooltip>
                                       <TooltipTrigger asChild>
                                         <div className="flex items-start gap-3 cursor-help">
                                           <div className={`p-2 rounded-xl border shadow-sm flex items-center justify-center ${toneVariant.iconWrapper}`}>
                                             {config.icon}
                                           </div>
                                           <div className="min-w-0 flex flex-col gap-1">
                                             <CardTitle className="text-sm font-semibold text-foreground leading-snug whitespace-normal break-words" title={config.name}>{config.name}</CardTitle>
                                             <Badge variant="outline" className={`w-fit text-[10px] font-semibold ${toneVariant.badge}`}>
                                               {columnItems.length}
                      </Badge>
                    </div>
                                         </div>
                                       </TooltipTrigger>
                                       <TooltipContent align="start" sideOffset={10} className="max-w-xs text-xs leading-relaxed text-slate-600">
                                         {config.description}
                                       </TooltipContent>
                                     </Tooltip>
                                   </TooltipProvider>
                  </CardHeader>
                                 {/* Chevron positioned relative to Card, not CardHeader */}
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   className={`absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white z-10 ${toneVariant.chevron}`}
                                   onClick={() => toggleStageCollapse(stage.id)}
                                   title={collapsedStages[stage.id] ? 'Expand cards' : 'Collapse cards'}
                                 >
                                   {collapsedStages[stage.id] ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                                 </Button>
                </Card>
                
                               <div
                                 className="transition-all duration-200 ease-out overflow-visible opacity-100 flex-1 min-h-0"
                               >
                                 <div className="space-y-3" ref={(el) => { if (el) columnRefs.current.set(stage.id, el); }}>
                                   {columnItems.map((app, index) => (
                                     <Draggable key={app.application_id} draggableId={app.application_id} index={index}>
                                       {(dragProvided, dragSnapshot) => {
                                         const baseStyle = getSoftDragStyle(dragProvided.draggableProps.style, dragSnapshot) ?? dragProvided.draggableProps.style ?? undefined;
                                         const baseCss: React.CSSProperties | undefined = baseStyle ? { ...(baseStyle as React.CSSProperties) } : undefined;
                                         const finalStyle: React.CSSProperties | undefined = baseCss
                                           ? {
                                               ...baseCss,
                                               zIndex: dragSnapshot.isDragging
                                                 ? 6000
                                                 : baseCss.zIndex,
                                             }
                                           : undefined;

                                         const card = (
                                           <div
                                             ref={dragProvided.innerRef}
                                             {...dragProvided.draggableProps}
                                             {...dragProvided.dragHandleProps}
                                             style={finalStyle}
                                             className={`cursor-grab transition-transform duration-150 ease-out ${
                                               dragSnapshot.isDragging ? 'shadow-xl ring-1 ring-slate-200/80 bg-white' : 'hover:-translate-y-0.5'
                                             }`}
                                           >
                                             <AppCardView app={app} agg={personAggregates.get(String(app.person_id))} compact={compactCards} />
                        </div>
                      );

                                         return (
                                           <PortalAwareItem snapshot={dragSnapshot}>
                                             {card}
                                           </PortalAwareItem>
                                         );
                                       }}
                                     </Draggable>
                                   ))}
                                     {provided.placeholder}
                                     {columnItems.length === 0 && (
                                    <div className={`h-32 rounded-lg flex items-center justify-center transition-all duration-200 ease-out border border-dashed ${
                                      snapshot.isDraggingOver
                                        ? `${toneVariant.dropBorder} ${toneVariant.dropBg}`
                                        : `${toneVariant.emptyBorder} bg-white/40`
                                      }`}>
                                      <p className={`text-xs ${snapshot.isDraggingOver ? `${toneVariant.dropText} font-semibold` : toneVariant.emptyText}`}>
                                        {snapshot.isDraggingOver ? 'Drop here' : 'Drop applications here'}
                      </p>
                    </div>
                  )}
                </div>
                               </div>
                             </>
                           )}
              </div>
                       );
                     }}
                   </Droppable>
            );
          })}
              </div>
            </DragDropContext>
        </div>
        )
      ) : (
        // Enhanced Table View
        <Card className="overflow-hidden border-slate-200">
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              {loading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-[40px_1.4fr_1fr_1fr_1fr_0.8fr_1fr_0.8fr_1.4fr_1fr] items-center gap-2 px-4 py-3 border-b">
                      <Skeleton className="h-5 w-5 rounded-sm" />
                      <Skeleton className="h-4 w-56" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-10" />
                      <Skeleton className="h-4 w-40" />
                      <div className="flex gap-2 justify-self-start">
                        <Skeleton className="h-7 w-7 rounded" />
                        <Skeleton className="h-7 w-7 rounded" />
                        <Skeleton className="h-7 w-7 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <table className="w-full text-sm">
                <colgroup>
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '6%' }} />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <tr className="text-slate-600">
                    <th className="px-6 py-3 text-left font-medium">
                      <Checkbox 
                        checked={selectedApps.length === filtered.length && filtered.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedApps(filtered.map(a => a.application_id));
                          } else {
                            setSelectedApps([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-6 py-3 text-left font-medium">Student</th>
                    <th className="px-6 py-3 text-left font-medium">Program</th>
                    <th className="px-6 py-3 text-left font-medium">Stage</th>
                    <th className="px-6 py-3 text-left font-medium">Priority</th>
                    <th className="px-6 py-3 text-left font-medium">Lead Score</th>
                    <th className="px-6 py-3 text-left font-medium">Conversion</th>
                    <th className="px-6 py-3 text-left font-medium">Days</th>
                    <th className="px-6 py-3 text-left font-medium">Next Action</th>
                    <th className="px-6 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
          {filteredWithMulti.map((app) => {
            const displayData = getApplicationCardDisplay(app);
            return (
              <tr key={app.application_id} className="group border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <Checkbox 
                    checked={selectedApps.includes(app.application_id)}
                    onCheckedChange={() => toggleSelection(app.application_id)}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="mr-1 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/80 text-muted-foreground text-xs font-bold border border-border">
                      {(displayData.studentName || '??').split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{displayData.studentName}</div>
                      <div className="text-muted-foreground text-xs">{app.email || 'No email'}</div>
                      {(personAppCounts.get(String(app.person_id)) || 0) > 1 && (
                        <div className="text-[10px] text-accent">{personAppCounts.get(String(app.person_id))} applications</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-700">{displayData.program}</td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className="text-xs">
                    {displayData.stage}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <PriorityBadge priority={app.priority || 'medium'} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">{displayData.leadScore}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <ProgressionIndicator probability={app.progression_probability || app.conversion_probability} />
                </td>
                {/* New: Delivery + Study columns combined for compactness */}
                <td className="px-6 py-4 text-slate-700">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className="capitalize">
                      {(() => { const m = deriveDeliveryMode(app); return m === 'unknown' ? '—' : m; })()}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">
                      {(() => { const s = deriveStudyPattern(app); return s === 'unknown' ? '—' : s.replace('_',' '); })()}
                    </Badge>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-700">{displayData.nextFollowUp}</td>
                <td className="px-6 py-4 text-slate-700">{displayData.nextAction}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    data-no-drag
                                    onPointerDown={(event) => event.stopPropagation()}
                                    className="h-7 w-7"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleEmailClick(app);
                                    }}
                                  >
                                    <Mail className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send Email</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    data-no-drag
                                    onPointerDown={(event) => event.stopPropagation()}
                                    className="h-7 w-7"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleMeetingClick(app);
                                    }}
                                  >
                                    <CalIcon className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Schedule Meeting</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    data-no-drag
                                    onPointerDown={(event) => event.stopPropagation()}
                                    className="h-7 w-7"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handlePhoneClick(app);
                                    }}
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Call Student</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2"><Eye className="h-3.5 w-3.5" /> View Details</DropdownMenuItem>
                                <DropdownMenuItem className="gap-2"><Edit className="h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem className="gap-2"><BarChart3 className="h-3.5 w-3.5" /> Analytics</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Details Drawer */}
      <ApplicationDetailsDrawer
        applicationId={selectedApplicationId}
        isOpen={showDetailsDrawer}
        onClose={closeDetailsDrawer}
      />

      {/* Bulk Actions Modal */}
      <BulkActionsModal
        isOpen={showBulkActions}
        onClose={closeBulkActions}
        selectedApplications={selectedApps}
        onSuccess={handleBulkActionSuccess}
      />



      {/* Email Composer */}
      <EmailComposer
        isOpen={showEmailComposer}
        onClose={() => setShowEmailComposer(false)}
        lead={selectedLeadForEmail}
        // forceFullscreen={true} // REMOVED - let it float like on LeadsManagement
      />

      {/* Call Console */}
      <CallConsole
        isOpen={showCallConsole}
        onClose={() => setShowCallConsole(false)}
        lead={selectedLeadForCall}
        onSaveCall={(data) => { console.log('Call saved from Applications:', data); }}
        // forceFullscreen={true} // REMOVED - let it float like on LeadsManagement
      />

      {/* Meeting Booker */}
      <MeetingBooker
        isOpen={showMeetingBooker}
        onClose={() => setShowMeetingBooker(false)}
        lead={selectedLeadForMeeting}
        onBookMeeting={(data) => { console.log('Meeting booked from Applications:', data); }}
        // forceFullscreen={true} // REMOVED - let it float like on LeadsManagement
        initialPosition={{ x: 120, y: 120 }}
        initialSize={{ width: 760, height: Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.7) }}
      />
      
      {/* Ask Ivy Overlay */}
      <IvyOverlay />
    </div>
  );
}
