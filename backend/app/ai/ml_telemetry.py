"""
Structured telemetry for ML operations

Provides comprehensive logging and monitoring for ML prediction operations.
Tracks model performance, feature coverage, prediction latency, and errors.
"""

import time
import uuid
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging

from app.telemetry import log_ai_event_extended
from app.ai.model_registry import get_model_info

logger = logging.getLogger(__name__)


class MLTelemetry:
    """
    Telemetry collector for ML operations.
    
    Tracks:
    - Prediction latency and throughput
    - Model version and artifact integrity
    - Feature coverage and quality
    - Cache hit/miss rates
    - Error rates and types
    - Prediction accuracy (when ground truth available)
    """
    
    def __init__(self):
        self.request_count = 0
        self.cache_hits = 0
        self.cache_misses = 0
        self.error_count = 0
        self.total_latency_ms = 0.0
    
    def start_prediction_request(self, lead_count: int, request_id: Optional[str] = None) -> str:
        """
        Start tracking a prediction request.
        
        Args:
            lead_count: Number of leads being processed
            request_id: Optional request ID (generated if not provided)
            
        Returns:
            Request ID for tracking
        """
        if request_id is None:
            request_id = str(uuid.uuid4())
        
        self.request_count += 1
        
        # Log request start
        asyncio.create_task(log_ai_event_extended(
            action="ml.prediction.start",
            meta={
                "request_id": request_id,
                "lead_count": lead_count,
                "timestamp": time.time()
            }
        ))
        
        return request_id
    
    def log_prediction_success(self, 
                              request_id: str,
                              lead_count: int,
                              latency_ms: float,
                              model_version: str,
                              model_sha256: str,
                              features_present_ratio: float,
                              cache_hit: bool,
                              predictions: List[Dict[str, Any]]) -> None:
        """
        Log successful prediction completion.
        
        Args:
            request_id: Request identifier
            lead_count: Number of leads processed
            latency_ms: Total processing time in milliseconds
            model_version: Model version used
            model_sha256: SHA256 hash of model artifact
            features_present_ratio: Average feature coverage ratio
            cache_hit: Whether result was served from cache
            predictions: List of prediction results
        """
        # Update counters
        if cache_hit:
            self.cache_hits += 1
        else:
            self.cache_misses += 1
        
        self.total_latency_ms += latency_ms
        
        # Calculate prediction statistics
        probabilities = [p.get('probability', 0) for p in predictions if p.get('probability') is not None]
        confidences = [p.get('confidence', 0) for p in predictions if p.get('confidence') is not None]
        
        # Log success event
        asyncio.create_task(log_ai_event_extended(
            action="ml.prediction.success",
            meta={
                "request_id": request_id,
                "lead_count": lead_count,
                "latency_ms": latency_ms,
                "model_version": model_version,
                "model_sha256": model_sha256,
                "features_present_ratio": features_present_ratio,
                "cache_hit": cache_hit,
                "successful_predictions": len([p for p in predictions if p.get('probability') is not None]),
                "failed_predictions": len([p for p in predictions if p.get('probability') is None]),
                "avg_probability": sum(probabilities) / len(probabilities) if probabilities else 0,
                "avg_confidence": sum(confidences) / len(confidences) if confidences else 0,
                "min_probability": min(probabilities) if probabilities else 0,
                "max_probability": max(probabilities) if probabilities else 0
            }
        ))
    
    def log_prediction_error(self, 
                           request_id: str,
                           error_type: str,
                           error_message: str,
                           lead_count: int,
                           latency_ms: float,
                           model_version: Optional[str] = None) -> None:
        """
        Log prediction error.
        
        Args:
            request_id: Request identifier
            error_type: Type of error (e.g., "model_load_error", "feature_error")
            error_message: Error message
            lead_count: Number of leads being processed
            latency_ms: Processing time before error
            model_version: Model version (if available)
        """
        self.error_count += 1
        
        asyncio.create_task(log_ai_event_extended(
            action="ml.prediction.error",
            meta={
                "request_id": request_id,
                "error_type": error_type,
                "error_message": error_message,
                "lead_count": lead_count,
                "latency_ms": latency_ms,
                "model_version": model_version,
                "timestamp": time.time()
            }
        ))
    
    def log_model_load(self, 
                      model_version: str,
                      model_sha256: str,
                      load_time_ms: float,
                      cache_hit: bool,
                      feature_count: int) -> None:
        """
        Log model loading event.
        
        Args:
            model_version: Model version
            model_sha256: SHA256 hash of model artifact
            load_time_ms: Model loading time in milliseconds
            cache_hit: Whether model was loaded from cache
            feature_count: Number of features in the model
        """
        asyncio.create_task(log_ai_event_extended(
            action="ml.model.load",
            meta={
                "model_version": model_version,
                "model_sha256": model_sha256,
                "load_time_ms": load_time_ms,
                "cache_hit": cache_hit,
                "feature_count": feature_count,
                "timestamp": time.time()
            }
        ))
    
    def log_feature_engineering(self, 
                               request_id: str,
                               feature_count: int,
                               features_present_ratio: float,
                               engineering_time_ms: float,
                               validation_passed: bool) -> None:
        """
        Log feature engineering event.
        
        Args:
            request_id: Request identifier
            feature_count: Number of features processed
            features_present_ratio: Ratio of features available
            engineering_time_ms: Feature engineering time in milliseconds
            validation_passed: Whether feature validation passed
        """
        asyncio.create_task(log_ai_event_extended(
            action="ml.feature_engineering",
            meta={
                "request_id": request_id,
                "feature_count": feature_count,
                "features_present_ratio": features_present_ratio,
                "engineering_time_ms": engineering_time_ms,
                "validation_passed": validation_passed,
                "timestamp": time.time()
            }
        ))
    
    def log_calibration(self, 
                       request_id: str,
                       raw_probabilities: List[float],
                       calibrated_probabilities: List[float],
                       calibration_time_ms: float) -> None:
        """
        Log probability calibration event.
        
        Args:
            request_id: Request identifier
            raw_probabilities: Raw probabilities from model
            calibrated_probabilities: Calibrated probabilities
            calibration_time_ms: Calibration time in milliseconds
        """
        if not raw_probabilities or not calibrated_probabilities:
            return
        
        # Calculate calibration statistics
        raw_mean = sum(raw_probabilities) / len(raw_probabilities)
        calibrated_mean = sum(calibrated_probabilities) / len(calibrated_probabilities)
        
        asyncio.create_task(log_ai_event_extended(
            action="ml.calibration",
            meta={
                "request_id": request_id,
                "raw_mean": raw_mean,
                "calibrated_mean": calibrated_mean,
                "calibration_shift": calibrated_mean - raw_mean,
                "calibration_time_ms": calibration_time_ms,
                "probability_count": len(raw_probabilities),
                "timestamp": time.time()
            }
        ))
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """
        Get summary metrics for ML operations.
        
        Returns:
            Dictionary with aggregated metrics
        """
        avg_latency = self.total_latency_ms / max(1, self.request_count)
        cache_hit_rate = self.cache_hits / max(1, self.cache_hits + self.cache_misses)
        error_rate = self.error_count / max(1, self.request_count)
        
        return {
            "total_requests": self.request_count,
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_hit_rate": cache_hit_rate,
            "error_count": self.error_count,
            "error_rate": error_rate,
            "avg_latency_ms": avg_latency,
            "total_latency_ms": self.total_latency_ms
        }
    
    def reset_metrics(self):
        """Reset all metrics counters."""
        self.request_count = 0
        self.cache_hits = 0
        self.cache_misses = 0
        self.error_count = 0
        self.total_latency_ms = 0.0


