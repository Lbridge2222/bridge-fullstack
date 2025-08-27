import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MessageSquare, 
  Lightbulb, 
  Users, 
  TrendingUp,
  Loader2,
  Copy,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Enhanced Types
interface QuerySuggestion {
  category: string;
  examples: string[];
  description: string;
  context_aware: boolean;
}

interface QueryResult {
  query: string;
  interpreted_query: string;
  results: any[];
  total_count: number;
  query_type: string;
  confidence: number;
  suggestions: string[];
  generated_at: string;
  analytics?: {
    trends: any;
    segmentation: any;
    predictive: any;
  };
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lead_score: number;
  source: string;
  lifecycle_state: string;
  created_at: string;
  has_application: boolean;
}

const NaturalLanguageQuery: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
  const [examples, setExamples] = useState<string[]>([]);
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'results' | 'analytics' | 'insights'>('results');

  useEffect(() => {
    fetchSuggestions();
    fetchExamples();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch('http://localhost:8000/ai/natural-language/suggestions');
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  const fetchExamples = async () => {
    try {
      const response = await fetch('http://localhost:8000/ai/natural-language/examples');
      if (response.ok) {
        const data = await response.json();
        setExamples(data.examples || []);
      }
    } catch (err) {
      console.error('Failed to fetch examples:', err);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      
      // Add to query history
      setQueryHistory(prev => [query, ...prev.slice(0, 4)]);
      
      const response = await fetch('http://localhost:8000/ai/natural-language/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: query.trim(),
          previous_queries: queryHistory
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
        setActiveTab('results');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process query');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process query');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    // Auto-execute the suggestion
    setTimeout(() => handleQuery(), 100);
  };

  const copyQuery = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuery(text);
    setTimeout(() => setCopiedQuery(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Chart Components
  const ScoreDistributionChart = ({ data }: { data: any }) => {
    if (!data?.score_segments) return null;
    
    const segments = data.score_segments;
    const total = Object.values(segments).reduce((sum: number, seg: any) => sum + (seg.count || 0), 0);
    
    return (
      <div className="space-y-4">
        <h4 className="font-medium">Lead Score Distribution</h4>
        <div className="space-y-3">
          {Object.entries(segments).map(([key, segment]: [string, any]) => {
            if (segment.count === 0) return null;
            const percentage = total > 0 ? (segment.count / total) * 100 : 0;
            
            return (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{key} Score ({segment.count} leads)</span>
                  <span className="font-medium">{percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      key === 'high' ? 'bg-green-500' : 
                      key === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                {segment.conversion_rate && (
                  <div className="text-xs text-muted-foreground">
                    Conversion Rate: {segment.conversion_rate.toFixed(1)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const TrendChart = ({ data }: { data: any }) => {
    if (!data?.score_trends || data.score_trends.length < 2) return null;
    
    const trends = data.score_trends;
    const maxScore = Math.max(...trends.map((t: any) => t.avg_score));
    const minScore = Math.min(...trends.map((t: any) => t.avg_score));
    const range = maxScore - minScore;
    
    return (
      <div className="space-y-4">
        <h4 className="font-medium">Score Trends Over Time</h4>
        <div className="h-48 flex items-end justify-between">
          {trends.map((trend: any, index: number) => {
            const height = range > 0 ? ((trend.avg_score - minScore) / range) * 100 : 50;
            return (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className="w-8 bg-blue-500 rounded-t"
                  style={{ height: `${height}%` }}
                ></div>
                <div className="text-xs mt-2 text-center">
                  <div className="font-medium">{trend.avg_score}</div>
                  <div className="text-muted-foreground">{trend.month}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const PredictiveInsights = ({ data }: { data: any }) => {
    if (!data) return null;
    
    return (
      <div className="space-y-4">
        <h4 className="font-medium">AI Predictions & Insights</h4>
        
        {data.opportunities && data.opportunities.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-green-700 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Opportunities
            </h5>
            <div className="space-y-1">
              {data.opportunities.map((opp: string, index: number) => (
                <div key={index} className="text-sm text-green-600 bg-green-50 p-2 rounded">
                  {opp}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {data.recommendations && data.recommendations.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Recommendations
            </h5>
            <div className="space-y-1">
              {data.recommendations.map((rec: string, index: number) => (
                <div key={index} className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {data.risk_alerts && data.risk_alerts.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Risk Alerts
            </h5>
            <div className="space-y-1">
              {data.risk_alerts.map((risk: string, index: number) => (
                <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {risk}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Natural Language Lead Queries</h1>
        <p className="text-muted-foreground">
          Ask questions about your leads in plain English. Get instant insights and find exactly what you're looking for.
        </p>
      </div>

      {/* Query Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Ask About Your Leads
          </CardTitle>
          <CardDescription>
            Type your question naturally - the AI will understand and find the right leads for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., 'Show me leads with high scores'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
              className="flex-1"
            />
            <Button onClick={handleQuery} disabled={loading || !query.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Ask
            </Button>
          </div>
          
          {/* Query History */}
          {queryHistory.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Recent queries:</p>
              <div className="flex flex-wrap gap-2">
                {queryHistory.map((histQuery, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuery(histQuery)}
                    className="text-xs"
                  >
                    {histQuery}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Query Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((suggestion, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{suggestion.category}</CardTitle>
              <CardDescription className="text-xs">{suggestion.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {suggestion.examples.map((example, exampleIndex) => (
                  <Button
                    key={exampleIndex}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs h-8"
                    onClick={() => handleSuggestionClick(example)}
                  >
                    <MessageSquare className="h-3 w-3 mr-2" />
                    {example}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Try These Examples
          </CardTitle>
          <CardDescription>
            Click any example to instantly search for leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {examples.map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(example)}
                className="text-xs"
              >
                {example}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {results && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Query Results
                </CardTitle>
                <CardDescription>
                  {results.interpreted_query} • {results.total_count} leads found
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getConfidenceColor(results.confidence)}>
                  {Math.round(results.confidence * 100)}% confidence
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyQuery(results.query)}
                >
                  {copiedQuery === results.query ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Results Summary */}
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">Your Query:</span>
                <span className="text-muted-foreground">"{results.query}"</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Search className="h-4 w-4" />
                <span className="font-medium">Interpreted as:</span>
                <span className="text-muted-foreground">{results.interpreted_query}</span>
              </div>
            </div>

            {/* Tabs for Results, Analytics, and Insights */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="insights">AI Insights</TabsTrigger>
              </TabsList>
              
              <TabsContent value="results" className="space-y-4">
                {/* Leads Table */}
                {results.results.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Name</th>
                          <th className="text-left p-2 font-medium">Contact</th>
                          <th className="text-left p-2 font-medium">Score</th>
                          <th className="text-left p-2 font-medium">Source</th>
                          <th className="text-left p-2 font-medium">Status</th>
                          <th className="text-left p-2 font-medium">Created</th>
                          <th className="text-left p-2 font-medium">Application</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.results.map((lead: Lead) => (
                          <tr key={lead.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">
                              {lead.first_name} {lead.last_name}
                            </td>
                            <td className="p-2">
                              <div className="text-sm">
                                <div>{lead.email}</div>
                                {lead.phone && <div className="text-muted-foreground">{lead.phone}</div>}
                              </div>
                            </td>
                            <td className="p-2">
                              <Badge className={getLeadScoreColor(lead.lead_score)}>
                                {lead.lead_score}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <Badge variant="outline">{lead.source || 'Unknown'}</Badge>
                            </td>
                            <td className="p-2">
                              <Badge variant="secondary">{lead.lifecycle_state}</Badge>
                            </td>
                            <td className="p-2 text-sm text-muted-foreground">
                              {formatDate(lead.created_at)}
                            </td>
                            <td className="p-2">
                              {lead.has_application ? (
                                <Badge className="bg-green-100 text-green-800">Yes</Badge>
                              ) : (
                                <Badge variant="outline">No</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No leads found matching your query</p>
                    <p className="text-sm">Try adjusting your search terms or use the suggestions above</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Score Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5" />
                        Score Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScoreDistributionChart data={results.analytics?.segmentation} />
                    </CardContent>
                  </Card>
                  
                  {/* Trends */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Score Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TrendChart data={results.analytics?.trends} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="insights" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Predictive Insights */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        AI Predictions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PredictiveInsights data={results.analytics?.predictive} />
                    </CardContent>
                  </Card>
                  
                  {/* Follow-up Suggestions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5" />
                        Smart Suggestions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {results.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full justify-start text-xs"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-6 border-t">
        <p>Phase 4.1: Natural Language Queries - Bridge CRM AI Intelligence Layer</p>
        <p className="mt-2">
          <span className="font-medium">Status:</span> ✅ Enhanced with AI intelligence & advanced analytics
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          🎯 Conversational AI • Advanced Analytics • Predictive Insights • Smart Visualizations
        </p>
      </div>
    </div>
  );
};

export default NaturalLanguageQuery;
