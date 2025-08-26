# 🤖 AI Integration Setup Guide - Bridge CRM

**⚠️ IMPORTANT: This is the GOSPEL implementation. Do not deviate from this setup.**

## 🎯 **Current Working Implementation**

This document describes the **ONLY** working AI integration setup for Bridge CRM. Any deviations from this implementation will break the system.

## 📦 **Dependencies (CRITICAL - Use Exact Versions)**

```txt
# Core AI Framework - DO NOT CHANGE
langchain>=0.2.0
langchain-openai>=0.1.0
langchain-google-genai>=0.1.0
langgraph>=0.0.40

# Model Providers
openai>=1.10.0
google-generativeai>=0.5.0

# Other Dependencies
pydantic>=2.4.0,<3.0.0
fastapi==0.104.1
uvicorn[standard]==0.24.0
```

## 🔧 **Installation Commands**

```bash
# Always use these exact commands
cd backend
source .venv/bin/activate
pip install "langchain>=0.2.0" "langchain-openai>=0.1.0" "langchain-google-genai>=0.1.0" "langgraph>=0.0.40"
```

## 🚨 **What NOT to Do (Will Break System)**

1. **❌ Never create custom wrappers** - Always use LangChain's native integrations
2. **❌ Never downgrade LangChain packages** - Use versions specified above
3. **❌ Never bypass LangChain** - It's the substrate orchestration layer
4. **❌ Never mix Pydantic v1 and v2** - Use Pydantic v2 consistently
5. **❌ Never use direct Google Generative AI** - Always use `langchain-google-genai`

## ✅ **What ALWAYS Works (Gospel Implementation)**

### **1. AI Configuration (`backend/app/ai/__init__.py`)**
```python
import os
from typing import Literal
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# AI Feature Flags
AI_LEADS_ENABLED = os.getenv("AI_LEADS_ENABLED", "true").lower() == "true"

# Model Selection - Support both OpenAI and Gemini
AI_MODEL_PROVIDER = os.getenv("AI_MODEL_PROVIDER", "gemini").lower()

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

# Gemini Configuration  
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

# Fallback Logic
def get_available_models() -> list[str]:
    models = []
    if OPENAI_API_KEY:
        models.append("openai")
    if GEMINI_API_KEY:
        models.append("gemini")
    return models

def get_default_model() -> str:
    available = get_available_models()
    if not available:
        return "none"
    
    # Prefer Gemini if available (free tier)
    if "gemini" in available:
        return "gemini"
    elif "openai" in available:
        return "openai"
    else:
        return "none"

# Current active model
ACTIVE_MODEL = get_default_model()
```

### **2. AI Tools Implementation (`backend/app/ai/tools/leads.py`)**

#### **AI Triage Function**
```python
async def leads_triage(items: List[LeadLite]) -> List[Dict[str, Any]]:
    """
    Hybrid rules + LLM re-rank & explanation via LangChain. Supports both OpenAI and Gemini.
    """
    # Compute deterministic base scores
    base: List[Dict[str, Any]] = []
    for l in items:
        score, reasons, next_action = _rule_score(l)
        base.append({"id": l.id, "score": score, "reasons": reasons, "next_action": next_action})
    if not base:
        return []

    # If no AI models available, return normalized rules-only ranking
    if ACTIVE_MODEL == "none":
        max_score = max(x["score"] for x in base) or 1.0
        for x in base:
            x["score"] = round((x["score"] / max_score) * 100.0, 1)
        return sorted(base, key=lambda x: x["score"], reverse=True)

    # Prepare LLM based on available model
    try:
        if ACTIVE_MODEL == "openai" and OPENAI_API_KEY:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model=OPENAI_MODEL, temperature=0.2, api_key=OPENAI_API_KEY)
            print(f"🤖 Using OpenAI model: {OPENAI_MODEL}")
        elif ACTIVE_MODEL == "gemini" and GEMINI_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
                temperature=0.2,
                google_api_key=GEMINI_API_KEY
            )
            print(f"🤖 Using Gemini model: {GEMINI_MODEL}")
        else:
            raise Exception(f"No valid AI model available. Active: {ACTIVE_MODEL}")

        # Use LangChain prompts and LLM
        from langchain_core.prompts import ChatPromptTemplate
        from pathlib import Path
        
        schema = Path(__file__).resolve().parents[1] / "schema" / "LEADS_SCHEMA.md"
        triage_prompt_path = Path(__file__).resolve().parents[1] / "prompts" / "leads_triage.md"
        
        if not schema.exists() or not triage_prompt_path.exists():
            print("⚠️  Prompt files not found, using rules-only fallback")
            raise Exception("Prompt files missing")
            
        schema_text = schema.read_text(encoding="utf-8")
        prompt_text = triage_prompt_path.read_text(encoding="utf-8")
        prompt = ChatPromptTemplate.from_template(prompt_text)

        features = [
            {
                "id": x["id"],
                "lead_score": next((l.lead_score for l in items if l.id == x["id"]), 0),
                "last_activity_at": next((l.last_activity_at.isoformat() if l.last_activity_at else None for l in items if l.id == x["id"]), None),
            }
            for x in base
        ]
        
        messages = prompt.format_messages(schema=schema_text, leads=json.dumps(features))
        resp = await llm.ainvoke(messages)
        text = resp.content if hasattr(resp, "content") else str(resp)
        
        # Parse and validate response
        try:
            parsed = json.loads(text)
            # Ensure required fields and coerce scoring range
            for it in parsed:
                if "score" in it:
                    s = float(it["score"]) if it["score"] is not None else 0.0
                    it["score"] = max(0.0, min(100.0, round(s, 1)))
                it.setdefault("reasons", [])
                it.setdefault("next_action", "follow_up")
            # Fallback merge with base if ids missing
            by_id = {it["id"]: it for it in parsed if it.get("id") is not None}
            merged = []
            for b in base:
                merged.append(by_id.get(b["id"], {**b, "score": round((b["score"]/max(1.0, max(x["score"] for x in base)))*100.0, 1)}))
            return sorted(merged, key=lambda x: x["score"], reverse=True)
        except Exception as e:
            print(f"⚠️  JSON parsing failed: {e}, using rules-only fallback")
            raise e
            
    except Exception as e:
        print(f"⚠️  AI model failed: {e}, using rules-only fallback")
        # Fallback to rules-only if AI fails
        max_score = max(x["score"] for x in base) or 1.0
        for x in base:
            x["score"] = round((x["score"] / max_score) * 100.0, 1)
        return sorted(base, key=lambda x: x["score"], reverse=True)
```

