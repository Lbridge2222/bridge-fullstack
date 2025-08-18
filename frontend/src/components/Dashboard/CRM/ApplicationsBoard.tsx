import * as React from "react";
import {
  Search, Grid, List, Plus, Mail, Calendar as CalIcon,
  Phone, MoreHorizontal, Eye, Edit, Filter, TrendingUp,
  Clock, AlertTriangle, CheckCircle, XCircle, Star,
  Users, Target, BarChart3, Zap, ArrowRight, FilterX
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

type StageId =
  | "applied"
  | "under-review"
  | "interview-scheduled"
  | "interview-complete"
  | "conditional-offer"
  | "unconditional-offer"
  | "deposit-received"
  | "enrolled";

type Application = {
  id: number;
  studentName: string;
  email: string;
  program: string;
  campus: string;
  applicationDate: string;
  daysInPipeline: number;
  leadScore: number;
  leadSource: string;
  urgency: "high" | "medium" | "low";
  nextAction: string;
  lastContact: string;
  stage: StageId;
  aiInsights?: string;
  conversionProbability: number;
  priority: "critical" | "high" | "medium" | "low";
  tags: string[];
  lastActivity: string;
  nextFollowUp: string;
};

const STAGES: { 
  id: StageId; 
  name: string; 
  description: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  { 
    id: "applied", 
    name: "Applied", 
    description: "Applications received",
    color: "bg-slate-100 border-slate-200",
    icon: <Users className="h-4 w-4" />
  },
  { 
    id: "under-review", 
    name: "Under Review", 
    description: "Academic review in progress",
    color: "bg-info/10 border-info/20",
    icon: <Eye className="h-4 w-4" />
  },
  { 
    id: "interview-scheduled", 
    name: "Interview Scheduled", 
    description: "Interview dates set",
    color: "bg-warning/10 border-warning/20",
    icon: <CalIcon className="h-4 w-4" />
  },
  { 
    id: "interview-complete", 
    name: "Interview Complete", 
    description: "Awaiting decision",
    color: "bg-slate-100 border-slate-200",
    icon: <CheckCircle className="h-4 w-4" />
  },
  { 
    id: "conditional-offer", 
    name: "Conditional Offer", 
    description: "Pending requirements",
    color: "bg-warning/10 border-warning/20",
    icon: <AlertTriangle className="h-4 w-4" />
  },
  { 
    id: "unconditional-offer", 
    name: "Unconditional Offer", 
    description: "Ready to accept",
    color: "bg-success/10 border-success/20",
    icon: <Star className="h-4 w-4" />
  },
  { 
    id: "deposit-received", 
    name: "Deposit Received", 
    description: "Commitment confirmed",
    color: "bg-success/10 border-success/20",
    icon: <CheckCircle className="h-4 w-4" />
  },
  { 
    id: "enrolled", 
    name: "Enrolled", 
    description: "Student enrolled",
    color: "bg-forest-green/10 border-forest-green/20",
    icon: <Target className="h-4 w-4" />
  },
];

const SAMPLE: Application[] = [
  { 
    id: 1, 
    studentName: "Sarah Johnson", 
    email: "sarah.johnson@email.com", 
    program: "Computer Science", 
    campus: "Main Campus", 
    applicationDate: "2024-07-15", 
    daysInPipeline: 26, 
    leadScore: 85, 
    leadSource: "Website", 
    urgency: "high", 
    nextAction: "Schedule interview", 
    lastContact: "2024-08-05", 
    stage: "applied", 
    aiInsights: "High conversion probability based on academic background",
    conversionProbability: 87,
    priority: "high",
    tags: ["STEM", "High Achiever", "First Choice"],
    lastActivity: "2 hours ago",
    nextFollowUp: "Today"
  },
  { 
    id: 2, 
    studentName: "Michael Chen", 
    email: "michael.chen@email.com", 
    program: "Business Administration", 
    campus: "Downtown", 
    applicationDate: "2024-07-20", 
    daysInPipeline: 21, 
    leadScore: 92, 
    leadSource: "Referral", 
    urgency: "high", 
    nextAction: "Review application", 
    lastContact: "2024-08-08", 
    stage: "under-review", 
    aiInsights: "Excellent academic record, strong candidate",
    conversionProbability: 94,
    priority: "critical",
    tags: ["Referral", "Top Tier", "Quick Decision"],
    lastActivity: "1 hour ago",
    nextFollowUp: "ASAP"
  },
  { 
    id: 3, 
    studentName: "Emily Rodriguez", 
    email: "emily.rodriguez@email.com", 
    program: "Engineering", 
    campus: "Main Campus", 
    applicationDate: "2024-07-10", 
    daysInPipeline: 31, 
    leadScore: 78, 
    leadSource: "Social", 
    urgency: "medium", 
    nextAction: "Conduct interview", 
    lastContact: "2024-08-07", 
    stage: "interview-scheduled", 
    aiInsights: "Good fit for engineering program",
    conversionProbability: 72,
    priority: "medium",
    tags: ["Engineering", "Social Media", "Good Fit"],
    lastActivity: "3 hours ago",
    nextFollowUp: "Tomorrow"
  },
  { 
    id: 4, 
    studentName: "David Kim", 
    email: "david.kim@email.com", 
    program: "Medicine", 
    campus: "Medical Center", 
    applicationDate: "2024-07-01", 
    daysInPipeline: 40, 
    leadScore: 95, 
    leadSource: "Event", 
    urgency: "high", 
    nextAction: "Decision pending", 
    lastContact: "2024-08-09", 
    stage: "interview-complete", 
    aiInsights: "Outstanding candidate, recommend immediate offer",
    conversionProbability: 96,
    priority: "critical",
    tags: ["Medicine", "Event", "Outstanding"],
    lastActivity: "30 minutes ago",
    nextFollowUp: "ASAP"
  },
  { 
    id: 5, 
    studentName: "Lisa Wang", 
    email: "lisa.wang@email.com", 
    program: "Psychology", 
    campus: "Main Campus", 
    applicationDate: "2024-06-25", 
    daysInPipeline: 46, 
    leadScore: 88, 
    leadSource: "Website", 
    urgency: "medium", 
    nextAction: "Send requirements", 
    lastContact: "2024-08-06", 
    stage: "conditional-offer", 
    aiInsights: "Waiting on final transcripts",
    conversionProbability: 82,
    priority: "medium",
    tags: ["Psychology", "Website", "Conditional"],
    lastActivity: "1 day ago",
    nextFollowUp: "This week"
  },
  { 
    id: 6, 
    studentName: "James Thompson", 
    email: "james.thompson@email.com", 
    program: "Law", 
    campus: "Law School", 
    applicationDate: "2024-06-20", 
    daysInPipeline: 51, 
    leadScore: 91, 
    leadSource: "Referral", 
    urgency: "low", 
    nextAction: "Await response", 
    lastContact: "2024-08-04", 
    stage: "unconditional-offer", 
    aiInsights: "Strong candidate, likely to accept",
    conversionProbability: 89,
    priority: "high",
    tags: ["Law", "Referral", "Strong Candidate"],
    lastActivity: "2 days ago",
    nextFollowUp: "Next week"
  },
];

function PriorityBadge({ priority }: { priority: Application["priority"] }) {
  const styles = {
    critical: "bg-destructive/10 text-destructive border-destructive/20",
    high: "bg-accent/10 text-accent border-accent/20",
    medium: "bg-warning/10 text-warning border-warning/20",
    low: "bg-slate-100 text-slate-600 border-slate-200"
  };
  
  return (
    <Badge variant="outline" className={`${styles[priority]} text-xs font-medium`}>
      {priority === "critical" && <AlertTriangle className="h-3 w-3 mr-1" />}
      {priority === "high" && <Zap className="h-3 w-3 mr-1" />}
      {priority}
    </Badge>
  );
}

function UrgencyBadge({ urgency }: { urgency: Application["urgency"] }) {
  const styles = {
    high: "bg-destructive/10 text-destructive border-destructive/20",
    medium: "bg-warning/10 text-warning border-warning/20",
    low: "bg-success/10 text-success border-success/20"
  };
  
  return (
    <Badge variant="outline" className={`${styles[urgency]} text-xs font-medium`}>
      {urgency === "high" && <Clock className="h-3 w-3 mr-1" />}
      {urgency}
    </Badge>
  );
}

function ConversionIndicator({ probability }: { probability: number }) {
  const getColor = (prob: number) => {
    if (prob >= 80) return "bg-success";
    if (prob >= 60) return "bg-warning";
    return "bg-destructive";
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(probability)} transition-all duration-300`}
          style={{ width: `${probability}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600">{probability}%</span>
    </div>
  );
}

