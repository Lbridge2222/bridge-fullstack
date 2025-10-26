// src/ivy/applicationAnalyzer.ts
// Specialized application analysis for individual applicant insights

import { ragApi } from '@/services/callConsoleApi';

export interface ApplicationInsight {
  applicantName: string;
  applicationId: string;
  currentStage: string;
  conversionProbability: number;
  leadScore: number;
  engagementLevel: 'high' | 'medium' | 'low';
  riskFactors: string[];
  positiveIndicators: string[];
  recommendedActions: string[];
  nextSteps: string[];
  confidence: number;
}

export interface TouchpointAnalysis {
  totalTouchpoints: number;
  recentActivity: string[];
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  lastContact: string;
  responseRate: number;
  preferredChannels: string[];
}

export class ApplicationAnalyzer {
  /**
   * Analyze a specific applicant's likelihood to convert
   */
  async analyzeApplicant(
    applicantName: string, 
    applications: any[], 
    context: any
  ): Promise<ApplicationInsight> {
    console.log(`Analyzing applicant: ${applicantName}`);
    
    // Find the specific applicant
    const applicant = this.findApplicant(applicantName, applications);
    if (!applicant) {
      throw new Error(`Applicant "${applicantName}" not found in current applications`);
    }

    // Analyze their application data
    const analysis = await this.performDeepAnalysis(applicant, context);
    
    return analysis;
  }

  /**
   * Find applicant by name (fuzzy matching)
   */
  private findApplicant(name: string, applications: any[]): any | null {
    const searchName = name.toLowerCase().trim();
    
    // Try exact match first
    let applicant = applications.find(app => 
      app.name?.toLowerCase() === searchName ||
      app.applicant_name?.toLowerCase() === searchName ||
      app.first_name?.toLowerCase() === searchName ||
      app.last_name?.toLowerCase() === searchName
    );

    if (applicant) return applicant;

    // Try partial matching
    applicant = applications.find(app => {
      const fullName = `${app.first_name || ''} ${app.last_name || ''}`.toLowerCase().trim();
      const appName = app.name?.toLowerCase() || '';
      return fullName.includes(searchName) || 
             searchName.includes(fullName) ||
             appName.includes(searchName);
    });

    return applicant;
  }

  /**
   * Perform deep analysis of applicant data
   */
  private async performDeepAnalysis(applicant: any, context: any): Promise<ApplicationInsight> {
    // Extract key metrics
    const conversionProbability = applicant.conversion_probability || 0;
    const leadScore = applicant.lead_score || 0;
    const currentStage = applicant.stage || 'unknown';
    
    // Analyze engagement and activity
    const touchpointAnalysis = this.analyzeTouchpoints(applicant);
    
    // Determine risk factors
    const riskFactors = this.identifyRiskFactors(applicant, touchpointAnalysis);
    
    // Identify positive indicators
    const positiveIndicators = this.identifyPositiveIndicators(applicant, touchpointAnalysis);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(applicant, riskFactors, positiveIndicators);
    
    // Determine next steps
    const nextSteps = this.determineNextSteps(applicant, currentStage, riskFactors);
    
    // Calculate confidence based on data completeness
    const confidence = this.calculateConfidence(applicant, touchpointAnalysis);

    return {
      applicantName: applicant.name || `${applicant.first_name} ${applicant.last_name}`,
      applicationId: applicant.application_id || applicant.id,
      currentStage,
      conversionProbability,
      leadScore,
      engagementLevel: this.determineEngagementLevel(touchpointAnalysis),
      riskFactors,
      positiveIndicators,
      recommendedActions: recommendations,
      nextSteps,
      confidence
    };
  }

  /**
   * Analyze touchpoints and engagement
   */
  private analyzeTouchpoints(applicant: any): TouchpointAnalysis {
    // This would integrate with your touchpoint/activity data
    // For now, using available fields
    const lastActivity = applicant.last_activity_at || applicant.updated_at;
    const totalTouchpoints = applicant.touchpoint_count || 0;
    
    return {
      totalTouchpoints,
      recentActivity: applicant.recent_activities || [],
      engagementTrend: this.calculateEngagementTrend(applicant),
      lastContact: lastActivity,
      responseRate: applicant.response_rate || 0,
      preferredChannels: applicant.preferred_channels || []
    };
  }

