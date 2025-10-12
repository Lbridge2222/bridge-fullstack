# 📡 IvyOS API Reference

**Status**: ✅ **PRODUCTION READY**  
**Last Updated**: 2025-01-27  
**Version**: v2.0.0

## 🎯 Overview

Complete API reference for IvyOS including ML prediction endpoints, AI features, communication APIs, and system health checks.

---

## 🧠 **ML PREDICTION APIs**

### **Application Progression ML**

#### **Individual Prediction**
```http
POST /ai/application-intelligence/predict
Content-Type: application/json

{
  "application_id": "uuid",
  "include_blockers": true,
  "include_nba": true,
  "include_cohort_analysis": true
}
```

**Response:**
```json
{
  "progression_probability": 0.75,
  "enrollment_probability": 0.68,
  "next_stage_eta_days": 14,
  "enrollment_eta_days": 45,
  "progression_blockers": [
    {
      "type": "missing_milestone",
      "severity": "critical",
      "item": "Interview not scheduled",
      "impact": "Cannot progress to interview stage",
      "resolution_action": "Schedule interview immediately",
      "estimated_delay_days": 7
    }
  ],
  "recommended_actions": [
    {
      "action": "Schedule interview",
      "priority": 1,
      "impact": "+25% progression probability",
      "effort": "medium",
      "deadline": "2025-10-08",
      "action_type": "scheduling"
    }
  ],
  "cohort_analysis": {
    "similar_applications": 15,
    "cohort_conversion_rate": 0.73,
    "performance_rank": "top_25_percent"
  }
}
```

#### **Batch Prediction**
```http
POST /ai/application-intelligence/predict-batch
Content-Type: application/json

{
  "application_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "predictions": [
    {
      "application_id": "uuid1",
      "progression_probability": 0.75,
      "enrollment_probability": 0.68,
      "next_stage_eta_days": 14,
      "enrollment_eta_days": 45
    }
  ],
  "metadata": {
    "total_processed": 3,
    "success_count": 3,
    "error_count": 0,
    "processing_time_ms": 160
  }
}
```

#### **Health Check**
```http
GET /ai/application-intelligence/health
```

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "last_training": "2025-01-20T10:00:00Z",
  "prediction_count": 1250,
  "average_response_time_ms": 160
}
```

### **Lead Conversion ML**

#### **Batch Prediction**
```http
POST /ai/advanced-ml/predict-batch
Content-Type: application/json

{
  "lead_ids": ["lead1", "lead2", "lead3"]
}
```

**Response:**
```json
{
  "predictions": [
    {
      "lead_id": "lead1",
      "conversion_probability": 0.82,
      "confidence_score": 0.75,
      "key_factors": [
        "High engagement score",
        "Recent activity",
        "Good source quality"
      ]
    }
  ],
  "metadata": {
    "total_processed": 3,
    "success_count": 3,
    "error_count": 0,
    "processing_time_ms": 140
  }
}
```

#### **Health Check**
```http
GET /ai/advanced-ml/health
```

---

## 🤖 **AI FEATURE APIs**

### **AI Triage System**

#### **Lead Scoring and Triage**
```http
POST /ai/triage/leads
Content-Type: application/json

{
  "filters": {
    "status": "new",
    "source": "website",
    "date_range": {
      "start": "2025-01-01",
      "end": "2025-01-31"
    }
  }
}
```

**Response:**
```json
{
  "leads": [
    {
      "person_id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "triage_score": 85,
      "confidence": 0.78,
      "reasons": [
        "High engagement activity",
        "Recent website visit",
        "Complete contact information"
      ],
      "raw_factors": {
        "engagement_score": 0.85,
        "recency_score": 0.90,
        "source_quality": 0.75,
        "contactability": 1.0,
        "course_fit": 0.80
      }
    }
  ],
  "metadata": {
    "total_leads": 1,
    "average_score": 85,
    "processing_time_ms": 160
  }
}
```

#### **Health Check**
```http
GET /ai/triage/health
```

### **RAG System**

#### **Knowledge Base Query**
```http
POST /rag/query
Content-Type: application/json

