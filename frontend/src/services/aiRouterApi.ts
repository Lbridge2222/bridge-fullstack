import { apiFetch } from './api';

export interface RouterRequest {
  query: string;
  context: Record<string, any>;
  ui_capabilities?: string[];
}

export interface RouterResponse {
  intent: string;
  confidence: number;
  answer_markdown: string;
  actions: Array<{
    type: string;
    label?: string;
    action?: string;
    path?: string;
    value?: string;
    id?: string;
    payload?: Record<string, any>;
    variant?: string;
    text?: string;
    mutation?: Record<string, any>;
  }>;
  sources: Array<{
    title: string;
    url?: string;
    snippet: string;
  }>;
  telemetry: Record<string, any>;
  session_id: string;
}

export const aiRouterApi = {
  routeQuery: async (request: RouterRequest): Promise<RouterResponse> => {
    return apiFetch<RouterResponse>('/ai/router/', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};
