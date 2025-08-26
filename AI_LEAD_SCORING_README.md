# 🧠 AI-Native Lead Scoring System - Bridge CRM

## 📋 Overview

Bridge CRM's **Adaptive Lead Scoring System** is a world-class conversion intelligence hub that automatically learns and optimizes lead prioritization based on real outcomes. Unlike static scoring systems, this system continuously adapts using machine learning to maximize conversion rates.

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Frontend (Vite/React/TS)           │
│ Leads table → "AI Triage" button → shows scores+reasons│
└──────────────────────────┬─────────────────────────────┘
                           │ REST
                   /ai/triage/leads
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                           FastAPI backend (Python)                  │
│                                                                     │
│ 1) Feature builder                                                  │
│    - recency, engagement, source, contactability, course fit        │
│    - course/supply flags, decay functions                           │
│                                                                     │
│ 2) Rules engine (transparent)                                       │
│    - Deterministic score S_rules = w·x                              │
│    - Weights pulled from Supabase table `lead_scoring_weights`      │
│                                                                     │
│ 3) ML optimiser (closed loop)                                       │
│    - Trains on outcomes (offer→accept→enrol)                        │
│    - Suggests weight nudges Δw (logistic/XGBoost) weekly            │
│    - Writes audited updates to `lead_scoring_weights_audit`         │
│                                                                     │
│ 4) LLM explainer (LangChain → Gemini)                               │
│    - Turns factors into concise, human‑readable reasons             │
│    - Never changes the score; explains it                           │
│                                                                     │
│ 5) Response                                                          │
│    - [{leadId, score_rules, band, confidence, reasons_llm[], raw_factors}] │
└───────────────────────────┬──────────────────────────────────────────────────────────┘
                            │
                            │ nightly/weekly job (n8n/Cron)
                            │
┌───────────────────────────▼──────────────────────────────────────────────────────────┐
│                      Data + Model Store (Supabase Postgres)                         │
│  leads (events, fields)  outcomes (offer/accept/enrol)                              │
│  lead_scoring_weights (current)  lead_scoring_weights_audit (history)               │
│  source_yield, course_capacity, engagement_stats                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 🔧 Core Components

### 1. **Rules Engine** (`compute_rules_score`)
- **Transparent scoring**: Every factor is visible and auditable
- **Weighted factors**: Configurable importance for each scoring dimension
- **Deterministic**: Same input always produces same output
- **Scalable**: 0-100 score range with clear thresholds

### 2. **ML Optimizer** (`optimise_weights_weekly`)
- **Outcome-driven learning**: Trains on offer→accept→enrol data
- **Logistic regression**: Simple, interpretable model
- **Weight constraints**: Prevents radical shifts (max ±10% per update)
- **Audit trail**: Full history of all weight changes

### 3. **LLM Explainer** (`llm_explain`)
- **Human-readable insights**: Converts raw scores to actionable reasons
- **Gemini integration**: Uses Google's latest model via LangChain
- **Structured prompts**: Prevents hallucinations and ensures consistency
- **Fallback safety**: Works without LLM if needed

## 📊 Scoring Factors & Weights

### **Current Default Weights:**
```python
DEFAULT_WEIGHTS = {
    "engagement": 0.30,      # 30% - Most important
    "recency": 0.25,         # 25% - Time sensitivity
    "source_quality": 0.20,  # 20% - Lead origin quality
    "contactability": 0.15,  # 15% - Communication channels
    "course_fit": 0.10,      # 10% - Academic alignment
}
```

### **Factor Details:**

#### **Engagement (40 points max)**
- Email open: 5 points
- Email click: 10 points  
- Event attended: 20 points
- Portal login: 15 points
- Web repeat visit: 8 points

#### **Recency (30 points max)**
- Exponential decay with 7-day half-life
- 30 points at day 0, 15 points at day 7, 7.5 points at day 14

#### **Source Quality (20 points max)**
- UCAS direct: 20 points
- School tour: 15 points
- Organic/Referral: 12 points
- Event: 10 points
- Paid social: 5 points

