// src/ivy/useApplicationIvy.tsx
// Specialized Ask Ivy hook for Applications Board

import * as React from "react";
import { ApplicationIvyDialog } from "./ApplicationIvyDialog";
import { applicationRagClient, type ApplicationRagContext } from "./applicationRagClient";
import { queryRouter } from "./queryRouter";
import { applicationAnalyzer } from "./applicationAnalyzer";
import type { IvyContext } from "./types";
import { detectActionableFollowups } from "./actionSuggestionHelper";
import { useSessionStore } from "@/stores/sessionStore";

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

// Chat message interface
interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    sources?: Array<{title: string; url?: string; snippet: string}>;
    query_type?: string;
  };
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

  // Conversation state managed at hook level
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = React.useState(false);

  // Phase 2: Session ID for conversation continuity - use persistent store
  // Force rebuild timestamp: 2025-10-31 07:30
  const { ivySessionId: sessionId, setIvySessionId: setSessionId } = useSessionStore();

  // Debug: Log session ID on every render
  React.useEffect(() => {
    console.log('[Ask Ivy Hook] Current sessionId from store:', sessionId);
  }, [sessionId]);

  // Session store for conversation tracking
  const { addConversationMessage } = useSessionStore();

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
        // Phase 2: Pass session_id for conversation continuity
        const response = await applicationRagClient.queryApplications(query, ragContext, {
          session_id: sessionId || undefined
        });

        // Phase 2: Store session_id from response
        if (response.session_id) {
          console.log('[Ask Ivy] Storing session_id:', response.session_id);
          setSessionId(response.session_id);
        }

        // Auto-detect and suggest actions for urgent follow-ups (even for specific applicants)
        let responseWithSuggestions = response as any;
        if (context.applications) {
          console.log('[Ask Ivy] Detecting actions for specific applicant query');

          // Extract backend candidates FIRST (most reliable source)
          const backendCandidates = (response as any).candidates?.map((c: any) => c.application_id).filter(Boolean);
          if (backendCandidates && backendCandidates.length > 0) {
            console.log('[Ask Ivy] Backend provided candidates:', backendCandidates.length);
          }

          // Pass backend candidates as PRIORITY 1 to detection
          // Note: detectActionableFollowups will check for urgent keywords in the ANSWER
          console.log('[Ask Ivy] Running action detection with:', {
            answer: response.answer.substring(0, 100) + '...',
            backendCandidates: backendCandidates?.length || 0,
            contextApps: context.applications?.length || 0
          });
          
          const suggestedIds = detectActionableFollowups(
            response.answer,
            context.applications as any,
            backendCandidates  // Will be used first if available
          );
          console.log('[Ask Ivy] Detection returned IDs:', suggestedIds);

          if (suggestedIds.length > 0) {
            console.log('[Ask Ivy] ✓ Suggesting actions for', suggestedIds.length, 'applications');
            responseWithSuggestions = {
              ...response,
              suggested_application_ids: suggestedIds
            };
          }
        }

        setRagResponse(responseWithSuggestions);
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
      // Phase 2: Pass session_id for conversation continuity
      const response = await applicationRagClient.queryApplications(query, ragContext, {
        session_id: sessionId || undefined
      });

      // Phase 2: Store session_id from response
      if (response.session_id) {
        console.log('[Ask Ivy] Storing session_id:', response.session_id);
        setSessionId(response.session_id);
      }
      
      // Auto-detect and suggest actions for urgent follow-ups
      let responseWithSuggestions = response as any;
      if (context.applications) {
        console.log('[Ask Ivy] Context applications:', context.applications.slice(0, 3).map((a: any) => ({ name: a.name, id: a.application_id })));

        // Extract backend candidates FIRST (most reliable source)
        const backendCandidates = (response as any).candidates?.map((c: any) => c.application_id).filter(Boolean);
        if (backendCandidates && backendCandidates.length > 0) {
          console.log('[Ask Ivy] Backend provided candidates:', backendCandidates.length);
        }

        // Pass backend candidates as PRIORITY 1 to detection
        // Note: detectActionableFollowups will check for urgent keywords in the ANSWER
        console.log('[Ask Ivy] Running action detection with:', {
          answer: response.answer.substring(0, 100) + '...',
          backendCandidates: backendCandidates?.length || 0,
          contextApps: context.applications?.length || 0
        });
        
        const suggestedIds = detectActionableFollowups(
          response.answer,
          context.applications as any,
          backendCandidates  // Will be used first if available
        );
        console.log('[Ask Ivy] Detection returned IDs:', suggestedIds);

        if (suggestedIds.length > 0) {
          console.log('[Ask Ivy] ✓ Suggesting actions for', suggestedIds.length, 'applications');
          responseWithSuggestions = {
            ...response,
            suggested_application_ids: suggestedIds
          };
        }
      }

      setRagResponse(responseWithSuggestions);
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

  // Deprecated internal path kept for back-compat (removed)

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

  // Handle user query - add message immediately, then call RAG
  const handleQuery = React.useCallback((query: string) => {
    // Add user message immediately
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Track conversation in session store
    if (context.selectedApplicationId) {
      addConversationMessage(context.selectedApplicationId, {
        role: 'user',
        content: query,
        timestamp: new Date().toISOString()
      });
    }

    // Then call queryRag
    queryRag(query);
  }, [queryRag, context.selectedApplicationId, addConversationMessage]);

  // Process AI responses and add to conversation
  React.useEffect(() => {
    if (!ragResponse) return;

    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'ai',
      content: ragResponse.answer,
      timestamp: new Date(),
      metadata: {
        confidence: ragResponse.confidence,
        sources: ragResponse.sources,
        query_type: ragResponse.query_type
      }
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);

    // Track conversation in session store
    if (context.selectedApplicationId) {
      addConversationMessage(context.selectedApplicationId, {
        role: 'ai',
        content: ragResponse.answer,
        timestamp: new Date().toISOString()
      });
    }
  }, [ragResponse, context.selectedApplicationId, addConversationMessage]);

  // Clear conversation when dialog closes
  React.useEffect(() => {
    if (!open) {
      setMessages([]);
      setIsTyping(false);
    }
  }, [open]);

  // Clear RAG response function
  const clearRagResponse = React.useCallback(() => setRagResponse(null), []);

  // Create the overlay component with application-specific dialog
  const IvyOverlay = React.useCallback(
    () => {
      return (
        <ApplicationIvyDialog
          key="application-ivy-dialog"
          open={open}
          onOpenChange={setOpen}
          messages={messages}
          isTyping={isTyping}
          onQuery={handleQuery}
          onClearMessages={() => setMessages([])}
          context={context}
          ragResponse={ragResponse}
          clearRagResponse={clearRagResponse}
          analyzeByApplicationId={async (id, original) => {
            await (async () => {
              setIsQuerying(true);
              try {
                const ctx = { ...context, selectedApplicationId: id } as any;
                const response = await applicationRagClient.queryApplications(original || 'selected application', ctx, {
                  session_id: sessionId || undefined
                });
                // Phase 2: Store session_id from response
                if (response.session_id) {
                  console.log('[Ask Ivy] Storing session_id:', response.session_id);
                  setSessionId(response.session_id);
                }
                setRagResponse(response as any);
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
    [open, messages, isTyping, handleQuery, context, ragResponse, clearRagResponse]
  );

  return {
    // Open palette with application context
    openIvy: (newContext?: Partial<ApplicationIvyContext>) => {
      if (newContext) {
        setContext(prev => ({ ...prev, ...newContext }));
      }
      setOpen(true);
    },
    // Suggest actions to Actions system (two-way link)
    suggestActions: (applicationIds: string[]) => {
      try {
        window.dispatchEvent(new CustomEvent('ivy:suggestAction', { detail: { application_ids: applicationIds } }));
      } catch {}
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
        const response = await applicationRagClient.queryApplications(originalQuery || 'selected application', ctx, {
          session_id: sessionId || undefined
        });
        // Phase 2: Store session_id from response
        if (response.session_id) {
          console.log('[Ask Ivy] Storing session_id:', response.session_id);
          setSessionId(response.session_id);
        }
        setRagResponse(response as any);
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
