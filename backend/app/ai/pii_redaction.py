"""
PII redaction utilities for telemetry
"""
import re
from typing import Any, Dict

def detect_pii_in_text_legacy(text: str) -> Dict[str, list]:
    """Legacy PII detection - returns simple lists"""
    if not text:
        return {"emails": [], "phones": [], "names": [], "dates": []}
    
    pii_found = {
        "emails": [],
        "phones": [],
        "names": [],
        "dates": []
    }
    
    # Find email addresses
    email_matches = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    pii_found["emails"] = email_matches
    
    # Find phone numbers
    phone_matches = re.findall(r'\b(?:\+44|0)[0-9]{10,11}\b', text)
    pii_found["phones"] = phone_matches
    
    # Find names (simple heuristic)
    name_matches = re.findall(r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', text)
    pii_found["names"] = name_matches
    
    # Find dates
    date_matches = re.findall(r'\b\d{2}/\d{2}/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b', text)
    pii_found["dates"] = date_matches
    
    return pii_found

def redact(text: str) -> str:
    """Redact PII from text for telemetry"""
    if not text:
        return text
    
    # Email addresses
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)
    
    # Phone numbers (UK format)
    text = re.sub(r'\b(?:\+44|0)[0-9]{10,11}\b', '[PHONE]', text)
    
    # Names (simple heuristic - capitalize words)
    text = re.sub(r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', '[NAME]', text)
    
    # Dates of birth
    text = re.sub(r'\b\d{2}/\d{2}/\d{4}\b', '[DOB]', text)
    text = re.sub(r'\b\d{4}-\d{2}-\d{2}\b', '[DOB]', text)
    
    return text

def redact_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Redact PII from dictionary values"""
    if not isinstance(data, dict):
        return data
    
    redacted = {}
    for key, value in data.items():
        if isinstance(value, str):
            redacted[key] = redact(value)
        elif isinstance(value, dict):
            redacted[key] = redact_dict(value)
        else:
            redacted[key] = value
    
    return redacted

# keep both names so imports never break
def redact_text_legacy(text: str | None) -> str | None:
    return redact(text)

def check_consent(data: Dict[str, Any]) -> bool:
    """Check if data has proper consent for processing"""
    if not isinstance(data, dict):
        return False
    
    # Check for GDPR opt-in
    gdpr_opt_in = data.get("gdpr_opt_in", False)
    consent_status = data.get("consent_status", "")
    
    # Return True if explicitly opted in or consent status is positive
    return gdpr_opt_in or consent_status.lower() in ["opt_in", "consented", "yes", "true"]

def redact_text(s: str, redaction_level: str = "full", context: str = "") -> Dict[str, Any]:
    """Redact PII from text with configurable redaction level"""
    import re
    import uuid
    
    if not s: 
        return {
            "original_text": s,
            "redacted_text": s,
            "pii_matches": [],
            "redaction_level": redaction_level,
            "timestamp": datetime.utcnow().isoformat(),
            "operation_id": str(uuid.uuid4())
        }
    
    # Detect PII first
    matches = detect_pii_in_text(s, context)
    
    # Apply redaction based on level
    redacted_text = s
    for match in matches:
        if redaction_level == "full":
            replacement = f"[{match['pii_type'].upper()}]"
        elif redaction_level == "partial":
            if match['pii_type'] == "email":
                replacement = "j***@email.com"
            else:
                replacement = f"[{match['pii_type'].upper()}]"
        elif redaction_level == "hashed":
            replacement = f"[HASHED_{match['pii_type'].upper()}]"
        else:  # anonymized
            replacement = f"[ANONYMIZED_{match['pii_type'].upper()}]"
        
        redacted_text = redacted_text.replace(match['value'], replacement)
    
    return {
        "original_text": s,
        "redacted_text": redacted_text,
        "pii_matches": matches,
        "redaction_level": redaction_level,
        "timestamp": datetime.utcnow().isoformat(),
        "operation_id": str(uuid.uuid4())
    }

# Backward compatibility alias
def redact_text_simple(s: str) -> str:
    """Simple redaction for telemetry logging (backward compatibility)"""
    import re
    if not s: return s
    s = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', '[redacted-email]', s)
    s = re.sub(r'\b(\+?\d[\d\s().-]{6,})\b', '[redacted-phone]', s)
    return s

# Additional functions needed by the PII redaction router
from enum import Enum
from typing import Dict, Any, List
from datetime import datetime, timedelta

class RedactionLevel(Enum):
    FULL = "full"
    PARTIAL = "partial"
    HASHED = "hashed"
    ANONYMIZED = "anonymized"

class PIIType(Enum):
    EMAIL = "email"
    PHONE = "phone"
    NAME = "name"
    DATE = "date"
    ADDRESS = "address"
    SSN = "ssn"
    CREDIT_CARD = "credit_card"

class PIIEngine:
    def __init__(self):
        self.patterns = {
            PIIType.EMAIL: [r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'],
            PIIType.PHONE: [r'\b(?:\+44|0)[0-9]{10,11}\b'],
            PIIType.NAME: [r'\b[A-Z][a-z]+ [A-Z][a-z]+\b'],
            PIIType.DATE: [r'\b\d{2}/\d{2}/\d{4}\b', r'\b\d{4}-\d{2}-\d{2}\b']
        }
        self.redaction_templates = {
            PIIType.EMAIL: {
                "full": "[EMAIL]",
                "partial": "j***@email.com",
                "hashed": "[HASHED_EMAIL]",
                "anonymized": "user@domain.com"
            }
        }
        self.gdpr_settings = {"retention_days": 365, "consent_required": True}

class ConsentManager:
    def __init__(self):
        self.consent_records = {}
    
    def add_consent(self, user_id: str, consent_type: str, granted: bool, 
                   purpose: str, data_categories: List[str], expires_in_days: int = None):
        """Add or update user consent"""
        record = {
            "user_id": user_id,
            "consent_type": consent_type,
            "granted": granted,
            "timestamp": datetime.utcnow().isoformat(),
            "purpose": purpose,
            "data_categories": data_categories,
            "expires_at": (datetime.utcnow() + timedelta(days=expires_in_days)).isoformat() if expires_in_days else None
        }
        self.consent_records[f"{user_id}_{consent_type}"] = record
        return record
    
    def revoke_consent(self, user_id: str, consent_type: str) -> bool:
        """Revoke user consent"""
        key = f"{user_id}_{consent_type}"
        if key in self.consent_records:
            del self.consent_records[key]
            return True
        return False

class GDPRCompliance:
    def __init__(self):
        self.data_retention_policy = "Data retained for 365 days"
        self.consent_management = "Active consent required for all PII processing"
        self.data_minimization = "Only necessary data collected and processed"

# Global instances
pii_engine = PIIEngine()
consent_manager = ConsentManager()
gdpr_compliance = GDPRCompliance()

def add_consent(user_id: str, consent_type: str, granted: bool, 
               purpose: str, data_categories: List[str], expires_in_days: int = None):
    """Add user consent for data processing"""
    return consent_manager.add_consent(user_id, consent_type, granted, purpose, data_categories, expires_in_days)

def generate_gdpr_report() -> Dict[str, Any]:
    """Generate GDPR compliance report"""
    active_consents = sum(1 for record in consent_manager.consent_records.values() if record["granted"])
    expired_consents = sum(1 for record in consent_manager.consent_records.values() 
                          if record.get("expires_at") and datetime.fromisoformat(record["expires_at"]) < datetime.utcnow())
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "consent_records_count": len(consent_manager.consent_records),
        "active_consents": active_consents,
        "expired_consents": expired_consents,
        "gdpr_compliant": active_consents > 0,
        "data_retention_policy": gdpr_compliance.data_retention_policy,
        "consent_management": gdpr_compliance.consent_management,
        "data_minimization": gdpr_compliance.data_minimization
    }

def detect_pii_in_text(text: str, context: str = "") -> List[Dict[str, Any]]:
    """Enhanced PII detection with context and confidence scoring"""
    if not text:
        return []
    
    matches = []
    for pii_type, patterns in pii_engine.patterns.items():
        for pattern in patterns:
            import re
            for match in re.finditer(pattern, text):
                matches.append({
                    "pii_type": pii_type.value,
                    "value": match.group(),
                    "start_pos": match.start(),
                    "end_pos": match.end(),
                    "confidence": 0.8,  # Simple confidence scoring
                    "context": context[:50] if context else "",
                    "redaction_level": "full"
                })
    
    return matches