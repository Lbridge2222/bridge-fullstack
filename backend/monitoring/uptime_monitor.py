#!/usr/bin/env python3
"""
Uptime and SLA Monitoring System
Continuous monitoring for 99.5% uptime claims
"""

import asyncio
import aiohttp
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

@dataclass
class UptimeEvent:
    """Uptime monitoring event"""
    timestamp: datetime
    endpoint: str
    status: str  # "up", "down", "degraded"
    response_time_ms: float
    status_code: Optional[int] = None
    error_message: Optional[str] = None

@dataclass
class SLAStatus:
    """SLA status tracking"""
    uptime_percentage: float
    total_checks: int
    successful_checks: int
    failed_checks: int
    current_streak: int
    longest_streak: int
    last_failure: Optional[datetime] = None
    sla_breach: bool = False

class UptimeMonitor:
    """Production uptime monitoring system"""
    
    def __init__(self, 
                 base_url: str = "http://localhost:8000",
                 check_interval: int = 30,
                 sla_threshold: float = 99.5,
                 alert_email: Optional[str] = None):
        
        self.base_url = base_url
        self.check_interval = check_interval
        self.sla_threshold = sla_threshold
        self.alert_email = alert_email
        
        self.events: List[UptimeEvent] = []
        self.start_time = datetime.utcnow()
        self.is_running = False
        
        # SLA tracking
        self.sla_status = SLAStatus(
            uptime_percentage=100.0,
            total_checks=0,
            successful_checks=0,
            failed_checks=0,
            current_streak=0,
            longest_streak=0
        )
        
        # Endpoints to monitor
        self.endpoints = [
            {"name": "Health Check", "path": "/health/llm", "method": "GET"},
            {"name": "AI Router", "path": "/ai/router", "method": "POST"},
            {"name": "RAG Query", "path": "/ai/rag/query", "method": "POST"},
            {"name": "ML Prediction", "path": "/ai/advanced-ml/predict-batch", "method": "POST"},
            {"name": "Dashboard", "path": "/dashboard/metrics", "method": "GET"}
        ]
    
    async def start_monitoring(self):
        """Start continuous uptime monitoring"""
        self.is_running = True
        logger.info(f"Starting uptime monitoring for {self.base_url}")
        
        while self.is_running:
            try:
                await self._check_all_endpoints()
                await self._update_sla_status()
                await self._check_sla_breach()
                
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
            
            await asyncio.sleep(self.check_interval)
    
    async def stop_monitoring(self):
        """Stop monitoring"""
        self.is_running = False
        logger.info("Stopped uptime monitoring")
    
    async def _check_all_endpoints(self):
        """Check all configured endpoints"""
        async with aiohttp.ClientSession() as session:
            tasks = []
            for endpoint in self.endpoints:
                task = self._check_endpoint(session, endpoint)
                tasks.append(task)
            
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _check_endpoint(self, session: aiohttp.ClientSession, endpoint: Dict):
        """Check a single endpoint"""
        start_time = time.time()
        status = "down"
        response_time_ms = 0
        status_code = None
        error_message = None
        
        try:
            url = f"{self.base_url}{endpoint['path']}"
            
            # Prepare request data for POST endpoints
            data = None
            if endpoint['method'] == 'POST':
                if 'router' in endpoint['path']:
                    data = {"query": "test"}
                elif 'rag' in endpoint['path']:
                    data = {"query": "test query"}
                elif 'ml' in endpoint['path']:
                    data = {"lead_ids": ["test_lead"]}
            
            async with session.request(
                endpoint['method'], 
                url, 
                json=data,
                timeout=10
            ) as response:
                response_time_ms = (time.time() - start_time) * 1000
                status_code = response.status
                
                if response.status == 200:
                    status = "up"
                elif response.status < 500:
                    status = "degraded"
                else:
                    status = "down"
                    error_message = f"HTTP {response.status}"
                    
        except asyncio.TimeoutError:
            response_time_ms = (time.time() - start_time) * 1000
            status = "down"
            error_message = "Timeout"
            
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            status = "down"
            error_message = str(e)
        
        # Record event
        event = UptimeEvent(
            timestamp=datetime.utcnow(),
            endpoint=endpoint['name'],
            status=status,
            response_time_ms=response_time_ms,
            status_code=status_code,
            error_message=error_message
        )
        
        self.events.append(event)
        
        # Keep only last 1000 events
        if len(self.events) > 1000:
            self.events = self.events[-1000:]
        
        logger.debug(f"Checked {endpoint['name']}: {status} ({response_time_ms:.2f}ms)")
    
    def _update_sla_status(self):
        """Update SLA status based on recent events"""
        if not self.events:
            return
        
        # Calculate uptime for last 24 hours
        cutoff = datetime.utcnow() - timedelta(hours=24)
        recent_events = [e for e in self.events if e.timestamp >= cutoff]
        
        if not recent_events:
            return
        
        total_checks = len(recent_events)
        successful_checks = sum(1 for e in recent_events if e.status == "up")
        failed_checks = total_checks - successful_checks
        
        uptime_percentage = (successful_checks / total_checks) * 100 if total_checks > 0 else 100
        
        # Update current streak
        current_streak = 0
        for event in reversed(recent_events):
            if event.status == "up":
                current_streak += 1
            else:
                break
        
        # Update longest streak
        longest_streak = 0
        temp_streak = 0
        for event in recent_events:
            if event.status == "up":
                temp_streak += 1
                longest_streak = max(longest_streak, temp_streak)
            else:
                temp_streak = 0
        
        # Find last failure
        last_failure = None
        for event in reversed(recent_events):
            if event.status != "up":
                last_failure = event.timestamp
                break
        
        self.sla_status = SLAStatus(
            uptime_percentage=uptime_percentage,
            total_checks=total_checks,
            successful_checks=successful_checks,
            failed_checks=failed_checks,
            current_streak=current_streak,
            longest_streak=longest_streak,
            last_failure=last_failure,
            sla_breach=uptime_percentage < self.sla_threshold
        )
    
    async def _check_sla_breach(self):
        """Check for SLA breaches and send alerts"""
        if self.sla_status.sla_breach and self.alert_email:
            await self._send_sla_alert()
    
    async def _send_sla_alert(self):
        """Send SLA breach alert"""
        if not self.alert_email:
            return
        
        subject = f"🚨 SLA BREACH ALERT - Uptime below {self.sla_threshold}%"
        
        body = f"""
SLA BREACH DETECTED

Current Status:
- Uptime: {self.sla_status.uptime_percentage:.2f}%
- Threshold: {self.sla_threshold}%
- Failed Checks: {self.sla_status.failed_checks}
- Last Failure: {self.sla_status.last_failure}

Recent Events:
"""
        
        # Add recent failures
        recent_failures = [e for e in self.events[-10:] if e.status != "up"]
        for event in recent_failures:
            body += f"- {event.timestamp}: {event.endpoint} - {event.status}"
            if event.error_message:
                body += f" ({event.error_message})"
            body += "\n"
        
        try:
            # Send email (implement based on your email service)
            logger.info(f"SLA breach alert: {subject}")
        except Exception as e:
            logger.error(f"Failed to send SLA alert: {e}")
    
    def get_uptime_report(self) -> Dict:
        """Get comprehensive uptime report"""
        if not self.events:
            return {"error": "No monitoring data available"}
        
        # Overall statistics
        total_events = len(self.events)
        up_events = sum(1 for e in self.events if e.status == "up")
        down_events = sum(1 for e in self.events if e.status == "down")
        degraded_events = sum(1 for e in self.events if e.status == "degraded")
        
        # Response time statistics
        response_times = [e.response_time_ms for e in self.events if e.response_time_ms > 0]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        # Endpoint breakdown
        endpoint_stats = {}
        for endpoint in self.endpoints:
            endpoint_events = [e for e in self.events if e.endpoint == endpoint['name']]
            if endpoint_events:
                endpoint_up = sum(1 for e in endpoint_events if e.status == "up")
                endpoint_uptime = (endpoint_up / len(endpoint_events)) * 100
                endpoint_stats[endpoint['name']] = {
                    "uptime_percentage": endpoint_uptime,
                    "total_checks": len(endpoint_events),
                    "avg_response_time_ms": sum(e.response_time_ms for e in endpoint_events) / len(endpoint_events)
                }
        
        return {
            "monitoring_period": {
                "start_time": self.start_time.isoformat(),
                "duration_hours": (datetime.utcnow() - self.start_time).total_seconds() / 3600,
                "total_checks": total_events
            },
            "overall_uptime": {
                "percentage": self.sla_status.uptime_percentage,
                "up_events": up_events,
                "down_events": down_events,
                "degraded_events": degraded_events,
                "sla_threshold": self.sla_threshold,
                "sla_compliant": not self.sla_status.sla_breach
            },
            "performance": {
                "avg_response_time_ms": avg_response_time,
                "current_streak": self.sla_status.current_streak,
                "longest_streak": self.sla_status.longest_streak
            },
            "endpoint_breakdown": endpoint_stats,
            "recent_events": [asdict(e) for e in self.events[-20:]]  # Last 20 events
        }
    
    def export_data(self, hours: int = 24) -> List[Dict]:
        """Export monitoring data for analysis"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        recent_events = [e for e in self.events if e.timestamp >= cutoff]
        return [asdict(e) for e in recent_events]

async def main():
    """Run uptime monitoring"""
    monitor = UptimeMonitor(
        base_url="http://localhost:8000",
        check_interval=30,  # Check every 30 seconds
        sla_threshold=99.5
    )
    
    try:
        await monitor.start_monitoring()
    except KeyboardInterrupt:
        print("\nStopping monitoring...")
        await monitor.stop_monitoring()
        
        # Print final report
        report = monitor.get_uptime_report()
        print("\n" + "=" * 50)
        print("📊 UPTIME MONITORING REPORT")
        print("=" * 50)
        print(json.dumps(report, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(main())
