import type { ApplicationCard, PersonEnriched } from '@/services/api';

// Map backend stage to frontend display stage
export function mapStageToDisplay(stage: string): string {
  const stageMap: Record<string, string> = {
    'enquiry': 'Enquiry',
    'pre_application': 'Pre Application',
    'application_submitted': 'Application Submitted',
    'fee_status_query': 'Fee Status Query',
    'interview_portfolio': 'Interview/Portfolio',
    'review_in_progress': 'Review in Progress',
    'review_complete': 'Review Complete',
    'director_review_in_progress': 'Director Review In Progress',
    'director_review_complete': 'Director Review Complete',
    'conditional_offer_no_response': 'Conditional Offer (No Response)',
    'unconditional_offer_no_response': 'Unconditional Offer (No Response)',
    'conditional_offer_accepted': 'Conditional Offer (Accepted)',
    'unconditional_offer_accepted': 'Unconditional Offer (Accepted)',
    'ready_to_enrol': 'Ready to Enrol',
    'enrolled': 'Enrolled',
    'rejected': 'Rejected',
    'offer_withdrawn': 'Offer Withdrawn',
    'offer_declined': 'Offer Declined',
  };
  
  return stageMap[stage] || stage;
}

// Map backend stage to frontend stage ID for Kanban grouping
export function mapStageToFrontendStage(stage: string): string {
  // Normalise incoming values to be resilient to API differences
  const norm = (s: string) =>
    (s || "")
      .toLowerCase()
      .trim()
      // unify American/British spelling
      .replace(/enroll/g, "enrol")
      // remove parentheses
      .replace(/[()]/g, "")
      // spaces or hyphens to underscores
      .replace(/[\s-]+/g, "_");

  const n = norm(stage);
  const normalised = (() => {
    if (n === 'enroled' || n === 'enrollment') return 'enrolled';
    if (n === 'ready_to_enrollment' || n === 'ready_to_enrolled' || n === 'ready_to_enrolment') return 'ready_to_enrol';
    if (n === 'ready_to_enrolled_students') return 'ready_to_enrol';
    return n;
  })();

  const stageMapping: Record<string, string> = {
    // Enquiry stage
    'enquiry': 'enquiry',
    
    // Pre Application stage
    'pre_application': 'pre_application',
    
    // Application Submitted stage
    'applicant': 'application_submitted',
    'submitted': 'application_submitted',
    'application_submitted': 'application_submitted',
    
    // Fee Status Query stage
    'fee_status_query': 'fee_status_query',
    
    // Interview/Portfolio stage
    'interview': 'interview_portfolio',
    'interview_scheduled': 'interview_portfolio',
    'interview_portfolio': 'interview_portfolio',
    
    // Review stages
    'review': 'review_in_progress',
    'review_in_progress': 'review_in_progress',
    'reviewcomplete': 'review_complete',
    'review_complete': 'review_complete',
    
    // Director Review stages
    'director_review_in_progress': 'director_review_in_progress',
    'director_review_complete': 'director_review_complete',
    
    // Offer stages
    'offer': 'conditional_offer_no_response',
    'offer_made': 'conditional_offer_no_response',
    'conditional_offer_no_response': 'conditional_offer_no_response',
    'unconditional_offer_no_response': 'unconditional_offer_no_response',
    'conditional_offer_accepted': 'conditional_offer_accepted',
    'unconditional_offer_accepted': 'unconditional_offer_accepted',
    'offer_accepted': 'unconditional_offer_accepted',
    
    // Enrollment stages
    'ready_to_enrol': 'ready_to_enrol',
    'ready_to_enroll': 'ready_to_enrol',
    'enrolled': 'enrolled',
    'accepted': 'enrolled',
    
    // Rejection stages
    'rejected': 'rejected',
    'offer_withdrawn': 'offer_withdrawn',
    'offer_declined': 'offer_declined',
  };

  // If the normalised input already matches a known frontend stage id, return it
  const allowed: Record<string, true> = {
    enquiry: true,
    pre_application: true,
    application_submitted: true,
    fee_status_query: true,
    interview_portfolio: true,
    review_in_progress: true,
    review_complete: true,
    director_review_in_progress: true,
    director_review_complete: true,
    conditional_offer_no_response: true,
    unconditional_offer_no_response: true,
    conditional_offer_accepted: true,
    unconditional_offer_accepted: true,
    ready_to_enrol: true,
    enrolled: true,
    rejected: true,
    offer_withdrawn: true,
    offer_declined: true,
  };

  if (allowed[normalised]) return normalised;
  return stageMapping[normalised] || 'enquiry';
}

// Map backend priority to frontend display priority
export function mapPriorityToDisplay(priority: string): string {
  const priorityMap: Record<string, string> = {
    'critical': 'Critical',
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low',
  };
  
  return priorityMap[priority] || priority;
}

// Map backend urgency to frontend display urgency
export function mapUrgencyToDisplay(urgency: string): string {
  const urgencyMap: Record<string, string> = {
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low',
  };
  
  return urgencyMap[urgency] || urgency;
}

// Map backend lifecycle state to frontend display
export function mapLifecycleToDisplay(lifecycle: string): string {
  const lifecycleMap: Record<string, string> = {
    'enquiry': 'Enquiry',
    'pre_applicant': 'Pre-Applicant',
    'applicant': 'Applicant',
    'enrolled': 'Enrolled',
    'student': 'Student',
    'alumni': 'Alumni',
  };
  
  return lifecycleMap[lifecycle] || lifecycle;
}

