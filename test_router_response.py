#!/usr/bin/env python3

import sys
sys.path.append('backend')

from app.ai.router import router_instance

async def test_router_response():
    query = "Does Isla have a boyfriend or pets?"
    context = {"lead": {"name": "Isla Mitchell", "status": "lead", "courseInterest": "MA Music Performance"}}
    
    print(f"Testing query: {query}")
    
    # Test the route method directly
    response = await router_instance.route(query, context)
    print(f"Response type: {type(response)}")
    print(f"Response fields: {response.__dict__ if hasattr(response, '__dict__') else 'No __dict__'}")
    print(f"Response: {response}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_router_response())