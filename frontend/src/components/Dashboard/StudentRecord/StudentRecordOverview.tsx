import * as React from "react";
import {
  TrendingUp, TrendingDown, AlertTriangle, Upload, FileText, CheckCircle,
  GraduationCap, Target, Heart, BarChart3, Calendar, UserPlus, Briefcase,
  MoreHorizontal, Clock, Users, Award, BookOpen, Shield, Zap, Brain
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// — Types —
type UrgentTask = {
  id: number;
  type: "academic_concern" | "visa_compliance" | "external_examiner" | "hesa_deadline";
  title: string;
  description: string;
  priority: "high" | "medium";
  dueDate: string;
  actionRequired: string;
  assignedTo?: string;
  progress?: number;
};

type Activity =
  | { type: "assessment_submitted"; title: string; student: string; time: string; status: "success" | "warning"; avatar?: string }
  | { type: "intervention_created"; title: string; student: string; time: string; status: "success" | "warning"; avatar?: string }
  | { type: "industry_opportunity" | "hesa_submission" | "compliance_check"; title: string; description: string; time: string; status: "success" | "warning"; avatar?: string };

type PerfMetric = { 
  label: string; 
  value: number; 
  trend: string; 
  status: "excellent" | "good" | "warning" | "bad";
  target?: number;
  change?: number;
};

type StudentSegment = {
  name: string;
  count: number;
  percentage: number;
  color: string;
  trend: string;
};

type AIInsight = {
  id: number;
  type: "warning" | "opportunity" | "trend" | "recommendation";
  title: string;
  description: string;
  confidence: number;
  action?: string;
};

export default function StudentRecordOverview() {
  const [timeframe, setTimeframe] = React.useState<"current" | "term" | "month" | "week">("current");
  const [activeTab, setActiveTab] = React.useState("overview");

  // Mock data (swap to API later)
  const overviewMetrics = {
    totalStudents: 1247,
    atRiskStudents: 67,
    averageMark: 68.4,
    retentionRate: 94.2,
    newEnrollments: 89,
    graduates: 156,
  };

  const urgentTasks: UrgentTask[] = [
    { 
      id: 1, 
      type: "academic_concern", 
      title: "Academic Intervention Required", 
      description: "5 students with consecutive failed assessments", 
      priority: "high", 
      dueDate: "Today", 
      actionRequired: "Schedule personal tutor meetings",
      assignedTo: "Dr. Sarah Chen",
      progress: 25
    },
    { 
      id: 2, 
      type: "visa_compliance", 
      title: "UKVI Reporting Due", 
      description: "8 international students attendance confirmation", 
      priority: "high", 
      dueDate: "Tomorrow", 
      actionRequired: "Submit attendance reports",
      assignedTo: "Compliance Team",
      progress: 80
    },
    { 
      id: 3, 
      type: "external_examiner", 
      title: "External Examiner Review", 
      description: "Portfolio assessment moderation pending", 
      priority: "medium", 
      dueDate: "3 days", 
      actionRequired: "Coordinate sample submission",
      assignedTo: "Quality Assurance",
      progress: 45
    },
  ];

  const recentActivity: Activity[] = [
    { type: "assessment_submitted", title: "Portfolio Assessment Completed", student: "Alex Chen - Level 5 Digital Media", time: "2 hours ago", status: "success", avatar: "AC" },
    { type: "intervention_created", title: "Academic Support Plan Created", student: "Jordan Williams - Level 4 Business", time: "4 hours ago", status: "warning", avatar: "JW" },
    { type: "industry_opportunity", title: "Work Placement Matched", description: "Placement confirmed for Taylor Rodriguez", time: "6 hours ago", status: "success" },
    { type: "hesa_submission", title: "HESA Data Submitted", description: "Monthly student record update completed", time: "1 day ago", status: "success" },
    { type: "compliance_check", title: "OfS Compliance Review", description: "Student outcomes data validated", time: "2 days ago", status: "success" },
  ];

  const performanceMetrics: PerfMetric[] = [
    { label: "Academic Performance", value: 72, trend: "+2.3%", status: "good", target: 75, change: 2.3 },
    { label: "Attendance Rate", value: 89, trend: "-1.2%", status: "warning", target: 90, change: -1.2 },
    { label: "Assessment Completion", value: 94, trend: "+5.1%", status: "excellent", target: 90, change: 5.1 },
  ];

  const studentSegments: StudentSegment[] = [
          { name: "First Year", count: 423, percentage: 34, color: "bg-info", trend: "+8.2%" },
        { name: "Second Year", count: 389, percentage: 31, color: "bg-success", trend: "+5.1%" },
        { name: "Third Year", count: 298, percentage: 24, color: "bg-warning", trend: "+2.3%" },
        { name: "Final Year", count: 137, percentage: 11, color: "bg-muted-foreground", trend: "+1.8%" },
  ];

  const aiInsights: AIInsight[] = [
    {
      id: 1,
      type: "warning",
      title: "Attendance Decline Detected",
      description: "Second-year Business students showing 15% attendance drop this month. Consider intervention strategies.",
      confidence: 87,
      action: "Review attendance patterns"
    },
    {
      id: 2,
      type: "opportunity",
      title: "High Performance Cohort",
      description: "Digital Media Level 5 students achieving 23% above average. Opportunity for case study development.",
      confidence: 92,
      action: "Document best practices"
    },
    {
      id: 3,
      type: "trend",
      title: "Industry Engagement Rising",
      description: "Work placement success rate increased by 18% this term. Strong employer satisfaction scores.",
      confidence: 89,
      action: "Expand placement program"
    }
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background p-6">
      {/* Enhanced Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-xl">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Student Records</h1>
                <p className="text-sm text-muted-foreground">Comprehensive student lifecycle management & analytics</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
              <SelectTrigger className="w-48 bg-card border-border">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Academic Year</SelectItem>
                <SelectItem value="term">Current Term</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
              </SelectContent>
            </Select>
            <Button className="gap-2 btn-premium">
              <Upload className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="card-base p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Total</span>
            </div>
            <p className="text-lg font-bold text-foreground">{overviewMetrics.totalStudents.toLocaleString()}</p>
          </div>
          <div className="card-base p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-muted-foreground">At Risk</span>
            </div>
            <p className="text-lg font-bold text-destructive">{overviewMetrics.atRiskStudents}</p>
          </div>
          <div className="card-base p-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Avg Mark</span>
            </div>
            <p className="text-lg font-bold text-foreground">{overviewMetrics.averageMark}%</p>
          </div>
          <div className="card-base p-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Retention</span>
            </div>
            <p className="text-lg font-bold text-foreground">{overviewMetrics.retentionRate}%</p>
          </div>
          <div className="card-base p-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">New</span>
            </div>
            <p className="text-lg font-bold text-foreground">{overviewMetrics.newEnrollments}</p>
          </div>
          <div className="card-base p-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Graduates</span>
            </div>
            <p className="text-lg font-bold text-foreground">{overviewMetrics.graduates}</p>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-muted data-[state=active]:text-foreground">Overview</TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-muted data-[state=active]:text-foreground">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* AI Insights Section */}
          <Card className="card-premium">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent rounded-lg">
                  <Brain className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">AI-Powered Insights</CardTitle>
                  <p className="text-sm text-muted-foreground">Intelligent analysis of your student data</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {aiInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="card-base p-4 interactive-premium"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        {insight.type === "warning" && <AlertTriangle className="h-4 w-4 text-foreground" />}
                        {insight.type === "opportunity" && <TrendingUp className="h-4 w-4 text-foreground" />}
                        {insight.type === "trend" && <BarChart3 className="h-4 w-4 text-foreground" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-card-foreground mb-1">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Confidence: {insight.confidence}%</span>
                          {insight.action && (
                            <Button size="sm" variant="outline" className="text-xs">
                              {insight.action}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Enhanced Urgent Tasks */}
            <Card className="lg:col-span-2 border-0 shadow-lg">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Urgent Tasks & Actions</CardTitle>
                      <p className="text-sm text-muted-foreground">Priority items requiring immediate attention</p>
                    </div>
                  </div>
                  <Badge className="px-3 py-1 bg-accent text-accent-foreground">
                    {urgentTasks.filter((t) => t.priority === "high").length} High Priority
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {urgentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="card-base p-4 interactive-hover"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            {task.type === "academic_concern" && <AlertTriangle className="h-4 w-4 text-accent" />}
                            {task.type === "visa_compliance" && <Calendar className="h-4 w-4 text-info" />}
                            {task.type === "external_examiner" && <FileText className="h-4 w-4 text-warning" />}
                            {task.type === "hesa_deadline" && <Upload className="h-4 w-4 text-accent" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-card-foreground">{task.title}</h4>
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          </div>
                        </div>
                        
                        {task.progress !== undefined && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>Progress</span>
                              <span>{task.progress}%</span>
                            </div>
                            <Progress value={task.progress} className="h-2" />
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Due: {task.dueDate}
                            </span>
                            {task.assignedTo && (
                              <span className="text-muted-foreground">Assigned: {task.assignedTo}</span>
                            )}
                          </div>
                          <Button size="sm" className="text-xs btn-forest">
                            Take Action
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Separator className="my-4" />
                <Button variant="link" className="px-0 text-forest-green hover:text-forest-green/80">
                  View All Tasks →
                </Button>
              </CardContent>
            </Card>

            {/* Enhanced Performance Metrics */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <BarChart3 className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Performance Metrics</CardTitle>
                    <p className="text-sm text-muted-foreground">Key performance indicators</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {performanceMetrics.map((metric, i) => {
                  const value = Math.max(0, Math.min(100, metric.value));
                  const trendUp = metric.trend.startsWith("+");
                  const targetAchieved = metric.target ? metric.value >= metric.target : false;
                  
                  return (
                    <div key={i} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-card-foreground">{metric.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-card-foreground">{value}%</span>
                          {metric.target && (
                            <span className="text-xs text-muted-foreground">/ {metric.target}%</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Progress
                          value={value}
                          className="h-2"
                        />
                        
                        {metric.target && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Target</span>
                            <div className="flex items-center gap-2">
                              {targetAchieved ? (
                                <CheckCircle className="h-3 w-3 text-forest-green" />
                              ) : (
                                <span className="text-muted-foreground">●</span>
                              )}
                              <span className={targetAchieved ? "text-forest-green" : "text-muted-foreground"}>
                                {metric.target}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                                              <div className="flex items-center gap-2">
                          {trendUp ? (
                            <TrendingUp className="h-3 w-3 text-success" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-destructive" />
                          )}
                          <span className={`text-xs font-medium ${trendUp ? 'text-success' : 'text-destructive'}`}>
                            {metric.trend}
                          </span>
                        </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Student Segments Chart */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Users className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Student Distribution</CardTitle>
                  <p className="text-sm text-muted-foreground">Current academic year breakdown</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {studentSegments.map((segment, index) => (
                  <div key={index} className="text-center space-y-3">
                    <div className="relative mx-auto w-20 h-20">
                      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          className="text-muted"
                          strokeWidth="2"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          className="text-primary"
                          strokeWidth="2"
                          strokeDasharray={`${segment.percentage}, 100`}
                          strokeDashoffset="0"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-card-foreground">{segment.percentage}%</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-card-foreground">{segment.name}</h4>
                      <p className="text-sm text-muted-foreground">{segment.count} students</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        {segment.trend.startsWith('+') ? (
                          <TrendingUp className="h-3 w-3 text-success" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-destructive" />
                        )}
                        <span className={`text-xs ${segment.trend.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                          {segment.trend}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          {/* Enhanced Recent Activity */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Clock className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <p className="text-sm text-muted-foreground">Latest updates and actions</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0">
                    {activity.avatar ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs font-medium bg-muted text-foreground">
                          {activity.avatar}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
                      >
                        {activity.type === "assessment_submitted" && <FileText className="h-4 w-4 text-foreground" />}
                        {activity.type === "intervention_created" && <Heart className="h-4 w-4 text-foreground" />}
                        {activity.type === "industry_opportunity" && <Briefcase className="h-4 w-4 text-foreground" />}
                        {activity.type === "hesa_submission" && <Upload className="h-4 w-4 text-foreground" />}
                        {activity.type === "compliance_check" && <CheckCircle className="h-4 w-4 text-foreground" />}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-card-foreground">{activity.title}</p>
                    {"student" in activity ? (
                      <p className="text-sm text-muted-foreground">{activity.student}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Separator className="my-4" />
                              <Button variant="link" className="px-0 text-success hover:text-success/80">
                View All Activity →
              </Button>
            </CardContent>
          </Card>

          {/* Enhanced Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Zap className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                  <p className="text-sm text-muted-foreground">Frequently used operations</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <EnhancedActionButton icon={<UserPlus className="h-5 w-5" />} label="Add Student" description="Create new student record" variant="forest" />
                <EnhancedActionButton icon={<FileText className="h-5 w-5" />} label="Schedule Assessment" description="Book assessment slot" />
                <EnhancedActionButton icon={<Heart className="h-5 w-5" />} label="Create Intervention" description="Set up support plan" variant="forest" />
                <EnhancedActionButton icon={<BarChart3 className="h-5 w-5" />} label="Generate Report" description="Create custom reports" />
                <EnhancedActionButton icon={<Calendar className="h-5 w-5" />} label="Book Meeting" description="Schedule appointments" />
                <EnhancedActionButton icon={<Shield className="h-5 w-5" />} label="AI Insights" description="Get AI-powered analysis" variant="accent" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* — Enhanced Components — */
function EnhancedActionButton({ 
  icon, 
  label, 
  description,
  variant = "default"
}: { 
  icon: React.ReactNode; 
  label: string; 
  description: string;
  variant?: "default" | "forest" | "accent";
}) {
  const buttonStyles = {
    default: "border-border hover:border-border/80 hover:bg-muted/50",
    forest: "border-forest-green hover:border-forest-green/80 hover:bg-forest-green/5",
    accent: "border-accent hover:border-accent/80 hover:bg-accent/5"
  };

  const iconStyles = {
    default: "bg-muted text-foreground",
    forest: "bg-forest-green/10 text-forest-green",
    accent: "bg-accent/10 text-accent"
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            className={`flex flex-col items-center gap-3 py-6 h-auto transition-all duration-200 ${buttonStyles[variant]}`}
          >
            <div className={`p-2 rounded-lg ${iconStyles[variant]}`}>
              {icon}
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-card-foreground block">{label}</span>
              <span className="text-xs text-muted-foreground">{description}</span>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}