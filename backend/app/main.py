import logging

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Bootstrap environment variables FIRST, before any other imports
from app.bootstrap_env import bootstrap_env
bootstrap_env()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Initialize settings after environment bootstrap
from app.core.settings import get_settings
settings = get_settings()

app = FastAPI(title="Bridge CRM API", version="0.1")

# Add request ID middleware
from app.middleware.request_id import RequestIDMiddleware
app.add_middleware(RequestIDMiddleware)

# Add rate limiting middleware
from app.middleware.rate_limit import rate_limiter
app.middleware("http")(rate_limiter)

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    print("🚀 Starting Bridge CRM API...")
    
    # Log AI configuration for debugging
    try:
        from app.ai import IVY_ORGANIC_ENABLED, AI_PARSER_ENABLED, AI_NARRATOR_ENABLED, OPENAI_API_KEY, GEMINI_API_KEY
        ai_config = {
            "AI_MODEL_PROVIDER": os.getenv("AI_MODEL_PROVIDER", "unknown"),
            "IVY_ORGANIC_ENABLED": IVY_ORGANIC_ENABLED,
            "AI_PARSER_ENABLED": AI_PARSER_ENABLED,
            "AI_NARRATOR_ENABLED": AI_NARRATOR_ENABLED,
            "OPENAI_API_KEY": bool(OPENAI_API_KEY),
            "GEMINI_API_KEY": bool(GEMINI_API_KEY),
        }
        print(f"🤖 AI Configuration: {ai_config}")
    except Exception as e:
        print(f"⚠️  AI config logging failed: {e}")
    
    # Pre-warm ML model for faster first requests
    try:
        from app.ai.model_registry import load_active_model
        print("🔄 Pre-warming ML model...")
        model = load_active_model()
        print(f"✅ ML model pre-warmed: {model.version} (SHA256: {model.sha256[:8]}...)")
    except Exception as e:
        print(f"⚠️  ML model pre-warming failed: {e}")
        print("ℹ️  First ML request may be slower due to cold start")
    
    # Warm up narrate() cache for common modes
    try:
        import asyncio
        from app.ai.runtime import narrate, narrate_triage_bullets
        
        # Warm up cache with minimal calls
        warmup_tasks = [
            narrate("Tell me about this person", person={"name": "Test"}),
            narrate("What are the entry requirements?", kb_sources=[]),
            narrate_triage_bullets({"score": 0})
        ]
        
        # Run warmup in background
        asyncio.create_task(asyncio.gather(*warmup_tasks, return_exceptions=True))
        print("🔄 AI cache warmup initiated")
    except Exception as e:
        print(f"⚠️  AI cache warmup failed: {e}")
    
    print("✅ Application initialized")

# CORS for your Vite dev server
allow_origins = settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "name": app.title,
        "version": app.version,
        "routes": ["/healthz", "/people/"],
    }

@app.get("/healthz")
async def healthz():
    """
    Basic health check endpoint.
    Returns the application status and database connectivity.
    """
    try:
        from app.db.database import test_database_connection
        db_ok = await test_database_connection()
        
        return {
            "ok": db_ok,
            "app": "Bridge CRM API",
            "version": app.version,
            "database": "connected" if db_ok else "disconnected"
        }
    except Exception as e:
        # Log the full error but return minimal info to the client
        logging.getLogger("healthz").error("Health check failed: %s", e)
        return {
            "ok": False,
            "app": "Bridge CRM API", 
            "version": app.version,
            "error": "Database connection failed"
        }

# Routers
from app.routers.people import router as people_router
app.include_router(people_router, prefix="/people", tags=["people"])
from app.routers.crm import router as crm_router
app.include_router(crm_router, prefix="/crm", tags=["crm"])
from app.routers.applications import router as apps_router
app.include_router(apps_router, prefix="/applications", tags=["applications"])
from app.routers.events import router as events_router
app.include_router(events_router, prefix="/events", tags=["events"])
from app.routers.activities import router as activities_router
app.include_router(activities_router, prefix="/activities", tags=["activities"])
from app.routers.consents import router as consents_router
app.include_router(consents_router, tags=["consents"])
from app.routers.dashboard import router as dashboard_router
app.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
from app.routers.offers import router as offers_router
app.include_router(offers_router, prefix="/offers", tags=["offers"])
from app.routers.properties import router as properties_router
app.include_router(properties_router, tags=["properties"])

