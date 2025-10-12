import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { peopleApi, activitiesApi, type PersonEnriched } from '@/services/api';
import { aiLeadsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, Phone, Calendar, MapPin, Zap, FileText, Heart, Video, Target, 
  Award, CheckCircle, GraduationCap, Plus, BarChart3, ChevronUp, ChevronDown, Search, Globe, RefreshCw, Brain, Upload, Filter, Clock, User, Sparkles, Edit, Copy, X, MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CallConsole, type Lead as CallConsoleLead } from '@/components/CallConsole';
import EmailComposer from '@/components/EmailComposer';
import MeetingBooker from '@/components/MeetingBooker';
import EmailHistoryModal from '@/components/EmailHistoryModal';
import PersonPropertiesPanel from '@/components/Dashboard/CRM/PersonPropertiesPanel';
import AISummaryPanel from '@/components/AISummaryPanel';
import AIScoreGraph from '@/components/AIScoreGraph';
import { useIvy } from '@/ivy/useIvy';
import { InlineIvyInput } from '@/ivy/InlineIvyInput';
import { contactRegistry } from '@/ivy/contactRegistry';
import type { IvyContext } from '@/ivy/types';
import { InlinePropertyEditor } from '@/ivy/InlinePropertyEditor';
import { useActivities, type ActivityItem } from '@/hooks/useActivities';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton, SkeletonCircle, SkeletonText } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';

// Utility functions
const fmtDate = (d?: string) => (d && !Number.isNaN(Date.parse(d)) 
  ? new Date(d).toLocaleDateString() 
  : '—');

const getNumericId = (person: any): number => {
  // Handle UUID strings by creating a stable hash or using a numeric field
  return Number(person.numeric_id ?? person.lead_score ?? 0);
};

type ActivityKind = 'all' | 'email' | 'call' | 'meeting' | 'website' | 'workflow' | 'notes';

const PersonDetailPage: React.FC = () => {
  const { personId } = useParams<{ personId: string }>();
  const [person, setPerson] = useState<(PersonEnriched & Record<string, any>) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triageData, setTriageData] = useState<any>(null);
  const [mlForecastData, setMlForecastData] = useState<any>(null);
  const [filesExpanded, setFilesExpanded] = useState(false);
  
  // Utility for consistent column scrolling
  const colScroll = "h-[calc(100dvh-164px)] overflow-auto";
  
  // Collapsible section states - Default collapsed for cleaner look
  const [smartSuggestionsExpanded, setSmartSuggestionsExpanded] = useState(false);
  const [smartContextExpanded, setSmartContextExpanded] = useState(false);
  const [aiSummariesExpanded, setAiSummariesExpanded] = useState(true);
  const [lifecycleExpanded, setLifecycleExpanded] = useState(false);
  
  // Modal states - All enabled
  const [isCallConsoleOpen, setIsCallConsoleOpen] = useState(false);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [isMeetingBookerOpen, setIsMeetingBookerOpen] = useState(false);
  const [isEmailHistoryOpen, setIsEmailHistoryOpen] = useState(false);
  const [isInlineEditOpen, setIsInlineEditOpen] = useState(false);
  const [detectedField, setDetectedField] = useState<string | null>(null);
  const [detectedValue, setDetectedValue] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [queryType, setQueryType] = useState<string>('');
  const [showActionDock, setShowActionDock] = useState(false);
  
  // Ask Ivy integration
  const { IvyOverlay, setIvyContext, openIvy } = useIvy();
  const { push: toast } = useToast();

  // Activities toolbar state
  const [activeTab, setActiveTab] = useState<ActivityKind>('all');
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  
  // Use real activities from API
  const { activities, addActivity: addActivityToApi, loading: activitiesLoading } = useActivities(person?.id || null);
  
  const appendActivity = useCallback(async (item: { 
    type: string; 
    title: string; 
    subtitle?: string; 
    when?: string;
    metadata?: Record<string, any>;
  }) => {
    if (!person?.id) return;
    
    try {
      await addActivityToApi({
        person_id: person.id,
        activity_type: item.type,
        activity_title: item.title,
        activity_description: item.subtitle,
        metadata: item.metadata
      });
    } catch (error) {
      console.error('Failed to save activity:', error);
      // Could show a toast notification here
    }
  }, [person?.id, addActivityToApi]);

  // Inline property editing
  const handleInlinePropertySave = useCallback(async (field: string, value: string) => {
    if (!person) return;
    
    try {
      // Update the person data optimistically
      const updatedPerson = { ...person, [field]: value };
      setPerson(updatedPerson);
      
      // Add activity log
      await appendActivity({
        type: 'property_updated',
        title: `Updated ${field.replace('_', ' ')}`,
        subtitle: `Changed to: ${value}`,
        metadata: { field, old_value: person[field], new_value: value }
      });
      
      // Make API call to save the property
      console.log(`🔧 DEBUG: Saving ${field} = ${value} for person ${person.id}`);
      console.log(`🔧 DEBUG: Person name: ${person.first_name} ${person.last_name}`);
      
      // Check if this is a standard field or custom property
      const standardFields = ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'nationality', 'lifecycle_state'];
      
      if (standardFields.includes(field)) {
        // Use direct person update API for standard fields (including date_of_birth and nationality)
        const updateData: any = { [field]: value };
        console.log(`🔧 DEBUG: Using peopleApi.updatePerson with data:`, updateData);
        const result = await peopleApi.updatePerson(String(person.id), updateData);
        console.log('✅ Person update successful:', result);
        console.log(`🔧 DEBUG: API returned ${field}:`, result.person?.[field]);
        
        // Verify the update by fetching the person data again
        console.log(`🔧 DEBUG: Verifying update by fetching person data...`);
        const verifyResponse = await fetch(`http://localhost:8000/people/${person.id}/enriched`);
        const verifyData = await verifyResponse.json();
        console.log(`🔧 DEBUG: Verified ${field} value:`, verifyData[field]);
        
      } else {
        // Use custom properties API for other fields
        const result = await peopleApi.updatePersonProperty(String(person.id), {
          property_name: field,
          data_type: 'text',
          value: value
        });
        console.log('Custom property update successful:', result);
      }
      
      // Close the inline editor
      setIsInlineEditOpen(false);
      setDetectedField(null);
      setDetectedValue(null);
      toast({ title: 'Saved', description: `Updated ${field.replace('_', ' ')}`, variant: 'success' });
      
    } catch (error) {
      console.error('Failed to save property:', error);
      // Revert optimistic update
      setPerson(person);
      
      // Show error message
      toast({ title: 'Failed to save', description: `${field.replace('_',' ')}: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: 'destructive' });
    }
  }, [person, appendActivity, toast]);

  // Handle field detection from Ask Ivy
  const handleFieldDetected = useCallback((field: string, value?: string) => {
    console.log('🔍 DEBUG: handleFieldDetected called with field:', field, 'value:', value);
    setDetectedField(field);
    setDetectedValue(value || null);
    setIsInlineEditOpen(true);
    console.log('🔍 DEBUG: handleFieldDetected - set isInlineEditOpen to true');
  }, []);


  const filteredActivities = useMemo(() => {
    let base = activities;
    if (activeTab !== 'all') base = base.filter(a => a.type === (activeTab as any));
    if (query.trim()) {
      const q = query.toLowerCase();
      base = base.filter(a =>
        a.title.toLowerCase().includes(q) || (a.subtitle?.toLowerCase().includes(q) ?? false)
      );
    }
    // Sort by most recent
    const sorted = [...base].sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
    return sorted;
  }, [activities, activeTab, query]);

  // Time formatting and grouping helpers
  const formatRelative = useCallback((ts: number) => {
    const now = Date.now();
    const diff = Math.max(0, now - ts);
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 7) return new Date(ts).toLocaleDateString();
    if (d >= 1) return `${d}d ago`;
    if (h >= 1) return `${h}h ago`;
    if (m >= 1) return `${m}m ago`;
    return `just now`;
  }, []);

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / (24 * 60 * 60 * 1000));

  type ActivityGroup = { label: string; items: ActivityItem[] };
  const groupedActivities = useMemo<ActivityGroup[]>(() => {
    if (!filteredActivities.length) return [];
    const today = new Date();
    const buckets: Record<string, ActivityItem[]> = {};
    for (const item of filteredActivities) {
      const ts = item.ts ?? Date.now();
      const d = new Date(ts);
      const diff = daysBetween(today, d);
      const label = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff <= 7 ? 'Last 7 days' : d.toLocaleDateString();
      (buckets[label] ||= []).push(item);
    }
    return Object.entries(buckets).map(([label, items]) => ({ label, items }));
  }, [filteredActivities]);

  // TimelineItem component for consistency
  const TimelineItem = ({ 
    icon, tintClass, title, subtitle, when, ts 
  }: { 
    icon: React.ReactNode; 
    tintClass: string; 
    title: string; 
    subtitle?: string; 
    when: string;
    ts?: number;
  }) => (
    <div className="relative z-10 group grid grid-cols-[28px_1fr_60px] gap-3 p-3 min-h-[44px] rounded-lg border border-border bg-white hover:bg-muted/50 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden will-change-transform hover:-translate-y-0.5">
      <span className={`h-7 w-7 rounded-full grid place-items-center flex-shrink-0 ${tintClass}`}>
        {icon}
      </span>
      <div className="min-w-0 overflow-hidden">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <time className="text-xs text-muted-foreground text-right flex-shrink-0 whitespace-nowrap cursor-help">
              {when}
            </time>
          </TooltipTrigger>
          {ts && (
            <TooltipContent side="left" className="text-xs">{new Date(ts).toLocaleString()}</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-8">
      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
      <p className="text-sm font-medium mb-1">No activities yet</p>
      <p className="text-xs text-muted-foreground mb-3">Start by contacting this person</p>
      <div className="flex items-center justify-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setIsEmailComposerOpen(true)}>
          <Mail className="h-3.5 w-3.5 mr-1" /> Send email
        </Button>
        <Button size="sm" variant="outline" onClick={() => setIsCallConsoleOpen(true)}>
          <Phone className="h-3.5 w-3.5 mr-1" /> Log call
        </Button>
        <Button size="sm" variant="outline" onClick={() => {
          appendActivity({
            type: 'workflow',
            title: 'Note added',
            subtitle: 'Added a quick note',
            metadata: { note_type: 'quick_note' }
          });
        }}>
          <FileText className="h-3.5 w-3.5 mr-1" /> Add note
        </Button>
      </div>
    </div>
  );
  




  useEffect(() => {
    if (!personId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    peopleApi
      .getPersonEnriched(personId)
      .then((data) => {
        if (mounted) setPerson(data);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load person');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [personId]);

  // Convert PersonEnriched to CallConsole Lead format
  const convertToCallConsoleLead = useMemo((): CallConsoleLead | null => {
    if (!person) return null;
    
    return {
      id: getNumericId(person),
      uid: person.id,
      name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed Person',
      email: person.email || '',
      phone: person.phone || '',
      courseInterest: person.latest_programme_name || '',
      statusType: person.lifecycle_state || '',
      nextAction: person.next_best_action || '',
      followUpDate: person.last_activity_at || '',
      aiInsights: {
        conversionProbability: person.conversion_probability || 0,
        callStrategy: person.next_best_action || 'Follow up',
        recommendedAction: person.next_best_action || 'Follow up'
      }
    };
  }, [person]);

  // Convert PersonEnriched to EmailComposer/MeetingBooker Lead format
  const convertToLead = useMemo(() => {
    if (!person) return null;
    
    return {
      id: getNumericId(person),
      uid: person.id,
      name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed Person',
      email: person.email || '',
      phone: person.phone || '',
      courseInterest: person.latest_programme_name || '',
      academicYear: person.latest_academic_year || '',
      campusPreference: person.latest_campus_name || '',
      enquiryType: person.lifecycle_state || '',
      leadSource: person.source || '',
      status: person.latest_application_stage || '',
      statusType: 'new' as const,
      leadScore: person.lead_score || 0,
      createdDate: person.created_at || '',
      lastContact: person.last_engagement_date || person.last_activity_at || '',
      nextAction: person.next_best_action || '',
      slaStatus: 'within_sla' as const,
      contactAttempts: person.touchpoint_count || 0,
      tags: [],
      aiInsights: {
        conversionProbability: person.conversion_probability || 0,
        bestContactTime: person.preferred_contact_method || 'email',
        recommendedAction: person.next_best_action || 'Follow up',
        urgency: 'medium' as const
      }
    };
  }, [person]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case '/':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'c':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setIsCallConsoleOpen(true);
          }
          break;
        case 'e':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setIsEmailComposerOpen(true);
          }
          break;
        case 'm':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setIsMeetingBookerOpen(true);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Floating action dock visibility based on scroll
  useEffect(() => {
    const onScroll = () => {
      try {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        setShowActionDock(y > 240);
      } catch {}
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll as any);
  }, []);

  // Setup Ivy context when person data changes
  useEffect(() => {
    if (!person) return;
    
    setIvyContext({
      personId: person.id,
      personName: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
      personData: person,
      openEmailComposer: (opts) => {
        if (opts?.template) {
          // Could pre-populate with template
        }
        setIsEmailComposerOpen(true);
      },
      openCallConsole: () => setIsCallConsoleOpen(true),
      openMeetingBooker: (opts) => {
        if (opts?.type) {
          // Could pre-set meeting type
        }
        setIsMeetingBookerOpen(true);
      },
      openEmailHistory: () => setIsEmailHistoryOpen(true),
      expandPanel: (key) => {
        if (key === "properties") setLifecycleExpanded(true);
        if (key === "activities") setSmartSuggestionsExpanded(true);
        if (key === "ai") setAiSummariesExpanded(true);
      },
      appendActivity
    });
  }, [person, setIvyContext, appendActivity]);

  // Ivy context for both components
  const ivyContext: IvyContext = React.useMemo(() => {
    if (!person) return {} as IvyContext;
    
    return {
      personId: person.id,
      personName: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
      personData: person,
      openEmailHistory: () => setIsEmailHistoryOpen(true),
      openCallConsole: () => setIsCallConsoleOpen(true),
      openEmailComposer: () => setIsEmailComposerOpen(true),
      openMeetingBooker: () => setIsMeetingBookerOpen(true),
      expandPanel: (key) => {
        if (key === "properties") setLifecycleExpanded(true);
        if (key === "activities") setSmartSuggestionsExpanded(true);
        if (key === "ai") setAiSummariesExpanded(true);
      },
      startInlineEdit: () => setIsInlineEditOpen(true),
      appendActivity,
      triageData: triageData,  // Pass ML triage data to Ivy
      mlForecast: mlForecastData  // Pass ML forecast data to Ivy
    };
  }, [person, appendActivity, triageData, mlForecastData]);

  // Contact Ask Ivy Bar component
  const ContactAskIvyBar = React.useMemo(() => {
    if (!person) return null;

    return (
        <InlineIvyInput
          context={ivyContext}
          commands={contactRegistry}
          onRagFallback={(q, context) => {
            // Escalate to full palette for complex queries
            openIvy({ ...context });
          }}
          placeholder={`Ask Ivy about ${person.first_name}… (Enter to ask, ⇧Enter for actions)`}
          className=""
          enableChatMode={true}
          onFieldDetected={handleFieldDetected}
          onQuery={(query) => setLastQuery(query)}
          onQueryType={(type) => setQueryType(type)}
        />
    );
  }, [person, appendActivity, openIvy]);

  const initials = useMemo(() => {
    const f = person?.first_name?.[0] || '';
    const l = person?.last_name?.[0] || '';
    const value = `${f}${l}`.toUpperCase();
    return value || '?';
  }, [person]);

  // Dynamic property list for applicant properties
  const getApplicantProperties = useMemo(() => {
    if (!person) return [];
    
    const properties = [
      // Basic Info
      { label: 'First Name', value: person.first_name, copyable: false, fieldName: 'first_name', editable: true },
      { label: 'Last Name', value: person.last_name, copyable: false, fieldName: 'last_name', editable: true },
      { label: 'Email', value: person.email, copyable: true, fieldName: 'email', editable: true },
      { label: 'Phone', value: person.phone, copyable: true, fieldName: 'phone', editable: true },
      { label: 'Phone Country Code', value: person.phone_country_code, copyable: false, fieldName: 'phone_country_code', editable: true },
      { label: 'Phone Extension', value: person.phone_extension, copyable: false, fieldName: 'phone_extension', editable: true },
      
      // Personal Details
      { label: 'Date of Birth', value: person.date_of_birth, copyable: false, fieldName: 'date_of_birth', editable: true },
      { label: 'Nationality', value: person.nationality, copyable: false, fieldName: 'nationality', editable: true },
      
      // Address
      { label: 'Address Line 1', value: person.address_line1, copyable: false, fieldName: 'address_line1', editable: true },
      { label: 'Address Line 2', value: person.address_line2, copyable: false, fieldName: 'address_line2', editable: true },
      { label: 'City', value: person.city, copyable: false, fieldName: 'city', editable: true },
      { label: 'Postcode', value: person.postcode, copyable: false, fieldName: 'postcode', editable: true },
      { label: 'Country', value: person.country, copyable: false, fieldName: 'country', editable: true },
      
      // Status & Lifecycle
      { label: 'Lifecycle State', value: person.lifecycle_state, copyable: false, fieldName: 'lifecycle_state', editable: true },
      { label: 'Preferred Contact Method', value: person.preferred_contact_method, copyable: false, fieldName: 'preferred_contact_method', editable: true },
      
      // Application Info
      { label: 'Application Stage', value: person.latest_application_stage, copyable: false, fieldName: 'latest_application_stage', editable: false },
      { label: 'Application Source', value: person.latest_application_source, copyable: false, fieldName: 'latest_application_source', editable: false },
      { label: 'Application Date', value: person.latest_application_date ? new Date(person.latest_application_date).toLocaleDateString() : null, copyable: false, fieldName: 'latest_application_date', editable: false },
      { label: 'Application Priority', value: person.latest_application_priority, copyable: false, fieldName: 'latest_application_priority', editable: false },
      { label: 'Application Urgency', value: person.latest_application_urgency, copyable: false, fieldName: 'latest_application_urgency', editable: false },
      
      // Programme & Campus
      { label: 'Programme', value: person.latest_programme_name, copyable: false, fieldName: 'latest_programme_name', editable: false },
      { label: 'Programme Code', value: person.latest_programme_code, copyable: false, fieldName: 'latest_programme_code', editable: false },
      { label: 'Campus', value: person.latest_campus_name, copyable: false, fieldName: 'latest_campus_name', editable: false },
      { label: 'Academic Year', value: person.latest_academic_year, copyable: false, fieldName: 'latest_academic_year', editable: false },
      
      // Activity & Engagement
      { label: 'Last Activity Date', value: person.last_activity_at ? new Date(person.last_activity_at).toLocaleDateString() : null, copyable: false, fieldName: 'last_activity_at', editable: false },
      { label: 'Last Activity Title', value: person.last_activity_title, copyable: false, fieldName: 'last_activity_title', editable: false },
      { label: 'Last Activity Kind', value: person.last_activity_kind, copyable: false, fieldName: 'last_activity_kind', editable: false },
      { label: 'Last Engagement Date', value: person.last_engagement_date ? new Date(person.last_engagement_date).toLocaleDateString() : null, copyable: false, fieldName: 'last_engagement_date', editable: false },
      { label: 'Touchpoint Count', value: person.touchpoint_count?.toString(), copyable: false, fieldName: 'touchpoint_count', editable: false },
      
      // Analytics & Scoring
      { label: 'Lead Score', value: person.lead_score?.toString(), copyable: false, fieldName: 'lead_score', editable: false },
      { label: 'Engagement Score', value: person.engagement_score?.toString(), copyable: false, fieldName: 'engagement_score', editable: false },
      { label: 'Conversion Probability', value: person.conversion_probability ? `${Math.round(person.conversion_probability * 100)}%` : null, copyable: false, fieldName: 'conversion_probability', editable: false },
      
      // System Info
      { label: 'Created Date', value: person.created_at ? new Date(person.created_at).toLocaleDateString() : null, copyable: false, fieldName: 'created_at', editable: false },
      { label: 'Updated Date', value: person.updated_at ? new Date(person.updated_at).toLocaleDateString() : null, copyable: false, fieldName: 'updated_at', editable: false },
      { label: 'External Ref', value: person.external_ref, copyable: false, fieldName: 'external_ref', editable: false },
      { label: 'Org ID', value: person.org_id, copyable: false, fieldName: 'org_id', editable: false },
    ];
    
    // Filter out properties with no value and return only user-facing properties
    return properties.filter(prop => prop.value && prop.value !== '—' && prop.value !== '');
  }, [person]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="p-6 text-muted-foreground">{error}</div>;
  if (!person) return <div className="p-6 text-sm text-muted-foreground">Not found.</div>;

  const conversionPercent = Math.round((person.conversion_probability || 0) * 100);

  // Lifecycle-specific content
  const getLifecycleContent = () => {
    switch (person.lifecycle_state) {
      case 'enquiry':
        return {
          title: 'Nurture Suggestions',
          icon: Heart,
          content: (
            <div className="space-y-2">
              <p className="text-sm">• Send course overview within 24h</p>
              <p className="text-sm">• Schedule campus tour</p>
              <p className="text-sm">• Share student testimonials</p>
            </div>
          )
        };
      case 'applicant':
        return {
          title: 'Offer Checklist',
          icon: CheckCircle,
          content: (
            <div className="space-y-2">
              <p className="text-sm">• ID verification</p>
              <p className="text-sm">• Financial documentation</p>
              <p className="text-sm">• Visa requirements</p>
            </div>
          )
        };
      case 'enrolled':
        return {
          title: 'Onboarding Tasks',
          icon: GraduationCap,
          content: (
            <div className="space-y-2">
              <p className="text-sm">• Welcome pack sent</p>
              <p className="text-sm">• IT account setup</p>
              <p className="text-sm">• Orientation scheduled</p>
            </div>
          )
        };
      case 'alumni':
        return {
          title: 'Engagement Prompts',
          icon: Award,
          content: (
            <div className="space-y-2">
              <p className="text-sm">• Event invitations</p>
              <p className="text-sm">• Testimonial requests</p>
              <p className="text-sm">• Mentorship opportunities</p>
            </div>
          )
        };
      default:
        return null;
    }
  };

  const lifecycleContent = getLifecycleContent();

  // Loading skeleton view
  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6" aria-busy>
        {/* Header skeleton */}
        <Card className="relative overflow-hidden border-border/70 sticky top-0 z-20 bg-white/80 backdrop-blur shadow-md">
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonCircle size={40} className="ring-2 ring-white/70" />
                <div className="min-w-0 w-56">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Skeleton className="h-7 w-20 rounded-md" />
                <Skeleton className="h-7 w-20 rounded-md" />
                <Skeleton className="h-7 w-24 rounded-md" />
                <Skeleton className="h-7 w-16 rounded-md" />
              </div>
              <div className="sm:hidden">
                <Skeleton className="h-7 w-24 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desktop grid skeleton */}
        <div className="hidden lg:grid grid-cols-12 gap-4">
          {/* Left column */}
          <aside className="col-span-3">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40 mt-1" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Middle column */}
          <main className="col-span-5">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-14 rounded-full" />
                    <Skeleton className="h-7 w-16 rounded-full" />
                    <Skeleton className="h-7 w-16 rounded-full" />
                    <Skeleton className="h-7 w-20 rounded-full" />
                  </div>
                </div>
                <div className="mt-2">
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-[28px_1fr_60px] gap-3 p-3 rounded-lg border">
                    <SkeletonCircle size={28} />
                    <SkeletonText lines={2} />
                    <Skeleton className="h-3 w-12 justify-self-end" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </main>

          {/* Right column */}
          <section className="col-span-4">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40 mt-1" />
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-md" />
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-28" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <SkeletonText lines={4} />
                </CardContent>
              </Card>
            </div>
          </section>
        </div>

        {/* Mobile skeleton */}
        <div className="lg:hidden space-y-4">
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonCircle size={24} />
                  <SkeletonText lines={2} className="flex-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header: Avatar • Name • Stage • Readiness */}
      <Card className="relative overflow-hidden border-border/70 sticky top-0 z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/65 shadow-md">
        {/* Decorative, responsive gradient accents */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-20 h-56 w-56 rounded-full blur-2xl glow-white"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-2xl glow-green"
        />
        <CardContent className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white/70">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border border-card shadow-sm" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-foreground truncate">
                    {`${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed Person'}
                  </h1>
                  <Badge variant="secondary" className="capitalize text-xs shadow-sm">
                    {person.lifecycle_state}
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          className={
                            conversionPercent > 70
                              ? 'bg-success/10 text-success border-success/20 hover:bg-success hover:text-white shadow-sm cursor-help'
                              : conversionPercent > 40
                              ? 'bg-warning/10 text-warning border-warning/20 hover:bg-warning hover:text-white shadow-sm cursor-help'
                              : 'bg-muted text-muted-foreground border-muted hover:bg-foreground/80 hover:text-white shadow-sm cursor-help'
                          }
                        >
                          {conversionPercent > 70 ? 'High' : conversionPercent > 40 ? 'Med' : 'Low'} readiness
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="start" className="max-w-xs text-xs leading-relaxed">
                        <div className="font-medium mb-1">ML Readiness</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <span className="text-muted-foreground">Probability</span>
                          <span className="tabular-nums text-right">{conversionPercent}%</span>
                          {typeof person.lead_score === 'number' && (
                            <>
                              <span className="text-muted-foreground">Lead score</span>
                              <span className="tabular-nums text-right">{person.lead_score}</span>
                            </>
                          )}
                          {person.next_best_action && (
                            <>
                              <span className="text-muted-foreground">Next action</span>
                              <span className="text-right truncate" title={String(person.next_best_action)}>{String(person.next_best_action)}</span>
                            </>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  {person.latest_programme_name && (
                    <span className="flex items-center">
                      <GraduationCap className="mr-1 h-3 w-3" />
                      {person.latest_programme_name}
                    </span>
                  )}
                  {person.latest_campus_name && (
                    <span className="flex items-center">
                      <MapPin className="mr-1 h-3 w-3" />
                      {person.latest_campus_name}
                    </span>
                  )}
                  {person.latest_academic_year && (
                    <span className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      {person.latest_academic_year}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions - With icons and full words */}
            <div className="flex items-center gap-2">
              {/* Desktop / Tablet actions */}
              <div className="hidden sm:flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-1.5 transition-transform hover:-translate-y-0.5"
                  onClick={() => setIsCallConsoleOpen(true)}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-1.5 transition-transform hover:-translate-y-0.5"
                  onClick={() => setIsEmailComposerOpen(true)}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-1.5 transition-transform hover:-translate-y-0.5"
                  onClick={() => setIsMeetingBookerOpen(true)}
                >
                  <Video className="h-3.5 w-3.5" />
                  Meeting
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-1.5 transition-transform hover:-translate-y-0.5"
                  onClick={() =>
                    appendActivity({
                      type: 'workflow',
                      title: 'Task created',
                      subtitle: 'Follow up tomorrow',
                      metadata: { task_type: 'follow_up' }
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Task
                </Button>
              </div>
              {/* Mobile action menu */}
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <MoreHorizontal className="h-4 w-4" /> Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => setIsCallConsoleOpen(true)}>
                      <Phone className="h-3.5 w-3.5 mr-2" /> Call
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsEmailComposerOpen(true)}>
                      <Mail className="h-3.5 w-3.5 mr-2" /> Email
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsMeetingBookerOpen(true)}>
                      <Video className="h-3.5 w-3.5 mr-2" /> Meeting
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() =>
                      appendActivity({
                        type: 'workflow',
                        title: 'Task created',
                        subtitle: 'Follow up tomorrow',
                        metadata: { task_type: 'follow_up' }
                      })
                    }>
                      <Plus className="h-3.5 w-3.5 mr-2" /> Add task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ask Ivy Inline Input */}
      <Card className="relative overflow-hidden border-success bg-success text-white shadow-md">
        {/* Subtle dynamic background pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(1200px 400px at 100% -10%, rgba(255,255,255,0.15), transparent 70%), radial-gradient(800px 300px at -10% 120%, rgba(255,255,255,0.12), transparent 70%)",
          }}
        />
        <CardContent className="p-4 relative">
          <div className="flex items-center gap-3 mb-3">
            <Brain className="h-5 w-5 text-white" />
            <h2 className="font-semibold text-white">Ask Ivy</h2>
            <Badge variant="outline" className="text-xs border-white/30 text-white/90">
              <Sparkles className="h-3 w-3 mr-1" />
              What would you like to know about {person.first_name}?
            </Badge>
          </div>
          
          {/* Inline Ivy Input */}
          {ContactAskIvyBar}
          
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              onClick={() => setIsEmailHistoryOpen(true)}
            >
              Show me all emails from {person.first_name}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              onClick={() => setAiSummariesExpanded(true)}
            >
              What's her conversion probability?
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              onClick={() => setIsCallConsoleOpen(true)}
            >
              Schedule a demo call
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              onClick={() => setSmartSuggestionsExpanded(true)}
            >
              Show recent activity
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Desktop 3-column layout (visible ≥ lg) */}
      <div className="hidden lg:grid grid-cols-12 gap-4">
        {/* LEFT: Applicant Properties (sticky) */}
        <aside className="col-span-3">
          <div className="space-y-4">
            <Card className="flex flex-col h-[calc(100vh-120px)] hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="text-sm font-semibold tracking-tight">Applicant Properties</CardTitle>
                <p className="text-xs text-muted-foreground">All available details</p>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-1 pr-2">
                {getApplicantProperties.map((prop, index) => (
                  <AtAGlanceProperty 
                    key={index}
                    label={prop.label} 
                    value={prop.value} 
                    copyable={prop.copyable}
                    fieldName={prop.fieldName}
                    editable={prop.editable}
                    onSave={handleInlinePropertySave}
                  />
                ))}
                <div className="pt-2 border-t">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setIsInlineEditOpen(true)}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Quick edit properties
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        {/* MIDDLE: Activity timeline (always visible) */}
        <main className="col-span-5">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold tracking-tight">Activity</CardTitle>
                <div className="flex items-center gap-2">
                  <FilterChip label="All" active={activeTab==='all'} onClick={() => setActiveTab('all')} />
                  <FilterChip label="Email" active={activeTab==='email'} onClick={() => setActiveTab('email')} />
                  <FilterChip label="Call" active={activeTab==='call'} onClick={() => setActiveTab('call')} />
                  <FilterChip label="Meeting" active={activeTab==='meeting'} onClick={() => setActiveTab('meeting')} />
                </div>
              </div>
              <div className="mt-2">
                <Input
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search activity… (/ to focus)"
                  className="h-8"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {filteredActivities.length ? (
                <div className="space-y-4">
                  {groupedActivities.map(group => (
                    <section key={group.label} className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{group.label}</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      <div className="relative">
                        <div className="absolute left-[14px] top-2 bottom-2 w-px bg-border" aria-hidden />
                        <div className="space-y-2">
                          {group.items.map(a => (
                            <TimelineItem
                              key={a.id}
                              icon={a.icon}
                              tintClass={a.tintClass}
                              title={a.title}
                              subtitle={a.subtitle}
                              when={a.ts ? formatRelative(a.ts) : a.when}
                              ts={a.ts}
                            />
                          ))}
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </CardContent>
          </Card>
        </main>

        {/* RIGHT: Quick Access + AI Summary */}
        <section className="col-span-4">
          <div className="space-y-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold tracking-tight">Quick access</CardTitle>
                <p className="text-xs text-muted-foreground">Open tools without asking Ivy</p>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="justify-start gap-2 transition-transform hover:-translate-y-0.5" onClick={() => setIsCallConsoleOpen(true)}>
                  <Phone className="h-3.5 w-3.5" /> Call console
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2 transition-transform hover:-translate-y-0.5" onClick={() => setIsEmailComposerOpen(true)}>
                  <Mail className="h-3.5 w-3.5" /> Email composer
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2 transition-transform hover:-translate-y-0.5" onClick={() => setIsMeetingBookerOpen(true)}>
                  <Video className="h-3.5 w-3.5" /> Book meeting
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2 transition-transform hover:-translate-y-0.5" onClick={() => setIsEmailHistoryOpen(true)}>
                  <FileText className="h-3.5 w-3.5" /> Email history
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2 transition-transform hover:-translate-y-0.5" onClick={() => setIsInlineEditOpen(true)}>
                  <Edit className="h-3.5 w-3.5" /> Inline property editor
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 transition-transform hover:-translate-y-0.5"
                  onClick={() =>
                    appendActivity({
                      type: 'workflow',
                      title: 'Task created',
                      subtitle: 'Follow up tomorrow',
                      metadata: { task_type: 'follow_up' }
                    })
                  }
                >
                  <Target className="h-3.5 w-3.5" /> Add task
                </Button>
              </CardContent>
            </Card>

            <AIScoreGraph personId={person.id} personData={person} triageData={triageData} />

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader 
                className="cursor-pointer hover:bg-slate-50/50 transition-colors pb-2"
                onClick={() => setAiSummariesExpanded(!aiSummariesExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold tracking-tight flex items-center gap-2">
                    <Brain className="h-4 w-4 text-accent" /> AI Summary
                  </CardTitle>
                  {aiSummariesExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
                {!aiSummariesExpanded && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ML conversion probability • Pipeline blockers • AI insights
                  </p>
                )}
              </CardHeader>
              {aiSummariesExpanded && (
                <CardContent className="pt-0">
                  <AISummaryPanel
                    personId={person.id}
                    personData={person}
                    lastQuery={lastQuery}
                    profileMode={queryType === 'lead_profile' || queryType === 'lead_info'}
                    onTriageDataChange={setTriageData}
                    onMLForecastChange={setMlForecastData}
                  />
                </CardContent>
              )}
            </Card>
          </div>
        </section>
      </div>

      {/* Floating Action Dock */}
      {showActionDock && (
        <div className="fixed bottom-5 right-5 z-40">
          <div className="bg-card/95 backdrop-blur border border-border rounded-full shadow-lg px-2 py-1 flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Open Call Console" onClick={() => setIsCallConsoleOpen(true)}>
                    <Phone className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Call</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Compose Email" onClick={() => setIsEmailComposerOpen(true)}>
                    <Mail className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Email</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Book Meeting" onClick={() => setIsMeetingBookerOpen(true)}>
                    <Video className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Meeting</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Add Task" onClick={() => appendActivity({ type: 'workflow', title: 'Task created', subtitle: 'Follow up tomorrow', metadata: { task_type: 'follow_up' } })}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Task</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Key Metrics (Always Visible) and Collapsible Panels (mobile only) */}
      <div className="lg:hidden">
        {/* Key Metrics (Always Visible) */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="h-4 w-4 text-warning" />
                <span className="text-2xl font-bold text-foreground">{person.lead_score ?? 0}</span>
              </div>
              <p className="text-xs text-muted-foreground">Lead Score</p>
              <p className="text-xs text-muted-foreground mt-1">Above average</p>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground mb-1">{conversionPercent}%</div>
              <p className="text-xs text-muted-foreground">Convert</p>
              <p className="text-xs text-muted-foreground mt-1">Medium confidence</p>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground mb-1">{person.last_activity_at ? '10' : '0'}%</div>
              <p className="text-xs text-muted-foreground">Activity</p>
              <p className="text-xs text-muted-foreground mt-1">Low engagement</p>
            </CardContent>
          </Card>
        </div>

        {/* Collapsible Panels (Ivy Controlled) */}
        <div className="space-y-4">

          {/* Activity */}
          <Card className="border-border bg-white">
            <CardHeader 
              className="cursor-pointer hover:bg-slate-50/50 transition-colors pb-2"
              onClick={() => setSmartSuggestionsExpanded(!smartSuggestionsExpanded)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-info" /> Activity
                </CardTitle>
                {smartSuggestionsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              {!smartSuggestionsExpanded && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last: Email sent 2h ago • 3 total activities
                </p>
              )}
            </CardHeader>
            {smartSuggestionsExpanded && (
              <CardContent className="pt-0">
                {filteredActivities.length ? (
                  <div className="space-y-4">
                    {groupedActivities.map(group => (
                      <section key={group.label} className="relative">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{group.label}</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="relative">
                          <div className="absolute left-[14px] top-2 bottom-2 w-px bg-border" aria-hidden />
                          <div className="space-y-2">
                            {group.items.slice(0, 5).map(activity => (
                              <TimelineItem
                                key={activity.id}
                                icon={activity.icon}
                                tintClass={activity.tintClass}
                                title={activity.title}
                                subtitle={activity.subtitle}
                                when={activity.ts ? formatRelative(activity.ts) : activity.when}
                                ts={activity.ts}
                              />
                            ))}
                          </div>
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </CardContent>
            )}
          </Card>

          {/* Properties */}
          <Card className="border-border bg-white">
            <CardHeader 
              className="cursor-pointer hover:bg-slate-50/50 transition-colors pb-2"
              onClick={() => setLifecycleExpanded(!lifecycleExpanded)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Properties
                </CardTitle>
                {lifecycleExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
              {!lifecycleExpanded && (
                <p className="text-xs text-muted-foreground mt-1">
                  Progressive disclosure • {person.lifecycle_state} stage
                </p>
              )}
            </CardHeader>
            {lifecycleExpanded && (
              <CardContent className="pt-0">
                <PersonPropertiesPanel 
                  person={person}
                  onPersonPatched={(updates) => setPerson((p) => p ? { ...p, ...updates } : p)}
                />
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Inline Property Editor */}
      <InlinePropertyEditor
        person={person}
        onSave={handleInlinePropertySave}
        onCancel={() => {
          setIsInlineEditOpen(false);
          setDetectedField(null);
          setDetectedValue(null);
        }}
        isVisible={isInlineEditOpen}
        prefillField={detectedField || undefined}
        prefillValue={detectedValue || undefined}
      />

      {/* Modal Components - All three enabled */}
      <CallConsole
        isOpen={isCallConsoleOpen}
        onClose={() => setIsCallConsoleOpen(false)}
        lead={convertToCallConsoleLead}
        onSaveCall={async (callData) => {
          console.log('Call saved:', callData);
          
          // Add activity to timeline
          await appendActivity({
            type: 'call',
            title: `Call with ${person?.first_name || 'contact'}`,
            subtitle: `${Math.round(callData.duration / 60)} minutes • ${callData.outcome?.type || 'Completed'}`,
            metadata: { duration: callData.duration, outcome: callData.outcome }
          });
          
          setIsCallConsoleOpen(false);
        }}
      />

      <EmailComposer
        isOpen={isEmailComposerOpen}
        onClose={() => setIsEmailComposerOpen(false)}
        lead={convertToLead}
        onSendEmail={async (emailData) => {
          try {
            // Log the email to the database
            if (emailData.lead) {
              await aiLeadsApi.logSentEmail({
                lead_id: emailData.lead.uid, // Use uid like CallConsole does
                subject: emailData.subject,
                body: emailData.body,
                html_body: emailData.htmlBody,
                sent_by: "user",
                intent: emailData.intent || "manual"
              });
            }
            
            // Add activity to timeline
            await appendActivity({
              type: 'email',
              title: `Email sent to ${person?.first_name || 'contact'}`,
              subtitle: `Subject: ${emailData.subject} • ${emailData.intent || 'manual'}`,
              metadata: { subject: emailData.subject, intent: emailData.intent }
            });
            
            console.log('Email logged successfully:', emailData);
            setIsEmailComposerOpen(false);
          } catch (error) {
            console.error('Failed to log email:', error);
            // Still close the composer even if logging fails
            setIsEmailComposerOpen(false);
          }
        }}
      />

      <MeetingBooker
        isOpen={isMeetingBookerOpen}
        onClose={() => setIsMeetingBookerOpen(false)}
        lead={convertToLead}
        onBookMeeting={async (meetingData) => {
          console.log('Meeting booked:', meetingData);
          
          // Add activity to timeline
          await appendActivity({
            type: 'meeting',
            title: `Meeting scheduled with ${person?.first_name || 'contact'}`,
            subtitle: `${meetingData.meetingType || 'Demo'} • ${meetingData.location}`,
            metadata: { meetingType: meetingData.meetingType, location: meetingData.location }
          });
          
          setIsMeetingBookerOpen(false);
        }}
      />

      <EmailHistoryModal
        isOpen={isEmailHistoryOpen}
        onClose={() => setIsEmailHistoryOpen(false)}
        personId={person.id}
        personName={`${person.first_name || ''} ${person.last_name || ''}`.trim()}
      />

      {/* Ask Ivy Overlay */}
      <IvyOverlay />
    </div>
  );
};

export default PersonDetailPage;

// ——— Small subcomponents
const Metric: React.FC<{ label: string; percent: number; barClass?: string }> = ({ label, percent, barClass = "bg-primary" }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-secondary">
        <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
      <span className="text-sm font-medium text-foreground">{Math.max(0, Math.min(100, percent))}%</span>
    </div>
  </div>
);

// Filter chip for activity tabs
const FilterChip: React.FC<{ label: string; active?: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-2.5 h-7 rounded-full text-xs border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring/50",
      active
        ? "bg-foreground text-background border-foreground shadow-sm"
        : "bg-background hover:bg-muted border-border hover:shadow-sm"
    )}
  >
    {label}
  </button>
);

// Inline editable property component
const AtAGlanceProperty: React.FC<{ 
  label: string; 
  value?: React.ReactNode; 
  copyable?: boolean;
  fieldName?: string;
  editable?: boolean;
  onSave?: (field: string, value: string) => void;
}> = ({ label, value = '—', copyable, fieldName, editable, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(typeof value === 'string' ? value : '');
  const [isSaving, setIsSaving] = useState(false);
  const { push: toast } = useToast();

  const handleEdit = () => {
    if (editable && fieldName) {
      setEditValue(typeof value === 'string' ? value : '');
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!fieldName || !onSave || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(fieldName, editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save property:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(typeof value === 'string' ? value : '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div className="space-y-1 py-1 group rounded-md px-2 -mx-2 hover:bg-muted/40 transition-colors">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
              autoFocus
              disabled={isSaving}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={handleSave}
              disabled={isSaving}
              aria-label="Save"
            >
              <CheckCircle className="h-3.5 w-3.5 text-success" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={handleCancel}
              disabled={isSaving}
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <>
            <span className="text-sm font-medium text-foreground break-words flex-1">{value}</span>
            {copyable && typeof value === 'string' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(value);
                  toast({ title: 'Copied', description: `${label} copied to clipboard`, variant: 'success' });
                }}
                aria-label={`Copy ${label}`}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
            {editable && fieldName && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleEdit}
                aria-label={`Edit ${label}`}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};



// Editable Property Component
