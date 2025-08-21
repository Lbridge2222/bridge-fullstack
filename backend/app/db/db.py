import os, psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()
DSN = os.getenv("DATABASE_URL", "")
# safety if someone uses driver prefix by habit
DSN = DSN.replace("postgresql+psycopg", "postgresql")

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


