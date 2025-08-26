import os
from typing import Literal
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# AI Feature Flags
AI_LEADS_ENABLED = os.getenv("AI_LEADS_ENABLED", "true").lower() == "true"

# Model Selection - Support both OpenAI and Gemini
AI_MODEL_PROVIDER = os.getenv("AI_MODEL_PROVIDER", "gemini").lower()  # "openai" or "gemini"

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

# Gemini Configuration  
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-pro")

# Fallback Logic
def get_available_models() -> list[str]:
    """Get list of available AI models based on API keys."""
    models = []
    if OPENAI_API_KEY:
        models.append("openai")
    if GEMINI_API_KEY:
        models.append("gemini")
    return models

def get_default_model() -> str:
    """Get the default model to use."""
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

print(f"🤖 AI Configuration:")
print(f"   - AI Leads Enabled: {AI_LEADS_ENABLED}")
print(f"   - Available Models: {get_available_models()}")
print(f"   - Active Model: {ACTIVE_MODEL}")
if ACTIVE_MODEL == "none":
    print(f"   - ⚠️  No AI models available - will use rule-based fallbacks")
elif ACTIVE_MODEL == "gemini":
    print(f"   - 🆓 Using Gemini (free tier)")
elif ACTIVE_MODEL == "openai":
    print(f"   - 💰 Using OpenAI (paid)")


