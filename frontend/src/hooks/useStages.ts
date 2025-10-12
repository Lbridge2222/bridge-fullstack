import { useMemo } from 'react';

export interface Stage {
  id: string;
  label: string;
}

export function useStages() {
  // Define the comprehensive 18-stage admissions pipeline
  const stages = useMemo(() => [
    { id: 'enquiry', label: 'Enquiry' },
    { id: 'pre_application', label: 'Pre Application' },
    { id: 'application_submitted', label: 'Application Submitted' },
    { id: 'fee_status_query', label: 'Fee Status Query' },
    { id: 'interview_portfolio', label: 'Interview/Portfolio' },
    { id: 'review_in_progress', label: 'Review in Progress' },
    { id: 'review_complete', label: 'Review Complete' },
    { id: 'director_review_in_progress', label: 'Director Review In Progress' },
    { id: 'director_review_complete', label: 'Director Review Complete' },
    { id: 'conditional_offer_no_response', label: 'Conditional Offer (No Response)' },
    { id: 'unconditional_offer_no_response', label: 'Unconditional Offer (No Response)' },
    { id: 'conditional_offer_accepted', label: 'Conditional Offer (Accepted)' },
    { id: 'unconditional_offer_accepted', label: 'Unconditional Offer (Accepted)' },
    { id: 'ready_to_enrol', label: 'Ready to Enrol' },
    { id: 'enrolled', label: 'Enrolled' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'offer_withdrawn', label: 'Offer Withdrawn' },
    { id: 'offer_declined', label: 'Offer Declined' },
  ], []);

  return { 
    stages, 
    loading: false, 
    error: null 
  };
}
