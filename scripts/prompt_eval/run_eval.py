#!/usr/bin/env python3
"""
Prompt Evaluation Harness
Tests AI response quality, JSON validity, and structural constraints
"""

import asyncio
import json
import yaml
import requests
from typing import Dict, Any, List
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

from app.ai.runtime import normalize_user_text, flash_parse_query, narrate

class PromptEvaluator:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = []
    
    async def test_normalization(self, query: str) -> Dict[str, Any]:
        """Test text normalization"""
        try:
            normalized = await normalize_user_text(query)
            return {
                "query": query,
                "normalized": normalized,
                "success": True,
                "improved": normalized != query
            }
        except Exception as e:
            return {
                "query": query,
                "error": str(e),
                "success": False
            }
    
    async def test_intent_parsing(self, query: str) -> Dict[str, Any]:
        """Test intent classification"""
        try:
            parsed = await flash_parse_query(query)
            return {
                "query": query,
                "intent": parsed.get("intent"),
                "confidence": parsed.get("confidence", 0.0),
                "success": True
            }
        except Exception as e:
            return {
                "query": query,
                "error": str(e),
                "success": False
            }
    
    async def test_narration(self, mode: str, facts: Dict[str, Any]) -> Dict[str, Any]:
        """Test narrator response generation"""
        try:
            response = await narrate(mode, facts)
            return {
                "mode": mode,
                "response": response,
                "success": True,
                "has_sections": any(section in response for section in ["What You Know", "Ask", "Say", "Next Steps"]),
                "length": len(response)
            }
        except Exception as e:
            return {
                "mode": mode,
                "error": str(e),
                "success": False
            }
    
    async def test_rag_endpoint(self, query: str) -> Dict[str, Any]:
        """Test RAG endpoint response"""
        try:
            response = requests.post(
                f"{self.base_url}/rag/query",
                json={"query": query, "context": {}},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "query": query,
                    "response": data.get("answer", ""),
                    "success": True,
                    "has_sections": any(section in data.get("answer", "") for section in ["What You Know", "Ask", "Say", "Next Steps"]),
                    "length": len(data.get("answer", ""))
                }
            else:
                return {
                    "query": query,
                    "error": f"HTTP {response.status_code}",
                    "success": False
                }
        except Exception as e:
            return {
                "query": query,
                "error": str(e),
                "success": False
            }
    
    async def test_suggestions_endpoint(self, query: str) -> Dict[str, Any]:
        """Test suggestions modal JSON validity"""
        try:
            response = requests.post(
                f"{self.base_url}/rag/suggestions",
                json={"query": query, "context": {}},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                # Validate JSON structure
                required_fields = ["modal_title", "summary_bullets", "ask", "say"]
                has_required = all(field in data for field in required_fields)
                return {
                    "query": query,
                    "json_valid": True,
                    "has_required_fields": has_required,
                    "success": True
                }
            else:
                return {
                    "query": query,
                    "error": f"HTTP {response.status_code}",
                    "success": False
                }
        except Exception as e:
            return {
                "query": query,
                "error": str(e),
                "success": False
            }
    
    async def run_evaluation(self, test_cases: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Run full evaluation suite"""
        results = {
            "normalization": [],
            "intent_parsing": [],
            "narration": [],
            "rag_endpoint": [],
            "suggestions_endpoint": []
        }
        
        for case in test_cases:
            query = case["query"]
            
            # Test normalization
            norm_result = await self.test_normalization(query)
            results["normalization"].append(norm_result)
            
            # Test intent parsing
            intent_result = await self.test_intent_parsing(query)
            results["intent_parsing"].append(intent_result)
            
            # Test narration
            facts = {"query": query, "result_count": 5, "time_preset": "last_30d"}
            narr_result = await self.test_narration("lead-search", facts)
            results["narration"].append(narr_result)
            
            # Test RAG endpoint
            rag_result = await self.test_rag_endpoint(query)
            results["rag_endpoint"].append(rag_result)
            
            # Test suggestions endpoint
            sugg_result = await self.test_suggestions_endpoint(query)
            results["suggestions_endpoint"].append(sugg_result)
        
        return results
    
    def generate_report(self, results: Dict[str, Any]) -> str:
        """Generate evaluation report"""
        report = ["# Prompt Evaluation Report", ""]
        
        for test_type, test_results in results.items():
            report.append(f"## {test_type.replace('_', ' ').title()}")
            report.append("")
            
            success_count = sum(1 for r in test_results if r.get("success", False))
            total_count = len(test_results)
            success_rate = (success_count / total_count * 100) if total_count > 0 else 0
            
            report.append(f"**Success Rate:** {success_rate:.1f}% ({success_count}/{total_count})")
            report.append("")
            
            # Show failures
            failures = [r for r in test_results if not r.get("success", False)]
            if failures:
                report.append("**Failures:**")
                for failure in failures[:3]:  # Show first 3 failures
                    report.append(f"- {failure.get('query', 'Unknown')}: {failure.get('error', 'Unknown error')}")
                report.append("")
            
            # Show successes
            successes = [r for r in test_results if r.get("success", False)]
            if successes:
                report.append("**Sample Successes:**")
                for success in successes[:2]:  # Show first 2 successes
                    report.append(f"- {success.get('query', 'Unknown')}: {success.get('intent', 'Unknown intent')}")
                report.append("")
        
        return "\n".join(report)

async def main():
    """Main evaluation function"""
    # Load test cases
    with open("cases.yaml", "r") as f:
        data = yaml.safe_load(f)
        test_cases = data["test_cases"]
    
    # Run evaluation
    evaluator = PromptEvaluator()
    results = await evaluator.run_evaluation(test_cases)
    
    # Generate report
    report = evaluator.generate_report(results)
    print(report)
    
    # Save results
    with open("evaluation_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    # Check overall success
    total_tests = sum(len(test_results) for test_results in results.values())
    total_successes = sum(
        sum(1 for r in test_results if r.get("success", False))
        for test_results in results.values()
    )
    
    success_rate = (total_successes / total_tests * 100) if total_tests > 0 else 0
    print(f"\nOverall Success Rate: {success_rate:.1f}%")
    
    # Exit with error code if success rate is too low
    if success_rate < 80:
        print("❌ Evaluation failed - success rate below 80%")
        sys.exit(1)
    else:
        print("✅ Evaluation passed - success rate above 80%")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())
