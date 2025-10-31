// Triage Modal - Intelligent Next Best Actions
// Floating modal like Ask Ivy dialog - no overlay, draggable and resizable

import * as React from 'react';
import { X, Mail, Phone, Flag, AlertCircle, TrendingUp, Clock, Sparkles, Copy, Check, Target, MessageSquare, CheckCircle, Loader2, GripVertical, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { TriageItem } from '@/types/actions';
import { generateTriage, executeAction, completeAction } from '@/services/actionsApi';
import { useSessionStore } from '@/stores/sessionStore';

interface TriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActionExecuted?: (applicationId: string) => void;
  suggestedApplicationIds?: string[];
}

const ACTION_ICONS = {
  email: Mail,
  call: Phone,
  flag: Flag,
  unblock: AlertCircle,
};

const ACTION_LABELS = {
  email: 'Send Email',
  call: 'Make Call',
  flag: 'Flag for Review',
  unblock: 'Unblock Application',
};

const ACTION_COLORS = {
  email: 'bg-muted border-border text-foreground hover:bg-muted/80',
  call: 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary',
  flag: 'bg-warning/10 border-warning/20 text-warning-foreground hover:bg-warning/20',
  unblock: 'bg-success/10 border-success/20 text-success-foreground hover:bg-success/20',
};

