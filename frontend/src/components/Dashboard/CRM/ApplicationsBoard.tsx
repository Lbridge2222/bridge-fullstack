import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from 'react-router-dom';
import {
  Search, Grid, List, Plus, Mail, Calendar as CalIcon,
  Phone, Eye, Edit, Filter, TrendingUp, MoreHorizontal,
  Clock, AlertTriangle, CheckCircle, XCircle, Star,
  Users, Target, Zap, ArrowUpDown, ArrowUp, ArrowDown,
  RefreshCw, BookmarkPlus, ChevronRight, X, ChevronLeft,
  ArrowUpRight,
  ChevronUp, ChevronDown, Flag, BarChart3, Focus,
  Workflow, Flame, Sparkles
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TriageModal } from "@/components/Actions/TriageModal";
import { useSessionStore } from "@/stores/sessionStore";
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
import { useApplicationIvy } from "@/ivy/useApplicationIvy";
import { ApplicationIvyButton } from "@/ivy/ApplicationIvyButton";
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
  cardBg: string;
  cardBorder?: string;
  cardGlow?: string;
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

type TableColumnKey =
  | "applicant"
  | "program"
  | "stage"
  | "priority"
  | "conversion"
  | "leadScore"
  | "delivery"
  | "nextAction"
  | "source"
  | "campus"
  | "cycle"
  | "lastActivity";

const BASE_COLUMN_VISIBILITY: Record<TableColumnKey, boolean> = {
  applicant: true,
  program: true,
  stage: true,
  priority: true,
  conversion: true,
  leadScore: false,
  delivery: false,
  nextAction: true,
  source: false,
  campus: false,
  cycle: false,
  lastActivity: false,
};

const DEFAULT_COLUMN_ORDER: TableColumnKey[] = [
  "applicant",
  "program",
  "stage",
  "priority",
  "conversion",
  "leadScore",
  "delivery",
  "nextAction",
  "source",
  "campus",
  "cycle",
  "lastActivity",
];

const DEFAULT_COLUMN_WIDTHS: Record<TableColumnKey, number> = {
  applicant: 260,
  program: 200,
  stage: 180,
  priority: 140,
  conversion: 150,
  leadScore: 140,
  delivery: 200,
  nextAction: 220,
  source: 160,
  campus: 180,
  cycle: 160,
  lastActivity: 180,
};

const COLUMN_ORDER_STORAGE_KEY = "appsTableOrder";
const COLUMN_WIDTHS_STORAGE_KEY = "appsTableWidths";
const COLUMN_LAYOUT_DEFAULT_STORAGE_KEY = "appsTableLayoutDefault";

interface TableColumnDefinition {
  id: TableColumnKey;
  label: string;
  minWidth?: number;
  align?: "left" | "right" | "center";
  defaultVisible?: boolean;
  lockVisibility?: boolean;
  sortable?: boolean;
  renderCell: (app: ApplicationCard) => React.ReactNode;
  getFilterValue?: (app: ApplicationCard) => string;
  filter?: {
    type: "text" | "select";
    placeholder?: string;
    options?: { label: string; value: string }[];
  };
  sortAccessor?: (app: ApplicationCard) => string | number | null | undefined;
}

type ColumnLayoutPreset = {
  order: TableColumnKey[];
  visibility: Partial<Record<TableColumnKey, boolean>>;
  widths: Partial<Record<TableColumnKey, number>>;
};

const normalizeColumnOrder = (order?: TableColumnKey[]): TableColumnKey[] => {
  const baseline = DEFAULT_COLUMN_ORDER;
  const seen = new Set<TableColumnKey>();
  const normalized: TableColumnKey[] = [];
  if (Array.isArray(order)) {
    order.forEach((id) => {
      if (baseline.includes(id) && !seen.has(id)) {
        normalized.push(id);
        seen.add(id);
      }
    });
  }
  baseline.forEach((id) => {
    if (!seen.has(id)) {
      normalized.push(id);
      seen.add(id);
    }
  });
  return normalized;
};

