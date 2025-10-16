#!/usr/bin/env python3
"""
Production Performance Monitoring System
Tracks latency, throughput, and SLA metrics for investor claims verification
"""

import time
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import statistics
import json
import psutil
import requests
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetric:
    """Detailed performance metric"""
    timestamp: datetime
    endpoint: str
    method: str
    response_time_ms: float
    status_code: int
    user_id: Optional[str] = None
    cache_hit: bool = False
    error: Optional[str] = None
    memory_usage_mb: float = 0
    cpu_percent: float = 0

@dataclass
class SLAThresholds:
    """SLA threshold definitions"""
    prediction_latency_ms: int = 200
    rag_response_ms: int = 3000
    uptime_percentage: float = 99.5
    error_rate_percentage: float = 0.5

class PerformanceMonitor:
    """Production-grade performance monitoring"""
    
    def __init__(self, thresholds: SLAThresholds = None):
        self.thresholds = thresholds or SLAThresholds()
        self.metrics: deque = deque(maxlen=10000)  # Keep last 10k metrics
        self.uptime_start = datetime.utcnow()
        self.downtime_events: List[Dict] = []
        self.sla_violations: List[Dict] = []
        
        # Real-time tracking
        self.current_requests = 0
        self.total_requests = 0
        self.total_errors = 0
        
    def record_request(self, 
                      endpoint: str, 
                      method: str, 
                      response_time_ms: float,
                      status_code: int = 200,
                      user_id: str = None,
                      cache_hit: bool = False,
                      error: str = None):
        """Record a request metric"""
        
        # Get system resources
        memory = psutil.virtual_memory()
        cpu = psutil.cpu_percent()
        
        metric = PerformanceMetric(
            timestamp=datetime.utcnow(),
            endpoint=endpoint,
            method=method,
            response_time_ms=response_time_ms,
            status_code=status_code,
            user_id=user_id,
            cache_hit=cache_hit,
            error=error,
            memory_usage_mb=memory.used / 1024 / 1024,
            cpu_percent=cpu
        )
        
        self.metrics.append(metric)
        self.total_requests += 1
        
        if status_code >= 400 or error:
            self.total_errors += 1
            
        # Check SLA violations
        self._check_sla_violations(metric)
        
    def _check_sla_violations(self, metric: PerformanceMetric):
        """Check if metric violates SLA thresholds"""
        
        # Prediction latency check
        if "prediction" in metric.endpoint.lower() or "ml" in metric.endpoint.lower():
            if metric.response_time_ms > self.thresholds.prediction_latency_ms:
                self.sla_violations.append({
                    "type": "prediction_latency",
                    "timestamp": metric.timestamp,
                    "endpoint": metric.endpoint,
                    "actual_ms": metric.response_time_ms,
                    "threshold_ms": self.thresholds.prediction_latency_ms,
                    "violation_ms": metric.response_time_ms - self.thresholds.prediction_latency_ms
                })
                
        # RAG response check
        if "rag" in metric.endpoint.lower() or "query" in metric.endpoint.lower():
            if metric.response_time_ms > self.thresholds.rag_response_ms:
                self.sla_violations.append({
                    "type": "rag_response_latency",
                    "timestamp": metric.timestamp,
                    "endpoint": metric.endpoint,
                    "actual_ms": metric.response_time_ms,
                    "threshold_ms": self.thresholds.rag_response_ms,
                    "violation_ms": metric.response_time_ms - self.thresholds.rag_response_ms
                })
                
        # Error rate check
        if metric.status_code >= 400 or metric.error:
            error_rate = (self.total_errors / self.total_requests) * 100
            if error_rate > self.thresholds.error_rate_percentage:
                self.sla_violations.append({
                    "type": "error_rate",
                    "timestamp": metric.timestamp,
                    "error_rate": error_rate,
                    "threshold": self.thresholds.error_rate_percentage
                })
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary"""
        
        if not self.metrics:
            return {"status": "no_data"}
            
        # Calculate uptime
        uptime_duration = datetime.utcnow() - self.uptime_start
        total_downtime = sum(event["duration_seconds"] for event in self.downtime_events)
        uptime_percentage = ((uptime_duration.total_seconds() - total_downtime) / uptime_duration.total_seconds()) * 100
        
        # Response time statistics
        response_times = [m.response_time_ms for m in self.metrics]
        
        # Endpoint breakdown
        endpoint_stats = defaultdict(list)
        for metric in self.metrics:
            endpoint_stats[metric.endpoint].append(metric.response_time_ms)
            
        endpoint_summaries = {}
        for endpoint, times in endpoint_stats.items():
            endpoint_summaries[endpoint] = {
                "count": len(times),
                "avg_ms": statistics.mean(times),
                "p95_ms": statistics.quantiles(times, n=20)[18] if len(times) > 20 else max(times),
                "p99_ms": statistics.quantiles(times, n=100)[98] if len(times) > 100 else max(times),
                "max_ms": max(times),
                "min_ms": min(times)
            }
        
        # SLA compliance
        prediction_metrics = [m for m in self.metrics if "prediction" in m.endpoint.lower() or "ml" in m.endpoint.lower()]
        rag_metrics = [m for m in self.metrics if "rag" in m.endpoint.lower() or "query" in m.endpoint.lower()]
        
        prediction_compliance = 0
        if prediction_metrics:
            compliant_predictions = sum(1 for m in prediction_metrics if m.response_time_ms <= self.thresholds.prediction_latency_ms)
            prediction_compliance = (compliant_predictions / len(prediction_metrics)) * 100
            
        rag_compliance = 0
        if rag_metrics:
            compliant_rag = sum(1 for m in rag_metrics if m.response_time_ms <= self.thresholds.rag_response_ms)
            rag_compliance = (compliant_rag / len(rag_metrics)) * 100
        
        return {
            "uptime_percentage": round(uptime_percentage, 2),
            "total_requests": self.total_requests,
            "total_errors": self.total_errors,
            "error_rate_percentage": round((self.total_errors / self.total_requests) * 100, 2) if self.total_requests > 0 else 0,
            "response_times": {
                "avg_ms": round(statistics.mean(response_times), 2),
                "p95_ms": round(statistics.quantiles(response_times, n=20)[18], 2) if len(response_times) > 20 else max(response_times),
                "p99_ms": round(statistics.quantiles(response_times, n=100)[98], 2) if len(response_times) > 100 else max(response_times),
                "max_ms": max(response_times),
                "min_ms": min(response_times)
            },
            "sla_compliance": {
                "prediction_latency": {
                    "threshold_ms": self.thresholds.prediction_latency_ms,
                    "compliance_percentage": round(prediction_compliance, 2),
                    "sample_size": len(prediction_metrics)
                },
                "rag_response": {
                    "threshold_ms": self.thresholds.rag_response_ms,
                    "compliance_percentage": round(rag_compliance, 2),
                    "sample_size": len(rag_metrics)
                },
                "uptime": {
                    "threshold_percentage": self.thresholds.uptime_percentage,
                    "actual_percentage": round(uptime_percentage, 2),
                    "compliant": uptime_percentage >= self.thresholds.uptime_percentage
                }
            },
            "endpoint_breakdown": endpoint_summaries,
            "sla_violations": len(self.sla_violations),
            "recent_violations": self.sla_violations[-10:],  # Last 10 violations
            "system_resources": {
                "memory_usage_mb": round(psutil.virtual_memory().used / 1024 / 1024, 2),
                "cpu_percent": psutil.cpu_percent(),
                "disk_usage_percent": psutil.disk_usage('/').percent
            }
        }
    
    def export_metrics(self, hours: int = 24) -> List[Dict]:
        """Export metrics for external analysis"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        recent_metrics = [m for m in self.metrics if m.timestamp >= cutoff]
        return [asdict(m) for m in recent_metrics]

# Global monitor instance
performance_monitor = PerformanceMonitor()

@asynccontextmanager
async def monitor_request(endpoint: str, method: str = "GET", user_id: str = None):
    """Context manager for monitoring requests"""
    start_time = time.time()
    error = None
    
    try:
        yield
    except Exception as e:
        error = str(e)
        raise
    finally:
        response_time_ms = (time.time() - start_time) * 1000
        performance_monitor.record_request(
            endpoint=endpoint,
            method=method,
            response_time_ms=response_time_ms,
            user_id=user_id,
            error=error
        )