{
  "query": "What is the application process?",
  "context": {
    "person_id": "uuid",
    "conversation_history": []
  }
}
```

**Response:**
```json
{
  "answer": "The application process involves...",
  "sources": [
    {
      "title": "Application Process Guide",
      "content": "Step 1: Submit application...",
      "document_type": "policy",
      "category": "admissions",
      "similarity_score": 0.89
    }
  ],
  "metadata": {
    "query_time_ms": 1200,
    "sources_found": 3,
    "confidence": 0.85
  }
}
```

#### **Health Check**
```http
GET /rag/health
```

### **Ask Ivy Command Palette**

#### **Dual-Mode AI Router**
```http
POST /ai/router/v2
Content-Type: application/json

{
  "query": "What should I do about this lead?",
  "context": {
    "person_id": "uuid",
    "current_page": "leads",
    "conversation_history": []
  }
}
```

**Response (Conversational):**
```json
{
  "kind": "conversational",
  "answer_markdown": "Based on this lead's profile, I recommend...",
  "actions": [
    {
      "label": "Send email",
      "action": "open_email_composer"
    }
  ],
  "sources": [
    {
      "title": "Lead Management Guide",
      "content": "Best practices for lead follow-up...",
      "document_type": "best_practice",
      "category": "sales",
      "similarity_score": 0.78
    }
  ]
}
```

**Response (Modal):**
```json
{
  "kind": "modal",
  "modal": {
    "type": "suggestions",
    "payload": {
      "modal_title": "AI Suggestions",
      "summary_bullets": [
        "Schedule a call with this lead",
        "Send follow-up email",
        "Update lead status"
      ],
      "ui": {
        "primary_cta": {
          "label": "Schedule Call",
          "action": "open_call_console"
        },
        "chips": ["lead", "nba"]
      }
    }
  },
  "actions": [
    {
      "label": "Schedule Call",
      "action": "open_call_console"
    }
  ]
}
```

#### **Health Check**
```http
GET /ai/router/health
```

---

## 📧 **COMMUNICATION APIs**

### **Email Composition**

#### **AI Email Generation**
```http
POST /ai/leads/compose/outreach
Content-Type: application/json

{
  "lead_ids": ["uuid1", "uuid2"],
  "intent": "follow_up",
  "user_prompt": "Follow up about their course interest",
  "email_type": "outreach"
}
```

**Response:**
```json
{
  "emails": [
    {
      "lead_id": "uuid1",
      "subject": "Following up on your course interest",
      "body": "Hi John,\n\nI wanted to follow up...",
      "ai_suggestions": [
        "Personalized based on their course interest",
        "Includes relevant program details",
        "Clear call-to-action for next steps"
      ]
    }
  ],
  "metadata": {
    "generation_time_ms": 2500,
    "leads_processed": 2,
    "success_count": 2
  }
}
```

### **Call Console Integration**

#### **Get Call Context**
```http
GET /call-console/context/{person_id}
```

**Response:**
```json
{
  "person": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "lead_info": {
    "status": "qualified",
    "source": "website",
    "last_activity": "2025-01-27T10:00:00Z"
  },
  "ai_insights": {
    "conversion_probability": 0.75,
    "key_talking_points": [
      "Course interest in Computer Science",
      "Recent website visit",
      "High engagement score"
    ],
    "suggested_actions": [
      "Ask about their career goals",
      "Discuss program benefits",
      "Schedule campus visit"
    ]
  }
}
```

---

## 📊 **ANALYTICS APIs**

### **Source Analytics**

#### **Source Performance Analysis**
```http
POST /ai/source-analytics/analyze
Content-Type: application/json

