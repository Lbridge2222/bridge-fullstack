# Bridge CRM - Database Documentation

## Overview

The Bridge CRM database is designed to support a comprehensive student relationship management system for educational institutions. The database uses PostgreSQL with UUID primary keys and follows a normalized relational design that can be adapted to any type of educational institution.

## Database Architecture

### Core Philosophy
- **Educational Institution Agnostic**: Flexible data structures that work for any type of education provider
- **Student Lifecycle Management**: Tracks prospective students from initial enquiry through enrollment
- **CRM-First Design**: Optimized for lead management and admissions workflows
- **AI/ML Integration**: Supports predictive analytics and lead scoring
- **Progressive Disclosure**: Custom properties system for flexible data collection

## Migration System

### Migration Files Structure
```
backend/db/migrations/
├── 0001_init.sql                           # Core schema foundation
├── 0003_mv_board_applications.sql          # Application board materialized view
├── 0004_people_lifecycle_enum.sql          # Lifecycle state management
├── 0005_people_contact_enhancements.sql    # Contact information expansion
├── 0006_programmes_details.sql             # Programme metadata
├── 0007_analytics_touchpoints.sql          # Engagement tracking
├── 0008_consents_retention.sql             # GDPR compliance
├── 0014_lifecycle_stage_alignment.sql      # Lifecycle standardization
├── 0019_merged_comprehensive_seed.sql      # Base seed data
├── 0020_create_lead_notes.sql              # Lead annotation system
├── 0026_fix_leads_view_to_lead.sql         # Lead management view
├── 0027_enhanced_seed_data.sql             # Rich custom properties
├── 0028_comprehensive_realistic_data.sql   # 150+ realistic leads
└── README.md                               # This documentation file
```

### Running Migrations

#### Automatic Migration Script
```bash
cd backend
./run_migrations.sh
```

#### Manual Migration
```bash
cd backend
psql -h localhost -U postgres -d bridge_crm -f db/migrations/0001_init.sql
# Continue with each migration in order...
```

#### Migration Order
Migrations must be run in numerical order. Each migration is idempotent and can be run multiple times safely.

### Migration Lessons Learned

#### Common Migration Issues & Solutions

**1. UUID Type Casting**
```sql
-- ❌ WRONG - Causes "column is of type uuid but expression is of type text"
WHEN 0 THEN '550e8400-e29b-41d4-a716-446655440201'

-- ✅ CORRECT - Always cast string literals to UUID
WHEN 0 THEN '550e8400-e29b-41d4-a716-446655440201'::uuid
```

**2. Unique Constraint Violations**
```sql
-- ❌ WRONG - Can create duplicate emails
email = first_name || '.' || last_name || '@gmail.com'

-- ✅ CORRECT - Add unique identifier
email = first_name || '.' || last_name || '.' || n::text || '@gmail.com'
```

**3. Schema Mismatch Issues**
- Always check existing table schemas before writing migrations
- Use `\d table_name` in psql to inspect column types
- Reference existing migrations to understand data patterns

**4. Foreign Key Relationships**
- Ensure referenced records exist before creating foreign keys
- Use `ON CONFLICT DO NOTHING` for seed data
- Check constraint names and column names match exactly

**5. Data Type Compatibility**
- `date_of_birth` expects `date` type - cast entire expression: `((...))::date`
- `chr()` function expects `int` - cast: `chr(65 + floor(random() * 3)::int)`
- Array indexing requires proper bounds checking

#### Migration Best Practices

**1. Always Use Idempotent Operations**
```sql
-- ✅ Good - Safe to run multiple times
INSERT INTO table (id, name) VALUES ('uuid', 'name') ON CONFLICT (id) DO NOTHING;

-- ❌ Bad - Will fail on second run
INSERT INTO table (id, name) VALUES ('uuid', 'name');
```

**2. Clear Existing Data Before Major Changes**
```sql
-- Clear specific data ranges to avoid conflicts
DELETE FROM people WHERE id::text LIKE '550e8400-e29b-41d4-a716-446655441%';
```

