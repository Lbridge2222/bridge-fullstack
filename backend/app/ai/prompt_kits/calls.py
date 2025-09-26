"""
Call Coach prompt kit - generates structured call scripts
"""
from app.ai.safe_llm import LLMCtx
from app.ai.post import clamp_list
import json

SYSTEM = """You are a UK admissions Call Coach.
Return STRICT JSON for a 5–7 minute call:
{
 "opener": "string",
 "context_line": "string", 
 "discovery_questions": ["q1","q2","q3","q4","q5"],
 "value_props": ["..."],
 "objections": [{"label":"Funding","probe":"...","reframe":"...","next":"..."}],
 "next_steps": ["..."],
 "compliance": ["..."]
}
Rules:
- British English, friendly but professional.
- Personalise with the lead's course, timeline, engagement.
- Questions must be short, closed/open mix.
- Zero hallucinations: if unknown, say "Not sure yet".
- Keep each string ≤ 140 chars.
"""

async def build_call_script(lead: dict, org_tone: str = "friendly") -> dict:
    """Generate structured call script for a lead"""
    human = f"""Lead JSON:
```json
{lead}
```

Tone: {org_tone}
Return ONLY the JSON object."""
    
    llm = LLMCtx(temperature=0.25)
    raw = await llm.ainvoke([("system", SYSTEM), ("human", human)])
    
    try:
        data = json.loads(raw)
    except Exception:
        data = {}
    
    # Apply clamps
    data["discovery_questions"] = clamp_list(data.get("discovery_questions", []), 6, 110)
    data["value_props"] = clamp_list(data.get("value_props", []), 4, 120)
    data["next_steps"] = clamp_list(data.get("next_steps", []), 3, 120)
    data["compliance"] = clamp_list(data.get("compliance", []), 3, 120)
    
    return data