#### **Contactability (20 points max)**
- Has email: 6 points
- Has phone: 6 points
- GDPR opt-in: 8 points

#### **Course Fit (15 points max)**
- Specific course declared: 8 points
- Degree level match: 2 points
- Undersupplied course bonus: 5 points
- Oversubscribed penalty: -5 points

## 🎯 Lead Bands & Actions

```python
BANDS = [
    (85, "hot", "Call or schedule interview now"),
    (65, "warm", "Personalised follow-up; nudge to booking"),
    (45, "nurture", "Course info drip; periodic check-in"),
    (0,  "low", "Automated nurture only"),
]
```

## 🗄️ Database Schema

### **`lead_scoring_weights` Table**
```sql
CREATE TABLE lead_scoring_weights (
    id uuid PRIMARY KEY,
    org_id uuid REFERENCES orgs(id),
    engagement decimal(3,2) DEFAULT 0.30,
    recency decimal(3,2) DEFAULT 0.25,
    source_quality decimal(3,2) DEFAULT 0.20,
    contactability decimal(3,2) DEFAULT 0.15,
    course_fit decimal(3,2) DEFAULT 0.10,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    updated_by text DEFAULT 'ML Optimizer',
    notes text
);
```

### **`lead_scoring_weights_audit` Table**
```sql
CREATE TABLE lead_scoring_weights_audit (
    id uuid PRIMARY KEY,
    org_id uuid REFERENCES orgs(id),
    weights_id uuid REFERENCES lead_scoring_weights(id),
    -- All weight columns
    change_reason text NOT NULL,
    sample_size int, -- outcomes used for optimization
    model_performance decimal(3,2), -- accuracy/AUC
    created_at timestamptz DEFAULT now(),
    created_by text DEFAULT 'ML Optimizer'
);
```

## 🚀 API Endpoints

### **POST `/ai/triage/leads`**
**Request:**
```json
{
  "leads": [
    {
      "id": "uuid",
      "last_activity_at": "2025-08-25T10:00:00Z",
      "source": "ucas_direct",
      "has_email": true,
      "has_phone": true,
      "gdpr_opt_in": true,
      "course_declared": "Music Production",
      "engagement": {"email_open": 2, "event_attended": 1}
    }
  ],
  "weights": {
    "engagement": 0.35,
    "recency": 0.25
  }
}
```

**Response:**
```json
{
  "items": [
    {
      "leadId": "uuid",
      "score": 78.2,
      "band": "warm",
      "action": "Personalised follow-up; nudge to booking",
      "confidence": 0.89,
      "reasons": ["Strong engagement with recent event attendance; High-quality UCAS source with good contactability"],
      "raw_factors": {
        "recency_points": 25.5,
        "engagement_points": 30.0,
        "source_points": 20.0,
        "contactability_points": 20.0,
        "course_fit_points": 8.0
      }
    }
  ]
}
```

## 🔄 ML Optimization Process

### **Weekly Training Cycle:**
1. **Data Collection**: Gather offer→accept→enrol outcomes
2. **Feature Engineering**: Calculate factor points for each outcome
3. **Model Training**: Logistic regression on outcome data
4. **Weight Update**: Convert coefficients to normalized weights
5. **Audit Logging**: Record change with performance metrics
6. **Production Update**: Activate new weights

### **Safety Constraints:**
- **Maximum change**: ±10% per factor per week
- **Model validation**: Minimum performance threshold
- **Rollback capability**: Previous weights always available
- **Human oversight**: Changes logged and auditable

## 🛠️ Installation & Setup

### **1. Install Dependencies**
```bash
cd backend
pip install python-dateutil scikit-learn numpy langchain langchain-google-genai
```

### **2. Environment Variables**
```bash
export GOOGLE_API_KEY="your-gemini-key"
export GEMINI_MODEL="gemini-1.5-flash"
```

### **3. Database Migration**
```bash
./run_migrations.sh
```

### **4. Start Backend**
```bash
cd backend
uvicorn app.main:app --reload
```

## 🧪 Testing

