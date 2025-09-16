# CallConsole - Two-Lane AI-Powered Call Interface

A modern, AI-powered call console that replaces the dense CallComposer with a clean two-lane interface featuring natural language queries powered by RAG.

## Architecture

### Lane A (Left): Call Controls
- **Call State Management**: Idle → Dialing → Active → Wrap-up
- **Primary Controls**: Start/End call, Record toggle, Transcript drawer
- **Live Features**: Real-time transcript preview, Quick notes, Call highlights
- **Wrap-up Form**: Disposition, Next action, Priority, Follow-up scheduling

### Lane B (Right): AI Omnibox
- **Natural Language Queries**: Ask anything about the lead or course
- **Slash Commands**: `/lead`, `/course`, `/objection`, `/summary`
- **RAG Integration**: Grounded responses with sources and citations
- **Streaming Responses**: Real-time answer generation with AbortController

## Key Features

### Call Persistence & Database Integration
- **Real-time Call Logging**: All calls automatically saved to PostgreSQL `calls` table
- **Live Transcription Updates**: Transcript saved in real-time during active calls
- **AI Analysis Storage**: Call highlights, metrics, and summaries stored as JSON
- **Notes Integration**: Notes saved to both `calls.notes` and `lead_notes` table
- **Follow-up Tracking**: Follow-up dates, types, and priorities stored and tracked
- **Call History**: Complete call logs with outcomes, duration, and recordings

### Slash Commands
- `/lead` - Get lead information and recommendations
- `/course [name]` - Get course details and requirements
- `/objection` - Generate objection handling (uses transcript selection)
- `/summary` - Summarize the call so far

### Keyboard Shortcuts
- `Ctrl/Cmd+K` - Focus AI Omnibox
- `R` - Toggle recording (during active call)
- `N` - Add quick note (during active call)
- `Esc` - Close drawers and cancel operations

### Privacy & Compliance
- Recording consent checkbox (visible only when recording)
- Transcript streaming only when consent granted
- All API calls cancellable with AbortController

### Responsive Design
- **Floating Mode**: Draggable console for desktop (1280px+)
- **Docked Mode**: Bottom-docked console for tablet (768px-1279px)
- **Fullscreen Mode**: Full-screen console for mobile (<768px)
- **Auto-switching**: Automatically adapts to screen size changes
- **Touch Support**: Full touch gestures for drag/resize on mobile

## Usage

```tsx
import { CallConsole } from '@/components/CallConsole';

// In your component
<CallConsole
  isOpen={isCallConsoleOpen}
  onClose={() => setIsCallConsoleOpen(false)}
  lead={selectedLead}
  onSaveCall={(data) => {
    // Handle call data save
    console.log('Call saved:', data);
  }}
  mode="compact"
  hasQueue={hasQueue}
  onStartNextCall={handleStartNextCall}
/>
```

## Design Philosophy

### Flexible Floating Console
- **Draggable positioning** - drag from anywhere on the top bar to move around screen
- **Custom resizing** - drag the bottom-right corner to resize width and height
- **Minimize mode** - collapse to a small floating button, click to restore
- **Truly non-blocking** - no backdrop overlay, can interact with underlying page
- **Multi-tasking enabled** - edit records, sort leads, access any page while on call
- **Live indicator** - shows "LIVE" badge when call is active
- **Smart layout** - Ask Ivy only shows during active calls, not pre-call
- **Persistent state** - maintains call context across navigation
- **Viewport bounds** - automatically stays within screen boundaries

