# 👨‍💻 IvyOS Developer Guide

**Status**: ✅ **PRODUCTION READY**  
**Last Updated**: 2025-01-27  
**Version**: v2.0.0

## 🎯 Overview

This comprehensive developer guide covers how to develop, test, and maintain the IvyOS system including ML prediction stack, AI features, and full-stack development.

---

## 🚀 **QUICK START**

### **Prerequisites**
- Python 3.8+
- Node.js 18+
- PostgreSQL database
- Required Python packages (see `requirements.txt`)

### **Backend Setup**
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **Frontend Setup**
```bash
cd frontend
pnpm install
pnpm dev
```

### **Database Setup**
```bash
# Run migrations
./backend/run_migrations.sh

# Add ML columns (if needed)
psql $DATABASE_URL -f backend/add_ml_columns_standalone.sql
```

---

## 🏗️ **SYSTEM ARCHITECTURE**

### **Core Components**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   ML Endpoints   │    │   Model Registry│
│   (React)       │◄──►│   (FastAPI)      │◄──►│   (Joblib)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Feature Safety  │
                       │  & Calibration   │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Database       │
                       │   (PostgreSQL)   │
                       └──────────────────┘
```

### **Key Files**

#### **Backend Core**
- `app/main.py` - FastAPI entry point
- `app/ai/application_ml.py` - Application Progression ML
- `app/ai/advanced_ml.py` - Lead Conversion ML
- `app/ai/triage.py` - AI Triage System
- `app/ai/model_registry.py` - Model loading and caching
- `app/schemas/` - Pydantic schemas for API contracts

#### **Frontend Core**
- `src/App.tsx` - Main application component
- `src/components/Dashboard/CRM/ApplicationsBoard.tsx` - Applications Kanban board
- `src/components/AISummaryPanel.tsx` - AI insights panel
- `src/services/api.ts` - API service layer
- `src/hooks/useApplicationsQuery.ts` - Data fetching hooks

#### **Database**
- `db/migrations/` - Database migration scripts
- `models/` - ML model artifacts (`.joblib` files)

---

## 🧠 **ML DEVELOPMENT**

### **ML Pipeline Architecture**

```
┌──────────────┐
│  Database    │
│  ──────────  │
│  applications│──┐
│  people      │  │
│  lead_       │  │
│  activities  │  │
└──────────────┘  │
                  ↓
         ┌────────────────┐
         │ Feature        │
         │ Extraction     │
         │ (SQL Query)    │
         └────────────────┘
                  ↓
         ┌────────────────┐
         │ ML Prediction  │
         │ Engine         │
         │ (Python)       │
         └────────────────┘
                  ↓
         ┌────────────────┐
         │ API Response   │
         │ (FastAPI)      │
         └────────────────┘
                  ↓
         ┌────────────────┐
         │ UI Display     │
         │ (React/TSX)    │
         └────────────────┘
```

### **Two ML Models**

1. **Lead Conversion ML** (`backend/app/ai/advanced_ml.py`)
   - Predicts: Will enquiry become applicant?
   - Output: `conversion_probability` (0-1)
   - Used on: Leads Management page

2. **Application Progression ML** (`backend/app/ai/application_ml.py`)
   - Predicts: Will applicant enroll?
   - Output: `progression_probability`, `enrollment_probability`
   - Includes: Blockers, next best actions
   - Used on: Applications Board

### **Feature Engineering** (85% Complete)

#### **Database Columns (65%)**
- Stage, priority, urgency, status
- Days in pipeline, days since update
- Interview/offer milestones
- Lead score, engagement score
- Programme, campus, deadline

#### **Activity-Based Features (35%)**
- Email open/click tracking
- Portal login frequency
- Document upload activity
- Calculated from `lead_activities` table

---

## 🤖 **AI DEVELOPMENT**

### **AI Triage System**
**Location**: `backend/app/ai/triage.py`

**Features**:
- Real-time lead scoring (0-100 scale)
- Gemini integration via LangChain
- Adaptive scoring with configurable weights
- Confidence scoring based on data completeness

**API Endpoint**: `POST /ai/triage/leads`

### **RAG System**
**Location**: `backend/app/routers/rag.py`

**Features**:
- Hybrid search with vector embeddings
- 768-dim Gemini embeddings
- Knowledge base integration
- Source attribution with similarity scores

**API Endpoint**: `POST /rag/query`

### **Ask Ivy Command Palette**
**Location**: `frontend/src/ivy/useIvy.tsx`

**Features**:
- ⌘K shortcut to open command palette
- Context-aware responses
- Dual-mode AI: Conversational + Modal suggestions
- Smart routing between response types

---

## 🧪 **TESTING**

### **ML Testing**
```bash
# System test
python backend/test_ml_system.py

