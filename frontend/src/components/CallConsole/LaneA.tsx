import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Play, 
  PhoneOff, 
  Mic, 
  MicOff, 
  FileText, 
  MoreHorizontal,
  CheckCircle2,
  Plus,
  Clock,
  Target,
  Volume2,
  VolumeX,
  Pause,
  Users,
  BarChart3,
  AlertCircle,
  Brain,
  Sparkles,
  User,
  X
} from "lucide-react";

// Import API integration
import { callConsoleApi, ragApi } from '@/services/callConsoleApi';

// Types
interface LaneAProps {
  callState: "idle" | "dialing" | "active" | "wrapup";
  duration: number;
  recordingDuration: number;
  isRecording: boolean;
  transcriptWindow: string[];
  consentGranted: boolean;
  notes: Array<{id: string; content: string; timestamp: string; type: string; tags: string[]}>;
  // highlights removed - will be auto-generated from transcription
  outcomeType: string;
  outcomeDescription: string;
  priority: "low" | "medium" | "high" | "urgent";
  followUpDate: string;
  followUpType: string;
  lead: any;
  hasQueue: boolean;
  onStartCall: () => void;
  onEndCall: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onAddNote: (content: string, type: string) => void;
  onAddHighlight: (highlight: string) => void;
  onSetConsent: (consent: boolean) => void;
  onSetOutcomeType: (type: string) => void;
  onSetOutcomeDescription: (desc: string) => void;
  onSetPriority: (priority: "low" | "medium" | "high" | "urgent") => void;
  onSetFollowUpDate: (date: string) => void;
  onSetFollowUpType: (type: string) => void;
  onSave: () => void;
  onStartNextCall?: () => void;
  // VoIP Controls
  onMute: () => void;
  onHold: () => void;
  onTransfer: () => void;
  isMuted: boolean;
  isOnHold: boolean;
}