**3. Use Meaningful ID Patterns**
- Base data: `550e8400-e29b-41d4-a716-446655440xxx`
- New leads: `550e8400-e29b-41d4-a716-446655441xxx`
- This prevents ID conflicts between migrations

**4. Test Data Relationships**
- Always create applications to link leads to programmes
- Ensure `vw_leads_management` view has data to display
- Verify foreign key relationships work end-to-end

**5. Handle Edge Cases**
- Check for existing data before inserting
- Use proper error handling for constraint violations
- Include summary queries to verify data integrity

#### Real-World Migration Issues Encountered

**Issue 1: Generic vs Domain-Specific Data**
- **Problem**: Created music academy specific data that limited product appeal
- **Solution**: Made all data generic and institution-agnostic
- **Lesson**: Always consider product scalability and IP implications

**Issue 2: Missing Application Data**
- **Problem**: Created leads without applications, causing empty course/campus data
- **Solution**: Always create applications linking leads to programmes
- **Lesson**: Frontend depends on complete data relationships

**Issue 3: Schema Evolution Without Understanding Context**
- **Problem**: Added columns without understanding existing data patterns
- **Solution**: Study existing migrations and data conventions first
- **Lesson**: Always understand the full system context before making changes

**Issue 4: UUID vs Text Type Mismatches**
- **Problem**: PostgreSQL strict typing caused migration failures
- **Solution**: Always cast string literals to appropriate types
- **Lesson**: PostgreSQL is stricter than other databases - type everything explicitly

**Issue 5: Unique Constraint Violations in Bulk Inserts**
- **Problem**: Random data generation created duplicate values
- **Solution**: Add unique identifiers to generated data
- **Lesson**: Bulk data generation needs uniqueness guarantees

## Core Database Schema

### Organizational Structure

#### `orgs` - Organizations
```sql
id          uuid PRIMARY KEY
name        text NOT NULL
created_at  timestamptz DEFAULT now()
```
Represents the educational institution organization.

#### `users` - Staff Members
```sql
id          uuid PRIMARY KEY
org_id      uuid REFERENCES orgs(id)
name        text NOT NULL
email       text UNIQUE NOT NULL
role        text DEFAULT 'member'
created_at  timestamptz DEFAULT now()
```
Staff members who can be assigned to applications and activities.

### People Management

#### `people` - Prospective Students & Contacts
```sql
-- Core Identity
id                      uuid PRIMARY KEY
org_id                 uuid REFERENCES orgs(id)
external_ref           text                        -- External system ID
first_name             text
last_name              text
email                  text
phone                  text

-- Lifecycle Management
lifecycle_state        text DEFAULT 'lead'         -- lead, applicant, enrolled
created_at             timestamptz DEFAULT now()
updated_at             timestamptz DEFAULT now()

-- Contact Details (via migration 0005)
date_of_birth          date
nationality            text
address_line1          text
address_line2          text
city                   text
postcode               text
country                text
phone_country_code     text
phone_number           text
phone_extension        text
preferred_contact_method text                      -- email, phone, sms, post

-- Analytics & Scoring (via migration 0007)
touchpoint_count       int DEFAULT 0
last_engagement_date   timestamptz
lead_score            int DEFAULT 0                -- 0-100 scoring
engagement_score      int DEFAULT 0                -- 0-100 engagement
conversion_probability decimal(3,2)                -- 0.00-1.00 ML prediction

-- CRM Fields
assigned_to           text                         -- Assigned staff member
status                text                         -- new, contacted, qualified, etc.
next_follow_up        date                         -- Next action date
```

**Lifecycle States:**
- `lead`: Initial enquiry stage
- `applicant`: Has submitted application
- `enrolled`: Accepted and enrolled student

#### `lifecycle_states` - State Change History
```sql
id          uuid PRIMARY KEY
person_id   uuid REFERENCES people(id) ON DELETE CASCADE
state       text NOT NULL
changed_at  timestamptz DEFAULT now()
changed_by  uuid REFERENCES users(id)
```
Tracks all lifecycle state changes for audit purposes.

