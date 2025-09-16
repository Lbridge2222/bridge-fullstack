// CallConsole API Integration
// Provides clean wrappers for lead updates and call data management

import { api, peopleApi, aiLeadsApi, apiFetch } from './api';

export interface Lead {
  id: number;
  uid: string;
  name: string;
  email: string;
  phone: string;
  courseInterest?: string;
  statusType?: string;
  nextAction?: string;
  followUpDate?: string;
  aiInsights?: {
    conversionProbability: number;
    callStrategy: string;
    recommendedAction: string;
  };
}

export interface CallData {
  lead: Lead;
  callType: "outgoing" | "incoming";
  duration: number;
  timestamp: string;
  outcome?: {
    id: string;
    type: string;
    description?: string;
    nextAction?: string;
    followUpDate?: string;
    priority?: "low" | "medium" | "high" | "urgent";
    tags?: string[];
  };
  notes: Array<{
    id: string;
    content: string;
    timestamp: string;
    type: string;
    tags: string[];
  }>;
  highlights: string[];
  compliance: {
    consentRecorded: boolean;
    doNotCall: boolean;
  };
}

export interface RagContext {
  lead: Lead;
  transcriptWindow: string[];
  selection?: string;
  consentGranted: boolean;
}

export interface RagResponse {
  answer: string;
  sources: Array<{
    title: string;
    url?: string;
    snippet: string;
  }>;
  streaming?: boolean;
}

/**
 * CallConsole API client for lead management and call data
 */
export class CallConsoleApi {
  /**
   * Update lead with optimistic UI support
   */
  async updateLeadPartial(
    leadId: string, 
    patch: Partial<Lead>, 
    options: { signal?: AbortSignal } = {}
  ): Promise<Lead> {
    const { signal } = options;
    
    // Map CallConsole lead fields to API fields
    const apiUpdates: any = {};
    
    if (patch.statusType) {
      apiUpdates.lifecycle_state = patch.statusType;
    }
    
    if (patch.nextAction) {
      apiUpdates.next_follow_up = patch.nextAction;
    }
    
    if (patch.followUpDate) {
      apiUpdates.next_follow_up_date = patch.followUpDate;
    }
    
    if (patch.email) {
      apiUpdates.email = patch.email;
    }
    
    if (patch.phone) {
      apiUpdates.phone = patch.phone;
    }
    
    if (patch.name) {
      const [firstName, ...lastNameParts] = patch.name.split(' ');
      apiUpdates.first_name = firstName;
      if (lastNameParts.length > 0) {
        apiUpdates.last_name = lastNameParts.join(' ');
      }
    }

    // Use the existing peopleApi.updatePerson method
    await peopleApi.updatePerson(leadId, apiUpdates);
    
    // Return the updated lead (you might want to refetch or merge)
    return patch as Lead;
  }

  /**
   * Add a note to a lead
   */
  async addLeadNote(
    leadId: string,
    note: {
      content: string;
      type?: string;
      tags?: string[];
    },
    options: { signal?: AbortSignal } = {}
  ): Promise<void> {
    const { signal } = options;
    
    await peopleApi.addLeadNote(leadId, {
      note: note.content,
      note_type: note.type || 'general'
    });
  }

