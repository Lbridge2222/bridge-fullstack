import React, { useState } from 'react';
import {
  Sparkles, Clock, Phone, Mail, Calendar, MessageSquare,
  AlertTriangle, CheckCircle, Target, Settings, RefreshCw,
  Search, Play, Zap, Eye, ChevronDown, ChevronUp, Timer
} from 'lucide-react';

// ——— Types
type Priority = 'critical' | 'high' | 'medium' | 'low';
type ActionType = 'call' | 'email' | 'meeting' | 'intervention' | 'content';

type Contact = {
  name: string;
  program: string;
  score?: number;
  avatar: string; // initials
};

type BaseAction = {
  id: number;
  type: ActionType;
  priority: Priority;
  title: string;
  description: string;
  impact: string;
  estimatedDuration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  automation?: boolean;
  reasoning?: string;
  suggestedScript?: string;
  contact?: Contact;
  timeLeft?: string;
  bulk?: boolean;
  count?: number | string;
};

type PerformanceMetric = {
  metric: string;
  value: string;
  percentage: number;
  trend: 'up' | 'down';
};

type AutomationCard = {
  type: string;
  name: string;
  status: 'active' | 'scheduled' | 'paused';
  recipients: number | string;
  successRate: number;
  nextRun: string;
};

type ActionData = {
  overview: {
    urgentActions: number;
    todayActions: number;
    weekActions: number;
    automatedActions: number;
    completionRate: number;
    avgResponseTime: string;
  };
  urgentActions: BaseAction[];
  recommendedActions: BaseAction[];
  automatedActions: AutomationCard[];
  performanceMetrics: PerformanceMetric[];
};

