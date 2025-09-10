"""
Model Registry for ML Pipeline

Provides robust model loading, caching, and versioning for the ML prediction stack.
Handles model artifacts with checksums, TTL caching, and proper error handling.
"""

from dataclasses import dataclass
from pathlib import Path
import joblib
import hashlib
import time
import logging
from typing import Any, Optional, Dict, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@dataclass
class LoadedModel:
    """Container for loaded model with metadata"""
    model: Any
    scaler: Any
    feature_selector: Optional[Any]
    feature_names: List[str]
    performance: Dict[str, Any]
    feature_importance: Dict[str, float]
    path: Path
    sha256: str
    loaded_at: float
    version: str
    model_type: str = "random_forest"


class ModelRegistry:
    """
    Registry for managing ML model artifacts with caching and versioning.
    
    Features:
    - Automatic model discovery and loading
    - SHA256 checksums for integrity verification
    - TTL-based caching with configurable expiration
    - Version tracking and metadata storage
    - Graceful error handling and fallback
    """
    
    def __init__(self, models_dir: Path, active_pattern: str = "advanced_ml_random_forest_*.joblib", cache_ttl_seconds: int = 3600):
        self.models_dir = models_dir
        self.active_pattern = active_pattern
        self.cache_ttl_seconds = cache_ttl_seconds
        self._cache: Optional[LoadedModel] = None
        self._last_load_time: float = 0
        
        # Ensure models directory exists
        self.models_dir.mkdir(exist_ok=True)
        
        logger.info(f"ModelRegistry initialized with dir: {self.models_dir}, pattern: {self.active_pattern}")
    
    def _hash_file(self, file_path: Path) -> str:
        """Calculate SHA256 hash of a file for integrity verification"""
        hash_sha256 = hashlib.sha256()
        try:
            with file_path.open("rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception as e:
            logger.error(f"Failed to calculate hash for {file_path}: {e}")
            return ""
    
    def _find_latest_model(self) -> Optional[Path]:
        """Find the latest model artifact based on modification time"""
        try:
            candidates = list(self.models_dir.glob(self.active_pattern))
            if not candidates:
                logger.warning(f"No model artifacts found matching pattern: {self.active_pattern}")
                return None
            
            # Sort by modification time (newest first)
            latest = max(candidates, key=lambda p: p.stat().st_mtime)
            logger.info(f"Found latest model: {latest.name}")
            return latest
        except Exception as e:
            logger.error(f"Error finding latest model: {e}")
            return None
    
    def _extract_version_from_filename(self, file_path: Path) -> str:
        """Extract version string from model filename"""
        try:
            # Extract timestamp from filename like "advanced_ml_random_forest_20250827_172908"
            stem = file_path.stem
            if "advanced_ml_random_forest_" in stem:
                version = stem.replace("advanced_ml_random_forest_", "")
                return version
            else:
                # Fallback to modification time
                mtime = file_path.stat().st_mtime
                return datetime.fromtimestamp(mtime).strftime("%Y%m%d_%H%M%S")
        except Exception as e:
            logger.warning(f"Could not extract version from {file_path}: {e}")
            return "unknown"
    
    def _is_cache_valid(self) -> bool:
        """Check if current cache is still valid based on TTL"""
        if self._cache is None:
            return False
        
        current_time = time.time()
        cache_age = current_time - self._last_load_time
        
        if cache_age > self.cache_ttl_seconds:
            logger.info(f"Cache expired (age: {cache_age:.1f}s > TTL: {self.cache_ttl_seconds}s)")
            return False
        
        return True
    
    def load_active(self, force: bool = False) -> LoadedModel:
        """
        Load the active model with caching and error handling.
        
        Args:
            force: Force reload even if cache is valid
            
        Returns:
            LoadedModel: The loaded model with metadata
            
        Raises:
            FileNotFoundError: If no model artifacts are found
            ValueError: If model loading fails
        """
        # Check cache validity first
        if not force and self._is_cache_valid():
            logger.debug("Using cached model")
            return self._cache
        
        # Find latest model
        model_path = self._find_latest_model()
        if model_path is None:
            raise FileNotFoundError(f"No model artifacts matching {self.active_pattern} found in {self.models_dir}")
        
        # Calculate file hash for integrity verification
        file_hash = self._hash_file(model_path)
        if not file_hash:
            raise ValueError(f"Failed to calculate hash for {model_path}")
        
        try:
            # Load model artifact
            logger.info(f"Loading model from {model_path}")
            model_data = joblib.load(model_path)
            
            # Validate model data structure
            required_keys = ['model', 'scaler', 'feature_names', 'performance', 'feature_importance']
            missing_keys = [key for key in required_keys if key not in model_data]
            if missing_keys:
                raise ValueError(f"Model artifact missing required keys: {missing_keys}")
            
            # Extract version from filename
            version = self._extract_version_from_filename(model_path)
            
            # Create LoadedModel instance
            loaded_model = LoadedModel(
                model=model_data['model'],
                scaler=model_data['scaler'],
                feature_selector=model_data.get('feature_selector'),
                feature_names=model_data['feature_names'],
                performance=model_data['performance'],
                feature_importance=model_data['feature_importance'],
                path=model_path,
                sha256=file_hash,
                loaded_at=time.time(),
                version=version,
                model_type="random_forest"
            )
            
            # Update cache
            self._cache = loaded_model
            self._last_load_time = time.time()
            
            logger.info(f"Successfully loaded model: {version} (SHA256: {file_hash[:8]}...)")
            return loaded_model
            
        except Exception as e:
            logger.error(f"Failed to load model from {model_path}: {e}")
            raise ValueError(f"Model loading failed: {str(e)}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the currently loaded model"""
        if self._cache is None:
            return {"status": "no_model_loaded"}
        
        return {
            "status": "loaded",
            "version": self._cache.version,
            "model_type": self._cache.model_type,
            "path": str(self._cache.path),
            "sha256": self._cache.sha256,
            "loaded_at": self._cache.loaded_at,
            "loaded_since_seconds": time.time() - self._cache.loaded_at,
            "feature_count": len(self._cache.feature_names),
            "performance": self._cache.performance
        }
    
    def list_available_models(self) -> List[Dict[str, Any]]:
        """List all available model artifacts with metadata"""
        try:
            candidates = list(self.models_dir.glob(self.active_pattern))
            models = []
            
            for model_path in sorted(candidates, key=lambda p: p.stat().st_mtime, reverse=True):
                try:
                    stat = model_path.stat()
                    models.append({
                        "filename": model_path.name,
                        "path": str(model_path),
                        "size_bytes": stat.st_size,
                        "modified_at": stat.st_mtime,
                        "version": self._extract_version_from_filename(model_path),
                        "sha256": self._hash_file(model_path)
                    })
                except Exception as e:
                    logger.warning(f"Could not get metadata for {model_path}: {e}")
                    models.append({
                        "filename": model_path.name,
                        "path": str(model_path),
                        "error": str(e)
                    })
            
            return models
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            return []
    
    def clear_cache(self):
        """Clear the model cache, forcing next load to read from disk"""
        self._cache = None
        self._last_load_time = 0
        logger.info("Model cache cleared")
    
    def validate_model_integrity(self, model_path: Optional[Path] = None) -> bool:
        """Validate model integrity by attempting to load it"""
        if model_path is None:
            model_path = self._find_latest_model()
        
        if model_path is None:
            return False
        
        try:
            # Try to load the model
            model_data = joblib.load(model_path)
            
            # Check required keys
            required_keys = ['model', 'scaler', 'feature_names', 'performance', 'feature_importance']
            missing_keys = [key for key in required_keys if key not in model_data]
            
            if missing_keys:
                logger.error(f"Model integrity check failed - missing keys: {missing_keys}")
                return False
            
            # Check if model has required methods
            if not hasattr(model_data['model'], 'predict'):
                logger.error("Model integrity check failed - model missing predict method")
                return False
            
            if not hasattr(model_data['model'], 'predict_proba'):
                logger.error("Model integrity check failed - model missing predict_proba method")
                return False
            
            logger.info(f"Model integrity check passed for {model_path}")
            return True
            
        except Exception as e:
            logger.error(f"Model integrity check failed for {model_path}: {e}")
            return False


# Global model registry instance
_model_registry: Optional[ModelRegistry] = None


def get_model_registry() -> ModelRegistry:
    """Get the global model registry instance"""
    global _model_registry
    if _model_registry is None:
        models_dir = Path(__file__).parent.parent.parent / "models"
        _model_registry = ModelRegistry(models_dir)
    return _model_registry


def load_active_model(force: bool = False) -> LoadedModel:
    """Convenience function to load the active model"""
    registry = get_model_registry()
    return registry.load_active(force=force)


def get_model_info() -> Dict[str, Any]:
    """Convenience function to get model information"""
    registry = get_model_registry()
    return registry.get_model_info()