export function TriageModal({ isOpen, onClose, onActionExecuted, suggestedApplicationIds }: TriageModalProps) {
  const [queue, setQueue] = React.useState<TriageItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [executing, setExecuting] = React.useState<string | null>(null);
  const [expandedCard, setExpandedCard] = React.useState<string | null>(null);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [completingAction, setCompletingAction] = React.useState<TriageItem | null>(null);
  const [outcomeNotes, setOutcomeNotes] = React.useState('');
  const [completionSuccess, setCompletionSuccess] = React.useState(true);
  const [completionFeedback, setCompletionFeedback] = React.useState<{message: string; actions: string[]} | null>(null);

  // Floating modal state (like Ask Ivy)
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 100, y: 150 });
  const [size, setSize] = React.useState({ width: 800, height: 700 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = React.useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeDirection, setResizeDirection] = React.useState<string>('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Live refs for smooth 60fps dragging/resizing without re-renders
  const positionRef = React.useRef(position);
  const sizeRef = React.useRef(size);
  const rafIdRef = React.useRef<number | null>(null);
  const dragLatestRef = React.useRef<{ x: number; y: number } | null>(null);
  const resizeLatestRef = React.useRef<{ width: number; height: number } | null>(null);

  // Keep position and size refs in sync with state
  React.useEffect(() => {
    positionRef.current = position;
  }, [position]);

  React.useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  // Initialize size on mount
  React.useEffect(() => {
    const vw = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
    const vh = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
    setSize({
      width: Math.min(800, vw * 0.9),
      height: Math.min(700, vh * 0.85)
    });
  }, []);

  const { preferences, setLastTriageIds, consumeSuggestion } = useSessionStore();

  // Copy to clipboard helper
  const handleCopy = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Load triage queue when modal opens
  React.useEffect(() => {
    if (isOpen) {
      loadTriageQueue();
    }
  }, [isOpen, suggestedApplicationIds?.join('|')]);

  const loadTriageQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[TriageModal] Loading queue with suggestedApplicationIds:', suggestedApplicationIds);

      const response = await generateTriage({
        limit: suggestedApplicationIds && suggestedApplicationIds.length > 0
          ? suggestedApplicationIds.length
          : preferences?.defaultLimit || 5,
        filters: suggestedApplicationIds && suggestedApplicationIds.length > 0
          ? { application_ids: suggestedApplicationIds }
          : undefined,
      });

      console.log('[TriageModal] Backend returned queue:', response.queue);
      console.log('[TriageModal] Backend queue application_ids:', response.queue?.map(item => item.application_id));
      console.log('[TriageModal] Action types received:', response.queue?.map(item => item.action_type));

      let nextQueue = response.queue || [];
      if (suggestedApplicationIds && suggestedApplicationIds.length > 0) {
        const suggestionSet = new Set(suggestedApplicationIds);
        console.log('[TriageModal] Filtering queue to only include:', Array.from(suggestionSet));
        console.log('[TriageModal] Comparing against backend IDs:', nextQueue.map(item => item.application_id));
        const filtered = nextQueue.filter((item) => {
          const matches = suggestionSet.has(item.application_id);
          console.log(`[TriageModal] Does "${item.application_id}" match any suggestion?`, matches);
          return matches;
        });
        console.log('[TriageModal] Filtered queue:', filtered);
        if (filtered.length > 0) {
          nextQueue = filtered;
        } else {
          console.warn('[TriageModal] ⚠️ No matches found! Backend IDs don\'t match suggested IDs. Showing all backend results as fallback.');
        }
      }

      console.log('[TriageModal] Final queue to display:', nextQueue);
      console.log('[TriageModal] Action types in final queue:', nextQueue.map(item => ({ 
        application_id: item.application_id, 
        action_type: item.action_type,
        applicant_name: item.applicant_name 
      })));
      setQueue(nextQueue);
      setLastTriageIds(nextQueue.map((item) => item.application_id));
    } catch (err) {
      console.error('[TriageModal] Error loading queue:', err);
      setError(err instanceof Error ? err.message : 'Failed to load actions');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (item: TriageItem) => {
    // Handle different action types appropriately
    if (item.action_type === 'call') {
      try {
        window.dispatchEvent(
          new CustomEvent('actions:openCallConsole', {
            detail: {
              application_id: item.application_id,
              triage_item: item,
            },
          })
        );

        consumeSuggestion(item.application_id);
        setQueue((prev) => prev.filter((q) => q.application_id !== item.application_id));
        onActionExecuted?.(item.application_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to open call console');
      }
      return;
    }

    if (item.action_type === 'email') {
      try {
        window.dispatchEvent(
          new CustomEvent('actions:openEmailComposer', {
            detail: {
              application_id: item.application_id,
              triage_item: item,
              artifacts: item.artifacts,
            },
          })
        );

        consumeSuggestion(item.application_id);
        setQueue((prev) => prev.filter((q) => q.application_id !== item.application_id));
        onActionExecuted?.(item.application_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to open email composer');
      }
      return;
    }

    // For flag and unblock actions, execute directly
    setExecuting(item.application_id);
    try {
      const res = await executeAction({
        application_id: item.application_id,
        action_type: item.action_type,
        artifacts: item.artifacts,
      });

      setQueue((prev) => prev.filter((q) => q.application_id !== item.application_id));
      onActionExecuted?.(item.application_id);

      try {
        window.dispatchEvent(
          new CustomEvent('action:completed', {
            detail: {
              application_id: item.application_id,
              action_type: item.action_type,
              execution_id: (res as any)?.execution_id,
            },
          })
        );
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute action');
    } finally {
      setExecuting(null);
    }
  };

  const handleCompleteAction = async () => {
    if (!completingAction || !completingAction.id) return;

    try {
      const response = await completeAction({
        action_id: completingAction.id,
        outcome_notes: outcomeNotes,
        success: completionSuccess,
      });

      if (response.follow_up_message) {
        setCompletionFeedback({
          message: response.follow_up_message,
          actions: response.suggested_next_actions || [],
        });
      }

      setQueue((prev) => prev.filter((q) => q.id !== completingAction.id));
      onActionExecuted?.(completingAction.application_id);

      setOutcomeNotes('');
      setCompletionSuccess(true);

      setTimeout(() => {
        setCompletingAction(null);
        if (completionFeedback) {
          setTimeout(() => setCompletionFeedback(null), 5000);
        }
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete action');
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 0.8) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (priority >= 0.6) return 'bg-warning/10 text-warning-foreground border-warning/20';
    if (priority >= 0.4) return 'bg-info/10 text-info-foreground border-info/20';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 0.8) return 'Critical';
    if (priority >= 0.6) return 'High';
    if (priority >= 0.4) return 'Medium';
    return 'Low';
  };

  // Smooth dragging with RAF (like Ask Ivy)
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-drag-handle]')) {
      if (!containerRef.current) return;
      
      containerRef.current.style.transition = 'none';
      document.body.style.userSelect = 'none';
      
      setIsDragging(true);
      setDragStart({
        x: e.clientX - positionRef.current.x,
        y: e.clientY - positionRef.current.y
      });
    }
  }, []);

  // RAF-based smooth updates
  const applyFrame = React.useCallback(() => {
    if (!containerRef.current) return;
    
    if (dragLatestRef.current) {
      const { x, y } = dragLatestRef.current;
      containerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      rafIdRef.current = requestAnimationFrame(applyFrame);
    } else {
      rafIdRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && containerRef.current) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        const maxX = window.innerWidth - sizeRef.current.width;
        const maxY = window.innerHeight - 200;
        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));
        
        dragLatestRef.current = { x: boundedX, y: boundedY };
        positionRef.current = { x: boundedX, y: boundedY };
        
        if (rafIdRef.current == null) {
          rafIdRef.current = requestAnimationFrame(applyFrame);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      if (containerRef.current) {
        containerRef.current.style.transition = '';
      }
      document.body.style.userSelect = '';
      
      if (dragLatestRef.current) {
        setPosition(dragLatestRef.current);
        dragLatestRef.current = null;
      }
      
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, applyFrame]);

  // Handle resize mouse down
  const handleResizeMouseDown = React.useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!containerRef.current) return;

    containerRef.current.style.transition = 'none';
    document.body.style.userSelect = 'none';

    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: sizeRef.current.width,
      height: sizeRef.current.height
    });
  }, []);

  // Resize effect
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && containerRef.current) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;

        if (resizeDirection.includes('e')) {
          newWidth = resizeStart.width + deltaX;
        }
        if (resizeDirection.includes('w')) {
          newWidth = resizeStart.width - deltaX;
        }
        if (resizeDirection.includes('s')) {
          newHeight = resizeStart.height + deltaY;
        }
        if (resizeDirection.includes('n')) {
          newHeight = resizeStart.height - deltaY;
        }

        newWidth = Math.max(500, Math.min(newWidth, window.innerWidth - position.x - 20));
        newHeight = Math.max(400, Math.min(newHeight, window.innerHeight - position.y - 20));

        resizeLatestRef.current = { width: newWidth, height: newHeight };
        sizeRef.current = { width: newWidth, height: newHeight };

        containerRef.current.style.width = `${newWidth}px`;
        containerRef.current.style.height = `${newHeight}px`;
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection('');

      if (containerRef.current) {
        containerRef.current.style.transition = '';
      }
      document.body.style.userSelect = '';

      if (resizeLatestRef.current) {
        setSize(resizeLatestRef.current);
        resizeLatestRef.current = null;
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, resizeDirection, position]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div
          ref={containerRef}
          className="fixed z-50 pointer-events-auto"
          style={{
            left: '0',
            top: '0',
            width: `${size.width}px`,
            height: isMinimized ? 'auto' : `${size.height}px`,
            maxWidth: '90vw',
            maxHeight: '90vh',
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            transition: (isDragging || isResizing) ? 'none' : 'all 0.2s ease-out'
          }}
        >
          <Card className="shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl h-full flex flex-col relative overflow-hidden">
            <CardContent className="p-0 flex flex-col h-full overflow-hidden">
              {/* Header with drag handle */}
              <div
                className="flex-shrink-0 flex items-center justify-between p-3 border-b border-border/50 cursor-move select-none bg-background"
                onMouseDown={handleMouseDown}
                data-drag-handle
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-success/10">
                      <Sparkles className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Next Best Actions</h3>
                      <p className="text-xs text-muted-foreground">AI-prioritised recommendations</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="h-7 w-7 p-0"
                  >
                    {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  <ScrollArea className="flex-1 px-4 py-4">
                    {loading && (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">Analysing applications...</p>
                      </div>
                    )}

                    {error && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                        <p className="text-sm text-destructive">{error}</p>
                      </div>
                    )}

                    {!loading && queue.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Sparkles className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No actions needed</p>
                        <p className="text-sm text-muted-foreground mt-1">All applications are on track</p>
                      </div>
                    )}

                    {!loading && queue.length > 0 && (
                      <div className="space-y-4">
                        {queue.map((item, index) => {
                          const ActionIcon = ACTION_ICONS[item.action_type];
                          const isExpanded = expandedCard === item.application_id;
                          const priorityColor = getPriorityColor(item.priority);

                          return (
                            <Card
                              key={item.application_id}
                              className={cn(
                                'border transition-all duration-200',
                                isExpanded ? 'shadow-md' : 'shadow-sm hover:shadow-md'
                              )}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  {/* Priority Badge */}
                                  <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center font-bold text-success">
                                      #{index + 1}
                                    </div>
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex-1">
                                        <h3 className="font-semibold text-foreground mb-1">
                                          {item.applicant_name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">{item.programme_name}</p>
                                      </div>
                                      <Badge className={cn('text-xs', priorityColor)}>
                                        {getPriorityLabel(item.priority)}
                                      </Badge>
                                    </div>

                                    {/* Stage & Conversion */}
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {item.stage}
                                      </span>
                                      {item.conversion_probability !== undefined && (
                                        <span className="flex items-center gap-1">
                                          <TrendingUp className="h-3 w-3" />
                                          {Math.round(item.conversion_probability * 100)}% conversion
                                        </span>
                                      )}
                                    </div>

                                    <p className="text-sm text-foreground mb-4">{item.reason}</p>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Button
                                        onClick={() => handleExecuteAction(item)}
                                        disabled={executing === item.application_id}
                                        variant={item.action_type === 'call' ? 'default' : 'outline'}
                                        size="sm"
                                        className={cn(
                                          ACTION_COLORS[item.action_type],
                                          executing === item.application_id && 'opacity-50 cursor-not-allowed'
                                        )}
                                      >
                                        {executing === item.application_id ? (
                                          <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Executing...
                                          </>
                                        ) : (
                                          <>
                                            <ActionIcon className="h-4 w-4 mr-2" />
                                            {ACTION_LABELS[item.action_type]}
                                          </>
                                        )}
                                      </Button>

                                      {item.created_by_ivy && item.id && (
                                        <Button
                                          onClick={() => {
                                            setCompletingAction(item);
                                            setOutcomeNotes('');
                                            setCompletionSuccess(true);
                                          }}
                                          variant="outline"
                                          size="sm"
                                          className="text-success-foreground hover:text-success-foreground hover:bg-success/10 border-success/20"
                                        >
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Mark Complete
                                        </Button>
                                      )}

                                      {item.artifacts && (
                                        <Button
                                          onClick={() =>
                                            setExpandedCard(isExpanded ? null : item.application_id)
                                          }
                                          variant="ghost"
                                          size="sm"
                                        >
                                          {isExpanded ? 'Hide details' : 'Show details'}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded Artifacts */}
                                {isExpanded && item.artifacts && (
                                  <>
                                    <Separator className="my-4" />
                                    <div className="space-y-4">
                                      {item.artifacts.script && (
                                        <div>
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <MessageSquare className="h-4 w-4 text-foreground" />
                                              <p className="text-xs font-semibold text-foreground">
                                                {item.action_type === 'call' ? 'Call Script' : item.action_type === 'email' ? 'Email Draft' : 'Script'}
                                              </p>
                                            </div>
                                            <Button
                                              onClick={() => handleCopy(item.artifacts!.script!, `${item.application_id}-script`)}
                                              variant="ghost"
                                              size="sm"
                                              className="h-7"
                                            >
                                              {copiedField === `${item.application_id}-script` ? (
                                                <>
                                                  <Check className="h-3 w-3 mr-1 text-success" />
                                                  <span className="text-success">Copied!</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Copy className="h-3 w-3 mr-1" />
                                                  <span>Copy</span>
                                                </>
                                              )}
                                            </Button>
                                          </div>
                                          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted rounded-md p-3 border border-border font-mono">
                                            {item.artifacts.script}
                                          </div>
                                        </div>
                                      )}

                                      {item.artifacts.context && (
                                        <div>
                                          <div className="flex items-center gap-2 mb-2">
                                            <AlertCircle className="h-4 w-4 text-warning-foreground" />
                                            <p className="text-xs font-semibold text-foreground">Context & Background</p>
                                          </div>
                                          <div className="text-sm text-foreground bg-warning/10 rounded-md p-3 border border-warning/20">
                                            {typeof item.artifacts.context === 'string'
                                              ? item.artifacts.context
                                              : item.artifacts.context.join('\n')}
                                          </div>
                                        </div>
                                      )}

                                      {item.artifacts.expected_outcome && (
                                        <div>
                                          <div className="flex items-center gap-2 mb-2">
                                            <Target className="h-4 w-4 text-success-foreground" />
                                            <p className="text-xs font-semibold text-foreground">Expected Outcome</p>
                                          </div>
                                          <div className="text-sm text-foreground bg-success/10 rounded-md p-3 border border-success/20">
                                            {item.artifacts.expected_outcome}
                                          </div>
                                        </div>
                                      )}

                                      {item.artifacts.suggested_subject && (
                                        <div>
                                          <p className="text-xs font-semibold text-muted-foreground mb-1">Subject:</p>
                                          <p className="text-sm text-foreground">{item.artifacts.suggested_subject}</p>
                                        </div>
                                      )}

                                      {item.artifacts.message && !item.artifacts.script && (
                                        <div>
                                          <p className="text-xs font-semibold text-muted-foreground mb-1">Message:</p>
                                          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted rounded-md p-3 border border-border">
                                            {item.artifacts.message}
                                          </div>
                                        </div>
                                      )}

                                      {item.artifacts.call_script && !item.artifacts.script && (
                                        <div>
                                          <p className="text-xs font-semibold text-muted-foreground mb-1">Call Script:</p>
                                          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted rounded-md p-3 border border-border">
                                            {item.artifacts.call_script}
                                          </div>
                                        </div>
                                      )}

                                      {item.artifacts.talking_points && item.artifacts.talking_points.length > 0 && (
                                        <div>
                                          <p className="text-xs font-semibold text-muted-foreground mb-1">Talking Points:</p>
                                          <ul className="text-sm text-foreground list-disc list-inside space-y-1">
                                            {item.artifacts.talking_points.map((point, i) => (
                                              <li key={i}>{point}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Footer */}
                  <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      {queue.length > 0 ? `${queue.length} prioritised ${queue.length === 1 ? 'action' : 'actions'}` : 'No actions pending'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={loadTriageQueue}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>

            {/* Resize handles */}
            {!isMinimized && (
              <>
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize group"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                  title="Resize"
                >
                  <div className="absolute bottom-0.5 right-0.5 w-3 h-3 border-r-2 border-b-2 border-border group-hover:border-success transition-colors" />
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Phase 4: Action Completion Dialog */}
      {completingAction && (
        <Dialog open={!!completingAction} onOpenChange={() => setCompletingAction(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Action</DialogTitle>
              <DialogDescription>
                <strong>{completingAction.applicant_name}</strong> - {completingAction.action_type}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Was this action successful?
                </label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCompletionSuccess(true)}
                    variant={completionSuccess ? 'default' : 'outline'}
                    className={cn(
                      'flex-1',
                      completionSuccess && 'bg-success text-success-foreground hover:bg-success/90'
                    )}
                  >
                    Yes
                  </Button>
                  <Button
                    onClick={() => setCompletionSuccess(false)}
                    variant={!completionSuccess ? 'destructive' : 'outline'}
                    className="flex-1"
                  >
                    No
                  </Button>
                </div>
              </div>

              <div>
                <label htmlFor="outcome-notes" className="block text-sm font-medium text-foreground mb-2">
                  Outcome Notes
                </label>
                <textarea
                  id="outcome-notes"
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="What happened? Any follow-up needed?"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none focus:ring-2 focus:ring-success focus:border-success bg-background text-foreground"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <Button
                onClick={() => setCompletingAction(null)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompleteAction}
                disabled={!outcomeNotes.trim()}
                variant="default"
                className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
              >
                Submit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Phase 4: Ivy Follow-up Feedback */}
      {completionFeedback && (
        <div className="fixed bottom-4 right-4 z-[70] max-w-md animate-in slide-in-from-bottom duration-300">
          <Card className="shadow-lg border-success/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-sm mb-2">Ivy's Follow-up</h4>
                  <p className="text-sm text-foreground whitespace-pre-wrap mb-3">
                    {completionFeedback.message}
                  </p>
                  {completionFeedback.actions.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <p className="font-semibold mb-1">Suggested next steps:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {completionFeedback.actions.map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => setCompletionFeedback(null)}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
