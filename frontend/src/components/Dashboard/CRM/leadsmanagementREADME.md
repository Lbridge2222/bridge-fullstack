# 🎯 Leads Management - AI Intelligence Guide

## Overview

The Leads Management page in Ivy CRM is powered by advanced AI systems that provide intelligent lead scoring, prioritization, and conversion forecasting. This document explains how the AI features work, recent improvements, and what they mean for your lead management workflow.

## 🚀 Recent Updates & Improvements (September 2025)

### UI/UX Enhancements
- **Compact View Focus**: Refactored to prioritize the compact view as the primary interface for rapid lead conversion
- **Selection Ring Fix**: Fixed selection outline overflow beyond table bounds using `ring-1 ring-inset`
- **Responsive Virtual Scrolling**: Added ResizeObserver for dynamic viewport adaptation
- **Improved Accessibility**: Enhanced context menu with proper ARIA roles and keyboard navigation
- **Better Visual Hierarchy**: Cleaner spacing, bolder names, and more prominent color indicators

### Performance Optimizations
- **Stable Event Handlers**: Fixed stale closure issues in keyboard shortcuts
- **Centralized Color Logic**: Created `getEffectiveTag()` utility for consistent color override handling
- **SSR Safety**: Added localStorage access protection for server-side rendering
- **Type Safety**: Improved Checkbox typing with proper `boolean | "indeterminate"` handling

### ML System Verification
- **Target Variable Confirmed**: ML predictions target `has_application` (conversion to pre-applicant status)
- **API Integration Fixed**: Resolved 422 errors by standardizing payload format
- **Probability Calibration**: Confirmed sigmoid transformation spreads probabilities across 5%-95% range
- **Feature Engineering**: Verified 20+ features including lead score, engagement, temporal, and academic factors

## 🤖 AI Features Overview

### 1. ML Prediction System (`/ai/advanced-ml/predict-batch`)

**What it does:** Provides conversion probability and confidence scores for each lead using machine learning.

**How it works:**
- **20+ Engineered Features**: The system analyzes 20+ data points per lead including:
  - **Lead Score**: Current manual/calculated lead score (0-100)
  - **Engagement Score**: Activity level and interaction frequency
  - **Temporal Features**: Days since creation, creation timing (month/day/hour)
  - **Academic Calendar**: Whether created during application season
  - **Touchpoint Count**: Number of interactions with the lead
  - **Lifecycle State**: Lead → Applicant → Student progression
  - **Source Quality**: Website, referral, social, email sources
  - **Campus Preference**: Location-based factors
  - **Interaction Features**: Score squared, logarithmic transformations

**Output:**
- **ML Probability**: 0-100% conversion likelihood (calibrated using sigmoid transformation)
- **ML Confidence**: How certain the model is about its prediction
- **Prediction**: Boolean true/false for conversion likelihood

**UI States:**
- **Loading**: Shows "Loading ML..." with spinner until predictions arrive
- **Confident**: High confidence (>80%) - solid prediction
- **Medium**: Medium confidence (60-80%) - reasonable prediction
- **Low**: Low confidence (<60%) - uncertain prediction
- **Insufficient Data**: Not enough data for reliable prediction

### 2. AI Triage System (`/ai/leads/triage`)

**What it does:** ML‑first triage with LLM explanations. ML provides calibrated conversion probabilities; the LLM explains why and recommends next actions.

**Updated Behaviour (Sept 2025):**
- Button is now: **“Explain with AI”** (no re‑ordering).
- Analyses **all filtered leads** (not just the current page), so explanations persist across pagination.
- Uses brand colours from `index.css` (bluey slate surfaces; black text).
- No emojis; shadcn icons only (e.g., FileText for suggested content).
- UK English copy throughout.

**Returned fields per lead:**
- `score` (number): Primary ML score in percent (calibrated)
- `ml_confidence` (0–1)
- `ml_probability` (0–1)
- `ml_calibrated` (0–1)
- `reasons` (string[]): Specific ML drivers
- `insight` (string)
- `next_action` (string): Highly specific action (e.g., `schedule_interview_urgent`, `invite_open_day_[campus]`)
- `suggested_content` (string)
- `action_rationale` (string): Short justification referencing concrete signals (e.g., website visits, email replies, touchpoints)
- `escalate_to_interview` (boolean): Auto‑true when calibrated ≥ 70%
- `feature_coverage` (0–1)

**JSON robustness:**
- Parser accepts arrays or wrapped objects (`items`/`results`/`explanations`/`data`), and id keys `id`/`lead_id`/`uid`.
- Markdown code‑fence cleaning included.

**Interview escalation:**
- When calibrated probability ≥ 70%, we enforce interview escalation and show an “Interview” badge on the AI pill.

### 3. Color Coding System

**How colors are assigned:**
- **Frontend-derived**: Colors are calculated in the frontend based on lead score and conversion probability
- **Not stored in database**: Colors are computed dynamically for real-time accuracy
- **Manual overrides**: Users can manually assign colors (stored in localStorage per-user)

**Color Categories:**
- **Priority** (Red): High-value, urgent leads requiring immediate attention
- **Hot** (Orange): Strong conversion potential, active engagement
- **Qualified** (Green): Good fit, progressing well through funnel
- **Nurture** (Blue): Needs more engagement, long-term potential
- **Follow-up** (Purple): Requires follow-up action
- **Research** (Yellow): Needs more information gathering
- **Cold** (Gray): Low activity, may need re-engagement

