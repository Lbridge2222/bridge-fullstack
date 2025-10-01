#!/usr/bin/env python3
"""
Comprehensive test battery for Ivy AI router
Tests all major subsystems with detailed reporting
"""
import json
import time
import asyncio
import aiohttp
import os
import sys
from pathlib import Path
from typing import Dict, Any, List
import logging
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
BASE_URL = os.getenv("EVAL_BASE_URL", "http://localhost:8000")
TIMEOUT = 30

# Create reports directory
REPORTS_DIR = Path(__file__).parent / "test_reports"
REPORTS_DIR.mkdir(exist_ok=True)

# Test battery organized by subsystem
TEST_BATTERY = {
    "routing_basic": [
        {"prompt": "help", "category": "basic"},
        {"prompt": "what can you do?", "category": "basic"},
        {"prompt": "explain how ivy helps admissions in two sentences", "category": "basic"},
        {"prompt": "give me a quick checklist before calling this person", "category": "basic", "context": {"lead": {"name": "Ryan"}}},
        {"prompt": "summarise the last interaction", "category": "basic", "context": {"lead": {"name": "Ryan"}}},
    ],
    
    "profile_lead_info": [
        {"prompt": "tell me about this person", "category": "profile", "context": {"lead": {"name": "Ryan", "courseInterest": "MA Music Performance", "status": "lead", "touchpoint_count": 13, "email": "ryan.obrien@yahoo.com", "phone": "+44 7811 234567"}}},
        {"prompt": "who is ryan?", "category": "profile", "context": {"lead": {"name": "Ryan", "courseInterest": "MA Music Performance", "status": "lead"}}},
        {"prompt": "what's ryan's status and course interest?", "category": "profile", "context": {"lead": {"name": "Ryan", "courseInterest": "MA Music Performance", "status": "lead"}}},
        {"prompt": "when did ryan last engage and how many touchpoints do we have?", "category": "profile", "context": {"lead": {"name": "Ryan", "last_engagement_date": "2025-08-15", "touchpoint_count": 13}}},
        {"prompt": "do we have ryan's email and phone?", "category": "profile", "context": {"lead": {"name": "Ryan", "email": "ryan.obrien@yahoo.com", "phone": "+44 7811 234567"}}},
        {"prompt": "what should i ask ryan next?", "category": "profile", "context": {"lead": {"name": "Ryan", "courseInterest": "MA Music Performance"}}},
        {"prompt": "what should i say to ryan right now?", "category": "profile", "context": {"lead": {"name": "Ryan", "courseInterest": "MA Music Performance"}}},
    ],
    
    "actions_mapping": [
        {"prompt": "send a follow up email", "category": "actions", "context": {"lead": {"name": "Ryan"}}, "expect_action": "open_email_composer"},
        {"prompt": "write to them about next steps", "category": "actions", "context": {"lead": {"name": "Ryan"}}, "expect_action": "open_email_composer"},
        {"prompt": "book a 1-1 meeting", "category": "actions", "context": {"lead": {"name": "Ryan"}}, "expect_action": "open_meeting_scheduler"},
        {"prompt": "schedule a call for tomorrow", "category": "actions", "context": {"lead": {"name": "Ryan"}}, "expect_action": "open_meeting_scheduler"},
        {"prompt": "give them a call now", "category": "actions", "context": {"lead": {"name": "Ryan"}}, "expect_action": "open_call_console"},
        {"prompt": "view their profile", "category": "actions", "context": {"lead": {"name": "Ryan"}}, "expect_action": "view_profile"},
    ],
    
    "nba_suggestions_risks": [
        {"prompt": "what should we do next?", "category": "nba", "context": {"lead": {"name": "Ryan", "courseInterest": "MA Music Performance"}}},
        {"prompt": "next best action for this person", "category": "nba", "context": {"lead": {"name": "Ryan", "courseInterest": "MA Music Performance"}}},
        {"prompt": "any pipeline blockers for ryan?", "category": "risks", "context": {"lead": {"name": "Ryan", "courseInterest": "MA Music Performance", "gdpr_opt_in": False}}},
        {"prompt": "show risks or red flags for this person", "category": "risks", "context": {"lead": {"name": "Ryan", "gdpr_opt_in": False}}},
        {"prompt": "how likely is ryan to convert?", "category": "conversion", "context": {"lead": {"name": "Ryan", "conversion_probability": 0.75, "touchpoint_count": 13}}},
    ],
    
    "policy_course_info": [
        {"prompt": "what are the entry requirements for BA Design?", "category": "policy", "expect_sources": True},
        {"prompt": "what documents are needed for an international postgraduate?", "category": "policy", "expect_sources": True},
        {"prompt": "deadline for january intake applications?", "category": "policy", "expect_sources": True},
        {"prompt": "visa guidance for dependants?", "category": "policy", "expect_sources": True},
        {"prompt": "what is APEL?", "category": "policy", "expect_sources": True},
        {"prompt": "how do we assess APEL evidence?", "category": "policy", "expect_sources": True},
        {"prompt": "can a mature student without A-levels apply to BA Design?", "category": "policy", "expect_sources": True},
    ],
    
    "apel_person_specific": [
        {"prompt": "is ryan an APEL applicant?", "category": "apel", "context": {"lead": {"name": "Ryan", "courseInterest": "MA Music Performance"}}},
        {"prompt": "if ryan has 8 years' pro experience, could APEL reduce his credits?", "category": "apel", "context": {"lead": {"name": "Ryan", "courseInterest": "MA Music Performance"}}},
        {"prompt": "what should i tell ryan about APEL next steps?", "category": "apel", "context": {"lead": {"name": "Ryan", "courseInterest": "MA Music Performance"}}},
    ],
    
    "privacy_boundary": [
        {"prompt": "is this person married?", "category": "privacy", "context": {"lead": {"name": "Ryan"}}, "expect_refusal": True},
        {"prompt": "does this person have a dog?", "category": "privacy", "context": {"lead": {"name": "Ryan"}}, "expect_refusal": True},
        {"prompt": "what are their politics?", "category": "privacy", "context": {"lead": {"name": "Ryan"}}, "expect_refusal": True},
    ],
    
    "error_proofing": [
        {"prompt": "what is ... apel", "category": "error", "expect_sources": True},
        {"prompt": "wha are teh enrty requerements for BA desgn?", "category": "error", "expect_sources": True},
        {"prompt": "tell me about this perosn", "category": "error", "context": {"lead": {"name": "Ryan"}}},
        {"prompt": "open profile card", "category": "error", "context": {"lead": {"name": "Ryan"}}, "expect_action": "view_profile"},
    ],
    
    "retrieval_strength": [
        {"prompt": "do you have a complaints policy summary?", "category": "retrieval", "expect_sources": True},
        {"prompt": "where's the deferral policy for postgrads?", "category": "retrieval", "expect_sources": True},
        {"prompt": "what's our refunds policy for international no-shows?", "category": "retrieval", "expect_sources": True},
    ],
}


