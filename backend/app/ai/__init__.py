import os
from typing import Literal
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# AI Feature Flags
AI_LEADS_ENABLED = os.getenv("AI_LEADS_ENABLED", "true").lower() == "true"
AI_PARSER_ENABLED = os.getenv("AI_PARSER_ENABLED", "true").lower() == "true"
AI_NARRATOR_ENABLED = os.getenv("AI_NARRATOR_ENABLED", "true").lower() == "true"
IVY_ORGANIC_ENABLED = os.getenv("IVY_ORGANIC_ENABLED", "true").lower() == "true"

# AI Performance Settings
# Unified budgets: main conversational 6–8s, helpers 2–4s (defaults 7000 / 3000)
AI_TIMEOUT_MAIN_MS = int(os.getenv("AI_TIMEOUT_MAIN_MS", "7000"))
AI_TIMEOUT_HELPER_MS = int(os.getenv("AI_TIMEOUT_HELPER_MS", "3000"))
AI_TIMEOUT_MS = int(os.getenv("AI_TIMEOUT_MS", str(AI_TIMEOUT_MAIN_MS)))
AI_CACHE_TTL_S = int(os.getenv("AI_CACHE_TTL_S", "900"))

# Model Selection - Support both OpenAI and Gemini
AI_MODEL_PROVIDER = os.getenv("AI_MODEL_PROVIDER", "gemini").lower()  # "openai" or "gemini"

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

# Gemini Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# CRITICAL: Pin to -001 version to prevent Google remapping to Gemini 2.5 Pro (paid)
# Versionless aliases are remapped to expensive Pro models by Google's API
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-001")

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


# Log Gemini mode to detect accidental Vertex routing
import logging
log = logging.getLogger("env")
log.info(
    "Gemini mode: api_key=%s, vertex_project=%s, vertex_location=%s",
    bool(os.getenv("GEMINI_API_KEY")),
    os.getenv("VERTEXAI_PROJECT"),
    os.getenv("VERTEXAI_LOCATION"),
)


