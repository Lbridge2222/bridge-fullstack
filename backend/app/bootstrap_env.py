"""
Environment bootstrapping for the Bridge CRM API.
This module must be imported first to ensure .env files are loaded before any other modules.
"""

from dotenv import load_dotenv, find_dotenv
import os
import logging

def bootstrap_env():
    """
    Bootstrap environment variables with robust .env loading.
    Uses find_dotenv to handle various working directory scenarios.
    """
    log = logging.getLogger("env")
    
    try:
        # Find .env file using find_dotenv with usecwd=True to handle different working directories
        dotenv_path = find_dotenv(usecwd=True)
        loaded = load_dotenv(dotenv_path) if dotenv_path else False
        
        log.info("dotenv found=%s loaded=%s path=%s", bool(dotenv_path), loaded, dotenv_path or "N/A")
        
        # Check presence of critical environment variables (never log values)
        critical = ["DATABASE_URL", "APP_ENV", "SECRET_KEY"]
        presence = {k: (os.getenv(k) is not None) for k in critical}
        log.info("env presence: %s", presence)
        
        # Additional fallback paths for different deployment scenarios
        fallback_paths = [
            ".env",
            "backend/.env", 
            "../.env",
            "../../.env"
        ]
        
        # If no .env found via find_dotenv, try fallback paths
        if not dotenv_path:
            for path in fallback_paths:
                if os.path.exists(path):
                    try:
                        load_dotenv(path)
                        log.info("Loaded fallback .env from: %s", path)
                        break
                    except Exception as e:
                        log.warning("Failed to load fallback .env from %s: %s", path, e)
        
        # Final verification of critical variables
        missing_critical = [k for k in critical if not os.getenv(k)]
        if missing_critical:
            log.warning("Missing critical environment variables: %s", missing_critical)
            
    except Exception as e:
        log.exception("Failed to load .env: %s", e)
        # Don't raise here - let the application start and fail gracefully later