# Health monitoring
from app.routers.health import router as health_router
app.include_router(health_router, tags=["health"])

# AI routers
try:
	from app.routers.ai_leads import router as ai_leads_router
	app.include_router(ai_leads_router)
except Exception:
    # Allow app to start if optional AI deps missing
    pass

# Adaptive triage router (ML-optimised lead scoring)
try:
    from app.ai.triage import router as triage_router
    app.include_router(triage_router)
except Exception as e:
    print(f"❌ Failed to load triage router: {e}")

# Actions system (intelligent action recommendations)
try:
    from app.routers.actions import router as actions_router
    app.include_router(actions_router)
    print("✅ Actions system loaded")
except Exception as e:
    print(f"❌ Failed to load actions router: {e}")
    # Allow app to start if optional AI deps missing
    pass

# Forecasting router (Phase 2.1)
try:
    from app.ai.forecast import router as forecast_router
    app.include_router(forecast_router)
except Exception as e:
    print(f"❌ Failed to load forecast router: {e}")
    pass

# Source Analytics router (Phase 2.2)
try:
    from app.ai.source_analytics import router as source_analytics_router
    app.include_router(source_analytics_router)
except Exception as e:
    print(f"❌ Failed to load source analytics router: {e}")
    pass

# Anomaly Detection router (Phase 2.3)
try:
    from app.ai.anomaly_detection import router as anomaly_detection_router
    app.include_router(anomaly_detection_router)
except Exception as e:
    print(f"❌ Failed to load anomaly detection router: {e}")
    pass

# ML Models router (Phase 2.4)
try:
    from app.ai.ml_models import router as ml_models_router
    app.include_router(ml_models_router)
except Exception as e:
    print(f"❌ Failed to load ML models router: {e}")
    pass

# Segmentation router (Phase 3.1)
try:
    from app.ai.segmentation import router as segmentation_router
    app.include_router(segmentation_router)
except Exception as e:
    print(f"❌ Failed to load segmentation router: {e}")
    pass

# Cohort Scoring router (Phase 3.2)
try:
    from app.ai.cohort_scoring import router as cohort_scoring_router
    app.include_router(cohort_scoring_router)
except Exception as e:
    print(f"❌ Failed to load cohort scoring router: {e}")
    pass

# Cohort Performance router (Phase 3.4)
try:
    from app.ai.cohort_performance import router as cohort_performance_router
    app.include_router(cohort_performance_router)
except Exception as e:
    print(f"❌ Failed to load cohort performance router: {e}")
    pass

# Natural Language Queries router (Phase 4.1)
try:
    from app.ai.natural_language import router as natural_language_router
    app.include_router(natural_language_router)
except Exception as e:
    print(f"❌ Failed to load natural language router: {e}")
    pass

# RAG Streaming router (Performance Optimization)
try:
    from app.routers.rag_streaming import router as rag_streaming_router
    app.include_router(rag_streaming_router)
    print("✅ RAG Streaming router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load RAG streaming router: {e}")
    pass

# People Optimized router (Contact Loading Performance)
try:
    from app.routers.people_optimized import router as people_optimized_router
    app.include_router(people_optimized_router, prefix="/people", tags=["people-optimized"])
    print("✅ People Optimized router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load People Optimized router: {e}")
    pass

# Applications Optimized router (Application Page Performance)
try:
    from app.routers.applications_optimized import router as applications_optimized_router
    app.include_router(applications_optimized_router, prefix="/applications", tags=["applications-optimized"])
    print("✅ Applications Optimized router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load Applications Optimized router: {e}")
    pass

# Advanced ML router (Phase 4.2) - Hardened Version (mounted first)
try:
    from app.ai.advanced_ml_hardened import router as advanced_ml_hardened_router
    app.include_router(advanced_ml_hardened_router, tags=["advanced-ml (hardened)"])
    print("✅ Advanced ML (hardened) router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load advanced ML (hardened) router: {e}")
    pass

# Advanced ML router (Phase 4.2) - Legacy (for backward compatibility)
# Can be disabled in production with AI_ENABLE_LEGACY_ADVANCED_ML=false
if os.getenv("AI_ENABLE_LEGACY_ADVANCED_ML", "true").lower() == "true":
    try:
        from app.ai.advanced_ml import router as advanced_ml_legacy_router
        app.include_router(advanced_ml_legacy_router, prefix="/ai/advanced-ml-legacy", tags=["advanced-ml (legacy)"])
        print("✅ Advanced ML (legacy) router loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load advanced ML (legacy) router: {e}")
        pass
