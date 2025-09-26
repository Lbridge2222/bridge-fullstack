import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, AlertTriangle, CheckCircle, X, Move, Target, Zap, Bell } from 'lucide-react';

interface SuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SuggestionsData | null;
  onAction?: (action: string, data?: any) => void;
  // Minimal prop contract for v2 modal payloads
  modalTitle?: string;
  summaryBullets?: string[];
  keyMetrics?: Record<string, any>;
  primaryCta?: { label: string; action: string } | null;
  secondaryCta?: { label: string; action: string } | null;
  chips?: string[];
}

interface SuggestionsData {
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
    secondary_cta?: {
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

const MODAL_WIDTH = 420;
const MODAL_MIN_VISIBLE = 80;

const SuggestionsModal: React.FC<SuggestionsModalProps> = ({ isOpen, onClose, data, onAction, modalTitle, summaryBullets, keyMetrics, primaryCta, secondaryCta, chips }) => {
  // Drag state (mirrors EmailComposer mechanics)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Live refs for smooth dragging without re-renders
  const positionRef = useRef<{ x: number; y: number }>({ x: Math.max(window.innerWidth - (MODAL_WIDTH + 24), 16), y: 24 });
  const dragLatestRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const getSafeTop = useCallback(() => {
    // Keep clear of any fixed header/banner; default to small offset
    let headerHeight = 48;
    const banner = document.querySelector('[role="banner"]') as HTMLElement | null;
    if (banner && banner.offsetHeight) headerHeight = banner.offsetHeight;
    return Math.max(0, headerHeight - 8);
  }, []);

  const getClampBounds = useCallback((width: number, height: number) => {
    // Allow partial off-screen positioning but keep at least MODAL_MIN_VISIBLE px visible
    const minX = -width + MODAL_MIN_VISIBLE;
    const maxX = window.innerWidth - MODAL_MIN_VISIBLE;
    const minY = -height + MODAL_MIN_VISIBLE;
    const maxY = window.innerHeight - MODAL_MIN_VISIBLE;
    return { minX, maxX, minY, maxY };
  }, []);

  // Ensure initial position is sensible each time it opens
  useLayoutEffect(() => {
    if (!isOpen) return;
    const safeTop = getSafeTop();
    const { minX, maxX, minY, maxY } = getClampBounds(MODAL_WIDTH, 320);
    let x = Math.min(Math.max(window.innerWidth - (MODAL_WIDTH + 24), minX), maxX);
    let y = Math.min(Math.max(safeTop + 16, minY), maxY);
    positionRef.current = { x, y };
    if (containerRef.current) {
      const el = containerRef.current;
      el.style.transition = 'none';
      // Initialize position using left/top (no transforms)
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.transform = '';
      requestAnimationFrame(() => { if (el) el.style.transition = ''; });
    }
  }, [isOpen, getClampBounds, getSafeTop]);

  // Pointer-driven drag with clamped bounds (like EmailComposer)
  useEffect(() => {
    if (!isDragging) return;

    const applyFrame = () => {
      if (!containerRef.current || !dragLatestRef.current) { rafIdRef.current = null; return; }
      const { minX, maxX, minY, maxY } = getClampBounds(MODAL_WIDTH, 320);
      const x = Math.min(Math.max(dragLatestRef.current.x, minX), maxX);
      const y = Math.min(Math.max(dragLatestRef.current.y, minY), maxY);
      // Commit directly to left/top for smooth, predictable drag
      containerRef.current.style.left = `${x}px`;
      containerRef.current.style.top = `${y}px`;
      positionRef.current = { x, y };
      rafIdRef.current = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      dragLatestRef.current = { x: newX, y: newY };
      if (!rafIdRef.current) rafIdRef.current = requestAnimationFrame(applyFrame);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      dragLatestRef.current = null;
      if (containerRef.current) {
        const el = containerRef.current;
        el.style.transition = '';
        el.style.transform = '';
      }
      document.body.style.userSelect = '';
      (document.body.style as any).webkitUserSelect = '';
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove as any);
      window.removeEventListener('pointerup', onPointerUp as any);
    };
  }, [isDragging, dragStart, getClampBounds]);

  if (!isOpen) return null;

  const {
    modal_title = modalTitle || 'AI Suggestions',
    summary_bullets = summaryBullets || [],
    key_metrics = keyMetrics || {},
    predictions = { conversion: {}, attendance_1to1: { label: 'unknown', rationale: '' } },
    next_best_action = { label: '', reason: '' },
    ask = [],
    say = [],
    gaps = [],
    confidence = 0,
    ui = { chips: chips || [] },
  } = (data || {}) as Partial<SuggestionsData> & { predictions: any; key_metrics: any; ui: any };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-status-success-text';
    if (conf >= 0.6) return 'text-status-info-text';
    if (conf >= 0.4) return 'text-status-warning-text';
    return 'text-status-error-text';
  };

