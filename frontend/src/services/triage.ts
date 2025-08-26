// Adaptive triage service for ML-optimized lead scoring
export interface Lead {
  id: string;
  last_activity_at?: string;
  source?: string;
  has_email: boolean;
  has_phone: boolean;
  gdpr_opt_in: boolean;
  course_declared?: string;
  degree_level?: string;
  target_degree_level?: string;
  course_supply_state?: string;
  engagement: Record<string, number>;
}

export interface TriageItem {
  leadId: string;
  score: number;
  band: string;
  action: string;
  confidence: number;
  reasons: string[];
  raw_factors: Record<string, any>;
}

export interface TriageResponse {
  items: TriageItem[];
}

export interface TriageRequest {
  leads: Lead[];
  weights?: Record<string, number>;
}

const API_BASE = 'http://localhost:8000';

export async function triageLeads(request: TriageRequest): Promise<TriageResponse> {
  const response = await fetch(`${API_BASE}/ai/triage/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Triage failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Helper function to convert existing lead data to triage format
export function convertLeadToTriageFormat(lead: any): Lead {
  return {
    id: lead.id,
    last_activity_at: lead.last_activity_at,
    source: lead.source || lead.lead_source || 'unknown',
    has_email: Boolean(lead.email),
    has_phone: Boolean(lead.phone),
    gdpr_opt_in: Boolean(lead.gdpr_opt_in),
    course_declared: lead.course_declared || lead.latest_programme_name,
    degree_level: lead.degree_level,
    target_degree_level: lead.target_degree_level,
    course_supply_state: lead.course_supply_state,
    engagement: lead.engagement || {},
  };
}

// Batch triage for multiple leads
export async function batchTriageLeads(leads: any[]): Promise<TriageResponse> {
  const triageLeads = leads.map(convertLeadToTriageFormat);
  return triageLeads(triageLeads);
}
