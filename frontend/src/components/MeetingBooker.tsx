import React, { useCallback, useEffect, useMemo, useRef, useLayoutEffect, useState } from "react";
import { 
  Calendar, Clock, Building, Phone, Video, Users, X, CheckCircle2, GripVertical, Maximize, Minimize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { meetingsApi, type MeetingType as ApiMeetingType, type MeetingSlot as ApiMeetingSlot } from "@/services/meetingsApi";

// Types
type DisplayMode = "floating" | "docked" | "fullscreen";

export interface Lead {
  id: number; uid: string; name: string; email: string; phone: string;
  courseInterest: string; academicYear: string; campusPreference: string;
  enquiryType: string; leadSource: string; status: string;
  statusType: "new" | "contacted" | "qualified" | "nurturing" | "cold";
  leadScore: number; createdDate: string; lastContact: string; nextAction: string;
  slaStatus: "urgent" | "warning" | "within_sla" | "met";
  contactAttempts: number; tags: string[]; colorTag?: string; avatar?: string;
  aiInsights: { conversionProbability: number; bestContactTime: string; recommendedAction: string; urgency: "high" | "medium" | "low"; };
}

export interface MeetingType {
  id: string; name: string; description: string; duration: number;
  type: "consultation" | "campus_tour" | "interview" | "follow_up" | "general";
  location: "campus" | "virtual" | "phone" | "hybrid";
  maxParticipants: number; requiresPreparation: boolean; tags: string[];
}

export interface MeetingSlot {
  id: string; date: string; startTime: string; endTime: string; available: boolean;
}

export interface MeetingBooking {
  id: string; leadId: string; meetingType: MeetingType;
  date: string; startTime: string; endTime: string; location: string;
  participants: string[]; agenda: string; preparationNotes: string;
  reminderSettings: { email: boolean; sms: boolean; calendar: boolean; reminderTime: number; };
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "rescheduled";
  aiInsights: { // kept for shape compatibility; you can drop if unused elsewhere
    suggestedAgenda: string; preparationTips: string; conversationStarters: string[];
    followUpActions: string[]; conversionProbability: number;
  };
}

interface MeetingBookerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onBookMeeting: (booking: MeetingBooking) => void;
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

const addMinutes = (hhmm: string, minutes: number) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, (m || 0) + minutes, 0, 0);
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

// Helper functions for date handling
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const nextWindow = (anchor?: string, days = 14) => {
  const start = anchor ? new Date(anchor) : new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + days);
  return { start: isoDate(start), end: isoDate(end) };
};

// API mappers
const mapType = (t: ApiMeetingType): MeetingType => ({
  id: t.id,
  name: t.name,
  description: t.description,
  duration: t.duration_minutes,
  type: t.type,
  location: t.location,
  maxParticipants: t.max_participants,
  requiresPreparation: t.requires_preparation,
  tags: t.tags,
});

const mapSlot = (s: ApiMeetingSlot): MeetingSlot => ({
  id: s.id,
  date: s.date,
  startTime: s.start_time,
  endTime: s.end_time,
  available: s.available,
});

const MeetingBooker: React.FC<MeetingBookerProps> = ({ isOpen, onClose, lead, onBookMeeting }) => {
  const { push: toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [agenda, setAgenda] = useState<string>("");
  const [preparationNotes, setPreparationNotes] = useState<string>("");
  const [reminders, setReminders] = useState({ email: true, sms: true, calendar: true, reminderTime: 30 });
  
  // Display mode and drag functionality
  const [mode, setMode] = useState<DisplayMode>("floating");
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Live refs for drag/resize
  const positionRef = useRef(position);
  const sizeLiveRef = useRef(size);

  // Minimal shortcuts: send + close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      const isMac = /(Mac|iPhone|iPad)/i.test(navigator.userAgent);
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      if (ctrlKey && e.key === "Enter") { e.preventDefault(); handleBook(); }
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, selectedMeetingType, selectedDate, selectedTime, selectedLocation, agenda, preparationNotes, reminders]);

  // API data
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [availableSlots, setAvailableSlots] = useState<MeetingSlot[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const computedEndTime = useMemo(() => {
    if (!selectedTime || !selectedMeetingType) return "";
    return addMinutes(selectedTime, selectedMeetingType.duration);
  }, [selectedTime, selectedMeetingType]);

  // Fetch meeting types on component mount
  useEffect(() => {
    if (!isOpen) return;
    const ac = new AbortController();
    
    (async () => {
      try {
        setIsLoadingTypes(true);
        const types = await meetingsApi.getMeetingTypes();
        // Convert API format to component format using mapper
        const convertedTypes = types.map(mapType);
        setMeetingTypes(convertedTypes);
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          console.error('Failed to fetch meeting types:', error);
          toast({
            title: "Failed to load meeting types",
            description: "Please refresh and try again.",
            variant: "destructive"
          });
        }
      } finally {
        setIsLoadingTypes(false);
      }
    })();
    
    return () => ac.abort();
  }, [isOpen, toast]);

  // Fetch available slots when meeting type or date changes
  useEffect(() => {
    if (!isOpen || !selectedMeetingType) return;
    const ac = new AbortController();
    
    (async () => {
      setIsLoadingSlots(true);
      try {
        const { start, end } = nextWindow(selectedDate, 14);
        const slots = await meetingsApi.getAvailableSlots(start, end, selectedMeetingType.id);
        // Convert API format to component format using mapper
        const convertedSlots = slots.map(mapSlot);
        setAvailableSlots(convertedSlots);
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          console.error('Failed to fetch available slots:', error);
          toast({
            title: "Failed to load time slots",
            description: "Please try selecting a different meeting type.",
            variant: "destructive"
          });
        }
      } finally {
        setIsLoadingSlots(false);
      }
    })();
    
    return () => ac.abort();
  }, [isOpen, selectedMeetingType, selectedDate, toast]);

  // Preselect first valid date/time after loading slots
  useEffect(() => {
    if (!isLoadingSlots && availableSlots.length) {
      const first = availableSlots.find(s => s.available);
      if (!first) return;
      
      // Only prefill if nothing selected or previous selection became invalid
      if (!selectedDate || !availableSlots.some(s => s.date === selectedDate)) {
        setSelectedDate(first.date);
        setSelectedTime(first.startTime);
      } else if (selectedDate && selectedTime) {
        const stillValid = availableSlots.some(s => s.date === selectedDate && s.startTime === selectedTime && s.available);
        if (!stillValid) {
          const sameDay = availableSlots.find(s => s.date === selectedDate && s.available);
          if (sameDay) {
            setSelectedTime(sameDay.startTime);
          } else {
            // No slots available for selected date, pick first available
            setSelectedDate(first.date);
            setSelectedTime(first.startTime);
          }
        }
      }
    }
  }, [isLoadingSlots, availableSlots, selectedDate, selectedTime]);

  // Autosave/restore draft
  useEffect(() => {
    if (!isOpen || !lead?.uid) return;
    const key = `interview-draft:${lead.uid}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        setSelectedMeetingType(s.selectedMeetingType ?? null);
        setSelectedDate(s.selectedDate ?? "");
        setSelectedTime(s.selectedTime ?? "");
        setSelectedLocation(s.selectedLocation ?? "");
        setAgenda(s.agenda ?? "");
        setPreparationNotes(s.preparationNotes ?? "");
        setReminders(s.reminders ?? reminders);
      } catch {/* ignore */}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lead?.uid]);

  useEffect(() => {
    if (!isOpen || !lead?.uid) return;
    const key = `interview-draft:${lead.uid}`;
    const payload = { selectedMeetingType, selectedDate, selectedTime, selectedLocation, agenda, preparationNotes, reminders };
    const id = setTimeout(() => localStorage.setItem(key, JSON.stringify(payload)), 500);
    return () => clearTimeout(id);
  }, [isOpen, lead?.uid, selectedMeetingType, selectedDate, selectedTime, selectedLocation, agenda, preparationNotes, reminders]);

  // Clear transform when mode changes away from floating
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (mode !== "floating") {
      setIsDragging(false);
      el.style.transition = "";
      el.style.transform = ""; // let CSS positions take over
    } else {
      // ensure transform reflects current position
      el.style.transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`;
    }
  }, [mode]);

  // Drag and resize handlers
  const SAFE_MARGIN = 8;
  const MIN_VISIBLE = 120;
  const draggingEnabled = mode === "floating";
  
  // Compute bounds so at least MIN_VISIBLE px stay visible on each edge
  const getClampBounds = useCallback((width: number, height: number) => {
    const headerHeight = 56; // matches your header padding/height
    return {
      minX: MIN_VISIBLE - width,               // allow left overflow leaving MIN_VISIBLE visible
      maxX: window.innerWidth - MIN_VISIBLE,   // right visible margin
      minY: -(headerHeight - SAFE_MARGIN),     // allow header to slightly tuck under top
      maxY: window.innerHeight - MIN_VISIBLE   // bottom visible margin
    };
  }, []);

  // Pointer-based drag start (matching EmailComposer)
  const beginDrag = useCallback((e: React.PointerEvent) => {
    if (!draggingEnabled || !containerRef.current) return;

    // don't start drag from interactive controls
    const t = e.target as HTMLElement;
    if (t.closest('button,[role="button"],input,textarea,select,[contenteditable],a,[data-no-drag]')) return;

    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    
    if (!containerRef.current) return;
    containerRef.current.style.transition = 'none';
    document.body.style.userSelect = 'none';
    // Safari
    (document.body.style as any).webkitUserSelect = "none";

    setIsDragging(true);
    setDragStart({ x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y });
  }, [draggingEnabled]);

  // Pointer-based resize start (matching EmailComposer)
  const beginResize = useCallback((e: React.PointerEvent) => {
    if (!draggingEnabled || !containerRef.current) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    
    if (!containerRef.current) return;
    containerRef.current.style.transition = 'none';
    document.body.style.userSelect = 'none';
    // Safari
    (document.body.style as any).webkitUserSelect = "none";

    setIsResizing(true);
    setResizeStart({ 
      x: e.clientX, 
      y: e.clientY, 
      width: sizeLiveRef.current.width, 
      height: sizeLiveRef.current.height 
    });
  }, [draggingEnabled]);

  // Simple pointer-based drag/resize handlers
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;

      if (isDragging) {
        e.preventDefault();
        const newXRaw = e.clientX - dragStart.x;
        const newYRaw = e.clientY - dragStart.y;
        const { minX, maxX, minY, maxY } = getClampBounds(size.width, size.height);
        const newX = Math.min(Math.max(newXRaw, minX), maxX);
        const newY = Math.min(Math.max(newYRaw, minY), maxY);
        
        positionRef.current = { x: newX, y: newY };
        containerRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
        
        // keep clearing as the pointer moves so the page never highlights
        window.getSelection()?.removeAllRanges();
      }
      
      if (isResizing) {
        e.preventDefault();
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = Math.max(400, Math.min(1200, resizeStart.width + deltaX));
        const newHeight = Math.max(300, Math.min(800, resizeStart.height + deltaY));
        
        sizeLiveRef.current = { width: newWidth, height: newHeight };
        containerRef.current.style.width = `${newWidth}px`;
        containerRef.current.style.height = `${newHeight}px`;
      }
    };

    const onPointerUp = () => {
      if (!isDragging && !isResizing) return;
      setIsDragging(false);
      setIsResizing(false);

      document.body.style.userSelect = "";
      (document.body.style as any).webkitUserSelect = "";

      if (containerRef.current) containerRef.current.style.transition = "";
      
      // Commit latest values so future effects use correct bounds
      setPosition(positionRef.current);
      setSize(sizeLiveRef.current);
    };

    if (isDragging || isResizing) {
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", onPointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", onPointerMove as any);
      window.removeEventListener("pointerup", onPointerUp as any);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, getClampBounds, size.width, size.height]);

  // Update refs when state changes
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    sizeLiveRef.current = size;
  }, [size]);

  // Smooth initial positioning
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || mode !== "floating") return;

    el.style.transition = "none";
    el.style.width = `${size.width}px`;
    el.style.height = `${size.height}px`;
    el.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;

    requestAnimationFrame(() => {
      if (el) el.style.transition = ""; // re-enable after first paint
    });
  }, [mode, position, size]);

  // Keep inside viewport on window resize
  useEffect(() => {
    const onResize = () => {
      if (!containerRef.current) return;

      // keep size within viewport minus margins
      const maxW = Math.max(400, window.innerWidth - SAFE_MARGIN * 2);
      const maxH = Math.max(300, window.innerHeight - SAFE_MARGIN * 2);
      const newSize = {
        width: Math.min(size.width, maxW),
        height: Math.min(size.height, maxH),
      };
      setSize(newSize);

      // clamp position with updated size
      const { minX, maxX, minY, maxY } = getClampBounds(newSize.width, newSize.height);
      const newPosition = {
        x: Math.min(Math.max(position.x, minX), maxX),
        y: Math.min(Math.max(position.y, minY), maxY),
      };
      setPosition(newPosition);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [getClampBounds, position, size]);

  const handleBook = useCallback(async () => {
    if (!lead || !selectedMeetingType || !selectedDate || !selectedTime || !selectedLocation || isBooking) return;
    
    setIsBooking(true);
    try {
      // Create the booking data for the API (keeping current format for backend compatibility)
      const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const endDateTime = new Date(`${selectedDate}T${computedEndTime || addMinutes(selectedTime, selectedMeetingType.duration)}`);
      
      const bookingData = {
        lead_id: lead.uid,
        meeting_type_id: selectedMeetingType.id,
        scheduled_start: startDateTime.toISOString(),
        scheduled_end: endDateTime.toISOString(),
        location: selectedLocation,
        participants: [lead.name],
        agenda,
        preparation_notes: preparationNotes,
        reminder_settings: {
          email: reminders.email,
          sms: reminders.sms,
          calendar: reminders.calendar,
          reminder_time: reminders.reminderTime
        },
        status: "scheduled" as const
      };

      // Book the meeting via API
      const bookingResponse = await meetingsApi.bookMeeting(bookingData);
      
      // Convert API response to component format
      const booking: MeetingBooking = {
        id: bookingResponse.id,
        leadId: bookingResponse.lead_id,
        meetingType: {
          id: bookingResponse.meeting_type.id,
          name: bookingResponse.meeting_type.name,
          description: bookingResponse.meeting_type.description,
          duration: bookingResponse.meeting_type.duration_minutes,
          type: bookingResponse.meeting_type.type,
          location: bookingResponse.meeting_type.location,
          maxParticipants: bookingResponse.meeting_type.max_participants,
          requiresPreparation: bookingResponse.meeting_type.requires_preparation,
          tags: bookingResponse.meeting_type.tags
        },
        date: selectedDate,
        startTime: selectedTime,
        endTime: computedEndTime || addMinutes(selectedTime, selectedMeetingType.duration),
        location: bookingResponse.location,
        participants: bookingResponse.participants,
        agenda: bookingResponse.agenda,
        preparationNotes: bookingResponse.preparation_notes,
        reminderSettings: {
          email: bookingResponse.reminder_settings.email,
          sms: bookingResponse.reminder_settings.sms,
          calendar: bookingResponse.reminder_settings.calendar,
          reminderTime: bookingResponse.reminder_settings.reminder_time
        },
        status: bookingResponse.status as any,
        aiInsights: { suggestedAgenda: "", preparationTips: "", conversationStarters: [], followUpActions: [], conversionProbability: lead.aiInsights?.conversionProbability ?? 0 }
      };

      onBookMeeting(booking);
      if (lead?.uid) localStorage.removeItem(`interview-draft:${lead.uid}`);
      
      // Show success notification
      toast({
        title: "Meeting scheduled",
        description: `${selectedMeetingType.name} scheduled with ${lead.name} for ${formatDate(selectedDate)} at ${selectedTime}`,
        variant: "default"
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to book meeting:', error);
      
      // Show error notification
      toast({
        title: "Failed to schedule meeting",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBooking(false);
    }
  }, [lead, selectedMeetingType, selectedDate, selectedTime, selectedLocation, agenda, preparationNotes, reminders, computedEndTime, onBookMeeting, onClose, toast, isBooking]);

  if (!isOpen || !lead) return null;

  return (
    <>
      {/* Main container */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meetingBookerTitle"
        className={`bg-card border border-border rounded-2xl shadow-2xl overflow-hidden grid grid-rows-[auto_1fr] transition-all duration-200 ${
          mode === "floating" ? `fixed z-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}` :
          mode === "docked" ? "fixed right-4 top-[72px] z-40" :
          "fixed inset-0 z-50 rounded-none"
        }`}
        style={{
          willChange: mode === "floating" ? "transform" : undefined,
          transform: mode === "floating" ? `translate3d(${position.x}px, ${position.y}px, 0)` : undefined,
          width: mode === "floating" ? size.width :
                 mode === "docked" ? Math.min(640, Math.round(window.innerWidth * 0.38)) :
                 "100%",
          height: mode === "floating" ? size.height :
                  mode === "docked" ? Math.round(window.innerHeight - 96) :
                  "100%"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with drag handle */}
        <div
          className={`flex items-center justify-between p-4 border-b border-border bg-background select-none ${mode === "floating" ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
          onDragStart={(e) => e.preventDefault()}
          draggable={false}
          onPointerDown={beginDrag}
        >
          <div className="flex items-center gap-3">
            {mode === "floating" && <GripVertical className="h-4 w-4 text-muted-foreground" />}
              <Calendar className="h-5 w-5 text-accent" />
            <div>
              <h2 id="meetingBookerTitle" className="text-lg font-semibold text-foreground">Book a Meeting</h2>
              <p className="text-xs text-muted-foreground">
                {lead.name} • {lead.courseInterest} • {lead.campusPreference}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2" data-no-drag>
            {/* Display mode controls */}
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode(mode === "floating" ? "docked" : "floating")}
                title={mode === "floating" ? "Dock to sidebar" : "Float window"}
              >
                {mode === "floating" ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
            <Button
              onClick={handleBook}
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={!selectedMeetingType || !selectedDate || !selectedTime || !selectedLocation || isLoadingTypes || isLoadingSlots || isBooking}
              title="⌘/Ctrl+Enter"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> 
              {isBooking ? "Booking…" : (isLoadingTypes || isLoadingSlots) ? "Loading..." : "Book"}
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex h-[calc(90vh-72px)]">
          {/* Left Sidebar - Meeting Types */}
          <div className="w-80 border-r border-border/50 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Meeting Types</h3>
            <div className="space-y-3">
              {isLoadingTypes ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading meeting types...
                </div>
              ) : (
                meetingTypes.map((type) => (
                <div
                  key={type.id}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    selectedMeetingType?.id === type.id
                      ? 'accent-border accent-bg'
                      : 'border-border hover:border-accent/30 hover:accent-bg'
                  }`}
                  onClick={() => {
                    setSelectedMeetingType(type);
                    setSelectedLocation((prev) => prev || type.location);
                    setSelectedDate("");       // clear to force re-pick
                    setSelectedTime("");       // clear to force re-pick
                  }}
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
                ))
              )}
            </div>
          </div>

          {/* Right: Details & Preparation */}
          <div className="flex-1 p-6 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Details
                </TabsTrigger>
                <TabsTrigger value="prep" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Preparation
                </TabsTrigger>
              </TabsList>

              {/* DETAILS */}
              <TabsContent value="details" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" /> Meeting Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Date</label>
                        <Select value={selectedDate} onValueChange={(v) => {
                          setSelectedDate(v);
                          setSelectedTime(""); // force re-pick for new date
                        }}>
                          <SelectTrigger><SelectValue placeholder="Select date" /></SelectTrigger>
                          <SelectContent>
                            {[...new Set(availableSlots.filter(s => s.available).map(s => s.date))].map(d => (
                              <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Time</label>
                        <Select value={selectedTime} onValueChange={setSelectedTime}>
                          <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                          <SelectContent>
                            {availableSlots.filter(s => s.date === selectedDate && s.available).map(s => (
                              <SelectItem key={s.id} value={s.startTime}>{s.startTime}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {computedEndTime && (
                          <div className="text-xs text-muted-foreground mt-1">Ends {computedEndTime}</div>
                        )}
                      </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">Location</label>
                      <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                          <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="virtual"><div className="flex items-center gap-2"><Video className="h-4 w-4" /> Virtual</div></SelectItem>
                            <SelectItem value="campus"><div className="flex items-center gap-2"><Building className="h-4 w-4" /> Campus</div></SelectItem>
                            <SelectItem value="phone"><div className="flex items-center gap-2"><Phone className="h-4 w-4" /> Phone</div></SelectItem>
                        </SelectContent>
                      </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Agenda</label>
                      <Textarea 
                        placeholder="Brief agenda (e.g., Welcome → Course overview → Portfolio → Q&A → Next steps)"
                        value={agenda}
                        onChange={(e) => setAgenda(e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Quick grid of slots */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" /> Available Time Slots
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      {isLoadingSlots ? (
                        <div className="col-span-3 text-center py-8 text-muted-foreground">
                          Loading available slots...
                        </div>
                      ) : (
                        availableSlots.filter(s => s.available).map(s => (
                        <button
                          key={s.id}
                          className={`p-3 rounded-lg border text-left transition-all duration-200
                            ${selectedDate === s.date && selectedTime === s.startTime ? "accent-border accent-bg" : "border-border hover:border-accent/30 hover:accent-bg"}`}
                          onClick={() => { setSelectedDate(s.date); setSelectedTime(s.startTime); }}
                        >
                          <div className="text-sm font-medium">{formatDate(s.date)}</div>
                            <div className="text-xs text-muted-foreground">
                            {s.startTime} – {selectedMeetingType ? addMinutes(s.startTime, selectedMeetingType.duration) : s.endTime}
                          </div>
                        </button>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PREPARATION */}
              <TabsContent value="prep" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Preparation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Preparation Notes</label>
                      <Textarea 
                        placeholder="Key points to prepare (timeline, portfolio guidance, finance info, audition criteria)…"
                        value={preparationNotes}
                        onChange={(e) => setPreparationNotes(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Reminders</label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox id="r-email" checked={reminders.email} onCheckedChange={(v) => setReminders(p => ({ ...p, email: !!v }))} />
                          <label htmlFor="r-email" className="text-sm">Email reminder</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="r-sms" checked={reminders.sms} onCheckedChange={(v) => setReminders(p => ({ ...p, sms: !!v }))} />
                          <label htmlFor="r-sms" className="text-sm">SMS reminder</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="r-cal" checked={reminders.calendar} onCheckedChange={(v) => setReminders(p => ({ ...p, calendar: !!v }))} />
                          <label htmlFor="r-cal" className="text-sm">Add to calendar</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Remind</span>
                          <Input
                            type="number"
                            min={5}
                            step={5}
                            value={reminders.reminderTime}
                            onChange={(e) => setReminders(p => ({ ...p, reminderTime: parseInt(e.target.value || "30", 10) }))}
                            className="h-8 w-28"
                          />
                          <span className="text-xs text-muted-foreground">minutes before</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>
        </div>

        {/* Resize handle - only in floating mode */}
        {mode === "floating" && (
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize bg-transparent"
            onPointerDown={beginResize}
            style={{
              background: 'linear-gradient(-45deg, transparent 45%, hsl(var(--border)) 45%, hsl(var(--border)) 55%, transparent 55%)'
            }}
          />
        )}
      </div>
    </>
  );
};

export default MeetingBooker;
