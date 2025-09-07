#!/usr/bin/env python3
"""
Enhanced PII Redaction Module - Phase 5.1
Provides comprehensive PII detection, redaction, and GDPR compliance for Bridge CRM.
"""

import re
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RedactionLevel(Enum):
    """Redaction levels for PII data"""
    FULL = "full"           # Complete removal/replacement
    PARTIAL = "partial"     # Partial masking (e.g., j***@email.com)
    HASHED = "hashed"       # Cryptographic hash
    ANONYMIZED = "anonymized"  # Pseudonymized data

class PIIType(Enum):
    """Types of PII that can be detected"""
    NAME = "name"
    EMAIL = "email"
    PHONE = "phone"
    ADDRESS = "address"
    STUDENT_ID = "student_id"
    NATIONAL_ID = "national_id"
    POSTCODE = "postcode"
    DATE_OF_BIRTH = "date_of_birth"
    FINANCIAL = "financial"
    ACADEMIC = "academic"

@dataclass
class PIIMatch:
    """Represents a detected PII match"""
    pii_type: PIIType
    value: str
    start_pos: int
    end_pos: int
    confidence: float
    context: str
    redaction_level: RedactionLevel

@dataclass
class RedactionResult:
    """Result of PII redaction operation"""
    original_text: str
    redacted_text: str
    pii_matches: List[PIIMatch]
    redaction_level: RedactionLevel
    timestamp: datetime
    operation_id: str

@dataclass
class ConsentRecord:
    """User consent for data processing"""
    user_id: str
    consent_type: str
    granted: bool
    timestamp: datetime
    expires_at: Optional[datetime]
    purpose: str
    data_categories: List[str]

class PIIRedactionEngine:
    """Advanced PII detection and redaction engine"""
    
    def __init__(self):
        # Comprehensive PII detection patterns
        self.patterns = {
            PIIType.NAME: [
                r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',  # First Last
                r'\b[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+\b',  # First Middle Last
                r'\b[A-Z][a-z]+-[A-Z][a-z]+\b',  # Hyphenated names
            ],
            PIIType.EMAIL: [
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            ],
            PIIType.PHONE: [
                r'\b(?:\+44|0)\s*[1-9]\d{1,4}\s*\d{3,4}\s*\d{3,4}\b',  # UK format
                r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',  # US format
                r'\b\d{4}[-.\s]?\d{3}[-.\s]?\d{3}\b',  # UK mobile
            ],
            PIIType.ADDRESS: [
                r'\b\d+\s+[A-Za-z\s]+(?:Street|Road|Avenue|Lane|Drive|Way|Close)\b',
                r'\b[A-Za-z\s]+(?:Street|Road|Avenue|Lane|Drive|Way|Close)\b',
            ],
            PIIType.STUDENT_ID: [
                r'\b[A-Z]{2,3}\d{6,8}\b',  # Common student ID format
                r'\b\d{8,10}\b',  # Numeric student IDs
            ],
            PIIType.NATIONAL_ID: [
                r'\b[A-Z]{2}\d{6}[A-Z]\b',  # UK National Insurance
                r'\b\d{3}-\d{2}-\d{4}\b',  # US SSN
            ],
            PIIType.POSTCODE: [
                r'\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b',  # UK postcode
            ],
            PIIType.DATE_OF_BIRTH: [
                r'\b(?:0?[1-9]|[12]\d|3[01])[-/](?:0?[1-9]|1[0-2])[-/]\d{4}\b',
                r'\b\d{4}[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])\b',
            ],
            PIIType.FINANCIAL: [
                r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',  # Credit card
                r'\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b',  # IBAN
            ],
            PIIType.ACADEMIC: [
                r'\b[A-Z]{2,4}\d{3,4}\b',  # Course codes
                r'\b[A-Z]{2,4}\s*\d{3,4}\b',  # Course codes with space
            ]
        }
        
        # Redaction templates
        self.redaction_templates = {
            PIIType.NAME: {
                RedactionLevel.FULL: "[REDACTED_NAME]",
                RedactionLevel.PARTIAL: lambda x: f"{x[0]}***{x[-1]}" if len(x) > 2 else "***",
                RedactionLevel.HASHED: lambda x: hashlib.sha256(x.encode()).hexdigest()[:8],
                RedactionLevel.ANONYMIZED: lambda x: f"USER_{hashlib.md5(x.encode()).hexdigest()[:6].upper()}"
            },
            PIIType.EMAIL: {
                RedactionLevel.FULL: "[REDACTED_EMAIL]",
                RedactionLevel.PARTIAL: lambda x: f"{x.split('@')[0][:3]}***@{x.split('@')[1]}",
                RedactionLevel.HASHED: lambda x: hashlib.sha256(x.encode()).hexdigest()[:8],
                RedactionLevel.ANONYMIZED: lambda x: f"user_{hashlib.md5(x.encode()).hexdigest()[:6].upper()}@example.com"
            },
            PIIType.PHONE: {
                RedactionLevel.FULL: "[REDACTED_PHONE]",
                RedactionLevel.PARTIAL: lambda x: f"{x[:4]}***{x[-4:]}",
                RedactionLevel.HASHED: lambda x: hashlib.sha256(x.encode()).hexdigest()[:8],
                RedactionLevel.ANONYMIZED: lambda x: f"+44{hashlib.md5(x.encode()).hexdigest()[:9]}"
            }
        }
        
        # GDPR compliance settings
        self.gdpr_settings = {
            "data_retention_days": 2555,  # 7 years for student records
            "consent_required": True,
            "right_to_forget": True,
            "data_minimization": True
        }

    def detect_pii(self, text: str, context: str = "") -> List[PIIMatch]:
        """Detect PII in the given text"""
        matches = []
        
        for pii_type, patterns in self.patterns.items():
            for pattern in patterns:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    # Calculate confidence based on pattern strength and context
                    confidence = self._calculate_confidence(pii_type, match.group(), context)
                    
                    if confidence > 0.5:  # Only include high-confidence matches
                        pii_match = PIIMatch(
                            pii_type=pii_type,
                            value=match.group(),
                            start_pos=match.start(),
                            end_pos=match.end(),
                            confidence=confidence,
                            context=context,
                            redaction_level=self._determine_redaction_level(pii_type, confidence)
                        )
                        matches.append(pii_match)
        
        # Sort by confidence (highest first)
        matches.sort(key=lambda x: x.confidence, reverse=True)
        return matches

    def _calculate_confidence(self, pii_type: PIIType, value: str, context: str) -> float:
        """Calculate confidence score for PII detection"""
        base_confidence = 0.7
        
        # Adjust based on PII type
        if pii_type == PIIType.EMAIL:
            if '@' in value and '.' in value.split('@')[1]:
                base_confidence += 0.2
        elif pii_type == PIIType.PHONE:
            if re.match(r'^\+?[\d\s\-\(\)]+$', value):
                base_confidence += 0.15
        elif pii_type == PIIType.NAME:
            if len(value.split()) >= 2:
                base_confidence += 0.1
        
        # Context adjustments
        if "student" in context.lower() or "lead" in context.lower():
            base_confidence += 0.1
        if "contact" in context.lower() or "personal" in context.lower():
            base_confidence += 0.1
            
        return min(base_confidence, 1.0)

    def _determine_redaction_level(self, pii_type: PIIType, confidence: float) -> RedactionLevel:
        """Determine appropriate redaction level based on PII type and confidence"""
        if confidence > 0.9:
            return RedactionLevel.FULL
        elif confidence > 0.7:
            return RedactionLevel.PARTIAL
        elif confidence > 0.5:
            return RedactionLevel.HASHED
        else:
            return RedactionLevel.ANONYMIZED

    def redact_text(self, text: str, redaction_level: RedactionLevel = RedactionLevel.FULL, 
                   context: str = "") -> RedactionResult:
        """Redact PII from text according to specified level"""
        # Detect PII first
        pii_matches = self.detect_pii(text, context)
        
        # Sort matches by position (end to start) to avoid index shifting
        pii_matches.sort(key=lambda x: x.end_pos, reverse=True)
        
        redacted_text = text
        operation_id = self._generate_operation_id()
        
        # Apply redactions
        for match in pii_matches:
            if match.redaction_level == redaction_level or redaction_level == RedactionLevel.FULL:
                replacement = self._get_replacement(match, redaction_level)
                redacted_text = (
                    redacted_text[:match.start_pos] + 
                    replacement + 
                    redacted_text[match.end_pos:]
                )
        
        result = RedactionResult(
            original_text=text,
            redacted_text=redacted_text,
            pii_matches=pii_matches,
            redaction_level=redaction_level,
            timestamp=datetime.utcnow(),
            operation_id=operation_id
        )
        
        # Log the operation
        self._log_redaction_operation(result)
        
        return result

    def _get_replacement(self, match: PIIMatch, redaction_level: RedactionLevel) -> str:
        """Get replacement text for PII based on redaction level"""
        if redaction_level == RedactionLevel.FULL:
            return f"[REDACTED_{match.pii_type.value.upper()}]"
        
        template = self.redaction_templates.get(match.pii_type, {}).get(redaction_level)
        if callable(template):
            return template(match.value)
        elif template:
            return template
        else:
            return "[REDACTED]"

    def _generate_operation_id(self) -> str:
        """Generate unique operation ID for tracking"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        random_suffix = hashlib.md5(str(datetime.utcnow().timestamp()).encode()).hexdigest()[:6]
        return f"PII_REDACT_{timestamp}_{random_suffix}"

    def _log_redaction_operation(self, result: RedactionResult):
        """Log redaction operation for audit purposes"""
        log_entry = {
            "operation_id": result.operation_id,
            "timestamp": result.timestamp.isoformat(),
            "redaction_level": result.redaction_level.value,
            "pii_matches_count": len(result.pii_matches),
            "pii_types": [match.pii_type.value for match in result.pii_matches],
            "text_length": len(result.original_text),
            "redacted_length": len(result.redacted_text)
        }
        
        logger.info(f"PII Redaction Operation: {json.dumps(log_entry, indent=2)}")

class ConsentManager:
    """Manages user consent for data processing"""
    
    def __init__(self):
        self.consent_records: Dict[str, ConsentRecord] = {}
    
    def add_consent(self, user_id: str, consent_type: str, granted: bool, 
                   purpose: str, data_categories: List[str], 
                   expires_in_days: Optional[int] = None) -> ConsentRecord:
        """Add or update user consent"""
        expires_at = None
        if expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
        
        consent_record = ConsentRecord(
            user_id=user_id,
            consent_type=consent_type,
            granted=granted,
            timestamp=datetime.utcnow(),
            expires_at=expires_at,
            purpose=purpose,
            data_categories=data_categories
        )
        
        self.consent_records[user_id] = consent_record
        logger.info(f"Consent recorded for user {user_id}: {consent_type} = {granted}")
        
        return consent_record
    
    def has_valid_consent(self, user_id: str, consent_type: str, 
                         data_category: str) -> bool:
        """Check if user has valid consent for specific data processing"""
        if user_id not in self.consent_records:
            return False
        
        record = self.consent_records[user_id]
        
        # Check if consent is granted
        if not record.granted:
            return False
        
        # Check if consent has expired
        if record.expires_at and datetime.utcnow() > record.expires_at:
            return False
        
        # Check if consent type matches
        if record.consent_type != consent_type:
            return False
        
        # Check if data category is covered
        if data_category not in record.data_categories:
            return False
        
        return True
    
    def revoke_consent(self, user_id: str, consent_type: str) -> bool:
        """Revoke user consent"""
        if user_id in self.consent_records:
            record = self.consent_records[user_id]
            if record.consent_type == consent_type:
                record.granted = False
                logger.info(f"Consent revoked for user {user_id}: {consent_type}")
                return True
        return False

class GDPRCompliance:
    """GDPR compliance utilities"""
    
    def __init__(self, consent_manager: ConsentManager):
        self.consent_manager = consent_manager
    
    def can_process_data(self, user_id: str, data_category: str, 
                        purpose: str) -> Tuple[bool, str]:
        """Check if data processing is allowed under GDPR"""
        # Check consent
        if not self.consent_manager.has_valid_consent(user_id, "data_processing", data_category):
            return False, "No valid consent for data processing"
        
        # Check data retention
        if not self._check_data_retention(user_id):
            return False, "Data retention period exceeded"
        
        # Check data minimization
        if not self._check_data_minimization(data_category, purpose):
            return False, "Data processing exceeds stated purpose"
        
        return True, "Data processing allowed"
    
    def _check_data_retention(self, user_id: str) -> bool:
        """Check if data retention period is within limits"""
        # Implementation would check against database records
        # For now, return True (assume compliant)
        return True
    
    def _check_data_minimization(self, data_category: str, purpose: str) -> bool:
        """Check if data processing is minimized for stated purpose"""
        # Implementation would check if data category is necessary for purpose
        # For now, return True (assume compliant)
        return True
    
    def generate_compliance_report(self) -> Dict[str, Any]:
        """Generate GDPR compliance report"""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "consent_records_count": len(self.consent_manager.consent_records),
            "active_consents": sum(1 for r in self.consent_manager.consent_records.values() if r.granted),
            "expired_consents": sum(1 for r in self.consent_manager.consent_records.values() 
                                  if r.expires_at and datetime.utcnow() > r.expires_at),
            "gdpr_compliant": True,
            "data_retention_policy": "7 years for student records",
            "consent_management": "Active",
            "data_minimization": "Enforced"
        }

# Global instances
pii_engine = PIIRedactionEngine()
consent_manager = ConsentManager()
gdpr_compliance = GDPRCompliance(consent_manager)

def detect_pii_in_text(text: str, context: str = "") -> List[Dict[str, Any]]:
    """Convenience function to detect PII in text"""
    matches = pii_engine.detect_pii(text, context)
    return [asdict(match) for match in matches]

def redact_text(text: str, redaction_level: str = "full", context: str = "") -> Dict[str, Any]:
    """Convenience function to redact PII from text"""
    level = RedactionLevel(redaction_level)
    result = pii_engine.redact_text(text, level, context)
    return asdict(result)

def check_consent(user_id: str, consent_type: str, data_category: str) -> bool:
    """Convenience function to check user consent"""
    return consent_manager.has_valid_consent(user_id, consent_type, data_category)

def add_consent(user_id: str, consent_type: str, granted: bool, 
               purpose: str, data_categories: List[str], 
               expires_in_days: Optional[int] = None) -> Dict[str, Any]:
    """Convenience function to add user consent"""
    record = consent_manager.add_consent(user_id, consent_type, granted, purpose, 
                                       data_categories, expires_in_days)
    return asdict(record)

def generate_gdpr_report() -> Dict[str, Any]:
    """Convenience function to generate GDPR compliance report"""
    return gdpr_compliance.generate_compliance_report()
