import * as React from "react";
import {
  Search, Grid, List, Plus, Mail, Calendar as CalIcon,
  Phone, MoreHorizontal, Eye, Edit, Filter, TrendingUp,
  Clock, AlertTriangle, CheckCircle, XCircle, Star,
  Users, Target, BarChart3, Zap, ArrowRight, FilterX,
  RefreshCw
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

// Custom hooks and utilities
import { useApplications } from "@/hooks/useApplications";
import { getApplicationCardDisplay, getPriorityColor, getUrgencyColor } from "@/utils/dataMapping";

// Map backend stages to frontend display stages
const STAGE_MAPPING: Record<string, string> = {
  'enquiry': 'Enquiry',
  'applicant': 'Application Submitted',
  'interview': 'Interview',
  'offer': 'Offer Made',
  'enrolled': 'Enrolled',
};

// Frontend stage IDs for the Kanban board
type StageId = 'enquiry' | 'applicant' | 'interview' | 'offer' | 'enrolled';

const STAGES: { 
  id: StageId; 
  name: string; 
  description: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  { 
    id: "enquiry", 
    name: "Enquiry", 
    description: "Initial enquiries received",
    color: "bg-blue-100 border-blue-200",
    icon: <Users className="h-4 w-4" />
  },
  { 
    id: "applicant", 
    name: "Application Submitted", 
    description: "Applications under review",
    color: "bg-slate-100 border-slate-200",
    icon: <Eye className="h-4 w-4" />
  },
  { 
    id: "interview", 
    name: "Interview", 
    description: "Interview process",
    color: "bg-warning/10 border-warning/20",
    icon: <CalIcon className="h-4 w-4" />
  },
  { 
    id: "offer", 
    name: "Offer Made", 
    description: "Offers pending response",
    color: "bg-success/10 border-success/20",
    icon: <Star className="h-4 w-4" />
  },
  { 
    id: "enrolled", 
    name: "Enrolled", 
    description: "Students enrolled",
    color: "bg-forest-green/10 border-forest-green/20",
    icon: <Target className="h-4 w-4" />
  },
];

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

function ConversionIndicator({ probability }: { probability: number | undefined }) {
  if (probability === undefined) return <span className="text-xs text-slate-400">N/A</span>;
  
  const percentage = Math.round(probability * 100);
  const getColor = (prob: number) => {
    if (prob >= 80) return "bg-success";
    if (prob >= 60) return "bg-warning";
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
    </div>
  );
}

export default function ApplicationsBoardPage() {
  const [view, setView] = React.useState<"board" | "table">("board");
  const [search, setSearch] = React.useState("");
  const [program, setProgram] = React.useState<string>("all");
  const [urgency, setUrgency] = React.useState<string>("all");
  const [priority, setPriority] = React.useState<string>("all");
  const [selectedApps, setSelectedApps] = React.useState<string[]>([]);
  const [showFilters, setShowFilters] = React.useState(false);

  // Use the custom hook for applications data
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
  } = useApplications({
    priority: priority === "all" ? undefined : priority,
    urgency: urgency === "all" ? undefined : urgency,
  });

  // Filter applications based on search and program
  const filtered = React.useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = search === "" || 
        app.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        app.last_name?.toLowerCase().includes(search.toLowerCase()) ||
        app.email?.toLowerCase().includes(search.toLowerCase()) ||
        app.programme_name.toLowerCase().includes(search.toLowerCase());
      
      const matchesProgram = program === "all" || app.programme_name === program;
      
      return matchesSearch && matchesProgram;
    });
  }, [applications, search, program]);

  // Group applications by stage for Kanban columns
  const grouped = React.useMemo(() => {
    const g: Record<StageId, typeof applications> = {
      "enquiry": [],
      "applicant": [],
      "interview": [],
      "offer": [],
      "enrolled": []
    };
    
    filtered.forEach(app => {
      const stage = app.stage as StageId;
      if (g[stage]) {
        g[stage].push(app);
      }
    });
    
    return g;
  }, [filtered]);

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
    return [...new Set(applications.map(app => app.programme_name))];
  }, [applications]);

  // Handle drag and drop for stage changes
  const onDragStart = (e: React.DragEvent, applicationId: string) => {
    e.dataTransfer.setData("text/plain", applicationId);
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const onDrop = async (e: React.DragEvent, targetStage: StageId) => {
    e.preventDefault();
    const applicationId = e.dataTransfer.getData("text/plain");
    
    try {
      await moveStage(applicationId, {
        to_stage: targetStage,
        note: `Moved to ${targetStage} via drag and drop`,
      });
    } catch (error) {
      console.error('Failed to move application:', error);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedApps(prev => 
      prev.includes(id) ? prev.filter(appId => appId !== id) : [...prev, id]
    );
  };

  const ApplicationCard = ({ app }: { app: typeof applications[0] }) => {
    const displayData = getApplicationCardDisplay(app);
    
    return (
      <Card 
        draggable 
        onDragStart={(e) => onDragStart(e, app.application_id)} 
        className="border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200 group cursor-move"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox 
                  checked={selectedApps.includes(app.application_id)}
                  onCheckedChange={() => toggleSelection(app.application_id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <CardTitle className="text-sm font-semibold text-slate-900 truncate">
                  {displayData.studentName}
                </CardTitle>
              </div>
              <p className="text-xs text-slate-500 mb-2">{app.email || 'No email'}</p>
              <div className="flex items-center gap-2 mb-2">
                <PriorityBadge priority={app.priority || 'medium'} />
                <UrgencyBadge urgency={app.urgency || 'medium'} />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2"><Eye className="h-3.5 w-3.5" /> View Details</DropdownMenuItem>
                <DropdownMenuItem className="gap-2"><Edit className="h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                <DropdownMenuItem className="gap-2"><Mail className="h-3.5 w-3.5" /> Send Email</DropdownMenuItem>
                <DropdownMenuItem className="gap-2"><CalIcon className="h-3.5 w-3.5" /> Schedule</DropdownMenuItem>
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
              <span className="text-slate-500">Conversion</span>
              <ConversionIndicator probability={app.conversion_probability} />
            </div>
          </div>
          
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500 mb-2">
              <span className="font-medium">Next:</span> {displayData.nextAction}
            </div>
            <div className="text-xs text-slate-400 mb-3">
              {displayData.nextFollowUp} • {displayData.lastActivity}
            </div>
            
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs">
                <Mail className="mr-1.5 h-3 w-3" /> Email
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs">
                <CalIcon className="mr-1.5 h-3 w-3" /> Schedule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="px-6 py-6 bg-slate-50/50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-slate-500">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-6 bg-slate-50/50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-400" />
          <p className="text-red-500 mb-2">Error loading applications</p>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <Button onClick={() => refreshBoard()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 bg-slate-50/50 min-h-screen">
      {/* Enhanced Header with Stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admissions Pipeline</h1>
            <p className="text-sm text-slate-500">CRM → Admissions → Applications</p>
          </div>

          <div className="flex items-center gap-3">
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList className="bg-slate-100 border border-slate-200">
                <TabsTrigger value="board" className="gap-2 data-[state=active]:bg-white">
                  <Grid className="h-4 w-4" /> Board
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-2 data-[state=active]:bg-white">
                  <List className="h-4 w-4" /> Table
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button onClick={refreshBoard} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>

            <Button className="bg-accent hover:bg-accent/90 text-white">
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Button>
          </div>
        </div>

        {/* Pipeline Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Users className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Applications</p>
                  <p className="text-2xl font-semibold text-slate-900">{pipelineStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Zap className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Critical Priority</p>
                  <p className="text-2xl font-semibold text-accent">{pipelineStats.critical}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">High Urgency</p>
                  <p className="text-2xl font-semibold text-warning">{pipelineStats.highUrgency}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Avg Conversion</p>
                  <p className="text-2xl font-semibold text-success">{pipelineStats.avgConversion}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-slate-200 focus:border-slate-300"
                placeholder="Search students, programs, or emails…"
              />
            </div>

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

        {/* Bulk Actions */}
        {selectedApps.length > 0 && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-accent font-medium">
                {selectedApps.length} application{selectedApps.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Mail className="mr-1.5 h-3.5 w-3.5" /> Bulk Email
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <CalIcon className="mr-1.5 h-3.5 w-3.5" /> Bulk Schedule
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Bulk Update
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
      </div>

      {/* Enhanced Board View */}
      {view === "board" ? (
        <div className="flex gap-6 overflow-x-auto pb-6">
          {STAGES.map((stage) => (
            <div key={stage.id} className="w-80 flex-shrink-0">
              <Card 
                className={`mb-3 border-2 ${stage.color} hover:shadow-md transition-shadow`}
                onDragOver={onDragOver} 
                onDrop={(e) => onDrop(e, stage.id)}
              >
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white rounded-md border border-slate-200">
                        {stage.icon}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-slate-900">{stage.name}</CardTitle>
                        <p className="text-xs text-slate-500">{stage.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700">
                      {grouped[stage.id]?.length ?? 0}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
              
              <div className="space-y-3 min-h-96">
                {grouped[stage.id]?.map((app) => (
                  <ApplicationCard key={app.application_id} app={app} />
                ))}
                {(!grouped[stage.id] || grouped[stage.id].length === 0) && (
                  <div className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-slate-400">Drop applications here</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Enhanced Table View
        <Card className="overflow-hidden border-slate-200">
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
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
                  {filtered.map((app) => {
                    const displayData = getApplicationCardDisplay(app);
                    return (
                      <tr key={app.application_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <Checkbox 
                            checked={selectedApps.includes(app.application_id)}
                            onCheckedChange={() => toggleSelection(app.application_id)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{displayData.studentName}</div>
                          <div className="text-slate-500">{app.email || 'No email'}</div>
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
                          <ConversionIndicator probability={app.conversion_probability} />
                        </td>
                        <td className="px-6 py-4 text-slate-700">{displayData.nextFollowUp}</td>
                        <td className="px-6 py-4 text-slate-700">{displayData.nextAction}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Mail className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send Email</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <CalIcon className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Schedule Meeting</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}