### Academic Structure

#### `campuses` - Physical/Virtual Locations
```sql
id      uuid PRIMARY KEY
org_id  uuid REFERENCES orgs(id)
name    text NOT NULL
```
Examples: London Campus, Manchester Campus, Online Campus

#### `programmes` - Academic Courses
```sql
id          uuid PRIMARY KEY
org_id      uuid REFERENCES orgs(id)
campus_id   uuid REFERENCES campuses(id)
code        text                            -- Course code (e.g., BUS-BA-001)
name        text NOT NULL                   -- Full programme name
level       text                            -- undergraduate, postgraduate, foundation
mode        text                            -- full-time, part-time

-- Extended Details (via migration 0006)
duration_months      int
fees_uk_home        decimal(10,2)
fees_international  decimal(10,2)
entry_requirements  text
mode_delivery       text
```

**Example Programmes:**
- BA (Hons) Business Management
- BSc (Hons) Computer Science
- BA (Hons) Psychology
- MA Education
- Foundation Certificate in Arts

#### `intakes` - Academic Periods
```sql
id           uuid PRIMARY KEY
org_id       uuid REFERENCES orgs(id)
cycle_label  text NOT NULL              -- e.g., "2025/26"
start_date   date
end_date     date
```

### Application Management

#### `applications` - Student Applications
```sql
id               uuid PRIMARY KEY
org_id           uuid REFERENCES orgs(id)
person_id        uuid REFERENCES people(id) ON DELETE CASCADE
programme_id     uuid REFERENCES programmes(id)
intake_id        uuid REFERENCES intakes(id)
status           text DEFAULT 'open'           -- open, closed, withdrawn
stage            text DEFAULT 'enquiry'        -- enquiry, submitted, review, etc.
source           text                          -- How they found us
sub_source       text                          -- Specific campaign/referral
assignee_user_id uuid REFERENCES users(id)    -- Assigned admissions officer
created_at       timestamptz DEFAULT now()
updated_at       timestamptz DEFAULT now()

-- Analytics (via migration 0007)
touchpoint_count    int DEFAULT 0
time_to_decision    int                        -- Days from application to decision
decision_factors    jsonb                      -- Structured decision data
attribution_path    jsonb                      -- Marketing attribution
```

**Application Stages:**
- `enquiry`: Initial interest
- `submitted`: Application submitted
- `review`: Under review
- `interview_scheduled`: Interview arranged
- `offer_made`: Offer extended
- `accepted`: Offer accepted
- `rejected`: Application declined

#### `pipeline_history` - Stage Changes
```sql
id             uuid PRIMARY KEY
application_id uuid REFERENCES applications(id) ON DELETE CASCADE
from_stage     text
to_stage       text NOT NULL
changed_at     timestamptz DEFAULT now()
changed_by     uuid REFERENCES users(id)
note           text
```

### Assessment & Decision Making

#### `interviews` - Interview Management
```sql
id              uuid PRIMARY KEY
org_id          uuid REFERENCES orgs(id)
application_id  uuid REFERENCES applications(id) ON DELETE CASCADE
scheduled_start timestamptz NOT NULL
scheduled_end   timestamptz NOT NULL
mode            text                    -- in-person, video, phone
location        text
outcome         text                    -- passed, failed, pending
notes           text
created_at      timestamptz DEFAULT now()
```

#### `offers` - Conditional/Unconditional Offers
```sql
id             uuid PRIMARY KEY
org_id         uuid REFERENCES orgs(id)
application_id uuid REFERENCES applications(id) ON DELETE CASCADE
type           text                     -- conditional, unconditional
conditions     jsonb                    -- Structured conditions data
issued_at      timestamptz DEFAULT now()
expires_at     timestamptz
status         text DEFAULT 'issued'    -- issued, accepted, declined, expired
```

#### `enrolments` - Final Enrollment
```sql
id             uuid PRIMARY KEY
org_id         uuid REFERENCES orgs(id)
application_id uuid REFERENCES applications(id) ON DELETE CASCADE
confirmed_at   timestamptz DEFAULT now()
fee_status     text                     -- home, international
funding_route  text                     -- self-funded, loan, scholarship
notes          text
```

### Activity & Communication Tracking

#### `activities` - All Interactions
```sql
id             uuid PRIMARY KEY
org_id         uuid REFERENCES orgs(id)
actor_user_id  uuid REFERENCES users(id)        -- Who performed the action
person_id      uuid REFERENCES people(id) ON DELETE SET NULL
application_id uuid REFERENCES applications(id) ON DELETE SET NULL
kind           text NOT NULL                     -- email, call, note, meeting
direction      text                              -- inbound, outbound
title          text
body           text
due_at         timestamptz                       -- For tasks/reminders
completed_at   timestamptz                       -- When completed
meta           jsonb                             -- Additional structured data
created_at     timestamptz DEFAULT now()
```

**Activity Types:**
- `email`: Email communication
- `call`: Phone calls
- `note`: Internal notes
- `meeting`: Meetings/interviews
- `task`: Action items
- `sms`: SMS messages

#### `attachments` - File Storage
```sql
id          uuid PRIMARY KEY
org_id      uuid REFERENCES orgs(id)
activity_id uuid REFERENCES activities(id) ON DELETE CASCADE
filename    text NOT NULL
storage_key text NOT NULL              -- Cloud storage reference
mime        text
size        int
```

#### `touchpoints` - Digital Engagement (Migration 0007)
```sql
id                    uuid PRIMARY KEY
org_id                uuid REFERENCES orgs(id)
person_id             uuid REFERENCES people(id) ON DELETE SET NULL
application_id        uuid REFERENCES applications(id) ON DELETE SET NULL
activity_id           uuid REFERENCES activities(id) ON DELETE SET NULL

-- Touchpoint Classification
touchpoint_type       text NOT NULL        -- website, email, social, etc.
touchpoint_source     text NOT NULL        -- google, facebook, direct
touchpoint_medium     text                 -- cpc, organic, social
touchpoint_campaign   text                 -- Campaign identifier

-- Content Details
content_id            text                 -- Page/content identifier
content_title         text                 -- Human-readable content name
content_variant       text                 -- A/B test variant
engagement_duration   int                  -- Time spent (seconds)
engagement_depth      int                  -- Scroll depth, pages viewed
conversion_action     text                 -- form_submit, download, etc.

-- Technical Details
user_agent           text
ip_address           inet
referrer             text

-- UTM Parameters
utm_source           text
utm_medium           text
utm_campaign         text
utm_term             text
utm_content          text

created_at           timestamptz DEFAULT now()
expires_at           timestamptz
```

### Custom Properties System

#### `custom_properties` - Flexible Field Definitions
```sql
id                uuid PRIMARY KEY
org_id            uuid REFERENCES orgs(id)
entity            text NOT NULL           -- 'people', 'applications', etc.
name              text NOT NULL           -- Field name (system key)
label             text NOT NULL           -- Display label
data_type         text NOT NULL           -- string, number, boolean, date
is_required       boolean DEFAULT false   -- Required field
is_indexed        boolean DEFAULT false   -- Create database index
created_at        timestamptz DEFAULT now()

UNIQUE(org_id, entity, name)
```

#### `custom_values` - Flexible Field Values
```sql
id          uuid PRIMARY KEY
org_id      uuid REFERENCES orgs(id)
entity      text NOT NULL               -- Must match custom_properties.entity
entity_id   uuid NOT NULL               -- Reference to the actual record
property_id uuid REFERENCES custom_properties(id) ON DELETE CASCADE
value       jsonb                       -- Flexible value storage
created_at  timestamptz DEFAULT now()
```

## Key Views and Materialized Views

