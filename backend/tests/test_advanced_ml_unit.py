"""
Unit tests for ML components

Tests calibration utilities, feature safety guards, and model registry functionality.
"""

import pytest
import numpy as np
import pandas as pd
from unittest.mock import Mock, patch
from pathlib import Path
import tempfile
import joblib

# Import the components to test
from app.ai.calibration import (
    sigmoid, calibrate_probability, calculate_confidence, 
    apply_probability_bounds, validate_probability, get_calibration_stats
)
from app.ai.feature_safety import (
    FeatureSafetyGuard, safe_impute_missing_values, 
    detect_feature_drift, get_feature_guard
)
from app.ai.model_registry import ModelRegistry, LoadedModel
from app.schemas.ai_ml import (
    normalize_predict_batch_request, create_error_response
)


class TestCalibration:
    """Test calibration utilities"""
    
    def test_sigmoid_basic(self):
        """Test basic sigmoid function"""
        # Test center point
        assert abs(sigmoid(0.5, center=0.5) - 0.5) < 0.01
        
        # Test bounds
        assert 0 <= sigmoid(0.0) <= 1
        assert 0 <= sigmoid(1.0) <= 1
        
        # Test monotonicity
        assert sigmoid(0.3) < sigmoid(0.7)
        assert sigmoid(0.1) < sigmoid(0.9)
    
    def test_sigmoid_steepness(self):
        """Test sigmoid with different steepness values"""
        # Higher steepness should create steeper curve
        x = 0.6
        steep_1 = sigmoid(x, steepness=1.0)
        steep_2 = sigmoid(x, steepness=2.0)
        steep_4 = sigmoid(x, steepness=4.0)
        
        # All should be monotonic with steepness
        assert steep_1 < steep_2 < steep_4
    
    def test_calibrate_probability_sigmoid(self):
        """Test probability calibration with sigmoid method"""
        # Test valid inputs
        assert 0 <= calibrate_probability(0.5, "sigmoid") <= 1
        assert 0 <= calibrate_probability(0.0, "sigmoid") <= 1
        assert 0 <= calibrate_probability(1.0, "sigmoid") <= 1
        
        # Test edge cases
        assert calibrate_probability(0.5, "sigmoid") == 0.5  # Center should stay center
        assert calibrate_probability(0.0, "sigmoid") < 0.5  # Low should stay low
        assert calibrate_probability(1.0, "sigmoid") > 0.5  # High should stay high
    
    def test_calibrate_probability_linear(self):
        """Test probability calibration with linear method"""
        # Test linear scaling
        result = calibrate_probability(0.5, "linear", min_prob=0.1, max_prob=0.9)
        assert 0.1 <= result <= 0.9
        
        # Test edge cases
        assert calibrate_probability(0.0, "linear", min_prob=0.1, max_prob=0.9) == 0.1
        assert calibrate_probability(1.0, "linear", min_prob=0.1, max_prob=0.9) == 0.9
    
    def test_calibrate_probability_invalid_inputs(self):
        """Test calibration with invalid inputs"""
        # Test NaN
        assert calibrate_probability(float('nan'), "sigmoid") == 0.5
        
        # Test infinity
        assert calibrate_probability(float('inf'), "sigmoid") == 0.5
        assert calibrate_probability(float('-inf'), "sigmoid") == 0.5
        
        # Test None
        assert calibrate_probability(None, "sigmoid") == 0.5
    
    def test_calculate_confidence_max_distance(self):
        """Test confidence calculation with max distance method"""
        # Test valid probabilities
        proba = np.array([0.3, 0.7])
        confidence = calculate_confidence(proba, "max_distance")
        assert 0 <= confidence <= 1
        
        # Test high confidence (far from 0.5)
        proba_high = np.array([0.1, 0.9])
        confidence_high = calculate_confidence(proba_high, "max_distance")
        assert confidence_high > 0.5
        
        # Test low confidence (close to 0.5)
        proba_low = np.array([0.4, 0.6])
        confidence_low = calculate_confidence(proba_low, "max_distance")
        assert confidence_low < 0.5
    
    def test_calculate_confidence_entropy(self):
        """Test confidence calculation with entropy method"""
        # Test high confidence (low entropy)
        proba_high = np.array([0.1, 0.9])
        confidence_high = calculate_confidence(proba_high, "entropy")
        assert confidence_high > 0.5
        
        # Test low confidence (high entropy)
        proba_low = np.array([0.5, 0.5])
        confidence_low = calculate_confidence(proba_low, "entropy")
        assert confidence_low < 0.5
    
    def test_apply_probability_bounds(self):
        """Test probability bounds application"""
        # Test within bounds
        assert apply_probability_bounds(0.5) == 0.5
        
        # Test below minimum
        assert apply_probability_bounds(0.0, min_prob=0.1) == 0.1
        
        # Test above maximum
        assert apply_probability_bounds(1.0, max_prob=0.9) == 0.9
        
        # Test NaN/inf
        assert apply_probability_bounds(float('nan')) == 0.5
        assert apply_probability_bounds(float('inf')) == 0.5
    
    def test_validate_probability(self):
        """Test probability validation"""
        # Test valid probabilities
        assert validate_probability(0.5) == True
        assert validate_probability(0.0) == True
        assert validate_probability(1.0) == True
        
        # Test invalid probabilities
        assert validate_probability(1.5) == False  # Above 1
        assert validate_probability(-0.1) == False  # Below 0
        assert validate_probability(float('nan')) == False
        assert validate_probability(float('inf')) == False
        assert validate_probability("not_a_number") == False
    
    def test_get_calibration_stats(self):
        """Test calibration statistics calculation"""
        # Test with valid probabilities
        probs = [0.1, 0.3, 0.5, 0.7, 0.9]
        stats = get_calibration_stats(probs)
        
        assert stats["count"] == 5
        assert stats["mean"] == 0.5
        assert stats["min"] == 0.1
        assert stats["max"] == 0.9
        assert stats["invalid_count"] == 0
        
        # Test with invalid probabilities
        probs_mixed = [0.1, float('nan'), 0.5, float('inf'), 0.9]
        stats_mixed = get_calibration_stats(probs_mixed)
        
        assert stats_mixed["count"] == 3  # Only valid ones
        assert stats_mixed["invalid_count"] == 2


class TestFeatureSafety:
    """Test feature safety guards"""
    
    def test_feature_safety_guard_init(self):
        """Test FeatureSafetyGuard initialization"""
        guard = FeatureSafetyGuard()
        assert guard.default_numeric == 0.0
        assert guard.default_categorical == "unknown"
        assert guard.min_coverage_ratio == 0.6
    
    def test_safe_numeric_value(self):
        """Test safe numeric value conversion"""
        guard = FeatureSafetyGuard()
        
        # Test valid values
        assert guard.safe_numeric_value(5.0, "test") == 5.0
        assert guard.safe_numeric_value("5.0", "test") == 5.0
        assert guard.safe_numeric_value(5, "test") == 5.0
        
        # Test None
        assert guard.safe_numeric_value(None, "test") == 0.0
        
        # Test NaN
        assert guard.safe_numeric_value(float('nan'), "test") == 0.0
        
        # Test infinity
        assert guard.safe_numeric_value(float('inf'), "test") == 1000.0  # Clamped
        assert guard.safe_numeric_value(float('-inf'), "test") == -1000.0  # Clamped
        
        # Test invalid string
        assert guard.safe_numeric_value("not_a_number", "test") == 0.0
    
    def test_safe_categorical_value(self):
        """Test safe categorical value conversion"""
        guard = FeatureSafetyGuard()
        
        # Test valid values
        assert guard.safe_categorical_value("test", "test") == "test"
        assert guard.safe_categorical_value(123, "test") == "123"
        
        # Test None/NaN
        assert guard.safe_categorical_value(None, "test") == "unknown"
        assert guard.safe_categorical_value(float('nan'), "test") == "unknown"
        
        # Test empty string
        assert guard.safe_categorical_value("", "test") == "unknown"
        assert guard.safe_categorical_value("   ", "test") == "unknown"
    
    def test_calculate_feature_coverage(self):
        """Test feature coverage calculation"""
        guard = FeatureSafetyGuard()
        
        # Test with valid features
        features = [1.0, 2.0, 3.0, 4.0, 5.0]
        coverage = guard.calculate_feature_coverage(features, "test")
        assert coverage == 1.0
        
        # Test with some invalid features
        features_mixed = [1.0, float('nan'), 3.0, None, 5.0]
        coverage_mixed = guard.calculate_feature_coverage(features_mixed, "test")
        assert coverage_mixed == 0.6  # 3 out of 5 valid
        
        # Test with all invalid features
        features_invalid = [float('nan'), None, float('inf')]
        coverage_invalid = guard.calculate_feature_coverage(features_invalid, "test")
        assert coverage_invalid == 0.0
    
    def test_safe_feature_vector(self):
        """Test safe feature vector creation"""
        guard = FeatureSafetyGuard()
        
        # Test valid features
        features = [1.0, 2.0, 3.0]
        feature_names = ["f1", "f2", "f3"]
        safe_features, coverage = guard.safe_feature_vector(features, feature_names)
        
        assert len(safe_features) == 3
        assert coverage > 0.9  # High coverage for valid features
        assert all(isinstance(f, float) for f in safe_features)
        
        # Test with invalid features
        features_invalid = [1.0, float('nan'), None]
        safe_features_invalid, coverage_invalid = guard.safe_feature_vector(features_invalid, feature_names)
        
        assert len(safe_features_invalid) == 3
        assert coverage_invalid < 0.9  # Lower coverage for invalid features
    
    def test_validate_feature_vector(self):
        """Test feature vector validation"""
        guard = FeatureSafetyGuard()
        
        # Test valid vector
        features_valid = [1.0, 2.0, 3.0]
        feature_names = ["f1", "f2", "f3"]
        validation = guard.validate_feature_vector(features_valid, feature_names)
        
        assert validation["valid"] == True
        assert validation["coverage_ratio"] == 1.0
        assert validation["nan_count"] == 0
        assert validation["inf_count"] == 0
        
        # Test invalid vector
        features_invalid = [1.0, float('nan'), float('inf')]
        validation_invalid = guard.validate_feature_vector(features_invalid, feature_names)
        
        assert validation_invalid["valid"] == False
        assert validation_invalid["nan_count"] == 1
        assert validation_invalid["inf_count"] == 1
    
    def test_safe_impute_missing_values(self):
        """Test missing value imputation"""
        # Create test DataFrame with missing values
        df = pd.DataFrame({
            'numeric1': [1.0, 2.0, np.nan, 4.0],
            'numeric2': [5.0, np.nan, 7.0, 8.0],
            'categorical1': ['a', 'b', np.nan, 'd'],
            'categorical2': ['x', np.nan, 'z', np.nan]
        })
        
        # Test imputation
        df_imputed = safe_impute_missing_values(df)
        
        # Check that no NaN values remain
        assert not df_imputed.isna().any().any()
        
        # Check that numeric columns are filled
        assert not df_imputed['numeric1'].isna().any()
        assert not df_imputed['numeric2'].isna().any()
        
        # Check that categorical columns are filled
        assert not df_imputed['categorical1'].isna().any()
        assert not df_imputed['categorical2'].isna().any()
    
    def test_detect_feature_drift(self):
        """Test feature drift detection"""
        # Test with similar distributions (no drift)
        ref_features = [1.0, 2.0, 3.0, 4.0, 5.0]
        curr_features = [1.1, 2.1, 2.9, 4.1, 4.9]
        
        drift_result = detect_feature_drift(ref_features, curr_features, threshold=0.1)
        assert drift_result["drift_detected"] == False
        
        # Test with different distributions (drift detected)
        ref_features = [1.0, 2.0, 3.0, 4.0, 5.0]
        curr_features = [10.0, 20.0, 30.0, 40.0, 50.0]
        
        drift_result = detect_feature_drift(ref_features, curr_features, threshold=0.1)
        assert drift_result["drift_detected"] == True


