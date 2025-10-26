// src/ivy/IvyPalette.tsx
// Clean, modern command palette for Bridge CRM

import * as React from "react";
import { Brain, Copy, Plus, Search, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import type { IvyContext, IvyCommand, IvyResponse } from "./types";
import { ragApi, type RagContext } from '@/services/callConsoleApi';

interface IvyPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: IvyContext;
  commands: IvyCommand[];
  // Optional RAG props for application-specific queries
  queryRag?: (query: string) => Promise<void>;
  isQuerying?: boolean;
  ragResponse?: {
    answer: string;
    sources: Array<{title: string; url?: string; snippet: string}>;
    query_type: string;
    confidence: number;
  } | null;
}

// Fuzzy search scoring function
function fuzzyScore(command: IvyCommand, query: string): number {
  if (!query.trim()) return 100;
  
  const searchText = `${command.label} ${command.keywords?.join(' ') || ''}`.toLowerCase();
  const q = query.toLowerCase();
  
  // Exact match gets highest score
  if (searchText.includes(q)) {
    const index = searchText.indexOf(q);
    return 1000 - index; // Earlier matches score higher
  }
  
  // Fuzzy matching: check if all characters appear in order
  let searchIndex = 0;
  for (const char of q) {
    const found = searchText.indexOf(char, searchIndex);
    if (found === -1) return -1;
    searchIndex = found + 1;
  }
  
  return 50 - q.length; // Shorter queries get slightly higher scores
}

// Filter and sort commands by relevance
function filterCommands(commands: IvyCommand[], query: string, context: IvyContext): IvyCommand[] {
  const visibleCommands = commands.filter(cmd => (cmd.when ? cmd.when(context) : true));
  
  if (!query.trim()) {
    return visibleCommands.slice(0, 8); // Show top 8 when no query
  }
  
  return visibleCommands
    .map(cmd => ({ cmd, score: fuzzyScore(cmd, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ cmd }) => cmd)
    .slice(0, 12); // Show top 12 matches
}

// Reusable Components
const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div 
    className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide bg-gray-50/50 border-b border-gray-200"
    style={{ color: '#4b5563' }}
  >
    {children}
  </div>
);

const CommandItem: React.FC<{
  command: IvyCommand;
  isActive: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}> = ({ command, isActive, onClick, onMouseEnter }) => (
  <button
    className={`w-full flex items-center justify-between px-3 py-2.5 text-left rounded-md transition-colors border-0 ${
      isActive ? 'bg-blue-50 font-medium' : 'hover:bg-gray-50'
    }`}
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    style={{ color: isActive ? '#1e3a8a' : '#111827' }}
  >
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium truncate" style={{ color: 'inherit' }}>
        {command.label}
      </div>
      {command.keywords && (
        <div className="text-xs truncate mt-0.5" style={{ color: '#6b7280' }}>
          {command.keywords.slice(0, 3).join(', ')}
        </div>
      )}
    </div>
    {command.shortcut && (
      <kbd 
        className="ml-3 px-1.5 py-0.5 rounded text-[10px] font-mono"
        style={{ backgroundColor: '#e5e7eb', color: '#374151' }}
      >
        ⌘{command.shortcut}
      </kbd>
    )}
  </button>
);

