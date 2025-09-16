"""
Pydantic schemas for ML endpoints

Provides type-safe request/response models for the ML prediction stack.
Handles both legacy and canonical payload formats with proper validation.
"""

from pydantic import BaseModel, Field, conlist, validator
from typing import List, Dict, Optional, Union, Any
from datetime import datetime


class PredictBatchRequest(BaseModel):
    """
    Request schema for batch prediction endpoint.
    
    Supports both legacy raw array format and canonical wrapped object format.
    """
    lead_ids: Optional[List[str]] = None
    
    @validator('lead_ids', pre=True, always=True)
    def validate_lead_ids(cls, v):
        """Handle both raw array and wrapped object formats"""
        if v is None:
            raise ValueError("lead_ids is required")
        
        # Ensure all lead_ids are strings, not dicts
        if isinstance(v, list):
            validated_ids = []
            for item in v:
                if isinstance(item, dict):
                    # Extract string value from dict if it's a dict
                    if 'id' in item:
                        validated_ids.append(str(item['id']))
                    elif 'lead_id' in item:
                        validated_ids.append(str(item['lead_id']))
                    else:
                        # Convert dict to string representation
                        validated_ids.append(str(item))
                else:
                    validated_ids.append(str(item))
            return validated_ids
        
        return v
    
    class Config:
        # Allow both raw array and wrapped object formats
        extra = "forbid"
        validate_assignment = True


class PredictBatchResponseItem(BaseModel):
    """Individual prediction result for a lead"""
    lead_id: str = Field(..., description="Unique identifier for the lead")
    probability: float = Field(..., ge=0.0, le=1.0, description="Predicted conversion probability")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence in the prediction")
    calibrated_probability: float = Field(..., ge=0.0, le=1.0, description="Calibrated probability score")
    features_present_ratio: float = Field(..., ge=0.0, le=1.0, description="Ratio of features available for prediction")
    prediction: bool = Field(..., description="Binary prediction (true/false)")
    
    class Config:
        json_encoders = {
            # Ensure proper serialization of numpy types
            float: lambda v: round(float(v), 4)
        }


class PredictBatchResponse(BaseModel):
    """Response schema for batch prediction endpoint"""
    predictions: List[PredictBatchResponseItem] = Field(..., description="List of predictions for each lead")
    model_version: str = Field(..., description="Version identifier of the model used")
    model_sha256: str = Field(..., description="SHA256 hash of the model artifact")
    model_id: str = Field(..., description="Unique model identifier")
    total_processed: int = Field(..., ge=0, description="Total number of leads processed")
    successful_predictions: int = Field(..., ge=0, description="Number of successful predictions")
    failed_predictions: int = Field(..., ge=0, description="Number of failed predictions")
    processing_time_ms: float = Field(..., ge=0, description="Total processing time in milliseconds")
    cache_hit: bool = Field(..., description="Whether the result was served from cache")
    schema_version: str = Field(default="v1", description="API response schema version")
    contract_version: int = Field(default=1, description="API contract version number")
    calibration_metadata: Dict[str, Any] = Field(default_factory=dict, description="Calibration and model metadata")
    request_id: Optional[str] = Field(None, description="Request identifier for correlation")
    
    class Config:
        json_encoders = {
            float: lambda v: round(float(v), 4)
        }


class PredictSingleRequest(BaseModel):
    """Request schema for single lead prediction"""
    lead_id: str = Field(..., description="Unique identifier for the lead")
    model_version: Optional[str] = Field(None, description="Specific model version to use (optional)")


class PredictSingleResponse(BaseModel):
    """Response schema for single lead prediction"""
    lead_id: str = Field(..., description="Unique identifier for the lead")
    prediction: bool = Field(..., description="Binary prediction (true/false)")
    probability: float = Field(..., ge=0.0, le=1.0, description="Predicted conversion probability")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence in the prediction")
    calibrated_probability: float = Field(..., ge=0.0, le=1.0, description="Calibrated probability score")
    features_present_ratio: float = Field(..., ge=0.0, le=1.0, description="Ratio of features available for prediction")
    model_version: str = Field(..., description="Version identifier of the model used")
    processing_time_ms: float = Field(..., ge=0, description="Processing time in milliseconds")
    
    class Config:
        json_encoders = {
            float: lambda v: round(float(v), 4)
        }


