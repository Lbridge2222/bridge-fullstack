/**
 * Intelligent Ask Ivy Query Processor
 * Industry-leading AI assistant for granular person management
 */

import type { IvyCommand, IvyContext } from './types';
import { contactRegistry, findCommand, processNaturalLanguage } from './contactRegistry';
import { ragApi, type RagContext, type RagResponse } from '@/services/callConsoleApi';

export interface ProcessedQuery {
  type: 'command' | 'rag' | 'hybrid' | 'suggestion';
  command?: IvyCommand;
  ragQuery?: string;
  ragContext?: RagContext;
  suggestions?: IvyCommand[];
  confidence: number;
  reasoning?: string;
  detectedField?: string;
  detectedValue?: string;
}

export interface QueryIntent {
  primary: string;
  secondary?: string;
  entities: string[];
  actions: string[];
  confidence: number;
}

export class IntelligentProcessor {
  /**
   * Main processing entry point - determines best response strategy
   */
  async processQuery(query: string, context: IvyContext): Promise<ProcessedQuery> {
    console.log('🔍 DEBUG: processQuery called with query:', query);
    const intent = this.analyzeIntent(query);
    console.log('🔍 DEBUG: analyzed intent:', intent);
    
    // Try direct command match first (high confidence)
    const directCommand = findCommand(query, contactRegistry);
    console.log('🔍 DEBUG: directCommand found:', directCommand);
    if (directCommand && intent.confidence > 0.8) {
      console.log('🔍 DEBUG: Using direct command match');
      return {
        type: 'command',
        command: directCommand,
        confidence: intent.confidence,
        reasoning: `Direct command match for "${intent.primary}" intent`
      };
    }

    // Check for hybrid opportunities (command + additional context)
    console.log('🔍 DEBUG: Trying hybrid query processing');
    const hybridResult = await this.processHybridQuery(query, intent, context);
    console.log('🔍 DEBUG: hybridResult:', hybridResult);
    if (hybridResult.confidence > 0.7) {
      console.log('🔍 DEBUG: Using hybrid result');
      return hybridResult;
    }

    // Fall back to RAG for complex questions
    console.log('🔍 DEBUG: Falling back to RAG');
    const ragContext = this.buildRagContext(context, intent);
    return {
      type: 'rag',
      ragQuery: this.enhanceQueryForRag(query, intent),
      ragContext,
      suggestions: this.getSuggestedFollowups(intent, context),
      confidence: 0.6,
      reasoning: `Complex query requiring RAG analysis`
    };
  }

