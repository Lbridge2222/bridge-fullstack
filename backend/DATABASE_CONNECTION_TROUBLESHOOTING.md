# Database Connection Troubleshooting Guide

## 🚨 **Critical Issues Fixed & Prevention Guide**

This document outlines the database connection issues encountered and solutions implemented to prevent future occurrences.

---

## 📋 **Issue Summary**

**Problem**: Backend returning 500 errors due to database connection failures and environment loading issues.

**Root Causes Identified**:
1. ❌ **Environment loading order** - `.env` loaded too late in application startup
2. ❌ **Missing dependencies** - `pydantic-settings` and `greenlet` not installed
3. ❌ **Supabase URL encoding** - Password contained `@` symbol that wasn't properly encoded
4. ❌ **Poor error handling** - Raw tracebacks exposed to clients

---

## 🔧 **Solutions Implemented**

### 1. **Robust Environment Bootstrap System**

**Created**: `backend/app/bootstrap_env.py`
```python
# Bootstrap environment variables FIRST, before any other imports
from app.bootstrap_env import bootstrap_env
bootstrap_env()
```

**Benefits**:
- ✅ Handles different working directories using `find_dotenv(usecwd=True)`
- ✅ Provides fallback paths for various deployment scenarios
- ✅ Logs environment variable presence without exposing secrets
- ✅ Loads `.env` before Pydantic settings initialization

### 2. **Centralized Settings Management** 

**Created**: `backend/app/core/settings.py`
```python
from pydantic_settings import BaseSettings  # Fixed import for Pydantic v2
```

**Benefits**:
- ✅ Type-safe environment variable handling
- ✅ Proper defaults and validation
- ✅ Single source of truth for configuration

### 3. **Robust Database Engine**

**Created**: `backend/app/db/database.py`
```python
def get_engine() -> AsyncEngine:
    # Validates environment early with fail-fast checks
    # Uses psycopg (installed) instead of asyncpg (not installed)
```

**Benefits**:
- ✅ Early validation of database credentials
- ✅ Proper connection pooling and recovery
- ✅ Compatible with existing psycopg installation

### 4. **Enhanced Error Handling**

**Updated**: `backend/app/routers/people.py`
```python
except Exception as e:
    # Log full error details server-side (safe for debugging)
    log.error("Database error in /people/leads: %s", str(e))
    
    # Return generic error to client (no sensitive details)
    raise HTTPException(status_code=500, detail="Failed to fetch leads data. Check server logs for details.")
```

**Benefits**:
- ✅ Detailed server-side logging for debugging
- ✅ Generic client responses (no credential exposure)
- ✅ Structured error information

---

## 🎯 **Supabase Connection Issues**

### **Issue**: URL Encoding Problems

**Wrong Format** (causing authentication failures):
```bash
DATABASE_URL=postgresql://postgres:[Jiang1%40321WB]@db.host.supabase.co:5432/postgres
```

**Correct Format**:
```bash
DATABASE_URL=postgresql://postgres:Jiang1%40321WB@db.ngnarbecncxpbipnhyio.supabase.co:5432/postgres?sslmode=require
```

### **Key Fixes**:
1. **Remove brackets** around password: `[password]` → `password`
2. **URL encode @ symbol**: `@` → `%40`
3. **Add SSL requirement**: `?sslmode=require`
4. **Use direct connection format** for applications

---

## 🔍 **Diagnostic Commands**

### **Test Environment Loading**
```bash
python -c "from app.bootstrap_env import bootstrap_env; bootstrap_env(); print('✅ Environment loaded')"
```

### **Test Database Connection**
```bash
python -c "
from app.bootstrap_env import bootstrap_env
bootstrap_env()
from app.db.database import test_database_connection
import asyncio
result = asyncio.run(test_database_connection())
print(f'✅ Database: {result}' if result else f'❌ Database: {result}')
"
```

### **Test Server Health**
```bash
curl http://localhost:8000/healthz
# Expected: {"ok":true,"app":"Bridge CRM API","version":"0.1","database":"connected"}
```

### **Test Endpoints**
```bash
curl http://localhost:8000/people/leads
# Expected: JSON array of leads data (not 500 error)
```

---

## 📦 **Required Dependencies**

Ensure these packages are installed:
```bash
pip install pydantic-settings greenlet psycopg psycopg-binary
```

**Why needed**:
- `pydantic-settings`: BaseSettings moved from core pydantic in v2
- `greenlet`: Required for async SQLAlchemy operations
- `psycopg`: Modern PostgreSQL adapter (async compatible)

---

## 🚀 **Startup Checklist**

### **Before Starting Server**:
1. ✅ Verify `.env` file exists in `backend/` directory
2. ✅ Check DATABASE_URL format (no brackets, proper encoding)
3. ✅ Confirm all dependencies installed
4. ✅ Test database connection with diagnostic commands

