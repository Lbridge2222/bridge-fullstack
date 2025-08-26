import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, AlertTriangle, CheckCircle, Clock, Mail, Phone, Video, Target, Zap, Bell, FileText, Users } from 'lucide-react';

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
  alerts?: {
    id: string;
    lead_id: string;
    blocker_type: string;
    severity: string;
    title: string;
    description: string;
    action_required: string;
    created_at: string;
    status: string;
    assigned_to: string | null;
    escalation_level: number;
    notification_sent: boolean;
    evidence: any;
  }[];
}

interface TriageResponse {
  items: TriageItem[];
}

interface AISummaryPanelProps {
  personId: string;
  personData: any; // TODO: Type this properly with PersonEnriched interface
}

const AISummaryPanel: React.FC<AISummaryPanelProps> = ({ personId, personData }) => {
  const [triageData, setTriageData] = useState<TriageItem | null>(null);
  const [forecast, setForecast] = useState<{ probability: number; eta_days: number | null; confidence: number; drivers: string[]; risks: string[] } | null>(null);
  const [sourceAnalytics, setSourceAnalytics] = useState<any>(null);
  const [anomalyDetection, setAnomalyDetection] = useState<{
    lead_id: string;
    anomalies: Array<{
      lead_id: string;
      anomaly_type: string;
      severity: string;
      confidence: number;
      description: string;
      evidence: any;
      risk_score: number;
      recommendations: string[];
      detected_at: string;
      status: string;
    }>;
    overall_risk_score: number;
    risk_level: string;
    summary: {
      total_anomalies: number;
      anomalies_by_type: Record<string, number>;
      anomalies_by_severity: Record<string, number>;
      highest_risk_anomaly: any;
    };
    generated_at: string;
  } | null>(null);

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

  useEffect(() => {
    fetchAITriage();
    fetchForecast();
    fetchSourceAnalytics();
    fetchAnomalyDetection();
    fetchMLForecast();
    fetchSegmentation();
    fetchCohortScoring();
  }, [personId, personData]);

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

  const fetchForecast = async () => {
    try {
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
          email_open: personData.email_opens || 0,
          email_click: personData.email_clicks || 0,
          event_attended: personData.events_attended || 0,
          portal_login: personData.portal_logins || 0,
          web_repeat_visit: personData.web_visits || 0
        }
      };

      const res = await fetch('http://localhost:8000/ai/forecast/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: [leadData] })
      });
      if (!res.ok) throw new Error('Failed to fetch forecast');
      const data = await res.json();
      if (data.items && data.items[0]) {
        setForecast(data.items[0]);
      }
    } catch (e) {
      console.warn('Forecast unavailable:', e);
    }
  };

  const fetchSourceAnalytics = async () => {
    try {
      const res = await fetch('http://localhost:8000/ai/source-analytics/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time_period_days: 90, include_revenue: true, include_costs: true })
      });
      if (!res.ok) throw new Error('Failed to fetch source analytics');
      const data = await res.json();
      setSourceAnalytics(data);
    } catch (e) {
      console.warn('Source analytics unavailable:', e);
    }
  };

  const fetchAnomalyDetection = async () => {
    try {
      const engagementData = {
        email_opens: personData.email_opens || 0,
        email_clicks: personData.email_clicks || 0,
        events_attended: personData.events_attended || 0,
        portal_logins: personData.portal_logins || 0,
        web_visits: personData.web_visits || 0
      };

      const leadData = {
        id: personId,
        email: personData.email,
        has_email: Boolean(personData.email),
        has_phone: Boolean(personData.phone),
        course_declared: personData.latest_programme_name,
        last_activity_at: personData.last_engagement_date || personData.last_activity_at
      };

      const sourceData = {
        source: personData.source || "unknown"
      };

      const res = await fetch('http://localhost:8000/ai/anomaly-detection/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: personId,
          engagement_data: engagementData,
          lead_data: leadData,
          source_data: sourceData,
          time_period_days: 30
        })
      });
      if (!res.ok) throw new Error('Failed to fetch anomaly detection');
      const data = await res.json();
      setAnomalyDetection(data);
    } catch (e) {
      console.warn('Anomaly detection unavailable:', e);
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
    } catch (e) {
      console.warn('ML forecast unavailable:', e);
    }
  };

  const fetchSegmentation = async () => {
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

      const res = await fetch('http://localhost:8000/ai/segmentation/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: personId,
          lead_features: leadFeatures,
          include_persona_details: true,
          include_cohort_matching: true
        })
      });
      if (!res.ok) throw new Error('Failed to fetch segmentation');
      const data = await res.json();
      setSegmentation(data);
    } catch (e) {
      console.warn('Segmentation unavailable:', e);
    }
  };

  const fetchCohortScoring = async () => {
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

      const res = await fetch('http://localhost:8000/ai/cohort-scoring/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: personId,
          lead_features: leadFeatures,
          include_performance_comparison: true,
          include_optimization_strategies: true
        })
      });
      if (!res.ok) throw new Error('Failed to fetch cohort scoring');
      const data = await res.json();
      setCohortScoring(data);
    } catch (e) {
      console.warn('Cohort scoring unavailable:', e);
    }
  };

  const getFactorIcon = (factorName: string) => {
    switch (factorName) {
      case 'recency_points':
        return <Clock className="h-4 w-4 text-white" />;
      case 'engagement_points':
        return <Zap className="h-4 w-4 text-white" />;
      case 'source_points':
        return <Target className="h-4 w-4 text-white" />;
      case 'contactability_points':
        return <Phone className="h-4 w-4 text-white" />;
      case 'course_fit_points':
        return <CheckCircle className="h-4 w-4 text-white" />;
      default:
        return <TrendingUp className="h-4 w-4 text-white" />;
    }
  };

  const getFactorColor = (factorName: string) => {
    switch (factorName) {
      case 'recency_points':
        return 'bg-chart-3'; // Forest green from index.css
      case 'engagement_points':
        return 'bg-chart-2'; // Candy apple red from index.css
      case 'source_points':
        return 'bg-chart-5'; // Cool slate info from index.css
      case 'contactability_points':
        return 'bg-chart-4'; // Sophisticated charcoal from index.css
      case 'course_fit_points':
        return 'bg-chart-1'; // Slate foundation from index.css
      default:
        return 'bg-chart-1'; // Slate foundation from index.css
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-semantic-success'; // Forest green from index.css
    if (confidence >= 0.6) return 'bg-semantic-warning'; // Sophisticated charcoal from index.css
    return 'bg-semantic-error'; // Bold crimson from index.css
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
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

  // Convert raw factors to displayable format
  const factors = [
    { name: 'recency_points', label: 'Recency', value: triageData.raw_factors.recency_points, max: 30 },
    { name: 'engagement_points', label: 'Engagement', value: triageData.raw_factors.engagement_points, max: 40 },
    { name: 'source_points', label: 'Source Quality', value: triageData.raw_factors.source_points, max: 20 },
    { name: 'contactability_points', label: 'Contactability', value: triageData.raw_factors.contactability_points, max: 20 },
    { name: 'course_fit_points', label: 'Course Fit', value: triageData.raw_factors.course_fit_points, max: 15 }
  ];

  return (
    <div className="space-y-4">
      {/* Forecast (Phase 2.1) */}
      {forecast && (
        <div className="bg-surface-secondary/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Conversion Forecast</p>
              <p className="text-2xl font-bold text-foreground">{Math.round(forecast.probability * 100)}%</p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="text-white">
                {forecast.eta_days != null ? `${forecast.eta_days} days ETA` : 'Low likelihood'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">{Math.round((forecast.confidence || 0) * 100)}% confidence</p>
            </div>
          </div>
          {(forecast.drivers?.length || forecast.risks?.length) && (
            <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
              {forecast.drivers?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Drivers</p>
                  <ul className="space-y-1">
                    {forecast.drivers.map((d, i) => (
                      <li key={i} className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-chart-3 mt-2" />{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {forecast.risks?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Risks</p>
                  <ul className="space-y-1">
                    {forecast.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-chart-2 mt-2" />{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {/* Why this forecast */}
          {'explanation' in (forecast as any) && (
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer">Why this forecast?</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words bg-surface-secondary p-2 rounded border border-border text-[11px]">
                {JSON.stringify((forecast as any).explanation, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Phase 2.2: Source Quality Analytics */}
      {sourceAnalytics && (
        <div className="bg-surface-secondary/50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-chart-5" />
            Source Quality Analytics
            <Badge variant="secondary" className="ml-auto">
              {sourceAnalytics.summary?.sources_analyzed || 0} Sources
            </Badge>
          </h4>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
            <div className="text-center">
              <p className="text-muted-foreground">Overall Conversion</p>
              <p className="font-medium text-foreground">
                {sourceAnalytics.summary?.overall_conversion_rate ? 
                  `${(sourceAnalytics.summary.overall_conversion_rate * 100).toFixed(1)}%` : 'N/A'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Avg Quality Score</p>
              <p className="font-medium text-foreground">
                {sourceAnalytics.summary?.average_quality_score || 'N/A'}
              </p>
            </div>
          </div>

          {/* Top Sources */}
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-2">Top Performing Sources</p>
            <div className="space-y-2">
              {sourceAnalytics.sources
                ?.slice(0, 3)
                .map((source: any, index: number) => (
                  <div key={source.source} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        index === 0 ? 'bg-chart-2' : 
                        index === 1 ? 'bg-chart-3' : 'bg-chart-4'
                      }`} />
                      <span className="capitalize">{source.source.replace('_', ' ')}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{source.quality_score.toFixed(0)}</span>
                      <span className="text-muted-foreground ml-1">/100</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Key Recommendations */}
          {sourceAnalytics.recommendations?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Key Recommendations</p>
              <div className="space-y-2">
                {sourceAnalytics.recommendations
                  .filter((r: any) => r.priority === 'high')
                  .slice(0, 2)
                  .map((rec: any, index: number) => (
                    <div key={index} className={`p-2 rounded text-xs border ${
                      rec.action === 'increase_investment' ? 'bg-status-success-bg border-status-success-border' :
                      rec.action === 'reduce_investment' ? 'bg-status-error-bg border-status-error-border' :
                      'bg-status-warning-bg border-status-warning-border'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          rec.action === 'increase_investment' ? 'bg-status-success-bg text-status-success-text' :
                          rec.action === 'reduce_investment' ? 'bg-status-error-bg text-status-error-text' :
                          'bg-status-warning-bg text-status-warning-text'
                        }`}>
                          {rec.action.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="capitalize text-muted-foreground">{rec.source.replace('_', ' ')}</span>
                      </div>
                      <p className="text-foreground">{rec.reason}</p>
                      {rec.suggested_budget_change !== 0 && (
                        <p className="text-muted-foreground mt-1">
                          Budget: {rec.suggested_budget_change > 0 ? '+' : ''}{rec.suggested_budget_change}%
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phase 2.3: Anomaly Detection */}
      {anomalyDetection && (
        <div className="bg-surface-secondary/50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-semantic-warning" />
            Risk Assessment
            <Badge variant="secondary" className={`ml-auto ${
              anomalyDetection.risk_level === 'critical' ? 'bg-status-error-bg text-white' :
              anomalyDetection.risk_level === 'high' ? 'bg-status-warning-bg text-white' :
              anomalyDetection.risk_level === 'medium' ? 'bg-status-info-bg text-white' :
              'bg-status-success-bg text-white'
            }`}>
              {anomalyDetection.risk_level.toUpperCase()}
            </Badge>
          </h4>
          
          {/* Risk Score */}
          <div className="text-center mb-3">
            <p className="text-xs text-muted-foreground">Overall Risk Score</p>
            <p className={`text-2xl font-bold ${
              anomalyDetection.overall_risk_score >= 80 ? 'text-status-error-text' :
              anomalyDetection.overall_risk_score >= 60 ? 'text-status-warning-text' :
              anomalyDetection.overall_risk_score >= 30 ? 'text-status-info-text' :
              'text-status-success-text'
            }`}>
              {anomalyDetection.overall_risk_score.toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">/100</p>
          </div>

          {/* Anomalies Summary */}
          {anomalyDetection.summary?.total_anomalies > 0 && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">
                {anomalyDetection.summary.total_anomalies} Anomaly{anomalyDetection.summary.total_anomalies !== 1 ? 'ies' : ''} Detected
              </p>
              
              {/* Anomaly Types */}
              {Object.entries(anomalyDetection.summary.anomalies_by_type || {}).length > 0 && (
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  {Object.entries(anomalyDetection.summary.anomalies_by_type).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-chart-2" />
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                      <span className="ml-auto font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Key Anomalies */}
          {anomalyDetection.anomalies?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Key Issues</p>
              <div className="space-y-2">
                {anomalyDetection.anomalies
                  .filter((a: any) => a.severity === 'high' || a.severity === 'critical')
                  .slice(0, 2)
                  .map((anomaly: any, index: number) => (
                    <div key={index} className={`p-2 rounded text-xs border ${
                      anomaly.severity === 'critical' ? 'bg-status-error-bg border-status-error-border' :
                      'bg-status-warning-bg border-status-warning-border'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          anomaly.severity === 'critical' ? 'bg-status-error-bg text-status-error-text' :
                          'bg-status-warning-bg text-status-warning-text'
                        }`}>
                          {anomaly.severity.toUpperCase()}
                        </span>
                        <span className="text-muted-foreground capitalize">
                          {anomaly.anomaly_type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-foreground mb-1">{anomaly.description}</p>
                      {anomaly.recommendations?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          <strong>Action:</strong> {anomaly.recommendations[0]}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* No Anomalies */}
          {anomalyDetection.summary?.total_anomalies === 0 && (
            <div className="text-center py-2">
              <CheckCircle className="h-6 w-6 text-status-success-text mx-auto mb-1" />
              <p className="text-xs text-status-success-text">No anomalies detected</p>
              <p className="text-[10px] text-muted-foreground">Lead behavior appears normal</p>
            </div>
          )}
        </div>
      )}

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
              {Math.round(mlForecast.model_confidence * 100)}% Confidence
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
              {mlForecast.confidence_interval.lower * 100}% - {mlForecast.confidence_interval.upper * 100}%
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
                    {(mlForecast.seasonal_factors.current_month_factor * 100).toFixed(0)}%
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

      {/* Score Overview */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Overall Score</p>
          <p className="text-2xl font-bold text-foreground">{Math.round(triageData.score)}</p>
        </div>
        <div className="text-right">
          <Badge 
            variant="secondary" 
            className={`${getConfidenceColor(triageData.confidence)} text-white`}
          >
            {getConfidenceLabel(triageData.confidence)} Confidence
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">
            {Math.round(triageData.confidence * 100)}%
          </p>
        </div>
      </div>

      {/* Score Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">Score Breakdown</h4>
        <div className="space-y-3">
          {factors.map((factor, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${getFactorColor(factor.name)}`}>
                    {getFactorIcon(factor.name)}
                  </div>
                  <span className="font-medium capitalize">
                    {factor.label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{factor.value.toFixed(1)}</span>
                  <span className="text-muted-foreground text-xs ml-1">
                    (max: {factor.max})
                  </span>
                </div>
              </div>
              
              <div className="space-y-1">
                <Progress 
                  value={(factor.value / factor.max) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

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

      {/* Phase 1.3: Stalled Lead Alerts */}
      {triageData.alerts && triageData.alerts.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-semantic-warning" />
            Active Alerts
            <Badge variant="secondary" className="ml-auto">
              {triageData.alerts.filter(alert => alert.status === 'active').length} Active
            </Badge>
          </h4>
          <div className="space-y-3">
            {triageData.alerts
              .filter(alert => alert.status === 'active')
              .sort((a, b) => b.escalation_level - a.escalation_level) // Sort by escalation level (highest first)
              .map((alert, index) => (
                <div key={alert.id} className={`p-3 rounded-lg border ${
                  alert.escalation_level === 3 ? 'bg-status-error-bg border-status-error-border' :
                  alert.escalation_level === 2 ? 'bg-status-warning-bg border-status-warning-border' :
                  'bg-status-info-bg border-status-info-border'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          alert.escalation_level === 3 ? 'bg-status-error-bg text-status-error-text border border-status-error-border' :
                          alert.escalation_level === 2 ? 'bg-status-warning-bg text-status-warning-text border border-status-warning-border' :
                          'bg-status-info-bg text-status-info-text border border-status-info-border'
                        }`}>
                          {alert.escalation_level === 3 ? 'URGENT' : 
                           alert.escalation_level === 2 ? 'ESCALATED' : 'NORMAL'}
                        </span>
                        {alert.notification_sent && (
                          <Badge variant="outline" className="text-xs">
                            <Bell className="h-3 w-3 mr-1" />
                            Notified
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground capitalize">
                          {alert.blocker_type.replace('_', ' ')}
                        </span>
                      </div>
                      <h5 className="text-sm font-medium text-foreground mb-1">
                        {alert.title}
                      </h5>
                      <p className="text-xs text-muted-foreground mb-2">
                        {alert.description}
                      </p>
                      <p className="text-xs text-foreground">
                        <strong>Action Required:</strong> {alert.action_required}
                      </p>
                      {alert.assigned_to && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <strong>Assigned to:</strong> {alert.assigned_to}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Real Engagement Data */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Engagement Summary</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-chart-5" />
            <span className="text-muted-foreground">Touchpoints:</span>
            <span className="font-medium">{personData.touchpoint_count ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-chart-3" />
            <span className="text-muted-foreground">Files:</span>
            <span className="font-medium">{(personData as any).documentsCount ?? 0}</span>
          </div>
          {personData.last_engagement_date && (
            <div className="flex items-center gap-2 col-span-2">
              <Clock className="h-4 w-4 text-chart-4" />
              <span className="text-muted-foreground">Last engagement:</span>
              <span className="font-medium">
                {new Date(personData.last_engagement_date).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Next Best Action */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Next Best Action</h4>
        <div className="bg-surface-secondary/50 rounded-lg p-3">
          <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                <p className="font-medium text-foreground">
                  {personData.next_best_action || triageData.action || 'Follow up'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {personData.next_best_action 
                    ? 'AI-powered recommendation from Bridge CRM'
                    : `Based on ${triageData.band} band scoring`
                  }
                </p>
                {/* Show real conversion probability */}
                {personData.conversion_probability && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Conversion probability: {Math.round(personData.conversion_probability * 100)}%
                  </p>
                )}
              </div>
              <Button 
                onClick={() => handleActionClick(personData.next_best_action || triageData.action)}
                size="sm"
                className="shrink-0"
              >
                {(personData.next_best_action || triageData.action || '').includes('Email') && <Mail className="h-4 w-4 mr-2" />}
                {(personData.next_best_action || triageData.action || '').includes('Call') && <Phone className="h-4 w-4 mr-2" />}
                {(personData.next_best_action || triageData.action || '').includes('Meeting') && <Video className="h-4 w-4 mr-2" />}
                Take Action
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISummaryPanel;
