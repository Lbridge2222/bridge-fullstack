// src/ivy/applicationRagClient.ts
// Application-specific RAG client for natural language queries about applications

import { ragApi, type RagContext } from '@/services/callConsoleApi';

const API_BASE: string = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ApplicationRagContext {
  // Application data context
  applications?: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    programme_name: string;
    stage: string;
    priority: string;
    conversion_probability?: number;
    progression_probability?: number;
    lead_score?: number;
    campus_name?: string;
    cycle_label?: string;
    source?: string;
    created_at?: string;
    last_activity_at?: string;
    progression_blockers?: Array<{item: string; severity?: string}>;
    recommended_actions?: Array<{action: string; deadline?: string}>;
  }>;
  
  // Current view context
  currentView?: "board" | "table";
  filters?: {
    program?: string;
    urgency?: string;
    priority?: string;
    deliveryMode?: string;
    studyPattern?: string;
    multiOnly?: boolean;
  };
  
  // Analytics context
  progressionStats?: {
    total: number;
    avgProgression: number;
    highRisk: number;
    highConfidence: number;
    blockersTotal: number;
    blockersApps: number;
    topBlocker?: {item: string; count: number};
    totalRecommendedActions: number;
  };
  
  // Selected applications
  selectedApplications?: string[];
  selectedApplicationId?: string;
}

export class ApplicationRagClient {
  // private baseUrl: string;

  constructor(_baseUrl: string = '/api/rag') {
    // this.baseUrl = baseUrl;
  }

