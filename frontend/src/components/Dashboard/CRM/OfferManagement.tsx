import React, { useMemo, useState } from "react";
import {
  Search, Filter, Plus, FileCheck, AlertTriangle, Clock, CheckCircle, XCircle,
  Upload, Download, Mail, Phone, Calendar, User, Home, CreditCard, Shield,
  GraduationCap, FileText, Eye, Edit, MoreHorizontal
} from "lucide-react";

const cn = (...cls: (string | false | null | undefined)[]) => cls.filter(Boolean).join(" ");

type ChecklistStatus =
  | "verified" | "paid" | "confirmed" | "approved" | "completed"
  | "received" | "pending" | "in_progress" | "overdue"
  | "not_required" | "not_applicable";

type ChecklistItem = {
  status: ChecklistStatus;
  dueDate: string | null;
  description: string;
  category: "academic" | "identity" | "financial" | "accommodation" | "health";
  submittedDate: string | null;
  notes?: string | null;
};

type OfferHolder = {
  id: number;
  studentName: string;
  studentId: string;
  email: string;
  phone: string;
  course: string;
  campus: string;
  intake: string;
  offerType: "Conditional" | "Unconditional";
  offerStatus: string;
  offerDate: string;
  acceptanceDate: string;
  enrollmentTarget: string;
  adminStatus: "complete" | "in_progress" | "urgent";
  checklist: Record<string, ChecklistItem>;
  lastContact: string;
  urgentItems: string[];
};

/** Category meta (use semantic color classes, no dynamic strings) */
const categories = [
  { key: "academic", label: "Academic", icon: GraduationCap, colorClass: "text-primary" }, // primary accent
  { key: "identity", label: "Identity & Legal", icon: Shield, colorClass: "text-primary" },
  { key: "financial", label: "Financial", icon: CreditCard, colorClass: "text-primary" },
  { key: "accommodation", label: "Accommodation", icon: Home, colorClass: "text-primary" },
  { key: "health", label: "Health & Wellbeing", icon: User, colorClass: "text-primary" },
] as const;

function StatusPill({ status }: { status: ChecklistStatus }) {
  // Map onto semantic backgrounds as much as possible; keep clear contrast
  const map: Record<ChecklistStatus, string> = {
    verified: "bg-success/10 text-success border-success/20",
    paid: "bg-success/10 text-success border-success/20",
    confirmed: "bg-success/10 text-success border-success/20",
    approved: "bg-success/10 text-success border-success/20",
    completed: "bg-success/10 text-success border-success/20",
    received: "bg-info/10 text-info border-info/20",
    pending: "bg-warning/10 text-warning border-warning/20",
    in_progress: "bg-warning/10 text-warning border-warning/20",
    overdue: "bg-destructive/10 text-destructive border-destructive/20",
    not_required: "bg-muted text-muted-foreground border-border",
    not_applicable: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={cn("px-2 py-1 text-xs font-medium rounded-full border", map[status])}>
      {status.replace("_", " ")}
    </span>
  );
}

function StatusIcon({ status }: { status: ChecklistStatus }) {
  if (["verified","paid","confirmed","approved","completed"].includes(status)) {
    return <CheckCircle className="text-success" size={16} />;
  }
  if (status === "received") return <FileCheck className="text-info" size={16} />;
  if (status === "overdue") return <AlertTriangle className="text-destructive" size={16} />;
  if (["pending","in_progress"].includes(status)) return <Clock className="text-warning" size={16} />;
  return <XCircle className="text-muted-foreground" size={16} />;
}

