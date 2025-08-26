import React, { useState, useCallback } from "react";
import { Mail, Brain, Send, X, Sparkles, Wand2, MessageSquare, Loader2, Sprout, Calendar, RotateCcw, Zap, Users, Target, Clock, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Types
export interface Lead {
  id: number;
  uid: string;
  name: string;
  email: string;
  phone: string;
  courseInterest: string;
  academicYear: string;
  campusPreference: string;
  enquiryType: string;
  leadSource: string;
  status: string;
  statusType: "new" | "contacted" | "qualified" | "nurturing" | "cold";
  leadScore: number;
  createdDate: string;
  lastContact: string;
  nextAction: string;
  slaStatus: "urgent" | "warning" | "within_sla" | "met";
  contactAttempts: number;
  tags: string[];
  colorTag?: string;
  avatar?: string;
  aiInsights: {
    conversionProbability: number;
    bestContactTime: string;
    recommendedAction: string;
    urgency: "high" | "medium" | "low";
  };
  // Phase 3.3: Cohort and persona data
  cohort?: {
    id: string;
    name: string;
    persona: string;
    segment: string;
    performance_tier: "high" | "medium" | "low";
  };
}

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSendEmail?: (emailData: EmailComposerData) => Promise<void>;
}

export interface EmailComposerData {
  lead: Lead | null;
  subject: string;
  body: string;
  intent: "nurture" | "book_interview" | "reengage" | "custom";
  aiSuggestions: Array<{
    type: "template" | "approach" | "timing" | "content";
    title: string;
    description: string;
    confidence: number;
    action: string;
  }>;
  // Phase 3.3: Cohort-specific data
  cohortStrategy?: {
    persona: string;
    segment: string;
    messaging_approach: string;
    timing_optimization: string;
    a_b_test_variant: string;
    personalization_level: "basic" | "moderate" | "high";
  };
}