### `vw_leads_management` - Primary Leads View
```sql
-- Created in migration 0026
-- Provides denormalized data for the leads management UI
SELECT 
    p.id::text,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.lifecycle_state,
    p.lead_score,
    p.conversion_probability::float,
    p.assigned_to,
    p.status,
    p.next_follow_up,
    p.created_at,
    p.updated_at,
    
    -- Latest application info
    a.stage as latest_application_stage,
    pr.name as latest_programme_name,
    c.name as latest_campus_name,
    i.cycle_label as latest_academic_year,
    
    -- Activity tracking
    COALESCE(p.updated_at, p.created_at) as last_activity_at
FROM people p
LEFT JOIN LATERAL (
    SELECT stage, programme_id, intake_id
    FROM applications ap
    WHERE ap.person_id = p.id
    ORDER BY ap.created_at DESC
    LIMIT 1
) a ON true
LEFT JOIN programmes pr ON pr.id = a.programme_id
LEFT JOIN campuses c ON c.id = pr.campus_id
LEFT JOIN intakes i ON i.id = a.intake_id
WHERE p.lifecycle_state = 'lead'
ORDER BY p.lead_score DESC NULLS LAST, p.created_at DESC;
```

### `vw_board_applications` - Application Board
```sql
-- Created in migration 0003
-- Materialized view for application board performance
-- Provides quick access to application pipeline data
```

## Database Triggers and Functions

### Automatic Timestamp Updates
```sql
-- Function: set_updated_at()
-- Updates the updated_at column on record changes
-- Applied to: people, applications tables
```

### Touchpoint Aggregation
```sql
-- Function: on_touchpoint_insert()
-- Automatically updates touchpoint_count and last_engagement_date
-- Triggered on: touchpoints table INSERT
```

## Indexing Strategy

### Primary Indexes
- All tables have UUID primary keys with automatic indexes
- Foreign key columns have explicit indexes for join performance

### Performance Indexes
```sql
-- People table
idx_people_org              -- (org_id)
idx_people_state            -- (lifecycle_state)
people_unique_email_per_org -- UNIQUE(org_id, email) WHERE email IS NOT NULL

-- Applications table
idx_app_stage               -- (org_id, stage)
idx_app_person              -- (person_id)
idx_app_prog                -- (programme_id)
idx_app_intake              -- (intake_id)
idx_app_assignee            -- (assignee_user_id)

-- Activities table
idx_act_org                 -- (org_id, created_at DESC)
idx_act_person              -- (person_id, created_at DESC)
idx_act_app                 -- (application_id, created_at DESC)
idx_act_kind                -- (kind)

-- Touchpoints table
idx_touchpoints_person      -- (person_id, created_at DESC)
idx_touchpoints_application -- (application_id, created_at DESC)
idx_touchpoints_type        -- (touchpoint_type, created_at DESC)
idx_touchpoints_campaign    -- (utm_campaign, created_at DESC)
```

## Data Seeding Strategy

### Base Seed Data (Migration 0019)
- Organization: Bridge Academy
- 5 Staff Users (admissions team)
- 4 Academic Programmes
- 2 Intake Periods
- ~20 Initial people records

### Enhanced Seed Data (Migration 0027)
- 20 Additional diverse leads
- Custom properties population
- Rich engagement data
- International students
- Mature students

### Comprehensive Realistic Data (Migration 0028)
- 150 Additional realistic leads
- 10 Academic programmes total
- 4 Campus locations
- Varied demographics and engagement patterns
- Complete application chains
- Realistic timestamps and scoring

## AI/ML Integration

### Lead Scoring Fields
- `lead_score`: 0-100 manual/calculated score
- `engagement_score`: 0-100 engagement level
- `conversion_probability`: 0.00-1.00 ML prediction
- `touchpoint_count`: Total interactions

### ML Feature Sources
The database provides rich features for ML models:
- Demographic data (age, nationality, location)
- Engagement metrics (touchpoints, time spent)
- Application stage progression
- Source attribution
- Communication preferences

## GDPR and Data Protection

### Consent Management (Migration 0008)
- `consents` table: Tracks consent types and status
- `consent_events` table: Audit trail of consent changes
- Privacy-first design with explicit consent tracking

### Data Retention
- Automatic triggers for consent expiry
- Structured approach to data anonymization
- Clear data lineage for compliance

