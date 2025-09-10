"""
Feature safety utilities for ML predictions

Provides robust feature engineering with safety guards for missing values,
NaN/inf handling, and feature coverage tracking.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class FeatureSafetyGuard:
    """
    Safety guard for feature engineering that handles missing values,
    NaN/inf values, and tracks feature coverage.
    """
    
    def __init__(self, 
                 default_numeric: float = 0.0,
                 default_categorical: str = "unknown",
                 min_coverage_ratio: float = 0.6,
                 handle_nan: str = "impute",  # "impute", "zero", "drop"
                 handle_inf: str = "clamp"):  # "clamp", "zero", "drop"
        self.default_numeric = default_numeric
        self.default_categorical = default_categorical
        self.min_coverage_ratio = min_coverage_ratio
        self.handle_nan = handle_nan
        self.handle_inf = handle_inf
        self.feature_stats = {}
    
    def safe_numeric_value(self, value: Any, feature_name: str) -> float:
        """
        Safely convert a value to numeric, handling NaN/inf.
        
        Args:
            value: Input value
            feature_name: Name of the feature for logging
            
        Returns:
            Safe numeric value
        """
        if value is None:
            return self.default_numeric
        
        try:
            # Convert to float
            numeric_value = float(value)
            
            # Handle NaN
            if np.isnan(numeric_value):
                if self.handle_nan == "impute":
                    # Use median if available, otherwise default
                    median = self.feature_stats.get(f"{feature_name}_median", self.default_numeric)
                    return median
                elif self.handle_nan == "zero":
                    return 0.0
                else:  # drop
                    return self.default_numeric
            
            # Handle infinity
            if np.isinf(numeric_value):
                if self.handle_inf == "clamp":
                    # Clamp to reasonable range
                    return max(-1000.0, min(1000.0, numeric_value))
                elif self.handle_inf == "zero":
                    return 0.0
                else:  # drop
                    return self.default_numeric
            
            return numeric_value
            
        except (ValueError, TypeError) as e:
            logger.warning(f"Could not convert {value} to numeric for {feature_name}: {e}")
            return self.default_numeric
    
    def safe_categorical_value(self, value: Any, feature_name: str) -> str:
        """
        Safely convert a value to categorical string.
        
        Args:
            value: Input value
            feature_name: Name of the feature for logging
            
        Returns:
            Safe categorical value
        """
        if value is None or pd.isna(value):
            return self.default_categorical
        
        try:
            # Convert to string and clean
            str_value = str(value).strip()
            if not str_value or str_value.lower() in ['nan', 'none', 'null']:
                return self.default_categorical
            return str_value
        except Exception as e:
            logger.warning(f"Could not convert {value} to categorical for {feature_name}: {e}")
            return self.default_categorical
    
    def calculate_feature_coverage(self, features: List[Any], feature_name: str) -> float:
        """
        Calculate the ratio of non-null features.
        
        Args:
            features: List of feature values
            feature_name: Name of the feature
            
        Returns:
            Coverage ratio (0.0 to 1.0)
        """
        if not features:
            return 0.0
        
        # Count non-null, non-NaN, non-inf values
        valid_count = 0
        for value in features:
            if value is None:
                continue
                
            try:
                # Try to convert to float for numeric checks
                numeric_value = float(value)
                if (not np.isnan(numeric_value) and 
                    not np.isinf(numeric_value) and 
                    numeric_value != self.default_numeric):
                    valid_count += 1
            except (ValueError, TypeError):
                # For non-numeric values, check if they're meaningful
                if str(value).strip() and str(value).lower() not in ['nan', 'none', 'null', '']:
                    valid_count += 1
        
        coverage = valid_count / len(features)
        
        # Store coverage for this feature
        self.feature_stats[f"{feature_name}_coverage"] = coverage
        
        return coverage
    
    def safe_feature_vector(self, features: List[Any], feature_names: List[str]) -> Tuple[List[float], float]:
        """
        Create a safe feature vector with coverage tracking.
        
        Args:
            features: List of feature values
            feature_names: List of feature names
            
        Returns:
            Tuple of (safe_features, overall_coverage_ratio)
        """
        if len(features) != len(feature_names):
            logger.warning(f"Feature count mismatch: {len(features)} values, {len(feature_names)} names")
            # Pad or truncate to match
            if len(features) < len(feature_names):
                features = features + [self.default_numeric] * (len(feature_names) - len(features))
            else:
                features = features[:len(feature_names)]
        
        safe_features = []
        coverage_ratios = []
        
        for i, (value, name) in enumerate(zip(features, feature_names)):
            # Convert to safe numeric value
            safe_value = self.safe_numeric_value(value, name)
            safe_features.append(safe_value)
            
            # Calculate coverage for this feature
            coverage = self.calculate_feature_coverage([value], name)
            coverage_ratios.append(coverage)
        
        # Calculate overall coverage ratio
        overall_coverage = np.mean(coverage_ratios) if coverage_ratios else 0.0
        
        return safe_features, overall_coverage
    
    def validate_feature_vector(self, features: List[float], feature_names: List[str]) -> Dict[str, Any]:
        """
        Validate a feature vector and return diagnostic information.
        
        Args:
            features: List of feature values
            feature_names: List of feature names
            
        Returns:
            Dictionary with validation results
        """
        if not features or not feature_names:
            return {
                "valid": False,
                "error": "Empty features or feature names",
                "coverage_ratio": 0.0
            }
        
        # Check for NaN/inf values
        nan_count = sum(1 for f in features if np.isnan(f))
        inf_count = sum(1 for f in features if np.isinf(f))
        null_count = sum(1 for f in features if f is None)
        
        # Calculate coverage
        valid_count = len(features) - nan_count - inf_count - null_count
        coverage_ratio = valid_count / len(features)
        
        # Check if coverage meets minimum threshold
        meets_threshold = coverage_ratio >= self.min_coverage_ratio
        
        return {
            "valid": meets_threshold and nan_count == 0 and inf_count == 0,
            "coverage_ratio": coverage_ratio,
            "meets_threshold": meets_threshold,
            "nan_count": nan_count,
            "inf_count": inf_count,
            "null_count": null_count,
            "valid_count": valid_count,
            "total_count": len(features)
        }
    
    def get_feature_stats(self) -> Dict[str, Any]:
        """Get statistics about processed features"""
        return self.feature_stats.copy()
    
    def reset_stats(self):
        """Reset feature statistics"""
        self.feature_stats = {}


def safe_impute_missing_values(df: pd.DataFrame, 
                              numeric_strategy: str = "median",
                              categorical_strategy: str = "mode") -> pd.DataFrame:
    """
    Safely impute missing values in a DataFrame.
    
    Args:
        df: Input DataFrame
        numeric_strategy: Strategy for numeric columns ("median", "mean", "zero")
        categorical_strategy: Strategy for categorical columns ("mode", "constant")
        
    Returns:
        DataFrame with imputed values
    """
    df_safe = df.copy()
    
    # Handle numeric columns
    numeric_columns = df_safe.select_dtypes(include=[np.number]).columns
    for col in numeric_columns:
        if df_safe[col].isna().any():
            if numeric_strategy == "median":
                df_safe[col].fillna(df_safe[col].median(), inplace=True)
            elif numeric_strategy == "mean":
                df_safe[col].fillna(df_safe[col].mean(), inplace=True)
            elif numeric_strategy == "zero":
                df_safe[col].fillna(0, inplace=True)
    
    # Handle categorical columns
    categorical_columns = df_safe.select_dtypes(include=['object']).columns
    for col in categorical_columns:
        if df_safe[col].isna().any():
            if categorical_strategy == "mode":
                mode_value = df_safe[col].mode()
                if not mode_value.empty:
                    df_safe[col].fillna(mode_value[0], inplace=True)
                else:
                    df_safe[col].fillna("unknown", inplace=True)
            elif categorical_strategy == "constant":
                df_safe[col].fillna("unknown", inplace=True)
    
    return df_safe


def detect_feature_drift(reference_features: List[float], 
                        current_features: List[float],
                        threshold: float = 0.1) -> Dict[str, Any]:
    """
    Detect feature drift between reference and current feature distributions.
    
    Args:
        reference_features: Reference feature values
        current_features: Current feature values
        threshold: Drift detection threshold
        
    Returns:
        Dictionary with drift detection results
    """
    if not reference_features or not current_features:
        return {"drift_detected": False, "reason": "Empty feature lists"}
    
    try:
        ref_array = np.array(reference_features)
        curr_array = np.array(current_features)
        
        # Remove NaN/inf values
        ref_clean = ref_array[~np.isnan(ref_array) & ~np.isinf(ref_array)]
        curr_clean = curr_array[~np.isnan(curr_array) & ~np.isinf(curr_array)]
        
        if len(ref_clean) == 0 or len(curr_clean) == 0:
            return {"drift_detected": True, "reason": "No valid features after cleaning"}
        
        # Calculate distribution statistics
        ref_mean = np.mean(ref_clean)
        ref_std = np.std(ref_clean)
        curr_mean = np.mean(curr_clean)
        curr_std = np.std(curr_clean)
        
        # Simple drift detection based on mean shift
        mean_shift = abs(curr_mean - ref_mean)
        mean_shift_ratio = mean_shift / (ref_std + 1e-8)  # Avoid division by zero
        
        # Standard deviation change
        std_ratio = curr_std / (ref_std + 1e-8)
        std_change = abs(std_ratio - 1.0)
        
        drift_detected = mean_shift_ratio > threshold or std_change > threshold
        
        return {
            "drift_detected": drift_detected,
            "mean_shift": float(mean_shift),
            "mean_shift_ratio": float(mean_shift_ratio),
            "std_change": float(std_change),
            "ref_mean": float(ref_mean),
            "ref_std": float(ref_std),
            "curr_mean": float(curr_mean),
            "curr_std": float(curr_std),
            "threshold": threshold
        }
    
    except Exception as e:
        logger.error(f"Feature drift detection failed: {e}")
        return {"drift_detected": True, "reason": f"Detection error: {str(e)}"}


# Global feature safety guard instance
_feature_guard = FeatureSafetyGuard()


def get_feature_guard() -> FeatureSafetyGuard:
    """Get the global feature safety guard instance"""
    return _feature_guard


def safe_prepare_features(lead_data: Dict[str, Any], 
                         feature_names: List[str]) -> Tuple[List[float], float]:
    """
    Safely prepare features for prediction using the global feature guard.
    
    Args:
        lead_data: Lead data dictionary
        feature_names: List of expected feature names
        
    Returns:
        Tuple of (safe_features, coverage_ratio)
    """
    guard = get_feature_guard()
    
    # Extract and engineer features in order
    features = []
    for feature_name in feature_names:
        value = _engineer_feature(lead_data, feature_name)
        features.append(value)
    
    return guard.safe_feature_vector(features, feature_names)


def _engineer_feature(lead_data: Dict[str, Any], feature_name: str) -> Any:
    """
    Engineer a single feature from lead data.
    
    Args:
        lead_data: Lead data dictionary
        feature_name: Name of the feature to engineer
        
    Returns:
        Engineered feature value
    """
    import numpy as np
    import pandas as pd
    from datetime import datetime
    
    try:
        if feature_name == 'lead_score':
            return lead_data.get('lead_score', 0)
        elif feature_name == 'engagement_score':
            return lead_data.get('engagement_score', 0)
        elif feature_name == 'conversion_probability':
            return lead_data.get('conversion_probability', 0.0)
        elif feature_name == 'touchpoint_count':
            return lead_data.get('touchpoint_count', 0)
        elif feature_name == 'days_since_creation':
            return lead_data.get('days_since_creation', 0.0)
        elif feature_name == 'is_application_season':
            created_at = lead_data.get('created_at')
            if created_at:
                month = pd.to_datetime(created_at).month
                return 1 if month in [9, 10, 11, 12, 1, 2] else 0
            return 0
        elif feature_name == 'score_squared':
            score = lead_data.get('lead_score', 0)
            return score ** 2
        elif feature_name == 'score_log':
            score = lead_data.get('lead_score', 0)
            return np.log1p(score)
        elif feature_name == 'score_percentile':
            # For prediction, use normalized score
            score = lead_data.get('lead_score', 0)
            return score / 100.0
        elif feature_name == 'engagement_squared':
            engagement = lead_data.get('engagement_score', 0)
            return engagement ** 2
        elif feature_name == 'engagement_percentile':
            engagement = lead_data.get('engagement_score', 0)
            return engagement / 100.0
        elif feature_name == 'touchpoint_log':
            touchpoints = lead_data.get('touchpoint_count', 0)
            return np.log1p(touchpoints)
        elif feature_name == 'touchpoint_percentile':
            touchpoints = lead_data.get('touchpoint_count', 0)
            return touchpoints / 10.0  # Normalize assuming max ~10 touchpoints
        elif feature_name == 'lifecycle_state_encoded':
            lifecycle = lead_data.get('lifecycle_state', 'unknown')
            if lifecycle == 'lead': return 0
            elif lifecycle == 'applicant': return 1
            elif lifecycle == 'student': return 2
            else: return 0
        elif feature_name == 'engagement_level_encoded':
            engagement = lead_data.get('engagement_score', 0)
            if engagement >= 80: return 2  # high
            elif engagement >= 50: return 1  # medium
            else: return 0  # low
        elif feature_name == 'status_encoded':
            status = lead_data.get('status', 'unknown')
            if status == 'new': return 0
            elif status == 'contacted': return 1
            elif status == 'qualified': return 2
            elif status == 'converted': return 3
            else: return 0
        elif feature_name == 'score_engagement_interaction':
            score = lead_data.get('lead_score', 0)
            engagement = lead_data.get('engagement_score', 0)
            return score * (engagement / 100.0)
        elif feature_name == 'score_time_interaction':
            score = lead_data.get('lead_score', 0)
            days = lead_data.get('days_since_creation', 0)
            return score * days
        elif feature_name == 'score_engagement_score_interaction':
            score = lead_data.get('lead_score', 0)
            engagement = lead_data.get('engagement_score', 0)
            return score * engagement
        elif feature_name == 'score_touchpoint_interaction':
            score = lead_data.get('lead_score', 0)
            touchpoints = lead_data.get('touchpoint_count', 0)
            return score * touchpoints
        else:
            # For any other features, try to get from lead_data or use defaults
            return lead_data.get(feature_name, 0.0)
            
    except Exception as e:
        logger.warning(f"Feature engineering failed for {feature_name}: {e}")
        return 0.0