# Global telemetry instance
_ml_telemetry = MLTelemetry()


def get_ml_telemetry() -> MLTelemetry:
    """Get the global ML telemetry instance"""
    return _ml_telemetry


def log_prediction_request(lead_count: int, request_id: Optional[str] = None) -> str:
    """Convenience function to start tracking a prediction request"""
    return get_ml_telemetry().start_prediction_request(lead_count, request_id)


def log_prediction_success(request_id: str, 
                          lead_count: int, 
                          latency_ms: float, 
                          model_version: str, 
                          model_sha256: str, 
                          features_present_ratio: float, 
                          cache_hit: bool, 
                          predictions: List[Dict[str, Any]]) -> None:
    """Convenience function to log successful prediction"""
    get_ml_telemetry().log_prediction_success(
        request_id, lead_count, latency_ms, model_version, model_sha256,
        features_present_ratio, cache_hit, predictions
    )


def log_prediction_error(request_id: str, 
                        error_type: str, 
                        error_message: str, 
                        lead_count: int, 
                        latency_ms: float, 
                        model_version: Optional[str] = None) -> None:
    """Convenience function to log prediction error"""
    get_ml_telemetry().log_prediction_error(
        request_id, error_type, error_message, lead_count, latency_ms, model_version
    )


def log_model_load(model_version: str, 
                  model_sha256: str, 
                  load_time_ms: float, 
                  cache_hit: bool, 
                  feature_count: int) -> None:
    """Convenience function to log model loading"""
    get_ml_telemetry().log_model_load(
        model_version, model_sha256, load_time_ms, cache_hit, feature_count
    )


def log_feature_engineering(request_id: str, 
                           feature_count: int, 
                           features_present_ratio: float, 
                           engineering_time_ms: float, 
                           validation_passed: bool) -> None:
    """Convenience function to log feature engineering"""
    get_ml_telemetry().log_feature_engineering(
        request_id, feature_count, features_present_ratio, engineering_time_ms, validation_passed
    )


def log_calibration(request_id: str, 
                   raw_probabilities: List[float], 
                   calibrated_probabilities: List[float], 
                   calibration_time_ms: float) -> None:
    """Convenience function to log calibration"""
    get_ml_telemetry().log_calibration(
        request_id, raw_probabilities, calibrated_probabilities, calibration_time_ms
    )


def get_ml_metrics() -> Dict[str, Any]:
    """Convenience function to get ML metrics summary"""
    return get_ml_telemetry().get_metrics_summary()


def reset_ml_metrics() -> None:
    """Convenience function to reset ML metrics"""
    get_ml_telemetry().reset_metrics()
