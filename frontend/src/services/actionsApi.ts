// API client for Actions System
// Handles triage generation, simulation, and execution

import type {
  TriageRequest,
  TriageQueueResponse,
  SimulateRequest,
  SimulateResponse,
  ExecuteRequest,
  ExecuteResponse,
  SessionMemory,
} from '@/types/actions';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Generate prioritized action queue using ML-based triage
 */
export async function generateTriage(
  request: TriageRequest = { limit: 5 }
): Promise<TriageQueueResponse> {
  const response = await fetch(`${API_BASE}/api/actions/triage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate triage queue');
  }

  return response.json();
}

/**
 * Simulate action to preview artifacts before executing
 */
export async function simulateAction(
  request: SimulateRequest
): Promise<SimulateResponse> {
  const response = await fetch(`${API_BASE}/api/actions/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to simulate action');
  }

  return response.json();
}

/**
 * Execute action (email, call, flag, unblock)
 * Phase A: Simulated execution with telemetry
 */
export async function executeAction(
  request: ExecuteRequest
): Promise<ExecuteResponse> {
  const response = await fetch(`${API_BASE}/api/actions/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to execute action');
  }

  return response.json();
}

/**
 * Get current session memory
 */
export async function getSessionMemory(): Promise<SessionMemory> {
  const response = await fetch(`${API_BASE}/api/actions/session`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    // Session might not exist yet, return empty
    return {};
  }

  return response.json();
}

/**
 * Update session memory
 */
export async function updateSessionMemory(
  memory: SessionMemory
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/actions/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(memory),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update session memory');
  }
}

/**
 * Sync conversation context to backend for action personalization
 */
export async function syncConversation(
  applicationId: string,
  messages: Array<{ role: 'user' | 'ai'; content: string; timestamp: string }>,
  keyConcerns?: string[]
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/actions/session/conversation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      application_id: applicationId,
      messages,
      key_concerns: keyConcerns,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to sync conversation');
  }
}

/**
 * Phase 4: Complete an action with outcome tracking and Ivy feedback
 */
export interface CompleteActionRequest {
  action_id: number;
  outcome_notes: string;
  success?: boolean;
}

export interface CompleteActionResponse {
  ok: boolean;
  action_id: number;
  follow_up_message?: string;
  suggested_next_actions?: string[];
}

export async function completeAction(
  request: CompleteActionRequest
): Promise<CompleteActionResponse> {
  const response = await fetch(
    `${API_BASE}/api/actions/${request.action_id}/complete`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        action_id: request.action_id,
        outcome_notes: request.outcome_notes,
        success: request.success ?? true,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to complete action');
  }

  return response.json();
}