class ModelInfoResponse(BaseModel):
    """Response schema for model information endpoint"""
    status: str = Field(..., description="Model status (loaded, no_model_loaded, error)")
    version: Optional[str] = Field(None, description="Model version identifier")
    model_type: Optional[str] = Field(None, description="Type of ML model")
    path: Optional[str] = Field(None, description="Path to model artifact")
    sha256: Optional[str] = Field(None, description="SHA256 hash of model artifact")
    loaded_at: Optional[float] = Field(None, description="Timestamp when model was loaded")
    loaded_since_seconds: Optional[float] = Field(None, description="Seconds since model was loaded")
    feature_count: Optional[int] = Field(None, description="Number of features in the model")
    performance: Optional[Dict[str, Any]] = Field(None, description="Model performance metrics")
    
    class Config:
        json_encoders = {
            float: lambda v: round(float(v), 4)
        }


class ModelListResponse(BaseModel):
    """Response schema for listing available models"""
    models: List[Dict[str, Any]] = Field(..., description="List of available model artifacts")
    total_count: int = Field(..., ge=0, description="Total number of models available")
    active_pattern: str = Field(..., description="Pattern used to match model files")
    
    class Config:
        json_encoders = {
            float: lambda v: round(float(v), 4)
        }


class HealthCheckResponse(BaseModel):
    """Response schema for health check endpoint"""
    status: str = Field(..., description="Service status (healthy, unhealthy)")
    model_version: Optional[str] = Field(None, description="Currently loaded model version")
    model_sha256: Optional[str] = Field(None, description="SHA256 hash of loaded model")
    loaded: bool = Field(..., description="Whether a model is currently loaded")
    since_seconds: Optional[float] = Field(None, description="Seconds since model was loaded")
    feature_count: Optional[int] = Field(None, description="Number of features in loaded model")
    cache_status: str = Field(..., description="Cache status (hit, miss, expired)")
    
    class Config:
        json_encoders = {
            float: lambda v: round(float(v), 4)
        }


class ErrorResponse(BaseModel):
    """Standard error response schema"""
    error: str = Field(..., description="Error type")
    error_code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    request_id: Optional[str] = Field(None, description="Request identifier for tracing")
    status_code: int = Field(..., description="HTTP status code")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class FeatureAnalysisResponse(BaseModel):
    """Response schema for feature analysis endpoint"""
    top_features: List[tuple] = Field(..., description="Top features by importance")
    feature_categories: Dict[str, List[str]] = Field(..., description="Features grouped by category")
    total_features: int = Field(..., ge=0, description="Total number of features")
    model_version: str = Field(..., description="Model version used for analysis")
    
    class Config:
        json_encoders = {
            float: lambda v: round(float(v), 4)
        }


# Legacy support for raw array format
from pydantic import RootModel

class LegacyPredictBatchRequest(RootModel[List[str]]):
    """Legacy request schema supporting raw array format"""
    root: List[str]
    
    def __iter__(self):
        return iter(self.root)
    
    def __getitem__(self, item):
        return self.root[item]
    
    def __len__(self):
        return len(self.root)


# Union type for flexible request handling
PredictBatchRequestUnion = Union[PredictBatchRequest, LegacyPredictBatchRequest, List[str]]


def normalize_predict_batch_request(request: Union[PredictBatchRequest, List[str], Dict[str, Any]]) -> List[str]:
    """
    Normalize various request formats to a standard list of lead IDs.
    
    Args:
        request: Can be a Pydantic model, raw list, or dict
        
    Returns:
        List of lead ID strings
        
    Raises:
        ValueError: If request format is invalid
    """
    if isinstance(request, list):
        # Raw array format: ["id1", "id2"]
        if not all(isinstance(item, str) for item in request):
            raise ValueError("All lead IDs must be strings")
        return request
    
    elif isinstance(request, dict):
        # Wrapped object format: {"lead_ids": ["id1", "id2"]}
        if "lead_ids" in request:
            lead_ids = request["lead_ids"]
            if not isinstance(lead_ids, list):
                raise ValueError("lead_ids must be a list")
            if not all(isinstance(item, str) for item in lead_ids):
                raise ValueError("All lead IDs must be strings")
            return lead_ids
        else:
            raise ValueError("Request must contain 'lead_ids' field")
    
    elif hasattr(request, 'lead_ids'):
        # Pydantic model with lead_ids field
        return request.lead_ids
    
    elif hasattr(request, 'root'):
        # Legacy Pydantic RootModel with root field
        return request.root
    
    else:
        raise ValueError(f"Unsupported request format: {type(request)}")


def create_error_response(error_type: str, message: str, details: Optional[Dict[str, Any]] = None, request_id: Optional[str] = None) -> ErrorResponse:
    """Helper function to create standardized error responses"""
    return ErrorResponse(
        error=error_type,
        message=message,
        details=details,
        request_id=request_id
    )
