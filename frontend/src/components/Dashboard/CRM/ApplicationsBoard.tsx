import * as React from "react";
import {
  Search, Grid, List, Plus, Mail, Calendar as CalIcon,
  Phone, MoreHorizontal, Eye, Edit, Filter, TrendingUp,
  Clock, AlertTriangle, CheckCircle, XCircle, Star,
  Users, Target, BarChart3, Zap, ArrowRight, FilterX,
  RefreshCw, BookmarkPlus
} from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

// Custom hooks and utilities
import { useApplicationsQuery } from "@/hooks/useApplicationsQuery";
import { useStages } from "@/hooks/useStages";
import { getApplicationCardDisplay, getPriorityColor, getUrgencyColor, mapStageToDisplay } from "@/utils/dataMapping";
import { ApplicationDetailsDrawer } from "./ApplicationDetailsDrawer";
import { BulkActionsModal } from "./BulkActionsModal";
import MeetingBooker from "@/components/MeetingBooker";
import EmailComposer, { type Lead as EmailComposerLead } from "@/components/EmailComposer";
import CallConsole, { type Lead as CallConsoleLead } from "@/components/CallConsole";

// Frontend stage IDs for the Kanban board
type StageId = 'enquiry' | 'applicant' | 'interview' | 'offer' | 'enrolled';

