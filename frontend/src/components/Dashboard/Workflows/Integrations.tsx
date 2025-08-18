import React, { useMemo, useState } from "react";
import {
  Check,
  X,
  Settings,
  AlertTriangle,
  RefreshCw,
  Plus,
  ExternalLink,
  Zap,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  BarChart3,
  Database,
  Bot,
  CreditCard,
  Users,
  Search,
  Filter as FilterIcon,
  ShieldCheck,
} from "lucide-react";

type Status = "connected" | "warning" | "disconnected" | "planning";
type Health = "excellent" | "good" | "warning" | "error" | "disconnected" | "planning";
type Category =
  | "crm"
  | "communication"
  | "scheduling"
  | "ai"
  | "automation"
  | "analytics"
  | "payments"
  | "marketing"
  | "security"
  | "database";

type Integration = {
  id: string;
  name: string;
  description: string;
  category: Category;
  status: Status;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  provider: string;
  lastSync: string;
  features: string[];
  health: Health;
};

const INTEGRATIONS: Integration[] = [
  { id: "hubspot", name: "HubSpot CRM", description: "Primary CRM for contact management and pipeline tracking", category: "crm", status: "connected", icon: Database, provider: "HubSpot", lastSync: "2 minutes ago", features: ["Contact sync", "Pipeline management", "Email tracking", "Analytics"], health: "excellent" },
  { id: "supabase", name: "Supabase Database", description: "Main database for application data and analytics", category: "database", status: "connected", icon: Database, provider: "Supabase", lastSync: "Real-time", features: ["Data storage", "Real-time updates", "Analytics views", "ML forecasting"], health: "excellent" },

  { id: "email-service", name: "Email Service", description: "Automated email campaigns and notifications", category: "communication", status: "connected", icon: Mail, provider: "Built-in", lastSync: "5 minutes ago", features: ["Automated emails", "Templates", "Open tracking", "Click tracking"], health: "good" },
  { id: "sms-service", name: "SMS Messaging", description: "Smart SMS triggers and behavioral messaging", category: "communication", status: "connected", icon: MessageSquare, provider: "N8N Workflow", lastSync: "1 hour ago", features: ["Automated SMS", "Behavioral triggers", "Delivery tracking"], health: "good" },
  { id: "calling-system", name: "Calling System", description: "VoIP calling with call logging and recording", category: "communication", status: "warning", icon: Phone, provider: "Third-party", lastSync: "3 hours ago", features: ["Call logging", "Call recording", "Click-to-call"], health: "warning" },

  { id: "calendly", name: "Calendly", description: "Interview and meeting scheduling integration", category: "scheduling", status: "connected", icon: Calendar, provider: "Calendly", lastSync: "10 minutes ago", features: ["Auto-scheduling", "Calendar sync", "Reminder emails", "Zoom integration"], health: "excellent" },
  { id: "google-calendar", name: "Google Calendar", description: "Calendar synchronization for staff scheduling", category: "scheduling", status: "disconnected", icon: Calendar, provider: "Google", lastSync: "Never", features: ["Calendar sync", "Event creation", "Availability checking"], health: "disconnected" },

  { id: "langchain", name: "LangChain AI", description: "AI-powered content generation and personalization", category: "ai", status: "connected", icon: Bot, provider: "LangChain", lastSync: "Real-time", features: ["Content personalization", "Email generation", "Chatbot responses"], health: "excellent" },
  { id: "ml-forecasting", name: "ML Forecasting Engine", description: "Predictive enrollment and conversion analytics", category: "ai", status: "connected", icon: BarChart3, provider: "Custom ML", lastSync: "30 minutes ago", features: ["Enrollment predictions", "Risk scoring", "Conversion probability"], health: "excellent" },
  { id: "n8n-workflows", name: "N8N Automation", description: "Workflow automation and process orchestration", category: "automation", status: "connected", icon: Zap, provider: "N8N", lastSync: "15 minutes ago", features: ["Workflow automation", "API integrations", "Data transformation"], health: "good" },

  { id: "google-analytics", name: "Google Analytics", description: "Website traffic and behavior analytics", category: "analytics", status: "warning", icon: BarChart3, provider: "Google", lastSync: "2 hours ago", features: ["Website analytics", "Conversion tracking", "User behavior"], health: "warning" },

  { id: "payment-gateway", name: "Payment Gateway", description: "Online payments for applications and fees", category: "payments", status: "disconnected", icon: CreditCard, provider: "Stripe", lastSync: "Never", features: ["Online payments", "Subscription billing", "Refund processing"], health: "disconnected" },

  { id: "social-media", name: "Social Media Integration", description: "Social media monitoring and publishing", category: "marketing", status: "planning", icon: Users, provider: "Multiple", lastSync: "Not configured", features: ["Social monitoring", "Content publishing", "Lead generation"], health: "planning" },

  { id: "gdpr-compliance", name: "GDPR Compliance", description: "Data protection and privacy compliance tools", category: "security", status: "connected", icon: ShieldCheck, provider: "Built-in", lastSync: "Real-time", features: ["Data audit trails", "Consent management", "Data retention"], health: "excellent" },
];

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "crm", label: "CRM & Data" },
  { value: "communication", label: "Communication" },
  { value: "scheduling", label: "Scheduling" },
  { value: "ai", label: "AI & Machine Learning" },
  { value: "automation", label: "Automation" },
  { value: "analytics", label: "Analytics" },
  { value: "payments", label: "Payments" },
  { value: "marketing", label: "Marketing" },
  { value: "security", label: "Security" },
  { value: "database", label: "Database" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "connected", label: "Connected" },
  { value: "warning", label: "Warning" },
  { value: "disconnected", label: "Disconnected" },
  { value: "planning", label: "Planning" },
] as const;

