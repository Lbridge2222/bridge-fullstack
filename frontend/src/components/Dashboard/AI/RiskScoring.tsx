import React, { useMemo, useState } from "react";
import {
  Shield, AlertTriangle, Brain, Users, Clock, CheckCircle, Target, BarChart3,
  Search, RefreshCw, ChevronDown, ChevronUp, Mail, Phone, Download, Zap, GraduationCap
} from "lucide-react";

/** Types */
type RiskLevel = "critical" | "high" | "medium" | "low";
type Trend = "increasing" | "decreasing" | "stable";

type Student = {
  id: number;
  name: string;
  program: string;
  year: number;
  riskScore: number;
  riskLevel: RiskLevel | "critical"; // allow explicit "critical"
  primaryRisk: string;
  lastContact: string;
  nextAction: string;
  predictedOutcome: string;
  factors: string[];
  avatar: string;
};

type ProgramRisk = {
  program: string;
  students: number;
  highRisk: number;
  riskRate: number; // %
  trend: Trend;
};

type RiskFactor = {
  factor: string;
  weight: number; // 0..1
  impact: "high" | "medium";
  trend: "declining" | "improving" | "stable";
};

type Intervention = {
  type: string;
  count: number;
  successRate: number; // %
  avgDuration: string;
};

const riskData = {
  overview: {
    totalStudents: 1247,
    highRisk: 89,
    mediumRisk: 156,
    lowRisk: 1002,
    criticalActions: 23,
    interventionsNeeded: 67,
    avgRiskScore: 23.4,
  },
  riskFactors: [
    { factor: "Academic Performance", weight: 0.32, impact: "high", trend: "stable" },
    { factor: "Attendance Patterns", weight: 0.28, impact: "high", trend: "declining" },
    { factor: "Engagement Levels", weight: 0.22, impact: "medium", trend: "improving" },
    { factor: "Financial Status", weight: 0.18, impact: "medium", trend: "stable" },
  ] as RiskFactor[],
  criticalStudents: [
    {
      id: 1,
      name: "Alex Thompson",
      program: "Music Production",
      year: 2,
      riskScore: 87,
      riskLevel: "critical",
      primaryRisk: "Academic Performance",
      lastContact: "6 days ago",
      nextAction: "Academic Support Meeting",
      predictedOutcome: "Drop-out likely in 30 days",
      factors: ["Low grades (42%)", "Missed 8 classes", "No engagement"],
      avatar: "AT",
    },
    {
      id: 2,
      name: "Maya Patel",
      program: "Sound Engineering",
      year: 1,
      riskScore: 82,
      riskLevel: "critical",
      primaryRisk: "Financial Stress",
      lastContact: "3 days ago",
      nextAction: "Financial Aid Review",
      predictedOutcome: "Payment issues - intervention needed",
      factors: ["Payment overdue", "Part-time job conflicts", "Stress indicators"],
      avatar: "MP",
    },
    {
      id: 3,
      name: "Jordan Smith",
      program: "Music Business",
      year: 3,
      riskScore: 79,
      riskLevel: "high",
      primaryRisk: "Engagement",
      lastContact: "1 day ago",
      nextAction: "Career Guidance Session",
      predictedOutcome: "Motivation declining - needs support",
      factors: ["Low participation", "Career uncertainty", "Peer isolation"],
      avatar: "JS",
    },
  ] as Student[],
  programRisks: [
    { program: "Music Production", students: 234, highRisk: 18, riskRate: 7.7, trend: "stable" },
    { program: "Sound Engineering", students: 189, highRisk: 23, riskRate: 12.2, trend: "increasing" },
    { program: "Music Business", students: 156, highRisk: 12, riskRate: 7.7, trend: "decreasing" },
    { program: "Composition", students: 98, highRisk: 8, riskRate: 8.2, trend: "stable" },
    { program: "Performance", students: 87, highRisk: 11, riskRate: 12.6, trend: "increasing" },
  ] as ProgramRisk[],
  interventions: [
    { type: "Academic Support", count: 23, successRate: 78, avgDuration: "6 weeks" },
    { type: "Financial Aid", count: 15, successRate: 89, avgDuration: "2 weeks" },
    { type: "Mental Health", count: 31, successRate: 67, avgDuration: "8 weeks" },
    { type: "Career Guidance", count: 19, successRate: 84, avgDuration: "4 weeks" },
  ] as Intervention[],
};