class TestModelRegistry:
    """Test model registry functionality"""
    
    def test_model_registry_init(self):
        """Test ModelRegistry initialization"""
        with tempfile.TemporaryDirectory() as temp_dir:
            registry = ModelRegistry(Path(temp_dir))
            assert registry.models_dir == Path(temp_dir)
            assert registry.active_pattern == "advanced_ml_random_forest_*.joblib"
            assert registry.cache_ttl_seconds == 3600
    
    def test_hash_file(self):
        """Test file hashing"""
        with tempfile.TemporaryDirectory() as temp_dir:
            registry = ModelRegistry(Path(temp_dir))
            
            # Create a test file
            test_file = Path(temp_dir) / "test.txt"
            test_file.write_text("test content")
            
            # Test hashing
            hash1 = registry._hash_file(test_file)
            hash2 = registry._hash_file(test_file)
            
            assert hash1 == hash2  # Same file should produce same hash
            assert len(hash1) == 64  # SHA256 produces 64 character hex string
    
    def test_extract_version_from_filename(self):
        """Test version extraction from filename"""
        with tempfile.TemporaryDirectory() as temp_dir:
            registry = ModelRegistry(Path(temp_dir))
            
            # Test with standard filename
            test_file = Path(temp_dir) / "advanced_ml_random_forest_20250827_172908.joblib"
            version = registry._extract_version_from_filename(test_file)
            assert version == "20250827_172908"
            
            # Test with non-standard filename
            test_file2 = Path(temp_dir) / "other_model.joblib"
            version2 = registry._extract_version_from_filename(test_file2)
            assert version2 != "unknown"  # Should fall back to mtime
    
    def test_is_cache_valid(self):
        """Test cache validity checking"""
        with tempfile.TemporaryDirectory() as temp_dir:
            registry = ModelRegistry(Path(temp_dir), cache_ttl_seconds=1)
            
            # Test with no cache
            assert not registry._is_cache_valid()
            
            # Test with valid cache
            registry._cache = Mock()
            registry._last_load_time = time.time()
            assert registry._is_cache_valid()
            
            # Test with expired cache
            registry._last_load_time = time.time() - 2  # 2 seconds ago
            assert not registry._is_cache_valid()
    
    def test_validate_model_integrity(self):
        """Test model integrity validation"""
        with tempfile.TemporaryDirectory() as temp_dir:
            registry = ModelRegistry(Path(temp_dir))
            
            # Create a mock model file
            mock_model_data = {
                'model': Mock(),
                'scaler': Mock(),
                'feature_names': ['f1', 'f2'],
                'performance': {'accuracy': 0.8},
                'feature_importance': {'f1': 0.6, 'f2': 0.4}
            }
            
            # Add predict and predict_proba methods to mock model
            mock_model_data['model'].predict = Mock(return_value=[0, 1])
            mock_model_data['model'].predict_proba = Mock(return_value=[[0.3, 0.7], [0.8, 0.2]])
            
            # Save mock model
            model_file = Path(temp_dir) / "test_model.joblib"
            joblib.dump(mock_model_data, model_file)
            
            # Test validation
            assert registry.validate_model_integrity(model_file) == True
            
            # Test with invalid model (missing keys)
            invalid_data = {'model': Mock()}
            invalid_file = Path(temp_dir) / "invalid_model.joblib"
            joblib.dump(invalid_data, invalid_file)
            
            assert registry.validate_model_integrity(invalid_file) == False


