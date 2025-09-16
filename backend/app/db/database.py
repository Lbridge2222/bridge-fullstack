"""
Database engine and connection management for Bridge CRM API.
Provides both async SQLAlchemy engine and direct psycopg connections.
"""

import logging
import os
from typing import Optional
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy.exc import OperationalError
from sqlalchemy import text
import psycopg
from psycopg.rows import dict_row

log = logging.getLogger("db")

# Global engine instance
_engine: Optional[AsyncEngine] = None

def _validate_env():
    """Validate that required database environment variables are present."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is missing from environment.")
    return database_url

def _normalize_database_url(url: str) -> str:
    """
    Normalize database URL for async usage.
    Uses psycopg (which supports async) instead of asyncpg.
    """
    if url.startswith("postgres://"):
        # Convert postgres:// to postgresql+psycopg://
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and "+psycopg" not in url and "+asyncpg" not in url:
        # Add psycopg driver for async operations
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql+asyncpg"):
        # Convert asyncpg to psycopg since asyncpg is not installed
        url = url.replace("postgresql+asyncpg", "postgresql+psycopg", 1)
    
    return url

def get_engine() -> AsyncEngine:
    """Get or create the global async database engine."""
    global _engine
    
    if _engine is None:
        database_url = _validate_env()
        normalized_url = _normalize_database_url(database_url)
        
        # Extract driver info for logging
        driver_info = normalized_url.split("://", 1)[0]
        log.info("Creating async engine (driver=%s)", driver_info)
        
        _engine = create_async_engine(
            normalized_url,
            pool_pre_ping=True,
            pool_size=10,  # Increased from 5 to 10
            max_overflow=20,  # Increased from 10 to 20
            pool_timeout=30,
            echo=False,  # Set to True for SQL debugging
            # Handle connection recovery gracefully
            pool_recycle=3600,  # Recycle connections every hour
        )
        
    return _engine

def get_sync_dsn() -> str:
    """
    Get a synchronous database DSN for psycopg connections.
    Converts async URL back to sync format.
    """
    database_url = _validate_env()
    
    # Remove async-specific parts
    sync_url = database_url.replace("+asyncpg", "").replace("+psycopg", "")
    if sync_url.startswith("postgres://"):
        sync_url = sync_url.replace("postgres://", "postgresql://", 1)
    
    return sync_url

async def test_database_connection() -> bool:
    """Test database connectivity using async engine."""
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1 as test"))
            test_value = result.scalar()
            return test_value == 1
    except Exception as e:
        log.error("Database connection test failed: %s", e)
        return False

# Legacy psycopg functions for backward compatibility
async def fetch(sql: str, *args):
    """Execute a SELECT query and return all rows as dictionaries."""
    dsn = get_sync_dsn()
    try:
        async with await psycopg.AsyncConnection.connect(dsn) as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(sql, args)
                return await cur.fetchall()
    except Exception as e:
        log.error("Database fetch error: %s", e)
        raise

async def fetchrow(sql: str, *args):
    """Execute a SELECT query and return the first row as a dictionary."""
    rows = await fetch(sql, *args)
    return rows[0] if rows else None

async def execute(sql: str, *args):
    """Execute a non-SELECT query (INSERT, UPDATE, DELETE)."""
    dsn = get_sync_dsn()
    try:
        async with await psycopg.AsyncConnection.connect(dsn) as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, args)
                await conn.commit()
    except Exception as e:
        log.error("Database execute error: %s", e)
        raise
