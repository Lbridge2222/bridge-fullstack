// RAG Client Service
// Provides clean wrappers for RAG queries with AbortController support

export interface RagContext {
  lead: {
    id: string;
    name: string;
    courseInterest?: string;
    statusType?: string;
  };
  transcriptWindow: string[];
  selection?: string;
  consentGranted: boolean;
}

export interface RagSource {
  title: string;
  url?: string;
  snippet: string;
  confidence?: number;
}

export interface RagResponse {
  answer: string;
  sources: RagSource[];
  query: string;
  timestamp: string;
}

export interface RagStreamingResponse {
  answer: string;
  sources: RagSource[];
  streaming: boolean;
  done: boolean;
}

// Mock RAG client (replace with actual implementation)
export class RagClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = '/api/rag', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
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
  ): Promise<RagStreamingResponse> {
    const { signal, stream = true, maxTokens = 1000, temperature = 0.7 } = options;

    // Build request payload
    const payload = {
      query,
      context: {
        lead: context.lead,
        transcript: context.transcriptWindow.join('\n'),
        selection: context.selection,
        consentGranted: context.consentGranted
      },
      options: {
        maxTokens,
        temperature,
        stream
      }
    };

    try {
      // For now, simulate the API call with mock streaming response
      return this.simulateStreamingResponse(query, context, signal);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      throw new Error(`RAG query failed: ${error.message}`);
    }
  }

  /**
   * Simulate streaming response (replace with actual streaming implementation)
   */
  private async simulateStreamingResponse(
    query: string,
    context: RagContext,
    signal?: AbortSignal
  ): Promise<RagStreamingResponse> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Aborted'));
        return;
      }

      const sources: RagSource[] = [
        {
          title: "Lead Profile",
          snippet: `Lead: ${context.lead.name}, Status: ${context.lead.statusType || 'Unknown'}`,
          url: `/leads/${context.lead.id}`,
          confidence: 0.95
        },
        {
          title: "Course Catalog",
          snippet: `Course: ${context.lead.courseInterest || 'General inquiry'}`,
          url: `/courses/${context.lead.courseInterest?.toLowerCase().replace(/\s+/g, '-')}`,
          confidence: 0.88
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
          
          // Emit partial response (in real implementation, this would be a callback)
          // For now, we'll just continue building the full response
        } else {
          clearInterval(interval);
          resolve({
            answer,
            sources,
            streaming: false,
            done: true
          });
        }
      }, 100); // Simulate 100ms delay between chunks
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

  /**
   * Cancel all in-flight requests
   */
  cancelAll(): void {
    // In a real implementation, this would cancel all active requests
    // For now, we'll just log it
    console.log('Cancelling all RAG requests');
  }

  /**
   * Get query suggestions based on context
   */
  getSuggestions(context: RagContext): string[] {
    const suggestions: string[] = [];
    
    if (context.lead.name) {
      suggestions.push(`Tell me about ${context.lead.name}`);
    }
    
    if (context.lead.courseInterest) {
      suggestions.push(`Tell me about the ${context.lead.courseInterest} course`);
    }
    
    if (context.transcriptWindow.length > 0) {
      suggestions.push('Summarize the call so far');
      suggestions.push('Generate objection handling');
    }
    
    suggestions.push('What is the next best action?');
    suggestions.push('What are the entry requirements?');
    
    return suggestions;
  }
}

// Create default instance
export const ragClient = new RagClient();

// Utility function for easy usage
export const queryRag = async (
  query: string,
  context: RagContext,
  options?: {
    signal?: AbortSignal;
    stream?: boolean;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<RagStreamingResponse> => {
  return ragClient.queryRag(query, context, options);
};
