// src/ivy/useApplicationIvy.tsx
// Specialized Ask Ivy hook for Applications Board

import * as React from "react";
import { ApplicationIvyDialog } from "./ApplicationIvyDialog";
import { applicationRagClient, type ApplicationRagContext } from "./applicationRagClient";
import { queryRouter } from "./queryRouter";
import { applicationAnalyzer } from "./applicationAnalyzer";
import type { IvyContext } from "./types";

export interface ApplicationIvyContext extends IvyContext {
  // Application-specific context
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
  selectedApplicationId?: string;
  selectedApplications?: string[];
  currentView?: "board" | "table";
  filters?: {
    program?: string;
    urgency?: string;
    priority?: string;
    deliveryMode?: string;
    studyPattern?: string;
    multiOnly?: boolean;
  };
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
  hasPhoneNumber?: boolean;
  
  // Application-specific actions
  navigate?: (path: string) => void;
  setView?: (view: "board" | "table") => void;
  toggleFilters?: () => void;
  toggleAiFocus?: () => void;
  openFilterModal?: (type: string) => void;
  setFilter?: (key: string, value: any) => void;
  showAnalytics?: (type: string) => void;
  refreshInsights?: () => void;
  createApplication?: () => void;
  exportApplications?: (ids: string[]) => void;
  openBulkActions?: () => void;
  explainScore?: (id: string) => void;
  getRecommendations?: (id: string) => void;
  identifyBlockers?: (id: string) => void;
  selectAll?: () => void;
  clearSelection?: () => void;
  refreshData?: () => void;
}