else:
    print("ℹ️  Advanced ML (legacy) router disabled via environment variable")

# Application Intelligence ML router (Application Progression Prediction)
try:
    from app.ai.application_ml import router as application_ml_router
    app.include_router(application_ml_router)
    print("✅ Application Intelligence ML router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load application intelligence ML router: {e}")
    pass

# AI Chat router (Phase 4.2 - Gemini Integration)
try:
    from app.routers.ai_chat import router as ai_chat_router
    app.include_router(ai_chat_router)
except Exception as e:
    print(f"❌ Failed to load AI chat router: {e}")
    pass

# Predictive Analytics router (Phase 4.4 - Dashboard Data Integration)
try:
    from app.routers.predictive_analytics import router as predictive_analytics_router
    app.include_router(predictive_analytics_router)
except Exception as e:
    print(f"❌ Failed to load predictive analytics router: {e}")
    pass

# PII Redaction router (Phase 5.1 - Enhanced PII Redaction & GDPR Compliance)
try:
    from app.routers.pii_redaction import router as pii_redaction_router
    app.include_router(pii_redaction_router)
    print("✅ PII Redaction router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load PII redaction router: {e}")
    pass

# User Management router (Phase 5.2 - Advanced User Management & RBAC)
try:
    from app.routers.user_management import router as user_management_router
    app.include_router(user_management_router)
    print("✅ User Management router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load user management router: {e}")
    pass

# Optimization router (Phase 5.3 - API Rate Limiting & Optimization)
try:
    from app.routers.optimization import router as optimization_router
    app.include_router(optimization_router)
    print("✅ Optimization router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load optimization router: {e}")
    pass

# Security router (Phase 5.4 - Advanced Security & Compliance)
try:
    from app.routers.security import router as security_router
    app.include_router(security_router)
    print("✅ Security router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load security router: {e}")
    pass

# RAG router (Phase 6.1 - Ask Ivy Intelligence)
try:
    from app.routers.rag import router as rag_router
    app.include_router(rag_router)
    print("✅ RAG router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load RAG router: {e}")
    pass

# Applications AI router (Phase 6.2 - Application-specific AI Analysis)
try:
    from app.routers.applications_ai import router as applications_ai_router
    app.include_router(applications_ai_router)
    print("✅ Applications AI router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load Applications AI router: {e}")
    pass

# Applications Insights router (DB-grounded pipeline summaries)
try:
    from app.routers.applications_insights import router as applications_insights_router
    app.include_router(applications_insights_router)
    print("✅ Applications Insights router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load Applications Insights router: {e}")
    pass

# AI Router (Multi-step orchestration for Ask Ivy)
try:
    from app.routers.ai_router import router as ai_router_router
    app.include_router(ai_router_router)
    print("✅ AI Router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load AI Router: {e}")
    pass

# Calls router (Call Management & Tracking)
try:
    from app.routers.calls import router as calls_router
    app.include_router(calls_router)
    print("✅ Calls router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load calls router: {e}")
    pass

# Meetings router (Meeting Booking & Scheduling)
try:
    from app.routers.meetings import router as meetings_router
    app.include_router(meetings_router)
    print("✅ Meetings router loaded successfully")
except Exception as e:
    print(f"❌ Failed to load meetings router: {e}")
    pass

@app.get("/healthz/db")
async def healthz_db():
    """
    Detailed database health check endpoint.
    Tests both async engine and psycopg connections.
    """
    try:
        from app.db.database import test_database_connection, fetchrow
        
        # Test async engine
        engine_ok = await test_database_connection()
        
        # Test legacy psycopg connection
        psycopg_ok = False
        try:
            row = await fetchrow("SELECT 1 as ok")
            psycopg_ok = bool(row and row.get("ok") == 1)
        except Exception as e:
            logging.getLogger("healthz").error("Psycopg connection test failed: %s", e)
        
        overall_ok = engine_ok and psycopg_ok
        
        return {
            "ok": overall_ok,
            "engine": "connected" if engine_ok else "disconnected", 
            "psycopg": "connected" if psycopg_ok else "disconnected"
        }
    except Exception as e:
        logging.getLogger("healthz").error("Database health check failed: %s", e)
        return {"ok": False, "error": "Database health check failed"}