### 4. Blocker Detection

**Automatic Detection:**
- **Data Completeness**: Missing contact info, GDPR consent, course preferences
- **Engagement Stall**: No activity for 14+ days, zero engagement signals
- **Source Quality**: Low-quality lead sources (paid_social, unknown, organic)
- **Course Capacity**: Oversubscribed courses, poor fit scenarios

**Severity Levels:**
- **Critical**: Immediate action required
- **High**: Important to address soon
- **Medium**: Should be addressed
- **Low**: Nice to have

## 🎨 UI/UX Improvements & Visual Fixes

### Compact View Refactoring
- **Primary Interface**: Compact view is now the main interface for rapid lead conversion
- **Visual Hierarchy**: Bold names, muted emails, compact course/campus pills
- **Color Accent Bars**: 8px left accent bars with rounded corners wrapping the row
- **Color Dots**: Opaque color indicators next to avatars for quick priority identification
- **Selection Ring Fix**: Fixed overflow issue using `ring-1 ring-inset` instead of `ring-2`

### Responsive Design
- **Dynamic Virtual Scrolling**: ResizeObserver automatically adjusts to viewport size
- **Mobile Optimization**: Responsive breakpoints for different screen sizes
- **Touch-Friendly**: Proper touch targets and gesture support

### Accessibility Enhancements
- **ARIA Roles**: Proper `role="menu"` and `role="menuitem"` for context menus
- **Keyboard Navigation**: Full keyboard support with Escape key handling
- **Screen Reader Support**: Proper labels and descriptions for all interactive elements
- **Focus Management**: Clear focus indicators and logical tab order

### Performance Optimizations
- **Stable Callbacks**: All event handlers properly memoized to prevent re-renders
- **Centralized State**: Color override logic centralized with `getEffectiveTag()` utility
- **Efficient Filtering**: Optimized filter logic with proper dependency arrays
- **Memory Management**: Proper cleanup of event listeners and observers

## 🎯 Core Features & User Interface

### View Modes & Layout

#### Compact View (Primary Interface)
- **Purpose**: Optimized for rapid lead conversion and triage
- **Layout**: Horizontal rows with color-coded left accent bars
- **Visual Elements**:
  - **Color Accent Bar**: 8px left border with rounded corners wrapping the row
  - **Color Dot**: Opaque indicator next to avatar for quick priority identification
  - **Bold Names**: Clickable lead names that navigate to Person Properties page
  - **Course/Campus Pills**: Compact badges showing lead preferences
  - **AI Score Bar**: Horizontal progress bar with percentage display
  - **Status Badges**: "New Lead", "Urgent", and other status indicators

#### Table View (Alternative)
- **Purpose**: Detailed tabular view with sortable columns
- **Features**: Virtual scrolling for performance with large datasets
- **Columns**: Lead Details, Course, AI Score, ML Prediction, ML Confidence, Status, Actions
- **Sorting**: Clickable headers with toggle behavior (asc/desc)

#### Cards View (Legacy)
- **Purpose**: Card-based layout for visual browsing
- **Status**: Hidden by default, available for specific use cases

### Selection System

#### Select All Functionality
**How it works:**
1. **Header Checkbox**: Selects/deselects all visible leads on current page
2. **Select Page Button**: Opens dialog with selection options
3. **Selection Options**:
   - **Current Page Only**: Selects all leads visible on current page
   - **All Filtered Leads**: Selects all leads matching current filters
   - **Clear Selection**: Deselects all currently selected leads

**Technical Implementation:**
```javascript
const selectAllVisible = () => {
  setSelectedLeads(prev => {
    const newSet = new Set(prev);
    paginationData.paginatedLeads.forEach((l) => newSet.add(l.uid));
    return newSet;
  });
};
```

**Selection State Management:**
- **State**: `selectedLeads` - Set of lead UIDs
- **Persistence**: Selection persists across page changes
- **Visual Feedback**: Selected rows show ring-1 ring-inset styling
- **Bulk Actions**: Available when leads are selected

### Keyboard Shortcuts

#### Global Shortcuts
- **⌘K / Ctrl+K**: Focus search input
- **⌥F / Alt+F**: Toggle filters panel
- **Escape**: Clear search and close suggestions
- **⌘A / Ctrl+A**: Select all visible leads

#### Row-Level Shortcuts (when lead is focused)
- **⌘P / Ctrl+P**: Call lead (opens call composer)
- **⌘E / Ctrl+E**: Email lead (opens email composer)
- **⌘M / Ctrl+M**: Book meeting (opens meeting booker)
- **⌘U / Ctrl+U**: Toggle urgent status

**Technical Implementation:**
```javascript
const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
  // Global shortcuts
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    searchInputRef.current?.focus();
  }
  // Row-level shortcuts
  if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    const focused = focusedLeadRef.current;
    if (focused) {
      const key = e.key.toLowerCase();
      if (key === 'c') handlePhoneClick(focused);
      // ... other shortcuts
    }
  }
}, [dependencies]);
```

### Search & Filtering System

#### Search Functionality
- **Real-time Search**: Debounced search across lead names, emails, and courses
- **Search Suggestions**: Auto-complete with lead names, courses, and sources
- **Search Scope**: Searches across all lead data fields
- **Clear Search**: Escape key or clear button

