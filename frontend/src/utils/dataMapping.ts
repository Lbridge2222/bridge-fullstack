import { ApplicationCard, PersonEnriched } from '../services/api';

// Map backend stage to frontend display stage
export function mapStageToDisplay(stage: string): string {
  const stageMap: Record<string, string> = {
    'enquiry': 'Enquiry',
    'applicant': 'Application Submitted',
    'interview': 'Interview',
    'offer': 'Offer Made',
    'enrolled': 'Enrolled',
  };
  
  return stageMap[stage] || stage;
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
    'critical': 'text-red-600 bg-red-50 border-red-200',
    'high': 'text-orange-600 bg-orange-50 border-orange-200',
    'medium': 'text-yellow-600 bg-yellow-50 border-yellow-200',
    'low': 'text-green-600 bg-green-50 border-green-200',
  };
  
  return colorMap[priority] || 'text-gray-600 bg-gray-50 border-gray-200';
}

// Get urgency color for styling
export function getUrgencyColor(urgency: string): string {
  const colorMap: Record<string, string> = {
    'high': 'text-red-600 bg-red-50 border-red-200',
    'medium': 'text-yellow-600 bg-yellow-50 border-yellow-200',
    'low': 'text-green-600 bg-green-50 border-green-200',
  };
  
  return colorMap[urgency] || 'text-gray-600 bg-gray-50 border-gray-200';
}

// Get lifecycle state color for styling
export function getLifecycleColor(lifecycle: string): string {
  const colorMap: Record<string, string> = {
    'enquiry': 'text-blue-600 bg-blue-50 border-blue-200',
    'pre_applicant': 'text-purple-600 bg-purple-50 border-purple-200',
    'applicant': 'text-orange-600 bg-orange-50 border-orange-200',
    'enrolled': 'text-green-600 bg-green-50 border-green-200',
    'student': 'text-emerald-600 bg-emerald-50 border-emerald-200',
    'alumni': 'text-indigo-600 bg-indigo-50 border-indigo-200',
  };
  
  return colorMap[lifecycle] || 'text-gray-600 bg-gray-50 border-gray-200';
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
  return {
    id: app.application_id,
    studentName: `${app.first_name || ''} ${app.last_name || ''}`.trim() || 'Unknown',
    program: app.programme_name,
    stage: mapStageToDisplay(app.stage),
    priority: mapPriorityToDisplay(app.priority || 'medium'),
    urgency: mapUrgencyToDisplay(app.urgency || 'medium'),
    leadScore: formatLeadScore(app.lead_score),
    conversionProbability: formatConversionProbability(app.conversion_probability),
    nextAction: app.urgency_reason || 'No action required',
    lastActivity: app.last_activity_at ? new Date(app.last_activity_at).toLocaleDateString() : 'N/A',
    nextFollowUp: app.days_in_pipeline ? `Due in ${formatDaysInPipeline(app.days_in_pipeline)}` : 'No follow-up',
    tags: [
      app.priority && `Priority: ${app.priority}`,
      app.urgency && `Urgency: ${app.urgency}`,
      app.campus_name && `Campus: ${app.campus_name}`,
    ].filter(Boolean) as string[],
    aiInsights: [
      app.conversion_probability && `Conversion probability: ${formatConversionProbability(app.conversion_probability)}`,
      app.lead_score && `Lead score: ${formatLeadScore(app.lead_score)}`,
      app.days_in_pipeline && `Days in pipeline: ${formatDaysInPipeline(app.days_in_pipeline)}`,
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
