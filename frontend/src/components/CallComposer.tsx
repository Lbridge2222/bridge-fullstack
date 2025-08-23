import React, { useState, useCallback, useEffect } from "react";
import { 
  Phone, 
  PhoneCall, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed,
  Brain, 
  Send, 
  X, 
  Sparkles, 
  Wand2, 
  MessageSquare, 
  Loader2, 
  Sprout, 
  Calendar, 
  RotateCcw, 
  Zap,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  FileText,
  Headphones,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  Target,
  TrendingUp,
  MessageCircle,
  PhoneForwarded,
  Voicemail,
  Settings,
  RefreshCw,
  Download,
  Share2,
  BookOpen,
  Lightbulb,
  Timer,
  User,
  Building,
  GraduationCap,
  Copy,
  Plus,
  Minus,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Edit3,
  Trash2,
  Save,
  PhoneOff
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
import { Separator } from "@/components/ui/separator";

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

export interface CallOutcome {
  id: string;
  type: "successful" | "needs_followup" | "escalated" | "resolved" | "no_answer" | "voicemail" | "wrong_number";
  description: string;
  nextAction: string;
  followUpDate?: string;
  priority: "low" | "medium" | "high" | "urgent";
  tags: string[];
}

export interface CallNote {
  id: string;
  content: string;
  timestamp: string;
  type: "general" | "action_item" | "follow_up" | "escalation" | "feedback";
  tags: string[];
}

export interface CallRecording {
  id: string;
  duration: number;
  transcription: string;
  qualityScore: number;
  sentiment: "positive" | "neutral" | "negative";
  keyTopics: string[];
  aiInsights: string[];
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
  callType: "incoming" | "outgoing";
  duration: number;
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
}

interface CallComposerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSaveCall: (callData: CallComposerData) => void;
}

const CallComposer: React.FC<CallComposerProps> = ({
  isOpen,
  onClose,
  lead,
  onSaveCall
}) => {
  // State
  const [isCallActive, setIsCallActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedScript, setSelectedScript] = useState<CallScript | null>(null);
  const [showAiInsights, setShowAiInsights] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [activeTab, setActiveTab] = useState("call");

  // Call Composer Data
  const [callComposerData, setCallComposerData] = useState<CallComposerData>({
    callType: "outgoing",
    duration: 0,
    outcome: null,
    notes: [],
    recording: null,
    scripts: [
      {
        id: "1",
        title: "Initial Contact Script",
        content: "Hi {name}, this is {your_name} from Bridge University. I'm calling about your interest in our {course} program. Do you have a moment to discuss this?",
        context: "First contact with new lead",
        confidence: 95,
        suggestedTiming: "9 AM - 5 PM",
        tags: ["initial", "course-inquiry"]
      },
      {
        id: "2",
        title: "Follow-up Script",
        content: "Hi {name}, I wanted to follow up on our previous conversation about the {course} program. Have you had a chance to think about your next steps?",
        context: "Follow-up call",
        confidence: 88,
        suggestedTiming: "2 PM - 4 PM",
        tags: ["follow-up", "engagement"]
      },
      {
        id: "3",
        title: "Objection Handling",
        content: "I understand your concern about {objection}. Let me address that specifically. Many students have had similar concerns, and here's how we've helped them...",
        context: "Addressing common objections",
        confidence: 92,
        suggestedTiming: "Any time",
        tags: ["objection", "persuasion"]
      }
    ],
    aiInsights: {
      callStrategy: "Focus on course benefits and career outcomes. Address any concerns about cost or time commitment early.",
      followUpRecommendations: [
        "Send course brochure within 24 hours",
        "Schedule campus visit for next week",
        "Follow up with email summary"
      ],
      riskAssessment: "Medium risk - lead shows interest but may need more information about program details.",
      conversionProbability: 75
    }
  });

  // Effects
  useEffect(() => {
    if (isCallActive && !callStartTime) {
      setCallStartTime(new Date());
    }
  }, [isCallActive, callStartTime]);

  // Timer effect for call duration
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isCallActive && callStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - callStartTime.getTime()) / 1000);
        setCallComposerData(prev => ({ ...prev, duration }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive, callStartTime]);

  // Recording timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Handlers
  const toggleCall = useCallback(() => {
    if (isCallActive) {
      setIsCallActive(false);
      setCallStartTime(null);
      setCallComposerData(prev => ({ ...prev, duration: 0 }));
    } else {
      setIsCallActive(true);
      setCallStartTime(new Date());
    }
  }, [isCallActive]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      // Save recording
      const recording: CallRecording = {
        id: Date.now().toString(),
        duration: recordingDuration,
        transcription: "Call recording transcription will appear here...",
        qualityScore: 85,
        sentiment: "positive",
        keyTopics: ["course inquiry", "program details", "next steps"],
        aiInsights: ["Lead shows high interest", "Cost is primary concern", "Ready for follow-up"]
      };
      setCallComposerData(prev => ({ ...prev, recording }));
    } else {
      setIsRecording(true);
      setRecordingDuration(0);
    }
  }, [isRecording, recordingDuration]);

  const addNote = useCallback((content: string, type: CallNote["type"] = "general") => {
    const note: CallNote = {
      id: Date.now().toString(),
      content,
      timestamp: new Date().toISOString(),
      type,
      tags: []
    };
    setCallComposerData(prev => ({ ...prev, notes: [...prev.notes, note] }));
  }, []);

  const analyzeCallWithAI = useCallback(async () => {
    setIsGenerating(true);
    // Simulate AI analysis
    setTimeout(() => {
      setAiResponse("AI analysis complete. Key insights: Lead shows high engagement, recommend immediate follow-up with course materials.");
      setIsGenerating(false);
    }, 2000);
  }, []);

  const handleSaveCall = useCallback(() => {
    onSaveCall(callComposerData);
    onClose();
  }, [callComposerData, onSaveCall, onClose]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 bg-surface-overlay/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden focus-ring" onClick={(e) => e.stopPropagation()}>
        {/* Clean Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-success/10">
              <Phone className="h-5 w-5 text-success" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Call with {lead.name}</h2>
              <p className="text-sm text-muted-foreground">{lead.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            <Button onClick={handleSaveCall} size="sm" className="btn-success">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(90vh-80px)]">
          {/* Left Sidebar - Essential Controls */}
          <div className="w-72 border-r border-border/50 p-6 space-y-6">
            {/* Call Status */}
            <div className="text-center">
              {isCallActive ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-success/10 border border-success/20">
                    <div className="text-3xl font-bold text-success">
                      {formatDuration(callComposerData.duration)}
                    </div>
                    <div className="text-xs text-muted-foreground">Call Active</div>
                  </div>
                  <Button 
                    onClick={toggleCall}
                    size="lg"
                    className="w-full btn-premium"
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    End Call
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-muted/50">
                    <div className="text-2xl font-medium text-muted-foreground">Ready</div>
                    <div className="text-xs text-muted-foreground">Start call when ready</div>
                  </div>
                  <Button 
                    onClick={toggleCall}
                    size="lg"
                    className="w-full btn-success"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Start Call
                  </Button>
                </div>
              )}
            </div>

            {/* Recording Control */}
            {isCallActive && (
              <div className="text-center">
                <Button 
                  onClick={toggleRecording}
                  variant={isRecording ? "destructive" : "outline"}
                  size="lg"
                  className="w-full"
                >
                  {isRecording ? (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-2" />
                      Start Recording
                    </>
                  )}
                </Button>
                {isRecording && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Recording: {formatDuration(recordingDuration)}
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Follow-up
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Summary
              </Button>
            </div>
          </div>

          {/* Right Content - Tabbed Interface */}
          <div className="flex-1 p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="call" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Outcome
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </TabsTrigger>
                <TabsTrigger value="recording" className="flex items-center gap-2">
                  <Headphones className="h-4 w-4" />
                  Recording
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Tools
                </TabsTrigger>
              </TabsList>

              {/* Call Outcome Tab */}
              <TabsContent value="call" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-muted-foreground" />
                      Call Outcome
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Outcome Type</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select outcome" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="successful">Successful</SelectItem>
                            <SelectItem value="needs_followup">Needs Follow-up</SelectItem>
                            <SelectItem value="escalated">Escalated</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="no_answer">No Answer</SelectItem>
                            <SelectItem value="voicemail">Voicemail</SelectItem>
                            <SelectItem value="wrong_number">Wrong Number</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Priority</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
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
                      <Textarea 
                        placeholder="Brief description of the call outcome..."
                        className="min-h-[80px]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Next Action</label>
                      <Input placeholder="What needs to happen next?" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      Call Notes
                    </CardTitle>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {callComposerData.notes.length > 0 ? (
                        callComposerData.notes.map((note) => (
                          <div key={note.id} className="p-3 bg-muted/30 rounded-lg border interactive-hover">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">
                                {new Date(note.timestamp).toLocaleTimeString()}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {note.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground">{note.content}</p>
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

              {/* Recording Tab */}
              <TabsContent value="recording" className="space-y-6">
                {callComposerData.recording ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Headphones className="h-5 w-5 text-muted-foreground" />
                        Call Recording
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Duration</label>
                          <div className="text-2xl font-bold text-foreground">
                            {formatDuration(callComposerData.recording.duration)}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Quality Score</label>
                          <div className="text-2xl font-bold text-foreground">
                            {callComposerData.recording.qualityScore}%
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Transcription</label>
                        <div className="p-3 bg-muted/30 rounded-lg max-h-32 overflow-y-auto interactive-hover">
                          <p className="text-sm text-foreground">{callComposerData.recording.transcription}</p>
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

              {/* AI Tools Tab */}
              <TabsContent value="ai" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5 text-muted-foreground" />
                      AI Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Conversion Probability</label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Probability</span>
                            <span className="text-sm font-medium text-foreground">
                              {callComposerData.aiInsights.conversionProbability}%
                            </span>
                          </div>
                          <Progress value={callComposerData.aiInsights.conversionProbability} className="h-2" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Call Strategy</label>
                        <div className="p-3 accent-bg accent-border rounded-lg">
                          <p className="text-sm text-accent">{callComposerData.aiInsights.callStrategy}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Follow-up Recommendations</label>
                      <div className="space-y-2">
                        {callComposerData.aiInsights.followUpRecommendations.map((rec, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <span className="text-foreground">{rec}</span>
                          </div>
                        ))}
                      </div>
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