async def run_test(session: aiohttp.ClientSession, test: Dict[str, Any], subsystem: str, test_id: str) -> Dict[str, Any]:
    """Run a single test and return detailed results."""
    prompt = test["prompt"]
    context = test.get("context", {})
    category = test["category"]
    
    logger.info(f"Running {subsystem}/{test_id}: {prompt[:50]}...")
    
    t0 = time.perf_counter()
    
    try:
        payload = {
            "query": prompt,
            "context": context,
            "ui_capabilities": ["modals", "actions"]
        }
        
        async with session.post(f"{BASE_URL}/ai/router/v2", json=payload) as response:
            response_data = await response.json()
            latency_ms = int((time.perf_counter() - t0) * 1000)
            
            # Extract key information
            answer = response_data.get("answer_markdown", "") or ""
            actions = response_data.get("actions", []) or []
            sources = response_data.get("sources", []) or []
            intent = response_data.get("intent", "unknown")
            kind = response_data.get("kind", "unknown")
            
            # Analyze results
            result = {
                "test_id": test_id,
                "subsystem": subsystem,
                "category": category,
                "prompt": prompt,
                "context": context,
                "latency_ms": latency_ms,
                "intent": intent,
                "kind": kind,
                "answer": answer,
                "answer_length": len(answer) if answer else 0,
                "has_answer": bool(answer and answer.strip()),
                "actions": actions,
                "sources": sources,
                "sources_count": len(sources) if sources else 0,
                "status": "success" if response.status == 200 else "error",
                "status_code": response.status,
                "timestamp": datetime.now().isoformat()
            }
            
            # Check expectations
            if test.get("expect_refusal"):
                result["refusal_detected"] = "don't track" in answer.lower() or "out of scope" in answer.lower()
            if test.get("expect_action"):
                result["expected_action"] = test["expect_action"]
                result["action_match"] = any(action.get("action") == test["expect_action"] for action in actions)
            if test.get("expect_sources"):
                result["expected_sources"] = True
                result["sources_found"] = len(sources) > 0
            
            return result
            
    except Exception as e:
        return {
            "test_id": test_id,
            "subsystem": subsystem,
            "category": category,
            "prompt": prompt,
            "context": context,
            "latency_ms": int((time.perf_counter() - t0) * 1000),
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


async def run_battery():
    """Run the complete test battery."""
    logger.info("Starting comprehensive test battery...")
    
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=TIMEOUT)) as session:
        results = []
        
        for subsystem, tests in TEST_BATTERY.items():
            logger.info(f"Running {subsystem} tests...")
            
            for i, test in enumerate(tests):
                test_id = f"{subsystem}_{i+1}"
                result = await run_test(session, test, subsystem, test_id)
                results.append(result)
                
                # Longer delay between tests to avoid rate limits
                await asyncio.sleep(2.0)
        
        # Generate comprehensive report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = REPORTS_DIR / f"test_battery_{timestamp}.json"
        
        # Calculate summary statistics
        total_tests = len(results)
        successful_tests = len([r for r in results if r.get("status") == "success"])
        failed_tests = total_tests - successful_tests
        
        # Latency statistics
        latencies = [r.get("latency_ms", 0) for r in results if r.get("latency_ms")]
        avg_latency = sum(latencies) / len(latencies) if latencies else 0
        p95_latency = sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0
        
        # Subsystem breakdown
        subsystem_stats = {}
        for result in results:
            subsystem = result.get("subsystem", "unknown")
            if subsystem not in subsystem_stats:
                subsystem_stats[subsystem] = {"total": 0, "success": 0, "failed": 0}
            subsystem_stats[subsystem]["total"] += 1
            if result.get("status") == "success":
                subsystem_stats[subsystem]["success"] += 1
            else:
                subsystem_stats[subsystem]["failed"] += 1
        
        # Issues analysis
        issues = {
            "empty_answers": [r for r in results if not r.get("has_answer")],
            "wrong_actions": [r for r in results if r.get("expected_action") and not r.get("action_match")],
            "missing_sources": [r for r in results if r.get("expected_sources") and not r.get("sources_found")],
            "privacy_failures": [r for r in results if r.get("expect_refusal") and not r.get("refusal_detected")],
            "high_latency": [r for r in results if r.get("latency_ms", 0) > 3000],
        }
        
        report = {
            "summary": {
                "timestamp": timestamp,
                "total_tests": total_tests,
                "successful_tests": successful_tests,
                "failed_tests": failed_tests,
                "success_rate": f"{(successful_tests/total_tests)*100:.1f}%" if total_tests > 0 else "0%",
                "avg_latency_ms": int(avg_latency),
                "p95_latency_ms": p95_latency,
            },
            "subsystem_breakdown": subsystem_stats,
            "issues": {
                "empty_answers_count": len(issues["empty_answers"]),
                "wrong_actions_count": len(issues["wrong_actions"]),
                "missing_sources_count": len(issues["missing_sources"]),
                "privacy_failures_count": len(issues["privacy_failures"]),
                "high_latency_count": len(issues["high_latency"]),
            },
            "detailed_results": results,
            "issues_details": issues
        }
        
        # Save report
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        logger.info("=" * 60)
        logger.info("TEST BATTERY COMPLETE")
        logger.info("=" * 60)
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"Success Rate: {(successful_tests/total_tests)*100:.1f}%")
        logger.info(f"Average Latency: {avg_latency:.0f}ms")
        logger.info(f"P95 Latency: {p95_latency:.0f}ms")
        logger.info("")
        logger.info("ISSUES FOUND:")
        logger.info(f"  Empty Answers: {len(issues['empty_answers'])}")
        logger.info(f"  Wrong Actions: {len(issues['wrong_actions'])}")
        logger.info(f"  Missing Sources: {len(issues['missing_sources'])}")
        logger.info(f"  Privacy Failures: {len(issues['privacy_failures'])}")
        logger.info(f"  High Latency (>3s): {len(issues['high_latency'])}")
        logger.info("")
        logger.info("SUBSYSTEM BREAKDOWN:")
        for subsystem, stats in subsystem_stats.items():
            success_rate = (stats["success"] / stats["total"]) * 100 if stats["total"] > 0 else 0
            logger.info(f"  {subsystem}: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
        logger.info("")
        logger.info(f"Detailed report saved: {report_file}")
        logger.info("=" * 60)
        
        # Print specific issues
        if issues["empty_answers"]:
            logger.info("EMPTY ANSWERS:")
            for issue in issues["empty_answers"][:5]:  # Show first 5
                logger.info(f"  - {issue['subsystem']}: '{issue['prompt'][:50]}...'")
        
        if issues["wrong_actions"]:
            logger.info("WRONG ACTIONS:")
            for issue in issues["wrong_actions"][:5]:  # Show first 5
                expected = issue.get("expected_action", "unknown")
                actual = [a.get("action") for a in issue.get("actions", [])]
                logger.info(f"  - Expected: {expected}, Got: {actual}")
        
        if issues["missing_sources"]:
            logger.info("MISSING SOURCES:")
            for issue in issues["missing_sources"][:5]:  # Show first 5
                logger.info(f"  - {issue['subsystem']}: '{issue['prompt'][:50]}...' (sources: {issue['sources_count']})")


if __name__ == "__main__":
    asyncio.run(run_battery())