### Color System
- **Uses index.css tokens** - all colors from your design system
- **Brand colors**: Candy Apple Red (#FF0800), Ivy Green (#11694A), Shadcn Black (#111111)
- **Semantic colors**: Success, Warning, Error, Info from CSS variables
- **Consistent theming** - works in both light and dark modes

## Drag & Resize Controls

### Interactive Positioning
- **Drag Handle**: Grip icon in top bar - click and drag to move console anywhere on screen
- **Resize Handle**: Bottom-right corner - drag to custom resize width and height
- **Minimize Mode**: Collapse to small floating button, click to restore
- **Quick Presets**: Expand/Compact buttons for common sizes

### Smart Constraints
- **Viewport Bounds**: Automatically prevents console from going off-screen
- **Minimum Sizes**: Enforces 400px width, 300px height minimums
- **Maximum Sizes**: Constrains to screen boundaries
- **Smooth Animations**: All drag/resize operations are smoothly animated

### User Experience
- **Visual Feedback**: Cursor changes during drag operations
- **Live Indicators**: Shows "LIVE" badge and pulsing phone icon during active calls
- **Persistent State**: Remembers position and size across sessions
- **Non-Blocking**: Can interact with underlying page while console is open

## Data Flow

### State Management
- **Call State**: Managed by state machine in CallConsole
- **Timer Management**: Separate timers for call duration and recording
- **Transcript Buffer**: Rolling window of last 10-15 transcript chunks
- **Notes & Highlights**: Optimistic UI updates with server sync

### API Integration
- **RAG Queries**: Debounced 400ms, cancellable, streaming responses
- **Lead Updates**: Inline editing with optimistic UI and rollback on error
- **Transcript Streaming**: Real-time updates only when recording + consent
- **Call Management API**: `/calls/start`, `/calls/end`, `/calls/add-note`, `/calls/update-transcription`
- **Database Persistence**: All call data automatically saved to PostgreSQL

## Performance Optimizations

### Memoization
- Transcript list rendering
- Notes list rendering
- Response formatting
- Duration calculations

### Network Hygiene
- AbortController for all async operations
- 400ms debouncing on omnibox queries
- Cancellation on component unmount
- No duplicate API calls

### UI Optimizations
- Virtual scrolling for long transcript
- Minimal re-renders with useMemo
- Smooth 60fps animations
- No layout thrash

## Accessibility

### Keyboard Navigation
- Full keyboard support for all interactions
- Logical tab order through interface
- Escape key handling for modals/drawers

### Screen Reader Support
- Proper ARIA labels and roles
- Live regions for dynamic content
- Descriptive button labels
- Status announcements

### Visual Accessibility
- High contrast color scheme
- Clear focus indicators
- Sufficient touch targets (44px minimum)
- Reduced motion support

## API Endpoints & Database Schema

### Call Management API (`/calls`)

#### Start Call
```typescript
POST /calls/start
{
  "lead_id": "uuid",
  "call_type": "outbound" | "inbound"
}
// Returns: { "call_id": "uuid" }
```

#### End Call
```typescript
POST /calls/end
{
  "call_id": "uuid",
  "duration_seconds": 180,
  "call_outcome": "interested" | "not_interested" | "callback_requested" | "no_answer" | "busy",
  "notes": "Combined notes string",
  "action_items": ["item1", "item2"],
  "follow_up_date": "2025-09-16T14:30:00",
  "follow_up_type": "callback" | "email" | "meeting" | "application" | "information" | "none",
  "priority": "low" | "medium" | "high" | "urgent",
  "recording_url": "https://...",
  "transcription": "Full transcript text",
  "ai_analysis": { /* JSON object */ },
  "tags": ["tag1", "tag2"]
}
```

#### Add Note During Call
```typescript
POST /calls/add-note
{
  "call_id": "uuid",
  "note": {
    "content": "Note text",
    "type": "general" | "objection" | "follow_up",
    "tags": ["tag1"]
  }
}
```

#### Update Transcription
```typescript
POST /calls/update-transcription
{
  "call_id": "uuid",
  "transcription_data": {
    "transcription": "Updated transcript text"
  }
}
```

### Database Schema (`calls` table)

```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL, -- 'outbound' | 'inbound'
  call_outcome TEXT NOT NULL, -- 'interested' | 'not_interested' | 'callback_requested' | etc.
  duration INTEGER NOT NULL DEFAULT 0, -- seconds
  notes TEXT, -- Combined notes as single text field
  action_items TEXT[] DEFAULT '{}', -- Array of action items
  follow_up_date DATE, -- Follow-up date
  follow_up_type TEXT NOT NULL DEFAULT 'none', -- Follow-up type
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'urgent'
  tags TEXT[] DEFAULT '{}', -- Array of tags
  recording_url TEXT, -- URL to call recording
  transcription TEXT, -- Full transcript text
  ai_analysis JSONB, -- AI analysis data as JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### AI Analysis JSON Structure

```json
{
  "highlights": ["entry requirements", "course content", "fees"],
  "total_notes": 3,
  "note_types": ["general", "objection"],
  "call_quality_indicators": {
    "has_transcript": true,
    "has_notes": true,
    "has_outcome": true,
    "consent_granted": true
  },
  "summary": {
    "duration_minutes": 3,
    "outcome": "interested",
    "next_action": "callback"
  }
}
```

## Integration Points

### RAG Service
```typescript
// Replace mock implementation in ragClient.ts
const ragClient = new RagClient('/api/rag', apiKey);

// Query with context
const response = await ragClient.queryRag(query, {
  lead: { id, name, courseInterest },
  transcriptWindow: lastTranscriptChunks,
  consentGranted: userConsent
});
```

### Lead Updates
```typescript
// Inline editing with optimistic UI
const updateLead = async (leadId: string, patch: Partial<Lead>) => {
  // Optimistic update
  setLead(prev => ({ ...prev, ...patch }));
  
  try {
    await updateLeadPartial(leadId, patch);
  } catch (error) {
    // Rollback on error
    setLead(originalLead);
    throw error;
  }
};
```

## Migration from CallComposer

The new CallConsole is a complete replacement for CallComposer with these improvements:

### Removed Complexity
- Dense lead summary panels
- Long AI script blocks
- Complex progressive disclosure
- Heavy ML badges and analytics

### Added Intelligence
- Natural language AI queries
- Context-aware responses
- Slash command shortcuts
- Real-time transcript analysis

### Maintained Features
- Call state machine
- Recording and transcription
- Notes and highlights
- Wrap-up form
- Keyboard shortcuts

## Recent Updates & Improvements

### v2.0 - Complete Call Persistence System (September 2025)
- **✅ Database Integration**: All calls now saved to dedicated `calls` table
- **✅ Real-time Transcription**: Live transcript updates during active calls
- **✅ AI Analysis Storage**: Call highlights, metrics, and summaries stored as JSON
- **✅ Follow-up Tracking**: Complete follow-up date and type management
- **✅ Notes Integration**: Notes saved to both `calls.notes` and `lead_notes`
- **✅ Responsive Modes**: Auto-adapting floating/docked/fullscreen layouts
- **✅ Touch Support**: Full mobile gesture support for drag/resize
- **✅ Person Info Popup**: Quick access to lead details during calls

### v1.5 - UI/UX Improvements
- **✅ Auto-highlighting**: AI-powered keyword detection and highlighting
- **✅ Copy Buttons**: Quick copy functionality for transcript chunks
- **✅ Neutral Colors**: Replaced red accents with slate/zinc theme
- **✅ UK English**: Consistent British English spelling throughout
- **✅ Markdown Rendering**: Improved AI response formatting
- **✅ ScrollArea Integration**: Proper scrolling with Shadcn components

### v1.0 - Core Features
- **✅ Two-lane Interface**: Clean separation of call controls and AI
- **✅ RAG Integration**: Natural language queries with context awareness
- **✅ Slash Commands**: Quick access to common queries
- **✅ Drag & Resize**: Flexible console positioning and sizing
- **✅ Keyboard Shortcuts**: Full keyboard navigation support

## Future Enhancements

### Planned Features
- **Real RAG Integration**: Vector database with semantic search
- **Voice-to-Text**: Real speech recognition integration
- **Automated Objection Detection**: AI-powered objection identification
- **Call Coaching**: Real-time coaching suggestions during calls
- **CRM Integration**: Deep integration with external CRM systems
- **Call Analytics**: Advanced reporting and analytics dashboard
- **Team Collaboration**: Multi-agent call handling and handoffs

### Performance Improvements
- **WebSocket Integration**: Real-time transcript streaming
- **Service Worker**: Offline support and background sync
- **Progressive Web App**: Native app-like experience
- **Advanced Caching**: Intelligent response caching strategies
- **Voice Commands**: Hands-free operation during calls