export default function ApplicationsBoardPage() {
  const [view, setView] = React.useState<"board" | "table">("board");
  const [search, setSearch] = React.useState("");
  const [program, setProgram] = React.useState<string>("all");
  const [urgency, setUrgency] = React.useState<string>("all");
  const [priority, setPriority] = React.useState<string>("all");
  const [selectedApps, setSelectedApps] = React.useState<number[]>([]);
  const [showFilters, setShowFilters] = React.useState(false);

  const filtered = React.useMemo(() => {
    return SAMPLE.filter(a => {
      const matchesSearch =
        a.studentName.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase()) ||
        a.program.toLowerCase().includes(search.toLowerCase());
      const matchesProgram = program === "all" || a.program === program;
      const matchesUrgency = urgency === "all" || a.urgency === urgency;
      const matchesPriority = priority === "all" || a.priority === priority;
      return matchesSearch && matchesProgram && matchesUrgency && matchesPriority;
    });
  }, [search, program, urgency, priority]);

  const grouped = React.useMemo(() => {
    const g: Record<StageId, Application[]> = {
      "applied": [], "under-review": [], "interview-scheduled": [],
      "interview-complete": [], "conditional-offer": [], "unconditional-offer": [],
      "deposit-received": [], "enrolled": []
    };
    filtered.forEach(a => g[a.stage].push(a));
    return g;
  }, [filtered]);

  const pipelineStats = React.useMemo(() => {
    const total = filtered.length;
    const critical = filtered.filter(a => a.priority === "critical").length;
    const highUrgency = filtered.filter(a => a.urgency === "high").length;
    const avgConversion = Math.round(
      filtered.reduce((sum, a) => sum + a.conversionProbability, 0) / total
    );
    
    return { total, critical, highUrgency, avgConversion };
  }, [filtered]);

  const onDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("text/plain", String(id));
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (e: React.DragEvent, target: StageId) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    console.log(`Move app ${id} → ${target}`);
  };

  const toggleSelection = (id: number) => {
    setSelectedApps(prev => 
      prev.includes(id) ? prev.filter(appId => appId !== id) : [...prev, id]
    );
  };

  const ApplicationCard = ({ app }: { app: Application }) => (
    <Card 
      draggable 
      onDragStart={(e) => onDragStart(e, app.id)} 
      className="border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200 group cursor-move"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox 
                checked={selectedApps.includes(app.id)}
                onCheckedChange={() => toggleSelection(app.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <CardTitle className="text-sm font-semibold text-slate-900 truncate">
                {app.studentName}
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500 mb-2">{app.email}</p>
            <div className="flex items-center gap-2 mb-2">
              <PriorityBadge priority={app.priority} />
              <UrgencyBadge urgency={app.urgency} />
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
            <span className="font-medium text-slate-700">{app.program}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Lead Score</span>
            <span className="font-medium text-slate-700">{app.leadScore}%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Conversion</span>
            <ConversionIndicator probability={app.conversionProbability} />
          </div>
        </div>
        
        <div className="pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500 mb-2">
            <span className="font-medium">Next:</span> {app.nextAction}
          </div>
          <div className="text-xs text-slate-400 mb-3">
            {app.daysInPipeline} days in pipeline • {app.lastActivity}
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
                <SelectItem value="Computer Science">Computer Science</SelectItem>
                <SelectItem value="Business Administration">Business Administration</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Medicine">Medicine</SelectItem>
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
                  <ApplicationCard key={app.id} app={app} />
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
                            setSelectedApps(filtered.map(a => a.id));
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
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <Checkbox 
                          checked={selectedApps.includes(a.id)}
                          onCheckedChange={() => toggleSelection(a.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{a.studentName}</div>
                        <div className="text-slate-500">{a.email}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{a.program}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-xs">
                          {STAGES.find(s => s.id === a.stage)?.name}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <PriorityBadge priority={a.priority} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700">{a.leadScore}%</span>
                          <div className="h-2 w-16 rounded-full bg-slate-200">
                            <div 
                              className="h-2 rounded-full bg-slate-600" 
                              style={{ width: `${a.leadScore}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <ConversionIndicator probability={a.conversionProbability} />
                      </td>
                      <td className="px-6 py-4 text-slate-700">{a.daysInPipeline}</td>
                      <td className="px-6 py-4 text-slate-700">{a.nextAction}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}