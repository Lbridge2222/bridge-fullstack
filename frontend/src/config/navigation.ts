// Add these imports to your existing ones in navigation.ts
import {
  LayoutDashboard, Users, GraduationCap, MessageSquare,
  Brain, UserPlus, Calendar, Award, BookOpen, TrendingUp, Heart, Users2,
  Mail, MessageCircle, Phone, Target, Shield, Sparkles,
  FileText, BarChart3, Briefcase, GitBranch, Zap, Globe, AlertTriangle, Bot
} from "lucide-react";

export type IconType = React.ComponentType<{ size?: number; className?: string }>;

export type NavLeaf = {
  title: string;
  icon: IconType;
  href: string;
  description?: string;
  badge?: number;
};

export type NavSubSection = {
  title: string;
  icon: IconType;
  href?: string;
  description?: string;
  children?: NavLeaf[];
};

export type NavNode = {
  title: string;
  icon: IconType;
  href?: string;
  description?: string;
  children?: (NavLeaf | NavSubSection)[];
};

export type Navigation = NavNode[];

export const NAVIGATION: Navigation = [
  { title: "Overview", icon: LayoutDashboard, href: "/dashboard", description: "KPIs and quick actions" },
  {
    title: "CRM",
    icon: Users,
    description: "Lead to enrollment pipeline",
    children: [
      { title: "Overview", icon: LayoutDashboard, href: "/crm/overview", description: "Pipeline & KPIs at a glance" },
      {
        title: "Student Recruitment",
        icon: UserPlus,
        description: "Pre-application pipeline",
        children: [
          { title: "Leads", icon: UserPlus, href: "/crm/leads", description: "Pre-application nurturing" },
          { title: "Enquiry Management", icon: MessageSquare, href: "/crm/enquiries", description: "Unified inbox for all initial contact" },
          { title: "Interview Scheduler", icon: Calendar, href: "/crm/interviews", description: "Book and manage interviews", badge: 3 },
        ],
      },
      {
        title: "Admissions",
        icon: Award,
        description: "Applications through to enrollment",
        children: [
          { title: "Applications Board", icon: Award, href: "/crm/applications", description: "Kanban pipeline with table toggle" },
          { title: "Offer Management", icon: Award, href: "/crm/offers", description: "Conditional & unconditional offers" },
        ],
      },
    ],
  },
  {
    title: "Student Record",
    icon: GraduationCap,
    description: "Comprehensive student lifecycle",
    children: [
      { title: "Overview", icon: LayoutDashboard, href: "/students/overview", description: "Student record dashboard" },
      { title: "Directory", icon: BookOpen, href: "/students/directory", description: "All student profiles" },
      {
        title: "Academic Management",
        icon: GraduationCap,
        description: "Programmes, grades & progression",
        children: [
          { title: "Programmes & Modules", icon: BookOpen, href: "/students/academic/programmes", description: "Course enrollment & timetabling" },
          { title: "Assessment & Grades", icon: FileText, href: "/students/academic/grades", description: "Marking, moderation & classification" },
          { title: "Academic Progress", icon: TrendingUp, href: "/students/academic/progress", description: "Progression rules & credit tracking" },
          { title: "External Examiner", icon: Award, href: "/students/academic/external", description: "Workflow & sample coordination" },
        ],
      },
      {
        title: "Assessment & Portfolio",
        icon: FileText,
        description: "Coursework, projects & practical work",
        children: [
          { title: "Coursework Tracking", icon: FileText, href: "/students/assessment/coursework", description: "Essays, reports & assignments" },
          { title: "Practical Assessments", icon: Award, href: "/students/assessment/practical", description: "Labs, workshops & presentations" },
          { title: "Portfolio Management", icon: Briefcase, href: "/students/assessment/portfolio", description: "Creative work & project portfolios" },
          { title: "Industry Projects", icon: Target, href: "/students/assessment/industry", description: "Work placements & live briefs" },
        ],
      },
      {
        title: "Support & Wellbeing",
        icon: Heart,
        description: "Student services & interventions",
        children: [
          { title: "Academic Support", icon: BookOpen, href: "/students/support/academic", description: "Tutoring & learning support" },
          { title: "Student Services", icon: Heart, href: "/students/support/services", description: "Counseling, financial aid & accommodation" },
          { title: "Personal Tutoring", icon: Users, href: "/students/support/tutoring", description: "Meeting logs & development planning" },
          { title: "Intervention Tracking", icon: AlertTriangle, href: "/students/support/interventions", description: "At-risk monitoring & action plans" },
        ],
      },
      {
        title: "Compliance & Reporting",
        icon: FileText,
        description: "HESA, OfS & regulatory reporting",
        children: [
          { title: "HESA Returns", icon: FileText, href: "/students/compliance/hesa", description: "Automated data collection & validation" },
          { title: "OfS Monitoring", icon: BarChart3, href: "/students/compliance/ofs", description: "Student outcomes & access reporting" },
          { title: "UKVI Compliance", icon: Globe, href: "/students/compliance/ukvi", description: "Visa students & attendance reporting" },
          { title: "Data Protection", icon: Shield, href: "/students/compliance/gdpr", description: "Consent management & subject access" },
        ],
      },
      { title: "Engagement Analytics", icon: BarChart3, href: "/students/engagement", description: "Activity & participation tracking" },
      { title: "Retention & Success", icon: TrendingUp, href: "/students/retention", description: "At-risk analysis & interventions" },
      { title: "Career Development", icon: Briefcase, href: "/students/careers", description: "Industry connections & opportunities" },
      { title: "Alumni Network", icon: Users2, href: "/students/alumni", description: "Graduate outcomes & engagement" },
    ],
  },
  {
    title: "Communication",
    icon: MessageSquare,
    description: "Multi-channel outreach",
    children: [
      { title: "Email", icon: Mail, href: "/communications/emails", description: "Email campaigns" },
      { title: "SMS", icon: MessageCircle, href: "/communications/sms", description: "Text messaging" },
      { title: "Call Logs", icon: Phone, href: "/communications/calls", description: "Phone interaction history" },
    ],
  },
  {
    title: "Workflow & Automation",
    icon: GitBranch,
    description: "Process automation",
    children: [
      { title: "Workflow Studio", icon: GitBranch, href: "/workflows/workflowstudio", description: "Create automated processes" },
      { title: "Integrations", icon: Zap, href: "/workflows/integrations", description: "Third-party connections" },
    ],
  },
  {
    title: "Analytics & Reporting",
    icon: BarChart3,
    description: "Cohort and performance analytics",
    children: [
      { title: "Cohort Analysis", icon: TrendingUp, href: "/analytics/cohort-analysis", description: "Cohort conversion, lifecycle & ROI" },
    ],
  },
  {
    title: "AI",
    icon: Brain,
    description: "Predictive insights and automation",
    children: [
      { title: "Forecasting", icon: Target, href: "/ai/forecasting", description: "ML enrollment predictions" },
      { title: "Risk Scoring", icon: Shield, href: "/ai/riskscoring", description: "Student success prediction" },
      { title: "Next Best Action", icon: Sparkles, href: "/ai/actions", description: "AI recommendations" },
      { title: "AI Communications", icon: Bot, href: "/ai/ai-comms", description: "Automated outreach" },
      { title: "Natural Language Queries", icon: MessageSquare, href: "/ai/natural-language", description: "Ask questions about leads in plain English" },
    { title: "Advanced ML Models", icon: Brain, href: "/ai/advanced-ml", description: "Deep learning & feature engineering for lead intelligence" },
    ],
  },
];