export function useApplicationIvy() {
  const [open, setOpen] = React.useState(false);
  const [context, setContext] = React.useState<ApplicationIvyContext>({});
  const [isQuerying, setIsQuerying] = React.useState(false);
  const [ragResponse, setRagResponse] = React.useState<{
    answer: string;
    sources: Array<{title: string; url?: string; snippet: string}>;
    query_type: string;
    confidence: number;
    candidates?: Array<{ application_id: string; name: string; stage?: string; programme_name?: string }>;
    originalQuery?: string;
  } | null>(null);

  // Bind ⌘K to open palette
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Query RAG with intelligent routing
  const queryRag = React.useCallback(async (query: string) => {
    // Check if this is a specific applicant query (route to backend analyzer via client)
    const applicantName = extractApplicantName(query);
    const ragContext: ApplicationRagContext = {
      applications: context.applications,
      currentView: context.currentView,
      filters: context.filters,
      progressionStats: context.progressionStats,
      selectedApplications: context.selectedApplications,
      selectedApplicationId: context.selectedApplicationId
    };

    if (applicantName) {
      console.log(`Detected specific applicant query for: ${applicantName}`);
      setIsQuerying(true);
      try {
        // Let the client route to /applications/ai/analyze
        const response = await applicationRagClient.queryApplications(query, ragContext);
        setRagResponse(response);
      } catch (err) {
        console.warn('Backend analyzer failed, falling back to local analyzer:', err);
        // Fallback to legacy local analysis
        try {
          const analysis = await applicationAnalyzer.analyzeApplicant(
            applicantName,
            context.applications || [],
            context
          );
          const answer = formatApplicantAnalysis(analysis, query);
          setRagResponse({
            answer,
            sources: [{
              title: `${applicantName}'s Application Analysis`,
              snippet: `Current stage: ${analysis.currentStage}, Conversion probability: ${(analysis.conversionProbability * 100).toFixed(1)}%`
            }],
            query_type: 'applicant_analysis',
            confidence: analysis.confidence
          });
        } catch (e) {
          setRagResponse({
            answer: `I couldn't find "${applicantName}" in the current applications. Please check the spelling or try a different name.`,
            sources: [],
            query_type: 'error',
            confidence: 0.1
          });
        }
      } finally {
        setIsQuerying(false);
      }
      return;
    }

    // Analyze query to determine routing
    const routing = queryRouter.getRoutingRecommendations(query);
    console.log('Query routing analysis:', routing);

    setIsQuerying(true);
    try {
      // Allow general queries even if applications are empty; client handles defaults
      const response = await applicationRagClient.queryApplications(query, ragContext);
      setRagResponse(response);
    } catch (error) {
      console.error('RAG query failed:', error);
      setRagResponse({
        answer: "I'm having trouble processing that query right now. Please try again or rephrase your question.",
        sources: [],
        query_type: 'error',
        confidence: 0.1
      });
    } finally {
      setIsQuerying(false);
    }
  }, [context]);

  // Extract applicant name from query
  const extractApplicantName = (query: string): string | null => {
    // Case-insensitive: match visible full names against the query
    const apps = context.applications || [];
    if (!Array.isArray(apps) || apps.length === 0 || !query) return null;
    const norm = (s: any) => String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/['’`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const q = norm(query);
    const stop = new Set(['our','my','the','this','that','applications','application','pipeline','stats','statistics','enrolment','enrollment','conversion']);
    const names = apps.map(a => ((a as any).name || `${(a as any).first_name || ''} ${(a as any).last_name || ''}`))
      .map(norm)
      .filter(n => n && !stop.has(n));
    let best: string | null = null;
    for (const n of names) {
      if (q.includes(n)) {
        if (!best || n.length > best.length) best = n;
      }
    }
    return best;
  };

  // Handle specific applicant queries
  const handleSpecificApplicantQuery = async (applicantName: string, query: string) => {
    setIsQuerying(true);
    try {
      const analysis = await applicationAnalyzer.analyzeApplicant(
        applicantName, 
        context.applications || [], 
        context
      );

      // Format the response based on the analysis
      const answer = formatApplicantAnalysis(analysis, query);
      
      setRagResponse({
        answer,
        sources: [{
          title: `${applicantName}'s Application Analysis`,
          snippet: `Current stage: ${analysis.currentStage}, Conversion probability: ${(analysis.conversionProbability * 100).toFixed(1)}%`
        }],
        query_type: 'applicant_analysis',
        confidence: analysis.confidence
      });
    } catch (error) {
      console.error('Applicant analysis failed:', error);
      setRagResponse({
        answer: `I couldn't find "${applicantName}" in the current applications. Please check the spelling or try a different name.`,
        sources: [],
        query_type: 'error',
        confidence: 0.1
      });
    } finally {
      setIsQuerying(false);
    }
  };

  // Format applicant analysis into a readable response
  const formatApplicantAnalysis = (analysis: any, _originalQuery: string): string => {
    let response = `**${analysis.applicantName}'s Application Analysis**\n\n`;
    
    // Current status
    response += `**Current Status:**\n`;
    response += `• Stage: ${analysis.currentStage}\n`;
    response += `• Conversion Probability: ${(analysis.conversionProbability * 100).toFixed(1)}%\n`;
    response += `• Lead Score: ${analysis.leadScore}/100\n`;
    response += `• Engagement Level: ${analysis.engagementLevel}\n\n`;

    // Risk factors
    if (analysis.riskFactors.length > 0) {
      response += `**Risk Factors:**\n`;
      analysis.riskFactors.forEach((risk: string) => {
        response += `• ${risk}\n`;
      });
      response += `\n`;
    }

    // Positive indicators
    if (analysis.positiveIndicators.length > 0) {
      response += `**Positive Indicators:**\n`;
      analysis.positiveIndicators.forEach((positive: string) => {
        response += `• ${positive}\n`;
      });
      response += `\n`;
    }

    // Recommendations
    if (analysis.recommendedActions.length > 0) {
      response += `**Recommended Actions:**\n`;
      analysis.recommendedActions.forEach((action: string) => {
        response += `• ${action}\n`;
      });
      response += `\n`;
    }

    // Next steps
    if (analysis.nextSteps.length > 0) {
      response += `**Next Steps:**\n`;
      analysis.nextSteps.forEach((step: string) => {
        response += `• ${step}\n`;
      });
    }

    return response;
  };

  // Clear RAG response function
  const clearRagResponse = React.useCallback(() => setRagResponse(null), []);

  // Create the overlay component with application-specific dialog
  const IvyOverlay = React.useCallback(
    () => {
      return (
        <ApplicationIvyDialog
          open={open}
          onOpenChange={setOpen}
          context={context}
          queryRag={queryRag}
          isQuerying={isQuerying}
          ragResponse={ragResponse}
          clearRagResponse={clearRagResponse}
          analyzeByApplicationId={async (id, original) => {
            await (async () => {
              setIsQuerying(true);
              try {
                const ctx = { ...context, selectedApplicationId: id } as any;
                const response = await applicationRagClient.querySpecificApplicant('', original || 'selected application', ctx);
                setRagResponse(response);
              } catch (e) {
                setRagResponse({ answer: "I couldn't analyze that application right now.", sources: [], query_type: 'error', confidence: 0.1 });
              } finally {
                setIsQuerying(false);
              }
            })();
          }}
        />
      );
    },
    [open, context, queryRag, isQuerying, ragResponse, clearRagResponse]
  );

  return {
    // Open palette with application context
    openIvy: (newContext?: Partial<ApplicationIvyContext>) => {
      if (newContext) {
        setContext(prev => ({ ...prev, ...newContext }));
      }
      setOpen(true);
    },
    
    // Update context (for when application data changes)
    setIvyContext: setContext,
    
  // RAG functionality
  queryRag,
  isQuerying,
  ragResponse,
  clearRagResponse,
    analyzeByApplicationId: async (applicationId: string, originalQuery?: string) => {
      setIsQuerying(true);
      try {
        const ctx = { ...context, selectedApplicationId: applicationId } as any;
        const response = await applicationRagClient.querySpecificApplicant('', originalQuery || 'selected application', ctx);
        setRagResponse(response);
      } catch (e) {
        setRagResponse({
          answer: "I couldn't analyze that application right now.",
          sources: [],
          query_type: 'error',
          confidence: 0.1
        });
      } finally {
        setIsQuerying(false);
      }
    },
    
    // Overlay component to render
    IvyOverlay,
    
    // Current state
    isOpen: open,
    context
  };
}
