from __future__ import annotations

import datetime as dt
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
import math
import statistics

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/ai/anomaly-detection", tags=["AI Anomaly Detection"])

# ------------------------------
# Anomaly Detection Models
# ------------------------------

class AnomalyType(str, Enum):
    ENGAGEMENT_PATTERN = "engagement_pattern"
    TIMING_BEHAVIOR = "timing_behavior"
    DATA_INCONSISTENCY = "data_inconsistency"
    SOURCE_SUSPICIOUS = "source_suspicious"
    BOT_LIKE_BEHAVIOR = "bot_like_behavior"

class AnomalySeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AnomalyDetection(BaseModel):
    lead_id: str
    anomaly_type: AnomalyType
    severity: AnomalySeverity
    confidence: float  # 0.0-1.0
    description: str
    evidence: Dict[str, Any]
    risk_score: float  # 0.0-100.0
    recommendations: List[str]
    detected_at: str
    status: str = "active"  # "active", "investigated", "resolved"

class AnomalyRequest(BaseModel):
    lead_id: str
    engagement_data: Dict[str, Any]
    lead_data: Dict[str, Any]
    source_data: Dict[str, Any]
    time_period_days: int = 30

class AnomalyResponse(BaseModel):
    lead_id: str
    anomalies: List[AnomalyDetection]
    overall_risk_score: float
    risk_level: str  # "low", "medium", "high", "critical"
    summary: Dict[str, Any]
    generated_at: str

# ------------------------------
# Anomaly Detection Logic
# ------------------------------

def detect_engagement_anomalies(
    engagement_data: Dict[str, Any],
    lead_data: Dict[str, Any]
) -> List[AnomalyDetection]:
    """Detect unusual patterns in lead engagement behavior"""
    anomalies = []
    
    # Extract engagement metrics
    email_opens = engagement_data.get("email_opens", 0)
    email_clicks = engagement_data.get("email_clicks", 0)
    events_attended = engagement_data.get("events_attended", 0)
    portal_logins = engagement_data.get("portal_logins", 0)
    web_visits = engagement_data.get("web_visits", 0)
    
    # Suspicious engagement patterns
    if email_opens > 0 and email_clicks == 0:
        # Opens emails but never clicks - potential bot or low engagement
        anomalies.append(AnomalyDetection(
            lead_id=lead_data.get("id", "unknown"),
            anomaly_type=AnomalyType.ENGAGEMENT_PATTERN,
            severity=AnomalySeverity.MEDIUM,
            confidence=0.75,
            description="High email opens but zero clicks - potential low engagement or bot behavior",
            evidence={
                "email_opens": email_opens,
                "email_clicks": email_clicks,
                "click_to_open_ratio": 0.0
            },
            risk_score=65.0,
            recommendations=[
                "Investigate email engagement quality",
                "Check for bot detection",
                "Consider re-engagement strategy"
            ],
            detected_at=dt.datetime.now(dt.timezone.utc).isoformat()
        ))
    
    # Unusually high engagement (potential bot)
    total_engagement = email_opens + email_clicks + events_attended + portal_logins + web_visits
    if total_engagement > 50:  # Threshold for suspicious high engagement
        anomalies.append(AnomalyDetection(
            lead_id=lead_data.get("id", "unknown"),
            anomaly_type=AnomalyType.BOT_LIKE_BEHAVIOR,
            severity=AnomalySeverity.HIGH,
            confidence=0.85,
            description="Extremely high engagement activity - potential bot or automated behavior",
            evidence={
                "total_engagement": total_engagement,
                "threshold": 50,
                "breakdown": {
                    "email_opens": email_opens,
                    "email_clicks": email_clicks,
                    "events_attended": events_attended,
                    "portal_logins": portal_logins,
                    "web_visits": web_visits
                }
            },
            risk_score=85.0,
            recommendations=[
                "Implement bot detection measures",
                "Review engagement authenticity",
                "Consider rate limiting"
            ],
            detected_at=dt.datetime.now(dt.timezone.utc).isoformat()
        ))
    
    # Zero engagement after initial contact
    if total_engagement == 0 and lead_data.get("has_email") or lead_data.get("has_phone"):
        anomalies.append(AnomalyDetection(
            lead_id=lead_data.get("id", "unknown"),
            anomaly_type=AnomalyType.ENGAGEMENT_PATTERN,
            severity=AnomalySeverity.MEDIUM,
            confidence=0.70,
            description="No engagement activity despite having contact information",
            evidence={
                "total_engagement": total_engagement,
                "has_email": lead_data.get("has_email"),
                "has_phone": lead_data.get("has_phone")
            },
            risk_score=60.0,
            recommendations=[
                "Verify contact information validity",
                "Implement re-engagement campaign",
                "Check for technical issues"
            ],
            detected_at=dt.datetime.now(dt.timezone.utc).isoformat()
        ))
    
    return anomalies

