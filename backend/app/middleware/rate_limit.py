"""
Rate limiting middleware for AI endpoints
"""
import time
import os
from typing import Dict, Any
from collections import defaultdict, deque
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """Token bucket rate limiter with per-user and per-org controls."""
    
    def __init__(self):
        # Auto-raise limits for test/CI environments
        base_rate = int(os.getenv("AI_RATE_LIMIT_PER_MIN", "60"))
        base_burst = int(os.getenv("AI_BURST_LIMIT", "10"))
        
        app_env = os.getenv("APP_ENV", "").lower()
        if app_env in ["test", "ci"]:
            self.rate_limit_per_min = base_rate * 10
            self.burst_limit = base_burst * 10
        else:
            self.rate_limit_per_min = base_rate
            self.burst_limit = base_burst
        
        # Per-user rate limiting (user_id -> deque of timestamps)
        self.user_requests: Dict[str, deque] = defaultdict(lambda: deque())
        
        # Per-org rate limiting (org_id -> deque of timestamps) 
        self.org_requests: Dict[str, deque] = defaultdict(lambda: deque())
        
        # Cleanup old entries every 5 minutes
        self.last_cleanup = time.time()
        self.cleanup_interval = 300  # 5 minutes
    
    def _cleanup_old_entries(self):
        """Remove old request timestamps to prevent memory leaks."""
        current_time = time.time()
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
            
        cutoff_time = current_time - 3600  # Keep only last hour
        
        # Clean user requests
        for user_id in list(self.user_requests.keys()):
            user_deque = self.user_requests[user_id]
            while user_deque and user_deque[0] < cutoff_time:
                user_deque.popleft()
            if not user_deque:
                del self.user_requests[user_id]
        
        # Clean org requests
        for org_id in list(self.org_requests.keys()):
            org_deque = self.org_requests[org_id]
            while org_deque and org_deque[0] < cutoff_time:
                org_deque.popleft()
            if not org_deque:
                del self.org_requests[org_id]
        
        self.last_cleanup = current_time
    
    def _get_user_id(self, request: Request) -> str:
        """Extract user ID from request headers or IP."""
        # Try to get user ID from headers first
        user_id = request.headers.get("X-User-ID")
        if user_id:
            return user_id
        
        # Fall back to IP address
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        return request.client.host if request.client else "unknown"
    
    def _get_org_id(self, request: Request) -> str:
        """Extract org ID from request headers."""
        return request.headers.get("X-Org-ID", "default")
    
    def _check_rate_limit(self, request: Request) -> bool:
        """Check if request should be rate limited."""
        self._cleanup_old_entries()
        
        user_id = self._get_user_id(request)
        org_id = self._get_org_id(request)
        current_time = time.time()
        
        # Check user rate limit
        user_deque = self.user_requests[user_id]
        minute_ago = current_time - 60
        
        # Remove requests older than 1 minute
        while user_deque and user_deque[0] < minute_ago:
            user_deque.popleft()
        
        # Check if user exceeded rate limit
        if len(user_deque) >= self.rate_limit_per_min:
            logger.warning(f"User {user_id} exceeded rate limit: {len(user_deque)}/{self.rate_limit_per_min}")
            return False
        
        # Check org rate limit (more lenient)
        org_deque = self.org_requests[org_id]
        while org_deque and org_deque[0] < minute_ago:
            org_deque.popleft()
        
        # Org limit is 3x user limit
        org_limit = self.rate_limit_per_min * 3
        if len(org_deque) >= org_limit:
            logger.warning(f"Org {org_id} exceeded rate limit: {len(org_deque)}/{org_limit}")
            return False
        
        # Check burst limit (last 10 seconds)
        ten_seconds_ago = current_time - 10
        recent_user_requests = sum(1 for t in user_deque if t > ten_seconds_ago)
        if recent_user_requests >= self.burst_limit:
            logger.warning(f"User {user_id} exceeded burst limit: {recent_user_requests}/{self.burst_limit}")
            return False
        
        return True
    
    def _record_request(self, request: Request):
        """Record this request for rate limiting."""
        user_id = self._get_user_id(request)
        org_id = self._get_org_id(request)
        current_time = time.time()
        
        self.user_requests[user_id].append(current_time)
        self.org_requests[org_id].append(current_time)
    
    async def __call__(self, request: Request, call_next):
        """Rate limiting middleware."""
        # Only apply to AI endpoints
        if not (request.url.path.startswith("/ai/router/v2") or 
                request.url.path.startswith("/rag/query")):
            return await call_next(request)
        
        # Check rate limit
        if not self._check_rate_limit(request):
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Limit: {self.rate_limit_per_min} per minute, {self.burst_limit} burst",
                    "retry_after": 60
                },
                headers={"Retry-After": "60"}
            )
        
        # Record request and proceed
        self._record_request(request)
        return await call_next(request)


# Global rate limiter instance
rate_limiter = RateLimiter()