{
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "sources": ["website", "social_media", "referral"]
}
```

**Response:**
```json
{
  "source_performance": [
    {
      "source": "website",
      "total_leads": 150,
      "conversions": 45,
      "conversion_rate": 0.30,
      "cost_per_lead": 25.50,
      "quality_score": 0.85
    }
  ],
  "insights": [
    "Website leads show highest conversion rate",
    "Social media leads have lower quality scores",
    "Referral leads have highest lifetime value"
  ]
}
```

### **Cohort Scoring**

#### **Cohort Performance Analysis**
```http
POST /ai/cohort-scoring/analyze
Content-Type: application/json

{
  "cohort_type": "application_date",
  "cohort_period": "monthly",
  "date_range": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  }
}
```

**Response:**
```json
{
  "cohorts": [
    {
      "cohort_id": "2025-01",
      "total_applications": 200,
      "enrollments": 60,
      "enrollment_rate": 0.30,
      "average_time_to_enrollment": 45,
      "performance_rank": "top_25_percent"
    }
  ],
  "insights": [
    "January cohort shows strong performance",
    "Average time to enrollment is 45 days",
    "Enrollment rate above historical average"
  ]
}
```

### **Segmentation Analysis**

#### **Lead Segmentation**
```http
POST /ai/segmentation/analyze
Content-Type: application/json

{
  "person_id": "uuid",
  "include_characteristics": true
}
```

**Response:**
```json
{
  "segment": "high_value_prospect",
  "characteristics": [
    "High engagement score",
    "Complete contact information",
    "Recent activity",
    "Good source quality"
  ],
  "behavioral_patterns": [
    "Frequent website visits",
    "Email opens and clicks",
    "Document downloads"
  ],
  "recommendations": [
    "Prioritize for immediate follow-up",
    "Use personalized communication",
    "Focus on conversion actions"
  ]
}
```

### **Anomaly Detection**

#### **Anomaly Detection**
```http
POST /ai/anomaly-detection/detect
Content-Type: application/json

{
  "person_id": "uuid",
  "detection_types": ["behavioral", "data_quality", "performance"]
}
```

**Response:**
```json
{
  "anomalies": [
    {
      "type": "behavioral",
      "severity": "medium",
      "description": "Unusual engagement pattern detected",
      "details": "Lead showed high activity for 3 days then complete silence",
      "recommendations": [
        "Investigate potential issues",
        "Send re-engagement email",
        "Check for technical problems"
      ]
    }
  ],
  "risk_score": 0.65,
  "overall_assessment": "moderate_risk"
}
```

---

## 🏥 **HEALTH & MONITORING APIs**

### **System Health**

#### **Overall System Health**
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T10:00:00Z",
  "services": {
    "database": "healthy",
    "ml_models": "healthy",
    "ai_services": "healthy",
    "rag_system": "healthy"
  },
  "performance": {
    "average_response_time_ms": 180,
    "error_rate": 0.01,
    "uptime_percentage": 99.9
  }
}
```

#### **ML System Health**
```http
GET /ai/health
```

**Response:**
```json
{
  "status": "healthy",
  "models": {
    "application_progression": {
      "loaded": true,
      "last_training": "2025-01-20T10:00:00Z",
      "prediction_count": 1250,
      "average_response_time_ms": 160
    },
    "lead_conversion": {
      "loaded": true,
      "last_training": "2025-01-15T10:00:00Z",
      "prediction_count": 2100,
      "average_response_time_ms": 140
    }
  },
  "performance": {
    "total_predictions": 3350,
    "success_rate": 0.999,
    "average_response_time_ms": 150
  }
}
```

### **Performance Metrics**

#### **Get Performance Metrics**
```http
GET /metrics/performance
```

**Response:**
```json
{
  "time_range": {
    "start": "2025-01-27T00:00:00Z",
    "end": "2025-01-27T23:59:59Z"
  },
  "metrics": {
    "api_calls": {
      "total": 1500,
      "successful": 1495,
      "failed": 5,
      "success_rate": 0.997
    },
    "response_times": {
      "p50": 120,
      "p95": 300,
      "p99": 500,
      "average": 180
    },
    "ml_predictions": {
      "total": 800,
      "average_time_ms": 160,
      "success_rate": 1.0
    }
  }
}
```

---

