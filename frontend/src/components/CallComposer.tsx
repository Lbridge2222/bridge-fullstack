import React, { useState, useCallback, useEffect, useMemo } from "react";
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
  Copy,
  Plus,
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
    conversionProbability: number;
    bestContactTime: string;
    recommendedAction: string;
    urgency: "high" | "medium" | "low";
  };
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
}

interface CallComposerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSaveCall: (callData: CallComposerData) => void;
}

const CallComposer: React.FC<CallComposerProps> = ({ isOpen, onClose, lead, onSaveCall }) => {
  // derived
  const draftKey = useMemo(() => (lead ? `call_draft:${lead.uid}` : "call_draft:unknown"), [lead]);

  // state
  const [isCallActive, setIsCallActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [activeTab, setActiveTab] = useState("call");
  const [duration, setDuration] = useState(0);

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
          tags: [],
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
  }), [lead, duration, outcomeType, outcomeDescription, nextAction, followUpDate, priority, notes, recording, aiInsights, compliance]);

  // timers
  useEffect(() => {
    if (!isCallActive) return;
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [isCallActive]);

  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => setRecordingDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  // autosave
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(buildPayload()));
    } catch {}
  }, [buildPayload, draftKey]);

  // load draft
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
      setDuration(parsed.duration || 0);
      setCompliance(parsed.compliance || { consentRecorded: false, doNotCall: false });
    } catch {}
  }, [isOpen, draftKey]);

  // handlers
  const toggleCall = useCallback(() => {
    setIsCallActive((v) => !v);
    if (isRecording) setIsRecording(false);
  }, [isRecording]);

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
      setRecordingDuration(0);
    } else {
      setIsRecording(true);
      setRecordingDuration(0);
    }
  }, [isRecording, recordingDuration, recording]);

  const addNote = useCallback((content: string, type: CallNote["type"] = "general") => {
    if (!content.trim()) return;
    const note: CallNote = { id: `${Date.now()}`, content: content.trim(), timestamp: new Date().toISOString(), type, tags: [] };
    setNotes((prev) => [note, ...prev]);
    setNewNote("");
  }, []);

  const analyzeCallWithAI = useCallback(() => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setAiInsights((p) => ({ ...p, conversionProbability: Math.min(99, p.conversionProbability + 3), callStrategy: "Lead engaged. Offer campus tour and send tailored module outline." }));
      setIsAnalyzing(false);
    }, 1200);
  }, []);

  const onCopySummary = useCallback(async () => {
    try { await navigator.clipboard.writeText(summaryText); } catch {}
  }, [summaryText]);

  const handleSave = useCallback(() => {
    if (isCallActive) { alert("End the call before saving."); return; }
    const payload = buildPayload();
    if (!payload.outcome && notes.length === 0) { alert("Select a disposition or add at least one note."); return; }
    onSaveCall(payload);
    try { localStorage.removeItem(draftKey); } catch {}
    onClose();
  }, [isCallActive, buildPayload, notes.length, onSaveCall, draftKey, onClose]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, "0")}`;
  };

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
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden focus-ring" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-success/10"><Phone className="h-5 w-5 text-success" /></div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Call with {lead.name}</h2>
              <p className="text-sm text-muted-foreground">{lead.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onCopySummary} title="Copy summary"><Copy className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
            <Button onClick={handleSave} size="sm" className="btn-success"><CheckCircle2 className="h-4 w-4 mr-2" />Save</Button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Left controls */}
          <div className="w-72 border-r border-border/50 p-6 space-y-6">
            <div className="text-center">
              {isCallActive ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-success/10 border border-success/20">
                    <div className="text-3xl font-bold text-success">{formatDuration(duration)}</div>
                    <div className="text-xs text-muted-foreground">Call Active</div>
                  </div>
                  <Button onClick={() => setIsCallActive(false)} size="lg" className="w-full btn-premium"><PhoneOff className="h-4 w-4 mr-2" />End Call</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-muted/50">
                    <div className="text-2xl font-medium text-muted-foreground">Ready</div>
                    <div className="text-xs text-muted-foreground">Start call when ready</div>
                  </div>
                  <Button onClick={() => setIsCallActive(true)} size="lg" className="w-full btn-success"><Phone className="h-4 w-4 mr-2" />Start Call</Button>
                </div>
              )}
            </div>

            {isCallActive && (
              <div className="text-center">
                <Button onClick={toggleRecording} variant={isRecording ? "destructive" : "outline"} size="lg" className="w-full">
                  {isRecording ? (<><Square className="h-4 w-4 mr-2" />Stop Recording</>) : (<><Mic className="h-4 w-4 mr-2" />Start Recording</>)}
                </Button>
                {isRecording && (<div className="mt-2 text-xs text-muted-foreground">Recording: {formatDuration(recordingDuration)}</div>)}
              </div>
            )}

            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start"><Calendar className="h-4 w-4 mr-2" />Schedule Follow‑up</Button>
              <Button variant="outline" size="sm" className="w-full justify-start"><MessageSquare className="h-4 w-4 mr-2" />Send Summary</Button>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2"><Checkbox id="consent" checked={compliance.consentRecorded} onCheckedChange={(v) => setCompliance((p) => ({ ...p, consentRecorded: Boolean(v) }))} /><label htmlFor="consent" className="text-sm text-foreground">Consent recorded</label></div>
              <div className="flex items-center gap-2"><Checkbox id="dnc" checked={compliance.doNotCall} onCheckedChange={(v) => setCompliance((p) => ({ ...p, doNotCall: Boolean(v) }))} /><label htmlFor="dnc" className="text-sm text-foreground">Do not call</label></div>
            </div>
          </div>

          {/* Right */}
          <div className="flex-1 p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="call" className="flex items-center gap-2"><Target className="h-4 w-4" />Outcome</TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center gap-2"><FileText className="h-4 w-4" />Notes</TabsTrigger>
                <TabsTrigger value="recording" className="flex items-center gap-2"><Headphones className="h-4 w-4" />Recording</TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2"><Brain className="h-4 w-4" />AI Tools</TabsTrigger>
              </TabsList>

              {/* Outcome */}
              <TabsContent value="call" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="h-5 w-5 text-muted-foreground" />Call Outcome</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Disposition</label>
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
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
                      <Textarea placeholder="Brief description of the call outcome…" className="min-h-[80px]" value={outcomeDescription} onChange={(e) => setOutcomeDescription(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Next Action</label>
                        <Input placeholder="What needs to happen next?" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Follow‑up (date & time)</label>
                        <Input type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notes */}
              <TabsContent value="notes" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-muted-foreground" />Call Notes</CardTitle>
                    <div className="flex items-center gap-2">
                      <Input placeholder="Type a quick note and press Enter…" value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNote(newNote); }} className="h-9 w-72" />
                      <Button size="sm" variant="outline" onClick={() => addNote(newNote)}><Plus className="h-4 w-4 mr-2" />Add Note</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {notes.length > 0 ? (
                        notes.map((note) => (
                          <div key={note.id} className="p-3 bg-muted/30 rounded-lg border interactive-hover">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">{new Date(note.timestamp).toLocaleTimeString()}</span>
                              <Badge variant="outline" className="text-xs">{note.type}</Badge>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No notes yet</p>
                          <p className="text-xs">Add notes during or after the call</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Recording */}
              <TabsContent value="recording" className="space-y-6">
                {recording ? (
                  <Card>
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Headphones className="h-5 w-5 text-muted-foreground" />Call Recording</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Duration</label>
                          <div className="text-2xl font-bold text-foreground">{formatDuration(recording.duration)}</div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Quality Score</label>
                          <div className="text-2xl font-bold text-foreground">{recording.qualityScore}%</div>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Transcription</label>
                        <div className="p-3 bg-muted/30 rounded-lg max-h-32 overflow-y-auto interactive-hover">
                          <p className="text-sm text-foreground whitespace-pre-wrap">{recording.transcription}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Headphones className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">No Recording</p>
                    <p className="text-sm">Start recording during the call to capture audio and transcription</p>
                  </div>
                )}
              </TabsContent>

              {/* AI */}
              <TabsContent value="ai" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Brain className="h-5 w-5 text-muted-foreground" />AI Insights</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Conversion Probability</label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Probability</span><span className="text-sm font-medium text-foreground">{aiInsights.conversionProbability}%</span></div>
                          <Progress value={aiInsights.conversionProbability} className="h-2" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Call Strategy</label>
                        <div className="p-3 accent-bg accent-border rounded-lg">
                          <p className="text-sm text-accent whitespace-pre-wrap">{aiInsights.callStrategy}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Follow‑up Recommendations</label>
                      <div className="space-y-2">
                        {aiInsights.followUpRecommendations.map((rec, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <span className="text-foreground">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2">
                      <Button onClick={analyzeCallWithAI} disabled={isAnalyzing}>
                        {isAnalyzing ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing…</>) : (<><Brain className="h-4 w-4 mr-2" />Analyze Call</>)}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallComposer;