// Utility function
const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const LaneA: React.FC<LaneAProps> = ({
  callState,
  duration,
  recordingDuration,
  isRecording,
  transcriptWindow,
  consentGranted,
  notes,
  // highlights removed
  outcomeType,
  outcomeDescription,
  priority,
  followUpDate,
  followUpType,
  lead,
  hasQueue,
  onStartCall,
  onEndCall,
  onStartRecording,
  onStopRecording,
  onAddNote,
  onAddHighlight,
  onSetConsent,
  onSetOutcomeType,
  onSetOutcomeDescription,
  onSetPriority,
  onSetFollowUpDate,
  onSetFollowUpType,
  onSave,
  onStartNextCall,
  onMute,
  onHold,
  onTransfer,
  isMuted,
  isOnHold
}) => {
  // Ask Ivy state for pre-call prep
  const [askIvyQuery, setAskIvyQuery] = useState("");
  const [askIvyResponse, setAskIvyResponse] = useState<string | null>(null);
  const [askIvyLoading, setAskIvyLoading] = useState(false);

  // Ask Ivy functionality
  const handleAskIvy = async (query: string) => {
    if (!query.trim()) return;
    
    setAskIvyLoading(true);
    setAskIvyResponse(null);
    
    try {
      // Use the same RAG API as LaneB
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
        transcriptWindow: [], // No transcript yet in pre-call
        selection: '',
        consentGranted: false
      };
      
      const result = await ragApi.queryRag(query, context);
      setAskIvyResponse(result.answer);
    } catch (error) {
      setAskIvyResponse("Sorry, I couldn't process that query. Please try again.");
    } finally {
      setAskIvyLoading(false);
    }
  };

  // Quick pre-call questions
  const quickQuestions = [
    "Tell me about this lead",
    lead?.courseInterest ? `Tell me about the ${lead.courseInterest} course` : "Tell me about their course options",
    "What objections might come up?",
    "How should I start the call?"
  ];
  const [newNote, setNewNote] = useState("");
  const [showMoreControls, setShowMoreControls] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState(false);

  // Escape key handler for Person Details popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showLeadDetails) {
        setShowLeadDetails(false);
      }
    };
    
    if (showLeadDetails) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showLeadDetails]);

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim(), "general");
      setNewNote("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddNote();
    }
  };

  const wrapRequirementsMet = outcomeType;

  return (
    <div className="flex flex-col h-full">
      {/* Call State Tile */}
      <div className="p-6 border-b border-border/50">
        <div className="text-center space-y-4">
          {callState === "idle" ? (
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/20">
              <div className="relative">
                <div className="text-3xl font-bold text-success mb-2">Ready</div>
                <div className="text-sm font-medium text-muted-foreground">Start call when ready</div>
              </div>
            </div>
          ) : callState === "dialing" ? (
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-warning/10 to-warning/5 border-2 border-warning/20">
              <div className="absolute inset-0 rounded-2xl bg-warning/5 animate-pulse"></div>
              <div className="relative">
                <div className="text-3xl font-bold text-warning mb-2">Dialing...</div>
                <div className="text-sm font-medium text-warning">Connecting to {lead.name}</div>
              </div>
            </div>
          ) : callState === "active" ? (
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/20">
              <div className="absolute inset-0 rounded-2xl bg-success/5 animate-pulse"></div>
              <div className="relative">
                <div className="text-3xl font-bold text-success mb-2">{formatDuration(duration)}</div>
                <div className="text-sm font-medium text-success">
                  {isMuted ? "Muted" : isOnHold ? "On Hold" : "Call Active"}
                </div>
                <div className="flex items-center justify-center mt-2">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    isMuted ? 'bg-orange-500 animate-pulse' : 
                    isOnHold ? 'bg-yellow-500 animate-pulse' : 
                    'bg-success animate-pulse'
                  }`}></div>
                  <span className={`text-xs ${
                    isMuted ? 'text-orange-600' : 
                    isOnHold ? 'text-yellow-600' : 
                    'text-success'
                  }`}>
                    {isMuted ? "Microphone Off" : isOnHold ? "Call Paused" : "Connected"}
                  </span>
                </div>
              </div>
            </div>
          ) : callState === "wrapup" ? (
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200">
              <div className="relative">
                <div className="text-3xl font-bold text-slate-800 mb-2">{formatDuration(duration)}</div>
                <div className="text-sm font-medium text-slate-700">Call Ended</div>
                <div className="text-xs text-muted-foreground mt-1">Complete wrap-up below</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Primary Controls */}
      <div className="p-6 border-b border-border/50">
        <div className="space-y-3">
          {callState === "idle" ? (
            <div className="space-y-4">
              <Button onClick={onStartCall} size="lg" className="w-full btn-success">
                <Play className="h-5 w-5 mr-2" />
                Start Call
              </Button>
              
              {/* Ask Ivy for Pre-Call Prep */}
              <div className="border-t pt-4 flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Pre-Call Prep</span>
                </div>
                
                {/* Scrollable prep area handled by parent ScrollArea */}
                <div className="flex-1 min-h-0 space-y-3">
                  {/* Quick Questions */}
                  <div className="grid grid-cols-2 gap-2">
                    {quickQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-left justify-start"
                        onClick={() => {
                          setAskIvyQuery(question);
                          handleAskIvy(question);
                        }}
                        disabled={askIvyLoading}
                      >
                        <Sparkles className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{question}</span>
                      </Button>
                    ))}
                  </div>
                  
                  {/* Custom Query Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask anything about this lead..."
                      value={askIvyQuery}
                      onChange={(e) => setAskIvyQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !askIvyLoading) {
                          handleAskIvy(askIvyQuery);
                        }
                      }}
                      className="flex-1 h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAskIvy(askIvyQuery)}
                      disabled={askIvyLoading || !askIvyQuery.trim()}
                      className="h-8 px-3"
                    >
                      <Brain className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Response */}
                  {askIvyLoading && (
                    <div className="p-3 bg-muted/30 rounded text-xs">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-accent"></div>
                        <span>Thinking...</span>
                      </div>
                    </div>
                  )}
                  
                  {askIvyResponse && !askIvyLoading && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
                      <div className="text-slate-600 mb-2">Ivy's Response:</div>
                      <div className="text-foreground">
                        {askIvyResponse.split('\n').map((line, index) => {
                          // Handle bold text (markdown **text**)
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return (
                              <div key={index} className="font-semibold text-foreground my-1">
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
                          // Handle regular paragraphs
                          if (line.trim()) {
                            return (
                              <div key={index} className="my-1 text-foreground">
                                {line}
                              </div>
                            );
                          }
                          // Handle empty lines
                          return <div key={index} className="my-1"></div>;
                        })}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-6 text-xs"
                        onClick={() => onAddNote(askIvyResponse, "prep")}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add to Notes
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : callState === "active" ? (
            <div className="space-y-3">
              <Button onClick={onEndCall} size="lg" className="w-full bg-destructive hover:bg-destructive/90 text-white">
                <PhoneOff className="h-5 w-5 mr-2" />
                End Call
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  onClick={isRecording ? onStopRecording : onStartRecording}
                  variant={isRecording ? "destructive" : "outline"}
                  className="flex-1"
                >
                  {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                  {isRecording ? 'Stop Recording' : 'Record'}
                </Button>
                
                <Button onClick={() => setShowLeadDetails(!showLeadDetails)} className="flex-1 bg-white text-slate-800 hover:bg-primary hover:text-primary-foreground border border-slate-300">
                  <User className="h-4 w-4 mr-2" />
                  Person Info
                </Button>
                
                <Button 
                  onClick={() => setShowMoreControls(!showMoreControls)} 
                  variant="outline"
                  size="icon"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* More Controls Dropdown */}
              {showMoreControls && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Call Controls</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={isMuted ? "destructive" : "outline"} 
                      size="sm" 
                      className="text-xs"
                      onClick={onMute}
                    >
                      <VolumeX className="h-3 w-3 mr-1" />
                      {isMuted ? 'Unmute' : 'Mute'}
                    </Button>
                    <Button 
                      variant={isOnHold ? "destructive" : "outline"} 
                      size="sm" 
                      className="text-xs"
                      onClick={onHold}
                    >
                      <Pause className="h-3 w-3 mr-1" />
                      {isOnHold ? 'Unhold' : 'Hold'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={onTransfer}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Transfer
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => {
                        // Analytics would open a separate analytics panel
                        console.log('Analytics clicked');
                      }}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Analytics
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Recording Consent */}
        {callState === "active" && (
          <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="recording-consent" 
                checked={consentGranted}
                onCheckedChange={(checked) => onSetConsent(Boolean(checked))}
                className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
              />
              <label htmlFor="recording-consent" className="text-sm text-foreground">
                Recording consent obtained
              </label>
            </div>
          </div>
        )}

        {/* Lead Details Popup */}
        {showLeadDetails && (
          <div 
            role="dialog" 
            aria-modal="false" 
            aria-labelledby="lead-details-title"
            className="mt-4 p-4 bg-card border border-border rounded-lg shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-accent" />
                <span id="lead-details-title" className="text-sm font-medium">Person Details</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowLeadDetails(false)}
                className="h-6 w-6 p-0"
                aria-label="Close person details"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{lead.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{lead.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{lead.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Course Interest:</span>
                <span className="font-medium">{lead.courseInterest}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium">{lead.statusType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead Score:</span>
                <span className="font-medium">{lead.leadScore || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Live Transcript Preview */}
        {isRecording && transcriptWindow.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              Live Transcription
            </div>
            <div className="text-xs text-slate-700 bg-white p-2 rounded border">
              {transcriptWindow.slice(-3).map((chunk, index) => (
                <div key={index} className="opacity-75 last:opacity-100">
                  {chunk}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes & Highlights */}
      {callState === "active" && (
        <div className="p-6 border-b border-border/50 flex-1">
          <div className="space-y-4">
            {/* Quick Notes */}
            <div>
              <div className="text-sm font-medium text-foreground mb-2">Quick Notes</div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Type a note and press Enter..." 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button onClick={handleAddNote} variant="outline" size="sm">
                  Add
                </Button>
              </div>
              
              {notes.length > 0 && (
                <div className="mt-3 space-y-2">
                  {notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="p-2 bg-muted/30 rounded text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.timestamp).toLocaleTimeString()}
                        </span>
                        <Badge variant="outline" className="text-xs">{note.type}</Badge>
                      </div>
                      <p className="text-foreground">{note.content}</p>
                    </div>
                  ))}
                  {notes.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{notes.length - 3} more notes
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Auto-generated highlights will appear here based on AI/ML transcription scanning */}
          </div>
        </div>
      )}

      {/* Wrap-up Form */}
      {callState === "wrapup" && (
        <div className="p-6 flex-1">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-semibold">Call Wrap-up</h3>
            </div>

            {/* Disposition */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Disposition *</label>
              <Select value={outcomeType} onValueChange={onSetOutcomeType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select disposition" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
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

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
              <Textarea 
                placeholder="Brief description of the call outcome..." 
                className="min-h-[80px]" 
                value={outcomeDescription} 
                onChange={(e) => onSetOutcomeDescription(e.target.value)} 
              />
            </div>

            {/* Priority */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Priority</label>
              <Select value={priority} onValueChange={onSetPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Follow-up */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Follow-up</label>
              <div className="space-y-2">
                <Select value={followUpType} onValueChange={onSetFollowUpType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select follow-up type" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="none">No follow-up needed</SelectItem>
                    <SelectItem value="callback">Callback requested</SelectItem>
                    <SelectItem value="email">Email follow-up</SelectItem>
                    <SelectItem value="meeting">Schedule meeting</SelectItem>
                    <SelectItem value="application">Application follow-up</SelectItem>
                    <SelectItem value="information">Send information</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  type="datetime-local" 
                  value={followUpDate} 
                  onChange={(e) => onSetFollowUpDate(e.target.value)} 
                  placeholder="Select follow-up date/time"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() => {
                      const d = new Date();
                      d.setHours(d.getHours() + 2, 0, 0, 0);
                      onSetFollowUpDate(d.toISOString().slice(0, 16));
                    }}
                  >
                    +2h
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(9, 0, 0, 0);
                      onSetFollowUpDate(d.toISOString().slice(0, 16));
                    }}
                  >
                    Tomorrow 09:00
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() => {
                      const d = new Date();
                      const day = d.getDay();
                      const daysToMon = (8 - day) % 7 || 7;
                      d.setDate(d.getDate() + daysToMon);
                      d.setHours(10, 0, 0, 0);
                      onSetFollowUpDate(d.toISOString().slice(0, 16));
                    }}
                  >
                    Next Mon 10:00
                  </Button>
                </div>
              </div>
            </div>

            {/* Save Actions */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  disabled={!wrapRequirementsMet} 
                  onClick={onSave} 
                  className="btn-success flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save Call
                </Button>
                {hasQueue && (
                  <Button 
                    disabled={!wrapRequirementsMet} 
                    onClick={onStartNextCall} 
                    className="btn-outline-forest"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Save & Next
                  </Button>
                )}
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {wrapRequirementsMet ? (
                  <span className="text-success">✓ Ready to save</span>
                ) : (
                  <span>Complete required fields to save</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaneA;
