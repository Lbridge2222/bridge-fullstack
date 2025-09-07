#!/usr/bin/env python3
"""
PII Redaction API Endpoints - Phase 5.1
Provides REST API access to PII detection, redaction, and GDPR compliance features.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime
import logging

# Import our PII redaction engine
from ..ai.pii_redaction import (
    detect_pii_in_text, redact_text, check_consent, 
    add_consent, generate_gdpr_report, RedactionLevel
)

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/pii", tags=["PII Redaction & GDPR"])

# Pydantic models for API requests/responses
class PIIDetectionRequest(BaseModel):
    text: str = Field(..., description="Text to analyze for PII")
    context: str = Field("", description="Context for improved detection accuracy")

class PIIRedactionRequest(BaseModel):
    text: str = Field(..., description="Text to redact PII from")
    redaction_level: str = Field("full", description="Redaction level: full, partial, hashed, anonymized")
    context: str = Field("", description="Context for improved detection accuracy")

class ConsentRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    consent_type: str = Field(..., description="Type of consent")
    granted: bool = Field(..., description="Whether consent is granted")
    purpose: str = Field(..., description="Purpose of data processing")
    data_categories: List[str] = Field(..., description="Categories of data covered")
    expires_in_days: Optional[int] = Field(None, description="Days until consent expires")

class ConsentCheckRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    consent_type: str = Field(..., description="Type of consent to check")
    data_category: str = Field(..., description="Data category to check consent for")

class PIIMatchResponse(BaseModel):
    pii_type: str
    value: str
    start_pos: int
    end_pos: int
    confidence: float
    context: str
    redaction_level: str

class RedactionResultResponse(BaseModel):
    original_text: str
    redacted_text: str
    pii_matches: List[PIIMatchResponse]
    redaction_level: str
    timestamp: str
    operation_id: str

class ConsentRecordResponse(BaseModel):
    user_id: str
    consent_type: str
    granted: bool
    timestamp: str
    expires_at: Optional[str]
    purpose: str
    data_categories: List[str]

class GDPRReportResponse(BaseModel):
    timestamp: str
    consent_records_count: int
    active_consents: int
    expired_consents: int
    gdpr_compliant: bool
    data_retention_policy: str
    consent_management: str
    data_minimization: str

@router.post("/detect", response_model=List[PIIMatchResponse])
async def detect_pii(request: PIIDetectionRequest):
    """
    Detect PII in the provided text.
    
    Returns a list of detected PII matches with confidence scores and positions.
    """
    try:
        logger.info(f"PII detection request received for text length: {len(request.text)}")
        
        # Detect PII using our engine
        matches = detect_pii_in_text(request.text, request.context)
        
        logger.info(f"PII detection completed. Found {len(matches)} matches")
        
        return matches
        
    except Exception as e:
        logger.error(f"Error in PII detection: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PII detection failed: {str(e)}")

@router.post("/redact", response_model=RedactionResultResponse)
async def redact_pii(request: PIIRedactionRequest):
    """
    Redact PII from the provided text according to the specified redaction level.
    
    Redaction levels:
    - full: Complete removal with [REDACTED_TYPE] placeholders
    - partial: Partial masking (e.g., j***@email.com)
    - hashed: Cryptographic hash of the PII
    - anonymized: Pseudonymized replacement
    """
    try:
        logger.info(f"PII redaction request received. Level: {request.redaction_level}")
        
        # Validate redaction level
        valid_levels = ["full", "partial", "hashed", "anonymized"]
        if request.redaction_level not in valid_levels:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid redaction level. Must be one of: {valid_levels}"
            )
        
        # Perform redaction
        result = redact_text(request.text, request.redaction_level, request.context)
        
        logger.info(f"PII redaction completed. Operation ID: {result['operation_id']}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in PII redaction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PII redaction failed: {str(e)}")

@router.post("/consent/add", response_model=ConsentRecordResponse)
async def add_user_consent(request: ConsentRequest):
    """
    Add or update user consent for data processing.
    
    This is essential for GDPR compliance and must be called before processing any PII data.
    """
    try:
        logger.info(f"Consent request received for user: {request.user_id}")
        
        # Add consent record
        consent_record = add_consent(
            user_id=request.user_id,
            consent_type=request.consent_type,
            granted=request.granted,
            purpose=request.purpose,
            data_categories=request.data_categories,
            expires_in_days=request.expires_in_days
        )
        
        logger.info(f"Consent recorded successfully for user: {request.user_id}")
        
        return consent_record
        
    except Exception as e:
        logger.error(f"Error adding consent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add consent: {str(e)}")

@router.post("/consent/check", response_model=Dict[str, Any])
async def check_user_consent(request: ConsentCheckRequest):
    """
    Check if a user has valid consent for specific data processing.
    
    Returns consent status and GDPR compliance information.
    """
    try:
        logger.info(f"Consent check request for user: {request.user_id}")
        
        # Check consent
        has_consent = check_consent(
            request.user_id, 
            request.consent_type, 
            request.data_category
        )
        
        response = {
            "user_id": request.user_id,
            "consent_type": request.consent_type,
            "data_category": request.data_category,
            "has_valid_consent": has_consent,
            "timestamp": datetime.utcnow().isoformat(),
            "gdpr_compliant": has_consent
        }
        
        logger.info(f"Consent check completed. Valid: {has_consent}")
        
        return response
        
    except Exception as e:
        logger.error(f"Error checking consent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check consent: {str(e)}")

@router.get("/consent/revoke/{user_id}/{consent_type}")
async def revoke_user_consent(user_id: str, consent_type: str):
    """
    Revoke user consent for data processing.
    
    This implements the "right to withdraw consent" under GDPR.
    """
    try:
        logger.info(f"Consent revocation request for user: {user_id}, type: {consent_type}")
        
        # Import the consent manager to revoke consent
        from ..ai.pii_redaction import consent_manager
        
        success = consent_manager.revoke_consent(user_id, consent_type)
        
        if success:
            response = {
                "user_id": user_id,
                "consent_type": consent_type,
                "status": "revoked",
                "timestamp": datetime.utcnow().isoformat(),
                "message": "Consent successfully revoked"
            }
            logger.info(f"Consent revoked successfully for user: {user_id}")
        else:
            response = {
                "user_id": user_id,
                "consent_type": consent_type,
                "status": "not_found",
                "timestamp": datetime.utcnow().isoformat(),
                "message": "No active consent found to revoke"
            }
            logger.warning(f"No consent found to revoke for user: {user_id}")
        
        return response
        
    except Exception as e:
        logger.error(f"Error revoking consent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to revoke consent: {str(e)}")

@router.get("/gdpr/report", response_model=GDPRReportResponse)
async def get_gdpr_compliance_report():
    """
    Generate a comprehensive GDPR compliance report.
    
    This provides an overview of consent management, data retention policies,
    and overall GDPR compliance status.
    """
    try:
        logger.info("GDPR compliance report requested")
        
        # Generate compliance report
        report = generate_gdpr_report()
        
        logger.info("GDPR compliance report generated successfully")
        
        return report
        
    except Exception as e:
        logger.error(f"Error generating GDPR report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate GDPR report: {str(e)}")

@router.get("/health")
async def pii_system_health():
    """
    Health check endpoint for the PII redaction system.
    
    Returns system status and basic statistics.
    """
    try:
        # Import components to check health
        from ..ai.pii_redaction import pii_engine, consent_manager, gdpr_compliance
        
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {
                "pii_engine": "operational",
                "consent_manager": "operational",
                "gdpr_compliance": "operational"
            },
            "statistics": {
                "pii_patterns_loaded": len(pii_engine.patterns),
                "redaction_levels_supported": len(pii_engine.redaction_templates),
                "consent_records": len(consent_manager.consent_records),
                "gdpr_settings": pii_engine.gdpr_settings
            }
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
        )

@router.get("/patterns")
async def get_pii_patterns():
    """
    Get information about the PII detection patterns supported by the system.
    
    This is useful for understanding what types of PII can be detected.
    """
    try:
        from ..ai.pii_redaction import pii_engine, PIIType
        
        patterns_info = {}
        for pii_type in PIIType:
            patterns_info[pii_type.value] = {
                "description": pii_type.name.replace('_', ' ').title(),
                "patterns_count": len(pii_engine.patterns.get(pii_type, [])),
                "supported_redaction_levels": list(pii_engine.redaction_templates.get(pii_type, {}).keys())
            }
        
        return {
            "pii_types": patterns_info,
            "total_patterns": sum(len(patterns) for patterns in pii_engine.patterns.values()),
            "redaction_levels": [level.value for level in RedactionLevel]
        }
        
    except Exception as e:
        logger.error(f"Error getting PII patterns: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get PII patterns: {str(e)}")

# Note: Exception handlers should be registered on the FastAPI app, not APIRouter
