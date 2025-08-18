import React, { useState, useMemo } from "react";
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Search,
  Filter,
  MoreVertical,
  Download,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  MessageSquare,
  Edit3,
  Play,
  Headphones,
  Brain,
  TrendingUp,
  BarChart3,
  Mic,
  Zap,
  Target,
  Filter as FilterIcon,
  X,
  Star,
  Clock3,
  PhoneForwarded,
  Voicemail,
  MessageCircle,
  FileText,
  Settings,
  RefreshCw,
} from "lucide-react";

type CallType = "incoming" | "outgoing" | "missed";
type CallStatus = "completed" | "missed" | "voicemail" | "busy" | "transferred" | "conference";
type CallPriority = "low" | "medium" | "high" | "urgent";
type CallSentiment = "positive" | "neutral" | "negative" | "mixed";

type CallItem = {
  id: number;
  contact: string;
  phone: string;
  type: CallType;
  duration: string;
  timestamp: string;
  status: CallStatus;
  notes: string;
  studentId: string;
  callPurpose:
    | "admissions_inquiry"
    | "parent_inquiry"
    | "application_status"
    | "interview_prep"
    | "academic_inquiry"
    | "scholarship_info"
    | "general_inquiry"
    | "technical_support"
    | "billing_inquiry";
  recording: boolean;
  // AI-Enhanced Fields
  aiInsights?: {
    sentiment: CallSentiment;
    sentimentScore: number; // 0-100
    keyTopics: string[];
    actionItems: string[];
    followUpPriority: CallPriority;
    callQualityScore: number; // 0-100
    transcription?: string;
    summary?: string;
  };
  // Enhanced Metadata
  priority: CallPriority;
  tags: string[];
  assignedTo?: string;
  followUpDate?: string;
  callOutcome?: "successful" | "needs_followup" | "escalated" | "resolved";
  relatedCalls: number[];
  cost?: number;
  location?: string;
  device?: string;
};

const CallLogs: React.FC = () => {
  const [selectedCalls, setSelectedCalls] = useState<number[]>([]);
  const [showNotes, setShowNotes] = useState<Record<number, boolean>>({});
  const [viewMode, setViewMode] = useState<"list" | "analytics" | "ai-insights" | "templates">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<{
    status: CallStatus[];
    type: CallType[];
    priority: CallPriority[];
    purpose: string[];
    sentiment: CallSentiment[];
  }>({
    status: [],
    type: [],
    priority: [],
    purpose: [],
    sentiment: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnalysisType, setAiAnalysisType] = useState<"sentiment" | "quality" | "summary" | "action-items">("sentiment");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const callLogs: CallItem[] = [
    {
      id: 1,
      contact: "Emma Thompson",
      phone: "+1 (555) 234-5678",
      type: "outgoing",
      duration: "12:34",
      timestamp: "2025-08-13 14:30",
      status: "completed",
      notes:
        "Discussed program requirements and financial aid options. Student is very interested in the Jazz Performance program. Scheduled follow-up for next week.",
      studentId: "STU001",
      callPurpose: "admissions_inquiry",
      recording: true,
      priority: "high",
      tags: ["admissions", "financial-aid", "jazz-performance"],
      relatedCalls: [2, 5],
      callOutcome: "successful",
      aiInsights: {
        sentiment: "positive",
        sentimentScore: 85,
        keyTopics: ["program requirements", "financial aid", "jazz performance"],
        actionItems: ["Schedule follow-up call", "Send financial aid packet"],
        followUpPriority: "high",
        callQualityScore: 92,
        summary: "Student showed strong interest in Jazz Performance program. Discussed requirements and financial options. Follow-up scheduled."
      }
    },
    {
      id: 2,
      contact: "David Park",
      phone: "+1 (555) 345-6789",
      type: "incoming",
      duration: "8:12",
      timestamp: "2025-08-13 11:45",
      status: "completed",
      notes:
        "Parent inquiry about student housing options and meal plans. Provided information packet and contact for housing office.",
      studentId: "STU002",
      callPurpose: "parent_inquiry",
      recording: true,
      priority: "medium",
      tags: ["housing", "meal-plans", "parent-inquiry"],
      relatedCalls: [1],
      callOutcome: "successful",
      aiInsights: {
        sentiment: "neutral",
        sentimentScore: 65,
        keyTopics: ["student housing", "meal plans", "information packet"],
        actionItems: ["Send housing information", "Connect with housing office"],
        followUpPriority: "medium",
        callQualityScore: 88,
        summary: "Parent inquired about practical matters. Information provided and connections made."
      }
    },
    {
      id: 3,
      contact: "Lisa Wang",
      phone: "+1 (555) 567-8901",
      type: "missed",
      duration: "0:00",
      timestamp: "2025-08-13 09:20",
      status: "missed",
      notes: "Follow-up needed - application status inquiry",
      studentId: "STU003",
      callPurpose: "application_status",
      recording: false,
      priority: "urgent",
      tags: ["missed-call", "application-status", "follow-up-needed"],
      relatedCalls: [],
      callOutcome: "needs_followup",
      followUpDate: "2025-08-14",
      aiInsights: {
        sentiment: "neutral",
        sentimentScore: 50,
        keyTopics: ["application status", "follow-up needed"],
        actionItems: ["Call back student", "Check application status"],
        followUpPriority: "urgent",
        callQualityScore: 0,
        summary: "Missed call requiring immediate follow-up for application status inquiry."
      }
    },
    {
      id: 4,
      contact: "Michael Johnson",
      phone: "+1 (555) 456-7890",
      type: "outgoing",
      duration: "15:47",
      timestamp: "2025-08-12 16:15",
      status: "completed",
      notes:
        "Interview scheduling and preparation discussion. Went over portfolio requirements and what to expect during the audition process.",
      studentId: "STU004",
      callPurpose: "interview_prep",
      recording: true,
      priority: "high",
      tags: ["interview", "portfolio", "audition", "preparation"],
      relatedCalls: [],
      callOutcome: "successful",
      aiInsights: {
        sentiment: "positive",
        sentimentScore: 78,
        keyTopics: ["interview scheduling", "portfolio requirements", "audition process"],
        actionItems: ["Send portfolio guidelines", "Confirm interview date"],
        followUpPriority: "high",
        callQualityScore: 95,
        summary: "Comprehensive interview preparation call covering all requirements and expectations."
      }
    },
    {
      id: 5,
      contact: "Sarah Chen",
      phone: "+1 (555) 987-6543",
      type: "incoming",
      duration: "6:23",
      timestamp: "2025-08-12 13:20",
      status: "completed",
      notes:
        "Questions about course curriculum and faculty. Transferred to academic advisor for detailed discussion.",
      studentId: "STU005",
      callPurpose: "academic_inquiry",
      recording: false,
      priority: "medium",
      tags: ["curriculum", "faculty", "academic-advisor"],
      relatedCalls: [1],
      callOutcome: "escalated",
      aiInsights: {
        sentiment: "neutral",
        sentimentScore: 60,
        keyTopics: ["course curriculum", "faculty information", "academic advisor"],
        actionItems: ["Follow up with academic advisor", "Send curriculum details"],
        followUpPriority: "medium",
        callQualityScore: 82,
        summary: "Student had specific academic questions requiring advisor expertise."
      }
    },
    {
      id: 6,
      contact: "James Rodriguez",
      phone: "+1 (555) 123-4567",
      type: "outgoing",
      duration: "4:56",
      timestamp: "2025-08-12 10:30",
      status: "voicemail",
      notes:
        "Left voicemail about scholarship opportunity deadline. Will follow up with email.",
      studentId: "STU006",
      callPurpose: "scholarship_info",
      recording: false,
      priority: "high",
      tags: ["scholarship", "deadline", "voicemail"],
      relatedCalls: [],
      callOutcome: "needs_followup",
      followUpDate: "2025-08-13",
      aiInsights: {
        sentiment: "neutral",
        sentimentScore: 55,
        keyTopics: ["scholarship opportunity", "deadline", "follow-up"],
        actionItems: ["Send email follow-up", "Check scholarship status"],
        followUpPriority: "high",
        callQualityScore: 75,
        summary: "Voicemail left about time-sensitive scholarship opportunity requiring email follow-up."
      }
    },
  ];

  const handleSelectCall = (callId: number) => {
    setSelectedCalls((prev) =>
      prev.includes(callId) ? prev.filter((id) => id !== callId) : [...prev, callId]
    );
  };

  const toggleNotes = (callId: number) => {
    setShowNotes((prev) => ({ ...prev, [callId]: !prev[callId] }));
  };

  const getCallIcon = (type: CallType, status: CallStatus) => {
    if (status === "missed") return <PhoneMissed className="text-destructive" size={20} />;
    if (type === "outgoing") return <PhoneOutgoing className="text-info" size={20} />;
    if (type === "incoming") return <PhoneIncoming className="text-success" size={20} />;
    return <Phone className="text-muted-foreground" size={20} />;
  };

  const getStatusColor = (status: CallStatus) => {
    switch (status) {
      case "completed":
        return "status-success-bg text-success border-status-success-border";
      case "missed":
        return "status-error-bg text-destructive border-status-error-border";
      case "voicemail":
        return "status-warning-bg text-warning border-status-warning-border";
      case "busy":
        return "status-warning-bg text-warning border-status-warning-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getTypeColor = (type: CallType) => {
    switch (type) {
      case "outgoing":
        return "status-info-bg text-info border-status-info-border";
      case "incoming":
        return "status-success-bg text-success border-status-success-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getPriorityColor = (priority: CallPriority) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "high":
        return "bg-warning/10 text-warning border-warning/20";
      case "medium":
        return "bg-info/10 text-info border-info/20";
      case "low":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getSentimentColor = (sentiment: CallSentiment) => {
    switch (sentiment) {
      case "positive":
        return "bg-success/10 text-success border-success/20";
      case "negative":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "mixed":
        return "bg-warning/10 text-warning border-warning/20";
      case "neutral":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  // AI-Powered Analysis Functions
  const analyzeCallSentiment = async (callId: number) => {
    setIsAnalyzing(true);
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsAnalyzing(false);
    // In real implementation, this would call your AI service
    console.log(`Analyzing sentiment for call ${callId}`);
  };

  const generateCallSummary = async (callId: number) => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsAnalyzing(false);
    console.log(`Generating summary for call ${callId}`);
  };

  const suggestActionItems = async (callId: number) => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsAnalyzing(false);
    console.log(`Suggesting actions for call ${callId}`);
  };

  // Enhanced Filtering and Search
  const filteredCalls = useMemo(() => {
    return callLogs.filter(call => {
      const matchesSearch = call.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           call.phone.includes(searchQuery) ||
                           call.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           call.studentId.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = activeFilters.status.length === 0 || activeFilters.status.includes(call.status);
      const matchesType = activeFilters.type.length === 0 || activeFilters.type.includes(call.type);
      const matchesPriority = activeFilters.priority.length === 0 || activeFilters.priority.includes(call.priority);
      const matchesPurpose = activeFilters.purpose.length === 0 || activeFilters.purpose.includes(call.callPurpose);
      const matchesSentiment = activeFilters.sentiment.length === 0 || 
        (call.aiInsights && activeFilters.sentiment.includes(call.aiInsights.sentiment));

      return matchesSearch && matchesStatus && matchesType && matchesPriority && matchesPurpose && matchesSentiment;
    });
  }, [callLogs, searchQuery, activeFilters]);

  // Analytics Calculations
  const analytics = useMemo(() => {
    const total = callLogs.length;
    const completed = callLogs.filter(c => c.status === "completed").length;
    const missed = callLogs.filter(c => c.status === "missed").length;
    const urgent = callLogs.filter(c => c.priority === "urgent").length;
    const highPriority = callLogs.filter(c => c.priority === "high").length;
    
    const avgSentiment = callLogs
      .filter(c => c.aiInsights)
      .reduce((acc, c) => acc + (c.aiInsights?.sentimentScore || 0), 0) / 
      callLogs.filter(c => c.aiInsights).length;
    
    const avgQuality = callLogs
      .filter(c => c.aiInsights)
      .reduce((acc, c) => acc + (c.aiInsights?.callQualityScore || 0), 0) / 
      callLogs.filter(c => c.aiInsights).length;

    return {
      total,
      completed,
      missed,
      urgent,
      highPriority,
      avgSentiment: Math.round(avgSentiment),
      avgQuality: Math.round(avgQuality),
      connectionRate: Math.round((completed / total) * 100)
    };
  }, [callLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Call Logs</h1>
          <p className="text-muted-foreground">
            AI-powered phone interaction history and call management via Twilio integration
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
          >
            <Brain size={16} />
            AI Analysis
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground">
            <Download size={16} />
            Export Logs
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <PhoneCall size={16} />
            Make Call
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex space-x-1 p-1 bg-muted rounded-lg w-fit">
        {[
          { id: "list", label: "Call History", icon: Phone, count: filteredCalls.length },
          { id: "analytics", label: "Analytics", icon: BarChart3, count: null },
          { id: "ai-insights", label: "AI Insights", icon: Brain, count: callLogs.filter(c => c.aiInsights).length },
          { id: "templates", label: "Templates", icon: FileText, count: null }
        ].map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setViewMode(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              viewMode === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            <Icon size={16} />
            {label}
            {count !== null && (
              <span className="text-xs bg-muted-foreground/20 px-2 py-1 rounded-full">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Calls Today</p>
              <p className="text-3xl font-bold text-foreground mt-1">{analytics.total}</p>
              <p className="text-sm text-success mt-1">↑ 8 from yesterday</p>
            </div>
            <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center">
              <Phone className="text-info" size={24} />
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Connection Rate</p>
              <p className="text-3xl font-bold text-success mt-1">{analytics.connectionRate}%</p>
              <p className="text-sm text-success mt-1">↑ 2.1% from last week</p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="text-success" size={24} />
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">AI Sentiment Score</p>
              <p className="text-3xl font-bold text-info mt-1">{analytics.avgSentiment}</p>
              <p className="text-sm text-info mt-1">AI-powered analysis</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Brain className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Urgent Follow-ups</p>
              <p className="text-3xl font-bold text-warning mt-1">{analytics.urgent}</p>
              <p className="text-sm text-destructive mt-1">Require attention</p>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-warning" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card-base p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-3 mb-2">
              <PhoneMissed className="text-destructive" size={20} />
              <span className="font-medium text-foreground">Follow-up Missed Calls</span>
            </div>
            <p className="text-sm text-muted-foreground">Call back prospects who couldn't be reached</p>
          </button>

          <button className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-info" size={20} />
              <span className="font-medium text-foreground">Schedule Callbacks</span>
            </div>
            <p className="text-sm text-muted-foreground">Set reminders for scheduled follow-up calls</p>
          </button>

          <button className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-3 mb-2">
              <Headphones className="text-accent" size={20} />
              <span className="font-medium text-foreground">Review Recordings</span>
            </div>
            <p className="text-sm text-muted-foreground">Listen to recorded calls for quality assurance</p>
          </button>
        </div>
      </div>

      {/* Call Logs List */}
      {viewMode === "list" && (
        <div className="card-base">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Call History</h2>
              <div className="flex gap-3">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search calls, contacts, notes..."
                    className="pl-9 pr-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring w-64 bg-background text-foreground"
                  />
                </div>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                    showFilters 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <FilterIcon size={16} />
                  Filters
                  {Object.values(activeFilters).some(f => f.length > 0) && (
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
                    <select 
                      multiple
                      value={activeFilters.status}
                      onChange={(e) => setActiveFilters(prev => ({
                        ...prev,
                        status: Array.from(e.target.selectedOptions, option => option.value as CallStatus)
                      }))}
                      className="w-full p-2 border border-border rounded-md text-sm bg-background"
                    >
                      <option value="completed">Completed</option>
                      <option value="missed">Missed</option>
                      <option value="voicemail">Voicemail</option>
                      <option value="busy">Busy</option>
                      <option value="transferred">Transferred</option>
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Priority</label>
                    <select 
                      multiple
                      value={activeFilters.priority}
                      onChange={(e) => setActiveFilters(prev => ({
                        ...prev,
                        priority: Array.from(e.target.selectedOptions, option => option.value as CallPriority)
                      }))}
                      className="w-full p-2 border border-border rounded-md text-sm bg-background"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {/* Sentiment Filter */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Sentiment</label>
                    <select 
                      multiple
                      value={activeFilters.sentiment}
                      onChange={(e) => setActiveFilters(prev => ({
                        ...prev,
                        sentiment: Array.from(e.target.selectedOptions, option => option.value as CallSentiment)
                      }))}
                      className="w-full p-2 border border-border rounded-md text-sm bg-background"
                    >
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="negative">Negative</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={() => setActiveFilters({
                        status: [],
                        type: [],
                        priority: [],
                        purpose: [],
                        sentiment: []
                      })}
                      className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            )}

          {selectedCalls.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-info/5 border border-info/20 rounded-lg mb-4">
              <span className="text-sm font-medium text-info">
                {selectedCalls.length} call{selectedCalls.length > 1 ? "s" : ""} selected
              </span>
              <button className="flex items-center gap-1 px-2 py-1 text-sm text-info hover:text-info/80">
                Bulk Export
              </button>
              <button className="flex items-center gap-1 px-2 py-1 text-sm text-destructive hover:text-destructive/80">
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="divide-y divide-border">
          {filteredCalls.map((call) => (
            <div key={call.id} className="p-6 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  className="mt-4 rounded border-border"
                  checked={selectedCalls.includes(call.id)}
                  onChange={() => handleSelectCall(call.id)}
                />

                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                  {getCallIcon(call.type, call.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground">{call.contact}</h3>
                      <span className="text-sm text-muted-foreground">{call.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getTypeColor(
                          call.type
                        )}`}
                      >
                        {call.type}
                      </span>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                          call.status
                        )}`}
                      >
                        {call.status}
                      </span>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(
                          call.priority
                        )}`}
                      >
                        {call.priority}
                      </span>
                      {call.recording && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-accent/10 text-accent border border-accent/20">
                          recorded
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mb-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>Duration: {call.duration}</span>
                    </div>
                    <span>{call.timestamp}</span>
                    <span>Student ID: {call.studentId}</span>
                    <span className="capitalize">{call.callPurpose.replace("_", " ")}</span>
                  </div>

                  {/* AI Insights Display */}
                  {call.aiInsights && (
                    <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain size={16} className="text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">AI Insights</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Sentiment:</span>
                          <span className={`ml-1 px-2 py-1 rounded-full border ${getSentimentColor(call.aiInsights.sentiment)}`}>
                            {call.aiInsights.sentiment} ({call.aiInsights.sentimentScore})
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quality:</span>
                          <span className="ml-1 font-medium">{call.aiInsights.callQualityScore}/100</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Topics:</span>
                          <span className="ml-1">{call.aiInsights.keyTopics.slice(0, 2).join(", ")}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Actions:</span>
                          <span className="ml-1">{call.aiInsights.actionItems.length} items</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {showNotes[call.id] && (
                    <div className="bg-muted/30 rounded-lg p-3 mb-3">
                      <p className="text-foreground">{call.notes}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleNotes(call.id)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageSquare size={14} />
                      {showNotes[call.id] ? "Hide Notes" : "Show Notes"}
                    </button>

                    <div className="flex items-center gap-2">
                      {call.recording && (
                        <button
                          className="p-1 hover:bg-muted rounded transition-colors"
                          title="Play Recording"
                        >
                          <Play size={16} className="text-muted-foreground" />
                        </button>
                      )}
                      <button
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="Edit Notes"
                      >
                        <Edit3 size={16} className="text-muted-foreground" />
                      </button>
                      <button
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="Call Back"
                      >
                        <PhoneCall size={16} className="text-muted-foreground" />
                      </button>
                      <button
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="More options"
                      >
                        <MoreVertical size={16} className="text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Analytics View */}
      {viewMode === "analytics" && (
        <div className="space-y-6">
          <div className="card-base p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Call Performance Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-success mb-2">{analytics.connectionRate}%</div>
                <div className="text-sm text-muted-foreground">Connection Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-info mb-2">{analytics.avgSentiment}</div>
                <div className="text-sm text-muted-foreground">Avg Sentiment Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-warning mb-2">{analytics.avgQuality}</div>
                <div className="text-sm text-muted-foreground">Avg Call Quality</div>
              </div>
            </div>
          </div>

          <div className="card-base p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Priority Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { priority: "urgent", count: analytics.urgent, color: "text-destructive" },
                { priority: "high", count: analytics.highPriority, color: "text-warning" },
                { priority: "medium", count: callLogs.filter(c => c.priority === "medium").length, color: "text-info" },
                { priority: "low", count: callLogs.filter(c => c.priority === "low").length, color: "text-muted-foreground" }
              ].map(({ priority, count, color }) => (
                <div key={priority} className="text-center">
                  <div className={`text-2xl font-bold ${color} mb-1`}>{count}</div>
                  <div className="text-sm text-muted-foreground capitalize">{priority}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-base p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Trends</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-success/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-success" size={20} />
                  <span className="text-sm font-medium">Connection rate improved by 2.1% this week</span>
                </div>
                <span className="text-xs text-success">+2.1%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-warning/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-warning" size={20} />
                  <span className="text-sm font-medium">3 urgent calls require immediate follow-up</span>
                </div>
                <span className="text-xs text-warning">High Priority</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-info/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Brain className="text-info" size={20} />
                  <span className="text-sm font-medium">AI sentiment analysis available for 6 calls</span>
                </div>
                <span className="text-xs text-info">6 calls</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights View */}
      {viewMode === "ai-insights" && (
        <div className="space-y-6">
          <div className="card-base p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">AI-Powered Call Analysis</h2>
            <p className="text-muted-foreground mb-6">
              Leverage artificial intelligence to analyze call sentiment, quality, and extract actionable insights.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Sentiment Analysis</h3>
                <div className="space-y-3">
                  {callLogs.filter(c => c.aiInsights).map(call => (
                    <div key={call.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">{call.contact}</span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getSentimentColor(call.aiInsights!.sentiment)}`}>
                        {call.aiInsights!.sentiment} ({call.aiInsights!.sentimentScore})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Call Quality Scores</h3>
                <div className="space-y-3">
                  {callLogs.filter(c => c.aiInsights).map(call => (
                    <div key={call.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">{call.contact}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-success h-2 rounded-full" 
                            style={{ width: `${call.aiInsights!.callQualityScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{call.aiInsights!.callQualityScore}/100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card-base p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">AI Action Items</h3>
            <div className="space-y-4">
              {callLogs.filter(c => c.aiInsights?.actionItems.length).map(call => (
                <div key={call.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="text-primary" size={16} />
                    <span className="font-medium text-foreground">{call.contact}</span>
                  </div>
                  <div className="space-y-2">
                    {call.aiInsights!.actionItems.map((action, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <span className="text-muted-foreground">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Templates View */}
      {viewMode === "templates" && (
        <div className="space-y-6">
          <div className="card-base p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Call Templates & Scripts</h2>
            <p className="text-muted-foreground mb-6">
              Pre-defined templates and scripts for common call scenarios to ensure consistency and quality.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Admissions Inquiry</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Welcome and introduction</p>
                  <p>• Program overview and requirements</p>
                  <p>• Application process explanation</p>
                  <p>• Financial aid discussion</p>
                  <p>• Next steps and follow-up</p>
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Interview Preparation</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Interview date confirmation</p>
                  <p>• Portfolio requirements</p>
                  <p>• What to expect</p>
                  <p>• Preparation tips</p>
                  <p>• Contact information</p>
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Follow-up Call</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Previous call reference</p>
                  <p>• Status update</p>
                  <p>• Additional questions</p>
                  <p>• Next actions</p>
                  <p>• Scheduling follow-up</p>
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Parent Inquiry</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Parent identification</p>
                  <p>• Student information</p>
                  <p>• Specific concerns</p>
                  <p>• Resource provision</p>
                  <p>• Follow-up plan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integration Status */}
      <div className="bg-gradient-to-r from-info/5 to-accent/5 border border-info/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Phone className="text-info" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-info mb-2">Twilio Voice Integration</h3>
            <p className="text-info/80 mb-4">
              Connected to Twilio for reliable voice calling, call recording, and advanced call analytics.
              Supports international calling, voicemail transcription, and automated call routing.
            </p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-colors">
                Configure Settings
              </button>
              <button className="px-4 py-2 border border-info/30 text-info rounded-lg hover:bg-info/5 transition-colors">
                View Call Analytics
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success rounded-full" />
            <span className="text-sm font-medium text-success">Connected</span>
          </div>
        </div>
      </div>

      {/* AI Analysis Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">AI-Powered Call Analysis</h2>
              <button
                onClick={() => setShowAIModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setAiAnalysisType("sentiment")}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    aiAnalysisType === "sentiment"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <Brain className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-medium text-foreground">Sentiment Analysis</h3>
                  <p className="text-sm text-muted-foreground">Analyze call emotional tone and satisfaction</p>
                </button>

                <button
                  onClick={() => setAiAnalysisType("quality")}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    aiAnalysisType === "quality"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <Star className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-medium text-foreground">Quality Assessment</h3>
                  <p className="text-sm text-muted-foreground">Evaluate call effectiveness and professionalism</p>
                </button>

                <button
                  onClick={() => setAiAnalysisType("summary")}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    aiAnalysisType === "summary"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <FileText className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-medium text-foreground">Call Summary</h3>
                  <p className="text-sm text-muted-foreground">Generate concise call summaries and key points</p>
                </button>

                <button
                  onClick={() => setAiAnalysisType("action-items")}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    aiAnalysisType === "action-items"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <Target className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-medium text-foreground">Action Items</h3>
                  <p className="text-sm text-muted-foreground">Extract actionable tasks and follow-ups</p>
                </button>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium text-foreground mb-2">Selected Calls for Analysis</h3>
                <div className="space-y-2">
                  {selectedCalls.length > 0 ? (
                    selectedCalls.map(callId => {
                      const call = callLogs.find(c => c.id === callId);
                      return call ? (
                        <div key={callId} className="flex items-center justify-between p-2 bg-background rounded">
                          <span className="text-sm">{call.contact}</span>
                          <span className="text-xs text-muted-foreground">{call.callPurpose.replace("_", " ")}</span>
                        </div>
                      ) : null;
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No calls selected. Please select calls to analyze.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAIModal(false)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedCalls.length > 0) {
                      // In real implementation, this would call your AI service
                      console.log(`Analyzing ${selectedCalls.length} calls with ${aiAnalysisType} analysis`);
                      setShowAIModal(false);
                    }
                  }}
                  disabled={selectedCalls.length === 0 || isAnalyzing}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Start Analysis
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallLogs;