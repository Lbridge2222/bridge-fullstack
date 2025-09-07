#!/usr/bin/env python3
"""
Advanced Security & Compliance System - Phase 5.4
Provides threat detection, compliance monitoring, security audit trails, and incident response.
"""

import hashlib
import hmac
import secrets
import json
import logging
import time
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
import ipaddress

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ThreatLevel(Enum):
    """Threat levels for security incidents"""
    LOW = "low"               # Minor security concern
    MEDIUM = "medium"         # Moderate security risk
    HIGH = "high"             # Significant security threat
    CRITICAL = "critical"     # Immediate security crisis

class SecurityEventType(Enum):
    """Types of security events"""
    # Authentication Events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    
    # Authorization Events
    PERMISSION_DENIED = "permission_denied"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    ROLE_ESCALATION = "role_escalation"
    RESOURCE_ACCESS = "resource_access"
    
    # Data Security Events
    PII_ACCESS = "pii_access"
    PII_MODIFICATION = "pii_modification"
    DATA_EXPORT = "data_export"
    DATA_DELETION = "data_deletion"
    
    # System Security Events
    CONFIGURATION_CHANGE = "configuration_change"
    SYSTEM_ACCESS = "system_access"
    BACKUP_OPERATION = "backup_operation"
    RESTORE_OPERATION = "restore_operation"
    
    # Network Security Events
    SUSPICIOUS_IP = "suspicious_ip"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    BRUTE_FORCE_ATTEMPT = "brute_force_attempt"
    DDoS_ATTEMPT = "ddos_attempt"

class ComplianceStandard(Enum):
    """Compliance standards supported"""
    GDPR = "gdpr"                     # General Data Protection Regulation
    FERPA = "ferpa"                   # Family Educational Rights and Privacy Act
    HIPAA = "hipaa"                   # Health Insurance Portability and Accountability Act
    SOX = "sox"                       # Sarbanes-Oxley Act
    PCI_DSS = "pci_dss"              # Payment Card Industry Data Security Standard
    ISO_27001 = "iso_27001"          # Information Security Management

class SecurityIncidentStatus(Enum):
    """Status of security incidents"""
    OPEN = "open"                     # Incident is open and being investigated
    INVESTIGATING = "investigating"   # Incident is under investigation
    RESOLVED = "resolved"             # Incident has been resolved
    CLOSED = "closed"                 # Incident is closed
    FALSE_POSITIVE = "false_positive" # Incident was a false positive

@dataclass
class SecurityEvent:
    """Security event record"""
    event_id: str
    event_type: SecurityEventType
    timestamp: datetime
    user_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    session_id: Optional[str]
    threat_level: ThreatLevel
    description: str
    details: Dict[str, Any]
    source: str
    target_resource: Optional[str]
    success: bool
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

@dataclass
class SecurityIncident:
    """Security incident record"""
    incident_id: str
    title: str
    description: str
    threat_level: ThreatLevel
    status: SecurityIncidentStatus
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    assigned_to: Optional[str]
    events: List[str]  # List of event IDs
    tags: List[str]
    resolution_notes: Optional[str]
    compliance_impact: List[ComplianceStandard]
    risk_score: float  # 0.0 to 10.0

@dataclass
class ComplianceRequirement:
    """Compliance requirement definition"""
    standard: ComplianceStandard
    requirement_id: str
    title: str
    description: str
    category: str
    mandatory: bool
    frequency: str  # "continuous", "daily", "weekly", "monthly", "quarterly"
    last_check: Optional[datetime]
    next_check: Optional[datetime]
    status: str  # "compliant", "non_compliant", "pending", "exempt"

@dataclass
class SecurityPolicy:
    """Security policy definition"""
    policy_id: str
    name: str
    description: str
    category: str
    rules: List[Dict[str, Any]]
    enabled: bool
    created_at: datetime
    updated_at: datetime
    version: str

@dataclass
class ThreatIndicator:
    """Threat intelligence indicator"""
    indicator_id: str
    type: str  # "ip", "domain", "email", "hash", "url"
    value: str
    threat_type: str
    confidence: float  # 0.0 to 1.0
    first_seen: datetime
    last_seen: datetime
    source: str
    tags: List[str]

class ThreatDetectionEngine:
    """Advanced threat detection engine"""
    
    def __init__(self):
        self.threat_indicators: Dict[str, ThreatIndicator] = {}
        self.suspicious_patterns: Dict[str, List[re.Pattern]] = {}
        self.anomaly_thresholds: Dict[str, float] = {}
        self.blocked_ips: Set[str] = set()
        self.blocked_users: Set[str] = set()
        self.rate_limit_violations: Dict[str, deque] = defaultdict(deque)
        
        # Initialize threat patterns
        self._initialize_threat_patterns()
        self._initialize_anomaly_thresholds()
    
    def _initialize_threat_patterns(self):
        """Initialize suspicious pattern detection"""
        self.suspicious_patterns = {
            "sql_injection": [
                re.compile(r"(\b(union|select|insert|update|delete|drop|create|alter)\b)", re.IGNORECASE),
                re.compile(r"(--|#|/\*|\*/)", re.IGNORECASE),
                re.compile(r"(\b(and|or)\s+\d+\s*=\s*\d+)", re.IGNORECASE),
            ],
            "xss": [
                re.compile(r"(<script[^>]*>.*?</script>)", re.IGNORECASE),
                re.compile(r"(javascript:)", re.IGNORECASE),
                re.compile(r"(on\w+\s*=)", re.IGNORECASE),
            ],
            "path_traversal": [
                re.compile(r"(\.\./|\.\.\\)", re.IGNORECASE),
                re.compile(r"(/etc/passwd|/etc/shadow)", re.IGNORECASE),
                re.compile(r"(c:\\windows\\system32)", re.IGNORECASE),
            ],
            "command_injection": [
                re.compile(r"(\b(cat|ls|dir|rm|del|mkdir|chmod|chown)\b)", re.IGNORECASE),
                re.compile(r"(\||&|;|`|\$\(|\$\{)", re.IGNORECASE),
            ]
        }
    
    def _initialize_anomaly_thresholds(self):
        """Initialize anomaly detection thresholds"""
        self.anomaly_thresholds = {
            "failed_logins_per_hour": 5.0,
            "suspicious_requests_per_minute": 10.0,
            "data_access_frequency": 100.0,
            "role_change_frequency": 2.0,
            "config_change_frequency": 5.0
        }
    
    def detect_threats(self, event: SecurityEvent) -> List[Dict[str, Any]]:
        """Detect threats in security events"""
        threats = []
        
        # Check for suspicious patterns
        for threat_type, patterns in self.suspicious_patterns.items():
            for pattern in patterns:
                if event.description and pattern.search(event.description):
                    threats.append({
                        "type": "pattern_match",
                        "threat_type": threat_type,
                        "pattern": pattern.pattern,
                        "confidence": 0.8,
                        "severity": ThreatLevel.HIGH
                    })
        
        # Check for suspicious IP addresses
        if event.ip_address and self._is_suspicious_ip(event.ip_address):
            threats.append({
                "type": "suspicious_ip",
                "threat_type": "malicious_ip",
                "ip_address": event.ip_address,
                "confidence": 0.9,
                "severity": ThreatLevel.MEDIUM
            })
        
        # Check for brute force attempts
        if event.event_type == SecurityEventType.LOGIN_FAILED:
            brute_force_threat = self._detect_brute_force(event)
            if brute_force_threat:
                threats.append(brute_force_threat)
        
        # Check for unusual access patterns
        anomaly_threat = self._detect_anomalies(event)
        if anomaly_threat:
            threats.append(anomaly_threat)
        
        return threats
    
    def _is_suspicious_ip(self, ip_address: str) -> bool:
        """Check if IP address is suspicious"""
        try:
            ip = ipaddress.ip_address(ip_address)
            
            # Check if IP is in blocked list
            if ip_address in self.blocked_ips:
                return True
            
            # Check for private/local IPs (potential VPN abuse)
            if ip.is_private or ip.is_loopback:
                return False
            
            # Check for known malicious IP ranges (simplified)
            # In production, this would integrate with threat intelligence feeds
            suspicious_ranges = [
                "192.168.1.0/24",  # Example suspicious range
                "10.0.0.0/8",      # Example suspicious range
            ]
            
            for range_str in suspicious_ranges:
                if ip in ipaddress.ip_network(range_str):
                    return True
            
            return False
        except ValueError:
            return True  # Invalid IP addresses are suspicious
    
    def _detect_brute_force(self, event: SecurityEvent) -> Optional[Dict[str, Any]]:
        """Detect brute force login attempts"""
        if not event.ip_address:
            return None
        
        # Track failed login attempts per IP
        current_time = time.time()
        cutoff_time = current_time - 3600  # 1 hour window
        
        # Clean old entries
        while (self.rate_limit_violations[event.ip_address] and 
               self.rate_limit_violations[event.ip_address][0] < cutoff_time):
            self.rate_limit_violations[event.ip_address].popleft()
        
        # Add current attempt
        self.rate_limit_violations[event.ip_address].append(current_time)
        
        # Check threshold
        failed_attempts = len(self.rate_limit_violations[event.ip_address])
        if failed_attempts >= self.anomaly_thresholds["failed_logins_per_hour"]:
            return {
                "type": "brute_force",
                "threat_type": "authentication_attack",
                "ip_address": event.ip_address,
                "failed_attempts": failed_attempts,
                "confidence": 0.9,
                "severity": ThreatLevel.HIGH
            }
        
        return None
    
    def _detect_anomalies(self, event: SecurityEvent) -> Optional[Dict[str, Any]]:
        """Detect anomalous behavior patterns"""
        # This is a simplified anomaly detection
        # In production, this would use machine learning models
        
        # Check for unusual data access patterns
        if event.event_type == SecurityEventType.PII_ACCESS:
            # Track data access frequency per user
            user_key = f"data_access_{event.user_id}"
            current_time = time.time()
            cutoff_time = current_time - 3600  # 1 hour window
            
            # Clean old entries
            while (self.rate_limit_violations[user_key] and 
                   self.rate_limit_violations[user_key][0] < cutoff_time):
                self.rate_limit_violations[user_key].popleft()
            
            # Add current access
            self.rate_limit_violations[user_key].append(current_time)
            
            # Check threshold
            access_count = len(self.rate_limit_violations[user_key])
            if access_count > self.anomaly_thresholds["data_access_frequency"]:
                return {
                    "type": "anomaly",
                    "threat_type": "data_access_anomaly",
                    "user_id": event.user_id,
                    "access_count": access_count,
                    "confidence": 0.7,
                    "severity": ThreatLevel.MEDIUM
                }
        
        return None
    
    def add_threat_indicator(self, indicator: ThreatIndicator):
        """Add threat intelligence indicator"""
        self.threat_indicators[indicator.indicator_id] = indicator
        
        # If it's an IP indicator, add to blocked list
        if indicator.type == "ip" and indicator.confidence > 0.8:
            self.blocked_ips.add(indicator.value)
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP address is blocked"""
        return ip_address in self.blocked_ips
    
    def is_user_blocked(self, user_id: str) -> bool:
        """Check if user is blocked"""
        return user_id in self.blocked_users

class ComplianceMonitor:
    """Advanced compliance monitoring system"""
    
    def __init__(self):
        self.compliance_requirements: Dict[str, ComplianceRequirement] = {}
        self.compliance_checks: List[Dict[str, Any]] = []
        self.violations: List[Dict[str, Any]] = []
        
        # Initialize compliance requirements
        self._initialize_compliance_requirements()
    
    def _initialize_compliance_requirements(self):
        """Initialize compliance requirements for different standards"""
        
        # GDPR Requirements
        gdpr_requirements = [
            ComplianceRequirement(
                standard=ComplianceStandard.GDPR,
                requirement_id="GDPR_001",
                title="Data Minimization",
                description="Only collect and process data that is necessary",
                category="Data Collection",
                mandatory=True,
                frequency="continuous",
                last_check=None,
                next_check=None,
                status="pending"
            ),
            ComplianceRequirement(
                standard=ComplianceStandard.GDPR,
                requirement_id="GDPR_002",
                title="Consent Management",
                description="Maintain valid consent for data processing",
                category="Consent",
                mandatory=True,
                frequency="daily",
                last_check=None,
                next_check=None,
                status="pending"
            ),
            ComplianceRequirement(
                standard=ComplianceStandard.GDPR,
                requirement_id="GDPR_003",
                title="Data Retention",
                description="Implement appropriate data retention policies",
                category="Data Management",
                mandatory=True,
                frequency="weekly",
                last_check=None,
                next_check=None,
                status="pending"
            ),
            ComplianceRequirement(
                standard=ComplianceStandard.GDPR,
                requirement_id="GDPR_004",
                title="Right to be Forgotten",
                description="Support data deletion requests",
                category="Data Rights",
                mandatory=True,
                frequency="continuous",
                last_check=None,
                next_check=None,
                status="pending"
            )
        ]
        
        # FERPA Requirements
        ferpa_requirements = [
            ComplianceRequirement(
                standard=ComplianceStandard.FERPA,
                requirement_id="FERPA_001",
                title="Student Privacy",
                description="Protect student educational records",
                category="Privacy",
                mandatory=True,
                frequency="continuous",
                last_check=None,
                next_check=None,
                status="pending"
            ),
            ComplianceRequirement(
                standard=ComplianceStandard.FERPA,
                requirement_id="FERPA_002",
                title="Parental Rights",
                description="Respect parental rights to access records",
                category="Rights",
                mandatory=True,
                frequency="continuous",
                last_check=None,
                next_check=None,
                status="pending"
            )
        ]
        
        # Add all requirements
        for req in gdpr_requirements + ferpa_requirements:
            self.compliance_requirements[req.requirement_id] = req
    
    def check_compliance(self, standard: ComplianceStandard) -> Dict[str, Any]:
        """Check compliance for a specific standard"""
        requirements = [req for req in self.compliance_requirements.values() 
                       if req.standard == standard]
        
        total_requirements = len(requirements)
        compliant_requirements = len([req for req in requirements if req.status == "compliant"])
        non_compliant_requirements = len([req for req in requirements if req.status == "non_compliant"])
        pending_requirements = len([req for req in requirements if req.status == "pending"])
        
        compliance_score = (compliant_requirements / total_requirements * 100) if total_requirements > 0 else 0
        
        return {
            "standard": standard.value,
            "total_requirements": total_requirements,
            "compliant": compliant_requirements,
            "non_compliant": non_compliant_requirements,
            "pending": pending_requirements,
            "compliance_score": compliance_score,
            "status": "compliant" if compliance_score >= 90 else "non_compliant",
            "last_check": datetime.utcnow().isoformat()
        }
    
    def check_all_compliance(self) -> Dict[str, Any]:
        """Check compliance for all standards"""
        results = {}
        overall_score = 0
        total_standards = 0
        
        for standard in ComplianceStandard:
            result = self.check_compliance(standard)
            results[standard.value] = result
            overall_score += result["compliance_score"]
            total_standards += 1
        
        overall_compliance = overall_score / total_standards if total_standards > 0 else 0
        
        return {
            "overall_compliance": overall_compliance,
            "standards": results,
            "status": "compliant" if overall_compliance >= 90 else "non_compliant",
            "last_check": datetime.utcnow().isoformat()
        }
    
    def record_violation(self, requirement_id: str, description: str, 
                        severity: ThreatLevel, details: Dict[str, Any]):
        """Record a compliance violation"""
        violation = {
            "violation_id": f"VIOL_{int(time.time())}_{secrets.token_hex(4)}",
            "requirement_id": requirement_id,
            "description": description,
            "severity": severity.value,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details
        }
        
        self.violations.append(violation)
        
        # Update requirement status
        if requirement_id in self.compliance_requirements:
            self.compliance_requirements[requirement_id].status = "non_compliant"
            self.compliance_requirements[requirement_id].last_check = datetime.utcnow()

class SecurityAuditTrail:
    """Comprehensive security audit trail system"""
    
    def __init__(self):
        self.audit_events: List[SecurityEvent] = []
        self.incidents: List[SecurityIncident] = []
        self.policies: List[SecurityPolicy] = []
        self.max_events = 10000
        self.max_incidents = 1000
    
    def log_event(self, event: SecurityEvent):
        """Log a security event"""
        self.audit_events.append(event)
        
        # Maintain storage limits
        if len(self.audit_events) > self.max_events:
            self.audit_events = self.audit_events[-self.max_events:]
        
        logger.info(f"Security event logged: {event.event_type.value} - {event.description}")
    
    def create_incident(self, title: str, description: str, threat_level: ThreatLevel,
                       events: List[str], tags: List[str] = None) -> SecurityIncident:
        """Create a security incident"""
        if tags is None:
            tags = []
        
        incident = SecurityIncident(
            incident_id=f"INC_{int(time.time())}_{secrets.token_hex(4)}",
            title=title,
            description=description,
            threat_level=threat_level,
            status=SecurityIncidentStatus.OPEN,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            resolved_at=None,
            assigned_to=None,
            events=events,
            tags=tags,
            resolution_notes=None,
            compliance_impact=[],
            risk_score=self._calculate_risk_score(threat_level, len(events))
        )
        
        self.incidents.append(incident)
        
        # Maintain storage limits
        if len(self.incidents) > self.max_incidents:
            self.incidents = self.incidents[-self.max_incidents:]
        
        logger.warning(f"Security incident created: {incident.incident_id} - {title}")
        return incident
    
    def _calculate_risk_score(self, threat_level: ThreatLevel, event_count: int) -> float:
        """Calculate risk score for incident"""
        base_scores = {
            ThreatLevel.LOW: 1.0,
            ThreatLevel.MEDIUM: 3.0,
            ThreatLevel.HIGH: 6.0,
            ThreatLevel.CRITICAL: 9.0
        }
        
        base_score = base_scores.get(threat_level, 5.0)
        event_multiplier = min(event_count * 0.2, 2.0)  # Cap at 2x
        
        return min(base_score + event_multiplier, 10.0)
    
    def get_events_by_user(self, user_id: str, hours: int = 24) -> List[SecurityEvent]:
        """Get security events for a specific user"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        return [event for event in self.audit_events 
                if event.user_id == user_id and event.timestamp > cutoff_time]
    
    def get_events_by_type(self, event_type: SecurityEventType, hours: int = 24) -> List[SecurityEvent]:
        """Get security events by type"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        return [event for event in self.audit_events 
                if event.event_type == event_type and event.timestamp > cutoff_time]
    
    def get_open_incidents(self) -> List[SecurityIncident]:
        """Get all open security incidents"""
        return [incident for incident in self.incidents 
                if incident.status in [SecurityIncidentStatus.OPEN, SecurityIncidentStatus.INVESTIGATING]]
    
    def get_incidents_by_threat_level(self, threat_level: ThreatLevel) -> List[SecurityIncident]:
        """Get incidents by threat level"""
        return [incident for incident in self.incidents if incident.threat_level == threat_level]

class IncidentResponseEngine:
    """Automated incident response engine"""
    
    def __init__(self, threat_detection: ThreatDetectionEngine, 
                 compliance_monitor: ComplianceMonitor, 
                 audit_trail: SecurityAuditTrail):
        self.threat_detection = threat_detection
        self.compliance_monitor = compliance_monitor
        self.audit_trail = audit_trail
        self.response_playbooks: Dict[str, Dict[str, Any]] = {}
        
        # Initialize response playbooks
        self._initialize_playbooks()
    
    def _initialize_playbooks(self):
        """Initialize automated response playbooks"""
        self.response_playbooks = {
            "brute_force": {
                "actions": [
                    "block_ip_address",
                    "notify_security_team",
                    "increase_monitoring",
                    "reset_affected_accounts"
                ],
                "priority": "high",
                "auto_resolve": False
            },
            "data_breach": {
                "actions": [
                    "isolate_affected_systems",
                    "notify_compliance_team",
                    "freeze_data_access",
                    "initiate_incident_response"
                ],
                "priority": "critical",
                "auto_resolve": False
            },
            "compliance_violation": {
                "actions": [
                    "record_violation",
                    "notify_compliance_team",
                    "update_compliance_status",
                    "schedule_remediation"
                ],
                "priority": "medium",
                "auto_resolve": True
            }
        }
    
    def respond_to_threat(self, threat: Dict[str, Any], event: SecurityEvent) -> Dict[str, Any]:
        """Automatically respond to detected threats"""
        response = {
            "threat_id": threat.get("type", "unknown"),
            "actions_taken": [],
            "incident_created": False,
            "compliance_impact": [],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Determine response based on threat type
        if threat["type"] == "brute_force":
            response["actions_taken"] = self._handle_brute_force(threat, event)
        elif threat["type"] == "data_breach":
            response["actions_taken"] = self._handle_data_breach(threat, event)
        elif threat["type"] == "compliance_violation":
            response["actions_taken"] = self._handle_compliance_violation(threat, event)
        
        # Create incident if needed
        if threat.get("severity") in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]:
            incident = self.audit_trail.create_incident(
                title=f"Security Threat: {threat['type']}",
                description=f"Automatically detected threat: {threat.get('threat_type', 'unknown')}",
                threat_level=threat.get("severity", ThreatLevel.MEDIUM),
                events=[event.event_id],
                tags=[threat["type"], "auto_detected"]
            )
            response["incident_created"] = True
            response["incident_id"] = incident.incident_id
        
        return response
    
    def _handle_brute_force(self, threat: Dict[str, Any], event: SecurityEvent) -> List[str]:
        """Handle brute force attack"""
        actions = []
        
        # Block IP address
        if event.ip_address:
            self.threat_detection.blocked_ips.add(event.ip_address)
            actions.append(f"blocked_ip:{event.ip_address}")
        
        # Block user account if multiple failed attempts
        if event.user_id:
            self.threat_detection.blocked_users.add(event.user_id)
            actions.append(f"blocked_user:{event.user_id}")
        
        return actions
    
    def _handle_data_breach(self, threat: Dict[str, Any], event: SecurityEvent) -> List[str]:
        """Handle potential data breach"""
        actions = []
        
        # Record compliance violation
        self.compliance_monitor.record_violation(
            requirement_id="GDPR_001",  # Data minimization
            description="Potential unauthorized data access",
            severity=ThreatLevel.HIGH,
            details={
                "event_id": event.event_id,
                "user_id": event.user_id,
                "resource": event.target_resource,
                "threat_details": threat
            }
        )
        actions.append("recorded_compliance_violation")
        
        return actions
    
    def _handle_compliance_violation(self, threat: Dict[str, Any], event: SecurityEvent) -> List[str]:
        """Handle compliance violation"""
        actions = []
        
        # Record the violation
        self.compliance_monitor.record_violation(
            requirement_id="GDPR_002",  # Consent management
            description="Compliance requirement violation detected",
            severity=threat.get("severity", ThreatLevel.MEDIUM),
            details={
                "event_id": event.event_id,
                "user_id": event.user_id,
                "threat_details": threat
            }
        )
        actions.append("recorded_compliance_violation")
        
        return actions

# Global security system instances
threat_detection = ThreatDetectionEngine()
compliance_monitor = ComplianceMonitor()
audit_trail = SecurityAuditTrail()
incident_response = IncidentResponseEngine(threat_detection, compliance_monitor, audit_trail)

# Convenience functions
def log_security_event(event_type: SecurityEventType, user_id: Optional[str], 
                      ip_address: Optional[str], description: str, 
                      threat_level: ThreatLevel = ThreatLevel.LOW, 
                      details: Dict[str, Any] = None, 
                      target_resource: Optional[str] = None) -> SecurityEvent:
    """Log a security event"""
    event = SecurityEvent(
        event_id=f"EVT_{int(time.time())}_{secrets.token_hex(4)}",
        event_type=event_type,
        timestamp=datetime.utcnow(),
        user_id=user_id,
        ip_address=ip_address,
        user_agent=None,  # Would be extracted from request
        session_id=None,   # Would be extracted from request
        threat_level=threat_level,
        description=description,
        details=details or {},
        source="system",
        target_resource=target_resource,
        success=True
    )
    
    audit_trail.log_event(event)
    
    # Detect threats
    threats = threat_detection.detect_threats(event)
    if threats:
        # Respond to threats
        for threat in threats:
            incident_response.respond_to_threat(threat, event)
    
    return event

def check_compliance(standard: ComplianceStandard = None) -> Dict[str, Any]:
    """Check compliance status"""
    if standard:
        return compliance_monitor.check_compliance(standard)
    else:
        return compliance_monitor.check_all_compliance()

def get_security_events(user_id: str = None, event_type: SecurityEventType = None, 
                       hours: int = 24) -> List[SecurityEvent]:
    """Get security events with filters"""
    if user_id:
        return audit_trail.get_events_by_user(user_id, hours)
    elif event_type:
        return audit_trail.get_events_by_type(event_type, hours)
    else:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        return [event for event in audit_trail.audit_events if event.timestamp > cutoff_time]

def get_open_incidents() -> List[SecurityIncident]:
    """Get all open security incidents"""
    return audit_trail.get_open_incidents()

def add_threat_indicator(indicator_type: str, value: str, threat_type: str, 
                        confidence: float, source: str, tags: List[str] = None):
    """Add threat intelligence indicator"""
    indicator = ThreatIndicator(
        indicator_id=f"IND_{int(time.time())}_{secrets.token_hex(4)}",
        type=indicator_type,
        value=value,
        threat_type=threat_type,
        confidence=confidence,
        first_seen=datetime.utcnow(),
        last_seen=datetime.utcnow(),
        source=source,
        tags=tags or []
    )
    
    threat_detection.add_threat_indicator(indicator)
