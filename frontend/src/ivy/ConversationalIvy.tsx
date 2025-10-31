/**
 * Conversational Ask Ivy - ChatGPT-style interface with embedded actions
 * Natural language conversations with contextual CTAs and modals
 */

import React, { useState, useRef, useEffect } from 'react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Send, 
  Loader2, 
  Sparkles, 
  MessageSquare, 
  Phone, 
  Mail, 
  Calendar,
  User,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { intelligentProcessor, type ProcessedQuery } from './intelligentProcessor';
import { ragApi, type RagContext } from '@/services/callConsoleApi';
import type { IvyContext, IvyCommand } from './types';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: IvyCommand[];
  confidence?: number;
  reasoning?: string;
  isStreaming?: boolean;
}

interface ConversationalIvyProps {
  context: IvyContext;
  className?: string;
  placeholder?: string;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export const ConversationalIvy: React.FC<ConversationalIvyProps> = ({
  context,
  className = "",
  placeholder = "Ask Ivy anything about this person...",
  isExpanded = false,
  onToggleExpanded
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Use timeout to ensure DOM has updated
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      
      // Also try scrolling the ScrollArea container
      const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }, 100);
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message
    addMessage({
      type: 'user',
      content: userMessage
    });

    setIsLoading(true);
    setIsStreaming(true);

    try {
      // Process query with intelligent processor
      const processedQuery: ProcessedQuery = await intelligentProcessor.processQuery(userMessage, context);
      
      if (processedQuery.type === 'command' && processedQuery.command) {
        // Execute command and show confirmation
        processedQuery.command.run(context);
        addMessage({
          type: 'assistant',
          content: `✅ **${processedQuery.command.label}**\n\nI've executed that action for you. ${processedQuery.command.description || ''}`,
          actions: [processedQuery.command],
          confidence: processedQuery.confidence,
          reasoning: processedQuery.reasoning
        });
      } else if (processedQuery.type === 'hybrid' && processedQuery.command && processedQuery.ragQuery) {
        // Execute command and provide AI analysis
        processedQuery.command.run(context);
        
        const response = await ragApi.queryRag(processedQuery.ragQuery, processedQuery.ragContext!);
        addMessage({
          type: 'assistant',
          content: `✅ **${processedQuery.command.label}**\n\n${response.answer}`,
          actions: [processedQuery.command, ...(processedQuery.suggestions || [])],
          confidence: processedQuery.confidence,
          reasoning: processedQuery.reasoning
        });
      } else {
        // Pure RAG conversation
        const ragContext = processedQuery.ragContext || {
          lead: {
            id: context.personData?.id || 0,
            uid: context.personId || '',
            name: context.personName || '',
            email: context.personData?.email || '',
            phone: context.personData?.phone || '',
            statusType: context.personData?.lifecycle_stage || '',
            courseInterest: context.personData?.programme || '',
            nextAction: context.personData?.next_best_action || '',
            followUpDate: context.personData?.last_activity_date || '',
            aiInsights: {
              conversionProbability: context.personData?.conversion_probability || 0,
              callStrategy: context.personData?.next_best_action || 'Follow up',
              recommendedAction: context.personData?.next_best_action || 'Follow up'
            }
          },
          transcriptWindow: messages.slice(-5).map(m => `${m.type}: ${m.content}`),
          consentGranted: true
        };
        
        const response = await ragApi.queryRag(processedQuery.ragQuery || userMessage, ragContext);
        addMessage({
          type: 'assistant',
          content: response.answer,
          actions: processedQuery.suggestions || [],
          confidence: processedQuery.confidence,
          reasoning: processedQuery.reasoning
        });
      }
    } catch (error) {
      console.error('Conversation error:', error);
      addMessage({
        type: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again or rephrase your question."
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleActionClick = (action: IvyCommand) => {
    action.run(context);
    
    // Add system message about the action
    addMessage({
      type: 'system',
      content: `Executed: ${action.label}`
    });
  };

  const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
    return <MarkdownRenderer content={content} />;
  };

  const getActionIcon = (action: IvyCommand) => {
    if (action.id.includes('email')) return <Mail className="h-4 w-4" />;
    if (action.id.includes('call')) return <Phone className="h-4 w-4" />;
    if (action.id.includes('meeting')) return <Calendar className="h-4 w-4" />;
    if (action.id.includes('panel')) return <User className="h-4 w-4" />;
    if (action.id.includes('analysis')) return <BarChart3 className="h-4 w-4" />;
    return <Settings className="h-4 w-4" />;
  };

  return (
    <Card className={`border-success bg-success text-white ${className}`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 border-b border-success/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-white" />
              <h2 className="font-semibold text-white">Ask Ivy</h2>
              <Badge variant="outline" className="text-xs border-white/30 text-white/90">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Assistant
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpanded}
              className="text-white hover:bg-white/10"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        {isExpanded && (
          <div className="flex flex-col h-96">
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-white/70 py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Start a conversation with Ivy about {context.personName || 'this person'}</p>
                    <p className="text-xs mt-1">Try: "What should I do next?" or "Tell me about their engagement"</p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user' 
                        ? 'bg-white/20 text-white' 
                        : message.type === 'system'
                        ? 'bg-white/10 text-white/80 text-xs'
                        : 'bg-white/10 text-white'
                    }`}>
                      <MarkdownContent content={message.content} />
                      
                      {/* Action Buttons */}
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.actions.map((action, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              onClick={() => handleActionClick(action)}
                              className="bg-white/10 hover:bg-white/20 border-white/30 text-white text-xs"
                            >
                              {getActionIcon(action)}
                              <span className="ml-1">{action.label}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                      
                      {message.confidence && (
                        <div className="mt-2 text-xs text-white/60">
                          Confidence: {Math.round(message.confidence * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isStreaming && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-white rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Ivy is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-success/20 p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={placeholder}
                  disabled={isLoading}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40"
                />
                <Button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Collapsed State */}
        {!isExpanded && (
          <div className="p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                disabled={isLoading}
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40"
              />
              <Button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
