"use client"

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react"
import {
  Users, TrendingUp, TrendingDown, Brain, Zap, AlertCircle,
  Settings, RefreshCw, MoreHorizontal, Target, Clock,
  GraduationCap, Award, BookOpen, Filter, Search, Command,
  ChevronDown, ChevronUp, Eye, BarChart3, Calendar, Bell,
  ArrowUpRight, ArrowDownRight, Sparkles, Lightbulb, TrendingUp as TrendingUpIcon,
  Activity, PieChart, LineChart, Download, Share2, BookmarkPlus,
  Plus, X, CheckCircle, AlertTriangle, Info,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react"

// shadcn/ui primitives
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

// Utility function
const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ")

/* ──────────────────────────────────────────────────────────────
   Types & Data
   ────────────────────────────────────────────────────────────── */

type InsightType = "urgent" | "opportunity" | "risk" | "success";

type DashboardDTO = {
  overview: {
    totalLeads: number;
    totalApplications: number;
    totalOffers: number;
    totalEnrolled: number;
    hotLeads: number;
    applicationsPredicted: number;
    enrollmentPredicted: number;
    revenueProjected: number;
  };
  trends: {
    leadsChange: number;
    applicationsChange: number;
    offersChange: number;
    enrolledChange: number;
  };
};

const dashboardData: DashboardDTO = {
  overview: {
    totalLeads: 1247,
    totalApplications: 523,
    totalOffers: 445,
    totalEnrolled: 312,
    hotLeads: 89,
    applicationsPredicted: 67,
    enrollmentPredicted: 398,
    revenueProjected: 3_650_000
  },
  trends: {
    leadsChange: 12.5,
    applicationsChange: -3.2,
    offersChange: 8.7,
    enrolledChange: 15.3
  }
}

/** AI Insights with semantic colors */
const aiInsights: Array<{
  id: string;
  type: InsightType;
  title: string;
  description: string;
  action: string;
  impact: string;
  icon: React.ReactNode;
  priority: number;
  category: string;
}> = [
  {
    id: "1",
    type: "urgent",
    title: "High-Value Leads Need Attention",
    description: "23 leads with 85+ AI scores haven't been contacted in 3+ days.",
    action: "Contact Now",
    impact: "+12 applications",
    icon: <AlertCircle size={18} className="text-destructive" />,
    priority: 1,
    category: "Lead Management"
  },
  {
    id: "2",
    type: "opportunity",
    title: "Application Surge Predicted",
    description: "Models predict 67 new applications this week (+23% vs last week).",
    action: "Prepare Staffing",
    impact: "£580k revenue",
    icon: <TrendingUp size={18} className="text-success" />,
    priority: 2,
    category: "Forecasting"
  },
  {
    id: "3",
    type: "risk",
    title: "At-Risk Applications",
    description: "14 applications haven't progressed in 10+ days.",
    action: "Send Follow-up",
    impact: "Save £120k",
    icon: <Clock size={18} className="text-warning" />,
    priority: 1,
    category: "Application Tracking"
  },
  {
    id: "4",
    type: "success",
    title: "Conversion Optimization",
    description: "Brighton leads converting 18% above target this cycle.",
    action: "Replicate Strategy",
    impact: "+£200k potential",
    icon: <Target size={18} className="text-success" />,
    priority: 3,
    category: "Strategy"
  }
]

const urgentActions: Array<{
  id: string;
  name: string;
  type: "Hot Lead" | "Application" | "Offer Response";
  course: string;
  score: number;
  action: string;
  valueGBP: number;
  probability: number;
  campus: "Brighton" | "Sheffield" | "Online";
  dueTime: string;
  status: "pending" | "in-progress" | "completed";
}> = [
  { id: "u1", name: "Sarah Mitchell", type: "Hot Lead", course: "Music Production", score: 94, action: "Call within 2 hours", valueGBP: 9250, probability: 89, campus: "Brighton", dueTime: "2 hours", status: "pending" },
  { id: "u2", name: "James Rodriguez", type: "Application", course: "Electronic Music", score: 87, action: "Interview follow-up", valueGBP: 9250, probability: 78, campus: "Sheffield", dueTime: "4 hours", status: "in-progress" },
  { id: "u3", name: "Emma Thompson", type: "Offer Response", course: "Songwriting", score: 91, action: "Acceptance reminder", valueGBP: 8750, probability: 82, campus: "Online", dueTime: "6 hours", status: "pending" },
  { id: "u4", name: "Marcus Chen", type: "Hot Lead", course: "Music Business", score: 88, action: "Schedule campus visit", valueGBP: 12500, probability: 85, campus: "Brighton", dueTime: "1 day", status: "pending" }
]

const fmtInt = new Intl.NumberFormat("en-GB")
const fmtGBP0 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })

/** Semantic colour buckets for KPI icon backgrounds */
const colorClasses = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
} as const

function ChangeBadge({ change }: { change: number }) {
  const up = change > 0
  const down = change < 0
  const color = up ? "text-success" : down ? "text-destructive" : "text-muted-foreground"
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      {up ? <ArrowUp size={16} /> : down ? <ArrowDown size={16} /> : <Minus size={16} />}
      <span className="text-sm font-medium">{Math.abs(change)}%</span>
    </div>
  )
}

/** Status badges with semantic colors */
const BadgeByType: Record<string, string> = {
  "Hot Lead": "bg-destructive/10 text-destructive border-destructive/20",
  "Application": "bg-primary/10 text-primary border-primary/20",
  "Offer Response": "bg-warning/10 text-warning border-warning/20",
}

const StatusBadge: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  "pending": { bg: "bg-warning/10", text: "text-warning", icon: <Clock size={12} /> },
  "in-progress": { bg: "bg-info/10", text: "text-info", icon: <Activity size={12} /> },
  "completed": { bg: "bg-success/10", text: "text-success", icon: <CheckCircle size={12} /> },
}

/* ──────────────────────────────────────────────────────────────
   Reusable cards with enhanced UX
   ────────────────────────────────────────────────────────────── */

const KpiCard = React.memo(function KpiCard({
  title,
  value,
  change,
  icon,
  color = "primary",
  onClick,
  isInteractive = false
}: {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color?: keyof typeof colorClasses;
  onClick?: () => void;
  isInteractive?: boolean;
}) {
  const { bg } = colorClasses[color] ?? colorClasses.primary
  
  return (
    <div 
      className={cn(
        "p-4 sm:p-6 bg-card rounded-lg border shadow-sm hover:shadow-md transition-all duration-200",
        isInteractive && "cursor-pointer hover:scale-[1.02] hover:border-primary/20",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`p-1.5 sm:p-2 ${bg} rounded-lg`}>{icon}</div>
          <div>
            <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</h3>
            <p className="text-lg sm:text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
        <div className="text-right">
          <ChangeBadge change={change} />
          <p className="text-xs text-muted-foreground mt-1 hidden sm:block">vs last cycle</p>
        </div>
      </div>
      {isInteractive && (
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowUpRight size={12} />
            <span className="hidden sm:inline">Click to view details</span>
            <span className="sm:hidden">View details</span>
          </div>
        </div>
      )}
      
      {/* Mini trend visualization */}
      <div className="mt-3 flex items-center justify-center">
        <div className="flex items-center gap-1">
          {change > 0 ? (
            <>
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <div className="w-2 h-2 bg-success/80 rounded-full"></div>
              <div className="w-2 h-2 bg-success/60 rounded-full"></div>
            </>
          ) : change < 0 ? (
            <>
              <div className="w-2 h-2 bg-destructive/60 rounded-full"></div>
              <div className="w-2 h-2 bg-destructive/80 rounded-full"></div>
              <div className="w-2 h-2 bg-destructive rounded-full"></div>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-muted-foreground/60 rounded-full"></div>
              <div className="w-2 h-2 bg-muted-foreground/80 rounded-full"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
            </>
          )}
        </div>
      </div>
    </div>
  )
})

function InsightCard({
  icon, title, description, action, impact, priority, category, onAction, onDismiss
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  impact: string;
  priority: number;
  category: string;
  onAction?: () => void;
  onDismiss?: () => void;
}) {
  const priorityColors = {
    1: "border-l-destructive bg-destructive/5",
    2: "border-l-warning bg-warning/5", 
    3: "border-l-info bg-info/5"
  }

  return (
    <div className={`flex items-start gap-4 p-4 rounded-lg hover:bg-muted/30 transition-all duration-200 border-l-4 ${priorityColors[priority as keyof typeof priorityColors]}`}>
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="flex items-start justify-between mb-1">
          <h4 className="font-medium text-foreground">{title}</h4>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{category}</Badge>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-muted"
                onClick={onDismiss}
              >
                <X size={12} />
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-success font-medium flex items-center gap-1">
            <Sparkles size={12} />
            {impact}
          </span>
          <Button 
            size="sm" 
            className="text-xs h-8 px-3"
            onClick={onAction}
          >
            {action}
          </Button>
        </div>
      </div>
    </div>
  )
}

function UrgentActionItem({
  name, type, course, action, score, probability, valueGBP, campus, dueTime, status, onComplete, onSnooze
}: {
  name: string;
  type: "Hot Lead" | "Application" | "Offer Response";
  course: string;
  action: string;
  score: number;
  probability: number;
  valueGBP: number;
  campus: string;
  dueTime: string;
  status: "pending" | "in-progress" | "completed";
  onComplete?: () => void;
  onSnooze?: () => void;
}) {
  const statusConfig = StatusBadge[status]
  
  return (
    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-sm text-foreground">{name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${BadgeByType[type]}`}>{type}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.icon}
              {status}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mb-2">{course} • {campus}</div>
          <div className="text-sm font-medium text-primary mb-2">{action}</div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Due: {dueTime}</span>
            <span>AI Score: {score}</span>
          </div>
        </div>
                  <div className="text-right">
            <div className="font-bold text-foreground">{probability}%</div>
            <div className="text-success font-medium">{fmtGBP0.format(valueGBP)}</div>
          </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-border/50">
        {status !== "completed" && (
          <>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-7 px-2"
              onClick={onSnooze}
            >
              Snooze 1h
            </Button>
            <Button 
              size="sm" 
              className="text-xs h-7 px-2"
              onClick={onComplete}
            >
              Mark Complete
            </Button>
          </>
        )}
        <Button 
          size="sm" 
          variant="ghost" 
          className="text-xs h-7 px-2 ml-auto"
        >
          View Details
        </Button>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────
   Enhanced Dashboard Component
   ────────────────────────────────────────────────────────────── */

export default function HECRMDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<"2025" | "2024" | "compare">("2025")
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedInsights, setSelectedInsights] = useState<Set<string>>(new Set())
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const data = useMemo(() => dashboardData, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault()
            searchInputRef.current?.focus()
            break
          case 'f':
            e.preventDefault()
            setShowFilters(!showFilters)
            break
          case 'r':
            e.preventDefault()
            handleRefresh()
            break
        }
      }
      if (e.key === 'Escape') {
        setShowFilters(false)
        setSearchTerm("")
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showFilters])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      handleRefresh()
    }, 5 * 60 * 1000) // 5 minutes
    
    return () => clearInterval(interval)
  }, [autoRefresh])

  const handleRefresh = useCallback(() => {
    setLastRefresh(new Date())
    // In real app, this would fetch fresh data
  }, [])

  const handleInsightAction = useCallback((insightId: string) => {
    console.log(`Action taken on insight: ${insightId}`)
    // In real app, this would navigate to relevant page or open modal
  }, [])

  const handleInsightDismiss = useCallback((insightId: string) => {
    setSelectedInsights(prev => {
      const newSet = new Set(prev)
      newSet.add(insightId)
      return newSet
    })
  }, [])

  const handleActionComplete = useCallback((actionId: string) => {
    console.log(`Action completed: ${actionId}`)
    // In real app, this would update the action status
  }, [])

  const handleActionSnooze = useCallback((actionId: string) => {
    console.log(`Action snoozed: ${actionId}`)
    // In real app, this would snooze the action
  }, [])

    // Show only top 3 most impactful insights
  const topInsights = useMemo(() => {
    return aiInsights
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3)
  }, [])

  const filteredInsights = useMemo(() => {
    if (!searchTerm) return topInsights
    const q = searchTerm.toLowerCase()
    return topInsights.filter(insight => 
      insight.title.toLowerCase().includes(q) ||
      insight.description.toLowerCase().includes(q) ||
      insight.category.toLowerCase().includes(q)
    )
  }, [topInsights, searchTerm])

  const filteredUrgentActions = useMemo(() => {
    if (!searchTerm) return urgentActions
    const q = searchTerm.toLowerCase()
    return urgentActions.filter(action => 
      action.name.toLowerCase().includes(q) ||
      action.course.toLowerCase().includes(q) ||
      action.action.toLowerCase().includes(q)
    )
  }, [searchTerm])

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background overflow-x-hidden">
        {/* Enhanced sticky header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground">CRM Dashboard</h1>
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <Brain size={12} /> AI Enhanced
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-0 lg:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search insights, actions... (⌘K)"
                  className="w-full lg:w-64 pl-9 h-9 text-sm"
                />
              </div>
              
              {/* Filters */}
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-9 px-2 sm:px-3 text-xs sm:text-sm"
              >
                <Filter size={16} className="sm:mr-1" />
                <span className="hidden sm:inline">Filters</span>
                <span className="sm:hidden">(⌘F)</span>
              </Button>
              
              {/* Period Selector */}
              <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
                <SelectTrigger className="w-24 sm:w-32 h-9 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025 Cycle</SelectItem>
                  <SelectItem value="2024">2024 Cycle</SelectItem>
                  <SelectItem value="compare">Compare</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Auto-refresh toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={autoRefresh ? "secondary" : "outline"}
                    size="icon"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className="h-9 w-9"
                  >
                    <RefreshCw size={16} className={autoRefresh ? "animate-spin" : ""} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{autoRefresh ? "Auto-refresh enabled" : "Auto-refresh disabled"}</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Manual refresh */}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRefresh}
                className="h-9 px-2 sm:px-3 text-xs sm:text-sm"
              >
                <RefreshCw size={16} className="sm:mr-1" />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">(⌘R)</span>
              </Button>
              
              {/* Settings */}
              <Button variant="outline" size="sm" className="h-9 px-2 sm:px-3 text-xs sm:text-sm">
                <Settings size={16} />
              </Button>
              
              {/* Keyboard shortcuts help */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowKeyboardShortcuts(true)}
                    className="h-9 w-9"
                  >
                    <Command size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Keyboard shortcuts</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          

        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Enhanced KPI belt with interactivity */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <KpiCard
              title="Total Leads"
              value={fmtInt.format(data.overview.totalLeads)}
              change={data.trends.leadsChange}
              icon={<Users size={18} className="text-primary" />}
              color="primary"
              onClick={() => console.log("Navigate to leads")}
              isInteractive={true}
            />
            <KpiCard
              title="Applications"
              value={fmtInt.format(data.overview.totalApplications)}
              change={data.trends.applicationsChange}
              icon={<BookOpen size={18} className="text-primary" />}
              color="primary"
              onClick={() => console.log("Navigate to applications")}
              isInteractive={true}
            />
            <KpiCard
              title="Offers Sent"
              value={fmtInt.format(data.overview.totalOffers)}
              change={data.trends.offersChange}
              icon={<Award size={18} className="text-primary" />}
              color="primary"
              onClick={() => console.log("Navigate to offers")}
              isInteractive={true}
            />
            <KpiCard
              title="Enrolled"
              value={fmtInt.format(data.overview.totalEnrolled)}
              change={data.trends.enrolledChange}
              icon={<GraduationCap size={18} className="text-primary" />}
              color="primary"
              onClick={() => console.log("Navigate to enrollments")}
              isInteractive={true}
            />
          </section>

          {/* Enhanced AI banner */}
          <section className="rounded-lg p-4 sm:p-6 bg-gradient-to-r from-primary to-slate-700 text-primary-foreground shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Brain size={20} />
                  <h2 className="text-base sm:text-lg font-semibold">AI Revenue Assistant</h2>
                  <Badge variant="secondary" className="bg-background/20 text-background text-xs">
                    <Sparkles size={12} /> Live
                  </Badge>
                </div>
                <p className="opacity-90 mb-2 text-sm sm:text-base">
                  Top insight: {aiInsights[0].title}. Potential impact: <span className="font-semibold">{aiInsights[0].impact}</span>.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm opacity-80">
                  <span>Next prediction in: 2 minutes</span>
                  <span>Confidence: 94%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="bg-background/20 text-background hover:bg-background/30 text-xs sm:text-sm"
                >
                  <Eye size={16} className="mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">View All Predictions</span>
                  <span className="sm:hidden">View All</span>
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="bg-background/20 text-background hover:bg-background/30 text-xs sm:text-sm"
                >
                  <BarChart3 size={16} className="mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">AI Analytics</span>
                  <span className="sm:hidden">Analytics</span>
                </Button>
              </div>
            </div>
          </section>

          {/* Main + Right rail */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
            {/* Main column */}
            <div className="xl:col-span-8 space-y-4 sm:space-y-6">
              {/* Enhanced AI Insights */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                                      <CardTitle className="flex items-center gap-2">
                    <Lightbulb size={20} className="text-warning" />
                    AI Insights & Recommendations
                  </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {filteredInsights.length} insights
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-xs h-8">
                        View All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredInsights
                    .filter(insight => !selectedInsights.has(insight.id))
                    .map((insight) => (
                      <InsightCard 
                        key={insight.id} 
                        {...insight}
                        onAction={() => handleInsightAction(insight.id)}
                        onDismiss={() => handleInsightDismiss(insight.id)}
                      />
                    ))}
                  {filteredInsights.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search size={24} className="mx-auto mb-2 opacity-50" />
                      <p>No insights match your search</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced Enrollment Funnel */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 size={20} className="text-primary" />
                      Enrollment Funnel
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-8">
                        <Activity size={14} /> Live View
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Visual funnel chart */}
                  <div className="space-y-6">
                    {[
                      { label: "Leads", value: data.overview.totalLeads, percentage: 100, color: "bg-primary", icon: <Users size={16} /> },
                      { label: "Applications", value: data.overview.totalApplications, percentage: 42, color: "bg-info", icon: <BookOpen size={16} /> },
                      { label: "Offers", value: data.overview.totalOffers, percentage: 85, color: "bg-warning", icon: <Award size={16} /> },
                      { label: "Enrolled", value: data.overview.totalEnrolled, percentage: 70, color: "bg-success", icon: <GraduationCap size={16} /> }
                    ].map((step, index) => (
                      <div key={step.label} className="relative">
                        {/* Connection line */}
                        {index > 0 && (
                          <div className="absolute left-6 top-0 w-0.5 h-6 bg-border transform -translate-y-6" />
                        )}
                        
                        <div className="flex items-center gap-4">
                          <div className={`p-3 ${step.color} rounded-full text-white flex-shrink-0`}>
                            {step.icon}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{step.label}</span>
                              <div className="text-right">
                                <div className="font-bold text-foreground">{fmtInt.format(step.value)}</div>
                                <div className="text-xs text-muted-foreground">{step.percentage}%</div>
                              </div>
                            </div>
                            <Progress value={step.percentage} className="h-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Enhanced status callout */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-warning/5 to-warning/10 border border-warning/20 rounded-lg">
                    <div className="flex items-center gap-2 text-warning mb-2">
                      <Zap size={16} />
                      <span className="text-sm font-medium">AI Optimization Opportunity</span>
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                        High Impact
                      </Badge>
                    </div>
                    <p className="text-sm text-warning mb-3">
                      Improving offer-to-enrollment rate by 8% would add {fmtGBP0.format(280000)} revenue.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="text-warning border-warning/30 hover:bg-warning/10">
                        View Analysis
                      </Button>
                      <Button size="sm" className="bg-warning hover:bg-warning/90">
                        Take Action
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Right rail */}
            <aside className="xl:col-span-4 space-y-4 sm:space-y-6 xl:sticky xl:top-6 self-start">
              {/* Compact Urgent Actions */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                                      <CardTitle className="flex items-center gap-2 text-base">
                    <AlertCircle size={16} className="text-destructive" />
                    Urgent Actions
                  </CardTitle>
                    <Badge variant="destructive" className="text-xs">
                      {filteredUrgentActions.filter(a => a.status === "pending").length} pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {filteredUrgentActions.slice(0, 3).map((action) => (
                    <div key={action.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-foreground truncate">{action.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${BadgeByType[action.type]}`}>{action.type}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-1">{action.course} • {action.campus}</div>
                          <div className="text-xs font-medium text-primary">{action.action}</div>
                        </div>
                        <div className="text-right text-xs ml-2">
                          <div className="font-bold text-foreground">AI: {action.score}</div>
                          <div className="text-success font-medium">{fmtGBP0.format(action.valueGBP)}</div>
                        </div>
                      </div>
                      
                      {/* Compact action buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                          Snooze
                        </Button>
                        <Button size="sm" className="text-xs h-6 px-2">
                          Complete
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredUrgentActions.length > 3 && (
                    <div className="text-center pt-2">
                      <Button variant="ghost" size="sm" className="text-xs">
                        View {filteredUrgentActions.length - 3} more actions
                      </Button>
                    </div>
                  )}
                  
                  <Button className="w-full mt-3" variant="destructive" size="sm">
                    <AlertCircle size={14} className="mr-2" />
                    Take Action on All
                  </Button>
                </CardContent>
              </Card>



              {/* Enhanced Campus Performance */}
              {/* Compact Campus Performance Dashboard */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target size={16} className="text-primary" />
                    Campus Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {[
                      { campus: "Brighton", enrolled: 142, target: 120, color: "bg-success", trend: "up" },
                      { campus: "Sheffield", enrolled: 98, target: 96, color: "bg-info", trend: "up" },
                      { campus: "Online", enrolled: 72, target: 78, color: "bg-warning", trend: "down" }
                    ].map((c) => (
                      <div key={c.campus} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        {/* Compact campus info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">{c.campus}</span>
                            <div className="text-right">
                              <span className="text-sm font-bold text-foreground">{fmtInt.format(c.enrolled)}</span>
                              <span className="text-xs text-muted-foreground ml-1">/ {fmtInt.format(c.target)}</span>
                            </div>
                          </div>
                          
                          {/* Inline progress bar with percentage */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full transition-all duration-300 ${c.color}`}
                                style={{ width: `${Math.min((c.enrolled / c.target) * 100, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${
                              c.trend === "up" ? "text-success" : "text-warning"
                            }`}>
                              {c.trend === "up" ? "+" : ""}{Math.round((c.enrolled / c.target - 1) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary footer */}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Total Enrolled: {fmtInt.format(142 + 98 + 72)}</span>
                      <span>Overall: +4% vs target</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </section>

          {/* Enhanced Footer utility */}
          <section className="bg-card border rounded-lg px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock size={14} />
                Last refreshed: <span className="font-medium text-foreground">
                  {lastRefresh.toLocaleTimeString()}
                </span>
              </div>
              {autoRefresh && (
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  Next auto-refresh in <span className="font-medium text-foreground">5 minutes</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                <BarChart3 size={14} className="mr-1 sm:mr-2" />
                View Reports
              </Button>
            </div>
          </section>
        </main>

        {/* Keyboard Shortcuts Help Modal */}
        {showKeyboardShortcuts && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <Card className="w-96 max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Command size={20} />
                  Keyboard Shortcuts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Search</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘K</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Toggle Filters</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘F</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Refresh Data</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘R</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Close/Exit</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => setShowKeyboardShortcuts(false)}
                >
                  Got it!
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}