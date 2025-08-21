// API service layer for backend integration
const API_BASE = 'http://localhost:8000';

export interface ApiError {
  detail: string;
}

export interface ApplicationCard {
  application_id: string;
  stage: string;
  status: string;
  source?: string;
  sub_source?: string;
  assignee_user_id?: string;
  created_at: string;
  priority?: string;
  urgency?: string;
  urgency_reason?: string;
  person_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  lead_score?: number;
  conversion_probability?: number;
  programme_name: string;
  programme_code?: string;
  campus_name?: string;
  cycle_label: string;
  days_in_pipeline?: number;
  sla_overdue: boolean;
  has_offer: boolean;
  has_active_interview: boolean;
  last_activity_at?: string;
  offer_type?: string;
}

export interface PersonEnriched {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  lifecycle_state: string;
  lead_score?: number;
  conversion_probability?: number;
  latest_application_stage?: string;
  latest_programme_name?: string;
  latest_campus_name?: string;
  latest_academic_year?: string;
  last_activity_at?: string;
  last_activity_title?: string;
  last_activity_kind?: string;
  created_at?: string;
}

export interface StageMoveRequest {
  to_stage: string;
  changed_by?: string;
  note?: string;
}

export interface PriorityUpdateRequest {
  priority: 'critical' | 'high' | 'medium' | 'low';
  urgency_reason?: string;
}

// Generic fetch wrapper with error handling and return-type aware parsing
function apiFetch(endpoint: string, options: (RequestInit & { returnType: 'void' })): Promise<void>;
function apiFetch<T>(endpoint: string, options?: (RequestInit & { returnType?: 'json' })): Promise<T>;
async function apiFetch<T>(endpoint: string, options?: RequestInit & { returnType?: 'json' | 'void' }): Promise<T | void> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    // Try to parse JSON error, fallback to text
    let message = `HTTP ${response.status}`;
    try {
      const error: ApiError = await response.json();
      message = error?.detail || message;
    } catch (_) {
      try {
        const text = await response.text();
        if (text) message = text;
      } catch (_) {}
    }
    throw new Error(message);
  }

  // Explicit void or HTTP 204 → no body expected
  if (options?.returnType === 'void' || response.status === 204) {
    return;
  }

  // Try JSON; if body is empty or invalid JSON, return undefined
  try {
    // Some servers send content-type json but empty body; response.json() would throw
    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return undefined as unknown as T;
    }
    return JSON.parse(text) as T;
  } catch (_) {
    return undefined as unknown as T;
  }
}

// Applications Board API
export const applicationsApi = {
  // Get applications board with optional filters
  getBoard: (filters?: {
    stage?: string;
    assignee?: string;
    priority?: string;
    urgency?: string;
    limit?: number;
  }): Promise<ApplicationCard[]> => {
    const params = new URLSearchParams();
    if (filters?.stage) params.append('stage', filters.stage);
    if (filters?.assignee) params.append('assignee', filters.assignee);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.urgency) params.append('urgency', filters.urgency);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    return apiFetch<ApplicationCard[]>(`/applications/board?${params}`);
  },

  // Move application to different stage
  moveStage: (applicationId: string, payload: StageMoveRequest): Promise<any> => {
    return apiFetch(`/applications/${applicationId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // Update application priority
  updatePriority: (applicationId: string, payload: PriorityUpdateRequest): Promise<any> => {
    return apiFetch(`/applications/${applicationId}/priority`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // Refresh materialized view
  refreshBoard: (): Promise<void> => {
    return apiFetch('/applications/board/_refresh', { method: 'POST', returnType: 'void' });
  },
};

// People Management API
export const peopleApi = {
  // Get people by system area
  getLeads: (filters?: { q?: string; limit?: number }): Promise<PersonEnriched[]> => {
    const params = new URLSearchParams();
    if (filters?.q) params.append('q', filters.q);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    return apiFetch<PersonEnriched[]>(`/people/leads?${params}`);
  },

  getAdmissions: (filters?: { q?: string; limit?: number }): Promise<PersonEnriched[]> => {
    const params = new URLSearchParams();
    if (filters?.q) params.append('q', filters.q);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    return apiFetch<PersonEnriched[]>(`/people/admissions?${params}`);
  },

  getStudentRecords: (filters?: { q?: string; limit?: number }): Promise<PersonEnriched[]> => {
    const params = new URLSearchParams();
    if (filters?.q) params.append('q', filters.q);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    return apiFetch<PersonEnriched[]>(`/people/student-records?${params}`);
  },

  // Get enriched people data
  getEnriched: (filters?: {
    lifecycle_state?: string;
    q?: string;
    limit?: number;
  }): Promise<PersonEnriched[]> => {
    const params = new URLSearchParams();
    if (filters?.lifecycle_state) params.append('lifecycle_state', filters.lifecycle_state);
    if (filters?.q) params.append('q', filters.q);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    return apiFetch<PersonEnriched[]>(`/people/enriched?${params}`);
  },

  // Promote person through lifecycle states
  promote: (personId: string, newState: string, reason?: string): Promise<any> => {
    const params = new URLSearchParams();
    params.append('new_state', newState);
    if (reason) params.append('reason', reason);
    
    return apiFetch(`/people/${personId}/promote?${params}`, { method: 'POST' });
  },
};

// Dashboard API
export const dashboardApi = {
  getMetrics: () => apiFetch<DashboardMetrics>('/dashboard/metrics'),
  getAIInsights: () => apiFetch<{ insights: AIInsight[] }>('/dashboard/ai-insights'),
};

// Offers API
export const offersApi = {
  getOffers: (filters?: { status?: string; q?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.q) params.append('q', filters.q);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const query = params.toString();
    return apiFetch<OfferHolder[]>(`/offers${query ? `?${query}` : ''}`);
  },
  getOffer: (id: string) => apiFetch<OfferHolder>(`/offers/${id}`),
};

// Types for the new endpoints
export interface DashboardMetrics {
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
  insights: {
    highValueLeadsUncontacted: number;
    upcomingInterviews: number;
    enrollmentDeadlinesApproaching: number;
    applicationsThisWeek: number;
  };
}

export interface AIInsight {
  id: string;
  type: "urgent" | "opportunity" | "risk" | "success";
  title: string;
  description: string;
  action: string;
  impact: string;
  priority: number;
  category: string;
}

export interface OfferHolder {
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
}

export interface ChecklistItem {
  status: "verified" | "paid" | "confirmed" | "approved" | "completed" | "received" | "pending" | "in_progress" | "overdue" | "not_required" | "not_applicable";
  dueDate: string | null;
  description: string;
  category: "academic" | "identity" | "financial" | "accommodation" | "health";
  submittedDate: string | null;
  notes?: string | null;
}

// Export the main API object
export const api = {
  applications: applicationsApi,
  people: peopleApi,
};

export default api;
