"""
Feature flags for AI system to enable/disable specific features
"""
import os
from typing import Dict, Any

class FeatureFlags:
    """Centralized feature flag management"""
    
    def __init__(self):
        self.flags = {
            "AI_COMPETITOR_KB_ENABLED": os.getenv("AI_COMPETITOR_KB_ENABLED", "true").lower() == "true",
            "AI_NBA_FALLBACK_ENABLED": os.getenv("AI_NBA_FALLBACK_ENABLED", "true").lower() == "true",
            "AI_PERSONA_REWRITE_ENABLED": os.getenv("AI_PERSONA_REWRITE_ENABLED", "true").lower() == "true",
            "AI_STAGE_TIMEOUTS_ENABLED": os.getenv("AI_STAGE_TIMEOUTS_ENABLED", "true").lower() == "true",
            "AI_CIRCUIT_BREAKER_ENABLED": os.getenv("AI_CIRCUIT_BREAKER_ENABLED", "true").lower() == "true",
        }
    
    def is_enabled(self, flag_name: str) -> bool:
        """Check if a feature flag is enabled"""
        return self.flags.get(flag_name, False)
    
    def get_all_flags(self) -> Dict[str, bool]:
        """Get all feature flags"""
        return self.flags.copy()
    
    def get_timeout_config(self) -> Dict[str, float]:
        """Get timeout configuration from environment"""
        return {
            "AI_TIMEOUT_SUGGESTIONS_MS": float(os.getenv("AI_TIMEOUT_SUGGESTIONS_MS", "2000")),
            "AI_TIMEOUT_NARRATE_MS": float(os.getenv("AI_TIMEOUT_NARRATE_MS", "2500")),
            "AI_TIMEOUT_RAG_MS": float(os.getenv("AI_TIMEOUT_RAG_MS", "1500")),
        }

# Global instance
feature_flags = FeatureFlags()