function riskPill(level: RiskLevel | "critical") {
  const map: Record<RiskLevel | "critical", { backgroundColor: string; color: string }> = {
    critical: { backgroundColor: 'hsl(var(--red-100))', color: 'hsl(var(--red-700))' },
    high: { backgroundColor: 'hsl(var(--orange-100))', color: 'hsl(var(--orange-700))' },
    medium: { backgroundColor: 'hsl(var(--amber-100))', color: 'hsl(var(--amber-700))' },
    low: { backgroundColor: 'hsl(var(--green-100))', color: 'hsl(var(--green-700))' },
  };
  return map[level] ?? { backgroundColor: 'hsl(var(--slate-100))', color: 'hsl(var(--slate-700))' };
}

/** Cards */
const StudentRiskCard: React.FC<{ student: Student }> = ({ student }) => (
  <div className="rounded-lg border p-6 hover:shadow-md transition-shadow" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-medium" style={{ backgroundColor: 'hsl(var(--surface-tertiary))', color: 'hsl(var(--text-secondary))' }}>
          {student.avatar}
        </div>
        <div>
          <h3 className="font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>{student.name}</h3>
          <p className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
            {student.program} • Year {student.year}
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold" style={{ color: 'hsl(var(--red-600))' }}>{student.riskScore}</div>
        <div className="px-2 py-1 rounded-full text-xs font-medium" style={riskPill(student.riskLevel)}>
          {student.riskLevel.toUpperCase()}
        </div>
      </div>
    </div>

    <div className="space-y-3">
      <div className="flex justify-between items-center text-sm">
        <span style={{ color: 'hsl(var(--text-secondary))' }}>Primary Risk:</span>
        <span className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>{student.primaryRisk}</span>
      </div>

      <div className="flex justify-between items-center text-sm">
        <span style={{ color: 'hsl(var(--text-secondary))' }}>Last Contact:</span>
        <span style={{ color: 'hsl(var(--text-primary))' }}>{student.lastContact}</span>
      </div>

      <div className="rounded-lg p-3" style={{ backgroundColor: 'hsl(var(--surface-tertiary))' }}>
        <div className="text-xs mb-1" style={{ color: 'hsl(var(--text-secondary))' }}>Key Risk Factors:</div>
        <div className="space-y-1">
          {student.factors.map((f, i) => (
            <div key={i} className="text-sm flex items-center gap-2" style={{ color: 'hsl(var(--text-secondary))' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'hsl(var(--red-400))' }} />
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg p-3" style={{ backgroundColor: 'hsl(var(--blue-50))' }}>
        <div className="text-xs mb-1" style={{ color: 'hsl(var(--blue-600))' }}>AI Prediction:</div>
        <div className="text-sm" style={{ color: 'hsl(var(--blue-800))' }}>{student.predictedOutcome}</div>
      </div>

      <div className="flex gap-2 pt-2">
        <button className="flex-1 px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors duration-200" style={{ backgroundColor: 'hsl(var(--blue-600))', color: 'white' }}>
          {student.nextAction}
        </button>
        <button className="px-3 py-2 border rounded-lg text-sm transition-colors duration-200" title="Call" style={{ borderColor: 'hsl(var(--card-border))' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--surface-tertiary))'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
          <Phone size={16} />
        </button>
        <button className="px-3 py-2 border rounded-lg text-sm transition-colors duration-200" title="Email" style={{ borderColor: 'hsl(var(--card-border))' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--surface-tertiary))'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
          <Mail size={16} />
        </button>
      </div>
    </div>
  </div>
);

const ProgramRiskCard: React.FC<{ program: ProgramRisk }> = ({ program }) => (
  <div className="rounded-lg border p-4" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
    <div className="flex items-center justify-between mb-3">
      <h4 className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>{program.program}</h4>
      <div
        className="px-2 py-1 rounded-full text-xs"
        style={{
          backgroundColor: program.trend === "increasing" ? 'hsl(var(--red-100))' : 
                         program.trend === "decreasing" ? 'hsl(var(--green-100))' : 
                         'hsl(var(--slate-100))',
          color: program.trend === "increasing" ? 'hsl(var(--red-700))' : 
                 program.trend === "decreasing" ? 'hsl(var(--green-700))' : 
                 'hsl(var(--slate-700))'
        }}
      >
        {program.trend}
      </div>
    </div>

    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span style={{ color: 'hsl(var(--text-secondary))' }}>Total Students</span>
        <span className="font-medium">{program.students}</span>
      </div>
      <div className="flex justify-between">
        <span style={{ color: 'hsl(var(--text-secondary))' }}>High Risk</span>
        <span className="font-bold" style={{ color: 'hsl(var(--red-600))' }}>{program.highRisk}</span>
      </div>
      <div className="flex justify-between">
        <span style={{ color: 'hsl(var(--text-secondary))' }}>Risk Rate</span>
        <span className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>{program.riskRate}%</span>
      </div>
    </div>

    <div className="mt-3 w-full rounded-full h-2" style={{ backgroundColor: 'hsl(var(--surface-tertiary))' }}>
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ 
          width: `${Math.min(program.riskRate * 5, 100)}%`,
          backgroundColor: program.riskRate > 10 ? 'hsl(var(--red-500))' : 
                         program.riskRate > 8 ? 'hsl(var(--orange-500))' : 
                         'hsl(var(--green-500))'
        }}
      />
    </div>
  </div>
);

/** Page */
const RiskScoring: React.FC = () => {
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<"all" | RiskLevel>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<string[]>(["critical", "programs"]);

  const toggle = (key: string) =>
    setExpanded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return riskData.criticalStudents.filter((s) => {
      const matchesLevel = selectedRiskLevel === "all" || s.riskLevel === selectedRiskLevel;
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.program.toLowerCase().includes(q) ||
        s.primaryRisk.toLowerCase().includes(q);
      return matchesLevel && matchesQuery;
    });
  }, [selectedRiskLevel, searchQuery]);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'hsl(var(--slate-50))' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--slate-900))' }}>Risk Scoring</h1>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: 'hsl(var(--red-100))', color: 'hsl(var(--red-800))' }}>
              <Shield size={14} />
              AI-Powered
            </div>
          </div>
          <p className="mt-2" style={{ color: 'hsl(var(--slate-600))' }}>
            Early intervention system using machine learning to predict student success
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: 'hsl(var(--text-tertiary))' }} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg text-sm w-64 focus:ring-2"
              style={{ 
                borderColor: 'hsl(var(--card-border))',
                backgroundColor: 'hsl(var(--surface-primary))',
                color: 'hsl(var(--text-primary))'
              }}
            />
          </div>

          <select
            value={selectedRiskLevel}
            onChange={(e) => setSelectedRiskLevel(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2"
            style={{ 
              borderColor: 'hsl(var(--card-border))',
              backgroundColor: 'hsl(var(--surface-primary))',
              color: 'hsl(var(--text-primary))'
            }}
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200" style={{ backgroundColor: 'hsl(var(--blue-600))', color: 'white' }}>
            <RefreshCw size={16} />
            Update Scores
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-6 gap-6 mb-8">
        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-blue-600" size={20} />
            <h3 className="font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Total Students</h3>
          </div>
        <div className="text-3xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{riskData.overview.totalStudents}</div>
          <div className="text-sm mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>Active in system</div>
        </div>

        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-red-600" size={20} />
            <h3 className="font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Critical Risk</h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--red-600))' }}>{riskData.overview.highRisk}</div>
          <div className="text-sm mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>Immediate action needed</div>
        </div>

        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="text-orange-600" size={20} />
            <h3 className="font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Medium Risk</h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--orange-600))' }}>{riskData.overview.mediumRisk}</div>
          <div className="text-sm mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>Monitoring required</div>
        </div>

        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-600" size={20} />
            <h3 className="font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Low Risk</h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--green-600))' }}>{riskData.overview.lowRisk}</div>
          <div className="text-sm mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>On track</div>
        </div>

        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-purple-600" size={20} />
            <h3 className="font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Interventions</h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--purple-600))' }}>{riskData.overview.interventionsNeeded}</div>
          <div className="text-sm mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>Support programs</div>
        </div>

        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={20} style={{ color: 'hsl(var(--text-secondary))' }} />
            <h3 className="font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Avg Risk Score</h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{riskData.overview.avgRiskScore}</div>
          <div className="text-sm mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>Population baseline</div>
        </div>
      </div>

      {/* Critical Students */}
      <div className="rounded-lg border mb-8" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
        <button
          className="w-full flex items-center justify-between p-6 border-b"
          onClick={() => toggle("critical")}
          style={{ borderColor: 'hsl(var(--card-border))' }}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600" size={20} />
            <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Critical Risk Students</h2>
            <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'hsl(var(--red-100))', color: 'hsl(var(--red-700))' }}>
              {riskData.overview.criticalActions} Need Action
            </div>
          </div>
          {expanded.includes("critical") ? (
            <ChevronUp size={20} style={{ color: 'hsl(var(--text-tertiary))' }} />
          ) : (
            <ChevronDown size={20} style={{ color: 'hsl(var(--text-tertiary))' }} />
          )}
        </button>

        {expanded.includes("critical") && (
          <div className="p-6">
            {filteredStudents.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudents.map((s) => (
                  <StudentRiskCard key={s.id} student={s} />
                ))}
              </div>
            ) : (
              <div className="p-6 text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>No students match your filters.</div>
            )}
          </div>
        )}
      </div>

      {/* Program Risk Analysis */}
      <div className="rounded-lg border mb-8" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
        <button
          className="w-full flex items-center justify-between p-6 border-b"
          onClick={() => toggle("programs")}
          style={{ borderColor: 'hsl(var(--card-border))' }}
        >
          <div className="flex items-center gap-3">
            <GraduationCap className="text-blue-600" size={20} />
            <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Program Risk Analysis</h2>
          </div>
          {expanded.includes("programs") ? (
            <ChevronUp size={20} style={{ color: 'hsl(var(--text-tertiary))' }} />
          ) : (
            <ChevronDown size={20} style={{ color: 'hsl(var(--text-tertiary))' }} />
          )}
        </button>

        {expanded.includes("programs") && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {riskData.programRisks.map((p, i) => (
                <ProgramRiskCard key={i} program={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Risk Factors + Interventions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Risk Factors */}
        <div className="rounded-lg border" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'hsl(var(--card-border))' }}>
            <div className="flex items-center gap-3">
              <Brain className="text-purple-600" size={20} />
              <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Key Risk Factors</h2>
              <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'hsl(var(--purple-100))', color: 'hsl(var(--purple-700))' }}>ML Weighted</div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {riskData.riskFactors.map((f, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.impact === "high" ? 'hsl(var(--red-500))' : 'hsl(var(--orange-500))' }} />
                    <span className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>{f.factor}</span>
                    <span
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: f.trend === "improving" ? 'hsl(var(--green-100))' : 
                                       f.trend === "declining" ? 'hsl(var(--red-100))' : 
                                       'hsl(var(--slate-100))',
                        color: f.trend === "improving" ? 'hsl(var(--green-700))' : 
                               f.trend === "declining" ? 'hsl(var(--red-700))' : 
                               'hsl(var(--slate-700))'
                      }}
                    >
                      {f.trend}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 rounded-full h-2" style={{ backgroundColor: 'hsl(var(--surface-tertiary))' }}>
                      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${f.weight * 100}%`, backgroundColor: 'hsl(var(--purple-600))' }} />
                    </div>
                    <span className="text-sm font-medium w-12 text-right" style={{ color: 'hsl(var(--text-primary))' }}>{(f.weight * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interventions */}
        <div className="rounded-lg border" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'hsl(var(--card-border))' }}>
            <div className="flex items-center gap-3">
              <Zap className="text-green-600" size={20} />
              <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Intervention Programs</h2>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors duration-200" style={{ borderColor: 'hsl(var(--card-border))' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--surface-tertiary))'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <Download size={16} />
              Export
            </button>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {riskData.interventions.map((i, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'hsl(var(--surface-tertiary))' }}>
                  <div>
                    <h4 className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>{i.type}</h4>
                    <div className="text-sm mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>
                      {i.count} active • {i.avgDuration} avg duration
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: 'hsl(var(--green-600))' }}>{i.successRate}%</div>
                    <div className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>Success Rate</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Design tag */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 text-xs font-mono px-3 py-1 rounded border shadow-sm z-10 hidden lg:block" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))', color: 'hsl(var(--text-tertiary))' }}>
        RISK SCORING: AI Prediction • Early Intervention • Student Success Analytics
      </div>
    </div>
  );
};

export default RiskScoring;