#!/usr/bin/env python3
"""
Quick ML integration test script

Tests the hardened ML endpoints to ensure they're working correctly.
Run this after starting the backend server.
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_health_endpoint():
    """Test the health check endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/ai/advanced-ml/health")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data}")
            return True
        else:
            print(f"❌ Health check failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_models_endpoint():
    """Test the models endpoint"""
    print("\n🔍 Testing models endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/ai/advanced-ml/models")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Models endpoint passed: {data}")
            return True
        else:
            print(f"❌ Models endpoint failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Models endpoint error: {e}")
        return False

def test_predict_batch_raw_array():
    """Test predict-batch with raw array format (legacy)"""
    print("\n🔍 Testing predict-batch with raw array format...")
    try:
        # Test with raw array format (what frontend uses)
        payload = ["test_lead_1", "test_lead_2"]
        response = requests.post(
            f"{BASE_URL}/ai/advanced-ml/predict-batch",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        print(f"Status: {response.status_code}")
        print(f"Request ID: {response.headers.get('X-Request-ID', 'Not set')}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Raw array format passed")
            print(f"   - Schema version: {data.get('schema_version', 'Not set')}")
            print(f"   - Contract version: {data.get('contract_version', 'Not set')}")
            print(f"   - Model ID: {data.get('model_id', 'Not set')}")
            print(f"   - Request ID: {data.get('request_id', 'Not set')}")
            print(f"   - Predictions: {len(data.get('predictions', []))}")
            return True
        else:
            print(f"❌ Raw array format failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Raw array format error: {e}")
        return False

def test_predict_batch_wrapped_object():
    """Test predict-batch with wrapped object format (canonical)"""
    print("\n🔍 Testing predict-batch with wrapped object format...")
    try:
        # Test with wrapped object format
        payload = {"lead_ids": ["test_lead_1", "test_lead_2"]}
        response = requests.post(
            f"{BASE_URL}/ai/advanced-ml/predict-batch",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Wrapped object format passed: {data}")
            return True
        else:
            print(f"❌ Wrapped object format failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Wrapped object format error: {e}")
        return False

def test_legacy_endpoint():
    """Test the legacy endpoint (should proxy to hardened)"""
    print("\n🔍 Testing legacy endpoint proxy...")
    try:
        # Test legacy endpoint
        payload = ["test_lead_1", "test_lead_2"]
        response = requests.post(
            f"{BASE_URL}/ai/advanced-ml/predict-batch",
            headers={"Content-Type": "application/json"},
            json=payload
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Legacy endpoint proxy passed: {data}")
            return True
        else:
            print(f"❌ Legacy endpoint proxy failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Legacy endpoint proxy error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting ML Integration Tests")
    print("=" * 50)
    
    tests = [
        test_health_endpoint,
        test_models_endpoint,
        test_predict_batch_raw_array,
        test_predict_batch_wrapped_object,
        test_legacy_endpoint
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        time.sleep(0.5)  # Small delay between tests
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! ML integration is working correctly.")
        return True
    else:
        print("❌ Some tests failed. Check the output above for details.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