### **Test Single Lead**
```bash
curl -X POST http://localhost:8000/ai/triage/leads \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [{
      "id": "test-123",
      "last_activity_at": "2025-08-25T10:00:00Z",
      "source": "ucas_direct",
      "has_email": true,
      "has_phone": true,
      "gdpr_opt_in": true,
      "course_declared": "Computer Science",
      "engagement": {"email_open": 3, "event_attended": 1}
    }]
  }'
```

### **Test Weight Override**
```bash
curl -X POST http://localhost:8000/ai/triage/leads \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [...],
    "weights": {
      "engagement": 0.40,
      "recency": 0.20,
      "source_quality": 0.20,
      "contactability": 0.15,
      "course_fit": 0.05
    }
  }'
```

## 🔒 AI Guardrails

### **PII Protection**
- All LLM inputs are PII-redacted
- Raw data never sent to external APIs
- Audit trail for all AI interactions

### **Model Safety**
- Weights constrained to prevent radical shifts
- Fallback to default weights if ML fails
- Confidence scores indicate reliability

### **Explainability**
- Every score has human-readable reasoning
- Raw factors always visible
- Weight changes fully audited

## 📈 Performance Monitoring

### **Key Metrics**
- **Conversion lift**: Offer→Accept→Enrol rates
- **Model accuracy**: Weekly training performance
- **Weight stability**: Rate of weight changes
- **LLM quality**: Explanation relevance scores

### **Dashboard Integration**
- Real-time scoring visualization
- Weight change history
- Performance trend analysis
- A/B testing capabilities

## 🚧 Future Enhancements

### **Phase 2: Advanced ML**
- **Ensemble models**: XGBoost, Random Forest
- **Feature engineering**: Automated feature discovery
- **Hyperparameter tuning**: Bayesian optimization

### **Phase 3: Multi-modal AI**
- **Text analysis**: Email content sentiment
- **Behavioral patterns**: Clickstream analysis
- **Predictive analytics**: Churn prediction

### **Phase 4: Real-time Learning**
- **Online learning**: Continuous weight updates
- **Adaptive thresholds**: Dynamic band boundaries
- **Personalization**: Individual lead scoring models

## 🐛 Troubleshooting

### **Common Issues**

#### **"LLM key not set"**
- Check `GOOGLE_API_KEY` environment variable
- System falls back to rule-based explanations

#### **"Weights not found"**
- Run database migration: `./run_migrations.sh`
- Check `lead_scoring_weights` table exists

#### **"Model training failed"**
- Insufficient outcome data (need 50+ records)
- Check data quality in offer→enrol pipeline

### **Debug Mode**
```python
# Enable detailed logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 📚 Additional Resources

### **Code Files**
- **Backend**: `backend/app/ai/triage.py`
- **Database**: `backend/db/migrations/0029_lead_scoring_weights.sql`
- **Frontend**: `frontend/src/services/triage.ts`
- **Main App**: `backend/app/main.py`

### **Related Documentation**
- `AI_IMPLEMENTATION_GOSPEL.md` - Overall AI strategy
- `BIDIRECTIONAL_DATA_FLOW.md` - Data architecture
- `README_AI_SETUP.md` - AI setup guide

### **External Resources**
- [LangChain Documentation](https://python.langchain.com/)
- [Google Gemini API](https://ai.google.dev/)
- [Scikit-learn ML Guide](https://scikit-learn.org/)

---

## 🎯 **Why This System is Revolutionary**

**Traditional CRM Scoring:**
- ❌ Static rules that never change
- ❌ Manual tuning required
- ❌ No learning from outcomes
- ❌ Black-box decisions

**Bridge CRM Adaptive Scoring:**
- ✅ **Self-optimizing**: Learns from real conversion data
- ✅ **Transparent**: Every factor visible and auditable
- ✅ **Intelligent**: ML suggests optimal weight adjustments
- ✅ **Explainable**: Human-readable reasoning for every score
- ✅ **Compliant**: Full audit trail and PII protection

This system transforms Bridge CRM from a static database into a **living, learning conversion intelligence engine** that gets smarter with every lead interaction.