def detect_timing_anomalies(
    engagement_data: Dict[str, Any],
    lead_data: Dict[str, Any]
) -> List[AnomalyDetection]:
    """Detect suspicious timing patterns in lead behavior"""
    anomalies = []
    
    # Check for rapid-fire engagement (potential bot)
    last_activity = lead_data.get("last_activity_at")
    if last_activity:
        try:
            last_activity_dt = dt.datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
            now = dt.datetime.now(dt.timezone.utc)
            time_diff = (now - last_activity_dt).total_seconds()
            
            # Suspicious if very recent activity with high engagement
            total_engagement = sum([
                engagement_data.get("email_opens", 0),
                engagement_data.get("email_clicks", 0),
                engagement_data.get("events_attended", 0),
                engagement_data.get("portal_logins", 0),
                engagement_data.get("web_visits", 0)
            ])
            
            if time_diff < 3600 and total_engagement > 20:  # 1 hour with high engagement
                anomalies.append(AnomalyDetection(
                    lead_id=lead_data.get("id", "unknown"),
                    anomaly_type=AnomalyType.TIMING_BEHAVIOR,
                    severity=AnomalySeverity.HIGH,
                    confidence=0.80,
                    description="High engagement activity in very recent timeframe - potential automated behavior",
                    evidence={
                        "time_since_last_activity_seconds": time_diff,
                        "total_engagement": total_engagement,
                        "threshold_hours": 1.0
                    },
                    risk_score=80.0,
                    recommendations=[
                        "Investigate timing patterns",
                        "Check for automation tools",
                        "Implement activity rate limiting"
                    ],
                    detected_at=dt.datetime.now(dt.timezone.utc).isoformat()
                ))
        except:
            pass  # Skip if date parsing fails
    
    return anomalies

def detect_data_inconsistencies(
    lead_data: Dict[str, Any],
    source_data: Dict[str, Any]
) -> List[AnomalyDetection]:
    """Detect inconsistencies or suspicious data patterns"""
    anomalies = []
    
    # Check for suspicious email patterns
    email = lead_data.get("email", "")
    if email:
        # Generic or suspicious email domains
        suspicious_domains = ["temp.com", "test.com", "example.com", "mailinator.com", "10minutemail.com"]
        domain = email.split("@")[-1].lower() if "@" in email else ""
        
        if domain in suspicious_domains:
            anomalies.append(AnomalyDetection(
                lead_id=lead_data.get("id", "unknown"),
                anomaly_type=AnomalyType.DATA_INCONSISTENCY,
                severity=AnomalySeverity.HIGH,
                confidence=0.90,
                description=f"Suspicious email domain detected: {domain}",
                evidence={
                    "email": email,
                    "suspicious_domain": domain,
                    "domain_type": "temporary_disposable"
                },
                risk_score=90.0,
                recommendations=[
                    "Verify email authenticity",
                    "Request alternative contact method",
                    "Implement email validation"
                ],
                detected_at=dt.datetime.now(dt.timezone.utc).isoformat()
            ))
    
    # Check for missing critical data
    critical_fields = ["email", "phone", "course_declared"]
    missing_fields = [field for field in critical_fields if not lead_data.get(field)]
    
    if len(missing_fields) >= 2:
        anomalies.append(AnomalyDetection(
            lead_id=lead_data.get("id", "unknown"),
            anomaly_type=AnomalyType.DATA_INCONSISTENCY,
            severity=AnomalySeverity.MEDIUM,
            confidence=0.75,
            description=f"Multiple critical fields missing: {', '.join(missing_fields)}",
            evidence={
                "missing_fields": missing_fields,
                "total_missing": len(missing_fields),
                "critical_fields": critical_fields
            },
            risk_score=70.0,
            recommendations=[
                "Request missing information",
                "Implement data validation",
                "Consider lead quality score adjustment"
            ],
            detected_at=dt.datetime.now(dt.timezone.utc).isoformat()
        ))
    
    return anomalies

def detect_source_anomalies(
    source_data: Dict[str, Any],
    lead_data: Dict[str, Any]
) -> List[AnomalyDetection]:
    """Detect suspicious patterns from specific lead sources"""
    anomalies = []
    
    source = source_data.get("source", "unknown")
    
    # Check for unusual source patterns
    if source == "unknown" and lead_data.get("has_email") and lead_data.get("has_phone"):
        # Has contact info but unknown source - suspicious
        anomalies.append(AnomalyDetection(
            lead_id=lead_data.get("id", "unknown"),
            anomaly_type=AnomalyType.SOURCE_SUSPICIOUS,
            severity=AnomalySeverity.MEDIUM,
            confidence=0.70,
            description="Complete contact information with unknown source - potential data quality issue",
            evidence={
                "source": source,
                "has_email": lead_data.get("has_email"),
                "has_phone": lead_data.get("has_phone")
            },
            risk_score=65.0,
            recommendations=[
                "Investigate source attribution",
                "Implement source tracking",
                "Validate lead authenticity"
            ],
            detected_at=dt.datetime.now(dt.timezone.utc).isoformat()
        ))
    
    # Check for source-specific anomalies
    if source == "paid_social" and lead_data.get("has_email") and not lead_data.get("has_phone"):
        # Paid social leads typically have both email and phone
        anomalies.append(AnomalyDetection(
            lead_id=lead_data.get("id", "unknown"),
            anomaly_type=AnomalyType.SOURCE_SUSPICIOUS,
            severity=AnomalySeverity.LOW,
            confidence=0.60,
            description="Paid social lead missing phone number - unusual pattern",
            evidence={
                "source": source,
                "has_email": lead_data.get("has_email"),
                "has_phone": lead_data.get("has_phone"),
                "expected_pattern": "both_email_and_phone"
            },
            risk_score=45.0,
            recommendations=[
                "Request phone number",
                "Verify lead quality",
                "Monitor conversion rate"
            ],
            detected_at=dt.datetime.now(dt.timezone.utc).isoformat()
        ))
    
    return anomalies

def calculate_overall_risk_score(anomalies: List[AnomalyDetection]) -> Tuple[float, str]:
    """Calculate overall risk score and level based on detected anomalies"""
    if not anomalies:
        return 0.0, "low"
    
    # Weight anomalies by severity
    severity_weights = {
        AnomalySeverity.LOW: 1.0,
        AnomalySeverity.MEDIUM: 2.0,
        AnomalySeverity.HIGH: 3.0,
        AnomalySeverity.CRITICAL: 4.0
    }
    
    # Calculate weighted risk score
    total_weighted_score = sum(
        anomaly.risk_score * severity_weights[anomaly.severity] * anomaly.confidence
        for anomaly in anomalies
    )
    
    total_weight = sum(
        severity_weights[anomaly.severity] * anomaly.confidence
        for anomaly in anomalies
    )
    
    if total_weight == 0:
        return 0.0, "low"
    
    overall_score = total_weighted_score / total_weight
    
    # Determine risk level
    if overall_score >= 80:
        risk_level = "critical"
    elif overall_score >= 60:
        risk_level = "high"
    elif overall_score >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"
    
    return min(100.0, overall_score), risk_level

# ------------------------------
# Main Anomaly Detection Function
# ------------------------------

def detect_anomalies(
    lead_id: str,
    engagement_data: Dict[str, Any],
    lead_data: Dict[str, Any],
    source_data: Dict[str, Any]
) -> List[AnomalyDetection]:
    """Main function to detect all types of anomalies for a lead"""
    all_anomalies = []
    
    # Run all detection functions
    all_anomalies.extend(detect_engagement_anomalies(engagement_data, lead_data))
    all_anomalies.extend(detect_timing_anomalies(engagement_data, lead_data))
    all_anomalies.extend(detect_data_inconsistencies(lead_data, source_data))
    all_anomalies.extend(detect_source_anomalies(source_data, lead_data))
    
    return all_anomalies

# ------------------------------
# API Endpoints
# ------------------------------

@router.post("/detect", response_model=AnomalyResponse)
async def detect_lead_anomalies(req: AnomalyRequest) -> AnomalyResponse:
    """Detect anomalies for a specific lead"""
    
    # Detect all anomalies
    anomalies = detect_anomalies(
        req.lead_id,
        req.engagement_data,
        req.lead_data,
        req.source_data
    )
    
    # Calculate overall risk
    overall_risk_score, risk_level = calculate_overall_risk_score(anomalies)
    
    # Generate summary
    summary = {
        "total_anomalies": len(anomalies),
        "anomalies_by_type": {},
        "anomalies_by_severity": {},
        "highest_risk_anomaly": None
    }
    
    # Count by type and severity
    for anomaly in anomalies:
        # By type
        anomaly_type = anomaly.anomaly_type.value
        summary["anomalies_by_type"][anomaly_type] = summary["anomalies_by_type"].get(anomaly_type, 0) + 1
        
        # By severity
        severity = anomaly.severity.value
        summary["anomalies_by_severity"][severity] = summary["anomalies_by_severity"].get(severity, 0) + 1
    
    # Find highest risk anomaly
    if anomalies:
        highest_risk = max(anomalies, key=lambda a: a.risk_score)
        summary["highest_risk_anomaly"] = {
            "type": highest_risk.anomaly_type.value,
            "severity": highest_risk.severity.value,
            "risk_score": highest_risk.risk_score,
            "description": highest_risk.description
        }
    
    return AnomalyResponse(
        lead_id=req.lead_id,
        anomalies=anomalies,
        overall_risk_score=round(overall_risk_score, 1),
        risk_level=risk_level,
        summary=summary,
        generated_at=dt.datetime.now(dt.timezone.utc).isoformat()
    )

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "anomaly-detection"}
