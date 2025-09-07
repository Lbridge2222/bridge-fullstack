import React from 'react';
import { Brain, MessageCircle, TrendingUp, Target, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AILeadInsightsChat from '@/components/AILeadInsightsChat';

const AILeadInsights: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                    <div className="p-3 bg-primary rounded-lg">
          <Brain className="h-8 w-8 text-primary-foreground" />
        </div>
            AI Lead Intelligence
          </h1>
          <p className="text-muted-foreground mt-2">
            Phase 4.2: Conversational AI-powered lead insights and analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Zap className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
          <Badge variant="secondary">Phase 4.2</Badge>
        </div>
      </div>

      {/* Feature Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Natural Language Queries</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ask Anything</div>
            <p className="text-xs text-muted-foreground">
              "Why is John scoring high?" or "Show me at-risk leads"
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intelligent Insights</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AI Analysis</div>
            <p className="text-xs text-muted-foreground">
              Pattern recognition and predictive insights
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actionable Recommendations</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Smart Actions</div>
            <p className="text-xs text-muted-foreground">
              Personalized next steps for each lead
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            AI Lead Intelligence Chat
          </CardTitle>
          <CardDescription>
            Have a conversation with your AI assistant about leads, scoring, and performance insights
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <AILeadInsightsChat />
        </CardContent>
      </Card>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Example Conversations</CardTitle>
          <CardDescription>
            Try these questions to see the AI in action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Lead Analysis</h4>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  "Why is lead John Smith scoring 87?"
                </div>
                <div className="text-sm text-muted-foreground">
                  "Show me leads at risk of churning"
                </div>
                <div className="text-sm text-muted-foreground">
                  "Which leads have the highest conversion probability?"
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Performance Insights</h4>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  "Analyze our lead scoring model performance"
                </div>
                <div className="text-sm text-muted-foreground">
                  "What factors drive high scores?"
                </div>
                <div className="text-sm text-muted-foreground">
                  "Show me conversion patterns by source"
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-6 border-t">
        <p>Phase 4.2: AI-Powered Lead Insights Chat - Bridge CRM AI Intelligence Layer</p>
        <p className="mt-2">
          <span className="font-medium">Status:</span> ✅ Conversational AI interface with intelligent lead analysis
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          🎯 Features: Natural language queries, AI insights, actionable recommendations, confidence scoring
        </p>
      </div>
    </div>
  );
};

export default AILeadInsights;
