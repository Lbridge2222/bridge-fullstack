"""
Contract tests for ML endpoints

Tests the API contracts and response formats for ML prediction endpoints.
Uses mocks to avoid database dependencies.
"""

import pytest
import json
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI
import tempfile
import joblib
from pathlib import Path

# Import the components to test
from app.ai.advanced_ml_hardened import router as ml_router
from app.schemas.ai_ml import (
    PredictBatchRequest, PredictBatchResponse, PredictBatchResponseItem,
    HealthCheckResponse, ModelInfoResponse
)


@pytest.fixture
def app():
    """Create test FastAPI app with ML router"""
    app = FastAPI()
    app.include_router(ml_router)
    return app


@pytest.fixture
def client(app):
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def mock_model_data():
    """Create mock model data for testing"""
    return {
        'model': Mock(),
        'scaler': Mock(),
        'feature_selector': Mock(),
        'feature_names': ['lead_score', 'days_since_creation', 'engagement_score'],
        'performance': {
            'accuracy': 0.85,
            'precision': 0.82,
            'recall': 0.78,
            'f1_score': 0.80,
            'roc_auc': 0.88
        },
        'feature_importance': {
            'lead_score': 0.4,
            'days_since_creation': 0.3,
            'engagement_score': 0.3
        }
    }


@pytest.fixture
def mock_lead_data():
    """Create mock lead data for testing"""
    return [
        {
            'id': 'lead_1',
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@example.com',
            'phone': '+1234567890',
            'lead_score': 75,
            'lifecycle_state': 'lead',
            'created_at': '2025-01-01T00:00:00Z',
            'engagement_score': 80,
            'conversion_probability': 0.0,
            'touchpoint_count': 3,
            'status': 'new',
            'days_since_creation': 10.5,
            'application_source': 'website',
            'programme_name': 'Computer Science',
            'campus_name': 'London',
            'engagement_level': 'high'
        },
        {
            'id': 'lead_2',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'jane.smith@example.com',
            'phone': '+0987654321',
            'lead_score': 45,
            'lifecycle_state': 'lead',
            'created_at': '2025-01-15T00:00:00Z',
            'engagement_score': 60,
            'conversion_probability': 0.0,
            'touchpoint_count': 1,
            'status': 'contacted',
            'days_since_creation': 5.2,
            'application_source': 'referral',
            'programme_name': 'Business',
            'campus_name': 'Manchester',
            'engagement_level': 'medium'
        }
    ]


