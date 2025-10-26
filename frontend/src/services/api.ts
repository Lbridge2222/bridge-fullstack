// API service layer for backend integration
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  // NEW: Progression intelligence fields
  progression_probability?: number;
  enrollment_probability?: number;
  next_stage_eta_days?: number;
  enrollment_eta_days?: number;
  progression_blockers?: Blocker[];
  recommended_actions?: NextBestAction[];
}

export interface Blocker {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  item: string;
  impact: string;
  resolution_action: string;
  estimated_delay_days?: number;
}

export interface NextBestAction {
  action: string;
  priority: number;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  deadline?: string;
  action_type: 'communication' | 'documentation' | 'scheduling' | 'review' | 'resolution';
}

export interface ProgressionPrediction {
  next_stage: string;
  progression_probability: number;
  eta_days?: number;
  confidence: number;
}

export interface EnrollmentPrediction {
  enrollment_probability: number;
  enrollment_eta_days?: number;
  confidence: number;
  key_factors: string[];
}

export interface ApplicationIntelligence {
  application_id: string;
  current_stage: string;
  days_in_stage: number;
  progression_prediction: ProgressionPrediction;
  enrollment_prediction: EnrollmentPrediction;
  blockers: Blocker[];
  next_best_actions: NextBestAction[];
  cohort_insights: Record<string, any>;
  generated_at: string;
}

