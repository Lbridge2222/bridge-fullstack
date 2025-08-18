import * as React from "react";
import {
  Calendar, Clock, Users, Video, Plus, Settings, Filter, ChevronLeft,
  ChevronRight, Eye, Edit, Trash2, Phone, Mail, User as UserIcon,
  CheckCircle, XCircle, Search, MoreHorizontal, 
  CalendarDays, Building2, GraduationCap, TrendingUp, AlertTriangle, CheckCircle2
} from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Staff = { 
  id: number; 
  name: string; 
  role: string; 
  color: string; 
  available: boolean; 
  avatar?: string;
  department: string;
  maxInterviewsPerDay: number;
  currentInterviews: number;
};

type InterviewType = { 
  id: number; 
  name: string; 
  duration: number; 
  color: string; 
  description: string;
  requirements: string[];
};

type Interview = {
  id: number; 
  time: string; 
  date: string;
  applicant: string; 
  applicantEmail: string;
  applicantPhone: string;
  type: string; 
  staff: string; 
  status: "scheduled" | "in-progress" | "completed" | "no-show" | "cancelled";
  zoomLink: string; 
  notes?: string;
  priority: "low" | "medium" | "high";
  program: string;
  stage: string;
};

type Slot = { 
  time: string; 
  staff: string; 
  type: "available" | "booked" | "blocked" | "break"; 
  applicant: string | null;
  interviewType?: string;
  duration?: number;
};

type WeekDay = { day: string; date: string; slots: Slot[] };

const staffMembers: Staff[] = [
  { 
    id: 1, 
    name: "Sarah Chen", 
    role: "Admissions Director", 
    color: "bg-primary", 
    available: true,
    department: "Admissions",
    maxInterviewsPerDay: 8,
    currentInterviews: 3
  },
  { 
    id: 2, 
    name: "Michael Torres", 
    role: "Program Coordinator", 
    color: "bg-primary/80", 
    available: true,
    department: "Admissions",
    maxInterviewsPerDay: 6,
    currentInterviews: 2
  },
  { 
    id: 3, 
    name: "Dr. Lisa Park", 
    role: "Academic Advisor", 
    color: "bg-primary/60", 
    available: false,
    department: "Academic Affairs",
    maxInterviewsPerDay: 4,
    currentInterviews: 0
  },
  { 
    id: 4, 
    name: "James Wilson", 
    role: "Admissions Officer", 
    color: "bg-primary/40", 
    available: true,
    department: "Admissions",
    maxInterviewsPerDay: 6,
    currentInterviews: 1
  },
];

const interviewTypes: InterviewType[] = [
  { 
    id: 1, 
    name: "Portfolio Review", 
    duration: 45, 
    color: "bg-destructive", 
    description: "Comprehensive review of applicant's creative portfolio",
    requirements: ["Portfolio submission", "Statement of intent", "Resume"]
  },
  { 
    id: 2, 
    name: "General Admissions", 
    duration: 30, 
    color: "bg-primary", 
    description: "Standard admissions interview for general programs",
    requirements: ["Application form", "Transcripts", "Personal statement"]
  },
  { 
    id: 3, 
    name: "Program-Specific", 
    duration: 60, 
    color: "bg-success", 
    description: "Specialized interview for specific program requirements",
    requirements: ["Program application", "Prerequisites", "References"]
  },
  { 
    id: 4, 
    name: "Final Review", 
    duration: 30, 
    color: "bg-warning", 
    description: "Final evaluation interview for qualified candidates",
    requirements: ["All previous requirements", "Final documentation"]
  },
];

const todaysInterviews: Interview[] = [
  { 
    id: 1, 
    time: "9:00 AM", 
    date: "Jan 15, 2024",
    applicant: "Emma Rodriguez", 
    applicantEmail: "emma.r@email.com", 
    applicantPhone: "+1 (555) 123-4567",
    type: "Portfolio Review", 
    staff: "Sarah Chen", 
    status: "scheduled", 
    zoomLink: "#", 
    priority: "high",
    program: "Graphic Design",
    stage: "Final Review"
  },
  { 
    id: 2, 
    time: "10:30 AM", 
    date: "Jan 15, 2024",
    applicant: "David Kim", 
    applicantEmail: "david.kim@email.com", 
    applicantPhone: "+1 (555) 234-5678",
    type: "General Admissions", 
    staff: "Michael Torres", 
    status: "in-progress", 
    zoomLink: "#", 
    priority: "medium",
    program: "Business Administration",
    stage: "Initial Screening"
  },
  { 
    id: 3, 
    time: "2:00 PM", 
    date: "Jan 15, 2024",
    applicant: "Maria Santos", 
    applicantEmail: "maria.santos@email.com", 
    applicantPhone: "+1 (555) 345-6789",
    type: "Program-Specific", 
    staff: "James Wilson", 
    status: "scheduled", 
    zoomLink: "#", 
    priority: "high",
    program: "Computer Science",
    stage: "Technical Assessment"
  },
  { 
    id: 4, 
    time: "3:30 PM", 
    date: "Jan 15, 2024",
    applicant: "Alex Johnson", 
    applicantEmail: "alex.j@email.com", 
    applicantPhone: "+1 (555) 456-7890",
    type: "Final Review", 
    staff: "Sarah Chen", 
    status: "completed", 
    zoomLink: "#", 
    priority: "low",
    program: "Fine Arts",
    stage: "Completed"
  },
];

const weeklySlots: WeekDay[] = [
  { day: "Mon", date: "15", slots: [
    { time: "9:00 AM", staff: "Sarah Chen", type: "booked", applicant: "Emma Rodriguez", interviewType: "Portfolio Review", duration: 45 },
    { time: "10:30 AM", staff: "Michael Torres", type: "booked", applicant: "David Kim", interviewType: "General Admissions", duration: 30 },
    { time: "11:30 AM", staff: "Sarah Chen", type: "break", applicant: null },
    { time: "2:00 PM", staff: "James Wilson", type: "booked", applicant: "Maria Santos", interviewType: "Program-Specific", duration: 60 },
    { time: "3:30 PM", staff: "Sarah Chen", type: "booked", applicant: "Alex Johnson", interviewType: "Final Review", duration: 30 },
    { time: "4:30 PM", staff: "Michael Torres", type: "available", applicant: null },
  ]},
  { day: "Tue", date: "16", slots: [
    { time: "9:00 AM", staff: "Dr. Lisa Park", type: "blocked", applicant: null },
    { time: "11:00 AM", staff: "Michael Torres", type: "available", applicant: null },
    { time: "1:00 PM", staff: "Sarah Chen", type: "available", applicant: null },
    { time: "3:00 PM", staff: "James Wilson", type: "booked", applicant: "Lisa Wong", interviewType: "General Admissions", duration: 30 },
  ]},
  { day: "Wed", date: "17", slots: [
    { time: "10:00 AM", staff: "Sarah Chen", type: "available", applicant: null },
    { time: "11:30 AM", staff: "Michael Torres", type: "booked", applicant: "Alex Johnson", interviewType: "Final Review", duration: 30 },
    { time: "2:30 PM", staff: "Dr. Lisa Park", type: "blocked", applicant: null },
    { time: "4:00 PM", staff: "James Wilson", type: "available", applicant: null },
  ]},
  { day: "Thu", date: "18", slots: [
    { time: "9:30 AM", staff: "Sarah Chen", type: "booked", applicant: "Lisa Wong", interviewType: "Portfolio Review", duration: 45 },
    { time: "11:00 AM", staff: "Michael Torres", type: "available", applicant: null },
    { time: "1:30 PM", staff: "Dr. Lisa Park", type: "available", applicant: null },
    { time: "3:00 PM", staff: "James Wilson", type: "blocked", applicant: null },
  ]},
  { day: "Fri", date: "19", slots: [
    { time: "10:00 AM", staff: "Sarah Chen", type: "available", applicant: null },
    { time: "11:30 AM", staff: "Michael Torres", type: "blocked", applicant: null },
    { time: "2:00 PM", staff: "Dr. Lisa Park", type: "booked", applicant: "Robert Chen", interviewType: "Program-Specific", duration: 60 },
    { time: "3:30 PM", staff: "James Wilson", type: "available", applicant: null },
  ]},
];

