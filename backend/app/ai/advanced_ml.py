from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional, Any, Union
from datetime import datetime, timedelta
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, roc_auc_score, precision_recall_curve
from sklearn.feature_selection import SelectKBest, f_classif
import joblib
import os
from pathlib import Path
from app.db.db import fetch, fetchrow, execute

router = APIRouter(prefix="/ai/advanced-ml", tags=["advanced-ml"])

# Advanced ML Models and Configuration
class MLModelConfig(BaseModel):
    model_type: str  # "random_forest", "gradient_boosting", "logistic_regression", "ensemble"
    features: List[str]
    target_variable: str = "has_application"
    test_size: float = 0.2
    random_state: int = 42
    hyperparameters: Dict[str, Any] = {}
    feature_selection: bool = True
    cross_validation_folds: int = 5

class FeatureEngineeringConfig(BaseModel):
    create_lag_features: bool = True
    create_rolling_features: bool = True
    create_interaction_features: bool = True
    create_polynomial_features: bool = False
    feature_scaling: bool = True
    handle_missing_values: str = "impute"  # "impute", "drop", "zero"

class ModelTrainingRequest(BaseModel):
    config: MLModelConfig
    feature_config: FeatureEngineeringConfig
    training_data_limit: Optional[int] = 1000
    save_model: bool = True
    model_name: Optional[str] = None

class ModelPerformance(BaseModel):
    model_name: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    feature_importance: Dict[str, float]
    training_time: float
    prediction_time: float
    cross_validation_scores: List[float]
    generated_at: datetime

class AdvancedMLResponse(BaseModel):
    model_performance: ModelPerformance
    predictions: List[Dict[str, Any]]
    confidence_scores: List[float]
    feature_analysis: Dict[str, Any]
    model_insights: List[str]
    recommendations: List[str]
    generated_at: datetime

# Global model storage
MODEL_STORAGE_PATH = Path(__file__).parent.parent.parent / "models"
MODEL_STORAGE_PATH.mkdir(exist_ok=True)

# Model registry
model_registry = {}

