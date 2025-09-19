"""
Legacy database module for backward compatibility.
This module now delegates to the new database.py module.
"""

import os
import psycopg
from psycopg.rows import dict_row
import logging
import asyncio
import json
from typing import Optional
from contextlib import asynccontextmanager

log = logging.getLogger("db.legacy")

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

# Connection pool for legacy module
_connection_pool: Optional[psycopg.AsyncConnection] = None
_pool_lock = asyncio.Lock()

@asynccontextmanager
async def _get_connection():
    """Get a connection from the pool or create a new one."""
    global _connection_pool
    
    async with _pool_lock:
        if _connection_pool is None:
            dsn = _get_dsn()
            _connection_pool = await psycopg.AsyncConnection.connect(dsn)
            log.info("Created new database connection for legacy module")
    
    try:
        yield _connection_pool
    except Exception:
        # Reset connection on error
        _connection_pool = None
        raise

def _get_dsn():
    """Get DSN using the new database module."""
    try:
        from .database import get_sync_dsn
        return get_sync_dsn()
    except Exception as e:
        log.error("Failed to get DSN from new database module: %s", e)
        # Fallback to old logic
        dsn = _resolve_dsn()
        if not dsn:
            raise RuntimeError(
                "DATABASE_URL (or parts) not set. Create .env with:\n"
                "DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME"
            )
        return dsn

async def fetch(sql: str, *args):
    """Execute a SELECT query and return all rows as dictionaries."""
    try:
        # Sanitize args to ensure no dict objects
        sanitized_args = []
        for i, arg in enumerate(args):
            if isinstance(arg, dict):
                log.debug("Dict object found in fetch args at position %d: %s", i, arg)
                # Convert dict to proper JSON string
                sanitized_args.append(json.dumps(arg))
            elif isinstance(arg, list) and arg and isinstance(arg[0], dict):
                log.debug("List of dict objects found in fetch args at position %d: %s", i, arg)
                # Convert to list of JSON strings
                sanitized_args.append([json.dumps(item) for item in arg])
            else:
                sanitized_args.append(arg)
        
        async with _get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(sql, sanitized_args)
                return await cur.fetchall()
    except Exception as e:
        log.error("Database fetch error in legacy module: %s", e)
        log.error("SQL: %s", sql)
        log.error("Args: %s", args)
        log.error("Args types: %s", [type(arg).__name__ for arg in args])
        raise

async def fetchrow(sql: str, *args):
    """Execute a SELECT query and return the first row as a dictionary."""
    rows = await fetch(sql, *args)
    return rows[0] if rows else None

async def execute(sql: str, *args):
    """Execute a non-SELECT query (INSERT, UPDATE, DELETE)."""
    try:
        # Sanitize args to ensure no dict objects
        sanitized_args = []
        for i, arg in enumerate(args):
            if isinstance(arg, dict):
                log.debug("Dict object found in execute args at position %d: %s", i, arg)
                # Convert dict to proper JSON string
                sanitized_args.append(json.dumps(arg))
            elif isinstance(arg, list) and arg and isinstance(arg[0], dict):
                log.debug("List of dict objects found in execute args at position %d: %s", i, arg)
                # Convert to list of JSON strings
                sanitized_args.append([json.dumps(item) for item in arg])
            else:
                sanitized_args.append(arg)
        
        async with _get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, sanitized_args)
                await conn.commit()
    except Exception as e:
        log.error("Database execute error in legacy module: %s", e)
        log.error("SQL: %s", sql)
        log.error("Args: %s", args)
        log.error("Args types: %s", [type(arg).__name__ for arg in args])
        raise

async def execute_returning(sql: str, *args):
    """Execute a non-SELECT query with RETURNING clause and return the results."""
    try:
        # Sanitize args to ensure no dict objects
        sanitized_args = []
        for i, arg in enumerate(args):
            if isinstance(arg, dict):
                log.debug("Dict object found in execute_returning args at position %d: %s", i, arg)
                # Convert dict to proper JSON string
                sanitized_args.append(json.dumps(arg))
            elif isinstance(arg, list) and arg and isinstance(arg[0], dict):
                log.debug("List of dict objects found in execute_returning args at position %d: %s", i, arg)
                # Convert to list of JSON strings
                sanitized_args.append([json.dumps(item) for item in arg])
            else:
                sanitized_args.append(arg)
        
        async with _get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(sql, sanitized_args)
                result = await cur.fetchall()
                await conn.commit()
                return result
    except Exception as e:
        log.error("Database execute_returning error in legacy module: %s", e)
        log.error("SQL: %s", sql)
        log.error("Args: %s", args)
        log.error("Args types: %s", [type(arg).__name__ for arg in args])
        raise


