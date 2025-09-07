#!/usr/bin/env python3
"""
API Rate Limiting & Optimization System - Phase 5.3
Provides rate limiting, caching, performance monitoring, and resource optimization.
"""

import time
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
import asyncio
import functools

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RateLimitType(Enum):
    """Types of rate limiting"""
    USER_BASED = "user_based"           # Per-user limits
    ROLE_BASED = "role_based"           # Per-role limits
    ENDPOINT_BASED = "endpoint_based"   # Per-endpoint limits
    GLOBAL = "global"                   # Global system limits

class CacheStrategy(Enum):
    """Cache strategies for different data types"""
    NONE = "none"                       # No caching
    SHORT_TERM = "short_term"           # 5 minutes
    MEDIUM_TERM = "medium_term"         # 1 hour
    LONG_TERM = "long_term"             # 24 hours
    PERMANENT = "permanent"             # Until manually invalidated

@dataclass
class RateLimitConfig:
    """Configuration for rate limiting"""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    burst_limit: int = 10
    window_size: int = 60  # seconds
    cooldown_period: int = 300  # seconds after limit exceeded

@dataclass
class CacheEntry:
    """Cache entry with metadata"""
    key: str
    data: Any
    created_at: datetime
    expires_at: datetime
    access_count: int = 0
    last_accessed: datetime = None
    size_bytes: int = 0
    
    def __post_init__(self):
        if self.last_accessed is None:
            self.last_accessed = self.created_at

@dataclass
class PerformanceMetric:
    """Performance metric for monitoring"""
    endpoint: str
    method: str
    response_time_ms: float
    timestamp: datetime
    user_id: Optional[str] = None
    status_code: int = 200
    cache_hit: bool = False
    rate_limited: bool = False

@dataclass
class ResourceUsage:
    """System resource usage metrics"""
    timestamp: datetime
    cpu_percent: float
    memory_mb: int
    active_connections: int
    cache_size_mb: float
    active_rate_limits: int
    total_requests: int
    cached_requests: int

class RateLimiter:
    """Advanced rate limiting with multiple strategies"""
    
    def __init__(self):
        self.user_limits: Dict[str, Dict[str, deque]] = defaultdict(lambda: defaultdict(deque))
        self.role_limits: Dict[str, Dict[str, deque]] = defaultdict(lambda: defaultdict(deque))
        self.endpoint_limits: Dict[str, deque] = defaultdict(deque)
        self.global_limits: Dict[str, deque] = defaultdict(deque)
        self.blocked_users: Dict[str, datetime] = {}
        self.blocked_roles: Dict[str, datetime] = {}
        
        # Default rate limit configurations
        self.default_configs = {
            RateLimitType.USER_BASED: RateLimitConfig(60, 1000, 10, 60, 300),
            RateLimitType.ROLE_BASED: RateLimitConfig(120, 2000, 20, 60, 300),
            RateLimitType.ENDPOINT_BASED: RateLimitConfig(100, 5000, 50, 60, 300),
            RateLimitType.GLOBAL: RateLimitConfig(1000, 50000, 200, 60, 600)
        }
        
        # Role-specific rate limits
        self.role_limits_config = {
            "student": RateLimitConfig(30, 500, 5, 60, 300),
            "staff": RateLimitConfig(100, 2000, 15, 60, 300),
            "manager": RateLimitConfig(200, 5000, 25, 60, 300),
            "admin": RateLimitConfig(500, 10000, 50, 60, 300),
            "super_admin": RateLimitConfig(1000, 20000, 100, 60, 300)
        }
    
    def is_rate_limited(self, identifier: str, limit_type: RateLimitType, 
                       user_role: str = None) -> Tuple[bool, Dict[str, Any]]:
        """Check if request should be rate limited"""
        current_time = time.time()
        
        # Check if user/role is blocked
        if limit_type == RateLimitType.USER_BASED and identifier in self.blocked_users:
            if current_time < self.blocked_users[identifier].timestamp():
                return True, {
                    "blocked": True,
                    "reason": "Rate limit exceeded",
                    "retry_after": int(self.blocked_users[identifier].timestamp() - current_time)
                }
            else:
                del self.blocked_users[identifier]
        
        if limit_type == RateLimitType.ROLE_BASED and user_role and user_role in self.blocked_roles:
            if current_time < self.blocked_roles[user_role].timestamp():
                return True, {
                    "blocked": True,
                    "reason": "Role rate limit exceeded",
                    "retry_after": int(self.blocked_roles[user_role].timestamp() - current_time)
                }
            else:
                del self.blocked_roles[user_role]
        
        # Get appropriate configuration
        if limit_type == RateLimitType.ROLE_BASED and user_role:
            config = self.role_limits_config.get(user_role, self.default_configs[limit_type])
        else:
            config = self.default_configs[limit_type]
        
        # Get request history
        if limit_type == RateLimitType.USER_BASED:
            history = self.user_limits[identifier]
        elif limit_type == RateLimitType.ROLE_BASED:
            history = self.role_limits[user_role]
        elif limit_type == RateLimitType.ENDPOINT_BASED:
            history = self.endpoint_limits
        else:  # GLOBAL
            history = self.global_limits
        
        # Clean old entries
        cutoff_time = current_time - config.window_size
        for key in list(history.keys()):
            while history[key] and history[key][0] < cutoff_time:
                history[key].popleft()
        
        # Check limits
        minute_requests = len([t for t in history.get("minute", []) if t > current_time - 60])
        hour_requests = len([t for t in history.get("hour", []) if t > current_time - 3600])
        
        # Check burst limit
        recent_requests = len([t for t in history.get("minute", []) if t > current_time - 10])
        
        limited = False
        reason = None
        
        if minute_requests >= config.requests_per_minute:
            limited = True
            reason = "Minute limit exceeded"
        elif hour_requests >= config.requests_per_hour:
            limited = True
            reason = "Hour limit exceeded"
        elif recent_requests >= config.burst_limit:
            limited = True
            reason = "Burst limit exceeded"
        
        if limited:
            # Add to blocked list
            if limit_type == RateLimitType.USER_BASED:
                self.blocked_users[identifier] = datetime.fromtimestamp(current_time + config.cooldown_period)
            elif limit_type == RateLimitType.ROLE_BASED and user_role:
                self.blocked_roles[user_role] = datetime.fromtimestamp(current_time + config.cooldown_period)
            
            return True, {
                "blocked": False,
                "reason": reason,
                "retry_after": config.cooldown_period,
                "limits": {
                    "minute": minute_requests,
                    "hour": hour_requests,
                    "burst": recent_requests
                }
            }
        
        # Record request
        if "minute" not in history:
            history["minute"] = deque()
        if "hour" not in history:
            history["hour"] = deque()
        
        history["minute"].append(current_time)
        history["hour"].append(current_time)
        
        return False, {
            "blocked": False,
            "limits": {
                "minute": minute_requests + 1,
                "hour": hour_requests + 1,
                "burst": recent_requests + 1
            }
        }

class CacheManager:
    """Intelligent caching system with multiple strategies"""
    
    def __init__(self, max_size_mb: float = 100.0):
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.cache: Dict[str, CacheEntry] = {}
        self.access_patterns: Dict[str, int] = defaultdict(int)
        self.strategy_durations = {
            CacheStrategy.SHORT_TERM: 300,    # 5 minutes
            CacheStrategy.MEDIUM_TERM: 3600,  # 1 hour
            CacheStrategy.LONG_TERM: 86400,   # 24 hours
            CacheStrategy.PERMANENT: None     # No expiration
        }
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key not in self.cache:
            return None
        
        entry = self.cache[key]
        current_time = datetime.utcnow()
        
        # Check expiration
        if entry.expires_at and current_time > entry.expires_at:
            del self.cache[key]
            return None
        
        # Update access statistics
        entry.access_count += 1
        entry.last_accessed = current_time
        self.access_patterns[key] += 1
        
        return entry.data
    
    def set(self, key: str, data: Any, strategy: CacheStrategy = CacheStrategy.MEDIUM_TERM) -> bool:
        """Set value in cache"""
        current_time = datetime.utcnow()
        
        # Calculate expiration
        if strategy == CacheStrategy.PERMANENT:
            expires_at = None
        else:
            duration = self.strategy_durations[strategy]
            expires_at = current_time + timedelta(seconds=duration)
        
        # Estimate data size
        try:
            size_bytes = len(json.dumps(data, default=str).encode('utf-8'))
        except:
            size_bytes = 1024  # Default estimate
        
        # Check if we need to evict entries
        self._ensure_capacity(size_bytes)
        
        # Create cache entry
        entry = CacheEntry(
            key=key,
            data=data,
            created_at=current_time,
            expires_at=expires_at,
            size_bytes=size_bytes
        )
        
        self.cache[key] = entry
        return True
    
    def invalidate(self, key: str) -> bool:
        """Invalidate a specific cache entry"""
        if key in self.cache:
            del self.cache[key]
            return True
        return False
    
    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching a pattern"""
        count = 0
        for key in list(self.cache.keys()):
            if pattern in key:
                del self.cache[key]
                count += 1
        return count
    
    def clear(self) -> int:
        """Clear all cache entries"""
        count = len(self.cache)
        self.cache.clear()
        return count
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        current_time = datetime.utcnow()
        total_size = sum(entry.size_bytes for entry in self.cache.values())
        expired_entries = sum(1 for entry in self.cache.values() 
                            if entry.expires_at and current_time > entry.expires_at)
        
        return {
            "total_entries": len(self.cache),
            "total_size_mb": total_size / (1024 * 1024),
            "max_size_mb": self.max_size_bytes / (1024 * 1024),
            "expired_entries": expired_entries,
            "hit_rate": self._calculate_hit_rate(),
            "most_accessed": sorted(self.access_patterns.items(), key=lambda x: x[1], reverse=True)[:5]
        }
    
    def _ensure_capacity(self, required_bytes: int):
        """Ensure cache has capacity for new entry"""
        current_size = sum(entry.size_bytes for entry in self.cache.values())
        
        if current_size + required_bytes <= self.max_size_bytes:
            return
        
        # Evict least recently used entries
        entries = sorted(self.cache.values(), key=lambda x: x.last_accessed)
        
        for entry in entries:
            if current_size + required_bytes <= self.max_size_bytes:
                break
            
            del self.cache[entry.key]
            current_size -= entry.size_bytes
    
    def _calculate_hit_rate(self) -> float:
        """Calculate cache hit rate"""
        total_accesses = sum(self.access_patterns.values())
        if total_accesses == 0:
            return 0.0
        
        cache_hits = sum(1 for entry in self.cache.values() if entry.access_count > 0)
        return (cache_hits / total_accesses) * 100 if total_accesses > 0 else 0.0

class PerformanceMonitor:
    """Performance monitoring and metrics collection"""
    
    def __init__(self):
        self.metrics: List[PerformanceMetric] = []
        self.endpoint_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            "total_requests": 0,
            "total_response_time": 0.0,
            "min_response_time": float('inf'),
            "max_response_time": 0.0,
            "cache_hits": 0,
            "rate_limited": 0,
            "status_codes": defaultdict(int)
        })
        self.max_metrics = 10000
    
    def record_request(self, endpoint: str, method: str, response_time_ms: float,
                      user_id: Optional[str] = None, status_code: int = 200,
                      cache_hit: bool = False, rate_limited: bool = False):
        """Record a request metric"""
        metric = PerformanceMetric(
            endpoint=endpoint,
            method=method,
            response_time_ms=response_time_ms,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            status_code=status_code,
            cache_hit=cache_hit,
            rate_limited=rate_limited
        )
        
        self.metrics.append(metric)
        
        # Update endpoint statistics
        stats = self.endpoint_stats[endpoint]
        stats["total_requests"] += 1
        stats["total_response_time"] += response_time_ms
        stats["min_response_time"] = min(stats["min_response_time"], response_time_ms)
        stats["max_response_time"] = max(stats["max_response_time"], response_time_ms)
        stats["cache_hits"] += 1 if cache_hit else 0
        stats["rate_limited"] += 1 if rate_limited else 0
        stats["status_codes"][status_code] += 1
        
        # Limit metrics storage
        if len(self.metrics) > self.max_metrics:
            self.metrics = self.metrics[-self.max_metrics:]
    
    def get_endpoint_stats(self, endpoint: str = None) -> Dict[str, Any]:
        """Get performance statistics for endpoints"""
        if endpoint:
            return dict(self.endpoint_stats[endpoint])
        
        # Aggregate stats
        total_requests = sum(stats["total_requests"] for stats in self.endpoint_stats.values())
        total_response_time = sum(stats["total_response_time"] for stats in self.endpoint_stats.values())
        total_cache_hits = sum(stats["cache_hits"] for stats in self.endpoint_stats.values())
        total_rate_limited = sum(stats["rate_limited"] for stats in self.endpoint_stats.values())
        
        return {
            "total_endpoints": len(self.endpoint_stats),
            "total_requests": total_requests,
            "average_response_time": total_response_time / total_requests if total_requests > 0 else 0,
            "cache_hit_rate": (total_cache_hits / total_requests * 100) if total_requests > 0 else 0,
            "rate_limit_rate": (total_rate_limited / total_requests * 100) if total_requests > 0 else 0,
            "endpoints": {ep: dict(stats) for ep, stats in self.endpoint_stats.items()}
        }
    
    def get_slow_endpoints(self, threshold_ms: float = 1000.0) -> List[Dict[str, Any]]:
        """Get endpoints with response times above threshold"""
        slow_endpoints = []
        
        for endpoint, stats in self.endpoint_stats.items():
            if stats["max_response_time"] > threshold_ms:
                slow_endpoints.append({
                    "endpoint": endpoint,
                    "max_response_time": stats["max_response_time"],
                    "average_response_time": stats["total_response_time"] / stats["total_requests"],
                    "total_requests": stats["total_requests"]
                })
        
        return sorted(slow_endpoints, key=lambda x: x["max_response_time"], reverse=True)

class ResourceMonitor:
    """System resource monitoring"""
    
    def __init__(self):
        self.resource_history: List[ResourceUsage] = []
        self.max_history = 1000
    
    def record_usage(self, cpu_percent: float, memory_mb: int, active_connections: int,
                    cache_size_mb: float, active_rate_limits: int, total_requests: int,
                    cached_requests: int):
        """Record current resource usage"""
        usage = ResourceUsage(
            timestamp=datetime.utcnow(),
            cpu_percent=cpu_percent,
            memory_mb=memory_mb,
            active_connections=active_connections,
            cache_size_mb=cache_size_mb,
            active_rate_limits=active_rate_limits,
            total_requests=total_requests,
            cached_requests=cached_requests
        )
        
        self.resource_history.append(usage)
        
        # Limit history storage
        if len(self.resource_history) > self.max_history:
            self.resource_history = self.resource_history[-self.max_history:]
    
    def get_current_usage(self) -> Optional[ResourceUsage]:
        """Get most recent resource usage"""
        return self.resource_history[-1] if self.resource_history else None
    
    def get_usage_trend(self, hours: int = 24) -> List[ResourceUsage]:
        """Get resource usage trend over specified hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        return [usage for usage in self.resource_history if usage.timestamp > cutoff_time]

