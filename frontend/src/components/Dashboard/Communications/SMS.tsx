import React, { useState, useMemo } from "react";
import {
  MessageCircle,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Users,
  CheckCircle2,
  Clock,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  Phone,
  MessageSquare,
  Zap,
  Brain,
  TrendingUp,
  BarChart3,
  Mic,
  Target,
  Filter as FilterIcon,
  X,
  Star,
  Clock3,
  MessageSquare as MessageSquareIcon,
  FileText,
  Settings,
  RefreshCw,
  Smartphone,
  Globe,
  Shield,
  Bot,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  Share2,
  Calendar,
  Tag,
  Hash,
  TrendingDown,
} from "lucide-react";

type Direction = "inbound" | "outbound";
type Status = "delivered" | "read" | "sent" | "received" | "failed" | "pending" | "queued";
type MessagePriority = "low" | "medium" | "high" | "urgent";
type MessageSentiment = "positive" | "neutral" | "negative" | "mixed" | "excited" | "concerned";
type MessageCategory = "admissions" | "academic" | "financial" | "logistics" | "support" | "marketing";

type SMSItem = {
  id: number;
  contact: string;
  phone: string;
  message: string;
  status: Status;
  timestamp: string;
  direction: Direction;
  studentId: string;
  messageType:
    | "interview_reminder"
    | "application_confirmation"
    | "response"
    | "welcome"
    | "inquiry"
    | "payment_notification"
    | "deadline_reminder"
    | "event_invitation"
    | "feedback_request"
    | "emergency_notification";
  // AI-Enhanced Fields
  aiInsights?: {
    sentiment: MessageSentiment;
    sentimentScore: number; // 0-100
    keyTopics: string[];
    actionItems: string[];
    messageQualityScore: number; // 0-100
    responseProbability: number; // 0-100
    urgencyLevel: MessagePriority;
    suggestedResponse?: string;
    translation?: string;
    language?: string;
  };
  // Enhanced Metadata
  priority: MessagePriority;
  category: MessageCategory;
  tags: string[];
  assignedTo?: string;
  followUpDate?: string;
  messageOutcome?: "successful" | "needs_followup" | "escalated" | "resolved" | "ignored";
  relatedMessages: number[];
  cost?: number;
  location?: string;
  device?: string;
  deliveryAttempts: number;
  readAt?: string;
  repliedAt?: string;
  optOutStatus: boolean;
  complianceStatus: "compliant" | "review_needed" | "non_compliant";
};

