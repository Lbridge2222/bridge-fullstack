// src/pages/crm/Enquiries.tsx
import React, { useMemo, useState } from "react";
import {
  Mail, MessageSquare, Phone, Instagram, Search, Star, Calendar, Send, MoreHorizontal,
  UserPlus, BookOpen, MapPin, Filter, Clock, User, FileText, Bot, Headphones,
  Users as UsersIcon, Target, TrendingUp, Archive, Trash2, Reply, Forward, RotateCcw,
  Tag as TagIcon, Flag, RefreshCw, Settings, Inbox, ExternalLink, AlertCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ChannelId =
  | "all"
  | "email"
  | "sms"
  | "whatsapp"
  | "webform"
  | "instagram"
  | "phone"
  | "ai-chat";

type Status = "unread" | "replied" | "in-progress" | "converted";
type Priority = "urgent" | "high" | "medium" | "low";

type Enquiry = {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  channel: Exclude<ChannelId, "all">;
  emailInbox?: string;
  source: string;
  timestamp: string; // humanised for now
  status: Status;
  priority: Priority;
  course: string;
  campus: string;
  tags: string[];
  sentiment: string;
  assignedTo: string;
  studentType: "prospective" | "current" | "admitted";
  lifecycleStage: string;
  isImportant: boolean;
  hasAttachments: boolean;
  threadCount: number;
};

const emailInboxes = [
  {
    id: "enquiries",
    label: "enquiries@waterbear.org.uk",
    displayName: "General Enquiries",
    count: 8,
    type: "initial",
    color: "bg-muted text-muted-foreground border-border",
    description: "Initial course inquiries, prospectus requests",
    autoRules: ["First-time visitors", "Course information requests"],
  },
  {
    id: "reception",
    label: "reception@waterbear.org.uk",
    displayName: "Reception",
    count: 3,
    type: "general",
    color: "bg-muted text-muted-foreground border-border",
    description: "General questions, campus visits, open days",
    autoRules: ["Campus tours", "General information", "Phone inquiries"],
  },
  {
    id: "admissions",
    label: "admissions@waterbear.org.uk",
    displayName: "Admissions Pipeline",
    count: 12,
    type: "pipeline",
    color: "bg-muted text-muted-foreground border-border",
    description: "Application pipeline, offers, visa help",
    autoRules: ["Active applicants", "Offer management", "Visa queries"],
  },
  {
    id: "info",
    label: "info@waterbear.org.uk",
    displayName: "Information",
    count: 2,
    type: "general",
    color: "bg-muted text-muted-foreground border-border",
    description: "Course information, parent inquiries",
    autoRules: ["Course details", "Parent questions", "Fee information"],
  },
  {
    id: "support",
    label: "support@waterbear.org.uk",
    displayName: "Student Support",
    count: 4,
    type: "current",
    color: "bg-muted text-muted-foreground border-border",
    description: "Current student technical/academic support",
    autoRules: ["Technical issues", "Academic support", "Enrolled students"],
  },
];

const channels: { id: ChannelId; label: string; icon: React.ComponentType<any>; count: number; color: string }[] = [
  { id: "all", label: "All Channels", icon: UsersIcon, count: 47, color: "bg-muted text-muted-foreground border-border" },
  { id: "email", label: "Email Inboxes", icon: Mail, count: 29, color: "bg-muted text-muted-foreground border-border" },
  { id: "sms", label: "SMS", icon: MessageSquare, count: 8, color: "bg-muted text-muted-foreground border-border" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, count: 6, color: "bg-muted text-muted-foreground border-border" },
  { id: "webform", label: "Web Forms", icon: FileText, count: 3, color: "bg-muted text-muted-foreground border-border" },
  { id: "instagram", label: "Instagram", icon: Instagram, count: 1, color: "bg-muted text-muted-foreground border-border" },
  { id: "phone", label: "Callbacks", icon: Phone, count: 0, color: "bg-muted text-muted-foreground border-border" },
  { id: "ai-chat", label: "AI Chat", icon: Bot, count: 0, color: "bg-info/10 text-info border-info/20" },
];

const enquiriesSeed: Enquiry[] = [
  {
    id: 1,
    name: "Sarah Chen",
    email: "sarah.chen@email.com",
    phone: "+44 7423 567 890",
    subject: "Music Production Course Inquiry - Entry Requirements",
    message:
      "Hi! I'm really interested in your Music Production course starting September 2025. Could you send me information about entry requirements and fees? I have some experience with Logic Pro but I'm a complete beginner with mixing and mastering. Also, do you offer any foundation courses?",
    channel: "email",
    emailInbox: "enquiries",
    source: "enquiries@waterbear.org.uk",
    timestamp: "12 mins ago",
    status: "unread",
    priority: "high",
    course: "Music Production",
    campus: "Brighton",
    tags: ["course-enquiry", "entry-requirements", "fees", "foundation"],
    sentiment: "enthusiastic",
    assignedTo: "unassigned",
    studentType: "prospective",
    lifecycleStage: "initial-enquiry",
    isImportant: false,
    hasAttachments: false,
    threadCount: 1,
  },
  {
    id: 2,
    name: "Marcus Johnson",
    email: "m.johnson@student.waterbear.org.uk",
    phone: "+44 7412 345 678",
    subject: "URGENT: Course Transfer Request - Academic Guidance Needed",
    message:
      "Hi Admissions Team, I'm currently enrolled in Audio Engineering (2nd year, Student ID: WB24789) but I'm really struggling with the technical mathematics side. I'm much better at the creative and business aspects of music. Is it possible to transfer to Music Business for my final year? What would be the process and implications for my graduation timeline? I'm quite worried about this affecting my student loan. Can someone please call me today?",
    channel: "email",
    emailInbox: "admissions",
    source: "admissions@waterbear.org.uk",
    timestamp: "1 hour ago",
    status: "in-progress",
    priority: "urgent",
    course: "Audio Engineering → Music Business",
    campus: "Sheffield",
    tags: ["course-transfer", "current-student", "academic-guidance", "urgent"],
    sentiment: "anxious",
    assignedTo: "Emma Thompson",
    studentType: "current",
    lifecycleStage: "enrolled",
    isImportant: true,
    hasAttachments: false,
    threadCount: 3,
  },
  {
    id: 3,
    name: "Isabella Rodriguez",
    email: "bella.music@gmail.com",
    phone: "+44 7434 789 012",
    subject: "VISA DEADLINE APPROACHING - Financial Documentation Clarification",
    message:
      "Hello Admissions Team! I'm Isabella Rodriguez from Spain (Application Ref: WB25-MP-1127) and I just received my conditional offer for Music Performance starting September 2025 - thank you! I'm now at the visa application stage but I'm confused about the financial documentation requirements. Do I need bank statements from my parents OR can I use my own savings account? My visa appointment is next Tuesday (8 days away).",
    channel: "email",
    emailInbox: "admissions",
    source: "admissions@waterbear.org.uk",
    timestamp: "2 hours ago",
    status: "unread",
    priority: "urgent",
    course: "Music Performance",
    campus: "Brighton",
    tags: ["visa-urgent", "international-student", "financial-docs", "deadline"],
    sentiment: "stressed",
    assignedTo: "unassigned",
    studentType: "admitted",
    lifecycleStage: "pre-enrollment",
    isImportant: true,
    hasAttachments: true,
    threadCount: 1,
  },
  {
    id: 4,
    name: "Jamie Thompson",
    email: "jamie.t@gmail.com",
    phone: "+44 7445 123 456",
    subject: "Open Day Dates - Family Visit Planning",
    message:
      "Hi there! I just saw your advert on Instagram and I'm really interested in visiting your Brighton campus. When are your next open days? Are parents welcome? Do you provide parking on campus?",
    channel: "email",
    emailInbox: "reception",
    source: "reception@waterbear.org.uk",
    timestamp: "4 hours ago",
    status: "replied",
    priority: "medium",
    course: "General Interest",
    campus: "Brighton",
    tags: ["open-day", "campus-visit", "parents", "parking"],
    sentiment: "curious",
    assignedTo: "Sarah Jones",
    studentType: "prospective",
    lifecycleStage: "awareness",
    isImportant: false,
    hasAttachments: false,
    threadCount: 2,
  },
  {
    id: 5,
    name: "Alex Kim",
    email: "a.kim@student.waterbear.org.uk",
    phone: "+44 7456 789 123",
    subject: "Studio Booking System Error - Project Deadline This Week",
    message:
      "Hi Support Team, I'm Alex Kim, 2nd year Music Production student. The portal shows 'no slots available' though classmates can see availability. Tried different browsers and cleared cache. Deadline Friday.",
    channel: "email",
    emailInbox: "support",
    source: "support@waterbear.org.uk",
    timestamp: "6 hours ago",
    status: "unread",
    priority: "high",
    course: "Music Production",
    campus: "Sheffield",
    tags: ["technical-support", "studio-booking", "urgent-deadline", "system-error"],
    sentiment: "frustrated",
    assignedTo: "unassigned",
    studentType: "current",
    lifecycleStage: "enrolled",
    isImportant: false,
    hasAttachments: true,
    threadCount: 1,
  },
];

function statusBadgeClasses(status: Status) {
  switch (status) {
    case "unread":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "replied":
      return "bg-success/10 text-success border-success/20";
    case "in-progress":
      return "bg-warning/10 text-warning border-warning/20";
    case "converted":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function priorityIconTint(priority: Priority) {
  switch (priority) {
    case "urgent":
      return "text-destructive";
    case "high":
      return "text-warning";
    case "medium":
      return "text-muted-foreground";
    case "low":
      return "text-success";
    default:
      return "text-muted-foreground";
  }
}

function channelIcon(id: ChannelId | Enquiry["channel"]) {
  const map: Record<string, React.ComponentType<any>> = {
    email: Mail,
    sms: MessageSquare,
    whatsapp: MessageSquare,
    webform: FileText,
    instagram: Instagram,
    phone: Phone,
    "ai-chat": Bot,
  };
  return (map[id] ?? Mail);
}

export default function ConversationsPage() {
  const [activeChannel, setActiveChannel] = useState<ChannelId>("all");
  const [activeEmailInbox, setActiveEmailInbox] = useState<string>("all-email");
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"comfortable" | "compact" | "cozy">("comfortable");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [showAIInsights, setShowAIInsights] = useState(true);

  const enquiries = enquiriesSeed;

  const filteredEnquiries = useMemo(() => {
    let filtered = enquiries;

    if (activeChannel === "email") {
      filtered = filtered.filter((e) => e.channel === "email");
      if (activeEmailInbox !== "all-email") {
        filtered = filtered.filter((e) => e.emailInbox === activeEmailInbox);
      }
    } else if (activeChannel !== "all") {
      filtered = filtered.filter((e) => e.channel === activeChannel);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          e.course.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((e) => e.priority === priorityFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    const order: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    return [...filtered].sort((a, b) => {
      if (order[a.priority] !== order[b.priority]) return order[b.priority] - order[a.priority];
      // crude sort for demo (timestamps are human strings)
      return a.id < b.id ? 1 : -1;
    });
  }, [activeChannel, activeEmailInbox, searchTerm, priorityFilter, statusFilter]);

  const toggleSelect = (id: number) => {
    const next = new Set(selectedItems);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedItems(next);
  };
  const selectAllVisible = () => {
    if (selectedItems.size === filteredEnquiries.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(filteredEnquiries.map((e) => e.id)));
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Target className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Conversations</h1>
                <p className="text-sm text-muted-foreground">Multi-channel communication centre</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">2.3h</span>
                <span className="text-muted-foreground">avg response</span>
              </div>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">+ Manual Entry</Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          {/* Channels */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Communication Channels</CardTitle>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Office 365 Connected • All integrations active
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {channels.map((c) => {
                  const Icon = c.icon;
                  const active = activeChannel === c.id;
                  return (
                    <Button
                      key={c.id}
                      variant={active ? "secondary" : "outline"}
                      className={`h-auto flex flex-col items-center py-3 transition-all duration-200 ${
                        active 
                          ? "border-border bg-muted shadow-sm" 
                          : "border-border hover:border-border/80 hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        setActiveChannel(c.id);
                        if (c.id === "email") setActiveEmailInbox("all-email");
                      }}
                    >
                      <span className={`p-2 rounded-lg mb-2 ${c.color} transition-colors duration-200`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                      {c.count > 0 && (
                        <Badge 
                          className="mt-1" 
                          variant={c.count > 10 ? "destructive" : "secondary"}
                        >
                          {c.count}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>

              {activeChannel === "email" && (
                <div className="rounded-lg border border-border bg-muted/50 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Office 365 Shared Mailboxes
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <ExternalLink className="h-3 w-3" />
                      Synced 2 mins ago
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
                    <Button
                      variant={activeEmailInbox === "all-email" ? "default" : "outline"}
                      className="col-span-1 justify-between"
                      onClick={() => setActiveEmailInbox("all-email")}
                    >
                      <span className="flex items-center gap-2">
                        <Inbox className="h-4 w-4" />
                        All Inboxes
                      </span>
                      <Badge variant={activeEmailInbox === "all-email" ? "secondary" : "outline"}>
                        {emailInboxes.reduce((sum, i) => sum + i.count, 0)}
                      </Badge>
                    </Button>

                    {emailInboxes.map((ibox) => (
                      <Button
                        key={ibox.id}
                        variant={activeEmailInbox === ibox.id ? "default" : "outline"}
                        className="flex flex-col items-start gap-2 h-auto py-3"
                        onClick={() => setActiveEmailInbox(ibox.id)}
                      >
                        <span className={`text-xs px-2 py-0.5 rounded ${activeEmailInbox === ibox.id ? "bg-primary text-primary-foreground" : ibox.color}`}>
                          {ibox.type}
                        </span>
                        <div className="text-left">
                          <div className="text-xs font-medium">{ibox.displayName}</div>
                          <div className="text-xs text-muted-foreground">{ibox.label}</div>
                        </div>
                        <Badge className="ml-auto">{ibox.count}</Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                  <Send className="h-4 w-4 mr-2" />Compose New
                </Button>
                <Button className="bg-success hover:bg-success/90 text-success-foreground shadow-sm">
                  <UserPlus className="h-4 w-4 mr-2" />Convert to Lead
                </Button>
                <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-sm">
                  <Calendar className="h-4 w-4 mr-2" />Schedule Meeting
                </Button>
                <Button className="bg-info hover:bg-info/90 text-info-foreground shadow-sm">
                  <Bot className="h-4 w-4 mr-2" />AI Suggested Replies
                </Button>
                <Button variant="outline" className="border-border text-muted-foreground hover:bg-muted">
                  <RotateCcw className="h-4 w-4 mr-2" />Auto-Follow Up
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Show AI Insights Button */}
          {!showAIInsights && (
            <Card className="border-dashed border-border bg-muted/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowAIInsights(true)}
                    className="border-border text-foreground hover:bg-muted"
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Show AI Insights
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          {showAIInsights && (
            <Card className="border-info/20 bg-gradient-to-r from-info/5 to-info/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-info/10 rounded-lg">
                      <Bot className="h-5 w-5 text-info" />
                    </div>
                    <CardTitle className="text-base text-info">AI Insights & Recommendations</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAIInsights(false)}
                    className="text-info hover:text-info/80 hover:bg-info/10"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-card rounded-lg border border-info/20 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium text-foreground">Urgent Attention Needed</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">3 high-priority enquiries require immediate response</p>
                    <Button size="sm" className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs">
                      View Urgent Items
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-card rounded-lg border border-info/20 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium text-foreground">Conversion Opportunity</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">AI predicts 67% conversion rate for current leads</p>
                    <Button size="sm" className="w-full bg-success hover:bg-success/90 text-success-foreground text-xs">
                      Optimize Pipeline
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-card rounded-lg border border-info/20 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-warning" />
                      <span className="text-sm font-medium text-foreground">Response Time Alert</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">5 enquiries approaching SLA breach</p>
                    <Button size="sm" className="w-full bg-warning hover:bg-warning/90 text-warning-foreground text-xs">
                      Address SLA
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search + filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 border-input focus:border-ring focus:ring-ring"
                      placeholder={`Search in ${
                        activeChannel === "email" && activeEmailInbox !== "all-email"
                          ? emailInboxes.find((i) => i.id === activeEmailInbox)?.displayName
                          : activeChannel === "email"
                          ? "all email inboxes"
                          : activeChannel === "all"
                          ? "all channels"
                          : channels.find((c) => c.id === activeChannel)?.label
                      }...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={priorityFilter} onValueChange={(v: any) => setPriorityFilter(v)}>
                    <SelectTrigger className="w-[140px] border-input text-foreground">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="w-[140px] border-input text-foreground">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="replied">Replied</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" className="border-input text-foreground hover:bg-muted">
                    <User className="h-4 w-4 mr-2" />Assigned
                  </Button>
                  <Button variant="outline" className="border-input text-foreground hover:bg-muted">
                    <TagIcon className="h-4 w-4 mr-2" />Labels
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Toolbar */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedItems.size === filteredEnquiries.length && filteredEnquiries.length > 0}
                    onCheckedChange={selectAllVisible}
                  />
                  <Separator orientation="vertical" className="mx-2 h-6" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon"><Archive className="h-4 w-4" /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Archive</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon"><Flag className="h-4 w-4" /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark as spam</TooltipContent>
                  </Tooltip>
                  <Separator orientation="vertical" className="mx-2 h-6" />
                  <Button variant="ghost" size="icon"><RefreshCw className="h-4 w-4" /></Button>

                  {selectedItems.size > 0 && (
                    <>
                      <Separator orientation="vertical" className="mx-2 h-6" />
                      <span className="text-sm text-muted-foreground font-medium">{selectedItems.size} selected</span>
                      <Select>
                        <SelectTrigger className="w-[140px] ml-2">
                          <SelectValue placeholder="Bulk Actions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="assign">Assign to Staff</SelectItem>
                          <SelectItem value="priority">Change Priority</SelectItem>
                          <SelectItem value="status">Change Status</SelectItem>
                          <SelectItem value="tags">Add Tags</SelectItem>
                          <SelectItem value="archive">Archive Selected</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="View mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="cozy">Cozy</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {filteredEnquiries.length} enquiries
                {activeChannel === "email" && activeEmailInbox !== "all-email" &&
                  ` in ${emailInboxes.find((i) => i.id === activeEmailInbox)?.displayName}`}
                {activeChannel !== "all" && activeChannel !== "email" &&
                  ` in ${channels.find((c) => c.id === activeChannel)?.label}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-6 text-sm text-muted-foreground px-2 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  <span className="font-medium">{filteredEnquiries.filter((e) => e.status === "unread").length}</span>
                  <span>unread</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  <span className="font-medium">{filteredEnquiries.filter((e) => e.status === "in-progress").length}</span>
                  <span>in progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  <span className="font-medium">{filteredEnquiries.filter((e) => e.priority === "urgent").length}</span>
                  <span>urgent</span>
                </div>
              </div>

              <Separator className="mb-2" />

              <ScrollArea className="max-h-[60vh]">
                <div className="divide-y">
                  {filteredEnquiries.map((enq) => {
                    const Icon = channelIcon(enq.channel);
                    const inboxColor =
                      enq.channel === "email"
                        ? emailInboxes.find((i) => i.id === enq.emailInbox)?.color ?? "bg-blue-100 text-blue-800"
                        : channels.find((c) => c.id === enq.channel)?.color ?? "bg-gray-100";

                    return (
                      <div
                        key={enq.id}
                        className={`group cursor-pointer hover:bg-muted/80 transition-colors duration-200 border-l-4 border-transparent hover:border-l-border`}
                        onClick={() => setSelectedEnquiry(enq)}
                      >
                        <div className="flex items-start gap-3 p-4">
                          <Checkbox
                            checked={selectedItems.has(enq.id)}
                            onCheckedChange={() => toggleSelect(enq.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                            className={`${enq.isImportant ? "text-warning" : "text-muted-foreground"}`}
                          >
                            <Star className="h-4 w-4" fill={enq.isImportant ? "currentColor" : "none"} />
                          </Button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className={`p-1.5 rounded ${inboxColor}`}>
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className={`font-semibold ${enq.status === "unread" ? "" : "text-muted-foreground"}`}>
                                {enq.name}
                              </span>
                              {enq.channel === "email" && (
                                <Badge variant="outline">
                                  {emailInboxes.find((i) => i.id === enq.emailInbox)?.displayName}
                                </Badge>
                              )}
                              {enq.threadCount > 1 && (
                                <Badge variant="secondary">{enq.threadCount} messages</Badge>
                              )}

                              <Badge variant="outline" className={`border ${statusBadgeClasses(enq.status)}`}>
                                {enq.status.replace("-", " ")}
                              </Badge>
                              {enq.priority === "urgent" && (
                                <Badge variant="destructive" className="animate-pulse">URGENT</Badge>
                              )}
                              {enq.priority === "high" && (
                                <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">HIGH</Badge>
                              )}
                              <div className="flex items-center gap-1">
                                <Star className={`h-4 w-4 ${priorityIconTint(enq.priority)}`} fill="currentColor" />
                                <span className="text-xs text-muted-foreground capitalize">{enq.priority}</span>
                              </div>
                            </div>

                            <div className={`font-medium text-foreground ${enq.status === "unread" ? "" : "text-muted-foreground"}`}>
                              {enq.subject} {enq.hasAttachments && <span className="text-muted-foreground ml-1">📎</span>}
                            </div>

                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {enq.message}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline" className="gap-1 border-border text-muted-foreground bg-muted/50">
                                <BookOpen className="h-3 w-3" />
                                {enq.course}
                              </Badge>
                              <Badge variant="outline" className="gap-1 border-border text-muted-foreground bg-muted/50">
                                <MapPin className="h-3 w-3" />
                                {enq.campus}
                              </Badge>
                              <Badge variant="secondary" className="capitalize bg-muted text-foreground">
                                {enq.studentType}
                              </Badge>
                              {enq.tags.slice(0, 3).map((t) => (
                                <Badge key={t} variant="outline" className="border-border text-muted-foreground bg-muted/50">#{t}</Badge>
                              ))}
                              {enq.tags.length > 3 && (
                                <Badge variant="outline" className="border-border text-muted-foreground bg-muted/50">+{enq.tags.length - 3} more</Badge>
                              )}
                            </div>
                          </div>

                          <div className="min-w-[160px] text-right text-sm text-muted-foreground">
                            <div className="flex items-center gap-1 justify-end">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{enq.timestamp}</span>
                            </div>
                            <div className="mt-1 text-xs font-medium">
                              {enq.assignedTo !== "unassigned" ? (
                                <span className="text-foreground">Assigned: {enq.assignedTo}</span>
                              ) : (
                                <span className="text-destructive">Unassigned</span>
                              )}
                            </div>

                            <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 flex gap-1 justify-end">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => e.stopPropagation()}
                                className="hover:bg-muted text-muted-foreground hover:text-foreground"
                              >
                                <Reply className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => e.stopPropagation()}
                                className="hover:bg-muted text-muted-foreground hover:text-foreground"
                              >
                                <Forward className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => e.stopPropagation()}
                                className="hover:bg-muted text-muted-foreground hover:text-foreground"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => e.stopPropagation()}
                                className="hover:bg-muted text-muted-foreground hover:text-foreground"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Detail Dialog */}
        <Dialog open={!!selectedEnquiry} onOpenChange={(open) => !open && setSelectedEnquiry(null)}>
          <DialogContent className="max-w-4xl">
            {selectedEnquiry && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedEnquiry.name}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium mb-3 text-foreground">Contact Information</div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{selectedEnquiry.email}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{selectedEnquiry.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{selectedEnquiry.course}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{selectedEnquiry.campus}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-3 text-foreground">Enquiry Details</div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`w-fit border ${statusBadgeClasses(selectedEnquiry.status as Status)}`}>
                          {selectedEnquiry.status.replace("-", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <Star className={`h-4 w-4 ${priorityIconTint(selectedEnquiry.priority as Priority)}`} fill="currentColor" />
                        <span className="capitalize text-foreground">{selectedEnquiry.priority} priority</span>
                      </div>
                      <div className="p-2 bg-muted rounded-lg">
                        <span className="text-muted-foreground">Student Type: </span>
                        <span className="capitalize font-medium text-foreground">{selectedEnquiry.studentType}</span>
                      </div>
                      <div className="p-2 bg-muted rounded-lg">
                        <span className="text-muted-foreground">Lifecycle: </span>
                        <span className="capitalize font-medium text-foreground">{selectedEnquiry.lifecycleStage}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="text-sm">
                  <div className="font-medium mb-3 text-foreground text-base">{selectedEnquiry.subject}</div>
                  <Card className="bg-muted border-border">
                    <CardContent className="p-4">
                      <p className="text-foreground leading-relaxed">{selectedEnquiry.message}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-medium mb-2 text-foreground">Tags & Categories</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedEnquiry.tags.map((t) => (
                      <Badge key={t} variant="outline" className="border-border text-foreground bg-muted">#{t}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                    <Send className="h-4 w-4 mr-2" />Reply via {selectedEnquiry.channel === "email"
                      ? emailInboxes.find((i) => i.id === selectedEnquiry.emailInbox)?.displayName
                      : selectedEnquiry.channel}
                  </Button>
                  <Button className="bg-success hover:bg-success/90 text-success-foreground shadow-sm">
                    <UserPlus className="h-4 w-4 mr-2" />Convert to Lead
                  </Button>
                  <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-sm">
                    <Calendar className="h-4 w-4 mr-2" />Schedule Callback
                  </Button>
                  <Button className="bg-info hover:bg-info/90 text-info-foreground shadow-sm">
                    <Headphones className="h-4 w-4 mr-2" />Assign to Specialist
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}