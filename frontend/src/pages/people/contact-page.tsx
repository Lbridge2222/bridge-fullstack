import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { peopleApi, PersonEnriched } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mail, Phone, Calendar, MapPin, Zap, FileText, ChevronRight, Bell, 
  MoreVertical, Heart, Video, Target, MessageSquare, Clock, Star, Download,
  MessageCircle, CalendarDays, Award, CheckCircle, GraduationCap, Plus, BarChart3, ChevronUp, ChevronDown, Search, Globe, RefreshCw, Brain
} from 'lucide-react';
import CallComposer from '@/components/CallComposer';
import EmailComposer from '@/components/EmailComposer';
import MeetingBooker from '@/components/MeetingBooker';
import PersonPropertiesPanel from '@/components/Dashboard/CRM/PersonPropertiesPanel';
import AISummaryPanel from '@/components/AISummaryPanel';

const PersonDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<(PersonEnriched & Record<string, any>) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filesExpanded, setFilesExpanded] = useState(false);
  
  // Collapsible section states
  const [smartSuggestionsExpanded, setSmartSuggestionsExpanded] = useState(true);
  const [smartContextExpanded, setSmartContextExpanded] = useState(true);
  const [aiSummariesExpanded, setAiSummariesExpanded] = useState(true);
  const [lifecycleExpanded, setLifecycleExpanded] = useState(true);
  
  // Modal states - All three enabled
  const [isCallComposerOpen, setIsCallComposerOpen] = useState(false);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [isMeetingBookerOpen, setIsMeetingBookerOpen] = useState(false);
  




  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    peopleApi
      .getPersonEnriched(id)
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
  }, [id]);

  // Convert PersonEnriched to Lead format for the composer components
  const convertToLead = useMemo(() => {
    if (!person) return null;
    
    return {
      id: parseInt(person.id) || 0,
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



  const initials = useMemo(() => {
    const f = person?.first_name?.[0] || '';
    const l = person?.last_name?.[0] || '';
    const value = `${f}${l}`.toUpperCase();
    return value || '?';
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
    <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-6">
      {/* TOP: Pinned Name Card (Full Width) */}
      <Card className="border-border sticky top-0 z-10">
        <CardContent className="px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-chart-4 to-chart-5 flex items-center justify-center text-primary-foreground text-xl font-bold shadow-sm">
                  {initials}
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-chart-2 border-2 border-card" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground truncate">
                    {`${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed Person'}
                  </h1>
                  <Badge variant="secondary" className="capitalize whitespace-nowrap">
                    {person.lifecycle_state}
                  </Badge>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {(person.latest_campus_name || person.latest_programme_name) && (
                    <span className="font-medium text-foreground flex items-center">
                      <MapPin className="mr-1 h-4 w-4" />
                      {person.latest_programme_name || 'Programme'}
                      {person.latest_campus_name ? ` • ${person.latest_campus_name}` : ''}
                    </span>
                  )}
                  {person.latest_academic_year && (
                    <span className="flex items-center">
                      <Calendar className="mr-1 h-4 w-4" /> {person.latest_academic_year}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-3">
                <div className="flex items-center gap-1">
                  <Zap className="h-5 w-5 text-chart-4" />
                  <span className="text-2xl font-bold text-foreground">{person.lead_score ?? 0}</span>
                  <span className="text-sm text-muted-foreground">Lead Score</span>
                </div>
                <Badge className={conversionPercent > 70 ? 'bg-chart-2/10 text-chart-2' : 'bg-chart-4/10 text-chart-4'}>
                  {conversionPercent}% likely to convert
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                className="bg-primary text-primary-foreground" 
                size="sm"
                onClick={() => setIsCallComposerOpen(true)}
              >
                <Phone className="mr-2 h-4 w-4" /> Call
              </Button>
              <Button 
                className="bg-chart-2 text-primary-foreground hover:bg-chart-2/90" 
                size="sm"
                onClick={() => setIsEmailComposerOpen(true)}
              >
                <Mail className="mr-2 h-4 w-4" /> Email
              </Button>
              <Button 
                className="bg-chart-4 text-primary-foreground hover:bg-chart-4/90" 
                size="sm"
                onClick={() => setIsMeetingBookerOpen(true)}
              >
                <Video className="mr-2 h-4 w-4" /> Meeting
              </Button>
              <Button className="bg-chart-1 text-primary-foreground hover:bg-chart-1/90" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Task
              </Button>
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="text-muted-foreground">Quick actions available</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* THREE COLUMN LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_300px] 2xl:grid-cols-[320px_minmax(0,1fr)_320px] gap-4">
        
                 {/* LEFT COLUMN: Enterprise Properties Panel */}
         <div className="h-[calc(100vh-280px)] max-h-[800px] bg-slate-50/30 rounded-lg">
           <PersonPropertiesPanel 
             person={person}
             onPersonPatched={(updates) => setPerson((p) => p ? { ...p, ...updates } : p)}
           />
         </div>

                 {/* MIDDLE COLUMN: Activity Timeline */}
         <ScrollArea className="h-[calc(100vh-280px)] max-h-[800px] bg-slate-50/30 rounded-lg">
           <div className="px-1 space-y-4">
                           {/* Activity Header */}
              <div className="flex items-center justify-between pb-3 bg-slate-50/50 p-3">
                <h3 className="text-lg font-semibold text-foreground">Activities</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs bg-white border-slate-200 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors">
                    <Search className="h-3 w-3 mr-1" />
                    Search activities
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs bg-white border-slate-200 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors">
                    Filter
                  </Button>
                </div>
              </div>

            {/* Activity Timeline */}
            <div className="space-y-4">
              {/* Activity Type Tabs */}
              <div className="flex items-center gap-1 bg-slate-50/50 px-3 pt-2 pb-1 border-b border-slate-200">
                <Button variant="ghost" size="sm" className="rounded-none border-b-2 border-primary px-3 py-2 h-auto bg-white/80 text-primary font-medium">
                  All Activities
                </Button>
                <Button variant="ghost" size="sm" className="rounded-none px-3 py-2 h-auto hover:bg-slate-200 hover:text-slate-800 transition-colors">
                  Emails
                </Button>
                <Button variant="ghost" size="sm" className="rounded-none px-3 py-2 h-auto hover:bg-slate-200 hover:text-slate-800 transition-colors">
                  Calls
                </Button>
                <Button variant="ghost" size="sm" className="rounded-none px-3 py-2 h-auto hover:bg-slate-200 hover:text-slate-800 transition-colors">
                  Meetings
                </Button>
                <Button variant="ghost" size="sm" className="rounded-none px-3 py-2 h-auto hover:bg-slate-200 hover:text-slate-800 transition-colors">
                  Notes
                </Button>
                <Button variant="ghost" size="sm" className="rounded-none px-3 py-2 h-auto hover:bg-slate-200 hover:text-slate-800 transition-colors">
                  Website
                </Button>
              </div>

              {/* Activity Entries */}
              <div className="space-y-3">
                {/* Email Activity */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
                    <Mail className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Email sent to {person.first_name}</p>
                      <span className="text-xs text-muted-foreground">2 hours ago</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Subject: Course Application Follow-up</p>
                    <p className="text-xs text-muted-foreground mt-1">Opens: 1 • Clicks: 0</p>
                  </div>
                </div>

                {/* Website Activity */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50">
                    <Globe className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Website visit</p>
                      <span className="text-xs text-muted-foreground">1 day ago</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Pages: Course Overview, Application Form</p>
                    <p className="text-xs text-muted-foreground mt-1">Time on site: 8 minutes</p>
                  </div>
                </div>

                {/* Call Activity */}
                <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                    <Phone className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                       <p className="text-sm font-medium text-foreground">Call scheduled</p>
                       <span className="text-xs text-muted-foreground">2 days ago</span>
                     </div>
                     <p className="text-sm text-muted-foreground mt-1">Duration: 15 minutes • Status: Completed</p>
                     <p className="text-xs text-muted-foreground mt-1">Notes: Discussed course requirements</p>
                   </div>
                 </div>

                 {/* Workflow Activity */}
                 <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm">
                   <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                     <RefreshCw className="h-4 w-4 text-blue-600" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between">
                       <p className="text-sm font-medium text-foreground">Workflow assigned</p>
                       <span className="text-xs text-muted-foreground">3 days ago</span>
                     </div>
                     <p className="text-sm text-muted-foreground mt-1">"New Lead Nurture" workflow started</p>
                     <p className="text-xs text-muted-foreground mt-1">Next step: Send welcome email</p>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </ScrollArea>

        {/* RIGHT COLUMN: AI & Lifecycle-Aware Panels */}
        <ScrollArea className="h-[calc(100vh-280px)] max-h-[800px]">
          <div className="pl-0 xl:pl-2 space-y-4">
            {/* Engagement Metrics - Always Open */}
            <Card className="border-border bg-white">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-chart-1" /> Engagement Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Metric label="Lead Score" percent={Math.min(100, Math.max(0, (person.lead_score ?? 0)))} barClass="bg-chart-2" />
                <Metric label="Conversion Readiness" percent={conversionPercent} barClass="bg-primary" />
                <Metric label="Recent Activity" percent={person.last_activity_at ? 100 : 10} barClass="bg-chart-5" />
              </CardContent>
            </Card>

            {/* AI Summary - Collapsible (Moved up for priority) */}
            <Card className="border-border bg-white">
              <CardHeader 
                className="cursor-pointer hover:bg-slate-50/50 rounded-t-lg transition-colors"
                onClick={() => setAiSummariesExpanded(!aiSummariesExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-chart-2" /> AI Intelligence Hub
                  </CardTitle>
                  {aiSummariesExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
              {aiSummariesExpanded && (
                <CardContent className="pt-0">
                  <AISummaryPanel personId={person.id} personData={person} />
                </CardContent>
              )}
            </Card>

            {/* Smart Suggestions - Collapsible */}
            <Card className="border-border bg-white">
              <CardHeader 
                className="cursor-pointer hover:bg-slate-50/50 rounded-t-lg transition-colors"
                onClick={() => setSmartSuggestionsExpanded(!smartSuggestionsExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-chart-5" /> Smart Suggestions
                  </CardTitle>
                  {smartSuggestionsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
              {smartSuggestionsExpanded && (
                <CardContent className="pt-0 space-y-2">
                  <Button variant="outline" className="w-full justify-start border-border hover:border-chart-5/30">
                    <div className="flex flex-col items-start text-left w-full">
                      <span className="text-sm font-medium text-foreground">Schedule demo call</span>
                      <span className="text-xs text-muted-foreground">High engagement</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="w-full justify-start border-border hover:border-chart-5/30">
                    <div className="flex flex-col items-start text-left w-full">
                      <span className="text-sm font-medium text-foreground">Send course overview</span>
                      <span className="text-xs text-muted-foreground">Interest in facilities</span>
                    </div>
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Smart Context - Collapsible */}
            <Card className="border-border bg-white">
              <CardHeader 
                className="cursor-pointer hover:bg-slate-50/50 rounded-t-lg transition-colors"
                onClick={() => setSmartContextExpanded(!smartContextExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="h-4 w-4 text-destructive" /> Smart Context
                  </CardTitle>
                  {smartContextExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
              {smartContextExpanded && (
                <CardContent className="pt-0 text-sm space-y-2">
                  <p className="break-words">• Lifecycle: <span className="capitalize font-medium">{person.lifecycle_state}</span></p>
                  {person.source && (<p className="break-words">• Source: {person.source}</p>)}
                  {person.last_engagement_date && (<p className="break-words">• Last engagement: {new Date(person.last_engagement_date).toLocaleDateString()}</p>)}
                  <p className="break-words">• Preferred time: {person.preferred_contact_method || 'email'}</p>
                </CardContent>
              )}
            </Card>

            {/* Lifecycle-Specific Content - Collapsible */}
            {lifecycleContent && (
              <Card className="border-border bg-white">
                <CardHeader 
                  className="cursor-pointer hover:bg-slate-50/50 rounded-t-lg transition-colors"
                  onClick={() => setLifecycleExpanded(!lifecycleExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <lifecycleContent.icon className="h-4 w-4 text-chart-4" />
                      {lifecycleContent.title}
                    </CardTitle>
                    {lifecycleExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CardHeader>
                {lifecycleExpanded && (
                  <CardContent className="pt-0 text-sm">
                    {lifecycleContent.content}
                  </CardContent>
                )}
              </Card>
            )}

            {/* Files & Attachments */}
            <Card className="border-border bg-white">
              <CardHeader 
                className="cursor-pointer hover:bg-slate-50/50 rounded-t-lg transition-colors"
                onClick={() => setFilesExpanded(!filesExpanded)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4 text-chart-3" /> Files & Attachments
                  </CardTitle>
                  {filesExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
              {filesExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 p-2 hover:bg-slate-50/50 rounded transition-colors">
                      <FileText className="h-4 w-4 text-chart-2" />
                      <span>Course Brochure.pdf</span>
                      <span className="ml-auto text-xs text-muted-foreground">2.1 MB</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 hover:bg-slate-50/50 rounded transition-colors">
                      <FileText className="h-4 w-4 text-chart-4" />
                      <span>Application Form.docx</span>
                      <span className="ml-auto text-xs text-muted-foreground">156 KB</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 hover:bg-slate-50/50 rounded transition-colors">
                      <FileText className="h-4 w-4 text-chart-1" />
                      <span>ID Document.jpg</span>
                      <span className="ml-auto text-xs text-muted-foreground">892 KB</span>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </ScrollArea>
      </div>

      {/* Modal Components - All three enabled */}
      <CallComposer
        isOpen={isCallComposerOpen}
        onClose={() => setIsCallComposerOpen(false)}
        lead={convertToLead}
        onSaveCall={(callData) => {
          console.log('Call saved:', callData);
          setIsCallComposerOpen(false);
          // TODO: Update person data or refresh
        }}
      />

      <EmailComposer
        isOpen={isEmailComposerOpen}
        onClose={() => setIsEmailComposerOpen(false)}
        lead={convertToLead}
        onSendEmail={async (emailData) => {
          console.log('Email sent:', emailData);
          setIsEmailComposerOpen(false);
          // TODO: Update person data or refresh
        }}
      />

      <MeetingBooker
        isOpen={isMeetingBookerOpen}
        onClose={() => setIsMeetingBookerOpen(false)}
        lead={convertToLead}
        onBookMeeting={(meetingData) => {
          console.log('Meeting booked:', meetingData);
          setIsMeetingBookerOpen(false);
          // TODO: Update person data or refresh
        }}
      />
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



// Editable Property Component