// Get priority color for styling
export function getPriorityColor(priority: string): string {
  const colorMap: Record<string, string> = {
    'critical': 'text-destructive bg-destructive/5 border-destructive/20',
    'high': 'text-warning bg-warning/5 border-warning/20',
    'medium': 'text-slate-600 bg-slate-50 border-slate-200',
    'low': 'text-success bg-success/5 border-success/20',
  };
  
  return colorMap[priority] || 'text-slate-600 bg-slate-50 border-slate-200';
}

// Get urgency color for styling
export function getUrgencyColor(urgency: string): string {
  const colorMap: Record<string, string> = {
    'high': 'text-destructive bg-destructive/5 border-destructive/20',
    'medium': 'text-warning bg-warning/5 border-warning/20',
    'low': 'text-success bg-success/5 border-success/20',
  };
  
  return colorMap[urgency] || 'text-slate-600 bg-slate-50 border-slate-200';
}

// Get lifecycle state color for styling
export function getLifecycleColor(lifecycle: string): string {
  const colorMap: Record<string, string> = {
    'enquiry': 'text-slate-600 bg-slate-50 border-slate-200',
    'pre_applicant': 'text-slate-700 bg-slate-100 border-slate-300',
    'applicant': 'text-warning bg-warning/5 border-warning/20',
    'enrolled': 'text-success bg-success/5 border-success/20',
    'student': 'text-forest-green bg-forest-green/5 border-forest-green/20',
    'alumni': 'text-slate-600 bg-slate-100 border-slate-300',
  };
  
  return colorMap[lifecycle] || 'text-slate-600 bg-slate-50 border-slate-200';
}

// Format lead score for display
export function formatLeadScore(score: number | undefined): string {
  if (score === undefined || score === null) return 'N/A';
  
  if (score >= 75) return `${score} (High)`;
  if (score >= 50) return `${score} (Medium)`;
  if (score >= 25) return `${score} (Low)`;
  return `${score} (Very Low)`;
}

// Format conversion probability for display
export function formatConversionProbability(prob: number | undefined): string {
  if (prob === undefined || prob === null) return 'N/A';
  
  const percentage = Math.round(prob * 100);
  if (percentage >= 75) return `${percentage}% (High)`;
  if (percentage >= 50) return `${percentage}% (Medium)`;
  if (percentage >= 25) return `${percentage}% (Low)`;
  return `${percentage}% (Very Low)`;
}

// Format days in pipeline for display
export function formatDaysInPipeline(days: number | undefined): string {
  if (days === undefined || days === null) return 'N/A';
  
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

// Get application card display data
export function getApplicationCardDisplay(app: ApplicationCard) {
  const recommendedActions = Array.isArray(app.recommended_actions) ? app.recommended_actions : [];
  const primaryAction = recommendedActions[0]?.action;
  const progressionProbability = app.progression_probability ?? app.conversion_probability;

  return {
    id: app.application_id,
    studentName: `${app.first_name || ''} ${app.last_name || ''}`.trim() || 'Unknown',
    program: app.programme_name,
    stage: mapStageToDisplay(app.stage),
    priority: mapPriorityToDisplay(app.priority || 'medium'),
    urgency: mapUrgencyToDisplay(app.urgency || 'medium'),
    leadScore: formatLeadScore(app.lead_score),
    conversionProbability: formatConversionProbability(app.conversion_probability),
    progressionProbability: progressionProbability !== undefined ? formatConversionProbability(progressionProbability) : 'N/A',
    nextAction: primaryAction || app.urgency_reason || 'No action queued',
    lastActivity: app.last_activity_at ? new Date(app.last_activity_at).toLocaleDateString() : 'N/A',
    nextFollowUp: app.days_in_pipeline ? `Due in ${formatDaysInPipeline(app.days_in_pipeline)}` : 'No follow-up',
    recommendedActions,
    blockerCount: Array.isArray(app.progression_blockers) ? app.progression_blockers.length : 0,
    tags: [
      app.priority && `Priority: ${app.priority}`,
      app.urgency && `Urgency: ${app.urgency}`,
      app.campus_name && `Campus: ${app.campus_name}`,
    ].filter(Boolean) as string[],
    aiInsights: [
      progressionProbability !== undefined && `Progression: ${formatConversionProbability(progressionProbability)}`,
      app.conversion_probability !== undefined && `Conversion: ${formatConversionProbability(app.conversion_probability)}`,
      app.lead_score !== undefined && `Lead score: ${formatLeadScore(app.lead_score)}`,
      app.days_in_pipeline !== undefined && `Days in pipeline: ${formatDaysInPipeline(app.days_in_pipeline)}`,
    ].filter(Boolean) as string[],
  };
}

// Get person display data
export function getPersonDisplay(person: PersonEnriched) {
  return {
    id: person.id,
    name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unknown',
    email: person.email || 'No email',
    lifecycleState: mapLifecycleToDisplay(person.lifecycle_state),
    leadScore: formatLeadScore(person.lead_score),
    conversionProbability: formatConversionProbability(person.conversion_probability),
    latestApplicationStage: person.latest_application_stage ? mapStageToDisplay(person.latest_application_stage) : 'N/A',
    programme: person.latest_programme_name || 'No programme',
    campus: person.latest_campus_name || 'No campus',
    academicYear: person.latest_academic_year || 'N/A',
    lastActivity: person.last_activity_at ? new Date(person.last_activity_at).toLocaleDateString() : 'N/A',
    lastActivityTitle: person.last_activity_title || 'No recent activity',
  };
}