function StatusBadge({ status }: { status: Interview["status"] }) {
  const map: Record<Interview["status"], { className: string; icon: React.ReactNode; label: string }> = {
    scheduled: { className: "bg-muted text-muted-foreground", icon: <Clock className="h-3.5 w-3.5" />, label: "Scheduled" },
    "in-progress": { className: "bg-info/10 text-info", icon: <CheckCircle className="h-3.5 w-3.5" />, label: "In Progress" },
    completed: { className: "bg-success/10 text-success", icon: <CheckCircle className="h-3.5 w-3.5" />, label: "Completed" },
    "no-show": { className: "bg-destructive/10 text-destructive", icon: <XCircle className="h-3.5 w-3.5" />, label: "No Show" },
    "cancelled": { className: "bg-warning/10 text-warning", icon: <XCircle className="h-3.5 w-3.5" />, label: "Cancelled" },
  };
  const s = map[status];
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.className}`}>
      {s.icon}<span>{s.label}</span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Interview["priority"] }) {
  const map: Record<Interview["priority"], { className: string; label: string }> = {
    low: { className: "bg-muted text-muted-foreground", label: "Low" },
    medium: { className: "bg-warning/10 text-warning", label: "Medium" },
    high: { className: "bg-destructive/10 text-destructive", label: "High" },
  };
  const p = map[priority];
  return (
    <Badge variant="secondary" className={p.className}>
      {p.label}
    </Badge>
  );
}

function slotClasses(type: Slot["type"]) {
  switch (type) {
    case "available": return "bg-success/10 border-success/20 hover:bg-success/20 cursor-pointer";
    case "booked": return "bg-muted border-border";
    case "blocked": return "bg-muted/80 border-border/60 opacity-60";
    case "break": return "bg-warning/10 border-warning/20";
    default: return "bg-muted border-border";
  }
}

export default function InterviewScheduler() {
  const [currentView, setCurrentView] = React.useState<"calendar" | "today" | "manage">("calendar");
  const [selectedStaff, setSelectedStaff] = React.useState<string>("all");
  const [showBooking, setShowBooking] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState("2024-01-15");
  const [selectedInterviewType, setSelectedInterviewType] = React.useState<string>("all");
  const [currentWeek, setCurrentWeek] = React.useState(new Date("2024-01-15"));

  // Calculate current week dates
  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentWeek);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[4];

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const filteredInterviews = todaysInterviews.filter(interview =>
    interview.applicant.toLowerCase().includes(searchQuery.toLowerCase()) ||
    interview.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    interview.staff.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStaffById = (id: string) => staffMembers.find(s => String(s.id) === id);

  // Calculate stats
  const totalInterviews = todaysInterviews.length;
  const completedInterviews = todaysInterviews.filter(i => i.status === "completed").length;
  const inProgressInterviews = todaysInterviews.filter(i => i.status === "in-progress").length;
  const upcomingInterviews = todaysInterviews.filter(i => i.status === "scheduled").length;
  const highPriorityInterviews = todaysInterviews.filter(i => i.priority === "high").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Enhanced Header */}
      <div className="border-b border-border bg-card shadow-sm">
        <div className="px-6 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-muted rounded-lg">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Interview Scheduler</h1>
                <p className="text-muted-foreground">Manage admissions interviews and scheduling</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2 border-border hover:bg-muted">
              <Filter className="h-4 w-4" /> Filter
            </Button>
            <Button variant="outline" className="gap-2 border-border hover:bg-muted">
              <Settings className="h-4 w-4" /> Settings
            </Button>
            <Button onClick={() => setShowBooking(true)} className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Schedule Interview
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats Dashboard */}
      <div className="px-6 py-4 bg-card border-b border-border">
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-foreground">{totalInterviews}</div>
            <div className="text-xs text-muted-foreground">Total Today</div>
          </div>
          <div className="text-center p-3 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">{completedInterviews}</div>
            <div className="text-xs text-success">Completed</div>
          </div>
          <div className="text-center p-3 bg-info/10 rounded-lg">
            <div className="text-2xl font-bold text-info">{inProgressInterviews}</div>
            <div className="text-xs text-info">In Progress</div>
          </div>
          <div className="text-center p-3 bg-warning/10 rounded-lg">
            <div className="text-2xl font-bold text-warning">{upcomingInterviews}</div>
            <div className="text-xs text-warning">Upcoming</div>
          </div>
          <div className="text-center p-3 bg-destructive/10 rounded-lg">
            <div className="text-2xl font-bold text-destructive">{highPriorityInterviews}</div>
            <div className="text-xs text-destructive">High Priority</div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Enhanced Sidebar */}
        <aside className="w-80 border-r border-border bg-card h-[calc(100vh-200px)] overflow-y-auto">
          <div className="p-6">
            {/* View toggle */}
            <div className="mb-8">
              <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">View Options</h3>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                {(["calendar","today","manage"] as const).map(v => (
                  <Button
                    key={v}
                    variant={currentView === v ? "secondary" : "ghost"}
                    className={`w-full text-sm capitalize ${currentView === v ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setCurrentView(v)}
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>

            {/* Interview Type Filter */}
            <div className="mb-8">
              <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Interview Types</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted p-2 rounded-lg transition-colors">
                  <input
                    type="radio"
                    name="interviewType"
                    value="all"
                    checked={selectedInterviewType === "all"}
                    onChange={(e) => setSelectedInterviewType(e.target.value)}
                    className="text-primary"
                  />
                  <span className="font-medium">All types</span>
                </label>
                {interviewTypes.map(t => (
                  <label key={t.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted p-2 rounded-lg transition-colors">
                    <input
                      type="radio"
                      name="interviewType"
                      value={String(t.id)}
                      checked={selectedInterviewType === String(t.id)}
                      onChange={(e) => setSelectedInterviewType(e.target.value)}
                      className="text-primary"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`w-3 h-3 rounded-full ${t.color}`} />
                      <span className="font-medium">{t.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Staff filter */}
            <div className="mb-8">
              <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Staff Members</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted p-2 rounded-lg transition-colors">
                  <input
                    type="radio"
                    name="staff"
                    value="all"
                    checked={selectedStaff === "all"}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="text-primary"
                  />
                  <span className="font-medium">All staff</span>
                </label>
                {staffMembers.map(s => (
                  <label key={s.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted p-2 rounded-lg transition-colors">
                    <input
                      type="radio"
                      name="staff"
                      value={String(s.id)}
                      checked={selectedStaff === String(s.id)}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                      className="text-primary"
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={`${s.color} text-white text-sm font-semibold`}>
                          {s.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.role}</div>
                      </div>
                      {!s.available && (
                        <Badge variant="destructive" className="ml-auto text-xs">Unavailable</Badge>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Enhanced Quick stats */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Staff Workload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {staffMembers.filter(s => s.available).map(s => (
                  <div key={s.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="text-muted-foreground">{s.currentInterviews}/{s.maxInterviewsPerDay}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          s.currentInterviews / s.maxInterviewsPerDay > 0.8 
                            ? 'bg-destructive' 
                            : s.currentInterviews / s.maxInterviewsPerDay > 0.6 
                            ? 'bg-warning' 
                            : 'bg-success'
                        }`}
                        style={{ width: `${Math.min((s.currentInterviews / s.maxInterviewsPerDay) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {currentView === "calendar" && (
            <div className="space-y-6">
              {/* Enhanced Calendar header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hover:bg-muted"
                    onClick={() => navigateWeek('prev')}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-2xl font-bold text-foreground">
                    {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – {weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hover:bg-muted"
                    onClick={() => navigateWeek('next')}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" className="text-sm bg-primary text-primary-foreground hover:bg-primary/90">Week</Button>
                  <Button variant="ghost" className="text-sm text-muted-foreground hover:text-foreground">Month</Button>
                </div>
              </div>

              {/* Enhanced Grid */}
              <Card className="border-border shadow-sm">
                <div className="grid grid-cols-5 border-b border-border">
                  {weekDates.map((date, i) => (
                    <div key={i} className="border-r border-border p-4 text-center last:border-r-0 bg-muted/50">
                      <div className="font-semibold text-muted-foreground">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="mt-1 text-2xl font-bold text-foreground">
                        {date.getDate()}
                      </div>
                      {date.toDateString() === new Date().toDateString() && (
                        <div className="mt-1">
                          <Badge variant="secondary" className="bg-info/10 text-info text-xs">
                            Today
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid min-h-[500px] grid-cols-5">
                  {weeklySlots.map((d, i) => (
                    <div key={i} className="border-r border-border p-3 last:border-r-0">
                      <div className="space-y-2">
                        {d.slots.map((slot, j) => (
                          <TooltipProvider key={`${i}-${j}`}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className={`w-full rounded-lg border-2 p-3 text-left transition-all duration-200 ${slotClasses(slot.type)} ${
                                    slot.type === "available" ? "hover:shadow-md hover:scale-[1.02]" : ""
                                  }`}
                                  onClick={() => slot.type === "available" && setShowBooking(true)}
                                >
                                  <div className="text-sm font-semibold text-foreground">{slot.time}</div>
                                  <div className="text-xs text-muted-foreground mb-2">{slot.staff}</div>
                                  {slot.applicant && (
                                    <div className="mb-2">
                                      <div className="text-xs font-medium text-foreground truncate">
                                        {slot.applicant}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {slot.interviewType} ({slot.duration}m)
                                      </div>
                                    </div>
                                  )}
                                  {slot.type === "available" && (
                                    <div className="text-xs text-success font-medium">Available</div>
                                  )}
                                  {slot.type === "break" && (
                                    <div className="text-xs text-warning font-medium">Break</div>
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="max-w-xs">
                                  <div className="font-medium">{slot.time}</div>
                                  <div className="text-sm text-muted-foreground">{slot.staff}</div>
                                  {slot.applicant && (
                                    <>
                                      <div className="font-medium mt-1">{slot.applicant}</div>
                                      <div className="text-sm">{slot.interviewType} ({slot.duration}m)</div>
                                    </>
                                  )}
                                  {slot.type === "available" && (
                                    <div className="text-success text-sm mt-1">Click to book</div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Enhanced Legend */}
              <div className="flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border-2 border-success/20 bg-success/10" />
                  <span className="text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border-2 border-border bg-muted" />
                  <span className="text-muted-foreground">Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border-2 border-border/60 bg-muted/80" />
                  <span className="text-muted-foreground">Blocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded border-2 border-warning/20 bg-warning/10" />
                  <span className="text-muted-foreground">Break</span>
                </div>
              </div>
            </div>
          )}

          {currentView === "today" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Today's Schedule — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h2>
                  <p className="text-muted-foreground mt-1">
                    {totalInterviews} interviews scheduled • {completedInterviews} completed • {inProgressInterviews} in progress
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search interviews..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64 border-border"
                    />
                  </div>
                  {highPriorityInterviews > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {highPriorityInterviews} High Priority
                    </Badge>
                  )}
                </div>
              </div>

              {/* Upcoming Interviews Alert */}
              {todaysInterviews.filter(i => i.status === "scheduled" && new Date(`2024-01-15 ${i.time}`) > new Date()).length > 0 && (
                <Card className="border-warning/20 bg-warning/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-warning" />
                      <div>
                        <h4 className="font-semibold text-warning">Upcoming Interviews</h4>
                        <p className="text-sm text-warning">
                          You have {todaysInterviews.filter(i => i.status === "scheduled" && new Date(`2024-01-15 ${i.time}`) > new Date()).length} interviews coming up today
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4">
                {filteredInterviews.map((iv) => {
                  const isUpcoming = iv.status === "scheduled" && new Date(`2024-01-15 ${iv.time}`) > new Date();
                  const isOverdue = iv.status === "scheduled" && new Date(`2024-01-15 ${iv.time}`) < new Date();
                  
                  return (
                    <Card 
                      key={iv.id} 
                      className={`border-border hover:shadow-md transition-all duration-200 ${
                        isUpcoming ? 'ring-2 ring-info/20' : ''
                      } ${
                        isOverdue ? 'ring-2 ring-destructive/20' : ''
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`p-3 rounded-lg ${
                              iv.status === "completed" ? "bg-success/10" :
                              iv.status === "in-progress" ? "bg-info/10" :
                              isOverdue ? "bg-destructive/10" :
                              "bg-muted"
                            }`}>
                              <Clock className={`h-6 w-6 ${
                                iv.status === "completed" ? "text-success" :
                                iv.status === "in-progress" ? "text-info" :
                                isOverdue ? "text-destructive" :
                                "text-muted-foreground"
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="text-xl font-bold text-foreground">{iv.time}</div>
                                <StatusBadge status={iv.status} />
                                <PriorityBadge priority={iv.priority} />
                                {isUpcoming && (
                                  <Badge variant="secondary" className="bg-info/10 text-info">
                                    Upcoming
                                  </Badge>
                                )}
                                {isOverdue && (
                                  <Badge variant="destructive">Overdue</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-6 mb-3">
                                <div className="flex items-center gap-2">
                                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-semibold text-foreground">{iv.applicant}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">{iv.program}</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">{iv.staff}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">{iv.type}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  <span>{iv.applicantEmail}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  <span>{iv.applicantPhone}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {(iv.status === "scheduled" || iv.status === "in-progress") && (
                              <Button className="gap-2 bg-primary hover:bg-primary/90">
                                <Video className="h-4 w-4" /> Join
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="hover:bg-muted">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:bg-muted">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {currentView === "manage" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Booking Management</h2>
                  <p className="text-muted-foreground mt-1">Manage all scheduled interviews and bookings</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search bookings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64 border-border"
                    />
                  </div>
                  <Button variant="outline" className="gap-2 border-border">
                    <Filter className="h-4 w-4" /> Filter
                  </Button>
                </div>
              </div>

              <Card className="border-border">
                <div className="border-b border-border px-6 py-4 bg-muted/50">
                  <div className="grid grid-cols-7 gap-4 text-sm font-semibold text-muted-foreground">
                    <div>Date & Time</div>
                    <div>Applicant</div>
                    <div>Type</div>
                    <div>Staff</div>
                    <div>Status</div>
                    <div>Priority</div>
                    <div>Actions</div>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {filteredInterviews.concat(filteredInterviews).map((iv, idx) => (
                    <div key={idx} className="px-6 py-4 hover:bg-muted/50 transition-colors">
                      <div className="grid grid-cols-7 items-center gap-4">
                        <div className="text-sm">
                          <div className="font-semibold text-foreground">{iv.date}</div>
                          <div className="text-muted-foreground">{iv.time}</div>
                        </div>
                        <div className="text-sm">
                          <div className="font-semibold text-foreground">{iv.applicant}</div>
                          <div className="text-muted-foreground">{iv.applicantEmail}</div>
                        </div>
                        <div className="text-sm">
                          <Badge variant="outline" className="border-border">
                            {iv.type}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium text-foreground">{iv.staff}</div>
                        </div>
                        <div><StatusBadge status={iv.status} /></div>
                        <div><PriorityBadge priority={iv.priority} /></div>
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-muted">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View details</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-muted">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit booking</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete booking</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {iv.status === "scheduled" && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted">
                                    <Video className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Join interview</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Enhanced Booking dialog */}
      <Dialog open={showBooking} onOpenChange={setShowBooking}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Schedule New Interview</DialogTitle>
                              <p className="text-muted-foreground">Fill in the details to schedule an interview</p>
          </DialogHeader>

          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="applicant" className="text-sm font-medium">Applicant name</Label>
                <Input id="applicant" placeholder="Full name" className="border-border" />
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-medium">Interview type</Label>
                <Select defaultValue={String(interviewTypes[0].id)}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewTypes.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${t.color}`} />
                          {t.name} ({t.duration} min)
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Staff member</Label>
                <Select defaultValue={String(staffMembers.find(s => s.available)?.id ?? staffMembers[0].id)}>
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.filter(s => s.available).map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${s.color}`} />
                          {s.name} - {s.role}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-medium">Priority</Label>
                <Select defaultValue="medium">
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input id="email" type="email" placeholder="applicant@example.com" className="border-border" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                <Input id="phone" type="tel" placeholder="+44 ..." className="border-border" />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
              <Input id="notes" placeholder="Optional notes about the interview" className="border-border" />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setShowBooking(false)} className="border-border">
              Cancel
            </Button>
            <Button onClick={() => setShowBooking(false)} className="bg-primary hover:bg-primary/90">
              Schedule Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}