import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, AlertTriangle, CheckCircle, Clock, Mail, Phone, Video, Target, Zap, Bell, FileText, Users } from 'lucide-react';
import LeadProfileSummary from '@/components/LeadProfileSummary';

interface ScoreFactor {
  factor: string;
  weight: number;
  contribution: number;
  reason_code: string;
  description: string;
  evidence: string[];
}

interface NextAction {
  label: string;
  reason: string;
}

// New adaptive triage system interfaces
interface TriageItem {
  leadId: string;
  score: number;
  band: string;
  action: string;
  confidence: number;
  reasons: string[];
  raw_factors: {
    recency_points: number;
    engagement_points: number;
    source_points: number;
    contactability_points: number;
    course_fit_points: number;
    days_since_last_activity: number | null;
    source: string | null;
    supply_state: string | null;
  };
  blockers?: {
    type: string;
    description: string;
    impact: string;
    action: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }[];
}

interface TriageResponse {
  items: TriageItem[];
}

interface AISummaryPanelProps {
  personId: string;
  personData: any; // TODO: Type this properly with PersonEnriched interface
  profileMode?: boolean; // Optional prop to force profile mode
  lastQuery?: string; // Last query to detect profile intent
  onTriageDataChange?: (triageData: TriageItem | null) => void; // Callback to pass triage data to parent
  onMLForecastChange?: (mlForecast: any) => void; // Callback to pass ML forecast data to parent
}

