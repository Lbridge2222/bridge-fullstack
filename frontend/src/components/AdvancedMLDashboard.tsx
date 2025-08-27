import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Zap, 
  BarChart3, 
  TrendingUp, 
  Target, 
  Loader2,
  Play,
  Settings,
  Eye,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

// Types
interface MLModelConfig {
  model_type: string;
  features: string[];
  target_variable: string;
  test_size: number;
  random_state: number;
  hyperparameters: Record<string, any>;
  feature_selection: boolean;
  cross_validation_folds: number;
}

interface FeatureEngineeringConfig {
  create_lag_features: boolean;
  create_rolling_features: boolean;
  create_interaction_features: boolean;
  create_polynomial_features: boolean;
  feature_scaling: boolean;
  handle_missing_values: string;
}

interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc: number;
  feature_importance: Record<string, number>;
  training_time: number;
  cross_validation_scores: number[];
}

interface TrainedModel {
  model_id: string;
  performance: ModelPerformance;
  feature_count: number;
  feature_importance: Record<string, number>;
}

const AdvancedMLDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'training' | 'models' | 'predictions' | 'analysis'>('training');
  const [models, setModels] = useState<TrainedModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<string | null>(null);
  
  // Model configuration
  const [modelConfig, setModelConfig] = useState<MLModelConfig>({
    model_type: 'random_forest',
    features: [],
    target_variable: 'has_application',
    test_size: 0.2,
    random_state: 42,
    hyperparameters: {},
    feature_selection: true,
    cross_validation_folds: 5
  });
  
  // Feature engineering configuration
  const [featureConfig, setFeatureConfig] = useState<FeatureEngineeringConfig>({
    create_lag_features: true,
    create_rolling_features: true,
    create_interaction_features: true,
    create_polynomial_features: false,
    feature_scaling: true,
    handle_missing_values: 'impute'
  });
  
  // Training parameters
  const [trainingDataLimit, setTrainingDataLimit] = useState(1000);
  const [saveModel, setSaveModel] = useState(true);
  const [modelName, setModelName] = useState('');
  
  // Prediction data
  const [predictionData, setPredictionData] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [predictionResult, setPredictionResult] = useState<any>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const response = await fetch('http://localhost:8000/ai/advanced-ml/models');
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  };

  const trainModel = async () => {
    try {
      setLoading(true);
      setError(null);
      setTrainingStatus('Initializing training...');
      
      const request = {
        config: modelConfig,
        feature_config: featureConfig,
        training_data_limit: trainingDataLimit,
        save_model: saveModel,
        model_name: modelName || undefined
      };
      
      setTrainingStatus('Loading training data...');
      
      const response = await fetch('http://localhost:8000/ai/advanced-ml/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (response.ok) {
        const result = await response.json();
        setTrainingStatus('Training completed successfully!');
        setPredictionResult({
          success: true,
          model_id: result.model_id,
          performance: result.performance,
          message: `Model trained with ${result.training_samples} samples and ${result.feature_count} features`
        });
        
        // Reload models
        await loadModels();
        
        // Switch to models tab
        setActiveTab('models');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Training failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Training failed');
      setTrainingStatus('Training failed');
    } finally {
      setLoading(false);
    }
  };

  const makePrediction = async () => {
    if (!selectedModel || !predictionData.trim()) {
      setError('Please select a model and enter lead data');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const leadData = JSON.parse(predictionData);
      
      const response = await fetch('http://localhost:8000/ai/advanced-ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_data: leadData,
          model_id: selectedModel
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setPredictionResult(result);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Prediction failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const getModelTypeColor = (modelType: string | undefined) => {
    switch (modelType) {
      case 'random_forest': return 'bg-green-100 text-green-800';
      case 'gradient_boosting': return 'bg-blue-100 text-blue-800';
      case 'logistic_regression': return 'bg-purple-100 text-purple-800';
      case 'ensemble': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (value: number) => {
    if (value >= 0.8) return 'text-green-600';
    if (value >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Chart Components
  const FeatureImportanceChart = ({ featureImportance }: { featureImportance: Record<string, number> }) => {
    const sortedFeatures = Object.entries(featureImportance)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    const maxImportance = Math.max(...Object.values(featureImportance));
    
    return (
      <div className="space-y-3">
        <h4 className="font-medium">Top 10 Feature Importance</h4>
        {sortedFeatures.map(([feature, importance]) => (
          <div key={feature} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="truncate">{feature}</span>
              <span className="font-medium">{importance.toFixed(3)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${(importance / maxImportance) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const PerformanceMetricsChart = ({ performance }: { performance: ModelPerformance }) => {
    const metrics = [
      { label: 'Accuracy', value: performance.accuracy, color: 'bg-blue-500' },
      { label: 'Precision', value: performance.precision, color: 'bg-green-500' },
      { label: 'Recall', value: performance.recall, color: 'bg-yellow-500' },
      { label: 'F1 Score', value: performance.f1_score, color: 'bg-purple-500' },
      { label: 'ROC AUC', value: performance.roc_auc, color: 'bg-orange-500' }
    ];
    
    return (
      <div className="space-y-4">
        <h4 className="font-medium">Performance Metrics</h4>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <div className={`w-16 h-16 mx-auto rounded-full ${metric.color} flex items-center justify-center text-white font-bold text-lg`}>
                {(metric.value * 100).toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Advanced ML Intelligence</h1>
        <p className="text-muted-foreground">
          Phase 4.2: Deep Learning, Feature Engineering & Model Training for Lead Intelligence
        </p>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="training">Model Training</TabsTrigger>
          <TabsTrigger value="models">Trained Models</TabsTrigger>
          <TabsTrigger value="predictions">Make Predictions</TabsTrigger>
          <TabsTrigger value="analysis">Feature Analysis</TabsTrigger>
        </TabsList>

        {/* Model Training Tab */}
        <TabsContent value="training" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Model Configuration
                </CardTitle>
                <CardDescription>Configure ML model parameters and architecture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Model Type</Label>
                  <Select value={modelConfig.model_type} onValueChange={(value) => setModelConfig({...modelConfig, model_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random_forest">Random Forest</SelectItem>
                      <SelectItem value="gradient_boosting">Gradient Boosting</SelectItem>
                      <SelectItem value="logistic_regression">Logistic Regression</SelectItem>
                      <SelectItem value="ensemble">Ensemble (All Models)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Test Size</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    min="0.1" 
                    max="0.5"
                    value={modelConfig.test_size}
                    onChange={(e) => setModelConfig({...modelConfig, test_size: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cross-Validation Folds</Label>
                  <Input 
                    type="number" 
                    min="3" 
                    max="10"
                    value={modelConfig.cross_validation_folds}
                    onChange={(e) => setModelConfig({...modelConfig, cross_validation_folds: parseInt(e.target.value)})}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="feature-selection"
                    checked={modelConfig.feature_selection}
                    onCheckedChange={(checked) => setModelConfig({...modelConfig, feature_selection: checked === true})}
                  />
                  <Label htmlFor="feature-selection">Enable Feature Selection</Label>
                </div>
              </CardContent>
            </Card>

            {/* Feature Engineering Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Feature Engineering
                </CardTitle>
                <CardDescription>Configure advanced feature creation and preprocessing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="lag-features"
                    checked={featureConfig.create_lag_features}
                    onCheckedChange={(checked) => setFeatureConfig({...featureConfig, create_lag_features: checked === true})}
                  />
                  <Label htmlFor="lag-features">Temporal Features</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="interaction-features"
                    checked={featureConfig.create_interaction_features}
                    onCheckedChange={(checked) => setFeatureConfig({...featureConfig, create_interaction_features: checked === true})}
                  />
                  <Label htmlFor="interaction-features">Interaction Features</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="polynomial-features"
                    checked={featureConfig.create_polynomial_features}
                    onCheckedChange={(checked) => setFeatureConfig({...featureConfig, create_polynomial_features: checked === true})}
                  />
                  <Label htmlFor="polynomial-features">Polynomial Features</Label>
                </div>

                <div className="space-y-2">
                  <Label>Missing Values Handling</Label>
                  <Select value={featureConfig.handle_missing_values} onValueChange={(value) => setFeatureConfig({...featureConfig, handle_missing_values: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="impute">Impute (Median)</SelectItem>
                      <SelectItem value="zero">Fill with Zero</SelectItem>
                      <SelectItem value="drop">Drop Rows</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Training Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Training Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Training Data Limit</Label>
                  <Input 
                    type="number" 
                    min="100" 
                    max="10000"
                    value={trainingDataLimit}
                    onChange={(e) => setTrainingDataLimit(parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Model Name (Optional)</Label>
                  <Input 
                    placeholder="my_advanced_model"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="save-model"
                    checked={saveModel}
                    onCheckedChange={(checked) => setSaveModel(checked === true)}
                  />
                  <Label htmlFor="save-model">Save Model</Label>
                </div>
              </div>

              <Button 
                onClick={trainModel} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Training...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Train Advanced ML Model
                  </>
                )}
              </Button>

              {trainingStatus && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                    <span>{trainingStatus}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trained Models Tab */}
        <TabsContent value="models" className="space-y-6">
          {models.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No trained models available</p>
                <p className="text-sm">Train your first model in the Training tab</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {models.map((model) => (
                <Card key={model.model_id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="truncate">{model.model_id}</span>
                      <Badge className={getModelTypeColor(model.model_id.split('_')[0])}>
                        {model.model_id.split('_')[0]}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {model.feature_count} features • Trained {new Date().toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <PerformanceMetricsChart performance={model.performance} />
                    <FeatureImportanceChart featureImportance={model.feature_importance} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Lead Data Input
                </CardTitle>
                <CardDescription>Enter lead data in JSON format for prediction</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a trained model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.model_id} value={model.model_id}>
                          {model.model_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Lead Data (JSON)</Label>
                  <Textarea 
                    placeholder='{"lead_score": 85, "created_at": "2025-08-25T20:54:54.847757+00:00", "source": "UCAS"}'
                    value={predictionData}
                    onChange={(e) => setPredictionData(e.target.value)}
                    rows={8}
                  />
                </div>

                <Button 
                  onClick={makePrediction} 
                  disabled={loading || !selectedModel || !predictionData.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Predicting...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Make Prediction
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Prediction Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {predictionResult ? (
                  <div className="space-y-4">
                    {predictionResult.success ? (
                      <>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle className="h-5 w-5" />
                            <span className="font-medium">Training Successful!</span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">{predictionResult.message}</p>
                        </div>
                        
                        {predictionResult.performance && (
                          <div className="space-y-3">
                            <h4 className="font-medium">Model Performance</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>Accuracy: <span className={getPerformanceColor(predictionResult.performance.accuracy)}>{(predictionResult.performance.accuracy * 100).toFixed(1)}%</span></div>
                              <div>Precision: <span className={getPerformanceColor(predictionResult.performance.precision)}>{(predictionResult.performance.precision * 100).toFixed(1)}%</span></div>
                              <div>Recall: <span className={getPerformanceColor(predictionResult.performance.recall)}>{(predictionResult.performance.recall * 100).toFixed(1)}%</span></div>
                              <div>F1 Score: <span className={getPerformanceColor(predictionResult.performance.f1_score)}>{(predictionResult.performance.f1_score * 100).toFixed(1)}%</span></div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 text-red-800">
                          <AlertCircle className="h-5 w-5" />
                          <span className="font-medium">Training Failed</span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">{predictionResult.message}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter lead data and select a model to make predictions</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feature Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Feature Analysis & Insights
              </CardTitle>
              <CardDescription>Deep analysis of feature importance and model performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Feature analysis will be available after training models</p>
                <p className="text-sm">Train a model first to see detailed feature insights</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground pt-6 border-t">
        <p>Phase 4.2: Advanced Machine Learning Models - Bridge CRM AI Intelligence Layer</p>
        <p className="mt-2">
          <span className="font-medium">Status:</span> ✅ Advanced ML pipeline with deep learning & feature engineering
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          🎯 Random Forest • Gradient Boosting • Logistic Regression • Ensemble Models • Feature Engineering
        </p>
      </div>
    </div>
  );
};

export default AdvancedMLDashboard;
