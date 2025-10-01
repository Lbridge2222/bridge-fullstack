// src/ivy/InlineIvyInput.tsx
// Inline Ask Ivy input with type-ahead suggestions

import * as React from "react";
import { Brain, Search, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { IvyCommand, IvyContext } from "./types";
import { ragApi, type RagContext } from '@/services/callConsoleApi';
import { intelligentProcessor, type ProcessedQuery } from './intelligentProcessor';
import ReactMarkdown from 'react-markdown';
import { suggestionsApi, type SuggestionsQuery } from '@/services/suggestionsApi';
import SuggestionsModal from '@/components/SuggestionsModal';
import { aiRouterApi, type IvyRouterV2Response, type UIAction } from '@/services/api';
import { dispatchUIAction } from '@/actions/dispatch';

// Super-light fuzzy match (no deps). Returns [score, command]
function score(cmd: IvyCommand, q: string): number {
  const hay = (cmd.label + " " + (cmd.keywords?.join(" ") ?? "")).toLowerCase();
  const idx = hay.indexOf(q);
  if (idx === -1) return -1;
  // prefer early matches + shorter labels
  return 1000 - idx - (cmd.label.length / 10);
}

function filterCommands(commands: IvyCommand[], q: string, ctx: IvyContext) {
  const visible = commands.filter(c => (c.when ? c.when(ctx) : true));
  if (!q.trim()) return visible.slice(0, 8);
  const query = q.toLowerCase().trim();
  
  // Token filtering
  if (query.startsWith('/')) {
    // Actions only
    return visible.filter(c => c.group === 'Actions').slice(0, 6);
  }
  if (query.startsWith('@')) {
    // Entity suggestions
    return visible.filter(c => c.keywords?.some(k => k.includes('email') || k.includes('meeting'))).slice(0, 6);
  }
  if (query.startsWith('#')) {
    // Properties
    return visible.filter(c => c.group === 'Panels').slice(0, 6);
  }
  
  return visible
    .map(c => [score(c, query), c] as const)
    .filter(([s]) => s >= 0)
    .sort((a, b) => b[0] - a[0])
    .map(([, c]) => c)
    .slice(0, 10);
}

type Props = {
  context: IvyContext;
  commands: IvyCommand[];
  onRagFallback?: (query: string, ctx: IvyContext) => void;
  placeholder?: string;
  className?: string;
  enableChatMode?: boolean;
  onFieldDetected?: (field: string, value?: string) => void;
  onQuery?: (query: string) => void;
  onQueryType?: (type: string) => void;
};

export const InlineIvyInput: React.FC<Props> = ({
  context,
  commands,
  onRagFallback,
  placeholder = "Type a question or command…",
  className,
  enableChatMode = false,
  onFieldDetected,
  onQuery,
  onQueryType
}) => {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState<string | null>(null);
  const [ragResponse, setRagResponse] = React.useState<string | null>(null);
  const [isQuerying, setIsQuerying] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState<Array<{id: string, type: 'user' | 'assistant' | 'action', content: string, timestamp: Date, action?: string}>>([]);
  const [detectedField, setDetectedField] = React.useState<string | null>(null);
  const [detectedValue, setDetectedValue] = React.useState<string | null>(null);
  const [chatHeight, setChatHeight] = React.useState(200); // Default height in pixels
  const [isResizing, setIsResizing] = React.useState(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = React.useState(false);
  const [suggestionsData, setSuggestionsData] = React.useState<any>(null);
  const chatScrollRef = React.useRef<HTMLDivElement>(null);
  const list = React.useMemo(() => filterCommands(commands, q, context), [commands, q, context]);

  // Auto-scroll chat to bottom when messages change
  React.useEffect(() => {
    if (chatScrollRef.current) {
      requestAnimationFrame(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      });
    }
  }, [chatMessages]);

  // Debounced RAG query
  const ragQueryTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);
  
  // Resize handler for chat area
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newHeight = Math.max(150, Math.min(500, window.innerHeight - e.clientY - 100));
    setChatHeight(newHeight);
  }, [isResizing]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);
  
  const handleAIAnalysisClick = React.useCallback(() => {
    // Open the AI Summary Panel in expanded mode
    // This would typically trigger the parent to expand the AI panel
    console.log('AI Analysis clicked - should open AI modal');
    // You could emit an event or call a callback here
  }, []);

  const shouldShowSuggestionsModal = React.useCallback((query: string) => {
    const patterns = [
      /^(tell me about|what do we know about|who is)\b/i,
      /(conversion|likelihood|probability|convert|chance).*(forecast|prediction)/i,
      /(attend|book).*(1[- ]?1|one[- ]?to[- ]?one|meeting|call)/i,
      /next best action|what should I do|recommendation/i,
      /(risks?|red flags?|anomaly|unusual)/i,
      /(cohort|segment|similar leads?|peer analysis)/i
    ];
    
    return patterns.some(pattern => pattern.test(query));
  }, []);

  const querySuggestions = React.useCallback(async (queryText: string, skipUserMessage: boolean = false) => {
    if (!context.personData) return;

    // Add user question to chat (unless already added by regular RAG flow)
    if (!skipUserMessage) {
      const userMessage = {
        id: Date.now().toString(),
        type: 'user' as const,
        content: queryText,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, userMessage]);

      // Notify parent component of the query
      onQuery?.(queryText);
    }

    try {
      setIsQuerying(true);
      // Open modal immediately in loading state so it's visible while fetching
      console.log('[Suggestions] opening modal (loading) for query:', queryText);
      setSuggestionsData(null);
      setShowSuggestionsModal(true);

      const suggestionsQuery: SuggestionsQuery = {
        query: queryText,
        lead: {
          id: context.personData.id,
          name: context.personName || context.personData.name,
          email: context.personData.email,
          phone: context.personData.phone,
          status: context.personData.lifecycle_state,
          statusType: context.personData.lifecycle_state,
          nextAction: context.personData.next_best_action,
          followUpDate: context.personData.follow_up_date,
          courseInterest: context.personData.latest_programme_name,
          latest_programme_name: context.personData.latest_programme_name,
          latest_academic_year: context.personData.latest_academic_year,
          source: context.personData.source,
          campusPreference: context.personData.campus_preference,
          last_engagement_date: context.personData.last_engagement_date,
          touchpoint_count: context.personData.touchpoint_count,
          gdpr_opt_in: context.personData.gdpr_opt_in,
          consent_status: context.personData.consent_status
        }
        // TODO: Add triage, forecast, mlForecast, anomalies data when available
      };

      const suggestions = await suggestionsApi.getSuggestions(suggestionsQuery);
      console.log('[Suggestions] received data:', suggestions);
      setSuggestionsData(suggestions);

      // Add a message to chat about the suggestions modal (only if not already added by regular RAG)
      if (!skipUserMessage) {
        const suggestionsMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant' as const,
          content: `I've analysed your query and prepared some AI suggestions. Check the modal for detailed insights about ${context.personName || 'this lead'}.`,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, suggestionsMessage]);
      }

    } catch (error) {
      console.error('Suggestions query failed:', error);
      // Fall back to regular RAG query - we'll handle this inline to avoid circular dependency
      setRagResponse("Sorry, I couldn't process that query right now. Please try again.");
      // Close modal if it was opened
      setShowSuggestionsModal(false);
      
      // Add error message to chat
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: "Sorry, I couldn't process that query right now. Please try again.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsQuerying(false);
    }
  }, [context, onQuery]);

  // New router-based query handler
  const queryRouter = React.useCallback(async (queryText: string) => {
    if (!context.personData) return;
    
    // Notify parent component of the query
    onQuery?.(queryText);
    
    // Add user question to chat
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: queryText,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    setIsQuerying(true);
    try {
      // Build router context with ML triage data
      const routerContext = {
        lead: {
          id: context.personData.id || 0,
          uid: context.personId || '',
          name: context.personName || '',
          email: context.personData.email || '',
          phone: context.personData.phone || '',
          status: context.personData.lifecycle_state,
          statusType: context.personData.lifecycle_state,
          nextAction: context.personData.next_best_action,
          followUpDate: context.personData.follow_up_date,
          courseInterest: context.personData.latest_programme_name,
          latest_programme_name: context.personData.latest_programme_name,
          latest_academic_year: context.personData.latest_academic_year,
          source: context.personData.source,
          campusPreference: context.personData.campus_preference,
          last_engagement_date: context.personData.last_engagement_date,
          touchpoint_count: context.personData.touchpoint_count || 0,
          gdpr_opt_in: context.personData.gdpr_opt_in || false,
          consent_status: context.personData.consent_status,
          // Include ML forecast data from triage
          aiInsights: context.triageData || context.personData.aiInsights
        },
        // Pass full ML forecast data at context level (this has the real conversion_probability!)
        mlForecast: context.mlForecast,
        triage: context.triageData
      };
      
      const response: IvyRouterV2Response = await aiRouterApi.routerV2({
        query: queryText,
        context: routerContext,
        ui_capabilities: ['modals', 'inline_edits', 'toasts']
      });

      console.log('Router v2 response:', response);

      if ((response as any).kind === 'modal') {
        const modal = (response as any).modal || { type: 'suggestions', payload: null };
        setSuggestionsData(modal.payload || null);
        setShowSuggestionsModal(true);
        // Dispatch actions to open modals/consoles
        const acts: UIAction[] = (response as any).actions || [];
        if (acts.length > 0) {
          acts.forEach(action => {
            dispatchUIAction(action, commands, context);
          });
        }
        return;
      }

      // Conversational
      const conv = response as any;
      const answer = (conv.answer_markdown || '').trim();
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: answer,
        timestamp: new Date()
      };
      const next: typeof chatMessages = [assistantMessage];

      // Dispatch actions to open modals/consoles
      const acts: UIAction[] = (conv.actions || []) as UIAction[];
      if (acts.length > 0) {
        acts.forEach(action => {
          dispatchUIAction(action, commands, context);
        });
      }
      
      setChatMessages(prev => [...prev, ...next]);
      setRagResponse(answer);
      
    } catch (error) {
      console.error('Router query failed:', error);
      const errorMessage = "Sorry, I couldn't process that query right now. Please try again.";
      
      // Add error message to chat
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: errorMessage,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, assistantMessage]);
      setRagResponse(errorMessage);
    } finally {
      setIsQuerying(false);
    }
  }, [context, onQuery, onQueryType, onFieldDetected, querySuggestions]);

  const queryRAG = React.useCallback(async (queryText: string) => {
    if (!context.personData) return;
    
    // Notify parent component of the query
    onQuery?.(queryText);
    
    // Add user question to chat
    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: queryText,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    // Check if this should ALSO show suggestions modal (in addition to regular RAG)
    const shouldShowModal = shouldShowSuggestionsModal(queryText);
    
    setIsQuerying(true);
    try {
      // Use intelligent processor for better query handling
      const processedQuery: ProcessedQuery = await intelligentProcessor.processQuery(queryText, context);
      
      if (processedQuery.type === 'command' && processedQuery.command) {
        // Store detected field information for inline editing
        if (processedQuery.detectedField) {
          console.log('🔍 DEBUG: InlineIvyInput - detectedField found:', processedQuery.detectedField);
          console.log('🔍 DEBUG: InlineIvyInput - detectedValue:', processedQuery.detectedValue);
          setDetectedField(processedQuery.detectedField);
          setDetectedValue(processedQuery.detectedValue || null);
          console.log('🔍 DEBUG: InlineIvyInput - calling onFieldDetected callback');
          onFieldDetected?.(processedQuery.detectedField, processedQuery.detectedValue);
        } else {
          console.log('🔍 DEBUG: InlineIvyInput - no detectedField in processedQuery');
        }
        
        // Execute direct command and close dropdown
        processedQuery.command.run(context);
        setRagResponse(null);
        setOpen(false);
        
        // Add action confirmation to chat
        const actionMessage = {
          id: (Date.now() + 1).toString(),
          type: 'action' as const,
          content: `✅ ${processedQuery.command.label} completed`,
          timestamp: new Date(),
          action: processedQuery.command.id
        };
        setChatMessages(prev => [...prev, actionMessage]);
        return;
      }
      
      if (processedQuery.type === 'hybrid' && processedQuery.command && processedQuery.ragQuery) {
        // Execute command first, then show RAG response
        processedQuery.command.run(context);
        
        const response = await ragApi.queryRag(processedQuery.ragQuery || queryText, processedQuery.ragContext!);
        setRagResponse(`✅ **${processedQuery.command.label}**\n\n🧠 **AI Analysis:**\n${response.answer}`);
        
        // Store query type in person data for profile mode detection
        if (context.personData && response.query_type) {
          context.personData.__rag_query_type = response.query_type;
        }
        
        // Notify parent component of query type
        onQueryType?.(response.query_type || 'general_query');
      } else {
        // Standard RAG query with intelligent context
        const ragContext = processedQuery.ragContext || {
          lead: {
            id: context.personData.id || 0,
            uid: context.personId || '',
            name: context.personName || '',
            email: context.personData.email || '',
            phone: context.personData.phone || '',
            courseInterest: context.personData.latest_programme_name,
            statusType: context.personData.lifecycle_state,
            nextAction: context.personData.next_best_action,
            followUpDate: context.personData.last_activity_at,
            aiInsights: {
              conversionProbability: context.personData.conversion_probability || 0,
              callStrategy: context.personData.next_best_action || 'Follow up',
              recommendedAction: context.personData.next_best_action || 'Follow up',
              etaDays: context.personData.eta_days || null
            }
          },
          transcriptWindow: [],
          consentGranted: true
        };
        
        const response = await ragApi.queryRag(processedQuery.ragQuery || queryText, ragContext);
        setRagResponse(response.answer);
        
        // Store query type in person data for profile mode detection
        if (context.personData && response.query_type) {
          context.personData.__rag_query_type = response.query_type;
        }
        
        // Notify parent component of query type
        onQueryType?.(response.query_type || 'general_query');
        
        // Add RAG response to chat with clickable AI Analysis button
        const processedAnswer = response.answer.replace(
          /\[\*\*View AI Analysis\*\*\]/g, 
          '[**View AI Analysis**](ai-analysis)'
        );
        
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant' as const,
          content: processedAnswer,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, assistantMessage]);
        
        // If this query should also show suggestions modal, trigger it now
        if (shouldShowModal) {
          // Small delay to let the chat message render first
          setTimeout(() => {
            querySuggestions(queryText, true); // Skip user message since it's already added
          }, 100);
        }
      }
    } catch (error) {
      console.error('RAG query failed:', error);
      setRagResponse("I'm sorry, I couldn't process that query right now. Please try again.");
      
      // Add error message to chat
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: "I'm sorry, I couldn't process that query right now. Please try again.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsQuerying(false);
    }
  }, [context]);

  const handleSuggestionsAction = React.useCallback((action: string, data?: any) => {
    console.log('Suggestions action:', action, data);
    dispatchUIAction({ label: data?.label || action.replaceAll('_',' '), action } as UIAction, commands, context);
  }, [commands, context]);

  const run = React.useCallback((cmd?: IvyCommand) => {
    if (cmd) {
      // Add user message to chat
      const userMessage = {
        id: Date.now().toString(),
        type: 'user' as const,
        content: `Executed: ${cmd.label}`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, userMessage]);
      
      // Execute command
      cmd.run(context);
      setOpen(false);
      setQ("");
      setRagResponse(null);
      
      // Add action confirmation
      const actionMessage = {
        id: (Date.now() + 1).toString(),
        type: 'action' as const,
        content: `✅ ${cmd.label} completed`,
        timestamp: new Date(),
        action: cmd.id
      };
      setChatMessages(prev => [...prev, actionMessage]);
    } else if (q.trim() && onRagFallback) {
      onRagFallback(q, context);
      setOpen(false);
    }
  }, [q, context, onRagFallback]);

  // Handle Enter for router queries (Ask Ivy)
  const handleRagQuery = React.useCallback(() => {
    if (!q.trim()) return;
    
    // Clear any existing timeout
    if (ragQueryTimeoutRef.current) {
      clearTimeout(ragQueryTimeoutRef.current);
    }
    
    // Use router for all queries now
    ragQueryTimeoutRef.current = setTimeout(() => {
      queryRouter(q);
    }, 200);
  }, [q, queryRouter]);

  // Group commands for sectioned display
  const actionCommands = list.filter(cmd => cmd.group === "Actions");
  const panelCommands = list.filter(cmd => cmd.group === "Panels");
  const analysisCommands = list.filter(cmd => cmd.group === "Analysis");
  const dataCommands = list.filter(cmd => cmd.group === "Data");
  const automationCommands = list.filter(cmd => cmd.group === "Automation");
  const complianceCommands = list.filter(cmd => cmd.group === "Compliance");
  const navigationCommands = list.filter(cmd => cmd.group === "Navigation");

  return (
    <div className={`relative ${className || ""}`}>
      <div className="w-full flex items-center gap-2 rounded-md border border-white/20 bg-white px-3 py-2 hover:border-white/40 focus-within:border-white/60 transition-colors">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          className="h-6 border-none p-0 shadow-none focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={q}
          onChange={(e) => { 
            setQ(e.target.value); 
            setOpen(true);
            setRagResponse(null); // Clear previous RAG response
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay close to allow clicks on suggestions
            setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { 
              setOpen(false); 
              setRagResponse(null);
              return; 
            }
            if (e.key === "Enter" && !e.shiftKey) { 
              e.preventDefault(); 
              handleRagQuery();
            }
            if (e.key === "Enter" && e.shiftKey) { 
              e.preventDefault(); 
              run(list.find(c => c.id === active) || list[0]); 
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              const currentIndex = list.findIndex(c => c.id === active);
              const nextIndex = currentIndex < list.length - 1 ? currentIndex + 1 : 0;
              setActive(list[nextIndex]?.id || null);
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              const currentIndex = list.findIndex(c => c.id === active);
              const prevIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1;
              setActive(list[prevIndex]?.id || null);
            }
          }}
        />
        {isQuerying && (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
        )}
        <Badge variant="outline" className="text-[10px] gap-1 flex-shrink-0 border-success/30 text-success">
          <Brain className="h-3 w-3 text-success" /> Ask Ivy
        </Badge>
      </div>

      {/* Dropdown suggestions - only show when no chat messages */}
      {open && (q.length > 0 || list.length > 0) && chatMessages.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg z-50 max-h-[400px] overflow-auto">
          {/* RAG Response Display */}
          {ragResponse && (
            <div className="p-3 border-b bg-success/10">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-foreground leading-relaxed">
                    {ragResponse}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-6"
                      onClick={() => navigator.clipboard.writeText(ragResponse)}
                    >
                      Copy
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-6"
                      onClick={() => {
                        if (context.appendActivity) {
                          context.appendActivity({
                            id: crypto.randomUUID(),
                            type: 'workflow',
                            title: 'AI Query Response',
                            subtitle: `"${q}" • Added to notes`,
                            when: 'just now',
                            icon: <Brain className="h-3.5 w-3.5" />,
                            tintClass: 'bg-success/10 text-success'
                          });
                        }
                        setOpen(false);
                        setQ("");
                        setRagResponse(null);
                      }}
                    >
                      Add to Notes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {q && list.length === 0 && !ragResponse && (
            <div className="p-4 text-center text-muted-foreground">
              <Brain className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm">No matching actions.</p>
              <p className="text-xs">Press <kbd className="px-1 py-0.5 bg-muted rounded">⇧Enter</kbd> to ask Ivy</p>
            </div>
          )}

          {/* Actions */}
          {actionCommands.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Actions</div>
              {actionCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-md transition-colors text-foreground ${
                    active === cmd.id ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => run(cmd)}
                  onMouseEnter={() => setActive(cmd.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{cmd.label}</div>
                    {cmd.description && (
                      <div className="text-xs text-muted-foreground">{cmd.description}</div>
                    )}
                  </div>
                  {cmd.shortcut && (
                    <kbd className="ml-3 px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-mono">⌘{cmd.shortcut}</kbd>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Panels */}
          {panelCommands.length > 0 && (
            <div>
              <Separator />
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Show Panels</div>
                {panelCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-md transition-colors text-foreground ${
                      active === cmd.id ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => run(cmd)}
                    onMouseEnter={() => setActive(cmd.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-xs text-muted-foreground">{cmd.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Analysis */}
          {analysisCommands.length > 0 && (
            <div>
              <Separator />
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Analysis</div>
                {analysisCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-md transition-colors text-foreground ${
                      active === cmd.id ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => run(cmd)}
                    onMouseEnter={() => setActive(cmd.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-xs text-muted-foreground">{cmd.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Data Management */}
          {dataCommands.length > 0 && (
            <div>
              <Separator />
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Data Management</div>
                {dataCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-md transition-colors text-foreground ${
                      active === cmd.id ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => run(cmd)}
                    onMouseEnter={() => setActive(cmd.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-xs text-muted-foreground">{cmd.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Automation */}
          {automationCommands.length > 0 && (
            <div>
              <Separator />
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Automation</div>
                {automationCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-md transition-colors text-foreground ${
                      active === cmd.id ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => run(cmd)}
                    onMouseEnter={() => setActive(cmd.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-xs text-muted-foreground">{cmd.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          {navigationCommands.length > 0 && (
            <div>
              <Separator />
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Navigation</div>
                {navigationCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-md transition-colors text-foreground ${
                      active === cmd.id ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => run(cmd)}
                    onMouseEnter={() => setActive(cmd.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-xs text-muted-foreground">{cmd.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Help text */}
          {q.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground border-t border-border">
              <div className="space-y-1">
                <p><kbd className="px-1 py-0.5 bg-muted rounded">/</kbd> Actions • <kbd className="px-1 py-0.5 bg-muted rounded">@</kbd> Entities • <kbd className="px-1 py-0.5 bg-muted rounded">#</kbd> Properties</p>
                <p><kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> Run action • <kbd className="px-1 py-0.5 bg-muted rounded">⇧Enter</kbd> Ask Ivy • <kbd className="px-1 py-0.5 bg-muted rounded">⌘K</kbd> Full palette</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Log - Always visible when there are messages */}
      {chatMessages.length > 0 && (
        <div className={`mt-2 bg-white border border-border rounded-md shadow-sm relative ${isResizing ? 'ring-2 ring-success/20' : ''}`}>
          <div className="p-3 pb-1">
            <div className="text-xs font-medium text-muted-foreground mb-2">Conversation Log</div>
          </div>
          <div 
            ref={chatScrollRef}
            className="overflow-y-auto px-3 pb-3" 
            style={{ height: `${chatHeight}px` }}
          >
            <div className="space-y-2">
            {chatMessages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-2 text-xs ${
                  message.type === 'user' 
                    ? 'bg-success text-white' 
                    : message.type === 'action'
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-muted text-foreground'
                }`}>
                  <div className="font-medium">
                    {message.type === 'user' ? 'You' : message.type === 'action' ? 'Action' : 'Ivy'}
                  </div>
                  <div className="mt-1 prose prose-sm max-w-none">
                    <ReactMarkdown 
                      components={{
                    // Better paragraph and list spacing
                    p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-3 space-y-1.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-3 space-y-1.5">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
                    h1: ({ children }) => <h1 className="text-lg font-bold mb-3 mt-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-medium mb-2 mt-2">{children}</h3>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-muted pl-3 my-2 italic">{children}</blockquote>,
                    a: ({ href, children, ...props }) => {
                      if (href === 'ai-analysis') {
                            return (
                              <button
                                onClick={() => handleAIAnalysisClick()}
                                className="text-primary hover:text-primary/80 underline font-medium cursor-pointer"
                                type="button"
                              >
                                {children}
                              </button>
                            );
                      }
                      if (href && href.startsWith('action:')) {
                        const action = href.replace('action:', '') as UIAction['action'];
                        return (
                          <button
                            onClick={() => dispatchUIAction({ label: String(children), action } as UIAction, commands, context)}
                            className="text-primary hover:text-primary/80 underline font-medium cursor-pointer"
                            type="button"
                          >
                            {children}
                          </button>
                        );
                      }
                          return <a href={href} {...props}>{children}</a>;
                        }
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
          {/* Resize handle */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-muted/50 transition-colors flex items-center justify-center"
            onMouseDown={handleMouseDown}
          >
            <div className="w-8 h-0.5 bg-muted-foreground/30 rounded"></div>
          </div>
        </div>
      )}

      {/* Suggestions Modal */}
      <SuggestionsModal
        isOpen={showSuggestionsModal}
        onClose={() => setShowSuggestionsModal(false)}
        data={suggestionsData}
        onAction={handleSuggestionsAction}
      />

      {/* Fallback mini-modal if portal fails to paint */}
      {showSuggestionsModal && (
        <div role="dialog" aria-label="AI Suggestions (fallback)" className="fixed z-[2147483647] right-4 top-4 w-[360px] max-h-[70vh] overflow-auto bg-background border border-border rounded-lg shadow-2xl p-3">
          <div className="text-sm font-semibold text-foreground mb-2">AI Suggestions</div>
          {suggestionsData ? (
            <div className="space-y-2 text-sm">
              {suggestionsData.summary_bullets?.length ? (
                <ul className="list-disc list-inside text-muted-foreground">
                  {suggestionsData.summary_bullets.map((b: string, i: number) => (
                    <li key={i}>{b.replace(/^•\s*/, '')}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted-foreground">No summary available.</div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">Loading suggestions…</div>
          )}
        </div>
      )}
    </div>
  );
};
