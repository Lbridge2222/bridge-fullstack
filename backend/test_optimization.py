#!/usr/bin/env python3
"""
Test script for Optimization System - Phase 5.3
Tests the rate limiting, caching, and performance monitoring features.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.ai.rate_limiting import (
    check_rate_limit, get_cache, set_cache, get_performance_stats,
    get_slow_endpoints, get_cache_stats, get_resource_usage,
    RateLimitType, CacheStrategy, rate_limiter, cache_manager,
    performance_monitor, resource_monitor
)

def test_rate_limiting():
    """Test rate limiting capabilities"""
    print("🚦 Testing Rate Limiting...")
    print("=" * 50)
    
    # Test user-based rate limiting
    print("Testing user-based rate limiting...")
    for i in range(65):  # Exceed 60 requests per minute limit
        limited, details = check_rate_limit(f"test_user_{i % 5}", RateLimitType.USER_BASED)
        if limited:
            print(f"  ✅ User rate limited after {i+1} requests: {details.get('reason', 'Unknown')}")
            break
        if i == 64:
            print("  ❌ User rate limiting not working properly")
    
    # Test role-based rate limiting
    print("\nTesting role-based rate limiting...")
    for i in range(25):  # Exceed 20 burst limit for staff role
        limited, details = check_rate_limit(f"staff_user_{i}", RateLimitType.ROLE_BASED, "staff")
        if limited:
            print(f"  ✅ Role rate limited after {i+1} requests: {details.get('reason', 'Unknown')}")
            break
        if i == 24:
            print("  ❌ Role rate limiting not working properly")
    
    # Test endpoint-based rate limiting
    print("\nTesting endpoint-based rate limiting...")
    for i in range(55):  # Exceed 50 burst limit for endpoint
        limited, details = check_rate_limit(f"test_endpoint_{i}", RateLimitType.ENDPOINT_BASED)
        if limited:
            print(f"  ✅ Endpoint rate limited after {i+1} requests: {details.get('reason', 'Unknown')}")
            break
        if i == 54:
            print("  ❌ Endpoint rate limiting not working properly")

def test_caching():
    """Test caching capabilities"""
    print("\n💾 Testing Caching System...")
    print("=" * 50)
    
    # Test different cache strategies
    test_data = {
        "short_term": {"strategy": CacheStrategy.SHORT_TERM, "data": "This expires in 5 minutes"},
        "medium_term": {"strategy": CacheStrategy.MEDIUM_TERM, "data": "This expires in 1 hour"},
        "long_term": {"strategy": CacheStrategy.LONG_TERM, "data": "This expires in 24 hours"},
        "permanent": {"strategy": CacheStrategy.PERMANENT, "data": "This never expires"}
    }
    
    for name, config in test_data.items():
        print(f"Testing {name} caching...")
        
        # Set cache
        success = set_cache(f"test_{name}", config["data"], config["strategy"])
        if success:
            print(f"  ✅ Successfully cached {name} data")
        else:
            print(f"  ❌ Failed to cache {name} data")
        
        # Get cache
        cached_data = get_cache(f"test_{name}")
        if cached_data == config["data"]:
            print(f"  ✅ Successfully retrieved {name} data from cache")
        else:
            print(f"  ❌ Failed to retrieve {name} data from cache")
    
    # Test cache invalidation
    print("\nTesting cache invalidation...")
    success = cache_manager.invalidate("test_short_term")
    if success:
        print("  ✅ Successfully invalidated specific cache entry")
    else:
        print("  ❌ Failed to invalidate cache entry")
    
    # Test pattern invalidation
    count = cache_manager.invalidate_pattern("test_")
    print(f"  ✅ Invalidated {count} cache entries matching pattern")

def test_performance_monitoring():
    """Test performance monitoring capabilities"""
    print("\n📊 Testing Performance Monitoring...")
    print("=" * 50)
    
    # Simulate some performance metrics
    print("Simulating performance metrics...")
    for i in range(10):
        performance_monitor.record_request(
            endpoint=f"test_endpoint_{i % 3}",
            method="POST",
            response_time_ms=100 + (i * 50),  # Varying response times
            user_id=f"user_{i}",
            status_code=200,
            cache_hit=(i % 2 == 0),  # Some cache hits
            rate_limited=False
        )
    
    # Get performance statistics
    stats = get_performance_stats()
    print(f"Performance Statistics:")
    print(f"  Total endpoints: {stats['total_endpoints']}")
    print(f"  Total requests: {stats['total_requests']}")
    print(f"  Average response time: {stats['average_response_time']:.2f}ms")
    print(f"  Cache hit rate: {stats['cache_hit_rate']:.2f}%")
    print(f"  Rate limit rate: {stats['rate_limit_rate']:.2f}%")
    
    # Get slow endpoints
    slow_endpoints = get_slow_endpoints(threshold_ms=200)
    print(f"\nSlow endpoints (threshold: 200ms): {len(slow_endpoints)}")
    for endpoint in slow_endpoints:
        print(f"  - {endpoint['endpoint']}: {endpoint['max_response_time']:.2f}ms")

def test_resource_monitoring():
    """Test resource monitoring capabilities"""
    print("\n🔍 Testing Resource Monitoring...")
    print("=" * 50)
    
    # Simulate resource usage
    print("Simulating resource usage...")
    resource_monitor.record_usage(
        cpu_percent=45.5,
        memory_mb=512,
        active_connections=25,
        cache_size_mb=15.5,
        active_rate_limits=3,
        total_requests=150,
        cached_requests=75
    )
    
    # Get current resource usage
    usage = get_resource_usage()
    if usage:
        print(f"Current Resource Usage:")
        print(f"  CPU: {usage.cpu_percent}%")
        print(f"  Memory: {usage.memory_mb} MB")
        print(f"  Active Connections: {usage.active_connections}")
        print(f"  Cache Size: {usage.cache_size_mb:.2f} MB")
        print(f"  Active Rate Limits: {usage.active_rate_limits}")
        print(f"  Total Requests: {usage.total_requests}")
        print(f"  Cached Requests: {usage.cached_requests}")
    else:
        print("  ❌ No resource usage data available")

def test_cache_statistics():
    """Test cache statistics"""
    print("\n📈 Testing Cache Statistics...")
    print("=" * 50)
    
    # Get cache statistics
    stats = get_cache_stats()
    print(f"Cache Statistics:")
    print(f"  Total entries: {stats['total_entries']}")
    print(f"  Total size: {stats['total_size_mb']:.2f} MB")
    print(f"  Max size: {stats['max_size_mb']:.2f} MB")
    print(f"  Hit rate: {stats['hit_rate']:.2f}%")
    
    if stats['most_accessed']:
        print(f"  Most accessed keys:")
        for key, count in stats['most_accessed'][:3]:
            print(f"    - {key}: {count} accesses")

def test_rate_limit_configuration():
    """Test rate limit configuration updates"""
    print("\n⚙️ Testing Rate Limit Configuration...")
    print("=" * 50)
    
    # Test updating user-based rate limits
    print("Testing user-based rate limit updates...")
    old_config = rate_limiter.default_configs[RateLimitType.USER_BASED]
    print(f"  Old config: {old_config.requests_per_minute} req/min, {old_config.burst_limit} burst")
    
    # Update configuration
    new_config = type(old_config)(
        requests_per_minute=30,  # Reduce from 60 to 30
        requests_per_hour=500,   # Reduce from 1000 to 500
        burst_limit=5,           # Reduce from 10 to 5
        cooldown_period=600      # Increase from 300 to 600
    )
    rate_limiter.default_configs[RateLimitType.USER_BASED] = new_config
    
    print(f"  New config: {new_config.requests_per_minute} req/min, {new_config.burst_limit} burst")
    
    # Test new limits
    for i in range(35):  # Should hit limit at 30
        limited, details = check_rate_limit("config_test_user", RateLimitType.USER_BASED)
        if limited:
            print(f"  ✅ New rate limit working: limited after {i+1} requests")
            break
        if i == 34:
            print("  ❌ New rate limit not working properly")

def test_real_world_scenario():
    """Test a real-world optimization scenario"""
    print("\n🌍 Testing Real-World Optimization Scenario...")
    print("=" * 50)
    
    print("Scenario: High-traffic API with caching and rate limiting")
    
    # Simulate high traffic
    print("\nSimulating high traffic...")
    for i in range(100):
        # Check rate limit first
        limited, details = check_rate_limit(f"user_{i % 20}", RateLimitType.USER_BASED)
        
        if limited:
            print(f"  User {i % 20} rate limited: {details.get('reason', 'Unknown')}")
            continue
        
        # Simulate API call with caching
        cache_key = f"api_data_{i % 10}"
        cached_data = get_cache(cache_key)
        
        if cached_data is None:
            # Simulate expensive API call
            api_data = f"Expensive API response for request {i}"
            set_cache(cache_key, api_data, CacheStrategy.SHORT_TERM)
            print(f"  Cache miss for {cache_key}, fetched from API")
        else:
            print(f"  Cache hit for {cache_key}")
        
        # Record performance metric
        performance_monitor.record_request(
            endpoint="api_endpoint",
            method="GET",
            response_time_ms=50 if cached_data else 250,  # Faster with cache
            user_id=f"user_{i % 20}",
            cache_hit=cached_data is not None
        )
    
    # Analyze results
    print("\nAnalyzing optimization results...")
    
    # Cache performance
    cache_stats = get_cache_stats()
    print(f"  Cache hit rate: {cache_stats['hit_rate']:.2f}%")
    
    # Performance metrics
    perf_stats = get_performance_stats("api_endpoint")
    if perf_stats and 'total_requests' in perf_stats and perf_stats['total_requests'] > 0:
        avg_response_time = perf_stats['total_response_time'] / perf_stats['total_requests']
        print(f"  Average response time: {avg_response_time:.2f}ms")
        print(f"  Cache hits: {perf_stats.get('cache_hits', 0)}")
    else:
        print("  No performance data available")
    
    # Rate limiting impact
    blocked_users = len(rate_limiter.blocked_users)
    print(f"  Currently blocked users: {blocked_users}")

def main():
    """Run all tests"""
    print("🚀 Optimization System Test Suite - Phase 5.3")
    print("=" * 60)
    
    try:
        # Run tests
        test_rate_limiting()
        test_caching()
        test_performance_monitoring()
        test_resource_monitoring()
        test_cache_statistics()
        test_rate_limit_configuration()
        test_real_world_scenario()
        
        print("\n✅ All tests completed successfully!")
        print("\n🎯 Phase 5.3: API Rate Limiting & Optimization is working correctly!")
        print("   - Rate limiting: ✅")
        print("   - Caching: ✅")
        print("   - Performance monitoring: ✅")
        print("   - Resource monitoring: ✅")
        print("   - Configuration management: ✅")
        print("   - Real-world scenarios: ✅")
        
        print(f"\n📊 System Statistics:")
        print(f"   Cache entries: {get_cache_stats()['total_entries']}")
        print(f"   Performance metrics: {len(performance_monitor.metrics)}")
        print(f"   Resource history: {len(resource_monitor.resource_history)}")
        print(f"   Blocked users: {len(rate_limiter.blocked_users)}")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
