import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Clock, Zap, Target, Phone, CheckCircle, TrendingUp } from 'lucide-react';

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
}

interface AIScoreGraphProps {
  personId: string;
  personData: any;
  triageData?: TriageItem | null; // Accept triage data as prop instead of fetching
}

const AIScoreGraph: React.FC<AIScoreGraphProps> = ({ personId, personData, triageData: propTriageData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use triage data from props instead of fetching
  const triageData = propTriageData;

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
        return 'bg-chart-3'; // Forest green
      case 'engagement_points':
        return 'bg-chart-2'; // Candy apple red
      case 'source_points':
        return 'bg-chart-5'; // Cool slate info
      case 'contactability_points':
        return 'bg-chart-4'; // Sophisticated charcoal
      case 'course_fit_points':
        return 'bg-chart-1'; // Slate foundation
      default:
        return 'bg-chart-1';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-semantic-success';
    if (confidence >= 0.6) return 'bg-semantic-warning';
    return 'bg-semantic-error';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">AI Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading score...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !triageData) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight">AI Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Unable to load score data</p>
          </div>
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight">AI Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
};

export default AIScoreGraph;
