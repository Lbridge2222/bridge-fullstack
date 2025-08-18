import React, { useState } from 'react';
import {
  Target, Brain, Calendar, AlertTriangle, CheckCircle,
  BarChart3, Zap, Users, GraduationCap, Settings, RefreshCw,
  ChevronDown, ChevronUp, Info, Play, Pause, Download, Filter as FilterIcon,
  TrendingUp, Eye, Activity, Layers, Cpu, ArrowUp, Database
} from 'lucide-react';

type ModelData = {
  prediction: number;
  confidence: number;
  mape: number;
  strengths?: string[];
  weakness?: string;
  lastUpdate?: string;
};

type Program = {
  name: string;
  current: number;
  predicted: number;
  change: string; // "+14.1%"
  risk: 'low' | 'medium' | 'high';
  confidence: number;
  accuracy: number;
};

type MonthlyPoint = {
  month: string;
  applications: number;
  enrollments: number;
  predicted: number;
  confidence: number;
  week: string;
};

type KeyFactor = {
  factor: string;
  impact: number; // 0-1
  type: 'lag' | 'seasonal' | 'behavioral' | 'location' | 'acquisition' | string;
  description: string;
};

type TechnicalMetrics = {
  trainingWeeks: number;
  featuresUsed: number;
  ensembleSize: number;
  walkForwardSteps: number;
  rmse: number;
  directionalAccuracy: number;
  predictionInterval: number;
  modelAgreement: number;
};

type CampusPerf = {
  campus: string;
  applications: number;
  conversionRate: number;
  revenueActual: number;
  revenueForecast: number;
  trend: 'up' | 'down';
  trendValue: number;
  accuracy: number;
};

type AIInsight = {
  type: 'agreement' | 'seasonal' | 'drift' | 'feature';
  title: string;
  description: string;
  confidence: number;
  status: 'positive' | 'warning' | 'info' | 'other';
};

const EnhancedForecastingDashboard: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'6-months' | '12-months' | '24-months'>('12-months');
  const [selectedProgram, setSelectedProgram] = useState<'all' | 'music-production' | 'sound-engineering' | 'music-business'>('all');
  const [viewMode, setViewMode] = useState<'business' | 'technical'>('business');
  const [selectedModel, setSelectedModel] = useState<'ensemble' | 'neuralProphet' | 'xgboost' | 'lightgbm'>('ensemble');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview', 'predictions']);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulate refresh operation
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const forecastData: {
    ensemble: { totalEnrollments: number; confidence: number; revenueImpact: string; accuracy: string; trend: string; mape: number; variance: number; };
    models: Record<'neuralProphet' | 'xgboost' | 'lightgbm', ModelData>;
    programs: Program[];
    monthlyBreakdown: MonthlyPoint[];
    keyFactors: KeyFactor[];
    technicalMetrics: TechnicalMetrics;
    campusPerformance: CampusPerf[];
    aiInsights: AIInsight[];
  } = {
    ensemble: {
      totalEnrollments: 847,
      confidence: 94.1,
      revenueImpact: '£2.8M',
      accuracy: '94.1%',
      trend: '+12.4%',
      mape: 8.9,
      variance: 12.3
    },
    models: {
      neuralProphet: {
        prediction: 832,
        confidence: 89.2,
        mape: 12.4,
        strengths: ['Seasonal patterns', 'Long-term trends'],
        weakness: 'New feature adaptation',
        lastUpdate: '2024-08-01 09:15'
      },
      xgboost: {
        prediction: 861,
        confidence: 92.7,
        mape: 9.8,
        strengths: ['Feature interactions', 'Non-linear patterns'],
        weakness: 'Seasonal edges',
        lastUpdate: '2024-08-01 09:20'
      },
      lightgbm: {
        prediction: 856,
        confidence: 90.3,
        mape: 10.2,
        strengths: ['Fast training', 'Memory efficient'],
        weakness: 'Feature selection'
      }
    },
    programs: [
      { name: 'Music Production', current: 234, predicted: 267, change: '+14.1%', risk: 'low', confidence: 93.2, accuracy: 94.2 },
      { name: 'Sound Engineering', current: 189, predicted: 201, change: '+6.3%', risk: 'medium', confidence: 88.7, accuracy: 91.8 },
      { name: 'Music Business', current: 156, predicted: 178, change: '+14.1%', risk: 'low', confidence: 91.5, accuracy: 87.9 },
      { name: 'Composition', current: 98, predicted: 112, change: '+14.3%', risk: 'medium', confidence: 86.9, accuracy: 89.4 },
      { name: 'Performance', current: 87, predicted: 89, change: '+2.3%', risk: 'high', confidence: 82.1, accuracy: 85.7 }
    ],
    monthlyBreakdown: [
      { month: 'Sep 2025', applications: 156, enrollments: 89, predicted: 92, confidence: 94.1, week: 'W35' },
      { month: 'Oct 2025', applications: 203, enrollments: 127, predicted: 134, confidence: 91.8, week: 'W36' },
      { month: 'Nov 2025', applications: 234, enrollments: 158, predicted: 163, confidence: 89.3, week: 'W37' },
      { month: 'Dec 2025', applications: 189, enrollments: 98, predicted: 101, confidence: 87.6, week: 'W38' },
      { month: 'Jan 2026', applications: 298, enrollments: 187, predicted: 195, confidence: 92.4, week: 'W39' },
      { month: 'Feb 2026', applications: 267, enrollments: 171, predicted: 178, confidence: 90.1, week: 'W40' }
    ],
    keyFactors: [
      { factor: 'Historical offer patterns', impact: 0.342, type: 'lag', description: '4-week lag features' },
      { factor: 'Seasonal components', impact: 0.187, type: 'seasonal', description: 'Summer enrollment effects' },
      { factor: 'Website engagement trend', impact: 0.156, type: 'behavioral', description: 'User interaction momentum' },
      { factor: 'Lead score momentum', impact: 0.134, type: 'behavioral', description: 'Lead quality patterns' },
      { factor: 'Campus performance factor', impact: 0.098, type: 'location', description: 'Location-based success' },
      { factor: 'Source quality weight', impact: 0.083, type: 'acquisition', description: 'Lead source effectiveness' }
    ],
    technicalMetrics: {
      trainingWeeks: 101,
      featuresUsed: 47,
      ensembleSize: 150,
      walkForwardSteps: 24,
      rmse: 4.2,
      directionalAccuracy: 89.5,
      predictionInterval: 94.1,
      modelAgreement: 92.7
    },
    campusPerformance: [
      {
        campus: 'Brighton',
        applications: 189,
        conversionRate: 85.2,
        revenueActual: 1250000,
        revenueForecast: 1420000,
        trend: 'up',
        trendValue: 12.5,
        accuracy: 94.2
      },
      {
        campus: 'Sheffield',
        applications: 156,
        conversionRate: 88.1,
        revenueActual: 987000,
        revenueForecast: 1180000,
        trend: 'up',
        trendValue: 8.7,
        accuracy: 91.8
      },
      {
        campus: 'Online',
        applications: 178,
        conversionRate: 72.4,
        revenueActual: 890000,
        revenueForecast: 1050000,
        trend: 'up',
        trendValue: 15.3,
        accuracy: 87.9
      }
    ],
    aiInsights: [
      {
        type: 'agreement',
        title: 'Model Agreement High',
        description: 'XGBoost and Neural Prophet within 4% variance - high confidence forecast',
        confidence: 94.1,
        status: 'positive'
      },
      {
        type: 'seasonal',
        title: 'Seasonal Peak Detected',
        description: 'September enrollment surge predicted: +47% vs August baseline',
        confidence: 89.3,
        status: 'info'
      },
      {
        type: 'drift',
        title: 'Minor Data Drift',
        description: 'Shift in lead behavior patterns - retrain recommended in 2 weeks',
        confidence: 76.8,
        status: 'warning'
      },
      {
        type: 'feature',
        title: 'Feature Discovery',
        description: 'Website engagement momentum now 15.6% of prediction power',
        confidence: 91.5,
        status: 'positive'
      }
    ]
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const ModelCard: React.FC<{ title: string; data: ModelData }> = ({ title, data }) => (
    <div className="rounded-lg border p-4" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>{title}</h4>
        <div className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'hsl(var(--blue-100))', color: 'hsl(var(--blue-700))' }}>
          {data.confidence}%
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Prediction</span>
          <span className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{data.prediction}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Confidence</span>
          <span className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{data.confidence}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>MAPE</span>
          <span className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{data.mape}%</span>
        </div>
      </div>

      {data.strengths && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'hsl(var(--surface-tertiary))' }}>
          <div className="text-xs mb-1" style={{ color: 'hsl(var(--text-tertiary))' }}>Strengths:</div>
          <div className="text-xs" style={{ color: 'hsl(var(--text-secondary))' }}>{data.strengths.join(' • ')}</div>
        </div>
      )}
    </div>
  );

  const ProgramCard: React.FC<{ program: Program }> = ({ program }) => (
    <div className="rounded-lg border p-4" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>{program.name}</h4>
        <div
          className="px-2 py-1 rounded-full text-xs"
          style={{
            backgroundColor: program.risk === 'low' ? 'hsl(var(--green-100))' : 
                           program.risk === 'medium' ? 'hsl(var(--amber-100))' : 
                           'hsl(var(--red-100))',
            color: program.risk === 'low' ? 'hsl(var(--green-700))' : 
                   program.risk === 'medium' ? 'hsl(var(--amber-700))' : 
                   'hsl(var(--red-700))'
          }}
        >
          {program.risk} risk
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Current</span>
          <span className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>{program.current}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Predicted</span>
          <span className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{program.predicted}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Change</span>
          <span className="font-medium" style={{ color: program.change.startsWith('+') ? 'hsl(var(--green-600))' : 'hsl(var(--red-600))' }}>
            {program.change}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Confidence</span>
          <span className="text-sm" style={{ color: 'hsl(var(--text-primary))' }}>{program.confidence}%</span>
        </div>
        {viewMode === 'technical' && (
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Accuracy</span>
            <span className="text-sm" style={{ color: 'hsl(var(--green-600))' }}>{program.accuracy}%</span>
          </div>
        )}
      </div>
    </div>
  );

  const ForecastChart: React.FC = () => {
    // Calculate proper bar heights based on actual data
    const maxValue = Math.max(...forecastData.monthlyBreakdown.map(p => p.predicted));
    const chartHeight = 200; // Fixed chart height for consistency
    
    const getBarHeight = (value: number) => {
      return Math.max((value / maxValue) * chartHeight * 0.6, 4); // Minimum 4px height
    };

    return (
      <div className="rounded-lg border p-4 lg:p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-lg lg:text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>📈 ML Forecast Comparison</h3>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded text-sm transition-colors duration-200" style={{ backgroundColor: 'hsl(var(--surface-tertiary))', color: 'hsl(var(--text-secondary))' }}>Weekly</button>
            <button className="px-3 py-1.5 rounded text-sm transition-colors duration-200" style={{ backgroundColor: 'hsl(var(--slate-900))', color: 'white' }}>Monthly</button>
          </div>
        </div>

        {/* Chart Container */}
        <div className="relative" style={{ height: `${chartHeight + 60}px` }}>
          {/* Chart Area */}
          <div className="relative h-full rounded-lg p-4 lg:p-6" style={{ backgroundColor: 'hsl(var(--surface-tertiary))' }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs" style={{ color: 'hsl(var(--text-tertiary))' }}>
              <span>{Math.ceil(maxValue * 1.1)}</span>
              <span>{Math.ceil(maxValue * 0.75)}</span>
              <span>{Math.ceil(maxValue * 0.5)}</span>
              <span>{Math.ceil(maxValue * 0.25)}</span>
              <span>0</span>
            </div>

            {/* Chart Bars */}
            <div className="ml-12 h-full flex items-end justify-between gap-1 lg:gap-2">
              {forecastData.monthlyBreakdown.map((point, index) => (
                <div key={index} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0 group">
                  {/* Bar Group */}
                  <div className="flex items-end gap-1 h-full">
                    {/* Neural Prophet Bar */}
                    <div 
                      className="w-3 lg:w-4 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer relative" 
                      style={{ 
                        height: `${getBarHeight(point.predicted * 0.4)}px`, 
                        backgroundColor: 'hsl(var(--red-400))' 
                      }} 
                      title={`Neural Prophet: ${Math.round(point.predicted * 0.4)}`}
                    >
                      {/* Enhanced Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-black text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                        Neural Prophet: {Math.round(point.predicted * 0.4)}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                      </div>
                    </div>
                    
                    {/* XGBoost Bar */}
                    <div 
                      className="w-3 lg:w-4 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer relative" 
                      style={{ 
                        height: `${getBarHeight(point.predicted * 0.45)}px`, 
                        backgroundColor: 'hsl(var(--green-400))' 
                      }} 
                      title={`XGBoost: ${Math.round(point.predicted * 0.45)}`}
                    >
                      {/* Enhanced Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-black text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                        XGBoost: {Math.round(point.predicted * 0.45)}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                      </div>
                    </div>
                    
                    {/* Ensemble Bar */}
                    <div 
                      className="w-3 lg:w-4 rounded-t-sm transition-all duration-300 hover:opacity-80 cursor-pointer relative" 
                      style={{ 
                        height: `${getBarHeight(point.predicted * 0.42)}px`, 
                        backgroundColor: 'hsl(var(--slate-700))' 
                      }} 
                      title={`Ensemble: ${Math.round(point.predicted * 0.42)}`}
                    >
                      {/* Enhanced Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded bg-black text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                        Ensemble: {Math.round(point.predicted * 0.42)}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Month Label */}
                  <div className="text-xs font-medium mt-2 text-center" style={{ color: 'hsl(var(--text-secondary))' }}>
                    {point.month.slice(0, 3)}
                  </div>
                  
                  {/* Value Label */}
                  <div className="text-xs mt-1 text-center" style={{ color: 'hsl(var(--text-tertiary))' }}>
                    {point.predicted}
                  </div>
                </div>
              ))}
            </div>

            {/* Grid Lines */}
            <div className="absolute left-12 right-0 top-0 bottom-0 pointer-events-none">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                <div
                  key={index}
                  className="absolute w-full border-t border-dashed opacity-30"
                  style={{ 
                    top: `${ratio * chartHeight}px`,
                    borderColor: 'hsl(var(--card-border))'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="absolute -top-2 right-4 lg:right-6 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs bg-white px-3 py-2 rounded-lg border shadow-sm" style={{ borderColor: 'hsl(var(--card-border))' }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--red-400))' }}></div>
              <span style={{ color: 'hsl(var(--text-secondary))' }}>Neural Prophet</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--green-400))' }}></div>
              <span style={{ color: 'hsl(var(--text-secondary))' }}>XGBoost</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--slate-700))' }}></div>
              <span style={{ color: 'hsl(var(--text-secondary))' }}>Ensemble</span>
            </div>
          </div>
        </div>

        {/* Chart Summary */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 rounded-lg border" style={{ backgroundColor: 'hsl(var(--red-50))', borderColor: 'hsl(var(--red-200))' }}>
            <div className="font-semibold" style={{ color: 'hsl(var(--red-900))' }}>Neural Prophet</div>
            <div style={{ color: 'hsl(var(--red-700))' }}>Strong seasonal detection</div>
            {viewMode === 'technical' && <div className="text-xs mt-1" style={{ color: 'hsl(var(--red-600))' }}>MAPE: {forecastData.models.neuralProphet.mape}%</div>}
          </div>
          <div className="text-center p-3 rounded-lg border" style={{ backgroundColor: 'hsl(var(--green-50))', borderColor: 'hsl(var(--green-200))' }}>
            <div className="font-semibold" style={{ color: 'hsl(var(--green-900))' }}>XGBoost</div>
            <div style={{ color: 'hsl(var(--green-700))' }}>Feature interaction modeling</div>
            {viewMode === 'technical' && <div className="text-xs mt-1" style={{ color: 'hsl(var(--green-600))' }}>MAPE: {forecastData.models.xgboost.mape}%</div>}
          </div>
          <div className="text-center p-3 rounded-lg border" style={{ backgroundColor: 'hsl(var(--slate-50))', borderColor: 'hsl(var(--slate-200))' }}>
            <div className="font-semibold" style={{ color: 'hsl(var(--slate-900))' }}>Ensemble</div>
            <div style={{ color: 'hsl(var(--slate-700))' }}>Balanced accuracy</div>
            {viewMode === 'technical' && <div className="text-xs mt-1" style={{ color: 'hsl(var(--slate-600))' }}>MAPE: {forecastData.ensemble.mape}% ⭐</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'hsl(var(--slate-50))' }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: 'hsl(var(--slate-900))' }}>AI Forecasting</h1>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: 'hsl(var(--blue-100))', color: 'hsl(var(--blue-800))' }}>
              <Target size={14} />
              ML-Powered
            </div>
          </div>
          <p className="text-sm lg:text-base" style={{ color: 'hsl(var(--slate-600))' }}>Advanced enrollment predictions using ensemble machine learning models</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg p-1" style={{ backgroundColor: 'hsl(var(--surface-tertiary))' }}>
            <button
              onClick={() => setViewMode('business')}
              className="px-3 py-2 rounded text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: viewMode === 'business' ? 'hsl(var(--surface-primary))' : 'transparent',
                color: viewMode === 'business' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-secondary))'
              }}
              onMouseEnter={(e) => {
                if (viewMode !== 'business') {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--surface-primary))';
                  e.currentTarget.style.color = 'hsl(var(--text-primary))';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'business') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'hsl(var(--text-secondary))';
                }
              }}
            >
              Business View
            </button>
            <button
              onClick={() => setViewMode('technical')}
              className="px-3 py-2 rounded text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: viewMode === 'technical' ? 'hsl(var(--surface-primary))' : 'transparent',
                color: viewMode === 'technical' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-secondary))'
              }}
              onMouseEnter={(e) => {
                if (viewMode !== 'technical') {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--surface-primary))';
                  e.currentTarget.style.color = 'hsl(var(--text-primary))';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'technical') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'hsl(var(--text-secondary))';
                }
              }}
            >
              Technical View
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as typeof selectedTimeframe)}
              className="px-3 py-2 border rounded-lg text-sm min-w-0"
              style={{ 
                borderColor: 'hsl(var(--card-border))',
                backgroundColor: 'hsl(var(--surface-primary))',
                color: 'hsl(var(--text-primary))'
              }}
            >
              <option value="6-months">6 Months</option>
              <option value="12-months">12 Months</option>
              <option value="24-months">24 Months</option>
            </select>

            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value as typeof selectedProgram)}
              className="px-3 py-2 border rounded-lg text-sm min-w-0"
              style={{ 
                borderColor: 'hsl(var(--card-border))',
                backgroundColor: 'hsl(var(--surface-primary))',
                color: 'hsl(var(--text-primary))'
              }}
            >
              <option value="all">All Programs</option>
              <option value="music-production">Music Production</option>
              <option value="sound-engineering">Sound Engineering</option>
              <option value="music-business">Music Business</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors duration-200 relative"
              style={{
                backgroundColor: autoRefresh ? 'hsl(var(--green-50))' : 'hsl(var(--surface-tertiary))',
                borderColor: autoRefresh ? 'hsl(var(--green-200))' : 'hsl(var(--card-border))',
                color: autoRefresh ? 'hsl(var(--green-700))' : 'hsl(var(--text-secondary))'
              }}
              onMouseEnter={(e) => {
                if (autoRefresh) {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--green-100))';
                } else {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--surface-primary))';
                }
              }}
              onMouseLeave={(e) => {
                if (autoRefresh) {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--green-50))';
                } else {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--surface-tertiary))';
                }
              }}
            >
              {autoRefresh ? (
                <>
                  <Pause size={16} />
                  <span>Auto-refresh</span>
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'hsl(var(--green-500))' }}></div>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Auto-refresh</span>
                </>
              )}
            </button>

            <button 
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
              style={{ backgroundColor: 'hsl(var(--blue-600))', color: 'white' }}
              onMouseEnter={(e) => !isRefreshing && (e.currentTarget.style.backgroundColor = 'hsl(var(--blue-700))')}
              onMouseLeave={(e) => !isRefreshing && (e.currentTarget.style.backgroundColor = 'hsl(var(--blue-600))')}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              {isRefreshing ? 'Updating...' : 'Update Models'}
            </button>
          </div>
        </div>
      </div>

      {/* ML Pipeline Status Banner */}
      <div className="border rounded-lg p-4 lg:p-6 mb-8 shadow-sm" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg lg:text-xl font-bold mb-2" style={{ color: 'hsl(var(--text-primary))' }}>🤖 ML Pipeline Status</h2>
            <p className="text-sm lg:text-base leading-relaxed" style={{ color: 'hsl(var(--text-secondary))' }}>
              <span className="font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Ensemble MAPE: {forecastData.ensemble.mape}%</span> •
              <span className="font-semibold" style={{ color: 'hsl(var(--text-primary))' }}> {forecastData.ensemble.confidence}% confidence</span> •
              <span className="font-semibold" style={{ color: 'hsl(var(--text-primary))' }}> {forecastData.ensemble.totalEnrollments} enrollments predicted</span>
              {viewMode === 'technical' && (
                <>
                  {' • '}
                  <span className="font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.technicalMetrics.featuresUsed} features</span>
                  {' • '}
                  <span className="font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.technicalMetrics.trainingWeeks} training weeks</span>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-2">
            <div className="text-sm" style={{ color: 'hsl(var(--text-tertiary))' }}>Last model run</div>
            <div className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>01 Aug 2024, 09:20</div>
            {isRefreshing && (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--blue-600))' }}>
                <RefreshCw size={12} className="animate-spin" />
                <span>Updating models...</span>
              </div>
            )}
            {viewMode === 'technical' && (
              <button 
                className="mt-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200" 
                style={{ backgroundColor: 'hsl(var(--slate-900))', color: 'white' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--slate-800))'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--slate-900))'}
              >
                View Pipeline Details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6 mb-8">
        <div className="rounded-lg border p-4 lg:p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="text-blue-600" size={20} />
            <h3 className="font-medium text-sm lg:text-base" style={{ color: 'hsl(var(--text-secondary))' }}>Total Enrollments</h3>
          </div>
          <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.ensemble.totalEnrollments}</div>
          <div className="text-xs lg:text-sm" style={{ color: 'hsl(var(--green-600))' }}>{forecastData.ensemble.trend} vs last year</div>
        </div>

        <div className="rounded-lg border p-4 lg:p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-3">
            <Target className="text-green-600" size={20} />
            <h3 className="font-medium text-sm lg:text-base" style={{ color: 'hsl(var(--text-secondary))' }}>Model Confidence</h3>
          </div>
          <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.ensemble.confidence}%</div>
          <div className="text-xs lg:text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Ensemble average</div>
        </div>

        <div className="rounded-lg border p-4 lg:p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="text-purple-600" size={20} />
            <h3 className="font-medium text-sm lg:text-base" style={{ color: 'hsl(var(--text-secondary))' }}>Revenue Impact</h3>
          </div>
          <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.ensemble.revenueImpact}</div>
          <div className="text-xs lg:text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Projected revenue</div>
        </div>

        <div className="rounded-lg border p-4 lg:p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="text-orange-600" size={20} />
            <h3 className="font-medium text-sm lg:text-base" style={{ color: 'hsl(var(--text-secondary))' }}>Model Accuracy</h3>
          </div>
          <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.ensemble.accuracy}</div>
          <div className="text-xs lg:text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Historical performance</div>
        </div>

        <div className="rounded-lg border p-4 lg:p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="text-gray-600" size={20} />
            <h3 className="font-medium text-sm lg:text-base" style={{ color: 'hsl(var(--text-secondary))' }}>{viewMode === 'business' ? 'Model Health' : 'MAPE Score'}</h3>
          </div>
          {viewMode === 'business' ? (
            <>
              <div className="text-lg font-bold mb-1" style={{ color: 'hsl(var(--green-600))' }}>Healthy</div>
              <div className="text-xs lg:text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>All models operational</div>
            </>
          ) : (
            <>
              <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.ensemble.mape}%</div>
              <div className="text-xs lg:text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Prediction error</div>
            </>
          )}
        </div>

        {viewMode === 'technical' && (
          <div className="rounded-lg border p-4 lg:p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
            <div className="flex items-center gap-2 mb-3">
              <Database className="text-indigo-600" size={20} />
              <h3 className="font-medium text-sm lg:text-base" style={{ color: 'hsl(var(--text-secondary))' }}>Model Agreement</h3>
            </div>
            <div className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.technicalMetrics.modelAgreement}%</div>
            <div className="text-xs lg:text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Cross-model consensus</div>
          </div>
        )}
      </div>

      {/* Model Comparison Section */}
      <div className="rounded-lg border mb-8" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
        <div className="flex items-center justify-between p-6 border-b cursor-pointer" onClick={() => toggleSection('models')} style={{ borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-3">
            <Brain className="text-blue-600" size={20} />
            <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>ML Model Comparison</h2>
            <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'hsl(var(--blue-100))', color: 'hsl(var(--blue-700))' }}>{Object.keys(forecastData.models).length + 1} Models</div>
          </div>
          {expandedSections.includes('models') ? <ChevronUp className="text-gray-400" size={20} /> : <ChevronDown className="text-gray-400" size={20} />}
        </div>

        {expandedSections.includes('models') && (
          <div className="p-6">
            <div className="grid grid-cols-4 gap-4 mb-6">
              {(
                Object.entries(forecastData.models) as Array<
                  ['neuralProphet' | 'xgboost' | 'lightgbm', ModelData]
                >
              ).map(([model, data]) => (
                <ModelCard key={model} title={model} data={data} />
              ))}

              {/* Ensemble Model Card */}
              <div className="p-4 rounded-lg border-2 bg-gray-50" style={{ borderColor: 'hsl(var(--slate-300))' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Ensemble</h3>
                  <div className="flex items-center gap-1">
                    <Layers size={14} className="text-gray-500" />
                    <span className="text-xs text-gray-500">Best</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Prediction</span>
                    <span className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.ensemble.totalEnrollments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Confidence</span>
                    <span className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.ensemble.confidence}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>MAPE</span>
                    <span className="font-bold" style={{ color: 'hsl(var(--green-700))' }}>{forecastData.ensemble.mape}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ensemble Performance */}
            <div className="rounded-lg p-4 border" style={{ backgroundColor: 'hsl(var(--blue-50))', borderColor: 'hsl(var(--blue-200))' }}>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="text-blue-600" size={16} />
                <h3 className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>Ensemble Model (Recommended)</h3>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div style={{ color: 'hsl(var(--text-secondary))' }}>Combined Prediction</div>
                  <div className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.ensemble.totalEnrollments}</div>
                </div>
                <div>
                  <div style={{ color: 'hsl(var(--text-secondary))' }}>Weighted Confidence</div>
                  <div className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.ensemble.confidence}%</div>
                </div>
                <div>
                  <div style={{ color: 'hsl(var(--text-secondary))' }}>Cross-validation MAPE</div>
                  <div className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.ensemble.mape}%</div>
                </div>
                <div>
                  <div style={{ color: 'hsl(var(--text-secondary))' }}>Prediction Interval</div>
                  <div className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>±{forecastData.ensemble.variance}</div>
                </div>
              </div>
              {viewMode === 'technical' && (
                <div className="mt-3 pt-3 border-t text-sm" style={{ borderColor: 'hsl(var(--blue-200))', color: 'hsl(var(--blue-800))' }}>
                  <strong>Technical:</strong> Weighted ensemble using {forecastData.technicalMetrics.ensembleSize} trees, {forecastData.technicalMetrics.walkForwardSteps} walk-forward validation steps, RMSE: {forecastData.technicalMetrics.rmse}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 mb-8">
        {/* Left Column - Forecast Chart */}
        <div className="xl:col-span-2">
          <ForecastChart />
        </div>

        {/* Right Column - Campus Performance */}
        <div className="rounded-lg border p-4 lg:p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <h3 className="text-base lg:text-lg font-semibold mb-4" style={{ color: 'hsl(var(--text-primary))' }}>🏫 Campus Performance</h3>
          <div className="space-y-3 lg:space-y-4">
            {forecastData.campusPerformance.map((campus, index) => (
              <div key={index} className="p-3 lg:p-4 border rounded-lg" style={{ borderColor: 'hsl(var(--card-border))' }}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm lg:text-base" style={{ color: 'hsl(var(--text-primary))' }}>{campus.campus}</h4>
                  <div className="flex items-center gap-1">
                    <ArrowUp size={14} className="text-green-600" />
                    <span className="text-xs lg:text-sm font-medium" style={{ color: 'hsl(var(--green-600))' }}>{campus.trendValue}%</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs lg:text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>Applications</span>
                    <span className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>{campus.applications}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>Conversion</span>
                    <span className="font-medium" style={{ color: 'hsl(var(--text-primary))' }}>{campus.conversionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>Forecast Accuracy</span>
                    <span className="font-medium" style={{ color: 'hsl(var(--green-700))' }}>{campus.accuracy}%</span>
                  </div>
                  <div className="flex justify-between border-t pt-2" style={{ borderColor: 'hsl(var(--surface-tertiary))' }}>
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>Revenue Forecast</span>
                    <span className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>£{(campus.revenueForecast / 1000).toFixed(0)}k</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Program-Level Forecasts */}
      <div className="rounded-lg border mb-8" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
        <div className="flex items-center justify-between p-6 border-b cursor-pointer" onClick={() => toggleSection('programs')} style={{ borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-3">
            <Users className="text-green-600" size={20} />
            <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Program-Level Forecasts</h2>
          </div>
          {expandedSections.includes('programs') ? <ChevronUp className="text-gray-400" size={20} /> : <ChevronDown className="text-gray-400" size={20} />}
        </div>

        {expandedSections.includes('programs') && (
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4">
              {forecastData.programs.map((program, index) => (
                <ProgramCard key={index} program={program} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Monthly Forecast Timeline */}
      <div className="rounded-lg border mb-8" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center gap-3">
            <Calendar className="text-purple-600" size={20} />
            <h2 className="text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Monthly Forecast Timeline</h2>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50" style={{ borderColor: 'hsl(var(--card-border))' }}>
            <Download size={16} />
            Export
          </button>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'hsl(var(--card-border))' }}>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Month</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Applications</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Actual Enrollments</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Predicted</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Confidence</th>
                  {viewMode === 'technical' && <th className="text-right py-3 px-4 font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Week ID</th>}
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.monthlyBreakdown.map((month, index) => (
                  <tr key={index} className="border-b" style={{ borderColor: 'hsl(var(--surface-tertiary))' }}>
                    <td className="py-3 px-4 font-medium" style={{ color: 'hsl(var(--text-primary))' }}>{month.month}</td>
                    <td className="py-3 px-4 text-right" style={{ color: 'hsl(var(--text-primary))' }}>{month.applications}</td>
                    <td className="py-3 px-4 text-right" style={{ color: 'hsl(var(--text-primary))' }}>{month.enrollments}</td>
                    <td className="py-3 px-4 text-right font-medium" style={{ color: 'hsl(var(--blue-600))' }}>{month.predicted}</td>
                    <td className="py-3 px-4 text-right" style={{ color: 'hsl(var(--text-secondary))' }}>{month.confidence}%</td>
                    {viewMode === 'technical' && <td className="py-3 px-4 text-right" style={{ color: 'hsl(var(--text-tertiary))' }}>{month.week}</td>}
                    <td className="py-3 px-4 text-right">
                      <span style={{ color: month.predicted > month.enrollments ? 'hsl(var(--green-600))' : 'hsl(var(--red-600))' }}>
                        {month.predicted > month.enrollments ? '+' : ''}
                        {month.predicted - month.enrollments}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Section - Feature Importance & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Key Prediction Factors */}
        <div className="rounded-lg border" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center justify-between p-4 lg:p-6 border-b" style={{ borderColor: 'hsl(var(--card-border))' }}>
            <div className="flex items-center gap-3">
              <Info className="text-orange-600" size={20} />
              <h2 className="text-lg lg:text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>Key Prediction Factors</h2>
              <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'hsl(var(--orange-100))', color: 'hsl(var(--orange-700))' }}>Feature Importance</div>
            </div>
          </div>

          <div className="p-4 lg:p-6">
            <div className="space-y-4">
              {forecastData.keyFactors.map((factor, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: factor.type === 'lag' ? 'hsl(var(--blue-500))' :
                                   factor.type === 'seasonal' ? 'hsl(var(--green-500))' :
                                   factor.type === 'behavioral' ? 'hsl(var(--orange-500))' :
                                   factor.type === 'location' ? 'hsl(var(--red-500))' :
                                   'hsl(var(--purple-500))'
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm lg:text-base block" style={{ color: 'hsl(var(--text-primary))' }}>{factor.factor}</span>
                      {viewMode === 'technical' && <div className="text-xs mt-1" style={{ color: 'hsl(var(--text-tertiary))' }}>{factor.description}</div>}
                      <span className="text-xs capitalize inline-block mt-1" style={{ color: 'hsl(var(--text-tertiary))' }}>({factor.type})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-24 sm:w-32 rounded-full h-2" style={{ backgroundColor: 'hsl(var(--surface-tertiary))' }}>
                      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${factor.impact * 100}%`, backgroundColor: 'hsl(var(--blue-600))' }} />
                    </div>
                    <span className="text-sm font-medium w-12 text-right" style={{ color: 'hsl(var(--text-primary))' }}>{(factor.impact * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>

            {viewMode === 'technical' && (
              <div className="mt-6 p-4 rounded border" style={{ backgroundColor: 'hsl(var(--surface-tertiary))', borderColor: 'hsl(var(--card-border))' }}>
                <div className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
                  <strong>Technical Insight:</strong> Historical offer patterns (34.2% importance) dominate predictions,
                  while seasonal factors (18.7%) show strong summer enrollment effects. Model uses {forecastData.technicalMetrics.featuresUsed}{' '}
                  engineered features across {forecastData.technicalMetrics.trainingWeeks} weeks of training data.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="rounded-lg border" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <div className="flex items-center justify-between p-4 lg:p-6 border-b" style={{ borderColor: 'hsl(var(--card-border))' }}>
            <div className="flex items-center gap-3">
              <Brain className="text-purple-600" size={20} />
              <h2 className="text-lg lg:text-xl font-semibold" style={{ color: 'hsl(var(--text-primary))' }}>AI Insights</h2>
              <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'hsl(var(--purple-100))', color: 'hsl(var(--purple-700))' }}>Real-time</div>
            </div>
          </div>

          <div className="p-4 lg:p-6">
            <div className="space-y-4">
              {forecastData.aiInsights.map((insight, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border"
                  style={{
                    backgroundColor: insight.status === 'positive' ? 'hsl(var(--green-50))' :
                                   insight.status === 'warning' ? 'hsl(var(--amber-50))' :
                                   insight.status === 'info' ? 'hsl(var(--blue-50))' :
                                   'hsl(var(--surface-tertiary))',
                    borderColor: insight.status === 'positive' ? 'hsl(var(--green-200))' :
                                insight.status === 'warning' ? 'hsl(var(--amber-200))' :
                                insight.status === 'info' ? 'hsl(var(--blue-200))' :
                                'hsl(var(--card-border))'
                  }}
                >
                  <div className="flex items-start gap-2">
                    {insight.status === 'positive' ? (
                      <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                    ) : insight.status === 'warning' ? (
                      <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    ) : insight.status === 'info' ? (
                      <TrendingUp size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <span className="mt-0.5 inline-block w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: 'hsl(var(--purple-400))' }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-medium text-sm lg:text-base"
                        style={{
                          color: insight.status === 'positive' ? 'hsl(var(--green-900))' :
                                 insight.status === 'warning' ? 'hsl(var(--amber-900))' :
                                 insight.status === 'info' ? 'hsl(var(--blue-900))' :
                                 'hsl(var(--purple-900))'
                        }}
                      >
                        {insight.title}
                      </div>
                      <div
                        className="text-sm mt-1"
                        style={{
                          color: insight.status === 'positive' ? 'hsl(var(--green-700))' :
                                 insight.status === 'warning' ? 'hsl(var(--amber-700))' :
                                 insight.status === 'info' ? 'hsl(var(--blue-700))' :
                                 'hsl(var(--purple-700))'
                        }}
                      >
                        {insight.description}
                      </div>
                      {viewMode === 'technical' && <div className="text-xs mt-2" style={{ color: 'hsl(var(--text-tertiary))' }}>Confidence: {insight.confidence}%</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {viewMode === 'technical' && (
              <div className="mt-6 space-y-2">
                <button 
                  className="w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200" 
                  style={{ backgroundColor: 'hsl(var(--slate-900))', color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--slate-800))'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--slate-900))'}
                >
                  <RefreshCw size={16} />
                  Retrain Models
                </button>
                <button 
                  className="w-full px-4 py-2 border rounded-lg flex items-center justify-center gap-2 transition-colors duration-200" 
                  style={{ borderColor: 'hsl(var(--card-border))', color: 'hsl(var(--text-secondary))' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--surface-tertiary))'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Settings size={16} />
                  Model Diagnostics
                </button>
                <button 
                  className="w-full px-4 py-2 border rounded-lg flex items-center justify-center gap-2 transition-colors duration-200" 
                  style={{ borderColor: 'hsl(var(--card-border))', color: 'hsl(var(--text-secondary))' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--surface-tertiary))'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Eye size={16} />
                  Hyperparameters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Technical Deep Dive (Only in Technical View) */}
      {viewMode === 'technical' && (
        <div className="mt-8 rounded-lg border p-6" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))' }}>
          <h3 className="text-xl font-bold mb-6" style={{ color: 'hsl(var(--text-primary))' }}>🔬 ML Pipeline Deep Dive</h3>

          <div className="grid grid-cols-4 gap-6 mb-6">
            <div className="text-center p-4 rounded-lg border" style={{ backgroundColor: 'hsl(var(--surface-tertiary))', borderColor: 'hsl(var(--card-border))' }}>
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.technicalMetrics.featuresUsed}</div>
              <div className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Features Engineered</div>
              <div className="text-xs mt-1" style={{ color: 'hsl(var(--text-tertiary))' }}>Lag + Seasonal + Behavioral</div>
            </div>
            <div className="text-center p-4 rounded-lg border" style={{ backgroundColor: 'hsl(var(--surface-tertiary))', borderColor: 'hsl(var(--card-border))' }}>
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>3</div>
              <div className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Ensemble Models</div>
              <div className="text-xs mt-1" style={{ color: 'hsl(var(--text-tertiary))' }}>Neural Prophet + XGBoost + LightGBM</div>
            </div>
            <div className="text-center p-4 rounded-lg border" style={{ backgroundColor: 'hsl(var(--surface-tertiary))', borderColor: 'hsl(var(--card-border))' }}>
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.technicalMetrics.trainingWeeks}</div>
              <div className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Training Weeks</div>
              <div className="text-xs mt-1" style={{ color: 'hsl(var(--text-tertiary))' }}>2022-2024 cycles</div>
            </div>
            <div className="text-center p-4 rounded-lg border" style={{ backgroundColor: 'hsl(var(--surface-tertiary))', borderColor: 'hsl(var(--card-border))' }}>
              <div className="text-2xl font-bold" style={{ color: 'hsl(var(--text-primary))' }}>15min</div>
              <div className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Scoring Frequency</div>
              <div className="text-xs mt-1" style={{ color: 'hsl(var(--text-tertiary))' }}>Auto-refresh</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="font-medium mb-3" style={{ color: 'hsl(var(--text-primary))' }}>Advanced Metrics</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Root Mean Square Error</span>
                  <span className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.technicalMetrics.rmse}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Directional Accuracy</span>
                  <span className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.technicalMetrics.directionalAccuracy}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Prediction Interval Coverage</span>
                  <span className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.technicalMetrics.predictionInterval}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Walk-forward Steps</span>
                  <span className="font-bold" style={{ color: 'hsl(var(--text-primary))' }}>{forecastData.technicalMetrics.walkForwardSteps}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3" style={{ color: 'hsl(var(--text-primary))' }}>System Status</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Last Training Run</span>
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-primary))' }}>31 Jul 2024</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Data Freshness</span>
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--green-700))' }}>Real-time</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Model Version</span>
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-primary))' }}>v2.4.1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>Prediction Horizon</span>
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-primary))' }}>12 weeks</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded border" style={{ backgroundColor: 'hsl(var(--surface-tertiary))', borderColor: 'hsl(var(--card-border))' }}>
            <div className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>
              <strong>Pipeline Process:</strong> Raw enrollment data → Feature engineering ({forecastData.technicalMetrics.featuresUsed} signals) →
              Ensemble prediction (Neural Prophet + XGBoost + LightGBM) → Cross-validation → Confidence scoring → Business intelligence layer →
              Real-time dashboard updates every 15 minutes
            </div>
          </div>
        </div>
      )}

      {/* Design System Label */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 text-xs font-mono px-3 py-1 rounded border shadow-sm z-10 hidden lg:block" style={{ backgroundColor: 'hsl(var(--surface-primary))', borderColor: 'hsl(var(--card-border))', color: 'hsl(var(--text-tertiary))' }}>
        ENHANCED FORECASTING: Business + Technical Views • Ensemble ML • Advanced Analytics
      </div>
    </div>
  );
};

export default EnhancedForecastingDashboard;