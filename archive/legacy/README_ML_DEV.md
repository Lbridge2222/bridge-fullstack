# ML Development Guide

**Bridge Dashboard ML Pipeline - Developer Documentation**

This guide covers how to develop, test, and maintain the ML prediction stack for lead conversion probability.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [Running Tests](#running-tests)
- [Model Management](#model-management)
- [Adding New Features](#adding-new-features)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Performance Monitoring](#performance-monitoring)

## Quick Start

### Prerequisites

- Python 3.8+
- PostgreSQL database
- Required Python packages (see `requirements.txt`)

### Running the ML Service

1. **Start the backend server:**
   ```bash
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Test the ML endpoints:**
   ```bash
   # Health check
   curl http://localhost:8000/ai/advanced-ml/health
   
   # Batch prediction (raw array format)
   curl -X POST http://localhost:8000/ai/advanced-ml/predict-batch \
     -H "Content-Type: application/json" \
     -d '["lead_1", "lead_2"]'
   
   # Batch prediction (wrapped format)
   curl -X POST http://localhost:8000/ai/advanced-ml/predict-batch \
     -H "Content-Type: application/json" \
     -d '{"lead_ids": ["lead_1", "lead_2"]}'
   ```

3. **Check model information:**
   ```bash
   curl http://localhost:8000/ai/advanced-ml/models
   ```

## Architecture Overview

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   ML Endpoints   │    │   Model Registry│
│   (React)       │◄──►│   (FastAPI)      │◄──►│   (Joblib)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Feature Safety  │
                       │  & Calibration   │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Database       │
                       │   (PostgreSQL)   │
                       └──────────────────┘
```

### Key Files

- `app/ai/advanced_ml_hardened.py` - Main ML pipeline with hardened endpoints
- `app/ai/model_registry.py` - Model loading and caching
- `app/ai/calibration.py` - Probability calibration utilities
- `app/ai/feature_safety.py` - Feature engineering safety guards
- `app/ai/ml_telemetry.py` - Structured logging and monitoring
- `app/schemas/ai_ml.py` - Pydantic schemas for API contracts
- `backend/models/` - Model artifacts (`.joblib` files)

### Data Flow

1. **Request** → Frontend sends lead IDs
2. **Validation** → Pydantic schemas validate input
3. **Model Loading** → Model registry loads latest model
4. **Data Fetching** → Database query for lead attributes
5. **Feature Engineering** → Safety guards process features
6. **Prediction** → Random Forest model inference
7. **Calibration** → Probability calibration and confidence scoring
8. **Response** → Structured response with metadata

## Development Setup

### Environment Variables

Create `backend/.env` with:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bridge_dashboard

# ML Configuration
AI_TELEMETRY_ENABLED=true
ML_CACHE_TTL_SECONDS=3600
ML_MIN_FEATURE_COVERAGE=0.6

# Optional: Model overrides
ML_MODEL_PATTERN=advanced_ml_random_forest_*.joblib
ML_MODEL_DIR=./models
```

### Dependencies

Install required packages:

```bash
cd backend
pip install -r requirements.txt
```

Key ML dependencies:
- `scikit-learn` - ML algorithms and preprocessing
- `pandas` - Data manipulation
- `numpy` - Numerical computing
- `joblib` - Model serialization
- `fastapi` - API framework
- `pydantic` - Data validation

### Database Setup

Ensure the database has the required tables:

```sql
-- Core tables
CREATE TABLE people (
    id UUID PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    lead_score INTEGER,
    lifecycle_state VARCHAR(50),
    created_at TIMESTAMP,
    engagement_score INTEGER,
    conversion_probability FLOAT,
    touchpoint_count INTEGER,
    status VARCHAR(50)
);

CREATE TABLE applications (
    id UUID PRIMARY KEY,
    person_id UUID REFERENCES people(id),
    programme_id UUID,
    source VARCHAR(100)
);

-- Additional tables for joins
CREATE TABLE programmes (id UUID PRIMARY KEY, name VARCHAR(255));
CREATE TABLE campuses (id UUID PRIMARY KEY, name VARCHAR(255));
```

## Running Tests

### Unit Tests

Test individual ML components:

```bash
cd backend
python -m pytest tests/test_advanced_ml_unit.py -v
```

### Contract Tests

Test API endpoints and response formats:

```bash
python -m pytest tests/test_ai_leads_contract.py -v
```

### All Tests

Run the complete test suite:

```bash
python -m pytest tests/ -v --cov=app.ai
```

### Test Coverage

Generate coverage report:

```bash
python -m pytest tests/ --cov=app.ai --cov-report=html
open htmlcov/index.html
```

## Model Management

### Model Training

Train a new model:

```bash
curl -X POST http://localhost:8000/ai/advanced-ml/train \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "model_type": "random_forest",
      "features": ["lead_score", "days_since_creation", "engagement_score"],
      "target_variable": "has_application",
      "test_size": 0.2,
      "random_state": 42,
      "hyperparameters": {
        "n_estimators": 100,
        "max_depth": 10
      },
      "feature_selection": true,
      "cross_validation_folds": 5
    },
    "feature_config": {
      "create_lag_features": true,
      "create_rolling_features": true,
      "create_interaction_features": true,
      "create_polynomial_features": false,
      "feature_scaling": true,
      "handle_missing_values": "impute"
    },
    "training_data_limit": 1000,
    "save_model": true,
    "model_name": "my_model_v1"
  }'
```

### Model Deployment

1. **Save model artifact:**
   - Models are automatically saved to `backend/models/`
   - Filename format: `advanced_ml_random_forest_YYYYMMDD_HHMMSS.joblib`

2. **Load model on startup:**
   - The system automatically loads the latest model
   - Model registry handles caching and versioning

3. **Verify model loading:**
   ```bash
   curl http://localhost:8000/ai/advanced-ml/health
   ```

### Model Versioning

Models are versioned by timestamp. To use a specific model:

1. **List available models:**
   ```bash
   curl http://localhost:8000/ai/advanced-ml/models
   ```

2. **Check model integrity:**
   ```python
   from app.ai.model_registry import get_model_registry
   
   registry = get_model_registry()
   is_valid = registry.validate_model_integrity()
   print(f"Model integrity: {is_valid}")
   ```

## Adding New Features

### 1. Feature Engineering

Add new features in `app/ai/advanced_ml_hardened.py`:

```python
def engineer_features(self, df: pd.DataFrame, config: FeatureEngineeringConfig) -> pd.DataFrame:
    df_engineered = df.copy()
    
    # Add your new feature
    df_engineered['my_new_feature'] = df_engineered['existing_column'] * 2
    
    # Add interaction features
    df_engineered['interaction_feature'] = (
        df_engineered['feature1'] * df_engineered['feature2']
    )
    
    return df_engineered
```

### 2. Feature Safety

Ensure new features are handled safely in `app/ai/feature_safety.py`:

```python
def safe_prepare_features(lead_data: Dict[str, Any], feature_names: List[str]) -> Tuple[List[float], float]:
    # Add handling for your new feature
    if 'my_new_feature' in feature_names:
        value = lead_data.get('my_new_feature', 0)
        safe_value = guard.safe_numeric_value(value, 'my_new_feature')
        features.append(safe_value)
```

### 3. Database Schema

Add new columns to the database:

```sql
ALTER TABLE people ADD COLUMN my_new_feature FLOAT DEFAULT 0.0;
```

### 4. Testing

Add tests for new features:

```python
def test_my_new_feature():
    guard = FeatureSafetyGuard()
    
    # Test feature extraction
    lead_data = {'my_new_feature': 42.0}
    features, coverage = safe_prepare_features(lead_data, ['my_new_feature'])
    
    assert features[0] == 42.0
    assert coverage > 0.9
```

### 5. Model Retraining

After adding features:

1. **Retrain the model** with new features
2. **Validate performance** on test set
3. **Deploy new model** to production
4. **Monitor performance** for drift

## API Reference

### Endpoints

#### `POST /ai/advanced-ml/predict-batch`

Predict conversion probability for multiple leads.

**Request Formats:**
```json
// Raw array (legacy)
["lead_1", "lead_2", "lead_3"]

// Wrapped object (canonical)
{
  "lead_ids": ["lead_1", "lead_2", "lead_3"]
}
```

**Response:**
```json
{
  "predictions": [
    {
      "lead_id": "lead_1",
      "probability": 0.72,
      "confidence": 0.87,
      "calibrated_probability": 0.81,
      "features_present_ratio": 0.95,
      "prediction": true
    }
  ],
  "model_version": "20250827_172908",
  "model_sha256": "abc123def456",
  "total_processed": 1,
  "successful_predictions": 1,
  "failed_predictions": 0,
  "processing_time_ms": 45.2,
  "cache_hit": false
}
```

#### `GET /ai/advanced-ml/health`

Health check for ML service.

**Response:**
```json
{
  "status": "healthy",
  "model_version": "20250827_172908",
  "model_sha256": "abc123def456",
  "loaded": true,
  "since_seconds": 3600.0,
  "feature_count": 20,
  "cache_status": "hit"
}
```

#### `GET /ai/advanced-ml/models`

Get detailed model information.

**Response:**
```json
{
  "status": "loaded",
  "version": "20250827_172908",
  "model_type": "random_forest",
  "path": "/path/to/model.joblib",
  "sha256": "abc123def456",
  "loaded_at": 1640995200.0,
  "loaded_since_seconds": 3600.0,
  "feature_count": 20,
  "performance": {
    "accuracy": 0.85,
    "precision": 0.82,
    "recall": 0.78,
    "f1_score": 0.80,
    "roc_auc": 0.88
  }
}
```

### Error Handling

All endpoints return structured error responses:

```json
{
  "error": "validation_error",
  "message": "lead_ids cannot be empty",
  "details": {
    "field": "lead_ids",
    "value": []
  },
  "timestamp": "2025-01-27T10:00:00Z",
  "request_id": "req_123"
}
```

**Common Error Codes:**
- `400` - Bad Request (invalid input)
- `404` - Not Found (lead not found)
- `500` - Internal Server Error (ML processing error)
- `503` - Service Unavailable (model loading error)

## Troubleshooting

### Common Issues

#### 1. Model Loading Errors

**Problem:** `Model loading failed: No model artifacts found`

**Solution:**
```bash
# Check if models exist
ls -la backend/models/

# Train a new model if none exist
curl -X POST http://localhost:8000/ai/advanced-ml/train -d '{"config": {...}}'
```

#### 2. Feature Mismatch Errors

**Problem:** `Feature count mismatch: expected 20, got 15`

**Solution:**
- Check if database schema matches model training data
- Retrain model with current feature set
- Verify feature engineering pipeline

#### 3. Database Connection Errors

**Problem:** `Database connection failed`

**Solution:**
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Verify environment variables
echo $DATABASE_URL
```

#### 4. Memory Issues

**Problem:** `Out of memory during prediction`

**Solution:**
- Reduce batch size in requests
- Check model size: `du -h backend/models/*.joblib`
- Consider model optimization or compression

### Debugging

#### Enable Debug Logging

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### Check Model Registry Status

```python
from app.ai.model_registry import get_model_registry

registry = get_model_registry()
print(registry.get_model_info())
print(registry.list_available_models())
```

#### Validate Feature Pipeline

```python
from app.ai.feature_safety import get_feature_guard

guard = get_feature_guard()
test_data = {'lead_score': 75, 'days_since_creation': 10.5}
features, coverage = safe_prepare_features(test_data, ['lead_score', 'days_since_creation'])
print(f"Features: {features}, Coverage: {coverage}")
```

## Performance Monitoring

### Telemetry

The system automatically logs ML operations:

```python
from app.ai.ml_telemetry import get_ml_metrics

metrics = get_ml_metrics()
print(f"Total requests: {metrics['total_requests']}")
print(f"Cache hit rate: {metrics['cache_hit_rate']:.2%}")
print(f"Error rate: {metrics['error_rate']:.2%}")
print(f"Avg latency: {metrics['avg_latency_ms']:.1f}ms")
```

### Key Metrics

- **Request Rate** - Predictions per second
- **Cache Hit Rate** - Percentage of cached responses
- **Error Rate** - Percentage of failed requests
- **Latency** - Average processing time
- **Feature Coverage** - Ratio of available features
- **Model Performance** - Accuracy, precision, recall

### Monitoring Queries

Check ML performance in the database:

```sql
-- Recent ML events
SELECT action, COUNT(*), AVG(meta->>'latency_ms')::float as avg_latency
FROM ai_events 
WHERE action LIKE 'ml.%' 
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY action;

-- Error analysis
SELECT action, meta->>'error_type' as error_type, COUNT(*)
FROM ai_events 
WHERE action LIKE 'ml.%' 
  AND meta->>'error_type' IS NOT NULL
GROUP BY action, error_type;
```

### Alerts

Set up monitoring for:

- **High Error Rate** (>5% errors)
- **High Latency** (>1000ms average)
- **Low Cache Hit Rate** (<50%)
- **Model Loading Failures**
- **Feature Coverage Issues** (<60%)

---

## Contributing

### Code Style

- Follow PEP 8 for Python code
- Use type hints for all functions
- Add docstrings for all public methods
- Write tests for new features

### Pull Request Process

1. **Create feature branch** from `main`
2. **Add tests** for new functionality
3. **Update documentation** if needed
4. **Run test suite** and ensure all tests pass
5. **Submit PR** with clear description

### Code Review Checklist

- [ ] Tests pass and coverage is maintained
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Error handling is robust
- [ ] Performance impact is considered
- [ ] Security implications are reviewed

---

**Need Help?** 

- Check the [ML Audit Report](app/ai/REPORT_ML_AUDIT.md) for detailed analysis
- Review existing tests for usage examples
- Contact the ML team for complex issues