# Global instances
rate_limiter = RateLimiter()
cache_manager = CacheManager()
performance_monitor = PerformanceMonitor()
resource_monitor = ResourceMonitor()

# Decorator for rate limiting
def rate_limit(limit_type: RateLimitType, identifier_key: str = "username"):
    """Decorator to apply rate limiting to endpoints"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract identifier based on limit type
            identifier = None
            if limit_type == RateLimitType.USER_BASED:
                identifier = kwargs.get(identifier_key, "anonymous")
            elif limit_type == RateLimitType.ROLE_BASED:
                # This would need to be implemented based on your user system
                identifier = "default_role"
            elif limit_type == RateLimitType.ENDPOINT_BASED:
                identifier = func.__name__
            else:  # GLOBAL
                identifier = "global"
            
            # Check rate limit
            limited, details = rate_limiter.is_rate_limited(identifier, limit_type)
            
            if limited:
                return {
                    "error": "Rate limit exceeded",
                    "details": details,
                    "retry_after": details.get("retry_after", 60)
                }
            
            # Execute function
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                response_time = (time.time() - start_time) * 1000
                
                # Record performance metric
                performance_monitor.record_request(
                    endpoint=func.__name__,
                    method="POST",  # Would need to be extracted from request
                    response_time_ms=response_time,
                    user_id=identifier if limit_type == RateLimitType.USER_BASED else None
                )
                
                return result
            except Exception as e:
                response_time = (time.time() - start_time) * 1000
                performance_monitor.record_request(
                    endpoint=func.__name__,
                    method="POST",
                    response_time_ms=response_time,
                    user_id=identifier if limit_type == RateLimitType.USER_BASED else None,
                    status_code=500
                )
                raise
        
        return wrapper
    return decorator

# Convenience functions
def check_rate_limit(identifier: str, limit_type: RateLimitType, user_role: str = None) -> Tuple[bool, Dict[str, Any]]:
    """Check rate limit for an identifier"""
    return rate_limiter.is_rate_limited(identifier, limit_type, user_role)

def get_cache(key: str) -> Optional[Any]:
    """Get value from cache"""
    return cache_manager.get(key)

def set_cache(key: str, data: Any, strategy: CacheStrategy = CacheStrategy.MEDIUM_TERM) -> bool:
    """Set value in cache"""
    return cache_manager.set(key, data, strategy)

def get_performance_stats(endpoint: str = None) -> Dict[str, Any]:
    """Get performance statistics"""
    return performance_monitor.get_endpoint_stats(endpoint)

def get_slow_endpoints(threshold_ms: float = 1000.0) -> List[Dict[str, Any]]:
    """Get slow endpoints"""
    return performance_monitor.get_slow_endpoints(threshold_ms)

def get_cache_stats() -> Dict[str, Any]:
    """Get cache statistics"""
    return cache_manager.get_stats()

def get_resource_usage() -> Optional[ResourceUsage]:
    """Get current resource usage"""
    return resource_monitor.get_current_usage()