class AdvancedMLPipeline:
    """Advanced Machine Learning Pipeline for Lead Intelligence"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_selector = None
        self.models = {}
        self.feature_names = []
        
    async def load_training_data(self, limit: int = 1000) -> pd.DataFrame:
        """Load lead data for training from database"""
        try:
            print(f"🔍 Querying database for up to {limit} leads...")
            
            # Query enriched lead data using actual schema
            query = """
            SELECT 
                p.id, p.first_name, p.last_name, p.email, p.phone,
                p.lead_score, p.lifecycle_state, p.created_at,
                p.engagement_score, p.conversion_probability::double precision as conversion_probability,
                p.touchpoint_count, p.status,
                (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0)::double precision as days_since_creation,
                CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as target,
                COALESCE(a.source, 'unknown') as source,
                COALESCE(pr.name, 'unknown') as course_declared,
                COALESCE(c.name, 'unknown') as campus_preference,
                CASE 
                    WHEN p.engagement_score >= 80 THEN 'high'
                    WHEN p.engagement_score >= 50 THEN 'medium'
                    ELSE 'low'
                END as engagement_level
            FROM people p
            LEFT JOIN applications a ON p.id = a.person_id
            LEFT JOIN programmes pr ON a.programme_id = pr.id
            LEFT JOIN campuses c ON pr.campus_id = c.id
            WHERE p.lifecycle_state = 'lead'
            ORDER BY p.created_at DESC
            LIMIT %s
            """
            
            print(f"📝 Executing query: {query}")
            # Pass scalar param; our fetch packs *args, so (limit,) became a string "(1000)"
            # Use a single positional arg to map to %s properly
            results = await fetch(query, limit)
            print(f"📊 Query returned {len(results) if results else 0} results")
            
            if not results:
                raise ValueError("No training data available")
            
            print(f"📋 First result sample: {results[0] if results else 'None'}")
            
            # Convert to DataFrame with proper column handling
            df = pd.DataFrame(results)
            print(f"✅ DataFrame created with shape: {df.shape}")
            print(f"📋 DataFrame columns: {list(df.columns)}")
            print(f"📋 DataFrame dtypes: {df.dtypes.to_dict()}")
            
            # Ensure numeric dtypes for numeric-like columns
            if 'days_since_creation' in df.columns:
                df['days_since_creation'] = pd.to_numeric(df['days_since_creation'], errors='coerce')
            if 'conversion_probability' in df.columns:
                df['conversion_probability'] = pd.to_numeric(df['conversion_probability'], errors='coerce')

            # Basic data cleaning
            print(f"🧹 Cleaning data...")
            print(f"📊 Before cleaning - rows: {len(df)}")
            print(f"📊 Missing lead_score: {df['lead_score'].isna().sum()}")
            print(f"📊 Missing target: {df['target'].isna().sum()}")
            
            df = df.dropna(subset=['lead_score', 'target'])
            df['target'] = df['target'].astype(int)
            
            print(f"✅ After cleaning - rows: {len(df)}")
            print(f"📊 Target distribution: {df['target'].value_counts().to_dict()}")
            
            return df
            
        except Exception as e:
            import traceback
            print(f"❌ Error in load_training_data: {str(e)}")
            print(f"📋 Full traceback: {traceback.format_exc()}")
            raise Exception(f"Failed to load training data: {str(e)}")
    
    def engineer_features(self, df: pd.DataFrame, config: FeatureEngineeringConfig) -> pd.DataFrame:
        """Advanced feature engineering for lead intelligence"""
        
        df_engineered = df.copy()
        
        # 1. Temporal Features
        if config.create_lag_features:
            df_engineered['created_month'] = pd.to_datetime(df_engineered['created_at']).dt.month
            df_engineered['created_day_of_week'] = pd.to_datetime(df_engineered['created_at']).dt.dayofweek
            df_engineered['created_hour'] = pd.to_datetime(df_engineered['created_at']).dt.hour
            
            # Academic calendar features
            df_engineered['academic_week'] = pd.to_datetime(df_engineered['created_at']).dt.isocalendar().week
            df_engineered['is_application_season'] = df_engineered['created_month'].isin([9, 10, 11, 12, 1, 2]).astype(int)
        
        # 2. Score-based Features
        df_engineered['score_squared'] = df_engineered['lead_score'] ** 2
        df_engineered['score_log'] = np.log1p(df_engineered['lead_score'])
        df_engineered['score_percentile'] = df_engineered['lead_score'].rank(pct=True)
        
        # Engagement features
        if 'engagement_score' in df_engineered.columns:
            df_engineered['engagement_squared'] = df_engineered['engagement_score'] ** 2
            df_engineered['engagement_percentile'] = df_engineered['engagement_score'].rank(pct=True)
        
        # Touchpoint features
        if 'touchpoint_count' in df_engineered.columns:
            df_engineered['touchpoint_log'] = np.log1p(df_engineered['touchpoint_count'])
            df_engineered['touchpoint_percentile'] = df_engineered['touchpoint_count'].rank(pct=True)
        
        # 3. Categorical Features
        categorical_features = ['lifecycle_state', 'source', 'campus_preference', 'engagement_level', 'status']
        for feature in categorical_features:
            if feature in df_engineered.columns and df_engineered[feature].dtype == 'object':
                le = LabelEncoder()
                df_engineered[f'{feature}_encoded'] = le.fit_transform(df_engineered[feature].fillna('unknown'))
                self.label_encoders[feature] = le
        
        # 4. Interaction Features
        if config.create_interaction_features:
            df_engineered['score_engagement_interaction'] = df_engineered['lead_score'] * df_engineered.get('engagement_level_encoded', 1)
            df_engineered['score_time_interaction'] = df_engineered['lead_score'] * df_engineered['days_since_creation']
            
            # Additional interactions
            if 'engagement_score' in df_engineered.columns:
                df_engineered['score_engagement_score_interaction'] = df_engineered['lead_score'] * df_engineered['engagement_score']
            
            if 'touchpoint_count' in df_engineered.columns:
                df_engineered['score_touchpoint_interaction'] = df_engineered['lead_score'] * df_engineered['touchpoint_count']
        
        # 5. Polynomial Features
        if config.create_polynomial_features:
            df_engineered['score_cubed'] = df_engineered['lead_score'] ** 3
            df_engineered['days_squared'] = df_engineered['days_since_creation'] ** 2
        
        # 6. Handle Missing Values
        if config.handle_missing_values == "impute":
            numeric_columns = df_engineered.select_dtypes(include=[np.number]).columns
            df_engineered[numeric_columns] = df_engineered[numeric_columns].fillna(df_engineered[numeric_columns].median())
        elif config.handle_missing_values == "zero":
            df_engineered = df_engineered.fillna(0)
        else:  # drop
            df_engineered = df_engineered.dropna()
        
        return df_engineered
    
    def select_features(self, X: pd.DataFrame, y: pd.Series, k: int = 20) -> pd.DataFrame:
        """Feature selection using statistical tests"""
        try:
            self.feature_selector = SelectKBest(score_func=f_classif, k=min(k, X.shape[1]))
            X_selected = self.feature_selector.fit_transform(X, y)
            
            # Get selected feature names
            selected_features = X.columns[self.feature_selector.get_support()].tolist()
            self.feature_names = selected_features
            
            return pd.DataFrame(X_selected, columns=selected_features)
        except Exception as e:
            print(f"Feature selection failed: {e}")
            return X
    
    def train_model(self, X: pd.DataFrame, y: pd.Series, config: MLModelConfig) -> Any:
        """Train advanced ML model based on configuration"""
        
        start_time = datetime.now()
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=config.test_size, random_state=config.random_state, stratify=y
        )
        
        # Scale features
        if config.feature_selection:
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
        else:
            X_train_scaled = X_train
            X_test_scaled = X_test
        
        # Initialize model based on type
        if config.model_type == "random_forest":
            model = RandomForestClassifier(
                n_estimators=config.hyperparameters.get('n_estimators', 100),
                max_depth=config.hyperparameters.get('max_depth', 10),
                random_state=config.random_state,
                class_weight='balanced'  # Add class balancing
            )
        elif config.model_type == "gradient_boosting":
            model = GradientBoostingClassifier(
                n_estimators=config.hyperparameters.get('n_estimators', 100),
                learning_rate=config.hyperparameters.get('learning_rate', 0.1),
                max_depth=config.hyperparameters.get('max_depth', 3),
                random_state=config.random_state
            )
        elif config.model_type == "logistic_regression":
            model = LogisticRegression(
                C=config.hyperparameters.get('C', 1.0),
                max_iter=config.hyperparameters.get('max_iter', 1000),
                random_state=config.random_state,
                class_weight='balanced'  # Add class balancing
            )
        elif config.model_type == "ensemble":
            # Create ensemble of multiple models
            models = [
                RandomForestClassifier(n_estimators=50, random_state=config.random_state),
                GradientBoostingClassifier(n_estimators=50, random_state=config.random_state),
                LogisticRegression(random_state=config.random_state)
            ]
            model = EnsembleModel(models)
        else:
            raise ValueError(f"Unsupported model type: {config.model_type}")
        
        # Train model
        model.fit(X_train_scaled, y_train)
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=config.cross_validation_folds)
        
        # Predictions
        y_pred = model.predict(X_test_scaled)
        y_pred_proba = model.predict_proba(X_test_scaled)[:, 1] if hasattr(model, 'predict_proba') else None
        
        # Performance metrics
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
        
        performance = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred, zero_division=0),
            'recall': recall_score(y_test, y_pred, zero_division=0),
            'f1_score': f1_score(y_test, y_pred, zero_division=0),
            'roc_auc': roc_auc_score(y_test, y_pred_proba) if y_pred_proba is not None else 0.5,
            'cross_validation_scores': cv_scores.tolist(),
            'training_time': (datetime.now() - start_time).total_seconds()
        }
        
        # Feature importance
        if hasattr(model, 'feature_importances_'):
            feature_importance = dict(zip(self.feature_names, model.feature_importances_))
        elif hasattr(model, 'coef_'):
            feature_importance = dict(zip(self.feature_names, np.abs(model.coef_[0])))
        else:
            feature_importance = {}
        
        # Store model
        model_id = f"{config.model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.models[model_id] = {
            'model': model,
            'scaler': self.scaler,
            'feature_selector': self.feature_selector,
            'feature_names': self.feature_names,
            'performance': performance,
            'feature_importance': feature_importance
        }
        
        return model_id, performance
    
    def predict(self, lead_data: Dict[str, Any], model_id: Optional[str] = None) -> Dict[str, Any]:
        """Make predictions using trained model"""

        # Use specified model or active model
        if model_id is None:
            active_model = get_active_model()
            if not active_model:
                raise ValueError("No active model available")
            model_id = active_model_id
        elif model_id not in self.models:
            raise ValueError(f"Model {model_id} not found")
        
        model_info = self.models[model_id]
        model = model_info['model']
        scaler = model_info['scaler']
        feature_names = model_info['feature_names']
        
        # Prepare features
        features = self.prepare_features_for_prediction(lead_data, feature_names)
        
        # Scale features - ensure proper feature alignment
        features_array = np.array(features).reshape(1, -1)
        features_scaled = scaler.transform(features_array)
        
        # Make prediction
        start_time = datetime.now()
        prediction = model.predict(features_scaled)[0]
        prediction_proba = model.predict_proba(features_scaled)[0] if hasattr(model, 'predict_proba') else None
        
        # Apply probability calibration to spread out the scores
        if prediction_proba is not None:
            # Simple sigmoid calibration to spread probabilities
            raw_prob = prediction_proba[1]
            calibrated_prob = 1 / (1 + np.exp(-2 * (raw_prob - 0.5)))
            # Ensure probabilities are in reasonable range
            calibrated_prob = max(0.05, min(0.95, calibrated_prob))
        else:
            calibrated_prob = 0.5
        
        prediction_time = (datetime.now() - start_time).total_seconds()
        
        return {
            'prediction': int(prediction),
            'probability': float(calibrated_prob),
            'confidence': float(max(prediction_proba)) if prediction_proba is not None else 0.5,
            'prediction_time': prediction_time
        }
    
    def prepare_features_for_prediction(self, lead_data: Dict[str, Any], feature_names: List[str]) -> List[float]:
        """Prepare lead data for model prediction - comprehensive feature engineering"""
        
        features = []
        for feature in feature_names:
            try:
                if feature == 'lead_score':
                    features.append(lead_data.get('lead_score', 0))
                elif feature == 'days_since_creation':
                    days = lead_data.get('days_since_creation', 0)
                    features.append(float(days) if days is not None else 0.0)
                elif feature == 'score_squared':
                    score = lead_data.get('lead_score', 0)
                    features.append(score ** 2)
                elif feature == 'score_log':
                    score = lead_data.get('lead_score', 0)
                    features.append(np.log1p(score))
                elif feature == 'score_percentile':
                    # For prediction, we'll use a normalized score
                    score = lead_data.get('lead_score', 0)
                    features.append(score / 100.0)  # Normalize to 0-1 range
                elif feature == 'created_month':
                    created_at = lead_data.get('created_at')
                    if created_at:
                        features.append(pd.to_datetime(created_at).month)
                    else:
                        features.append(1)
                elif feature == 'created_day_of_week':
                    created_at = lead_data.get('created_at')
                    if created_at:
                        features.append(pd.to_datetime(created_at).dayofweek)
                    else:
                        features.append(0)
                elif feature == 'created_hour':
                    created_at = lead_data.get('created_at')
                    if created_at:
                        features.append(pd.to_datetime(created_at).hour)
                    else:
                        features.append(12)
                elif feature == 'academic_week':
                    created_at = lead_data.get('created_at')
                    if created_at:
                        features.append(pd.to_datetime(created_at).isocalendar().week)
                    else:
                        features.append(1)
                elif feature == 'is_application_season':
                    created_at = lead_data.get('created_at')
                    if created_at:
                        month = pd.to_datetime(created_at).month
                        features.append(1 if month in [9, 10, 11, 12, 1, 2] else 0)
                    else:
                        features.append(0)
                elif feature == 'engagement_score':
                    features.append(lead_data.get('engagement_score', 0))
                elif feature == 'engagement_squared':
                    engagement = lead_data.get('engagement_score', 0)
                    features.append(engagement ** 2)
                elif feature == 'engagement_percentile':
                    engagement = lead_data.get('engagement_score', 0)
                    features.append(engagement / 100.0)  # Normalize to 0-1 range
                elif feature == 'touchpoint_count':
                    features.append(lead_data.get('touchpoint_count', 0))
                elif feature == 'touchpoint_log':
                    touchpoints = lead_data.get('touchpoint_count', 0)
                    features.append(np.log1p(touchpoints))
                elif feature == 'touchpoint_percentile':
                    touchpoints = lead_data.get('touchpoint_count', 0)
                    features.append(touchpoints / 10.0)  # Normalize assuming max ~10 touchpoints
                elif feature == 'lifecycle_state_encoded':
                    # Encode lifecycle state
                    lifecycle = lead_data.get('lifecycle_state', 'unknown')
                    if lifecycle == 'lead': features.append(0)
                    elif lifecycle == 'applicant': features.append(1)
                    elif lifecycle == 'student': features.append(2)
                    else: features.append(0)
                elif feature == 'source_encoded':
                    # Encode source
                    source = lead_data.get('source', 'unknown')
                    if source == 'website': features.append(0)
                    elif source == 'referral': features.append(1)
                    elif source == 'social': features.append(2)
                    elif source == 'email': features.append(3)
                    else: features.append(0)
                elif feature == 'campus_preference_encoded':
                    # Encode campus preference
                    campus = lead_data.get('campus_preference', 'unknown')
                    if campus == 'london': features.append(0)
                    elif campus == 'manchester': features.append(1)
                    elif campus == 'birmingham': features.append(2)
                    else: features.append(0)
                elif feature == 'engagement_level_encoded':
                    # Encode engagement level
                    engagement = lead_data.get('engagement_score', 0)
                    if engagement >= 80: features.append(2)  # high
                    elif engagement >= 50: features.append(1)  # medium
                    else: features.append(0)  # low
                elif feature == 'status_encoded':
                    # Encode status
                    status = lead_data.get('status', 'unknown')
                    if status == 'new': features.append(0)
                    elif status == 'contacted': features.append(1)
                    elif status == 'qualified': features.append(2)
                    elif status == 'converted': features.append(3)
                    else: features.append(0)
                elif feature == 'score_engagement_interaction':
                    score = lead_data.get('lead_score', 0)
                    engagement = lead_data.get('engagement_score', 0)
                    features.append(score * (engagement / 100.0))
                elif feature == 'score_time_interaction':
                    score = lead_data.get('lead_score', 0)
                    days = lead_data.get('days_since_creation', 0)
                    features.append(score * days)
                elif feature == 'score_engagement_score_interaction':
                    score = lead_data.get('lead_score', 0)
                    engagement = lead_data.get('engagement_score', 0)
                    features.append(score * engagement)
                elif feature == 'score_touchpoint_interaction':
                    score = lead_data.get('lead_score', 0)
                    touchpoints = lead_data.get('touchpoint_count', 0)
                    features.append(score * touchpoints)
                elif feature == 'score_cubed':
                    score = lead_data.get('lead_score', 0)
                    features.append(score ** 3)
                elif feature == 'days_squared':
                    days = lead_data.get('days_since_creation', 0)
                    features.append(days ** 2)
                else:
                    # For any other features, try to get from lead_data or use sensible defaults
                    if feature in lead_data:
                        value = lead_data[feature]
                        if isinstance(value, (int, float)):
                            features.append(float(value))
                        else:
                            features.append(0.0)
                    else:
                        # Default value for unknown features
                        features.append(0.0)
            except Exception as e:
                print(f"⚠️ Feature preparation failed for {feature}: {e}")
                features.append(0.0)
        
        return features

class EnsembleModel:
    """Ensemble model combining multiple ML algorithms"""
    
    def __init__(self, models: List[Any]):
        self.models = models
    
    def fit(self, X, y):
        for model in self.models:
            model.fit(X, y)
    
    def predict(self, X):
        predictions = [model.predict(X) for model in self.models]
        # Simple voting
        return np.mean(predictions, axis=0) > 0.5
    
    def predict_proba(self, X):
        probas = []
        for model in self.models:
            if hasattr(model, 'predict_proba'):
                probas.append(model.predict_proba(X))
            else:
                # For models without predict_proba, create binary probabilities
                pred = model.predict(X)
                proba = np.zeros((len(pred), 2))
                proba[:, 1] = pred.astype(float)
                proba[:, 0] = 1 - proba[:, 1]
                probas.append(proba)
        
        if probas:
            # Average probabilities
            return np.mean(probas, axis=0)
        else:
            # Fallback
            pred = self.predict(X)
            proba = np.zeros((len(pred), 2))
            proba[:, 1] = pred.astype(float)
            proba[:, 0] = 1 - proba[:, 1]
            return proba

# Initialize pipeline
ml_pipeline = AdvancedMLPipeline()

# Active model tracking
active_model_id = None

def get_active_model():
    """Get the currently active model"""
    global active_model_id
    if active_model_id and active_model_id in ml_pipeline.models:
        return ml_pipeline.models[active_model_id]
    # Auto-select latest model if none active
    if ml_pipeline.models:
        latest_model_id = max(ml_pipeline.models.keys())
        active_model_id = latest_model_id
        return ml_pipeline.models[latest_model_id]
    return None

def load_latest_model():
    """Load the latest saved model on startup"""
    import os
    if os.path.exists(MODEL_STORAGE_PATH):
        model_files = list(MODEL_STORAGE_PATH.glob("*.joblib"))
        if model_files:
            latest_model_file = max(model_files, key=lambda f: f.stat().st_mtime)
            try:
                import joblib
                model_data = joblib.load(latest_model_file)
                model_id = latest_model_file.stem
                ml_pipeline.models[model_id] = {
                    'model': model_data['model'],
                    'scaler': model_data['scaler'],
                    'feature_selector': model_data.get('feature_selector'),
                    'feature_names': model_data['feature_names'],
                    'performance': model_data['performance'],
                    'feature_importance': model_data['feature_importance']
                }
                global active_model_id
                active_model_id = model_id
                print(f"✅ Loaded latest model: {model_id}")
                return True
            except Exception as e:
                print(f"❌ Failed to load model {latest_model_file}: {e}")
    return False

# Load latest model on startup
load_latest_model()

# API Endpoints
@router.post("/train")
async def train_advanced_model(request: ModelTrainingRequest):
    """Train advanced ML model with feature engineering"""
    try:
        print(f"🚀 Starting ML training with config: {request.config.model_type}")
        
        # Load training data
        print("📊 Loading training data...")
        df = await ml_pipeline.load_training_data(request.training_data_limit)
        print(f"✅ Loaded {len(df)} training samples")
        print(f"📋 DataFrame shape: {df.shape}")
        print(f"📋 DataFrame columns: {list(df.columns)}")
        
        # Engineer features
        print("🔧 Engineering features...")
        df_engineered = ml_pipeline.engineer_features(df, request.feature_config)
        print(f"✅ Engineered features shape: {df_engineered.shape}")
        
        # Prepare features and target: keep only numeric columns for modeling
        feature_columns = [col for col in df_engineered.columns if col not in ['id', 'target', 'created_at', 'first_name', 'last_name', 'email', 'phone', 'source', 'course_declared', 'campus_preference', 'lifecycle_state', 'engagement_level', 'status']]
        X = df_engineered[feature_columns].select_dtypes(include=[np.number])
        y = df_engineered['target']
        
        print(f"🎯 Features: {len(feature_columns)} columns")
        print(f"🎯 Target distribution: {y.value_counts().to_dict()}")
        
        # Feature selection
        if request.config.feature_selection:
            print("🔍 Performing feature selection...")
            try:
                X = ml_pipeline.select_features(X, y)
                print(f"✅ Selected {X.shape[1]} features")
            except Exception as e:
                print(f"⚠️  Feature selection skipped due to error: {e}")
        
        # Train model
        print(f"🤖 Training {request.config.model_type} model...")
        model_id, performance = ml_pipeline.train_model(X, y, request.config)
        print(f"✅ Model trained successfully: {model_id}")
        
        # Save model if requested
        if request.save_model:
            model_name = request.model_name or f"advanced_ml_{model_id}"
            model_path = MODEL_STORAGE_PATH / f"{model_name}.joblib"
            
            model_info = ml_pipeline.models[model_id]
            model_data = {
                'model': model_info['model'],
                'scaler': model_info['scaler'],
                'feature_selector': model_info['feature_selector'],
                'feature_names': model_info['feature_names'],
                'performance': model_info['performance'],
                'feature_importance': model_info['feature_importance']
            }
            
            joblib.dump(model_data, model_path)
            print(f"💾 Model saved to: {model_path}")
        
        return {
            "model_id": model_id,
            "performance": performance,
            "feature_count": len(ml_pipeline.feature_names),
            "training_samples": len(df),
            "model_saved": request.save_model
        }
        
    except Exception as e:
        import traceback
        print(f"❌ Training failed with error: {str(e)}")
        print(f"📋 Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@router.post("/predict")
async def predict_lead_conversion(lead_data: Dict[str, Any], model_id: Optional[str] = None):
    """Predict lead conversion probability using trained model"""
    try:
        prediction = ml_pipeline.predict(lead_data, model_id)
        
        # Generate insights
        insights = generate_ml_insights(lead_data, prediction, model_id)
        
        return {
            "prediction": prediction,
            "insights": insights,
            "model_id": model_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.get("/models")
async def list_trained_models():
    """List all trained models"""
    try:
        models = []
        for model_id, model_info in ml_pipeline.models.items():
            models.append({
                "model_id": model_id,
                "performance": model_info['performance'],
                "feature_count": len(model_info['feature_names']),
                "feature_importance": model_info['feature_importance']
            })
        
        return {"models": models}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")

@router.post("/activate")
async def activate_model(model_id: str):
    """Activate a specific model for predictions"""
    try:
        if model_id not in ml_pipeline.models:
            raise HTTPException(status_code=404, detail=f"Model {model_id} not found")

        global active_model_id
        active_model_id = model_id

        return {
            "message": f"Model {model_id} activated successfully",
            "active_model": model_id,
            "performance": ml_pipeline.models[model_id]['performance']
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to activate model: {str(e)}")

@router.get("/active")
async def get_active_model_info():
    """Get information about the currently active model"""
    try:
        active_model = get_active_model()
        if not active_model:
            return {"message": "No active model", "models_available": list(ml_pipeline.models.keys())}

        return {
            "active_model": active_model_id,
            "performance": active_model['performance'],
            "feature_count": len(active_model['feature_names']),
            "feature_importance": active_model['feature_importance']
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get active model: {str(e)}")

@router.post("/predict-batch")
async def predict_batch_leads(lead_ids: list[str]):
    """Predict conversion probability for multiple leads"""
    try:
        active_model = get_active_model()
        if not active_model:
            raise HTTPException(status_code=400, detail="No active model available")

        # Fetch lead data for prediction using IN clause
        placeholders = ','.join(['%s'] * len(lead_ids))
        query = f"""
        SELECT
            p.id, p.first_name, p.last_name, p.email, p.phone,
            p.lead_score, p.lifecycle_state, p.created_at,
            p.engagement_score, p.conversion_probability,
            p.touchpoint_count, p.status,
            (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0)::double precision as days_since_creation,
            COALESCE(a.source, 'unknown') as source,
            COALESCE(pr.name, 'unknown') as course_declared,
            COALESCE(c.name, 'unknown') as campus_preference,
            CASE
                WHEN p.engagement_score >= 80 THEN 'high'
                WHEN p.engagement_score >= 50 THEN 'medium'
                ELSE 'low'
            END as engagement_level
        FROM people p
        LEFT JOIN applications a ON p.id = a.person_id
        LEFT JOIN programmes pr ON a.programme_id = pr.id
        LEFT JOIN campuses c ON pr.campus_id = c.id
        WHERE p.id IN ({placeholders})
        ORDER BY p.created_at DESC
        """

        results = await fetch(query, *lead_ids)

        if not results:
            return {"predictions": []}

        predictions = []
        for lead_data in results:
            try:
                # Prepare features for this lead
                features = ml_pipeline.prepare_features_for_prediction(lead_data, active_model['feature_names'])
                
                # Debug: Print feature values for first few leads
                if len(predictions) < 3:  # Only debug first 3 leads
                    print(f"🔍 Lead {lead_data['id']} features: {dict(zip(active_model['feature_names'], features))}")
                    
                # Debug: Print model info for first prediction
                if len(predictions) == 0:
                    print(f"🤖 Model info: {len(active_model['feature_names'])} features")
                    print(f"📋 Feature names: {active_model['feature_names'][:10]}...")  # First 10 features

                # Scale features - ensure proper feature alignment
                features_array = np.array(features).reshape(1, -1)
                features_scaled = active_model['scaler'].transform(features_array)

                # Make prediction
                model = active_model['model']
                prediction = model.predict(features_scaled)[0]
                prediction_proba = model.predict_proba(features_scaled)[0] if hasattr(model, 'predict_proba') else None

                # Apply probability calibration to spread out the scores
                # This addresses the "tight scoring" issue where probabilities cluster around 6%
                # The calibration spreads probabilities across a wider range for better differentiation
                if prediction_proba is not None:
                    # Simple sigmoid calibration to spread probabilities
                    raw_prob = prediction_proba[1]
                    calibrated_prob = 1 / (1 + np.exp(-2 * (raw_prob - 0.5)))
                    # Ensure probabilities are in reasonable range
                    calibrated_prob = max(0.05, min(0.95, calibrated_prob))
                    
                    # Debug: Print prediction details for first few leads
                    if len(predictions) < 3:
                        print(f"🎯 Lead {lead_data['id']}: raw_prob={raw_prob:.4f}, calibrated={calibrated_prob:.4f}")
                else:
                    calibrated_prob = 0.5

                predictions.append({
                    "lead_id": lead_data['id'],
                    "prediction": bool(prediction),
                    "probability": float(calibrated_prob),
                    "confidence": float(max(prediction_proba) - 0.5) * 2 if prediction_proba is not None else 0.5
                })

            except Exception as e:
                print(f"❌ Prediction failed for lead {lead_data['id']}: {e}")
                predictions.append({
                    "lead_id": lead_data['id'],
                    "prediction": None,
                    "probability": None,
                    "confidence": None,
                    "error": str(e)
                })

        return {
            "predictions": predictions,
            "model_used": active_model_id,
            "total_processed": len(predictions),
            "successful_predictions": len([p for p in predictions if p.get('probability') is not None])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")

@router.get("/feature-analysis")
async def analyze_features():
    """Analyze feature importance and relationships"""
    try:
        if not ml_pipeline.models:
            return {"message": "No trained models available"}
        
        # Get the most recent model
        latest_model_id = list(ml_pipeline.models.keys())[-1]
        model_info = ml_pipeline.models[latest_model_id]
        
        feature_importance = model_info['feature_importance']
        
        # Sort features by importance
        sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
        
        # Top features
        top_features = sorted_features[:10]
        
        # Feature categories
        temporal_features = [f for f in feature_importance.keys() if 'created' in f or 'day' in f or 'month' in f]
        score_features = [f for f in feature_importance.keys() if 'score' in f]
        interaction_features = [f for f in feature_importance.keys() if 'interaction' in f]
        
        return {
            "top_features": top_features,
            "feature_categories": {
                "temporal": temporal_features,
                "score_based": score_features,
                "interactions": interaction_features
            },
            "total_features": len(feature_importance)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feature analysis failed: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check for ML service"""
    try:
        active_model = get_active_model()
        return {
            "status": "healthy",
            "models_loaded": len(ml_pipeline.models),
            "active_model": active_model_id,
            "model_performance": active_model['performance'] if active_model else None
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "models_loaded": len(ml_pipeline.models)
        }

def generate_ml_insights(lead_data: Dict[str, Any], prediction: Dict[str, Any], model_id: str) -> List[str]:
    """Generate AI insights from ML predictions"""
    
    insights = []
    
    # Score-based insights
    lead_score = lead_data.get('lead_score', 0)
    if lead_score >= 80:
        insights.append("High lead score indicates strong conversion potential")
    elif lead_score < 50:
        insights.append("Low lead score suggests need for nurturing")
    
    # Probability insights
    probability = prediction.get('probability', 0)
    if probability > 0.8:
        insights.append("Very high conversion probability - prioritize this lead")
    elif probability < 0.3:
        insights.append("Low conversion probability - consider re-engagement strategies")
    
    # Time-based insights
    created_at = lead_data.get('created_at')
    if created_at:
        days_old = (datetime.now() - pd.to_datetime(created_at)).days
        if days_old > 30:
            insights.append("Lead is over 30 days old - may need re-engagement")
        elif days_old < 7:
            insights.append("Fresh lead - high engagement potential")
    
    # Model confidence insights
    confidence = prediction.get('confidence', 0)
    if confidence < 0.6:
        insights.append("Low prediction confidence - consider manual review")
    
    return insights