export default function OfferManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "complete" | "in_progress" | "urgent">("all");

  // === Mock data (loaded inline) ============================================
  const offerHolders: OfferHolder[] = [
    {
      id: 1,
      studentName: "Maya Patel",
      studentId: "WB2025001",
      email: "maya.patel@email.com",
      phone: "+44 7123 456789",
      course: "BA (Hons) Professional Music (Performance)",
      campus: "Brighton",
      intake: "September 2025",
      offerType: "Conditional",
      offerStatus: "Conditional_Accepted",
      offerDate: "2025-06-15",
      acceptanceDate: "2025-07-20",
      enrollmentTarget: "2025-09-15",
      adminStatus: "urgent",
      checklist: {
        finalGrades: {
          status: "pending",
          dueDate: "2025-08-24",
          description: "A-Level results: BBC minimum required",
          category: "academic",
          submittedDate: null,
          notes: "Results day: 15th August"
        },
        qualificationVerification: {
          status: "received",
          dueDate: "2025-08-30",
          description: "UCAS qualification verification",
          category: "academic",
          submittedDate: "2025-07-25",
          notes: "Verified by UCAS"
        },
        photoId: {
          status: "received",
          dueDate: "2025-08-15",
          description: "Valid photo ID (passport/driving license)",
          category: "identity",
          submittedDate: "2025-07-18",
          notes: "UK driving license uploaded"
        },
        rightToStudy: {
          status: "not_required",
          dueDate: null,
          description: "UK visa/settlement status",
          category: "identity",
          submittedDate: null,
          notes: "UK citizen - no visa required"
        },
        dbsCheck: {
          status: "in_progress",
          dueDate: "2025-08-20",
          description: "Enhanced DBS check",
          category: "identity",
          submittedDate: null,
          notes: "Application submitted to DBS"
        },
        depositPayment: {
          status: "paid",
          dueDate: "2025-08-01",
          description: "£2,000 course deposit",
          category: "financial",
          submittedDate: "2025-07-22",
          notes: "Paid via bank transfer"
        },
        studentFinance: {
          status: "in_progress",
          dueDate: "2025-08-31",
          description: "Student Finance England application",
          category: "financial",
          submittedDate: null,
          notes: "SFE reference: 1234567890"
        },
        accommodation: {
          status: "confirmed",
          dueDate: "2025-08-10",
          description: "University accommodation booking",
          category: "accommodation",
          submittedDate: "2025-07-15",
          notes: "Preston Park House - En-suite room"
        },
        healthForm: {
          status: "pending",
          dueDate: "2025-09-01",
          description: "Student health questionnaire",
          category: "health",
          submittedDate: null,
          notes: "Medical conditions disclosure"
        },
        immunizations: {
          status: "not_required",
          dueDate: null,
          description: "Required immunizations",
          category: "health",
          submittedDate: null,
          notes: "Not required for music courses"
        }
      },
      lastContact: "2025-08-09",
      urgentItems: ["finalGrades", "dbsCheck"]
    },
    {
      id: 2,
      studentName: "James Rodriguez",
      studentId: "WB2025002",
      email: "james.rodriguez@email.com",
      phone: "+34 612 345 678",
      course: "BA (Hons) Songwriting & Music Performance",
      campus: "Brighton",
      intake: "September 2025",
      offerType: "Unconditional",
      offerStatus: "Unconditional_Accepted",
      offerDate: "2025-06-20",
      acceptanceDate: "2025-07-15",
      enrollmentTarget: "2025-09-15",
      adminStatus: "in_progress",
      checklist: {
        finalGrades: {
          status: "verified",
          dueDate: "2025-06-20",
          description: "Spanish Bachillerato - completed",
          category: "academic",
          submittedDate: "2025-06-15",
          notes: "Spanish qualification verified"
        },
        qualificationVerification: {
          status: "verified",
          dueDate: "2025-07-01",
          description: "NARIC statement of comparability",
          category: "academic",
          submittedDate: "2025-06-25",
          notes: "Equivalent to A-Level ABB"
        },
        photoId: {
          status: "received",
          dueDate: "2025-08-15",
          description: "Valid photo ID (passport/driving license)",
          category: "identity",
          submittedDate: "2025-07-20",
          notes: "Spanish passport uploaded"
        },
        rightToStudy: {
          status: "pending",
          dueDate: "2025-08-25",
          description: "Student visa application",
          category: "identity",
          submittedDate: null,
          notes: "Visa appointment: 12th August"
        },
        dbsCheck: {
          status: "not_applicable",
          dueDate: null,
          description: "Enhanced DBS check",
          category: "identity",
          submittedDate: null,
          notes: "International student - not required initially"
        },
        depositPayment: {
          status: "paid",
          dueDate: "2025-07-30",
          description: "£2,000 course deposit",
          category: "financial",
          submittedDate: "2025-07-16",
          notes: "Paid via international transfer"
        },
        studentFinance: {
          status: "not_applicable",
          dueDate: null,
          description: "Student Finance England application",
          category: "financial",
          submittedDate: null,
          notes: "Self-funded - EU national"
        },
        accommodation: {
          status: "pending",
          dueDate: "2025-08-15",
          description: "University accommodation booking",
          category: "accommodation",
          submittedDate: null,
          notes: "International student priority booking"
        },
        healthForm: {
          status: "completed",
          dueDate: "2025-09-01",
          description: "Student health questionnaire",
          category: "health",
          submittedDate: "2025-07-28",
          notes: "No medical conditions disclosed"
        },
        immunizations: {
          status: "not_required",
          dueDate: null,
          description: "Required immunizations",
          category: "health",
          submittedDate: null,
          notes: "Not required for music courses"
        }
      },
      lastContact: "2025-08-08",
      urgentItems: ["rightToStudy", "accommodation"]
    },
    {
      id: 3,
      studentName: "Aisha Johnson",
      studentId: "WB2025003",
      email: "aisha.johnson@email.com",
      phone: "+44 7987 654321",
      course: "BA (Hons) Creative Music Production",
      campus: "Brighton",
      intake: "September 2025",
      offerType: "Conditional",
      offerStatus: "Conditional_Accepted",
      offerDate: "2025-06-10",
      acceptanceDate: "2025-07-05",
      enrollmentTarget: "2025-09-15",
      adminStatus: "complete",
      checklist: {
        finalGrades: {
          status: "verified",
          dueDate: "2025-08-24",
          description: "A-Level results: ABB achieved",
          category: "academic",
          submittedDate: "2025-08-15",
          notes: "Requirements exceeded"
        },
        qualificationVerification: {
          status: "verified",
          dueDate: "2025-08-30",
          description: "UCAS qualification verification",
          category: "academic",
          submittedDate: "2025-08-16",
          notes: "Verified by UCAS"
        },
        photoId: {
          status: "verified",
          dueDate: "2025-08-15",
          description: "Valid photo ID",
          category: "identity",
          submittedDate: "2025-07-10",
          notes: "UK passport verified"
        },
        rightToStudy: {
          status: "verified",
          dueDate: null,
          description: "UK visa/settlement status",
          category: "identity",
          submittedDate: null,
          notes: "UK citizen - verified"
        },
        dbsCheck: {
          status: "verified",
          dueDate: "2025-08-20",
          description: "Enhanced DBS check",
          category: "identity",
          submittedDate: "2025-08-05",
          notes: "Clear DBS certificate received"
        },
        depositPayment: {
          status: "paid",
          dueDate: "2025-08-01",
          description: "£2,000 course deposit",
          category: "financial",
          submittedDate: "2025-07-06",
          notes: "Paid immediately after acceptance"
        },
        studentFinance: {
          status: "approved",
          dueDate: "2025-08-31",
          description: "Student Finance England application",
          category: "financial",
          submittedDate: "2025-07-20",
          notes: "Full maintenance and tuition loan approved"
        },
        accommodation: {
          status: "confirmed",
          dueDate: "2025-08-10",
          description: "University accommodation booking",
          category: "accommodation",
          submittedDate: "2025-07-08",
          notes: "Grand Parade Studios - Studio flat"
        },
        healthForm: {
          status: "completed",
          dueDate: "2025-09-01",
          description: "Student health questionnaire",
          category: "health",
          submittedDate: "2025-08-01",
          notes: "Completed online"
        },
        immunizations: {
          status: "not_required",
          dueDate: null,
          description: "Required immunizations",
          category: "health",
          submittedDate: null,
          notes: "Not required for music courses"
        }
      },
      lastContact: "2025-08-10",
      urgentItems: []
    }
  ];
  // ==========================================================================

  const filteredOffers = useMemo(() => {
    return offerHolders.filter((offer) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        offer.studentName.toLowerCase().includes(q) ||
        offer.studentId.toLowerCase().includes(q) ||
        offer.course.toLowerCase().includes(q);
      const matchesStatus = selectedStatus === "all" || offer.adminStatus === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [offerHolders, searchQuery, selectedStatus]);

  const statusCounts = useMemo(() => {
    return offerHolders.reduce(
      (acc, o) => ({ ...acc, [o.adminStatus]: (acc as any)[o.adminStatus] + 1 }),
      { complete: 0, in_progress: 0, urgent: 0 } as Record<"complete" | "in_progress" | "urgent", number>
    );
  }, [offerHolders]);

  const isOverdue = (item: ChecklistItem) => {
    if (!item.dueDate) return false;
    if (["verified","completed","paid","approved"].includes(item.status)) return false;
    return new Date(item.dueDate) < new Date();
  };

  const adminPill = (s: OfferHolder["adminStatus"]) =>
    s === "complete"
      ? "bg-success/10 text-success"
      : s === "in_progress"
      ? "bg-warning/10 text-warning"
      : s === "urgent"
      ? "bg-destructive/10 text-destructive"
      : "bg-muted text-muted-foreground";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <nav className="text-sm text-muted-foreground mb-1">
                CRM → <span className="text-foreground font-medium">Offers</span>
              </nav>
              <h1 className="text-2xl font-bold">Offer Management</h1>
              <p className="text-muted-foreground mt-1">Track administrative requirements for offer holders through to enrollment</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent">
                <Download size={16} /> Export Checklist
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent">
                <Upload size={16} /> Bulk Upload
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                <Plus size={16} /> Add Document
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {[
            { label: "Total Offers", value: offerHolders.length, icon: FileText, accent: "text-primary" },
            { label: "Admin Complete", value: statusCounts.complete, icon: CheckCircle, accent: "text-success" },
            { label: "In Progress", value: statusCounts.in_progress, icon: Clock, accent: "text-warning" },
            { label: "Urgent Action", value: statusCounts.urgent, icon: AlertTriangle, accent: "text-destructive" },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="bg-card rounded-lg shadow-sm border border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className={cn("text-2xl font-bold", label === "Admin Complete" ? "text-success" :
                    label === "In Progress" ? "text-warning" :
                    label === "Urgent Action" ? "text-destructive" : "text-foreground"
                  )}>
                    {value}
                  </p>
                </div>
                <Icon className={accent} size={24} />
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow-sm border border-border mb-6">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                  <input
                    type="text"
                    placeholder="Search by student name, ID, or course..."
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <select
                  className="px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                >
                  <option value="all">All Statuses</option>
                  <option value="complete">Complete</option>
                  <option value="in_progress">In Progress</option>
                  <option value="urgent">Urgent</option>
                </select>
                <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent">
                  <Filter size={16} /> More Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Offer Cards */}
        <div className="space-y-6">
          {filteredOffers.map((offer) => (
            <div key={offer.id} className="bg-card rounded-lg shadow-sm border border-border">
              <div className="p-6">
                {/* Student Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{offer.studentName}</h3>
                      <p className="text-sm text-muted-foreground">{offer.studentId} • {offer.course}</p>
                      <p className="text-sm text-muted-foreground">{offer.campus} • {offer.intake}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={cn("inline-flex px-2 py-1 text-xs font-semibold rounded-full", adminPill(offer.adminStatus))}>
                        {offer.adminStatus.replace("_", " ").toUpperCase()}
                      </span>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-secondary text-secondary-foreground">
                        {offer.offerType}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {offer.urgentItems.length > 0 && (
                      <div className="text-right text-sm">
                        <div className="text-destructive font-medium">{offer.urgentItems.length} urgent</div>
                      </div>
                    )}
                    <button className="p-2 text-muted-foreground hover:text-foreground"><Eye size={16} /></button>
                    <button className="p-2 text-muted-foreground hover:text-foreground"><Edit size={16} /></button>
                    <button className="p-2 text-muted-foreground hover:text-foreground"><MoreHorizontal size={16} /></button>
                  </div>
                </div>

                {/* Checklist by Category */}
                <div className="space-y-6">
                  {categories.map((category) => {
                    const categoryItems = Object.entries(offer.checklist).filter(
                      ([, item]) => item.category === category.key
                    );
                    if (categoryItems.length === 0) return null;
                    const Icon = category.icon;
                    return (
                      <div key={category.key} className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Icon size={20} className={category.colorClass} />
                          <h4 className="font-medium">{category.label}</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {categoryItems.map(([key, item]) => {
                            const overdue = isOverdue(item);
                            return (
                              <div
                                key={key}
                                className={cn(
                                  "p-3 rounded-lg border",
                                  overdue ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/40"
                                )}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <StatusIcon status={item.status} />
                                    <span className="text-sm font-medium">{item.description}</span>
                                  </div>
                                  <StatusPill status={item.status} />
                                </div>

                                {item.dueDate && (
                                  <div className={cn("text-xs mb-1", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                                    Due: {new Date(item.dueDate).toLocaleDateString()}
                                    {overdue && " (OVERDUE)"}
                                  </div>
                                )}

                                {item.submittedDate && (
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Submitted: {new Date(item.submittedDate).toLocaleDateString()}
                                  </div>
                                )}

                                {item.notes && (
                                  <div className="text-xs text-muted-foreground italic">{item.notes}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Contact & Actions */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><Mail size={14} />{offer.email}</div>
                    <div className="flex items-center gap-1"><Phone size={14} />{offer.phone}</div>
                    <div className="flex items-center gap-1"><Calendar size={14} />Last contact: {new Date(offer.lastContact).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-sm border border-border rounded hover:bg-accent">Send Reminder</button>
                    <button className="px-3 py-1 text-sm border border-border rounded hover:bg-accent">Upload Document</button>
                    <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">Contact Student</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredOffers.length === 0 && (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
              No offers match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}