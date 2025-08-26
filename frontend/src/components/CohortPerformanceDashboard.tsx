import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Target, 
  BarChart3, 
  PieChart, 
  Activity,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Types for Phase 3.4
interface CohortMetrics {
  cohort_id: string;
  cohort_name: string;
  total_leads: number;
  converted_leads: number;
  conversion_rate: number;
  avg_lead_score: number;
  avg_time_to_conversion: number;
  total_value: number;
  roi: number;
  growth_trend: string;
  performance_tier: string;
}

interface LifecycleStage {
  stage: string;
  lead_count: number;
  conversion_rate: number;
  avg_days_in_stage: number;
  bottleneck_score: number;
}

interface CohortLifecycle {
  cohort_id: string;
  cohort_name: string;
  stages: LifecycleStage[];
  total_pipeline_value: number;
  conversion_funnel: Record<string, number>;
}

interface ROIAnalysis {
  segment: string;
  total_spend: number;
  total_revenue: number;
  roi: number;
  cost_per_lead: number;
  revenue_per_lead: number;
  conversion_rate: number;
}

interface TrendData {
  date: string;
  conversion_rate: number;
  lead_count: number;
  revenue: number;
}

interface CohortTrend {
  cohort_id: string;
  cohort_name: string;
  trends: TrendData[];
  growth_rate: number;
  seasonality_factor: number;
}

interface CohortPerformanceData {
  summary: {
    total_cohorts: number;
    total_leads: number;
    total_conversions: number;
    overall_conversion_rate: number;
    total_revenue: number;
    average_roi: number;
    top_performing_cohort: string;
    fastest_growing_cohort: string;
  };
  cohort_metrics: CohortMetrics[];
  lifecycle_analysis: CohortLifecycle[];
  roi_analysis: ROIAnalysis[];
  trend_analysis: CohortTrend[];
  insights: string[];
  recommendations: string[];
  generated_at: string;
}