  /**
   * Advanced intent analysis using semantic patterns
   */
  private analyzeIntent(query: string): QueryIntent {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Entity extraction patterns
    const entities = this.extractEntities(normalizedQuery);
    
    // Action patterns
    const actions = this.extractActions(normalizedQuery);
    
    // Intent classification
    const intentPatterns = {
      // Data queries
      'get_info': [
        /what (is|are|was|were).+about/,
        /tell me about/,
        /show me.+(details|info|data)/,
        /^(who|what|when|where|how)/
      ],
      
      // Modification intents
      'modify_data': [
        /^(update|change|edit|modify|fix|correct)/,
        /(can i|how do i).+(update|change|edit)/,
        /need to (update|change|fix)/,
        /set (first name|last name|email|phone|date of birth|nationality)/,
        /(first name|last name|email|phone|date of birth|nationality) (is|should be|to)/
      ],
      
      // Communication intents
      'communicate': [
        /^(send|email|call|text|message)/,
        /(reach out|get in touch|contact)/,
        /schedule.+(call|meeting|demo)/
      ],
      
      // Analysis intents
      'analyze': [
        /^(analyze|review|assess|evaluate)/,
        /(what.+think|recommend|suggest)/,
        /(likelihood|probability|score|rating)/
      ],
      
      // Navigation intents
      'navigate': [
        /^(show|open|go to|display)/,
        /(view|see).+(panel|section|tab)/
      ]
    };

    let primaryIntent = 'get_info';
    let confidence = 0.5;

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedQuery)) {
          primaryIntent = intent;
          confidence = Math.min(0.95, confidence + 0.3);
          break;
        }
      }
    }

    return {
      primary: primaryIntent,
      entities,
      actions,
      confidence: Math.min(confidence, 0.95)
    };
  }

  /**
   * Process hybrid queries that combine commands with RAG analysis
   */
  private async processHybridQuery(
    query: string, 
    intent: QueryIntent, 
    context: IvyContext
  ): Promise<ProcessedQuery> {
    console.log('🔍 DEBUG: processHybridQuery called with query:', query);
    console.log('🔍 DEBUG: intent:', intent);
    
    // Check for specific property updates first
    const propertyUpdateMatch = this.detectPropertyUpdate(query, intent);
    console.log('🔍 DEBUG: propertyUpdateMatch result:', propertyUpdateMatch);
    
    if (propertyUpdateMatch) {
      console.log('🔍 DEBUG: Property update detected, returning command with detectedField:', propertyUpdateMatch.field);
      return {
        type: 'command',
        command: {
          id: 'edit.inline',
          label: 'Edit property inline',
          keywords: [],
          group: 'Data' as const,
          description: 'Edit a specific property inline',
          run: (ctx) => {
            ctx.startInlineEdit?.();
            console.log(`Starting inline edit for: ${propertyUpdateMatch.field}`);
          }
        },
        confidence: 0.9,
        reasoning: `Detected property update: ${propertyUpdateMatch.field}`,
        detectedField: propertyUpdateMatch.field,
        detectedValue: propertyUpdateMatch.value
      };
    }

    const baseCommand = processNaturalLanguage(query, context);
    
    if (!baseCommand) {
      return { type: 'rag', confidence: 0 };
    }

    // Detect if query needs additional context/analysis
    const needsAnalysis = this.requiresAnalysis(query, intent);
    
    if (needsAnalysis) {
      const ragContext = this.buildRagContext(context, intent);
      const enhancedQuery = this.enhanceQueryForRag(query, intent);
      
      return {
        type: 'hybrid',
        command: baseCommand,
        ragQuery: enhancedQuery,
        ragContext,
        confidence: 0.85,
        reasoning: `Hybrid: Execute "${baseCommand.label}" with AI analysis`
      };
    }

    return {
      type: 'command',
      command: baseCommand,
      confidence: 0.75
    };
  }

  /**
   * Detect specific property updates in the query
   */
  private detectPropertyUpdate(query: string, intent: QueryIntent): { field: string; value?: string } | null {
    const queryLower = query.toLowerCase();
    
    console.log('🔍 DEBUG: detectPropertyUpdate called with query:', query);
    console.log('🔍 DEBUG: intent:', intent);
    
    // Date of birth patterns
    if (queryLower.includes('date of birth') || queryLower.includes('dob') || queryLower.includes('birthday')) {
      console.log('🔍 DEBUG: Detected date of birth pattern');
      const dateMatch = query.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{2,4}|\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{2,4})/i);
      if (dateMatch) {
        const rawDate = dateMatch[0];
        // Convert natural language date to ISO format
        const convertedDate = this.convertNaturalDateToISO(rawDate);
        console.log('🔍 DEBUG: Date match found:', { field: 'date_of_birth', value: convertedDate });
        return { field: 'date_of_birth', value: convertedDate };
      }
    }
    
    // Phone patterns
    if (queryLower.includes('phone') || queryLower.includes('mobile') || queryLower.includes('telephone')) {
      console.log('🔍 DEBUG: Detected phone pattern');
      const phoneMatch = query.match(/(\+?[\d\s\-\(\)]{10,})/);
      const result = { field: 'phone', value: phoneMatch?.[0] };
      console.log('🔍 DEBUG: Phone match found:', result);
      return result;
    }
    
    // Email patterns
    if (queryLower.includes('email') || queryLower.includes('@')) {
      console.log('🔍 DEBUG: Detected email pattern');
      const emailMatch = query.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const result = { field: 'email', value: emailMatch?.[0] };
      console.log('🔍 DEBUG: Email match found:', result);
      return result;
    }
    
    // Name patterns
    if (queryLower.includes('first name') || queryLower.includes('last name')) {
      console.log('🔍 DEBUG: Detected name pattern');
      if (queryLower.includes('first name')) {
        console.log('🔍 DEBUG: First name match found:', { field: 'first_name' });
        return { field: 'first_name' };
      }
      if (queryLower.includes('last name')) {
        console.log('🔍 DEBUG: Last name match found:', { field: 'last_name' });
        return { field: 'last_name' };
      }
    }
    
    // Nationality patterns
    if (queryLower.includes('nationality') || queryLower.includes('country') || queryLower.includes('citizenship')) {
      console.log('🔍 DEBUG: Detected nationality pattern');
      const result = { field: 'nationality' };
      console.log('🔍 DEBUG: Nationality match found:', result);
      return result;
    }
    
    console.log('🔍 DEBUG: No property update pattern matched');
    return null;
  }

  /**
   * Convert natural language date to ISO format
   */
  private convertNaturalDateToISO(dateString: string): string {
    try {
      // Handle formats like "25th September 1989", "25 September 1989", "25/09/1989", "25.09.1989", etc.
      let cleanDate = dateString.replace(/(st|nd|rd|th)/g, '').trim();
      
      // Handle European date format (DD.MM.YYYY) by converting to MM/DD/YYYY
      const europeanDateMatch = cleanDate.match(/^(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})$/);
      if (europeanDateMatch) {
        const [, day, month, year] = europeanDateMatch;
        cleanDate = `${month}/${day}/${year}`;
      }
      
      // Try to parse the date
      const parsedDate = new Date(cleanDate);
      
      // Check if the date is valid
      if (isNaN(parsedDate.getTime())) {
        console.warn('Could not parse date:', dateString);
        return dateString; // Return original if parsing fails
      }
      
      // Return ISO date string (YYYY-MM-DD)
      return parsedDate.toISOString().split('T')[0] || dateString;
    } catch (error) {
      console.warn('Date conversion error:', error);
      return dateString; // Return original if conversion fails
    }
  }

  /**
   * Extract entities (people, courses, dates, etc.) from query
   */
  private extractEntities(query: string): string[] {
    const entities: string[] = [];
    
    // Course/program patterns
    const coursePatterns = [
      /\b(course|program|bootcamp|class|training)\b/g,
      /\b(web development|data science|ux|ui|design)\b/g
    ];
    
    // Date patterns
    const datePatterns = [
      /\b(today|yesterday|tomorrow|this week|last week|next week)\b/g,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g
    ];
    
    // Status patterns
    const statusPatterns = [
      /\b(lead|applicant|student|prospect|enquiry)\b/g,
      /\b(hot|warm|cold|qualified|unqualified)\b/g
    ];

    [coursePatterns, datePatterns, statusPatterns].flat().forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        entities.push(...matches);
      }
    });

    return [...new Set(entities)];
  }

  /**
   * Extract action verbs from query
   */
  private extractActions(query: string): string[] {
    const actionPatterns = [
      /\b(send|email|call|schedule|book|update|edit|change|show|view|analyze|review)\b/g
    ];
    
    const actions: string[] = [];
    actionPatterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        actions.push(...matches);
      }
    });

    return [...new Set(actions)];
  }

  /**
   * Determine if query requires additional RAG analysis
   */
  private requiresAnalysis(query: string, intent: QueryIntent): boolean {
    const analysisKeywords = [
      'why', 'how', 'analysis', 'recommend', 'suggest', 'think', 'should',
      'best', 'optimal', 'strategy', 'approach', 'likelihood', 'probability',
      'compare', 'versus', 'better', 'worse', 'improve', 'optimize'
    ];

    return analysisKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    ) || intent.primary === 'analyze';
  }

  /**
   * Build comprehensive RAG context for the person
   */
  private buildRagContext(context: IvyContext, intent: QueryIntent): RagContext {
    const person = context.personData;
    return {
      lead: {
        id: person?.id || 0,
        uid: context.personId || '',
        name: context.personName || `${person?.first_name || ''} ${person?.last_name || ''}`.trim(),
        email: person?.email || '',
        phone: person?.phone || '',
        statusType: person?.lifecycle_stage || '',
        courseInterest: person?.programme || '',
        nextAction: person?.next_best_action || '',
        followUpDate: person?.last_activity_date || '',
        aiInsights: {
          conversionProbability: person?.conversion_probability || 0,
          callStrategy: person?.next_best_action || 'Follow up',
          recommendedAction: person?.next_best_action || 'Follow up'
        }
      },
      transcriptWindow: [],
      consentGranted: true
    };
  }

  /**
   * Enhance query for better RAG results
   */
  private enhanceQueryForRag(query: string, intent: QueryIntent): string {
    const contextualPrefix = this.getContextualPrefix(intent.primary);
    const entityContext = intent.entities.length > 0 
      ? ` (Context: ${intent.entities.join(', ')})` 
      : '';
    
    return `${contextualPrefix}${query}${entityContext}`;
  }

  /**
   * Get contextual prefix for different intent types
   */
  private getContextualPrefix(intent: string): string {
    const prefixes: Record<string, string> = {
      'get_info': 'For this specific person, ',
      'modify_data': 'Regarding updating this person\'s information, ',
      'communicate': 'For outreach to this person, ',
      'analyze': 'Analyzing this person\'s profile, ',
      'navigate': 'To view this person\'s '
    };

    return prefixes[intent] || 'Regarding this person, ';
  }

  /**
   * Get suggested follow-up actions based on intent and context
   */
  private getSuggestedFollowups(intent: QueryIntent, context: IvyContext): IvyCommand[] {
    const suggestions: IvyCommand[] = [];
    
    // Intent-based suggestions
    switch (intent.primary) {
      case 'get_info':
        suggestions.push(
          ...contactRegistry.filter(cmd => 
            cmd.group === 'Panels' && cmd.id.includes('properties')
          )
        );
        break;
        
      case 'communicate':
        suggestions.push(
          ...contactRegistry.filter(cmd => 
            cmd.group === 'Actions' && 
            ['action.email', 'action.call', 'action.meeting'].includes(cmd.id)
          )
        );
        break;
        
      case 'analyze':
        suggestions.push(
          ...contactRegistry.filter(cmd => 
            cmd.group === 'Analysis' || (cmd.group === 'Panels' && cmd.id === 'panel.ai')
          )
        );
        break;
    }

    // Context-based suggestions
    const person = context.personData;
    if (person) {
      // If person has no recent activity, suggest outreach
      if (!person.last_activity_date || this.isStale(person.last_activity_date)) {
        suggestions.push(
          contactRegistry.find(cmd => cmd.id === 'action.email') as IvyCommand
        );
      }
      
      // If person is high-score but no recent contact, suggest call
      if ((person.lead_score || 0) > 70 && this.isStale(person.last_activity_date)) {
        suggestions.push(
          contactRegistry.find(cmd => cmd.id === 'action.call') as IvyCommand
        );
      }
    }

    return suggestions.filter(Boolean).slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Check if a date is stale (older than 7 days)
   */
  private isStale(dateString?: string): boolean {
    if (!dateString) return true;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    
    return diffDays > 7;
  }
}

export const intelligentProcessor = new IntelligentProcessor();