  return createPortal(
    <div
      ref={containerRef}
      className={`fixed z-[2147483647] bg-background border border-border rounded-lg shadow-2xl transition-shadow ${isDragging ? 'shadow-2xl ring-2 ring-primary/20' : 'shadow-lg ring-1 ring-primary/20'}`}
      style={{
        // Position via left/top only (no transforms during drag)
        left: Math.max(16, positionRef.current.x),
        top: Math.max(16, positionRef.current.y),
        pointerEvents: 'auto',
        width: `${MODAL_WIDTH}px`,
        maxHeight: '80vh',
        overflow: 'hidden'
      }}
      role="dialog"
      aria-modal="true"
      aria-label={modal_title}
    >
      {/* Header (drag handle) */}
      <div
        className="flex items-center justify-between p-3 border-b border-border cursor-move select-none"
        onPointerDown={(e) => {
          const t = e.target as HTMLElement;
          if (t.closest('button,[role="button"],input,textarea,select,[contenteditable],a,.no-drag')) return;
          if (!containerRef.current) return;
          containerRef.current.style.transition = 'none';
          document.body.style.userSelect = 'none';
          (document.body.style as any).webkitUserSelect = 'none';
          setIsDragging(true);
          // Calculate offset from pointer to element's top-left corner
          const rect = containerRef.current.getBoundingClientRect();
          setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onDoubleClick={() => {
          const safeTop = getSafeTop();
          const x = Math.max(16, window.innerWidth - (MODAL_WIDTH + 24));
          const y = safeTop + 16;
          positionRef.current = { x, y };
          if (containerRef.current) {
            const el = containerRef.current;
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.style.transform = '';
          }
        }}
      >
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground truncate">{modal_title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Move className="h-3 w-3 text-muted-foreground" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
            aria-label="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[calc(80vh-60px)] overflow-y-auto">
        {/* Loading state when data not yet available */}
        {!data && (
          <Card className="bg-surface-secondary/50">
            <CardContent className="p-3">
              <div className="text-sm text-muted-foreground">Loading suggestions…</div>
            </CardContent>
          </Card>
        )}
        {/* Conversion Probability */}
        {key_metrics?.conversion_probability_pct != null && (
          <Card className="bg-surface-secondary/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Forecast</p>
                  <p className={`text-2xl font-bold ${getConfidenceColor((key_metrics.conversion_probability_pct || 0) / 100)}`}>
                    {key_metrics.conversion_probability_pct}%
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-white">
                    {key_metrics.eta_days != null ? `${key_metrics.eta_days} days ETA` : 'Low likelihood'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{Math.round((confidence || 0) * 100)}% confidence</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Best Action */}
        {next_best_action?.label && (
          <Card className="bg-surface-secondary/50">
            <CardContent className="p-3">
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Next Best Action
              </h4>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{next_best_action.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">{next_best_action.reason}</p>
                </div>
                {(primaryCta || ui?.primary_cta) && (
                  <Button size="sm" onClick={() => onAction?.((primaryCta || ui!.primary_cta!).action)} className="shrink-0">
                    {(primaryCta || ui!.primary_cta!).label}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Risk Assessment */}
        {key_metrics?.risk_score != null && (
          <Card className="bg-surface-secondary/50">
            <CardContent className="p-3">
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-semantic-warning" />
                Risk Assessment
              </h4>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Risk Score</span>
                    <span className={`font-medium ${getConfidenceColor(1 - (key_metrics.risk_score || 0) / 100)}`}>
                      {key_metrics.risk_score}/100
                    </span>
                  </div>
                  <Progress value={key_metrics.risk_score || 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversation Starters */}
        {(ask?.length || say?.length) && (
          <Card className="bg-surface-secondary/50">
            <CardContent className="p-3">
              <h4 className="text-sm font-medium text-foreground mb-3">Conversation Starters</h4>
              {ask?.length ? (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-2">Ask:</p>
                  <ul className="space-y-1">
                    {ask.map((q, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-status-success-text mt-0.5 shrink-0" />
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {say?.length ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Say:</p>
                  <ul className="space-y-1">
                    {say.map((s, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-status-info-text mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Gaps */}
        {gaps?.length ? (
          <Card className="bg-surface-secondary/50 border-status-error-border">
            <CardContent className="p-3">
              <h4 className="text-sm font-medium text-status-error-text mb-2 flex items-center gap-2">
                <Bell className="h-4 w-4 text-status-error-text" />
                Gaps Identified
              </h4>
              <ul className="space-y-1">
                {gaps.map((gap, i) => (
                  <li key={i} className="text-sm text-status-error-text flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-status-error-text mt-0.5 shrink-0" />
                    {gap}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {/* Summary */}
        {summary_bullets?.length ? (
          <Card className="bg-surface-secondary/50">
            <CardContent className="p-3">
              <h4 className="text-sm font-medium text-foreground mb-2">Summary</h4>
              <ul className="space-y-1">
                {summary_bullets.map((bullet, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2 shrink-0" />
                    {bullet.replace(/^•\s*/, '')}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <span>
            Confidence: <Badge className={`${getConfidenceColor(confidence || 0)}`}>{Math.round((confidence || 0) * 100)}%</Badge>
          </span>
          {(chips?.length || ui?.chips?.length) ? (
            <div className="flex gap-1">
              {(chips || ui!.chips).map((chip: string, i: number) => (
                <Badge key={i} variant="outline">{chip}</Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SuggestionsModal;