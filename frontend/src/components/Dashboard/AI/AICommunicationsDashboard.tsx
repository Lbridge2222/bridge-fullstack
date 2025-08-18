import React, { useMemo, useState } from 'react';
import {
  Bot, MessageSquare, Mail, MessageCircle, Phone, Send,
  Zap, Brain, Target, TrendingUp, BarChart3, Calendar,
  ChevronDown, ChevronUp, Play, Pause, Edit, Eye, Smartphone, Hash,
} from 'lucide-react';

// ——— Types
type ChannelKey = 'email' | 'sms' | 'whatsapp' | 'discord' | 'phone' | 'all';
type StatusKey = 'active' | 'scheduled' | 'paused' | 'all';

type Campaign = {
  id: number;
  name: string;
  type: ChannelKey | 'discord' | 'whatsapp';
  status: Exclude<StatusKey, 'all'>;
  channel: string; // display
  audience: string;
  recipients: number;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  nextSend: string;
  aiOptimized: boolean;
  personalizedContent: boolean;
  performance: 'excellent' | 'high' | 'medium' | 'low' | 'pending';
  description: string;
};

type Insight = {
  type: 'optimization' | 'content' | 'audience';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  action: string;
};

type ChannelPerf = {
  channel: 'Email' | 'SMS' | 'WhatsApp' | 'Discord';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  campaigns: number;
  messages: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  trend: 'up' | 'stable' | 'down';
  aiOptimization: number;
};

type TemplateRow = {
  id: number;
  name: string;
  type: 'email' | 'whatsapp' | 'sms';
  aiGenerated: boolean;
  personalized: boolean;
  performance: 'excellent' | 'high' | 'medium' | 'low';
  usageCount: number;
  conversionRate: number;
  lastUpdated: string;
};

type DataShape = {
  overview: {
    activeCampaigns: number;
    messagesSent: number;
    responseRate: number;
    conversions: number;
    automatedMessages: number;
    aiOptimization: number;
  };
  activeCampaigns: Campaign[];
  aiInsights: Insight[];
  channelPerformance: ChannelPerf[];
  messageTemplates: TemplateRow[];
};

const getChannelIcon = (channel: string) => {
  switch (channel.toLowerCase()) {
    case 'email': return <Mail size={16} style={{ color: 'hsl(var(--text-secondary))' }} />;
    case 'sms': return <MessageCircle size={16} style={{ color: 'hsl(var(--green-600))' }} />;
    case 'whatsapp': return <Smartphone size={16} style={{ color: 'hsl(var(--green-600))' }} />;
    case 'discord': return <Hash size={16} style={{ color: 'hsl(var(--indigo-600))' }} />;
    case 'phone': return <Phone size={16} style={{ color: 'hsl(var(--orange-600))' }} />;
    default: return <MessageSquare size={16} style={{ color: 'hsl(var(--text-secondary))' }} />;
  }
};

const performancePill = (p: Campaign['performance'] | TemplateRow['performance']) => {
  switch (p) {
    case 'excellent': return { backgroundColor: 'hsl(var(--green-100))', color: 'hsl(var(--green-700))' };
    case 'high': return { backgroundColor: 'hsl(var(--slate-100))', color: 'hsl(var(--slate-700))' };
    case 'medium': return { backgroundColor: 'hsl(var(--amber-100))', color: 'hsl(var(--amber-700))' };
    case 'low': return { backgroundColor: 'hsl(var(--red-100))', color: 'hsl(var(--red-700))' };
    case 'pending': return { backgroundColor: 'hsl(var(--slate-100))', color: 'hsl(var(--slate-700))' };
    default: return { backgroundColor: 'hsl(var(--slate-100))', color: 'hsl(var(--slate-700))' };
  }
};

