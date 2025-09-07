from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# load .env
load_dotenv()

app = FastAPI(title="Bridge CRM API", version="0.1")

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    print("🚀 Starting Bridge CRM API...")
    print("✅ Application initialized")

# CORS for your Vite dev server
origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:3000")
allow_origins = [o.strip() for o in origins_env.split(",") if o.strip()]

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
    return {"ok": True}

# Routers
from app.routers.people import router as people_router
app.include_router(people_router, prefix="/people", tags=["people"])
from app.routers.applications import router as apps_router
app.include_router(apps_router, prefix="/applications", tags=["applications"])
from app.routers.events import router as events_router
app.include_router(events_router, prefix="/events", tags=["events"])
from app.routers.consents import router as consents_router
app.include_router(consents_router, tags=["consents"])
from app.routers.dashboard import router as dashboard_router
app.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
from app.routers.offers import router as offers_router
app.include_router(offers_router, prefix="/offers", tags=["offers"])
from app.routers.properties import router as properties_router
app.include_router(properties_router, tags=["properties"])

# AI routers
try:
	from app.routers.ai_leads import router as ai_leads_router
	app.include_router(ai_leads_router)
except Exception:
    # Allow app to start if optional AI deps missing
    pass

# Adaptive triage router (ML-optimized lead scoring)
try:
    from app.ai.triage import router as triage_router
    app.include_router(triage_router)
except Exception as e:
    print(f"❌ Failed to load triage router: {e}")
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

# Advanced ML router (Phase 4.2)
try:
    from app.ai.advanced_ml import router as advanced_ml_router
    app.include_router(advanced_ml_router)
except Exception as e:
    print(f"❌ Failed to load advanced ML router: {e}")
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

@app.get("/healthz/db")
async def healthz_db():
    from app.db.db import fetchrow
    try:
        row = await fetchrow("select 1 as ok")
        return {"ok": bool(row and row.get("ok") == 1)}
    except Exception:
        return {"ok": False}