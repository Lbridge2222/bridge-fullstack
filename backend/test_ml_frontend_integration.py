#!/usr/bin/env python3
"""
Test script to verify ML frontend integration
Tests the exact payload format that the frontend sends and expects
"""

import requests
import json
import sys
from typing import List, Dict, Any

# Configuration
BASE_URL = "http://localhost:8000"
ENDPOINT = "/ai/advanced-ml/predict-batch"

def test_ml_integration():
    """Test ML integration with frontend payload format"""
    print("🧪 Testing ML Frontend Integration")
    print("=" * 50)
    
    # Test payload (raw array format that frontend sends)
    test_lead_ids = [
        "test-lead-1",
        "test-lead-2", 
        "test-lead-3"
    ]
    
    print(f"📤 Sending payload: {test_lead_ids}")
    print(f"📡 Endpoint: {BASE_URL}{ENDPOINT}")
    
    try:
        # Make request (raw array format)
        response = requests.post(
            f"{BASE_URL}{ENDPOINT}",
            headers={"Content-Type": "application/json"},
            json=test_lead_ids,  # Raw array, not wrapped object
            timeout=30
        )
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📊 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Response:")
            print(json.dumps(data, indent=2))
            
            # Validate response structure
            validate_response_structure(data)
            
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    
    return True

def validate_response_structure(data: Dict[str, Any]):
    """Validate that response matches frontend expectations"""
    print("\n🔍 Validating Response Structure")
    print("-" * 30)
    
    # Check required fields
    required_fields = ["predictions", "model_version", "total_processed", "successful_predictions"]
    for field in required_fields:
        if field in data:
            print(f"✅ {field}: {data[field]}")
        else:
            print(f"❌ Missing field: {field}")
    
    # Check predictions array
    if "predictions" in data and isinstance(data["predictions"], list):
        print(f"✅ predictions array: {len(data['predictions'])} items")
        
        for i, pred in enumerate(data["predictions"]):
            print(f"  Prediction {i+1}:")
            if isinstance(pred, dict):
                required_pred_fields = ["lead_id", "probability", "confidence"]
                for field in required_pred_fields:
                    if field in pred:
                        value = pred[field]
                        print(f"    ✅ {field}: {value} (type: {type(value).__name__})")
                        
                        # Validate probability range
                        if field == "probability" and isinstance(value, (int, float)):
                            if 0 <= value <= 1:
                                print(f"      ✅ Probability in valid range [0,1]")
                            else:
                                print(f"      ❌ Probability out of range: {value}")
                        
                        # Validate confidence range
                        if field == "confidence" and isinstance(value, (int, float)):
                            if 0 <= value <= 1:
                                print(f"      ✅ Confidence in valid range [0,1]")
                            else:
                                print(f"      ❌ Confidence out of range: {value}")
                    else:
                        print(f"    ❌ Missing prediction field: {field}")
            else:
                print(f"    ❌ Prediction {i+1} is not a dict: {type(pred)}")
    else:
        print("❌ predictions field missing or not an array")
    
    # Check for additional metadata
    metadata_fields = ["model_sha256", "schema_version", "contract_version", "request_id"]
    for field in metadata_fields:
        if field in data:
            print(f"✅ {field}: {data[field]}")
        else:
            print(f"ℹ️  Optional field not present: {field}")

def test_wrapped_payload():
    """Test wrapped payload format (alternative)"""
    print("\n🧪 Testing Wrapped Payload Format")
    print("=" * 50)
    
    test_payload = {
        "lead_ids": ["test-lead-4", "test-lead-5"]
    }
    
    print(f"📤 Sending wrapped payload: {test_payload}")
    
    try:
        response = requests.post(
            f"{BASE_URL}{ENDPOINT}",
            headers={"Content-Type": "application/json"},
            json=test_payload,
            timeout=30
        )
        
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Wrapped payload success!")
            print(f"📊 Predictions: {len(data.get('predictions', []))}")
        else:
            print(f"❌ Wrapped payload error: {response.text}")
            
    except Exception as e:
        print(f"❌ Wrapped payload test failed: {e}")

if __name__ == "__main__":
    print("🚀 ML Frontend Integration Test")
    print("=" * 50)
    
    # Test raw array format (what frontend uses)
    success = test_ml_integration()
    
    # Test wrapped format (alternative)
    test_wrapped_payload()
    
    if success:
        print("\n🎉 Integration test completed!")
        print("Check the console output above for any issues.")
    else:
        print("\n❌ Integration test failed!")
        sys.exit(1)
