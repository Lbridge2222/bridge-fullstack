"""
Hardened Advanced ML Pipeline

This is the improved version of advanced_ml.py with:
- Model registry integration
- Proper error handling and input validation
- Structured telemetry
- Feature safety guards
- Calibration utilities
- Pydantic schemas
"""

from fastapi import APIRouter, HTTPException, Depends, Request
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
import time
from pathlib import Path
from app.db.db import fetch, fetchrow, execute
from app.cache import cached

# Import new components
from app.ai.model_registry import get_model_registry, load_active_model, get_model_info
from app.ai.calibration import calibrate_probability, calculate_confidence, apply_probability_bounds
from app.ai.feature_safety import get_feature_guard, safe_prepare_features
from app.ai.ml_telemetry import (
    log_prediction_request, log_prediction_success, log_prediction_error,
    log_model_load, log_feature_engineering, log_calibration
)
from app.schemas.ai_ml import (
    PredictBatchRequest, PredictBatchResponse, PredictBatchResponseItem,
    PredictSingleRequest, PredictSingleResponse, ModelInfoResponse,
    HealthCheckResponse, ErrorResponse, normalize_predict_batch_request
)

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
            
            # Query enriched lead data using ACTUAL current schema
            query = """
            SELECT 
                p.id, p.first_name, p.last_name, p.email, p.phone,
                p.lead_score, p.lifecycle_state, p.created_at,
                p.engagement_score, p.conversion_probability,
                p.touchpoint_count, p.status,
                (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0)::double precision as days_since_creation,
                CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as has_application,
                COALESCE(a.source, 'unknown') as application_source,
                COALESCE(pr.name, 'unknown') as programme_name,
                COALESCE(c.name, 'unknown') as campus_name,
                CASE 
                    WHEN p.engagement_score >= 80 THEN 'high'
                    WHEN p.engagement_score >= 50 THEN 'medium'
                    ELSE 'low'
                END as engagement_level,
                EXTRACT(MONTH FROM p.created_at) as created_month,
                EXTRACT(DOW FROM p.created_at) as created_day_of_week,
                EXTRACT(HOUR FROM p.created_at) as created_hour
            FROM people p
            LEFT JOIN applications a ON p.id = a.person_id
            LEFT JOIN programmes pr ON a.programme_id = pr.id
            LEFT JOIN campuses c ON pr.campus_id = c.id
            WHERE p.lifecycle_state = 'lead'
            ORDER BY p.created_at DESC
            LIMIT %s
            """
            
            print(f"📝 Executing query: {query}")
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
            if 'lead_score' in df.columns:
                df['lead_score'] = pd.to_numeric(df['lead_score'], errors='coerce')
            if 'engagement_score' in df.columns:
                df['engagement_score'] = pd.to_numeric(df['engagement_score'], errors='coerce')
            if 'touchpoint_count' in df.columns:
                df['touchpoint_count'] = pd.to_numeric(df['touchpoint_count'], errors='coerce')

            # Basic data cleaning
            print(f"🧹 Cleaning data...")
            print(f"📊 Before cleaning - rows: {len(df)}")
            print(f"📊 Missing lead_score: {df['lead_score'].isna().sum()}")
            print(f"📊 Missing has_application: {df['has_application'].isna().sum()}")
            
            # Fill missing values with defaults
            df['lead_score'] = df['lead_score'].fillna(0)
            df['engagement_score'] = df['engagement_score'].fillna(0)
            df['touchpoint_count'] = df['touchpoint_count'].fillna(0)
            df['has_application'] = df['has_application'].fillna(0)
            df['conversion_probability'] = df['conversion_probability'].fillna(0.0)
            
            df['has_application'] = df['has_application'].astype(int)
            
            print(f"✅ After cleaning - rows: {len(df)}")
            print(f"📊 Target distribution: {df['has_application'].value_counts().to_dict()}")
            
            return df
            
        except Exception as e:
            import traceback
            print(f"❌ Error in load_training_data: {str(e)}")
            print(f"📋 Full traceback: {traceback.format_exc()}")
            raise Exception(f"Failed to load training data: {str(e)}")
    
    def engineer_features(self, df: pd.DataFrame, config: FeatureEngineeringConfig) -> pd.DataFrame:
        """Advanced feature engineering for lead intelligence"""
        
        df_engineered = df.copy()
        
        # 1. Temporal Features (already extracted in query)
        if config.create_lag_features:
            # These are already extracted in the SQL query, but ensure they exist
            if 'created_month' not in df_engineered.columns:
                df_engineered['created_month'] = pd.to_datetime(df_engineered['created_at']).dt.month
            if 'created_day_of_week' not in df_engineered.columns:
                df_engineered['created_day_of_week'] = pd.to_datetime(df_engineered['created_at']).dt.dayofweek
            if 'created_hour' not in df_engineered.columns:
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
    
    async def predict_batch_hardened(self, lead_ids: List[str], request_id: Optional[str] = None) -> PredictBatchResponse:
        """
        Hardened batch prediction with proper error handling and telemetry.
        
        Args:
            lead_ids: List of lead IDs to predict
            request_id: Optional request ID for correlation
            
        Returns:
            PredictBatchResponse with predictions and metadata
        """
        # Ensure all lead_ids are strings, not dicts
        validated_lead_ids = []
        for item in lead_ids:
            if isinstance(item, dict):
                # Extract string value from dict if it's a dict
                if 'id' in item:
                    validated_lead_ids.append(str(item['id']))
                elif 'lead_id' in item:
                    validated_lead_ids.append(str(item['lead_id']))
                else:
                    # Convert dict to string representation
                    validated_lead_ids.append(str(item))
            else:
                validated_lead_ids.append(str(item))
        
        lead_ids = validated_lead_ids
        
        if request_id is None:
            import uuid
            request_id = str(uuid.uuid4())
        
        log_prediction_request(len(lead_ids), request_id)
        start_time = time.time()
        
        try:
            # Load active model with error handling
            try:
                loaded_model = load_active_model()
                model_version = loaded_model.version
                model_sha256 = loaded_model.sha256
                cache_hit = False  # Model registry handles caching internally
            except Exception as e:
                log_prediction_error(
                    request_id, "model_load_error", str(e), len(lead_ids), 
                    (time.time() - start_time) * 1000
                )
                raise HTTPException(status_code=503, detail=f"Model loading failed: {str(e)}")
            
            # Log model load
            log_model_load(model_version, model_sha256, 0, cache_hit, len(loaded_model.feature_names))
            
            # Fetch lead data for prediction
            placeholders = ','.join(['%s'] * len(lead_ids))
            query = f"""
            SELECT
                p.id, p.first_name, p.last_name, p.email, p.phone,
                p.lead_score, p.lifecycle_state, p.created_at,
                p.engagement_score, p.conversion_probability,
                p.touchpoint_count, p.status,
                (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0)::double precision as days_since_creation,
                COALESCE(a.source, 'unknown') as application_source,
                COALESCE(pr.name, 'unknown') as programme_name,
                COALESCE(c.name, 'unknown') as campus_name,
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
                # Return empty response for no results
                latency_ms = (time.time() - start_time) * 1000
                return PredictBatchResponse(
                    predictions=[],
                    model_version=model_version,
                    model_sha256=model_sha256,
                    total_processed=0,
                    successful_predictions=0,
                    failed_predictions=0,
                    processing_time_ms=latency_ms,
                    cache_hit=cache_hit
                )

            predictions = []
            raw_probabilities = []
            calibrated_probabilities = []
            
            for lead_data in results:
                try:
                    # Use feature safety guard for robust feature preparation
                    features, features_present_ratio = safe_prepare_features(lead_data, loaded_model.feature_names)
                    
                    # Log feature engineering
                    log_feature_engineering(
                        request_id, len(loaded_model.feature_names), features_present_ratio, 0, True
                    )
                    
                    # Scale features
                    features_df = pd.DataFrame([features], columns=loaded_model.feature_names)
                    features_scaled = loaded_model.scaler.transform(features_df)

                    # Make prediction
                    model = loaded_model.model
                    prediction = model.predict(features_scaled)[0]
                    prediction_proba = model.predict_proba(features_scaled)[0] if hasattr(model, 'predict_proba') else None

                    # Apply calibration
                    if prediction_proba is not None:
                        raw_prob = prediction_proba[1]
                        calibrated_prob = calibrate_probability(raw_prob, method="sigmoid")
                        calibrated_prob = apply_probability_bounds(calibrated_prob)
                        
                        raw_probabilities.append(raw_prob)
                        calibrated_probabilities.append(calibrated_prob)
                        
                        # Calculate confidence
                        confidence = calculate_confidence(prediction_proba, method="max_distance")
                    else:
                        calibrated_prob = 0.5
                        confidence = 0.5
                        raw_probabilities.append(0.5)
                        calibrated_probabilities.append(0.5)

                    predictions.append(PredictBatchResponseItem(
                        lead_id=str(lead_data['id']),
                        probability=float(calibrated_prob),
                        confidence=float(confidence),
                        calibrated_probability=float(calibrated_prob),
                        features_present_ratio=float(features_present_ratio),
                        prediction=bool(prediction)
                    ))

                except Exception as e:
                    print(f"❌ Prediction failed for lead {lead_data['id']}: {e}")
                    predictions.append(PredictBatchResponseItem(
                        lead_id=str(lead_data['id']),
                        probability=0.0,
                        confidence=0.0,
                        calibrated_probability=0.0,
                        features_present_ratio=0.0,
                        prediction=False
                    ))

            # Log calibration
            if raw_probabilities and calibrated_probabilities:
                log_calibration(request_id, raw_probabilities, calibrated_probabilities, 0)
            
            # Calculate final metrics
            latency_ms = (time.time() - start_time) * 1000
            successful_predictions = len([p for p in predictions if p.probability > 0])
            failed_predictions = len(predictions) - successful_predictions
            avg_features_ratio = np.mean([p.features_present_ratio for p in predictions]) if predictions else 0.0
            
            # Log success
            log_prediction_success(
                request_id, len(lead_ids), latency_ms, model_version, model_sha256,
                avg_features_ratio, cache_hit, [p.dict() for p in predictions]
            )
            
            return PredictBatchResponse(
                predictions=predictions,
                model_version=model_version,
                model_sha256=model_sha256,
                model_id=f"advanced_ml_{model_version}",
                total_processed=len(predictions),
                successful_predictions=successful_predictions,
                failed_predictions=failed_predictions,
                processing_time_ms=latency_ms,
                cache_hit=cache_hit,
                calibration_metadata={
                    "calibration_method": "sigmoid",
                    "raw_probabilities_count": len(raw_probabilities),
                    "calibrated_probabilities_count": len(calibrated_probabilities),
                    "avg_feature_coverage": avg_features_ratio
                },
                request_id=request_id
            )

        except HTTPException:
            raise
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            log_prediction_error(
                request_id, "prediction_error", str(e), len(lead_ids), latency_ms
            )
            raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")

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

# Load the latest model on startup
print("🔄 Loading latest ML model on startup...")
load_latest_model()

# API Endpoints
@router.get("")
@router.get("/")
async def get_advanced_ml_info():
    """Get information about the Advanced ML system"""
    return {
        "name": "Advanced ML Pipeline",
        "version": "1.0",
        "endpoints": [
            "/train",
            "/predict", 
            "/predict-batch",
            "/models",
            "/activate",
            "/active",
            "/feature-analysis",
            "/health"
        ],
        "status": "active",
        "models_loaded": len(ml_pipeline.models) if hasattr(ml_pipeline, 'models') else 0
    }

@router.post("/predict-batch", response_model=PredictBatchResponse)
async def predict_batch_leads_hardened(request: Union[PredictBatchRequest, List[str]]):
    """
    Hardened batch prediction endpoint with proper validation and error handling.
    
    Supports both legacy raw array format and canonical wrapped object format.
    """
    try:
        # Normalize request format
        lead_ids = normalize_predict_batch_request(request)
        
        # Validate input
        if not lead_ids:
            raise HTTPException(status_code=400, detail="lead_ids cannot be empty")
        
        if len(lead_ids) > 1000:
            raise HTTPException(status_code=400, detail="Maximum 1000 leads per request")
        
        # Use hardened prediction method
        return await ml_pipeline.predict_batch_hardened(lead_ids)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request processing failed: {str(e)}")

@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check for ML service with detailed model information"""
    try:
        model_info = get_model_info()
        
        if model_info["status"] == "loaded":
            return HealthCheckResponse(
                status="healthy",
                model_version=model_info["version"],
                model_sha256=model_info["sha256"],
                loaded=True,
                since_seconds=model_info["loaded_since_seconds"],
                feature_count=model_info["feature_count"],
                cache_status="hit"  # Model registry handles caching
            )
        else:
            return HealthCheckResponse(
                status="unhealthy",
                model_version=None,
                model_sha256=None,
                loaded=False,
                since_seconds=None,
                feature_count=None,
                cache_status="miss"
            )
    except Exception as e:
        return HealthCheckResponse(
            status="unhealthy",
            model_version=None,
            model_sha256=None,
            loaded=False,
            since_seconds=None,
            feature_count=None,
            cache_status="error"
        )

@router.get("/models", response_model=ModelInfoResponse)
async def get_model_info_endpoint():
    """Get detailed information about the currently loaded model"""
    try:
        model_info = get_model_info()
        return ModelInfoResponse(**model_info)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {str(e)}")

# Keep existing endpoints for backward compatibility
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
        
        # Prepare features and target: keep only numeric columns for modelling
        feature_columns = [col for col in df_engineered.columns if col not in ['id', 'has_application', 'created_at', 'first_name', 'last_name', 'email', 'phone', 'application_source', 'programme_name', 'campus_name', 'lifecycle_state', 'engagement_level', 'status']]
        X = df_engineered[feature_columns].select_dtypes(include=[np.number])
        y = df_engineered['has_application']
        
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

# Additional endpoints for backward compatibility
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

@router.get("/feature-analysis")
async def analyze_features():
    """Analyse feature importance and relationships"""
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