  /**
   * Query RAG with application-specific context
   */
  async queryApplications(
    query: string,
    context: ApplicationRagContext,
    options: {
      signal?: AbortSignal;
      maxTokens?: number;
      temperature?: number;
      session_id?: string; // Phase 2: Conversation continuity
    } = {}
  ): Promise<{
    answer: string;
    sources: Array<{
      title: string;
      url?: string;
      snippet: string;
    }>;
    query_type: string;
    confidence: number;
    suggested_application_ids?: string[];
    session_id?: string; // Phase 2: Return session_id
  }> {
    const { signal, maxTokens = 1500, temperature = 0.3 } = options;

    console.log('Application RAG Client - Query:', query);
    console.log('Application RAG Client - Context:', context);

    try {
      // Check if this is a specific applicant/selection query
      const applicantName = this.extractApplicantName(query, context.applications || []);
      const selectedId = this.extractSelectedApplicationId(query, context);
      if (selectedId || applicantName) {
        if (selectedId) {
          console.log(`Detected selected application query for application_id: ${selectedId}`);
          return await this.querySpecificApplicant('', query, { ...context, selectedApplicationId: selectedId }, options);
        }
        // applicantName present without selection: attempt disambiguation against visible apps
        console.log(`Detected specific applicant query for: ${applicantName}`);
        const matches = this.findMatchingApps(context.applications || [], applicantName as string);
        if (matches.length === 1) {
          const only = matches[0];
          return await this.querySpecificApplicant(applicantName as string, query, { ...context, selectedApplicationId: only.application_id }, options);
        }
        if (matches.length > 1) {
          return {
            // Render a short prompt; the dialog will show pickers from candidates
            answer: `I found ${matches.length} matches for “${applicantName}”. Please select one below.`,
            sources: [],
            query_type: 'applicant_disambiguation',
            confidence: 0.8,
            // @ts-ignore UI will read candidates and originalQuery
            candidates: matches.slice(0, 5),
            // @ts-ignore
            originalQuery: query,
          } as any;
        }
        // No visible match; offer top candidates from current view for manual pick
        const suggestions = this.topNameSuggestions(context.applications || [], applicantName as string, 5);
        if (suggestions.length > 0) {
          return {
            answer: `I couldn't find an exact match for “${applicantName}” in the current view. Please select the closest match below.`,
            sources: [],
            query_type: 'applicant_disambiguation',
            confidence: 0.7,
            // @ts-ignore UI will read candidates and originalQuery
            candidates: suggestions,
            // @ts-ignore
            originalQuery: query,
          } as any;
        }
        // As a last resort, call analyzer to search DB by name
        return await this.querySpecificApplicant(applicantName as string, query, context, options);
      }

      // For general application queries, call Applications Insights (DB-grounded)
      const allVisibleIds = Array.isArray(context.applications)
        ? (context.applications as any[])
            .map(a => (a as any).application_id || (a as any).id)
            .filter(Boolean)
        : undefined;

      const payload = {
        query,
        session_id: options.session_id, // Phase 2: Pass session_id for conversation continuity
        filters: {
          stage: undefined,
          priority: (context.filters as any)?.priority,
          urgency: (context.filters as any)?.urgency,
          program: (context.filters as any)?.program,
          application_ids: Array.isArray(context.selectedApplications) && context.selectedApplications.length > 0
            ? context.selectedApplications
            : allVisibleIds,
        }
      };

      console.log('[RAG Client] Sending request with session_id:', options.session_id);
      console.log('[RAG Client] Full payload:', JSON.stringify(payload, null, 2));

      const resp = await fetch(`${API_BASE}/applications/insights/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal
      });
      if (!resp.ok) {
        throw new Error(`Applications Insights API failed: ${resp.status}`);
      }
      const data = await resp.json();

      return {
        answer: data.answer,
        sources: data.sources || [],
        query_type: data.query_type || 'applications_insights',
        confidence: data.confidence || 0.9,
        session_id: data.session_id // Phase 2: Return session_id from backend
      };

    } catch (error: any) {
      console.error('Application RAG query failed:', error);
      
      // Fallback response
      return {
        answer: this.generateFallbackResponse(query, context),
        sources: [],
        query_type: 'fallback',
        confidence: 0.3
      };
    }
  }

  /**
   * Build lead context from application data for RAG compatibility
   */
  private buildLeadContext(context: ApplicationRagContext): any {
    const applications = context.applications || [];
    
    if (applications.length === 0) {
      return {
        id: 'no-applications',
        name: 'No applications',
        email: '',
        phone: '',
        courseInterest: 'No data',
        statusType: 'unknown',
        nextAction: 'No actions available',
        followUpDate: '',
        aiInsights: {
          conversionProbability: 0,
          callStrategy: 'No strategy available',
          recommendedAction: 'No recommendations'
        }
      };
    }

    // If we have a selected application, focus on that
    if (context.selectedApplicationId) {
      const selectedApp = applications.find(
        // Prefer application_id but fall back to id if present
        (app: any) => (app.application_id && app.application_id === context.selectedApplicationId) ||
                      (app.id && app.id === context.selectedApplicationId)
      );
      if (selectedApp) {
        return this.mapApplicationToLead(selectedApp);
      }
    }

    // If we have multiple applications, create an aggregate view
    if (applications.length > 1) {
      return this.createAggregateLeadContext(applications, context);
    }

    // Single application
    return this.mapApplicationToLead(applications[0]);
  }

  /**
   * Map application data to lead format for RAG compatibility
   */
  private mapApplicationToLead(app: any): any {
    return {
      // Maintain id for compatibility; include uid for RAG client usage
      id: app.id,
      uid: app.application_id || app.id,
      name: app.name || `${app.first_name || ''} ${app.last_name || ''}`.trim(),
      email: app.email || '',
      phone: app.phone || '',
      courseInterest: app.programme_name || 'Unknown program',
      statusType: app.stage || 'unknown',
      nextAction: app.recommended_actions?.[0]?.action || 'Follow up',
      followUpDate: app.last_activity_at || '',
      leadScore: app.lead_score || 0,
      aiInsights: {
        conversionProbability: app.conversion_probability || app.progression_probability || 0,
        callStrategy: this.getCallStrategy(app),
        recommendedAction: app.recommended_actions?.[0]?.action || 'Follow up'
      },
      // Additional application-specific data
      applicationData: {
        stage: app.stage,
        priority: app.priority,
        campus: app.campus_name,
        cycle: app.cycle_label,
        source: app.source,
        blockers: app.progression_blockers || [],
        recommendations: app.recommended_actions || []
      }
    };
  }

  /**
   * Create aggregate lead context for multiple applications
   */
  private createAggregateLeadContext(applications: any[], context: ApplicationRagContext): any {
    const total = applications.length;
    const avgConversion = applications.reduce((sum, app) => 
      sum + (app.conversion_probability || app.progression_probability || 0), 0) / total;
    
    const highRisk = applications.filter(app => 
      (app.conversion_probability || app.progression_probability || 0) < 0.35).length;
    
    const stages = [...new Set(applications.map(app => app.stage))];
    const programs = [...new Set(applications.map(app => app.programme_name))];

    return {
      id: 'multiple-applications',
      name: `${total} applications`,
      email: 'Multiple applicants',
      phone: 'Multiple contacts',
      courseInterest: programs.join(', '),
      statusType: `${stages.length} different stages`,
      nextAction: 'Review pipeline',
      followUpDate: 'Various dates',
      leadScore: Math.round(avgConversion * 100),
      aiInsights: {
        conversionProbability: avgConversion,
        callStrategy: 'Pipeline management',
        recommendedAction: 'Focus on high-risk applications'
      },
      // Aggregate application data
      applicationData: {
        totalApplications: total,
        averageConversion: avgConversion,
        highRiskCount: highRisk,
        stages: stages,
        programs: programs,
        progressionStats: context.progressionStats
      }
    };
  }

  /**
   * Build transcript context from application data
   */
  private buildTranscriptContext(context: ApplicationRagContext): string[] {
    const applications = context.applications || [];
    const transcript: string[] = [];

    // Add current view context
    if (context.currentView) {
      transcript.push(`Currently viewing applications in ${context.currentView} mode`);
    }

    // Add filter context
    if (context.filters) {
      const activeFilters = Object.entries(context.filters)
        .filter(([_, value]) => value && value !== 'all' && value !== 'false')
        .map(([key, value]) => `${key}: ${value}`);
      
      if (activeFilters.length > 0) {
        transcript.push(`Active filters: ${activeFilters.join(', ')}`);
      }
    }

    // Add progression stats
    if (context.progressionStats) {
      const stats = context.progressionStats;
      transcript.push(`Pipeline overview: ${stats.total} applications, ${stats.avgProgression}% average progression, ${stats.highRisk} at-risk`);
      
      if (stats.topBlocker) {
        transcript.push(`Top blocker: ${stats.topBlocker.item} (${stats.topBlocker.count} mentions)`);
      }
    }

    // Add application details
    if (applications.length > 0) {
      transcript.push(`Viewing ${applications.length} application${applications.length > 1 ? 's' : ''}`);
      
      if (applications.length <= 5) {
        applications.forEach(app => {
          const name = app.name || 'Unknown Applicant';
          const prob = Math.round((app.conversion_probability || app.progression_probability || 0) * 100);
          transcript.push(`${name}: ${app.stage} (${prob}% conversion probability)`);
        });
      }
    }

    return transcript;
  }

  /**
   * Get call strategy based on application data
   */
  private getCallStrategy(app: any): string {
    const prob = app.conversion_probability || app.progression_probability || 0;
    // const stage = app.stage;
    // const priority = app.priority;

    if (prob >= 0.7) {
      return 'High conversion potential - focus on enrollment process';
    } else if (prob >= 0.5) {
      return 'Moderate conversion potential - address concerns and next steps';
    } else if (prob < 0.35) {
      return 'Low conversion potential - re-engagement strategy needed';
    } else {
      return 'Standard follow-up approach';
    }
  }

  private findMatchingApps(apps: any[], name: string): Array<{ application_id: string; name: string; stage?: string; programme_name?: string }> {
    try {
      if (!Array.isArray(apps) || apps.length === 0 || !name) return [];
      const norm = (s: any) => String(s || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/['’`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const t = norm(name);
      const items = apps.map(a => ({
        application_id: String((a as any).application_id || (a as any).id || ''),
        name: ((a as any).name || `${(a as any).first_name || ''} ${(a as any).last_name || ''}`).toString(),
        _full: norm(((a as any).name || `${(a as any).first_name || ''} ${(a as any).last_name || ''}`)),
        stage: (a as any).stage,
        programme_name: (a as any).programme_name,
      })).filter(x => x.application_id);
      return items.filter(it => it._full && (it._full.includes(t) || t.includes(it._full))).map(({_full, ...rest}) => rest);
    } catch {
      return [];
    }
  }

  private topNameSuggestions(apps: any[], name: string, limit: number = 5): Array<{ application_id: string; name: string; stage?: string; programme_name?: string }> {
    try {
      if (!Array.isArray(apps) || apps.length === 0 || !name) return [];
      const norm = (s: any) => String(s || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/['’`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const t = norm(name);
      const scored = apps.map(a => {
        const application_id = String((a as any).application_id || (a as any).id || '');
        const raw = ((a as any).name || `${(a as any).first_name || ''} ${(a as any).last_name || ''}`).toString();
        const full = norm(raw);
        const stage = (a as any).stage;
        const programme_name = (a as any).programme_name;
        const score = this.nameSimilarity(full, t);
        return { application_id, name: raw, stage, programme_name, _score: score };
      }).filter(x => x.application_id);
      return scored.sort((a, b) => b._score - a._score).slice(0, limit).map(({ _score, ...rest }) => rest);
    } catch {
      return [];
    }
  }

  private nameSimilarity(a: string, b: string): number {
    // simple token overlap + substring bonus
    if (!a || !b) return 0;
    if (a === b) return 1;
    let score = 0;
    if (a.includes(b) || b.includes(a)) score += 0.6;
    const ats = a.split(' ').filter(Boolean);
    const bts = b.split(' ').filter(Boolean);
    const setA = new Set(ats);
    const setB = new Set(bts);
    let overlap = 0;
    for (const t of setA) if (setB.has(t)) overlap += 1;
    score += overlap / Math.max(1, Math.max(setA.size, setB.size)) * 0.4;
    return Math.min(1, score);
  }

  /**
   * Generate fallback response when RAG fails
   */
  private generateFallbackResponse(_query: string, context: ApplicationRagContext): string {
    const applications = context.applications || [];
    const total = applications.length;

    if (total === 0) {
      return "I don't see any applications in the current view. Try adjusting your filters or refreshing the data.";
    }

    // Basic analysis based on available data
    const avgConversion = applications.reduce((sum, app) => 
      sum + (app.conversion_probability || app.progression_probability || 0), 0) / total;
    
    const highRisk = applications.filter(app => 
      (app.conversion_probability || app.progression_probability || 0) < 0.35).length;

    let response = `I can see ${total} application${total > 1 ? 's' : ''} in your current view. `;
    
    if (avgConversion > 0) {
      response += `The average conversion probability is ${Math.round(avgConversion * 100)}%. `;
    }
    
    if (highRisk > 0) {
      response += `${highRisk} application${highRisk > 1 ? 's are' : ' is'} at high risk of not converting. `;
    }

    response += "For more detailed analysis, please try rephrasing your question or check your connection.";

    return response;
  }

  /**
   * Extract applicant name from query
   */
  private extractApplicantName(query: string, apps: any[]): string | null {
    // Case-insensitive name detection: scan visible full names against the query.
    try {
      if (!Array.isArray(apps) || apps.length === 0 || !query) return null;
      const norm = (s: any) => String(s || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/['’`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const q = norm(query);
      const stop = ['our','my','the','this','that','applications','application','pipeline','stats','statistics','enrolment','enrollment','conversion'];
      // Build map of display names
      const items = apps.map(a => ({
        full: norm(((a as any).name) || `${(a as any).first_name || ''} ${(a as any).last_name || ''}`),
      })).filter(x => x.full && !stop.includes(x.full));
      // Find the longest name contained in the query
      let best: string | null = null;
      for (const it of items) {
        if (!it.full) continue;
        if (q.includes(it.full)) {
          if (!best || it.full.length > best.length) best = it.full;
        }
      }
      return best;
    } catch {
      return null;
    }
  }

  /**
   * Append a concise, factual pipeline snapshot to the model’s answer.
   */
  private enrichAnswerWithSnapshot(answer: string, context: ApplicationRagContext): string {
    try {
      const stats = context.progressionStats;
      const total = context.applications?.length || 0;
      if (!stats && total === 0) return answer;
      const parts: string[] = [];
      if (total > 0) parts.push(`${total} visible applications`);
      if (stats) {
        parts.push(`avg progression ${stats.avgProgression}%`);
        parts.push(`${stats.highRisk} high-risk`);
        if (stats.topBlocker?.item) parts.push(`top blocker: ${stats.topBlocker.item}`);
      }
      if (parts.length === 0) return answer;
      const snapshot = `\n\nContext snapshot: ${parts.join(' • ')}`;
      return (answer || '') + snapshot;
    } catch {
      return answer;
    }
  }

  /**
   * Query specific applicant using the new applications AI endpoint
   */
  private async querySpecificApplicant(
    applicantName: string, 
    query: string, 
    context: ApplicationRagContext,
    options: { signal?: AbortSignal; maxTokens?: number; temperature?: number } = {}
  ): Promise<{
    answer: string;
    sources: Array<{title: string; url?: string; snippet: string}>;
    query_type: string;
    confidence: number;
  }> {
    try {
      // Try to match the applicant to a visible application_id to disambiguate
      let matchId = this.findApplicationIdByName(context.applications || [], applicantName);
      const ctxSel = (context.selectedApplicationId) || (
        Array.isArray(context.selectedApplications) && context.selectedApplications.length === 1
          ? context.selectedApplications[0]
          : null
      );
      if (!matchId && ctxSel) matchId = String(ctxSel);

      const response = await fetch(`${API_BASE}/applications/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          applicant_name: applicantName,
          application_id: matchId || undefined,
          context: {
            applications: context.applications,
            currentView: context.currentView,
            filters: context.filters,
            progressionStats: context.progressionStats
          }
        }),
        signal: options.signal
      });

      if (!response.ok) {
        try {
          const err = await response.json();
          console.error('Analyzer error detail:', err);
        } catch {}
        throw new Error(`Applications AI API failed: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        answer: data.answer,
        sources: data.sources || [],
        query_type: 'applicant_analysis',
        confidence: data.confidence || 0.8
      };
      
    } catch (error) {
      console.error('Specific applicant query failed:', error);
      
      // Fallback to generic response
      return {
        answer: `I couldn't find "${applicantName}" in the current applications. Please check the spelling or try a different name.`,
        sources: [],
        query_type: 'error',
        confidence: 0.1
      };
    }
  }

  /**
   * Find a matching application_id by fuzzy name match within visible apps.
   */
  private findApplicationIdByName(apps: any[], name: string): string | null {
    try {
      if (!Array.isArray(apps) || apps.length === 0 || !name) return null;
      const norm = (s: any) =>
        String(s || '')
          .toLowerCase()
          .replace(/['’`]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

      const target = norm(name);
      // Build candidate full names
      const items = apps.map(a => ({
        id: (a as any).application_id || (a as any).id,
        full: norm(((a as any).name) || `${(a as any).first_name || ''} ${(a as any).last_name || ''}`),
      }));

      // Exact or contains match
      for (const it of items) {
        if (!it.id) continue;
        if (it.full === target || it.full.includes(target) || target.includes(it.full)) {
          return String(it.id);
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Return selected application_id if the query refers to the selected/current app.
   */
  private extractSelectedApplicationId(query: string, context: ApplicationRagContext): string | null {
    try {
      const q = (query || '').toLowerCase();
      const hints = ['selected application', 'this application', 'that application', 'the selected'];
      const refersToSelected = hints.some(h => q.includes(h));
      // If exactly one selected, prefer it regardless of phrasing
      const oneSelected = Array.isArray(context.selectedApplications) && context.selectedApplications.length === 1
        ? context.selectedApplications[0]
        : null;
      if (oneSelected) return String(oneSelected);
      if (refersToSelected) {
        // Fall back to selectedApplicationId if present
        if (context.selectedApplicationId) return String(context.selectedApplicationId);
      }
      return null;
    } catch {
      return null;
    }
  }
}

// Create default instance
export const applicationRagClient = new ApplicationRagClient();
