import React, { useState, useCallback, useEffect } from "react";
import { 
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  Building,
  User,
  Plus,
  Minus,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Star,
  Target,
  TrendingUp,
  MessageCircle,
  Settings,
  RefreshCw,
  Download,
  Share2,
  BookOpen,
  Lightbulb,
  Timer,
  GraduationCap,
  Copy,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Edit3,
  Trash2,
  PhoneCall,
  VideoIcon,
  Monitor,
  Smartphone,
  Globe,
  Mail,
  Send,
  FileText,
  Headphones,
  Brain,
  Zap,
  Sparkles,
  Wand2,
  Loader2,
  RotateCcw
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

export interface MeetingType {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  type: "consultation" | "campus_tour" | "interview" | "follow_up" | "general";
  location: "campus" | "virtual" | "phone" | "hybrid";
  maxParticipants: number;
  requiresPreparation: boolean;
  tags: string[];
}

export interface MeetingSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  bookedBy?: string;
  meetingType?: string;
}

export interface MeetingBooking {
  id: string;
  leadId: string;
  meetingType: MeetingType;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  participants: string[];
  agenda: string;
  preparationNotes: string;
  reminderSettings: {
    email: boolean;
    sms: boolean;
    calendar: boolean;
    reminderTime: number; // minutes before
  };
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "rescheduled";
  aiInsights: {
    suggestedAgenda: string;
    preparationTips: string;
    conversationStarters: string[];
    followUpActions: string[];
    conversionProbability: number;
  };
}

interface MeetingBookerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onBookMeeting: (booking: MeetingBooking) => void;
}

const MeetingBooker: React.FC<MeetingBookerProps> = ({
  isOpen,
  onClose,
  lead,
  onBookMeeting
}) => {
  // State
  const [activeTab, setActiveTab] = useState("schedule");
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [agenda, setAgenda] = useState<string>("");
  const [preparationNotes, setPreparationNotes] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);

  // Meeting Types
  const meetingTypes: MeetingType[] = [
    {
      id: "1",
      name: "Course Consultation",
      description: "In-depth discussion about course details, requirements, and career outcomes",
      duration: 45,
      type: "consultation",
      location: "virtual",
      maxParticipants: 3,
      requiresPreparation: true,
      tags: ["course", "consultation", "virtual"]
    },
    {
      id: "2",
      name: "Campus Tour",
      description: "Guided tour of campus facilities, accommodation, and learning spaces",
      duration: 60,
      type: "campus_tour",
      location: "campus",
      maxParticipants: 5,
      requiresPreparation: false,
      tags: ["campus", "tour", "in-person"]
    },
    {
      id: "3",
      name: "Application Interview",
      description: "Formal interview to assess suitability and discuss application process",
      duration: 30,
      type: "interview",
      location: "virtual",
      maxParticipants: 2,
      requiresPreparation: true,
      tags: ["interview", "application", "virtual"]
    },
    {
      id: "4",
      name: "Follow-up Meeting",
      description: "Follow-up discussion after initial contact or previous meeting",
      duration: 30,
      type: "follow_up",
      location: "phone",
      maxParticipants: 2,
      requiresPreparation: true,
      tags: ["follow-up", "phone", "general"]
    }
  ];

  // Available Time Slots (simplified for demo)
  const availableSlots = [
    { id: "1", date: "2025-01-20", startTime: "09:00", endTime: "09:45", available: true },
    { id: "2", date: "2025-01-20", startTime: "14:00", endTime: "14:45", available: true },
    { id: "3", date: "2025-01-21", startTime: "10:00", endTime: "10:45", available: true },
    { id: "4", date: "2025-01-21", startTime: "15:00", endTime: "15:45", available: true },
    { id: "5", date: "2025-01-22", startTime: "11:00", endTime: "11:45", available: true },
    { id: "6", date: "2025-01-22", startTime: "16:00", endTime: "16:45", available: true }
  ];

  // Handlers
  const generateAIInsights = useCallback(async () => {
    if (!selectedMeetingType || !lead) return;
    
    setIsGenerating(true);
    // Simulate AI analysis
    setTimeout(() => {
      const insights = {
        suggestedAgenda: `1. Welcome and introduction (5 min)\n2. Discuss ${lead.courseInterest} program details (20 min)\n3. Address specific questions and concerns (15 min)\n4. Next steps and follow-up (5 min)`,
        preparationTips: `- Review ${lead.courseInterest} curriculum\n- Prepare campus-specific information for ${lead.campusPreference}\n- Have application timeline ready\n- Prepare for common questions about ${lead.academicYear}`,
        conversationStarters: [
          `What specifically interests you about ${lead.courseInterest}?`,
          `Have you visited other campuses? What are you looking for?`,
          `What are your career goals after graduation?`
        ],
        followUpActions: [
          "Send detailed course brochure within 24 hours",
          "Schedule campus visit if interested",
          "Connect with current students in similar program",
          "Follow up with application guidance"
        ],
        conversionProbability: Math.min(lead.leadScore + 15, 95)
      };
      setAiInsights(insights);
      setIsGenerating(false);
    }, 2000);
  }, [selectedMeetingType, lead]);

  const handleBookMeeting = useCallback(() => {
    if (!selectedMeetingType || !selectedDate || !selectedTime || !lead) return;

    const booking: MeetingBooking = {
      id: Date.now().toString(),
      leadId: lead.id.toString(),
      meetingType: selectedMeetingType,
      date: selectedDate,
      startTime: selectedTime,
      endTime: "", // Calculate based on duration
      location: selectedLocation,
      participants: [lead.name],
      agenda: agenda,
      preparationNotes: preparationNotes,
      reminderSettings: {
        email: true,
        sms: true,
        calendar: true,
        reminderTime: 30
      },
      status: "scheduled",
      aiInsights: aiInsights || {
        suggestedAgenda: "",
        preparationTips: "",
        conversationStarters: [],
        followUpActions: [],
        conversionProbability: 0
      }
    };

    onBookMeeting(booking);
    onClose();
  }, [selectedMeetingType, selectedDate, selectedTime, selectedLocation, agenda, preparationNotes, lead, aiInsights, onBookMeeting, onClose]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 bg-surface-overlay/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden focus-ring" onClick={(e) => e.stopPropagation()}>
        {/* Clean Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-accent/10">
              <Calendar className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Schedule Meeting with {lead.name}</h2>
              <p className="text-sm text-muted-foreground">{lead.courseInterest} • {lead.campusPreference}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            <Button onClick={handleBookMeeting} size="sm" className="btn-success" disabled={!selectedMeetingType || !selectedDate || !selectedTime}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Book Meeting
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(90vh-80px)]">
          {/* Left Sidebar - Meeting Types */}
          <div className="w-80 border-r border-border/50 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Meeting Types</h3>
            <div className="space-y-3">
              {meetingTypes.map((type) => (
                <div
                  key={type.id}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    selectedMeetingType?.id === type.id
                      ? 'accent-border accent-bg'
                      : 'border-border hover:border-accent/30 hover:accent-bg'
                  }`}
                  onClick={() => setSelectedMeetingType(type)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {type.location === 'virtual' && <Video className="h-4 w-4 text-accent" />}
                      {type.location === 'campus' && <Building className="h-4 w-4 text-accent" />}
                      {type.location === 'phone' && <Phone className="h-4 w-4 text-accent" />}
                      <span className="text-sm font-medium text-foreground">{type.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {type.duration}m
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{type.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    Up to {type.maxParticipants} people
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Tabbed Interface */}
          <div className="flex-1 p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="schedule" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule
                </TabsTrigger>
                <TabsTrigger value="preparation" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Preparation
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Insights
                </TabsTrigger>
              </TabsList>

              {/* Schedule Tab */}
              <TabsContent value="schedule" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      Meeting Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Date</label>
                        <Select value={selectedDate} onValueChange={setSelectedDate}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select date">
                              {selectedDate ? formatDate(selectedDate) : "Select date"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {availableSlots
                              .filter(slot => slot.available)
                              .map(slot => (
                                <SelectItem key={slot.id} value={slot.date}>
                                  {formatDate(slot.date)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Time</label>
                        <Select value={selectedTime} onValueChange={setSelectedTime}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSlots
                              .filter(slot => slot.date === selectedDate && slot.available)
                              .map(slot => (
                                <SelectItem key={slot.id} value={slot.startTime}>
                                  {slot.startTime}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Location</label>
                      <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="virtual">
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              Virtual Meeting
                            </div>
                          </SelectItem>
                          <SelectItem value="campus">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              Campus Meeting
                            </div>
                          </SelectItem>
                          <SelectItem value="phone">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Phone Call
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Agenda</label>
                      <Textarea 
                        placeholder="Brief agenda for the meeting..."
                        value={agenda}
                        onChange={(e) => setAgenda(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Available Slots */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      Available Time Slots
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {availableSlots
                        .filter(slot => slot.available)
                        .map(slot => (
                          <div
                            key={slot.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                              selectedDate === slot.date && selectedTime === slot.startTime
                                ? 'accent-border accent-bg'
                                : 'border-border hover:border-accent/30 hover:accent-bg'
                            }`}
                            onClick={() => {
                              setSelectedDate(slot.date);
                              setSelectedTime(slot.startTime);
                            }}
                          >
                            <div className="text-sm font-medium text-foreground">
                              {formatDate(slot.date)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {slot.startTime} - {slot.endTime}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Preparation Tab */}
              <TabsContent value="preparation" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      Meeting Preparation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Preparation Notes</label>
                      <Textarea 
                        placeholder="Key points to prepare for this meeting..."
                        value={preparationNotes}
                        onChange={(e) => setPreparationNotes(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Reminder Settings</label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="email-reminder" defaultChecked />
                          <label htmlFor="email-reminder" className="text-sm text-foreground">
                            Email reminder
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="sms-reminder" defaultChecked />
                          <label htmlFor="sms-reminder" className="text-sm text-foreground">
                            SMS reminder
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="calendar-reminder" defaultChecked />
                          <label htmlFor="calendar-reminder" className="text-sm text-foreground">
                            Add to calendar
                          </label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AI Insights Tab */}
              <TabsContent value="ai" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5 text-muted-foreground" />
                      AI Meeting Insights
                    </CardTitle>
                    <Button 
                      onClick={generateAIInsights} 
                      disabled={!selectedMeetingType}
                      size="sm"
                      variant="outline"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Generate Insights
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isGenerating ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                        <p>Generating AI insights...</p>
                      </div>
                    ) : aiInsights ? (
                      <>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Suggested Agenda</label>
                          <div className="p-3 accent-bg accent-border rounded-lg">
                            <pre className="text-sm text-accent whitespace-pre-wrap">{aiInsights.suggestedAgenda}</pre>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Preparation Tips</label>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm text-foreground">{aiInsights.preparationTips}</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Conversation Starters</label>
                          <div className="space-y-2">
                            {aiInsights.conversationStarters.map((starter: string, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <MessageCircle className="h-4 w-4 text-accent" />
                                <span className="text-foreground">{starter}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Follow-up Actions</label>
                          <div className="space-y-2">
                            {aiInsights.followUpActions.map((action: string, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-success" />
                                <span className="text-foreground">{action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">No AI Insights Yet</p>
                        <p className="text-sm">Select a meeting type and generate AI-powered insights</p>
                      </div>
                    )}
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

export default MeetingBooker;