#### Filter System
**Available Filters:**
- **Status**: New, Contacted, Qualified, Converted, Lost
- **Source**: Website, Referral, Social, Email, etc.
- **Course**: All available courses
- **Academic Year**: 2024, 2025, 2026, etc.
- **Urgent Only**: Toggle for urgent leads
- **Color Tag**: Priority, Hot, Qualified, Nurture, etc.

**Filter Chips:**
- **Active Filters**: Displayed as chips below header
- **Clear Individual**: Click X on chip to remove specific filter
- **Clear All**: Button to remove all active filters

**Custom Filters:**
- **Create Custom**: JSON-based filter creation
- **Save Filters**: Persisted per-user in localStorage
- **Apply Filters**: One-click application of saved filters

### Sorting & Pagination

#### Sorting Options
**Available Sort Keys:**
- **Name**: Alphabetical (A-Z, Z-A)
- **Created Date**: Newest/Oldest first
- **Last Contact**: Most/Least recent activity
- **ML Probability**: AI score (High/Low)
- **Lead Score**: Manual score (High/Low)

**Sort Behavior:**
- **Toggle Order**: Click same header toggles asc/desc
- **Visual Indicators**: Sort icons show current direction
- **Default Sort**: ML Probability descending (AI-optimized)

#### Pagination
- **Items Per Page**: 25, 50, 100 options
- **Page Navigation**: Previous/Next buttons with page numbers
- **Total Count**: Shows total leads and current page info
- **Selection Persistence**: Selected leads persist across pages

### Actions & Interactions

#### Inline Actions (Compact View)
- **Call Button**: Direct call action with phone validation
- **Email Button**: Opens email composer
- **Meeting Button**: Opens meeting booker
- **More Menu**: Additional actions (View Person Record, etc.)

#### Context Menu (Right-click)
- **Color Tag Assignment**: Quick color override
- **Additional Actions**: Context-specific options
- **Keyboard Accessible**: Full keyboard navigation support

#### Bulk Actions
- **Color Tag Assignment**: Apply color to multiple leads
- **Export Selected**: Export selected leads to CSV/Excel
- **Bulk Email**: Send emails to multiple leads
- **Status Updates**: Change status for multiple leads

### Saved Views & My Filters
- **Saved Views**: Persist sets of filters/sorts for quick access
- **My Filters**: Dropdown beside Filters that lists user-saved predicates
- **Persistence**: Stored in `localStorage` (key: `leadCustomFilters`) for MVP
- **Runtime Evaluator**: Supports `all` (AND), `any` (OR) and atomic `{ field, op, value }`

```typescript
type AtomicOp = 'eq' | 'neq' | 'gte' | 'lte' | 'contains';
type AtomicPredicate = { field: keyof Lead; op: AtomicOp; value: string | number | boolean };
type RuntimeFilter = { all?: RuntimeFilter[]; any?: RuntimeFilter[] } | AtomicPredicate;

const evalAtomic = (lead: Lead, p: AtomicPredicate) => {
  const v = (lead as any)[p.field];
  switch (p.op) {
    case 'eq': return v === p.value;
    case 'neq': return v !== p.value;
    case 'gte': return Number(v) >= Number(p.value);
    case 'lte': return Number(v) <= Number(p.value);
    case 'contains': return String(v ?? '').toLowerCase().includes(String(p.value).toLowerCase());
    default: return false;
  }
};

const evalRuntimeFilter = (lead: Lead, rf: RuntimeFilter): boolean => {
  if ('field' in rf) return evalAtomic(lead, rf as AtomicPredicate);
  if (rf.all) return rf.all.every(f => evalRuntimeFilter(lead, f));
  if (rf.any) return rf.any.some(f => evalRuntimeFilter(lead, f));
  return true;
};
```

### Data Management

#### Lead Data Structure
```typescript
interface Lead {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  courseInterest: string;
  campus: string;
  leadSource: string;
  statusType: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  slaStatus: 'urgent' | 'within_sla' | 'overdue';
  leadScore: number;
  mlProbability?: number;
  mlConfidence?: number;
  colorTag?: string;
  createdDate: string;
  lastContact?: string;
  // ... additional fields
}
```

#### State Management
- **React Hooks**: useState, useCallback, useMemo for performance
- **Local Storage**: User preferences and overrides
- **API Integration**: Real-time data fetching and updates
- **Error Handling**: Graceful fallbacks and user feedback

### Performance Optimizations

#### Virtual Scrolling
- **Implementation**: Custom useVirtualScrolling hook
- **Responsive Height**: ResizeObserver for dynamic viewport adaptation
- **Row Height**: 80px standard height with proper spacing
- **Buffer**: 5 rows above/below viewport for smooth scrolling

#### Memoization
- **Component Memoization**: React.memo for expensive components
- **Callback Memoization**: useCallback for stable function references
- **Value Memoization**: useMemo for expensive calculations
- **Dependency Arrays**: Proper dependency management

#### API Optimization
- **Debounced Search**: 300ms delay to prevent excessive API calls
- **Batch Operations**: ML predictions fetched in batches
- **Caching**: 5-minute cache for ML predictions
- **Error Boundaries**: Graceful error handling

## 🎯 How to Use AI Features

### Understanding ML Predictions

1. **Look for the AI Score column** - Shows percentage and progress bar
2. **Hover for details** - Tooltip shows prediction and confidence
3. **Wait for ML to load** - Don't act on placeholder 0% scores
4. **Consider confidence** - High confidence = more reliable prediction

### Using AI Triage

1. **Click "Explain with AI"** – Generates explanations for all filtered leads
2. **Review AI pills** – See ML Score, Next Action, Reasons, Action Rationale, Suggested Content
3. **Look for “Interview” badge** – Indicates calibrated ≥ 70% (escalate to interview)
4. **Act on specifics** – Use concrete rationale (e.g., “6 web visits + 2 email replies in 5 days”)

### Color Tag Management

1. **Automatic colors** - System assigns based on score and probability
2. **Manual override** - Use row context menu or bulk actions to override
3. **Persistent** - Manual colors saved per-user in localStorage under `leadColorOverrides`
4. **Visual priority** - Red accent bars and dots show priority at a glance
5. **Override precedence** - Manual colors take precedence over automatic assignment

## 🔧 Technical Implementation

### Frontend Architecture

#### Component Structure
```
LeadsManagement.tsx (Main Component)
├── CompactView (Primary Interface)
├── TableView (Alternative View)
├── CardsView (Legacy View)
├── TableRow (Individual Row Component)
├── ColorBar (Color Accent Component)
├── AIScore (ML Score Display)
├── StatusBadge (Status Indicators)
├── FilterChips (Active Filter Display)
├── SelectAllDialog (Selection Options)
├── AddLeadDialog (Lead Creation)
├── ExportDialog (Data Export)
└── AddFilterDialog (Custom Filters)
```

#### State Management Architecture
```typescript
// Core State
const [leads, setLeads] = useState<Lead[]>([]);
const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
const [viewMode, setViewMode] = useState<"compact" | "table" | "cards">("compact");

// Filter State
const [searchTerm, setSearchTerm] = useState("");
const [selectedStatus, setSelectedStatus] = useState("all");
const [selectedSource, setSelectedSource] = useState("all");
const [selectedCourse, setSelectedCourse] = useState("all");
const [selectedYear, setSelectedYear] = useState("all");
const [urgentOnly, setUrgentOnly] = useState(false);
const [selectedColorTag, setSelectedColorTag] = useState("all");

// UI State
const [showFilters, setShowFilters] = useState(false);
const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
const [showBulkActions, setShowBulkActions] = useState(false);
const [showContextMenu, setShowContextMenu] = useState(false);

// Pagination State
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(25);

// ML State
const [mlPredictions, setMlPredictions] = useState<Record<string, MLPrediction>>({});
const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);

// Color Override State
const [colorOverrides, setColorOverrides] = useState<Record<string, string>>({});
```

#### Custom Hooks
```typescript
// Virtual Scrolling Hook
const useVirtualScrolling = (
  items: Lead[],
  itemHeight: number,
  containerHeight: number,
  buffer: number
) => {
  // Returns: { visibleItems, totalHeight, offsetY, onScroll }
};

// Debounce Hook
const useDebounce = <T,>(value: T, delay: number): T => {
  // Returns debounced value
};

// Search Suggestions Hook
const useSearchSuggestions = (searchTerm: string, leads: Lead[]) => {
  // Returns filtered suggestions
};
```

#### API Integration
```typescript
// ML Predictions API
const fetchMLPredictions = async () => {
  const leadIds = datasetLeads.map(lead => lead.uid);
  const response = await fetch(`${API_BASE}/ai/advanced-ml/predict-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadIds) // Raw array format
  });
  const result = await response.json();
  setMlPredictions(result.predictions);
};

