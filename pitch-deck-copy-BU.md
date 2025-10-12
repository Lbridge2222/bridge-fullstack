# Ivy OS – Pitch Deck Copy

## Slide 1: Title / Hook

**Logo:** Ivy OS

**Headline:** The AI-native Operating System for Higher Education

**Sub-headline:** Custom-built for Higher Education teams, bringing best-in-class digital tools to predict outcomes, improve enrolment performance, and make data-driven decisions with clarity.

**Badge:** Pre-Seed Stage

**Small text:** £450k raise | £5M cap | 20% discount SAFE

**Footer note:** Created from inside Higher Education admissions, not retrofitted for it.

---

## Slide 2: The Problem

**Headline:** Higher Education is forced to use systems that were never designed for it.

**Subtext:** Universities are caught between dated Higher Education systems and modern sales CRMs that don't understand the student journey, leaving teams unable to use best-in-class tools in a meaningful way.

**Founder Quote:**

"Every year I focus on forecasting and reviewing our data, but I've never been able to do it properly using tools like HubSpot, Databox, or Domo.

The problem isn't capability, it's context. In Higher Education, the core architecture of platforms like HubSpot just doesn't fit. Lifecycle stages such as MQL and SQL don't translate to enquiry, applicant, offer, or enrolment, so the system can't deliver meaningful predictive analytics or even a relevant pipeline view.

We see the same issues across our partners at Falmouth and other institutions. We're all bending sales software to serve an admissions process it was never designed for. With OfS scrutiny and tighter public spending, the sector can't keep forcing square pegs into round holes."

**Highlight:**

The tools that drive modern business growth can't be meaningfully applied to Higher Education, and the systems built for education can't keep up with modern performance expectations.

---

## Slide 3: The Opportunity

**Headline:** A £150M replacement market hiding in plain sight

**Subtext:** Every university already pays for CRMs, SIS tools, and spreadsheets — Ivy OS replaces them with one intelligent platform built for Higher Education.

**The market reality**
| Segment | Institutions | Typical Current Spend | Addressable Value |
|---------|-------------|---------------------|-------------------|
| UK Higher Education | 400+ (OfS register) | £30–50k each | ≈ £16M SAM |
| English-language HE (IE, AU, NZ, CA) | 500+ | £30–40k each | +£130M |
| **Total near-term opportunity** | — | — | **≈ £150M** |

**The problem behind the spend**
Every institution already has:
- A CRM built for business pipelines
- A student information system designed for compliance
- Teams bridging the gap manually

They're not under-investing — they're investing in the wrong tools.

**The inevitability**
Within five years, AI-native operational intelligence will be standard across UK universities.

The question isn't if institutions adopt it — it's who builds the platform that becomes infrastructure.

**Highlight:**

Ivy OS isn't creating a new budget line. It's replacing fragmented £40k stacks with a unified, AI-native system that actually understands Higher Education.

---

## Slide 4: The Solution

**Headline:** One system. One truth. Built around the real student journey.

**Sub-headline:** Ivy OS unifies CRM, student records, and institutional intelligence around the Higher Education lifecycle — enquiry → application → offer → enrolment → progression → alumni.

**What Ivy OS is**

The first AI-native operating system for Higher Education, combining the data depth of an SIS with the usability of a modern CRM. It connects every stage of the pipeline and learns continuously from each institution's activity to improve prediction, triage, and decision-making over time.

**How it works**

```
┌────────────────────────────────────┐
│  USER LAYER: HE workflows          │
│  Enquiry → Application → Offer →   │
│  Enrolment → Progression → Alumni  │
└────────────────────────────────────┘
                 ↓
┌────────────────────────────────────┐
│  INTELLIGENCE LAYER: AI copilots   │
│  • Predictive triage & risk scoring│
│  • Policy-aware Q&A (UCAS, OfS)    │
│  • Smart communications composer   │
│  • Live forecast refinement        │
└────────────────────────────────────┘
                 ↓
┌────────────────────────────────────┐
│  DATA LAYER: Unified CRM + SIS     │
│  Real-time merge of recruitment and│
│  student data — single source of   │
│  truth                             │
└────────────────────────────────────┘
```

**Why it's different**

Most platforms bolt AI on top of legacy systems.
Ivy OS is AI-first by design, so intelligence is built into every workflow, not added later.
- Data model built for HE from day one
- Forecasts and triage scores improve automatically with each cycle
- AI copilots act in context — no switching tools or exporting data
- One login, one interface, one accurate picture

**Bottom line:**

Ivy OS doesn't make universities better at using generic tools — it gives them tools actually built for what they do.

---

## Slide 5: Product in Action

**Headline:** AI copilots that feel native, built into the fabric of the system.

**Sub-headline:** Real-time prioritisation, insight, and automation purpose-built for Higher Education teams.

**Live Today / Demo-Ready Capabilities:**
- **AI Triage** — ranks enquiries and applicants by likelihood to progress or require attention
- **Applicant Profiles** — predictive scores, blockers, and next-best-action recommendations per application
- **AI Kanban Board** — shows where applications stall and why
- **Email Copilot** — drafts personalised invites, reminders, and offer letters from institutional templates
- **RAG Knowledge Base** — retrieves UCAS, OfS, and institutional policy documents with citations
- **Meeting Booker** — one-click scheduling and automated reminders

**User Experience Design:**
- One cohesive interface built on React + Tailwind + shadcn/ui
- Designed for real HE roles: Admissions, Recruitment, Marketing, Registry
- AI interactions embedded in context: inline prompts, predictive insights, and summaries inside each workflow

**Highlight:**

Ivy OS delivers AI-driven triage, insight, and action directly inside live admissions workflows — proving how an AI-native architecture transforms everyday Higher Education operations.

---

## Slide 6: Architecture & Tech Stack

**Headline:** Built from the ground up on an AI-native, modular substrate.

**Sub-headline:** Ivy OS is engineered around an intelligent, flexible core that unifies data, workflows, and automation — and lets institutions scale capability or cost as they grow.

**System Architecture:**

1. **Frontend (UI Layer)** — Vite + React + TypeScript + Tailwind + shadcn/ui
   - Fast, modular interface with consumer-grade design
   - React Email for templated, dynamic communications
   - Built for rapid iteration and future white-labelling

2. **Backend (API Layer)** — FastAPI + Supabase (PostgreSQL + pgvector)
   - Real-time data sync between CRM, SIS, and AI modules
   - Row-level security, encrypted storage, and role-based access
   - Scales seamlessly from pilot to enterprise rollout

3. **AI Substrate (Modular & Model-Agnostic)** — LangChain + AI Router
   - Institutions can choose preferred LLMs — Claude, Gemini, GPT — balancing performance and cost
   - Ivy Router orchestrates retrieval, reasoning, and next-best-action logic across chosen models
   - Continuous-learning feedback loops adapt predictions to each institution's data

4. **Workflow & Automation Layer** — Native + Extensible
   - Built-in workflow engine orchestrates key admissions processes (offers, comms, triggers) directly within Ivy OS
   - Optional integrations via n8n or API webhooks connect Ivy actions to wider institutional tools
   - Gives universities the choice: self-contained automation inside Ivy or deep interoperability with finance, registry, and marketing stacks

5. **Vector Knowledge Base** — RAG (Retrieval Augmented Generation)
   - Indexed UCAS, OfS, and institutional documents with live citation
   - Policy-aware responses embedded in every workflow
   - Auto-updates as regulations or policies change

6. **Analytics & Forecasting Engine** — Python ML (XGBoost, Prophet, LightGBM)
   - Predicts outcomes and enrolment with ±5% accuracy
   - Feeds triage scores and performance dashboards in real time
   - Retrains continuously on each institution's data

**Performance & Security:**

| Metric | Target | What It Means |
|--------|--------|---------------|
| Prediction latency | < 200 ms | Instant triage and forecasts |
| RAG query response | 1–3 s | Policy questions answered faster than manual lookup |
| Uptime SLA | 99.5% + | Mission-critical reliability |
| Compliance | GDPR + OfS-ready | UK/EU data residency & DPA templates included |

**Highlight:**

Ivy OS gives universities an AI-native foundation with the flexibility to choose their own models, workflows, and integrations — without sacrificing speed, security, or predictive accuracy.

---

## Slide 7: Competitive Landscape

**Headline:** Why incumbents can't move fast enough — and new entrants can't go deep enough.

**Sub-headline:** Ivy OS is 18 months ahead, combining deep domain insight with a modern AI-native foundation that legacy vendors can't rebuild and startups can't replicate.

**Market Positioning:**

| Player | Built For | Core Limitation | Ivy OS Edge |
|--------|-----------|-----------------|-------------|
| HubSpot / Salesforce | B2B sales funnels (MQL → SQL → Customer) | Wrong data model for HE; pipelines, not admissions lifecycles | Native HE data model (enquiry → offer → enrolment → alumni) |
| Ellucian / Unit4 / Tribal | Compliance and record-keeping | Legacy monoliths with bolt-on AI; slow innovation; poor UX | Modern, modular, AI-first with consumer-grade interface |
| Point Solutions / Chatbots | Isolated features (lead scoring, chat) | No end-to-end workflow or data layer; low institutional trust | Unified OS connecting CRM, SIS, and forecasting |
| University IT / Internal Builds | Bespoke internal tools | Limited resources, high maintenance, no ML expertise | Product-level R&D shared across institutions |

**Why Incumbents Can't Compete:**

**HubSpot & Salesforce**
- Make billions on B2B sales — no incentive to rebuild core architecture for a £20M HE vertical
- Their data models, pipelines, and dashboards simply don't fit enquiry-to-enrolment lifecycles
- AI features are retrofitted assistants, not native intelligence

**Ellucian / Unit4 / Tribal**
- 20-year-old tech stacks and legacy database schemas
- Costly customisation, poor UX, slow release cycles
- Their AI "layers" are marketing, not operational intelligence

**New EdTech Startups**
- Mostly focused on student engagement or marketing, not admissions infrastructure
- Lack domain depth and HE procurement experience
- Building horizontally — Ivy's advantage compounds through specialised data

**Why Our Lead Compounds Over Time:**

| Year | Ivy OS Position | Competitor Position |
|------|----------------|---------------------|
| Now (0 months) | Working MVP, AI substrate live, proven ±5% forecast accuracy | No AI-native HE platform in production |
| +12 months | 3 institutional pilots → 6,000+ applications in dataset | Early prototypes, no institutional data |
| +24 months | 10 institutions → 20,000+ applications feeding model refinement | 1-2 pilots, no UCAS/OfS integrations |
| +36 months | 25+ institutions → 50,000+ applications, integration ecosystem established | Too late: switching costs + data moat locked in |

**The Moat:**
Better data → better models → better outcomes → more customers → even better data.
This flywheel compounds quarterly, not annually.

**Highlight:**

This isn't a "best features" race — it's a best dataset race.
Ivy OS's 18-month head start and deep HE data foundation make its competitive advantage self-reinforcing.

---

## Slide 8: Traction / Proof Point

**Headline:** Proven in production: ±5% forecast accuracy in real Higher Education admissions

**Sub-headline:** Ivy OS evolved from five years of live operational systems, not a prototype.

**Founder Context:**

"Over several years leading student recruitment and admissions at WaterBear College of Music, I rebuilt our data infrastructure from the ground up — exporting from HubSpot into Supabase, modelling conversion rates with XGBoost and Prophet, and designing SQL pipelines to track performance in real time. What began as an internal rebuild became the foundation for Ivy OS."

— Laurance Bridge, Founder

**What's Proven:**

| Area | Before | After Ivy OS Foundations | Impact |
|------|--------|--------------------------|--------|
| Forecast accuracy | ±15–20% error | ±5% of final enrolments | Confident, early budget planning |
| Manual triage time | 12 hrs/week | 4–5 hrs/week | 60% time saving for admissions staff |
| Reporting | Ad-hoc, Excel-based | Live dashboards | Instant visibility across the pipeline |
| Decision confidence | Reactive and uncertain | Data-backed, real-time | Leadership planning months earlier |

**What This Demonstrates:**
- Forecasting and triage models already work in live HE environments
- Measurable ROI delivered in time saved and forecast accuracy
- The workflows mirror real institutional operations — not theory
- Institutions are voicing the same unmet need across the sector

**Early Interest:**

Warm institutions in active discussion:
- **WaterBear College of Music** — source institution and live dataset foundation for the original system that became Ivy OS
- **BIMM Group** — strong founder relationship with the Group CMO (who previously offered the founder a senior role) and demonstrated interest in AI tools to improve multi-campus recruitment and forecasting
- **Falmouth University** — constructive conversation with the Head of Digital Marketing highlighting shared pain points: data split across HubSpot, SIS, and analytics systems; API integrations requiring IT board approval for compliance; and the need for a unified platform

Each conversation follows the same pattern:

"We're trying to make HubSpot work for admissions — it just doesn't fit."

**Highlight:**

Ivy OS is not a concept — it's the commercialisation of a proven system that has already delivered measurable results inside Higher Education admissions.

---

## Slide 9: Business Model & Pricing

**Headline:** Predictable, budget-neutral pricing designed for Higher Education

**Sub-headline:** Ivy OS replaces multiple fragmented systems with one AI-native platform — delivering institutional-grade capability for the same annual spend most universities already make on HubSpot, spreadsheets, and timetabling tools.

**Pricing Tiers:**

| Tier | Typical Institution | Active Students (FTE) | Annual Fee (£) | Includes |
|------|---------------------|---------------------|----------------|----------|
| **Starter** | Specialist colleges / private providers | ≤ 500 | 18,000/yr | Full CRM + SIS-lite + AI Comms + core reporting |
| **Growth** | Mid-size universities / FE HE arms | 501 – 3,000 | 32,000/yr | Adds Compliance Analytics + Multi-Campus support |
| **Enterprise** | Post-92 / Large HEIs | 3,001 – 10,000+ | 55,000/yr | Full OS suite + Advanced Automation + Priority SLA + Integrations |
| **Group / System** | University groups / franchises | — | from 80,000/yr | Multi-tenant data lake + Custom SSO + API priority |

**Pricing Philosophy:**
- ✅ **Budget-neutral** — replaces 3–4 existing tools
- ✅ **Procurement-friendly** — flat annual fee
- ✅ **Scalable** — simple growth by FTE
- ✅ **Low risk** — pilot option (3–6 months at 50% annual fee)

**Founder quote:**

"Universities already spend £30–50k on HubSpot, timetabling, and spreadsheets just to keep admissions running. Ivy OS delivers all of that — plus AI-powered forecasting and automation — for the same spend, built for education from day one."

**Bottom line:**

One clear institutional subscription. One operating system for Higher Education. Built to slot into existing budgets, not add to them.

Future expansion will come through deeper integrations — connecting timetabling, communications, and analytics natively within Ivy OS as institutions scale.

---

## Slide 10: Revenue Model & Path to £1M ARR

**Headline:** Capital-efficient growth to category leadership

**Sub-headline:** A focused 24-month plan from pilot validation to £1M+ ARR, built on realistic pricing, high margins, and disciplined scaling.

**ARR Path (Conservative Projections):**

| Milestone | Customers | Blended ACV (£) | ARR (£) | Timeline |
|-----------|-----------|----------------|---------|----------|
| Initial traction | 3 pilots | 25,000 (discounted) | 75,000 | Month 12 |
| Product-market fit | 10 paying institutions | 35,000 (mixed tiers) | 350,000 | Month 18 |
| Scale momentum | 25 institutions | 42,000 (mature mix) | 1.05M | Month 30 |

**Year-by-Year Build:**

**Year 1 – Pilot Phase**
- 3–5 customers at 30–50% pilot discount
- Validate outcomes, gather case studies, refine product
- Target: **£75–125k ARR**

**Year 2 – Early Growth**
- Convert pilots to annual contracts
- Add 7–12 new customers through referrals and case studies
- Begin expansion into additional HE networks
- Target: **£350–500k ARR**

**Year 3 – Scale Momentum**
- 25–40 total customers, mostly Growth/Enterprise tier
- Pricing power increases with proof points and integrations
- Target: **£1–1.5M ARR**

**Unit Economics (Mature State):**

| Metric | Value | Benchmark / Notes |
|--------|-------|-------------------|
| Blended ACV | £42,000 | Weighted toward Growth/Enterprise tiers |
| Gross Margin | 92% | Typical 70–85% SaaS → infrastructure ≈ 8% of rev |
| CAC | £15,000 | Founder-led → content → inside-sales evolution |
| Payback Period | 13 months | Within B2B SaaS norm (12–18 mo) |
| LTV | £150,000+ | 4+ year retention; HE switching cost high |
| LTV:CAC | 10:1 | Exceptional efficiency for early-stage SaaS |

**Market Capture:**

At £40k average contract:
- UK market = 400 institutions × £40k = £16M SAM
- 5% market share = £800k ARR
- With retention and modest expansion → £1M+ run-rate

**Bottom line:**

A capital-efficient, 24-month path from £75k to £1M+ ARR, built on high-margin SaaS economics, realistic conversion assumptions, and an addressable UK market hiding in plain sight.

---

## Slide 11: Why Now / The AI Edge

**Headline:** The sector is under pressure, the technology is ready, and the incumbents can't move fast enough.

**Sub-headline:** Ivy OS arrives at the exact moment when Higher Education needs to modernise operations — and AI finally makes it possible.

**1. Sector Pressure Is Reaching Breaking Point**
- OfS and compliance expectations are rising: universities must now evidence recruitment ROI, retention, and progression through verifiable data, not assumptions
- **Franchise and partner colleges above ~300 students will soon be required to apply for OfS registration themselves** — adding new regulatory and reporting burdens to smaller institutions without dedicated data infrastructure
- Budgets are tightening: recruitment and admissions teams are expected to deliver more with less, while juggling fragmented systems and manual reporting
- Leadership urgency: Vice-Chancellors, Marketing, and Registry teams all need real-time visibility and audit-ready data for OfS and internal boards

*In short: operational compliance and performance accountability are converging — creating a perfect storm Ivy OS is built to solve.*

**2. Technology Has Finally Caught Up**
- LLMs (GPT-4, Gemini, Claude) are now reliable enough for production use with stable APIs and predictable cost structures
- RAG architecture enables policy-aware copilots that can reference UCAS and OfS guidance accurately
- Modern infrastructure stack (Supabase, pgvector, LangChain, FastAPI) makes AI-native SaaS platforms fast, secure, and affordable
- 10× cost reduction in inference pricing over two years means scalable AI is now economically viable for education providers

*Result: the technical barriers that once made AI impractical in HE are gone.*

**3. Incumbents Are Structurally Stuck**

| Incumbent Type | Constraint | Why It Matters |
|----------------|------------|----------------|
| Sales CRMs (HubSpot / Salesforce) | Wrong data model (MQL → SQL) | Would need full rebuild for HE — they won't |
| Legacy SIS (Ellucian / Unit4) | 20-year-old architecture | Can't retrofit modern AI or UI; too much tech debt |
| Horizontal AI Tools | No domain context | Impressive demos, zero operational value in HE workflows |
| University IT Teams | Limited capacity & AI expertise | Reinventing the wheel case-by-case; not sustainable |

*Net effect: Ivy OS moves faster, cleaner, and with deeper domain fit — while incumbents are years away from parity.*

**Timing Advantage:**
- **18-month head start:** working AI triage, forecasting, and CRM features already in production
- **Warm pipeline:** active discussions with WaterBear, BIMM, and Falmouth
- **Market gap:** no credible AI-native HE operating system exists yet
- **Window:** measured in quarters, not years — before incumbents adapt and procurement cycles renew

**Bottom line:**

Regulatory pressure, technical readiness, and incumbent inertia have aligned. Ivy OS is positioned to define the category of AI-native Higher Education operations software — and the window is open now.

---

## Slide 12: The Raise / Use of Funds

**Headline:** £450k to prove category leadership within 24 months.

**Sub-headline:** A focused, capital-efficient plan turning Ivy OS from a working product into a trusted system used by 10 UK institutions and generating £400k ARR.

**Round Structure:**

| Instrument | Valuation Cap | Discount | Raise Size | Runway |
|------------|--------------|----------|------------|--------|
| SAFE | £5 million | 20% | £450,000 | 24 months |

**Capital Allocation:**

| Category | Amount (£) | Purpose |
|----------|------------|---------|
| Founder Salary | 85,000 | Full-time focus; sustainable, lean leadership |
| Fractional Principal Engineer + QA | 140,000 | Architecture, security, AI infrastructure scaling |
| GTM & RevOps Support | 70,000 | Pilot delivery, onboarding, early customer success |
| Infrastructure & AI Compute | 55,000 | Supabase, model hosting, vector storage, usage costs |
| Legal & Compliance | 40,000 | Procurement docs, DPAs, OfS alignment, contracts |
| Contingency / R&D Buffer | 60,000 | Pilot extensions + unforeseen development |
| **Total** | **450,000** | |

**What 24 Months Delivers:**

**Month 6**
- ✓ 2 paid pilots live
- ✓ Product hardened from institutional feedback
- ✓ First ROI case study in progress

**Month 12**
- ✓ 3 total pilots (£18–32k each)
- ✓ 2 converted to annual contracts
- ✓ £60–90k ARR achieved
- ✓ Compliance-ready version live

**Month 18**
- ✓ 7–8 paying customers
- ✓ £200–250k ARR
- ✓ Sales playbook validated and repeatable

**Month 24**
- ✓ 10 institutions in production
- ✓ £300–400k ARR with clear path to £1M+
- ✓ Product-market fit demonstrated
- ✓ Ready for £1.5M Seed round with real traction

**Risk Mitigation Built In:**

- **Technical Risk →** Mitigated by: fractional principal engineer + QA, modern stack (FastAPI / Supabase / LangChain)
- **Market Risk →** Mitigated by: warm pipeline (WaterBear, BIMM, Falmouth), pilot structure for rapid feedback
- **Execution Risk →** Mitigated by: 5 years domain experience in HE ops and 24-month runway to absorb longer sales cycles

**Capital Efficiency:**
- £450k → £400k ARR = ~£1,100 cost per £1 ARR
- Top-quartile B2B SaaS efficiency
- No offices, minimal overhead, fractional team model
- Founder-led sales until revenue funds GTM hire

**Bottom line:**

This raise funds a disciplined 24-month execution plan to turn a working AI-native platform into a category leader with 10 institutional customers and clear path to £1M ARR — while building a technical and data moat before incumbents can react.

---

## Slide 13: Team & Advisors

**Headline:** Built by the operator who already solved the problem.

**Sub-headline:** Ivy OS was born from five years inside Higher Education recruitment, rebuilding the systems universities now need.

**Founder:**

**Laurance Bridge — Founder & CEO**
*Head of Student Recruitment, WaterBear College of Music (2019–Present)*

**Track Record:**
- Rebuilt WaterBear's full recruitment and data infrastructure from the ground up — combining CRM (HubSpot), Supabase/Postgres warehouse, and AI-assisted forecasting
- Delivered live 90-day forecasts with ±3–5% accuracy across six admission cycles
- Scaled annual intake from 52 to 750+ students and ARR to ~£11M
- Replaced Excel and Databox with real-time Supabase/Metabase pipeline trusted across Marketing, Admissions, and Student Success
- Created automated dashboards and playbooks that cut reporting time by 30% and improved offer-to-enrol conversion from 41% → 48%
- Developed XGBoost/LightGBM forecasting models now forming the foundation of Ivy OS

**Why It Matters:**
Most EdTech founders either understand education or can build software — few have rebuilt an institution's RevOps stack end to end while running admissions at scale. Laurance has done exactly that, translating five years of live operational problem-solving into a scalable, AI-native platform.

**Fractional Team (Funded in this Round):**

| Role | Focus | Contribution |
|------|-------|--------------|
| Principal Engineer (Fractional) | AI infrastructure, architecture, and code review | Ensures scalability, performance, and security |
| QA / Security Specialist | Continuous testing and penetration audits | De-risks enterprise adoption and compliance |
| RevOps / GTM Support | Pilot delivery, onboarding, and reporting | Converts early partners into long-term case studies |

**Advisory Network (In Development):**

| Expertise | Value to Ivy OS |
|-----------|-----------------|
| HE Admissions & Recruitment Leader | Validates messaging, opens doors across AUA / HEIST network |
| HE Data & Compliance Specialist | Ensures OfS / UCAS alignment and DPA readiness |
| AI Systems Architect | Guides model optimisation and infrastructure cost efficiency |

**Bottom line:**

A founder-operator with rare crossover between Higher Education, data systems, and AI — supported by senior fractional specialists to keep burn low and velocity high.

---

## Slide 14: Vision / Closing

**Headline:** From fixing admissions to powering the future of Higher Education.

**Sub-headline:** Ivy OS begins with student recruitment but grows into the intelligent operating system that will run every Higher Education institution.

**The 5-Year Build:**

**Phase 1 — Admissions Intelligence (Now → Year 2)**
- Proven forecasting (±5% accuracy) and AI triage live in production
- Replace fragmented CRMs with a single intelligent system
- Deliver measurable ROI and time savings to first 10 institutions

→ Outcome: Universities plan with confidence and eliminate guesswork

**Phase 2 — Student Records & Retention (Year 2 → 3)**
- Integrate student record and attendance data to create a single institutional view
- Predict at-risk students before withdrawal and trigger interventions
- Connect recruitment → enrolment → retention into one data stream

→ Outcome: Institutions shift from reactive to proactive student success

**Phase 3 — Full Operational OS (Year 3 → 5)**
- Add timetabling, compliance, and alumni engagement layers
- Enable end-to-end visibility of every student journey
- Use aggregated data to benchmark performance across the sector

→ Outcome: Ivy OS becomes the default infrastructure layer for intelligent universities

**The Inevitability:**

Within five years, every UK university will operate on AI-native systems. Manual spreadsheets and disconnected CRMs will feel as outdated as paper timetables.

The question isn't if this happens — it's who builds the platform that becomes infrastructure.

**First-mover advantage is decisive:**
- Data network effects (more institutions = smarter models)
- Integration depth (UCAS, OfS, EventMAP) that competitors can't replicate quickly
- Category ownership — defining the "AI-native HE OS"

**The Investment:**

£450,000 | £5M cap | 20% discount SAFE

Funds a disciplined 24-month plan:
- ✅ 10 institutions live in production
- ✅ £300–400k ARR with path to £1M run-rate
- ✅ Proven category leadership in AI-native Higher Education operations

**Closing Line:**

Ivy OS isn't another SaaS product — it's the infrastructure layer that lets Higher Education finally run on intelligence, not intuition.
The window is open. Let's build the system universities have been waiting for.

---

## Slide 15: Investor Thesis / Summary

**Headline:** Why Ivy OS is a top-quartile pre-seed investment.

**1 • Large and Inevitable Market**
- £150M near-term SAM hidden in existing HE budgets — no new spend required
- 400 UK institutions already pay £30–50k for fragmented CRM + SIS stacks
- Replacement market with zero budget friction → fast adoption
- Global TAM ≈ $10B education CRM + SIS market by 2030

**2 • Proven Product & Demand**
- 5 years of production proof at WaterBear (±5% forecast accuracy, 60% time saved)
- Working AI-native CRM + SIS stack live today — not concept
- Early interest from Falmouth University, BIMM Group, and WaterBear College
- Warm pipeline validates pain and budget fit

**3 • Defensible Moat**
- 18-month technical lead ahead of any AI HE entrant
- Compounding data moat — more institutions → smarter models → better forecasts
- Deep integrations (UCAS, OfS, EventMAP) create high switching costs
- Incumbents can't pivot (legacy architecture + wrong incentives)

**4 • Exceptional Founder**

Laurance Bridge, Head of Student Recruitment at WaterBear, rebuilt the entire admissions data stack while scaling student numbers 52 → 750+. Combines rare domain expertise + technical execution — has already solved the problem Ivy OS commercialises. Supported by fractional principal engineer, QA/security, and RevOps specialists to scale capital-efficiently.

**5 • Capital-Efficient Return Profile**

| Milestone | Customers | ARR | Timeline |
|-----------|-----------|-----|----------|
| Initial traction | 3 pilots | £75k | Month 12 |
| Product-market fit | 10 customers | £350k | Month 18 |
| Scale momentum | 25 customers | £1M | Month 30 |

- £450k → £400k ARR = <£1,200 per £1 ARR (top-quartile efficiency)
- 90%+ gross margins and 10:1 LTV:CAC ratio at scale
- Path to profitability by ~20 customers

**The Investment:**

**Raise:** £450k Pre-Seed | **Cap:** £5M | **Discount:** 20% SAFE | **Runway:** 24 months

**Use:** Full-time founder focus • Fractional engineering & QA • GTM execution • Compute & compliance budget

**Outcome:** 10 paying institutions, £400k ARR, and clear category leadership within two years.

**Closing Line:**

Ivy OS isn't a bet on AI in education — it's the platform that makes AI operational in Higher Education.
The window is open now — the first to build wins.
