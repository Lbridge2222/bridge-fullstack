import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Brain,
  X,
  MessageSquare,
  Loader2,
  Calendar,
  Mic,
  Square,
  FileText,
  Headphones,
  CheckCircle2,
  Target,
  Plus,
  Clock3,
  User,
  Tag,
  Info,
  Search,
  ChevronDown,
  Zap,
  MoreHorizontal,
  PhoneForwarded,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Clipboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { aiLeadsApi } from "@/services/api";
import { useToast } from "@/components/ui/toast";

// Call state machine hook
type CallState = "idle" | "dialing" | "active" | "wrapup";

interface UseCallComposerStateReturn {
  state: CallState;
  isCallActive: boolean;
  duration: number;
  recordingDuration: number;
  startCall: () => void;
  endCall: () => void;
  startRecording: () => void;
  stopRecording: () => void;
}

function useCallComposerState(): UseCallComposerStateReturn {
  const [state, setState] = useState<CallState>("idle");
  const [duration, setDuration] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const isCallActive = state === "active";

  // Main call timer
  useEffect(() => {
    if (state !== "active") return;
    const timer = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);

  // Recording timer
  useEffect(() => {
    if (state !== "active") return;
    const timer = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);

  const startCall = useCallback(() => {
    setState("dialing");
    setDuration(0);
    // Simulate connection delay
    setTimeout(() => setState("active"), 900);
  }, []);

  const endCall = useCallback(() => {
    setState("wrapup");
  }, []);

  const startRecording = useCallback(() => {
    setRecordingDuration(0);
  }, []);

  const stopRecording = useCallback(() => {
    // Recording stopped, duration preserved
  }, []);

  return {
    state,
    isCallActive,
    duration,
    recordingDuration,
    startCall,
    endCall,
    startRecording,
    stopRecording,
  };
}

// Progressive disclosure wrapper component
interface DisclosureProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

function Disclosure({ title, icon, defaultOpen = false, children, className = "" }: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border border-border/50 rounded-lg ${className}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-lg"
        role="button"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

// Types
export interface Lead {
  id: number;
  uid: string;
  name: string;
  email: string;
  phone: string;
  courseInterest: string;
  academicYear: string;
  campusPreference: string;
  enquiryType: string;
  leadSource: string;
  status: string;
  statusType: "new" | "contacted" | "qualified" | "nurturing" | "cold";
  leadScore: number;
  createdDate: string;
  lastContact: string;
  nextAction: string;
  slaStatus: "urgent" | "warning" | "within_sla" | "met";
  contactAttempts: number;
  tags: string[];
  colorTag?: string;
  avatar?: string;
  aiInsights: {
    conversionProbability: number; // Always as percentage (0-100)
    bestContactTime: string;
    recommendedAction: string;
    urgency: "high" | "medium" | "low";
  };
  // ML Prediction fields from backend
  mlPrediction?: boolean;
  mlProbability?: number; // Raw ML probability as decimal (0.0-1.0)
  mlConfidence?: number;
}

export type DispositionCode =
  | "connected_interested"
  | "connected_not_interested"
  | "callback_scheduled"
  | "left_voicemail"
  | "no_answer"
  | "wrong_number"
  | "escalated"
  | "resolved";

export interface CallOutcome {
  id: string;
  type: DispositionCode;
  description: string;
  nextAction: string;
  followUpDate?: string; // ISO
  priority: "low" | "medium" | "high" | "urgent";
  tags: string[];
}

export interface CallNote {
  id: string;
  content: string;
  timestamp: string; // ISO
  type: "general" | "action_item" | "follow_up" | "escalation" | "feedback";
  tags: string[];
}

export interface CallRecording {
  id: string;
  duration: number; // seconds
  transcription: string;
  qualityScore: number; // 0-100
  sentiment: "positive" | "neutral" | "negative";
  keyTopics: string[];
  aiInsights: string[];
  callSid?: string;
}

export interface CallScript {
  id: string;
  title: string;
  content: string;
  context: string;
  confidence: number;
  suggestedTiming: string;
  tags: string[];
}

export interface CallComposerData {
  lead: Lead | null;
  callType: "incoming" | "outgoing";
  duration: number; // seconds
  timestamp: string; // ISO
  outcome: CallOutcome | null;
  notes: CallNote[];
  recording: CallRecording | null;
  scripts: CallScript[];
  aiInsights: {
    callStrategy: string;
    followUpRecommendations: string[];
    riskAssessment: string;
    conversionProbability: number;
  };
  compliance: {
    consentRecorded: boolean;
    doNotCall: boolean;
  };
  assignedTo?: string;
  // New fields for AI script + scenario
  scriptScenario?: "application" | "portfolio" | "decline" | "post_1_1";
  ai?: { script?: string };
}

interface CallComposerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSaveCall: (callData: CallComposerData) => void;
  // Optional recent history to display for additional context
  history?: Array<{
    id: string | number;
    type: "call" | "email" | "note" | "meeting";
    title: string;
    timestamp: string; // ISO
    channel?: string;
    summary?: string;
  }>;
  // Visual density: 'compact' hides tabs and moves depth to a Details sheet
  mode?: "compact" | "full";
  // Power dialer support
  hasQueue?: boolean;
  onStartNextCall?: () => void;
}

const CallComposer: React.FC<CallComposerProps> = ({ isOpen, onClose, lead, onSaveCall, history = [], mode = "compact", hasQueue = false, onStartNextCall }) => {
  // derived
  const draftKey = useMemo(() => (lead ? `call_draft:${lead.uid}` : "call_draft:unknown"), [lead]);

  // Call state machine
  const { state: callState, isCallActive, duration, recordingDuration, startCall, endCall, startRecording, stopRecording } = useCallComposerState();

  // state
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState("call");
  
  // Progressive disclosure now handled by Disclosure component
  
  // Script generation states
  const [callScript, setCallScript] = useState("");
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [selectedScriptScenario, setSelectedScriptScenario] = useState<string | null>(null);
  const [scriptScenario, setScriptScenario] = useState<"application" | "portfolio" | "decline" | "post_1_1">("application");
  const scenarioDebounceRef = useRef<number | null>(null);
  const [mobileScriptOpen, setMobileScriptOpen] = useState(false);
  const [scriptExpanded, setScriptExpanded] = useState(false);
  
  // API call state management with abort controllers
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const analysisDebounceRef = useRef<number | null>(null);
  
  // AI transcription and summary states
  const [callTranscription, setCallTranscription] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [transcriptionChunks, setTranscriptionChunks] = useState<string[]>([]);
  
  // AI analysis state
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Highlights and moments during calls
  const [highlights, setHighlights] = useState<string[]>([]);
  const [callMoments, setCallMoments] = useState<Array<{time: number, keyword: string, text: string}>>([]);
  
  // Call controls
  const [showMoreControls, setShowMoreControls] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // QA Scorecard
  const [qaScores, setQaScores] = useState<Record<string, number>>({
    opening: 0,
    discovery: 0,
    presentation: 0,
    objection_handling: 0,
    closing: 0,
  });
  // QA and frameworks now handled by Disclosure component
  const [callJustCompleted, setCallJustCompleted] = useState(false);

  const [outcomeType, setOutcomeType] = useState<DispositionCode | "">("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent" | "">("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [followUpDate, setFollowUpDate] = useState<string>("");

  const [notes, setNotes] = useState<CallNote[]>([]);
  const [newNote, setNewNote] = useState("");

  const [recording, setRecording] = useState<CallRecording | null>(null);
  const [aiInsights, setAiInsights] = useState({
    callStrategy: "Focus on course benefits and career outcomes. Address concerns about cost/time early.",
    followUpRecommendations: [
      "Send course brochure within 24 hours",
      "Schedule campus visit next week",
      "Follow up with email summary",
    ],
    riskAssessment: "Medium risk – needs more programme detail",
    conversionProbability: 75,
  });
  const [compliance, setCompliance] = useState({ consentRecorded: false, doNotCall: false });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showShortcutHint, setShowShortcutHint] = useState(true);
  // inline details (no side panel)
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptQuery, setTranscriptQuery] = useState("");
  const [wrapAcwSeconds, setWrapAcwSeconds] = useState(90);
  const [wrapAutoEnd, setWrapAutoEnd] = useState(false);
  const [wrapTagsInput, setWrapTagsInput] = useState("");
  const [wrapTags, setWrapTags] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState<string | undefined>(undefined);
  // UI state for specific features
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const { push } = useToast();

  // summary (for copy)
  const summaryText = useMemo(() => {
    const who = lead ? `${lead.name} (${lead.phone})` : "Unknown lead";
    const disp = outcomeType ? outcomeType.replaceAll("_", " ") : "unspecified";
    const pr = priority || "unspecified";
    const fu = followUpDate ? new Date(followUpDate).toLocaleString() : "none";
    const n = notes.map((x) => `• [${new Date(x.timestamp).toLocaleTimeString()}] ${x.content}`).join("\n");
    return [
      `Call with ${who}`,
      `Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`,
      `Disposition: ${disp} | Priority: ${pr}`,
      outcomeDescription ? `Outcome: ${outcomeDescription}` : null,
      nextAction ? `Next action: ${nextAction}` : null,
      `Follow-up: ${fu}`,
      compliance.consentRecorded ? "Consent recorded" : "Consent not recorded",
      compliance.doNotCall ? "DNC: Yes" : "DNC: No",
      notes.length ? "\nNotes:\n" + n : null,
    ].filter(Boolean).join("\n");
  }, [lead, duration, outcomeType, priority, outcomeDescription, nextAction, followUpDate, notes, compliance]);

  // Utility functions (must be defined before memoized computations)
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Memoized expensive computations to prevent re-renders
  const memoizedNotesList = useMemo(() => {
    return notes.slice(0, 3).map((note) => (
      <div key={note.id} className="p-2 bg-muted/30 rounded text-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{new Date(note.timestamp).toLocaleTimeString()}</span>
          <Badge variant="outline" className="text-xs">{note.type}</Badge>
        </div>
        <p className="text-foreground">{note.content}</p>
      </div>
    ));
  }, [notes]);

  const memoizedHighlightsList = useMemo(() => {
    return highlights.map((highlight, idx) => (
      <Badge key={idx} variant="secondary" className="text-xs">
        {highlight}
      </Badge>
    ));
  }, [highlights]);

  const memoizedCallMoments = useMemo(() => {
    return callMoments.slice(-5).map((moment, idx) => (
      <div key={idx} className="text-xs p-2 rounded bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs h-4">
            {formatDuration(moment.time)}
          </Badge>
          <span className="font-medium text-accent capitalize">{moment.keyword}</span>
        </div>
        <div className="text-muted-foreground truncate">{moment.text}</div>
      </div>
    ));
  }, [callMoments]);

  const memoizedScriptText = useMemo(() => {
    return callScript ? callScript : <span className="text-muted-foreground">No script yet</span>;
  }, [callScript]);

  // Memoized formatDuration to prevent recalculation
  const memoizedFormattedDuration = useMemo(() => {
    return formatDuration(duration);
  }, [duration]);

  const memoizedFormattedRecordingDuration = useMemo(() => {
    return formatDuration(recordingDuration);
  }, [recordingDuration]);

  // build payload
  const buildPayload = useCallback((): CallComposerData => ({
    lead,
    callType: "outgoing",
    duration,
    timestamp: new Date().toISOString(),
    outcome: outcomeType
      ? {
          id: `${Date.now()}`,
          type: outcomeType as DispositionCode,
          description: outcomeDescription,
          nextAction,
          followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
          priority: (priority || "medium") as "low" | "medium" | "high" | "urgent",
          tags: wrapTags,
        }
      : null,
    notes,
    recording,
    scripts: [
      {
        id: "1",
        title: "Initial Contact",
        content: "Hi {name}, this is {your_name} from Bridge. I'm calling about your interest in our {course} programme. Do you have a moment to chat?",
        context: "first_contact",
        confidence: 95,
        suggestedTiming: "09:00–17:00",
        tags: ["initial", "course-inquiry"],
      },
      {
        id: "2",
        title: "Follow‑up",
        content: "Hi {name}, just following up on our chat about {course}. Have you had a chance to think about next steps?",
        context: "follow_up",
        confidence: 88,
        suggestedTiming: "14:00–16:00",
        tags: ["follow-up", "engagement"],
      },
    ],
    aiInsights,
    compliance,
    assignedTo,
    scriptScenario,
    ai: { script: callScript || undefined },
  }), [lead, duration, outcomeType, outcomeDescription, nextAction, followUpDate, priority, notes, recording, aiInsights, compliance, wrapTags, assignedTo]);

  // Recording state management
  useEffect(() => {
    if (isRecording && isCallActive) {
      startRecording();
    } else if (!isRecording) {
      stopRecording();
    }
  }, [isRecording, isCallActive, startRecording, stopRecording]);

  // autosave
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(buildPayload()));
    } catch {}
  }, [buildPayload, draftKey]);

  // load draft and trigger AI analysis
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CallComposerData;
      setNotes(parsed.notes || []);
      setOutcomeType((parsed.outcome?.type as DispositionCode) || "");
      setOutcomeDescription(parsed.outcome?.description || "");
      setNextAction(parsed.outcome?.nextAction || "");
      setFollowUpDate(parsed.outcome?.followUpDate ? new Date(parsed.outcome.followUpDate).toISOString().slice(0, 16) : "");
      setPriority((parsed.outcome?.priority as any) || "");
      setRecording(parsed.recording || null);
      // Duration is now managed by the state machine hook
      setCompliance(parsed.compliance || { consentRecorded: false, doNotCall: false });
      // restore optional
      if ((parsed as any).assignedTo) setAssignedTo((parsed as any).assignedTo);
      if (parsed.outcome?.tags?.length) setWrapTags(parsed.outcome.tags);
    } catch {}
  }, [isOpen, draftKey]);

  // handlers
  const handleStartCall = useCallback(() => {
    setCallJustCompleted(false); // Reset completed state
    if (isRecording) setIsRecording(false);
    startCall();
  }, [isRecording, startCall]);

  const handleEndCall = useCallback(() => {
    if (isRecording) setIsRecording(false);
    endCall();
  }, [isRecording, endCall]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      const rec: CallRecording = {
        id: `${Date.now()}`,
        duration: recordingDuration,
        transcription: recording?.transcription || "Transcription will appear here…",
        qualityScore: recording?.qualityScore ?? 85,
        sentiment: recording?.sentiment ?? "positive",
        keyTopics: recording?.keyTopics ?? ["course inquiry", "next steps"],
        aiInsights: recording?.aiInsights ?? ["High interest", "Costs discussed"],
      };
      setRecording(rec);
      setIsRecording(false);
      // Recording duration is now managed by the state machine hook
    } else {
      setIsRecording(true);
      // Recording duration is now managed by the state machine hook
    }
  }, [isRecording, recordingDuration, recording]);

  const addNote = useCallback((content: string, type: CallNote["type"] = "general") => {
    if (!content.trim()) return;
    const note: CallNote = { id: `${Date.now()}`, content: content.trim(), timestamp: new Date().toISOString(), type, tags: [] };
    setNotes((prev) => [note, ...prev]);
    setNewNote("");
  }, []);

  const analyzeCallWithAI = useCallback(async () => {
    console.log("🧠 Starting AI analysis...", { leadUid: lead?.uid, isAnalyzing });
    if (!lead?.uid) return;
    
    // Clear existing debounce
    if (analysisDebounceRef.current) {
      clearTimeout(analysisDebounceRef.current);
    }
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Debounce the analysis call
    analysisDebounceRef.current = window.setTimeout(async () => {
      // Create new abort controller
      abortControllerRef.current = new AbortController();
      
      setIsAnalyzing(true);
      
      try {
        const leadId = String(lead.uid);
        const [pred, triage] = await Promise.all([
          aiLeadsApi.predictBatch([leadId]),
          aiLeadsApi.triage([leadId])
        ]);
        
        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

      // Extract probability with better error handling
      const pEntry = pred?.predictions?.find((p: any) => String(p.lead_id) === leadId);
      let probabilityPct: number;
      
      if (typeof pEntry?.probability === 'number') {
        // ML API returns probability as decimal (0.0-1.0), convert to percentage
        probabilityPct = Math.round(pEntry.probability * 100);
      } else if (lead?.aiInsights?.conversionProbability) {
        // Lead data already has it as percentage
        probabilityPct = lead.aiInsights.conversionProbability;
      } else if (typeof lead?.mlProbability === 'number') {
        // Fallback to raw ML probability (decimal), convert to percentage
        probabilityPct = Math.round(lead.mlProbability * 100);
      } else {
        // Default fallback
        probabilityPct = 50;
      }

      // Extract next action + reasons with fallbacks
      const triageItem = triage?.items?.find((i: any) => String(i.id) === leadId);
      const nextAction = triageItem?.next_action || lead?.aiInsights?.recommendedAction || lead?.nextAction || "Follow up with value props";
      const reasons = Array.isArray(triageItem?.reasons) ? triageItem.reasons.slice(0, 3) : (triage?.summary?.top_reasons || ["High engagement potential", "Recent activity", "Strong lead score"]);

      // Enhanced AI insights with more context
      const riskAssessment = probabilityPct > 80 ? "Low risk - high conversion potential" : 
                           probabilityPct > 60 ? "Medium risk - good potential with nurturing" : 
                           "High risk - needs focused engagement strategy";

      setAiInsights((prev) => ({
        ...prev,
        conversionProbability: probabilityPct,
        callStrategy: reasons?.length ? `Focus: ${reasons.join(", ")}. Next: ${nextAction}` : prev.callStrategy,
        followUpRecommendations: [
          nextAction,
          `Schedule follow-up in ${probabilityPct > 70 ? '24-48 hours' : '3-5 days'}`,
          `Send ${lead?.courseInterest || 'course'} information package`,
          ...(prev.followUpRecommendations || []).slice(0, 1)
        ],
        riskAssessment,
      }));
      
      setLastAnalysisTime(new Date());
      setAnalysisError(null);
      console.log("✅ AI analysis completed!", {
        probabilityPct,
        callStrategy: reasons?.length ? `Focus: ${reasons.join(", ")}. Next: ${nextAction}` : "Default strategy",
        riskAssessment
      });
      } catch (e: any) {
        // Don't show error if request was aborted
        if (e.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
          return;
        }
        
        setAnalysisError("AI analysis unavailable; using last known values");
        setLastAnalysisTime(new Date());
        console.warn('AI analysis failed; using lead data fallbacks', e);
        try { push({ title: "Analysis failed", description: "Could not refresh AI insights", variant: "destructive" }); } catch {}
      // Fallback to lead data if AI fails
      const fallbackProbability = lead?.aiInsights?.conversionProbability || 
                                  (lead?.mlProbability ? Math.round(lead.mlProbability * 100) : 0) || 
                                  Math.min(lead?.leadScore || 50, 100);
      
      setAiInsights((prev) => ({
        ...prev,
        conversionProbability: fallbackProbability,
        callStrategy: lead?.aiInsights?.recommendedAction || "Focus on course benefits and career outcomes",
        riskAssessment: "Medium risk - standard engagement approach",
      }));
      } finally {
        setIsAnalyzing(false);
      }
    }, 500); // 500ms debounce
  }, [lead, push]);

  // Auto-trigger AI analysis when component opens with a lead (only once)
  const [hasInitialAnalysis, setHasInitialAnalysis] = useState(false);
  
  useEffect(() => {
    if (isOpen && lead?.uid && !isAnalyzing && !hasInitialAnalysis) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        analyzeCallWithAI();
        setHasInitialAnalysis(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    
    // Reset flag when component closes
    if (!isOpen) {
      setHasInitialAnalysis(false);
    }
  }, [isOpen, lead?.uid, analyzeCallWithAI, isAnalyzing, hasInitialAnalysis]);

  // Cleanup: abort requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (analysisDebounceRef.current) {
        clearTimeout(analysisDebounceRef.current);
      }
      if (scenarioDebounceRef.current) {
        clearTimeout(scenarioDebounceRef.current);
      }
    };
  }, []);

  // Generate AI call script function
  const generateCallScript = useCallback(async () => {
    console.log("🎯 Starting script generation...", { leadUid: lead?.uid, isGeneratingScript });
    if (!lead?.uid || isGeneratingScript) return;
    
    setIsGeneratingScript(true);
    try {
      // Create the script generation prompt based on lead data and guardrails
      const response = await aiLeadsApi.generateCallScript(buildScriptPayload("application_call"));
      
      if (response?.script) {
        setCallScript(response.script);
        console.log("✅ Real AI script generated successfully!", response.script.substring(0, 100) + "...");
        console.log("🤖 AI Metadata:", response.metadata);
      } else {
        throw new Error("No script returned from AI service");
      }
    } catch (error) {
      console.warn("❌ Failed to generate AI script, using fallback:", error);
      
      // Fallback to template-based script if AI fails
      const fallbackScript = `Hi ${lead.name}, this is [Your Name] from [Company]. 

I hope I'm catching you at a good time. I'm calling regarding your interest in ${lead.courseInterest || 'our courses'}${lead.academicYear ? ` for ${lead.academicYear}` : ''}.

${aiInsights.conversionProbability > 70 ? 
  "I noticed you've shown strong interest, and I'd love to help you take the next step." :
  "I wanted to personally reach out to see how I can help with your academic goals."
}

${lead.aiInsights?.recommendedAction ? 
  `Based on your profile, I think ${lead.aiInsights.recommendedAction.toLowerCase()} would be the best next step.` :
  "I'd love to understand what you're looking for and see how we can help."
}

Do you have a few minutes to chat about your goals and how we might be able to support you?

${compliance.consentRecorded ? "" : "Also, I want to let you know this call may be recorded for quality purposes. Is that okay with you?"}

[Note: This is a fallback script - AI generation failed]`;
      
      setCallScript(fallbackScript);
    } finally {
      setIsGeneratingScript(false);
    }
  }, [lead, aiInsights, isGeneratingScript, compliance.consentRecorded]);

  // Script templates (Aircall/Gong style quick intents)
  const scriptTemplates = useMemo(() => ([
    { id: "application_call", label: "Application Call", description: "Drive to 1‑1/interview or UCAS submission", frameworks: ["MEDDIC", "Challenger"],
      scenarioInstructions: "Use MEDDIC to qualify and Challenger to teach/tailor. Aim to book 1‑1 or interview, or guide to submit via UCAS. Include links and objection handling." },
    { id: "portfolio_call", label: "Portfolio Call", description: "Coach on portfolio prep & submission", frameworks: ["Consultative", "Challenger"],
      scenarioInstructions: "Coach on portfolio expectations, timelines, and examples. Anticipate objections about quality/time/resources; include links to guidelines and examples." },
    { id: "ucas_decline_reminder", label: "UCAS Decline", description: "Recover likely declines with clear options", frameworks: ["MEDDIC", "SPIN"],
      scenarioInstructions: "Clarify decision criteria and timeline; address concerns; present clear next steps and alternatives. Keep tone supportive; provide UCAS links." },
    { id: "post_1_1_followup", label: "Post 1‑1 Follow‑up", description: "Summarize, confirm, progress", frameworks: ["Challenger", "Next Steps"],
      scenarioInstructions: "Summarize the 1‑1, restate value, surface gaps, and set a concrete next step (application/interview). Include links and deadlines." },
  ]), []);

  // Build payload for /api/ai/generate-script using selected template
   const buildScriptPayload = useCallback((templateId: string) => {
     const t = scriptTemplates.find((x) => x.id === templateId) || scriptTemplates[0];
     const probabilityPct = aiInsights.conversionProbability;
     const level = probabilityPct > 80 ? "high" : probabilityPct > 60 ? "medium" : "low";
     const links = {
       ucas_apply: "https://www.ucas.com/undergraduate/applying-to-university/applying",
       programmes: `https://bridge.example.edu/programmes/${encodeURIComponent(lead?.courseInterest || "")}`,
       portfolio_guidelines: "https://bridge.example.edu/apply/portfolio-guidelines",
       campus_visits: "https://bridge.example.edu/visit",
       faqs: "https://bridge.example.edu/faq",
     };
     return {
       lead_data: {
         name: lead?.name,
         course_interest: lead?.courseInterest,
         academic_year: lead?.academicYear,
         conversion_probability: probabilityPct,
         best_contact_time: lead?.aiInsights?.bestContactTime,
         recommended_action: lead?.aiInsights?.recommendedAction,
         lead_score: lead?.leadScore,
       },
       guardrails: {
         tone: "professional and friendly",
         max_length: 300,
         include_sections: [
           "greeting",
           "purpose",
           ...(t?.frameworks || []),
           "qualification",
           "objection_handling",
           "links",
           "next_steps",
         ],
         compliance_notes: [
           "mention recording if applicable",
           "respect their time",
           "ask for permission to continue",
         ],
       },
       context: {
         call_strategy: `${aiInsights.callStrategy} | Scenario: ${t?.label || 'Default'}. ${t?.scenarioInstructions || 'Standard call approach'}`,
         urgency: lead?.aiInsights?.urgency || "medium",
         contact_attempts: lead?.contactAttempts || 0,
         scenario: t?.id || 'default',
         framework: (t?.frameworks || []).join(", "),
         links,
         conversion_level: level,
       },
     };
   }, [scriptTemplates, aiInsights.callStrategy, aiInsights.conversionProbability, lead]);

  const generateScriptFor = useCallback(async (templateId: string) => {
    if (!lead?.uid || isGeneratingScript) return;
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsGeneratingScript(true);
    setScriptError(null);
    setSelectedScriptScenario(templateId);
    
    try {
      const payload = buildScriptPayload(templateId);
      const response = await aiLeadsApi.generateCallScript(payload);
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      setCallScript(response?.script || "");
      if (!response?.script) throw new Error("No script returned");
    } catch (e: any) {
      // Don't show error if request was aborted
      if (e.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      setScriptError(e?.message || "Failed to generate script");
      // Fallback to a template-based script and notify user
      const fallback = `Hi ${lead?.name || 'there'}, this is [Your Name] from [Company].\n\nI'm calling about ${lead?.courseInterest || 'your enquiry'}. ${aiInsights.conversionProbability > 70 ? 'It looks like you\'re highly engaged—' : ''}could I help with next steps?\n\n[Fallback script – AI unavailable]`;
      setCallScript(fallback);
      try { push({ title: "AI unavailable", description: "Showing fallback script", variant: "default" }); } catch {}
    } finally {
      setIsGeneratingScript(false);
    }
  }, [lead?.uid, isGeneratingScript, buildScriptPayload, push, aiInsights.conversionProbability, lead?.name, lead?.courseInterest]);

  // Scenario mapping and debounced switching
  const scenarioToTemplate = useMemo(() => ({
    application: "application_call",
    portfolio: "portfolio_call",
    decline: "ucas_decline_reminder",
    post_1_1: "post_1_1_followup",
  } as const), []);

  const handleScenarioSwitch = useCallback((s: typeof scriptScenario) => {
    setScriptScenario(s);
    if (scenarioDebounceRef.current) {
      clearTimeout(scenarioDebounceRef.current);
    }
    scenarioDebounceRef.current = window.setTimeout(() => {
      generateScriptFor(scenarioToTemplate[s]);
    }, 300);
  }, [generateScriptFor, scenarioToTemplate]);

  // Prefetch default script when entering active state
  useEffect(() => {
    if (callState === "active") {
      const tid = scenarioToTemplate[scriptScenario];
      generateScriptFor(tid);
    }
  }, [callState, scriptScenario, scenarioToTemplate, generateScriptFor]);


  // Explain conversion score
  const explainScore = useCallback(async () => {
    if (!lead?.uid) return;
    
    try {
      const explanation = await aiLeadsApi.explainScore(lead.uid);
      console.log("Score explanation:", explanation);
      // TODO: Show explanation in a tooltip or modal  
      alert(`Score factors: ${explanation?.message || explanation?.factors?.join(', ') || 'Analysis complete'}`);
    } catch (error) {
      console.warn("Failed to explain score:", error);
      alert("Score explanation not available");
    }
  }, [lead?.uid]);

  // Add highlight during call
  const addHighlight = useCallback((highlightType: string) => {
    const timestamp = new Date().toLocaleTimeString(undefined, { timeStyle: 'short' });
    const note = `[${timestamp}] ${highlightType} discussed`;
    
    // Add to call notes
    setNotes(prev => [...prev, { 
      id: `highlight-${Date.now()}`, 
      content: note, 
      timestamp: new Date().toISOString(),
      type: "general",
      tags: [highlightType.toLowerCase()]
    }]);
    
    // Add to highlights for wrap-up tags
    setHighlights(prev => [...prev, highlightType]);
    
    // Add to wrap-up tags if not already present
    setWrapTags(prev => prev.includes(highlightType.toLowerCase()) ? prev : [...prev, highlightType.toLowerCase()]);
    
    console.log(`Added highlight: ${highlightType}`);
  }, []);

  // Detect moments in transcription
  const detectCallMoments = useCallback((text: string, recordingTime: number) => {
    const keywords = ['pricing', 'price', 'cost', 'timeline', 'deadline', 'objection', 'concern', 'next steps', 'follow up', 'decision'];
    const lowerText = text.toLowerCase();
    
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        setCallMoments(prev => {
          // Avoid duplicates within 10 seconds
          const recent = prev.find(m => Math.abs(m.time - recordingTime) < 10 && m.keyword === keyword);
          if (recent) return prev;
          
          return [...prev, { time: recordingTime, keyword, text: text.substring(0, 100) + '...' }];
        });
      }
    });
  }, []);

  // AI Transcription functions
  const startTranscription = useCallback(async () => {
    if (!isRecording || isTranscribing) return;
    
    setIsTranscribing(true);
    setCallTranscription("");
    setTranscriptionChunks([]);
    
    try {
      // Simulate real-time transcription (in production, this would connect to speech-to-text service)
      const mockTranscriptionInterval = setInterval(() => {
        if (isRecording) {
          const mockChunks = [
            "Agent: Hi Arthur, this is [Agent Name] from [Company].",
            "Agent: I hope I'm catching you at a good time regarding your interest in Foundation Certificate in Marketing.",
            "Lead: Hi, yes actually this is a good time to talk.",
            "Agent: Great! I wanted to discuss your application and see how I can help with the next steps.",
            "Lead: Yes, I'm quite interested but had some questions about the program structure.",
            "Agent: Of course, I'd be happy to answer those. What specific aspects would you like to know about?",
            "Lead: Well, I'm particularly interested in the practical elements and how it fits with working professionals.",
            "Agent: That's a great question. The program is specifically designed for working professionals with flexible scheduling..."
          ];
          
          const randomChunk = mockChunks[Math.floor(Math.random() * mockChunks.length)];
          if (randomChunk) {
            setTranscriptionChunks(prev => [...prev, randomChunk]);
            setCallTranscription(prev => prev + (prev ? '\n\n' : '') + randomChunk);
            
            // Detect moments in this chunk
            detectCallMoments(randomChunk, recordingDuration);
          }
        }
      }, 3000);
      
      // Store interval for cleanup
      (window as any).transcriptionInterval = mockTranscriptionInterval;
      
    } catch (error) {
      console.error("Failed to start transcription:", error);
      setIsTranscribing(false);
    }
  }, [isRecording, isTranscribing]);

  const stopTranscription = useCallback(() => {
    if ((window as any).transcriptionInterval) {
      clearInterval((window as any).transcriptionInterval);
      (window as any).transcriptionInterval = null;
    }
    setIsTranscribing(false);
  }, []);

  // Generate AI summary of the call
  const generateCallSummary = useCallback(async () => {
    if (!callTranscription || isGeneratingSummary) return;
    
    setIsGeneratingSummary(true);
    try {
      // Simulate AI summary generation (in production, this would call AI service)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate smart summary based on transcription and lead data
      const leadName = lead?.name || 'Lead';
      const courseInterest = lead?.courseInterest || 'course inquiry';
      const recommendedAction = lead?.aiInsights?.recommendedAction || 'Follow up with detailed course information and next steps';
      
      const summary = `Call with ${leadName} regarding ${courseInterest}.

Key Points:
• Lead expressed strong interest in program structure and practical elements
• Discussed flexibility for working professionals
• Questions addressed about scheduling and course delivery
• Lead seems engaged and motivated to proceed

Outcome: Positive conversation, lead showed genuine interest and asked relevant questions about program fit for working professionals.

Next Action: ${recommendedAction}

Lead Quality: ${aiInsights.conversionProbability > 70 ? 'High' : aiInsights.conversionProbability > 40 ? 'Medium' : 'Low'} - ${aiInsights.conversionProbability}% conversion probability`;

      setOutcomeDescription(summary);
    } catch (error) {
      console.warn("Failed to generate AI summary:", error);
      setOutcomeDescription("AI summary generation failed. Manual description required.");
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [callTranscription, isGeneratingSummary, lead, aiInsights]);

  // Auto-start transcription when recording starts
  useEffect(() => {
    if (isRecording && !isTranscribing) {
      startTranscription();
    } else if (!isRecording && isTranscribing) {
      stopTranscription();
    }
  }, [isRecording, isTranscribing, startTranscription, stopTranscription]);

  // Copy summary removed from header (kept logic minimal and focused)

  const handleSave = useCallback(() => {
    if (isCallActive) { alert("End the call before saving."); return; }
    const payload = buildPayload();
    if (!payload.outcome && notes.length === 0) { alert("Select a disposition or add at least one note."); return; }
    onSaveCall(payload);
    try { localStorage.removeItem(draftKey); } catch {}
    onClose();
  }, [isCallActive, buildPayload, notes.length, onSaveCall, draftKey, onClose]);

  // wrap-up ACW countdown (inline, no sheet)
  useEffect(() => {
    if (callState !== "wrapup") return;
    setWrapAcwSeconds(90);
    const t = setInterval(() => {
      setWrapAcwSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [callState]);

  const wrapRequirementsMet = Boolean(outcomeType && nextAction);

  useEffect(() => {
    if (callState === "wrapup" && wrapAutoEnd && wrapRequirementsMet) {
      const t = setTimeout(() => { /* TODO: Add auto-end handler */ }, 300);
      return () => clearTimeout(t);
    }
  }, [callState, wrapAutoEnd, wrapRequirementsMet]);

  // shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "r") { e.preventDefault(); if (isCallActive) toggleRecording(); }
      else if (e.key === "n") { e.preventDefault(); if (newNote.trim()) addNote(newNote); }
      else if (e.key === "s" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, isCallActive, toggleRecording, newNote, addNote, handleSave]);

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 bg-surface-overlay/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden focus-ring" onClick={(e) => e.stopPropagation()}>
        {/* Header - Compact Design */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background">
          {/* Left: Avatar, Name, Phone/Email, Stage */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative">
              <div className="p-2 rounded-full bg-gradient-to-br from-success/20 to-success/10 border border-success/30">
                <Phone className="h-4 w-4 text-success" />
              </div>
              {callState === "active" && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse"></div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground truncate">Call with {lead.name}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="truncate">{lead.phone}</span>
                {lead.email && <span className="hidden sm:inline">• {lead.email}</span>}
                {/* Stage indicator */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/60 text-xs text-muted-foreground ml-2 transition-all">
                  {callState === "active" ? <Phone className="h-3 w-3" /> : callState === "dialing" ? <Loader2 className="h-3 w-3 animate-spin" /> : callState === "wrapup" ? <CheckCircle2 className="h-3 w-3" /> : <Target className="h-3 w-3" />}
                  <span>{callState === "active" ? "In‑Call" : callState === "dialing" ? "Dialing" : callState === "wrapup" ? "Wrap‑Up" : "Pre‑Call"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Center: Single conversion badge */}
          <div className="hidden md:flex items-center">
            <Badge 
              variant="outline" 
              title="Conversion probability"
              className={`px-3 py-1 font-medium ${
                aiInsights.conversionProbability > 80 ? 'border-success/50 text-success bg-success/5' :
                aiInsights.conversionProbability > 60 ? 'border-warning/50 text-warning bg-warning/5' :
                aiInsights.conversionProbability > 40 ? 'border-muted-foreground/50 text-foreground bg-muted/5' :
                'border-destructive/50 text-destructive bg-destructive/5'
              }`}
            >
              <Brain className="h-3.5 w-3.5 mr-1" />
              {aiInsights.conversionProbability}%
            </Badge>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2">
            {(callState === "active" || recording) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setTranscriptOpen(true)} 
                title="Open transcript"
                className="hover:bg-accent/10 hover:border-accent/50"
              >
                <FileText className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Transcript</span>
              </Button>
            )}
            {/* AI menu button */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAiMenuOpen((v) => !v)}
                className="hover:bg-muted/50"
                title="AI tools"
              >
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">AI</span>
              </Button>
              {aiMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white border border-border rounded-md shadow-lg z-50 p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => { analyzeCallWithAI(); setAiMenuOpen(false); }}
                  >
                    <Loader2 className="h-3.5 w-3.5 mr-2" /> Refresh analysis
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => { generateScriptFor(scenarioToTemplate[scriptScenario]); setAiMenuOpen(false); }}
                  >
                    <FileText className="h-3.5 w-3.5 mr-2" /> Generate script
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => { explainScore(); setAiMenuOpen(false); }}
                  >
                    <Info className="h-3.5 w-3.5 mr-2" /> Explain score
                  </Button>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-muted/50">
              <X className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleSave} 
              size="sm" 
              className="btn-success px-3"
              disabled={isCallActive}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>

        {/* Prospect quick facts bar */}
        {mode === "full" && (
          <div className="px-6 py-2 border-b border-border/50 bg-muted/20 grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            <div className="text-muted-foreground">Course: <span className="text-foreground font-medium">{lead.courseInterest || "—"}</span></div>
            <div className="text-muted-foreground">Year: <span className="text-foreground font-medium">{lead.academicYear || "—"}</span></div>
            <div className="text-muted-foreground">Campus: <span className="text-foreground font-medium">{lead.campusPreference || "—"}</span></div>
            <div className="text-muted-foreground">Enquiry: <span className="text-foreground font-medium">{lead.enquiryType || "—"}</span></div>
            <div className="text-muted-foreground">Last contact: <span className="text-foreground font-medium">{lead.lastContact || "—"}</span></div>
            <div className="text-muted-foreground">Attempts: <span className="text-foreground font-medium">{lead.contactAttempts ?? 0}</span></div>
          </div>
        )}

        <div className="h-[calc(90vh-120px)] overflow-y-auto">
          {/* New centered layout with better UX */}
          <div className="max-w-6xl mx-auto p-6">
            {/* 3-Lane Grid Layout - Persistent structure */}
            <div className={`grid gap-6 mb-6 ${
              callState === "wrapup" 
                ? "grid-cols-1 lg:grid-cols-2" // Wrap-up: 2 lanes (Controls + Wrap-up form)
                : callState === "active"
                ? "grid-cols-1 lg:grid-cols-3" // Active: 3 lanes (Controls + Lead Summary + AI Script)
                : "grid-cols-1 lg:grid-cols-2" // Idle/Dialing: 2 lanes centered (Controls + Lead Summary)
            }`}>
              
              {/* Lane 1: Call Controls - Always visible */}
              <div className={`order-2 lg:order-1 ${
                callState === "wrapup" ? "lg:col-span-1" : 
                callState === "active" ? "lg:col-span-1" : 
                "lg:col-span-1"
              }`}>
                <Card className="h-full">
                  <CardContent className="p-6 flex flex-col justify-center h-full">
                    {callState === "active" ? (
                      <div className="text-center space-y-4">
                        <div className="relative p-6 rounded-2xl success-bg border-2 border-success/30">
                          <div className="absolute inset-0 rounded-2xl bg-success/5 animate-pulse"></div>
                          <div className="relative">
                            <div className="text-3xl font-bold text-success mb-2">{memoizedFormattedDuration}</div>
                            <div className="text-sm font-medium text-success">Call Active</div>
                            <div className="flex items-center justify-center mt-2">
                              <div className="w-2 h-2 bg-success rounded-full animate-pulse mr-2"></div>
                              <span className="text-xs text-success">Connected</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleEndCall}
                            size="lg" 
                            className="flex-1 bg-slate-600 hover:bg-slate-700 text-slate-50 text-lg py-4 rounded-xl shadow-lg hover:shadow-xl transition-all"
                          >
                            <PhoneOff className="h-5 w-5 mr-2" />
                            End Call
                          </Button>
                          
                          {/* More Controls */}
                          <div className="relative">
                            <Button 
                              onClick={() => setShowMoreControls(!showMoreControls)}
                              size="lg" 
                              variant="outline"
                              className="px-4 py-4 rounded-xl border-slate-300 hover:bg-slate-50"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                            {showMoreControls && (
                              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                                <div className="p-1 space-y-1">
                                  <Button
                                    onClick={() => {
                                      setIsMuted(!isMuted);
                                      setShowMoreControls(false);
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                  >
                                    {isMuted ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
                                    {isMuted ? "Unmute" : "Mute"}
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setIsOnHold(!isOnHold);
                                      setShowMoreControls(false);
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                  >
                                    {isOnHold ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                                    {isOnHold ? "Resume" : "Hold"}
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setShowTransferModal(true);
                                      setShowMoreControls(false);
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start"
                                  >
                                    <PhoneForwarded className="h-4 w-4 mr-2" />
                                    Transfer
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Button 
                            onClick={toggleRecording} 
                            variant={isRecording ? "destructive" : "outline"} 
                            size="lg" 
                            className={`w-full text-base py-3 rounded-xl transition-all ${
                              isRecording 
                                ? "bg-accent hover:bg-accent/90 text-accent-foreground border-accent" 
                                : "hover:bg-muted/50"
                            }`}
                          >
                            {isRecording ? (
                              <>
                                <Square className="h-4 w-4 mr-2" />
                                Stop Recording ({formatDuration(recordingDuration)})
                              </>
                            ) : (
                              <>
                                <Mic className="h-4 w-4 mr-2" />
                                Start Recording
                              </>
                            )}
                          </Button>
                          
                          {/* Real-time transcription display */}
                          {isRecording && isTranscribing && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                  <span className="text-xs font-medium text-slate-600">Live Transcription</span>
                                </div>
                              </div>
                              <div className="max-h-20 overflow-y-auto text-xs text-slate-700 bg-white p-2 rounded border">
                                {transcriptionChunks.length > 0 ? (
                                  <div className="space-y-1">
                                    {transcriptionChunks.slice(-3).map((chunk, index) => (
                                      <div key={index} className="opacity-75 last:opacity-100">
                                        {chunk}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-slate-400 italic">Listening...</div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* GDPR Compliance - During Call */}
                          {isRecording && (
                            <div className="p-3 status-info-bg border border-info/20 rounded-lg">
                              <div className="text-xs font-medium text-info mb-2">Call Compliance</div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox 
                                    id="consent_active" 
                                    checked={compliance.consentRecorded} 
                                    onCheckedChange={(v) => setCompliance((p) => ({ ...p, consentRecorded: Boolean(v) }))} 
                                  />
                                  <label htmlFor="consent_active" className="text-xs text-info">Recording consent obtained</label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox 
                                    id="dnc_active" 
                                    checked={compliance.doNotCall} 
                                    onCheckedChange={(v) => setCompliance((p) => ({ ...p, doNotCall: Boolean(v) }))} 
                                  />
                                  <label htmlFor="dnc_active" className="text-xs text-info">Mark as Do Not Call</label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : callState === "dialing" ? (
                      <div className="text-center space-y-4">
                        <div className="relative p-6 rounded-2xl accent-bg border-2 border-accent/30">
                          <div className="absolute inset-0 rounded-2xl bg-accent/5 animate-pulse"></div>
                          <div className="relative">
                            <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-3" />
                            <div className="text-lg font-semibold text-accent mb-1">Dialing…</div>
                            <div className="text-sm text-accent/70">Connecting to {lead?.name}</div>
                          </div>
                        </div>
                        <Button 
                          onClick={() => {/* TODO: Add cancel call handler */}} 
                          variant="outline" 
                          size="lg" 
                          className="w-full text-lg py-4 rounded-xl"
                        >
                          Cancel Call
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        {callJustCompleted ? (
                          <div className="space-y-4">
                            <div className="relative p-6 rounded-2xl success-bg border border-success/20">
                              <div className="text-xl font-bold text-success mb-2">Call Ended</div>
                              <div className="text-sm text-success mb-3">Call has been saved successfully</div>
                              <div className="flex items-center justify-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-success" />
                                <span className="font-semibold text-success">Ready for next call</span>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Close this window or start a new call when ready.
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                              <div className="text-xl font-bold text-foreground mb-2">Ready to Call</div>
                              <div className="text-sm text-muted-foreground mb-3">Click to start the call</div>
                              <div className="flex items-center justify-center gap-2 text-sm">
                                <Target className="h-4 w-4 text-slate-600" />
                                <span className="font-semibold text-slate-600">{aiInsights.conversionProbability}% conversion</span>
                              </div>
                            </div>
                            <Button 
                              onClick={handleStartCall} 
                              size="lg" 
                              className="w-full btn-forest text-xl py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                            >
                              <Phone className="h-6 w-6 mr-3" />
                              Start Call
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Lead Summary - Hidden after call completion */}
              {/* Lane 2: Lead Summary OR Wrap-up Form */}
              <div className={`order-1 lg:order-2 ${
                callState === "wrapup" ? "lg:col-span-1" : 
                callState === "active" ? "lg:col-span-1" : 
                "lg:col-span-1"
              }`}>
                {callState === "wrapup" ? (
                  /* Wrap-up Form - moved from bottom section */
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-accent" />
                          Call Wrap-up
                          <Badge variant="outline" className="text-xs">ACW: {wrapAcwSeconds}s</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id="auto_end_acw" 
                            checked={wrapAutoEnd} 
                            onCheckedChange={(v) => setWrapAutoEnd(Boolean(v))} 
                          />
                          <label htmlFor="auto_end_acw" className="text-sm text-muted-foreground">Auto-end when done</label>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column: Required fields */}
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">Disposition *</label>
                            <Select value={outcomeType} onValueChange={(v) => setOutcomeType(v as DispositionCode)}>
                              <SelectTrigger><SelectValue placeholder="Select disposition" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="connected_interested">Connected – Interested</SelectItem>
                                <SelectItem value="connected_not_interested">Connected – Not Interested</SelectItem>
                                <SelectItem value="callback_scheduled">Callback Scheduled</SelectItem>
                                <SelectItem value="left_voicemail">Left Voicemail</SelectItem>
                                <SelectItem value="no_answer">No Answer</SelectItem>
                                <SelectItem value="wrong_number">Wrong Number</SelectItem>
                                <SelectItem value="escalated">Escalated</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-foreground">Description</label>
                              {callTranscription && (
                                <Button 
                                  onClick={generateCallSummary}
                                  disabled={isGeneratingSummary}
                                  size="sm" 
                                  variant="outline" 
                                  className="text-xs h-6 border-blue-300 text-blue-700 hover:bg-blue-50"
                                >
                                  {isGeneratingSummary ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                      <Brain className="h-3 w-3 mr-1" />
                                      AI Summary
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                            <Textarea 
                              placeholder={callTranscription ? "Click 'AI Summary' to generate description from call transcription..." : "Brief description of the call outcome…"} 
                              className="min-h-[100px]" 
                              value={outcomeDescription} 
                              onChange={(e) => setOutcomeDescription(e.target.value)} 
                            />
                          </div>
                        </div>
                        
                        {/* Right Column: Next action, priority, follow-up */}
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">Next Action *</label>
                            <Input 
                              placeholder="What needs to happen next?" 
                              value={nextAction} 
                              onChange={(e) => setNextAction(e.target.value)} 
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">Priority</label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                              <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">Follow‑up</label>
                            <div className="space-y-2">
                              <Input 
                                type="datetime-local" 
                                value={followUpDate} 
                                onChange={(e) => setFollowUpDate(e.target.value)} 
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-6"
                                  onClick={() => {
                                    const d = new Date();
                                    d.setHours(d.getHours() + 2, 0, 0, 0);
                                    setFollowUpDate(d.toISOString().slice(0, 16));
                                  }}
                                >
                                  +2h
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-6"
                                  onClick={() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + 1);
                                    d.setHours(9, 0, 0, 0);
                                    setFollowUpDate(d.toISOString().slice(0, 16));
                                  }}
                                >
                                  Tomorrow 09:00
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-6"
                                  onClick={() => {
                                    const d = new Date();
                                    const day = d.getDay();
                                    const daysToMon = (8 - day) % 7 || 7;
                                    d.setDate(d.getDate() + daysToMon);
                                    d.setHours(10, 0, 0, 0);
                                    setFollowUpDate(d.toISOString().slice(0, 16));
                                  }}
                                >
                                  Next Mon 10:00
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* QA Scorecard - Tier C (post-call only) */}
                      <div className="mt-6">
                        <Disclosure 
                          title="Call Quality Scorecard" 
                          icon={<Target className="h-4 w-4 text-muted-foreground" />}
                        >
                          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            {Object.entries({
                              opening: "Opening & Rapport",
                              discovery: "Discovery Questions", 
                              presentation: "Solution Presentation",
                              objection_handling: "Objection Handling",
                              closing: "Closing & Next Steps"
                            }).map(([key, label]) => (
                              <div key={key} className="flex items-center justify-between">
                                <span className="text-sm text-foreground">{label}</span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((score) => (
                                    <Button
                                      key={score}
                                      onClick={() => setQaScores(prev => ({ ...prev, [key]: score }))}
                                      variant={qaScores[key] === score ? "default" : "outline"}
                                      size="sm"
                                      className={`w-8 h-8 p-0 text-xs ${
                                        qaScores[key] === score 
                                          ? "bg-accent text-white" 
                                          : "hover:bg-accent/10"
                                      }`}
                                    >
                                      {score}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <div className="pt-2 mt-3 border-t border-slate-300">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">Overall Score</span>
                                <Badge variant="outline" className="text-sm">
                                  {Object.values(qaScores).reduce((a, b) => a + b, 0) / 5 || 0}/5
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Disclosure>
                      </div>
                      
                      {/* Compliance checkboxes */}
                      <div className="mt-6 pt-6 border-t">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              id="consent_wrap" 
                              checked={compliance.consentRecorded} 
                              onCheckedChange={(v) => setCompliance((p) => ({ ...p, consentRecorded: Boolean(v) }))} 
                            />
                            <label htmlFor="consent_wrap" className="text-sm">Consent recorded</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              id="dnc_wrap" 
                              checked={compliance.doNotCall} 
                              onCheckedChange={(v) => setCompliance((p) => ({ ...p, doNotCall: Boolean(v) }))} 
                            />
                            <label htmlFor="dnc_wrap" className="text-sm">Do not call</label>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center justify-between gap-4 pt-6 mt-6 border-t">
                        <div className="text-sm text-muted-foreground">
                          {wrapRequirementsMet ? (
                            <span className="text-success">✓ Ready to save</span>
                          ) : (
                            <span>Complete required fields to save</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" onClick={() => {/* TODO: Add skip handler */}}>Skip</Button>
                          <Button 
                            disabled={!wrapRequirementsMet} 
                            onClick={() => { handleSave(); setCallJustCompleted(true); }} 
                            className="btn-success"
                            title={wrapRequirementsMet ? undefined : "Set disposition and next action first"}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Save Call
                          </Button>
                          {hasQueue && (
                            <Button 
                              disabled={!wrapRequirementsMet} 
                              onClick={() => { 
                                handleSave(); 
                                onStartNextCall?.();
                                setCallJustCompleted(false);
                              }} 
                              className="btn-outline-forest"
                              title={wrapRequirementsMet ? "Save this call and start next in queue" : "Set disposition and next action first"}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Save & Start Next
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : !callJustCompleted ? (
                  /* Lead Summary */
                  <Card className="h-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5">
                        <User className="h-5 w-5 text-accent" />
                      </div>
                      Lead Summary
                      {aiInsights.conversionProbability > 70 && (
                        <Badge className="bg-forest-green/10 text-forest-green border-forest-green/20">
                          High Priority
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Essential Info - Always Visible */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Course</div>
                        <div className="font-semibold text-foreground">{lead.courseInterest || "Not specified"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Academic Year</div>
                        <div className="font-semibold text-foreground">{lead.academicYear || "Not specified"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Source</div>
                        <div className="font-semibold text-foreground">{(lead as any).source || (lead as any).leadSource || "Direct"}</div>
                      </div>
                    </div>
                    
                    {/* Conversion Status Bar - Always Visible */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-foreground">Conversion Likelihood</div>
                          <Button
                            onClick={analyzeCallWithAI}
                            disabled={isAnalyzing}
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                            title="Refresh AI analysis"
                          >
                            {isAnalyzing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Brain className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <div className={`text-lg font-bold ${
                          aiInsights.conversionProbability > 80 ? 'text-forest-green' :
                          aiInsights.conversionProbability > 60 ? 'text-warning' :
                          'text-slate-600'
                        }`}>
                          {aiInsights.conversionProbability}%
                        </div>
                      </div>
                      <Progress 
                        value={aiInsights.conversionProbability} 
                        className={`h-2 ${
                          aiInsights.conversionProbability > 80 ? '[&>div]:bg-forest-green' :
                          aiInsights.conversionProbability > 60 ? '[&>div]:bg-warning' :
                          '[&>div]:bg-slate-400'
                        }`}
                      />
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-slate-600">
                          {aiInsights.conversionProbability > 80 ? "Very High" : 
                           aiInsights.conversionProbability > 60 ? "High" : 
                           aiInsights.conversionProbability > 40 ? "Medium" : "Low"} likelihood
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {analysisError ? (
                            <span className="text-warning">{analysisError}</span>
                          ) : lastAnalysisTime ? (
                            <span>Updated {formatTimeAgo(lastAnalysisTime)}</span>
                          ) : (
                            <span>Analyzing...</span>
                          )}
                        </div>
                      </div>
                      
                      {/* ML Factors as Tags */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {aiInsights.conversionProbability > 70 && (
                          <>
                            <Badge variant="outline" className="text-xs h-5 success-bg text-success border-success/20">
                              High Engagement
                            </Badge>
                            <Badge variant="outline" className="text-xs h-5 status-info-bg text-info border-info/20">
                              Course Match
                            </Badge>
                          </>
                        )}
                        {aiInsights.conversionProbability > 40 && aiInsights.conversionProbability <= 70 && (
                          <>
                            <Badge variant="outline" className="text-xs h-5 warning-bg text-warning border-warning/20">
                              Exploring Options
                            </Badge>
                            <Badge variant="outline" className="text-xs h-5 bg-slate-50 text-slate-600 border-slate-300">
                              Timeline Flexible
                            </Badge>
                          </>
                        )}
                        {aiInsights.conversionProbability <= 40 && (
                          <>
                            <Badge variant="outline" className="text-xs h-5 destructive-bg text-destructive border-destructive/20">
                              Early Stage
                            </Badge>
                            <Badge variant="outline" className="text-xs h-5 bg-slate-50 text-slate-600 border-slate-300">
                              Needs Nurturing
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Progressive Disclosure Sections */}
                    <div className="space-y-2">
                      {/* Contact History - Tier B (on demand) */}
                      <Disclosure 
                        title="Contact History" 
                        icon={<><Calendar className="h-4 w-4 text-muted-foreground" /><Badge variant="outline" className="text-xs">{history.length}</Badge></>}
                      >
                        {history.length > 0 ? (
                          <div className="space-y-2">
                            {history.slice(0, 3).map((h) => (
                              <div key={h.id} className="p-2 bg-muted/20 rounded text-xs border">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="font-medium text-foreground truncate">{h.title}</div>
                                  <div className="text-muted-foreground shrink-0">{new Date(h.timestamp).toLocaleDateString()}</div>
                                </div>
                                {h.summary && <div className="text-muted-foreground">{h.summary}</div>}
                              </div>
                            ))}
                            {history.length > 3 && (
                              <div className="text-xs text-muted-foreground text-center">+{history.length - 3} more items</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground p-2">No prior contact history</div>
                        )}
                      </Disclosure>
                    </div>
                  </CardContent>
                </Card>
                ) : null}
                </div>

              {/* Lane 3: AI Script - Only visible during active calls */}
              {callState === "active" && (
                <div className="lg:col-span-1 order-3">
                  <div className="lg:sticky lg:top-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            AI Script
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Scenario pills */}
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant={scriptScenario === "application" ? "default" : "outline"} className="h-7 text-xs" onClick={() => handleScenarioSwitch("application")} disabled={isGeneratingScript}>Application</Button>
                          <Button size="sm" variant={scriptScenario === "portfolio" ? "default" : "outline"} className="h-7 text-xs" onClick={() => handleScenarioSwitch("portfolio")} disabled={isGeneratingScript}>Portfolio</Button>
                          <Button size="sm" variant={scriptScenario === "decline" ? "default" : "outline"} className="h-7 text-xs" onClick={() => handleScenarioSwitch("decline")} disabled={isGeneratingScript}>Decline Recovery</Button>
                          <Button size="sm" variant={scriptScenario === "post_1_1" ? "default" : "outline"} className="h-7 text-xs" onClick={() => handleScenarioSwitch("post_1_1")} disabled={isGeneratingScript}>Post 1‑1</Button>
                        </div>

                        {/* Script body with clamped preview and expand */}
                        {isGeneratingScript ? (
                          <div className="space-y-2">
                            <div className="h-3 bg-muted rounded animate-pulse" />
                            <div className="h-3 bg-muted rounded animate-pulse" />
                            <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className={`p-3 bg-muted/30 rounded text-xs text-foreground border border-border/50 whitespace-pre-wrap ${
                              scriptExpanded ? 'max-h-96 overflow-y-auto' : 'line-clamp-3 overflow-hidden'
                            } min-h-[72px]`}>
                              {memoizedScriptText}
                            </div>
                            {callScript && callScript.split('\n').length > 3 && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => setScriptExpanded(!scriptExpanded)}
                              >
                                {scriptExpanded ? 'Show less' : 'Expand'}
                              </Button>
                            )}
                          </div>
                        )}
                        {scriptError && (
                          <div className="text-[11px] text-warning">{scriptError}</div>
                        )}
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { if (callScript) navigator.clipboard.writeText(callScript); }} disabled={!callScript}>
                            <Clipboard className="h-3.5 w-3.5 mr-1" />Copy
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { if (callScript) addNote(callScript, "general"); }} disabled={!callScript}>Add to Notes</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Section: Combined Notes & Highlights during active calls */}
            {callState === "active" ? (
              /* During Call: Combined Notes & Highlights Card */
              <div className="space-y-6">
                {/* Combined Notes & Highlights Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      Call Notes & Highlights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="notes" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="notes" className="text-xs">
                          Quick Notes ({notes.length})
                        </TabsTrigger>
                        <TabsTrigger value="highlights" className="text-xs">
                          Highlights ({highlights.length})
                        </TabsTrigger>
                        <TabsTrigger value="moments" className="text-xs">
                          Moments ({callMoments.length})
                        </TabsTrigger>
                      </TabsList>
                      
                      {/* Quick Notes Tab */}
                      <TabsContent value="notes" className="mt-4">
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Type a quick note and press Enter…" 
                              value={newNote} 
                              onChange={(e) => setNewNote(e.target.value)} 
                              onKeyDown={(e) => { if (e.key === "Enter") addNote(newNote); }} 
                              className="flex-1"
                            />
                            <Button onClick={() => addNote(newNote)} variant="outline">Add</Button>
                          </div>
                          {notes.length > 0 && (
                            <div className="space-y-2">
                              {memoizedNotesList}
                              {notes.length > 3 && (
                                <div className="text-xs text-muted-foreground">+{notes.length - 3} more notes</div>
                              )}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      {/* Highlights Tab */}
                      <TabsContent value="highlights" className="mt-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {['Entry Requirements', 'Application Process', 'Portfolio Review', 'Interview Booking', 'Course Content', 'Career Outcomes'].map((highlight) => (
                              <Button
                                key={highlight}
                                onClick={() => addHighlight(highlight)}
                                variant={highlights.includes(highlight) ? "default" : "outline"}
                                size="sm"
                                className={`h-7 text-xs ${
                                  highlights.includes(highlight) 
                                    ? "bg-accent/20 border-accent text-accent" 
                                    : "hover:bg-accent/10 hover:border-accent"
                                }`}
                              >
                                {highlight}
                              </Button>
                            ))}
                          </div>
                          {highlights.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-muted-foreground">Selected Highlights</div>
                              <div className="flex flex-wrap gap-1">
                                {memoizedHighlightsList}
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      {/* Moments Tab */}
                      <TabsContent value="moments" className="mt-4">
                        <div className="space-y-3">
                          {callMoments.length > 0 ? (
                            <div className="space-y-2">
                              {memoizedCallMoments}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground p-4 text-center">
                              No moments detected yet. Moments will appear as keywords are mentioned during the call.
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Pre-call: Minimal view with optional guidance - Tier C (post-call only) */
              <div className="space-y-3">
                <Disclosure 
                  title="Pre-call Guidance (Optional)" 
                  icon={<Brain className="h-4 w-4 text-muted-foreground" />}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* MEDDIC Framework */}
                    <div className="p-3 rounded-lg status-info-bg border border-info/20">
                      <div className="text-sm font-medium text-info mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        MEDDIC Framework
                      </div>
                      <div className="text-xs space-y-1 text-info">
                        <div><strong>M</strong>etrics: What success looks like</div>
                        <div><strong>E</strong>conomic Buyer: Who makes decisions</div>
                        <div><strong>D</strong>ecision Criteria: How they evaluate</div>
                        <div><strong>D</strong>ecision Process: Steps to approval</div>
                        <div><strong>I</strong>dentify Pain: Core challenges</div>
                        <div><strong>C</strong>hampion: Internal advocate</div>
                      </div>
                    </div>

                    {/* Challenger Sale */}
                    <div className="p-3 rounded-lg success-bg border border-success/20">
                      <div className="text-sm font-medium text-success mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Challenger Approach
                      </div>
                      <div className="text-xs space-y-1 text-success">
                        <div><strong>Teach:</strong> Share unique insights</div>
                        <div><strong>Tailor:</strong> Customize to their world</div>
                        <div><strong>Take Control:</strong> Guide the conversation</div>
                        <div className="mt-2 text-xs font-medium">Focus: Challenge their thinking, not just solve problems</div>
                      </div>
                    </div>
                  </div>
                </Disclosure>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transcript Drawer */}
      <Sheet open={transcriptOpen} onOpenChange={setTranscriptOpen}>
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Transcript</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search transcript" value={transcriptQuery} onChange={(e) => setTranscriptQuery(e.target.value)} />
            </div>
            <div className="p-3 bg-muted/30 rounded max-h-[60vh] overflow-y-auto">
              {(() => {
                const text = recording?.transcription || (callState === "active" ? "Live transcript will appear here…" : "No transcript available.");
                const lines = text.split(/\n+/);
                const q = transcriptQuery.trim().toLowerCase();
                const filtered = q ? lines.filter((l) => l.toLowerCase().includes(q)) : lines;
                return filtered.map((l, i) => (
                  <p key={i} className="text-sm text-foreground whitespace-pre-wrap mb-2">{l}</p>
                ));
              })()}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Script Bottom Sheet */}
      {callState === "active" && (
        <>
          <div className="fixed bottom-4 right-4 lg:hidden">
            <Button onClick={() => setMobileScriptOpen(true)} size="sm" className="shadow-lg">Script</Button>
          </div>
          <Sheet open={mobileScriptOpen} onOpenChange={setMobileScriptOpen}>
            <SheetContent side="bottom" className="h-[70vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>AI Script</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={scriptScenario === "application" ? "default" : "outline"} className=
                  "h-7 text-xs" onClick={() => handleScenarioSwitch("application")} disabled={isGeneratingScript}>Application</Button>
                  <Button size="sm" variant={scriptScenario === "portfolio" ? "default" : "outline"} className="h-7 text-xs" onClick={() => handleScenarioSwitch("portfolio")} disabled={isGeneratingScript}>Portfolio</Button>
                  <Button size="sm" variant={scriptScenario === "decline" ? "default" : "outline"} className="h-7 text-xs" onClick={() => handleScenarioSwitch("decline")} disabled={isGeneratingScript}>Decline Recovery</Button>
                  <Button size="sm" variant={scriptScenario === "post_1_1" ? "default" : "outline"} className="h-7 text-xs" onClick={() => handleScenarioSwitch("post_1_1")} disabled={isGeneratingScript}>Post 1‑1</Button>
                </div>
                {isGeneratingScript ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className={`p-3 bg-muted/30 rounded text-xs text-foreground border border-border/50 whitespace-pre-wrap ${
                      scriptExpanded ? 'max-h-64 overflow-y-auto' : 'line-clamp-4 overflow-hidden'
                    } min-h-[96px]`}>
                      {memoizedScriptText}
                    </div>
                    {callScript && callScript.split('\n').length > 4 && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setScriptExpanded(!scriptExpanded)}
                      >
                        {scriptExpanded ? 'Show less' : 'Expand'}
                      </Button>
                    )}
                  </div>
                )}
                {scriptError && (
                  <div className="text-[11px] text-warning">{scriptError}</div>
                )}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { if (callScript) navigator.clipboard.writeText(callScript); }} disabled={!callScript}>
                    <Clipboard className="h-3.5 w-3.5 mr-1" />Copy
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { if (callScript) addNote(callScript, "general"); }} disabled={!callScript}>Add to Notes</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
};

export default CallComposer;
