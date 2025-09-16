import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Copy, 
  Plus, 
  Loader2, 
  ExternalLink,
  Brain,
  Sparkles,
  Zap,
  Lightbulb,
  MessageSquare
} from "lucide-react";

// Import RAG API
import { ragApi, type RagResponse } from '@/services/callConsoleApi';

// Types
interface LaneBProps {
  lead: any;
  transcriptWindow: string[];
  consentGranted: boolean;
  callState: "idle" | "dialing" | "active" | "wrapup";
  onAddNote: (content: string) => void;
}

interface HighlightedChunk {
  text: string;
  timestamp: string;
  highlights: Array<{
    text: string;
    type: 'entry_requirements' | 'course_content' | 'career_outcomes' | 'application_process' | 'portfolio_review' | 'interview' | 'fees' | 'deadlines' | 'general';
    startIndex: number;
    endIndex: number;
  }>;
}


interface SlashCommand {
  key: string;
  label: string;
  description: string;
  template: string;
}

// Slash commands configuration
const SLASH_COMMANDS: SlashCommand[] = [
  {
    key: 'lead',
    label: '/lead',
    description: 'Get lead information and recommendations',
    template: 'Tell me about this lead. Include status, recent activity, and recommended next step.'
  },
  {
    key: 'course',
    label: '/course',
    description: 'Get course information',
    template: 'Tell me about the {course} course (overview, outcomes, entry requirements, deadlines).'
  },
  {
    key: 'objection',
    label: '/objection',
    description: 'Generate objection handling',
    template: 'Generate objection handling for the concerns mentioned in the transcript: {transcript}'
  },
  {
    key: 'summary',
    label: '/summary',
    description: 'Summarize the call',
    template: 'Summarize the call so far, bullets + next step.'
  }
];

// Auto-highlight detection patterns
const HIGHLIGHT_PATTERNS = {
  entry_requirements: [
    'entry requirements', 'prerequisites', 'qualifications', 'gcse', 'a level', 'ucas points',
    'tariff', 'grades', 'english language', 'maths', 'portfolio requirements', 'audition',
    'interview requirements', 'experience needed', 'background required'
  ],
  course_content: [
    'course content', 'curriculum', 'modules', 'subjects', 'topics covered', 'what you learn',
    'practical work', 'theory', 'assessment', 'exams', 'coursework', 'projects', 'dissertation',
    'work placement', 'industry experience', 'skills developed'
  ],
  career_outcomes: [
    'career', 'job', 'employment', 'career prospects', 'job opportunities', 'salary',
    'earnings', 'graduate outcomes', 'employment rate', 'industry connections', 'alumni',
    'success stories', 'career support', 'job placement'
  ],
  application_process: [
    'application', 'apply', 'how to apply', 'application form', 'personal statement',
    'references', 'documents needed', 'application deadline', 'submission', 'ucas apply',
    'direct application', 'clearing', 'adjustment'
  ],
  portfolio_review: [
    'portfolio', 'showcase', 'work samples', 'creative work', 'artwork', 'projects',
    'portfolio review', 'submission requirements', 'digital portfolio', 'physical portfolio'
  ],
  interview: [
    'interview', 'meeting', 'discussion', 'chat', 'conversation', 'talk', 'audition',
    'interview process', 'interview questions', 'interview preparation'
  ],
  fees: [
    'fees', 'cost', 'price', 'tuition', 'course fees', 'student finance', 'loan',
    'funding', 'scholarship', 'bursary', 'financial support', 'payment', 'how much'
  ],
  deadlines: [
    'deadline', 'cut-off', 'closing date', 'application deadline', 'submission date',
    'when to apply', 'last date', 'final date', 'deadline for', 'must apply by'
  ]
};

// Compile highlight regexes once (avoid N×RegExp per chunk)
const compileHighlightRegexes = () => {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Object.fromEntries(Object.entries(HIGHLIGHT_PATTERNS).map(([k, arr]) => {
    return [k, new RegExp(`\\b(?:${arr.map(esc).join('|')})\\b`, 'gi')];
  })) as Record<keyof typeof HIGHLIGHT_PATTERNS, RegExp>;
};

const HIGHLIGHT_REGEX = compileHighlightRegexes();