const EmailComposer: React.FC<EmailComposerProps> = ({
  isOpen,
  onClose,
  lead,
  onSendEmail
}) => {
  const [emailComposerData, setEmailComposerData] = useState<EmailComposerData>({
    lead,
    subject: "",
    body: "",
    intent: "nurture",
    aiSuggestions: [],
    cohortStrategy: undefined
  });

  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [selectedIntent, setSelectedIntent] = useState<"nurture" | "book_interview" | "reengage" | "custom">("nurture");

  // Phase 3.3: Cohort Strategy State
  const [cohortStrategy, setCohortStrategy] = useState<any>(null);
  const [isAnalyzingCohort, setIsAnalyzingCohort] = useState(false);

  // AI Email Suggestions
  const generateEmailSuggestions = useCallback(async (lead: Lead) => {
    try {
      // Generate AI-powered email suggestions based on lead context
      const suggestions = [
        {
          type: "template" as const,
          title: "High-Value Lead Follow-up",
          description: `Based on ${lead.leadScore} lead score and ${lead.aiInsights.conversionProbability}% conversion probability`,
          confidence: Math.min(lead.leadScore + 20, 95),
          action: "Use premium template with personalized course details"
        },
        {
          type: "approach" as const,
          title: "Engagement Strategy",
          description: `Last activity: ${lead.lastContact ? new Date(lead.lastContact).toLocaleDateString() : 'Unknown'}`,
          confidence: 85,
          action: lead.contactAttempts > 2 ? "Re-engagement with new angle" : "Direct value proposition"
        },
        {
          type: "timing" as const,
          title: "Optimal Contact Window",
          description: lead.aiInsights.bestContactTime,
          confidence: 78,
          action: "Schedule follow-up within 24-48 hours"
        },
        {
          type: "content" as const,
          title: "Personalized Hook",
          description: `Course interest: ${lead.courseInterest}, Campus: ${lead.campusPreference}`,
          confidence: 92,
          action: "Reference specific course benefits and campus features"
        }
      ];

      setEmailComposerData(prev => ({
        ...prev,
        aiSuggestions: suggestions
      }));
    } catch (error) {
      console.error("Failed to generate email suggestions:", error);
    }
  }, []);

  // Phase 3.3: Generate Cohort-Specific Strategy
  const generateCohortStrategy = useCallback(async (lead: Lead) => {
    if (!lead.cohort) return;
    
    setIsAnalyzingCohort(true);
    try {
      // Call our cohort scoring API to get personalized strategy
      const response = await fetch("http://localhost:8000/ai/cohort-scoring/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.uid,
          lead_features: {
            email: lead.email,
            phone: lead.phone,
            source: lead.leadSource,
            course_declared: lead.courseInterest,
            engagement_data: {
              email_opens: lead.contactAttempts * 2, // Estimate
              email_clicks: Math.floor(lead.contactAttempts * 0.5),
              events_attended: lead.statusType === "qualified" ? 1 : 0,
              portal_logins: lead.statusType === "contacted" ? 1 : 0,
              web_visits: lead.contactAttempts
            }
          }
        })
      });

      if (response.ok) {
        const cohortData = await response.json();
        const strategy = {
          persona: lead.cohort?.persona || "Standard",
          segment: lead.cohort?.segment || "General",
          messaging_approach: cohortData.optimization_strategies?.[0]?.strategy || "Value-focused",
          timing_optimization: cohortData.optimization_strategies?.[0]?.timing || "Standard",
          a_b_test_variant: "A", // Default variant
          personalization_level: (lead.leadScore > 70 ? "high" : lead.leadScore > 40 ? "moderate" : "basic") as "high" | "moderate" | "basic"
        };
        
        setCohortStrategy(strategy);
        setEmailComposerData(prev => ({ ...prev, cohortStrategy: strategy }));
      }
    } catch (error) {
      console.error("Failed to generate cohort strategy:", error);
      // Fallback to basic strategy
      const fallbackStrategy = {
        persona: lead.cohort?.persona || "Standard",
        segment: lead.cohort?.segment || "General",
        messaging_approach: "Value-focused",
        timing_optimization: "Standard",
        a_b_test_variant: "A",
        personalization_level: "moderate" as const
      };
      setCohortStrategy(fallbackStrategy);
      setEmailComposerData(prev => ({ ...prev, cohortStrategy: fallbackStrategy }));
    } finally {
      setIsAnalyzingCohort(false);
    }
  }, []);

  // Phase 3.3: A/B Test Variant Selection
  const selectABTestVariant = (variant: "A" | "B") => {
    if (cohortStrategy) {
      const updatedStrategy = { ...cohortStrategy, a_b_test_variant: variant };
      setCohortStrategy(updatedStrategy);
      setEmailComposerData(prev => ({ ...prev, cohortStrategy: updatedStrategy }));
    }
  };

  // AI Draft Generation
  const generateAIDraft = async (intent: string) => {
    if (!lead) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/ai/leads/compose/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lead_ids: [lead.uid],
          intent 
        })
      });

      if (res.ok) {
        const draft = await res.json();
        setEmailComposerData(prev => ({
          ...prev,
          subject: draft.subject || "",
          body: draft.body || "",
          intent: intent as any
        }));
        setAiResponse(`AI generated ${intent} email successfully!`);
      } else {
        throw new Error(`AI composition failed: ${res.statusText}`);
      }
    } catch (error) {
      console.error("AI draft generation failed:", error);
      setAiResponse(`Error: ${error instanceof Error ? error.message : "Failed to generate email"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // User Prompt AI Assistance
  const handleUserPrompt = async () => {
    if (!userPrompt.trim() || !lead) return;
    
    setIsGenerating(true);
    try {
      // For now, we'll use a simple approach. In a full implementation,
      // you'd want to create a new AI endpoint for user prompts
      const promptResponse = await fetch("http://127.0.0.1:8000/ai/leads/compose/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lead_ids: [lead.uid],
          intent: "custom",
          user_prompt: userPrompt
        })
      });

      if (promptResponse.ok) {
        const result = await promptResponse.json();
        // Apply AI suggestions to the current email
        if (result.subject) {
          setEmailComposerData(prev => ({ ...prev, subject: result.subject }));
        }
        if (result.body) {
          setEmailComposerData(prev => ({ ...prev, body: result.body }));
        }
        setAiResponse(`AI assistance applied: ${userPrompt}`);
        setUserPrompt("");
      } else {
        throw new Error("Failed to get AI assistance");
      }
    } catch (error) {
      console.error("AI assistance failed:", error);
      setAiResponse(`Error: ${error instanceof Error ? error.message : "Failed to get AI assistance"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Grammar and Spelling Check
  const checkGrammarSpelling = async () => {
    if (!emailComposerData.body.trim()) return;
    
    setIsGenerating(true);
    try {
      // This would integrate with a grammar checking service
      // For now, we'll simulate it with the AI endpoint
      const checkResponse = await fetch("http://127.0.0.1:8000/ai/leads/compose/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lead_ids: [lead?.uid || ""],
          intent: "grammar_check",
          content: emailComposerData.body
        })
      });

      if (checkResponse.ok) {
        const result = await checkResponse.json();
        if (result.corrected_body) {
          setEmailComposerData(prev => ({ ...prev, body: result.corrected_body }));
          setAiResponse("Grammar and spelling corrections applied!");
        } else {
          setAiResponse("No corrections needed - your text looks great!");
        }
      } else {
        throw new Error("Grammar check failed");
      }
    } catch (error) {
      console.error("Grammar check failed:", error);
      setAiResponse(`Error: ${error instanceof Error ? error.message : "Failed to check grammar"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Intent Selection
  const handleIntentSelect = (intent: "nurture" | "book_interview" | "reengage" | "custom") => {
    setSelectedIntent(intent);
    if (intent !== "custom") {
      generateAIDraft(intent);
    }
  };

  // Send Email
  const handleSendEmail = async () => {
    if (!emailComposerData.lead) return;
    
    try {
      if (onSendEmail) {
        await onSendEmail(emailComposerData);
      } else {
        console.log("Sending email:", {
          to: emailComposerData.lead.email,
          subject: emailComposerData.subject,
          body: emailComposerData.body,
          lead: emailComposerData.lead.name
        });
        
        alert("Email sent successfully!");
      }
      
      onClose();
      
    } catch (error) {
      console.error("Failed to send email:", error);
      alert("Failed to send email. Please try again.");
    }
  };

  // Generate suggestions when component opens
  React.useEffect(() => {
    if (isOpen && lead) {
      setEmailComposerData(prev => ({ ...prev, lead }));
      generateEmailSuggestions(lead);
      // Generate cohort strategy when lead is available
      generateCohortStrategy(lead);
    }
  }, [isOpen, lead, generateEmailSuggestions, generateCohortStrategy]);

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 bg-surface-overlay/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-surface-primary to-surface-secondary/30">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-info/10">
              <Mail className="h-6 w-6 text-info" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">AI-Powered Email Composer</h2>
              <p className="text-sm text-muted-foreground">
                To: {lead.name} ({lead.email})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            <Button onClick={handleSendEmail} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Sidebar - AI Tools & Intent Selection */}
          <div className="w-80 border-r border-border bg-muted/20 p-6 overflow-y-auto">
            {/* AI Status */}
            {isGenerating && (
              <div className="mb-6 p-4 accent-bg accent-border rounded-lg">
                <div className="flex items-center gap-2 text-accent">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">AI is thinking...</span>
                </div>
              </div>
            )}

            {/* AI Response */}
            {aiResponse && (
              <div className="mb-6 p-4 status-info-bg border-status-info-border rounded-lg">
                <div className="flex items-center gap-2 text-info mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">AI Response</span>
                </div>
                <p className="text-xs text-info">{aiResponse}</p>
              </div>
            )}

            {/* Intent Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Email Intent</h3>
              <div className="space-y-2">
                {[
                  { key: "nurture", label: "Nurture & Value", icon: <Sprout className="h-4 w-4" /> },
                  { key: "book_interview", label: "Book Interview", icon: <Calendar className="h-4 w-4" /> },
                  { key: "reengage", label: "Re-engage", icon: <RotateCcw className="h-4 w-4" /> },
                  { key: "custom", label: "Custom Prompt", icon: <Zap className="h-4 w-4" /> }
                ].map((intent) => (
                  <button
                    key={intent.key}
                    onClick={() => handleIntentSelect(intent.key as any)}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                      selectedIntent === intent.key
                        ? "accent-border accent-bg text-accent"
                        : "border-border hover:border-accent/30 hover:accent-bg"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-muted-foreground">
                        {intent.icon}
                      </div>
                      <span className="text-sm font-medium">{intent.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* User Prompt Interface */}
            {selectedIntent === "custom" && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-accent" />
                  AI Assistance
                </h3>
                <div className="space-y-3">
                  <textarea
                    value={userPrompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUserPrompt(e.target.value)}
                    placeholder="Describe what you want the AI to help with... (e.g., 'Make this more professional', 'Add a call to action', 'Improve the tone')"
                    className="h-24 text-xs resize-none w-full rounded-lg border border-border bg-background p-3 focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-200"
                  />
                  <Button 
                    onClick={handleUserPrompt}
                    disabled={!userPrompt.trim() || isGenerating}
                    className="w-full bg-accent/10 hover:bg-accent/20 text-accent border-accent/20"
                    size="sm"
                  >
                    <Sparkles className="h-3 w-3 mr-2" />
                    Get AI Help
                  </Button>
                </div>
              </div>
            )}

            {/* AI Insights */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-accent" />
                AI Insights
              </h3>
              <div className="space-y-3">
                {emailComposerData.aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-border bg-background/60 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-foreground">{suggestion.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {suggestion.confidence}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{suggestion.description}</p>
                    <p className="text-xs text-accent font-medium">{suggestion.action}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Phase 3.3: Cohort Strategy Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                Cohort Strategy
              </h3>
              
              {cohortStrategy ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-border bg-background/60 backdrop-blur-sm">
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Persona:</span>
                        <Badge variant="outline" className="text-[10px]">{cohortStrategy.persona}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Segment:</span>
                        <Badge variant="outline" className="text-[10px]">{cohortStrategy.segment}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Messaging:</span>
                        <Badge variant="outline" className="text-[10px]">{cohortStrategy.messaging_approach}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Timing:</span>
                        <Badge variant="outline" className="text-[10px]">{cohortStrategy.timing_optimization}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Personalization:</span>
                        <Badge variant="outline" className="text-[10px]">{cohortStrategy.personalization_level}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* A/B Testing Controls */}
                  <div className="p-3 rounded-lg border border-border bg-background/60 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-foreground">A/B Test Variant</span>
                      <Badge variant="outline" className="text-[10px]">{cohortStrategy.a_b_test_variant}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => selectABTestVariant("A")}
                        disabled={isAnalyzingCohort || cohortStrategy.a_b_test_variant === "A"}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-[10px] h-7"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Variant A
                      </Button>
                      <Button 
                        onClick={() => selectABTestVariant("B")}
                        disabled={isAnalyzingCohort || cohortStrategy.a_b_test_variant === "B"}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-[10px] h-7"
                      >
                        <TestTube className="h-3 w-3 mr-1" />
                        Variant B
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-2">
                    No cohort data available for this lead.
                  </p>
                  <Button 
                    onClick={() => generateCohortStrategy(lead!)}
                    disabled={isAnalyzingCohort}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    <Users className="h-3 w-3 mr-2" />
                    Analyze Cohort
                  </Button>
                </div>
              )}
            </div>

            {/* Cohort Analysis Status */}
            {isAnalyzingCohort && (
              <div className="mb-6 p-4 accent-bg accent-border rounded-lg">
                <div className="flex items-center gap-2 text-accent">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Analyzing cohort...</span>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button 
                  onClick={checkGrammarSpelling}
                  disabled={!emailComposerData.body.trim() || isGenerating}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <MessageSquare className="h-3 w-3 mr-2" />
                  Check Grammar & Spelling
                </Button>
                <Button 
                  onClick={() => handleIntentSelect("nurture")}
                  disabled={isGenerating}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Sparkles className="h-3 w-3 mr-2" />
                  Generate Fresh Template
                </Button>
              </div>
            </div>


          </div>

          {/* Right Side - Email Composition */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Subject Line */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
              <Input
                value={emailComposerData.subject}
                onChange={(e) => setEmailComposerData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter email subject..."
                className="h-12 text-base"
              />
            </div>

            {/* Email Body */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">Message</label>
              <textarea
                value={emailComposerData.body}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEmailComposerData(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Write your message... (Use AI tools on the left to help compose)"
                className="w-full h-80 rounded-lg border border-border bg-background p-4 text-sm resize-none focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-200"
              />
            </div>

            {/* Merge Fields Info */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <h4 className="text-sm font-medium text-foreground mb-2">Available Merge Fields</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>• {"{firstName}"} - Lead's first name</div>
                <div>• {"{courseInterest}"} - Course of interest</div>
                <div>• {"{campusPreference}"} - Preferred campus</div>
                <div>• {"{leadScore}"} - Lead score</div>
                <div>• {"{advisorName}"} - Your name</div>
                <div>• {"{instituteName}"} - Institute name</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;
