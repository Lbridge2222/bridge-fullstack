import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { X, Phone, PhoneCall, PhoneOff, Clock, Maximize, Minimize, Move, GripVertical, Minus, HelpCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ScrollArea } from "@/components/ui/scroll-area";

// Import the lane components we'll create
import LaneA from './CallConsole/LaneA';
import LaneB from './CallConsole/LaneB';
// TranscriptDrawer removed - transcription is now live in LaneB

// Import API integration
import { callConsoleApi, type Lead, type CallData } from '@/services/callConsoleApi';
import { createVoIPService, type VoIPCall, type VoIPService, defaultVoIPConfig } from '@/services/voipService';

// Re-export types from API service
export type { Lead, CallData } from '@/services/callConsoleApi';

export interface CallNote {
  id: string;
  content: string;
  timestamp: string;
  type: "general" | "objection" | "commitment" | "follow-up";
  tags: string[];
}

export interface RagContext {
  lead: Lead;
  transcriptWindow: string[];
  selection?: string;
  consentGranted: boolean;
}

export interface RagResponse {
  answer: string;
  sources: Array<{
    title: string;
    url?: string;
    snippet: string;
  }>;
  streaming?: boolean;
  query_type?: string;
  confidence?: number;
  generated_at?: string;
  session_id?: string;
}

// Props
interface CallConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSaveCall: (data: CallData) => void;
  mode?: "compact" | "full";
  hasQueue?: boolean;
  onStartNextCall?: () => void;
}

// Main CallConsole component
export const CallConsole: React.FC<CallConsoleProps> = ({ 
  isOpen, 
  onClose, 
  lead, 
  onSaveCall, 
  mode = "compact",
  hasQueue = false,
  onStartNextCall 
}) => {
  // State
  const [callState, setCallState] = useState<"idle" | "dialing" | "active" | "wrapup">("idle");
  const [duration, setDuration] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  // transcriptOpen state removed - transcription is now live in LaneB
  const [notes, setNotes] = useState<CallNote[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [transcriptWindow, setTranscriptWindow] = useState<string[]>([]);
  const [consentGranted, setConsentGranted] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // VoIP Integration
  const [voipService] = useState<VoIPService>(() => createVoIPService(defaultVoIPConfig));
  const [currentVoIPCall, setCurrentVoIPCall] = useState<VoIPCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callControls, setCallControls] = useState<any>(null);
  
  // Drag and resize state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 850, y: 20 });
  const [size, setSize] = useState({ width: 720, height: Math.round(window.innerHeight * 0.7) });
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Live refs for 60fps drag/resize without re-renders
  const positionRef = useRef(position);
  const sizeLiveRef = useRef(size);
  const rafIdRef = useRef<number | null>(null);
  const dragLatestRef = useRef<{ x: number; y: number } | null>(null);
  const resizeLatestRef = useRef<{ width: number; height: number } | null>(null);
  
  // Responsive console modes
  type ConsoleMode = 'floating' | 'docked' | 'fullscreen';
  const pickMode = () => {
    const w = window.innerWidth;
    if (w < 768) return 'fullscreen' as const;
    if (w < 1280) return 'docked' as const;
    return 'floating' as const;
  };
  const [consoleMode, setConsoleMode] = useState<ConsoleMode>(pickMode());
  useEffect(() => {
    const onResize = () => setConsoleMode(pickMode());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  
  // Helper to compute Lane A width based on container width
  const computeLaneAWidth = useCallback((containerWidth: number): number => {
    const proposed = containerWidth * 0.42; // ~2/5 of console width
    return Math.round(Math.max(420, Math.min(560, proposed)));
  }, []);

  // Safe area + snapping
  const SAFE_MARGIN = 8;
  const MIN_VISIBLE = 120; // keep at least 120px visible when dragging (prevent nav bar overlap)
  const SNAP_DISTANCE = 8; // smaller, subtler snap
  const getSafeTop = useCallback(() => {
    let headerHeight = 56; // lighter constraint
    const banner = document.querySelector('[role="banner" ]') as HTMLElement | null;
    if (banner && banner.offsetHeight) headerHeight = banner.offsetHeight;
    return Math.max(0, headerHeight - 8); // allow slight overlap
  }, []);

  // Ensure initial position/size are in bounds and below header before first paint
  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = containerRef.current;
    const safeTop = getSafeTop();
    const maxWidth = Math.max(400, window.innerWidth - SAFE_MARGIN * 2);
    const maxHeight = Math.max(300, window.innerHeight - SAFE_MARGIN * 2);

    // Prefer initial center positioning on open
    let width = Math.min(sizeLiveRef.current.width, maxWidth);
    let height = Math.min(sizeLiveRef.current.height, maxHeight);
    sizeLiveRef.current = { width, height };
    setSize(sizeLiveRef.current);

    // Center by default; slight vertical offset similar to screenshot 2
    let x = Math.round((window.innerWidth - width) / 2);
    let y = Math.round(Math.max(safeTop + 24, (window.innerHeight - height) / 3));
    positionRef.current = { x, y };
    setPosition(positionRef.current);

    if (el) {
      el.style.transition = 'none';
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.setProperty('--lane-a-width', `${computeLaneAWidth(width)}px`);
      // re-enable transitions shortly after first paint
      requestAnimationFrame(() => {
        if (el) el.style.transition = '';
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keep in bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      const safeTop = getSafeTop();
      const maxWidth = Math.max(400, window.innerWidth - SAFE_MARGIN * 2);
      const maxHeight = Math.max(300, window.innerHeight - safeTop - SAFE_MARGIN);
      let width = Math.min(sizeLiveRef.current.width, maxWidth);
      let height = Math.min(sizeLiveRef.current.height, maxHeight);
      sizeLiveRef.current = { width, height };
      setSize(sizeLiveRef.current);
      const maxX = window.innerWidth - width - SAFE_MARGIN;
      const maxY = window.innerHeight - height - SAFE_MARGIN;
      let x = Math.min(Math.max(positionRef.current.x, SAFE_MARGIN), Math.max(SAFE_MARGIN, maxX));
      let y = Math.min(Math.max(positionRef.current.y, safeTop), Math.max(safeTop, maxY));
      positionRef.current = { x, y };
      setPosition(positionRef.current);
      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        containerRef.current.style.width = `${width}px`;
        containerRef.current.style.height = `${height}px`;
        containerRef.current.style.setProperty('--lane-a-width', `${computeLaneAWidth(width)}px`);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getSafeTop, computeLaneAWidth]);
  
  // Wrap-up state
  const [outcomeType, setOutcomeType] = useState<string>("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpType, setFollowUpType] = useState<string>("none");
  
  const { push } = useToast();

  // Utility function for duration formatting
  const formatDuration = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  // VoIP event handlers
  useEffect(() => {
    voipService.onCallStatusChange((call: VoIPCall) => {
      setCurrentVoIPCall(call);
      setDuration(call.duration);
      
      switch (call.status) {
        case 'dialing':
        case 'ringing':
          setCallState("dialing");
          break;
        case 'active':
          setCallState("active");
          break;
        case 'muted':
          setIsMuted(true);
          break;
        case 'hold':
          setIsOnHold(true);
          break;
        case 'ended':
          setCallState("wrapup");
          break;
      }
    });

    voipService.onRecordingUpdate((callId: string, recording: boolean) => {
      setIsRecording(recording);
      if (recording) {
        setRecordingDuration(0);
      }
    });

    voipService.onTranscriptionUpdate((callId: string, text: string) => {
      setTranscriptWindow(prev => {
        const newWindow = [...prev.slice(-9), text]; // Keep last 10 chunks
        
        // Update transcription in database if call is active
        if (currentCallId) {
          const fullTranscription = newWindow.join('\n');
          callConsoleApi.updateTranscription(currentCallId, fullTranscription).catch(
            error => console.error('Failed to update transcription:', error)
          );
        }
        
        return newWindow;
      });
    });

    return () => voipService.dispose();
  }, [voipService]);

  // Call state machine with VoIP integration
  const startCall = useCallback(async () => {
    if (!lead?.phone) {
      push({
        title: "No phone number",
        description: "Lead phone number is required to make a call",
        variant: "destructive"
      });
      return;
    }

    try {
      setCallState("dialing");
      setDuration(0);
      
      // Start call tracking in database
      const callResponse = await callConsoleApi.startCall(
        lead.uid,
        'outbound'
      );
      setCurrentCallId(callResponse.call_id);
      
      const voipCall = await voipService.makeCall(lead.phone, lead.name);
      setCurrentVoIPCall(voipCall);
      
      // Get call controls for this call
      const controls = voipService.getCallControls(voipCall.id);
      setCallControls(controls);
      
    } catch (error: any) {
      push({
        title: "Call failed",
        description: error.message || "Failed to initiate call",
        variant: "destructive"
      });
      setCallState("idle");
    }
  }, [lead, voipService, push]);

  const endCall = useCallback(async () => {
    if (currentVoIPCall && callControls) {
      try {
        await callControls.hangup();
        setCallState("wrapup");
      } catch (error: any) {
        push({
          title: "End call failed",
          description: error.message || "Failed to end call",
          variant: "destructive"
        });
      }
    } else {
      setCallState("wrapup");
    }
  }, [currentVoIPCall, callControls, push]);

  // Save call outcome when wrapup is completed
  const saveCallOutcome = useCallback(async () => {
    if (!currentCallId) return;

    try {
      // Prepare transcription data
      const fullTranscription = transcriptWindow.join('\n');
      
      // Create AI analysis data from highlights and notes
      const aiAnalysis = {
        highlights: highlights,
        total_notes: notes.length,
        note_types: [...new Set(notes.map(note => note.type))],
        call_quality_indicators: {
          has_transcript: transcriptWindow.length > 0,
          has_notes: notes.length > 0,
          has_outcome: !!outcomeType,
          consent_granted: consentGranted
        },
        summary: {
          duration_minutes: Math.round(duration / 60),
          outcome: outcomeType || 'completed',
          next_action: followUpType || 'none'
        }
      };

      await callConsoleApi.endCall(currentCallId, {
        duration_seconds: duration,
        call_outcome: outcomeType || 'completed',
        notes: notes.map(note => note.content).join('\n'),
        action_items: [], // Could be extracted from notes or added separately
        follow_up_date: followUpDate ? followUpDate.split('T')[0] : undefined,
        follow_up_type: followUpType,
        priority: priority,
        transcription: fullTranscription,
        ai_analysis: aiAnalysis,
        tags: highlights // Use highlights as tags for now
      });

      push({
        title: "Call saved",
        description: "Call outcome and notes have been saved to the database",
        variant: "default"
      });

      // Reset state for next call
      setCallState("idle");
      setCurrentCallId(null);
      setNotes([]);
      setOutcomeType("");
      setOutcomeDescription("");
      setDuration(0);
      setTranscriptWindow([]);
      setFollowUpDate("");
      setFollowUpType("none");
      
      // Reset VoIP state
      setCurrentVoIPCall(null);
      setCallControls(null);
      setIsMuted(false);
      setIsOnHold(false);
      setIsRecording(false);
      setRecordingDuration(0);
      setConsentGranted(false);
      setHighlights([]);

    } catch (error: any) {
      push({
        title: "Save failed",
        description: error.message || "Failed to save call outcome",
        variant: "destructive"
      });
    }
  }, [currentCallId, duration, outcomeType, outcomeDescription, followUpType, notes, push]);

  const startRecording = useCallback(async () => {
    if (currentVoIPCall && callControls && consentGranted) {
      try {
        await callControls.record();
        setIsRecording(true);
        setRecordingDuration(0);
      } catch (error: any) {
        push({
          title: "Recording failed",
          description: error.message || "Failed to start recording",
          variant: "destructive"
        });
      }
    } else if (!consentGranted) {
      push({
        title: "Recording consent required",
        description: "Please check the recording consent box first",
        variant: "destructive"
      });
    }
  }, [currentVoIPCall, callControls, consentGranted, push]);

  const stopRecording = useCallback(async () => {
    if (currentVoIPCall && callControls) {
      try {
        const recordingUrl = await callControls.stopRecording();
        setIsRecording(false);
        
        push({
          title: "Recording saved",
          description: `Recording available at: ${recordingUrl}`,
          variant: "default"
        });
      } catch (error: any) {
        push({
          title: "Stop recording failed",
          description: error.message || "Failed to stop recording",
          variant: "destructive"
        });
      }
    } else {
      setIsRecording(false);
    }
  }, [currentVoIPCall, callControls, push]);

  // Additional call control handlers
  const handleMute = useCallback(async () => {
    if (callControls) {
      try {
        if (isMuted) {
          await callControls.unmute();
          setIsMuted(false);
        } else {
          await callControls.mute();
          setIsMuted(true);
        }
      } catch (error: any) {
        push({
          title: "Mute failed",
          description: error.message || "Failed to toggle mute",
          variant: "destructive"
        });
      }
    }
  }, [callControls, isMuted, push]);

  const handleHold = useCallback(async () => {
    if (callControls) {
      try {
        if (isOnHold) {
          await callControls.unhold();
          setIsOnHold(false);
        } else {
          await callControls.hold();
          setIsOnHold(true);
        }
      } catch (error: any) {
        push({
          title: "Hold failed",
          description: error.message || "Failed to toggle hold",
          variant: "destructive"
        });
      }
    }
  }, [callControls, isOnHold, push]);

  const handleTransfer = useCallback(async () => {
    // In a real implementation, this would open a transfer dialog
    const targetNumber = prompt("Enter number to transfer to:");
    if (targetNumber && callControls) {
      try {
        await callControls.transfer(targetNumber);
        push({
          title: "Transfer initiated",
          description: `Transferring to ${targetNumber}`,
          variant: "default"
        });
      } catch (error: any) {
        push({
          title: "Transfer failed",
          description: error.message || "Failed to initiate transfer",
          variant: "destructive"
        });
      }
    }
  }, [callControls, push]);

  // Timer effects
  useEffect(() => {
    if (callState === "active") {
      const timer = setInterval(() => setDuration(d => d + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [callState]);

  useEffect(() => {
    if (isRecording && callState === "active") {
      const timer = setInterval(() => setRecordingDuration(d => d + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [isRecording, callState]);

  // Drag and resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'drag' | 'resize') => {
    if (!containerRef.current) return;
    // Disable transitions during interaction for snappy feel
    containerRef.current.style.transition = 'none';
    // Lock selection
    document.body.style.userSelect = 'none';
    // lighten shadow during active drag/resize
    containerRef.current.classList.add('shadow-none');
    if (type === 'drag') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y });
    } else {
      setIsResizing(true);
      setResizeStart({ 
        x: e.clientX, 
        y: e.clientY, 
        width: sizeLiveRef.current.width, 
        height: sizeLiveRef.current.height 
      });
    }
  }, []);

  // Drag safety wrapper to ignore interactive elements
  const safeDragMouseDown = useCallback((e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('button,[role="button"],input,textarea,select,[contenteditable],a,.no-drag')) return;
    handleMouseDown(e, 'drag');
  }, [handleMouseDown]);

  // Touch support for drag/resize
  const handleTouchStart = useCallback((e: React.TouchEvent, type: 'drag' | 'resize') => {
    if (!containerRef.current) return;
    const t = e.target as HTMLElement;
    if (type === 'drag' && t.closest('button,[role="button"],input,textarea,select,[contenteditable],a,.no-drag')) return;
    const p = e.touches && e.touches.length > 0 ? e.touches[0] : undefined;
    if (!p) return;
    containerRef.current.style.transition = 'none';
    document.body.style.userSelect = 'none';
    if (type === 'drag') {
      setIsDragging(true);
      setDragStart({ x: p.clientX - positionRef.current.x, y: p.clientY - positionRef.current.y });
    } else {
      setIsResizing(true);
      setResizeStart({ x: p.clientX, y: p.clientY, width: sizeLiveRef.current.width, height: sizeLiveRef.current.height });
    }
  }, []);

  useEffect(() => {
    const applyFrame = () => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      let didWork = false;
      if (dragLatestRef.current) {
        const { x, y } = dragLatestRef.current;
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        didWork = true;
      }
      if (resizeLatestRef.current) {
        const { width, height } = resizeLatestRef.current;
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;
        // Update Lane A width via CSS var for responsive internal layout
        const laneAWidth = computeLaneAWidth(width);
        el.style.setProperty('--lane-a-width', `${laneAWidth}px`);
        didWork = true;
      }
      if (didWork) {
        rafIdRef.current = requestAnimationFrame(applyFrame);
      } else {
        rafIdRef.current = null;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (isDragging) {
        const newXRaw = e.clientX - dragStart.x;
        const newYRaw = e.clientY - dragStart.y;
        const safeTop = getSafeTop();
        // Relaxed bounds: allow overlap as long as MIN_VISIBLE remains on-screen
        const maxX = window.innerWidth - MIN_VISIBLE;
        const maxY = window.innerHeight - MIN_VISIBLE;
        const newX = Math.max(MIN_VISIBLE - sizeLiveRef.current.width, Math.min(newXRaw, maxX));
        const newY = Math.max(Math.min(safeTop, MIN_VISIBLE - sizeLiveRef.current.height), Math.min(newYRaw, maxY));
        dragLatestRef.current = { x: newX, y: newY };
        positionRef.current = { x: newX, y: newY };
        if (rafIdRef.current == null) rafIdRef.current = requestAnimationFrame(applyFrame);
      } else if (isResizing) {
        const maxWidth = Math.max(400, window.innerWidth - SAFE_MARGIN);
        const maxHeight = Math.max(300, window.innerHeight - SAFE_MARGIN);
        const newWidth = Math.max(420, Math.min(maxWidth, resizeStart.width + (e.clientX - resizeStart.x)));
        const newHeight = Math.max(320, Math.min(maxHeight, resizeStart.height + (e.clientY - resizeStart.y)));
        resizeLatestRef.current = { width: newWidth, height: newHeight };
        sizeLiveRef.current = { width: newWidth, height: newHeight };
        if (rafIdRef.current == null) rafIdRef.current = requestAnimationFrame(applyFrame);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current) return;
      const p = e.touches && e.touches.length > 0 ? e.touches[0] : undefined;
      if (!p) return;
      if (isDragging) {
        const newXRaw = p.clientX - dragStart.x;
        const newYRaw = p.clientY - dragStart.y;
        const safeTop = getSafeTop();
        const maxX = window.innerWidth - MIN_VISIBLE;
        const maxY = window.innerHeight - MIN_VISIBLE;
        const newX = Math.max(MIN_VISIBLE - sizeLiveRef.current.width, Math.min(newXRaw, maxX));
        const newY = Math.max(Math.min(safeTop, MIN_VISIBLE - sizeLiveRef.current.height), Math.min(newYRaw, maxY));
        dragLatestRef.current = { x: newX, y: newY };
        positionRef.current = { x: newX, y: newY };
        if (rafIdRef.current == null) rafIdRef.current = requestAnimationFrame(applyFrame);
      } else if (isResizing) {
        const maxWidth = Math.max(400, window.innerWidth - SAFE_MARGIN);
        const maxHeight = Math.max(300, window.innerHeight - SAFE_MARGIN);
        const clientX = p ? p.clientX : 0;
        const clientY = p ? p.clientY : 0;
        const newWidth = Math.max(420, Math.min(maxWidth, resizeStart.width + (clientX - resizeStart.x)));
        const newHeight = Math.max(320, Math.min(maxHeight, resizeStart.height + (clientY - resizeStart.y)));
        resizeLatestRef.current = { width: newWidth, height: newHeight };
        sizeLiveRef.current = { width: newWidth, height: newHeight };
        if (rafIdRef.current == null) rafIdRef.current = requestAnimationFrame(applyFrame);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      // Re-enable transitions after interaction
      if (containerRef.current) {
        containerRef.current.style.transition = '';
      }
      // restore selection and light shadows
      document.body.style.userSelect = '';
      containerRef.current?.classList.remove('shadow-none');
      // Commit final values to React state for persistence
      if (dragLatestRef.current) {
        // Snap horizontally only if near edges
        const x = positionRef.current.x;
        const y = positionRef.current.y;
        const leftEdge = MIN_VISIBLE - sizeLiveRef.current.width;
        const rightEdge = window.innerWidth - MIN_VISIBLE;
        const snapLeft = Math.abs(x - leftEdge) <= SNAP_DISTANCE ? leftEdge : x;
        const snapRight = Math.abs(x - rightEdge) <= SNAP_DISTANCE ? rightEdge : snapLeft;
        positionRef.current = { x: snapRight, y };
        if (containerRef.current) containerRef.current.style.transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`;
        setPosition(positionRef.current);
        dragLatestRef.current = null;
      }
      if (resizeLatestRef.current) {
        setSize(sizeLiveRef.current);
        resizeLatestRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
    const handleTouchEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
      if (containerRef.current) {
        containerRef.current.style.transition = '';
      }
      document.body.style.userSelect = '';
      if (dragLatestRef.current) {
        const x = positionRef.current.x;
        const y = positionRef.current.y;
        const leftEdge = MIN_VISIBLE - sizeLiveRef.current.width;
        const rightEdge = window.innerWidth - MIN_VISIBLE;
        const snapLeft = Math.abs(x - leftEdge) <= SNAP_DISTANCE ? leftEdge : x;
        const snapRight = Math.abs(x - rightEdge) <= SNAP_DISTANCE ? rightEdge : snapLeft;
        positionRef.current = { x: snapRight, y };
        if (containerRef.current) containerRef.current.style.transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`;
        setPosition(positionRef.current);
        dragLatestRef.current = null;
      }
      if (resizeLatestRef.current) {
        setSize(sizeLiveRef.current);
        resizeLatestRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, computeLaneAWidth]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      // Ctrl/Cmd+K to focus omnibox
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Will be handled by LaneB component
        document.getElementById('omnibox-input')?.focus();
      }
      
      // Ctrl/Cmd+R to toggle recording (only when active)
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && callState === "active") {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      }
      
      // Ctrl/Cmd+N to add note
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && callState === "active") {
        e.preventDefault();
        // Will be handled by LaneA component
      }
      
      // Esc to close drawers (transcript drawer removed)
      if (e.key === 'Escape') {
        // No drawers to close anymore
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, callState, isRecording, startRecording, stopRecording]);

  // Save call handler with real API integration
  const handleSave = useCallback(async () => {
    await saveCallOutcome();
    onClose();
  }, [saveCallOutcome, onClose]);

  if (!isOpen || !lead) return null;

  if (isMinimized) {
    return (
      <div 
        className={`fixed z-50 bg-card border rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 ${
          callState === "active" 
            ? 'border-success/30 shadow-success/10' 
            : 'border-border'
        }`}
        style={{ 
          transform: `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`,
          width: callState === "active" ? '280px' : '200px',
          height: callState === "active" ? '80px' : '60px'
        }}
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center justify-between p-3 h-full">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Phone className={`h-4 w-4 ${callState === "active" ? 'text-success' : 'text-muted-foreground'}`} />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">
                {callState === "active" && lead ? lead.name : "Call Console"}
              </span>
              {callState === "active" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDuration(duration)}</span>
                  {isRecording && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                      <span>Recording</span>
                    </div>
                  )}
                  {isMuted && <span className="text-warning">Muted</span>}
                  {isOnHold && <span className="text-warning">On Hold</span>}
                </div>
              )}
            </div>
            {callState === "active" && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              if (callState === "active") {
                push({
                  title: "Cannot close during call",
                  description: "Please end the call first using the End Call button",
                  variant: "destructive"
                });
              } else {
                onClose();
              }
            }}
            disabled={callState === "active"}
            title={callState === "active" ? "Cannot close during active call" : "Close"}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`fixed z-50 bg-card border rounded-2xl overflow-hidden transition-all duration-300 ${
        callState === "active" 
          ? 'border-success/30 shadow-success/10' 
          : 'border-border'
      } ${isDragging ? 'cursor-grabbing' : (consoleMode==='floating' ? 'cursor-grab' : '')} ${consoleMode!=='floating' ? 'left-0 right-0' : ''} ${consoleMode==='floating' ? 'shadow-2xl' : 'shadow-lg'}`}
      style={consoleMode === 'floating' ? { 
        transform: `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`,
        width: sizeLiveRef.current.width,
        height: sizeLiveRef.current.height
      } : (consoleMode === 'docked' ? {
        bottom: 0,
        margin: 8,
        left: 8,
        right: 8,
        height: '70vh'
      } : {
        top: 8,
        bottom: 8,
        left: 8,
        right: 8
      })}
    >
        {/* Top bar with drag handle and controls */}
        <div 
          className="flex items-center justify-between p-4 border-b border-border bg-background select-none"
          onMouseDown={safeDragMouseDown}
          onTouchStart={(e) => handleTouchStart(e, 'drag')}
        >
          <div className="flex items-center gap-3">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <div className="relative">
              <Phone className="h-5 w-5 text-success" />
              {callState === "active" && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <h1 className="text-lg font-semibold">Call Console</h1>
            {callState === "active" && (
              <div className="px-2 py-1 bg-success/10 border border-success/20 rounded-full">
                <span className="text-xs text-success font-medium">LIVE</span>
              </div>
            )}
            {callState === "active" && (
              <div className="text-xs text-muted-foreground">
                Cannot close during active call
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowShortcuts(true)}
              title="Keyboard Shortcuts"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsMinimized(true)}
              title="Minimize"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                const w = sizeLiveRef.current.width;
                const h = sizeLiveRef.current.height;
                const nextW = w < 1000 ? Math.min(window.innerWidth - 40, 1200) : 800;
                const nextH = h < window.innerHeight - 120 ? Math.min(window.innerHeight - 40, Math.max(h, 600)) : Math.max(480, Math.min(window.innerHeight - 100, h));
                sizeLiveRef.current = { width: nextW, height: nextH };
                setSize(sizeLiveRef.current);
              }}
              title={sizeLiveRef.current.width < 1000 ? "Expand" : "Compact"}
            >
              {sizeLiveRef.current.width < 1000 ? <Maximize className="h-4 w-4" /> : <Minimize className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              disabled={callState === "active"}
              title={callState === "active" ? "Cannot close during active call - use End Call first" : "Close"}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Main call console content */}
        <div className="h-[calc(100%-60px)] flex overscroll-contain" style={{ ['--lane-a-width' as any]: `${computeLaneAWidth(sizeLiveRef.current.width)}px` }}>

          {/* Lane A: Call Controls (adjustable width) */}
          <div className={`${
            callState === "active" ? '' : 'w-full'
          } ${callState === "active" ? 'border-r border-border' : ''} flex flex-col transition-[width] duration-200`}
               style={callState === "active" ? { width: 'var(--lane-a-width)' } : undefined}>
            <ScrollArea className="flex-1">
              <div className="p-0">
            <LaneA
              callState={callState}
              duration={duration}
              recordingDuration={recordingDuration}
              isRecording={isRecording}
              transcriptWindow={transcriptWindow}
              consentGranted={consentGranted}
              notes={notes}
              outcomeType={outcomeType}
              outcomeDescription={outcomeDescription}
              priority={priority}
              followUpDate={followUpDate}
              followUpType={followUpType}
              lead={lead}
              hasQueue={hasQueue}
              onStartCall={startCall}
              onEndCall={endCall}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onMute={handleMute}
              onHold={handleHold}
              onTransfer={handleTransfer}
              isMuted={isMuted}
              isOnHold={isOnHold}
              onAddNote={async (content, type) => {
                const note: CallNote = {
                  id: `${Date.now()}`,
                  content,
                  timestamp: new Date().toISOString(),
                  type: type as any,
                  tags: []
                };
                setNotes(prev => [note, ...prev]);

                // Save note to database if call is active
                if (currentCallId) {
                  try {
                    await callConsoleApi.addCallNote(currentCallId, {
                      content,
                      type: type || 'general',
                      tags: []
                    });
                  } catch (error) {
                    console.error('Failed to save note:', error);
                  }
                }
              }}
              onAddHighlight={(highlight) => {
                setHighlights(prev => [...prev, highlight]);
              }}
              onSetConsent={setConsentGranted}
              onSetOutcomeType={setOutcomeType}
              onSetOutcomeDescription={setOutcomeDescription}
              onSetPriority={setPriority}
              onSetFollowUpDate={setFollowUpDate}
              onSetFollowUpType={setFollowUpType}
              onSave={handleSave}
              onStartNextCall={onStartNextCall}
            />
              </div>
            </ScrollArea>
          </div>

          {/* Lane B: AI Omnibox + Live Transcript (always visible during calls) */}
          {callState !== "idle" && (
            <ScrollArea className="flex-1">
              <div className="flex flex-col">
              <LaneB
                lead={lead}
                transcriptWindow={transcriptWindow}
                consentGranted={consentGranted}
                callState={callState}
                onAddNote={(content: string) => {
                  const note: CallNote = {
                    id: `${Date.now()}`,
                    content,
                    timestamp: new Date().toISOString(),
                    type: "general",
                    tags: []
                  };
                  setNotes(prev => [note, ...prev]);
                }}
              />
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Transcript is now live in LaneB - no overlay needed */}
        
        {/* Resize handle - larger hit area */}
        {consoleMode==='floating' && (
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize bg-transparent"
          onMouseDown={(e) => handleMouseDown(e, 'resize')}
          onTouchStart={(e) => handleTouchStart(e, 'resize')}
          style={{
            background: 'linear-gradient(-45deg, transparent 45%, hsl(var(--border)) 45%, hsl(var(--border)) 55%, transparent 55%)'
          }}
        />)}

        {/* Keyboard Shortcuts Modal */}
        {showShortcuts && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShowShortcuts(false)}>
            <div className="bg-card border rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowShortcuts(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">General</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Focus AI Omnibox</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘K</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Close drawers</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">During Active Call</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Toggle Recording</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘R</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Add Quick Note</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘N</kbd>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">AI Commands</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Lead Info</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs">/lead</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Course Info</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs">/course</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Objection Handling</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs">/objection</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Call Summary</span>
                        <kbd className="px-2 py-1 bg-muted rounded text-xs">/summary</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default CallConsole;