const SMS: React.FC = () => {
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "analytics" | "ai-insights" | "templates" | "compliance">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<{
    status: Status[];
    direction: Direction[];
    priority: MessagePriority[];
    category: MessageCategory[];
    sentiment: MessageSentiment[];
  }>({
    status: [],
    direction: [],
    priority: [],
    category: [],
    sentiment: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnalysisType, setAiAnalysisType] = useState<"sentiment" | "quality" | "response-prediction" | "compliance">("sentiment");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeData, setComposeData] = useState({
    recipients: [],
    message: "",
    template: "",
    scheduledTime: "",
    priority: "medium" as MessagePriority
  });

  // Sample SMS data
  const smsMessages: SMSItem[] = [
    {
      id: 1,
      contact: "James Rodriguez",
      phone: "+1 (555) 123-4567",
      message:
        "Hi James! Just a reminder about your interview tomorrow at 2 PM. Please confirm your attendance. - WaterBear Admissions",
      status: "delivered",
      timestamp: "2025-08-13 10:30",
      direction: "outbound",
      studentId: "STU001",
      messageType: "interview_reminder",
      priority: "high",
      category: "admissions",
      tags: ["interview", "reminder"],
      assignedTo: "Admissions Team",
      followUpDate: "2025-08-13 10:30",
      messageOutcome: "successful",
      relatedMessages: [],
      deliveryAttempts: 1,
      optOutStatus: false,
      complianceStatus: "compliant",
      aiInsights: {
        sentiment: "positive",
        sentimentScore: 85,
        keyTopics: ["interview", "reminder", "confirmation"],
        actionItems: ["Follow up on attendance", "Send interview details"],
        messageQualityScore: 92,
        responseProbability: 78,
        urgencyLevel: "high",
        suggestedResponse: "Thank you for confirming. We'll see you tomorrow at 2 PM. Good luck!"
      }
    },
    {
      id: 2,
      contact: "Sarah Chen",
      phone: "+1 (555) 987-6543",
      message:
        "Your application has been received! We'll review it within 5 business days. Track your status at waterbear.edu/portal",
      status: "read",
      timestamp: "2025-08-13 09:15",
      direction: "outbound",
      studentId: "STU002",
      messageType: "application_confirmation",
      priority: "medium",
      category: "admissions",
      tags: ["application", "status"],
      assignedTo: "Admissions Team",
      followUpDate: "2025-08-13 09:15",
      messageOutcome: "successful",
      relatedMessages: [],
      deliveryAttempts: 1,
      optOutStatus: false,
      complianceStatus: "compliant",
      aiInsights: {
        sentiment: "neutral",
        sentimentScore: 65,
        keyTopics: ["application", "status", "tracking"],
        actionItems: ["Monitor application progress", "Send portal access"],
        messageQualityScore: 88,
        responseProbability: 45,
        urgencyLevel: "medium",
        suggestedResponse: "Thank you for the update. I'll check the portal for my application status."
      }
    },
    {
      id: 3,
      contact: "Michael Johnson",
      phone: "+1 (555) 456-7890",
      message: "Yes, I'll be there. Thank you!",
      status: "received",
      timestamp: "2025-08-13 08:45",
      direction: "inbound",
      studentId: "STU003",
      messageType: "response",
      priority: "low",
      category: "academic",
      tags: ["response", "attendance"],
      assignedTo: "Academic Advisor",
      followUpDate: "2025-08-13 08:45",
      messageOutcome: "successful",
      relatedMessages: [],
      deliveryAttempts: 1,
      optOutStatus: false,
      complianceStatus: "compliant",
      aiInsights: {
        sentiment: "positive",
        sentimentScore: 90,
        keyTopics: ["confirmation", "attendance", "thank you"],
        actionItems: ["Confirm interview slot", "Send preparation materials"],
        messageQualityScore: 95,
        responseProbability: 0,
        urgencyLevel: "low",
        suggestedResponse: "Perfect! We have you confirmed for tomorrow at 2 PM. Looking forward to meeting you!"
      }
    },
    {
      id: 4,
      contact: "Emma Thompson",
      phone: "+1 (555) 234-5678",
      message:
        "Welcome to WaterBear! Your orientation is scheduled for August 20th. Reply STOP to opt out.",
      status: "delivered",
      timestamp: "2025-08-12 16:20",
      direction: "outbound",
      studentId: "STU004",
      messageType: "welcome",
      priority: "medium",
      category: "logistics",
      tags: ["orientation", "welcome"],
      assignedTo: "Student Services",
      followUpDate: "2025-08-12 16:20",
      messageOutcome: "successful",
      relatedMessages: [],
      deliveryAttempts: 1,
      optOutStatus: false,
      complianceStatus: "compliant",
    },
    {
      id: 5,
      contact: "David Park",
      phone: "+1 (555) 345-6789",
      message:
        "Can I reschedule my audition? I have a conflict with the current time.",
      status: "received",
      timestamp: "2025-08-12 14:30",
      direction: "inbound",
      studentId: "STU005",
      messageType: "inquiry",
      priority: "high",
      category: "academic",
      tags: ["audition", "reschedule"],
      assignedTo: "Academic Advisor",
      followUpDate: "2025-08-12 14:30",
      messageOutcome: "successful",
      relatedMessages: [],
      deliveryAttempts: 1,
      optOutStatus: false,
      complianceStatus: "compliant",
    },
    {
      id: 6,
      contact: "Lisa Wang",
      phone: "+1 (555) 567-8901",
      message:
        "Your payment plan has been set up successfully. First payment due September 1st.",
      status: "delivered",
      timestamp: "2025-08-12 11:15",
      direction: "outbound",
      studentId: "STU006",
      messageType: "payment_notification",
      priority: "medium",
      category: "financial",
      tags: ["payment", "plan"],
      assignedTo: "Financial Aid",
      followUpDate: "2025-08-12 11:15",
      messageOutcome: "successful",
      relatedMessages: [],
      deliveryAttempts: 1,
      optOutStatus: false,
      complianceStatus: "compliant",
    },
  ];

  const handleSelectMessage = (messageId: number) => {
    setSelectedMessages((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case "delivered":
        return "status-success-bg text-success border-status-success-border";
      case "read":
        return "status-info-bg text-info border-status-info-border";
      case "sent":
        return "status-warning-bg text-warning border-status-warning-border";
      case "received":
        return "status-success-bg text-success border-status-success-border";
      case "failed":
        return "status-error-bg text-destructive border-status-error-border";
      case "pending":
        return "status-warning-bg text-warning border-status-warning-border";
      case "queued":
        return "status-info-bg text-info border-status-info-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const DirectionIcon: React.FC<{ direction: Direction }> = ({ direction }) =>
    direction === "outbound" ? (
      <ArrowUpRight size={16} className="text-info" />
    ) : (
      <ArrowDownLeft size={16} className="text-success" />
    );

  const getPriorityColor = (priority: MessagePriority) => {
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

  const getSentimentColor = (sentiment: MessageSentiment) => {
    switch (sentiment) {
      case "positive":
      case "excited":
        return "bg-success/10 text-success border-success/20";
      case "negative":
      case "concerned":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "mixed":
        return "bg-warning/10 text-warning border-warning/20";
      case "neutral":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getCategoryColor = (category: MessageCategory) => {
    switch (category) {
      case "admissions":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "academic":
        return "bg-green-100 text-green-800 border-green-200";
      case "financial":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "logistics":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "support":
        return "bg-red-100 text-red-800 border-red-200";
      case "marketing":
        return "bg-pink-100 text-pink-800 border-pink-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  // AI-Powered Analysis Functions
  const analyzeMessageSentiment = async (messageId: number) => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsAnalyzing(false);
    console.log(`Analyzing sentiment for message ${messageId}`);
  };

  const predictResponseProbability = async (messageId: number) => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsAnalyzing(false);
    console.log(`Predicting response probability for message ${messageId}`);
  };

  const checkComplianceStatus = async (messageId: number) => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsAnalyzing(false);
    console.log(`Checking compliance for message ${messageId}`);
  };

  // Enhanced Filtering and Search
  const filteredMessages = useMemo(() => {
    return smsMessages.filter(message => {
      const matchesSearch = message.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           message.phone.includes(searchQuery) ||
                           message.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           message.studentId.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = activeFilters.status.length === 0 || activeFilters.status.includes(message.status);
      const matchesDirection = activeFilters.direction.length === 0 || activeFilters.direction.includes(message.direction);
      const matchesPriority = activeFilters.priority.length === 0 || activeFilters.priority.includes(message.priority);
      const matchesCategory = activeFilters.category.length === 0 || activeFilters.category.includes(message.category);
      const matchesSentiment = activeFilters.sentiment.length === 0 || 
        (message.aiInsights && activeFilters.sentiment.includes(message.aiInsights.sentiment));

      return matchesSearch && matchesStatus && matchesDirection && matchesPriority && matchesCategory && matchesSentiment;
    });
  }, [smsMessages, searchQuery, activeFilters]);

  // Analytics Calculations
  const analytics = useMemo(() => {
    const total = smsMessages.length;
    const delivered = smsMessages.filter(m => m.status === "delivered").length;
    const read = smsMessages.filter(m => m.status === "read").length;
    const urgent = smsMessages.filter(m => m.priority === "urgent").length;
    const highPriority = smsMessages.filter(m => m.priority === "high").length;
    
    const avgSentiment = smsMessages
      .filter(m => m.aiInsights)
      .reduce((acc, m) => acc + (m.aiInsights?.sentimentScore || 0), 0) / 
      smsMessages.filter(m => m.aiInsights).length;
    
    const avgQuality = smsMessages
      .filter(m => m.aiInsights)
      .reduce((acc, m) => acc + (m.aiInsights?.messageQualityScore || 0), 0) / 
      smsMessages.filter(m => m.aiInsights).length;

    const responseRate = smsMessages.filter(m => m.direction === "inbound").length > 0 
      ? (smsMessages.filter(m => m.direction === "inbound" && m.status === "read").length / 
         smsMessages.filter(m => m.direction === "inbound").length) * 100
      : 0;

    return {
      total,
      delivered,
      read,
      urgent,
      highPriority,
      avgSentiment: Math.round(avgSentiment),
      avgQuality: Math.round(avgQuality),
      deliveryRate: Math.round((delivered / total) * 100),
      responseRate: Math.round(responseRate)
    };
  }, [smsMessages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">SMS Communications</h1>
          <p className="text-muted-foreground">
            AI-powered WhatsApp and SMS messaging center for student communications
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
          <button 
            onClick={() => setShowComposeModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <Users size={16} />
            Bulk Message
          </button>
          <button 
            onClick={() => setShowComposeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <MessageCircle size={16} />
            New Message
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex space-x-1 p-1 bg-muted rounded-lg w-fit">
        {[
          { id: "list", label: "Messages", icon: MessageCircle, count: filteredMessages.length },
          { id: "analytics", label: "Analytics", icon: BarChart3, count: null },
          { id: "ai-insights", label: "AI Insights", icon: Brain, count: smsMessages.filter(m => m.aiInsights).length },
          { id: "templates", label: "Templates", icon: FileText, count: null },
          { id: "compliance", label: "Compliance", icon: Shield, count: smsMessages.filter(m => m.complianceStatus !== "compliant").length }
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
              <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
              <p className="text-3xl font-bold text-foreground mt-1">{analytics.total}</p>
              <p className="text-sm text-success mt-1">↑ 12% from yesterday</p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <MessageCircle className="text-success" size={24} />
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Delivery Rate</p>
              <p className="text-3xl font-bold text-success mt-1">{analytics.deliveryRate}%</p>
              <p className="text-sm text-success mt-1">↑ 0.3% from last week</p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="text-success" size={24} />
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Response Rate</p>
              <p className="text-3xl font-bold text-info mt-1">{analytics.responseRate}%</p>
              <p className="text-sm text-info mt-1">↑ 2.1% from last week</p>
            </div>
            <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="text-info" size={24} />
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">AI Sentiment Score</p>
              <p className="text-3xl font-bold text-warning mt-1">{analytics.avgSentiment}</p>
              <p className="text-sm text-warning mt-1">AI-powered analysis</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Brain className="text-purple-600" size={24} />
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
              <MessageCircle className="text-info" size={20} />
              <span className="font-medium text-foreground">Interview Reminders</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Send automated reminders to students with upcoming interviews
            </p>
          </button>

          <button className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-success" size={20} />
              <span className="font-medium text-foreground">Application Updates</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Notify applicants about status changes and next steps
            </p>
          </button>

          <button className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-3 mb-2">
              <Send className="text-accent" size={20} />
              <span className="font-medium text-foreground">Welcome Messages</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Send welcome messages to newly enrolled students
            </p>
          </button>
        </div>
      </div>

      {/* Messages List */}
      {viewMode === "list" && (
        <div className="card-base">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Message History</h2>
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
                    placeholder="Search messages, contacts, content..."
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
                        status: Array.from(e.target.selectedOptions, option => option.value as Status)
                      }))}
                      className="w-full p-2 border border-border rounded-md text-sm bg-background"
                    >
                      <option value="delivered">Delivered</option>
                      <option value="read">Read</option>
                      <option value="sent">Sent</option>
                      <option value="received">Received</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending</option>
                      <option value="queued">Queued</option>
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
                        priority: Array.from(e.target.selectedOptions, option => option.value as MessagePriority)
                      }))}
                      className="w-full p-2 border border-border rounded-md text-sm bg-background"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                    <select 
                      multiple
                      value={activeFilters.category}
                      onChange={(e) => setActiveFilters(prev => ({
                        ...prev,
                        category: Array.from(e.target.selectedOptions, option => option.value as MessageCategory)
                      }))}
                      className="w-full p-2 border border-border rounded-md text-sm bg-background"
                    >
                      <option value="admissions">Admissions</option>
                      <option value="academic">Academic</option>
                      <option value="financial">Financial</option>
                      <option value="logistics">Logistics</option>
                      <option value="support">Support</option>
                      <option value="marketing">Marketing</option>
                    </select>
                  </div>

                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={() => setActiveFilters({
                        status: [],
                        direction: [],
                        priority: [],
                        category: [],
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

          {selectedMessages.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-info/5 border border-info/20 rounded-lg mb-4">
              <span className="text-sm font-medium text-info">
                {selectedMessages.length} message
                {selectedMessages.length > 1 ? "s" : ""} selected
              </span>
              <button className="flex items-center gap-1 px-2 py-1 text-sm text-info hover:text-info/80">
                Mark as Read
              </button>
              <button className="flex items-center gap-1 px-2 py-1 text-sm text-destructive hover:text-destructive/80">
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="divide-y divide-border">
          {smsMessages.map((message) => (
            <div key={message.id} className="p-6 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  className="mt-4 rounded border-border"
                  checked={selectedMessages.includes(message.id)}
                  onChange={() => handleSelectMessage(message.id)}
                />

                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground">
                        {message.contact}
                      </h3>
                      <DirectionIcon direction={message.direction} />
                      <span className="text-sm text-muted-foreground">{message.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${
                          message.direction === "inbound"
                            ? "status-success-bg text-success border-status-success-border"
                            : "status-info-bg text-info border-status-success-border"
                        }`}
                      >
                        {message.direction}
                      </span>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                          message.status
                        )}`}
                      >
                        {message.status}
                      </span>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(
                          message.priority
                        )}`}
                      >
                        {message.priority}
                      </span>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(
                          message.category
                        )}`}
                      >
                        {message.category}
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-3 mb-3">
                    <p className="text-foreground">{message.message}</p>
                  </div>

                  {/* AI Insights Display */}
                  {message.aiInsights && (
                    <div className="mb-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain size={16} className="text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">AI Insights</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Sentiment:</span>
                          <span className={`ml-1 px-2 py-1 rounded-full border ${getSentimentColor(message.aiInsights.sentiment)}`}>
                            {message.aiInsights.sentiment} ({message.aiInsights.sentimentScore})
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quality:</span>
                          <span className="ml-1 font-medium">{message.aiInsights.messageQualityScore}/100</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Response:</span>
                          <span className="ml-1 font-medium">{message.aiInsights.responseProbability}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Actions:</span>
                          <span className="ml-1">{message.aiInsights.actionItems.length} items</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{message.timestamp}</span>
                      <span>•</span>
                      <span>Student ID: {message.studentId}</span>
                      <span>•</span>
                      <span className="capitalize">
                        {message.messageType.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="Reply"
                      >
                        <MessageCircle size={16} className="text-muted-foreground" />
                      </button>
                      <button
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="Call"
                      >
                        <Phone size={16} className="text-muted-foreground" />
                      </button>
                      {message.aiInsights && (
                        <button
                          onClick={() => {
                            setSelectedMessages([message.id]);
                            setShowAIModal(true);
                          }}
                          className="p-1 hover:bg-muted rounded transition-colors"
                          title="AI Analysis"
                        >
                          <Brain size={16} className="text-purple-600" />
                        </button>
                      )}
                      <button
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="Copy Message"
                      >
                        <Copy size={16} className="text-muted-foreground" />
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
            <h2 className="text-xl font-semibold text-foreground mb-4">Message Performance Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-success mb-2">{analytics.deliveryRate}%</div>
                <div className="text-sm text-muted-foreground">Delivery Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-info mb-2">{analytics.responseRate}%</div>
                <div className="text-sm text-muted-foreground">Response Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-warning mb-2">{analytics.avgSentiment}</div>
                <div className="text-sm text-muted-foreground">Avg Sentiment Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">{analytics.avgQuality}</div>
                <div className="text-sm text-muted-foreground">Avg Message Quality</div>
              </div>
            </div>
          </div>

          <div className="card-base p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Priority Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { priority: "urgent", count: analytics.urgent, color: "text-destructive" },
                { priority: "high", count: analytics.highPriority, color: "text-warning" },
                { priority: "medium", count: smsMessages.filter(m => m.priority === "medium").length, color: "text-info" },
                { priority: "low", count: smsMessages.filter(m => m.priority === "low").length, color: "text-muted-foreground" }
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
                  <span className="text-sm font-medium">Delivery rate improved by 0.3% this week</span>
                </div>
                <span className="text-xs text-success">+0.3%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-warning/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-warning" size={20} />
                  <span className="text-sm font-medium">2 urgent messages require immediate attention</span>
                </div>
                <span className="text-xs text-warning">High Priority</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-info/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Brain className="text-info" size={20} />
                  <span className="text-sm font-medium">AI sentiment analysis available for 6 messages</span>
                </div>
                <span className="text-xs text-info">6 messages</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights View */}
      {viewMode === "ai-insights" && (
        <div className="space-y-6">
          <div className="card-base p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">AI-Powered Message Analysis</h2>
            <p className="text-muted-foreground mb-6">
              Leverage artificial intelligence to analyze message sentiment, quality, and predict response probability.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Sentiment Analysis</h3>
                <div className="space-y-3">
                  {smsMessages.filter(m => m.aiInsights).map(message => (
                    <div key={message.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">{message.contact}</span>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getSentimentColor(message.aiInsights!.sentiment)}`}>
                        {message.aiInsights!.sentiment} ({message.aiInsights!.sentimentScore})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Message Quality Scores</h3>
                <div className="space-y-3">
                  {smsMessages.filter(m => m.aiInsights).map(message => (
                    <div key={message.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">{message.contact}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-success h-2 rounded-full" 
                            style={{ width: `${message.aiInsights!.messageQualityScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{message.aiInsights!.messageQualityScore}/100</span>
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
              {smsMessages.filter(m => m.aiInsights?.actionItems.length).map(message => (
                <div key={message.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="text-primary" size={16} />
                    <span className="font-medium text-foreground">{message.contact}</span>
                  </div>
                  <div className="space-y-2">
                    {message.aiInsights!.actionItems.map((action, index) => (
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
            <h2 className="text-xl font-semibold text-foreground mb-4">Message Templates & Scripts</h2>
            <p className="text-muted-foreground mb-6">
              Pre-defined templates and scripts for common messaging scenarios to ensure consistency and quality.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Interview Reminders</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Welcome and introduction</p>
                  <p>• Interview date and time confirmation</p>
                  <p>• Location and requirements</p>
                  <p>• What to bring</p>
                  <p>• Contact information</p>
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Application Updates</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Status change notification</p>
                  <p>• Next steps explanation</p>
                  <p>• Required documents</p>
                  <p>• Timeline information</p>
                  <p>• Support contact</p>
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Welcome Messages</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Welcome greeting</p>
                  <p>• Orientation details</p>
                  <p>• Important dates</p>
                  <p>• Resource links</p>
                  <p>• Contact information</p>
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg">
                <h3 className="font-medium text-foreground mb-3">Payment Notifications</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Payment confirmation</p>
                  <p>• Amount and due date</p>
                  <p>• Payment methods</p>
                  <p>• Late fee information</p>
                  <p>• Support contact</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance View */}
      {viewMode === "compliance" && (
        <div className="space-y-6">
          <div className="card-base p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Message Compliance & Security</h2>
            <p className="text-muted-foreground mb-6">
              Monitor message compliance, opt-out status, and security measures for regulatory adherence.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 border border-border rounded-lg">
                <div className="text-3xl font-bold text-success mb-2">
                  {smsMessages.filter(m => m.complianceStatus === "compliant").length}
                </div>
                <div className="text-sm text-muted-foreground">Compliant Messages</div>
              </div>
              <div className="text-center p-4 border border-border rounded-lg">
                <div className="text-3xl font-bold text-warning mb-2">
                  {smsMessages.filter(m => m.complianceStatus === "review_needed").length}
                </div>
                <div className="text-sm text-muted-foreground">Review Needed</div>
              </div>
              <div className="text-center p-4 border border-border rounded-lg">
                <div className="text-3xl font-bold text-destructive mb-2">
                  {smsMessages.filter(m => m.complianceStatus === "non_compliant").length}
                </div>
                <div className="text-sm text-muted-foreground">Non-Compliant</div>
              </div>
            </div>
          </div>

          <div className="card-base p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Opt-Out Management</h3>
            <div className="space-y-4">
              {smsMessages.filter(m => m.optOutStatus).map(message => (
                <div key={message.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <span className="font-medium text-foreground">{message.contact}</span>
                    <span className="text-sm text-muted-foreground ml-2">({message.phone})</span>
                  </div>
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full">
                    Opted Out
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Integration Status */}
      <div className="bg-gradient-to-r from-success/5 to-success/10 border border-success/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="text-success" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-success mb-2">
              WhatsApp Business API & SMS Integration
            </h3>
            <p className="text-success/80 mb-4">
              Connected to WhatsApp Business API and leading SMS providers for
              reliable message delivery. Supports rich media, automated responses,
              and bulk messaging with high deliverability rates.
            </p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors">
                Configure Settings
              </button>
              <button className="px-4 py-2 border border-success/30 text-success rounded-lg hover:bg-success/5 transition-colors">
                View Templates
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
              <h2 className="text-xl font-semibold text-foreground">AI-Powered Message Analysis</h2>
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
                  <p className="text-sm text-muted-foreground">Analyze message emotional tone and satisfaction</p>
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
                  <p className="text-sm text-muted-foreground">Evaluate message effectiveness and clarity</p>
                </button>

                <button
                  onClick={() => setAiAnalysisType("response-prediction")}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    aiAnalysisType === "response-prediction"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <Target className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-medium text-foreground">Response Prediction</h3>
                  <p className="text-sm text-muted-foreground">Predict likelihood of recipient response</p>
                </button>

                <button
                  onClick={() => setAiAnalysisType("compliance")}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    aiAnalysisType === "compliance"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <Shield className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-medium text-foreground">Compliance Check</h3>
                  <p className="text-sm text-muted-foreground">Verify regulatory compliance and opt-out status</p>
                </button>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium text-foreground mb-2">Selected Messages for Analysis</h3>
                <div className="space-y-2">
                  {selectedMessages.length > 0 ? (
                    selectedMessages.map(messageId => {
                      const message = smsMessages.find(m => m.id === messageId);
                      return message ? (
                        <div key={messageId} className="flex items-center justify-between p-2 bg-background rounded">
                          <span className="text-sm">{message.contact}</span>
                          <span className="text-xs text-muted-foreground">{message.messageType.replace("_", " ")}</span>
                        </div>
                      ) : null;
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No messages selected. Please select messages to analyze.</p>
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
                    if (selectedMessages.length > 0) {
                      console.log(`Analyzing ${selectedMessages.length} messages with ${aiAnalysisType} analysis`);
                      setShowAIModal(false);
                    }
                  }}
                  disabled={selectedMessages.length === 0 || isAnalyzing}
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

      {/* Compose Message Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Compose New Message</h2>
              <button
                onClick={() => setShowComposeModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Priority</label>
                  <select
                    value={composeData.priority}
                    onChange={(e) => setComposeData(prev => ({ ...prev, priority: e.target.value as MessagePriority }))}
                    className="w-full p-2 border border-border rounded-md text-sm bg-background"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Schedule Send</label>
                  <input
                    type="datetime-local"
                    value={composeData.scheduledTime}
                    onChange={(e) => setComposeData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                    className="w-full p-2 border border-border rounded-md text-sm bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Message Template</label>
                <select
                  value={composeData.template}
                  onChange={(e) => setComposeData(prev => ({ ...prev, template: e.target.value }))}
                  className="w-full p-2 border border-border rounded-md text-sm bg-background"
                >
                  <option value="">Select a template...</option>
                  <option value="interview_reminder">Interview Reminder</option>
                  <option value="application_update">Application Update</option>
                  <option value="welcome_message">Welcome Message</option>
                  <option value="payment_notification">Payment Notification</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Message Content</label>
                <textarea
                  value={composeData.message}
                  onChange={(e) => setComposeData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Type your message here..."
                  rows={4}
                  className="w-full p-2 border border-border rounded-md text-sm bg-background resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log("Sending message:", composeData);
                    setShowComposeModal(false);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMS;