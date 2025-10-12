# Bridge Dashboard - Repository Tree

## Project Overview
A comprehensive CRM and AI-powered dashboard system for educational institutions.

## Repository Structure

```
bridge-fullstack/
├── 📁 Documentation
│   ├── AI_IMPLEMENTATION_GOSPEL.md
│   ├── AI_LEAD_SCORING_README.md
│   ├── AI_README.md
│   ├── BIDIRECTIONAL_DATA_FLOW.md
│   ├── IP_Declaration.md
│   ├── PlanOverview & MVP.rtf
│   ├── README.md
│   ├── SHORT_CODE_SNIPPETS.md
│   └── TREE.md
│
├── 📁 PriorForecast Development/ (Legacy System)
│   ├── 📁 (local)dags/ (Airflow DAGs)
│   ├── 📁 MISC/ (Documentation & Templates)
│   ├── 📁 Postgresviews/ (Database Views)
│   └── 📁 PythonCodeForecast/ (Python Scripts)
│
├── 📁 backend/ (FastAPI Python Backend)
│   ├── 📁 app/
│   │   ├── main.py (FastAPI entry point)
│   │   ├── cache.py (Redis caching)
│   │   ├── telemetry.py (Analytics)
│   │   │
│   │   ├── 📁 ai/ (AI & ML Module)
│   │   │   ├── advanced_ml.py
│   │   │   ├── anomaly_detection.py
│   │   │   ├── cohort_performance.py
│   │   │   ├── forecast.py
│   │   │   ├── ml_models.py
│   │   │   ├── natural_language.py
│   │   │   ├── pii_redaction.py
│   │   │   ├── segmentation.py
│   │   │   ├── triage.py
│   │   │   ├── 📁 graphs/
│   │   │   ├── 📁 prompts/
│   │   │   ├── 📁 schema/
│   │   │   └── 📁 tools/
│   │   │
│   │   ├── 📁 db/ (Database Module)
│   │   │   └── db.py
│   │   │
│   │   ├── 📁 routers/ (API Routes)
│   │   │   ├── ai_chat.py
│   │   │   ├── ai_leads.py
│   │   │   ├── applications.py
│   │   │   ├── dashboard.py
│   │   │   ├── people.py
│   │   │   ├── predictive_analytics.py
│   │   │   └── [other routers...]
│   │   │
│   │   └── 📁 schemas/ (Pydantic Models)
│   │       ├── applications.py
│   │       └── people.py
│   │
│   ├── 📁 db/migrations/ (Database Migrations)
│   │   ├── 0001_init.sql
│   │   ├── 0003_mv_board_applications.sql
│   │   ├── [29 migration files...]
│   │   └── README.md
│   │
│   ├── 📁 models/ (Trained ML Models)
│   │   └── [4 .joblib model files]
│   │
│   ├── [Scripts & Utilities]
│   │   ├── add_sample_leads.py
│   │   ├── generate_leads.py
│   │   ├── run_migrations.sh
│   │   └── [test files...]
│   │
│   ├── README_AI_SETUP.md
│   └── requirements.txt
│
├── 📁 frontend/ (React + TypeScript)
│   ├── 📁 .storybook/ (Storybook Config)
│   ├── 📁 dist/ (Build Output)
│   ├── 📁 public/
│   │
│   ├── 📁 src/
│   │   ├── App.tsx (Main app component)
│   │   ├── main.tsx (Entry point)
│   │   │
│   │   ├── 📁 assets/Fonts/ (Font files)
│   │   │   ├── Switzer_Complete/
│   │   │   └── satoshi/
│   │   │
│   │   ├── 📁 components/ (React Components)
│   │   │   ├── AILeadInsightsChat.tsx
│   │   │   ├── AdvancedMLDashboard.tsx
│   │   │   ├── CallComposer.tsx
│   │   │   ├── EmailComposer.tsx
│   │   │   ├── ForecastStatCard.tsx
│   │   │   ├── NaturalLanguageQuery.tsx
│   │   │   │
│   │   │   ├── 📁 CRM/
│   │   │   │   ├── EditableLeadCard.tsx
│   │   │   │   └── PersonRecord.tsx
│   │   │   │
│   │   │   ├── 📁 Dashboard/
│   │   │   │   ├── 📁 AI/
│   │   │   │   ├── 📁 CRM/
│   │   │   │   ├── 📁 Communications/
│   │   │   │   ├── 📁 StudentRecord/
│   │   │   │   └── 📁 Workflows/
│   │   │   │
│   │   │   ├── 📁 layout/
│   │   │   │   └── DashboardLayout.tsx
│   │   │   │
│   │   │   └── 📁 ui/ (Shadcn UI Components)
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── dialog.tsx
│   │   │       └── [other UI components...]
│   │   │
│   │   ├── 📁 hooks/ (Custom React Hooks)
│   │   │   ├── useApplications.ts
│   │   │   ├── useLeadUpdates.ts
│   │   │   └── usePeople.ts
│   │   │
│   │   ├── 📁 lib/ (Utilities)
│   │   │   ├── useGlobalStore.ts
│   │   │   └── utils.ts
│   │   │
│   │   ├── 📁 pages/ (Page Components)
│   │   │   ├── AILeadInsights.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── 📁 ai/
│   │   │   ├── 📁 analytics/
│   │   │   ├── 📁 crm/
│   │   │   ├── 📁 people/
│   │   │   └── 📁 workflows/
│   │   │
│   │   ├── 📁 services/ (API Services)
│   │   │   ├── api.ts
│   │   │   └── triage.ts
│   │   │
│   │   ├── 📁 stories/ (Storybook Stories)
│   │   │   ├── AIInsightCard.stories.tsx
│   │   │   ├── Button.stories.ts
│   │   │   └── [other stories...]
│   │   │
│   │   ├── 📁 styles/
│   │   │   └── index.css
│   │   │
│   │   └── 📁 utils/
│   │       └── dataMapping.ts
│   │
│   ├── [Configuration Files]
│   │   ├── components.json
│   │   ├── package.json
│   │   ├── tailwind.config.js
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── README.md
│
└── 📄 Project Files
    ├── Bridge Crm — Mvp++ One‑pager.pdf
    └── TREE.md
```

## Key Technologies

### Backend
- **FastAPI** - Python web framework
- **PostgreSQL** - Database
- **Redis** - Caching
- **SQLAlchemy** - ORM
- **Scikit-learn** - ML
- **LangChain** - AI orchestration

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Components
- **Storybook** - Development

### Features
- Lead scoring & triage
- Predictive analytics
- Natural language processing
- Automated communications
- Cohort analysis
- Forecasting models

## Quick Start

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
./run_migrations.sh
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
pnpm install
pnpm dev
```

---
*Total files: 500+ | Lines of code: 50,000+*