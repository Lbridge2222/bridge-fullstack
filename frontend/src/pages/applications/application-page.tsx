import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicationsApi, type ApplicationCard } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, Mail, Phone, Calendar, FileText, User, 
  Clock, AlertTriangle, Star, Sparkles, Copy, Target, Brain, 
  Globe, Shield, History, Download, Eye, Edit2, Save, X, Plus
} from 'lucide-react';
import { CallConsole, type Lead as CallConsoleLead } from '@/components/CallConsole';
import EmailComposer from '@/components/EmailComposer';
import MeetingBooker from '@/components/MeetingBooker';
import EmailHistoryModal from '@/components/EmailHistoryModal';
import { useIvy } from '@/ivy/useIvy';
import { useToast } from '@/components/ui/toast';
import { Skeleton, SkeletonCircle } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Utility functions
const fmtDate = (d?: string) => (d && !Number.isNaN(Date.parse(d)) 
  ? new Date(d).toLocaleDateString() 
  : '—');

const getNumericId = (application: any): number => {
  return Number(application.application_id?.slice(-8) || 0);
};

interface ApplicationDetails {
  application: ApplicationCard;
  personalInfo?: {
    fullName: string;
    email: string;
    phone: string;
    address?: string;
    dateOfBirth?: string;
    nationality?: string;
  };
  academicInfo?: {
    currentQualifications: Array<{
      qualification: string;
      subject: string;
      grade?: string;
      institution: string;
      year: string;
    }>;
    previousQualifications: Array<{
      qualification: string;
      subject: string;
      grade: string;
      institution: string;
      year: string;
    }>;
    expectedUcasPoints?: number;
    personalStatement?: string;
    apelApplication?: boolean;
  };
  financialInfo?: {
    studentLoanStatus: 'applied' | 'approved' | 'pending' | 'not_applied';
    feeStatus: 'home' | 'international' | 'pending';
    feeAmount?: number;
    paymentPlan?: string;
  };
  verificationInfo?: {
    idChecks: Array<{
      type: 'passport' | 'driving_license' | 'birth_certificate';
      status: 'verified' | 'pending' | 'rejected';
      verifiedDate?: string;
    }>;
    references: Array<{
      name: string;
      relationship: string;
      contact: string;
      status: 'received' | 'pending' | 'chased';
      receivedDate?: string;
    }>;
  };
  documents?: Array<{
    type: string;
    name: string;
    uploadedDate: string;
    status: 'uploaded' | 'verified' | 'pending';
    url?: string;
  }>;
  timeline?: Array<{
    date: string;
    event: string;
    description: string;
    user: string;
  }>;
}

const ApplicationDetailPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isCallConsoleOpen, setIsCallConsoleOpen] = useState(false);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [isMeetingBookerOpen, setIsMeetingBookerOpen] = useState(false);
  const [isEmailHistoryOpen, setIsEmailHistoryOpen] = useState(false);
  
  // Collapsible section states
  const [aiInsightsExpanded, setAiInsightsExpanded] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(true);
  
  // Editing states
  const [isEditingQualifications, setIsEditingQualifications] = useState(false);
  const [editedQualifications, setEditedQualifications] = useState<any[]>([]);
  const [isSavingQualifications, setIsSavingQualifications] = useState(false);
  const [editingQualIndex, setEditingQualIndex] = useState<number | null>(null);
  
  // Ask Ivy integration
  const { IvyOverlay, openIvy } = useIvy();
  const { push: toast } = useToast();

  // Save qualifications with audit logging
  const saveQualifications = async () => {
    if (!applicationId || !editedQualifications || editedQualifications.length === 0) return;
    
    console.log('💾 SAVING QUALIFICATIONS');
    console.log('🔍 editedQualifications:', editedQualifications);
    
    setIsSavingQualifications(true);
    try {
      // Get old qualifications array from the raw API data
      const currentDecisionFactors = (application?.application as any)?.decision_factors || {};
      const oldQualificationsArray = currentDecisionFactors?.qualifications_list || [];
      
      console.log('🔍 Old qualifications_list:', oldQualificationsArray);
      console.log('🔍 New qualifications_list:', editedQualifications);
      
      await applicationsApi.updateField(
        applicationId,
        'decision_factors',
        { qualifications_list: oldQualificationsArray },
        { qualifications_list: editedQualifications },
        undefined, // user_id - would come from auth context
        'Updated qualifications'
      );
      
      console.log('✅ Save API call completed');
      
      // Refresh application data WITHOUT full page reload
      const apiData = await applicationsApi.getDetails(applicationId);
      
      // Re-transform the data (same logic as initial load)
      const updatedApplication: ApplicationDetails = {
        application: {
          application_id: apiData.application.id,
          person_id: apiData.application.person_id,
          stage: apiData.application.stage,
          status: apiData.application.status,
          first_name: apiData.application.first_name,
          last_name: apiData.application.last_name,
          email: apiData.application.email,
          phone: apiData.application.phone,
          programme_name: 'Programme Name',
          campus_name: 'Campus Name',
          lead_score: Math.round((apiData.application.progression_probability || 0) * 100),
          conversion_probability: apiData.application.enrollment_probability || 0,
          created_at: apiData.application.created_at,
          last_activity_at: apiData.application.updated_at,
          priority: apiData.application.priority,
          urgency: apiData.application.urgency,
          progression_probability: apiData.application.progression_probability,
          enrollment_probability: apiData.application.enrollment_probability,
          next_stage_eta_days: apiData.application.next_stage_eta_days,
          enrollment_eta_days: apiData.application.enrollment_eta_days,
          progression_blockers: apiData.application.progression_blockers,
          recommended_actions: apiData.application.recommended_actions,
          cycle_label: '2024/25',
          sla_overdue: false,
          has_offer: apiData.offers.length > 0,
          has_active_interview: apiData.interviews.some((i: any) => !i.outcome),
          // Keep raw decision_factors for editing
          decision_factors: apiData.application.decision_factors
        } as any,
        personalInfo: {
          fullName: `${apiData.application.first_name} ${apiData.application.last_name}`,
          email: apiData.application.email,
          phone: apiData.application.phone,
          address: [
            apiData.application.address_line1,
            apiData.application.address_line2,
            apiData.application.city,
            apiData.application.postcode,
            apiData.application.country
          ].filter(Boolean).join(', ') || 'Not provided',
          dateOfBirth: apiData.application.date_of_birth || 'Not provided',
          nationality: apiData.application.nationality || 'Not provided'
        },
        academicInfo: (() => {
          const decisionFactors = apiData.application.decision_factors || {};
          let qualificationsList = decisionFactors.qualifications_list || [];
          const personalStatement = decisionFactors.personal_statement || {};
          
          console.log('🔍 DEBUG - decision_factors:', decisionFactors);
          console.log('🔍 DEBUG - qualifications_list:', qualificationsList);
          console.log('🔍 DEBUG - old qualifications:', decisionFactors.qualifications);
          
          // If no qualifications_list, try to convert old format
          if (qualificationsList.length === 0 && decisionFactors.qualifications) {
            const oldQual = decisionFactors.qualifications;
            console.log('🔄 Converting old format to new:', oldQual);
            if (oldQual.type) {
              const subjects = oldQual.subjects || ['Various'];
              qualificationsList = subjects.map((subject: string) => ({
                type: oldQual.type,
                subject: subject,
                grade: oldQual.predicted_grades || oldQual.predicted_score?.toString() || 'Pending',
                institution: 'Not specified',
                year: new Date().getFullYear().toString(),
                submitted: oldQual.submitted || false,
                verified: oldQual.verified || false
              }));
            }
          }
          
          console.log('✅ DEBUG - Final qualificationsList:', qualificationsList);
          
          // Transform qualifications_list array to display format
          const quals = qualificationsList.map((qual: any) => ({
            qualification: qual.type || 'Not specified',
            subject: qual.subject || 'Various',
            grade: qual.grade || qual.predicted_score?.toString() || 'Pending',
            institution: qual.institution || 'Not specified',
            year: qual.year || new Date().getFullYear().toString()
          }));
          
          console.log('✅ DEBUG - Transformed quals for display:', quals);
          
          // Calculate total UCAS points from all qualifications
          const totalUcasPoints = qualificationsList.reduce((sum: number, qual: any) => {
            return sum + (qual.ucas_points || 0);
          }, 0);
          
          return {
            currentQualifications: quals,
            previousQualifications: [],
            expectedUcasPoints: totalUcasPoints,
            personalStatement: personalStatement.submitted ? 
              `Personal statement submitted (${personalStatement.word_count || 0} words)${personalStatement.reviewed ? ' - Reviewed' : ' - Pending review'}` : 
              'Not submitted',
            apelApplication: false
          };
        })(),
        financialInfo: application?.financialInfo,
        verificationInfo: application?.verificationInfo,
        documents: application?.documents,
        timeline: application?.timeline
      };
      
      setApplication(updatedApplication);
      
      toast({
        title: 'Qualifications Updated',
        description: 'Changes have been saved and logged.',
        variant: 'default'
      });
      
      setIsEditingQualifications(false);
    } catch (error) {
      console.error('Error saving qualifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to save qualifications. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSavingQualifications(false);
    }
  };

  // Fetch application details
  useEffect(() => {
    if (!applicationId) return;

    const fetchApplication = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get real data from API
        const apiData = await applicationsApi.getDetails(applicationId);
        
        // Transform API data to match our interface
        const application: ApplicationDetails = {
          application: {
            application_id: apiData.application.id,
            stage: apiData.application.stage,
            status: apiData.application.status,
            first_name: apiData.application.first_name,
            last_name: apiData.application.last_name,
            email: apiData.application.email,
            phone: apiData.application.phone,
            programme_name: 'Programme Name', // This would come from programme_id join
            campus_name: 'Campus Name', // This would come from intake_id join
            lead_score: Math.round(apiData.application.progression_probability * 100),
            conversion_probability: apiData.application.enrollment_probability,
            created_at: apiData.application.created_at,
            last_activity_at: apiData.application.updated_at,
            priority: apiData.application.priority,
            urgency: apiData.application.urgency,
            progression_probability: apiData.application.progression_probability,
            enrollment_probability: apiData.application.enrollment_probability,
            next_stage_eta_days: apiData.application.next_stage_eta_days,
            enrollment_eta_days: apiData.application.enrollment_eta_days,
            progression_blockers: apiData.application.progression_blockers,
            recommended_actions: apiData.application.recommended_actions,
            person_id: apiData.application.person_id,
            cycle_label: '2024/25', // Would come from intake_id join
            sla_overdue: false, // Would be calculated
            has_offer: apiData.offers.length > 0,
            has_active_interview: apiData.interviews.some((i: any) => !i.outcome)
          },
          personalInfo: {
            fullName: `${apiData.application.first_name} ${apiData.application.last_name}`,
            email: apiData.application.email,
            phone: apiData.application.phone,
            address: [
              apiData.application.address_line1,
              apiData.application.address_line2,
              apiData.application.city,
              apiData.application.postcode,
              apiData.application.country
            ].filter(Boolean).join(', ') || 'Not provided',
            dateOfBirth: apiData.application.date_of_birth || 'Not provided',
            nationality: apiData.application.nationality || 'Not provided'
          },
          // Extract academic info from decision_factors JSONB
          academicInfo: (() => {
            const decisionFactors = apiData.application.decision_factors || {};
            let qualificationsList = decisionFactors.qualifications_list || [];
            const personalStatement = decisionFactors.personal_statement || {};
            
            // If no qualifications_list, try to convert old format
            if (qualificationsList.length === 0 && decisionFactors.qualifications) {
              const oldQual = decisionFactors.qualifications;
              if (oldQual.type) {
                const subjects = oldQual.subjects || ['Various'];
                qualificationsList = subjects.map((subject: string) => ({
                  type: oldQual.type,
                  subject: subject,
                  grade: oldQual.predicted_grades || oldQual.predicted_score?.toString() || 'Pending',
                  institution: 'Not specified',
                  year: new Date().getFullYear().toString(),
                  submitted: oldQual.submitted || false,
                  verified: oldQual.verified || false
                }));
              }
            }
            
            // Transform qualifications_list array to display format
            const quals = qualificationsList.map((qual: any) => ({
              qualification: qual.type || 'Not specified',
              subject: qual.subject || 'Various',
              grade: qual.grade || qual.predicted_score?.toString() || 'Pending',
              institution: qual.institution || 'Not specified',
              year: qual.year || new Date().getFullYear().toString()
            }));
            
            // Calculate total UCAS points from all qualifications
            const totalUcasPoints = qualificationsList.reduce((sum: number, qual: any) => {
              return sum + (qual.ucas_points || 0);
            }, 0);
            
            return {
              currentQualifications: quals,
              previousQualifications: [],
              expectedUcasPoints: totalUcasPoints,
              personalStatement: personalStatement.submitted ? 
                `Personal statement submitted (${personalStatement.word_count || 0} words)${personalStatement.reviewed ? ' - Reviewed' : ' - Pending review'}` : 
                'Not submitted',
              apelApplication: false
            };
          })(),
          // Extract financial info from decision_factors JSONB
          financialInfo: (() => {
            const decisionFactors = apiData.application.decision_factors || {};
            const feeStatus = decisionFactors.fee_status || {};
            
            return {
              studentLoanStatus: feeStatus.student_finance_application || 'not_started',
              feeStatus: feeStatus.fee_status || 'not_declared',
              feeAmount: feeStatus.fee_status === 'home' ? 9250 : feeStatus.fee_status === 'international' ? 18000 : 0,
              paymentPlan: feeStatus.student_finance_application === 'approved' ? 'Student Finance' : 
                          feeStatus.student_finance_application === 'submitted' ? 'Student Finance (Pending)' :
                          'To be confirmed'
            };
          })(),
          // Extract verification info from decision_factors JSONB
          verificationInfo: (() => {
            const decisionFactors = apiData.application.decision_factors || {};
            const idVerification = decisionFactors.id_verification || {};
            const references = decisionFactors.references || {};
            
            const idChecks: Array<{
              type: 'passport' | 'driving_license' | 'birth_certificate';
              status: 'pending' | 'verified' | 'rejected';
              verifiedDate?: string;
            }> = [];
            
            if (idVerification.passport_submitted) {
              idChecks.push({
                type: 'passport' as const,
                status: idVerification.passport_verified ? 'verified' as const : 'pending' as const,
                verifiedDate: idVerification.passport_verified ? apiData.application.updated_at : undefined
              });
            }
            
            // If no ID checks submitted yet
            if (idChecks.length === 0) {
              idChecks.push({
                type: 'passport' as const,
                status: 'pending' as const,
                verifiedDate: undefined
              });
            }
            
            // References - we don't have individual reference data, so show summary
            const refList = [];
            if (references.academic_reference_received) {
              refList.push({
                name: 'Academic Reference',
                relationship: 'Academic Referee',
                contact: 'On file',
                status: 'received' as const,
                receivedDate: apiData.application.updated_at
              });
            }
            if (references.professional_reference_received) {
              refList.push({
                name: 'Professional Reference',
                relationship: 'Professional Referee',
                contact: 'On file',
                status: 'received' as const,
                receivedDate: apiData.application.updated_at
              });
            }
            
            // If references not complete, show pending
            if (!references.references_complete && refList.length < 2) {
              const needed = 2 - refList.length;
              for (let i = 0; i < needed; i++) {
                refList.push({
                  name: 'Reference Pending',
                  relationship: 'Referee',
                  contact: 'Not provided',
                  status: 'pending' as const,
                  receivedDate: undefined
                });
              }
            }
            
            return {
              idChecks,
              references: refList
            };
          })(),
          // Documents - we don't have a documents table yet, so show based on decision_factors
          documents: (() => {
            const decisionFactors = apiData.application.decision_factors || {};
            const docs = [];
            
            if (decisionFactors.personal_statement?.submitted) {
              docs.push({
                type: 'Personal Statement',
                name: 'personal_statement.pdf',
                uploadedDate: apiData.application.updated_at,
                status: decisionFactors.personal_statement.reviewed ? 'verified' as const : 'uploaded' as const,
                url: '#'
              });
            }
            
            if (decisionFactors.qualifications?.submitted) {
              docs.push({
                type: 'Qualifications',
                name: 'qualifications.pdf',
                uploadedDate: apiData.application.updated_at,
                status: decisionFactors.qualifications.verified ? 'verified' as const : 'uploaded' as const,
                url: '#'
              });
            }
            
            if (decisionFactors.id_verification?.passport_submitted) {
              docs.push({
                type: 'Passport',
                name: 'passport.pdf',
                uploadedDate: apiData.application.updated_at,
                status: decisionFactors.id_verification.passport_verified ? 'verified' as const : 'uploaded' as const,
                url: '#'
              });
            }
            
            if (decisionFactors.id_verification?.proof_of_address_submitted) {
              docs.push({
                type: 'Proof of Address',
                name: 'proof_of_address.pdf',
                uploadedDate: apiData.application.updated_at,
                status: decisionFactors.id_verification.proof_of_address_verified ? 'verified' as const : 'uploaded' as const,
                url: '#'
              });
            }
            
            if (decisionFactors.fee_status?.evidence_submitted) {
              docs.push({
                type: 'Fee Status Evidence',
                name: 'fee_status_evidence.pdf',
                uploadedDate: apiData.application.updated_at,
                status: decisionFactors.fee_status.evidence_verified ? 'verified' as const : 'uploaded' as const,
                url: '#'
              });
            }
            
            if (decisionFactors.english_language?.ielts_submitted) {
              docs.push({
                type: 'IELTS Certificate',
                name: 'ielts_certificate.pdf',
                uploadedDate: apiData.application.updated_at,
                status: 'uploaded' as const,
                url: '#'
              });
            }
            
            return docs;
          })(),
          timeline: [
            // Add application creation event
            {
              date: apiData.application.created_at,
              event: 'Application Created',
              description: 'Application was created in the system',
              user: 'System'
            },
            // Add activities from API
            ...apiData.activities.map((activity: any) => ({
              date: activity.created_at,
              event: activity.activity_title || activity.activity_type,
              description: activity.activity_description || 'Activity recorded',
              user: 'System'
            })),
            // Add interviews from API
            ...apiData.interviews.map((interview: any) => ({
              date: interview.scheduled_start || interview.created_at,
              event: 'Interview',
              description: interview.outcome ? `Interview completed - ${interview.outcome}` : 'Interview scheduled',
              user: 'Admissions Team'
            })),
            // Add offers from API
            ...apiData.offers.map((offer: any) => ({
              date: offer.issued_at,
              event: `${offer.type} Offer`,
              description: offer.status ? `Offer ${offer.status}` : 'Offer created',
              user: 'Admissions Team'
            }))
          ]
        };
        
        setApplication(application);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load application');
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId]);

  // Convert ApplicationCard to CallConsole Lead format
  const convertToCallConsoleLead = useMemo((): CallConsoleLead | null => {
    if (!application?.application) return null;
    
    const app = application.application;
    return {
      id: getNumericId(app),
      uid: app.application_id,
      name: `${app.first_name || ''} ${app.last_name || ''}`.trim() || 'Unnamed Applicant',
      email: app.email || '',
      phone: app.phone || '',
      courseInterest: app.programme_name || '',
      statusType: app.stage || '',
      nextAction: 'Follow up',
      followUpDate: app.last_activity_at || '',
      aiInsights: {
        conversionProbability: app.conversion_probability || 0,
        recommendedAction: 'Follow up',
        callStrategy: 'Follow up'
      }
    };
  }, [application]);

  const initials = useMemo(() => {
    const app = application?.application;
    const f = app?.first_name?.[0] || '';
    const l = app?.last_name?.[0] || '';
    return (f + l).toUpperCase() || '?';
  }, [application]);

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-semantic-error';
      case 'high': return 'bg-brand-accent';
      case 'medium': return 'bg-semantic-warning';
      case 'low': return 'bg-semantic-success';
      default: return 'bg-muted';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency?.toLowerCase()) {
      case 'high': return 'bg-semantic-error';
      case 'medium': return 'bg-brand-accent';
      case 'low': return 'bg-semantic-success';
      default: return 'bg-muted';
    }
  };

  const getStageColor = (stage?: string) => {
    switch (stage?.toLowerCase()) {
      case 'enquiry': return 'bg-semantic-info';
      case 'application_submitted': return 'bg-brand-secondary';
      case 'interview': return 'bg-semantic-warning';
      case 'conditional_offer': return 'bg-semantic-success';
      case 'unconditional_offer': return 'bg-semantic-success';
      case 'enrolled': return 'bg-semantic-success';
      case 'rejected': return 'bg-semantic-error';
      default: return 'bg-muted';
    }
  };

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
            </div>
          </CardContent>
        </Card>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <AlertTriangle className="h-12 w-12 text-semantic-error mb-4" />
        <h2 className="text-lg font-semibold mb-2">Error Loading Application</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => navigate('/admissions/applications')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Applications
        </Button>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Application Not Found</h2>
        <p className="text-muted-foreground mb-4">The requested application could not be found.</p>
        <Button onClick={() => navigate('/admissions/applications')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Applications
        </Button>
      </div>
    );
  }

  const app = application.application;
  const conversionPercent = Math.round((app.conversion_probability || 0) * 100);
  
  // Determine what data is available based on application stage
  const isEnquiry = app.stage === 'enquiry';
  const isPreApplication = app.stage === 'pre_application';
  const isApplicationSubmitted = ['application_submitted', 'interview_portfolio', 'review_in_progress', 'review_complete', 'director_review_in_progress', 'director_review_complete', 'conditional_offer_no_response', 'unconditional_offer_no_response', 'conditional_offer_accepted', 'unconditional_offer_accepted', 'ready_to_enrol', 'enrolled', 'rejected', 'offer_withdrawn', 'offer_declined'].includes(app.stage);
  
  // Show appropriate sections based on stage
  const showAcademicInfo = isApplicationSubmitted;
  const showDocuments = isApplicationSubmitted;
  const showFinancialInfo = isApplicationSubmitted;
  const showVerificationInfo = isApplicationSubmitted;
  const showTimeline = !isEnquiry; // Show timeline for pre-application and beyond

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header: Avatar • Name • Stage • Status */}
      <Card className="relative overflow-hidden border-border/70 sticky top-0 z-20 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-md">
        {/* Decorative gradient accents */}
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
              {/* Back button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admissions/applications')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              {/* Avatar */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-secondary to-semantic-success flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-white/70">
                  {initials}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStageColor(app.stage)}`} />
              </div>
              
              {/* Name and basic info */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-lg font-semibold text-foreground truncate">
                    {app.first_name} {app.last_name}
                  </h1>
                  <Badge variant="secondary" className="text-xs">
                    #{app.application_id?.slice(-8)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={`text-xs ${getStageColor(app.stage)} text-white border-0 cursor-help`}>
                          {app.stage?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">
                          <strong>Application Stage:</strong> Current position in the admissions process.<br/>
                          <span className="text-muted-foreground">Shows where the applicant is in their journey</span>
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {app.priority && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs cursor-help">
                            <div className={`w-2 h-2 rounded-full mr-1 ${getPriorityColor(app.priority)}`} />
                            {app.priority}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">
                            <strong>Priority:</strong> How important this application is to handle.<br/>
                            <span className="text-muted-foreground">Critical → High → Medium → Low</span>
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {app.urgency && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs cursor-help">
                            <div className={`w-2 h-2 rounded-full mr-1 ${getUrgencyColor(app.urgency)}`} />
                            {app.urgency}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">
                            <strong>Urgency:</strong> How time-sensitive this application is.<br/>
                            <span className="text-muted-foreground">High → Medium → Low</span>
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEmailComposerOpen(true)}
                className="gap-2 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-brand-secondary hover:text-white transition-all"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCallConsoleOpen(true)}
                className="gap-2 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-brand-secondary hover:text-white transition-all"
              >
                <Phone className="h-4 w-4" />
                Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMeetingBookerOpen(true)}
                className="gap-2 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-brand-secondary hover:text-white transition-all"
              >
                <Calendar className="h-4 w-4" />
                Meeting
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openIvy({})}
                className="gap-2 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-brand-secondary hover:text-white transition-all"
              >
                <Sparkles className="h-4 w-4" />
                Ask Ivy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* AI Insights Panel */}
          <Card className="border-border/70 bg-card/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-accent" />
                  <CardTitle className="text-base">AI Insights & Predictions</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAiInsightsExpanded(!aiInsightsExpanded)}
                  className="bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all"
                >
                  {aiInsightsExpanded ? 'Collapse' : 'Expand'}
                </Button>
              </div>
            </CardHeader>
            {aiInsightsExpanded && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between cursor-help">
                            <span className="text-sm text-muted-foreground">Conversion Probability</span>
                            <span className="text-sm font-medium">{conversionPercent}%</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">
                            <strong>ML Prediction:</strong> Likelihood this applicant will enroll.<br/>
                            <span className="text-muted-foreground">Based on historical data and applicant profile</span>
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="h-2 w-full bg-secondary rounded-full">
                      <div 
                        className="h-2 bg-gradient-to-r from-semantic-info to-semantic-success rounded-full transition-all duration-300"
                        style={{ width: `${conversionPercent}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between cursor-help">
                            <span className="text-sm text-muted-foreground">Lead Score</span>
                            <span className="text-sm font-medium">{app.lead_score || 0}/100</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">
                            <strong>ML Score:</strong> Overall quality assessment of this lead.<br/>
                            <span className="text-muted-foreground">Based on engagement, profile completeness, and behavior</span>
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="h-2 w-full bg-secondary rounded-full">
                      <div 
                        className="h-2 bg-gradient-to-r from-semantic-warning to-brand-accent rounded-full transition-all duration-300"
                        style={{ width: `${app.lead_score || 0}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-between cursor-help">
                            <span className="text-sm text-muted-foreground">Days in Pipeline</span>
                            <span className="text-sm font-medium">{app.days_in_pipeline || 0}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">
                            <strong>Pipeline Duration:</strong> How long this application has been in the system.<br/>
                            <span className="text-muted-foreground">From initial enquiry to current stage</span>
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="text-xs text-muted-foreground">
                      Since {fmtDate(app.created_at)}
                    </div>
                  </div>
                </div>
                
                {/* AI Recommendations */}
                {app.recommended_actions && app.recommended_actions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Recommended Actions</h4>
                    <div className="space-y-2">
                      {app.recommended_actions.slice(0, 3).map((action: any, index: number) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg">
                          <Target className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{action.action}</p>
                            <p className="text-xs text-muted-foreground">{action.impact}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Application Details Tabs */}
          <Card className="border-border/70 bg-card/95 backdrop-blur-sm">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className={`grid w-full ${showAcademicInfo ? 'grid-cols-5' : 'grid-cols-1'} bg-muted/60 backdrop-blur-sm border border-border`}>
                <TabsTrigger value="overview" className="data-[state=active]:bg-background">Overview</TabsTrigger>
                {showAcademicInfo && <TabsTrigger value="academic" className="data-[state=active]:bg-background">Academic</TabsTrigger>}
                {showDocuments && <TabsTrigger value="documents" className="data-[state=active]:bg-background">Documents</TabsTrigger>}
                {showFinancialInfo && <TabsTrigger value="financial" className="data-[state=active]:bg-background">Financial</TabsTrigger>}
                {showVerificationInfo && <TabsTrigger value="verification" className="data-[state=active]:bg-background">Verification</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 p-4">
                {/* Stage-specific messaging */}
                {isEnquiry && (
                  <div className="bg-status-info-bg border border-status-info-border rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-medium text-status-info-text mb-2">Enquiry Stage</h4>
                    <p className="text-sm text-status-info-text/80">
                      This is an initial enquiry. The applicant has shown interest but hasn't started the application process yet.
                      {!showTimeline && ' Timeline and detailed information will be available once they begin their application.'}
                    </p>
                  </div>
                )}
                
                {isPreApplication && (
                  <div className="bg-status-warning-bg border border-status-warning-border rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-medium text-status-warning-text mb-2">Pre-Application Stage</h4>
                    <p className="text-sm text-status-warning-text/80">
                      The applicant has started the application process but hasn't submitted a complete application yet.
                      Basic information is available, with more details coming as they complete their application.
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Personal Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Full Name</span>
                        <span className="text-sm font-medium">{application.personalInfo?.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Email</span>
                        <span className="text-sm font-medium">{application.personalInfo?.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Phone</span>
                        <span className="text-sm font-medium">{application.personalInfo?.phone}</span>
                      </div>
                      {showAcademicInfo && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Nationality</span>
                          <span className="text-sm font-medium">{application.personalInfo?.nationality}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Application Details</h4>
                    <div className="space-y-2">
                      {showAcademicInfo && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Programme</span>
                            <span className="text-sm font-medium">{app.programme_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Campus</span>
                            <span className="text-sm font-medium">{app.campus_name}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Cycle</span>
                        <span className="text-sm font-medium">{app.cycle_label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Source</span>
                        <span className="text-sm font-medium">{app.source || 'Direct'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="academic" className="space-y-4 p-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium">Current Qualifications</h4>
                      {!isEditingQualifications && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            console.log('📝 EDIT BUTTON CLICKED');
                            console.log('🔍 Current application object:', application?.application);
                            
                            setIsEditingQualifications(true);
                            // Initialize with current qualifications array
                            const decisionFactors = (application?.application as any)?.decision_factors || {};
                            let currentQualsList = decisionFactors.qualifications_list || [];
                            
                            console.log('🔍 decision_factors from application:', decisionFactors);
                            console.log('🔍 qualifications_list:', currentQualsList);
                            
                            // If no qualifications_list, check if old format exists and convert it
                            if (currentQualsList.length === 0 && decisionFactors.qualifications) {
                              const oldQual = decisionFactors.qualifications;
                              console.log('🔄 Converting old format:', oldQual);
                              if (oldQual.type) {
                                // Convert old single qualification to array format
                                const subjects = oldQual.subjects || ['Various'];
                                currentQualsList = subjects.map((subject: string) => ({
                                  type: oldQual.type,
                                  subject: subject,
                                  grade: oldQual.predicted_grades || oldQual.predicted_score?.toString() || '',
                                  institution: 'Not specified',
                                  year: new Date().getFullYear().toString(),
                                  submitted: oldQual.submitted || false,
                                  verified: oldQual.verified || false
                                }));
                              }
                            }
                            
                            console.log('✅ Final currentQualsList to edit:', currentQualsList);
                            setEditedQualifications(currentQualsList.length > 0 ? [...currentQualsList] : [{ type: '', subject: '', grade: '', institution: '', year: new Date().getFullYear().toString(), submitted: false, verified: false }]);
                          }}
                          className="gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Button>
                      )}
                      {isEditingQualifications && (
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setIsEditingQualifications(false);
                              setEditedQualifications([]);
                              setEditingQualIndex(null);
                            }}
                            disabled={isSavingQualifications}
                            className="gap-1"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={saveQualifications}
                            disabled={isSavingQualifications}
                            className="gap-1 bg-brand-secondary hover:bg-brand-secondary/90"
                          >
                            <Save className="h-3 w-3" />
                            {isSavingQualifications ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {!isEditingQualifications ? (
                      <div className="space-y-2">
                        {application.academicInfo?.currentQualifications.length === 0 ? (
                          <div className="p-4 bg-muted/30 rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">No qualifications recorded</p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => setIsEditingQualifications(true)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Qualifications
                            </Button>
                          </div>
                        ) : (
                          <>
                            {application.academicInfo?.currentQualifications.map((qual, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{qual.qualification} - {qual.subject}</p>
                                  <p className="text-xs text-muted-foreground">{qual.institution} ({qual.year})</p>
                                </div>
                                <Badge variant="secondary">{qual.grade}</Badge>
                              </div>
                            ))}
                            <div className="text-xs text-muted-foreground mt-2">
                              Total: {application.academicInfo?.currentQualifications.length} qualification{application.academicInfo?.currentQualifications.length !== 1 ? 's' : ''}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {editedQualifications.map((qual, index) => (
                          <div key={index} className="p-4 border border-border/50 rounded-lg bg-muted/20 space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-xs font-semibold">Qualification {index + 1}</h5>
                              {editedQualifications.length > 1 && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    const newQuals = editedQualifications.filter((_, i) => i !== index);
                                    setEditedQualifications(newQuals);
                                  }}
                                  className="h-6 w-6 p-0 text-semantic-error hover:bg-semantic-error/10"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium mb-1 block">Type</label>
                                <select 
                                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                                  value={qual.type || ''}
                                  onChange={(e) => {
                                    const newQuals = [...editedQualifications];
                                    newQuals[index] = { ...newQuals[index], type: e.target.value };
                                    setEditedQualifications(newQuals);
                                  }}
                                >
                                  <option value="">Select type</option>
                                  <option value="A-Level">A-Level</option>
                                  <option value="GCSE">GCSE</option>
                                  <option value="BTEC">BTEC</option>
                                  <option value="International Baccalaureate">International Baccalaureate</option>
                                  <option value="Scottish Highers">Scottish Highers</option>
                                  <option value="Access to HE">Access to HE</option>
                                </select>
                              </div>
                              
                              <div>
                                <label className="text-xs font-medium mb-1 block">Subject</label>
                                <input 
                                  type="text"
                                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                                  value={qual.subject || ''}
                                  onChange={(e) => {
                                    const newQuals = [...editedQualifications];
                                    newQuals[index] = { ...newQuals[index], subject: e.target.value };
                                    setEditedQualifications(newQuals);
                                  }}
                                  placeholder="e.g., Mathematics"
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-medium mb-1 block">Grade</label>
                                <input 
                                  type="text"
                                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                                  value={qual.grade || qual.predicted_score || ''}
                                  onChange={(e) => {
                                    const newQuals = [...editedQualifications];
                                    newQuals[index] = { ...newQuals[index], grade: e.target.value };
                                    setEditedQualifications(newQuals);
                                  }}
                                  placeholder="e.g., A*"
                                />
                              </div>
                              
                              <div>
                                <label className="text-xs font-medium mb-1 block">Institution</label>
                                <input 
                                  type="text"
                                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                                  value={qual.institution || ''}
                                  onChange={(e) => {
                                    const newQuals = [...editedQualifications];
                                    newQuals[index] = { ...newQuals[index], institution: e.target.value };
                                    setEditedQualifications(newQuals);
                                  }}
                                  placeholder="School/College"
                                />
                              </div>
                              
                              <div>
                                <label className="text-xs font-medium mb-1 block">Year</label>
                                <input 
                                  type="text"
                                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                                  value={qual.year || ''}
                                  onChange={(e) => {
                                    const newQuals = [...editedQualifications];
                                    newQuals[index] = { ...newQuals[index], year: e.target.value };
                                    setEditedQualifications(newQuals);
                                  }}
                                  placeholder="2023"
                                />
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-xs">
                                <input 
                                  type="checkbox"
                                  checked={qual.submitted || false}
                                  onChange={(e) => {
                                    const newQuals = [...editedQualifications];
                                    newQuals[index] = { ...newQuals[index], submitted: e.target.checked };
                                    setEditedQualifications(newQuals);
                                  }}
                                  className="rounded border-border"
                                />
                                Submitted
                              </label>
                              
                              <label className="flex items-center gap-2 text-xs">
                                <input 
                                  type="checkbox"
                                  checked={qual.verified || false}
                                  onChange={(e) => {
                                    const newQuals = [...editedQualifications];
                                    newQuals[index] = { ...newQuals[index], verified: e.target.checked };
                                    setEditedQualifications(newQuals);
                                  }}
                                  className="rounded border-border"
                                />
                                Verified
                              </label>
                            </div>
                          </div>
                        ))}
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditedQualifications([
                              ...editedQualifications,
                              { type: '', subject: '', grade: '', institution: '', year: new Date().getFullYear().toString(), submitted: false, verified: false }
                            ]);
                          }}
                          className="w-full gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Another Qualification
                        </Button>
                        
                        <div className="text-xs text-muted-foreground bg-status-info-bg border border-status-info-border p-2 rounded">
                          💡 Changes will be saved to the audit log for compliance tracking
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-3">Expected UCAS Points</h4>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-semantic-warning" />
                      <span className="text-lg font-bold">{application.academicInfo?.expectedUcasPoints || 0}</span>
                      <span className="text-sm text-muted-foreground">points</span>
                    </div>
                  </div>
                  
                  {application.academicInfo?.personalStatement && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Personal Statement</h4>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground line-clamp-4">
                          {application.academicInfo.personalStatement}
                        </p>
                        <Button variant="ghost" size="sm" className="mt-2">
                          <Eye className="h-4 w-4 mr-1" />
                          View Full Statement
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="documents" className="space-y-4 p-4">
                <div className="space-y-3">
                  {application.documents?.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.type}</p>
                          <p className="text-xs text-muted-foreground">{doc.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={doc.status === 'verified' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {doc.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="financial" className="space-y-4 p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Student Loan Status</span>
                    <Badge 
                      variant={application.financialInfo?.studentLoanStatus === 'applied' ? 'default' : 'secondary'}
                    >
                      {application.financialInfo?.studentLoanStatus?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fee Status</span>
                    <Badge variant="outline">
                      {application.financialInfo?.feeStatus}
                    </Badge>
                  </div>
                  {application.financialInfo?.feeAmount && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Annual Fee</span>
                      <span className="text-sm font-medium">£{application.financialInfo.feeAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="verification" className="space-y-4 p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-3">ID Verification</h4>
                    <div className="space-y-2">
                      {application.verificationInfo?.idChecks.map((check, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{check.type.replace('_', ' ')}</p>
                              {check.verifiedDate && (
                                <p className="text-xs text-muted-foreground">Verified {fmtDate(check.verifiedDate)}</p>
                              )}
                            </div>
                          </div>
                          <Badge 
                            variant={check.status === 'verified' ? 'default' : 'secondary'}
                          >
                            {check.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-3">References</h4>
                    <div className="space-y-2">
                      {application.verificationInfo?.references.map((ref, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{ref.name}</p>
                            <p className="text-xs text-muted-foreground">{ref.relationship} • {ref.contact}</p>
                          </div>
                          <Badge 
                            variant={ref.status === 'received' ? 'default' : 'secondary'}
                          >
                            {ref.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4">
          
          {/* Quick Actions */}
          <Card className="border-border/70 bg-card/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start bg-background/60 backdrop-blur-sm border-border/50 hover:bg-brand-accent hover:text-white transition-all"
                onClick={() => setIsEmailComposerOpen(true)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start bg-background/60 backdrop-blur-sm border-border/50 hover:bg-brand-accent hover:text-white transition-all"
                onClick={() => setIsCallConsoleOpen(true)}
              >
                <Phone className="h-4 w-4 mr-2" />
                Make Call
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start bg-background/60 backdrop-blur-sm border-border/50 hover:bg-brand-accent hover:text-white transition-all"
                onClick={() => setIsMeetingBookerOpen(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start bg-background/60 backdrop-blur-sm border-border/50 hover:bg-brand-accent hover:text-white transition-all"
                onClick={() => openIvy({})}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Ask Ivy
              </Button>
            </CardContent>
          </Card>

          {/* Timeline - only show for pre-application and beyond */}
          {showTimeline && (
            <Card className="border-border/70 bg-card/95 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTimelineExpanded(!timelineExpanded)}
                    className="bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all"
                  >
                    {timelineExpanded ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </CardHeader>
              {timelineExpanded && (
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {application.timeline?.map((event, index) => (
                      <div key={index} className="relative pl-6">
                        <div className="absolute left-2 top-2 w-2 h-2 bg-accent rounded-full" />
                        <div className="absolute left-3 top-4 w-px h-full bg-border" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{event.event}</p>
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {fmtDate(event.date)} • {event.user}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
              )}
            </Card>
          )}

          {/* Contact Information */}
          <Card className="border-border/70 bg-card/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{app.email}</p>
                  <Button variant="ghost" size="sm" className="h-6 p-0 text-xs bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all">
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{app.phone}</p>
                  <Button variant="ghost" size="sm" className="h-6 p-0 text-xs bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all">
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
              {application.personalInfo?.address && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{application.personalInfo.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <CallConsole
        isOpen={isCallConsoleOpen}
        onClose={() => setIsCallConsoleOpen(false)}
        lead={convertToCallConsoleLead}
        onSaveCall={(callData) => {
          console.log('Call saved:', callData);
          toast({
            title: "Call Logged",
            description: `Call with ${app.first_name} has been logged successfully.`,
          });
        }}
      />

      <EmailComposer
        isOpen={isEmailComposerOpen}
        onClose={() => setIsEmailComposerOpen(false)}
        lead={{
          id: getNumericId(app),
          uid: app.application_id,
          name: `${app.first_name} ${app.last_name}`,
          email: app.email || '',
          phone: app.phone || '',
          courseInterest: app.programme_name || '',
          academicYear: app.cycle_label || '2024/25',
          campusPreference: app.campus_name || '',
          enquiryType: app.source || '',
          leadSource: app.source || '',
          status: app.stage || '',
          statusType: app.stage as any,
          leadScore: app.lead_score || 0,
          createdDate: app.created_at || '',
          lastContact: app.last_activity_at || '',
          nextAction: 'Follow up',
          slaStatus: app.urgency === 'high' ? 'urgent' as const : 'within_sla' as const,
          contactAttempts: 0,
          tags: [],
          aiInsights: {
            conversionProbability: app.conversion_probability || 0,
            recommendedAction: 'Follow up',
            bestContactTime: 'Business hours',
            urgency: (app.urgency as 'high' | 'medium' | 'low') || 'medium'
          }
        }}
        onSendEmail={async (emailData: any) => {
          console.log('Email sent:', emailData);
          toast({
            title: "Email Sent",
            description: `Email sent to ${app.first_name} successfully.`,
          });
          setIsEmailComposerOpen(false);
        }}
      />

      <MeetingBooker
        isOpen={isMeetingBookerOpen}
        onClose={() => setIsMeetingBookerOpen(false)}
        lead={{
          id: getNumericId(app),
          uid: app.application_id,
          name: `${app.first_name} ${app.last_name}`,
          email: app.email || '',
          phone: app.phone || '',
          courseInterest: app.programme_name || '',
          academicYear: app.cycle_label || '2024/25',
          campusPreference: app.campus_name || '',
          enquiryType: app.source || '',
          leadSource: app.source || '',
          status: app.stage || '',
          statusType: app.stage as any,
          leadScore: app.lead_score || 0,
          createdDate: app.created_at || '',
          lastContact: app.last_activity_at || '',
          nextAction: 'Follow up',
          slaStatus: app.urgency === 'high' ? 'urgent' as const : 'within_sla' as const,
          contactAttempts: 0,
          tags: [],
          aiInsights: {
            conversionProbability: app.conversion_probability || 0,
            recommendedAction: 'Follow up',
            bestContactTime: 'Business hours',
            urgency: (app.urgency as 'high' | 'medium' | 'low') || 'medium'
          }
        }}
        onBookMeeting={async (meetingData: any) => {
          console.log('Meeting booked:', meetingData);
          toast({
            title: "Meeting Scheduled",
            description: `Meeting with ${app.first_name} has been scheduled successfully.`,
          });
          setIsMeetingBookerOpen(false);
        }}
      />

      <EmailHistoryModal
        isOpen={isEmailHistoryOpen}
        onClose={() => setIsEmailHistoryOpen(false)}
        personId={app.person_id}
        personName={`${app.first_name} ${app.last_name}`}
      />

      {/* Ask Ivy Overlay */}
      <IvyOverlay />
    </div>
  );
};

export default ApplicationDetailPage;
