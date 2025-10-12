# 🔒 AI IMPLEMENTATION GOSPEL - Ivy – The Higher Education OS

**⚠️ THIS IS THE ONLY WORKING IMPLEMENTATION. DEVIATION WILL BREAK THE SYSTEM.**

## 📜 **Declaration of Gospel Truth**

This document enshrines the **ONLY** working AI integration for Ivy. It has been tested, proven, and documented. Any deviation from this implementation will result in system failure.

## 🎯 **Current Working State (PRESERVE AT ALL COSTS)**

### **✅ What Works**
1. **AI Triage** - Intelligent lead prioritization with Gemini
2. **Email Composition** - AI-powered email generation with custom prompts
3. **Grammar Check** - AI-powered text improvement
4. **Fallback Mechanisms** - Rules-based scoring when AI unavailable
5. **LangChain Integration** - Proper substrate orchestration

### **✅ What's Connected**
1. **Frontend** - All AI features properly wired
2. **Backend** - All endpoints functional
3. **Database** - Proper data flow
4. **Error Handling** - Graceful degradation

## 🚨 **ABSOLUTE RULES (NEVER BREAK)**

### **1. LangChain is the Substrate**
- **NEVER** bypass LangChain
- **NEVER** create custom wrappers
- **ALWAYS** use native integrations

### **2. Dependencies are Sacred**
```txt
langchain>=0.2.0
langchain-openai>=0.1.0
langchain-google-genai>=0.1.0
langgraph>=0.0.40
```

### **3. Implementation Pattern**
```python
# ALWAYS use this pattern for AI tools
from langchain_google_genai import ChatGoogleGenerativeAI
llm = ChatGoogleGenerativeAI(
    model=GEMINI_MODEL,
    temperature=0.4,
    google_api_key=GEMINI_API_KEY
)

# ALWAYS use structured output
llm_structured = llm.with_structured_output(EmailDraftModel)
```

### **4. Error Handling**
- **ALWAYS** log errors
- **ALWAYS** fall back gracefully
- **NEVER** crash the system

## 🔧 **File Preservation List**

These files contain the gospel implementation and must never be changed without thorough testing:

1. **`backend/app/ai/__init__.py`** - AI configuration
2. **`backend/app/ai/tools/leads.py`** - Core AI tools
3. **`backend/app/routers/ai_leads.py`** - API endpoints
4. **`backend/app/ai/prompts/`** - Prompt templates
5. **`backend/requirements.txt`** - Dependencies
6. **`frontend/src/components/Dashboard/CRM/LeadsManagement.tsx`** - Frontend integration
7. **`frontend/src/components/EmailComposer.tsx`** - Email AI features

## 📋 **Change Approval Process**

Before making ANY changes to AI implementation:

1. **Document the proposed change**
2. **Test in isolation**
3. **Verify no regression**
4. **Update this gospel document**
5. **Get approval from team**

## 🧪 **Validation Commands**

These commands must pass before any deployment:

```bash
# Test AI Triage
curl -X POST "http://127.0.0.1:8000/ai/leads/triage" \
  -H "Content-Type: application/json" \
  -d '{"filters": {"status": "new"}}'

# Test Email Composition
curl -X POST "http://127.0.0.1:8000/ai/leads/compose/outreach" \
  -H "Content-Type: application/json" \
  -d '{"lead_ids": ["test-uuid"], "intent": "custom", "user_prompt": "Test prompt"}'
```

## 🚫 **Forbidden Actions**

1. **Creating custom AI wrappers**
2. **Bypassing LangChain**
3. **Changing dependency versions without testing**
4. **Removing fallback mechanisms**
5. **Changing the API interface**

## ✅ **What's Allowed**

1. **Updating prompts** (with testing)
2. **Adding new AI features** (following the pattern)
3. **Performance optimizations** (without breaking functionality)
4. **Bug fixes** (with regression testing)

## 🔍 **Debugging Protocol**

When AI breaks:

1. **Check this gospel document first**
2. **Verify dependencies match exactly**
3. **Check environment variables**
4. **Test with curl commands above**
5. **Check backend logs**
6. **Revert to last working state**

## 📚 **Reference Implementation**

The working implementation is documented in:
- **`backend/README_AI_SETUP.md`** - Complete setup guide
- **`backend/app/ai/tools/leads.py`** - Working code examples
- **This document** - Gospel rules

## 🎯 **Success Metrics**

The system is working when:
1. **AI Triage returns scored leads**
2. **Email Composition generates proper emails**
3. **Custom prompts are honored**
4. **Grammar check improves text**
5. **Fallbacks work when AI unavailable**

## 🔒 **Preservation Commitment**

**I, [Your Name], commit to preserving this AI implementation as gospel truth.**

**I will:**
- Never deviate from the documented pattern
- Always test changes thoroughly
- Preserve fallback mechanisms
- Maintain LangChain as substrate
- Document any necessary changes

**I understand that breaking this implementation will:**
- Break the entire AI system
- Require significant debugging time
- Impact user experience
- Require reverting to this working state

---

**This is the gospel. Follow it exactly. Preserve it at all costs.**

**Last Updated:** [Current Date]
**Status:** ✅ WORKING - PRESERVE
**Next Review:** [Date + 30 days]
