// src/ivy/queryRouter.ts
// Intelligent query routing for Ask Ivy - determines whether to use application or contact context

export interface QueryContext {
  type: 'application' | 'contact' | 'mixed';
  confidence: number;
  reasoning: string;
  suggestedEndpoint: 'applications' | 'contacts' | 'both';
}

export class QueryRouter {
  // Application-specific keywords and patterns
  private applicationKeywords = [
    'application', 'applications', 'applicant', 'applicants',
    'pipeline', 'stage', 'stages', 'progression', 'conversion',
    'admission', 'admissions', 'enrollment', 'enroll',
    'program', 'programs', 'course', 'courses',
    'offer', 'offers', 'acceptance', 'rejection',
    'deadline', 'deadlines', 'submission', 'submissions',
    'interview', 'interviews', 'assessment', 'assessments',
    'portfolio', 'portfolios', 'audition', 'auditions',
    'at risk', 'at-risk', 'blocked', 'blockers',
    'progression', 'conversion rate', 'conversion probability',
    'lead score', 'scoring', 'priority', 'urgent',
    'campus', 'delivery mode', 'study pattern'
  ];

  // Contact-specific keywords and patterns  
  private contactKeywords = [
    'contact', 'contacts', 'lead', 'leads', 'prospect', 'prospects',
    'person', 'people', 'student', 'students', 'candidate', 'candidates',
    'email', 'phone', 'call', 'calling', 'meeting', 'meetings',
    'communication', 'communications', 'message', 'messages',
    'follow up', 'follow-up', 'outreach', 'engagement',
    'relationship', 'relationships', 'interaction', 'interactions',
    'history', 'timeline', 'activity', 'activities',
    'note', 'notes', 'comment', 'comments'
  ];

  // Mixed/ambiguous keywords that could apply to both
  private mixedKeywords = [
    'who', 'what', 'when', 'where', 'why', 'how',
    'show', 'list', 'find', 'search', 'filter',
    'all', 'some', 'many', 'few', 'most', 'least',
    'best', 'worst', 'top', 'bottom', 'high', 'low',
    'recent', 'latest', 'new', 'old', 'updated'
  ];

  /**
   * Analyze a query and determine the appropriate context
   */
  analyzeQuery(query: string): QueryContext {
    const lowerQuery = query.toLowerCase();
    
    // Count keyword matches
    const applicationMatches = this.applicationKeywords.filter(keyword => 
      lowerQuery.includes(keyword.toLowerCase())
    ).length;
    
    const contactMatches = this.contactKeywords.filter(keyword => 
      lowerQuery.includes(keyword.toLowerCase())
    ).length;
    
    const mixedMatches = this.mixedKeywords.filter(keyword => 
      lowerQuery.includes(keyword.toLowerCase())
    ).length;

    // Calculate confidence scores
    const applicationScore = applicationMatches / Math.max(1, this.applicationKeywords.length);
    const contactScore = contactMatches / Math.max(1, this.contactKeywords.length);
    const mixedScore = mixedMatches / Math.max(1, this.mixedKeywords.length);

    // Determine context type
    let type: 'application' | 'contact' | 'mixed';
    let confidence: number;
    let reasoning: string;
    let suggestedEndpoint: 'applications' | 'contacts' | 'both';

    if (applicationMatches > contactMatches && applicationMatches > 0) {
      type = 'application';
      confidence = Math.min(0.9, 0.5 + applicationScore);
      reasoning = `Query contains ${applicationMatches} application-specific keywords`;
      suggestedEndpoint = 'applications';
    } else if (contactMatches > applicationMatches && contactMatches > 0) {
      type = 'contact';
      confidence = Math.min(0.9, 0.5 + contactScore);
      reasoning = `Query contains ${contactMatches} contact-specific keywords`;
      suggestedEndpoint = 'contacts';
    } else if (mixedMatches > 0 || (applicationMatches === contactMatches && applicationMatches > 0)) {
      type = 'mixed';
      confidence = 0.6; // Lower confidence for mixed queries
      reasoning = `Query contains both application (${applicationMatches}) and contact (${contactMatches}) keywords`;
      suggestedEndpoint = 'both';
    } else {
      // Default to application context for admissions pipeline
      type = 'application';
      confidence = 0.4;
      reasoning = 'No specific keywords detected, defaulting to application context';
      suggestedEndpoint = 'applications';
    }

    return {
      type,
      confidence,
      reasoning,
      suggestedEndpoint
    };
  }

  /**
   * Check if a query should be routed to application-specific RAG
   */
  shouldRouteToApplications(query: string): boolean {
    const context = this.analyzeQuery(query);
    return context.suggestedEndpoint === 'applications' || context.suggestedEndpoint === 'both';
  }

  /**
   * Check if a query should be routed to contact-specific RAG
   */
  shouldRouteToContacts(query: string): boolean {
    const context = this.analyzeQuery(query);
    return context.suggestedEndpoint === 'contacts' || context.suggestedEndpoint === 'both';
  }

  /**
   * Get routing recommendations for a query
   */
  getRoutingRecommendations(query: string): {
    primary: 'applications' | 'contacts';
    secondary?: 'applications' | 'contacts';
    confidence: number;
    reasoning: string;
  } {
    const context = this.analyzeQuery(query);
    
    if (context.suggestedEndpoint === 'both') {
      return {
        primary: 'applications', // Default to applications for admissions pipeline
        secondary: 'contacts',
        confidence: context.confidence,
        reasoning: context.reasoning
      };
    }
    
    return {
      primary: context.suggestedEndpoint,
      confidence: context.confidence,
      reasoning: context.reasoning
    };
  }
}

export const queryRouter = new QueryRouter();