class TestMLEndpointsContract:
    """Test ML endpoint contracts and response formats"""
    
    @patch('app.ai.advanced_ml_hardened.load_active_model')
    @patch('app.ai.advanced_ml_hardened.fetch')
    def test_predict_batch_raw_array_format(self, mock_fetch, mock_load_model, client, mock_model_data, mock_lead_data):
        """Test predict-batch endpoint with raw array format (legacy)"""
        # Setup mocks
        mock_load_model.return_value = Mock(
            version="20250827_172908",
            sha256="abc123def456",
            feature_names=['lead_score', 'days_since_creation', 'engagement_score'],
            scaler=Mock(),
            model=Mock()
        )
        mock_fetch.return_value = mock_lead_data
        
        # Mock model prediction
        mock_model = mock_load_model.return_value.model
        mock_model.predict.return_value = [1, 0]  # Binary predictions
        mock_model.predict_proba.return_value = [[0.3, 0.7], [0.8, 0.2]]  # Probabilities
        
        # Mock scaler
        mock_scaler = mock_load_model.return_value.scaler
        mock_scaler.transform.return_value = [[75, 10.5, 80], [45, 5.2, 60]]
        
        # Test raw array format
        response = client.post("/ai/advanced-ml/predict-batch", json=["lead_1", "lead_2"])
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "predictions" in data
        assert "model_version" in data
        assert "model_sha256" in data
        assert "total_processed" in data
        assert "successful_predictions" in data
        assert "failed_predictions" in data
        assert "processing_time_ms" in data
        assert "cache_hit" in data
        
        # Check predictions structure
        assert len(data["predictions"]) == 2
        for prediction in data["predictions"]:
            assert "lead_id" in prediction
            assert "probability" in prediction
            assert "confidence" in prediction
            assert "calibrated_probability" in prediction
            assert "features_present_ratio" in prediction
            assert "prediction" in prediction
            
            # Check value ranges
            assert 0 <= prediction["probability"] <= 1
            assert 0 <= prediction["confidence"] <= 1
            assert 0 <= prediction["calibrated_probability"] <= 1
            assert 0 <= prediction["features_present_ratio"] <= 1
            assert isinstance(prediction["prediction"], bool)
    
    @patch('app.ai.advanced_ml_hardened.load_active_model')
    @patch('app.ai.advanced_ml_hardened.fetch')
    def test_predict_batch_wrapped_object_format(self, mock_fetch, mock_load_model, client, mock_model_data, mock_lead_data):
        """Test predict-batch endpoint with wrapped object format (canonical)"""
        # Setup mocks
        mock_load_model.return_value = Mock(
            version="20250827_172908",
            sha256="abc123def456",
            feature_names=['lead_score', 'days_since_creation', 'engagement_score'],
            scaler=Mock(),
            model=Mock()
        )
        mock_fetch.return_value = mock_lead_data
        
        # Mock model prediction
        mock_model = mock_load_model.return_value.model
        mock_model.predict.return_value = [1, 0]
        mock_model.predict_proba.return_value = [[0.3, 0.7], [0.8, 0.2]]
        
        # Mock scaler
        mock_scaler = mock_load_model.return_value.scaler
        mock_scaler.transform.return_value = [[75, 10.5, 80], [45, 5.2, 60]]
        
        # Test wrapped object format
        response = client.post("/ai/advanced-ml/predict-batch", json={"lead_ids": ["lead_1", "lead_2"]})
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "predictions" in data
        assert len(data["predictions"]) == 2
        assert data["model_version"] == "20250827_172908"
        assert data["model_sha256"] == "abc123def456"
        assert data["total_processed"] == 2
        assert data["successful_predictions"] == 2
        assert data["failed_predictions"] == 0
    
    def test_predict_batch_empty_request(self, client):
        """Test predict-batch endpoint with empty request"""
        response = client.post("/ai/advanced-ml/predict-batch", json=[])
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "lead_ids cannot be empty" in data["detail"]
    
    def test_predict_batch_too_many_leads(self, client):
        """Test predict-batch endpoint with too many leads"""
        # Create a list with more than 1000 leads
        lead_ids = [f"lead_{i}" for i in range(1001)]
        response = client.post("/ai/advanced-ml/predict-batch", json=lead_ids)
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Maximum 1000 leads per request" in data["detail"]
    
    @patch('app.ai.advanced_ml_hardened.load_active_model')
    def test_predict_batch_model_load_error(self, mock_load_model, client):
        """Test predict-batch endpoint when model loading fails"""
        # Mock model loading failure
        mock_load_model.side_effect = Exception("Model loading failed")
        
        response = client.post("/ai/advanced-ml/predict-batch", json=["lead_1"])
        
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        assert "Model loading failed" in data["detail"]
    
    @patch('app.ai.advanced_ml_hardened.load_active_model')
    @patch('app.ai.advanced_ml_hardened.fetch')
    def test_predict_batch_no_results(self, mock_fetch, mock_load_model, client):
        """Test predict-batch endpoint when no leads are found"""
        # Setup mocks
        mock_load_model.return_value = Mock(
            version="20250827_172908",
            sha256="abc123def456",
            feature_names=['lead_score', 'days_since_creation', 'engagement_score']
        )
        mock_fetch.return_value = []  # No results
        
        response = client.post("/ai/advanced-ml/predict-batch", json=["lead_1"])
        
        assert response.status_code == 200
        data = response.json()
        
        # Check empty response structure
        assert data["predictions"] == []
        assert data["total_processed"] == 0
        assert data["successful_predictions"] == 0
        assert data["failed_predictions"] == 0
    
    @patch('app.ai.advanced_ml_hardened.get_model_info')
    def test_health_check_healthy(self, mock_get_model_info, client):
        """Test health check endpoint when model is loaded"""
        # Mock healthy model info
        mock_get_model_info.return_value = {
            "status": "loaded",
            "version": "20250827_172908",
            "sha256": "abc123def456",
            "loaded_since_seconds": 3600.0,
            "feature_count": 20
        }
        
        response = client.get("/ai/advanced-ml/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert data["status"] == "healthy"
        assert data["model_version"] == "20250827_172908"
        assert data["model_sha256"] == "abc123def456"
        assert data["loaded"] == True
        assert data["since_seconds"] == 3600.0
        assert data["feature_count"] == 20
        assert data["cache_status"] == "hit"
    
    @patch('app.ai.advanced_ml_hardened.get_model_info')
    def test_health_check_unhealthy(self, mock_get_model_info, client):
        """Test health check endpoint when no model is loaded"""
        # Mock unhealthy model info
        mock_get_model_info.return_value = {
            "status": "no_model_loaded"
        }
        
        response = client.get("/ai/advanced-ml/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert data["status"] == "unhealthy"
        assert data["model_version"] is None
        assert data["model_sha256"] is None
        assert data["loaded"] == False
        assert data["since_seconds"] is None
        assert data["feature_count"] is None
        assert data["cache_status"] == "miss"
    
    @patch('app.ai.advanced_ml_hardened.get_model_info')
    def test_health_check_error(self, mock_get_model_info, client):
        """Test health check endpoint when error occurs"""
        # Mock error
        mock_get_model_info.side_effect = Exception("Database error")
        
        response = client.get("/ai/advanced-ml/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check error response structure
        assert data["status"] == "unhealthy"
        assert data["model_version"] is None
        assert data["model_sha256"] is None
        assert data["loaded"] == False
        assert data["since_seconds"] is None
        assert data["feature_count"] is None
        assert data["cache_status"] == "error"
    
    @patch('app.ai.advanced_ml_hardened.get_model_info')
    def test_model_info_endpoint(self, mock_get_model_info, client):
        """Test model info endpoint"""
        # Mock model info
        mock_get_model_info.return_value = {
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
        
        response = client.get("/ai/advanced-ml/models")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert data["status"] == "loaded"
        assert data["version"] == "20250827_172908"
        assert data["model_type"] == "random_forest"
        assert data["path"] == "/path/to/model.joblib"
        assert data["sha256"] == "abc123def456"
        assert data["loaded_at"] == 1640995200.0
        assert data["loaded_since_seconds"] == 3600.0
        assert data["feature_count"] == 20
        assert "performance" in data
    
    @patch('app.ai.advanced_ml_hardened.get_model_info')
    def test_model_info_endpoint_error(self, mock_get_model_info, client):
        """Test model info endpoint when error occurs"""
        # Mock error
        mock_get_model_info.side_effect = Exception("Database error")
        
        response = client.get("/ai/advanced-ml/models")
        
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "Failed to get model info" in data["detail"]
    
    def test_ml_info_endpoint(self, client):
        """Test ML info endpoint"""
        response = client.get("/ai/advanced-ml/")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "name" in data
        assert "version" in data
        assert "endpoints" in data
        assert "status" in data
        assert "models_loaded" in data
        
        # Check endpoints list
        expected_endpoints = [
            "/train", "/predict", "/predict-batch", "/models",
            "/activate", "/active", "/feature-analysis", "/health"
        ]
        for endpoint in expected_endpoints:
            assert endpoint in data["endpoints"]


class TestMLResponseValidation:
    """Test ML response validation and data types"""
    
    @patch('app.ai.advanced_ml_hardened.load_active_model')
    @patch('app.ai.advanced_ml_hardened.fetch')
    def test_prediction_response_data_types(self, mock_fetch, mock_load_model, client, mock_lead_data):
        """Test that prediction responses have correct data types"""
        # Setup mocks
        mock_load_model.return_value = Mock(
            version="20250827_172908",
            sha256="abc123def456",
            feature_names=['lead_score', 'days_since_creation', 'engagement_score'],
            scaler=Mock(),
            model=Mock()
        )
        mock_fetch.return_value = mock_lead_data
        
        # Mock model prediction
        mock_model = mock_load_model.return_value.model
        mock_model.predict.return_value = [1, 0]
        mock_model.predict_proba.return_value = [[0.3, 0.7], [0.8, 0.2]]
        
        # Mock scaler
        mock_scaler = mock_load_model.return_value.scaler
        mock_scaler.transform.return_value = [[75, 10.5, 80], [45, 5.2, 60]]
        
        response = client.post("/ai/advanced-ml/predict-batch", json=["lead_1", "lead_2"])
        
        assert response.status_code == 200
        data = response.json()
        
        # Check data types
        assert isinstance(data["predictions"], list)
        assert isinstance(data["model_version"], str)
        assert isinstance(data["model_sha256"], str)
        assert isinstance(data["total_processed"], int)
        assert isinstance(data["successful_predictions"], int)
        assert isinstance(data["failed_predictions"], int)
        assert isinstance(data["processing_time_ms"], (int, float))
        assert isinstance(data["cache_hit"], bool)
        
        # Check prediction item data types
        for prediction in data["predictions"]:
            assert isinstance(prediction["lead_id"], str)
            assert isinstance(prediction["probability"], (int, float))
            assert isinstance(prediction["confidence"], (int, float))
            assert isinstance(prediction["calibrated_probability"], (int, float))
            assert isinstance(prediction["features_present_ratio"], (int, float))
            assert isinstance(prediction["prediction"], bool)
    
    @patch('app.ai.advanced_ml_hardened.load_active_model')
    @patch('app.ai.advanced_ml_hardened.fetch')
    def test_prediction_response_value_ranges(self, mock_fetch, mock_load_model, client, mock_lead_data):
        """Test that prediction responses have values in correct ranges"""
        # Setup mocks
        mock_load_model.return_value = Mock(
            version="20250827_172908",
            sha256="abc123def456",
            feature_names=['lead_score', 'days_since_creation', 'engagement_score'],
            scaler=Mock(),
            model=Mock()
        )
        mock_fetch.return_value = mock_lead_data
        
        # Mock model prediction
        mock_model = mock_load_model.return_value.model
        mock_model.predict.return_value = [1, 0]
        mock_model.predict_proba.return_value = [[0.3, 0.7], [0.8, 0.2]]
        
        # Mock scaler
        mock_scaler = mock_load_model.return_value.scaler
        mock_scaler.transform.return_value = [[75, 10.5, 80], [45, 5.2, 60]]
        
        response = client.post("/ai/advanced-ml/predict-batch", json=["lead_1", "lead_2"])
        
        assert response.status_code == 200
        data = response.json()
        
        # Check value ranges
        assert data["total_processed"] >= 0
        assert data["successful_predictions"] >= 0
        assert data["failed_predictions"] >= 0
        assert data["processing_time_ms"] >= 0
        assert data["successful_predictions"] + data["failed_predictions"] == data["total_processed"]
        
        # Check prediction value ranges
        for prediction in data["predictions"]:
            assert 0 <= prediction["probability"] <= 1
            assert 0 <= prediction["confidence"] <= 1
            assert 0 <= prediction["calibrated_probability"] <= 1
            assert 0 <= prediction["features_present_ratio"] <= 1


if __name__ == "__main__":
    pytest.main([__file__])