const arraysEqual = <T,>(a: T[], b: T[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const stageToneStyles: Record<StageTone, StageToneStyle> = {
  neutral: {
    cardBg: "bg-white/80",
    cardBorder: "",
    cardGlow: "",
    iconWrapper: "border-border/50 bg-white/80 text-slate-500",
    badge: "border-border/50 bg-white text-slate-600",
    chevron: "border-border/40 text-slate-500 hover:bg-white hover:border-border/60",
    dropRing: "ring-slate-200/80 bg-slate-100/70",
    dropBorder: "border-slate-300/70",
    dropBg: "bg-slate-100/80",
    dropText: "text-slate-600",
    emptyBorder: "border-slate-200/70",
    emptyText: "text-slate-500",
    collapsedShell: "border border-dashed border-slate-200 bg-slate-50",
    collapsedChevron: "border-border/40 text-slate-500",
    collapsedCount: "border-border/40 bg-white text-slate-600",
    collapsedLabel: "text-slate-600",
  },
  success: {
    cardBg: "bg-white",
    cardBorder: "border-green-300",
    cardGlow: "shadow-[0_0_0_2px_hsl(var(--semantic-success)/0.15),0_18px_45px_-28px_hsl(var(--semantic-success)/0.35)]",
    iconWrapper: "border-green-300 bg-white/80 text-[hsl(var(--semantic-success))]",
    badge: "border-green-300 bg-white text-[hsl(var(--semantic-success))]",
    chevron: "border-green-300 text-[hsl(var(--semantic-success))] hover:bg-white hover:border-green-400",
    dropRing: "ring-[hsl(var(--semantic-success))]/30 bg-white",
    dropBorder: "border-green-300",
    dropBg: "bg-white",
    dropText: "text-[hsl(var(--semantic-success))]",
    emptyBorder: "border-green-300",
    emptyText: "text-[hsl(var(--semantic-success))]",
    collapsedShell: "border border-dashed border-green-300 bg-white",
    collapsedChevron: "border-green-300 text-[hsl(var(--semantic-success))]",
    collapsedCount: "border-green-300 bg-white text-[hsl(var(--semantic-success))]",
    collapsedLabel: "text-[hsl(var(--semantic-success))]/90",
  },
  danger: {
    cardBg: "bg-white",
    cardBorder: "border-destructive/40",
    cardGlow: "shadow-[0_0_0_2px_hsl(var(--destructive)/0.12),0_18px_45px_-28px_hsl(var(--destructive)/0.28)]",
    iconWrapper: "border-destructive/40 bg-white/80 text-destructive",
    badge: "border-destructive/40 bg-white text-destructive",
    chevron: "border-destructive/40 text-destructive hover:bg-white hover:border-destructive/50",
    dropRing: "ring-destructive/30 bg-white",
    dropBorder: "border-destructive/40",
    dropBg: "bg-white",
    dropText: "text-destructive",
    emptyBorder: "border-destructive/40",
    emptyText: "text-destructive",
    collapsedShell: "border border-dashed border-destructive/40 bg-white",
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
  const [riskOnly, setRiskOnly] = React.useState<boolean>(false);
  const [blockersOnly, setBlockersOnly] = React.useState<boolean>(false);
  const [sourceFilter, setSourceFilter] = React.useState<string>('all');
  const [campusFilter, setCampusFilter] = React.useState<string>('all');
  const [cycleFilter, setCycleFilter] = React.useState<string>('all');
  const [compactCards, setCompactCards] = React.useState<boolean>(() => localStorage.getItem('appsCompact') === '1');
  const [aiFocus, setAiFocus] = React.useState<boolean>(() => localStorage.getItem('appsAiFocus') === '1');
  const [selectedApps, setSelectedApps] = React.useState<string[]>([]);
  const [showFilters, setShowFilters] = React.useState<boolean>(() => {
    try { return localStorage.getItem('appsShowFilters') === '1'; } catch { return false; }
  });
  const [showInsights, setShowInsights] = React.useState<boolean>(() => {
    try { return localStorage.getItem('appsShowInsights') === '1'; } catch { return false; }
  });
  const [selectedApplicationId, setSelectedApplicationId] = React.useState<string | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = React.useState(false);
  const [showBulkActions, setShowBulkActions] = React.useState(false);
  const boardScrollRef = React.useRef<HTMLDivElement | null>(null);
  const tableRef = React.useRef<HTMLTableElement | null>(null);
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
  const { IvyOverlay, openIvy, setIvyContext } = useApplicationIvy();
  const { ivySuggestions, setIvySuggestions, consumeSuggestion } = useSessionStore();

  // Debug: Log ivySuggestions whenever it changes
  React.useEffect(() => {
    console.log('[ApplicationsBoard] ivySuggestions state changed:', ivySuggestions);
  }, [ivySuggestions]);
  
  const [draggedApplicationId, setDraggedApplicationId] = React.useState<string | null>(null);
  const [triageModalOpen, setTriageModalOpen] = React.useState(false);

  // Listen for Ivy suggestions and update store
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { application_ids?: string[] } | undefined;
      const ids = Array.isArray(detail?.application_ids) ? detail!.application_ids : [];
      console.log('[ApplicationsBoard] Received ivy:suggestAction event with IDs:', ids);
      setIvySuggestions(ids);
      console.log('[ApplicationsBoard] Store updated, ivySuggestions should now be:', { applicationIds: ids });
    };
    window.addEventListener('ivy:suggestAction', handler as EventListener);
    return () => window.removeEventListener('ivy:suggestAction', handler as EventListener);
  }, [setIvySuggestions]);

  // When an action completes, consume suggestion for that application
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { application_id?: string } | undefined;
      const id = detail?.application_id;
      if (id) consumeSuggestion(id);
    };
    window.addEventListener('action:completed', handler as EventListener);
    return () => window.removeEventListener('action:completed', handler as EventListener);
  }, [consumeSuggestion]);

  const [columnVisibility, setColumnVisibility] = React.useState<Record<TableColumnKey, boolean>>(() => {
    try {
      const stored = localStorage.getItem("appsTableColumns");
      if (!stored) return BASE_COLUMN_VISIBILITY;
      const parsed = JSON.parse(stored) as Record<TableColumnKey, boolean>;
      return { ...BASE_COLUMN_VISIBILITY, ...parsed };
    } catch {
      return BASE_COLUMN_VISIBILITY;
    }
  });
  const [columnOrder, setColumnOrder] = React.useState<TableColumnKey[]>(() => {
    try {
      const stored = localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
      if (!stored) return [...DEFAULT_COLUMN_ORDER];
      const parsed = JSON.parse(stored) as TableColumnKey[];
      return normalizeColumnOrder(parsed);
    } catch {
      return [...DEFAULT_COLUMN_ORDER];
    }
  });
  const [columnWidths, setColumnWidths] = React.useState<Record<TableColumnKey, number>>(() => {
    try {
      const stored = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
      if (!stored) return { ...DEFAULT_COLUMN_WIDTHS };
      const parsed = JSON.parse(stored) as Partial<Record<TableColumnKey, number>>;
      return { ...DEFAULT_COLUMN_WIDTHS, ...(parsed || {}) };
    } catch {
      return { ...DEFAULT_COLUMN_WIDTHS };
    }
  });

  const [columnFilters, setColumnFilters] = React.useState<Partial<Record<TableColumnKey, string>>>(() => {
    try {
      const stored = localStorage.getItem("appsTableFilters");
      if (!stored) return {};
      const parsed = JSON.parse(stored) as Partial<Record<TableColumnKey, string>>;
      const sanitized: Partial<Record<TableColumnKey, string>> = {};
      Object.entries(parsed || {}).forEach(([key, value]) => {
        if (typeof value === "string" && value.trim().length > 0 && value !== "all") {
          sanitized[key as TableColumnKey] = value;
        }
      });
      return sanitized;
    } catch {
      return {};
    }
  });

  const [sortState, setSortState] = React.useState<{ column: TableColumnKey | null; direction: "asc" | "desc" }>({
    column: "applicant",
    direction: "asc",
  });
  const updateColumnFilter = React.useCallback((columnId: TableColumnKey, value: string) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      const normalized = (value ?? "").trim();
      if (!normalized || normalized === "all") {
        delete next[columnId];
      } else {
        next[columnId] = normalized;
      }
      return next;
    });
  }, []);
  const clearColumnFilters = React.useCallback(() => setColumnFilters({}), []);
  const [resizingColumnId, setResizingColumnId] = React.useState<TableColumnKey | null>(null);

  React.useEffect(() => { localStorage.setItem('appsCompact', compactCards ? '1' : '0'); }, [compactCards]);
  React.useEffect(() => { localStorage.setItem('appsAiFocus', aiFocus ? '1' : '0'); }, [aiFocus]);
  React.useEffect(() => { try { localStorage.setItem('appsShowFilters', showFilters ? '1' : '0'); } catch {} }, [showFilters]);
  React.useEffect(() => {
    try { localStorage.setItem('appsShowInsights', showInsights ? '1' : '0'); } catch {}
  }, [showInsights]);
  React.useEffect(() => {
    try { localStorage.setItem("appsTableColumns", JSON.stringify(columnVisibility)); } catch {}
  }, [columnVisibility]);
  React.useEffect(() => {
    try { localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columnOrder)); } catch {}
  }, [columnOrder]);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const timeout = window.setTimeout(() => {
      try { localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths)); } catch {}
    }, 160);
    return () => window.clearTimeout(timeout);
  }, [columnWidths]);
  React.useEffect(() => {
    try { localStorage.setItem("appsTableFilters", JSON.stringify(columnFilters)); } catch {}
  }, [columnFilters]);
  React.useEffect(() => {
    return () => {
      try { document.body.style.cursor = ""; } catch {}
      tableRef.current?.classList.remove("is-resizing");
    };
  }, []);


  const activeFilterCount = React.useMemo(() => {
    let c = 0;
    if ((search || '').trim().length > 0) c++;
    if (program !== 'all') c++;
    if (urgency !== 'all') c++;
    if (priority !== 'all') c++;
    if (deliveryMode !== 'all') c++;
    if (studyPattern !== 'all') c++;
    if (multiOnly) c++;
    if (sourceFilter !== 'all') c++;
    if (campusFilter !== 'all') c++;
    if (cycleFilter !== 'all') c++;
    return c;
  }, [search, program, urgency, priority, deliveryMode, studyPattern, multiOnly, sourceFilter, campusFilter, cycleFilter]);

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
    setRiskOnly(false);
    setBlockersOnly(false);
    setSourceFilter('all');
    setCampusFilter('all');
    setCycleFilter('all');
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
      const matchesSource = sourceFilter === 'all' || (app.source || '') === sourceFilter;
      const matchesCampus = campusFilter === 'all' || (app.campus_name || '') === campusFilter;
      const matchesCycle = cycleFilter === 'all' || (app.cycle_label || '') === cycleFilter;
      const prob = (app.conversion_probability ?? app.progression_probability ?? 0);
      const matchesRisk = !riskOnly || prob < 0.35;
      const hasBlockers = Array.isArray(app.progression_blockers) && app.progression_blockers.length > 0;
      const matchesBlockers = !blockersOnly || hasBlockers;
      
      // Multi-application filter: keep only applicants that appear more than once
      // We'll compute counts below and apply after this filter
      
      return matchesSearch && matchesProgram && matchesDelivery && matchesPattern && matchesSource && matchesCampus && matchesCycle && matchesRisk && matchesBlockers;
    });
  }, [applications, search, program, deliveryMode, studyPattern, sourceFilter, campusFilter, cycleFilter, deriveDeliveryMode, deriveStudyPattern, riskOnly, blockersOnly]);

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
    return [...new Set(applications.map((app: ApplicationCard) => app.programme_name).filter(Boolean))] as string[];
  }, [applications]);

  const uniqueSources = React.useMemo(() => {
    if (!applications || !Array.isArray(applications)) return [];
    return [...new Set(applications.map((app: ApplicationCard) => app.source).filter(Boolean))] as string[];
  }, [applications]);

  const uniqueCampuses = React.useMemo(() => {
    if (!applications || !Array.isArray(applications)) return [];
    return [...new Set(applications.map((app: ApplicationCard) => app.campus_name).filter(Boolean))] as string[];
  }, [applications]);

  const uniqueCycles = React.useMemo(() => {
    if (!applications || !Array.isArray(applications)) return [];
    return [...new Set(applications.map((app: ApplicationCard) => app.cycle_label).filter(Boolean))] as string[];
  }, [applications]);

  // Ask Ivy debug: expose visible apps (with names) for quick troubleshooting
  React.useEffect(() => {
    try {
      const rows = (filteredWithMulti || []).map((a: ApplicationCard) => ({
        application_id: a.application_id,
        person_id: a.person_id,
        name: `${a.first_name || ''} ${a.last_name || ''}`.trim(),
        first_name: a.first_name,
        last_name: a.last_name,
        email: a.email,
        stage: a.stage,
        programme_name: a.programme_name,
      }));
      (window as any).__ivyAppsVisible = rows;
      // Log a small sample for convenience
      if (rows.length > 0) {
        console.log('[AskIvy Debug] Visible apps (id → name):',
          rows.slice(0, 10).map(r => ({ id: r.application_id, name: r.name, stage: r.stage, program: r.programme_name }))
        );
      } else {
        console.log('[AskIvy Debug] No visible apps for AskIvy matching. Check filters or data.');
      }
    } catch {}
  }, [filteredWithMulti]);

  // Keep Ask Ivy context in sync (after progressionStats is available)
  const ivySyncKeyRef = React.useRef<string>("");
  React.useEffect(() => {
    try {
      const keyObj = {
        ids: (filteredWithMulti || []).map(a => a.application_id),
        selId: selectedApplicationId || null,
        sel: selectedApps,
        view,
        f: { program, urgency, priority, deliveryMode, studyPattern, multiOnly },
        stats: progressionStats,
      };
      const key = JSON.stringify(keyObj);
      if (ivySyncKeyRef.current === key) return;
      ivySyncKeyRef.current = key;

      setIvyContext?.({
        applications: filteredWithMulti as any,
        selectedApplicationId: selectedApplicationId || undefined,
        selectedApplications: selectedApps,
        currentView: view,
        filters: { program, urgency, priority, deliveryMode, studyPattern, multiOnly },
        progressionStats,
      });
    } catch {}
  }, [
    filteredWithMulti,
    progressionStats,
    selectedApplicationId,
    selectedApps,
    view,
    program,
    urgency,
    priority,
    deliveryMode,
    studyPattern,
    multiOnly,
    setIvyContext,
  ]);

  const stageFilterOptions = React.useMemo(() => {
    return stages.map(stage => {
      const config = getStageConfig(stage.id);
      return { value: stage.id, label: config.name || stage.id };
    });
  }, [stages]);

  const priorityFilterOptions = React.useMemo(() => ([
    { value: "critical", label: "Critical" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ]), []);

  const isColumnVisible = React.useCallback(
    (columnId: TableColumnKey) =>
      Object.prototype.hasOwnProperty.call(columnVisibility, columnId)
        ? columnVisibility[columnId]
        : BASE_COLUMN_VISIBILITY[columnId],
    [columnVisibility]
  );

  const columnDefinitions = React.useMemo<TableColumnDefinition[]>(() => {
    const priorityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return [
      {
        id: "applicant",
        label: "Applicant",
        minWidth: 240,
        lockVisibility: true,
        sortable: true,
        filter: { type: "text", placeholder: "Search name or email" },
        getFilterValue: (app) => `${app.first_name || ""} ${app.last_name || ""} ${app.email || ""}`.toLowerCase(),
        sortAccessor: (app) => {
          const display = getApplicationCardDisplay(app);
          return (display.studentName || "").toLowerCase();
        },
        renderCell: (app) => {
          const display = getApplicationCardDisplay(app);
          const initials = (display.studentName || "")
            .split(" ")
            .map(part => part?.[0] || "")
            .join("")
            .slice(0, 2)
            .toUpperCase() || "??";
          const multiCount = personAppCounts.get(String(app.person_id)) || 0;
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded border border-border bg-muted text-xs font-semibold text-muted-foreground">
                {initials}
              </div>
              <div className="min-w-0">
                <button
                  type="button"
                  className="group/name inline-flex w-full items-center gap-1 truncate text-left text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                  title={`Open application for ${display.studentName}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/admissions/applications/${app.application_id}`);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      navigate(`/admissions/applications/${app.application_id}`);
                    }
                  }}
                >
                  <span className="truncate">{display.studentName}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover/name:opacity-100" />
                </button>
                <div className="text-xs text-muted-foreground truncate">{app.email || "—"}</div>
                {multiCount > 1 && (
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {multiCount} applications
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "program",
        label: "Program",
        minWidth: 200,
        sortable: true,
        filter: {
          type: "select",
          placeholder: "All programs",
          options: uniqueProgrammes.map(name => ({ value: name, label: name })),
        },
        getFilterValue: (app) => app.programme_name || "",
        sortAccessor: (app) => (app.programme_name || "").toLowerCase(),
        renderCell: (app) => {
          const display = getApplicationCardDisplay(app);
          return (
            <div className="min-w-0">
              <div className="truncate text-sm text-foreground">{display.program}</div>
              <div className="truncate text-xs text-muted-foreground">{app.programme_name || "—"}</div>
            </div>
          );
        },
      },
      {
        id: "stage",
        label: "Stage",
        minWidth: 160,
        sortable: true,
        lockVisibility: true,
        filter: {
          type: "select",
          placeholder: "All stages",
          options: stageFilterOptions,
        },
        getFilterValue: (app) => mapStageToFrontendStage(app.stage),
        sortAccessor: (app) => mapStageToFrontendStage(app.stage) || "",
        renderCell: (app) => (
          <div className="text-sm text-foreground">{mapStageToDisplay(app.stage)}</div>
        ),
      },
      {
        id: "priority",
        label: "Priority",
        minWidth: 140,
        sortable: true,
        filter: {
          type: "select",
          placeholder: "All priorities",
          options: priorityFilterOptions,
        },
        getFilterValue: (app) => (app.priority || "medium").toLowerCase(),
        sortAccessor: (app) => priorityRank[(app.priority || "medium").toLowerCase()] || 0,
        renderCell: (app) => (
          <PriorityBadge priority={(app.priority || "medium").toLowerCase()} />
        ),
      },
      {
        id: "conversion",
        label: "Conversion",
        minWidth: 150,
        align: "right",
        sortable: true,
        sortAccessor: (app) => {
          const probability = app.progression_probability ?? app.conversion_probability ?? 0;
          return probability;
        },
        renderCell: (app) => {
          const probability = app.progression_probability ?? app.conversion_probability;
          if (probability === undefined || probability === null) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          const percentage = Math.round(probability * 100);
          return (
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm font-medium tabular-nums text-foreground">{percentage}%</span>
              <div className="h-1.5 w-16 rounded bg-muted">
                <div
                  className="h-full rounded bg-foreground/70"
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        id: "leadScore",
        label: "Lead Score",
        minWidth: 140,
        align: "right",
        sortable: true,
        renderCell: (app) => {
          const display = getApplicationCardDisplay(app);
          const score = Number(display.leadScore) || 0;
          return (
            <div className="text-sm font-medium tabular-nums text-foreground">{score}</div>
          );
        },
        sortAccessor: (app) => {
          const display = getApplicationCardDisplay(app);
          return Number(display.leadScore) || 0;
        },
      },
      {
        id: "delivery",
        label: "Delivery",
        minWidth: 200,
        filter: { type: "text", placeholder: "Filter delivery" },
        getFilterValue: (app) => {
          const mode = deriveDeliveryMode(app);
          const pattern = deriveStudyPattern(app);
          return `${mode} ${pattern}`.toLowerCase();
        },
        renderCell: (app) => {
          const mode = deriveDeliveryMode(app);
          const pattern = deriveStudyPattern(app);
          const parts = [
            mode && mode !== "unknown" ? mode.replace("_", " ") : null,
            pattern && pattern !== "unknown" ? pattern.replace("_", " ") : null,
          ].filter(Boolean);
          return <div className="text-sm text-foreground capitalize">{parts.join(" · ") || "—"}</div>;
        },
      },
      {
        id: "nextAction",
        label: "Next Action",
        minWidth: 220,
        sortable: true,
        filter: { type: "text", placeholder: "Filter action" },
        getFilterValue: (app) => {
          const display = getApplicationCardDisplay(app);
          return `${display.nextAction || ""} ${display.nextFollowUp || ""}`.toLowerCase();
        },
        sortAccessor: (app) => {
          const display = getApplicationCardDisplay(app);
          return (display.nextFollowUp || "").toLowerCase();
        },
        renderCell: (app) => {
          const display = getApplicationCardDisplay(app);
          return (
            <div className="min-w-0">
              <div className="truncate text-sm text-foreground">{display.nextAction || "—"}</div>
              <div className="truncate text-xs text-muted-foreground">{display.nextFollowUp || ""}</div>
            </div>
          );
        },
      },
      {
        id: "source",
        label: "Source",
        minWidth: 160,
        filter: {
          type: "select",
          placeholder: "All sources",
          options: uniqueSources.map(src => ({ value: src, label: src })),
        },
        getFilterValue: (app) => app.source || "",
        renderCell: (app) => <span className="text-sm text-foreground capitalize">{app.source || "—"}</span>,
        sortable: true,
        sortAccessor: (app) => (app.source || "").toLowerCase(),
      },
      {
        id: "campus",
        label: "Campus",
        minWidth: 180,
        filter: {
          type: "select",
          placeholder: "All campuses",
          options: uniqueCampuses.map(campus => ({ value: campus, label: campus })),
        },
        getFilterValue: (app) => app.campus_name || "",
        sortable: true,
        sortAccessor: (app) => (app.campus_name || "").toLowerCase(),
        renderCell: (app) => <span className="text-sm text-foreground">{app.campus_name || "—"}</span>,
      },
      {
        id: "cycle",
        label: "Cycle",
        minWidth: 160,
        filter: {
          type: "select",
          placeholder: "All cycles",
          options: uniqueCycles.map(cycle => ({ value: cycle, label: cycle })),
        },
        getFilterValue: (app) => app.cycle_label || "",
        sortable: true,
        sortAccessor: (app) => (app.cycle_label || "").toLowerCase(),
        renderCell: (app) => <span className="text-sm text-foreground">{app.cycle_label || "—"}</span>,
      },
      {
        id: "lastActivity",
        label: "Last Activity",
        minWidth: 180,
        sortable: true,
        filter: { type: "text", placeholder: "Filter activity" },
        getFilterValue: (app) => {
          const display = getApplicationCardDisplay(app);
          return (display.lastActivity || "").toLowerCase();
        },
        sortAccessor: (app) => {
          const display = getApplicationCardDisplay(app);
          return (display.lastActivity || "").toLowerCase();
        },
        renderCell: (app) => {
          const display = getApplicationCardDisplay(app);
          return <span className="text-sm text-foreground">{display.lastActivity || "—"}</span>;
        },
      },
    ];
  }, [
    navigate,
    personAppCounts,
    uniqueProgrammes,
    stageFilterOptions,
    priorityFilterOptions,
    deriveDeliveryMode,
    deriveStudyPattern,
    uniqueSources,
    uniqueCampuses,
    uniqueCycles,
  ]);

  const orderedColumnDefinitions = React.useMemo(() => {
    const map = new Map<TableColumnKey, TableColumnDefinition>();
    columnDefinitions.forEach((column) => map.set(column.id, column));
    const ordered: TableColumnDefinition[] = [];
    columnOrder.forEach((id) => {
      const column = map.get(id);
      if (column) ordered.push(column);
    });
    columnDefinitions.forEach((column) => {
      if (!ordered.some((entry) => entry.id === column.id)) {
        ordered.push(column);
      }
    });
    return ordered;
  }, [columnDefinitions, columnOrder]);

  const visibleColumns = React.useMemo(
    () => orderedColumnDefinitions.filter((column) => isColumnVisible(column.id)),
    [orderedColumnDefinitions, isColumnVisible]
  );

  React.useEffect(() => {
    setColumnOrder((prev) => {
      const normalized = normalizeColumnOrder(prev);
      const definitionIds = columnDefinitions.map((column) => column.id);
      let changed = !arraysEqual(prev, normalized);
      const updated = [...normalized];
      definitionIds.forEach((id) => {
        if (!updated.includes(id)) {
          updated.push(id);
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [columnDefinitions]);

  const lockedColumnIds = React.useMemo(() => {
    const next = new Set<TableColumnKey>();
    columnDefinitions.forEach((column) => {
      if (column.lockVisibility) next.add(column.id);
    });
    return next;
  }, [columnDefinitions]);

  const handleToggleColumnVisibility = React.useCallback(
    (columnId: TableColumnKey) => {
      if (lockedColumnIds.has(columnId)) return;
      setColumnVisibility((prev) => {
        const current = Object.prototype.hasOwnProperty.call(prev, columnId)
          ? prev[columnId]
          : BASE_COLUMN_VISIBILITY[columnId];
        return { ...prev, [columnId]: !current };
      });
    },
    [lockedColumnIds]
  );

  const moveColumn = React.useCallback((columnId: TableColumnKey, direction: "up" | "down") => {
    setColumnOrder((prev) => {
      const order = normalizeColumnOrder(prev);
      const index = order.indexOf(columnId);
      if (index === -1) return order;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= order.length) return order;
      const next = [...order];
      const [removed] = next.splice(index, 1);
      next.splice(targetIndex, 0, removed);
      return next;
    });
  }, []);

  const handleSort = React.useCallback(
    (columnId: TableColumnKey) => {
      const sortableColumn = columnDefinitions.find(
        (column) => column.id === columnId && column.sortable
      );
      if (!sortableColumn) return;

      setSortState((prev) => {
        if (prev.column === columnId) {
          return {
            column: columnId,
            direction: prev.direction === "asc" ? "desc" : "asc",
          };
        }
        return { column: columnId, direction: "asc" };
      });
    },
    [columnDefinitions]
  );

  const handleColumnResizeStart = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>, columnId: TableColumnKey) => {
      event.preventDefault();
      event.stopPropagation();

      const columnIndex = visibleColumns.findIndex((column) => column.id === columnId);
      if (columnIndex === -1) return;

      const tableElement = tableRef.current;
      const colElement = tableElement?.querySelectorAll<HTMLTableColElement>("colgroup col")[columnIndex + 1];
      const headerCell = event.currentTarget.closest("th") as HTMLTableCellElement | null;
      if (!colElement || !headerCell) return;

      const startX = event.clientX;
      const initialWidth = headerCell.getBoundingClientRect().width;
      const column = visibleColumns[columnIndex];
      if (!column) return;
      
      const minWidth =
        column.minWidth ??
        DEFAULT_COLUMN_WIDTHS[column.id] ??
        120;

      const updateWidth = (width: number) => {
        const px = `${width}px`;
        colElement.style.width = px;
        colElement.style.minWidth = px;
        colElement.style.maxWidth = px;
      };

      const commitWidthToState = (width: number) => {
        setColumnWidths((prev) => {
          if (prev[columnId] === width) return prev;
          return { ...prev, [columnId]: width };
        });
      };

      let latestWidth = initialWidth;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        latestWidth = Math.max(minWidth, Math.round(initialWidth + delta));
        updateWidth(latestWidth);
      };

      const handlePointerEnd = () => {
        commitWidthToState(latestWidth);
        setResizingColumnId(null);
        tableElement?.classList.remove("is-resizing");
        document.body.style.cursor = "";
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerEnd);
        window.removeEventListener("pointercancel", handlePointerEnd);
      };

      tableElement?.classList.add("is-resizing");
      setResizingColumnId(columnId);
      document.body.style.cursor = "col-resize";
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerEnd);
      window.addEventListener("pointercancel", handlePointerEnd);
    },
    [visibleColumns, setColumnWidths, tableRef]
  );

  const applyLayoutPreset = React.useCallback((preset: ColumnLayoutPreset | null) => {
    if (preset?.order?.length) {
      setColumnOrder(normalizeColumnOrder(preset.order));
    } else {
      setColumnOrder([...DEFAULT_COLUMN_ORDER]);
    }

    if (preset?.visibility) {
      setColumnVisibility({ ...BASE_COLUMN_VISIBILITY, ...preset.visibility });
    } else {
      setColumnVisibility({ ...BASE_COLUMN_VISIBILITY });
    }

    if (preset?.widths) {
      setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS, ...preset.widths });
    } else {
      setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS });
    }
  }, []);

  const handleResetLayout = React.useCallback(() => {
    try {
      const stored = localStorage.getItem(COLUMN_LAYOUT_DEFAULT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ColumnLayoutPreset;
        applyLayoutPreset(parsed);
        toast({ title: "Layout reset", description: "Default column layout applied.", variant: "success" });
        return;
      }
    } catch (error) {
      console.warn("Failed to load saved layout preset", error);
    }
    applyLayoutPreset(null);
    toast({ title: "Layout reset", description: "Baseline column layout applied.", variant: "default" });
  }, [applyLayoutPreset, toast]);

  const handleSaveDefaultLayout = React.useCallback(() => {
    const layoutPreset: ColumnLayoutPreset = {
      order: [...columnOrder],
      visibility: { ...columnVisibility },
      widths: { ...columnWidths },
    };
    try {
      localStorage.setItem(COLUMN_LAYOUT_DEFAULT_STORAGE_KEY, JSON.stringify(layoutPreset));
      toast({ title: "Layout saved", description: "Current column layout stored as default.", variant: "success" });
    } catch (error) {
      console.warn("Failed to save layout preset", error);
      toast({ title: "Unable to save layout", description: "Check storage permissions and try again.", variant: "destructive" });
    }
  }, [columnOrder, columnVisibility, columnWidths, toast]);

  const columnLabelMap = React.useMemo(() => {
    const map = new Map<TableColumnKey, string>();
    orderedColumnDefinitions.forEach((column) => map.set(column.id, column.label));
    return map;
  }, [orderedColumnDefinitions]);

  const activeColumnFilterEntries = React.useMemo(
    () =>
      Object.entries(columnFilters).filter(
        ([, value]) =>
          typeof value === "string" && value.trim().length > 0 && value !== "all"
      ),
    [columnFilters]
  );

  const getFilterDisplayValue = React.useCallback(
    (columnId: TableColumnKey, value: string) => {
      const column = orderedColumnDefinitions.find((col) => col.id === columnId);
      if (!column) return value;
      if (column.filter?.type === "select") {
        const match = column.filter.options?.find((option) => option.value === value);
        return match?.label ?? value;
      }
      return value;
    },
    [orderedColumnDefinitions]
  );

  const handleClearColumnFilter = React.useCallback(
    (columnId: TableColumnKey) => updateColumnFilter(columnId, ""),
    [updateColumnFilter]
  );

  const collator = React.useMemo(
    () => new Intl.Collator(undefined, { sensitivity: "base", numeric: false }),
    []
  );

  const tableFilteredRows = React.useMemo(() => {
    const dataset = Array.isArray(filteredWithMulti) ? filteredWithMulti : [];
    if (!dataset.length) return [];

    return dataset.filter((app) =>
      columnDefinitions.every((column) => {
        if (!column.filter) return true;
        const filterValue = columnFilters[column.id];
        if (!filterValue) return true;

        const value = column.getFilterValue ? column.getFilterValue(app) : "";
        if (column.filter.type === "select") {
          return (value || "") === filterValue;
        }
        return (value || "").toLowerCase().includes(filterValue.toLowerCase());
      })
    );
  }, [filteredWithMulti, columnDefinitions, columnFilters]);

  const sortedTableRows = React.useMemo(() => {
    const dataset = [...tableFilteredRows];
    if (!dataset.length) return dataset;

    const sortColumn = columnDefinitions.find(
      (column) => column.id === sortState.column && column.sortable
    );

    if (!sortColumn) return dataset;

    const getSortableValue = (app: ApplicationCard) => {
      if (sortColumn.sortAccessor) return sortColumn.sortAccessor(app);
      if (sortColumn.getFilterValue) return sortColumn.getFilterValue(app);
      return "";
    };

    dataset.sort((a, b) => {
      const aValue = getSortableValue(a);
      const bValue = getSortableValue(b);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return aValue - bValue;
      }

      const left = aValue == null ? "" : String(aValue);
      const right = bValue == null ? "" : String(bValue);
      return collator.compare(left, right);
    });

    if (sortState.direction === "desc") dataset.reverse();
    return dataset;
  }, [tableFilteredRows, sortState, columnDefinitions, collator]);

  const tableRows = sortedTableRows;
  const activeColumnFilterCount = React.useMemo(
    () => Object.keys(columnFilters).length,
    [columnFilters]
  );

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

  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { application_id?: string } | undefined;
      const applicationId = detail?.application_id;
      const app = applicationId
        ? filteredWithMulti.find((candidate) => candidate.application_id === applicationId)
        : filteredWithMulti[0];

      if (app) {
        handlePhoneClick(app);
      } else {
        toast({ title: "Call console unavailable", description: "Couldn't find application data for this call.", variant: "destructive" });
      }
    };

    window.addEventListener('actions:openCallConsole', handler as EventListener);
    return () => window.removeEventListener('actions:openCallConsole', handler as EventListener);
  }, [filteredWithMulti, handlePhoneClick, toast]);

  // Listen for email composer events from TriageModal
  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { 
        application_id?: string;
        triage_item?: any;
        artifacts?: any;
      } | undefined;
      const applicationId = detail?.application_id;
      const app = applicationId
        ? filteredWithMulti.find((candidate) => candidate.application_id === applicationId)
        : filteredWithMulti[0];

      if (app) {
        handleEmailClick(app);
      } else {
        toast({ title: "Email composer unavailable", description: "Couldn't find application data for this email.", variant: "destructive" });
      }
    };
    window.addEventListener('actions:openEmailComposer', handler as EventListener);
    return () => window.removeEventListener('actions:openEmailComposer', handler as EventListener);
  }, [handleEmailClick, filteredWithMulti, toast]);

  // Actions dropdown handlers
  const handleNextBestAction = React.useCallback(async () => {
    // This will be handled by TriageModal when opened with the "Next Best Action" option
    setTriageModalOpen(true);
  }, []);

  const handleViewBlockers = React.useCallback(() => {
    // TODO: Toggle blockers filter
    toast({ title: "View Blockers", description: "Feature coming soon", variant: "default" });
  }, [toast]);

  const handleDailyReport = React.useCallback(() => {
    // TODO: Generate daily report
    toast({ title: "Daily Report", description: "Feature coming soon", variant: "default" });
  }, [toast]);

  const handleFocusMode = React.useCallback(() => {
    // TODO: Navigate to focus mode
    toast({ title: "Focus Mode", description: "Feature coming soon", variant: "default" });
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
    const [isExpanded, setIsExpanded] = React.useState(false);

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
    const probability = app.progression_probability ?? app.conversion_probability ?? 0;
    const progressionPercentage = Math.round(probability * 100);
    return (
      <Card 
        className={`relative flex flex-col select-none border transition-transform duration-150 ease-out group ${
          draggedApplicationId === app.application_id
            ? 'opacity-60 scale-[0.97] shadow-2xl border-[hsl(var(--brand-secondary))] z-[70] cursor-grabbing'
            : 'hover:-translate-y-0.5 hover:shadow-lg cursor-grab'
         } ${aiFocus ? (isAiHigh ? 'border-accent/40 shadow-md' : 'border-slate-200 opacity-60') : 'border-slate-200 hover:shadow-md hover:border-slate-300'}`}
      >
        <Rail color={priorityToColor(app.priority)} />

        <CardHeader className="relative pb-3 pt-4">
          <div className="flex items-start gap-2">
            <Checkbox
              data-no-drag
              onPointerDown={(e) => e.stopPropagation()}
              checked={selectedApps.includes(app.application_id)}
              onCheckedChange={() => toggleSelection(app.application_id)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm font-semibold text-slate-900 leading-tight mb-1">
                    {displayData.studentName}
                  </CardTitle>
                  <p className="text-xs text-slate-500 truncate">{app.email || 'No email'}</p>
                  <p className="text-xs text-slate-600 truncate mt-0.5 font-medium">{displayData.program}</p>
                  {agg && agg.count > 1 && (
                    <Badge variant="secondary" className="mt-1.5 w-fit text-[10px]">{agg.count} applications</Badge>
                  )}

                  {/* Progression bar below applicant info */}
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">Next Stage</span>
                      <span className="text-xs font-bold tabular-nums text-slate-800">{progressionPercentage}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          progressionPercentage >= 70 ? 'bg-success' :
                          progressionPercentage >= 40 ? 'bg-warning' :
                          'bg-destructive'
                        }`}
                        style={{ width: `${progressionPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  data-no-drag
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="h-6 w-6 p-0 shrink-0 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  title={isExpanded ? 'Collapse details' : 'Expand details'}
                >
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-3 space-y-3">
          {/* Always visible - Primary action */}
          <Button
            variant="outline"
            size="sm"
            data-no-drag
            onPointerDown={(event) => event.stopPropagation()}
            className="w-full h-8 text-xs justify-center font-medium"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/admissions/applications/${app.application_id}`);
            }}
          >
            <Eye className="mr-1.5 h-3 w-3" /> View Details
          </Button>

          {/* Expanded section - Toggle with chevron */}
          {isExpanded && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
            {/* Action buttons - First thing in expanded section */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                data-no-drag
                onPointerDown={(event) => event.stopPropagation()}
                className="h-8 text-xs justify-center"
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
                className="h-8 text-xs justify-center"
                onClick={(event) => {
                  event.stopPropagation();
                  handlePhoneClick(app);
                }}
              >
                <Phone className="mr-1.5 h-3 w-3" /> Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-no-drag
                onPointerDown={(event) => event.stopPropagation()}
                className="h-8 text-xs justify-center col-span-2"
                onClick={(event) => {
                  event.stopPropagation();
                  handleMeetingClick(app);
                }}
              >
                <CalIcon className="mr-1.5 h-3 w-3" /> Schedule Meeting
              </Button>
            </div>

            {/* Blockers - in expanded view */}
            {app.progression_blockers && app.progression_blockers.length > 0 && (() => {
              const hasCritical = app.progression_blockers.some(b => b.severity === 'critical');
              const hasHigh = app.progression_blockers.some(b => b.severity === 'high');

              // Critical = red, High = amber, Otherwise = blue info
              const style = hasCritical
                ? { border: 'border-destructive/30', bg: 'bg-destructive/10', icon: 'text-destructive', text: 'text-destructive' }
                : hasHigh
                ? { border: 'border-warning/30', bg: 'bg-warning/10', icon: 'text-warning', text: 'text-warning' }
                : { border: 'border-blue-200/60', bg: 'bg-blue-50/50', icon: 'text-blue-600', text: 'text-blue-700' };

              return (
                <div className={`rounded-lg border ${style.border} ${style.bg} p-2.5`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className={`h-3.5 w-3.5 ${style.icon}`} />
                    <span className={`text-xs font-semibold ${style.text}`}>
                      {app.progression_blockers.length} Blocker{app.progression_blockers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 space-y-0.5">
                    {app.progression_blockers.slice(0, 2).map((blocker, idx) => (
                      <div key={idx}>• {blocker.item}</div>
                    ))}
                    {app.progression_blockers.length > 2 && (
                      <div className="text-slate-500 mt-1">+{app.progression_blockers.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Delivery modes & patterns (aggregate) */}
            {agg && (agg.modes.length > 0 || agg.patterns.length > 0) && (
              <div className="flex flex-wrap gap-1">
                {agg.modes.slice(0,2).map(m => (
                  <Badge key={m} variant="secondary" className="h-5 text-[10px] capitalize">{m}</Badge>
                ))}
                {agg.patterns.slice(0,2).map(s => (
                  <Badge key={s} variant="secondary" className="h-5 text-[10px] capitalize">{s.replace('_',' ')}</Badge>
                ))}
              </div>
            )}

            {/* Card-level quick filter chips */}
            <div className="flex flex-wrap gap-1">
              {!!app.source && (
                <Badge
                  variant="secondary"
                  className="h-5 text-[10px] capitalize cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setSourceFilter(app.source!); }}
                  title={`Filter by source: ${app.source}`}
                >
                  {app.source}
                </Badge>
              )}
              {!!app.campus_name && (
                <Badge
                  variant="secondary"
                  className="h-5 text-[10px] cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setCampusFilter(app.campus_name!); }}
                  title={`Filter by campus: ${app.campus_name}`}
                >
                  {app.campus_name}
                </Badge>
              )}
              {!!app.cycle_label && (
                <Badge
                  variant="secondary"
                  className="h-5 text-[10px] cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setCycleFilter(app.cycle_label!); }}
                  title={`Filter by cycle: ${app.cycle_label}`}
                >
                  {app.cycle_label}
                </Badge>
              )}
              {!!app.priority && (
                <Badge
                  variant="secondary"
                  className={`h-5 text-[10px] cursor-pointer ${getPriorityColor(String(app.priority).toLowerCase())}`}
                  onClick={(e) => { e.stopPropagation(); setPriority(String(app.priority).toLowerCase()); }}
                  title={`Filter by priority: ${String(app.priority).toLowerCase()}`}
                >
                  {String(app.priority).toLowerCase()}
                </Badge>
              )}
              {!!app.urgency && (
                <Badge
                  variant="secondary"
                  className="h-5 text-[10px] cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setUrgency(String(app.urgency).toLowerCase()); }}
                  title={`Filter by urgency: ${String(app.urgency).toLowerCase()}`}
                >
                  {String(app.urgency).toLowerCase()}
                </Badge>
              )}
            </div>

            {/* Secondary metrics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Program</span>
                <span className="font-medium text-slate-700 text-right leading-tight max-w-[65%] truncate">{displayData.program}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Lead Score</span>
                <span className="font-medium text-slate-700">{displayData.leadScore}</span>
              </div>
              {app.enrollment_probability && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Enrollment</span>
                  <ProgressionIndicator probability={app.enrollment_probability} />
                </div>
              )}
            </div>

            {/* Recommended actions & activity */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="space-y-2">
                <div className="text-xs text-slate-500">
                  <span className="font-medium">Recommended:</span>
                </div>
                {Array.isArray(app.recommended_actions) && app.recommended_actions.length > 0 ? (
                  <ul className="space-y-1 text-xs text-slate-600">
                    {app.recommended_actions.slice(0, 2).map((action, idx) => (
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
            </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };


  // Aggregated card: one per applicant, listing their applications

  if (loading || stagesLoading) {
    return (
      <div className="px-4 sm:px-6 py-6 bg-slate-50/50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-slate-500">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error || stagesError) {
    return (
      <div className="px-4 sm:px-6 py-6 bg-slate-50/50 min-h-screen flex items-center justify-center">
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
    <div className="px-4 sm:px-5 lg:px-6 py-4 bg-gradient-to-br from-background via-background to-muted/30 min-h-screen">
      {/* Sticky Glass Header */}
      <div className="relative bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border border-border/40 sticky top-3 z-40 shadow-lg overflow-hidden rounded-3xl mb-4 mx-auto max-w-[min(1720px,calc(100%-16px))]">
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-20 h-64 w-64 rounded-full blur-3xl glow-white" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full blur-3xl glow-green" />
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground truncate">Admissions Pipeline</h1>
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
                  <DropdownMenuItem onClick={() => setRiskOnly(v => !v)}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        At-risk only
                      </div>
                      {riskOnly && <div className="w-2 h-2 rounded-full bg-destructive" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBlockersOnly(v => !v)}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Has blockers only
                      </div>
                      {blockersOnly && <div className="w-2 h-2 rounded-full bg-foreground" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowFilters(true)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Open filters…
                    {activeFilterCount > 0 && (
                      <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleRefreshInsights}
                    disabled={isRefreshingInsights || isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingInsights ? 'animate-spin' : ''}`} />
                    Refresh insights
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ApplicationIvyButton
                onOpenIvy={() => openIvy({
                  applications: filteredWithMulti,
                  selectedApplicationId: selectedApplicationId || undefined,
                  selectedApplications: selectedApps,
                  currentView: view,
                  filters: {
                    program,
                    urgency,
                    priority,
                    deliveryMode,
                    studyPattern,
                    multiOnly,
                    riskOnly,
                    blockersOnly,
                    source: sourceFilter,
                    campus: campusFilter,
                    cycle: cycleFilter
                  },
                  progressionStats,
                  hasPhoneNumber: selectedApps.length === 1 && selectedApps[0] ? 
                    (filteredWithMulti.find(app => app.application_id === selectedApps[0])?.phone ? true : false) : 
                    false,
                  // Application-specific actions
                  navigate,
                  setView: setView,
                  toggleFilters: () => setShowFilters(!showFilters),
                  toggleAiFocus: () => setAiFocus(!aiFocus),
                  openFilterModal: () => {
                    setShowFilters(true);
                    // Could focus on specific filter type
                  },
                  setFilter: (key: string, value: any) => {
                    switch(key) {
                      case 'program': setProgram(value); break;
                      case 'urgency': setUrgency(value); break;
                      case 'priority': setPriority(value); break;
                      case 'deliveryMode': setDeliveryMode(value); break;
                      case 'studyPattern': setStudyPattern(value); break;
                      case 'multiOnly': setMultiOnly(value); break;
                      case 'risk': setRiskOnly(value === 'high' || value === true); break;
                    }
                  },
                  showAnalytics: () => {
                    // Could open analytics panel or modal
                    console.log('Show analytics');
                  },
                  refreshInsights: handleRefreshInsights,
                  createApplication: () => {
                    // Navigate to create application page
                    navigate('/admissions/applications/new');
                  },
                  exportApplications: (ids: string[]) => {
                    // Export selected applications
                    console.log('Export applications:', ids);
                  },
                  openBulkActions: openBulkActions,
                  explainScore: (id: string) => {
                    // Show AI score explanation
                    console.log('Explain score for:', id);
                  },
                  getRecommendations: (id: string) => {
                    // Get AI recommendations
                    console.log('Get recommendations for:', id);
                  },
                  identifyBlockers: (id: string) => {
                    // Identify blockers
                    console.log('Identify blockers for:', id);
                  },
                  selectAll: () => {
                    setSelectedApps(tableRows.map(app => app.application_id));
                  },
                  clearSelection: () => setSelectedApps([]),
                  refreshData: refreshBoard,
                  // Modal openers
                  openEmailComposer: () => {
                    if (selectedApps.length === 1) {
                      const app = filteredWithMulti.find(app => app.application_id === selectedApps[0]);
                      if (app) handleEmailClick(app);
                    }
                  },
                  openCallConsole: () => {
                    if (selectedApps.length === 1) {
                      const app = filteredWithMulti.find(app => app.application_id === selectedApps[0]);
                      if (app) handlePhoneClick(app);
                    }
                  },
                  openMeetingBooker: () => {
                    if (selectedApps.length === 1) {
                      const app = filteredWithMulti.find(app => app.application_id === selectedApps[0]);
                      if (app) handleMeetingClick(app);
                    }
                  }
                })}
                context={{
                  applications: filteredWithMulti,
                  selectedApplications: selectedApps,
                  progressionStats
                }}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="relative gap-2 h-9 px-4 text-sm font-medium text-white shadow-sm transition-all bg-[hsl(var(--brand-accent))] hover:bg-[hsl(var(--brand-accent))]/90">
                    <Workflow className="h-4 w-4" />
                    <span className="hidden sm:inline">Actions</span>
                    {ivySuggestions && ivySuggestions.applicationIds.length > 0 && (
                      <span className="absolute top-1/2 -translate-y-1/2 -right-10 flex items-center gap-1 text-xs font-medium">
                        <Flame className="h-4 w-4 text-white" />
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-white/90 shadow" />
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {ivySuggestions && ivySuggestions.applicationIds.length > 0 && (
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setTriageModalOpen(true);
                      }}
                      className="text-foreground"
                    >
                      <Flame className="mr-2 h-4 w-4" />
                      {ivySuggestions.applicationIds.length} Ivy suggestion{ivySuggestions.applicationIds.length > 1 ? 's' : ''}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/admissions/applications/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Application
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setTriageModalOpen(true);
                  }}>
                    <Target className="mr-2 h-4 w-4" />
                    Top Daily Actions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleNextBestAction}>
                    <Zap className="mr-2 h-4 w-4" />
                    Next Best Action
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleViewBlockers}>
                    <Flag className="mr-2 h-4 w-4" />
                    View Blockers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDailyReport}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Generate Daily Report
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleFocusMode}>
                    <Focus className="mr-2 h-4 w-4" />
                    Open Focus Mode
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>
        </div>
      </div>

      <Sheet open={showFilters} onOpenChange={setShowFilters}>
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
            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">Source</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full border-slate-200">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {uniqueSources.map(src => (
                    <SelectItem key={src} value={src}>{src}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">Campus</label>
              <Select value={campusFilter} onValueChange={setCampusFilter}>
                <SelectTrigger className="w-full border-slate-200">
                  <SelectValue placeholder="Campus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {uniqueCampuses.map(campus => (
                    <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs text-muted-foreground">Cycle</label>
              <Select value={cycleFilter} onValueChange={setCycleFilter}>
                <SelectTrigger className="w-full border-slate-200">
                  <SelectValue placeholder="Cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cycles</SelectItem>
                  {uniqueCycles.map(cycle => (
                    <SelectItem key={cycle} value={cycle}>{cycle}</SelectItem>
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
            <div className="flex items-center gap-2 text-sm px-2 py-1 rounded-md border border-slate-200 bg-white">
              <Checkbox checked={riskOnly} onCheckedChange={(v) => setRiskOnly(v === true)} id="riskOnlySheet" />
              <label htmlFor="riskOnlySheet" className="text-slate-600">At-risk only (≤ 35%)</label>
            </div>
            <div className="flex items-center gap-2 text-sm px-2 py-1 rounded-md border border-slate-200 bg-white">
              <Checkbox checked={blockersOnly} onCheckedChange={(v) => setBlockersOnly(v === true)} id="blockersOnlySheet" />
              <label htmlFor="blockersOnlySheet" className="text-slate-600">Has blockers only</label>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={clearAllFilters}>Clear all</Button>
            <Button onClick={() => setShowFilters(false)}>Apply</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

        {/* Board Filter Bar */}
        {view === 'board' && (
          <div className="px-4 sm:px-5 lg:px-6 mb-3">
            <div className="rounded-xl border border-border/40 bg-white/80 backdrop-blur px-3 py-2 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.25)]">
              <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
                {/* Program */}
                <div className="shrink-0">
                  <Select value={program} onValueChange={setProgram}>
                    <SelectTrigger className="h-8 text-sm border-slate-200 min-w-[12rem]" aria-label="Filter by program">
                      <SelectValue placeholder="Program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Programs</SelectItem>
                      {uniqueProgrammes.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mode of study */}
                <div className="shrink-0">
                  <Select value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as any)}>
                    <SelectTrigger className="h-8 text-sm border-slate-200 min-w-[10rem]" aria-label="Filter by delivery mode">
                      <SelectValue placeholder="Mode of study" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modes</SelectItem>
                      <SelectItem value="onsite">Onsite</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Study pattern */}
                <div className="shrink-0">
                  <Select value={studyPattern} onValueChange={(v) => setStudyPattern(v as any)}>
                    <SelectTrigger className="h-8 text-sm border-slate-200 min-w-[10rem]" aria-label="Filter by study pattern">
                      <SelectValue placeholder="Study pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Patterns</SelectItem>
                      <SelectItem value="full_time">Full-time</SelectItem>
                      <SelectItem value="part_time">Part-time</SelectItem>
                      <SelectItem value="accelerated">Accelerated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Year/Cycle */}
                <div className="shrink-0">
                  <Select value={cycleFilter} onValueChange={setCycleFilter}>
                    <SelectTrigger className="h-8 text-sm border-slate-200 min-w-[10rem]" aria-label="Filter by cycle">
                      <SelectValue placeholder="Cycle / Start" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cycles</SelectItem>
                      {uniqueCycles.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Optional: Campus */}
                <div className="hidden lg:block shrink-0">
                  <Select value={campusFilter} onValueChange={setCampusFilter}>
                    <SelectTrigger className="h-8 text-sm border-slate-200 min-w-[10rem]" aria-label="Filter by campus">
                      <SelectValue placeholder="Campus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campuses</SelectItem>
                      {uniqueCampuses.map((campus) => (
                        <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Optional: Source */}
                <div className="hidden lg:block shrink-0">
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-8 text-sm border-slate-200 min-w-[10rem]" aria-label="Filter by source">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {uniqueSources.map((src) => (
                        <SelectItem key={src} value={src}>{src}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reset */}
                <div className="shrink-0 ml-auto">
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-600" onClick={clearAllFilters} title="Reset filters">
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Applied Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="px-4 sm:px-5 lg:px-6 mb-4">
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
              {sourceFilter !== 'all' && (
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">
                  Source: <span className="ml-1 font-medium capitalize">{sourceFilter}</span>
                  <button className="ml-2" onClick={() => setSourceFilter('all')} aria-label="Clear source">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {campusFilter !== 'all' && (
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">
                  Campus: <span className="ml-1 font-medium">{campusFilter}</span>
                  <button className="ml-2" onClick={() => setCampusFilter('all')} aria-label="Clear campus">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {cycleFilter !== 'all' && (
                <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">
                  Cycle: <span className="ml-1 font-medium">{cycleFilter}</span>
                  <button className="ml-2" onClick={() => setCycleFilter('all')} aria-label="Clear cycle">
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
              {/* Note: riskOnly and blockersOnly filter states are controlled via KPI tiles; chips omitted intentionally */}
              {/* Clear-all moved into KPI strip */}
        </div>
          </div>
        )}

        {/* Pipeline Progression Insights */}
        <div className="px-4 sm:px-5 lg:px-6">
          <div className="relative mb-6 overflow-hidden rounded-2xl border border-border/20 bg-card/40 backdrop-blur">
            {/* Inline toggle aligned top-right inside container */}
            {showInsights ? (
              <div className="absolute right-3 top-2 z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 rounded-full border border-white/50 bg-white/40 px-3 text-xs text-slate-600 backdrop-blur-md transition hover:border-white/70 hover:bg-white/60 hover:text-slate-700"
                  onClick={() => setShowInsights(false)}
                  aria-pressed
                  aria-label="Hide pipeline insights"
                >
                  Hide
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="absolute right-3 top-2 z-10">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 rounded-full border border-white/50 bg-white/40 px-3 text-xs text-slate-600 backdrop-blur-md transition hover:border-white/70 hover:bg-white/60 hover:text-slate-700"
                  onClick={() => setShowInsights(true)}
                  aria-label="Show pipeline insights"
                >
                  Show
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {showInsights ? (
              <>
              <div className="grid grid-cols-1 gap-3 px-4 pb-2 pt-8 sm:grid-cols-2 xl:grid-cols-4">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="flex items-center gap-3 rounded-xl border border-border/30 bg-white/85 px-4 py-3 shadow-[0_12px_40px_-26px_rgba(15,23,42,0.35)] cursor-pointer hover:bg-white transition-colors"
                        role="button"
                        onClick={() => clearAllFilters()}
                        aria-label="Clear all filters"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/40 text-muted-foreground">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Active Applications</div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-semibold tabular-nums text-foreground">{progressionStats.total}</span>
                            <span className="text-xs text-muted-foreground">
                              {progressionStats.highConfidence} ≥70%
                            </span>
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8} className="text-xs">Clear all filters</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="flex items-center gap-3 rounded-xl border border-success/10 bg-white/85 px-4 py-3 shadow-[0_12px_40px_-26px_hsl(var(--success)_/_0.35)] cursor-pointer hover:bg-white transition-colors"
                        role="button"
                        onClick={() => { setSortState({ column: 'conversion', direction: 'desc' }); }}
                        aria-label="Sort by conversion probability"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-success/40 text-success">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Avg Progression</div>
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-semibold tabular-nums text-success">{progressionStats.avgProgression}%</span>
                            <div className="h-2 flex-1 rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-success transition-all"
                                style={{ width: `${Math.max(0, Math.min(100, progressionStats.avgProgression))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8} className="text-xs">Sorts by probability in table view</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="flex items-center gap-3 rounded-xl border border-destructive/10 bg-white/85 px-4 py-3 shadow-[0_12px_40px_-26px_hsl(var(--destructive)_/_0.35)] cursor-pointer hover:bg-white transition-colors"
                        role="button"
                        onClick={() => setRiskOnly(true)}
                        aria-label="Filter to at-risk only"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-destructive/40 text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">At-Risk Applicants</div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-semibold tabular-nums text-destructive">{progressionStats.highRisk}</span>
                            <span className="text-xs text-muted-foreground">
                              {progressionStats.total > 0
                                ? `${Math.round((progressionStats.highRisk / progressionStats.total) * 100)}% of pipeline`
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8} className="text-xs">Filters where probability ≤ 35%</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="flex items-center gap-3 rounded-xl border border-border/30 bg-white/85 px-4 py-3 shadow-[0_12px_40px_-26px_rgba(15,23,42,0.28)] cursor-pointer hover:bg-white transition-colors"
                        role="button"
                        onClick={() => setBlockersOnly(true)}
                        aria-label="Filter to applications with blockers"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/40 text-muted-foreground">
                          <Target className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Blockers Spotlight</div>
                          <div className="text-sm font-semibold text-foreground truncate">
                            {progressionStats.topBlocker ? progressionStats.topBlocker.item : 'No blockers flagged'}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {progressionStats.blockersApps > 0
                              ? `${progressionStats.blockersApps} apps • ${progressionStats.topBlocker?.count ?? 0} mentions`
                              : 'Pipeline clear'}
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8} className="text-xs">Filters to applications that have blockers</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {/* Inline controls inside expanded insights */}
              <div className="flex items-center justify-end gap-2 px-4 pb-3">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="border border-border/40 bg-white/80 text-slate-700 cursor-pointer"
                        onClick={clearAllFilters}
                        aria-label="Clear all filters"
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Clear
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} className="text-xs">Clear all filters</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              </>
            ) : (
              <div className="relative flex flex-wrap items-center gap-2 px-4 sm:px-5 py-2.5">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="bg-white/70 border-border/40 text-slate-700 cursor-pointer"
                      onClick={clearAllFilters}
                      aria-label="Clear all filters"
                    >
                      <Users className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                      {progressionStats.total} active
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6} className="text-xs">Clear all filters</TooltipContent>
                </Tooltip>
              </TooltipProvider>

                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="bg-white/70 border-border/40 text-success cursor-pointer"
                        onClick={() => { setSortState({ column: 'conversion', direction: 'desc' }); }}
                        aria-label="Sort by conversion probability"
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        {progressionStats.avgProgression}% avg
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} className="text-xs">Sorts by probability in table view</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="bg-white/70 border-border/40 text-destructive cursor-pointer"
                        onClick={() => setRiskOnly(true)}
                        aria-label="Filter to at-risk only"
                      >
                        <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                        {progressionStats.highRisk} at-risk
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} className="text-xs">Filters where probability ≤ 35%</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="bg-white/70 border-border/40 text-muted-foreground cursor-pointer"
                        onClick={() => setBlockersOnly(true)}
                        aria-label="Filter to applications with blockers"
                      >
                        <Target className="mr-1.5 h-3.5 w-3.5" />
                        {progressionStats.blockersApps} blockers
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} className="text-xs">Filters to applications that have blockers</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {/* Condensed strip keeps only a Clear control; At-risk/Blockers handled by KPI badges above */}
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="secondary"
                        className="bg-white/70 border-border/40 text-slate-700 cursor-pointer"
                        onClick={clearAllFilters}
                        aria-label="Clear all filters"
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Clear
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6} className="text-xs">Clear all filters</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
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
        <div className="px-4 sm:px-5 lg:px-6">
          <div className="bg-accent/3 border border-accent/10 rounded-lg p-3 mb-4">
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
            <div className="flex gap-6 px-4 sm:px-5">
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
                         : `w-[21rem] px-5 pb-6 rounded-2xl bg-white/80 backdrop-blur-lg border border-border/40 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.75)] min-h-screen`;
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
                                 className={`group/collapse relative flex w-full items-stretch justify-center rounded-2xl transition-colors ${toneVariant.collapsedShell} hover:brightness-[0.97]`}
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
                               <Card className={`mb-6 mt-3 border border-border/40 ${toneVariant.cardBorder || ''} ${toneVariant.cardBg} relative min-h-[96px] rounded-2xl shadow-sm hover:shadow-md transition-shadow`} >
                                 {/* Drop indicator */}
                                 {snapshot.isDraggingOver && (
                                   <div className={`pointer-events-none absolute inset-1 border border-dashed rounded-lg flex items-center justify-center z-20 transition-all duration-200 ease-out shadow ${toneVariant.dropBorder} ${toneVariant.dropBg}`}>
                                     <div className={`text-xs font-medium bg-white/95 px-2 py-1 rounded shadow-sm ${toneVariant.dropText}`}>
                                       Drop here
                                     </div>
                                   </div>
                                 )}
                                 <CardHeader className="px-5 pt-4 pb-2 pr-11">
                                   <TooltipProvider delayDuration={150}>
                                     <Tooltip>
                                       <TooltipTrigger asChild>
                                         <div className="flex items-center justify-between gap-3 cursor-help">
                                           <div className="flex items-center gap-2">
                                             <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${toneVariant.iconWrapper}`}>
                                               {config.icon}
                                             </span>
                                             <CardTitle className="text-sm font-semibold text-foreground leading-snug" title={config.name}>
                                               {config.name}
                                             </CardTitle>
                                           </div>
                                           <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium tabular-nums ${toneVariant.badge}`}>
                                             {columnItems.length}
                                           </span>
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
                                   className={`absolute right-4 top-4 h-7 w-7 rounded-full bg-white z-10 ${toneVariant.chevron}`}
                                   onClick={() => toggleStageCollapse(stage.id)}
                                   title={collapsedStages[stage.id] ? 'Expand cards' : 'Collapse cards'}
                                 >
                                   {collapsedStages[stage.id] ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                                 </Button>
                </Card>
                
                               <div
                                 className="transition-all duration-200 ease-out overflow-visible opacity-100 flex-1 min-h-0"
                               >
                                 <div className="space-y-4" ref={(el) => { if (el) columnRefs.current.set(stage.id, el); }}>
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
        <Card className="overflow-hidden border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/5 px-4 py-2">
            <div className="text-xs text-muted-foreground">
              {tableRows.length} of {filteredWithMulti.length} applications visible
              {activeColumnFilterCount > 0 && (
                <span className="ml-1">• {activeColumnFilterCount} column filter{activeColumnFilterCount > 1 ? "s" : ""}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeColumnFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={clearColumnFilters}
                >
                  Clear column filters
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={handleSaveDefaultLayout}
              >
                Save as default layout
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={handleResetLayout}
              >
                Reset layout
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
                    <List className="h-3.5 w-3.5" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Manage columns
                  </div>
                  <DropdownMenuSeparator />
                  <div className="max-h-72 overflow-y-auto">
                    {orderedColumnDefinitions.map((column, index) => {
                      const isVisible = isColumnVisible(column.id);
                      const isLocked = lockedColumnIds.has(column.id);
                      return (
                        <DropdownMenuItem
                          key={column.id}
                          onSelect={(event) => event.preventDefault()}
                          className="focus:bg-muted/60 p-0"
                        >
                          <div className="flex w-full items-center justify-between gap-3 px-2 py-1.5">
                            <label className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                              <Checkbox
                                checked={isVisible}
                                onCheckedChange={() => column.id && handleToggleColumnVisibility(column.id)}
                                disabled={isLocked}
                              />
                              <span>{column.label}</span>
                            </label>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  moveColumn(column.id, "up");
                                }}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  moveColumn(column.id, "down");
                                }}
                                disabled={index === orderedColumnDefinitions.length - 1}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {activeColumnFilterEntries.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/20 px-4 py-2">
              {activeColumnFilterEntries.map(([columnId, value]) => {
                const key = columnId as TableColumnKey;
                const displayLabel = columnLabelMap.get(key) ?? key;
                const displayValue = getFilterDisplayValue(key, value as string);
                return (
                  <Badge
                    key={`${key}-${displayValue}`}
                    variant="secondary"
                    className="flex items-center gap-1 bg-white text-xs text-slate-700"
                  >
                    <span className="font-medium text-foreground">{displayLabel}:</span>
                    <span className="text-foreground/80">{displayValue}</span>
                    <button
                      type="button"
                      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted"
                      onClick={() => handleClearColumnFilter(key)}
                      aria-label={`Clear ${displayLabel} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table
                ref={tableRef}
                className={`relative min-w-full text-sm ${resizingColumnId ? "cursor-col-resize select-none" : ""}`}
              >
                <colgroup>
                  <col style={{ width: 48 }} />
                  {visibleColumns.map((column) => {
                    const widthValue =
                      columnWidths[column.id] ??
                      column.minWidth ??
                      DEFAULT_COLUMN_WIDTHS[column.id] ??
                      160;
                    const minWidth =
                      column.minWidth ?? DEFAULT_COLUMN_WIDTHS[column.id] ?? 160;
                    return (
                      <col
                        key={`col-${column.id}`}
                        style={{ width: widthValue, minWidth }}
                      />
                    );
                  })}
                  <col style={{ width: 152, minWidth: 128 }} />
                </colgroup>
                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground">
                  <tr>
                    <th className="sticky top-0 z-10 px-4 py-3 text-left align-middle">
                      <Checkbox
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setSelectedApps((prev) => {
                              const next = new Set(prev);
                              tableRows.forEach((app) => next.add(app.application_id));
                              return Array.from(next);
                            });
                          } else {
                            setSelectedApps((prev) =>
                              prev.filter((id) => !tableRows.some((app) => app.application_id === id))
                            );
                          }
                        }}
                        checked={
                          tableRows.length > 0 &&
                          tableRows.every((app) => selectedApps.includes(app.application_id))
                        }
                        aria-label="Select all visible applications"
                      />
                    </th>
                    {visibleColumns.map((column) => {
                      const alignClass =
                        column.align === "right"
                          ? "text-right"
                          : column.align === "center"
                            ? "text-center"
                            : "text-left";
                      const justifyClass =
                        column.align === "right"
                          ? "justify-end"
                          : column.align === "center"
                            ? "justify-center"
                            : "justify-start";
                      return (
                        <th
                          key={column.id}
                          className={`sticky top-0 z-10 px-4 py-3 text-xs font-semibold uppercase tracking-wide ${alignClass} relative`}
                        >
                          <button
                            type="button"
                            className={`relative inline-flex w-full items-center gap-2 ${justifyClass} pr-4 ${column.sortable ? "hover:text-foreground transition-colors" : ""}`}
                            onClick={() => column.sortable && handleSort(column.id)}
                          >
                            <span>{column.label}</span>
                            {column.sortable && (
                              sortState.column === column.id ? (
                                sortState.direction === "asc" ? (
                                  <ArrowUp className="h-3 w-3" />
                                ) : (
                                  <ArrowDown className="h-3 w-3" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-50" />
                              )
                            )}
                          </button>
                          <div
                            className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none"
                            onPointerDown={(event) => handleColumnResizeStart(event, column.id)}
                            aria-hidden="true"
                          >
                            <span
                              className={`absolute right-0 top-0 h-full w-[3px] rounded-full transition-colors ${resizingColumnId === column.id ? "bg-border/80" : "bg-transparent hover:bg-border/80"}`}
                            />
                          </div>
                        </th>
                      );
                    })}
                    <th className="sticky top-0 z-10 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                  <tr className="bg-background/90 border-b border-border/50 text-xs text-muted-foreground">
                    <th className="px-4 py-2"></th>
                    {visibleColumns.map((column) => {
                      const alignClass =
                        column.align === "right"
                          ? "text-right"
                          : column.align === "center"
                            ? "text-center"
                            : "text-left";

                      if (!column.filter) {
                        return (
                          <th
                            key={`${column.id}-filter`}
                            className={`px-4 py-2 ${alignClass}`}
                          />
                        );
                      }

                      if (column.filter.type === "select") {
                        return (
                          <th
                            key={`${column.id}-filter`}
                            className={`px-4 py-2 ${alignClass}`}
                          >
                            <Select
                              value={columnFilters[column.id] ?? "all"}
                              onValueChange={(value) => updateColumnFilter(column.id, value)}
                            >
                              <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder={column.filter.placeholder || "All"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {(column.filter.options || []).map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </th>
                        );
                      }

                      return (
                        <th
                          key={`${column.id}-filter`}
                          className={`px-4 py-2 ${alignClass}`}
                        >
                          <Input
                            value={columnFilters[column.id] ?? ""}
                            onChange={(event) => updateColumnFilter(column.id, event.target.value)}
                            placeholder={column.filter.placeholder}
                            className="h-8 text-xs"
                          />
                        </th>
                      );
                    })}
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={visibleColumns.length + 2}
                        className="px-4 py-6 text-center text-sm text-muted-foreground"
                      >
                        {activeColumnFilterCount > 0
                          ? "No applications match the current column filters."
                          : "No applications to display."}
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((app) => {
                      const displayData = getApplicationCardDisplay(app);
                      const rowSelected = selectedApps.includes(app.application_id);
                      return (
                        <tr
                          key={app.application_id}
                          className="border-b border-border/60 bg-background hover:bg-muted/40 transition-colors"
                        >
                          <td className="px-4 py-3 align-middle">
                            <Checkbox
                              checked={rowSelected}
                              onCheckedChange={() => toggleSelection(app.application_id)}
                              aria-label={`Select ${displayData.studentName}`}
                            />
                          </td>
                          {visibleColumns.map((column) => {
                            const alignClass =
                              column.align === "right"
                                ? "text-right"
                                : column.align === "center"
                                  ? "text-center"
                                  : "text-left";
                            return (
                              <td
                                key={`${app.application_id}-${column.id}`}
                                className={`px-4 py-3 align-middle ${alignClass}`}
                              >
                                {column.renderCell(app)}
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 align-middle text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handlePhoneClick(app);
                                }}
                              >
                                <Phone className="mr-1 h-3.5 w-3.5" />
                                Call
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleEmailClick(app);
                                }}
                              >
                                <Mail className="mr-1 h-3.5 w-3.5" />
                                Email
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <MoreHorizontal className="mr-1 h-3.5 w-3.5" />
                                    More
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      navigate(`/admissions/applications/${app.application_id}`);
                                    }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleMeetingClick(app);
                                    }}
                                  >
                                    <CalIcon className="mr-2 h-4 w-4" />
                                    Schedule meeting
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      // Placeholder for edit action
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit application
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
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

      {/* Triage Modal */}
        <TriageModal
          isOpen={triageModalOpen}
          suggestedApplicationIds={ivySuggestions?.applicationIds}
          onClose={() => setTriageModalOpen(false)}
          onActionExecuted={(applicationId) => {
            console.log('Action executed for application:', applicationId);
          }}
        />
    </div>
  );
}
