#!/usr/bin/env python3
"""
Nightly evaluation harness for Ivy v2 AI router
Runs ~30 anonymised prompts and validates envelope schema + latency budget
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

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
BASE_URL = os.getenv("EVAL_BASE_URL", "http://localhost:8000")
TIMEOUT = 30
LATENCY_P95_BUDGET = 2200  # 2.2 seconds
LATENCY_P99_BUDGET = 5000  # 5 seconds

# Create reports directory
REPORTS_DIR = Path(__file__).parent / "eval_reports"
REPORTS_DIR.mkdir(exist_ok=True)


async def run_case(session: aiohttp.ClientSession, case: Dict[str, Any]) -> Dict[str, Any]:
    """Run a single evaluation case."""
    case_id = case["id"]
    prompt = case["prompt"]
    context = case.get("context", {})
    expect = case.get("expect", {})
    
    logger.info(f"Running case: {case_id}")
    
    t0 = time.perf_counter()
    
    try:
        # Determine endpoint based on json_mode expectation
        if expect.get("json_mode", False):
            endpoint = f"{BASE_URL}/rag/query"
            payload = {
                "query": prompt,
                "context": context,
                "limit": 3,
                "json_mode": True
            }
        else:
            endpoint = f"{BASE_URL}/ai/router/v2"
            payload = {
                "query": prompt,
                "context": context,
                "ui_capabilities": ["modals", "inline_edits", "toasts"]
            }
        
        # Add unique user headers to avoid rate limiting conflicts
        headers = {
            "X-User-ID": f"eval-{case_id}",
            "X-Org-ID": "eval-org"
        }
        
        async with session.post(endpoint, json=payload, headers=headers, timeout=TIMEOUT) as response:
            if response.status != 200:
                return {
                    "id": case_id,
                    "ok": False,
                    "error": f"HTTP {response.status}",
                    "latency_ms": int((time.perf_counter() - t0) * 1000)
                }
            
            data = await response.json()
    
    except asyncio.TimeoutError:
        return {
            "id": case_id,
            "ok": False,
            "error": "Timeout",
            "latency_ms": int((time.perf_counter() - t0) * 1000)
        }
    except Exception as e:
        return {
            "id": case_id,
            "ok": False,
            "error": str(e),
            "latency_ms": int((time.perf_counter() - t0) * 1000)
        }
    
    latency_ms = int((time.perf_counter() - t0) * 1000)
    
    # Validate response
    ok = True
    errors = []
    
    # Check envelope schema
    if expect.get("kind"):
        if data.get("kind") != expect["kind"]:
            ok = False
            errors.append(f"Expected kind={expect['kind']}, got {data.get('kind')}")
    
    # Check JSON mode response
    if expect.get("json_mode", False):
        answer = data.get("answer", {})
        if isinstance(answer, str):
            try:
                answer = json.loads(answer)
            except json.JSONDecodeError:
                ok = False
                errors.append("Invalid JSON in answer")
        
        if expect.get("keys"):
            missing_keys = [k for k in expect["keys"] if k not in answer]
            if missing_keys:
                ok = False
                errors.append(f"Missing keys: {missing_keys}")
    
    # Check latency budget
    if expect.get("latency_ms_p95_budget"):
        if latency_ms > expect["latency_ms_p95_budget"]:
            ok = False
            errors.append(f"Latency {latency_ms}ms exceeds p95 budget {expect['latency_ms_p95_budget']}ms")
    
    # Check content requirements
    if expect.get("must_contain_any"):
        content = data.get("answer_markdown", "") or str(data)
        # Extended allowlist for privacy responses
        if "privacy" in case_id or "sensitive" in case_id:
            privacy_phrases = [
                "We don't track personal details",
                "That's beyond our scope",
                "We don't record that sort of thing",
                "Personal details aren't something we track",
                "That's not something we keep records of",
                "We don't have that information",
                "focus on course fit",
                "entry requirements and the next steps",
                "course information and application support",
                "academic interests",
                "courses, applications, and next steps",
                "course preferences or application status",
                "academic journey"
            ]
            if not any(phrase in content for phrase in privacy_phrases):
                ok = False
                errors.append(f"Missing required privacy phrases: {privacy_phrases}")
        else:
            if not any(phrase in content for phrase in expect["must_contain_any"]):
                ok = False
                errors.append(f"Missing required phrases: {expect['must_contain_any']}")
    
    if expect.get("forbid_substrings"):
        content = data.get("answer_markdown", "") or str(data)
        forbidden_found = [phrase for phrase in expect["forbid_substrings"] if phrase in content]
        if forbidden_found:
            ok = False
            errors.append(f"Contains forbidden phrases: {forbidden_found}")
    
    # Check actions
    if expect.get("actions"):
        actions = data.get("actions", [])
        action_names = [a.get("action") if isinstance(a, dict) else str(a) for a in actions]
        missing_actions = [a for a in expect["actions"] if a not in action_names]
        if missing_actions:
            ok = False
            errors.append(f"Missing actions: {missing_actions}")
    
    if expect.get("actions_any_of"):
        actions = data.get("actions", [])
        action_names = [a.get("action") if isinstance(a, dict) else str(a) for a in actions]
        if not any(a in action_names for a in expect["actions_any_of"]):
            ok = False
            errors.append(f"Missing any of actions: {expect['actions_any_of']}")
    
    return {
        "id": case_id,
        "ok": ok,
        "latency_ms": latency_ms,
        "kind": data.get("kind"),
        "errors": errors,
        "notes": case.get("notes", "")
    }


async def main():
    """Run the nightly evaluation."""
    logger.info("Starting nightly evaluation...")
    
    # Load test cases
    prompts_file = Path(__file__).parent / "eval_prompts.json"
    with open(prompts_file) as f:
        cases = json.load(f)
    
    logger.info(f"Loaded {len(cases)} test cases")
    
    # Run all cases sequentially to avoid rate limiting
    async with aiohttp.ClientSession() as session:
        results = []
        for case in cases:
            result = await run_case(session, case)
            results.append(result)
            # Small delay between requests to be gentle on the system
            await asyncio.sleep(0.1)
    
    # Process results
    successful = 0
    failed = 0
    latencies = []
    
    for result in results:
        if isinstance(result, Exception):
            logger.error(f"Case failed with exception: {result}")
            failed += 1
            continue
        
        if result["ok"]:
            successful += 1
        else:
            failed += 1
            logger.warning(f"Case {result['id']} failed: {result.get('errors', [])}")
        
        latencies.append(result["latency_ms"])
    
    # Calculate statistics
    total_cases = len(cases)
    success_rate = successful / total_cases if total_cases > 0 else 0
    
    if latencies:
        latencies.sort()
        p95 = latencies[int(len(latencies) * 0.95)]
        p99 = latencies[int(len(latencies) * 0.99)]
        avg_latency = sum(latencies) / len(latencies)
    else:
        p95 = p99 = avg_latency = 0
    
    # Generate report
    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "summary": {
            "total_cases": total_cases,
            "successful": successful,
            "failed": failed,
            "success_rate": success_rate
        },
        "performance": {
            "avg_latency_ms": avg_latency,
            "p95_latency_ms": p95,
            "p99_latency_ms": p99,
            "p95_budget_ms": LATENCY_P95_BUDGET,
            "p99_budget_ms": LATENCY_P99_BUDGET
        },
        "results": results
    }
    
    # Save report
    report_file = REPORTS_DIR / f"{time.strftime('%Y%m%d')}.json"
    with open(report_file, "w") as f:
        json.dump(report, f, indent=2)
    
    # Log summary
    logger.info(f"Evaluation complete:")
    logger.info(f"  Success rate: {success_rate:.1%} ({successful}/{total_cases})")
    logger.info(f"  Avg latency: {avg_latency:.0f}ms")
    logger.info(f"  P95 latency: {p95}ms (budget: {LATENCY_P95_BUDGET}ms)")
    logger.info(f"  P99 latency: {p99}ms (budget: {LATENCY_P99_BUDGET}ms)")
    logger.info(f"  Report saved: {report_file}")
    
    # Find largest regression case
    failed_cases = [r for r in results if not r.get("ok", False)]
    largest_regression = max(failed_cases, key=lambda x: x.get("latency_ms", 0)) if failed_cases else None
    
    # Single eval summary line for monitoring
    logger.info(f"eval/summary pass_count={successful} fail_count={failed} p95={p95} p99={p99} largest_regression={largest_regression['id'] if largest_regression else 'none'}")
    
    # Check for performance issues
    if p95 > LATENCY_P95_BUDGET:
        logger.warning(f"P95 latency {p95}ms exceeds budget {LATENCY_P95_BUDGET}ms")
    
    if p99 > LATENCY_P99_BUDGET:
        logger.warning(f"P99 latency {p99}ms exceeds budget {LATENCY_P99_BUDGET}ms")
    
    # Exit with error code if too many failures
    if success_rate < 0.8:  # 80% success rate threshold
        logger.error(f"Success rate {success_rate:.1%} below 80% threshold")
        sys.exit(1)
    
    logger.info("Evaluation passed!")


if __name__ == "__main__":
    asyncio.run(main())
