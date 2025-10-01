#!/usr/bin/env python3

import sys
sys.path.append('backend')

from app.ai.router import router_instance

async def test_classification():
    query = "Shall we offer Isla a place on the MA Music Performance course?"
    context = {"lead": {"name": "Isla Mitchell", "status": "lead", "courseInterest": "MA Music Performance"}}
    
    print(f"Testing query: {query}")
    
    # Test regex classification directly
    intent, confidence, meta = await router_instance.classify_intent_regex(query, context)
    print(f"Regex classification: intent={intent}, confidence={confidence}, meta={meta}")
    
    # Test full classification
    intent, confidence, meta = await router_instance.classify(query, context)
    print(f"Full classification: intent={intent}, confidence={confidence}, meta={meta}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_classification())