const categoryIcon = (category: Category) => {
  const map: Record<Category, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
    crm: Database,
    communication: MessageSquare,
    scheduling: Calendar,
    ai: Bot,
    automation: Zap,
    analytics: BarChart3,
    payments: CreditCard,
    marketing: Users,
    security: ShieldCheck,
    database: Database,
  };
  return map[category] ?? Database;
};

const statusBadge = (status: Status) => {
  const m: Record<
    Status,
    { classes: string; Icon: typeof Check | typeof X | typeof AlertTriangle | typeof Plus; label: string }
  > = {
    connected: { classes: "bg-green-100 text-green-800", Icon: Check, label: "Connected" },
    warning: { classes: "bg-yellow-100 text-yellow-800", Icon: AlertTriangle, label: "Warning" },
    disconnected: { classes: "bg-red-100 text-red-800", Icon: X, label: "Disconnected" },
    planning: { classes: "bg-blue-100 text-blue-800", Icon: Plus, label: "Planning" },
  };
  return m[status];
};

const healthDot = (health: Health) => {
  const getColor = (h: Health) => {
    switch (h) {
      case "excellent": return 'hsl(var(--green-500))';
      case "good": return 'hsl(var(--blue-500))';
      case "warning": return 'hsl(var(--amber-500))';
      case "error": return 'hsl(var(--red-500))';
      case "disconnected": return 'hsl(var(--muted-foreground))';
      case "planning": return 'hsl(var(--purple-500))';
      default: return 'hsl(var(--muted-foreground))';
    }
  };
  
  return <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(health) }} />;
};

