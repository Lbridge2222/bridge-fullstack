"""
Calibration utilities for ML predictions

Provides probability calibration and confidence scoring for ML predictions.
Handles sigmoid calibration, confidence intervals, and probability bounds.
"""

import numpy as np
from typing import List, Tuple, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


def sigmoid(x: float, steepness: float = 2.0, center: float = 0.5) -> float:
    """
    Sigmoid function for probability calibration.
    
    Args:
        x: Input value (typically raw probability)
        steepness: Controls the steepness of the curve (default: 2.0)
        center: Center point of the sigmoid (default: 0.5)
        
    Returns:
        Calibrated probability in [0, 1] range
    """
    try:
        # Apply sigmoid transformation
        z = steepness * (x - center)
        calibrated = 1.0 / (1.0 + np.exp(-z))
        
        # Ensure bounds
        return max(0.0, min(1.0, calibrated))
    except Exception as e:
        logger.warning(f"Sigmoid calibration failed for x={x}: {e}")
        return 0.5


def calibrate_probability(raw_prob: float, method: str = "sigmoid", **kwargs) -> float:
    """
    Calibrate raw probability using specified method.
    
    Args:
        raw_prob: Raw probability from model (0-1)
        method: Calibration method ("sigmoid", "linear", "none")
        **kwargs: Additional parameters for calibration method
        
    Returns:
        Calibrated probability in [0, 1] range
    """
    if not isinstance(raw_prob, (int, float)) or np.isnan(raw_prob) or np.isinf(raw_prob):
        logger.warning(f"Invalid raw probability: {raw_prob}")
        return 0.5
    
    # Clamp raw probability to valid range
    raw_prob = max(0.0, min(1.0, float(raw_prob)))
    
    if method == "sigmoid":
        steepness = kwargs.get("steepness", 2.0)
        center = kwargs.get("center", 0.5)
        return sigmoid(raw_prob, steepness, center)
    
    elif method == "linear":
        # Simple linear scaling to spread probabilities
        min_prob = kwargs.get("min_prob", 0.05)
        max_prob = kwargs.get("max_prob", 0.95)
        return min_prob + (max_prob - min_prob) * raw_prob
    
    elif method == "none":
        return raw_prob
    
    else:
        logger.warning(f"Unknown calibration method: {method}")
        return raw_prob


def calculate_confidence(prediction_proba: np.ndarray, method: str = "max_distance") -> float:
    """
    Calculate confidence score from prediction probabilities.
    
    Args:
        prediction_proba: Array of class probabilities [prob_class_0, prob_class_1]
        method: Confidence calculation method
        
    Returns:
        Confidence score in [0, 1] range
    """
    if prediction_proba is None or len(prediction_proba) == 0:
        return 0.5
    
    try:
        # Ensure we have valid probabilities
        if np.any(np.isnan(prediction_proba)) or np.any(np.isinf(prediction_proba)):
            logger.warning("Invalid probabilities detected in confidence calculation")
            return 0.5
        
        # Normalize probabilities
        prob_sum = np.sum(prediction_proba)
        if prob_sum > 0:
            prediction_proba = prediction_proba / prob_sum
        
        if method == "max_distance":
            # Distance from 0.5 (uncertainty)
            max_prob = np.max(prediction_proba)
            confidence = abs(max_prob - 0.5) * 2
            return max(0.0, min(1.0, confidence))
        
        elif method == "entropy":
            # Entropy-based confidence (lower entropy = higher confidence)
            # Avoid log(0) by adding small epsilon
            epsilon = 1e-10
            probs = np.clip(prediction_proba, epsilon, 1.0)
            entropy = -np.sum(probs * np.log(probs))
            max_entropy = np.log(len(probs))
            confidence = 1.0 - (entropy / max_entropy)
            return max(0.0, min(1.0, confidence))
        
        elif method == "variance":
            # Variance-based confidence (lower variance = higher confidence)
            variance = np.var(prediction_proba)
            confidence = 1.0 - min(1.0, variance * 4)  # Scale variance to [0,1]
            return max(0.0, min(1.0, confidence))
        
        else:
            logger.warning(f"Unknown confidence method: {method}")
            return 0.5
    
    except Exception as e:
        logger.error(f"Confidence calculation failed: {e}")
        return 0.5


def apply_probability_bounds(probability: float, min_prob: float = 0.05, max_prob: float = 0.95) -> float:
    """
    Apply bounds to probability to prevent extreme values.
    
    Args:
        probability: Input probability
        min_prob: Minimum allowed probability
        max_prob: Maximum allowed probability
        
    Returns:
        Bounded probability
    """
    if np.isnan(probability) or np.isinf(probability):
        return 0.5
    
    return max(min_prob, min(max_prob, float(probability)))


def calibrate_batch_probabilities(raw_probs: List[float], method: str = "sigmoid", **kwargs) -> List[float]:
    """
    Calibrate a batch of probabilities.
    
    Args:
        raw_probs: List of raw probabilities
        method: Calibration method
        **kwargs: Additional parameters
        
    Returns:
        List of calibrated probabilities
    """
    return [calibrate_probability(prob, method, **kwargs) for prob in raw_probs]


def calculate_batch_confidence(prediction_probas: List[np.ndarray], method: str = "max_distance") -> List[float]:
    """
    Calculate confidence scores for a batch of predictions.
    
    Args:
        prediction_probas: List of prediction probability arrays
        method: Confidence calculation method
        
    Returns:
        List of confidence scores
    """
    return [calculate_confidence(proba, method) for proba in prediction_probas]


def validate_probability(probability: float, name: str = "probability") -> bool:
    """
    Validate that a probability is in valid range and not NaN/inf.
    
    Args:
        probability: Probability value to validate
        name: Name of the probability for error messages
        
    Returns:
        True if valid, False otherwise
    """
    if not isinstance(probability, (int, float)):
        logger.warning(f"{name} is not a number: {type(probability)}")
        return False
    
    if np.isnan(probability):
        logger.warning(f"{name} is NaN")
        return False
    
    if np.isinf(probability):
        logger.warning(f"{name} is infinite")
        return False
    
    if not (0.0 <= probability <= 1.0):
        logger.warning(f"{name} is out of range [0,1]: {probability}")
        return False
    
    return True


def get_calibration_stats(probabilities: List[float]) -> Dict[str, Any]:
    """
    Get statistics about a set of probabilities for monitoring.
    
    Args:
        probabilities: List of probabilities
        
    Returns:
        Dictionary with calibration statistics
    """
    if not probabilities:
        return {"count": 0, "mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0}
    
    probs = np.array(probabilities)
    valid_probs = probs[~np.isnan(probs) & ~np.isinf(probs)]
    
    if len(valid_probs) == 0:
        return {"count": 0, "mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0, "invalid_count": len(probabilities)}
    
    return {
        "count": len(valid_probs),
        "mean": float(np.mean(valid_probs)),
        "std": float(np.std(valid_probs)),
        "min": float(np.min(valid_probs)),
        "max": float(np.max(valid_probs)),
        "median": float(np.median(valid_probs)),
        "q25": float(np.percentile(valid_probs, 25)),
        "q75": float(np.percentile(valid_probs, 75)),
        "invalid_count": len(probabilities) - len(valid_probs)
    }
