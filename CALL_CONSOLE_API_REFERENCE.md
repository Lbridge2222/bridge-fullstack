# CallConsole API Reference

Complete API documentation for the CallConsole system including endpoints, data models, and integration examples.

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Integration Examples](#integration-examples)
- [Database Schema](#database-schema)

## Overview

The CallConsole API provides comprehensive call management functionality with real-time transcription, AI analysis, and database persistence. All calls are automatically tracked and stored in PostgreSQL with rich metadata.

### Base URL
```
http://localhost:8000/calls
```

### Content Type
All requests use `application/json` content type.

## Authentication

Currently uses session-based authentication. Include session cookies in requests.

## API Endpoints

### 1. Start Call

Creates a new call record and returns a call ID for tracking.

```http
POST /calls/start
```

#### Request Body
```json
{
  "lead_id": "550e8400-e29b-41d4-a716-446655441090",
  "call_type": "outbound"
}
```

#### Response
```json
{
  "call_id": "5ac4d453-1db7-467d-96f7-846e779c342b",
  "message": "Call started successfully"
}
```

#### Status Codes
- `200 OK` - Call started successfully
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Lead not found
- `500 Internal Server Error` - Server error

---

### 2. End Call

Updates the call record with final outcome, duration, and all collected data.

```http
POST /calls/end
```

#### Request Body
```json
{
  "call_id": "5ac4d453-1db7-467d-96f7-846e779c342b",
  "duration_seconds": 180,
  "call_outcome": "interested",
  "notes": "Lead is very interested in the course. Wants to apply next week.",
  "action_items": ["Send course brochure", "Schedule follow-up call"],
  "follow_up_date": "2025-09-17",
  "follow_up_type": "callback",
  "priority": "high",
  "recording_url": "https://recordings.example.com/call-123.mp3",
  "transcription": "Hello, this is Sarah calling about your enquiry...",
  "ai_analysis": {
    "highlights": ["course content", "entry requirements"],
    "total_notes": 2,
    "note_types": ["general", "follow_up"],
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
  },
  "tags": ["high_interest", "ready_to_apply"]
}
```

#### Response
```json
{
  "message": "Call ended successfully",
  "call_id": "5ac4d453-1db7-467d-96f7-846e779c342b"
}
```

---

### 3. Add Note During Call

Adds a note to an ongoing call and updates both the call record and lead notes.

```http
POST /calls/add-note
```

#### Request Body
```json
{
  "call_id": "5ac4d453-1db7-467d-96f7-846e779c342b",
  "note": {
    "content": "Lead mentioned they have a PhD in Physics",
    "type": "general",
    "tags": ["qualification", "physics"]
  }
}
```

#### Response
```json
{
  "message": "Note added successfully"
}
```

---

### 4. Update Transcription

Updates the transcription for an ongoing call in real-time.

```http
POST /calls/update-transcription
```

#### Request Body
```json
{
  "call_id": "5ac4d453-1db7-467d-96f7-846e779c342b",
  "transcription_data": {
    "transcription": "Updated full transcript text..."
  }
}
```

#### Response
```json
{
  "message": "Transcription updated successfully"
}
```

---

### 5. Get Call History

Retrieves call history for a specific lead.

```http
GET /calls/history/{lead_id}
```

#### Response
```json
{
  "calls": [
    {
      "id": "5ac4d453-1db7-467d-96f7-846e779c342b",
      "call_type": "outbound",
      "call_outcome": "interested",
      "duration": 180,
      "created_at": "2025-09-16T10:30:00Z",
      "transcription": "Hello, this is Sarah...",
      "ai_analysis": { /* JSON object */ }
    }
  ]
}
```

## Data Models

### CallStart
```typescript
interface CallStart {
  lead_id: string;        // UUID of the lead/person
  call_type: 'outbound' | 'inbound';
}
```

### CallEnd
```typescript
interface CallEnd {
  call_id: string;
  duration_seconds: number;
  call_outcome: CallOutcome;
  notes?: string;
  action_items?: string[];
  follow_up_date?: string;        // ISO date string
  follow_up_type: FollowUpType;
  priority: Priority;
  recording_url?: string;
  transcription?: string;
  ai_analysis?: AIAnalysis;
  tags?: string[];
}
```

### CallNote
```typescript
interface CallNote {
  content: string;
  type: 'general' | 'objection' | 'follow_up';
  tags: string[];
}
```

### Enums

#### CallOutcome
```typescript
type CallOutcome = 
  | 'interested'
  | 'not_interested'
  | 'callback_requested'
  | 'no_answer'
  | 'busy'
  | 'voicemail'
  | 'wrong_number'
  | 'in_progress';
```

#### FollowUpType
```typescript
type FollowUpType = 
  | 'none'
  | 'callback'
  | 'email'
  | 'meeting'
  | 'application'
  | 'information';
```

#### Priority
```typescript
type Priority = 'low' | 'medium' | 'high' | 'urgent';
```

### AIAnalysis
```typescript
interface AIAnalysis {
  highlights: string[];
  total_notes: number;
  note_types: string[];
  call_quality_indicators: {
    has_transcript: boolean;
    has_notes: boolean;
    has_outcome: boolean;
    consent_granted: boolean;
  };
  summary: {
    duration_minutes: number;
    outcome: string;
    next_action: string;
  };
}
```

## Error Handling

### Error Response Format
```json
{
  "detail": "Error description",
  "status_code": 400,
  "timestamp": "2025-09-16T10:30:00Z"
}
```

### Common Error Codes
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Call or lead not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

## Integration Examples

### Frontend TypeScript Integration

```typescript
import { callConsoleApi } from '@/services/callConsoleApi';

// Start a call
const startCall = async (leadId: string) => {
  const response = await callConsoleApi.startCall(leadId, 'outbound');
  return response.call_id;
};

// Add note during call
const addNote = async (callId: string, content: string) => {
  await callConsoleApi.addCallNote(callId, {
    content,
    type: 'general',
    tags: []
  });
};

// End call with complete data
const endCall = async (callId: string, callData: CallEndData) => {
  await callConsoleApi.endCall(callId, callData);
};
```

### Python Backend Integration

```python
import requests

class CallConsoleClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
    
    def start_call(self, lead_id: str, call_type: str = "outbound"):
        response = requests.post(
            f"{self.base_url}/calls/start",
            json={"lead_id": lead_id, "call_type": call_type}
        )
        return response.json()
    
    def end_call(self, call_id: str, call_data: dict):
        response = requests.post(
            f"{self.base_url}/calls/end",
            json={"call_id": call_id, **call_data}
        )
        return response.json()
```

## Database Schema

### Calls Table
```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL,
  call_outcome TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  action_items TEXT[] DEFAULT '{}',
  follow_up_date DATE,
  follow_up_type TEXT NOT NULL DEFAULT 'none',
  priority TEXT NOT NULL DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  recording_url TEXT,
  transcription TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calls_lead_id ON calls(lead_id);
CREATE INDEX idx_calls_call_outcome ON calls(call_outcome);
CREATE INDEX idx_calls_call_type ON calls(call_type);
CREATE INDEX idx_calls_created_at ON calls(created_at);
CREATE INDEX idx_calls_follow_up_date ON calls(follow_up_date);
CREATE INDEX idx_calls_priority ON calls(priority);
```

### Lead Notes Table
```sql
CREATE TABLE lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general',
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Rate Limiting

Currently no rate limiting is implemented. Consider implementing if needed for production.

## WebSocket Support

Future enhancement planned for real-time transcript streaming via WebSocket.

## Versioning

Current API version: v1.0

## Support

For API support and questions, refer to the main CallConsole documentation or contact the development team.