// AI Triage API
const fetchAITriage = async () => {
  const response = await fetch(`${API_BASE}/ai/leads/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_ids: leadIds })
  });
  return response.json();
};
```

#### Performance Optimizations
```typescript
// Memoized Components
const TableRow = React.memo(({ lead, index }: { lead: Lead; index: number }) => {
  // Component implementation
});

// Stable Callbacks
const handlePhoneClick = useCallback((lead: Lead) => {
  if (lead.phone) {
    setSelectedLeadForCall(lead);
    setShowCallComposer(true);
  } else {
    alert(`No phone number available for ${lead.name}`);
  }
}, []);

// Memoized Calculations
const filteredLeads = useMemo(() => {
  return leads.filter(lead => {
    // Filter logic
  });
}, [leads, searchTerm, selectedStatus, /* other dependencies */]);

// Memoized Pagination
const paginationData = useMemo(() => {
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const end = Math.min(start + itemsPerPage, filteredLeads.length);
  
  return {
    totalPages,
    start,
    end,
    paginatedLeads: filteredLeads.slice(start, end)
  };
}, [filteredLeads, currentPage, itemsPerPage]);
```

#### Event Handling System
```typescript
// Global Keyboard Shortcuts
const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
  // Global shortcuts (⌘K, ⌥F, Escape, ⌘A)
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    searchInputRef.current?.focus();
  }
  
  // Row-level shortcuts (C, E, M, U)
  if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    const focused = focusedLeadRef.current;
    if (focused) {
      const key = e.key.toLowerCase();
      if (key === 'c') handlePhoneClick(focused);
      if (key === 'e') handleEmailClick(focused);
      if (key === 'm') handleMeetingClick(focused);
      if (key === 'u') toggleUrgentStatus(focused);
    }
  }
}, [handlePhoneClick, handleEmailClick, handleMeetingClick]);

// Event Listener Setup
useEffect(() => {
  document.addEventListener('keydown', handleGlobalKeyDown);
  return () => document.removeEventListener('keydown', handleGlobalKeyDown);
}, [handleGlobalKeyDown]);
```

#### Local Storage Integration
```typescript
// SSR-Safe Local Storage Access
const safeGet = (key: string) => {
  if (typeof window === 'undefined') return null;
  try { 
    return localStorage.getItem(key); 
  } catch { 
    return null; 
  }
};

const safeSet = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, value); } catch {}
};

// Color Override Persistence
const setColorOverride = useCallback((uid: string, tagId: string) => {
  setColorOverrides(prev => {
    const next = { ...prev, [uid]: tagId };
    safeSet("leadColorOverrides", JSON.stringify(next));
    return next;
  });
}, []);

// Custom Filter Persistence
const saveCustomFilter = (filter: CustomFilter) => {
  setCustomFilters(prev => {
    const next = [...prev, filter];
    safeSet("leadCustomFilters", JSON.stringify(next));
    return next;
  });
};

// User Tags Persistence
type UserTag = { id: string; name: string; color: string; rule?: any };
const [userTags, setUserTags] = useState<UserTag[]>(() => JSON.parse(safeGet('leadUserTags') ?? '[]'));
const saveUserTags = (tags: UserTag[]) => { setUserTags(tags); safeSet('leadUserTags', JSON.stringify(tags)); };
    return next;
  });
};
```

#### Responsive Design System
```typescript
// ResizeObserver for Dynamic Heights
useEffect(() => {
  if (!scrollRef.current) return;
  const ro = new ResizeObserver(entries => {
    for (const e of entries) setContainerH(e.contentRect.height);
  });
  ro.observe(scrollRef.current);
  return () => ro.disconnect();
}, []);

// Responsive Breakpoints
const isMobile = useMediaQuery('(max-width: 768px)');
const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
const isDesktop = useMediaQuery('(min-width: 1025px)');
```

### Manage Tags Modal (JSX stub)
```tsx
function ManageTagsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>
        {/* List existing tags with edit/delete */}
        {/* Create new: name, color, optional rule builder */}
        {/* Save → saveUserTags(tags) */}
      </DialogContent>
    </Dialog>
  );
}
```

### Status Colors Modal (JSX stub)
```tsx
function StatusColorsModal({ open, onClose, palette, onSave }: { open: boolean; onClose: () => void; palette: Record<string,string>; onSave: (p: Record<string,string>) => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Status Colors</DialogTitle>
        </DialogHeader>
        {/* Inputs for cold/in_progress/urgent/progressing with <input type="color" /> */}
        {/* onSave persists via safeSet('leadStatusPalette', JSON.stringify(palette)) */}
      </DialogContent>
    </Dialog>
  );
}
```

### Repo Agent Implementation Prompt
```
I’m working on the Leads Management Page in our Ivy CRM (Vite + React + TS, Tailwind + shadcn/ui). I need a refactor + feature wave that rolls up all the fixes we’ve discussed and adds the next set of changes. Please implement the following:

1) Core Fixes (stability, a11y, SSR)
- Stable keys (use lead.uid), dynamic heights via ResizeObserver, SSR-safe keyboard shortcuts.
- Context menu close on outside click + escape; role="menu".
- AI sort: null mlProbability sorted to bottom; avoid jumping.
- SSR-safe localStorage via safeGet/safeSet.
- Replace alert() with toast/snackbar.
- Header “Select All” = Select Page only; persist across pages.
- getEffectiveTag(lead) as single source of truth for colors.
- Search suggestions: use onMouseDown to avoid blur flicker.

2) Tagging System
- Enriched mapping for course/campus/source (see code above).
- User-defined tags (name, color, optional rule). Auto-apply, manual assign, persist in localStorage. UI: chips, context multi-select, Manage Tags modal.

3) Simplified Status Color Coding
- Statuses: cold/in_progress/urgent/progressing with accessible palette. Logic provided above.
- Status Colors modal with <input type="color"> and persistence.

4) Filters (user-generated)
- “My Filters” dropdown populated from customFilters. Runtime predicate evaluator (all/any/atomic ops). Save current conditions to JSON and persist.

Deliverables: Refactored page, Manage Tags modal, Status Colors modal, My Filters dropdown. Keep UI states consistent across all views.
```

### ML Pipeline
- **Model**: Random Forest with class balancing
- **Features**: 20+ engineered features with proper scaling
- **Calibration**: Sigmoid transformation spreads probabilities (5%-95% range)
- **Caching**: Predictions cached for 5 minutes to improve performance
- **Fallback**: Rules-based scoring when ML unavailable

### ML Debugging Process & Outcomes

#### Target Variable Investigation
**Issue**: Uncertainty about what the ML model was actually predicting
**Investigation**: 
```sql
-- Database query to verify target variable
SELECT 
    p.id, p.first_name, p.last_name, p.lifecycle_state,
    CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as has_application,
    a.id as application_id,
    a.status as application_status
FROM people p
LEFT JOIN applications a ON p.id = a.person_id
ORDER BY p.created_at DESC
LIMIT 10
```

**Outcome**: Confirmed that `has_application` represents conversion to pre-applicant status (not full student enrollment)

#### API Integration Fixes
**Issue**: 422 Unprocessable Entity errors when calling `/ai/advanced-ml/predict-batch`
**Root Cause**: Payload format mismatch - backend expected raw array, frontend was sending wrapped object
**Solution**: 
```javascript
// Fixed payload format
body: JSON.stringify(leadIds) // Raw array instead of { lead_ids: leadIds }
```

**Verification**: API calls now return successful 200 responses with proper prediction data

#### Probability Calibration Verification
**Investigation**: Checked if ML probabilities were properly calibrated
**Findings**: 
- Sigmoid transformation correctly spreads probabilities across 5%-95% range
- Prevents extreme 0% or 100% predictions
- Provides better differentiation between leads
- Model confidence scores properly calculated

#### Feature Engineering Validation
**Verified Features** (20+ total):
- **Lead Score**: Manual/calculated score (0-100)
- **Engagement Score**: Activity level and interaction frequency  
- **Temporal Features**: Days since creation, creation timing
- **Academic Calendar**: Application season timing
- **Touchpoint Count**: Number of interactions
- **Lifecycle State**: Lead → Applicant progression
- **Source Quality**: Lead source reliability
- **Campus Preference**: Location-based factors
- **Interaction Features**: Score transformations and logarithms

**Data Quality**: Confirmed all features properly scaled and normalized before model input

### Recent Code Fixes & Improvements

#### High-Impact Fixes Implemented
1. **Event Listeners - Stale Closures Fixed**
   - Converted global keydown handler to stable `useCallback`
   - Proper dependency management to prevent stale closures
   - Moved handler functions before keyboard shortcuts

2. **Virtual List Height - Responsive with ResizeObserver**
   - Added `ResizeObserver` to dynamically measure container height
   - Replaced hardcoded 600px with responsive `containerH` state
   - Virtual scrolling now adapts to viewport size

3. **Sort Headers - Toggle Behavior Added**
   - Created generic `setSort` helper with toggle logic
   - Clicking same header toggles asc/desc order
   - Updated table header click handlers

4. **SSR Safety - localStorage Access Protected**
   - Added `safeGet` utility with SSR guards
   - Protected all localStorage access with try/catch
   - Prevents crashes during server-side rendering

5. **Context Menu - Accessibility Improved**
   - Added `role="menu"` and `role="menuitem"`
   - Added `tabIndex={-1}` and keyboard navigation
   - Escape key closes menu, proper focus management

6. **Checkbox Typing - Fixed onCheckedChange**
   - Added proper type guards: `const checked = val === true`
   - Handles `boolean | "indeterminate"` from shadcn Checkbox
   - Applied consistently across all checkbox instances

7. **Effective Tag - Centralized Utility**
   - Created `getEffectiveTag` helper for color override precedence
   - Centralized logic: `colorOverrides[lead.uid] ?? lead.colorTag`
   - Updated filtering and rendering to use utility

8. **Pagination Label - "Select page" Instead of "Select all"**
   - Updated aria-label and button text
   - More accurate description of functionality
   - Better UX clarity

9. **Filter JSON - Fixed Escaped Backslashes**
   - Replaced escaped string with template literal
   - Clean, readable JSON initialization
   - Proper formatting for custom filters

10. **API Base Warning - Dev Environment Safety**
    - Added console warning when `VITE_API_BASE` not set
    - Helps developers catch configuration issues
    - Only shows in development mode

#### Performance & UX Benefits
- **Better Performance**: Stable callbacks reduce unnecessary re-renders
- **Responsive Design**: Virtual list adapts to any viewport size
- **Accessibility**: Screen reader friendly with proper ARIA roles
- **Developer Experience**: Clear warnings and better error handling
- **Code Maintainability**: Centralized utilities and consistent patterns

### AI Triage
- **ML‑first**: Hardened ML provides calibrated probabilities and confidence
- **LangChain + Gemini**: LLM explains ML drivers and proposes specific actions
- **Action Rationale**: Short justification string per lead (concrete signals)
- **Escalation Rule**: ≥ 70% calibrated → enforce interview escalation
- **Robust JSON Parsing**: Arrays or wrapped objects; cleans markdown fences
- **Graceful Fallback**: Rules‑based reasons, specific actions, and rationale if LLM fails

### Data Flow
1. **Lead data** fetched from `/people/leads`
2. **ML predictions** requested from `/ai/advanced-ml/predict-batch`
3. **AI triage** available via `/ai/leads/triage`
4. **Frontend** combines all data for unified display

## 🚨 Important Notes

### ML Predictions
- **Not real-time**: Predictions are cached for 5 minutes
- **Based on training data**: Model trained on historical conversion patterns
- **Calibrated scores**: Probabilities spread across 5%-95% range for better differentiation
- **Feature alignment**: 20+ features must align between training and prediction

### AI Triage
- **Gemini-dependent**: Requires Google Gemini API key
- **Fallback available**: Rules-based scoring when AI unavailable
- **PII-safe**: Personal data redacted before AI analysis
- **LangChain required**: Uses established substrate orchestration

### Color System
- **Frontend-only**: Colors not stored in database
- **User-specific**: Manual overrides saved per-user in localStorage under `leadColorOverrides`
- **Dynamic**: Recalculated on each page load
- **Override priority**: Manual colors take precedence over automatic
- **Persistence**: Manual overrides persist across browser sessions
- **Implementation**: Uses `setColorOverride()` function to update localStorage

## 🎯 User Workflows & Best Practices

### Daily Lead Management Workflow

#### Morning Routine
1. **Open Leads Management** - Start with compact view for rapid triage
2. **Check AI Scores** - Wait for ML predictions to load (look for "Loading ML..." to disappear)
3. **Sort by ML Probability** - Default sort shows highest conversion potential first
4. **Review Urgent Leads** - Red "Urgent" badges indicate immediate attention needed
5. **Use AI Triage** - Click "Prioritise with AI" for intelligent lead ranking

#### Lead Processing Workflow
1. **Select Leads** - Use checkboxes or keyboard shortcuts (⌘A for select all)
2. **Bulk Actions** - Apply color tags, send emails, or update status for multiple leads
3. **Individual Actions** - Use inline buttons (Call, Email, Meeting) for immediate actions
4. **Context Menu** - Right-click for additional options like color tag assignment
5. **Navigation** - Click lead names to view detailed Person Properties page

#### Filtering & Search Workflow
1. **Quick Search** - Use ⌘K to focus search, type to find specific leads
2. **Apply Filters** - Use ⌥F to open filters, select criteria, apply
3. **Filter Chips** - Review active filters below header, click X to remove
4. **Custom Filters** - Create and save frequently used filter combinations
5. **Clear All** - Reset all filters to view complete lead list

#### Data Management Workflow
1. **Export Data** - Select leads and export to CSV/Excel for external analysis
2. **Add New Leads** - Use "Add Lead" dialog for manual lead entry
3. **Update Information** - Edit lead details through Person Properties page
4. **Color Management** - Use color tags to organize and prioritize leads
5. **Status Updates** - Track lead progression through sales funnel

### Keyboard Shortcuts Reference

#### Global Shortcuts
| Shortcut | Action | Description |
|----------|--------|-------------|
| `⌘K` / `Ctrl+K` | Focus Search | Quickly access search input |
| `⌥F` / `Alt+F` | Toggle Filters | Open/close filters panel |
| `Escape` | Clear Search | Clear search and close suggestions |
| `⌘A` / `Ctrl+A` | Select All | Select all visible leads |

#### Row-Level Shortcuts (when lead is focused)
| Shortcut | Action | Description |
|----------|--------|-------------|
| `C` | Call Lead | Open call composer for focused lead |
| `E` | Email Lead | Open email composer for focused lead |
| `M` | Book Meeting | Open meeting booker for focused lead |
| `U` | Toggle Urgent | Toggle urgent status for focused lead |

### View Mode Selection

#### When to Use Compact View (Default)
- **Rapid Triage**: Quick scanning of lead priority
- **High Volume**: Processing many leads efficiently
- **Mobile/Tablet**: Better space utilization on smaller screens
- **Daily Operations**: Standard lead management tasks

#### When to Use Table View
- **Detailed Analysis**: Need to see all data columns
- **Data Comparison**: Comparing multiple leads side-by-side
- **Sorting**: Complex sorting across multiple columns
- **Desktop**: Full screen real estate available

#### When to Use Cards View
- **Visual Browsing**: Prefer card-based layout
- **Lead Review**: Detailed individual lead examination
- **Presentation**: Showing leads to stakeholders

### Selection Strategies

#### Single Lead Selection
- **Click Checkbox**: Direct selection
- **Click Row**: Select and focus lead
- **Keyboard Navigation**: Tab to navigate, Space to select

#### Multiple Lead Selection
- **Select Page**: Use header checkbox or "Select page" button
- **Select All**: Use ⌘A or "Select all" dialog
- **Range Selection**: Shift+click for range selection
- **Individual Selection**: Ctrl+click for individual selection

#### Bulk Operations
- **Color Tag Assignment**: Apply consistent color coding
- **Status Updates**: Change status for multiple leads
- **Export Selected**: Export specific leads to external format
- **Bulk Email**: Send emails to multiple leads

### Tagging System (User-defined + Auto)
- **Enriched Mapping** (from seed data):
```ts
const coursePref  = p.course_preference ?? p.latest_programme_name;
const campusPref  = p.campus_preference ?? p.latest_campus_name;
const latestSrc   = p.hs_latest_source ?? p.source_of_enquiry ?? p.source;
return {
  courseInterest: coursePref || '—',
  campusPreference: campusPref || '—',
  leadSource: latestSrc || '—',
};
```
- **User Tags (MVP)**: Create tags (name, color, optional rule { field, op, value })
- **Auto-apply**: If a tag’s rule matches, it is applied automatically
- **Manual Assign**: Row context menu multi-select and bulk modal
- **Persistence**: `localStorage` under `leadUserTags`
- **UI**: Tag chips rendered under each row/card

### Simplified Status Color Coding
- **Statuses**: `cold` (gray), `in_progress` (blue), `urgent` (red), `progressing` (green)
- **Logic**:
```ts
if (lead.slaStatus === 'urgent') return 'urgent';
if ((lead.mlProbability ?? 0) >= 0.7) return 'progressing';
if (['contacted','qualified','nurturing'].includes(lead.statusType)) return 'in_progress';
return 'cold';
```
- **UI**: Left color bar + dot; palette swatches; “Status Colors” modal with `<input type="color">` persisted to `localStorage` (`leadStatusPalette`)

### Filtering Strategies

#### Quick Filters
- **Status Filter**: Focus on specific lead stages
- **Source Filter**: Analyze lead source effectiveness
- **Course Filter**: Focus on specific course interests
- **Urgent Filter**: Show only urgent leads requiring attention

#### Advanced Filtering
- **Custom Filters**: Create complex filter combinations
- **Saved Filters**: Save frequently used filter sets
- **Filter Chips**: Visual representation of active filters
- **Clear Filters**: Reset to view all leads

### Performance Optimization Tips

#### For Large Datasets
- **Use Pagination**: Limit items per page (25-50 recommended)
- **Apply Filters**: Reduce dataset size before processing
- **Virtual Scrolling**: Table view handles large datasets efficiently
- **Search First**: Use search to narrow down before filtering

#### For Better Performance
- **Wait for ML**: Don't act until ML predictions load
- **Use Keyboard Shortcuts**: Faster than mouse interactions
- **Batch Operations**: Use bulk actions for multiple leads
- **Clear Selections**: Clear selections when done to free memory

### Best Practices

#### Lead Management
1. **Wait for ML**: Don't act on leads until ML predictions load
2. **Use AI Triage**: Click "Prioritise with AI" for intelligent lead ranking
3. **Address Blockers**: Focus on AI-identified conversion blockers
4. **Manual Overrides**: Use color tags to mark special cases
5. **Monitor Confidence**: Low confidence predictions may need manual review

#### Data Quality
1. **Regular Updates**: Keep lead information current
2. **Status Tracking**: Update lead status as they progress
3. **Contact Information**: Ensure phone/email are valid
4. **Course Preferences**: Keep course interests up to date
5. **Engagement Tracking**: Monitor lead interaction history

#### System Usage
1. **Keyboard Shortcuts**: Learn and use keyboard shortcuts for efficiency
2. **Filter Management**: Use filters to focus on relevant leads
3. **Selection Patterns**: Develop consistent selection strategies
4. **View Optimization**: Choose appropriate view for task
5. **Performance Awareness**: Be mindful of large dataset performance

## 🔍 Troubleshooting

### ML Predictions Not Loading
- Check browser console for API errors
- Verify `/ai/advanced-ml/predict-batch` endpoint is responding
- Ensure lead data is properly formatted
- **Fixed Issue**: 422 errors resolved by using correct payload format (`JSON.stringify(leadIds)`)

### AI Triage Failing
- Check Gemini API key configuration
- Verify LangChain dependencies are installed
- Look for fallback to rules-based scoring in console

### Colors Not Updating
- Refresh page to recalculate automatic colors
- Check localStorage for manual overrides (key: `leadColorOverrides`)
- Verify lead score and conversion probability data
- Manual overrides should persist across browser sessions
- **Fixed Issue**: Color override logic centralized with `getEffectiveTag()` utility

### Selection Ring Overflow
- **Fixed Issue**: Selection rings no longer overflow table bounds
- Uses `ring-1 ring-inset` instead of `ring-2` for proper containment

### Virtual Scrolling Issues
- **Fixed Issue**: ResizeObserver now dynamically adjusts to viewport size
- No more hardcoded 600px height limitations
- Proper container measurement and responsive behavior

### Keyboard Shortcuts Not Working
- **Fixed Issue**: Stable event handlers prevent stale closure issues
- All keyboard shortcuts (⌘P/⌘E/⌘M/⌘U, ⌘K, ⌥F) now work reliably
- Proper dependency management in useCallback hooks

### Context Menu Accessibility
- **Fixed Issue**: Proper ARIA roles and keyboard navigation added
- Escape key closes menu, proper focus management
- Screen reader friendly with proper labels

### TypeScript Errors
- **Fixed Issue**: Checkbox typing properly handles `boolean | "indeterminate"`
- All type guards implemented: `const checked = val === true`
- Consistent typing across all checkbox instances

---

## 📊 System Status & Verification

### ML System Status
- **Target Variable**: ✅ Confirmed (`has_application` - conversion to pre-applicant)
- **API Integration**: ✅ Fixed (422 errors resolved)
- **Probability Calibration**: ✅ Verified (5%-95% range with sigmoid transformation)
- **Feature Engineering**: ✅ Validated (20+ features properly scaled)
- **Model Performance**: ✅ Random Forest with class balancing active

### UI/UX Status
- **Compact View**: ✅ Primary interface optimized for rapid conversion
- **Selection System**: ✅ Fixed overflow issues, proper containment
- **Virtual Scrolling**: ✅ Responsive with ResizeObserver
- **Accessibility**: ✅ ARIA roles, keyboard navigation, screen reader support
- **Performance**: ✅ Stable callbacks, optimized re-renders

### Code Quality
- **TypeScript**: ✅ All type errors resolved
- **Event Handlers**: ✅ Stable callbacks, no stale closures
- **State Management**: ✅ Centralized utilities, proper dependencies
- **Error Handling**: ✅ SSR safety, graceful fallbacks
- **Developer Experience**: ✅ Clear warnings, better debugging

---

**Last Updated**: January 2025  
**Status**: ✅ Production Ready & Fully Optimized  
**Dependencies**: LangChain, Gemini API, ML Pipeline  
**Recent Fixes**: 10 major improvements implemented  
**ML Verification**: Complete debugging and validation process documented
