// Add these imports to your existing ones in navigation.ts
import {
  LayoutDashboard, Users, CalendarClock, FileSignature, GraduationCap,
  BookUser, NotebookTabs, TrendingUp, ShieldCheck, UsersRound,
  MessagesSquare, BarChart2, Layers, PieChart,
  Workflow, PlugZap, FlaskConical, MessageSquare as MessageSquareIcon,
  Brain, Inbox, Settings, Phone
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
  // 1) Directory
  {
    title: "Directory",
    icon: BookUser,
    children: [
      { title: "People", icon: BookUser, href: "/directory" },
    ],
  },
  // 2) CRM (was Admissions)
                {
                title: "CRM",
                icon: LayoutDashboard,
                children: [
                  { title: "Enquiries", icon: Users, href: "/admissions/leads", badge: 5 },
                  { title: "Conversations", icon: MessageSquareIcon, href: "/admissions/conversations", badge: 2 },
                  { title: "Interviews", icon: CalendarClock, href: "/admissions/interviews" },
                  { title: "Applications Board", icon: LayoutDashboard, href: "/admissions/applications" },
                  { title: "Offers", icon: FileSignature, href: "/admissions/offers" },
                  { title: "Enrolments", icon: GraduationCap, href: "/admissions/enrolments" },
                ],
              },
  // 3) Student Records
  {
    title: "Student Records",
    icon: GraduationCap,
    children: [
      { title: "Overview", icon: NotebookTabs, href: "/records/overview" },
      { title: "Progress", icon: TrendingUp, href: "/records/progress" },
      { title: "Compliance", icon: ShieldCheck, href: "/records/compliance" },
      { title: "Alumni", icon: UsersRound, href: "/records/alumni" },
    ],
  },
  // 4) Communications (was Marketing & Comms)
  {
    title: "Communications",
    icon: MessagesSquare,
    children: [
      { title: "Comms Hub", icon: MessageSquareIcon, href: "/comms" },
    ],
  },
  // 5) Analytics (was Analytics & Predictive Intelligence)
  {
    title: "Analytics",
    icon: BarChart2,
    children: [
      { title: "Dashboard", icon: BarChart2, href: "/analytics/dashboard" },
      { title: "Student Recruitment Overview", icon: BarChart2, href: "/analytics/admissions-overview" },
      { title: "Cohorts", icon: Layers, href: "/analytics/cohort-analysis" },
      { title: "Risk Scoring", icon: TrendingUp, href: "/analytics/risk-scoring" },
      { title: "Source Quality", icon: PieChart, href: "/analytics/source-quality" },
    ],
  },
  // 6) Settings (with Labs, AI, and Call subsections)
  {
    title: "Settings",
    icon: Settings,
    children: [
      { title: "Workflow Studio", icon: Workflow, href: "/workflows/studio" },
      { title: "Integrations", icon: PlugZap, href: "/workflows/integrations" },
      { title: "Labs", icon: FlaskConical, href: "/settings/labs" },
      {
        title: "AI",
        icon: Brain,
        children: [
          { title: "Natural Language Querying", icon: MessageSquareIcon, href: "/settings/ai/nlq" },
          { title: "Lead Insights Config", icon: MessageSquareIcon, href: "/settings/ai/lead-insights" },
          { title: "Advanced ML Models", icon: Brain, href: "/settings/ai/advanced-ml" },
        ],
      },
      {
        title: "Call Settings",
        icon: Phone,
        children: [
          { title: "Call Templates", icon: Phone, href: "/settings/calls/templates" },
          { title: "Highlight Scanning", icon: Brain, href: "/settings/calls/highlights" },
          { title: "Recording Settings", icon: Settings, href: "/settings/calls/recording" },
        ],
      },
    ],
  },
];