#### **Email Composition Function**
```python
async def compose_outreach(leads: List[LeadLite], intent: str, user_prompt: Optional[str] = None, content: Optional[str] = None) -> Dict[str, Any]:
    """Compose an outreach email using AI (OpenAI or Gemini), with JSON output contract."""
    
    if ACTIVE_MODEL == "none":
        # Fallback template logic
        first = leads[0] if leads else None
        subject = {
            "book_interview": "Next step: schedule your interview",
            "nurture": "Quick update from Bridge",
            "reengage": "Checking in – still interested?",
            "grammar_check": "Grammar check completed",
            "custom": "Custom email assistance"
        }.get(intent, "Hello from Bridge")
        greeting = f"Hi {first.name.split(' ')[0] if first and first.name else 'there'},"
        body = f"{greeting}\n\nWe'd love to help you take the next step."
        return {"subject": subject, "body": body, "merge_fields": ["first_name"]}

    try:
        # Prepare LLM based on available model
        if ACTIVE_MODEL == "openai" and OPENAI_API_KEY:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(model=OPENAI_MODEL, temperature=0.4, api_key=OPENAI_API_KEY)
            print(f"🤖 Composing email with OpenAI: {OPENAI_MODEL}")
        elif ACTIVE_MODEL == "gemini" and GEMINI_API_KEY:
            from langchain_google_genai import ChatGoogleGenerativeAI
            llm = ChatGoogleGenerativeAI(
                model=GEMINI_MODEL,
                temperature=0.4,
                google_api_key=GEMINI_API_KEY
            )
            print(f"🤖 Composing email with Gemini: {GEMINI_MODEL}")
        else:
            raise Exception(f"No valid AI model available. Active: {ACTIVE_MODEL}")

        # Enforce structured JSON output
        llm_structured = llm.with_structured_output(EmailDraftModel)
        
        from langchain_core.prompts import ChatPromptTemplate
        from pathlib import Path
        
        schema = Path(__file__).resolve().parents[1] / "schema" / "LEADS_SCHEMA.md"
        prompt_path = Path(__file__).resolve().parents[1] / "prompts" / "outreach_compose.md"
        
        if not schema.exists() or not prompt_path.exists():
            print("⚠️  Prompt files not found, using template fallback")
            raise Exception("Prompt files missing")
            
        schema_text = schema.read_text(encoding="utf-8")
        prompt_text = prompt_path.read_text(encoding="utf-8")
        prompt = ChatPromptTemplate.from_template(prompt_text)
        
        leads_summary = ", ".join([l.name for l in leads[:3]]) + (" and others" if len(leads) > 3 else "")
        
        inputs: Dict[str, Any] = {"schema": schema_text, "intent": intent, "leads_summary": leads_summary}
        # Always include optional fields, using empty strings if not provided
        inputs["user_prompt"] = user_prompt or ""
        inputs["content"] = content or ""
        
        chain = prompt | llm_structured
        draft: EmailDraftModel = await chain.ainvoke(inputs)
        return draft.model_dump()
        
    except Exception as e:
        print(f"⚠️  AI composition failed: {e}, using template fallback")
        # Fallback to simple template
        first = leads[0] if leads else None
        subject = {
            "book_interview": "Next step: schedule your interview",
            "nurture": "Quick update from Bridge",
            "reengage": "Checking in – still interested?",
            "grammar_check": "Grammar check completed",
            "custom": "Custom email assistance"
        }.get(intent, "Hello from Bridge")
        
        greeting = f"Hi {first.name.split(' ')[0] if first and first.name else 'there'},"
        body = f"{greeting}\n\nWe'd love to help you take the next step."
        return {"subject": subject, "body": body, "merge_fields": ["first_name"]}
```