const Integrations: React.FC = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [category, setCategory] = useState<"all" | Category>("all");

  const filtered = useMemo(() => {
    return INTEGRATIONS.filter((i) => {
      const s = search.toLowerCase();
      const matchesSearch = i.name.toLowerCase().includes(s) || i.description.toLowerCase().includes(s);
      const matchesStatus = status === "all" ? true : i.status === status;
      const matchesCategory = category === "all" ? true : i.category === category;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [search, status, category]);

  const statusCounts = useMemo(() => {
    return INTEGRATIONS.reduce<Record<string, number>>((acc, i) => {
      acc[i.status] = (acc[i.status] ?? 0) + 1;
      return acc;
    }, {});
  }, []);

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: 'hsl(var(--slate-50))' }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--slate-900))' }}>Integrations</h1>
        <p className="mt-1" style={{ color: 'hsl(var(--slate-600))' }}>Manage all third-party connections and data flows</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Connected", color: 'hsl(var(--green-600))', dot: 'hsl(var(--green-500))', value: statusCounts.connected ?? 0 },
          { label: "Warning", color: 'hsl(var(--amber-600))', dot: 'hsl(var(--amber-500))', value: statusCounts.warning ?? 0 },
          { label: "Disconnected", color: 'hsl(var(--red-600))', dot: 'hsl(var(--red-500))', value: statusCounts.disconnected ?? 0 },
          { label: "Planning", color: 'hsl(var(--blue-600))', dot: 'hsl(var(--blue-500))', value: statusCounts.planning ?? 0 },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-lg border shadow-sm" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>{s.label}</p>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.dot }} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="p-4 rounded-lg border shadow-sm mb-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(var(--text-tertiary))' }} />
              <input
                type="text"
                placeholder="Search integrations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                style={{ 
                  borderColor: 'hsl(var(--card-border))',
                  backgroundColor: 'hsl(var(--surface-primary))',
                  color: 'hsl(var(--text-primary))'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'hsl(var(--slate-500))';
                  e.target.style.boxShadow = '0 0 0 2px hsl(var(--slate-500) / 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'hsl(var(--card-border))';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as "all" | Category)}
              className="px-3 py-2 border rounded-lg"
              style={{ 
                borderColor: 'hsl(var(--card-border))',
                backgroundColor: 'hsl(var(--surface-primary))',
                color: 'hsl(var(--text-primary))'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'hsl(var(--slate-500))';
                e.target.style.boxShadow = '0 0 0 2px hsl(var(--slate-500) / 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'hsl(var(--card-border))';
                e.target.style.boxShadow = 'none';
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "all" | Status)}
              className="px-3 py-2 border rounded-lg"
              style={{ 
                borderColor: 'hsl(var(--card-border))',
                backgroundColor: 'hsl(var(--surface-primary))',
                color: 'hsl(var(--text-primary))'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'hsl(var(--slate-500))';
                e.target.style.boxShadow = '0 0 0 2px hsl(var(--slate-500) / 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'hsl(var(--card-border))';
                e.target.style.boxShadow = 'none';
              }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((i) => {
          const Icon = i.icon;
          const CatIcon = categoryIcon(i.category);
          const badge = statusBadge(i.status);
          return (
            <div key={i.id} className="rounded-lg border shadow-sm hover:shadow-md transition-shadow flex flex-col" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
              <div className="p-6 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'hsl(var(--surface-tertiary))' }}>
                      <Icon className="w-6 h-6" style={{ color: 'hsl(var(--text-secondary))' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>{i.name}</h3>
                      <p className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>{i.provider}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {healthDot(i.health)}
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: badge.classes.includes('bg-green-100') ? 'hsl(var(--green-100))' : 
                                                                                                                           badge.classes.includes('bg-yellow-100') ? 'hsl(var(--amber-100))' : 
                                                                                                                           badge.classes.includes('bg-red-100') ? 'hsl(var(--red-100))' : 
                                                                                                                           'hsl(var(--blue-100))',
                                                                                                                           color: badge.classes.includes('text-green-800') ? 'hsl(var(--green-700))' : 
                                                                                                                           badge.classes.includes('text-yellow-800') ? 'hsl(var(--amber-700))' : 
                                                                                                                           badge.classes.includes('text-red-800') ? 'hsl(var(--red-700))' : 
                                                                                                                           'hsl(var(--blue-700))' }}>
                      <badge.Icon className="w-3 h-3 mr-1" />
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm mb-4 flex-1" style={{ color: 'hsl(var(--text-secondary))' }}>{i.description}</p>

                {/* Features */}
                <div className="mb-4">
                  <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--text-tertiary))' }}>Features</p>
                  <div className="flex flex-wrap gap-1">
                    {i.features.slice(0, 3).map((f, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs rounded" style={{ backgroundColor: 'hsl(var(--surface-tertiary))', color: 'hsl(var(--text-secondary))' }}>
                        {f}
                      </span>
                    ))}
                    {i.features.length > 3 && (
                      <span className="px-2 py-1 text-xs rounded" style={{ backgroundColor: 'hsl(var(--surface-tertiary))', color: 'hsl(var(--text-secondary))' }}>+{i.features.length - 3} more</span>
                    )}
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between text-sm mb-4" style={{ color: 'hsl(var(--text-tertiary))' }}>
                  <span>Last sync: {i.lastSync}</span>
                  <CatIcon className="w-4 h-4" />
                </div>

                {/* Actions - Push to bottom */}
                <div className="mt-auto">
                  <div className="flex gap-2">
                    {i.status === "connected" && (
                      <>
                        <button className="flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--slate-900))', color: 'white' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--slate-800))';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--slate-900))';
                          }}>
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </button>
                        <button className="p-2 border rounded-lg" style={{ 
                          borderColor: 'hsl(var(--card-border))', 
                          backgroundColor: 'hsl(var(--surface-primary))',
                          color: 'hsl(var(--text-secondary))'
                        }} 
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'hsl(var(--surface-tertiary))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'hsl(var(--surface-primary))';
                        }}
                        title="Refresh">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {i.status === "warning" && (
                      <>
                        <button className="flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--slate-900))', color: 'white' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--slate-800))';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--slate-900))';
                          }}>
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Fix Issues
                        </button>
                        <button className="p-2 border rounded-lg" style={{ 
                          borderColor: 'hsl(var(--card-border))', 
                          backgroundColor: 'hsl(var(--surface-primary))',
                          color: 'hsl(var(--text-secondary))'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'hsl(var(--surface-tertiary))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'hsl(var(--surface-primary))';
                        }}
                        title="Settings">
                          <Settings className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {i.status === "disconnected" && (
                      <button className="flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--slate-900))', color: 'white' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'hsl(var(--slate-800))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'hsl(var(--slate-900))';
                        }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Connect
                      </button>
                    )}
                    {i.status === "planning" && (
                      <button className="flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--slate-900))', color: 'white' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'hsl(var(--slate-800))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'hsl(var(--slate-900))';
                        }}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Learn More
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <FilterIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'hsl(var(--text-tertiary))' }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: 'hsl(var(--text-primary))' }}>No integrations found</h3>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Add New Integration */}
      <div className="fixed bottom-6 right-6">
        <button className="p-4 rounded-full shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: 'hsl(var(--slate-900))', color: 'white' }} title="Add Integration"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'hsl(var(--slate-800))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'hsl(var(--slate-900))';
          }}>
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default Integrations;