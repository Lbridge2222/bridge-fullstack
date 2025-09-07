#!/usr/bin/env python3
"""
Optimization API Endpoints - Phase 5.3
Provides REST API access to rate limiting, caching, and performance monitoring features.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Header
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime
import logging
import time

# Import our optimization system
from ..ai.rate_limiting import (
    check_rate_limit, get_cache, set_cache, get_performance_stats,
    get_slow_endpoints, get_cache_stats, get_resource_usage,
    RateLimitType, CacheStrategy, rate_limiter, cache_manager,
    performance_monitor, resource_monitor
)

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/optimization", tags=["API Optimization & Monitoring"])

# Pydantic models for API requests/responses
class RateLimitCheckRequest(BaseModel):
    identifier: str = Field(..., description="User/endpoint identifier")
    limit_type: str = Field(..., description="Rate limit type: user_based, role_based, endpoint_based, global")
    user_role: Optional[str] = Field(None, description="User role for role-based limits")

class CacheRequest(BaseModel):
    key: str = Field(..., description="Cache key")
    data: Any = Field(..., description="Data to cache")
    strategy: str = Field("medium_term", description="Cache strategy: none, short_term, medium_term, long_term, permanent")

class CacheInvalidateRequest(BaseModel):
    pattern: str = Field(..., description="Pattern to match for invalidation")

class PerformanceThresholdRequest(BaseModel):
    threshold_ms: float = Field(1000.0, description="Response time threshold in milliseconds")

class RateLimitConfigRequest(BaseModel):
    limit_type: str = Field(..., description="Rate limit type")
    requests_per_minute: int = Field(60, description="Requests per minute")
    requests_per_hour: int = Field(1000, description="Requests per hour")
    burst_limit: int = Field(10, description="Burst limit")
    cooldown_period: int = Field(300, description="Cooldown period in seconds")

class RateLimitResponse(BaseModel):
    limited: bool
    details: Dict[str, Any]
    timestamp: str

class CacheResponse(BaseModel):
    key: str
    cached: bool
    strategy: str
    timestamp: str

class PerformanceStatsResponse(BaseModel):
    total_endpoints: int
    total_requests: int
    average_response_time: float
    cache_hit_rate: float
    rate_limit_rate: float
    endpoints: Dict[str, Any]

class CacheStatsResponse(BaseModel):
    total_entries: int
    total_size_mb: float
    max_size_mb: float
    hit_rate: float
    most_accessed: List[Dict[str, Any]]

class ResourceUsageResponse(BaseModel):
    timestamp: str
    cpu_percent: float
    memory_mb: int
    active_connections: int
    cache_size_mb: float
    active_rate_limits: int
    total_requests: int
    cached_requests: int

class SystemHealthResponse(BaseModel):
    status: str
    timestamp: str
    rate_limiting: str
    caching: str
    performance: str
    resources: str
    recommendations: List[str]

@router.post("/rate-limit/check", response_model=RateLimitResponse)
async def check_rate_limit_endpoint(request: RateLimitCheckRequest):
    """
    Check if a request should be rate limited.
    
    This endpoint helps clients understand current rate limit status.
    """
    try:
        logger.info(f"Rate limit check request for {request.identifier} ({request.limit_type})")
        
        # Validate limit type
        try:
            limit_type = RateLimitType(request.limit_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid limit type: {request.limit_type}. Must be one of: {[lt.value for lt in RateLimitType]}"
            )
        
        # Check rate limit
        limited, details = check_rate_limit(request.identifier, limit_type, request.user_role)
        
        response = {
            "limited": limited,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if limited:
            logger.warning(f"Rate limit exceeded for {request.identifier}: {details.get('reason', 'Unknown')}")
        else:
            logger.info(f"Rate limit check passed for {request.identifier}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking rate limit: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check rate limit: {str(e)}")

@router.post("/cache/set", response_model=CacheResponse)
async def set_cache_endpoint(request: CacheRequest):
    """
    Set data in the cache with specified strategy.
    
    Cache strategies:
    - short_term: 5 minutes
    - medium_term: 1 hour (default)
    - long_term: 24 hours
    - permanent: Until manually invalidated
    """
    try:
        logger.info(f"Cache set request for key: {request.key}")
        
        # Validate cache strategy
        try:
            strategy = CacheStrategy(request.strategy)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid cache strategy: {request.strategy}. Must be one of: {[cs.value for cs in CacheStrategy]}"
            )
        
        # Set cache
        success = set_cache(request.key, request.data, strategy)
        
        if success:
            response = {
                "key": request.key,
                "cached": True,
                "strategy": request.strategy,
                "timestamp": datetime.utcnow().isoformat()
            }
            logger.info(f"Successfully cached data for key: {request.key}")
        else:
            response = {
                "key": request.key,
                "cached": False,
                "strategy": request.strategy,
                "timestamp": datetime.utcnow().isoformat()
            }
            logger.warning(f"Failed to cache data for key: {request.key}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting cache: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to set cache: {str(e)}")

@router.get("/cache/get/{key}")
async def get_cache_endpoint(key: str):
    """
    Get data from cache by key.
    
    Returns cached data if available and not expired.
    """
    try:
        logger.info(f"Cache get request for key: {key}")
        
        data = get_cache(key)
        
        if data is not None:
            logger.info(f"Cache hit for key: {key}")
            return {
                "key": key,
                "cached": True,
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            logger.info(f"Cache miss for key: {key}")
            return {
                "key": key,
                "cached": False,
                "data": None,
                "timestamp": datetime.utcnow().isoformat()
            }
        
    except Exception as e:
        logger.error(f"Error getting cache: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get cache: {str(e)}")

@router.delete("/cache/invalidate/{key}")
async def invalidate_cache_endpoint(key: str):
    """
    Invalidate a specific cache entry.
    """
    try:
        logger.info(f"Cache invalidation request for key: {key}")
        
        success = cache_manager.invalidate(key)
        
        if success:
            logger.info(f"Successfully invalidated cache key: {key}")
            return {"message": f"Cache key {key} invalidated successfully"}
        else:
            logger.warning(f"Cache key {key} not found for invalidation")
            return {"message": f"Cache key {key} not found"}
        
    except Exception as e:
        logger.error(f"Error invalidating cache: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to invalidate cache: {str(e)}")

@router.post("/cache/invalidate-pattern")
async def invalidate_cache_pattern_endpoint(request: CacheInvalidateRequest):
    """
    Invalidate cache entries matching a pattern.
    
    Useful for bulk cache invalidation.
    """
    try:
        logger.info(f"Cache pattern invalidation request for pattern: {request.pattern}")
        
        count = cache_manager.invalidate_pattern(request.pattern)
        
        logger.info(f"Invalidated {count} cache entries matching pattern: {request.pattern}")
        return {
            "message": f"Invalidated {count} cache entries",
            "pattern": request.pattern,
            "count": count
        }
        
    except Exception as e:
        logger.error(f"Error invalidating cache pattern: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to invalidate cache pattern: {str(e)}")

@router.get("/cache/stats", response_model=CacheStatsResponse)
async def get_cache_stats_endpoint():
    """
    Get comprehensive cache statistics.
    
    Includes hit rates, size information, and access patterns.
    """
    try:
        logger.info("Cache statistics request")
        
        stats = get_cache_stats()
        
        logger.info(f"Cache stats retrieved: {stats['total_entries']} entries, {stats['total_size_mb']:.2f} MB")
        return stats
        
    except Exception as e:
        logger.error(f"Error getting cache stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get cache stats: {str(e)}")

@router.get("/performance/stats", response_model=PerformanceStatsResponse)
async def get_performance_stats_endpoint(endpoint: Optional[str] = Query(None, description="Specific endpoint to get stats for")):
    """
    Get performance statistics for all endpoints or a specific endpoint.
    
    Includes response times, cache hit rates, and rate limiting statistics.
    """
    try:
        logger.info(f"Performance stats request for endpoint: {endpoint or 'all'}")
        
        stats = get_performance_stats(endpoint)
        
        logger.info(f"Performance stats retrieved: {stats['total_requests']} total requests")
        return stats
        
    except Exception as e:
        logger.error(f"Error getting performance stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance stats: {str(e)}")

@router.post("/performance/slow-endpoints")
async def get_slow_endpoints_endpoint(request: PerformanceThresholdRequest):
    """
    Get endpoints with response times above the specified threshold.
    
    Useful for identifying performance bottlenecks.
    """
    try:
        logger.info(f"Slow endpoints request with threshold: {request.threshold_ms}ms")
        
        slow_endpoints = get_slow_endpoints(request.threshold_ms)
        
        logger.info(f"Found {len(slow_endpoints)} slow endpoints above {request.threshold_ms}ms threshold")
        return {
            "threshold_ms": request.threshold_ms,
            "slow_endpoints": slow_endpoints,
            "count": len(slow_endpoints)
        }
        
    except Exception as e:
        logger.error(f"Error getting slow endpoints: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get slow endpoints: {str(e)}")

@router.get("/resources/usage", response_model=ResourceUsageResponse)
async def get_resource_usage_endpoint():
    """
    Get current system resource usage.
    
    Includes CPU, memory, connections, and cache information.
    """
    try:
        logger.info("Resource usage request")
        
        usage = get_resource_usage()
        
        if usage:
            logger.info(f"Resource usage retrieved: CPU {usage.cpu_percent}%, Memory {usage.memory_mb} MB")
            return asdict(usage)
        else:
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "cpu_percent": 0.0,
                "memory_mb": 0,
                "active_connections": 0,
                "cache_size_mb": 0.0,
                "active_rate_limits": 0,
                "total_requests": 0,
                "cached_requests": 0
            }
        
    except Exception as e:
        logger.error(f"Error getting resource usage: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get resource usage: {str(e)}")

@router.get("/system/health", response_model=SystemHealthResponse)
async def get_system_health_endpoint():
    """
    Get overall system health and optimization status.
    
    Provides health indicators and optimization recommendations.
    """
    try:
        logger.info("System health request")
        
        # Get various system metrics
        cache_stats = get_cache_stats()
        performance_stats = get_performance_stats()
        resource_usage = get_resource_usage()
        
        # Determine system health
        health_indicators = {
            "rate_limiting": "healthy" if len(rate_limiter.blocked_users) < 10 else "warning",
            "caching": "healthy" if cache_stats["hit_rate"] > 50 else "warning",
            "performance": "healthy" if performance_stats["average_response_time"] < 500 else "warning",
            "resources": "healthy" if resource_usage and resource_usage.cpu_percent < 80 else "warning"
        }
        
        # Generate recommendations
        recommendations = []
        if cache_stats["hit_rate"] < 50:
            recommendations.append("Consider increasing cache size or improving cache strategies")
        if performance_stats["average_response_time"] > 500:
            recommendations.append("Investigate slow endpoints and optimize database queries")
        if resource_usage and resource_usage.cpu_percent > 80:
            recommendations.append("System under high load, consider scaling or optimization")
        
        response = {
            "status": "healthy" if all(v == "healthy" for v in health_indicators.values()) else "warning",
            "timestamp": datetime.utcnow().isoformat(),
            "rate_limiting": health_indicators["rate_limiting"],
            "caching": health_indicators["caching"],
            "performance": health_indicators["performance"],
            "resources": health_indicators["resources"],
            "recommendations": recommendations
        }
        
        logger.info(f"System health: {response['status']}")
        return response
        
    except Exception as e:
        logger.error(f"Error getting system health: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get system health: {str(e)}")

@router.post("/rate-limit/config")
async def update_rate_limit_config_endpoint(request: RateLimitConfigRequest):
    """
    Update rate limit configuration.
    
    Allows dynamic adjustment of rate limiting parameters.
    """
    try:
        logger.info(f"Rate limit config update request for {request.limit_type}")
        
        # Validate limit type
        try:
            limit_type = RateLimitType(request.limit_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid limit type: {request.limit_type}"
            )
        
        # Update configuration
        if limit_type == RateLimitType.USER_BASED:
            rate_limiter.default_configs[limit_type] = type(rate_limiter.default_configs[limit_type])(
                requests_per_minute=request.requests_per_minute,
                requests_per_hour=request.requests_per_hour,
                burst_limit=request.burst_limit,
                cooldown_period=request.cooldown_period
            )
        elif limit_type == RateLimitType.ROLE_BASED:
            # Update role-specific configs
            for role in rate_limiter.role_limits_config:
                rate_limiter.role_limits_config[role] = type(rate_limiter.role_limits_config[role])(
                    requests_per_minute=request.requests_per_minute,
                    requests_per_hour=request.requests_per_hour,
                    burst_limit=request.burst_limit,
                    cooldown_period=request.cooldown_period
                )
        
        logger.info(f"Successfully updated rate limit config for {request.limit_type}")
        return {
            "message": f"Rate limit configuration updated for {request.limit_type}",
            "config": {
                "requests_per_minute": request.requests_per_minute,
                "requests_per_hour": request.requests_per_hour,
                "burst_limit": request.burst_limit,
                "cooldown_period": request.cooldown_period
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating rate limit config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update rate limit config: {str(e)}")

@router.post("/cache/clear")
async def clear_cache_endpoint():
    """
    Clear all cache entries.
    
    Use with caution - this will remove all cached data.
    """
    try:
        logger.warning("Cache clear request received")
        
        count = cache_manager.clear()
        
        logger.info(f"Successfully cleared {count} cache entries")
        return {
            "message": f"Cache cleared successfully",
            "entries_cleared": count
        }
        
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")

@router.get("/optimization/recommendations")
async def get_optimization_recommendations_endpoint():
    """
    Get system optimization recommendations.
    
    Analyzes current system state and provides actionable recommendations.
    """
    try:
        logger.info("Optimization recommendations request")
        
        recommendations = []
        
        # Analyze cache performance
        cache_stats = get_cache_stats()
        if cache_stats["hit_rate"] < 30:
            recommendations.append({
                "category": "caching",
                "priority": "high",
                "title": "Low Cache Hit Rate",
                "description": f"Current hit rate is {cache_stats['hit_rate']:.1f}%. Consider increasing cache size or improving cache strategies.",
                "action": "Review cache strategies and increase cache size if needed"
            })
        
        # Analyze performance
        performance_stats = get_performance_stats()
        if performance_stats["average_response_time"] > 1000:
            recommendations.append({
                "category": "performance",
                "priority": "high",
                "title": "High Response Times",
                "description": f"Average response time is {performance_stats['average_response_time']:.1f}ms. Investigate slow endpoints.",
                "action": "Identify and optimize slow endpoints"
            })
        
        # Analyze rate limiting
        if len(rate_limiter.blocked_users) > 20:
            recommendations.append({
                "category": "rate_limiting",
                "priority": "medium",
                "title": "High Rate Limiting",
                "description": f"{len(rate_limiter.blocked_users)} users are currently rate limited. Consider adjusting limits.",
                "action": "Review and adjust rate limiting policies"
            })
        
        # Analyze resource usage
        resource_usage = get_resource_usage()
        if resource_usage and resource_usage.cpu_percent > 70:
            recommendations.append({
                "category": "resources",
                "priority": "medium",
                "title": "High CPU Usage",
                "description": f"CPU usage is {resource_usage.cpu_percent:.1f}%. Consider optimization or scaling.",
                "action": "Optimize database queries and consider horizontal scaling"
            })
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "total_recommendations": len(recommendations),
            "recommendations": recommendations
        }
        
    except Exception as e:
        logger.error(f"Error getting optimization recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get optimization recommendations: {str(e)}")

# Note: Exception handlers should be registered on the FastAPI app, not APIRouter