// Auto-highlight detection function
const detectHighlights = (text: string): HighlightedChunk['highlights'] => {
  const highlights: HighlightedChunk['highlights'] = [];
  
  for (const [type, regex] of Object.entries(HIGHLIGHT_REGEX) as Array<[keyof typeof HIGHLIGHT_PATTERNS, RegExp]>) {
    let match;
    const lowerText = text.toLowerCase();
    const r = new RegExp(regex); 
    r.lastIndex = 0;
    
    while ((match = r.exec(lowerText)) !== null) {
      // Find the original case version
      const originalMatch = text.slice(match.index, match.index + match[0].length);
      
      highlights.push({
        text: originalMatch,
        type,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  }
  
  // Sort by start index and remove overlaps
  highlights.sort((a, b) => a.startIndex - b.startIndex);
  
  // Remove overlapping highlights (keep the longer one)
  const filteredHighlights: HighlightedChunk['highlights'] = [];
  for (let i = 0; i < highlights.length; i++) {
    const current = highlights[i];
    const last = filteredHighlights[filteredHighlights.length - 1];
    
    if (!last || (current && current.startIndex >= last.endIndex)) {
      if (current) filteredHighlights.push(current);
    } else if (current && last && current.endIndex - current.startIndex > last.endIndex - last.startIndex) {
      // Current highlight is longer, replace the last one
      filteredHighlights[filteredHighlights.length - 1] = current;
    }
  }
  
  return filteredHighlights;
};

// Highlight color mapping using shadcn color scheme
const HIGHLIGHT_COLORS = {
  entry_requirements: 'bg-slate-100 text-slate-700 border-slate-200',
  course_content: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  career_outcomes: 'bg-stone-100 text-stone-700 border-stone-200',
  application_process: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  portfolio_review: 'bg-slate-50 text-slate-600 border-slate-200',
  interview: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  fees: 'bg-stone-50 text-stone-600 border-stone-200',
  deadlines: 'bg-neutral-50 text-neutral-600 border-neutral-200',
  general: 'bg-muted text-muted-foreground border-border'
};

const LaneB: React.FC<LaneBProps> = ({
  lead,
  transcriptWindow,
  consentGranted,
  callState,
  onAddNote
}) => {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<RagResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedText, setSelectedText] = useState<string>("");
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseCacheRef = useRef<Map<string, RagResponse>>(new Map()); // Simple response cache

  // Render highlighted text
  const renderHighlightedText = (text: string, highlights: HighlightedChunk['highlights']) => {
    if (highlights.length === 0) {
      return <span>{text}</span>;
    }

    const parts = [];
    let lastIndex = 0;

    highlights.forEach((highlight, index) => {
      // Add text before highlight
      if (highlight.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, highlight.startIndex)}
          </span>
        );
      }

      // Add highlighted text
      parts.push(
        <span
          key={`highlight-${index}`}
          className={`px-1 py-0.5 rounded text-xs font-medium border ${HIGHLIGHT_COLORS[highlight.type]}`}
          title={highlight.type.replace('_', ' ')}
        >
          {highlight.text}
        </span>
      );

      lastIndex = highlight.endIndex;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return <span>{parts}</span>;
  };

  // Use real RAG API
  const queryRag = useCallback(async (query: string, context: any): Promise<RagResponse> => {
    return await ragApi.queryRag(query, context);
  }, []);

  // Handle query submission with caching
  const handleQuery = useCallback(async (inputQuery: string) => {
    if (!inputQuery.trim()) return;

    // Check cache first (only for non-transcript queries to avoid stale data)
    const cacheKey = `${lead?.uid || 'unknown'}::${inputQuery.trim().toLowerCase()}`;
    const isTranscriptQuery = inputQuery.toLowerCase().includes('transcript') || 
                             inputQuery.toLowerCase().includes('call so far');
    
    if (!isTranscriptQuery && responseCacheRef.current.has(cacheKey)) {
      const cachedResponse = responseCacheRef.current.get(cacheKey)!;
      setResponse(cachedResponse);
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setResponse(null);

    try {
      // Build context with proper transcript formatting
      const formattedTranscript = transcriptWindow.length > 0 
        ? transcriptWindow.slice(-10).join(' ') // Join transcript chunks into readable format
        : '';
      
      const context = {
        lead: {
          id: lead.id,
          uid: lead.uid,
          name: lead.name,
          email: lead.email || '',
          phone: lead.phone || '',
          courseInterest: lead.courseInterest,
          statusType: lead.statusType
        },
        transcriptWindow: transcriptWindow.slice(-10) || [], // Keep as array for type compatibility
        selection: selectedText,
        consentGranted
      };

      const result = await queryRag(inputQuery, context);
      
      if (!abortControllerRef.current?.signal.aborted) {
        setResponse(result);
        
        // Cache non-transcript responses for faster future queries
        if (!isTranscriptQuery) {
          responseCacheRef.current.set(cacheKey, result);
          // Limit cache size to prevent memory issues
          if (responseCacheRef.current.size > 20) {
            const firstKey = responseCacheRef.current.keys().next().value;
            if (firstKey) {
              responseCacheRef.current.delete(firstKey);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setResponse({
          answer: "Sorry, I couldn't process that query. Please try again.",
          sources: [],
          streaming: false
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [queryRag, lead, transcriptWindow, selectedText, consentGranted]);

  // Debounced query handler
  const debouncedQuery = useCallback((inputQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      handleQuery(inputQuery);
    }, 200); // Reduced from 400ms to 200ms for faster responses
  }, [handleQuery]);

  // Handle input change
  const handleInputChange = (value: string) => {
    setQuery(value);
    
    // Check for slash commands
    if (value.startsWith('/')) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
      debouncedQuery(value);
    }
  };

  // Handle slash command selection
  const handleSlashCommand = (command: SlashCommand) => {
    let template = command.template;
    
    // Replace placeholders
    if (command.key === 'course' && lead.courseInterest) {
      template = template.replace('{course}', lead.courseInterest);
    } else if (command.key === 'objection') {
      // Use actual transcript content if available, otherwise use placeholder
      const transcriptContent = transcriptWindow.length > 0 
        ? transcriptWindow.slice(-5).join(' ') // Last 5 chunks for context
        : 'the concerns mentioned in the transcript';
      template = template.replace('{transcript}', transcriptContent);
    }

    setQuery(template);
    setShowCommands(false);
    handleQuery(template);
  };

  // Handle copy response
  const handleCopyResponse = () => {
    if (response?.answer) {
      navigator.clipboard.writeText(response.answer);
    }
  };

  // Handle add to notes
  const handleAddToNotes = () => {
    if (response?.answer) {
      onAddNote(response.answer);
    }
  };

  // Focus input on Ctrl/Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full overscroll-contain" data-lane-b>
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">Ask Ivy</h3>
          <Badge variant="outline" className="text-xs">
            RAG Powered
          </Badge>
        </div>

        {/* Omnibox Input */}
        <div className="relative">
          <Input
            ref={inputRef}
            id="omnibox-input"
            placeholder="Ask anything... try /lead, /course, /objection"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !showCommands) {
                handleQuery(query);
              }
              if (e.key === 'Escape') {
                setShowCommands(false);
              }
            }}
            className="pr-10"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          
          {/* Slash Commands Dropdown */}
          {showCommands && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg z-50">
              {SLASH_COMMANDS.map((command) => (
                <button
                  key={command.key}
                  onClick={() => handleSlashCommand(command)}
                  className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-3"
                >
                  <Badge variant="outline" className="text-xs">
                    {command.label}
                  </Badge>
                  <div>
                    <div className="text-sm font-medium">{command.description}</div>
                    <div className="text-xs text-muted-foreground">{command.template}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Command Pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          {SLASH_COMMANDS.map((command) => (
            <Button
              key={command.key}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleSlashCommand(command)}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {command.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Response Area - Above transcript */}
      <div className="flex-1 p-4">
        {callState === "active" && isLoading && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
                <span className="text-muted-foreground">Thinking...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {callState === "active" && response && !isLoading && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-accent" />
                  Response
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCopyResponse}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    onClick={handleAddToNotes}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add to Notes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Answer */}
              <div className="prose prose-sm max-w-none mb-4" aria-live="polite">
                <div className="text-foreground">
                  {response.answer.split('\n').map((line, index) => {
                    // Handle bold text (markdown **text**)
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return (
                        <div key={index} className="font-semibold text-foreground my-2">
                          {line.slice(2, -2)}
                        </div>
                      );
                    }
                    // Handle bullet points with bold "Ask:" labels
                    if (line.trim().startsWith('* ')) {
                      const content = line.slice(2);
                      // Check if line contains bold "Ask:" or "Say:" labels
                      if (content.includes('**Ask:**') || content.includes('**Say:**')) {
                        const parts = content.split(/(\*\*Ask:\*\*|\*\*Say:\*\*)/);
                        return (
                          <div key={index} className="flex items-start gap-2 my-1">
                            <span className="text-accent mt-1">•</span>
                            <span className="text-foreground">
                              {parts.map((part, partIndex) => {
                                if (part === '**Ask:**' || part === '**Say:**') {
                                  return <span key={partIndex} className="font-semibold text-slate-800">{part.replace(/\*\*/g, '')}</span>;
                                }
                                return part;
                              })}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div key={index} className="flex items-start gap-2 my-1">
                          <span className="text-accent mt-1">•</span>
                          <span className="text-foreground">{content}</span>
                        </div>
                      );
                    }
                    // Handle numbered lists
                    if (line.trim().match(/^\d+\.\s/)) {
                      return (
                        <div key={index} className="flex items-start gap-2 my-1">
                          <span className="text-accent font-medium mt-1">{line.split('.')[0]}.</span>
                          <span className="text-foreground">{line.split('. ').slice(1).join('. ')}</span>
                        </div>
                      );
                    }
                    // Handle regular paragraphs
                    if (line.trim()) {
                      return (
                        <div key={index} className="my-2 text-foreground">
                          {line}
                        </div>
                      );
                    }
                    // Handle empty lines
                    return <div key={index} className="my-1"></div>;
                  })}
                  {response.streaming && (
                    <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-1"></span>
                  )}
                </div>
              </div>

              {/* Sources */}
              {response.sources.length > 0 && (
                <div className="border-t pt-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Sources</div>
                  <div className="flex flex-wrap gap-2">
                    {response.sources.map((source, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-accent/10"
                        title={source.snippet}
                      >
                        {source.title}
                        {source.url && <ExternalLink className="h-3 w-3 ml-1" />}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {callState === "active" && !response && !isLoading && (
          <div className="text-center text-muted-foreground py-12">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Ask me anything about this lead or course</p>
            <p className="text-xs mt-2">Try: /lead, /course, /objection, /summary</p>
          </div>
        )}
      </div>

      {/* Full Live Transcript Section (windowed) - Below responses */}
      {callState === "active" && transcriptWindow.length > 0 && (
        <div className="border-t border-border/50 p-4" data-transcript-section>
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur supports-backdrop-blur:bg-white/60 py-2 mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Live Transcript</h4>
              <Badge variant="secondary" className="text-xs">
                {transcriptWindow.length} chunks
              </Badge>
            </div>
            <div className="mt-2 p-2 bg-muted/30 border border-border rounded text-xs">
              <div className="text-muted-foreground mb-1 font-medium">Auto-Highlights:</div>
              <div className="flex flex-wrap gap-1">
                <span className={`px-1 py-0.5 rounded text-xs font-medium border ${HIGHLIGHT_COLORS.entry_requirements}`}>Entry Requirements</span>
                <span className={`px-1 py-0.5 rounded text-xs font-medium border ${HIGHLIGHT_COLORS.course_content}`}>Course Content</span>
                <span className={`px-1 py-0.5 rounded text-xs font-medium border ${HIGHLIGHT_COLORS.career_outcomes}`}>Career Outcomes</span>
                <span className={`px-1 py-0.5 rounded text-xs font-medium border ${HIGHLIGHT_COLORS.application_process}`}>Application Process</span>
                <span className={`px-1 py-0.5 rounded text-xs font-medium border ${HIGHLIGHT_COLORS.fees}`}>Fees & Finance</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {(() => {
              const chunks = transcriptWindow.slice(-200);
              const start = Math.max(0, chunks.length - 60);
              const windowed = chunks.slice(start);
              return windowed.map((chunk, idx) => {
                const absoluteIndex = transcriptWindow.length - windowed.length + idx;
                const highlights = detectHighlights(chunk);
                return (
                  <div key={absoluteIndex} className="text-xs p-2 bg-slate-50 border border-slate-200 rounded group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-slate-500">
                        {new Date(Date.now() - (transcriptWindow.length - absoluteIndex) * 5000).toLocaleTimeString()}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => navigator.clipboard.writeText(chunk)}
                        title="Copy transcript chunk"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-foreground">
                      {renderHighlightedText(chunk, highlights)}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default LaneB;
