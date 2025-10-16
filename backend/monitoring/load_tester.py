#!/usr/bin/env python3
"""
Load Testing Suite for Performance Verification
Tests the specific claims: <200ms prediction, 1-3s RAG, 99.5% uptime
"""

import asyncio
import aiohttp
import time
import statistics
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class LoadTestResult:
    """Result of a load test"""
    test_name: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    max_response_time_ms: float
    min_response_time_ms: float
    requests_per_second: float
    sla_compliant_percentage: float
    errors: List[str]

class LoadTester:
    """Comprehensive load testing for performance claims"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results: List[LoadTestResult] = []
        
    async def test_prediction_latency(self, 
                                    concurrent_users: int = 10, 
                                    requests_per_user: int = 50,
                                    sla_threshold_ms: int = 200) -> LoadTestResult:
        """Test prediction endpoint latency claims (<200ms)"""
        
        print(f"🧪 Testing Prediction Latency (SLA: <{sla_threshold_ms}ms)")
        print(f"   Concurrent users: {concurrent_users}, Requests per user: {requests_per_user}")
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for user_id in range(concurrent_users):
                task = self._run_user_requests(
                    session, 
                    f"prediction_user_{user_id}",
                    requests_per_user,
                    self._make_prediction_request
                )
                tasks.append(task)
            
            all_responses = await asyncio.gather(*tasks, return_exceptions=True)
            
        # Flatten results
        response_times = []
        errors = []
        successful_requests = 0
        
        for user_responses in all_responses:
            if isinstance(user_responses, Exception):
                errors.append(str(user_responses))
                continue
                
            for response_time, success, error in user_responses:
                response_times.append(response_time)
                if success:
                    successful_requests += 1
                else:
                    errors.append(error)
        
        total_requests = concurrent_users * requests_per_user
        failed_requests = total_requests - successful_requests
        
        # Calculate SLA compliance
        sla_compliant = sum(1 for rt in response_times if rt <= sla_threshold_ms)
        sla_compliant_percentage = (sla_compliant / len(response_times)) * 100 if response_times else 0
        
        result = LoadTestResult(
            test_name="Prediction Latency",
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time_ms=statistics.mean(response_times) if response_times else 0,
            p95_response_time_ms=statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else max(response_times) if response_times else 0,
            p99_response_time_ms=statistics.quantiles(response_times, n=100)[98] if len(response_times) > 100 else max(response_times) if response_times else 0,
            max_response_time_ms=max(response_times) if response_times else 0,
            min_response_time_ms=min(response_times) if response_times else 0,
            requests_per_second=len(response_times) / (max(response_times) - min(response_times)) * 1000 if response_times and len(response_times) > 1 else 0,
            sla_compliant_percentage=sla_compliant_percentage,
            errors=errors[:10]  # Limit to first 10 errors
        )
        
        self.results.append(result)
        self._print_result(result)
        return result
    
    async def test_rag_response_time(self, 
                                   concurrent_users: int = 5, 
                                   requests_per_user: int = 20,
                                   sla_threshold_ms: int = 3000) -> LoadTestResult:
        """Test RAG query response time claims (1-3s)"""
        
        print(f"🧪 Testing RAG Response Time (SLA: <{sla_threshold_ms}ms)")
        print(f"   Concurrent users: {concurrent_users}, Requests per user: {requests_per_user}")
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for user_id in range(concurrent_users):
                task = self._run_user_requests(
                    session, 
                    f"rag_user_{user_id}",
                    requests_per_user,
                    self._make_rag_request
                )
                tasks.append(task)
            
            all_responses = await asyncio.gather(*tasks, return_exceptions=True)
            
        # Process results (same as prediction test)
        response_times = []
        errors = []
        successful_requests = 0
        
        for user_responses in all_responses:
            if isinstance(user_responses, Exception):
                errors.append(str(user_responses))
                continue
                
            for response_time, success, error in user_responses:
                response_times.append(response_time)
                if success:
                    successful_requests += 1
                else:
                    errors.append(error)
        
        total_requests = concurrent_users * requests_per_user
        failed_requests = total_requests - successful_requests
        
        # Calculate SLA compliance
        sla_compliant = sum(1 for rt in response_times if rt <= sla_threshold_ms)
        sla_compliant_percentage = (sla_compliant / len(response_times)) * 100 if response_times else 0
        
        result = LoadTestResult(
            test_name="RAG Response Time",
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time_ms=statistics.mean(response_times) if response_times else 0,
            p95_response_time_ms=statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else max(response_times) if response_times else 0,
            p99_response_time_ms=statistics.quantiles(response_times, n=100)[98] if len(response_times) > 100 else max(response_times) if response_times else 0,
            max_response_time_ms=max(response_times) if response_times else 0,
            min_response_time_ms=min(response_times) if response_times else 0,
            requests_per_second=len(response_times) / (max(response_times) - min(response_times)) * 1000 if response_times and len(response_times) > 1 else 0,
            sla_compliant_percentage=sla_compliant_percentage,
            errors=errors[:10]
        )
        
        self.results.append(result)
        self._print_result(result)
        return result
    
    async def test_uptime_sla(self, 
                            duration_minutes: int = 60, 
                            check_interval_seconds: int = 30,
                            sla_threshold_percentage: float = 99.5) -> LoadTestResult:
        """Test uptime SLA claims (99.5%+)"""
        
        print(f"🧪 Testing Uptime SLA (Target: {sla_threshold_percentage}%)")
        print(f"   Duration: {duration_minutes} minutes, Check interval: {check_interval_seconds}s")
        
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        
        response_times = []
        errors = []
        successful_checks = 0
        total_checks = 0
        
        async with aiohttp.ClientSession() as session:
            while time.time() < end_time:
                check_start = time.time()
                total_checks += 1
                
                try:
                    async with session.get(f"{self.base_url}/health/llm", timeout=10) as response:
                        response_time = (time.time() - check_start) * 1000
                        response_times.append(response_time)
                        
                        if response.status == 200:
                            successful_checks += 1
                        else:
                            errors.append(f"HTTP {response.status}")
                            
                except Exception as e:
                    response_time = (time.time() - check_start) * 1000
                    response_times.append(response_time)
                    errors.append(str(e))
                
                # Wait for next check
                await asyncio.sleep(check_interval_seconds)
        
        failed_checks = total_checks - successful_checks
        uptime_percentage = (successful_checks / total_checks) * 100 if total_checks > 0 else 0
        sla_compliant = uptime_percentage >= sla_threshold_percentage
        
        result = LoadTestResult(
            test_name="Uptime SLA",
            total_requests=total_checks,
            successful_requests=successful_checks,
            failed_requests=failed_checks,
            avg_response_time_ms=statistics.mean(response_times) if response_times else 0,
            p95_response_time_ms=statistics.quantiles(response_times, n=20)[18] if len(response_times) > 20 else max(response_times) if response_times else 0,
            p99_response_time_ms=statistics.quantiles(response_times, n=100)[98] if len(response_times) > 100 else max(response_times) if response_times else 0,
            max_response_time_ms=max(response_times) if response_times else 0,
            min_response_time_ms=min(response_times) if response_times else 0,
            requests_per_second=total_checks / (duration_minutes * 60),
            sla_compliant_percentage=uptime_percentage,
            errors=errors[:10]
        )
        
        self.results.append(result)
        self._print_result(result)
        return result
    
    async def _run_user_requests(self, session, user_id: str, num_requests: int, request_func) -> List[tuple]:
        """Run multiple requests for a single user"""
        responses = []
        
        for i in range(num_requests):
            start_time = time.time()
            try:
                success, error = await request_func(session, user_id, i)
                response_time = (time.time() - start_time) * 1000
                responses.append((response_time, success, error))
            except Exception as e:
                response_time = (time.time() - start_time) * 1000
                responses.append((response_time, False, str(e)))
            
            # Small delay between requests
            await asyncio.sleep(0.1)
        
        return responses
    
    async def _make_prediction_request(self, session, user_id: str, request_num: int) -> tuple:
        """Make a prediction request"""
        try:
            payload = {
                "lead_ids": [f"test_lead_{user_id}_{request_num}"],
                "include_confidence": True
            }
            
            async with session.post(
                f"{self.base_url}/ai/advanced-ml/predict-batch",
                json=payload,
                timeout=30
            ) as response:
                if response.status == 200:
                    return True, None
                else:
                    return False, f"HTTP {response.status}"
        except Exception as e:
            return False, str(e)
    
    async def _make_rag_request(self, session, user_id: str, request_num: int) -> tuple:
        """Make a RAG query request"""
        try:
            queries = [
                "What are the admission requirements?",
                "How do I apply for financial aid?",
                "What courses are available?",
                "When is the application deadline?",
                "What is the tuition cost?"
            ]
            
            query = queries[request_num % len(queries)]
            payload = {"query": query}
            
            async with session.post(
                f"{self.base_url}/ai/rag/query",
                json=payload,
                timeout=30
            ) as response:
                if response.status == 200:
                    return True, None
                else:
                    return False, f"HTTP {response.status}"
        except Exception as e:
            return False, str(e)
    
    def _print_result(self, result: LoadTestResult):
        """Print formatted test result"""
        print(f"\n📊 {result.test_name} Results:")
        print(f"   Total Requests: {result.total_requests}")
        print(f"   Successful: {result.successful_requests} ({result.successful_requests/result.total_requests*100:.1f}%)")
        print(f"   Failed: {result.failed_requests}")
        print(f"   Avg Response Time: {result.avg_response_time_ms:.2f}ms")
        print(f"   P95 Response Time: {result.p95_response_time_ms:.2f}ms")
        print(f"   P99 Response Time: {result.p99_response_time_ms:.2f}ms")
        print(f"   SLA Compliance: {result.sla_compliant_percentage:.2f}%")
        
        if result.errors:
            print(f"   Errors: {len(result.errors)} (showing first 3)")
            for error in result.errors[:3]:
                print(f"     - {error}")
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        if not self.results:
            return {"error": "No test results available"}
        
        # Overall statistics
        all_response_times = []
        total_requests = 0
        total_successful = 0
        sla_violations = 0
        
        for result in self.results:
            all_response_times.extend([result.avg_response_time_ms] * result.total_requests)
            total_requests += result.total_requests
            total_successful += result.successful_requests
            
            # Check for SLA violations
            if result.test_name == "Prediction Latency" and result.avg_response_time_ms > 200:
                sla_violations += 1
            elif result.test_name == "RAG Response Time" and result.avg_response_time_ms > 3000:
                sla_violations += 1
            elif result.test_name == "Uptime SLA" and result.sla_compliant_percentage < 99.5:
                sla_violations += 1
        
        return {
            "test_summary": {
                "total_tests": len(self.results),
                "total_requests": total_requests,
                "total_successful": total_successful,
                "overall_success_rate": (total_successful / total_requests) * 100 if total_requests > 0 else 0,
                "sla_violations": sla_violations
            },
            "performance_claims_verification": {
                "prediction_latency_under_200ms": any(r.test_name == "Prediction Latency" and r.avg_response_time_ms < 200 for r in self.results),
                "rag_response_under_3s": any(r.test_name == "RAG Response Time" and r.avg_response_time_ms < 3000 for r in self.results),
                "uptime_above_99_5_percent": any(r.test_name == "Uptime SLA" and r.sla_compliant_percentage >= 99.5 for r in self.results)
            },
            "detailed_results": [asdict(result) for result in self.results],
            "recommendations": self._generate_recommendations()
        }
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        for result in self.results:
            if result.test_name == "Prediction Latency":
                if result.avg_response_time_ms > 200:
                    recommendations.append(f"❌ Prediction latency exceeds 200ms target (avg: {result.avg_response_time_ms:.2f}ms)")
                else:
                    recommendations.append(f"✅ Prediction latency meets 200ms target (avg: {result.avg_response_time_ms:.2f}ms)")
            
            elif result.test_name == "RAG Response Time":
                if result.avg_response_time_ms > 3000:
                    recommendations.append(f"❌ RAG response time exceeds 3s target (avg: {result.avg_response_time_ms:.2f}ms)")
                else:
                    recommendations.append(f"✅ RAG response time meets 3s target (avg: {result.avg_response_time_ms:.2f}ms)")
            
            elif result.test_name == "Uptime SLA":
                if result.sla_compliant_percentage < 99.5:
                    recommendations.append(f"❌ Uptime below 99.5% target (actual: {result.sla_compliant_percentage:.2f}%)")
                else:
                    recommendations.append(f"✅ Uptime meets 99.5% target (actual: {result.sla_compliant_percentage:.2f}%)")
        
        return recommendations

async def main():
    """Run comprehensive load tests"""
    print("🚀 Starting Comprehensive Load Tests")
    print("=" * 50)
    
    tester = LoadTester()
    
    # Test 1: Prediction Latency
    await tester.test_prediction_latency(concurrent_users=5, requests_per_user=20)
    
    # Test 2: RAG Response Time
    await tester.test_rag_response_time(concurrent_users=3, requests_per_user=10)
    
    # Test 3: Uptime SLA (shorter duration for demo)
    await tester.test_uptime_sla(duration_minutes=5, check_interval_seconds=10)
    
    # Generate final report
    print("\n" + "=" * 50)
    print("📋 FINAL REPORT")
    print("=" * 50)
    
    report = tester.generate_report()
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
