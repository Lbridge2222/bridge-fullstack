# Bidirectional Data Flow Implementation

## Overview

This document describes the implementation of bidirectional data flow between the CRM frontend and Supabase backend, enabling real-time updates from both directions.

## Architecture Changes

### 1. Backend API Endpoints

New endpoints have been added to enable updating lead information:

- `PATCH /people/{person_id}` - Update basic person information
- `PATCH /people/{person_id}/lead` - Update lead-specific information
- `POST /people/{person_id}/lead/notes` - Add notes to leads
- `GET /people/{person_id}/lead/notes` - Retrieve lead notes

### 2. Database Schema Updates

New fields added to the `people` table:
- `lead_score` - Numeric lead scoring
- `conversion_probability` - AI-calculated conversion likelihood
- `assigned_to` - User assigned to the lead
- `status` - Lead status (new, contacted, qualified, etc.)
- `next_follow_up` - Scheduled follow-up date
- `updated_at` - Last modification timestamp

New `lead_notes` table for tracking interactions:
- `person_id` - Reference to the person
- `note` - Note content
- `note_type` - Type of note (call, email, meeting, general)
- `created_by` - User who created the note
- `created_at` - Note creation timestamp

### 3. Frontend Components

#### EditableLeadCard Component
- Inline editing of lead information
- Real-time validation and error handling
- Optimistic updates for better UX
- Support for adding notes and updating status

#### useLeadUpdates Hook
- Centralized state management for lead updates
- Error handling and loading states
- Callback support for success/error handling

#### useOptimisticLeadUpdates Hook
- Optimistic updates for list views
- Prevents UI flickering during updates
- Maintains consistency across components

## Usage Examples

### Updating Lead Information

```typescript
import { useLeadUpdates } from '@/hooks/useLeadUpdates';

const { updateLead, isUpdating, error } = useLeadUpdates();

const handleUpdate = async () => {
  try {
    await updateLead(personId, {
      lead_score: 85,
      status: 'qualified',
      notes: 'Lead showed strong interest in course'
    });
    // Success handling
  } catch (err) {
    // Error handling
  }
};
```

### Adding Lead Notes

```typescript
const { addLeadNote } = useLeadUpdates();

const handleAddNote = async () => {
  await addLeadNote(personId, {
    note: 'Called lead - they want to schedule a campus visit',
    note_type: 'call',
    created_by: 'current_user'
  });
};
```

## Data Flow

### 1. Frontend → Backend
1. User makes changes in the CRM interface
2. Frontend sends PATCH request to backend
3. Backend validates and updates Supabase
4. Backend returns updated data
5. Frontend updates local state

### 2. Backend → Frontend
1. Database changes trigger backend updates
2. Frontend can refresh data via API calls
3. Real-time updates possible with WebSocket integration (future)

## Benefits

1. **Real-time Updates**: Changes made in the CRM immediately reflect in Supabase
2. **Data Consistency**: Single source of truth maintained across the system
3. **Audit Trail**: All changes tracked with timestamps and user attribution
4. **Better UX**: Inline editing with immediate feedback
5. **Scalability**: Optimistic updates prevent UI blocking during API calls

## Future Enhancements

1. **WebSocket Integration**: Real-time bidirectional updates
2. **Conflict Resolution**: Handle concurrent edits gracefully
3. **Offline Support**: Queue updates when offline
4. **Bulk Operations**: Update multiple leads simultaneously
5. **Change History**: Track all modifications with rollback capability

## Migration Notes

To apply the database changes:

1. Run the migration: `./run_migrations.sh`
2. Restart the backend service
3. Clear frontend cache if needed

The new functionality is backward compatible and won't affect existing data.
