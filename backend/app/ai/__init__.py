import os

# AI configuration surface
AI_LEADS_ENABLED = os.getenv("AI_LEADS_ENABLED", "true").lower() in ("1", "true", "yes", "on")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
LLM_MODEL = os.getenv("AI_MODEL", os.getenv("OPENAI_MODEL", "gpt-4o-mini"))

__all__ = [
    "AI_LEADS_ENABLED",
    "OPENAI_API_KEY",
    "LLM_MODEL",
]


