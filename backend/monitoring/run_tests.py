#!/usr/bin/env python3
"""
Comprehensive Performance and Compliance Testing Suite
Run this to verify all investor deck claims
"""

import asyncio
import sys
import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from monitoring.performance_monitor import PerformanceMonitor, SLAThresholds
from monitoring.load_tester import LoadTester
from monitoring.uptime_monitor import UptimeMonitor
from monitoring.compliance_monitor import ComplianceMonitor

class InvestorClaimsVerifier:
    """Verifies all investor deck performance and compliance claims"""
    
    def __init__(self, base_url: str = "http://localhost:8000", db_connection: str = None):
        self.base_url = base_url
        self.db_connection = db_connection or "postgresql://postgres:password@localhost:5432/ivyos"
        
        # Initialize monitoring systems
        self.performance_monitor = PerformanceMonitor()
        self.load_tester = LoadTester(base_url)
        self.uptime_monitor = UptimeMonitor(base_url)
        self.compliance_monitor = ComplianceMonitor(db_connection)
        
        self.results = {}
    
    async def verify_all_claims(self) -> Dict:
        """Verify all investor deck claims"""
        print("🚀 Starting Investor Claims Verification")
        print("=" * 60)
        
        # Test 1: Prediction Latency (< 200ms)
        print("\n1️⃣ Testing Prediction Latency (< 200ms)")
        prediction_result = await self.load_tester.test_prediction_latency(
            concurrent_users=10, 
            requests_per_user=30,
            sla_threshold_ms=200
        )
        self.results["prediction_latency"] = prediction_result
        
        # Test 2: RAG Response Time (1-3s)
        print("\n2️⃣ Testing RAG Response Time (1-3s)")
        rag_result = await self.load_tester.test_rag_response_time(
            concurrent_users=5, 
            requests_per_user=20,
            sla_threshold_ms=3000
        )
        self.results["rag_response"] = rag_result
        
        # Test 3: Uptime SLA (99.5%+)
        print("\n3️⃣ Testing Uptime SLA (99.5%+)")
        uptime_result = await self.load_tester.test_uptime_sla(
            duration_minutes=10,  # Shorter for demo
            check_interval_seconds=15,
            sla_threshold_percentage=99.5
        )
        self.results["uptime_sla"] = uptime_result
        
        # Test 4: GDPR Compliance
        print("\n4️⃣ Testing GDPR Compliance")
        gdpr_report = await self.compliance_monitor.run_compliance_audit()
        self.results["gdpr_compliance"] = gdpr_report
        
        # Generate final verification report
        verification_report = self._generate_verification_report()
        
        return verification_report
    
    def _generate_verification_report(self) -> Dict:
        """Generate comprehensive verification report"""
        
        # Check each claim
        claims_verification = {
            "prediction_latency_under_200ms": False,
            "rag_response_under_3s": False,
            "uptime_above_99_5_percent": False,
            "gdpr_compliant": False,
            "ofs_compliant": False
        }
        
        # Verify prediction latency
        if "prediction_latency" in self.results:
            pred_result = self.results["prediction_latency"]
            claims_verification["prediction_latency_under_200ms"] = pred_result.avg_response_time_ms < 200
        
        # Verify RAG response time
        if "rag_response" in self.results:
            rag_result = self.results["rag_response"]
            claims_verification["rag_response_under_3s"] = rag_result.avg_response_time_ms < 3000
        
        # Verify uptime
        if "uptime_sla" in self.results:
            uptime_result = self.results["uptime_sla"]
            claims_verification["uptime_above_99_5_percent"] = uptime_result.sla_compliant_percentage >= 99.5
        
        # Verify compliance
        if "gdpr_compliance" in self.results:
            gdpr_report = self.results["gdpr_compliance"]
            claims_verification["gdpr_compliant"] = gdpr_report.gdpr_score >= 80
            claims_verification["ofs_compliant"] = gdpr_report.ofs_score >= 80
        
        # Calculate overall verification score
        verified_claims = sum(1 for verified in claims_verification.values() if verified)
        total_claims = len(claims_verification)
        verification_score = (verified_claims / total_claims) * 100
        
        # Generate recommendations
        recommendations = self._generate_recommendations(claims_verification)
        
        return {
            "verification_summary": {
                "overall_score": round(verification_score, 2),
                "verified_claims": verified_claims,
                "total_claims": total_claims,
                "verification_status": "PASS" if verification_score >= 80 else "FAIL"
            },
            "claims_verification": claims_verification,
            "detailed_results": {
                "prediction_latency": asdict(self.results.get("prediction_latency")) if "prediction_latency" in self.results else None,
                "rag_response": asdict(self.results.get("rag_response")) if "rag_response" in self.results else None,
                "uptime_sla": asdict(self.results.get("uptime_sla")) if "uptime_sla" in self.results else None,
                "gdpr_compliance": asdict(self.results.get("gdpr_compliance")) if "gdpr_compliance" in self.results else None
            },
            "recommendations": recommendations,
            "investor_deck_claims": {
                "original_claims": {
                    "prediction_latency": "< 200 ms",
                    "rag_response": "1–3 s",
                    "uptime_sla": "99.5%+",
                    "compliance": "GDPR / OfS Compliance ready"
                },
                "verified_claims": {
                    "prediction_latency": f"{self.results.get('prediction_latency', {}).avg_response_time_ms:.2f} ms" if 'prediction_latency' in self.results else "Not tested",
                    "rag_response": f"{self.results.get('rag_response', {}).avg_response_time_ms:.2f} ms" if 'rag_response' in self.results else "Not tested",
                    "uptime_sla": f"{self.results.get('uptime_sla', {}).sla_compliant_percentage:.2f}%" if 'uptime_sla' in self.results else "Not tested",
                    "gdpr_compliance": f"{self.results.get('gdpr_compliance', {}).gdpr_score:.1f}%" if 'gdpr_compliance' in self.results else "Not tested",
                    "ofs_compliance": f"{self.results.get('gdpr_compliance', {}).ofs_score:.1f}%" if 'gdpr_compliance' in self.results else "Not tested"
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _generate_recommendations(self, claims_verification: Dict) -> List[str]:
        """Generate recommendations based on verification results"""
        recommendations = []
        
        if not claims_verification["prediction_latency_under_200ms"]:
            recommendations.append("❌ PREDICTION LATENCY: Exceeds 200ms target - optimize ML pipeline")
        
        if not claims_verification["rag_response_under_3s"]:
            recommendations.append("❌ RAG RESPONSE: Exceeds 3s target - optimize vector search and LLM calls")
        
        if not claims_verification["uptime_above_99_5_percent"]:
            recommendations.append("❌ UPTIME: Below 99.5% target - implement proper monitoring and redundancy")
        
        if not claims_verification["gdpr_compliant"]:
            recommendations.append("❌ GDPR: Compliance score below 80% - review data handling practices")
        
        if not claims_verification["ofs_compliant"]:
            recommendations.append("❌ OfS: Compliance score below 80% - review regulatory requirements")
        
        if all(claims_verification.values()):
            recommendations.append("✅ ALL CLAIMS VERIFIED: Investor deck claims are accurate!")
        
        return recommendations

async def main():
    """Run the complete verification suite"""
    print("🎯 Investor Claims Verification Suite")
    print("=" * 60)
    print("This will test all performance and compliance claims from your investor deck")
    print()
    
    # Initialize verifier
    verifier = InvestorClaimsVerifier(
        base_url="http://localhost:8000",
        db_connection="postgresql://user:password@localhost:5432/ivyos"  # Update with your actual connection
    )
    
    try:
        # Run verification
        report = await verifier.verify_all_claims()
        
        # Print results
        print("\n" + "=" * 60)
        print("📊 VERIFICATION RESULTS")
        print("=" * 60)
        
        print(f"Overall Score: {report['verification_summary']['overall_score']}%")
        print(f"Status: {report['verification_summary']['verification_status']}")
        print(f"Verified Claims: {report['verification_summary']['verified_claims']}/{report['verification_summary']['total_claims']}")
        
        print("\n📋 Claims Verification:")
        for claim, verified in report['claims_verification'].items():
            status = "✅" if verified else "❌"
            print(f"  {status} {claim.replace('_', ' ').title()}")
        
        print("\n📈 Actual vs Claimed Performance:")
        for claim, actual in report['investor_deck_claims']['verified_claims'].items():
            original = report['investor_deck_claims']['original_claims'][claim]
            print(f"  {claim.replace('_', ' ').title()}: {original} → {actual}")
        
        print("\n💡 Recommendations:")
        for rec in report['recommendations']:
            print(f"  {rec}")
        
        # Save detailed report
        report_file = f"verification_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        
        return report['verification_summary']['verification_status'] == "PASS"
        
    except Exception as e:
        print(f"\n❌ Verification failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