### **3. Router Implementation (`backend/app/routers/ai_leads.py`)**
```python
@router.post("/triage")
async def triage(payload: Dict[str, Any]):
    if not AI_LEADS_ENABLED:
        raise HTTPException(status_code=404, detail="AI leads is disabled")
    filters = payload.get("filters", {})
    t0 = time.time()
    
    try:
        # Use AI-enhanced triage if available, otherwise fall back to rules
        leads = await sql_query_leads(filters)
        
        try:
            # Try AI-enhanced triage first
            from app.ai.tools.leads import leads_triage
            scored = await leads_triage(leads)
            print("🤖 AI triage completed successfully")
        except Exception as e:
            print(f"⚠️ AI triage failed: {e}, falling back to rules-only")
            # Fallback to rules-only scoring
            scored = []
            for lead in leads:
                score, reasons, next_action = _rule_score(lead)
                scored.append({
                    "id": lead.id,
                    "score": round(score, 1),
                    "reasons": reasons,
                    "next_action": next_action
                })
            # Sort by score desc
            scored.sort(key=lambda x: x["score"], reverse=True)
        
        # Extract top reasons from the scored leads
        all_reasons = []
        for item in scored:
            all_reasons.extend(item["reasons"])
        
        # Get most common reasons
        from collections import Counter
        reason_counts = Counter(all_reasons)
        top_reasons = [reason for reason, count in reason_counts.most_common(3)]
        
        summary = {
            "cohort_size": len(leads),
            "top_reasons": top_reasons if top_reasons else ["High lead scores", "Recent activity", "Strong engagement"]
        }
        
        ms = int((time.time() - t0) * 1000)
        await log_ai_event("leads.triage", {"rows": len(scored), "latency_ms": ms})
        return {"summary": summary, "items": scored, "latency_ms": ms}
        
    except Exception as e:
        # Ultimate fallback
        print(f"AI triage error: {e}")
        return {
            "summary": {"cohort_size": 0, "top_reasons": ["System error"]},
            "items": [],
            "latency_ms": int((time.time() - t0) * 1000)
        }

@router.post("/compose/outreach")
async def compose_outreach_ep(payload: Dict[str, Any]):
    if not AI_LEADS_ENABLED:
        raise HTTPException(status_code=404, detail="AI leads is disabled")
    intent = payload.get("intent", "nurture")
    lead_ids = payload.get("lead_ids") or []
    filters = payload.get("filters") or {}
    user_prompt = payload.get("user_prompt")
    content = payload.get("content")
    leads: list[LeadLite]
    if lead_ids:
        # Minimal fetch: use existing view and filter by ids (string uuid/text)
        rows = await pg_fetch_ids(lead_ids)
        leads = [LeadLite(**r) for r in rows]
    else:
        leads = await sql_query_leads(filters)
    t0 = time.time()
    draft = await compose_outreach_tool(leads, intent, user_prompt, content)
    ms = int((time.time() - t0) * 1000)
    await log_ai_event("compose.outreach", {"rows": len(leads), "latency_ms": ms, "intent": intent})
    return draft
```

## 🔑 **Environment Variables (.env)**

```bash
# AI Configuration
AI_LEADS_ENABLED=true
AI_MODEL_PROVIDER=gemini

# OpenAI (optional)
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-3.5-turbo

# Gemini (recommended - free tier)
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-1.5-flash

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]
```

## 🧪 **Testing the Implementation**

### **Test AI Triage**
```bash
curl -X POST "http://127.0.0.1:8000/ai/leads/triage" \
  -H "Content-Type: application/json" \
  -d '{"filters": {"status": "new"}}'
```

### **Test Email Composition**
```bash
curl -X POST "http://127.0.0.1:8000/ai/leads/compose/outreach" \
  -H "Content-Type: application/json" \
  -d '{"lead_ids": ["lead-uuid"], "intent": "custom", "user_prompt": "Position our small class sizes"}'
```

## 🚨 **Troubleshooting (Only Use These Solutions)**

### **Error: "Expected a Runnable, callable or dict"**
- **Cause**: Custom wrapper instead of LangChain integration
- **Solution**: Use `from langchain_google_genai import ChatGoogleGenerativeAI`

### **Error: "ForwardRef._evaluate() missing 1 required keyword-only argument"**
- **Cause**: Pydantic version conflicts
- **Solution**: Use exact dependency versions specified above

### **Error: "No module named 'langchain_google_genai'"**
- **Cause**: Missing dependency
- **Solution**: Run `pip install "langchain-google-genai>=0.1.0"`

## 📚 **Key Principles (NEVER DEVIATE)**

1. **LangChain is the substrate** - Always use LangChain for orchestration
2. **Native integrations only** - Never create custom wrappers
3. **Structured output** - Always use `with_structured_output` with Pydantic models
4. **Graceful fallbacks** - Rules-based fallback when AI unavailable
5. **Consistent error handling** - Log errors and fall back gracefully

## 🔒 **Preservation Commitment**

This implementation has been tested and proven to work. Any future changes must:
1. Maintain LangChain as the substrate
2. Use native integrations only
3. Preserve the fallback mechanisms
4. Maintain the same API interface
5. Test thoroughly before deployment

**This is the gospel. Follow it exactly.**
