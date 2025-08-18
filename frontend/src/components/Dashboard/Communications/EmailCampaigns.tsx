import React, { useState } from "react";
import {
  Mail,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  ExternalLink,
  Download,
  CheckCircle2,
  Edit,
  Copy,
  Trash2,
  Users,
  GraduationCap,
  Target,
  BarChart3,
  Clock,
  Pause,
  Settings,
  Eye,
  TrendingUp,
  Zap,
  UserCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock3,
  BookOpen,
} from "lucide-react";

type Campaign = {
  id: number;
  name: string;
  status: "sent" | "draft" | "scheduled" | "paused";
  sent?: string;
  opened?: string;
  clicked?: string;
  recipients?: string;
  dateCreated: string;
  dateSent?: string;
  scheduledFor?: string;
  subject: string;
  mode: "crm" | "student";
  audience: string;
  template: string;
  automation?: boolean;
};

type Mode = "crm" | "student";

const EmailCampaigns: React.FC = () => {
  const [selectedCampaigns, setSelectedCampaigns] = useState<number[]>([]);
  const [mode, setMode] = useState<Mode>("crm");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "analytics" | "templates">("list");
  const [campaignData, setCampaignData] = useState<{
    name: string;
    subject: string;
    audience: string;
    template: string;
    scheduledFor: string;
    automation: boolean;
  }>({
    name: "",
    subject: "",
    audience: "",
    template: "",
    scheduledFor: "",
    automation: false,
  });

  // Mock data for templates and audiences
  const templates = {
    crm: [
      { id: "deadline-reminder", name: "Deadline Reminder", description: "Application deadline notifications", category: "Application" },
      { id: "interview-invitation", name: "Interview Invitation", description: "Interview scheduling and confirmation", category: "Interview" },
      { id: "lead-nurturing", name: "Lead Nurturing", description: "Follow-up emails for prospects", category: "Prospect" },
      { id: "course-catalog", name: "Course Catalog", description: "Program and course information", category: "Information" },
    ],
    student: [
      { id: "welcome-series", name: "Welcome Series", description: "New student onboarding", category: "Onboarding" },
      { id: "progress-report", name: "Progress Report", description: "Academic progress updates", category: "Academic" },
      { id: "financial-aid", name: "Financial Aid", description: "Financial aid notifications", category: "Financial" },
      { id: "course-registration", name: "Course Registration", description: "Registration deadline reminders", category: "Academic" },
    ]
  };

  const audiences = {
    crm: [
      { id: "prospective", name: "Prospective Students", count: "2,847", description: "Interested in programs" },
      { id: "applicants", name: "Applicants", count: "456", description: "Application submitted" },
      { id: "interview-candidates", name: "Interview Candidates", count: "89", description: "Scheduled for interview" },
      { id: "waitlist", name: "Waitlist", count: "123", description: "On waitlist" },
    ],
    student: [
      { id: "enrolled", name: "Enrolled Students", count: "1,205", description: "Currently enrolled" },
      { id: "first-year", name: "First Year", count: "456", description: "First year students" },
      { id: "final-year", name: "Final Year", count: "234", description: "Graduating soon" },
      { id: "international", name: "International Students", count: "178", description: "Visa students" },
    ]
  };

  // Mock data with enhanced information
  const emailCampaigns: Campaign[] = [
    {
      id: 1,
      name: "Application Deadline Reminder",
      status: "sent",
      sent: "2,847",
      opened: "1,923",
      clicked: "456",
      dateCreated: "2025-08-10",
      dateSent: "2025-08-12",
      subject: "Application Deadline Approaching - Don't Miss Out!",
      mode: "crm",
      audience: "Prospective Students",
      template: "Deadline Reminder",
      automation: true,
    },
    {
      id: 2,
      name: "Welcome New Students 2025",
      status: "draft",
      recipients: "1,205",
      dateCreated: "2025-08-11",
      subject: "Welcome to WaterBear College of Music",
      mode: "student",
      audience: "Enrolled Students",
      template: "Welcome Series",
      automation: false,
    },
    {
      id: 3,
      name: "Interview Scheduling",
      status: "scheduled",
      recipients: "89",
      scheduledFor: "2025-08-15",
      dateCreated: "2025-08-11",
      subject: "Your Interview Invitation - WaterBear Admissions",
      mode: "crm",
      audience: "Interview Candidates",
      template: "Interview Invitation",
      automation: true,
    },
    {
      id: 4,
      name: "Financial Aid Information",
      status: "sent",
      sent: "1,456",
      opened: "987",
      clicked: "234",
      dateCreated: "2025-08-08",
      dateSent: "2025-08-09",
      subject: "Financial Aid Opportunities Available",
      mode: "student",
      audience: "Current Students",
      template: "Financial Aid",
      automation: false,
    },
    {
      id: 5,
      name: "Course Catalog 2025",
      status: "draft",
      recipients: "3,421",
      dateCreated: "2025-08-13",
      subject: "Discover Your Musical Journey - 2025 Course Catalog",
      mode: "crm",
      audience: "Prospective Students",
      template: "Course Catalog",
      automation: false,
    },
    {
      id: 6,
      name: "Academic Progress Update",
      status: "paused",
      recipients: "892",
      dateCreated: "2025-08-14",
      subject: "Your Academic Progress Report - Term 2",
      mode: "student",
      audience: "Current Students",
      template: "Progress Report",
      automation: true,
    },
  ];

  const handleSelectCampaign = (campaignId: number) => {
    setSelectedCampaigns((prev) =>
      prev.includes(campaignId)
        ? prev.filter((id) => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const getStatusColor = (status: Campaign["status"]) => {
    switch (status) {
      case "sent":
        return "status-success-bg text-success border-status-success-border";
      case "draft":
        return "bg-muted text-muted-foreground border-border";
      case "scheduled":
        return "status-info-bg text-info border-status-info-border";
      case "paused":
        return "status-warning-bg text-warning border-status-warning-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: Campaign["status"]) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="w-4 h-4" />;
      case "draft":
        return <Edit className="w-4 h-4" />;
      case "scheduled":
        return <Clock3 className="w-4 h-4" />;
      case "paused":
        return <Pause className="w-4 h-4" />;
      default:
        return <Edit className="w-4 h-4" />;
    }
  };

  const pct = (numStr?: string, denStr?: string) => {
    if (!numStr || !denStr) return 0;
    const n = parseInt(numStr.replace(/,/g, ""), 10);
    const d = parseInt(denStr.replace(/,/g, ""), 10);
    if (!d) return 0;
    return Math.round((n / d) * 100);
  };

  const filteredCampaigns = emailCampaigns.filter(campaign => 
    campaign.mode === mode
  );

  const modeStats = {
    crm: {
      total: emailCampaigns.filter(c => c.mode === "crm").length,
      sent: emailCampaigns.filter(c => c.mode === "crm" && c.status === "sent").length,
      active: emailCampaigns.filter(c => c.mode === "crm" && ["draft", "scheduled"].includes(c.status)).length,
    },
    student: {
      total: emailCampaigns.filter(c => c.mode === "student").length,
      sent: emailCampaigns.filter(c => c.mode === "student" && c.status === "sent").length,
      active: emailCampaigns.filter(c => c.mode === "student" && ["draft", "scheduled"].includes(c.status)).length,
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Mode Switching */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Email Campaigns</h1>
            <p className="text-muted-foreground">
              Create, manage and track email communications with students and prospects
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground">
              <Download size={16} />
              Export Reports
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} />
              Create Campaign
            </button>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border">
          <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              mode === "crm" 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            onClick={() => setMode("crm")}
          >
            <Users className="w-4 h-4" />
            CRM Mode
            <span className="text-xs bg-primary-foreground/20 px-2 py-1 rounded-full">
              {modeStats.crm.total}
            </span>
          </button>
          <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              mode === "student" 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            onClick={() => setMode("student")}
          >
            <GraduationCap className="w-4 h-4" />
            Student Record Mode
            <span className="text-xs bg-primary-foreground/20 px-2 py-1 rounded-full">
              {modeStats.student.total}
            </span>
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg border border-border w-fit">
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
              viewMode === "list" 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setViewMode("list")}
          >
            <BarChart3 className="w-4 h-4" />
            Campaigns
          </button>
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
              viewMode === "analytics" 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setViewMode("analytics")}
          >
            <TrendingUp className="w-4 h-4" />
            Analytics
          </button>
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
              viewMode === "templates" 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setViewMode("templates")}
          >
            <Mail className="w-4 h-4" />
            Templates
          </button>
        </div>
      </div>

      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Sent This Month</p>
              <p className="text-3xl font-bold text-foreground mt-1">12,456</p>
              <p className="text-sm text-success mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                ↑ 18% from last month
              </p>
            </div>
            <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center">
              <Mail className="text-info" size={24} />
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Average Open Rate</p>
              <p className="text-3xl font-bold text-success mt-1">68.4%</p>
              <p className="text-sm text-success mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                ↑ 3.2% from last month
              </p>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="text-success" size={24} />
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Click Through Rate</p>
              <p className="text-3xl font-bold text-info mt-1">23.1%</p>
              <p className="text-sm text-info mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                ↑ 1.8% from last month
              </p>
            </div>
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
              <ExternalLink className="text-accent" size={24} />
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Campaigns</p>
              <p className="text-3xl font-bold text-foreground mt-1">8</p>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                3 scheduled
              </p>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <Calendar className="text-warning" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Mode-Specific Quick Actions */}
      {viewMode === "list" && (
        <div className="card-base p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Quick Actions - {mode === "crm" ? "CRM Mode" : "Student Record Mode"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mode === "crm" ? (
              <>
                <button className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors text-left">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <UserCheck className="text-success" size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Lead Nurturing</div>
                    <div className="text-sm text-muted-foreground">Send follow-up emails</div>
                  </div>
                </button>
                <button className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors text-left">
                  <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
                    <Calendar className="text-info" size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Interview Reminders</div>
                    <div className="text-sm text-muted-foreground">Schedule confirmations</div>
                  </div>
                </button>
                <button className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors text-left">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Target className="text-accent" size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Application Status</div>
                    <div className="text-sm text-muted-foreground">Update applicants</div>
                  </div>
                </button>
              </>
            ) : (
              <>
                <button className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors text-left">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                    <GraduationCap className="text-success" size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Academic Updates</div>
                    <div className="text-sm text-muted-foreground">Progress reports</div>
                  </div>
                </button>
                <button className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors text-left">
                  <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="text-info" size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Course Registration</div>
                    <div className="text-sm text-muted-foreground">Deadline reminders</div>
                  </div>
                </button>
                <button className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors text-left">
                  <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                    <AlertCircle className="text-warning" size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Financial Aid</div>
                    <div className="text-sm text-muted-foreground">Application deadlines</div>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Template Management View */}
      {viewMode === "templates" && (
        <div className="space-y-6">
          <div className="card-base p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Email Templates</h3>
                <p className="text-muted-foreground">Manage and customize email templates for {mode === "crm" ? "CRM" : "Student Record"} campaigns</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Plus size={16} />
                Create Template
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates[mode].map((template) => (
                <div key={template.id} className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground mb-1">{template.name}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                      <span className="inline-block px-2 py-1 text-xs bg-muted rounded-full text-muted-foreground">
                        {template.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex-1 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm">
                      Edit Template
                    </button>
                    <button className="px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm">
                      Preview
                    </button>
                    <button className="p-2 border border-border rounded-lg hover:bg-muted transition-colors">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Dashboard View */}
      {viewMode === "analytics" && (
        <div className="space-y-6">
          <div className="card-base p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Campaign Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 border border-border rounded-lg">
                <div className="text-2xl font-bold text-success mb-2">68.4%</div>
                <div className="text-sm text-muted-foreground">Average Open Rate</div>
                <div className="text-xs text-success mt-1">↑ 3.2% from last month</div>
              </div>
              <div className="text-center p-4 border border-border rounded-lg">
                <div className="text-2xl font-bold text-info mb-2">23.1%</div>
                <div className="text-sm text-muted-foreground">Click Through Rate</div>
                <div className="text-xs text-info mt-1">↑ 1.8% from last month</div>
              </div>
              <div className="text-center p-4 border border-border rounded-lg">
                <div className="text-2xl font-bold text-accent mb-2">12.4%</div>
                <div className="text-sm text-muted-foreground">Conversion Rate</div>
                <div className="text-xs text-accent mt-1">↑ 2.1% from last month</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Top Performing Campaigns</h4>
              <div className="space-y-3">
                {(() => {
                  const topCampaigns = filteredCampaigns
                    .filter(c => c.status === "sent" && c.opened && c.sent)
                    .sort((a, b) => {
                      const aOpened = parseInt(a.opened?.replace(/,/g, "") || "0");
                      const bOpened = parseInt(b.opened?.replace(/,/g, "") || "0");
                      return bOpened - aOpened;
                    })
                    .slice(0, 3);
                  
                  return topCampaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <div className="font-medium text-foreground">{campaign.name}</div>
                        <div className="text-sm text-muted-foreground">{campaign.subject}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-foreground">{campaign.opened} opens</div>
                        <div className="text-sm text-success">
                          {pct(campaign.opened, campaign.sent)}% open rate
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Management */}
      {viewMode === "list" && (
        <div className="card-base">
          <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {mode === "crm" ? "CRM Campaigns" : "Student Record Campaigns"}
            </h2>
            <div className="flex gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  className="pl-9 pr-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring w-64 bg-background text-foreground"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground">
                <Filter size={16} />
                Filter
              </button>
            </div>
          </div>

          {selectedCampaigns.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-info/5 border border-info/20 rounded-lg mb-4">
              <span className="text-sm font-medium text-info">
                {selectedCampaigns.length} campaign{selectedCampaigns.length > 1 ? "s" : ""} selected
              </span>
              <button className="flex items-center gap-1 px-2 py-1 text-sm text-info hover:text-info/80">
                <Copy size={14} />
                Duplicate
              </button>
              <button className="flex items-center gap-1 px-2 py-1 text-sm text-destructive hover:text-destructive/80">
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                                  <th className="text-left py-3 px-6">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      onChange={(e) => {
                        if ((e.target as HTMLInputElement).checked) {
                          setSelectedCampaigns(filteredCampaigns.map((c) => c.id));
                        } else {
                          setSelectedCampaigns([]);
                        }
                      }}
                    />
                  </th>
                <th className="text-left py-3 px-6 font-semibold text-foreground">Campaign</th>
                <th className="text-left py-3 px-6 font-semibold text-foreground">Status</th>
                <th className="text-left py-3 px-6 font-semibold text-foreground">Audience</th>
                <th className="text-left py-3 px-6 font-semibold text-foreground">Performance</th>
                <th className="text-left py-3 px-6 font-semibold text-foreground">Date</th>
                <th className="text-left py-3 px-6 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCampaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-4 px-6">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={selectedCampaigns.includes(campaign.id)}
                      onChange={() => handleSelectCampaign(campaign.id)}
                    />
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-semibold text-foreground">{campaign.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">{campaign.subject}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                          campaign.mode === "crm" 
                            ? "bg-info/10 text-info border border-info/20" 
                            : "bg-success/10 text-success border border-success/20"
                        }`}>
                          {campaign.mode === "crm" ? <Users className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                          {campaign.mode === "crm" ? "CRM" : "Student"}
                        </span>
                        {campaign.automation && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-accent/10 text-accent border border-accent/20">
                            <Zap className="w-3 h-3" />
                            Auto
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(campaign.status)}`}>
                      {getStatusIcon(campaign.status)}
                      {campaign.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <span className="font-medium text-foreground">{campaign.audience}</span>
                      <div className="text-sm text-muted-foreground mt-1">
                        {campaign.sent ?? campaign.recipients ?? "—"} recipients
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {campaign.status === "sent" ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Opened:</span>
                          <span className="font-medium text-foreground">{campaign.opened}</span>
                          <span className="text-xs text-success">({pct(campaign.opened, campaign.sent)}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Clicked:</span>
                          <span className="font-medium text-foreground">{campaign.clicked}</span>
                          <span className="text-xs text-info">({pct(campaign.clicked, campaign.opened)}%)</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm">
                      <div className="text-foreground">
                        {campaign.dateSent
                          ? `Sent: ${campaign.dateSent}`
                          : campaign.scheduledFor
                          ? `Scheduled: ${campaign.scheduledFor}`
                          : `Created: ${campaign.dateCreated}`}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button className="p-1 hover:bg-muted rounded transition-colors" title="Edit">
                        <Edit size={16} className="text-muted-foreground" />
                      </button>
                      <button className="p-1 hover:bg-muted rounded transition-colors" title="View Report">
                        <Eye size={16} className="text-muted-foreground" />
                      </button>
                      <button className="p-1 hover:bg-muted rounded transition-colors" title="Settings">
                        <Settings size={16} className="text-muted-foreground" />
                      </button>
                      <button className="p-1 hover:bg-muted rounded transition-colors" title="More options">
                        <MoreVertical size={16} className="text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Integration Status */}
      <div className="bg-gradient-to-r from-info/5 to-accent/5 border border-info/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <ExternalLink className="text-info" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-info mb-2">React Email Integration</h3>
            <p className="text-info/80 mb-4">
              Connected to external email service for professional email delivery, template management, and advanced analytics.
              All campaigns are processed through secure, high-deliverability infrastructure.
            </p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-info text-info-foreground rounded-lg hover:bg-info/90 transition-colors">
                Configure Settings
              </button>
              <button className="px-4 py-2 border border-info/30 text-info rounded-lg hover:bg-info/5 transition-colors">
                View Documentation
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success rounded-full" />
            <span className="text-sm font-medium text-success">Connected</span>
          </div>
        </div>
      </div>

      {/* Campaign Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Create New Campaign</h2>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className={`w-3 h-3 rounded-full ${createStep >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`w-3 h-3 rounded-full ${createStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`w-3 h-3 rounded-full ${createStep >= 3 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`w-3 h-3 rounded-full ${createStep >= 4 ? 'bg-primary' : 'bg-muted'}`} />
              </div>
            </div>
            
            <div className="p-6">
              {/* Step 1: Campaign Type */}
              {createStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Campaign Type</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      className={`p-4 border-2 rounded-lg transition-all text-left ${
                        mode === "crm" 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setMode("crm")}
                    >
                      <Users className="w-8 h-8 text-primary mb-2" />
                      <div className="font-medium text-foreground">CRM Campaign</div>
                      <div className="text-sm text-muted-foreground">Lead nurturing, applications, interviews</div>
                    </button>
                    <button 
                      className={`p-4 border-2 rounded-lg transition-all text-left ${
                        mode === "student" 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setMode("student")}
                    >
                      <GraduationCap className="w-8 h-8 text-primary mb-2" />
                      <div className="font-medium text-foreground">Student Record</div>
                      <div className="text-sm text-muted-foreground">Academic updates, course info, support</div>
                    </button>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => setCreateStep(2)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Next: Audience
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Audience Selection */}
              {createStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Select Audience</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {audiences[mode].map((audience) => (
                      <button
                        key={audience.id}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          campaignData.audience === audience.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setCampaignData({...campaignData, audience: audience.id})}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-foreground">{audience.name}</div>
                          <span className="text-sm text-muted-foreground">{audience.count}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{audience.description}</div>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between gap-3 pt-4">
                    <button 
                      onClick={() => setCreateStep(1)}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => setCreateStep(3)}
                      disabled={!campaignData.audience}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next: Template
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Template Selection */}
              {createStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Choose Template</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {templates[mode].map((template) => (
                      <button
                        key={template.id}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          campaignData.template === template.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setCampaignData({...campaignData, template: template.id})}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-foreground">{template.name}</div>
                          <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                            {template.category}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">{template.description}</div>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between gap-3 pt-4">
                    <button 
                      onClick={() => setCreateStep(2)}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => setCreateStep(4)}
                      disabled={!campaignData.template}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next: Details
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Campaign Details */}
              {createStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Campaign Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Campaign Name</label>
                      <input
                        type="text"
                        value={campaignData.name}
                        onChange={(e) => setCampaignData({...campaignData, name: (e.target as HTMLInputElement).value})}
                        placeholder="Enter campaign name"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Email Subject</label>
                      <input
                        type="text"
                        value={campaignData.subject}
                        onChange={(e) => setCampaignData({...campaignData, subject: (e.target as HTMLInputElement).value})}
                        placeholder="Enter email subject line"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Schedule</label>
                      <input
                        type="datetime-local"
                        value={campaignData.scheduledFor}
                        onChange={(e) => setCampaignData({...campaignData, scheduledFor: (e.target as HTMLInputElement).value})}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="automation"     
                        checked={campaignData.automation}
                        onChange={(e) => setCampaignData({...campaignData, automation: (e.target as HTMLInputElement).checked})}
                        className="rounded border-border"
                      />
                      <label htmlFor="automation" className="text-sm text-foreground">    
                        Enable automation and follow-up sequences
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-between gap-3 pt-4">
                    <button 
                      onClick={() => setCreateStep(3)}
                      className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => {
                        // Here you would save the campaign
                        // Campaign created: { mode, ...campaignData }
                        setShowCreateModal(false);
                        setCreateStep(1);
                        setCampaignData({ name: "", subject: "", audience: "", template: "", scheduledFor: "", automation: false });
                      }}
                      disabled={!campaignData.name || !campaignData.subject}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Campaign
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailCampaigns;