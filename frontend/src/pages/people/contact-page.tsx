import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { peopleApi, PersonEnriched } from '@/services/api';
import { aiLeadsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, Phone, Calendar, MapPin, Zap, FileText, Heart, Video, Target, 
  Award, CheckCircle, GraduationCap, Plus, BarChart3, ChevronUp, ChevronDown, Search, Globe, RefreshCw, Brain, Upload, Filter, Clock, User, Sparkles, Edit, Copy, X
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
  
  // Ask Ivy integration
  const { IvyOverlay, setIvyContext, openIvy } = useIvy();

  // Activities toolbar state
  const [activeTab, setActiveTab] = useState<ActivityKind>('all');
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  
  // Activity state for optimistic updates
  interface ActivityItem {
    id: string;
    type: 'email' | 'call' | 'meeting' | 'website' | 'workflow' | 'property_updated';
    title: string;
    subtitle?: string;
    when: string;
    icon: React.ReactNode;
    tintClass: string;
  }
  
  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: '1',
      type: 'email',
      title: `Email sent to ${person?.first_name || 'contact'}`,
      subtitle: 'Subject: Course Application Follow-up • Opens: 1 • Clicks: 0',
      when: '2h ago',
      icon: <Mail className="h-3.5 w-3.5" />,
      tintClass: 'bg-accent/10 text-accent'
    },
    {
      id: '2',
      type: 'website',
      title: 'Website visit',
      subtitle: 'Course Overview, Application Form • 8 minutes',
      when: '1d ago',
      icon: <Globe className="h-3.5 w-3.5" />,
      tintClass: 'bg-success/10 text-success'
    },
    {
      id: '3',
      type: 'call',
      title: 'Call completed',
      subtitle: '15 minutes • Discussed course requirements',
      when: '2d ago',
      icon: <Phone className="h-3.5 w-3.5" />,
      tintClass: 'bg-info/10 text-info'
    },
    {
      id: '4',
      type: 'workflow',
      title: 'Workflow assigned',
      subtitle: '"New Lead Nurture" workflow started',
      when: '3d ago',
      icon: <RefreshCw className="h-3.5 w-3.5" />,
      tintClass: 'bg-warning/10 text-warning'
    }
  ]);
  
  const appendActivity = useCallback((item: ActivityItem) => {
    setActivities(prev => [item, ...prev]);
  }, []);

  // Inline property editing
  const handleInlinePropertySave = useCallback(async (field: string, value: string) => {
    if (!person) return;
    
    try {
      // Update the person data optimistically
      const updatedPerson = { ...person, [field]: value };
      setPerson(updatedPerson);
      
      // Add activity log
      appendActivity({
        id: Date.now().toString(),
        type: 'property_updated',
        title: `Updated ${field.replace('_', ' ')}`,
        subtitle: `Changed to: ${value}`,
        when: new Date().toISOString(),
        icon: <Edit className="h-3.5 w-3.5" />,
        tintClass: 'bg-success/10 text-success'
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
      
    } catch (error) {
      console.error('Failed to save property:', error);
      // Revert optimistic update
      setPerson(person);
      
      // Show error message (you could add a toast notification here)
      alert(`Failed to save ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [person, appendActivity]);

  // Handle field detection from Ask Ivy
  const handleFieldDetected = useCallback((field: string, value?: string) => {
    setDetectedField(field);
    setDetectedValue(value || null);
    setIsInlineEditOpen(true);
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
    return base;
  }, [activities, activeTab, query]);

  // TimelineItem component for consistency
  const TimelineItem = ({ 
    icon, tintClass, title, subtitle, when 
  }: { 
    icon: React.ReactNode; 
    tintClass: string; 
    title: string; 
    subtitle?: string; 
    when: string;
  }) => (
    <div className="group grid grid-cols-[28px_1fr_60px] gap-3 p-3 min-h-[44px] rounded-lg border border-border bg-white hover:bg-muted/50 hover:shadow transition-all duration-200 cursor-pointer overflow-hidden">
      <span className={`h-7 w-7 rounded-full grid place-items-center flex-shrink-0 ${tintClass}`}>
        {icon}
      </span>
      <div className="min-w-0 overflow-hidden">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <time className="text-xs text-muted-foreground text-right flex-shrink-0 whitespace-nowrap">{when}</time>
    </div>
  );

  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-8 text-muted-foreground">
      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm font-medium mb-1">No activities yet</p>
      <p className="text-xs">Activities will appear here as they happen</p>
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
      appendActivity
    };
  }, [person, appendActivity]);

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

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header: Avatar • Name • Stage • Readiness */}
      <Card className="border-border sticky top-0 z-10">
        <CardContent className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border border-card" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-foreground truncate">
                    {`${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed Person'}
                  </h1>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {person.lifecycle_state}
                  </Badge>
                  <Badge
                    className={
                      conversionPercent > 70
                        ? 'bg-success/10 text-success border-success/20 hover:bg-success hover:text-white'
                        : conversionPercent > 40
                        ? 'bg-warning/10 text-warning border-warning/20 hover:bg-warning hover:text-white'
                        : 'bg-muted text-muted-foreground border-muted hover:bg-foreground/80 hover:text-white'
                    }
                  >
                    {conversionPercent > 70 ? 'High' : conversionPercent > 40 ? 'Med' : 'Low'} readiness
                  </Badge>
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
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-1.5"
                onClick={() => setIsCallConsoleOpen(true)}
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-1.5"
                onClick={() => setIsEmailComposerOpen(true)}
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-1.5"
                onClick={() => setIsMeetingBookerOpen(true)}
              >
                <Video className="h-3.5 w-3.5" />
                Meeting
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Task
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ask Ivy Inline Input */}
      <Card className="border-success bg-success text-white">
        <CardContent className="p-4">
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
              className="h-6 px-2 text-xs text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => setIsEmailHistoryOpen(true)}
            >
              Show me all emails from {person.first_name}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => setAiSummariesExpanded(true)}
            >
              What's her conversion probability?
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => setIsCallConsoleOpen(true)}
            >
              Schedule a demo call
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs text-white/80 hover:bg-white/10 hover:text-white"
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
          <div className="sticky top-[92px] space-y-4">
            <Card className="flex flex-col h-[calc(100vh-120px)]">
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
          <Card>
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
              <div className="divide-y rounded-md border">
                {filteredActivities.length ? filteredActivities.map(a => (
                  <div key={a.id} className="p-3 hover:bg-muted/60 transition-colors">
                    <TimelineItem icon={a.icon} tintClass={a.tintClass} title={a.title} subtitle={a.subtitle} when={a.when} />
                  </div>
                )) : <EmptyState />}
              </div>
            </CardContent>
          </Card>
        </main>

        {/* RIGHT: Quick Access + AI Summary */}
        <section className="col-span-4">
          <div className="sticky top-[92px] space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold tracking-tight">Quick access</CardTitle>
                <p className="text-xs text-muted-foreground">Open tools without asking Ivy</p>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => setIsCallConsoleOpen(true)}>
                  <Phone className="h-3.5 w-3.5" /> Call console
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => setIsEmailComposerOpen(true)}>
                  <Mail className="h-3.5 w-3.5" /> Email composer
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => setIsMeetingBookerOpen(true)}>
                  <Video className="h-3.5 w-3.5" /> Book meeting
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => setIsEmailHistoryOpen(true)}>
                  <FileText className="h-3.5 w-3.5" /> Email history
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => setIsInlineEditOpen(true)}>
                  <Edit className="h-3.5 w-3.5" /> Inline property editor
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2"
                  onClick={() =>
                    appendActivity({
                      id: crypto.randomUUID(),
                      type: 'workflow',
                      title: 'Task created',
                      subtitle: 'Follow up tomorrow',
                      when: 'just now',
                      icon: <Target className="h-3.5 w-3.5" />,
                      tintClass: 'bg-warning/10 text-warning'
                    })
                  }
                >
                  <Target className="h-3.5 w-3.5" /> Add task
                </Button>
              </CardContent>
            </Card>

            <AIScoreGraph personId={person.id} personData={person} triageData={triageData} />

            <Card>
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
                  />
                </CardContent>
              )}
            </Card>
          </div>
        </section>
      </div>

      {/* Key Metrics (Always Visible) and Collapsible Panels (mobile only) */}
      <div className="lg:hidden">
        {/* Key Metrics (Always Visible) */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border bg-white">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="h-4 w-4 text-warning" />
                <span className="text-2xl font-bold text-foreground">{person.lead_score ?? 0}</span>
              </div>
              <p className="text-xs text-muted-foreground">Lead Score</p>
              <p className="text-xs text-muted-foreground mt-1">Above average</p>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-white">
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
                <div className="space-y-1">
                  {filteredActivities.slice(0, 5).map(activity => (
                    <TimelineItem
                      key={activity.id}
                      icon={activity.icon}
                      tintClass={activity.tintClass}
                      title={activity.title}
                      subtitle={activity.subtitle}
                      when={activity.when}
                    />
                  ))}
                  {filteredActivities.length === 0 && <EmptyState />}
                </div>
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
        onSaveCall={(callData) => {
          console.log('Call saved:', callData);
          
          // Optimistic timeline append
          appendActivity({
            id: crypto.randomUUID(),
            type: 'call',
            title: `Call with ${person?.first_name || 'contact'}`,
            subtitle: `${Math.round(callData.duration / 60)} minutes • ${callData.outcome?.type || 'Completed'}`,
            when: 'just now',
            icon: <Phone className="h-3.5 w-3.5" />,
            tintClass: 'bg-info/10 text-info'
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
            
            // Optimistic timeline append
            appendActivity({
              id: crypto.randomUUID(),
              type: 'email',
              title: `Email sent to ${person?.first_name || 'contact'}`,
              subtitle: `Subject: ${emailData.subject} • ${emailData.intent || 'manual'}`,
              when: 'just now',
              icon: <Mail className="h-3.5 w-3.5" />,
              tintClass: 'bg-accent/10 text-accent'
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
        onBookMeeting={(meetingData) => {
          console.log('Meeting booked:', meetingData);
          
          // Optimistic timeline append
          appendActivity({
            id: crypto.randomUUID(),
            type: 'meeting',
            title: `Meeting scheduled with ${person?.first_name || 'contact'}`,
            subtitle: `${meetingData.meetingType || 'Demo'} • ${meetingData.location}`,
            when: 'just now',
            icon: <Video className="h-3.5 w-3.5" />,
            tintClass: 'bg-success/10 text-success'
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
      "px-2.5 h-7 rounded-full text-xs border transition-colors",
      active ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-muted border-border"
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
    <div className="space-y-1 py-1 group">
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