const RagResponseCard: React.FC<{
  response: IvyResponse;
  query: string;
  onCopy: () => void;
  onAddToNotes: () => void;
}> = ({ response, query, onCopy, onAddToNotes }) => (
  <Card className="border-muted">
    <CardContent className="p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-1.5 rounded-md bg-muted/50">
          <Brain className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed text-foreground">
            {response.answer}
          </p>
        </div>
      </div>
      
      {response.sources && response.sources.length > 0 && (
        <div className="border-t border-muted pt-3 mt-3">
          <p className="text-xs text-muted-foreground mb-2">Sources</p>
          <div className="space-y-1">
            {response.sources.slice(0, 3).map((source, index) => (
              <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                {source.title}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex gap-2 mt-4">
        <Button size="sm" variant="outline" onClick={onCopy} className="h-7 text-xs">
          <Copy className="h-3 w-3 mr-1.5" />
          Copy
        </Button>
        <Button size="sm" variant="outline" onClick={onAddToNotes} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1.5" />
          Add to Notes
        </Button>
      </div>
    </CardContent>
  </Card>
);

export function IvyPalette({ 
  open, 
  onOpenChange, 
  context, 
  commands,
  queryRag: externalQueryRag,
  isQuerying: externalIsQuerying,
  ragResponse: externalRagResponse
}: IvyPaletteProps) {
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [ragResponse, setRagResponse] = React.useState<IvyResponse | null>(null);
  const [isQuerying, setIsQuerying] = React.useState(false);
  
  // Use external RAG state if provided, otherwise use internal state
  const currentRagResponse = externalRagResponse || ragResponse;
  const currentIsQuerying = externalIsQuerying || isQuerying;
  
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  const filteredCommands = React.useMemo(
    () => filterCommands(commands, query, context),
    [commands, query, context]
  );
  
  // Group commands for display
  const groupedCommands = React.useMemo(() => {
    const groups = {
      Actions: filteredCommands.filter(cmd => cmd.group === 'Actions'),
      Panels: filteredCommands.filter(cmd => cmd.group === 'Panels'),
      Navigation: filteredCommands.filter(cmd => cmd.group === 'Navigation')
    };
    return Object.entries(groups).filter(([, cmds]) => cmds.length > 0);
  }, [filteredCommands]);
  
  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setRagResponse(null);
      // Focus input after dialog transition
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);
  
  // Update active index when filtered commands change
  React.useEffect(() => {
    setActiveIndex(0);
  }, [filteredCommands]);
  
  // RAG query function - use external if provided, otherwise use internal
  const queryRAG = React.useCallback(async (queryText: string) => {
    if (externalQueryRag) {
      // Use external RAG function (for application-specific queries)
      await externalQueryRag(queryText);
    } else {
      // Use internal RAG function (for contact-specific queries)
      if (!context.personData) return;
      
      setIsQuerying(true);
      try {
        const ragContext: RagContext = {
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
              recommendedAction: context.personData.next_best_action || 'Follow up'
            }
          },
          transcriptWindow: [],
          consentGranted: true
        };

        const response = await ragApi.queryRag(queryText, ragContext);
        setRagResponse({
          answer: response.answer,
          sources: response.sources,
          actions: []
        });
      } catch (error) {
        console.error('RAG query failed:', error);
        setRagResponse({
          answer: "I'm sorry, I couldn't process that query right now. Please try again.",
          sources: []
        });
      } finally {
        setIsQuerying(false);
      }
    }
  }, [context, externalQueryRag]);
  
  // Execute command
  const executeCommand = React.useCallback((cmd: IvyCommand) => {
    cmd.run(context);
    onOpenChange(false);
  }, [context, onOpenChange]);
  
  // Handle keyboard navigation
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onOpenChange(false);
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    }
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      const activeCommand = filteredCommands[activeIndex];
      if (activeCommand) {
        executeCommand(activeCommand);
      } else if (query.trim()) {
        queryRAG(query);
      }
    }
  }, [filteredCommands, activeIndex, executeCommand, query, queryRAG, onOpenChange]);
  
  // Handle copy and add to notes
  const handleCopy = React.useCallback(() => {
    if (currentRagResponse) {
      navigator.clipboard.writeText(currentRagResponse.answer);
    }
  }, [currentRagResponse]);
  
  const handleAddToNotes = React.useCallback(() => {
    if (currentRagResponse && context.appendActivity) {
      context.appendActivity({
        id: crypto.randomUUID(),
        type: 'workflow',
        title: 'AI Query Response',
        subtitle: `"${query}" • Added to notes`,
        when: 'just now',
        icon: <Brain className="h-3.5 w-3.5" />,
        tintClass: 'bg-muted/50 text-muted-foreground'
      });
    }
    onOpenChange(false);
  }, [currentRagResponse, context, query, onOpenChange]);
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
      <div className="fixed left-1/2 top-1/4 -translate-x-1/2 w-full max-w-lg">
        <Card className="shadow-2xl border-border" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b border-gray-200">
              <Brain className="h-4 w-4" style={{ color: '#111827' }} />
              <h2 className="text-sm font-semibold" style={{ color: '#111827' }}>Ask Ivy</h2>
              <Badge variant="outline" className="text-[10px] px-1.5 ml-auto">
                <Brain className="h-2.5 w-2.5 mr-1" />
                AI Assistant
              </Badge>
            </div>
            
            {/* Input */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200">
              <Search className="h-4 w-4" style={{ color: '#6b7280' }} />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask Ivy${context.personName ? ` about ${context.personName}` : ''}...`}
                className="border-none shadow-none focus-visible:ring-0 text-sm"
                style={{ color: '#111827' }}
                disabled={currentIsQuerying}
              />
              {currentIsQuerying && <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#6b7280' }} />}
              <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
                <Brain className="h-2.5 w-2.5 mr-1" />
                Ask Ivy
              </Badge>
            </div>
            
            {/* RAG Response */}
            {currentRagResponse && (
              <div className="p-4 border-b border-muted">
                <RagResponseCard
                  response={currentRagResponse}
                  query={query}
                  onCopy={handleCopy}
                  onAddToNotes={handleAddToNotes}
                />
              </div>
            )}
            
            {/* Commands */}
            <ScrollArea className="max-h-[400px]">
              {groupedCommands.length > 0 ? (
                <div className="p-2">
                  {groupedCommands.map(([groupName, groupCommands], groupIndex) => (
                    <div key={groupName}>
                      {groupIndex > 0 && <div className="h-px bg-muted my-2" />}
                      <SectionHeader>{groupName}</SectionHeader>
                      <div className="space-y-1 mb-3">
                        {groupCommands.map((cmd, cmdIndex) => {
                          const globalIndex = groupedCommands
                            .slice(0, groupIndex)
                            .reduce((acc, [, cmds]) => acc + cmds.length, 0) + cmdIndex;
                          
                          return (
                            <CommandItem
                              key={cmd.id}
                              command={cmd}
                              isActive={globalIndex === activeIndex}
                              onClick={() => executeCommand(cmd)}
                              onMouseEnter={() => setActiveIndex(globalIndex)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : query.trim() ? (
                <div className="p-8 text-center">
                  <Brain className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-2">No commands found</p>
                  <p className="text-xs text-muted-foreground">
                    Press <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> to ask Ivy directly
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Brain className="h-5 w-5 text-muted-foreground/70" />
                    <span className="text-sm font-medium text-muted-foreground">Ask Ivy</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Type to search commands or ask questions
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}