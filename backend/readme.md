# Ivy Backend (FastAPI)

## Quickstart
1. Create `.env` from `.env.example` and set `DATABASE_URL` (your Supabase project's Postgres connection string) and optional `CORS_ORIGINS`.
2. Install dependencies with your preferred manager, e.g. `pip install -r requirements.txt`.
3. Run the API: `uvicorn app.main:app --reload`.
4. Health check at `/healthz`. People listing at `/people/`.