const NextBestActionDashboard: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'today' | 'week' | 'month'>('today');
  const [selectedPriority, setSelectedPriority] = useState<'all' | Priority>('all');
  const [actionView, setActionView] = useState<'personal' | 'team' | 'automated'>('personal');
  const [expandedSections, setExpandedSections] = useState<string[]>(['urgent', 'recommended']);
  const [automationMode, setAutomationMode] = useState(false);

  const actionData: ActionData = {
    overview: {
      urgentActions: 12,
      todayActions: 34,
      weekActions: 89,
      automatedActions: 156,
      completionRate: 87.3,
      avgResponseTime: '2.4 hours'
    },
    urgentActions: [
      {
        id: 1,
        type: 'call',
        priority: 'critical',
        title: 'Call Sarah Mitchell - Hot Lead',
        description: 'Lead score jumped from 67 to 94. Viewed course page 8 times today.',
        contact: { name: 'Sarah Mitchell', program: 'Music Production', score: 94, avatar: 'SM' },
        impact: '+£9,250 potential revenue',
        timeLeft: '1 hour 23 minutes',
        reasoning: 'ML model indicates 89% conversion probability if contacted within 2 hours',
        suggestedScript: 'Reference her interest in Logic Pro courses and Brighton campus visit',
        estimatedDuration: '15 minutes',
        difficulty: 'easy',
        automation: false
      },
      {
        id: 2,
        type: 'intervention',
        priority: 'critical',
        title: 'Academic Support - Alex Thompson',
        description: 'Risk score increased to 87. Multiple missed classes detected.',
        contact: { name: 'Alex Thompson', program: 'Music Production Year 2', score: 87, avatar: 'AT' },
        impact: 'Prevent £9,250 revenue loss',
        timeLeft: '4 hours',
        reasoning: 'Student at critical risk of dropping out based on attendance patterns',
        suggestedScript: 'Offer academic support meeting and discuss study challenges',
        estimatedDuration: '30 minutes',
        difficulty: 'medium',
        automation: false
      },
      {
        id: 3,
        type: 'email',
        priority: 'high',
        title: 'Follow-up Application - Jordan Smith',
        description: 'Application stalled for 8 days. AI suggests personalized follow-up.',
        contact: { name: 'Jordan Smith', program: 'Sound Engineering', score: 76, avatar: 'JS' },
        impact: '+£8,500 application progression',
        timeLeft: '2 hours',
        reasoning: 'Optimal timing based on previous successful engagement patterns',
        suggestedScript: 'Highlight new studio equipment and industry placement opportunities',
        estimatedDuration: '10 minutes',
        difficulty: 'easy',
        automation: true
      }
    ],
    recommendedActions: [
      {
        id: 4,
        type: 'meeting',
        priority: 'medium',
        title: 'Schedule Campus Visit - Emma Wilson',
        description: 'Showed high interest in facilities. 73% likely to convert with visit.',
        contact: { name: 'Emma Wilson', program: 'Music Business', score: 73, avatar: 'EW' },
        impact: '+£7,800 conversion boost',
        reasoning: 'Similar prospects convert 45% higher after campus visits',
        estimatedDuration: '20 minutes setup',
        difficulty: 'easy',
        automation: true
      },
      {
        id: 5,
        type: 'content',
        priority: 'medium',
        title: 'Send Course Guide - Multiple Leads',
        description: '23 leads downloaded prospectus but need detailed course information.',
        impact: '+15% engagement rate predicted',
        reasoning: 'Behavioral analysis shows optimal timing for content delivery',
        estimatedDuration: '5 minutes',
        difficulty: 'easy',
        automation: true,
        bulk: true,
        count: 23
      }
    ],
    automatedActions: [
      { type: 'Email Campaign', name: 'Application Deadline Reminder', status: 'active', recipients: 156, successRate: 23.4, nextRun: 'Tomorrow 9:00 AM' },
      { type: 'SMS Follow-up', name: 'Interview Confirmation', status: 'scheduled', recipients: 34, successRate: 89.2, nextRun: 'Today 4:00 PM' },
      { type: 'Workflow Trigger', name: 'High-Value Lead Alert', status: 'active', recipients: 'Team', successRate: 94.1, nextRun: 'Real-time' }
    ],
    performanceMetrics: [
      { metric: 'Actions Completed Today', value: '28/34', percentage: 82.4, trend: 'up' },
      { metric: 'Response Time (Avg)', value: '2.4 hours', percentage: 87.3, trend: 'up' },
      { metric: 'Conversion Rate', value: '23.7%', percentage: 91.2, trend: 'up' },
      { metric: 'Revenue Impact', value: '£124k', percentage: 94.8, trend: 'up' }
    ]
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'critical': return { borderColor: 'hsl(var(--red-500))', backgroundColor: 'hsl(var(--red-50))' };
      case 'high': return { borderColor: 'hsl(var(--orange-500))', backgroundColor: 'hsl(var(--orange-50))' };
      case 'medium': return { borderColor: 'hsl(var(--amber-500))', backgroundColor: 'hsl(var(--amber-50))' };
      case 'low': return { borderColor: 'hsl(var(--green-500))', backgroundColor: 'hsl(var(--green-50))' };
      default: return { borderColor: 'hsl(var(--card-border))', backgroundColor: 'hsl(var(--surface-primary))' };
    }
  };

  const getTypeIcon = (type: ActionType) => {
    switch (type) {
      case 'call': return <Phone size={16} style={{ color: 'hsl(var(--blue-600))' }} />;
      case 'email': return <Mail size={16} style={{ color: 'hsl(var(--green-600))' }} />;
      case 'meeting': return <Calendar size={16} style={{ color: 'hsl(var(--purple-600))' }} />;
      case 'intervention': return <AlertTriangle size={16} style={{ color: 'hsl(var(--red-600))' }} />;
      case 'content': return <MessageSquare size={16} style={{ color: 'hsl(var(--orange-600))' }} />;
      default: return <Sparkles size={16} style={{ color: 'hsl(var(--text-secondary))' }} />;
    }
  };

  const ActionCard: React.FC<{ action: BaseAction; isUrgent?: boolean }> = ({ action, isUrgent = false }) => (
    <div 
      className="rounded-lg border-2 p-6 transition-all hover:shadow-md"
      style={{
        borderColor: isUrgent ? getPriorityColor(action.priority).borderColor : 'hsl(var(--card-border))',
        backgroundColor: isUrgent ? getPriorityColor(action.priority).backgroundColor : 'hsl(var(--surface-primary))'
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getTypeIcon(action.type)}
          <div>
            <h3 className="font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>{action.title}</h3>
            <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>{action.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action.automation && <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'hsl(var(--blue-100))', color: 'hsl(var(--blue-700))' }}>Auto-enabled</div>}
          {action.timeLeft && (
            <div className="flex items-center gap-1 text-sm" style={{ color: 'hsl(var(--red-600))' }}>
              <Timer size={14} />
              {action.timeLeft}
            </div>
          )}
        </div>
      </div>

      {action.contact && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: 'hsl(var(--surface-tertiary))' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm" style={{ backgroundColor: 'hsl(var(--surface-secondary))' }}>
            {action.contact.avatar}
          </div>
          <div className="flex-1">
            <div className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>{action.contact.name}</div>
            <div className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>{action.contact.program}</div>
          </div>
          {typeof action.contact.score === 'number' && (
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: 'hsl(var(--blue-600))' }}>{action.contact.score}</div>
              <div className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>Score</div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span style={{ color: 'hsl(var(--text-secondary))' }}>Impact:</span>
          <span className="font-medium" style={{ color: 'hsl(var(--green-600))' }}>{action.impact}</span>
        </div>

        {action.reasoning && (
          <div className="rounded-lg p-3" style={{ backgroundColor: 'hsl(var(--blue-50))' }}>
            <div className="text-xs mb-1" style={{ color: 'hsl(var(--blue-600))' }}>AI Reasoning:</div>
            <div className="text-sm" style={{ color: 'hsl(var(--blue-800))' }}>{action.reasoning}</div>
          </div>
        )}

        {action.suggestedScript && (
          <div className="rounded-lg p-3" style={{ backgroundColor: 'hsl(var(--purple-50))' }}>
            <div className="text-xs mb-1" style={{ color: 'hsl(var(--purple-600))' }}>Suggested Approach:</div>
            <div className="text-sm" style={{ color: 'hsl(var(--purple-800))' }}>{action.suggestedScript}</div>
          </div>
        )}

        <div className="flex justify-between items-center text-sm">
          <span style={{ color: 'hsl(var(--text-secondary))' }}>Duration:</span>
          <span style={{ color: 'hsl(var(--text-primary))' }}>{action.estimatedDuration}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'hsl(var(--card-border))' }}>
        <button className="flex-1 px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors duration-200" style={{ backgroundColor: 'hsl(var(--blue-600))', color: 'white' }}>
          <Play size={14} />
          Take Action
        </button>
        {action.automation && (
          <button className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50 flex items-center gap-2 transition-colors duration-200" style={{ borderColor: 'hsl(var(--card-border))' }}>
            <Zap size={14} />
            Automate
          </button>
        )}
        <button className="px-4 py-2 border rounded-lg text-sm hover:bg-slate-50 transition-colors duration-200" aria-label="View" style={{ borderColor: 'hsl(var(--card-border))' }}>
          <Eye size={14} />
        </button>
      </div>
    </div>
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);
  };

  const filteredUrgent = actionData.urgentActions.filter(a => selectedPriority === 'all' ? true : a.priority === selectedPriority);

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'hsl(var(--slate-50))' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--slate-900))' }}>Next Best Action</h1>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: 'hsl(var(--purple-100))', color: 'hsl(var(--purple-800))' }}>
              <Sparkles size={14} />
              AI-Driven
            </div>
          </div>
          <p className="mt-2" style={{ color: 'hsl(var(--slate-600))' }}>Intelligent action recommendations powered by machine learning and behavioral analysis</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: 'hsl(var(--text-tertiary))' }} />
            <input
              type="text"
              placeholder="Search actions..."
              className="pl-10 pr-4 py-2 border rounded-lg text-sm w-64"
              style={{ 
                borderColor: 'hsl(var(--card-border))',
                backgroundColor: 'hsl(var(--surface-primary))',
                color: 'hsl(var(--text-primary))'
              }}
            />
          </div>

          <select
            value={actionView}
            onChange={(e) => setActionView(e.target.value as typeof actionView)}
            className="px-3 py-2 border rounded-lg text-sm"
            style={{ 
              borderColor: 'hsl(var(--card-border))',
              backgroundColor: 'hsl(var(--surface-primary))',
              color: 'hsl(var(--text-primary))'
            }}
          >
            <option value="personal">My Actions</option>
            <option value="team">Team Actions</option>
            <option value="automated">Automated Only</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as typeof selectedPriority)}
            className="px-3 py-2 border rounded-lg text-sm"
            style={{ 
              borderColor: 'hsl(var(--card-border))',
              backgroundColor: 'hsl(var(--surface-primary))',
              color: 'hsl(var(--text-primary))'
            }}
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as typeof selectedTimeframe)}
            className="px-3 py-2 border rounded-lg text-sm"
            style={{ 
              borderColor: 'hsl(var(--card-border))',
              backgroundColor: 'hsl(var(--surface-primary))',
              color: 'hsl(var(--text-primary))'
            }}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <button
            onClick={() => setAutomationMode(!automationMode)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors duration-200"
            style={{
              backgroundColor: automationMode ? 'hsl(var(--green-50))' : 'hsl(var(--surface-tertiary))',
              borderColor: automationMode ? 'hsl(var(--green-200))' : 'hsl(var(--card-border))',
              color: automationMode ? 'hsl(var(--green-700))' : 'hsl(var(--text-secondary))'
            }}
            onMouseEnter={(e) => {
              if (automationMode) {
                e.currentTarget.style.backgroundColor = 'hsl(var(--green-100))';
              } else {
                e.currentTarget.style.backgroundColor = 'hsl(var(--surface-primary))';
              }
            }}
            onMouseLeave={(e) => {
              if (automationMode) {
                e.currentTarget.style.backgroundColor = 'hsl(var(--green-50))';
              } else {
                e.currentTarget.style.backgroundColor = 'hsl(var(--surface-tertiary))';
              }
            }}
          >
            <Zap size={16} />
            Auto Mode
          </button>

          <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200" style={{ backgroundColor: 'hsl(var(--blue-600))', color: 'white' }}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {actionData.performanceMetrics.map((metric, idx) => (
          <div key={idx} className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>{metric.metric}</h3>
              <div className="px-2 py-1 rounded text-xs" style={{ 
                backgroundColor: metric.trend === 'up' ? 'hsl(var(--green-100))' : 'hsl(var(--red-100))',
                color: metric.trend === 'up' ? 'hsl(var(--green-700))' : 'hsl(var(--red-700))'
              }}>
                {metric.trend === 'up' ? '↑' : '↓'} {metric.percentage}%
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{metric.value}</div>
          </div>
        ))}
      </div>

      {/* Urgent Actions */}
      <div className="rounded-lg border mb-8" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
        <div className="flex items-center justify-between p-6 border-b cursor-pointer" onClick={() => toggleSection('urgent')} style={{ borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} style={{ color: 'hsl(var(--red-600))' }} />
            <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Urgent Actions</h2>
            <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'hsl(var(--red-100))', color: 'hsl(var(--red-700))' }}>
              {actionData.overview.urgentActions} Require Immediate Attention
            </div>
          </div>
          {expandedSections.includes('urgent') ? <ChevronUp size={20} style={{ color: 'hsl(var(--text-tertiary))' }} /> : <ChevronDown size={20} style={{ color: 'hsl(var(--text-tertiary))' }} />}
        </div>

        {expandedSections.includes('urgent') && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredUrgent.map((action) => (
                <ActionCard key={action.id} action={action} isUrgent />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommended Actions */}
      <div className="rounded-lg border mb-8" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
        <div className="flex items-center justify-between p-6 border-b cursor-pointer" onClick={() => toggleSection('recommended')} style={{ borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-3">
            <Target size={20} style={{ color: 'hsl(var(--blue-600))' }} />
            <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Recommended Actions</h2>
            <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'hsl(var(--blue-100))', color: 'hsl(var(--blue-700))' }}>High Impact Opportunities</div>
          </div>
          {expandedSections.includes('recommended') ? <ChevronUp size={20} style={{ color: 'hsl(var(--text-tertiary))' }} /> : <ChevronDown size={20} style={{ color: 'hsl(var(--text-tertiary))' }} />}
        </div>

        {expandedSections.includes('recommended') && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {actionData.recommendedActions.map((action) => (
                <ActionCard key={action.id} action={action} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Automated Actions Status */}
      <div className="rounded-lg border" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-3">
            <Zap size={20} style={{ color: 'hsl(var(--green-600))' }} />
            <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Automated Actions</h2>
            <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'hsl(var(--green-100))', color: 'hsl(var(--green-700))' }}>Running in Background</div>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-slate-50 transition-colors duration-200" style={{ borderColor: 'hsl(var(--card-border))' }}>
            <Settings size={16} />
            Manage
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {actionData.automatedActions.map((automation, index) => (
              <div key={index} className="p-4 border rounded-lg" style={{ borderColor: 'hsl(var(--card-border))' }}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>{automation.type}</h4>
                  <div className="px-2 py-1 rounded text-xs" style={{
                    backgroundColor: automation.status === 'active' ? 'hsl(var(--green-100))' : 
                                   automation.status === 'scheduled' ? 'hsl(var(--blue-100))' : 
                                   'hsl(var(--slate-100))',
                    color: automation.status === 'active' ? 'hsl(var(--green-700))' : 
                           automation.status === 'scheduled' ? 'hsl(var(--blue-700))' : 
                           'hsl(var(--slate-700))'
                  }}>
                    {automation.status}
                  </div>
                </div>

                <div className="text-sm mb-2" style={{ color: 'hsl(var(--text-primary))' }}>{automation.name}</div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>Recipients:</span>
                    <span style={{ color: 'hsl(var(--text-primary))' }}>{automation.recipients}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>Success Rate:</span>
                    <span style={{ color: 'hsl(var(--green-600))' }}>{automation.successRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>Next Run:</span>
                    <span style={{ color: 'hsl(var(--text-primary))' }}>{automation.nextRun}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Design System Label */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 text-xs font-mono px-3 py-1 rounded border shadow-sm z-10 hidden lg:block" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))', color: 'hsl(var(--text-tertiary))' }}>
        NEXT BEST ACTION: AI Recommendations • Workflow Automation • Impact Optimization
      </div>
    </div>
  );
};

export default NextBestActionDashboard;