### **Server Startup**:
```bash
# Always run from backend/ directory
cd /Users/lbridgembp/Dev/bridge-dashboard/bridge-fullstack/backend
uvicorn app.main:app --reload --port 8000
```

### **Verify Success**:
1. ✅ Server starts without errors
2. ✅ Environment variables detected in logs
3. ✅ `/healthz` returns `{"ok":true}`
4. ✅ `/people/leads` returns data (not 500)

---

## 🔧 **Common Issues & Solutions**

### **Issue**: `ModuleNotFoundError: No module named 'app'`
**Cause**: Running uvicorn from wrong directory (project root instead of backend/)
**Solution**: 
```bash
# ❌ Wrong - from project root
➜ bridge-fullstack uvicorn app.main:app --reload
ModuleNotFoundError: No module named 'app'

# ✅ Correct - from backend directory  
➜ backend uvicorn app.main:app --reload
INFO: Uvicorn running on http://127.0.0.1:8000
```

### **Issue**: `password authentication failed`
**Cause**: Supabase password not properly URL-encoded
**Solution**: Check Supabase password encoding (remove brackets, URL encode special chars)
```bash
# ❌ Wrong format
DATABASE_URL=postgresql://postgres:[Jiang1%40321WB]@db.host.supabase.co:5432/postgres

# ✅ Correct format  
DATABASE_URL=postgresql://postgres:Jiang1%40321WB@db.host.supabase.co:5432/postgres?sslmode=require
```

### **Issue**: `BaseSettings` import error
**Solution**: Install `pydantic-settings` package

### **Issue**: `greenlet` module missing
**Solution**: Install `greenlet` package for async SQLAlchemy

### **Issue**: Raw tracebacks in API responses
**Solution**: Use the enhanced error handling pattern in routers

---

## 📝 **File Structure**

```
backend/
├── .env                           # Main environment file (DO NOT COMMIT)
├── .env.example                   # Template for environment variables  
├── app/
│   ├── bootstrap_env.py          # Environment loading (NEW)
│   ├── core/
│   │   └── settings.py           # Centralized settings (NEW)
│   ├── db/
│   │   ├── database.py           # Robust DB engine (NEW)
│   │   └── db.py                 # Legacy compatibility (UPDATED)
│   └── main.py                   # Application entry (UPDATED)
├── db/
│   └── .env.example              # Database-specific template (KEEP)
└── DATABASE_CONNECTION_TROUBLESHOOTING.md  # This file
```

### **Environment File Cleanup**
**Removed unnecessary files**:
- ❌ `.env.backup`, `.env.backup2`, `.env.bak` (backup files)
- ❌ `db/.env` (duplicate configuration)

**Kept essential files**:
- ✅ `.env` (main working configuration)
- ✅ `.env.example` (template for team)
- ✅ `db/.env.example` (database template)

---

## 🎯 **Prevention Strategy**

1. **Always test database connection** before deploying
2. **Use diagnostic commands** to verify environment loading
3. **Keep this troubleshooting guide updated** with new issues
4. **Document environment variable changes** in team communications
5. **Use the new robust infrastructure** instead of ad-hoc fixes

---

## 📞 **Quick Resolution Steps**

If database connection fails again:

1. **Check password encoding** in `.env`
2. **Run diagnostic commands** above
3. **Verify Supabase dashboard** for credential changes
4. **Check server logs** for specific error messages
5. **Test with `psql`** to verify credentials work externally

---

## 📋 **Current Status Summary**

**✅ All Issues Resolved - Backend Fully Operational**

**Environment Files Status**:
- ✅ `.env` - Working configuration with correct Supabase credentials
- ✅ `.env.example` - Template maintained for team reference  
- ✅ `db/.env.example` - Database template preserved
- 🗑️ Cleanup completed - All backup files removed

**System Verification**:
- ✅ Database connection: `True`
- ✅ Environment loading: All variables detected
- ✅ App imports: All modules loading successfully
- ✅ Server startup: No errors, all routers loaded

**Key Fixes Applied**:
1. ✅ **Directory Issue**: Server must run from `backend/` not project root
2. ✅ **URL Encoding**: Removed brackets from Supabase password
3. ✅ **Dependencies**: Added `pydantic-settings` and `greenlet`
4. ✅ **Error Handling**: Secure logging without credential exposure
5. ✅ **Architecture**: Robust environment bootstrap system

**Ready for Development**:
- All endpoints responding correctly
- Health checks passing
- Database queries working
- No more 500 errors

---

*Last Updated: September 11, 2025*  
*Status: ✅ All issues resolved - Backend fully operational*  
*Next: Ready for continued development work*