## Frontend Integration

### API Endpoints
The database supports these key API endpoints:
- `/people/leads` - Leads management page data
- `/ai/advanced-ml/predict-batch` - ML prediction integration
- `/ai/leads/triage` - AI-powered lead prioritization

### Key Frontend Data Flows
1. **Leads Management**: `vw_leads_management` → Frontend compact view
2. **Applications Board**: `vw_board_applications` → Kanban interface
3. **AI Scoring**: Multiple tables → ML pipeline → Frontend display

## Best Practices

### Adding New Migrations
1. Use sequential numbering (0029, 0030, etc.)
2. Make migrations idempotent (use IF NOT EXISTS, ON CONFLICT, etc.)
3. Include rollback information in comments
4. Test on development database first

### Data Modifications
1. Use transactions for multi-table changes
2. Respect foreign key constraints
3. Update materialized views after structural changes
4. Consider performance impact of large data operations

### Custom Properties
1. Use appropriate data_type for validation
2. Set is_indexed=true for frequently queried fields
3. Use descriptive labels for UI display
4. Consider lifecycle_state-specific properties

## Troubleshooting

### Common Issues
1. **Connection Refused**: Ensure PostgreSQL is running
2. **Permission Denied**: Check user permissions for database operations
3. **Migration Failures**: Run migrations in correct order
4. **Performance Issues**: Check index usage and query plans

### Specific Error Solutions

**Error: `column "programme_id" is of type uuid but expression is of type text`**
```sql
-- Problem: String literals not cast to UUID
WHEN 0 THEN '550e8400-e29b-41d4-a716-446655440201'

-- Solution: Cast to UUID
WHEN 0 THEN '550e8400-e29b-41d4-a716-446655440201'::uuid
```

**Error: `duplicate key value violates unique constraint "people_unique_email_per_org"`**
```sql
-- Problem: Random email generation can create duplicates
email = first_name || '.' || last_name || '@gmail.com'

-- Solution: Add unique identifier
email = first_name || '.' || last_name || '.' || n::text || '@gmail.com'
```

**Error: `column "first_name" of relation "users" does not exist`**
```sql
-- Problem: Assumed schema without checking
INSERT INTO users (id, org_id, first_name, last_name, email, role)

-- Solution: Check actual schema - users table only has 'name' column
INSERT INTO users (id, org_id, name, email, role)
```

**Error: `column "date_of_birth" is of type date but expression is of type text`**
```sql
-- Problem: Partial casting
((2000 + floor(random() * 25))::text || '-' || ...)::date

-- Solution: Cast entire expression
((2000 + floor(random() * 25))::text || '-' || 
 lpad(floor(random() * 12 + 1)::text, 2, '0') || '-' || 
 lpad(floor(random() * 28 + 1)::text, 2, '0'))::date
```

**Error: `function chr(double precision) does not exist`**
```sql
-- Problem: chr() expects integer
chr(65 + floor(random() * 3))

-- Solution: Cast to integer
chr(65 + floor(random() * 3)::int)
```

### Useful Queries
```sql
-- Check lead distribution
SELECT lifecycle_state, COUNT(*) 
FROM people 
GROUP BY lifecycle_state;

-- Application pipeline health
SELECT stage, COUNT(*) 
FROM applications 
GROUP BY stage 
ORDER BY COUNT(*) DESC;

-- Recent engagement summary
SELECT 
    DATE_TRUNC('week', last_engagement_date) as week,
    COUNT(*) as engaged_leads
FROM people 
WHERE last_engagement_date > NOW() - INTERVAL '8 weeks'
GROUP BY week 
ORDER BY week;
```

## Schema Evolution

The database schema follows these patterns:
- **Additive Changes**: New columns and tables added via migrations
- **Data Preservation**: Existing data maintained during schema changes
- **Backward Compatibility**: API contracts maintained across changes
- **Performance Optimization**: Indexes and views optimized iteratively

This documentation should be updated whenever the schema changes significantly or new patterns are established.
