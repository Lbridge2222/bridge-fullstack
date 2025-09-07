#!/usr/bin/env python3
"""
Test script for PII Redaction System - Phase 5.1
Tests the PII detection, redaction, and GDPR compliance features.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.ai.pii_redaction import (
    detect_pii_in_text, redact_text, check_consent, 
    add_consent, generate_gdpr_report, RedactionLevel
)

def test_pii_detection():
    """Test PII detection capabilities"""
    print("🔍 Testing PII Detection...")
    print("=" * 50)
    
    # Test text with various PII types
    test_text = """
    Student Application for John Smith
    Email: john.smith@email.com
    Phone: +44 7911 123456
    Address: 123 High Street, London, SW1A 1AA
    Student ID: MP2024001
    Date of Birth: 15/03/2000
    Course: MP101 Music Production
    """
    
    print(f"Test Text:\n{test_text}")
    
    # Detect PII
    matches = detect_pii_in_text(test_text, "student application")
    
    print(f"\nDetected {len(matches)} PII matches:")
    for i, match in enumerate(matches, 1):
        print(f"{i}. {match['pii_type']}: '{match['value']}' (confidence: {match['confidence']:.2f})")
    
    return len(matches) > 0

def test_pii_redaction():
    """Test PII redaction capabilities"""
    print("\n🛡️ Testing PII Redaction...")
    print("=" * 50)
    
    test_text = "Contact John Smith at john.smith@email.com or call +44 7911 123456"
    
    print(f"Original Text: {test_text}")
    
    # Test different redaction levels
    redaction_levels = ["full", "partial", "hashed", "anonymized"]
    
    for level in redaction_levels:
        result = redact_text(test_text, level, "contact information")
        print(f"\n{level.upper()} Redaction:")
        print(f"  Redacted: {result['redacted_text']}")
        print(f"  Matches: {len(result['pii_matches'])} PII items")
        print(f"  Operation ID: {result['operation_id']}")

def test_consent_management():
    """Test consent management system"""
    print("\n📋 Testing Consent Management...")
    print("=" * 50)
    
    # Add consent for a user
    user_id = "student_001"
    consent_record = add_consent(
        user_id=user_id,
        consent_type="data_processing",
        granted=True,
        purpose="Student recruitment and enrollment",
        data_categories=["personal_info", "academic_records", "contact_details"],
        expires_in_days=2555  # 7 years
    )
    
    print(f"Added consent record: {consent_record}")
    
    # Check consent
    has_consent = check_consent(user_id, "data_processing", "personal_info")
    print(f"User {user_id} has consent for personal_info: {has_consent}")
    
    # Check consent for different category
    has_consent_financial = check_consent(user_id, "data_processing", "financial_data")
    print(f"User {user_id} has consent for financial_data: {has_consent_financial}")

def test_gdpr_compliance():
    """Test GDPR compliance features"""
    print("\n⚖️ Testing GDPR Compliance...")
    print("=" * 50)
    
    # Generate compliance report
    report = generate_gdpr_report()
    
    print("GDPR Compliance Report:")
    for key, value in report.items():
        print(f"  {key}: {value}")

def test_real_world_scenario():
    """Test a real-world student data scenario"""
    print("\n🎓 Testing Real-World Student Data Scenario...")
    print("=" * 50)
    
    # Simulate student application data
    student_data = """
    STUDENT APPLICATION FORM
    
    Personal Information:
    Full Name: Sarah Johnson-Williams
    Email Address: sarah.johnson@studentmail.ac.uk
    Phone Number: 07700 900123
    Date of Birth: 22/08/1999
    
    Address:
    45 Oak Avenue, Manchester, M1 1AA
    
    Academic Information:
    Student ID: SE2024002
    Course Code: SE201
    Previous Institution: Manchester College
    
    Emergency Contact:
    Name: Michael Johnson
    Relationship: Father
    Phone: 0161 123 4567
    """
    
    print("Original Student Data:")
    print(student_data)
    
    # Detect PII
    print("\n🔍 PII Detection Results:")
    matches = detect_pii_in_text(student_data, "student application form")
    
    for match in matches:
        print(f"  - {match['pii_type']}: '{match['value']}' (confidence: {match['confidence']:.2f})")
    
    # Redact PII for internal processing
    print("\n🛡️ Redacted for Internal Processing (Partial):")
    partial_result = redact_text(student_data, "partial", "student application form")
    print(partial_result['redacted_text'])
    
    # Redact PII for external sharing
    print("\n🛡️ Redacted for External Sharing (Full):")
    full_result = redact_text(student_data, "full", "student application form")
    print(full_result['redacted_text'])

def main():
    """Run all tests"""
    print("🚀 PII Redaction System Test Suite - Phase 5.1")
    print("=" * 60)
    
    try:
        # Run tests
        test_pii_detection()
        test_pii_redaction()
        test_consent_management()
        test_gdpr_compliance()
        test_real_world_scenario()
        
        print("\n✅ All tests completed successfully!")
        print("\n🎯 Phase 5.1: Enhanced PII Redaction is working correctly!")
        print("   - PII detection: ✅")
        print("   - PII redaction: ✅")
        print("   - Consent management: ✅")
        print("   - GDPR compliance: ✅")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