# Activity coverage check
python backend/check_activity_coverage.py

# ML integration test
python backend/test_ml_integration.py

# Frontend integration test
python backend/test_ml_frontend_integration.py

# Performance test
python backend/test_optimization.py
```

### **AI Testing**
```bash
# AI endpoints test
python backend/test_ai_endpoints.py

# RAG system test
python backend/test_rag.py

# Security test
python backend/test_security.py
```

### **Frontend Testing**
```bash
cd frontend
pnpm test
```

---

## 📊 **PERFORMANCE MONITORING**

### **Current Performance**
- **ML Response Time**: ~160ms average
- **RAG Query Response**: 1-3 seconds
- **AI Triage Response**: ~160ms average
- **Success Rate**: 100% (all predictions successful)

### **Target Performance**
- **ML Response Time**: < 200ms
- **RAG Query Response**: < 2 seconds
- **AI Triage Response**: < 200ms
- **Success Rate**: > 99%

### **Monitoring Tools**
- Real-time latency tracking
- Automatic warnings when thresholds exceeded
- Comprehensive telemetry with model provider labels
- Nightly evaluation with regression detection

---

## 🔧 **DEVELOPMENT WORKFLOW**

### **Adding New ML Features**

1. **Database Changes**
   ```bash
   # Create migration
   cd backend/db/migrations
   # Create new migration file
   # Run migration
   ./run_migrations.sh
   ```

2. **Backend Implementation**
   ```python
   # Add to app/ai/application_ml.py
   # Update schemas in app/schemas/
   # Add tests in tests/
   ```

3. **Frontend Integration**
   ```typescript
   # Update API service in src/services/api.ts
   # Add UI components
   # Update hooks in src/hooks/
   ```

4. **Testing**
   ```bash
   # Run all tests
   python backend/test_ml_system.py
   python backend/test_ml_integration.py
   ```

### **Adding New AI Features**

1. **Backend Implementation**
   ```python
   # Add to app/ai/tools/
   # Update routers in app/routers/
   # Add prompts in app/ai/prompts/
   ```

2. **Frontend Integration**
   ```typescript
   # Update API service
   # Add UI components
   # Update command palette
   ```

3. **Testing**
   ```bash
   # Test AI endpoints
   python backend/test_ai_endpoints.py
   ```

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**

1. **ML predictions not loading**
   - Check database schema
   - Verify model files exist
   - Check backend logs

2. **AI features not working**
   - Check environment variables
   - Verify LangChain dependencies
   - Check API key configuration

3. **Database connection issues**
   - Check `DATABASE_URL` environment variable
   - Verify database is running
   - Check migration status

4. **Frontend build errors**
   - Check Node.js version
   - Clear node_modules and reinstall
   - Check TypeScript errors

### **Debug Commands**
```bash
# Check database connection
python backend/check_tables.py

# Check ML system
python backend/test_ml_system.py

# Check AI endpoints
python backend/test_ai_endpoints.py