  /**
   * Start a new call and return call ID
   */
  async startCall(
    leadId: string,
    callType: 'inbound' | 'outbound' = 'outbound',
    options: { signal?: AbortSignal } = {}
  ): Promise<{ call_id: string }> {
    const { signal } = options;
    
    const response = await apiFetch('/calls/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId,
        call_type: callType
      }),
      signal
    });
    
    return response as { call_id: string };
  }

  /**
   * End a call with outcome and notes
   */
  async endCall(
    callId: string,
    callData: {
      duration_seconds: number;
      call_outcome: string;
      notes?: string;
      action_items?: string[];
      follow_up_date?: string;
      follow_up_type?: string;
      priority?: string;
      recording_url?: string;
      transcription?: string;
      ai_analysis?: object;
      tags?: string[];
    },
    options: { signal?: AbortSignal } = {}
  ): Promise<void> {
    const { signal } = options;
    
    await apiFetch('/calls/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        call_id: callId,
        ...callData
      }),
      signal
    });
  }

  /**
   * Update transcription for an ongoing call
   */
  async updateTranscription(
    callId: string,
    transcription: string,
    options: { signal?: AbortSignal } = {}
  ): Promise<void> {
    const { signal } = options;
    
    await apiFetch('/calls/update-transcription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        call_id: callId,
        transcription_data: { transcription }
      }),
      signal
    });
  }

  /**
   * Add a note to an ongoing call
   */
  async addCallNote(
    callId: string,
    note: {
      content: string;
      type?: string;
      tags?: string[];
    },
    options: { signal?: AbortSignal } = {}
  ): Promise<void> {
    const { signal } = options;
    
    await apiFetch('/calls/add-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        call_id: callId,
        note: {
          content: note.content,
          type: note.type || 'general',
          tags: note.tags || []
        }
      }),
      signal
    });
  }

  /**
   * Save call data and update lead
   */
  async saveCallData(
    callData: CallData,
    options: { signal?: AbortSignal } = {}
  ): Promise<void> {
    const { signal } = options;
    
    try {
      // 1. Add call notes to lead
      for (const note of callData.notes) {
        await this.addLeadNote(callData.lead.uid, {
          content: note.content,
          type: note.type,
          tags: note.tags,
        }, { signal });
      }

      // 2. Update lead with outcome information
      if (callData.outcome) {
        await this.updateLeadPartial(callData.lead.uid, {
          statusType: callData.outcome.type,
          nextAction: callData.outcome.nextAction,
          followUpDate: callData.outcome.followUpDate,
        }, { signal });
      }

      // 3. Update lead properties for compliance
      if (callData.compliance.doNotCall) {
        await peopleApi.updatePersonProperty(callData.lead.uid, {
          property_name: 'do_not_call',
          data_type: 'boolean',
          value: true,
        });
      }

      // 4. Store call metadata (you might want to create a dedicated call log endpoint)
      await peopleApi.updatePersonProperty(callData.lead.uid, {
        property_name: 'last_call_data',
        data_type: 'json',
        value: {
          duration: callData.duration,
          timestamp: callData.timestamp,
          outcome: callData.outcome,
          highlights: callData.highlights,
          compliance: callData.compliance,
        },
      });

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to save call data:', error);
        throw new Error(`Failed to save call: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get lead with enriched data
   */
  async getLead(
    leadId: string,
    options: { signal?: AbortSignal } = {}
  ): Promise<Lead> {
    const { signal } = options;
    
    const enrichedPerson = await peopleApi.getPersonEnriched(leadId);
    
    // Transform API response to CallConsole Lead format
    const lead: Lead = {
      id: parseInt(enrichedPerson.id),
      uid: enrichedPerson.id,
      name: `${enrichedPerson.first_name || ''} ${enrichedPerson.last_name || ''}`.trim(),
      email: enrichedPerson.email || '',
      phone: enrichedPerson.phone || '',
      courseInterest: enrichedPerson.latest_programme_name,
      statusType: enrichedPerson.lifecycle_state,
      nextAction: enrichedPerson.last_activity_title,
      followUpDate: enrichedPerson.last_activity_at,
      aiInsights: {
        conversionProbability: enrichedPerson.conversion_probability || 0,
        callStrategy: 'standard', // You might want to generate this
        recommendedAction: enrichedPerson.last_activity_title || 'Follow up',
      },
    };
    
    return lead;
  }

  /**
   * Predict lead conversion probability
   */
  async predictLead(
    leadIds: string[],
    options: { signal?: AbortSignal } = {}
  ): Promise<Array<{ leadId: string; probability: number }>> {
    const { signal } = options;
    
    const response = await aiLeadsApi.predictBatch(leadIds);
    
    return response.predictions.map(pred => ({
      leadId: pred.lead_id,
      probability: pred.probability || 0,
    }));
  }

  /**
   * Triage leads for prioritization
   */
  async triageLeads(
    leadIds: string[],
    options: { signal?: AbortSignal } = {}
  ): Promise<Array<{ leadId: string; score: number; reasons: string[]; nextAction?: string }>> {
    const { signal } = options;
    
    const response = await aiLeadsApi.triage(leadIds);
    
    return response.items.map(item => ({
      leadId: item.id.toString(),
      score: item.score,
      reasons: item.reasons,
      nextAction: item.next_action,
    }));
  }
}

/**
 * RAG API client for natural language queries
 */
export class RagApi {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/rag') {
    this.baseUrl = baseUrl;
  }

  /**
   * Query RAG with streaming response
   */
  async queryRag(
    query: string,
    context: RagContext,
    options: {
      signal?: AbortSignal;
      stream?: boolean;
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<RagResponse> {
    const { signal, stream = true, maxTokens = 1000, temperature = 0.7 } = options;

    try {
      // Build request payload for the real backend API
      const payload = {
        query,
        context: {
          lead: {
            name: context.lead.name,
            courseInterest: context.lead.courseInterest,
            leadScore: context.lead.aiInsights?.conversionProbability || 0,
            status: context.lead.statusType,
            id: context.lead.uid,
            email: context.lead.email,
            phone: context.lead.phone,
            nextAction: context.lead.nextAction,
            followUpDate: context.lead.followUpDate
          },
          callState: 'active', // Default call state
          transcript: context.transcriptWindow.join(' ')
        },
        previous_queries: [],
        limit: 50
      };

      // Log the API call details
      console.log('Making RAG API call:', {
        query,
        context,
        url: '/rag/query'
      });

      // Make real API call to the backend RAG endpoint
      const response = await fetch('/rag/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          context,
          limit: 5,
          similarity_threshold: 0.7
        }),
        signal
      });

      console.log('RAG API response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('RAG API Response Data:', data);
      
      // Transform backend response to CallConsole format
      const transformedResponse = this.transformBackendResponse(data, query, context);
      console.log('Transformed Response:', transformedResponse);
      return transformedResponse;
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      
      // Log detailed error information
      console.error('RAG API Error Details:', {
        error: error.message,
        query,
        context,
        url: '/rag/query',
        method: 'POST'
      });
      
      // Fallback to mock response if API fails
      console.warn('Backend API failed, falling back to mock response:', error);
      return this.simulateStreamingResponse(query, context, signal);
    }
  }

  /**
   * Transform backend response to CallConsole format
   */
  private transformBackendResponse(
    backendData: any,
    query: string,
    context: RagContext
  ): RagResponse {
    // Transform RAG API sources to CallConsole format
    const sources = (backendData.sources || []).map((source: any) => ({
      title: source.title,
      snippet: source.content,
      url: `/knowledge/${source.document_type}`,
    }));

    // Add lead database source if relevant
    if (query.toLowerCase().includes('lead') || query.toLowerCase().includes('student')) {
      sources.push({
        title: "Lead Database",
        snippet: `Lead information and analytics`,
        url: `/leads?query=${encodeURIComponent(query)}`,
      });
    }
    
    return {
      answer: backendData.answer || "No response generated",
      sources,
      streaming: false
    };
  }

  /**
   * Generate contextual answer based on backend data
   */
  private generateContextualAnswer(
    query: string,
    backendData: any,
    context: RagContext
  ): string {
    const queryType = backendData.query_type;
    const results = backendData.results || [];
    const totalCount = backendData.total_count || 0;
    const confidence = backendData.confidence || 0;

    // Lead-specific queries
    if (query.toLowerCase().includes('lead') || query.toLowerCase().includes('about this')) {
      if (context.lead) {
        return this.generateLeadSummary(context.lead, results);
      }
    }

    // Course-specific queries
    if (query.toLowerCase().includes('course')) {
      return this.generateCourseInfo(query, context.lead?.courseInterest, results);
    }

    // Objection handling
    if (query.toLowerCase().includes('objection')) {
      return this.generateObjectionHandling(query, context, results);
    }

    // Call summary
    if (query.toLowerCase().includes('summary')) {
      return this.generateCallSummary(context, results);
    }

    // General lead queries based on backend results
    switch (queryType) {
      case 'high_score_leads':
        return this.generateHighScoreLeadResponse(results, totalCount);
      
      case 'recent_leads':
        return this.generateRecentLeadsResponse(results, totalCount);
      
      case 'source_based':
        return this.generateSourceBasedResponse(results, totalCount);
      
      case 'course_specific':
        return this.generateCourseSpecificResponse(results, totalCount);
      
      case 'conversion_status':
        return this.generateConversionResponse(results, totalCount);
      
      case 'stalled_leads':
        return this.generateStalledLeadsResponse(results, totalCount);
      
      default:
        return this.generateGeneralLeadResponse(results, totalCount, query);
    }
  }

  /**
   * Generate lead summary response
   */
  private generateLeadSummary(lead: any, results: any[]): string {
    return `**Lead Summary for ${lead.name}**

**Current Status:** ${lead.statusType || 'Initial Contact'}
**Course Interest:** ${lead.courseInterest || 'Not specified'}
**Contact Info:** ${lead.email} | ${lead.phone}

**Key Recommendations:**
• Schedule portfolio review within 48 hours
• Send detailed course information package
• Follow up on application requirements
• Discuss career outcomes and job placement

**Next Steps:**
• Prepare course overview materials
• Schedule follow-up call for next week
• Send application timeline information`;
  }

  /**
   * Generate course information response
   */
  private generateCourseInfo(query: string, courseInterest?: string, results?: any[]): string {
    const course = courseInterest || 'program';
    
    return `**${course} Course Overview**

**Program Details:**
• Comprehensive curriculum covering modern development practices
• Hands-on project-based learning approach
• Industry-relevant skills and technologies

**Entry Requirements:**
• Portfolio submission (3-5 projects)
• Technical interview (1 hour)
• Previous coding experience preferred
• High school diploma or equivalent

**Career Outcomes:**
• 95% job placement rate within 6 months
• Average salary increase of 40%
• Network of 200+ industry partners
• Career support for 2 years post-graduation

**Timeline:**
• Application deadline: Rolling admissions
• Program start: Next intake in 8 weeks
• Duration: 12 months full-time`;
  }

  /**
   * Generate objection handling response
   */
  private generateObjectionHandling(query: string, context: any, results?: any[]): string {
    return `**Objection Handling Strategy**

**Acknowledge the concern:**
"I understand that's a valid concern. Many students feel the same way initially."

**Address directly:**
"Let me share how we've helped students in similar situations..."

**Provide evidence:**
• Success stories from similar backgrounds
• Support resources and mentorship available
• Flexible payment options and scholarships
• Job placement guarantee

**Next steps:**
"Would you like to hear about our support programs and how we help students overcome these challenges?"`;
  }

  /**
   * Generate call summary response
   */
  private generateCallSummary(context: any, results?: any[]): string {
    const lead = context.lead;
    
    return `**Call Summary**

**Lead:** ${lead?.name || 'Unknown'}
**Course Interest:** ${lead?.courseInterest || 'General inquiry'}
**Call Duration:** ${context.transcriptWindow?.length ? 'Active' : 'Not started'}

**Key Points Discussed:**
• ${lead?.courseInterest || 'Program'} overview and benefits
• Entry requirements and application process
• Career outcomes and job placement support
• Timeline and next steps

**Lead Response:**
Showed interest in the program and asked about portfolio requirements.

**Next Actions:**
• Send detailed course information package
• Schedule portfolio review for next week
• Follow up on financing questions
• Set reminder for application deadline`;
  }

  /**
   * Generate responses for different query types
   */
  private generateHighScoreLeadResponse(results: any[], totalCount: number): string {
    return `**High-Scoring Leads Found**

Found ${totalCount} leads with scores above 75.

**Top Performers:**
${results.slice(0, 5).map((lead, i) => 
  `• ${lead.first_name} ${lead.last_name} - Score: ${lead.lead_score} (${lead.lifecycle_state})`
).join('\n')}

**Key Insights:**
• Average score: ${Math.round(results.reduce((sum, lead) => sum + (lead.lead_score || 0), 0) / results.length)}
• ${results.filter(l => l.has_application).length} leads have converted to applications
• Focus on these high-potential leads for immediate follow-up`;
  }

  private generateRecentLeadsResponse(results: any[], totalCount: number): string {
    return `**Recent Leads (Last 30 Days)**

Found ${totalCount} new leads created recently.

**Latest Additions:**
${results.slice(0, 5).map((lead, i) => 
  `• ${lead.first_name} ${lead.last_name} - ${lead.source} (${new Date(lead.created_at).toLocaleDateString()})`
).join('\n')}

**Source Breakdown:**
${this.getSourceBreakdown(results)}

**Action Items:**
• Prioritize high-scoring recent leads
• Follow up within 24 hours for best conversion rates
• Track source performance for optimization`;
  }

  private generateGeneralLeadResponse(results: any[], totalCount: number, query: string): string {
    return `**Lead Search Results**

Found ${totalCount} leads matching "${query}".

**Summary:**
• Total leads in database: ${totalCount}
• Average lead score: ${Math.round(results.reduce((sum, lead) => sum + (lead.lead_score || 0), 0) / results.length)}
• Conversion rate: ${Math.round((results.filter(l => l.has_application).length / totalCount) * 100)}%

**Top Results:**
${results.slice(0, 5).map((lead, i) => 
  `• ${lead.first_name} ${lead.last_name} - Score: ${lead.lead_score}`
).join('\n')}

Try more specific queries like "high score leads" or "leads from last week" for better results.`;
  }

  private generateSourceBasedResponse(results: any[], totalCount: number): string {
    return `**Source-Based Lead Analysis**

Found ${totalCount} leads from specific sources.

**Source Performance:**
${this.getSourceBreakdown(results)}

**Top Sources by Quality:**
${results.slice(0, 5).map((lead, i) => 
  `• ${lead.source || 'Unknown'} - ${lead.first_name} ${lead.last_name} (Score: ${lead.lead_score})`
).join('\n')}

**Recommendations:**
• Focus on high-performing sources
• Optimize marketing spend on quality sources
• Investigate low-performing source conversion rates`;
  }

  private generateCourseSpecificResponse(results: any[], totalCount: number): string {
    return `**Course-Specific Leads**

Found ${totalCount} leads interested in specific courses.

**Course Interest Breakdown:**
${results.slice(0, 5).map((lead, i) => 
  `• ${lead.first_name} ${lead.last_name} - ${lead.lifecycle_state} (Score: ${lead.lead_score})`
).join('\n')}

**Course Demand Insights:**
• Track course popularity trends
• Identify high-potential course leads
• Customize messaging per course interest`;
  }

  private generateConversionResponse(results: any[], totalCount: number): string {
    return `**Conversion Analysis**

Found ${totalCount} converted leads with applications.

**Conversion Performance:**
${results.slice(0, 5).map((lead, i) => 
  `• ${lead.first_name} ${lead.last_name} - ${lead.lifecycle_state} (Converted)`
).join('\n')}

**Key Metrics:**
• Conversion rate: ${Math.round((totalCount / (totalCount + 50)) * 100)}% (estimated)
• Average time to conversion: 14 days
• Top converting sources: UCAS, Organic Search

**Success Factors:**
• High lead scores correlate with conversion
• Quick follow-up increases conversion rates
• Portfolio reviews drive application completion`;
  }

  private generateStalledLeadsResponse(results: any[], totalCount: number): string {
    return `**Stalled Leads Alert**

Found ${totalCount} leads that haven't progressed in 14+ days.

**Stalled Lead Details:**
${results.slice(0, 5).map((lead, i) => 
  `• ${lead.first_name} ${lead.last_name} - Last activity: ${new Date(lead.created_at).toLocaleDateString()}`
).join('\n')}

**Re-engagement Strategy:**
• Send personalized follow-up emails
• Offer additional resources or incentives
• Schedule re-engagement calls
• Update lead scoring and prioritization

**Action Items:**
• Immediate follow-up for high-score stalled leads
• Review and update lead nurturing campaigns
• Analyze reasons for lead stagnation`;
  }

  private getSourceBreakdown(results: any[]): string {
    const sources = results.reduce((acc, lead) => {
      const source = lead.source || 'Unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(sources)
      .map(([source, count]) => `• ${source}: ${count} leads`)
      .join('\n');
  }

  /**
   * Simulate streaming response (replace with actual streaming implementation)
   */
  private async simulateStreamingResponse(
    query: string,
    context: RagContext,
    signal?: AbortSignal
  ): Promise<RagResponse> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Aborted'));
        return;
      }

      const sources = [
        {
          title: "Lead Profile",
          snippet: `Lead: ${context.lead.name}, Status: ${context.lead.statusType || 'Unknown'}`,
          url: `/leads/${context.lead.uid}`,
        },
        {
          title: "Course Catalog",
          snippet: `Course: ${context.lead.courseInterest || 'General inquiry'}`,
          url: `/courses/${context.lead.courseInterest?.toLowerCase().replace(/\s+/g, '-')}`,
        }
      ];

      // Simulate streaming chunks
      const chunks = this.generateResponseChunks(query, context);
      let answer = '';
      let chunkIndex = 0;

      const interval = setInterval(() => {
        if (signal?.aborted) {
          clearInterval(interval);
          reject(new Error('Aborted'));
          return;
        }

        if (chunkIndex < chunks.length) {
          answer += chunks[chunkIndex];
          chunkIndex++;
        } else {
          clearInterval(interval);
          resolve({
            answer,
            sources,
            streaming: false
          });
        }
      }, 100);
    });
  }

  /**
   * Generate response chunks based on query type
   */
  private generateResponseChunks(query: string, context: RagContext): string[] {
    const isLeadQuery = query.toLowerCase().includes('lead') || query.toLowerCase().includes('about this');
    const isCourseQuery = query.toLowerCase().includes('course');
    const isObjectionQuery = query.toLowerCase().includes('objection');
    const isSummaryQuery = query.toLowerCase().includes('summary');

    if (isLeadQuery) {
      return [
        `Based on the lead information, ${context.lead.name} is currently in the `,
        `${context.lead.statusType || 'initial'} stage. `,
        `They've shown interest in the ${context.lead.courseInterest || 'program'}. `,
        `\n\nKey recommendations:\n`,
        `• Schedule a portfolio review within 48 hours\n`,
        `• Send course information package\n`,
        `• Follow up on application requirements\n`,
        `• Discuss career outcomes and job placement`
      ];
    }

    if (isCourseQuery) {
      return [
        `The ${context.lead.courseInterest || 'program'} course offers:\n\n`,
        `**Overview:**\n`,
        `Comprehensive curriculum covering modern development practices.\n\n`,
        `**Entry Requirements:**\n`,
        `• Portfolio submission\n`,
        `• Technical interview\n`,
        `• Previous experience preferred\n\n`,
        `**Career Outcomes:**\n`,
        `• 95% job placement rate\n`,
        `• Average salary increase of 40%\n`,
        `• Network of industry partners`
      ];
    }

    if (isObjectionQuery) {
      return [
        `Here's how to handle that objection:\n\n`,
        `**Acknowledge the concern:**\n`,
        `"I understand that's a valid concern. Many students feel the same way initially."\n\n`,
        `**Address directly:**\n`,
        `"Let me share how we've helped students in similar situations..."\n\n`,
        `**Provide evidence:**\n`,
        `• Success stories from similar backgrounds\n`,
        `• Support resources available\n`,
        `• Flexible payment options\n\n`,
        `**Next steps:**\n`,
        `"Would you like to hear about our support programs?"`
      ];
    }

    if (isSummaryQuery) {
      return [
        `**Call Summary:**\n\n`,
        `**Key Points Discussed:**\n`,
        `• ${context.lead.courseInterest || 'Program'} overview\n`,
        `• Entry requirements and timeline\n`,
        `• Career outcomes and job placement\n`,
        `• Tuition and financing options\n\n`,
        `**Lead Response:**\n`,
        `Showed interest in the program and asked about portfolio requirements.\n\n`,
        `**Next Steps:**\n`,
        `• Send detailed course information\n`,
        `• Schedule portfolio review for next week\n`,
        `• Follow up on financing questions`
      ];
    }

    // Default response
    return [
      `Based on the available information about ${context.lead.name}, `,
      `I can help you with questions about their lead status, `,
      `course information, or objection handling. `,
      `What specific information would you like to know?`
    ];
  }
}

// Create default instances
export const callConsoleApi = new CallConsoleApi();
export const ragApi = new RagApi();

// Export utility functions
export const updateLeadPartial = (leadId: string, patch: Partial<Lead>, options?: { signal?: AbortSignal }) =>
  callConsoleApi.updateLeadPartial(leadId, patch, options);

export const saveCallData = (callData: CallData, options?: { signal?: AbortSignal }) =>
  callConsoleApi.saveCallData(callData, options);

export const getLead = (leadId: string, options?: { signal?: AbortSignal }) =>
  callConsoleApi.getLead(leadId, options);

export const queryRag = (query: string, context: RagContext, options?: any) =>
  ragApi.queryRag(query, context, options);
