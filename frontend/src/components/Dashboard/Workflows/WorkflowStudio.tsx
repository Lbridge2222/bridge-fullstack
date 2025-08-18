import React, { useState } from "react";
import {
  Layers,
  Sparkles,
  Cpu,
  Brain,
  Search,
  RefreshCw,
  MoreVertical,
  Workflow as FlowIcon,
  TrendingUp,
  Activity,
  Copy,
  Eye,
  Play,
  Target,
  Plus,
  Upload,
  Palette,
} from "lucide-react";

type Mode = "visual" | "ai" | "code";

type WorkflowItem = {
  id: string;
  name: string;
  description: string;
  status: "active" | "draft";
  lastRun: string;
  success: number;
  nodes: number;
  triggers: string[];
  category: string;
  executions: number;
  aiSuggestions?: string[];
  complexity?: "Beginner" | "Advanced" | "Expert";
  impact?: "Medium" | "High" | "Critical";
};

const initial: WorkflowItem[] = [
  {
    id: "lead-capture",
    name: "AI Lead Capture & Scoring",
    description:
      "Automatically process form submissions, score leads with ML, and trigger personalized responses",
    status: "active",
    lastRun: "2 minutes ago",
    success: 98.5,
    nodes: 8,
    triggers: ["Form Submit", "API Webhook"],
    category: "Lead Management",
    executions: 2847,
    aiSuggestions: ["Add sentiment analysis", "Optimize timing triggers"],
    complexity: "Advanced",
    impact: "High",
  },
  {
    id: "interview-booking",
    name: "Smart Interview Scheduling",
    description:
      "AI-powered calendar optimization with reminder automation and no-show prediction",
    status: "active",
    lastRun: "15 minutes ago",
    success: 94.2,
    nodes: 12,
    triggers: ["Lead Qualified", "Manual Trigger"],
    category: "Scheduling",
    executions: 1203,
    aiSuggestions: ["Predictive rescheduling", "Weather impact analysis"],
    complexity: "Expert",
    impact: "High",
  },
  {
    id: "nurture-sequence",
    name: "12-Month Admissions Journey",
    description:
      "ML-driven nurturing with predictive intervention and multi-channel engagement",
    status: "active",
    lastRun: "1 hour ago",
    success: 96.8,
    nodes: 15,
    triggers: ["Application Received", "Time Based"],
    category: "Student Journey",
    executions: 892,
    aiSuggestions: ["Enhance personalization", "Add cohort analysis"],
    complexity: "Expert",
    impact: "Critical",
  },
];

const badgeForComplexity = (c?: WorkflowItem["complexity"]) => {
  switch (c) {
    case "Beginner":
      return { backgroundColor: 'hsl(var(--green-100))', color: 'hsl(var(--green-700))' };
    case "Advanced":
      return { backgroundColor: 'hsl(var(--blue-100))', color: 'hsl(var(--blue-700))' };
    case "Expert":
      return { backgroundColor: 'hsl(var(--purple-100))', color: 'hsl(var(--purple-700))' };
    default:
      return { backgroundColor: 'hsl(var(--slate-100))', color: 'hsl(var(--slate-700))' };
  }
};