const AICommunicationsDashboard: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState<ChannelKey>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusKey>('active');
  const [campaignView, setCampaignView] = useState<'overview' | 'table'>('overview');
  const [expandedSections, setExpandedSections] = useState<string[]>(['active', 'performance']);
  const [automationMode, setAutomationMode] = useState(true);

  const communicationsData: DataShape = {
    overview: {
      activeCampaigns: 12,
      messagesSent: 2847,
      responseRate: 34.7,
      conversions: 156,
      automatedMessages: 1923,
      aiOptimization: 91.2
    },
    activeCampaigns: [
      {
        id: 1,
        name: 'Application Deadline Reminder',
        type: 'email',
        status: 'active',
        channel: 'Email + SMS',
        audience: 'Prospective Students',
        recipients: 342,
        sent: 342,
        opened: 187,
        clicked: 89,
        converted: 23,
        nextSend: '2 hours',
        aiOptimized: true,
        personalizedContent: true,
        performance: 'high',
        description: 'Multi-channel reminder for upcoming application deadlines with personalized course recommendations'
      },
      {
        id: 2,
        name: 'Interview Confirmation & Prep',
        type: 'whatsapp',
        status: 'active',
        channel: 'WhatsApp',
        audience: 'Interview Candidates',
        recipients: 45,
        sent: 45,
        opened: 43,
        clicked: 38,
        converted: 41,
        nextSend: 'Real-time',
        aiOptimized: true,
        personalizedContent: true,
        performance: 'excellent',
        description: 'Automated interview confirmations with AI-generated prep materials based on course interest'
      },
      {
        id: 3,
        name: 'Student Engagement Boost',
        type: 'discord',
        status: 'scheduled',
        channel: 'Discord',
        audience: 'Current Students',
        recipients: 156,
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        nextSend: 'Tomorrow 10 AM',
        aiOptimized: true,
        personalizedContent: true,
        performance: 'pending',
        description: 'AI-curated content to boost engagement and prevent at-risk student dropouts'
      }
    ],
    aiInsights: [
      { type: 'optimization', title: 'Send Time Optimization', description: 'AI suggests sending emails 2:30 PM for 23% higher open rates', impact: '+89 additional opens', confidence: 94.2, action: 'Auto-apply timing' },
      { type: 'content', title: 'Subject Line Enhancement', description: 'Personalized subject lines increase open rates by 31%', impact: '+156 opens predicted', confidence: 87.8, action: 'Generate variations' },
      { type: 'audience', title: 'Audience Segmentation', description: 'Split test shows program-specific messaging converts 45% better', impact: '+67 conversions', confidence: 91.5, action: 'Create segments' }
    ],
    channelPerformance: [
      { channel: 'Email', icon: Mail, campaigns: 8, messages: 1243, openRate: 42.3, clickRate: 18.7, conversionRate: 8.9, trend: 'up', aiOptimization: 89.4 },
      { channel: 'SMS', icon: MessageCircle, campaigns: 3, messages: 567, openRate: 96.8, clickRate: 34.2, conversionRate: 12.4, trend: 'up', aiOptimization: 94.1 },
      { channel: 'WhatsApp', icon: Smartphone, campaigns: 2, messages: 234, openRate: 98.2, clickRate: 67.3, conversionRate: 28.9, trend: 'up', aiOptimization: 96.7 },
      { channel: 'Discord', icon: Hash, campaigns: 1, messages: 89, openRate: 87.6, clickRate: 45.2, conversionRate: 15.7, trend: 'stable', aiOptimization: 82.3 }
    ],
    messageTemplates: [
      { id: 1, name: 'Application Follow-up', type: 'email', aiGenerated: true, personalized: true, performance: 'high', usageCount: 234, conversionRate: 23.4, lastUpdated: '2 days ago' },
      { id: 2, name: 'Course Interest Nurture', type: 'whatsapp', aiGenerated: true, personalized: true, performance: 'excellent', usageCount: 156, conversionRate: 34.7, lastUpdated: '1 day ago' },
      { id: 3, name: 'Interview Reminder', type: 'sms', aiGenerated: false, personalized: true, performance: 'medium', usageCount: 89, conversionRate: 15.2, lastUpdated: '1 week ago' }
    ]
  };

  const toggleSection = (section: string) =>
    setExpandedSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);

  const filteredCampaigns = useMemo(() => {
    return communicationsData.activeCampaigns.filter(c => {
      const channelOk = selectedChannel === 'all' ? true : c.type === selectedChannel;
      const statusOk = selectedStatus === 'all' ? true : c.status === selectedStatus;
      return channelOk && statusOk;
    });
  }, [communicationsData.activeCampaigns, selectedChannel, selectedStatus]);

  const CampaignCard: React.FC<{ campaign: Campaign }> = ({ campaign }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getChannelIcon(campaign.type)}
          <div>
            <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.aiOptimized && <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'hsl(var(--purple-100))', color: 'hsl(var(--purple-700))' }}>AI Optimized</div>}
          <div className="px-2 py-1 rounded text-xs font-medium" style={performancePill(campaign.performance)}>
            {campaign.performance.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm text-gray-600">Channel & Audience</div>
          <div className="font-medium text-gray-900">{campaign.channel}</div>
          <div className="text-sm text-gray-600">{campaign.audience}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm text-gray-600">Next Send</div>
          <div className="font-medium text-gray-900">{campaign.nextSend}</div>
          <div className="text-sm text-gray-600">{campaign.recipients} recipients</div>
        </div>
      </div>

      {campaign.sent > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{campaign.sent}</div>
            <div className="text-xs text-gray-600">Sent</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-600">{campaign.opened}</div>
            <div className="text-xs text-gray-600">Opened</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{campaign.clicked}</div>
            <div className="text-xs text-gray-600">Clicked</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">{campaign.converted}</div>
            <div className="text-xs text-gray-600">Converted</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button className="flex-1 bg-slate-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700 flex items-center justify-center gap-2">
          <Eye size={14} /> View Details
        </button>
        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
          <Edit size={14} /> Edit
        </button>
        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50" aria-label="Play/Pause">
          {campaign.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>
    </div>
  );

  const ChannelCard: React.FC<{ channel: ChannelPerf }> = ({ channel }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div style={{ color: 'hsl(var(--text-secondary))' }}>
            <channel.icon />
          </div>
          <h3 className="font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>{channel.channel}</h3>
        </div>
        <div className={`px-2 py-1 rounded text-xs ${channel.trend === 'up' ? 'bg-green-100 text-green-700' : channel.trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
          {channel.trend === 'up' ? '↑' : channel.trend === 'down' ? '↓' : '→'} Trending
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-gray-600">Campaigns</div>
          <div className="text-xl font-bold text-gray-900">{channel.campaigns}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Messages</div>
          <div className="text-xl font-bold text-gray-900">{channel.messages}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Open Rate</span>
          <span className="font-medium text-gray-900">{channel.openRate}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Click Rate</span>
          <span className="font-medium text-gray-900">{channel.clickRate}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Conversion</span>
          <span className="font-medium text-green-600">{channel.conversionRate}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">AI Optimization</span>
          <span className="font-medium text-purple-600">{channel.aiOptimization}%</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'hsl(var(--slate-50))' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--slate-900))' }}>AI Communications</h1>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: 'hsl(var(--green-100))', color: 'hsl(var(--green-800))' }}>
              <Bot size={14} /> LangChain Powered
            </div>
          </div>
          <p className="mt-2" style={{ color: 'hsl(var(--slate-600))' }}>Intelligent multi-channel communication orchestration with AI-generated content</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value as ChannelKey)}
            className="px-3 py-2 border rounded-lg text-sm"
            style={{ 
              borderColor: 'hsl(var(--card-border))',
              backgroundColor: 'hsl(var(--surface-primary))',
              color: 'hsl(var(--text-primary))'
            }}
          >
            <option value="all">All Channels</option>
            <option value="email">Email Only</option>
            <option value="sms">SMS Only</option>
            <option value="whatsapp">WhatsApp Only</option>
            <option value="discord">Discord Only</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as StatusKey)}
            className="px-3 py-2 border rounded-lg text-sm"
            style={{ 
              borderColor: 'hsl(var(--card-border))',
              backgroundColor: 'hsl(var(--surface-primary))',
              color: 'hsl(var(--text-primary))'
            }}
          >
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="paused">Paused</option>
            <option value="all">All Statuses</option>
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
            <Brain size={16} />
            AI Mode
          </button>

          <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors duration-200" style={{ backgroundColor: 'hsl(var(--slate-600))', color: 'white' }}>
            <Send size={16} />
            New Campaign
          </button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-6 gap-6 mb-8">
        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <Bot size={20} style={{ color: 'hsl(var(--text-secondary))' }} />
            <h3 className="font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Active Campaigns</h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{communicationsData.overview.activeCampaigns}</div>
          <div className="text-sm mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>Running now</div>
        </div>

        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <Send size={20} style={{ color: 'hsl(var(--green-600))' }} />
            <h3 className="font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Messages Sent</h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{communicationsData.overview.messagesSent}</div>
          <div className="text-sm mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>This month</div>
        </div>

        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} style={{ color: 'hsl(var(--purple-600))' }} />
            <h3 className="font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Response Rate</h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{communicationsData.overview.responseRate}%</div>
          <div className="text-sm mt-1" style={{ color: 'hsl(var(--green-600))' }}>+5.2% vs last month</div>
        </div>

        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <Target size={20} style={{ color: 'hsl(var(--orange-600))' }} />
            <h3 className="font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Conversions</h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{communicationsData.overview.conversions}</div>
          <div className="text-sm mt-1" style={{ color: 'hsl(var(--green-600))' }}>+12.8% increase</div>
        </div>

        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={20} style={{ color: 'hsl(var(--amber-600))' }} />
            <h3 className="font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Automated</h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{communicationsData.overview.automatedMessages}</div>
          <div className="text-sm mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>AI-generated</div>
        </div>

        <div className="rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-2">
            <Brain size={20} style={{ color: 'hsl(var(--purple-600))' }} />
            <h3 className="font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>AI Optimization</h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{communicationsData.overview.aiOptimization}%</div>
          <div className="text-sm mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>Performance boost</div>
        </div>
      </div>

      {/* AI Insights Banner */}
      <div className="rounded-lg p-6 mb-8" style={{ background: 'linear-gradient(to right, hsl(var(--green-600)), hsl(var(--blue-600)))' }}>
        <div className="flex items-center justify-between text-white">
          <div>
            <h2 className="text-lg font-semibold mb-2">🤖 AI Communication Assistant</h2>
            <p className="text-green-100">
              AI suggests optimizing send times and subject lines could increase conversions by <span className="font-bold">+23.4%</span>
            </p>
          </div>
          <button className="px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors duration-200" style={{ backgroundColor: 'white', color: 'hsl(var(--green-600))' }}>
            Apply Suggestions
          </button>
        </div>
      </div>

      {/* Active Campaigns */}
      <div className="rounded-lg border mb-8" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
        <div className="flex items-center justify-between p-6 border-b cursor-pointer" onClick={() => toggleSection('active')} style={{ borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-3">
            <Play size={20} style={{ color: 'hsl(var(--green-600))' }} />
            <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Active Campaigns</h2>
            <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'hsl(var(--green-100))', color: 'hsl(var(--green-700))' }}>
              {filteredCampaigns.length} Shown
            </div>
          </div>
          {expandedSections.includes('active') ? <ChevronUp size={20} style={{ color: 'hsl(var(--text-tertiary))' }} /> : <ChevronDown size={20} style={{ color: 'hsl(var(--text-tertiary))' }} />}
        </div>

        {expandedSections.includes('active') && (
          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <select
                value={campaignView}
                onChange={(e) => setCampaignView(e.target.value as typeof campaignView)}
                className="px-3 py-2 border rounded-lg text-sm"
                style={{ 
                  borderColor: 'hsl(var(--card-border))',
                  backgroundColor: 'hsl(var(--surface-primary))',
                  color: 'hsl(var(--text-primary))'
                }}
              >
                <option value="overview">Overview Cards</option>
                <option value="table">Compact Table</option>
              </select>
            </div>

            {campaignView === 'overview' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3">Campaign</th>
                      <th className="text-left px-4 py-3">Channel</th>
                      <th className="text-right px-4 py-3">Sent</th>
                      <th className="text-right px-4 py-3">Opened</th>
                      <th className="text-right px-4 py-3">Clicked</th>
                      <th className="text-right px-4 py-3">Converted</th>
                      <th className="text-left px-4 py-3">Next Send</th>
                      <th className="text-center px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                        <td className="px-4 py-3">{c.channel}</td>
                        <td className="px-4 py-3 text-right">{c.sent}</td>
                        <td className="px-4 py-3 text-right">{c.opened}</td>
                        <td className="px-4 py-3 text-right">{c.clicked}</td>
                        <td className="px-4 py-3 text-right">{c.converted}</td>
                        <td className="px-4 py-3">{c.nextSend}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex gap-2">
                            <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"><Eye size={14} /></button>
                            <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"><Edit size={14} /></button>
                            <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">
                              {c.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Channel Performance */}
      <div className="bg-white rounded-lg border border-gray-200 mb-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 cursor-pointer" onClick={() => toggleSection('performance')}>
          <div className="flex items-center gap-3">
            <BarChart3 className="text-slate-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">Channel Performance</h2>
          </div>
          {expandedSections.includes('performance') ? <ChevronUp className="text-gray-400" size={20} /> : <ChevronDown className="text-gray-400" size={20} />}
        </div>

        {expandedSections.includes('performance') && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {communicationsData.channelPerformance.map((ch, i) => (
                <ChannelCard key={i} channel={ch} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Insights & Message Templates */}
      <div className="grid grid-cols-2 gap-8">
        {/* AI Insights */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Brain className="text-purple-600" size={20} />
              <h2 className="text-xl font-semibold text-gray-900">AI Insights</h2>
              <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Real-time</div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {communicationsData.aiInsights.map((ins, idx) => (
                <div key={idx} className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{ins.title}</h4>
                  <p className="text-sm text-gray-700 mb-3">{ins.description}</p>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-green-600 font-medium">{ins.impact}</span>
                    <span className="text-sm text-gray-600">{ins.confidence}% confidence</span>
                  </div>
                  <button className="w-full bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700">
                    {ins.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Message Templates */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Calendar className="text-orange-600" size={20} />
              <h2 className="text-xl font-semibold text-gray-900">Message Templates</h2>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Bot size={16} />
              Generate New
            </button>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {communicationsData.messageTemplates.map((tpl) => (
                <div key={tpl.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{tpl.name}</h4>
                    <div className="flex items-center gap-2">
                      {tpl.aiGenerated && <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'hsl(var(--slate-100))', color: 'hsl(var(--slate-700))' }}>AI Generated</div>}
                      <div className="px-2 py-1 rounded text-xs" style={performancePill(tpl.performance)}>{tpl.performance}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div><span className="text-gray-600">Used:</span> <span className="ml-1 font-medium">{tpl.usageCount} times</span></div>
                    <div><span className="text-gray-600">Conversion:</span> <span className="ml-1 font-medium text-green-600">{tpl.conversionRate}%</span></div>
                    <div><span className="text-gray-600">Updated:</span> <span className="ml-1 font-medium">{tpl.lastUpdated}</span></div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 bg-orange-600 text-white px-3 py-2 rounded text-sm hover:bg-orange-700">
                      Use Template
                    </button>
                    <button className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">
                      <Edit size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Design System Label */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 text-xs font-mono px-3 py-1 rounded border shadow-sm z-10 hidden lg:block" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))', color: 'hsl(var(--text-tertiary))' }}>
        AI COMMUNICATIONS: Multi-Channel • LangChain • n8n Automation • Intelligent Content
      </div>
    </div>
  );
};

export default AICommunicationsDashboard;