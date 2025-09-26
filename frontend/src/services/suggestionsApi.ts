import { apiFetch } from './api';

export interface SuggestionsQuery {
  query: string;
  lead: Record<string, any>;
  triage?: Record<string, any>;
  forecast?: Record<string, any>;
  mlForecast?: Record<string, any>;
  anomalies?: Record<string, any>;
  segmentation?: Record<string, any>;
  cohort?: Record<string, any>;
}

export interface SuggestionsResponse {
  modal_title: string;
  intent: string;
  summary_bullets: string[];
  key_metrics: {
    conversion_probability_pct?: number | null;
    eta_days?: number | null;
    risk_score?: number | null;
    engagement_points?: number | null;
  };
  predictions: {
    conversion: {
      probability?: number | null;
      eta_days?: number | null;
      confidence?: number | null;
      source?: string;
    };
    attendance_1to1: {
      label: 'likely' | 'unlikely' | 'unknown';
      score?: number | null;
      rationale: string;
    };
  };
  next_best_action: {
    label: string;
    reason: string;
  };
  ask: string[];
  say: string[];
  gaps: string[];
  confidence: number;
  ui: {
    primary_cta: {
      label: string;
      action: string;
    };
    secondary_cta: {
      label: string;
      action: string;
    };
    chips: string[];
  };
  explanations: {
    used_fields: string[];
    reasoning: string;
  };
}

export const suggestionsApi = {
  async getSuggestions(query: SuggestionsQuery): Promise<SuggestionsResponse> {
    return apiFetch<SuggestionsResponse>('/rag/suggestions', {
      method: 'POST',
      body: JSON.stringify(query),
    });
  },
};