const WorkflowStudio: React.FC = () => {
  const [mode, setMode] = useState<Mode>("visual");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "draft">("all");
  const [dark, setDark] = useState(false);
  const [aiInput, setAiInput] = useState("");

  const workflows = initial.filter((w) => {
    const f =
      filter === "all" ||
      (filter === "active" && w.status === "active") ||
      (filter === "draft" && w.status === "draft");
    const s =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase()) ||
      w.category.toLowerCase().includes(search.toLowerCase());
    return f && s;
  });

  return (
    <div style={{ backgroundColor: dark ? 'hsl(var(--slate-900))' : 'hsl(var(--slate-50))' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b backdrop-blur supports-[backdrop-filter]:bg-white/80"
        style={{
          backgroundColor: dark ? 'hsl(var(--slate-900) / 0.95)' : 'hsl(var(--background) / 0.95)',
          borderColor: dark ? 'hsl(var(--slate-800))' : 'hsl(var(--border))'
        }}
      >
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, hsl(var(--red-500)), hsl(var(--red-600)))' }}>
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: dark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))' }}>
                Workflow Studio
              </h1>
              <p className="text-sm" style={{ color: dark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))' }}>
                Build automations with Visual, AI, or Code modes
              </p>
            </div>
          </div>

          {/* Mode switch + actions */}
          <div className="flex items-center gap-3">
            <div
              className="p-1 rounded-2xl flex"
              style={{ backgroundColor: dark ? 'hsl(var(--slate-800))' : 'hsl(var(--muted))' }}
            >
              {[
                { k: "visual", icon: Layers, label: "Visual" },
                { k: "ai", icon: Sparkles, label: "AI" },
                { k: "code", icon: Cpu, label: "Code" },
              ].map(({ k, icon: Icon, label }) => (
                <button
                  key={k}
                  onClick={() => setMode(k as Mode)}
                  className="px-4 py-2 rounded-xl flex items-center gap-2 text-sm transition"
                  style={{
                    backgroundColor: mode === k ? 'hsl(var(--slate-900))' : 'transparent',
                    color: mode === k ? 'white' : dark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))'
                  }}
                  onMouseEnter={(e) => {
                    if (mode !== k) {
                      e.currentTarget.style.backgroundColor = dark ? 'hsl(var(--slate-700))' : 'hsl(var(--background))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (mode !== k) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setDark((v) => !v)}
              className="p-2 rounded-lg border"
              style={{
                borderColor: dark ? 'hsl(var(--slate-700))' : 'hsl(var(--border))',
                backgroundColor: dark ? 'hsl(var(--slate-800))' : 'hsl(var(--background))',
                color: dark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))'
              }}
              title="Toggle theme"
            >
              <Palette className="w-4 h-4" />
            </button>
            <button
              className="px-4 py-2 rounded-lg border flex items-center gap-2"
              style={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--foreground))'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--muted))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--background))';
              }}
              title="Import"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button className="px-4 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'hsl(var(--red-600))', color: 'white' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--red-700))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--red-600))';
              }}>
              <Plus className="w-4 h-4" />
              New Workflow
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Shared toolbar */}
        <div
          className="mb-6 rounded-2xl border p-4"
          style={{
            backgroundColor: dark ? 'hsl(var(--slate-800))' : 'hsl(var(--background))',
            borderColor: dark ? 'hsl(var(--slate-700))' : 'hsl(var(--border))'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search
                  className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search workflows..."
                  className="pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: dark ? 'hsl(var(--slate-800))' : 'hsl(var(--background))',
                    borderColor: dark ? 'hsl(var(--slate-700))' : 'hsl(var(--border))',
                    color: dark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))'
                  }}
                />
              </div>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: dark ? 'hsl(var(--slate-800))' : 'hsl(var(--background))',
                  borderColor: dark ? 'hsl(var(--slate-700))' : 'hsl(var(--border))',
                  color: dark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))'
                }}
              >
                <option value="all">All Workflows</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <button
              className="p-2 rounded-lg border"
              style={{
                borderColor: dark ? 'hsl(var(--slate-700))' : 'hsl(var(--border))',
                backgroundColor: dark ? 'hsl(var(--slate-800))' : 'hsl(var(--background))',
                color: dark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--muted))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = dark ? 'hsl(var(--slate-800))' : 'hsl(var(--background))';
              }}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modes */}
        {mode === "ai" && (
          <div
            className="rounded-2xl border p-6 mb-8"
            style={{
              backgroundColor: dark ? 'hsl(var(--slate-800))' : 'hsl(var(--background))',
              borderColor: dark ? 'hsl(var(--slate-700))' : 'hsl(var(--border))'
            }}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(var(--purple-500)), hsl(var(--purple-600)))' }}>
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold" style={{ color: dark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))' }}>
                  AI Workflow Builder
                </h2>
                <p style={{ color: dark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))' }}>
                  Describe your automation in natural language.
                </p>
              </div>
            </div>

            <div
              className="rounded-xl border-2 border-dashed p-4 mb-4"
              style={{
                backgroundColor: dark ? 'hsl(var(--slate-800))' : 'hsl(var(--background))',
                borderColor: dark ? 'hsl(var(--slate-700))' : 'hsl(var(--border))'
              }}
            >
              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="e.g., Send personalized follow-ups to leads who downloaded the prospectus but didn't book an interview within 3 days."
                className="w-full h-28 resize-none focus:outline-none"
                style={{
                  backgroundColor: 'transparent',
                  color: dark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))'
                }}
              />
              <div className="flex justify-end">
                <button className="px-4 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'hsl(var(--slate-900))', color: 'white' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'hsl(var(--slate-800))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'hsl(var(--slate-900))';
                  }}>
                  <Sparkles className="w-4 h-4" />
                  Generate Workflow
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "Identify high-potential leads from engagement patterns",
                "Auto follow-up for interview no-shows (predictive re-engagement)",
                "Urgent deadline multi-channel alerts",
                "Portfolio assessment & feedback routing",
                "Intent-based inquiry routing by program",
              ].map((s, i) => (
                <button
                  key={i}
                  onClick={() => setAiInput(s)}
                  className="text-left px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: dark ? 'hsl(var(--slate-800))' : 'hsl(var(--background))',
                    borderColor: dark ? 'hsl(var(--slate-700))' : 'hsl(var(--border))',
                    color: dark ? 'hsl(var(--slate-200))' : 'hsl(var(--slate-700))'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = dark ? 'hsl(var(--slate-700))' : 'hsl(var(--muted))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = dark ? 'hsl(var(--slate-800))' : 'hsl(var(--background))';
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Visual & Code both show the grid for now; Code mode could switch to editor later */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {workflows.map((w) => (
            <div
              key={w.id}
              className="rounded-2xl border shadow-sm hover:shadow-md transition"
              style={{
                backgroundColor: dark ? 'hsl(var(--slate-800))' : 'hsl(var(--background))',
                borderColor: dark ? 'hsl(var(--slate-700))' : 'hsl(var(--border))'
              }}
            >
              <div className="h-1 rounded-t-2xl" style={{ background: 'linear-gradient(to right, hsl(var(--red-500)), hsl(var(--red-600)))' }} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl text-white flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--slate-900))' }}>
                      <FlowIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: dark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))' }}>
                        {w.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={badgeForComplexity(w.complexity)}
                        >
                          {w.category}
                        </span>
                        {w.complexity && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={badgeForComplexity(w.complexity)}
                          >
                            {w.complexity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button 
                    className="p-1 rounded" 
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = dark ? 'hsl(var(--slate-700))' : 'hsl(var(--muted))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <MoreVertical className="w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
                  </button>
                </div>

                <p className="text-sm mb-4" style={{ color: dark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))' }}>
                  {w.description}
                </p>

                {w.aiSuggestions && (
                  <div className="mb-4">
                    <div className="text-xs font-medium mb-2 flex items-center gap-2" style={{ color: dark ? 'hsl(var(--slate-200))' : 'hsl(var(--slate-800))' }}>
                      <Sparkles className="w-4 h-4" style={{ color: 'hsl(var(--amber-500))' }} />
                      AI Suggestions
                    </div>
                    <div className="space-y-1">
                      {w.aiSuggestions.map((s, i) => (
                        <div
                          key={i}
                          className="text-xs rounded border px-2 py-1"
                          style={{
                            backgroundColor: dark ? 'hsl(var(--slate-800))' : 'hsl(var(--amber-50))',
                            borderColor: dark ? 'hsl(var(--slate-700))' : 'hsl(var(--amber-200))',
                            color: dark ? 'hsl(var(--slate-300))' : 'hsl(var(--amber-800))'
                          }}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: dark ? 'hsl(var(--slate-700) / 0.4)' : 'hsl(var(--slate-50))' }}
                  >
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--slate-500))' }}>
                      <TrendingUp className="w-4 h-4" style={{ color: 'hsl(var(--green-600))' }} />
                      Success
                    </div>
                    <div className="mt-1 flex items-end gap-2">
                      <span
                        className="text-xl font-bold"
                        style={{
                          color: w.success >= 95
                            ? 'hsl(var(--green-600))'
                            : w.success >= 90
                            ? 'hsl(var(--amber-600))'
                            : 'hsl(var(--red-600))'
                        }}
                      >
                        {w.success}%
                      </span>
                      <div className="h-2 w-16 rounded overflow-hidden" style={{ backgroundColor: 'hsl(var(--slate-200))' }}>
                        <div
                          className="h-full"
                          style={{
                            backgroundColor: w.success >= 95
                              ? 'hsl(var(--green-600))'
                              : w.success >= 90
                              ? 'hsl(var(--amber-600))'
                              : 'hsl(var(--red-600))',
                            width: `${w.success}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: dark ? 'hsl(var(--slate-700) / 0.4)' : 'hsl(var(--slate-50))' }}
                  >
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--slate-500))' }}>
                      <Activity className="w-4 h-4" style={{ color: 'hsl(var(--blue-600))' }} />
                      Executions
                    </div>
                    <div className="mt-1 text-xl font-bold" style={{ color: 'hsl(var(--blue-600))' }}>
                      {w.executions.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2" style={{ backgroundColor: 'hsl(var(--slate-900))', color: 'white' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'hsl(var(--slate-800))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'hsl(var(--slate-900))';
                    }}>
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button className="p-2 rounded-lg border" style={{ borderColor: 'hsl(var(--slate-200))' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'hsl(var(--slate-50))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}>
                    <Play className="w-4 h-4" style={{ color: 'hsl(var(--green-600))' }} />
                  </button>
                  <button className="p-2 rounded-lg border" style={{ borderColor: 'hsl(var(--slate-200))' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'hsl(var(--slate-50))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}>
                    <Copy className="w-4 h-4" style={{ color: 'hsl(var(--slate-600))' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer stats */}
        <div
          className="mt-8 rounded-xl border px-4 py-3 text-sm flex items-center justify-between"
          style={{
            backgroundColor: dark ? 'hsl(var(--slate-800))' : 'hsl(var(--background))',
            borderColor: dark ? 'hsl(var(--slate-700))' : 'hsl(var(--border))',
            color: dark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))'
          }}
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(var(--green-500))' }} />
              <span>
                {workflows.filter((w) => w.status === "active").length} Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" style={{ color: 'hsl(var(--blue-600))' }} />
              <span>
                {workflows.reduce((a, w) => a + w.executions, 0).toLocaleString()} Total Executions
              </span>
            </div>
          </div>
          <span style={{ color: 'hsl(var(--muted-foreground))' }}>Powered by WaterBear AI</span>
        </div>
      </div>
    </div>
  );
};

export default WorkflowStudio;