const AISummaryPanel: React.FC<AISummaryPanelProps> = ({ personId, personData, profileMode: forcedProfileMode, lastQuery, onTriageDataChange, onMLForecastChange }) => {
  const [triageData, setTriageData] = useState<TriageItem | null>(null);

  const [mlForecast, setMlForecast] = useState<{
    lead_id: string;
    conversion_probability: number;
    confidence_interval: { lower: number; upper: number; standard_error: number };
    eta_days: number | null;
    cohort_performance: any;
    feature_importance: Record<string, number>;
    model_confidence: number;
    seasonal_factors: any;
    generated_at: string;
  } | null>(null);

  const [segmentation, setSegmentation] = useState<{
    lead_id: string;
    primary_persona: {
      id: string;
      name: string;
      description: string;
      characteristics: string[];
      conversion_rate: number;
      avg_eta_days: number | null;
      size: number;
      confidence: number;
      behavioral_signatures: Record<string, number>;
    };
    secondary_personas: Array<{
      id: string;
      name: string;
      description: string;
      characteristics: string[];
      conversion_rate: number;
      avg_eta_days: number | null;
      size: number;
      confidence: number;
      behavioral_signatures: Record<string, number>;
    }>;
    cohort_matches: Array<{
      cohort_id: string;
      cohort_name: string;
      similarity_score: number;
      shared_characteristics: string[];
      performance_difference: number;
    }>;
    behavioral_cluster: string;
    cluster_confidence: number;
    persona_confidence: number;
    generated_at: string;
  } | null>(null);

  const [cohortScoring, setCohortScoring] = useState<{
    lead_id: string;
    primary_cohort: {
      cohort_id: string;
      cohort_name: string;
      size: number;
      conversion_rate: number;
      avg_eta_days: number;
      avg_score: number;
      performance_tier: string;
      growth_trend: string;
      key_drivers: string[];
      risk_factors: string[];
    };
    cohort_comparison: {
      primary_cohort: any;
      comparison_cohorts: Array<{
        cohort_id: string;
        cohort_name: string;
        size: number;
        conversion_rate: number;
        avg_eta_days: number;
        avg_score: number;
        performance_tier: string;
        growth_trend: string;
        key_drivers: string[];
        risk_factors: string[];
      }>;
      performance_gaps: Record<string, any>;
      improvement_opportunities: string[];
    } | null;
    optimization_strategies: Array<{
      strategy_type: string;
      title: string;
      description: string;
      expected_impact: string;
      implementation_effort: string;
      priority: string;
      target_metrics: string[];
      success_criteria: string[];
    }>;
    cohort_score: number;
    performance_percentile: number;
    growth_potential: number;
    risk_level: string;
    generated_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detect profile mode based on props or query patterns
  const profileMode = forcedProfileMode || 
    (personData?.__rag_query_type === "lead_profile") ||
    (personData?.__rag_query_type === "lead_info") || 
    /tell me about/i.test(lastQuery || "") ||
    /about this person/i.test(lastQuery || "") ||
    /about this lead/i.test(lastQuery || "");

  useEffect(() => {
    fetchAITriage();
    fetchMLForecast();
  }, [personId, personData]);

  // Pass triage data to parent component
  useEffect(() => {
    if (onTriageDataChange) {
      onTriageDataChange(triageData);
    }
  }, [triageData, onTriageDataChange]);

  const fetchAITriage = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use real person data from Supabase instead of hardcoded placeholders
      const leadData = {
        id: personId,
        last_activity_at: personData.last_engagement_date || personData.last_activity_at || new Date().toISOString(),
        source: personData.source || "unknown",
        has_email: Boolean(personData.email),
        has_phone: Boolean(personData.phone),
        gdpr_opt_in: Boolean(personData.gdpr_opt_in || personData.consent_status),
        course_declared: personData.latest_programme_name || null,
        degree_level: personData.latest_academic_year || null,
        target_degree_level: personData.latest_academic_year || null,
        course_supply_state: personData.course_supply_state || null,
        engagement: {
          // Map touchpoint data to engagement metrics
          email_open: personData.email_opens || 0,
          email_click: personData.email_clicks || 0,
          event_attended: personData.events_attended || 0,
          portal_login: personData.portal_logins || 0,
          web_repeat_visit: personData.web_visits || 0
        }
      };

      // Debug: Log what real data we're sending to triage
      console.log('🎯 Sending real Supabase data to AI Triage:', {
        personId,
        source: leadData.source,
        has_email: leadData.has_email,
        has_phone: leadData.has_phone,
        course: leadData.course_declared,
        engagement: leadData.engagement,
        last_activity: leadData.last_activity_at
      });

      const response = await fetch('http://localhost:8000/ai/triage/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          leads: [leadData]
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch AI triage: ${response.statusText}`);
      }

      const data: TriageResponse = await response.json();
      if (data.items && data.items.length > 0) {
        setTriageData(data.items[0]!);
      } else {
        throw new Error('No triage data returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI triage');
      console.error('Error fetching AI triage:', err);
    } finally {
      setLoading(false);
    }
  };




  const fetchMLForecast = async () => {
    try {
      const leadFeatures = {
        email: personData.email,
        phone: personData.phone,
        source: personData.source || "unknown",
        engagement_data: {
          email_opens: personData.email_opens || 0,
          email_clicks: personData.email_clicks || 0,
          events_attended: personData.events_attended || 0,
          portal_logins: personData.portal_logins || 0,
          web_visits: personData.web_visits || 0
        },
        course_declared: personData.latest_programme_name
      };

      const res = await fetch('http://localhost:8000/ai/ml-models/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: personId,
          lead_features: leadFeatures,
          include_confidence_intervals: true,
          include_cohort_analysis: true,
          forecast_horizon_days: 90
        })
      });
      if (!res.ok) throw new Error('Failed to fetch ML forecast');
      const data = await res.json();
      setMlForecast(data);
      // Pass ML forecast to parent component
      if (onMLForecastChange) {
        onMLForecastChange(data);
      }
    } catch (e) {
      console.warn('ML forecast unavailable:', e);
    }
  };




  const handleActionClick = (action: string) => {
    // TODO: Implement action handling (open email composer, call composer, etc.)
    console.log('Action clicked:', action);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading AI triage...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <AlertTriangle className="h-8 w-8 text-semantic-error mx-auto mb-2" />
        <p className="text-sm text-semantic-error mb-2">Failed to load AI triage</p>
        <Button onClick={fetchAITriage} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  if (!triageData) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">No AI triage available</p>
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {profileMode ? (
        <>
          <LeadProfileSummary
            personData={personData}
            triageData={triageData}
            onAction={handleActionClick}
            showAIScores={false} // Hide AI scores in profile mode
          />

          {/* Deep-dive stays available but tucked away */}
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              More AI detail
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Keep your existing detailed cards but render only when expanded if you want.
                 For a quick win, show just Forecast + Risk; hide Personas/Cohorts unless needed. */}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Fallback to your existing heavy layout (unchanged) */}



      {/* Phase 2.4: Advanced ML Forecast */}
      {mlForecast && (
        <div className="bg-surface-secondary/50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-chart-1" />
            Advanced ML Forecast
            <Badge variant="secondary" className={`ml-auto ${
              mlForecast.model_confidence >= 0.8 ? 'bg-status-success-bg text-white' :
              mlForecast.model_confidence >= 0.6 ? 'bg-status-info-bg text-white' :
              'bg-status-warning-bg text-white'
            }`}>
              {(mlForecast.model_confidence * 100).toFixed(1)}% Confidence
            </Badge>
          </h4>
          
          {/* ML Probability with Confidence Interval */}
          <div className="text-center mb-3">
            <p className="text-xs text-muted-foreground">ML Conversion Probability</p>
            <p className={`text-2xl font-bold ${
              mlForecast.conversion_probability >= 0.8 ? 'text-status-success-text' :
              mlForecast.conversion_probability >= 0.6 ? 'text-status-info-text' :
              mlForecast.conversion_probability >= 0.4 ? 'text-status-warning-text' :
              'text-status-error-text'
            }`}>
              {(mlForecast.conversion_probability * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {(mlForecast.confidence_interval.lower * 100).toFixed(1)}% - {(mlForecast.confidence_interval.upper * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground">95% Confidence Interval</p>
          </div>

          {/* Feature Importance */}
          {Object.keys(mlForecast.feature_importance).length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">Key Drivers</p>
              <div className="space-y-1">
                {Object.entries(mlForecast.feature_importance)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([feature, importance], index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="capitalize">{feature.replace('_', ' ')}</span>
                      <span className="font-medium">{importance.toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Cohort Performance */}
          {mlForecast.cohort_performance && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">Cohort Analysis</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-center p-2 bg-surface-primary rounded">
                  <p className="font-medium">{mlForecast.cohort_performance.cohort_size}</p>
                  <p className="text-[10px] text-muted-foreground">Similar Leads</p>
                </div>
                <div className="text-center p-2 bg-surface-primary rounded">
                  <p className="font-medium">{(mlForecast.cohort_performance.similar_leads_conversion_rate * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground">Cohort Rate</p>
                </div>
              </div>
            </div>
          )}

          {/* Seasonal Factors */}
          {mlForecast.seasonal_factors && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">Seasonal Impact</p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Current Month:</span>
                  <span className={`font-medium ${
                    mlForecast.seasonal_factors.current_month_factor > 1 ? 'text-status-success-text' :
                    mlForecast.seasonal_factors.current_month_factor < 1 ? 'text-status-warning-text' :
                    'text-muted-foreground'
                  }`}>
                    {(mlForecast.seasonal_factors.current_month_factor * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Next Peak:</span>
                  <span className="font-medium">Month {mlForecast.seasonal_factors.next_peak_month}</span>
                </div>
              </div>
            </div>
          )}

          {/* ETA */}
          {mlForecast.eta_days && (
            <div className="text-center p-2 bg-surface-primary rounded">
              <p className="text-xs text-muted-foreground">Estimated Conversion</p>
              <p className="text-sm font-medium text-foreground">{mlForecast.eta_days} days</p>
            </div>
          )}
        </div>
      )}

      {/* Phase 3.1: AI Segmentation & Personas */}
      {segmentation && (
        <div className="bg-surface-secondary/50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-chart-2" />
            AI Persona Analysis
            <Badge variant="secondary" className={`ml-auto ${
              segmentation.persona_confidence >= 0.8 ? 'bg-status-success-bg text-white' :
              segmentation.persona_confidence >= 0.6 ? 'bg-status-info-bg text-white' :
              'bg-status-warning-bg text-white'
            }`}>
              {Math.round(segmentation.persona_confidence * 100)}% Match
            </Badge>
          </h4>
          
          {/* Primary Persona */}
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-2">Primary Persona</p>
            <div className="p-2 bg-surface-primary rounded">
              <p className="text-sm font-medium text-foreground">{segmentation.primary_persona.name}</p>
              <p className="text-xs text-muted-foreground mb-2">{segmentation.primary_persona.description}</p>
              
              {/* Persona Stats */}
              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div className="text-center">
                  <p className="font-medium">{(segmentation.primary_persona.conversion_rate * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground">Conv. Rate</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">{segmentation.primary_persona.size}</p>
                  <p className="text-[10px] text-muted-foreground">Cohort Size</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">{segmentation.primary_persona.avg_eta_days || 'N/A'}</p>
                  <p className="text-[10px] text-muted-foreground">Avg ETA</p>
                </div>
              </div>
              
              {/* Characteristics */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Key Characteristics:</p>
                {segmentation.primary_persona.characteristics.map((char, index) => (
                  <div key={index} className="flex items-center gap-1 text-xs">
                    <CheckCircle className="h-3 w-3 text-status-success-text" />
                    <span>{char}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cohort Matches */}
          {segmentation.cohort_matches.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">Similar Cohorts</p>
              <div className="space-y-2">
                {segmentation.cohort_matches.slice(0, 2).map((cohort, index) => (
                  <div key={index} className="p-2 bg-surface-primary rounded text-xs">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="font-medium">{cohort.cohort_name}</span>
                      <span className={`ml-auto ${
                        cohort.performance_difference > 0 ? 'text-status-success-text' : 'text-status-warning-text'
                      }`}>
                        {cohort.performance_difference > 0 ? '+' : ''}{(cohort.performance_difference * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-1">
                      {Math.round(cohort.similarity_score * 100)}% similarity
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {cohort.shared_characteristics.slice(0, 2).map((char, charIndex) => (
                        <span key={charIndex} className="px-1.5 py-0.5 bg-surface-secondary rounded text-[10px]">
                          {char}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

                    {/* Behavioral Cluster */}
          <div className="text-center p-2 bg-surface-primary rounded">
            <p className="text-xs text-muted-foreground">Behavioral Cluster</p>
            <p className={`text-sm font-medium ${
              segmentation.behavioral_cluster === 'high_confidence' ? 'text-status-success-text' :
              segmentation.behavioral_cluster === 'medium_confidence' ? 'text-status-info-text' :
              'text-status-warning-text'
            }`}>
              {segmentation.behavioral_cluster.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
          </div>
        </div>
      )}

      {/* Phase 3.2: Cohort-based Scoring & Insights */}
      {cohortScoring && (
        <div className="bg-surface-secondary/50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-chart-3" />
            Cohort Performance Analysis
            <Badge variant="secondary" className={`ml-auto ${
              cohortScoring.risk_level === 'low' ? 'bg-status-success-bg text-white' :
              cohortScoring.risk_level === 'medium' ? 'bg-status-info-bg text-white' :
              'bg-status-warning-bg text-white'
            }`}>
              {cohortScoring.risk_level.toUpperCase()} Risk
            </Badge>
          </h4>
          
          {/* Cohort Score & Performance */}
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-2 text-center mb-3">
              <div className="p-2 bg-surface-primary rounded">
                <p className="text-xs text-muted-foreground">Cohort Score</p>
                <p className={`text-lg font-bold ${
                  cohortScoring.cohort_score >= 80 ? 'text-status-success-text' :
                  cohortScoring.cohort_score >= 60 ? 'text-status-info-text' :
                  'text-status-warning-text'
                }`}>
                  {cohortScoring.cohort_score}
                </p>
              </div>
              <div className="p-2 bg-surface-primary rounded">
                <p className="text-xs text-muted-foreground">Performance</p>
                <p className="text-lg font-bold text-foreground">
                  {cohortScoring.performance_percentile.toFixed(0)}%
                </p>
              </div>
            </div>
            
            {/* Growth Potential */}
            <div className="text-center p-2 bg-surface-primary rounded mb-3">
              <p className="text-xs text-muted-foreground">Growth Potential</p>
              <p className="text-sm font-medium text-foreground">
                {(cohortScoring.growth_potential * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Primary Cohort Performance */}
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-2">Primary Cohort: {cohortScoring.primary_cohort.cohort_name}</p>
            <div className="p-2 bg-surface-primary rounded">
              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div className="text-center">
                  <p className="font-medium">{(cohortScoring.primary_cohort.conversion_rate * 100).toFixed(1)}%</p>
                  <p className="text-[10px] text-muted-foreground">Conv. Rate</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">{cohortScoring.primary_cohort.avg_eta_days.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">Avg ETA</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">{cohortScoring.primary_cohort.avg_score.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">Avg Score</p>
                </div>
              </div>
              
              {/* Key Drivers */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Key Drivers:</p>
                {cohortScoring.primary_cohort.key_drivers.slice(0, 2).map((driver, index) => (
                  <div key={index} className="flex items-center gap-1 text-xs">
                    <TrendingUp className="h-3 w-3 text-status-success-text" />
                    <span>{driver}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Optimization Strategies */}
          {cohortScoring.optimization_strategies.length > 0 && cohortScoring.optimization_strategies[0] && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">Top Optimization Strategy</p>
              <div className="p-2 bg-surface-primary rounded">
                <p className="text-sm font-medium text-foreground mb-1">
                  {cohortScoring.optimization_strategies[0]?.title}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {cohortScoring.optimization_strategies[0]?.description}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-status-success-text">
                    {cohortScoring.optimization_strategies[0]?.expected_impact}
                  </span>
                  <span className={`px-2 py-1 rounded text-[10px] ${
                    cohortScoring.optimization_strategies[0]?.priority === 'High' ? 'bg-status-success-bg text-white' :
                    cohortScoring.optimization_strategies[0]?.priority === 'Medium' ? 'bg-status-info-bg text-white' :
                    'bg-status-warning-bg text-white'
                  }`}>
                    {cohortScoring.optimization_strategies[0]?.priority}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Performance Comparison */}
          {cohortScoring.cohort_comparison && (
            <div className="text-center p-2 bg-surface-primary rounded">
              <p className="text-xs text-muted-foreground">Performance vs Other Cohorts</p>
              <p className="text-sm font-medium text-foreground">
                {cohortScoring.cohort_comparison.improvement_opportunities.length} opportunities identified
              </p>
            </div>
          )}
        </div>
      )}


      {/* AI Explanations */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-foreground mb-3">AI Analysis</h4>
        <div className="space-y-2">
          {triageData.reasons.map((reason, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-chart-2 mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">{reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Blockers Detection */}
      {triageData.blockers && triageData.blockers.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-semantic-error" />
            Pipeline Blockers
          </h4>
          <div className="space-y-3">
            {triageData.blockers.map((blocker, index) => (
              <div key={index} className={`p-3 rounded-lg border ${
                blocker.severity === 'critical' ? 'bg-status-error-bg border-status-error-border' :
                blocker.severity === 'high' ? 'bg-status-warning-bg border-status-warning-border' :
                blocker.severity === 'medium' ? 'bg-status-info-bg border-status-info-border' :
                'bg-surface-secondary/50 border-border'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        blocker.severity === 'critical' ? 'bg-status-error-bg text-status-error-text border border-status-error-border' :
                        blocker.severity === 'high' ? 'bg-status-warning-bg text-status-warning-text border border-status-warning-border' :
                        blocker.severity === 'medium' ? 'bg-status-info-bg text-status-info-text border border-status-info-border' :
                        'bg-surface-secondary text-text-secondary border border-border'
                      }`}>
                        {blocker.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {blocker.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      {blocker.description}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Impact:</strong> {blocker.impact}
                    </p>
                    <p className="text-xs text-foreground">
                      <strong>Action:</strong> {blocker.action}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


        </>
      )}
    </div>
  );
};

export default AISummaryPanel;