## 🔧 **UTILITY APIs**

### **Database Management**

#### **Check Database Schema**
```http
GET /admin/database/schema
```

**Response:**
```json
{
  "tables": [
    {
      "name": "applications",
      "columns": [
        "id", "person_id", "stage", "priority", "progression_probability"
      ],
      "indexes": ["idx_applications_stage", "idx_applications_person_id"]
    }
  ],
  "migrations": {
    "current_version": 30,
    "pending_migrations": 0,
    "last_migration": "2025-01-20T10:00:00Z"
  }
}
```

#### **Refresh Materialized Views**
```http
POST /admin/database/refresh-views
```

**Response:**
```json
{
  "status": "success",
  "views_refreshed": [
    "vw_board_applications",
    "vw_lead_analytics"
  ],
  "refresh_time_ms": 2500
}
```

### **Model Management**

#### **Get Model Information**
```http
GET /ai/models
```

**Response:**
```json
{
  "models": [
    {
      "name": "application_progression",
      "version": "2.0.0",
      "status": "loaded",
      "file_path": "models/app_progression_v2.joblib",
      "last_training": "2025-01-20T10:00:00Z",
      "performance_metrics": {
        "accuracy": 0.85,
        "precision": 0.82,
        "recall": 0.88,
        "f1_score": 0.85
      }
    }
  ]
}
```

---

## 🚨 **ERROR HANDLING**

### **Error Response Format**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid application ID format",
    "details": {
      "field": "application_id",
      "expected_format": "UUID",
      "received": "invalid-id"
    },
    "timestamp": "2025-01-27T10:00:00Z",
    "request_id": "req_123456789"
  }
}
```

### **Common Error Codes**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `MODEL_NOT_LOADED` | 503 | ML model not available |
| `DATABASE_ERROR` | 500 | Database connection issue |
| `AI_SERVICE_ERROR` | 502 | AI service unavailable |

---

## 🔐 **AUTHENTICATION & AUTHORIZATION**

### **API Key Authentication**
```http
Authorization: Bearer your_api_key_here
```

### **Rate Limiting**
- **Per User**: 60 requests/minute
- **Per Organization**: 180 requests/minute
- **Burst Protection**: 10 requests/10 seconds

### **Headers**
```http
Content-Type: application/json
Authorization: Bearer your_api_key_here
X-Request-ID: req_123456789
X-User-ID: user_123
X-Organization-ID: org_456
```

---

## 📚 **SDK EXAMPLES**

### **Python SDK**
```python
import requests

# ML Prediction
response = requests.post(
    "http://localhost:8000/ai/application-intelligence/predict",
    json={
        "application_id": "uuid",
        "include_blockers": True,
        "include_nba": True
    }
)
result = response.json()
print(f"Progression probability: {result['progression_probability']}")
```

### **JavaScript SDK**
```javascript
// ML Prediction
const response = await fetch('/ai/application-intelligence/predict', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_api_key'
  },
  body: JSON.stringify({
    application_id: 'uuid',
    include_blockers: true,
    include_nba: true
  })
});

const result = await response.json();
console.log(`Progression probability: ${result.progression_probability}`);
```

---

## 🔗 **QUICK LINKS**

### **Documentation**
- [System Overview](SYSTEM_OVERVIEW.md) - Complete system documentation
- [AI Documentation](AI_DOCUMENTATION.md) - AI features guide
- [ML Documentation](ML_DOCUMENTATION.md) - ML system guide
- [Developer Guide](DEVELOPER_GUIDE.md) - Development guide

### **Testing**
- [Test ML System](backend/test_ml_system.py) - ML system testing
- [Test AI Endpoints](backend/test_ai_endpoints.py) - AI endpoint testing
- [Test RAG System](backend/test_rag.py) - RAG system testing

---

**Last Updated**: 2025-01-27  
**Status**: ✅ **PRODUCTION READY**  
**Next Review**: 2025-02-27

This API reference provides complete documentation for all IvyOS endpoints with examples, error handling, and integration guidance.