# Check frontend build
cd frontend && pnpm build
```

---

## 📚 **API REFERENCE**

### **ML Endpoints**
- `POST /ai/application-intelligence/predict` - Individual prediction
- `POST /ai/application-intelligence/predict-batch` - Batch prediction
- `GET /ai/application-intelligence/health` - Health check
- `POST /ai/advanced-ml/predict-batch` - Lead conversion prediction

### **AI Endpoints**
- `POST /ai/triage/leads` - Lead scoring and triage
- `POST /ai/leads/compose/outreach` - AI email composition
- `POST /ai/router/v2` - Dual-mode AI router
- `POST /rag/query` - RAG queries

### **Health Endpoints**
- `GET /ai/router/health` - AI system health
- `GET /ai/triage/health` - Triage system health
- `GET /rag/health` - RAG system health

---

## 🔄 **DEPLOYMENT**

### **Backend Deployment**
```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
./run_migrations.sh

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### **Frontend Deployment**
```bash
# Install dependencies
pnpm install

# Build for production
pnpm build

# Serve static files
pnpm preview
```

### **Environment Variables**
```bash
# Database
DATABASE_URL=postgresql://...

# AI Configuration
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Feature Flags
IVY_ORGANIC_ENABLED=true
IVY_MODAL_HEURISTICS=false
ACTIVE_MODEL=gemini-2.0-flash
```

---

## 📈 **PERFORMANCE OPTIMIZATION**

### **Backend Optimization**
- Use connection pooling for database
- Implement caching for ML models
- Optimize SQL queries
- Use async/await patterns

### **Frontend Optimization**
- Implement code splitting
- Use React.memo for expensive components
- Optimize bundle size
- Implement lazy loading

### **Database Optimization**
- Create proper indexes
- Use materialized views
- Optimize query performance
- Monitor query execution plans

---

## 🔒 **SECURITY**

### **Data Protection**
- PII-safe logging with anonymization
- GDPR-compliant data handling
- Secure API key management
- Input validation and sanitization

### **Rate Limiting**
- Per-user rate limiting (60 requests/minute)
- Per-org rate limiting (180 requests/minute)
- Burst protection (10 requests/10 seconds)
- Auto-scaling for CI/testing environments

---

## 📚 **CODE SNIPPETS**

### **Backend - ML Prediction**
```python
from app.ai.application_ml import predict_application_progression

# Predict progression for an application
result = await predict_application_progression(application_id)
print(f"Progression probability: {result.progression_probability}")
```

### **Frontend - API Integration**
```typescript
import { api } from '@/services/api';

// Get progression intelligence
const intelligence = await api.getProgressionIntelligence(applicationId);
console.log(intelligence.progression_probability);
```

### **Database - Feature Extraction**
```sql
-- Extract application features for ML
SELECT 
  stage,
  priority,
  days_in_pipeline,
  engagement_score
FROM applications 
WHERE id = $1;
```

---

## 🎯 **BEST PRACTICES**

### **Code Quality**
- Use TypeScript for frontend
- Follow PEP 8 for Python
- Write comprehensive tests
- Use meaningful variable names

### **Performance**
- Optimize database queries
- Use caching where appropriate
- Monitor performance metrics
- Profile slow operations

### **Security**
- Validate all inputs
- Use parameterized queries
- Implement proper error handling
- Keep dependencies updated

### **Documentation**
- Write clear docstrings
- Update README files
- Document API changes
- Keep architecture diagrams current

---

## 🔗 **QUICK LINKS**

### **Documentation**
- [System Overview](SYSTEM_OVERVIEW.md) - Complete system documentation
- [AI Documentation](AI_DOCUMENTATION.md) - AI features guide
- [ML Documentation](ML_DOCUMENTATION.md) - ML system guide
- [API Reference](API_REFERENCE.md) - API documentation

### **Scripts**
- [Setup DB](backend/add_ml_columns_standalone.sql) - Database setup
- [Test System](backend/test_ml_system.py) - System testing
- [Check Activities](backend/check_activity_coverage.py) - Activity check

### **Code**
- [ML Engine](backend/app/ai/application_ml.py) - Main ML logic
- [API Routes](backend/app/main.py) - API endpoints
- [Frontend UI](frontend/src/components/Dashboard/CRM/ApplicationsBoard.tsx) - Main UI
- [API Client](frontend/src/services/api.ts) - Frontend API

---

**Last Updated**: 2025-01-27  
**Status**: ✅ **PRODUCTION READY**  
**Next Review**: 2025-02-27

This developer guide provides everything needed to develop, test, and maintain the IvyOS system effectively.

