// TypeScript types for Actions System (Phase A)
// Intelligent action triage and execution tracking

export interface ActionArtifacts {
  message?: string;
  suggested_subject?: string;
  context?: string[] | string; // Can be array or Phase 4 string
  applicant_context?: string;
  call_script?: string;
  talking_points?: string[];
  // Phase 4: Personalized intervention content
  script?: string; // Ivy-generated call script or email draft
  expected_outcome?: string; // Success criteria for intervention
  description?: string; // Action description
  reasoning?: string; // Why this action is needed
}

export interface TriageItem {
  id?: number; // Queue ID for action completion
  application_id: string;
  applicant_name: string;
  stage: string;
  programme_name: string;
  action_type: 'email' | 'call' | 'flag' | 'unblock';
  reason: string;
  priority: number;
  expected_gain?: number;
  artifacts?: ActionArtifacts;
  expires_at?: string;
  conversion_probability?: number;
  urgency_context?: string;
  created_by_ivy?: boolean; // Phase 4: Track if action was created by Ivy
}

export interface TriageQueueResponse {
  queue: TriageItem[];
  count: number;
  generated_at: string;
}

export interface TriageRequest {
  limit?: number;
  filters?: {
    application_ids?: string[];
  };
}

export interface SimulateRequest {
  application_id: string;
  action_type: 'email' | 'call' | 'flag' | 'unblock';
}

export interface SimulateResponse {
  application_id: string;
  action_type: string;
  artifacts: ActionArtifacts;
  preview: string;
}

export interface ExecuteRequest {
  queue_id?: number;
  application_id: string;
  action_type: 'email' | 'call' | 'flag' | 'unblock';
  artifacts?: ActionArtifacts;
}

export interface ExecuteResponse {
  success: boolean;
  execution_id: number;
  result: 'sent' | 'failed' | 'skipped' | 'simulated';
  message: string;
}

export interface SessionMemory {
  activeStage?: string;
  viewedApplications?: string[];
  lastTriageIds?: string[];
  preferences?: {
    autoRefresh?: boolean;
    defaultLimit?: number;
  };
}
