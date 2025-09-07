import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  TrendingUp, 
  AlertCircle,
  Target,
  Clock,
  Users,
  Brain,
  Loader2,
  RefreshCw,
  Lightbulb,
  BarChart3,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Types for the chat system
interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  metadata?: {
    leadId?: string;
    insights?: string[];
    actions?: string[];
    suggestions?: string[];
    confidence?: number;
  };
}

interface LeadInsight {
  leadId: string;
  leadName: string;
  score: number;
  probability: number;
  confidence: number;
  keyFactors: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  opportunityLevel: 'low' | 'medium' | 'high' | 'very_high';
}

interface AIResponse {
  message: string;
  insights: LeadInsight[];
  suggestions: string[];
  followUpQuestions: string[];
  confidence: number;
}

const AILeadInsightsChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your AI Lead Intelligence Assistant. I can help you understand your leads, analyze performance patterns, and provide actionable insights. What would you like to know about your leads?",
      timestamp: new Date(),
      metadata: {
        suggestions: [
          "Why is lead John Smith scoring high?",
          "Show me leads at risk of churning",
          "Which leads have the highest conversion probability?",
          "Analyze our lead scoring model performance"
        ]
      }
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real lead data from ML pipeline
  const [realLeads, setRealLeads] = useState<LeadInsight[]>([]);
  
  // Fetch real lead data on component mount
  useEffect(() => {
    const fetchRealLeads = async () => {
      try {
        // This would call your ML endpoint to get real predictions
        // For now, we'll use sample data but structure it for real integration
        const sampleLeads: LeadInsight[] = [
          {
            leadId: '550e8400-e29b-41d4-a716-446655440036',
            leadName: 'Hans Müller',
            score: 87,
            probability: 0.6857,
            confidence: 0.89,
            keyFactors: ['High engagement score (84/100)', 'Recent activity (2 days ago)', 'Strong course alignment'],
            recommendations: ['Schedule follow-up call within 48 hours', 'Send personalized course materials', 'Consider early application incentive'],
            riskLevel: 'low',
            opportunityLevel: 'high'
          },
          {
            leadId: '550e8400-e29b-41d4-a716-446655440001',
            leadName: 'Emma Thompson',
            score: 95,
            probability: 0.8234,
            confidence: 0.92,
            keyFactors: ['Exceptional lead score (95/100)', 'Multiple touchpoints (8 interactions)', 'High engagement level'],
            recommendations: ['Priority follow-up within 24 hours', 'Direct application invitation', 'Consider scholarship opportunities'],
            riskLevel: 'low',
            opportunityLevel: 'very_high'
          },
          {
            leadId: '550e8400-e29b-41d4-a716-446655440002',
            leadName: 'James Wilson',
            score: 92,
            probability: 0.7891,
            confidence: 0.88,
            keyFactors: ['Strong academic profile', 'Active in multiple events', 'Clear course preference'],
            recommendations: ['Schedule academic consultation', 'Provide course-specific materials', 'Follow up on event attendance'],
            riskLevel: 'low',
            opportunityLevel: 'high'
          }
        ];
        setRealLeads(sampleLeads);
      } catch (error) {
        console.error('Error fetching real leads:', error);
      }
    };
    
    fetchRealLeads();
  }, []);

  // AI response generation using real backend ML pipeline
  const generateAIResponse = async (userInput: string): Promise<AIResponse> => {
    try {
      // First, get real-time ML predictions from your backend
      console.log('🔍 Fetching ML predictions...');
      const mlResponse = await fetch('http://localhost:8000/ai/leads/predict-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_ids: [
            '550e8400-e29b-41d4-a716-446655440036',
            '550e8400-e29b-41d4-a716-446655440001',
            '550e8400-e29b-41d4-a716-446655440002'
          ]
        })
      });

      let mlData = null;
      if (mlResponse.ok) {
        mlData = await mlResponse.json();
        console.log('✅ ML Pipeline Data:', mlData);
      } else {
        console.error('❌ ML Response failed:', mlResponse.status, mlResponse.statusText);
      }

      // Get real lead data from your CRM
      console.log('🔍 Fetching CRM leads...');
      const leadsResponse = await fetch('http://localhost:8000/people/leads?limit=50');
      let liveLeads = [];
      if (leadsResponse.ok) {
        liveLeads = await leadsResponse.json();
        console.log('✅ Live CRM Data:', liveLeads);
        console.log(`📊 Found ${liveLeads.length} leads`);
      } else {
        console.error('❌ Leads Response failed:', leadsResponse.status, leadsResponse.statusText);
      }

      // Now call Gemini with real, live data
      const aiResponse = await fetch('http://localhost:8000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          context: {
            leads: liveLeads,
            mlPredictions: mlData,
            userQuery: userInput,
            timestamp: new Date().toISOString(),
            systemContext: {
              totalLeads: liveLeads.length,
              mlModelActive: !!mlData,
              conversionRates: mlData?.predictions?.map((p: any) => p.probability) || [],
              riskLevels: liveLeads.map((l: any) => (l.conversion_probability || 0) < 0.3 ? 'high' : (l.conversion_probability || 0) < 0.6 ? 'medium' : 'low'),
              conversionProbabilities: liveLeads.map((l: any) => l.conversion_probability || 0)
            }
          }
        })
      });

      if (aiResponse.ok) {
        const response = await aiResponse.json();
        return response;
      } else {
        // Enhanced fallback with real data
        console.warn('AI service failed, using enhanced fallback with real data');
        return generateEnhancedFallbackResponse(userInput, liveLeads, mlData);
      }
    } catch (error) {
      console.error('Error in AI pipeline:', error);
      // Enhanced fallback
      return generateEnhancedFallbackResponse(userInput, [], null);
    }
  };

  // Enhanced fallback with real data analysis
  const generateEnhancedFallbackResponse = async (
    userInput: string, 
    liveLeads: any[], 
    mlData: any
  ): Promise<AIResponse> => {
    const input = userInput.toLowerCase();
    
    console.log('🔍 Enhanced fallback analysis:');
    console.log(`   • liveLeads: ${liveLeads.length} items`);
    console.log(`   • mlData: ${mlData ? 'available' : 'null'}`);
    console.log(`   • mlData.predictions: ${mlData?.predictions?.length || 0} items`);
    
    // Analyze real data to provide intelligent responses
    const totalLeads = liveLeads.length;
    const conversionRates = mlData?.predictions?.map((p: any) => p.probability) || [];
    const avgConversion = conversionRates.length > 0 
      ? (conversionRates.reduce((a: number, b: number) => a + b, 0) / conversionRates.length * 100).toFixed(1)
      : 'N/A';
    
    const highValueLeads = liveLeads.filter((l: any) => (l.lead_score || 0) > 80);
    const atRiskLeads = liveLeads.filter((l: any) => (l.conversion_probability || 0) < 0.3);
    
    if (input.includes('convert') || input.includes('probability') || input.includes('likely')) {
      return {
        message: `Based on your live CRM data, you have ${totalLeads} active leads with an average conversion probability of ${avgConversion}%. I've identified ${highValueLeads.length} high-value leads (score >80) that deserve immediate attention.`,
        insights: highValueLeads.slice(0, 3).map(lead => ({
          leadId: lead.id,
          leadName: `${lead.first_name} ${lead.last_name}`,
          score: lead.lead_score || 0,
          probability: mlData?.predictions?.find((p: any) => p.lead_id === lead.id)?.probability || 0.5,
          confidence: 0.85,
          keyFactors: [`Lead score: ${lead.lead_score}/100`, `Conversion probability: ${((lead.conversion_probability || 0) * 100).toFixed(1)}%`],
          recommendations: ['Schedule priority follow-up', 'Send personalized materials'],
          riskLevel: 'low' as const,
          opportunityLevel: 'high' as const
        })),
        suggestions: [
          `Focus on ${highValueLeads.length} high-scoring leads`,
          'Implement targeted nurture campaigns',
          'Review conversion funnel optimization'
        ],
        followUpQuestions: [
          'Would you like me to analyze specific high-value leads?',
          'Should I show conversion trend analysis?',
          'Would you like to see engagement patterns?'
        ],
        confidence: 0.85
      };
    }
    
    if (input.includes('risk') || input.includes('at risk') || input.includes('problem')) {
      return {
        message: `I've analyzed your live data and found ${atRiskLeads.length} leads that may be at risk. These leads have low engagement scores and may need immediate re-engagement strategies.`,
        insights: atRiskLeads.slice(0, 3).map(lead => ({
          leadId: lead.id,
          leadName: `${lead.first_name} ${lead.last_name}`,
          score: lead.lead_score || 0,
          probability: mlData?.predictions?.find((p: any) => p.lead_id === lead.id)?.probability || 0.3,
          confidence: 0.78,
          keyFactors: [`Low conversion probability: ${((lead.conversion_probability || 0) * 100).toFixed(1)}%`, 'May need re-engagement'],
          recommendations: ['Implement re-engagement campaigns', 'Review communication frequency'],
          riskLevel: 'high' as const,
          opportunityLevel: 'low' as const
        })),
        suggestions: [
          'Implement re-engagement campaigns',
          'Review communication frequency',
          'Offer personalized incentives'
        ],
        followUpQuestions: [
          'Would you like me to create a re-engagement strategy?',
          'Should I analyze risk factors in detail?',
          'Would you like to see similar cases and outcomes?'
        ],
        confidence: 0.78
      };
    }
    
    // Default intelligent response with real data
    return {
      message: `I can see you have ${totalLeads} active leads in your system. Your ML model is ${mlData ? 'active and providing predictions' : 'currently offline'}. What specific aspect of your leads would you like me to analyze?`,
      insights: liveLeads.slice(0, 2).map(lead => ({
        leadId: lead.id,
        leadName: `${lead.first_name} ${lead.last_name}`,
        score: lead.lead_score || 0,
        probability: mlData?.predictions?.find((p: any) => p.lead_id === lead.id)?.probability || 0.5,
        confidence: 0.7,
        keyFactors: [`Lead score: ${lead.lead_score}/100`, `Conversion probability: ${((lead.conversion_probability || 0) * 100).toFixed(1)}%`],
        recommendations: ['Review lead details', 'Check engagement metrics'],
        riskLevel: 'medium' as const,
        opportunityLevel: 'medium' as const
      })),
      suggestions: [
        'Ask about specific leads by name',
        'Request conversion probability analysis',
        'Get risk assessment for your pipeline'
      ],
      followUpQuestions: [
        'Which lead would you like me to analyze?',
        'What aspect of lead performance interests you?',
        'Would you like me to explain the scoring system?'
      ],
      confidence: 0.7
    };
  };

  // Fallback pattern matching (kept for reliability)
  const generatePatternBasedResponse = async (userInput: string): Promise<AIResponse> => {
    const input = userInput.toLowerCase();
    
    // Pattern matching for different types of queries
    if (input.includes('hans') || input.includes('müller') || input.includes('high scoring') || input.includes('87')) {
      const hansInsight = realLeads.find(lead => lead.leadName.includes('Hans') || lead.leadName.includes('Müller'));
      if (!hansInsight) {
        return {
          message: "I couldn't find Hans Müller in the current lead data. Let me show you the available leads instead.",
          insights: realLeads.slice(0, 2),
          suggestions: [
            "Check lead data availability",
            "Refresh lead information",
            "Review lead scoring status"
          ],
          followUpQuestions: [
            "Would you like me to show all available leads?",
            "Should I check the data connection?",
            "Would you like to see the lead scoring overview?"
          ],
          confidence: 0.65
        };
      }
      
      return {
        message: `${hansInsight.leadName} is scoring ${hansInsight.score}/100 with a ${(hansInsight.probability * 100).toFixed(1)}% conversion probability. Here's why they're performing so well:`,
        insights: [hansInsight],
        suggestions: [
          "Schedule immediate follow-up call",
          "Send personalized course materials",
          "Consider early application incentive"
        ],
        followUpQuestions: [
          "Would you like me to analyze their engagement patterns?",
          "Should I compare them to similar high-scoring leads?",
          "Would you like action recommendations for this lead?"
        ],
        confidence: hansInsight.confidence
      };
    }
    
    if (input.includes('risk') || input.includes('churn') || input.includes('problem')) {
      return {
        message: "I've identified several leads that may be at risk. Here are the key concerns and recommendations:",
        insights: realLeads.filter(lead => lead.riskLevel === 'medium' || lead.riskLevel === 'high'),
        suggestions: [
          "Implement re-engagement campaigns",
          "Review communication frequency",
          "Offer personalized incentives"
        ],
        followUpQuestions: [
          "Would you like me to analyze the risk factors in detail?",
          "Should I create a re-engagement strategy?",
          "Would you like to see similar cases and their outcomes?"
        ],
        confidence: 0.82
      };
    }
    
    if (input.includes('conversion') || input.includes('probability') || input.includes('score')) {
      return {
        message: "Here's an analysis of your lead conversion probabilities and scoring patterns:",
        insights: realLeads,
        suggestions: [
          "Focus on leads with >60% probability",
          "Implement targeted nurture for medium-probability leads",
          "Review scoring model calibration"
        ],
        followUpQuestions: [
          "Would you like me to analyze the scoring model performance?",
          "Should I identify factors driving high scores?",
          "Would you like optimization recommendations?"
        ],
        confidence: 0.91
      };
    }
    
    // Default response for unrecognized queries
    return {
      message: "I understand you're asking about leads, but I need a bit more context. Could you be more specific? For example:",
      insights: [],
      suggestions: [
        "Ask about a specific lead by name",
        "Inquire about scoring patterns",
        "Request risk analysis",
        "Ask for conversion insights"
      ],
      followUpQuestions: [
        "Which lead would you like me to analyze?",
        "What aspect of lead performance interests you?",
        "Would you like me to explain how the scoring works?"
      ],
      confidence: 0.65
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      const aiResponse = await generateAIResponse(inputValue);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse.message,
        timestamp: new Date(),
        metadata: {
          insights: aiResponse.insights.map(insight => insight.leadId),
          suggestions: aiResponse.suggestions,
          confidence: aiResponse.confidence
        }
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setChatHistory(prev => [...prev, inputValue]);
      
    } catch (error) {
      console.error('Error generating AI response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    // Auto-send after a brief delay to show the question being typed
    setTimeout(() => {
      setInputValue('');
      handleSendMessage();
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInsightCard = (insight: LeadInsight) => (
    <Card key={insight.leadId} className="mb-4 border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{insight.leadName}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={insight.opportunityLevel === 'high' ? 'default' : 'secondary'}>
                Score: {insight.score}/100
              </Badge>
              <Badge variant="outline">
                {(insight.probability * 100).toFixed(1)}% Conversion
              </Badge>
              <Badge variant={insight.riskLevel === 'low' ? 'default' : 'destructive'}>
                Risk: {insight.riskLevel}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Confidence</div>
            <div className="text-lg font-bold text-primary">
              {(insight.confidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning" />
            Key Factors
          </h4>
          <ul className="space-y-1">
            {insight.keyFactors.map((factor, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                {factor}
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-forest-green" />
            Recommendations
          </h4>
          <ul className="space-y-1">
            {insight.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-forest-green rounded-full"></div>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-[800px] bg-background rounded-lg border">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Lead Intelligence</h2>
              <p className="text-sm text-muted-foreground">
                Ask me anything about your leads and get intelligent insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-forest-green/10 text-forest-green border-forest-green/20">
              <Zap className="h-3 w-3 mr-1" />
              AI Powered
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => messages[0] && setMessages([messages[0]])}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-start gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`p-2 rounded-full ${
                      message.type === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-foreground'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div className={`rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      
                      {/* AI Message Metadata */}
                      {message.type === 'ai' && message.metadata && (
                        <div className="mt-3 space-y-3">
                          {/* Confidence Score */}
                          {message.metadata.confidence && (
                            <div className="flex items-center gap-2 text-xs">
                              <BarChart3 className="h-3 w-3" />
                              <span>Confidence: {(message.metadata.confidence * 100).toFixed(0)}%</span>
                            </div>
                          )}
                          
                          {/* Suggestions */}
                          {message.metadata.suggestions && message.metadata.suggestions.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium flex items-center gap-2">
                                <Sparkles className="h-3 w-3" />
                                Suggestions:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {message.metadata.suggestions.map((suggestion, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="outline" 
                                    className="text-xs cursor-pointer hover:bg-background"
                                    onClick={() => handleQuickQuestion(suggestion)}
                                  >
                                    {suggestion}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={`text-xs text-muted-foreground mt-1 ${
                    message.type === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-muted text-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Analyzing your leads...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-muted/50">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your leads, scoring, or performance..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputValue.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Quick Questions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Why is this lead scoring high?",
              "Show me at-risk leads",
              "Analyze conversion patterns",
              "What drives high scores?"
            ].map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => handleQuickQuestion(question)}
                disabled={isLoading}
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Insights Panel */}
      <div className="w-80 border-l bg-muted/30">
        <div className="p-4 border-b">
          <h3 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Live Insights
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            AI-generated insights from your conversation
          </p>
        </div>
        
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {/* Recent Insights */}
            {messages
              .filter(msg => msg.type === 'ai' && msg.metadata?.insights)
              .slice(-3)
              .map((message, index) => (
                <div key={index} className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  
                  {message.metadata?.insights?.map(leadId => {
                    const insight = realLeads.find(l => l.leadId === leadId);
                    return insight ? getInsightCard(insight) : null;
                  })}
                </div>
              ))}
            
            {messages.filter(msg => msg.type === 'ai' && msg.metadata?.insights).length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Start a conversation to see AI insights</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default AILeadInsightsChat;
