from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# load .env
load_dotenv()

app = FastAPI(title="Bridge CRM API", version="0.1")

# CORS for your Vite dev server
origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000")
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

# AI routers
try:
	from app.routers.ai_leads import router as ai_leads_router
	app.include_router(ai_leads_router)
except Exception:
    # Allow app to start if optional AI deps missing
    pass

@app.get("/healthz/db")
async def healthz_db():
    from app.db.db import fetchrow
    try:
        row = await fetchrow("select 1 as ok")
        return {"ok": bool(row and row.get("ok") == 1)}
    except Exception:
        return {"ok": False}