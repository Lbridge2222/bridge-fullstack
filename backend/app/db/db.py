import os, psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv, find_dotenv

# Load env from multiple likely locations so local setups work reliably
# 1) nearest .env from current working dir (uvicorn)
load_dotenv(find_dotenv(), override=False)
# 2) backend/.env and 3) backend/db/.env relative to this file
_here = os.path.abspath(os.path.dirname(__file__))               # backend/app/db
_backend_dir = os.path.abspath(os.path.join(_here, "..", "..")) # backend/
_backend_env = os.path.join(_backend_dir, ".env")
_backend_db_env = os.path.join(_backend_dir, "db", ".env")
for _p in (_backend_env, _backend_db_env):
    if os.path.exists(_p):
        load_dotenv(_p, override=False)

def _build_dsn_from_parts() -> str:
    host = (
        os.getenv("DATABASE_HOST")
        or os.getenv("DB_HOST")
        or os.getenv("POSTGRES_HOST")
        or os.getenv("PGHOST")
        or ""
    )
    port = (
        os.getenv("DATABASE_PORT")
        or os.getenv("DB_PORT")
        or os.getenv("POSTGRES_PORT")
        or os.getenv("PGPORT")
        or "5432"
    )
    name = (
        os.getenv("DATABASE_NAME")
        or os.getenv("DB_NAME")
        or os.getenv("POSTGRES_DB")
        or os.getenv("PGDATABASE")
        or ""
    )
    user = (
        os.getenv("DATABASE_USER")
        or os.getenv("DB_USER")
        or os.getenv("POSTGRES_USER")
        or os.getenv("PGUSER")
        or ""
    )
    password = (
        os.getenv("DATABASE_PASSWORD")
        or os.getenv("DB_PASSWORD")
        or os.getenv("POSTGRES_PASSWORD")
        or os.getenv("PGPASSWORD")
        or ""
    )
    if not host or not name or not user:
        return ""
    auth = user if not password else f"{user}:{password}"
    return f"postgresql://{auth}@{host}:{port}/{name}"

def _resolve_dsn() -> str:
    dsn = os.getenv("DATABASE_URL", "")
    dsn = dsn.replace("postgresql+psycopg", "postgresql")
    if dsn:
        return dsn
    # Fall back to parts if full URL not provided
    return _build_dsn_from_parts()

DSN = _resolve_dsn()
if not DSN:
    raise RuntimeError(
        "DATABASE_URL (or parts) not set. Create backend/.env or backend/db/.env with either:\n"
        "DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME\n"
        "or DATABASE_HOST/PORT/NAME/USER/PASSWORD values."
    )

async def fetch(sql: str, *args):
    async with await psycopg.AsyncConnection.connect(DSN) as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(sql, args)
            return await cur.fetchall()

async def fetchrow(sql: str, *args):
    rows = await fetch(sql, *args)
    return rows[0] if rows else None

async def execute(sql: str, *args):
    async with await psycopg.AsyncConnection.connect(DSN) as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, args)
            await conn.commit()