class TestSchemas:
    """Test Pydantic schemas"""
    
    def test_normalize_predict_batch_request_list(self):
        """Test request normalization with list format"""
        # Test raw array format
        lead_ids = ["id1", "id2", "id3"]
        normalized = normalize_predict_batch_request(lead_ids)
        assert normalized == lead_ids
    
    def test_normalize_predict_batch_request_dict(self):
        """Test request normalization with dict format"""
        # Test wrapped object format
        request = {"lead_ids": ["id1", "id2", "id3"]}
        normalized = normalize_predict_batch_request(request)
        assert normalized == ["id1", "id2", "id3"]
    
    def test_normalize_predict_batch_request_invalid(self):
        """Test request normalization with invalid format"""
        # Test invalid format
        with pytest.raises(ValueError):
            normalize_predict_batch_request("not_a_list_or_dict")
    
    def test_create_error_response(self):
        """Test error response creation"""
        error_response = create_error_response(
            "test_error", 
            "Test error message", 
            {"detail": "test detail"},
            "req_123"
        )
        
        assert error_response.error == "test_error"
        assert error_response.message == "Test error message"
        assert error_response.details == {"detail": "test detail"}
        assert error_response.request_id == "req_123"
        assert error_response.timestamp is not None


if __name__ == "__main__":
    pytest.main([__file__])