// Stage configuration with UI properties
const getStageConfig = (stageId: string) => {
  const configs: Record<string, { 
    name: string; 
    description: string;
    color: string;
    icon: React.ReactNode;
  }> = {
    'enquiry': { 
      name: "Enquiry", 
      description: "Initial enquiries received",
      color: "bg-slate-100 border-slate-200",
      icon: <Users className="h-4 w-4" />
    },
    'applicant': { 
      name: "Application Submitted", 
      description: "Applications under review",
      color: "bg-slate-100 border-slate-200",
      icon: <Eye className="h-4 w-4" />
    },
    'interview': { 
      name: "Interview", 
      description: "Interview process",
      color: "bg-warning/10 border-warning/20",
      icon: <CalIcon className="h-4 w-4" />
    },
    'offer': { 
      name: "Offer Made", 
      description: "Offers pending response",
      color: "bg-success/10 border-success/20",
      icon: <Star className="h-4 w-4" />
    },
    'enrolled': { 
      name: "Enrolled", 
      description: "Students enrolled",
      color: "bg-forest-green/10 border-forest-green/20",
      icon: <Target className="h-4 w-4" />
    },
  };
  
  return configs[stageId] || {
    name: stageId,
    description: "Unknown stage",
    color: "bg-slate-100 border-slate-200",
    icon: <Users className="h-4 w-4" />
  };
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

function UrgencyBadge({ urgency }: { urgency: string }) {
  const colorClasses = getUrgencyColor(urgency);
  
  return (
    <Badge variant="outline" className={`${colorClasses} text-xs font-medium`}>
      {urgency === "high" && <Clock className="h-3 w-3 mr-1" />}
      {urgency}
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
  const [view, setView] = React.useState<"board" | "table">("board");
  const [search, setSearch] = React.useState("");
  const [program, setProgram] = React.useState<string>("all");
  const [urgency, setUrgency] = React.useState<string>("all");
  const [priority, setPriority] = React.useState<string>("all");
  const [deliveryMode, setDeliveryMode] = React.useState<'all' | 'online' | 'onsite' | 'hybrid'>('all');
  const [studyPattern, setStudyPattern] = React.useState<'all' | 'full_time' | 'part_time' | 'accelerated'>('all');
  const [multiOnly, setMultiOnly] = React.useState<boolean>(false);
  const [selectedApps, setSelectedApps] = React.useState<string[]>([]);
  const [showFilters, setShowFilters] = React.useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = React.useState<string | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = React.useState(false);
  const [showBulkActions, setShowBulkActions] = React.useState(false);
  const [draggedApplicationId, setDraggedApplicationId] = React.useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = React.useState<string | null>(null);
  const boardScrollRef = React.useRef<HTMLDivElement | null>(null);
  const columnRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const [placeholder, setPlaceholder] = React.useState<{ stageId: string; index: number } | null>(null);
  const [isMeetingBookerOpen, setIsMeetingBookerOpen] = React.useState(false);
  const [selectedApplicationForMeeting, setSelectedApplicationForMeeting] = React.useState<typeof applications[0] | null>(null);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = React.useState(false);
  const [selectedApplicationForEmail, setSelectedApplicationForEmail] = React.useState<typeof applications[0] | null>(null);
  const [isCallConsoleOpen, setIsCallConsoleOpen] = React.useState(false);
  const [selectedApplicationForCall, setSelectedApplicationForCall] = React.useState<typeof applications[0] | null>(null);

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
    if (!applications) return [];
    return applications.filter(app => {
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
    return filtered.filter(app => (personAppCounts.get(String(app.person_id)) || 0) > 1);
  }, [filtered, multiOnly, personAppCounts]);

  // Group applications by stage for Kanban columns
  const grouped = React.useMemo(() => {
    const g: Record<string, typeof applications> = {};
    
    // Initialize with all available stages
    stages.forEach(stage => {
      g[stage.id] = [];
    });
    
    filteredWithMulti.forEach(app => {
      const stage = app.stage;
      if (g[stage]) {
        g[stage].push(app);
      }
    });
    
    return g;
  }, [filteredWithMulti, stages]);

  // Aggregation: single card per applicant (choose primary stage)
  const stageOrder: StageId[] = ['enquiry','applicant','interview','offer','enrolled'];
  const stageRank = (s: string) => Math.max(0, stageOrder.findIndex(x => x === (s as StageId)));
  // Aggregate info per person (counts + modes/patterns)
  const personAggregates = React.useMemo(() => {
    const map = new Map<string, { count: number; modes: string[]; patterns: string[]; apps: typeof applications }>();
    const temp: Record<string, { count: number; modes: Set<string>; patterns: Set<string>; apps: typeof applications }> = {} as any;
    filtered.forEach(app => {
      const pid = String(app.person_id);
      if (!temp[pid]) temp[pid] = { count: 0, modes: new Set<string>(), patterns: new Set<string>(), apps: [] as any };
      temp[pid].count += 1;
      temp[pid].modes.add(deriveDeliveryMode(app));
      temp[pid].patterns.add(deriveStudyPattern(app));
      (temp[pid].apps as any[]).push(app);
    });
    Object.entries(temp).forEach(([pid, v]) => {
      map.set(pid, { count: v.count, modes: Array.from(v.modes).filter(x => x !== 'unknown'), patterns: Array.from(v.patterns).filter(x => x !== 'unknown'), apps: v.apps });
    });
    return map;
  }, [filtered, deriveDeliveryMode, deriveStudyPattern]);

  // Calculate pipeline statistics
  const pipelineStats = React.useMemo(() => {
    const total = filtered.length;
    const critical = filtered.filter(a => a.priority === "critical").length;
    const highUrgency = filtered.filter(a => a.urgency === "high").length;
    const avgConversion = total > 0 ? Math.round(
      filtered.reduce((sum, a) => sum + (a.conversion_probability || 0), 0) / total * 100
    ) : 0;
    
    return { total, critical, highUrgency, avgConversion };
  }, [filtered]);

  // Get unique programmes for filter dropdown
  const uniqueProgrammes = React.useMemo(() => {
    if (!applications) return [];
    return [...new Set(applications.map(app => app.programme_name))];
  }, [applications]);

  // Handle drag and drop for stage changes
  const onDragStart = (e: React.DragEvent, applicationId: string) => {
    try {
      setDraggedApplicationId(applicationId);
      e.dataTransfer.setData("text/plain", applicationId);
      e.dataTransfer.effectAllowed = "move";
      // Custom lightweight drag image for smoother motion
      const src = e.currentTarget as HTMLElement;
      const rect = src.getBoundingClientRect();
      const ghost = document.createElement('div');
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.borderRadius = '12px';
      ghost.style.background = 'white';
      ghost.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
      ghost.style.opacity = '0.9';
      ghost.style.position = 'fixed';
      ghost.style.top = '-1000px'; // off-screen
      ghost.style.left = '-1000px';
      ghost.style.pointerEvents = 'none';
      document.body.appendChild(ghost);
      // center the drag image under cursor
      e.dataTransfer.setDragImage(ghost, rect.width / 2, rect.height / 2);
      // Clean up right after the drag starts
      setTimeout(() => {
        try { document.body.removeChild(ghost); } catch {}
      }, 0);
    } catch (err) {
      // Fallback to default drag image
      console.warn('Drag image setup failed:', err);
    }
  };

  const onDragEnd = () => {
    setDraggedApplicationId(null);
    setDragOverStage(null);
    setPlaceholder(null);
  };

  const onDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageId);
  };

  const onDragLeave = () => {
    setDragOverStage(null);
    setPlaceholder(null);
  };

  // Smooth horizontal auto-scroll when dragging near edges
  const handleBoardDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!boardScrollRef.current) return;
    const el = boardScrollRef.current;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const edge = 80; // px
    const speed = 16; // px per event
    if (x < edge) {
      el.scrollLeft -= speed;
    } else if (x > rect.width - edge) {
      el.scrollLeft += speed;
    }
  };

  const onDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    setDraggedApplicationId(null);
    setPlaceholder(null);
    
    const applicationId = e.dataTransfer.getData("text/plain");
    console.log('Drop event - Application:', applicationId, 'Target stage:', targetStage);
    
    if (!applicationId) {
      console.error('No application ID found in drop data');
      return;
    }
    
    const success = await moveStage(applicationId, {
      to_stage: targetStage,
      note: `Moved to ${targetStage} via drag and drop`,
    });
    
    if (!success) {
      console.error('Failed to move application to', targetStage);
    } else {
      console.log('Successfully moved application to', targetStage);
    }
  };

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

  const openMeetingBooker = (application: typeof applications[0]) => {
    setSelectedApplicationForMeeting(application);
    setIsMeetingBookerOpen(true);
  };

  const closeMeetingBooker = () => {
    setIsMeetingBookerOpen(false);
    setSelectedApplicationForMeeting(null);
  };

  const handleMeetingBooked = (meetingData: any) => {
    console.log('Meeting booked:', meetingData);
    // You could add a toast notification here
    closeMeetingBooker();
  };

  // Convert application to Lead format for MeetingBooker
  const convertApplicationToLead = React.useMemo(() => {
    if (!selectedApplicationForMeeting) return null;
    
    return {
      id: parseInt(selectedApplicationForMeeting.application_id) || 0,
      uid: selectedApplicationForMeeting.application_id,
      name: `${selectedApplicationForMeeting.first_name || ''} ${selectedApplicationForMeeting.last_name || ''}`.trim(),
      email: selectedApplicationForMeeting.email || '',
      phone: selectedApplicationForMeeting.phone || '',
      courseInterest: selectedApplicationForMeeting.programme_name || '',
      academicYear: selectedApplicationForMeeting.cycle_label || '',
      campusPreference: selectedApplicationForMeeting.campus_name || '',
      enquiryType: selectedApplicationForMeeting.source || '',
      leadSource: selectedApplicationForMeeting.source || '',
      status: selectedApplicationForMeeting.stage || '',
      statusType: selectedApplicationForMeeting.stage as any || 'new',
      leadScore: selectedApplicationForMeeting.lead_score || 0,
      createdDate: selectedApplicationForMeeting.created_at || '',
      lastContact: selectedApplicationForMeeting.last_activity_at || '',
      nextAction: 'Follow up', // Default since this field doesn't exist in ApplicationCard
      slaStatus: selectedApplicationForMeeting.urgency === 'high' ? 'urgent' as const : 'within_sla' as const,
      contactAttempts: 0,
      tags: [],
      aiInsights: {
        conversionProbability: selectedApplicationForMeeting.conversion_probability || 0,
        bestContactTime: '9:00 AM',
        recommendedAction: 'Follow up', // Default since this field doesn't exist in ApplicationCard
        urgency: selectedApplicationForMeeting.urgency as any || 'medium'
      }
    };
  }, [selectedApplicationForMeeting]);

  // Reusable mapper for EmailComposer/CallConsole
  const mapAppToLead = React.useCallback((app: any): EmailComposerLead & CallConsoleLead => ({
    id: parseInt(app.application_id) || 0,
    uid: app.application_id,
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
      urgency: (app.urgency as any) || 'medium'
    }
  }), []);

  const emailLead = React.useMemo<EmailComposerLead | null>(() => (
    selectedApplicationForEmail ? mapAppToLead(selectedApplicationForEmail) : null
  ), [selectedApplicationForEmail, mapAppToLead]);

  const callLead = React.useMemo<CallConsoleLead | null>(() => (
    selectedApplicationForCall ? mapAppToLead(selectedApplicationForCall) : null
  ), [selectedApplicationForCall, mapAppToLead]);

  const ApplicationCard = ({ app, agg }: { app: typeof applications[0]; agg?: { count: number; modes: string[]; patterns: string[]; apps: typeof applications } }) => {
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
    
    return (
      <Card 
        draggable 
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          const noDrag = target.closest('[data-no-drag]');
          (e.currentTarget as HTMLElement).draggable = !noDrag;
        }}
        onDragStart={(e) => onDragStart(e, app.application_id)}
        onDragEnd={(e) => {
          // restore default draggable
          (e.currentTarget as HTMLElement).draggable = true;
          onDragEnd();
        }}
        className={`relative select-none border border-slate-200 hover:shadow-md hover:border-slate-300 transition-transform duration-150 group cursor-grab active:cursor-grabbing will-change-transform hover:-translate-y-0.5 ${
          draggedApplicationId === app.application_id ? 'opacity-80 scale-[0.98]' : ''
        }`}
      >
        <Rail color={priorityToColor(app.priority)} />
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox 
                  data-no-drag
                  checked={selectedApps.includes(app.application_id)}
                  onCheckedChange={() => toggleSelection(app.application_id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <CardTitle className="text-sm font-semibold text-slate-900 truncate">
                  {displayData.studentName}
                </CardTitle>
                {agg && agg.count > 1 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-[10px] cursor-help">{agg.count} applications</Badge>
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
              <p className="text-xs text-slate-500 mb-2">{app.email || 'No email'}</p>
              {agg && (agg.modes.length > 0 || agg.patterns.length > 0) && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {agg.modes.slice(0,2).map(m => (
                    <Badge key={m} variant="secondary" className="h-5 capitalize">{m}</Badge>
                  ))}
                  {agg.patterns.slice(0,2).map(s => (
                    <Badge key={s} variant="secondary" className="h-5 capitalize">{s.replace('_',' ')}</Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <PriorityBadge priority={app.priority || 'medium'} />
                <UrgencyBadge urgency={app.urgency || 'medium'} />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button data-no-drag variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="gap-2" 
                  onClick={() => openDetailsDrawer(app.application_id)}
                >
                  <Eye className="h-3.5 w-3.5" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2"><Edit className="h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                <DropdownMenuItem className="gap-2"><Mail className="h-3.5 w-3.5" /> Send Email</DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => openMeetingBooker(app)}><CalIcon className="h-3.5 w-3.5" /> Schedule Meeting</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Program</span>
              <span className="font-medium text-slate-700">{displayData.program}</span>
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
          
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500 mb-2">
              <span className="font-medium">Next:</span> {displayData.nextAction}
            </div>
            <div className="text-xs text-slate-400 mb-3">
              {displayData.nextFollowUp} • {displayData.lastActivity}
            </div>
            
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => { setSelectedApplicationForEmail(app); setIsEmailComposerOpen(true); }}>
                <Mail className="mr-1.5 h-3 w-3" /> Email
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => openMeetingBooker(app)}>
                <CalIcon className="mr-1.5 h-3 w-3" /> Schedule
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => { setSelectedApplicationForCall(app); setIsCallConsoleOpen(true); }}>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="default" className="gap-2 h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all">
                    <BookmarkPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Views</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
                    <BookmarkPlus className="h-4 w-4 mr-2" /> Save current view…
                  </DropdownMenuItem>
                  {savedViews.length > 0 && <div className="border-t my-1" />}
                  {savedViews.length > 0 && (
                    <div className="max-h-64 overflow-auto">
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
                </DropdownMenuContent>
              </DropdownMenu>
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

        {/* Pipeline Statistics (compact, modern) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {/* Tile */}
          <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total Applications</div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{pipelineStats.total}</div>
              </div>
              <div className="p-2 rounded-md bg-muted/60">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Critical Priority</div>
                <div className="text-2xl font-bold text-accent tabular-nums">{pipelineStats.critical}</div>
              </div>
              <div className="p-2 rounded-md bg-accent/10 border border-accent/20">
                <Zap className="h-4 w-4 text-accent" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">High Urgency</div>
                <div className="text-2xl font-bold text-warning tabular-nums">{pipelineStats.highUrgency}</div>
              </div>
              <div className="p-2 rounded-md bg-warning/10 border border-warning/20">
                <Clock className="h-4 w-4 text-warning" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Avg Conversion</div>
                  <div className="text-sm font-semibold text-success tabular-nums">{pipelineStats.avgConversion}%</div>
                </div>
                <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-2 bg-success rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pipelineStats.avgConversion))}%` }} />
                </div>
              </div>
              <div className="p-2 rounded-md bg-success/10 border border-success/20 ml-3">
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-700">Filters & Search</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-slate-500 hover:text-slate-700"
            >
              {showFilters ? <FilterX className="h-4 w-4 mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {showFilters && (
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 border-slate-200 focus:border-slate-300"
                  placeholder="Search students, programs, or emails…"
                />
              </div>
            )}

            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger className="w-48 border-slate-200">
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {uniqueProgrammes.map(prog => (
                  <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger className="w-36 border-slate-200">
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-36 border-slate-200">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* New: Delivery Mode */}
            <Select value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as any)}>
              <SelectTrigger className="w-40 border-slate-200">
                <SelectValue placeholder="Delivery Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Delivery</SelectItem>
                <SelectItem value="onsite">Onsite</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>

            {/* New: Study Pattern */}
            <Select value={studyPattern} onValueChange={(v) => setStudyPattern(v as any)}>
              <SelectTrigger className="w-40 border-slate-200">
                <SelectValue placeholder="Study Pattern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patterns</SelectItem>
                <SelectItem value="full_time">Full-time</SelectItem>
                <SelectItem value="part_time">Part-time</SelectItem>
                <SelectItem value="accelerated">Accelerated</SelectItem>
              </SelectContent>
            </Select>

            {/* New: Multi-application toggle */}
            <div className="flex items-center gap-2 text-sm px-2 py-1 rounded-md border border-slate-200 bg-white">
              <Checkbox checked={multiOnly} onCheckedChange={(v) => setMultiOnly(v === true)} id="multiOnly" />
              <label htmlFor="multiOnly" className="text-slate-600">Multi-application only</label>
            </div>

              
          </div>

          {showFilters && (
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-500">Quick Filters:</span>
                <Button variant="outline" size="sm" className="h-7 text-xs bg-accent/5 border-accent/20 text-accent hover:bg-accent/10">
                  High Conversion (&gt;80%)
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs bg-warning/5 border-warning/20 text-warning hover:bg-warning/10">
                  Stuck &gt;30 Days
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs bg-destructive/5 border-destructive/20 text-destructive hover:bg-destructive/10">
                  No Activity &gt;7 Days
                </Button>
              </div>
            </div>
          )}
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
          <div ref={boardScrollRef} className="flex gap-6 overflow-x-auto pb-6" onDragOver={handleBoardDragOver}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-80 flex-shrink-0">
                <Card className="mb-3 border-2 border-border bg-card">
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
        <div ref={boardScrollRef} className="flex gap-6 overflow-x-auto pb-6" onDragOver={handleBoardDragOver}>
          {stages.map((stage) => {
            const config = getStageConfig(stage.id);
            return (
              <div 
                key={stage.id} 
                className={`w-80 flex-shrink-0 transition-colors ${
                  dragOverStage === stage.id ? 'bg-slate-50 border-2 border-slate-300 border-dashed rounded-lg' : ''
                }`}
                onDragOver={(e) => onDragOver(e, stage.id)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, stage.id)}
              >
                <Card 
                  className={`mb-3 border-2 ${config.color} hover:shadow-md transition-shadow`}
                >
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-md border border-slate-200">
                          {config.icon}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold text-slate-900">{config.name}</CardTitle>
                          <p className="text-xs text-slate-500">{config.description}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">
                        {grouped[stage.id]?.length ?? 0}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
                
                <div className="space-y-3 min-h-96" ref={(el) => { if (el) columnRefs.current.set(stage.id, el); }}>
                  {(() => {
                    const apps = grouped[stage.id] || [];
                    const phIndex = placeholder && placeholder.stageId === stage.id ? placeholder.index : -1;
                    const items: React.ReactNode[] = [];
                    apps.forEach((app, idx) => {
                      if (phIndex === idx) {
                        items.push(
                          <div key={`ph-${stage.id}-${idx}`} className="h-20 border-2 border-dashed rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground text-xs">
                            Release to move here
                          </div>
                        );
                      }
                      items.push(<ApplicationCard key={app.application_id} app={app} agg={personAggregates.get(String(app.person_id))} />);
                    });
                    if (phIndex === apps.length) {
                      items.push(
                        <div key={`ph-${stage.id}-end`} className="h-20 border-2 border-dashed rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground text-xs">
                          Release to move here
                        </div>
                      );
                    }
                    return items;
                  })()}
                  {(!grouped[stage.id] || grouped[stage.id]?.length === 0) && (
                    <div className={`h-32 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
                      dragOverStage === stage.id 
                        ? 'border-slate-400 bg-slate-100' 
                        : 'border-slate-200'
                    }`}>
                      <p className={`text-sm transition-colors ${
                        dragOverStage === stage.id ? 'text-slate-700' : 'text-slate-400'
                      }`}>
                        {dragOverStage === stage.id ? 'Drop here' : 'Drop applications here'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedApplicationForEmail(app); setIsEmailComposerOpen(true); }}>
                                    <Mail className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send Email</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openMeetingBooker(app)}>
                                    <CalIcon className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Schedule Meeting</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedApplicationForCall(app); setIsCallConsoleOpen(true); }}>
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

      {/* Meeting Booker Modal */}
      <MeetingBooker
        isOpen={isMeetingBookerOpen}
        onClose={closeMeetingBooker}
        lead={convertApplicationToLead}
        onBookMeeting={handleMeetingBooked}
      />

      {/* Email Composer */}
      <EmailComposer
        isOpen={isEmailComposerOpen}
        onClose={() => setIsEmailComposerOpen(false)}
        lead={emailLead}
      />

      {/* Call Console */}
      <CallConsole
        isOpen={isCallConsoleOpen}
        onClose={() => setIsCallConsoleOpen(false)}
        lead={callLead}
        onSaveCall={(data) => { console.log('Call saved from Applications:', data); }}
      />
    </div>
  );
}
