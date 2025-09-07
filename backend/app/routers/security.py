#!/usr/bin/env python3
"""
Security & Compliance API Endpoints - Phase 5.4
Provides REST API access to threat detection, compliance monitoring, and security management.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Header
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime
import logging
import time

# Import our security system
from ..ai.security import (
    log_security_event, check_compliance, get_security_events, get_open_incidents,
    add_threat_indicator, SecurityEventType, ThreatLevel, ComplianceStandard,
    threat_detection, compliance_monitor, audit_trail, incident_response
)

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/security", tags=["Advanced Security & Compliance"])

# Pydantic models for API requests/responses
class SecurityEventRequest(BaseModel):
    event_type: str = Field(..., description="Type of security event")
    user_id: Optional[str] = Field(None, description="User identifier")
    ip_address: Optional[str] = Field(None, description="IP address")
    description: str = Field(..., description="Event description")
    threat_level: str = Field("low", description="Threat level: low, medium, high, critical")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional event details")
    target_resource: Optional[str] = Field(None, description="Target resource affected")

class ThreatIndicatorRequest(BaseModel):
    indicator_type: str = Field(..., description="Type of indicator: ip, domain, email, hash, url")
    value: str = Field(..., description="Indicator value")
    threat_type: str = Field(..., description="Type of threat")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence level (0.0-1.0)")
    source: str = Field(..., description="Source of threat intelligence")
    tags: Optional[List[str]] = Field(None, description="Additional tags")

class ComplianceCheckRequest(BaseModel):
    standard: Optional[str] = Field(None, description="Compliance standard to check")

class SecurityEventResponse(BaseModel):
    event_id: str
    event_type: str
    timestamp: str
    user_id: Optional[str]
    ip_address: Optional[str]
    threat_level: str
    description: str
    details: Dict[str, Any]
    target_resource: Optional[str]
    success: bool

class SecurityIncidentResponse(BaseModel):
    incident_id: str
    title: str
    description: str
    threat_level: str
    status: str
    created_at: str
    updated_at: str
    resolved_at: Optional[str]
    assigned_to: Optional[str]
    events: List[str]
    tags: List[str]
    resolution_notes: Optional[str]
    compliance_impact: List[str]
    risk_score: float

class ComplianceStatusResponse(BaseModel):
    standard: str
    total_requirements: int
    compliant: int
    non_compliant: int
    pending: int
    compliance_score: float
    status: str
    last_check: str

class OverallComplianceResponse(BaseModel):
    overall_compliance: float
    standards: Dict[str, ComplianceStatusResponse]
    status: str
    last_check: str

class ThreatDetectionResponse(BaseModel):
    threats_detected: int
    blocked_ips: int
    blocked_users: int
    threat_indicators: int
    suspicious_patterns: int
    anomaly_thresholds: int

class SecurityHealthResponse(BaseModel):
    status: str
    timestamp: str
    threat_detection: str
    compliance_monitoring: str
    audit_trail: str
    incident_response: str
    active_incidents: int
    compliance_score: float
    recommendations: List[str]

@router.post("/events/log", response_model=SecurityEventResponse)
async def log_security_event_endpoint(request: SecurityEventRequest):
    """
    Log a security event for monitoring and threat detection.
    
    This endpoint logs security events and automatically triggers threat detection.
    """
    try:
        logger.info(f"Security event log request: {request.event_type} - {request.description}")
        
        # Validate event type
        try:
            event_type = SecurityEventType(request.event_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid event type: {request.event_type}. Must be one of: {[et.value for et in SecurityEventType]}"
            )
        
        # Validate threat level
        try:
            threat_level = ThreatLevel(request.threat_level)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid threat level: {request.threat_level}. Must be one of: {[tl.value for tl in ThreatLevel]}"
            )
        
        # Log the security event
        event = log_security_event(
            event_type=event_type,
            user_id=request.user_id,
            ip_address=request.ip_address,
            description=request.description,
            threat_level=threat_level,
            details=request.details,
            target_resource=request.target_resource
        )
        
        logger.info(f"Security event logged successfully: {event.event_id}")
        
        # Return event details
        return {
            "event_id": event.event_id,
            "event_type": event.event_type.value,
            "timestamp": event.timestamp.isoformat(),
            "user_id": event.user_id,
            "ip_address": event.ip_address,
            "threat_level": event.threat_level.value,
            "description": event.description,
            "details": event.details,
            "target_resource": event.target_resource,
            "success": event.success
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging security event: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to log security event: {str(e)}")

@router.post("/threats/indicators/add")
async def add_threat_indicator_endpoint(request: ThreatIndicatorRequest):
    """
    Add a threat intelligence indicator.
    
    This endpoint adds threat indicators for proactive threat detection.
    """
    try:
        logger.info(f"Threat indicator request: {request.indicator_type} - {request.value}")
        
        # Add threat indicator
        add_threat_indicator(
            indicator_type=request.indicator_type,
            value=request.value,
            threat_type=request.threat_type,
            confidence=request.confidence,
            source=request.source,
            tags=request.tags
        )
        
        logger.info(f"Threat indicator added successfully: {request.value}")
        
        return {
            "message": "Threat indicator added successfully",
            "indicator_type": request.indicator_type,
            "value": request.value,
            "confidence": request.confidence,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error adding threat indicator: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add threat indicator: {str(e)}")

@router.get("/threats/detection", response_model=ThreatDetectionResponse)
async def get_threat_detection_status_endpoint():
    """
    Get current threat detection system status.
    
    Provides overview of threat detection capabilities and current state.
    """
    try:
        logger.info("Threat detection status request")
        
        # Get threat detection statistics
        blocked_ips_count = len(threat_detection.blocked_ips)
        blocked_users_count = len(threat_detection.blocked_users)
        threat_indicators_count = len(threat_detection.threat_indicators)
        suspicious_patterns_count = len(threat_detection.suspicious_patterns)
        anomaly_thresholds_count = len(threat_detection.anomaly_thresholds)
        
        # Count total threats detected (simplified)
        threats_detected = len([event for event in audit_trail.audit_events 
                              if event.threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]])
        
        return {
            "threats_detected": threats_detected,
            "blocked_ips": blocked_ips_count,
            "blocked_users": blocked_users_count,
            "threat_indicators": threat_indicators_count,
            "suspicious_patterns": suspicious_patterns_count,
            "anomaly_thresholds": anomaly_thresholds_count
        }
        
    except Exception as e:
        logger.error(f"Error getting threat detection status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get threat detection status: {str(e)}")

@router.get("/compliance/check", response_model=OverallComplianceResponse)
async def check_compliance_endpoint(standard: Optional[str] = Query(None, description="Specific compliance standard")):
    """
    Check compliance status for all standards or a specific standard.
    
    Provides comprehensive compliance monitoring and reporting.
    """
    try:
        logger.info(f"Compliance check request for standard: {standard or 'all'}")
        
        if standard:
            # Check specific standard
            try:
                compliance_standard = ComplianceStandard(standard)
                result = check_compliance(compliance_standard)
                
                # Convert to response format
                return {
                    "overall_compliance": result["compliance_score"],
                    "standards": {
                        standard: {
                            "standard": result["standard"],
                            "total_requirements": result["total_requirements"],
                            "compliant": result["compliant"],
                            "non_compliant": result["non_compliant"],
                            "pending": result["pending"],
                            "compliance_score": result["compliance_score"],
                            "status": result["status"],
                            "last_check": result["last_check"]
                        }
                    },
                    "status": result["status"],
                    "last_check": result["last_check"]
                }
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid compliance standard: {standard}. Must be one of: {[cs.value for cs in ComplianceStandard]}"
                )
        else:
            # Check all standards
            result = check_compliance()
            
            # Convert standards to response format
            standards_response = {}
            for std_name, std_result in result["standards"].items():
                standards_response[std_name] = ComplianceStatusResponse(
                    standard=std_result["standard"],
                    total_requirements=std_result["total_requirements"],
                    compliant=std_result["compliant"],
                    non_compliant=std_result["non_compliant"],
                    pending=std_result["pending"],
                    compliance_score=std_result["compliance_score"],
                    status=std_result["status"],
                    last_check=std_result["last_check"]
                )
            
            return OverallComplianceResponse(
                overall_compliance=result["overall_compliance"],
                standards=standards_response,
                status=result["status"],
                last_check=result["last_check"]
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking compliance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check compliance: {str(e)}")

@router.get("/compliance/requirements")
async def get_compliance_requirements_endpoint():
    """
    Get all compliance requirements and their current status.
    
    Provides detailed view of compliance requirements across all standards.
    """
    try:
        logger.info("Compliance requirements request")
        
        requirements = []
        for req in compliance_monitor.compliance_requirements.values():
            requirements.append({
                "requirement_id": req.requirement_id,
                "standard": req.standard.value,
                "title": req.title,
                "description": req.description,
                "category": req.category,
                "mandatory": req.mandatory,
                "frequency": req.frequency,
                "status": req.status,
                "last_check": req.last_check.isoformat() if req.last_check else None,
                "next_check": req.next_check.isoformat() if req.next_check else None
            })
        
        return {
            "total_requirements": len(requirements),
            "requirements": requirements
        }
        
    except Exception as e:
        logger.error(f"Error getting compliance requirements: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get compliance requirements: {str(e)}")

@router.get("/compliance/violations")
async def get_compliance_violations_endpoint():
    """
    Get all recorded compliance violations.
    
    Provides audit trail of compliance issues and violations.
    """
    try:
        logger.info("Compliance violations request")
        
        violations = []
        for violation in compliance_monitor.violations:
            violations.append({
                "violation_id": violation["violation_id"],
                "requirement_id": violation["requirement_id"],
                "description": violation["description"],
                "severity": violation["severity"],
                "timestamp": violation["timestamp"],
                "details": violation["details"]
            })
        
        return {
            "total_violations": len(violations),
            "violations": violations
        }
        
    except Exception as e:
        logger.error(f"Error getting compliance violations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get compliance violations: {str(e)}")

@router.get("/audit/events")
async def get_security_events_endpoint(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    hours: int = Query(24, description="Time window in hours")
):
    """
    Get security events with optional filtering.
    
    Provides comprehensive audit trail of security events.
    """
    try:
        logger.info(f"Security events request: user_id={user_id}, event_type={event_type}, hours={hours}")
        
        # Get events with filters
        if user_id:
            events = get_security_events(user_id=user_id, hours=hours)
        elif event_type:
            try:
                event_type_enum = SecurityEventType(event_type)
                events = get_security_events(event_type=event_type_enum, hours=hours)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid event type: {event_type}"
                )
        else:
            events = get_security_events(hours=hours)
        
        # Convert events to response format
        events_response = []
        for event in events:
            events_response.append({
                "event_id": event.event_id,
                "event_type": event.event_type.value,
                "timestamp": event.timestamp.isoformat(),
                "user_id": event.user_id,
                "ip_address": event.ip_address,
                "threat_level": event.threat_level.value,
                "description": event.description,
                "details": event.details,
                "target_resource": event.target_resource,
                "success": event.success
            })
        
        return {
            "total_events": len(events_response),
            "time_window_hours": hours,
            "events": events_response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting security events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get security events: {str(e)}")

@router.get("/audit/incidents", response_model=List[SecurityIncidentResponse])
async def get_security_incidents_endpoint(
    status: Optional[str] = Query(None, description="Filter by incident status"),
    threat_level: Optional[str] = Query(None, description="Filter by threat level")
):
    """
    Get security incidents with optional filtering.
    
    Provides overview of security incidents and their current status.
    """
    try:
        logger.info(f"Security incidents request: status={status}, threat_level={threat_level}")
        
        # Get incidents
        if status == "open":
            incidents = get_open_incidents()
        else:
            incidents = audit_trail.incidents
        
        # Apply threat level filter if specified
        if threat_level:
            try:
                threat_level_enum = ThreatLevel(threat_level)
                incidents = [inc for inc in incidents if inc.threat_level == threat_level_enum]
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid threat level: {threat_level}"
                )
        
        # Convert incidents to response format
        incidents_response = []
        for incident in incidents:
            incidents_response.append({
                "incident_id": incident.incident_id,
                "title": incident.title,
                "description": incident.description,
                "threat_level": incident.threat_level.value,
                "status": incident.status.value,
                "created_at": incident.created_at.isoformat(),
                "updated_at": incident.updated_at.isoformat(),
                "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
                "assigned_to": incident.assigned_to,
                "events": incident.events,
                "tags": incident.tags,
                "resolution_notes": incident.resolution_notes,
                "compliance_impact": [std.value for std in incident.compliance_impact],
                "risk_score": incident.risk_score
            })
        
        return incidents_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting security incidents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get security incidents: {str(e)}")

@router.get("/system/health", response_model=SecurityHealthResponse)
async def get_security_health_endpoint():
    """
    Get overall security system health and status.
    
    Provides comprehensive security health overview with recommendations.
    """
    try:
        logger.info("Security system health request")
        
        # Get system statistics
        active_incidents = len(get_open_incidents())
        compliance_result = check_compliance()
        compliance_score = compliance_result["overall_compliance"]
        
        # Determine component health
        threat_detection_health = "healthy" if len(threat_detection.blocked_ips) < 100 else "warning"
        compliance_health = "healthy" if compliance_score >= 90 else "warning"
        audit_health = "healthy" if len(audit_trail.audit_events) < 9000 else "warning"
        incident_health = "healthy" if active_incidents < 10 else "warning"
        
        # Determine overall status
        overall_status = "healthy" if all(h == "healthy" for h in [threat_detection_health, compliance_health, audit_health, incident_health]) else "warning"
        
        # Generate recommendations
        recommendations = []
        if compliance_score < 90:
            recommendations.append("Address compliance violations to improve overall score")
        if active_incidents > 5:
            recommendations.append("Review and resolve open security incidents")
        if len(threat_detection.blocked_ips) > 50:
            recommendations.append("Review blocked IP addresses for false positives")
        if len(audit_trail.audit_events) > 8000:
            recommendations.append("Consider archiving old audit events")
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "threat_detection": threat_detection_health,
            "compliance_monitoring": compliance_health,
            "audit_trail": audit_health,
            "incident_response": incident_health,
            "active_incidents": active_incidents,
            "compliance_score": compliance_score,
            "recommendations": recommendations
        }
        
    except Exception as e:
        logger.error(f"Error getting security health: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get security health: {str(e)}")

@router.get("/system/statistics")
async def get_security_statistics_endpoint():
    """
    Get comprehensive security system statistics.
    
    Provides detailed metrics and analytics for security operations.
    """
    try:
        logger.info("Security system statistics request")
        
        # Calculate statistics
        total_events = len(audit_trail.audit_events)
        total_incidents = len(audit_trail.incidents)
        open_incidents = len(get_open_incidents())
        resolved_incidents = len([inc for inc in audit_trail.incidents if inc.status.value == "resolved"])
        
        # Event type breakdown
        event_type_counts = {}
        for event in audit_trail.audit_events:
            event_type = event.event_type.value
            event_type_counts[event_type] = event_type_counts.get(event_type, 0) + 1
        
        # Threat level breakdown
        threat_level_counts = {}
        for event in audit_trail.audit_events:
            threat_level = event.threat_level.value
            threat_level_counts[threat_level] = threat_level_counts.get(threat_level, 0) + 1
        
        # Compliance statistics
        compliance_result = check_compliance()
        compliance_breakdown = {}
        for std_name, std_result in compliance_result["standards"].items():
            compliance_breakdown[std_name] = {
                "score": std_result["compliance_score"],
                "status": std_result["status"],
                "requirements": std_result["total_requirements"],
                "compliant": std_result["compliant"]
            }
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "events": {
                "total": total_events,
                "by_type": event_type_counts,
                "by_threat_level": threat_level_counts
            },
            "incidents": {
                "total": total_incidents,
                "open": open_incidents,
                "resolved": resolved_incidents,
                "resolution_rate": (resolved_incidents / total_incidents * 100) if total_incidents > 0 else 0
            },
            "threat_detection": {
                "blocked_ips": len(threat_detection.blocked_ips),
                "blocked_users": len(threat_detection.blocked_users),
                "threat_indicators": len(threat_detection.threat_indicators)
            },
            "compliance": {
                "overall_score": compliance_result["overall_compliance"],
                "overall_status": compliance_result["status"],
                "standards": compliance_breakdown
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting security statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get security statistics: {str(e)}")

@router.post("/incidents/{incident_id}/resolve")
async def resolve_security_incident_endpoint(
    incident_id: str,
    resolution_notes: str = Query(..., description="Notes about incident resolution")
):
    """
    Mark a security incident as resolved.
    
    Updates incident status and adds resolution notes.
    """
    try:
        logger.info(f"Incident resolution request: {incident_id}")
        
        # Find the incident
        incident = None
        for inc in audit_trail.incidents:
            if inc.incident_id == incident_id:
                incident = inc
                break
        
        if not incident:
            raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
        
        # Update incident
        incident.status.value = "resolved"
        incident.resolved_at = datetime.utcnow()
        incident.resolution_notes = resolution_notes
        incident.updated_at = datetime.utcnow()
        
        logger.info(f"Incident {incident_id} resolved successfully")
        
        return {
            "message": "Incident resolved successfully",
            "incident_id": incident_id,
            "resolved_at": incident.resolved_at.isoformat(),
            "resolution_notes": resolution_notes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving incident: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve incident: {str(e)}")

# Note: Exception handlers should be registered on the FastAPI app, not APIRouter