export interface PersonEnriched {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
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
  source?: string;
  contact_attempts?: number;
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
export function apiFetch(endpoint: string, options: (RequestInit & { returnType: 'void' })): Promise<void>;
export function apiFetch<T>(endpoint: string, options?: (RequestInit & { returnType?: 'json' })): Promise<T>;
export async function apiFetch<T>(endpoint: string, options?: RequestInit & { returnType?: 'json' | 'void' }): Promise<T | void> {
  const fullUrl = `${API_BASE}${endpoint}`;

  if (options?.body) {
    let parsedBody: unknown = options.body;
    try {
      parsedBody = JSON.parse(options.body as string);
    } catch {
      parsedBody = options.body;
    }
    console.log(`API Fetch: ${options?.method || 'GET'} ${fullUrl}`, parsedBody);
  } else {
    console.log(`API Fetch: ${options?.method || 'GET'} ${fullUrl}`);
  }
  
  const response = await fetch(fullUrl, {
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
        if (error?.detail) {
          if (typeof error.detail === 'object' && error.detail && 'blockers' in error.detail && Array.isArray(error.detail.blockers)) {
            message = `Blockers: ${error.detail.blockers.join(', ')}`;
          } else if (typeof error.detail === 'string') {
            message = error.detail;
          } else {
            message = JSON.stringify(error.detail);
          }
        }
    } catch (_) {
      try {
        const text = await response.text();
        if (text) message = text;
      } catch (_) {}
    }
    console.error(`API Error: ${options?.method || 'GET'} ${fullUrl} - ${response.status} ${message}`);
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

  // Get available stages
  getStages: (): Promise<{id: string; label: string}[]> => {
    return apiFetch<{id: string; label: string}[]>('/applications/stages');
  },

  // Get application details
  getDetails: (applicationId: string): Promise<any> => {
    return apiFetch(`/applications/${applicationId}/details`);
  },

  // Update a single application field (with audit logging)
  updateField: (
    applicationId: string, 
    fieldName: string, 
    oldValue: any, 
    newValue: any,
    userId?: string,
    changeReason?: string
  ): Promise<any> => {
    return apiFetch(`/applications/${applicationId}/field`, {
      method: 'PATCH',
      body: JSON.stringify({
        field_name: fieldName,
        old_value: oldValue,
        new_value: newValue,
        user_id: userId,
        change_reason: changeReason
      }),
    });
  },

  // Get audit log for an application
  getAuditLog: (applicationId: string, limit: number = 50, offset: number = 0): Promise<any> => {
    return apiFetch(`/applications/${applicationId}/audit-log?limit=${limit}&offset=${offset}`);
  },

  // Get human-readable audit trail
  getAuditTrail: (applicationId: string, limit: number = 50): Promise<any> => {
    return apiFetch(`/applications/${applicationId}/audit-trail?limit=${limit}`);
  },

  // Get application statistics
  getStats: (): Promise<any> => {
    return apiFetch('/applications/stats');
  },

  // NEW: Get application progression intelligence
  getProgressionIntelligence: (applicationId: string, options?: {
    include_blockers?: boolean;
    include_nba?: boolean;
    include_cohort_analysis?: boolean;
  }): Promise<ApplicationIntelligence> => {
    return apiFetch('/ai/application-intelligence/predict', {
      method: 'POST',
      body: JSON.stringify({
        application_id: applicationId,
        include_blockers: options?.include_blockers ?? true,
        include_nba: options?.include_nba ?? true,
        include_cohort_analysis: options?.include_cohort_analysis ?? true,
      }),
    });
  },

  // NEW: Batch predict progression for multiple applications
  predictProgressionBatch: (applicationIds: string[]): Promise<any> => {
    return apiFetch('/ai/application-intelligence/predict-batch', {
      method: 'POST',
      body: JSON.stringify(applicationIds),
    });
  },

  // NEW: Log an Ask Ivy action for outcome loop tracking
  logIvyAction: (applicationId: string, data: any): Promise<{ ok: boolean; audit_id?: string }> => {
    return apiFetch(`/applications/${applicationId}/ai/action`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // NEW: Log a follow-up outcome related to a prior Ivy action
  logIvyActionOutcome: (
    applicationId: string,
    data: { related_audit_id?: string; outcome: string; details?: any; session_id?: string; timestamp?: string }
  ): Promise<{ ok: boolean; audit_id?: string }> => {
    return apiFetch(`/applications/${applicationId}/ai/action-outcome`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Bulk stage update
  bulkMoveStage: (payload: {
    application_ids: string[];
    to_stage: string;
    note?: string;
    changed_by?: string;
  }): Promise<any> => {
    return apiFetch('/applications/bulk/stage', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Bulk priority update
  bulkUpdatePriority: (payload: {
    application_ids: string[];
    priority: string;
    urgency_reason?: string;
  }): Promise<any> => {
    return apiFetch('/applications/bulk/priority', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
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

  // New update methods for bidirectional data flow
  updatePerson: (personId: string, updates: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    date_of_birth?: string;
    programme?: string;
    lifecycle_state?: string;
  }): Promise<any> => {
    return apiFetch(`/people/${personId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  updateLead: (personId: string, updates: {
    lead_score?: number;
    conversion_probability?: number;
    notes?: string;
    assigned_to?: string;
    status?: string;
    next_follow_up?: string;
  }): Promise<any> => {
    return apiFetch(`/people/${personId}/lead`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
  // Upsert a custom property for a person
  updatePersonProperty: (personId: string, payload: {
    property_id?: string;
    property_name?: string;
    data_type: 'text'|'number'|'boolean'|'date'|'phone'|'json';
    value: any;
  }): Promise<any> => {
    return apiFetch(`/people/${personId}/properties`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  addLeadNote: (personId: string, note: {
    note: string;
    note_type?: string;
    created_by?: string;
  }): Promise<any> => {
    return apiFetch(`/people/${personId}/lead/notes`, {
      method: 'POST',
      body: JSON.stringify(note),
    });
  },

  getLeadNotes: (personId: string): Promise<{ notes: LeadNote[] }> => {
    return apiFetch<{ notes: LeadNote[] }>(`/people/${personId}/lead/notes`);
  },

  // Get single enriched person record
  getPersonEnriched: (personId: string): Promise<PersonEnriched & Record<string, any>> => {
    return apiFetch<PersonEnriched & Record<string, any>>(`/people/${personId}/enriched`);
  },

  // Get all people (for Directory)
  getAllPeople: (filters?: {
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

export interface LeadNote {
  id: number;
  note: string;
  note_type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Export the main API object
export const api = {
  applications: applicationsApi,
  people: peopleApi,
};

// Re-export commonly used types for easier importing
export type { ApplicationCard, StageMoveRequest, PriorityUpdateRequest, PersonEnriched, Blocker, NextBestAction, ActivityCreate, ActivityOut };

export default api;

// AI Leads API (ML-backed)
export const aiLeadsApi = {
  predictBatch: (leadIds: string[]): Promise<{
    model_used: string;
    total_processed: number;
    successful_predictions: number;
    predictions: Array<{ lead_id: string; probability: number | null; prediction?: boolean | number | null; confidence?: number | null }>;
    metadata?: any;
  }> => {
    return apiFetch(`/ai/advanced-ml/predict-batch`, {
      method: 'POST',
      body: JSON.stringify(leadIds),
    });
  },

  triage: (leadIds: string[]): Promise<{
    summary: { cohort_size: number; top_reasons: string[] };
    items: Array<{ id: string | number; score: number; reasons: string[]; next_action?: string }>;
    latency_ms: number;
  }> => {
    return apiFetch(`/ai/leads/triage`, {
      method: 'POST',
      body: JSON.stringify({ lead_ids: leadIds, filters: {} }),
    });
  },

  triageLeads: (leadIds: string[], filters: any = {}): Promise<{
    summary: { cohort_size: number; top_reasons: string[] };
    items: Array<{ 
      id: string; 
      score: number; 
      reasons: string[]; 
      next_action?: string;
      ml_confidence?: number;
      ml_probability?: number;
      ml_calibrated?: number;
      insight?: string;
      suggested_content?: string;
      action_rationale?: string;
      escalate_to_interview?: boolean;
      feature_coverage?: number;
    }>;
    latency_ms: number;
  }> => {
    return apiFetch(`/ai/leads/triage`, {
      method: 'POST',
      body: JSON.stringify({ lead_ids: leadIds, filters }),
    });
  },

  explainScore: (leadId: string): Promise<any> => {
    return apiFetch(`/ai/leads/explain-score`, { method: 'POST', body: JSON.stringify({ lead_id: leadId }) });
  },

  generateCallScript: (request: {
    lead_data: any;
    guardrails: any;
    context: any;
  }): Promise<{
    script: string;
    confidence: number;
    metadata: any;
  }> => {
    return apiFetch(`/api/ai/generate-script`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  logSentEmail: async (emailData: {
    lead_id: string;
    subject: string;
    body: string;
    html_body?: string;
    sent_by?: string;
    intent?: string;
  }): Promise<{
    success: boolean;
    email_log_id: number;
    sent_at: string;
    message: string;
  }> => {
    console.log('aiLeadsApi.logSentEmail called with:', emailData);
    return apiFetch(`/crm/emails/log`, {
      method: 'POST',
      body: JSON.stringify(emailData),
    });
  },

  getEmailHistory: (leadId: string, limit: number = 10): Promise<{
    lead_id: string;
    email_history: Array<{
      id: number;
      subject: string;
      sent_at: string;
      sent_by: string;
      intent: string;
      status: string;
      created_at: string;
    }>;
    activities: Array<{
      id: number;
      activity_type: string;
      activity_title: string;
      activity_description?: string;
      created_at: string;
      metadata?: any;
    }>;
    total_emails: number;
    total_activities: number;
  }> => {
    return apiFetch(`/crm/emails/history/${leadId}?limit=${limit}`, {
      method: 'GET',
    });
  },
};

export interface UIAction {
  label: string;
  action: 'open_call_console' | 'open_email_composer' | 'open_meeting_scheduler' | 'view_profile';
}

export interface IvyConversationalResponse {
  kind: 'conversational';
  answer_markdown: string;
  actions?: UIAction[];
  sources?: Array<{ id?: string; title?: string; preview?: string }>;
}

export interface IvyModalResponse {
  kind: 'modal';
  modal: { type: string; payload: any };
  actions?: UIAction[];
}

export type IvyRouterV2Response = IvyConversationalResponse | IvyModalResponse;

export const aiRouterApi = {
  routerV2: (payload: { query: string; context?: any; ui_capabilities?: string[] }): Promise<IvyRouterV2Response> => {
    return apiFetch<IvyRouterV2Response>(`/ai/router/v2`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export const ragApi = {
  queryV2: (payload: { query: string; limit?: number; context?: any }): Promise<IvyConversationalResponse> => {
    return apiFetch<IvyConversationalResponse>(`/rag/query_v2`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// Activity interfaces
export interface ActivityCreate {
  person_id: string;
  activity_type: string;
  activity_title: string;
  activity_description?: string;
  metadata?: Record<string, any>;
}

export interface ActivityOut {
  id: number;
  lead_id: string;
  activity_type: string;
  activity_title: string;
  activity_description?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export const activitiesApi = {
  create: (activity: ActivityCreate): Promise<ActivityOut> => {
    return apiFetch<ActivityOut>(`/activities/`, {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  },
  
  getByPerson: (personId: string, limit: number = 50, offset: number = 0): Promise<ActivityOut[]> => {
    const url = `/activities/person/${personId}?limit=${limit}&offset=${offset}`;
    console.log('🌐 Activities API URL:', `${API_BASE}${url}`);
    return apiFetch<ActivityOut[]>(url);
  },
  
  getById: (activityId: number): Promise<ActivityOut> => {
    return apiFetch<ActivityOut>(`/activities/${activityId}`);
  },
  
  delete: (activityId: number): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>(`/activities/${activityId}`, {
      method: 'DELETE',
    });
  },
};
