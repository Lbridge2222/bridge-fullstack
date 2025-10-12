import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { Mail, Brain, Send, X, Sparkles, Wand2, MessageSquare, Loader2, Sprout, Calendar, RotateCcw, Zap, Users, Target, Clock, TestTube, HelpCircle, Plus, GripVertical, Maximize, Minimize, Minus, Bold, Italic, Underline, List, ListOrdered, Indent, Outdent, AlignLeft, AlignCenter, AlignRight, Quote, Link, Type, AlertCircle, History, Eye } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";
import { ragApi, type RagContext, type RagResponse } from '@/services/callConsoleApi';
import { aiLeadsApi } from '@/services/api';

// Types
type DisplayMode = "floating" | "docked" | "fullscreen";
type ViewMode = "edit" | "preview" | "html";

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
  forceFullscreen?: boolean;
  onSendEmail?: (emailData: EmailComposerData) => Promise<void>;
}

export interface EmailComposerData {
  lead: Lead | null;
  subject: string;
  body: string;
  intent: "nurture" | "book_interview" | "reengage" | "custom";
  htmlBody?: string;
  aiSuggestions: Array<{
    type: "template" | "approach" | "timing" | "content";
    title: string;
    description: string;
    confidence: number;
    action: string;
    mlScore?: number;
    conversionProb?: number;
    escalate?: boolean;
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

// API Helper
const api = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Merge Field Menu Component
const MergeFieldMenu: React.FC<{
  onInsert: (field: string) => void;
  trigger: React.ReactNode;
  lead?: Lead | null;
  fields?: Array<{ key: string; label: string; description?: string }>;
}> = ({ onInsert, trigger, lead, fields }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const getMergeFieldValue = (field: string): string => {
    if (!lead) return field;
    
    switch (field) {
      case '{firstName}':
        return lead.name.split(' ')[0] || lead.name;
      case '{courseInterest}':
        return lead.courseInterest || 'your course of interest';
      case '{campusPreference}':
        return lead.campusPreference || 'your preferred campus';
      case '{leadScore}':
        return lead.leadScore.toString();
      case '{advisorName}':
        return 'Your Adviser';
      case '{instituteName}':
        return 'Bridge Institute';
      default:
        return field;
    }
  };

  const mergeFields = fields && fields.length > 0 ? fields : [
    { key: '{firstName}', label: 'First Name', description: 'Lead\'s first name' },
    { key: '{courseInterest}', label: 'Course Interest', description: 'Course of interest' },
    { key: '{campusPreference}', label: 'Campus Preference', description: 'Preferred campus' },
    { key: '{leadScore}', label: 'Lead Score', description: 'Lead score' },
    { key: '{advisorName}', label: 'Adviser Name', description: 'Your name' },
    { key: '{instituteName}', label: 'Institute Name', description: 'Institute name' },
  ];

  return (
    <div className="relative">
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-foreground mb-2">Insert Merge Field</div>
            <div className="space-y-1">
              {mergeFields.map((field) => {
                const actualValue = getMergeFieldValue(field.key);
                return (
                  <button
                    key={field.key}
                    onClick={() => {
                      onInsert(field.key);
                      setIsOpen(false);
                    }}
                    className="w-full text-left p-2 hover:bg-muted rounded text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-accent">{field.key}</div>
                      <div className="text-xs text-muted-foreground bg-muted px-1 rounded">
                        {actualValue}
                      </div>
                    </div>
                    <div className="text-muted-foreground">{field.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EmailComposer: React.FC<EmailComposerProps> = ({
  isOpen,
  onClose,
  lead,
  forceFullscreen = false,
  onSendEmail
}) => {
  const { push: toast } = useToast();
  
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
  const [aiResponse, setAiResponse] = useState("");
  
  // New states
  const [isSending, setIsSending] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showMergeMenu, setShowMergeMenu] = useState(false);
  const [previewOn, setPreviewOn] = useState(false);
  const [mode, setMode] = useState<DisplayMode>("floating");
  const effectiveMode = forceFullscreen ? "fullscreen" : mode;
  
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [availableFields, setAvailableFields] = useState<Array<{ key: string; label: string; description?: string }>>([]);

  // Drag and resize state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  // DEBUG: Better initial positioning with proper viewport detection
  const getViewportDimensions = () => {
    // Use multiple methods to get accurate viewport dimensions
    const width = Math.max(
      window.innerWidth || 0,
      document.documentElement.clientWidth || 0,
      document.body.clientWidth || 0
    );
    const height = Math.max(
      window.innerHeight || 0,
      document.documentElement.clientHeight || 0,
      document.body.clientHeight || 0
    );
    return { width, height };
  };
  
  const viewport = getViewportDimensions();
  // DEBUG: Center the modal on screen instead of off-screen positioning
  const initialX = Math.max(20, Math.min(viewport.width - 820, (viewport.width - 800) / 2));
  const initialY = Math.max(20, Math.min(viewport.height - 420, (viewport.height - 400) / 2));
  const initialWidth = Math.min(800, viewport.width - 40);
  const initialHeight = Math.max(400, Math.min(600, Math.round(viewport.height * 0.7)));
  
  
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Recalculate positioning on window resize
  useEffect(() => {
    const handleResize = () => {
      const newViewport = getViewportDimensions();
      const newX = Math.max(20, Math.min(newViewport.width - 820, newViewport.width - 900));
      const newY = Math.max(20, Math.min(position.y, newViewport.height - 200));
      const newWidth = Math.min(800, newViewport.width - 40);
      const newHeight = Math.max(400, Math.min(600, Math.round(newViewport.height * 0.7)));
      
      setPosition(prev => ({
        x: Math.min(prev.x, newX),
        y: Math.min(prev.y, newY)
      }));
      setSize(prev => ({
        width: Math.min(prev.width, newWidth),
        height: Math.min(prev.height, newHeight)
      }));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Live refs for 60fps drag/resize without re-renders
  const positionRef = useRef(position);
  const sizeLiveRef = useRef(size);
  const rafIdRef = useRef<number | null>(null);
  const dragLatestRef = useRef<{ x: number; y: number } | null>(null);
  const resizeLatestRef = useRef<{ width: number; height: number } | null>(null);

  // Ask Ivy State
  const [askIvyQuery, setAskIvyQuery] = useState<string>("");
  const [askIvyResponse, setAskIvyResponse] = useState<string>("");
  const [isGeneratingAskIvy, setIsGeneratingAskIvy] = useState(false);

  // Email History State
  const [emailHistory, setEmailHistory] = useState<{
    email_history: Array<{
      id: number;
      subject: string;
      sent_at: string;
      sent_by: string;
      intent: string;
      status: string;
      created_at: string;
    }>;
    activities: Array<{
      id: number;
      activity_type: string;
      activity_title: string;
      activity_description?: string;
      created_at: string;
      metadata?: any;
    }>;
    total_emails: number;
    total_activities: number;
  } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load email history for the lead
  const loadEmailHistory = useCallback(async (lead: Lead) => {
    if (!lead?.uid) return;
    
    setIsLoadingHistory(true);
    try {
      const history = await aiLeadsApi.getEmailHistory(lead.uid, 5);
      setEmailHistory(history);
    } catch (error) {
      console.error('Failed to load email history:', error);
      setEmailHistory(null);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // AI-Powered Email Suggestions - Using existing ML models and triage data
  const generateEmailSuggestions = useCallback(async (lead: Lead) => {
    try {
      // Get AI triage insights for this specific lead
      const triageResponse = await aiLeadsApi.triageLeads([lead.uid], {});
      
      if (triageResponse.items && triageResponse.items.length > 0) {
        const leadInsights = triageResponse.items[0];
        
        if (leadInsights) {
          // Generate email-focused strategy suggestions
          const conversionChance = Math.round((leadInsights.ml_probability || 0) * 100);
          const isHighConversion = conversionChance >= 70;
          
          const suggestions = [
            {
              type: "template" as const,
              title: "Email Approach",
              description: isHighConversion 
                ? `Send a personalised welcome email for ${lead.courseInterest || 'their chosen course'} with next steps`
                : `Send a nurturing email to build engagement with ${lead.courseInterest || 'their course interest'}`,
              confidence: Math.round((leadInsights.ml_confidence || 0.8) * 100),
              action: isHighConversion 
                ? "Include application timeline, course benefits, and clear call-to-action"
                : "Focus on value, course information, and gentle progression",
              mlScore: leadInsights.score,
              conversionProb: leadInsights.ml_probability,
              escalate: false
            },
            {
              type: "content" as const,
              title: "Follow-up Actions",
              description: isHighConversion 
                ? "Schedule follow-up call or meeting within 2-3 days"
                : "Plan gentle follow-up sequence over next week",
              confidence: Math.round((leadInsights.ml_calibrated || 0.6) * 100),
              action: isHighConversion 
                ? "Propose specific meeting times and preparation materials"
                : "Offer additional resources and gradual engagement",
              mlScore: leadInsights.score,
              conversionProb: leadInsights.ml_probability,
              escalate: false
            }
          ];

          setEmailComposerData(prev => ({
            ...prev,
            aiSuggestions: suggestions
          }));
        }
      } else {
        // Fallback to basic suggestions if AI triage fails
        const conversionChance = (lead.aiInsights?.conversionProbability || 0) / 100;
        const isHighConversion = conversionChance >= 0.7;
        
        const suggestions = [
          {
            type: "template" as const,
            title: "Email Approach",
            description: isHighConversion 
              ? `Send a personalised welcome email for ${lead.courseInterest || 'their chosen course'} with next steps`
              : `Send a nurturing email to build engagement with ${lead.courseInterest || 'their course interest'}`,
            confidence: 75,
            action: isHighConversion 
              ? "Include application timeline, course benefits, and clear call-to-action"
              : "Focus on value, course information, and gentle progression",
            mlScore: lead.leadScore || 0,
            conversionProb: conversionChance,
            escalate: false
          },
          {
            type: "content" as const,
            title: "Follow-up Actions",
            description: isHighConversion 
              ? "Schedule follow-up call or meeting within 2-3 days"
              : "Plan gentle follow-up sequence over next week",
            confidence: 65,
            action: isHighConversion 
              ? "Propose specific meeting times and preparation materials"
              : "Offer additional resources and gradual engagement",
            mlScore: lead.leadScore || 0,
            conversionProb: conversionChance,
            escalate: false
          }
        ];

        setEmailComposerData(prev => ({
          ...prev,
          aiSuggestions: suggestions
        }));
      }
    } catch (error) {
      console.error('Failed to generate AI email suggestions:', error);
      // Fallback to basic suggestions
      const conversionChance = (lead.aiInsights?.conversionProbability || 0) / 100;
      const suggestions = [
        {
          type: "template" as const,
          title: "Email Approach",
          description: `Send a personalised email for ${lead.courseInterest || 'their chosen course'} programme`,
          confidence: 60,
          action: "Include course benefits, application guidance, and next steps",
          mlScore: lead.leadScore || 0,
          conversionProb: conversionChance,
          escalate: false
        }
      ];

      setEmailComposerData(prev => ({
        ...prev,
        aiSuggestions: suggestions
      }));
    }
  }, []);

  // Ask Ivy - Natural Language Query
  const askIvy = useCallback(async (query: string, lead: Lead) => {
    setIsGeneratingAskIvy(true);
    try {
      // Create RAG context similar to CallConsole
      const ragContext: RagContext = {
        lead: {
          id: lead.id,
          uid: lead.uid,
          name: lead.name,
            email: lead.email,
            phone: lead.phone,
          courseInterest: lead.courseInterest,
          statusType: lead.statusType,
          nextAction: lead.nextAction,
          followUpDate: lead.lastContact,
          aiInsights: {
            conversionProbability: lead.aiInsights.conversionProbability,
            callStrategy: 'email_outreach',
            recommendedAction: lead.aiInsights.recommendedAction
          }
        },
        transcriptWindow: [], // No transcript for email context
        consentGranted: true
      };

      // Determine if this is a content generation request or informational query
      const isContentRequest = query.toLowerCase().includes('write') || 
                               query.toLowerCase().includes('email') || 
                               query.toLowerCase().includes('compose') ||
                               query.toLowerCase().includes('draft') ||
                               query.toLowerCase().includes('create') ||
                               query.toLowerCase().includes('make this') ||
                               query.toLowerCase().includes('improve') ||
                               query.toLowerCase().includes('add');

      let emailQuery;
      if (isContentRequest) {
        // For content generation requests, ask for structured email content
        emailQuery = `${query}\n\nPlease write me a professional email based on this information. Focus on:\n- Their course interest and goals\n- Clear next steps for their application\n- Personalised content that moves them forward in the application process\n- Professional but warm tone\n- Specific call-to-action\n\nIMPORTANT: Respond with JSON only in this exact format:\n\n{"subject": "Email subject line", "body": "Dear [Name],\\n\\nEmail body content\\n\\nSincerely,\\n[Your Name]"}\n\nDo not include any call coaching, MEDDIC frameworks, or other sales methodology content. Only provide the email in JSON format.`;
      } else {
        // For informational queries, provide context and ask for general advice
        emailQuery = `${query}\n\nPlease provide helpful information and advice about this lead and their application journey. Focus on:\n- Their course interest and goals\n- Recommended approach for email communication\n- Key points to address\n- Next steps for their application\n\nProvide a clear, actionable response that will help with email composition.`;
      }

      // Use the same RAG query as CallConsole with timeout
      console.log("Ask Ivy: Making RAG query with context:", ragContext);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const ragResponse: RagResponse = await ragApi.queryRag(emailQuery, ragContext, {
          signal: controller.signal,
          stream: false // Disable streaming for email composer
        });
        clearTimeout(timeoutId);
        console.log("Ask Ivy: Received RAG response:", ragResponse);

        // Parse response from RAG
        const fullResponse = ragResponse.answer || "No response generated.";
        
        // Try to parse as JSON for content generation requests
        if (isContentRequest) {
          try {
            // Try to parse as JSON first
            const emailData = JSON.parse(fullResponse);
            if (emailData.subject && emailData.body) {
              setAskIvyResponse(`Subject: ${emailData.subject}\n\n${emailData.body}`);
            } else {
              throw new Error("Invalid JSON structure");
            }
          } catch (jsonError) {
            // Fallback: try to extract JSON from the response
            const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const emailData = JSON.parse(jsonMatch[0]);
                if (emailData.subject && emailData.body) {
                  setAskIvyResponse(`Subject: ${emailData.subject}\n\n${emailData.body}`);
                } else {
                  throw new Error("Invalid JSON structure");
                }
              } catch (fallbackError) {
                // Last resort: show full response
                setAskIvyResponse(fullResponse);
              }
            } else {
              // No JSON found, show full response
              setAskIvyResponse(fullResponse);
            }
          }
        } else {
          // For informational queries, show the response as-is
          setAskIvyResponse(fullResponse);
      }
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      console.error("Failed to query Ask Ivy:", error);
      setAskIvyResponse("Unable to generate response at this time.");
    } finally {
      setIsGeneratingAskIvy(false);
    }
  }, []);

  // Copy Ask Ivy response to email fields
  const copyAskIvyToEmail = (response: string) => {
    console.log('copyAskIvyToEmail called with:', response);
    
    // Try to extract subject and body if it's structured
    const subjectMatch = response.match(/Subject:\s*(.+)/);
    const bodyMatch = response.match(/Subject:.*?\n\n(.*)/s);
    
    if (subjectMatch && bodyMatch) {
      // It's structured content, extract subject and body
      console.log('Extracting structured content - Subject:', subjectMatch[1], 'Body:', bodyMatch[1]);
      setEmailComposerData(prev => ({
        ...prev,
        subject: subjectMatch[1]?.trim() || '',
        body: bodyMatch[1]?.trim() || ''
      }));
    } else {
      // It's informational content, add to body as notes
      const currentBody = emailComposerData.body;
      const newBody = currentBody ? `${currentBody}\n\n--- Ivy's Advice ---\n${response}` : response;
      console.log('Adding to body - Current:', currentBody, 'New:', newBody);
      setEmailComposerData(prev => ({
        ...prev,
        body: newBody
      }));
    }
    
    // Also update the rich text editor if we're in edit mode
    if (viewMode === "edit" && richTextRef.current) {
      const htmlContent = markdownToRichHtml(response);
      richTextRef.current.innerHTML = htmlContent;
      console.log('Updated rich text editor with:', htmlContent);
    }
  };

  // AI Draft Generation
  const generateAIDraft = async (intent: string) => {
    if (!lead) return;
    
    setIsGenerating(true);
    try {
      const res = await api("/ai/leads/compose/outreach", {
        method: "POST",
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


  // Grammar and Spelling Check
  const checkGrammarSpelling = async () => {
    if (!emailComposerData.body.trim()) return;
    
    setIsGenerating(true);
    try {
      // This would integrate with a grammar checking service
      // For now, we'll simulate it with the AI endpoint
      const checkResponse = await api("/ai/leads/compose/outreach", {
        method: "POST",
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


  // Send Email
  const handleSendEmail = async () => {
    if (!emailComposerData.lead || isSending) return;
    
    setIsSending(true);
    try {
      const htmlBody = markdownToHtml(renderPreview(emailComposerData.body));
      if (onSendEmail) {
        await onSendEmail({
          ...emailComposerData,
          htmlBody
        });
      } else {
        console.log("Sending email:", {
          to: emailComposerData.lead.email,
          subject: emailComposerData.subject,
          body: emailComposerData.body,
          htmlBody,
          lead: emailComposerData.lead.name
        });
      }
      
      toast({
        title: "Email sent successfully!",
        description: `Email sent to ${emailComposerData.lead.name}`,
        variant: "success"
      });
      
      // Clear draft from localStorage
      if (lead) {
        localStorage.removeItem(`email-draft:${lead.uid}`);
      }
      
      onClose();
      
    } catch (error) {
      console.error("Failed to send email:", error);
      toast({
        title: "Failed to send email",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = /(Mac|iPhone|iPad)/i.test(navigator.userAgent);
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Prevent default for our shortcuts
      if (ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleSendEmail();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.altKey && e.key === 's') {
        e.preventDefault();
        subjectRef.current?.focus();
      } else if (e.altKey && e.key === 'm') {
        e.preventDefault();
        richTextRef.current?.focus();
      } else if (ctrlKey && e.key === 'g') {
        e.preventDefault();
        checkGrammarSpelling();
      } else if (ctrlKey && e.key === 't') {
        e.preventDefault();
        setAskIvyQuery("Write a professional email for this applicant");
        askIvy("Write a professional email for this applicant", lead!);
      } else if (ctrlKey && e.key === 'm') {
        e.preventDefault();
        setShowMergeMenu(!showMergeMenu);
      } else if (ctrlKey && e.key === 'b') {
        e.preventDefault();
        applyFormatting('bold', richTextRef);
      } else if (ctrlKey && e.key === 'i') {
        e.preventDefault();
        applyFormatting('italic', richTextRef);
      } else if (ctrlKey && e.key === 'u') {
        e.preventDefault();
        applyFormatting('underline', richTextRef);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showMergeMenu]);


  // Draft autosave
  useEffect(() => {
    if (!lead || !isOpen) return;

    const saveDraft = () => {
      const draft = {
        subject: emailComposerData.subject,
        body: emailComposerData.body,
        intent: emailComposerData.intent,
        timestamp: Date.now()
      };
      localStorage.setItem(`email-draft:${lead.uid}`, JSON.stringify(draft));
    };

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Set new timeout
    autosaveTimeoutRef.current = setTimeout(saveDraft, 2000);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [emailComposerData.subject, emailComposerData.body, emailComposerData.intent, lead, isOpen]);

  // Restore draft on open
  useEffect(() => {
    if (isOpen && lead) {
      const savedDraft = localStorage.getItem(`email-draft:${lead.uid}`);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setEmailComposerData(prev => ({
            ...prev,
            subject: draft.subject || "",
            body: draft.body || "",
            intent: draft.intent || "nurture"
          }));
        } catch (error) {
          console.error("Failed to restore draft:", error);
        }
      }
    }
  }, [isOpen, lead]);

  // Merge field replacement helper
  const getMergeFieldValue = (field: string): string => {
    if (!lead) return field;
    
    switch (field) {
      case '{firstName}':
        return lead.name.split(' ')[0] || lead.name;
      case '{courseInterest}':
        return lead.courseInterest || 'your course of interest';
      case '{campusPreference}':
        return lead.campusPreference || 'your preferred campus';
      case '{leadScore}':
        return lead.leadScore.toString();
      case '{advisorName}':
        return 'Your Adviser'; // This could be dynamic based on logged-in user
      case '{instituteName}':
        return 'Bridge Institute'; // This could be dynamic based on organisation
      default:
        return field;
    }
  };

  // Resolve any token like {token} using lead object by mapping
  const resolveToken = (token: string): string => {
    const map: Record<string, string> = {
      firstName: lead?.name?.split(' ')[0] || '',
      courseInterest: lead?.courseInterest || '',
      campusPreference: lead?.campusPreference || '',
      leadScore: String(lead?.leadScore ?? ''),
      advisorName: 'Your Adviser',
      instituteName: 'Bridge Institute',
      email: lead?.email || '',
      phone: lead?.phone || '',
      academicYear: lead?.academicYear || ''
    };
    return map[token] ?? '';
  };

  // Insert merge field helper - update React state (avoids token loss)
  const insertMergeField = (field: string, targetRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>) => {
    const element = targetRef.current;
    if (!element) return;

    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const isSubject = element === subjectRef.current;
    const current = isSubject ? emailComposerData.subject : emailComposerData.body;
    const newValue = current.substring(0, start) + field + current.substring(end);

    if (isSubject) {
      setEmailComposerData(prev => ({ ...prev, subject: newValue }));
    } else {
      setEmailComposerData(prev => ({ ...prev, body: newValue }));
    }

    // Restore cursor position after state update on next tick
    requestAnimationFrame(() => {
      const el = targetRef.current;
      if (el) {
        const newCursorPos = start + field.length;
        el.setSelectionRange(newCursorPos, newCursorPos);
        el.focus();
      }
    });
  };

  // Toggle formatting helpers
  const toggleWrap = (text: string, start: number, end: number, before: string, after = before) => {
    const sel = text.slice(start, end);
    const has = sel.startsWith(before) && sel.endsWith(after);
    const inner = has ? sel.slice(before.length, sel.length - after.length) : sel;
    const replaced = text.slice(0, start) + (has ? inner : before + sel + after) + text.slice(end);
    const delta = has ? -(before.length + after.length) : (before.length + after.length);
    return { replaced, range: [start + (has ? 0 : before.length), end + (has ? 0 : before.length)] as const, delta };
  };

  const toggleInline = (format: "bold" | "italic" | "underline", body: string, s: number, e: number) => {
    if (format === "bold") return toggleWrap(body, s, e, "**");
    if (format === "italic") return toggleWrap(body, s, e, "*");
    // underline uses HTML tag to survive email HTML rendering
    if (format === "underline") return toggleWrap(body, s, e, "<u>", "</u>");
    return { replaced: body, range: [s, e] as const, delta: 0 };
  };

  const applyList = (kind: "bullet" | "number", body: string, s: number, e: number) => {
    const lines = body.slice(s, e).split("\n");
    const isAllListed = lines.every(l => kind === "bullet" ? l.trim().startsWith("• ") : /^\s*\d+\.\s/.test(l));
    const newLines = lines.map((l, idx) => {
      if (kind === "bullet") return isAllListed ? l.replace(/^(\s*)•\s?/, "$1") : (l.trim() ? `• ${l}` : l);
      // numbered
      if (isAllListed) return l.replace(/^\s*\d+\.\s?/, "");
      const n = idx + 1;
      return l.trim() ? `${n}. ${l}` : l;
    });
    const replacedBlock = newLines.join("\n");
    const replaced = body.slice(0, s) + replacedBlock + body.slice(e);
    const delta = replacedBlock.length - (e - s);
    return { replaced, range: [s, e + delta] as const, delta };
  };

  // Rich text editor ref
  const richTextRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Convert markdown to HTML for rich text display
  const markdownToRichHtml = (md: string) => {
    return md
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
      .replace(/^• (.*$)/gm, '<div>• $1</div>')
      .replace(/^\d+\. (.*$)/gm, '<div>$&</div>')
      .replace(/^> (.*$)/gm, '<div style="border-left: 3px solid #ccc; padding-left: 10px; margin: 5px 0;">$1</div>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #0066cc; text-decoration: underline;">$1</a>')
      .replace(/\n/g, '<br>');
  };

  // Convert HTML back to markdown
  const htmlToMarkdown = (html: string) => {
    return html
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>')
      .replace(/<div>• (.*?)<\/div>/g, '• $1')
      .replace(/<div>(\d+\. .*?)<\/div>/g, '$1')
      .replace(/<div style="[^"]*">(.*?)<\/div>/g, '> $1')
      .replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<br>/g, '\n')
      .replace(/<div>/g, '\n')
      .replace(/<\/div>/g, '');
  };

  // Rich text formatting functions
  const applyFormatting = (format: string, ref: React.RefObject<HTMLDivElement | null>) => {
    const el = ref.current; if (!el) return;
    
    // Get selection
    const selection = window.getSelection();
    if (!selection) return;
    
    if (selection.rangeCount === 0) {
      // If no selection, create a text node at cursor position
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    // Check if we're already inside a formatting element and toggle
    let parentElement: Node | null = range.commonAncestorContainer;
    if (parentElement.nodeType === Node.TEXT_NODE) {
      parentElement = parentElement.parentElement;
    }
    
    if (format === "bold") {
      if (parentElement && parentElement instanceof HTMLElement && parentElement.tagName === 'STRONG') {
        // Unwrap bold
        const textNode = document.createTextNode(parentElement.textContent || '');
        parentElement.parentNode?.replaceChild(textNode, parentElement);
        range.selectNode(textNode);
      } else {
        // Apply bold
        const strong = document.createElement('strong');
        strong.textContent = selectedText || 'bold text';
        range.deleteContents();
        range.insertNode(strong);
        range.selectNodeContents(strong);
      }
    } else if (format === "italic") {
      if (parentElement && parentElement instanceof HTMLElement && parentElement.tagName === 'EM') {
        // Unwrap italic
        const textNode = document.createTextNode(parentElement.textContent || '');
        parentElement.parentNode?.replaceChild(textNode, parentElement);
        range.selectNode(textNode);
      } else {
        // Apply italic
        const em = document.createElement('em');
        em.textContent = selectedText || 'italic text';
        range.deleteContents();
        range.insertNode(em);
        range.selectNodeContents(em);
      }
    } else if (format === "underline") {
      if (parentElement && parentElement instanceof HTMLElement && parentElement.tagName === 'U') {
        // Unwrap underline
        const textNode = document.createTextNode(parentElement.textContent || '');
        parentElement.parentNode?.replaceChild(textNode, parentElement);
        range.selectNode(textNode);
      } else {
        // Apply underline
        const u = document.createElement('u');
        u.textContent = selectedText || 'underlined text';
        range.deleteContents();
        range.insertNode(u);
        range.selectNodeContents(u);
      }
    } else if (format === "bullet") {
      const div = document.createElement('div');
      div.textContent = selectedText ? `• ${selectedText}` : '• ';
      range.deleteContents();
      range.insertNode(div);
      range.setStartAfter(div);
    } else if (format === "number") {
      const div = document.createElement('div');
      div.textContent = selectedText ? `1. ${selectedText}` : '1. ';
      range.deleteContents();
      range.insertNode(div);
      range.setStartAfter(div);
    } else if (format === "quote") {
      const div = document.createElement('div');
      div.style.borderLeft = '3px solid #ccc';
      div.style.paddingLeft = '10px';
      div.style.margin = '5px 0';
      div.textContent = selectedText ? `> ${selectedText}` : '> ';
      range.deleteContents();
      range.insertNode(div);
      range.setStartAfter(div);
    } else if (format === "link") {
      const link = document.createElement('a');
      link.href = 'https://';
      link.textContent = selectedText || 'link text';
      link.style.color = '#0066cc';
      link.style.textDecoration = 'underline';
      range.deleteContents();
      range.insertNode(link);
      range.selectNodeContents(link);
    }
    
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Update the markdown source
    updateMarkdownFromHtml();
  };

  // Update markdown source from rich text HTML
  const updateMarkdownFromHtml = () => {
    if (!richTextRef.current) return;
    const html = richTextRef.current.innerHTML;
    const markdown = htmlToMarkdown(html);
    setEmailComposerData(prev => ({ ...prev, body: markdown }));
  };

  // Handle input changes in rich text editor
  const handleRichTextInput = () => {
    updateMarkdownFromHtml();
  };

  // Initialize rich text editor content only once
  useEffect(() => {
    if (richTextRef.current && viewMode === "edit" && !isInitialized) {
      richTextRef.current.innerHTML = markdownToRichHtml(emailComposerData.body);
      setIsInitialized(true);
    }
  }, [viewMode, emailComposerData.body, isInitialized]);

  // Reset initialization flag when switching modes
  useEffect(() => {
    if (viewMode !== "edit") {
      setIsInitialized(false);
    }
  }, [viewMode]);

  // Clear transform when mode changes away from floating
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (effectiveMode !== "floating") {
      setIsDragging(false);
      el.style.transition = "";
      el.style.transform = ""; // let CSS positions take over
      document.body.style.userSelect = "";
    } else {
        // Apply transform for floating mode
        if (effectiveMode === "floating") {
          el.style.transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`;
        }
    }
  }, [mode]);

  // Initialize positioning for floating mode
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    if (effectiveMode === "floating") {
      // Calculate center position
      const viewport = getViewportDimensions();
      const centerX = (viewport.width - sizeLiveRef.current.width) / 2;
      const centerY = (viewport.height - sizeLiveRef.current.height) / 2;
      
      // Set position immediately
      positionRef.current = { x: centerX, y: centerY };
      setPosition(positionRef.current);
      
      // Apply positioning directly with transform-based approach
      el.style.position = 'fixed';
      el.style.top = '0';
      el.style.left = '0';
      el.style.transform = `translate3d(${centerX}px, ${centerY}px, 0)`;
      el.style.zIndex = '10000';
    }
  }, [isOpen, effectiveMode]);

  const insertLineBreak = () => {
    const element = messageRef.current;
    if (!element) return;

    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const value = emailComposerData.body;
    const newValue = value.slice(0, start) + '\n' + value.slice(end);
    
    setEmailComposerData(prev => ({ ...prev, body: newValue }));
    
    setTimeout(() => {
      element.focus();
      element.setSelectionRange(start + 1, start + 1);
    }, 0);
  };

  // Preview helper - renders tokens as values
  const renderPreview = (text: string) => {
    if (!lead) return text;
    
    return text.replace(/\{(\w+)\}/g, (_m, token) => {
      const value = resolveToken(token);
      return value || `{${token}}`;
    });
  };

  // Markdown to HTML conversion
  const markdownToHtml = (md: string) => {
    return marked.parse(md) as string;
  };

  // Fetch available CRM fields to drive merge menu (DB-backed)
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await api('/crm/leads/field-options');
        if (!res.ok) return;
        const data = await res.json();
        // Expecting array of { key, label }. Map to tokens {key}
        const fields: Array<{ key: string; label: string; description?: string }> = (data?.fields || data || [])
          .filter((f: any) => typeof f?.key === 'string')
          .map((f: any) => ({ key: `{${f.key}}`, label: f.label || f.key }));
        // Ensure our common tokens are present
        const defaults = [
          { key: '{firstName}', label: 'First Name' },
          { key: '{courseInterest}', label: 'Course Interest' },
          { key: '{campusPreference}', label: 'Campus Preference' },
          { key: '{leadScore}', label: 'Lead Score' },
          { key: '{advisorName}', label: 'Adviser Name' },
          { key: '{instituteName}', label: 'Institute Name' },
        ];
        const byKey = new Set(fields.map(f => f.key));
        defaults.forEach(d => { if (!byKey.has(d.key)) fields.push(d); });
        setAvailableFields(fields);
      } catch (e) {
        // Silently ignore; fall back to defaults
      }
    };
    if (isOpen) fetchFields();
  }, [isOpen]);

  // Generate suggestions when component opens
  React.useEffect(() => {
    if (isOpen && lead) {
      setEmailComposerData(prev => ({ ...prev, lead }));
      generateEmailSuggestions(lead);
      loadEmailHistory(lead);
    }
  }, [isOpen, lead, generateEmailSuggestions, loadEmailHistory]);

  // Drag and resize handlers
  const SAFE_MARGIN = 8;
  const MIN_VISIBLE = 120;
  const draggingEnabled = effectiveMode === "floating";
  
  // Compute bounds so at least MIN_VISIBLE px stay visible on each edge
  const getClampBounds = useCallback((width: number, height: number) => {
    const minX = -width + MIN_VISIBLE;                // allow left overflow
    const maxX = window.innerWidth - MIN_VISIBLE;     // right edge min visibility
    const minY = -Math.max(0, 64);                    // allow slight top overflow (~64px)
    const maxY = window.innerHeight - MIN_VISIBLE;    // bottom edge min visibility
    return { minX, maxX, minY, maxY };
  }, []);

  const getSafeTop = useCallback(() => {
    let headerHeight = 56;
    const banner = document.querySelector('[role="banner"]') as HTMLElement | null;
    if (banner && banner.offsetHeight) headerHeight = banner.offsetHeight;
    return Math.max(0, headerHeight - 8);
  }, []);

  // Ensure initial position/size are in bounds
  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = containerRef.current;
    const safeTop = getSafeTop();
    const maxWidth = Math.max(400, window.innerWidth - SAFE_MARGIN * 2);
    const maxHeight = Math.max(300, window.innerHeight - SAFE_MARGIN * 2);

    let width = Math.min(sizeLiveRef.current.width, maxWidth);
    let height = Math.min(sizeLiveRef.current.height, maxHeight);
    sizeLiveRef.current = { width, height };
    setSize(sizeLiveRef.current);

    // Center by default with new bounds
    const { minX, maxX, minY, maxY } = getClampBounds(width, height);
    let x = Math.round((window.innerWidth - width) / 2);
    let y = Math.round(Math.max(safeTop + 24, (window.innerHeight - height) / 3));
    x = Math.min(Math.max(x, minX), maxX);
    y = Math.min(Math.max(y, minY), maxY);
    positionRef.current = { x, y };
    setPosition(positionRef.current);

    if (el) {
      el.style.transition = 'none';
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      requestAnimationFrame(() => {
        if (el) el.style.transition = '';
      });
    }
  }, [isOpen, getSafeTop]);

  // Keep in bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      const safeTop = getSafeTop();
      const maxWidth = Math.max(400, window.innerWidth - SAFE_MARGIN * 2);
      const maxHeight = Math.max(300, window.innerHeight - safeTop - SAFE_MARGIN);
      let width = Math.min(sizeLiveRef.current.width, maxWidth);
      let height = Math.min(sizeLiveRef.current.height, maxHeight);
      sizeLiveRef.current = { width, height };
      setSize(sizeLiveRef.current);
      const { minX, maxX, minY, maxY } = getClampBounds(width, height);
      let x = Math.min(Math.max(positionRef.current.x, minX), maxX);
      let y = Math.min(Math.max(positionRef.current.y, minY), maxY);
      positionRef.current = { x, y };
      setPosition(positionRef.current);
      if (containerRef.current) {
        // Apply resize for floating mode
        if (effectiveMode === "floating") {
          containerRef.current.style.width = `${width}px`;
          containerRef.current.style.height = `${height}px`;
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getSafeTop]);

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'drag' | 'resize') => {
    if (!containerRef.current) return;
    if (type === 'drag' && !draggingEnabled) return;
    containerRef.current.style.transition = 'none';
    document.body.style.userSelect = 'none';
    if (type === 'drag') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y });
    } else {
      setIsResizing(true);
      setResizeStart({ 
        x: e.clientX, 
        y: e.clientY, 
        width: sizeLiveRef.current.width, 
        height: sizeLiveRef.current.height 
      });
    }
  }, [draggingEnabled]);

  const safeDragMouseDown = useCallback((e: React.MouseEvent) => {
    if (!draggingEnabled) return;
    const t = e.target as HTMLElement;
    if (t.closest('button,[role="button"],input,textarea,select,[contenteditable],a,.no-drag')) return;
    handleMouseDown(e, 'drag');
  }, [draggingEnabled, handleMouseDown]);

  const handleTouchStart = useCallback((e: React.TouchEvent, type: 'drag' | 'resize') => {
    if (!containerRef.current) return;
    if (type === 'drag' && !draggingEnabled) return;
    const t = e.target as HTMLElement;
    if (type === 'drag' && t.closest('button,[role="button"],input,textarea,select,[contenteditable],a,.no-drag')) return;
    const p = e.touches && e.touches.length > 0 ? e.touches[0] : undefined;
    if (!p) return;
    containerRef.current.style.transition = 'none';
    document.body.style.userSelect = 'none';
    if (type === 'drag') {
      setIsDragging(true);
      setDragStart({ x: p.clientX - positionRef.current.x, y: p.clientY - positionRef.current.y });
    } else {
      setIsResizing(true);
      setResizeStart({ x: p.clientX, y: p.clientY, width: sizeLiveRef.current.width, height: sizeLiveRef.current.height });
    }
  }, [draggingEnabled]);

  useEffect(() => {
    const applyFrame = () => {
      if (!containerRef.current) return;
      const el = containerRef.current;

      if (dragLatestRef.current) {
        const { minX, maxX, minY, maxY } = getClampBounds(sizeLiveRef.current.width, sizeLiveRef.current.height);
        const x = Math.min(Math.max(dragLatestRef.current.x, minX), maxX);
        const y = Math.min(Math.max(dragLatestRef.current.y, minY), maxY);
        // Apply transform for floating mode
        if (effectiveMode === "floating") {
          el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        }
        positionRef.current = { x, y };
      }
      if (resizeLatestRef.current) {
        const safeTop = getSafeTop();
        const maxWidth = Math.max(400, window.innerWidth - SAFE_MARGIN * 2);
        const maxHeight = Math.max(300, window.innerHeight - safeTop - SAFE_MARGIN);
        const width = Math.min(Math.max(resizeLatestRef.current.width, 400), maxWidth);
        const height = Math.min(Math.max(resizeLatestRef.current.height, 300), maxHeight);
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;
        sizeLiveRef.current = { width, height };
      }
      rafIdRef.current = null;
    };

    const onPointerMove = (e: PointerEvent) => {
      // prevent scrolling / selection while dragging
      if (isDragging) e.preventDefault();

      if (!containerRef.current) return;
      if (isDragging) {
        const newXRaw = e.clientX - dragStart.x;
        const newYRaw = e.clientY - dragStart.y;
        const { minX, maxX, minY, maxY } = getClampBounds(sizeLiveRef.current.width, sizeLiveRef.current.height);
        const newX = Math.min(Math.max(newXRaw, minX), maxX);
        const newY = Math.min(Math.max(newYRaw, minY), maxY);
        dragLatestRef.current = { x: newX, y: newY };

        // keep clearing as the pointer moves so the page never highlights
        window.getSelection()?.removeAllRanges();
      }
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = Math.max(400, resizeStart.width + deltaX);
        const newHeight = Math.max(300, resizeStart.height + deltaY);
        resizeLatestRef.current = { width: newWidth, height: newHeight };
      }
      if (!rafIdRef.current && (isDragging || isResizing)) {
        rafIdRef.current = requestAnimationFrame(applyFrame);
      }
    };

    const onPointerUp = () => {
      if (!isDragging && !isResizing) return;
      setIsDragging(false);
      setIsResizing(false);

      document.body.style.userSelect = "";
      (document.body.style as any).webkitUserSelect = "";

      dragLatestRef.current = null;
      resizeLatestRef.current = null;
      if (containerRef.current) containerRef.current.style.transition = "";
    };

    if (isDragging || isResizing) {
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", onPointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", onPointerMove as any);
      window.removeEventListener("pointerup", onPointerUp as any);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, getClampBounds, getSafeTop]);

  // Listen for prefill events from AI router
  useEffect(() => {
    const onPrefill = (e: Event) => {
      const detail = (e as CustomEvent).detail as { subject?: string; body?: string };
      if (detail) {
        setEmailComposerData(prev => ({
          ...prev,
          subject: detail.subject ?? prev.subject,
          body: detail.body ?? prev.body,
        }));
        if (richTextRef.current && (detail.body ?? '').length > 0 && viewMode === 'edit') {
          richTextRef.current.innerHTML = markdownToRichHtml(detail.body!);
        }
      }
    };
    window.addEventListener('email.prefill', onPrefill as EventListener);
    return () => window.removeEventListener('email.prefill', onPrefill as EventListener);
  }, [viewMode]);

  if (!isOpen || !lead) return null;
  
  

  // Minimized view
  if (isMinimized) {
  return (
      <div 
        className="fixed z-[10000] bg-card border border-border rounded-lg shadow-lg cursor-pointer transition-all duration-300"
        style={{ 
        transform: `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`,
          width: '300px',
          height: '60px'
        }}
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center justify-between p-3 h-full">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Mail className="h-4 w-4 text-info" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">
                Email Composer - {lead.name}
              </span>
              <span className="text-xs text-muted-foreground">Click to restore</span>
            </div>
            </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
          </div>
      </div>
    );
  }

  
  return (
    <>
      
      <div 
        ref={containerRef}
        className="fixed z-[10000] bg-card border border-border rounded-lg shadow-lg transition-all duration-300 overflow-hidden"
        style={{ 
          zIndex: 10000,
          position: 'fixed',
          top: '50vh',
          left: '50vw',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '600px',
          maxWidth: '90vw',
          maxHeight: '90vh'
        }}
      >
        {/* Header with drag handle */}
        <div
          className={`flex items-center justify-between p-4 border-b border-border bg-background select-none ${effectiveMode === "floating" ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
          onDragStart={(e) => e.preventDefault()}
          draggable={false}
          onPointerDown={(e) => {
            if (effectiveMode !== "floating") return;
            // Allow drag from anywhere on header EXCEPT interactive elements
            const t = e.target as HTMLElement;
            if (t.closest('button,[role="button"],input,textarea,select,[contenteditable],a,[data-no-drag]')) return;

            e.preventDefault(); // stops text selection start
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

            if (!containerRef.current) return;
            containerRef.current.style.transition = "none";

            document.body.style.userSelect = "none";
            // Safari
            (document.body.style as any).webkitUserSelect = "none";

            setIsDragging(true);
            setDragStart({ x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y });
          }}
        >
          {/* LEFT: title */}
          <div className="flex items-center gap-3">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Mail className="h-5 w-5 text-info" />
            <h1 className="text-lg font-semibold select-none">Email Composer</h1>
            <div className="text-xs text-muted-foreground select-none">To: {lead.name}</div>
          </div>

          {/* RIGHT: controls (clickable as usual) */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShortcutsDialog(true)}
              title="Keyboard shortcuts"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              title="Minimize"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const w = sizeLiveRef.current.width;
                const h = sizeLiveRef.current.height;
                const nextW = w < 1000 ? Math.min(window.innerWidth - 40, 1200) : 800;
                const nextH = h < window.innerHeight - 120 ? Math.min(window.innerHeight - 40, Math.max(h, 600)) : Math.max(480, Math.min(window.innerHeight - 100, h));
                sizeLiveRef.current = { width: nextW, height: nextH };
                setSize(sizeLiveRef.current);
              }}
              title={sizeLiveRef.current.width < 1000 ? "Expand" : "Compact"}
            >
              {sizeLiveRef.current.width < 1000 ? <Maximize className="h-4 w-4" /> : <Minimize className="h-4 w-4" />}
            </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onClose();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                title="Close email composer"
              >
              <X className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={isSending}
              className="bg-accent hover:bg-accent/90 text-accent-foreground ml-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
              <Send className="h-4 w-4 mr-2" />
              Send Email
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100% - 60px)' }}>
          {/* Left Sidebar - AI Tools & Intent Selection */}
          <div className="w-80 border-r border-border bg-muted/20 p-6 overflow-y-auto overscroll-contain flex-shrink-0" style={{ height: '100%' }}>
            {/* AI Status */}
            {isGenerating && (
              <div className="mb-6 p-4 accent-bg accent-border rounded-lg" aria-live="polite">
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



            {/* AI Tools */}
            <div className="mb-6">
              <div className="border border-border rounded-lg bg-background/50 p-3 space-y-4">
                  {/* Ask Ivy Section */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Ask Ivy</h4>
                    <textarea
                      value={askIvyQuery}
                      onChange={(e) => setAskIvyQuery(e.target.value)}
                      placeholder="Ask Ivy anything about this lead…"
                      className="w-full h-20 text-xs resize-none rounded border border-border bg-background p-2 focus:ring-2 focus:ring-ring focus:border-ring"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button 
                        onClick={() => askIvy(askIvyQuery, lead!)}
                        disabled={!askIvyQuery.trim() || isGeneratingAskIvy}
                        size="sm"
                        className="flex-1"
                        variant="secondary"
                      >
                        {isGeneratingAskIvy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Brain className="h-3 w-3 mr-1" />}
                        Ask Ivy
                      </Button>
                      <Button 
                        onClick={() => setAskIvyQuery("Write a professional email for this applicant")}
                        size="sm"
                        variant="ghost"
                      >
                        <Wand2 className="h-3 w-3" />
                      </Button>
                      </div>
                    {askIvyResponse && (
                      <div className="mt-3 border border-border rounded p-2 bg-background/60">
                        <div className="text-xs font-medium mb-1">Ivy's response</div>
                        <p className="text-xs text-muted-foreground mb-2 whitespace-pre-wrap">{askIvyResponse}</p>
                        <Button size="sm" variant="outline" className="w-full" onClick={() => copyAskIvyToEmail(askIvyResponse)}>
                          <MessageSquare className="h-3 w-3 mr-1" /> Use in email
                        </Button>
                    </div>
                    )}
                  </div>

                  <hr className="border-border" />

                  {/* Quick Actions */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-left justify-start"
                        onClick={() => {
                          setAskIvyQuery("Write a nurturing email that provides value and builds relationship with this applicant");
                          askIvy("Write a nurturing email that provides value and builds relationship with this applicant", lead!);
                        }}
                        disabled={isGeneratingAskIvy}
                      >
                        <Sprout className="h-3 w-3 mr-1" /> Nurture
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-left justify-start"
                        onClick={() => {
                          setAskIvyQuery("Write an email to book an interview or meeting with this applicant");
                          askIvy("Write an email to book an interview or meeting with this applicant", lead!);
                        }}
                        disabled={isGeneratingAskIvy}
                      >
                        <Calendar className="h-3 w-3 mr-1" /> Interview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-left justify-start"
                        onClick={() => {
                          setAskIvyQuery("Write a re-engagement email to reconnect with this applicant");
                          askIvy("Write a re-engagement email to reconnect with this applicant", lead!);
                        }}
                        disabled={isGeneratingAskIvy}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> Re-engage
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-left justify-start"
                        onClick={() => {
                          setAskIvyQuery("Tell me about this lead and their course interest");
                          askIvy("Tell me about this lead and their course interest", lead!);
                        }}
                        disabled={isGeneratingAskIvy}
                      >
                        <Brain className="h-3 w-3 mr-1" /> About lead
                      </Button>
              </div>
            </div>

                  <hr className="border-border" />

                  {/* Grammar Check */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Grammar & Spelling</h4>
                  <Button 
                      onClick={checkGrammarSpelling}
                      disabled={!emailComposerData.body.trim() || isGenerating}
                    size="sm"
                      className="w-full justify-center"
                      variant="secondary"
                  >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Check grammar & spelling
                  </Button>
                </div>
              </div>
            </div>

            {/* Email History */}
            <div className="mb-6">
              <div className="border border-border rounded-lg bg-background/50 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <History className="h-4 w-4 text-accent" />
                  <h4 className="text-sm font-medium">Recent Activity</h4>
                  {isLoadingHistory && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>
                
                {emailHistory && emailHistory.total_emails > 0 ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground mb-2">
                      {emailHistory.total_emails} recent emails • {emailHistory.total_activities} activities
                    </div>
                    
                    {/* Recent Emails */}
                    <div className="space-y-1">
                      {emailHistory.email_history.slice(0, 3).map((email) => (
                        <div key={email.id} className="p-2 bg-slate-50 border border-slate-200 rounded text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-700 truncate">{email.subject}</span>
                            <span className="text-slate-500 text-xs">
                              {new Date(email.sent_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <span className="text-xs">by {email.sent_by}</span>
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {email.intent}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Recent Activities */}
                    {emailHistory.activities.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-slate-600 mt-3 mb-1">Recent Activities:</div>
                        {emailHistory.activities.slice(0, 2).map((activity) => (
                          <div key={activity.id} className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                            <div className="font-medium text-blue-700">{activity.activity_title}</div>
                            <div className="text-blue-600 text-xs">
                              {new Date(activity.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : emailHistory && emailHistory.total_emails === 0 ? (
                  <div className="text-center py-4">
                    <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-xs text-muted-foreground">No email history</p>
                    <p className="text-xs text-muted-foreground mt-1">This is a new conversation</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Loading history...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Email Strategy */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" />
                Email Strategy
                <Badge variant="outline" className="text-xs">
                  AI-Guided
                </Badge>
              </h3>
              
              {/* Conversion Chance Summary */}
              {emailComposerData.aiSuggestions.length > 0 && (
                <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Conversion Chance</span>
                    <span className="text-lg font-bold text-slate-800">
                      {((emailComposerData.aiSuggestions[0]?.conversionProb || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Based on lead engagement and course interest
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {emailComposerData.aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-border bg-background/60 backdrop-blur-sm"
                  >
                    <div className="mb-2">
                      <span className="text-sm font-medium text-foreground">{suggestion?.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{suggestion.description}</p>
                    <p className="text-sm text-accent font-medium">{suggestion.action}</p>
                  </div>
                ))}
              </div>
            </div>


            {/* Ask Ivy Status */}
            {isGeneratingAskIvy && (
              <div className="mb-6 p-4 accent-bg accent-border rounded-lg" aria-live="polite">
                <div className="flex items-center gap-2 text-accent">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Ivy is thinking...</span>
                      </div>
                      </div>
            )}

            {/* Footer link */}
            <div className="mb-6">
              <div className="pt-4 border-t border-border">
                <button
                  onClick={() => setShowShortcutsDialog(true)}
                  className="text-xs text-muted-foreground hover:text-accent transition-colors"
                >
                  View keyboard shortcuts
                </button>
                      </div>
                      </div>

                      </div>

          {/* Right Side - Email Composition */}
          <div className="flex-1 p-6 flex flex-col overflow-y-auto" style={{ height: '100%' }}>
            {/* Subject Line */}
            <div className="mb-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">Subject</label>
                <MergeFieldMenu
                  onInsert={(field) => insertMergeField(field, subjectRef)}
                  lead={lead}
                  fields={availableFields}
                  trigger={
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Merge Fields
                    </Button>
                  }
                />
                    </div>
              <Input
                ref={subjectRef}
                value={previewOn ? renderPreview(emailComposerData.subject) : emailComposerData.subject}
                onChange={(e) => {
                  if (!previewOn) {
                    setEmailComposerData(prev => ({ ...prev, subject: e.target.value }));
                  }
                }}
                placeholder="Enter email subject..."
                className="h-12 text-base"
                disabled={previewOn}
              />
              {previewOn && (
                <div className="text-xs text-muted-foreground mt-1">
                  Preview mode: {emailComposerData.subject.includes('{') ? 
                    `${emailComposerData.subject} → ${renderPreview(emailComposerData.subject)}` : 
                    'No merge fields to preview. Use "Merge Fields" button to add {firstName}, {courseInterest}, etc.'
                  }
                </div>
              )}
                  </div>
                  
            {/* Email Body */}
            <div className="mb-6 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">Message</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Preview with data</span>
                    <input 
                      type="checkbox" 
                      checked={previewOn} 
                      onChange={(e) => setPreviewOn(e.target.checked)}
                      className="rounded border-border"
                    />
                    </div>
                  <MergeFieldMenu
                    onInsert={(field) => insertMergeField(field, messageRef)}
                    lead={lead}
                    fields={availableFields}
                    trigger={
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        Merge Fields
                      </Button>
                    }
                  />
                </div>
              </div>

              {/* Rich Text Formatting Toolbar */}
              <div className="mb-3 p-2 border border-border rounded-lg bg-muted/30">
                <div className="flex items-center gap-1 flex-wrap">
                  {/* Text Formatting */}
                  <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
                      <Button 
                      variant="ghost"
                        size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => applyFormatting('bold', richTextRef)}
                      title="Bold (Ctrl+B)"
                      >
                      <Bold className="h-4 w-4" />
                      </Button>
                      <Button 
                      variant="ghost"
                        size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => applyFormatting('italic', richTextRef)}
                      title="Italic (Ctrl+I)"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => applyFormatting('underline', richTextRef)}
                      title="Underline (Ctrl+U)"
                    >
                      <Underline className="h-4 w-4" />
                      </Button>
                    </div>

                  {/* Lists */}
                  <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => applyFormatting('bullet', richTextRef)}
                      title="Bullet List"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => applyFormatting('number', richTextRef)}
                      title="Numbered List"
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Alignment */}
                  <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
                  <Button 
                      variant="ghost"
                    size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => applyFormatting('quote', richTextRef)}
                      title="Quote"
                  >
                      <Quote className="h-4 w-4" />
                  </Button>
            </div>

                  {/* Links */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => applyFormatting('link', richTextRef)}
                      title="Insert Link"
                    >
                      <Link className="h-4 w-4" />
                    </Button>
                </div>
              </div>
              </div>

              {/* View Mode Switcher */}
                <div className="flex items-center gap-1 mb-3 flex-shrink-0">
                <Button 
                  size="sm"
                  variant={viewMode === "edit" ? "secondary" : "ghost"} 
                  onClick={() => setViewMode("edit")}
                >
                  Edit
                </Button>
                <Button 
                  size="sm"
                  variant={viewMode === "preview" ? "secondary" : "ghost"} 
                  onClick={() => setViewMode("preview")}
                >
                  Preview
                </Button>
                <Button 
                  size="sm" 
                  variant={viewMode === "html" ? "secondary" : "ghost"} 
                  onClick={() => setViewMode("html")}
                >
                  HTML
                </Button>
            </div>

              {/* Edit Mode */}
              {viewMode === "edit" && (
                <div
                  ref={richTextRef}
                  data-no-drag
                  contentEditable
                  onInput={handleRichTextInput}
                  className="w-full min-h-[200px] rounded-lg border border-border bg-background p-4 text-sm focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-200 resize-none overflow-auto"
                  style={{ outline: 'none' }}
                  suppressContentEditableWarning={true}
                />
              )}

              {/* Preview Mode */}
              {viewMode === "preview" && (
                <div className="prose prose-sm max-w-none rounded-lg border border-border p-4 bg-background overflow-auto min-h-[200px]">
                  <div dangerouslySetInnerHTML={{ __html: markdownToHtml(renderPreview(emailComposerData.body)) }} />
          </div>
              )}

              {/* HTML Mode */}
              {viewMode === "html" && (
                <pre className="text-xs whitespace-pre-wrap rounded-lg border border-border p-4 bg-muted/30 overflow-auto min-h-[200px]">
                  {markdownToHtml(renderPreview(emailComposerData.body))}
                </pre>
              )}
              <div className="mt-2 text-xs text-muted-foreground">
                Tip: Press ⌘/Ctrl+Enter to send
              </div>
            </div>

          </div>
        </div>

        {/* Resize handle - only in floating mode */}
        {effectiveMode === "floating" && (
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize bg-transparent"
            onMouseDown={(e) => handleMouseDown(e, 'resize')}
            onTouchStart={(e) => handleTouchStart(e, 'resize')}
            style={{
              background: 'linear-gradient(-45deg, transparent 45%, hsl(var(--border)) 45%, hsl(var(--border)) 55%, transparent 55%)'
            }}
          />
        )}
            </div>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Available shortcuts when the email composer is open
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Send email</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">⌘/Ctrl+Enter</kbd>
              </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Close composer</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">Esc</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Focus subject</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">Alt+S</kbd>
          </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Focus message</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">Alt+M</kbd>
        </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Grammar check</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">⌘/Ctrl+G</kbd>
      </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Generate template</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">⌘/Ctrl+T</kbd>
    </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Merge fields menu</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">⌘/Ctrl+M</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Bold text</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">⌘/Ctrl+B</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Italic text</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">⌘/Ctrl+I</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Underline text</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">⌘/Ctrl+U</kbd>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmailComposer;
