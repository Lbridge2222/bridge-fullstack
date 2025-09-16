"""
Centralized settings configuration for Bridge CRM API.
Uses Pydantic BaseSettings for robust environment variable handling.
"""

from pydantic_settings import BaseSettings
from pydantic import AnyUrl, Field
from typing import Optional
import os

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application configuration
    APP_ENV: str = Field(default="development", description="Application environment")
    SECRET_KEY: Optional[str] = Field(default=None, description="Secret key for JWT tokens")
    
    # Database configuration  
    DATABASE_URL: AnyUrl = Field(..., description="Database connection URL")
    
    # CORS configuration
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:3000",
        description="Comma-separated list of allowed CORS origins"
    )
    
    # AI Features
    AI_LEADS_ENABLED: bool = Field(default=True, description="Enable AI leads functionality")
    AI_ENABLE_LEGACY_ADVANCED_ML: bool = Field(default=True, description="Enable legacy advanced ML router")
    
    # API Keys (optional, for AI features)
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API key")
    GOOGLE_API_KEY: Optional[str] = Field(default=None, description="Google/Gemini API key")
    
    class Config:
        # Don't use env_file here - we handle .env loading in bootstrap_env.py
        env_file = None
        case_sensitive = True
        
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins into a list."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

# Global settings instance
# This will be populated after environment bootstrap
settings: Optional[Settings] = None

def get_settings() -> Settings:
    """Get the global settings instance, initializing if needed."""
    global settings
    if settings is None:
        try:
            settings = Settings()
        except Exception as e:
            # Log the error but provide minimal fallback to prevent total failure
            import logging
            log = logging.getLogger("settings")
            log.error("Failed to initialize settings: %s", e)
            
            # Check if DATABASE_URL is available at least
            if not os.getenv("DATABASE_URL"):
                raise RuntimeError("DATABASE_URL is required but not found in environment")
            
            # Create minimal settings with just DATABASE_URL
            import tempfile
            os.environ.setdefault("SECRET_KEY", "temp-key-for-startup")
            settings = Settings()
            
    return settings