const CohortPerformanceDashboard: React.FC = () => {
  const [data, setData] = useState<CohortPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'lifecycle' | 'roi' | 'trends'>('overview');

  useEffect(() => {
    fetchCohortPerformance();
  }, []);

  const fetchCohortPerformance = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/ai/cohort-performance/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getPerformanceColor = (tier: string) => {
    switch (tier) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      case 'stable': return <Activity className="h-4 w-4 text-blue-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading cohort performance data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-6 w-6" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cohort Performance Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights into cohort performance, lifecycle analysis, and ROI optimization
          </p>
        </div>
        <Button onClick={fetchCohortPerformance} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total_leads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across {data.summary.total_cohorts} cohorts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(data.summary.overall_conversion_rate)}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.total_conversions} conversions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.total_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              Avg ROI: {data.summary.average_roi.toFixed(1)}x
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{data.summary.top_performing_cohort}</div>
            <p className="text-xs text-muted-foreground">
              Fastest growing: {data.summary.fastest_growing_cohort}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'lifecycle', label: 'Lifecycle', icon: Clock },
          { id: 'roi', label: 'ROI Analysis', icon: DollarSign },
          { id: 'trends', label: 'Trends', icon: TrendingUp }
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Cohort Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Cohort Performance Metrics</CardTitle>
              <CardDescription>Detailed metrics for each cohort segment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Cohort</th>
                      <th className="text-left p-2 font-medium">Leads</th>
                      <th className="text-left p-2 font-medium">Conversion</th>
                      <th className="text-left p-2 font-medium">Avg Score</th>
                      <th className="text-left p-2 font-medium">Time (Days)</th>
                      <th className="text-left p-2 font-medium">Revenue</th>
                      <th className="text-left p-2 font-medium">ROI</th>
                      <th className="text-left p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cohort_metrics.map((cohort) => (
                      <tr key={cohort.cohort_id} className="border-b">
                        <td className="p-2 font-medium">{cohort.cohort_name}</td>
                        <td className="p-2">{cohort.total_leads}</td>
                        <td className="p-2">{formatPercentage(cohort.conversion_rate)}</td>
                        <td className="p-2">{cohort.avg_lead_score.toFixed(1)}</td>
                        <td className="p-2">{cohort.avg_time_to_conversion.toFixed(1)}</td>
                        <td className="p-2">{formatCurrency(cohort.total_value)}</td>
                        <td className="p-2">{cohort.roi.toFixed(1)}x</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            {getTrendIcon(cohort.growth_trend)}
                            <Badge className={getPerformanceColor(cohort.performance_tier)}>
                              {cohort.performance_tier}
                            </Badge>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Insights & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
                <CardDescription>Data-driven insights from cohort analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Actionable strategies for optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'lifecycle' && (
        <div className="space-y-6">
          {data.lifecycle_analysis.map((cohort) => (
            <Card key={cohort.cohort_id}>
              <CardHeader>
                <CardTitle>{cohort.cohort_name} - Lifecycle Analysis</CardTitle>
                <CardDescription>
                  Pipeline value: {formatCurrency(cohort.total_pipeline_value)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Conversion Funnel */}
                  <div>
                    <h4 className="font-medium mb-2">Conversion Funnel</h4>
                    <div className="flex items-center space-x-2">
                      {Object.entries(cohort.conversion_funnel).map(([stage, rate]) => (
                        <div key={stage} className="flex-1 text-center">
                          <div className="text-sm font-medium">{stage}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPercentage(rate)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stage Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cohort.stages.map((stage, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{stage.stage}</span>
                          <Badge variant="outline">
                            {stage.lead_count} leads
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div>Conversion: {formatPercentage(stage.conversion_rate)}</div>
                          <div>Avg Days: {stage.avg_days_in_stage.toFixed(1)}</div>
                          {stage.bottleneck_score > 0 && (
                            <div className="text-orange-600">
                              Bottleneck Score: {stage.bottleneck_score.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'roi' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ROI Analysis by Segment</CardTitle>
              <CardDescription>Return on investment and cost metrics for each cohort</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Segment</th>
                      <th className="text-left p-2 font-medium">Spend</th>
                      <th className="text-left p-2 font-medium">Revenue</th>
                      <th className="text-left p-2 font-medium">ROI</th>
                      <th className="text-left p-2 font-medium">Cost/Lead</th>
                      <th className="text-left p-2 font-medium">Revenue/Lead</th>
                      <th className="text-left p-2 font-medium">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.roi_analysis.map((roi) => (
                      <tr key={roi.segment} className="border-b">
                        <td className="p-2 font-medium">{roi.segment}</td>
                        <td className="p-2">{formatCurrency(roi.total_spend)}</td>
                        <td className="p-2">{formatCurrency(roi.total_revenue)}</td>
                        <td className="p-2">
                          <Badge className={roi.roi >= 3 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {roi.roi.toFixed(1)}x
                          </Badge>
                        </td>
                        <td className="p-2">{formatCurrency(roi.cost_per_lead)}</td>
                        <td className="p-2">{formatCurrency(roi.revenue_per_lead)}</td>
                        <td className="p-2">{formatPercentage(roi.conversion_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="space-y-6">
          {data.trend_analysis.map((cohort) => (
            <Card key={cohort.cohort_id}>
              <CardHeader>
                <CardTitle>{cohort.cohort_name} - Performance Trends</CardTitle>
                <CardDescription>
                  Growth rate: {(cohort.growth_rate * 100).toFixed(1)}% | 
                  Seasonality: {cohort.seasonality_factor.toFixed(2)}x
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Trend Chart Placeholder */}
                  <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Trend visualization would go here</p>
                      <p className="text-xs">6 months of data available</p>
                    </div>
                  </div>

                  {/* Trend Summary */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">
                        {cohort.trends.length}
                      </div>
                      <div className="text-xs text-muted-foreground">Data Points</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {(cohort.growth_rate * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Growth Rate</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {cohort.seasonality_factor.toFixed(1)}x
                      </div>
                      <div className="text-xs text-muted-foreground">Seasonality</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-6 border-t">
        <p>Data generated at: {new Date(data.generated_at).toLocaleString()}</p>
        <p>Phase 3.4: Cohort Performance Analytics - Bridge CRM AI Intelligence Layer</p>
      </div>
    </div>
  );
};

export default CohortPerformanceDashboard;