  /**
   * Identify risk factors for this applicant
   */
  private identifyRiskFactors(applicant: any, touchpoints: TouchpointAnalysis): string[] {
    const risks: string[] = [];
    
    // Low conversion probability
    if (applicant.conversion_probability < 0.3) {
      risks.push('Low conversion probability');
    }
    
    // Low lead score
    if (applicant.lead_score < 40) {
      risks.push('Below average lead score');
    }
    
    // Low engagement
    if (touchpoints.totalTouchpoints < 3) {
      risks.push('Limited engagement history');
    }
    
    // Stale activity
    if (touchpoints.lastContact && this.isStaleActivity(touchpoints.lastContact)) {
      risks.push('No recent activity');
    }
    
    // Stage-specific risks
    if (applicant.stage === 'application_submitted' && this.isOverdue(applicant)) {
      risks.push('Application submitted but no follow-up');
    }
    
    return risks;
  }

  /**
   * Identify positive indicators
   */
  private identifyPositiveIndicators(applicant: any, touchpoints: TouchpointAnalysis): string[] {
    const positives: string[] = [];
    
    // High conversion probability
    if (applicant.conversion_probability > 0.7) {
      positives.push('High conversion probability');
    }
    
    // High lead score
    if (applicant.lead_score > 80) {
      positives.push('Strong lead score');
    }
    
    // Good engagement
    if (touchpoints.totalTouchpoints > 5) {
      positives.push('Active engagement');
    }
    
    // Recent activity
    if (touchpoints.lastContact && !this.isStaleActivity(touchpoints.lastContact)) {
      positives.push('Recent activity');
    }
    
    return positives;
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(
    applicant: any, 
    riskFactors: string[], 
    positives: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (riskFactors.includes('Low conversion probability')) {
      recommendations.push('Schedule personalized follow-up call');
    }
    
    if (riskFactors.includes('No recent activity')) {
      recommendations.push('Send re-engagement email with program updates');
    }
    
    if (riskFactors.includes('Limited engagement history')) {
      recommendations.push('Invite to virtual campus tour or info session');
    }
    
    if (positives.includes('High conversion probability')) {
      recommendations.push('Fast-track to next stage');
    }
    
    if (positives.includes('Active engagement')) {
      recommendations.push('Maintain current engagement level');
    }
    
    return recommendations;
  }

  /**
   * Determine next steps based on current stage and analysis
   */
  private determineNextSteps(
    applicant: any, 
    currentStage: string, 
    riskFactors: string[]
  ): string[] {
    const nextSteps: string[] = [];
    
    switch (currentStage) {
      case 'application_submitted':
        if (riskFactors.length > 0) {
          nextSteps.push('Review application completeness');
          nextSteps.push('Schedule interview if required');
        } else {
          nextSteps.push('Proceed to interview stage');
        }
        break;
        
      case 'interview_scheduled':
        nextSteps.push('Prepare interview questions');
        nextSteps.push('Send interview confirmation');
        break;
        
      case 'offer_pending':
        nextSteps.push('Follow up on offer response');
        nextSteps.push('Address any concerns');
        break;
        
      default:
        nextSteps.push('Review current stage requirements');
        nextSteps.push('Plan next engagement');
    }
    
    return nextSteps;
  }

  /**
   * Calculate confidence in the analysis
   */
  private calculateConfidence(applicant: any, touchpoints: TouchpointAnalysis): number {
    let confidence = 0.5; // Base confidence
    
    // More data = higher confidence
    if (touchpoints.totalTouchpoints > 3) confidence += 0.2;
    if (applicant.conversion_probability !== undefined) confidence += 0.1;
    if (applicant.lead_score !== undefined) confidence += 0.1;
    if (touchpoints.lastContact) confidence += 0.1;
    
    return Math.min(0.95, confidence);
  }

  /**
   * Determine engagement level
   */
  private determineEngagementLevel(touchpoints: TouchpointAnalysis): 'high' | 'medium' | 'low' {
    if (touchpoints.totalTouchpoints > 5 && touchpoints.engagementTrend === 'increasing') {
      return 'high';
    } else if (touchpoints.totalTouchpoints > 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate engagement trend
   */
  private calculateEngagementTrend(applicant: any): 'increasing' | 'stable' | 'decreasing' {
    // This would analyze activity patterns over time
    // For now, return stable as default
    return 'stable';
  }

  /**
   * Check if activity is stale
   */
  private isStaleActivity(lastActivity: string): boolean {
    const lastActivityDate = new Date(lastActivity);
    const daysSinceActivity = (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceActivity > 14; // Stale if no activity for 2+ weeks
  }

  /**
   * Check if application is overdue
   */
  private isOverdue(applicant: any): boolean {
    // This would check against deadlines
    // For now, return false as default
    return false;
  }
}

export const applicationAnalyzer = new ApplicationAnalyzer();
