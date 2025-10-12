# Frontend Cookbook for Ivy v2

This document provides examples and troubleshooting for frontend integration with the Ivy v2 dual-mode AI system.

## Table of Contents
- [Basic Integration](#basic-integration)
- [Action Dispatch Examples](#action-dispatch-examples)
- [Email Prefill Workflow](#email-prefill-workflow)
- [Suggestions Modal Usage](#suggestions-modal-usage)
- [Troubleshooting](#troubleshooting)

## Basic Integration

### Using the v2 Router

```typescript
import { aiRouterApi, type IvyRouterV2Response } from '@/services/api';

// Basic conversational query
const response: IvyRouterV2Response = await aiRouterApi.routerV2({
  query: "Tell me about this lead",
  context: { lead: { name: "John Doe", status: "lead" } },
  ui_capabilities: ['modals', 'inline_edits', 'toasts']
});

if (response.kind === 'conversational') {
  // Render markdown response
  console.log(response.answer_markdown);
  // Display actions
  response.actions.forEach(action => {
    console.log(`${action.label}: ${action.action}`);
  });
} else if (response.kind === 'modal') {
  // Open suggestions modal
  setSuggestionsData(response.modal.payload);
  setShowSuggestionsModal(true);
}
```

### Response Types

```typescript
// Conversational Response
interface IvyConversationalResponse {
  kind: 'conversational';
  answer_markdown: string;
  actions: UIAction[];
  sources?: Source[];
}

// Modal Response
interface IvyModalResponse {
  kind: 'modal';
  modal: {
    type: 'suggestions';
    payload: SuggestionsData;
  };
  actions: UIAction[];
}
```

## Action Dispatch Examples

### Basic Action Dispatch

```typescript
import { dispatchUIAction } from '@/actions/dispatch';

// Dispatch a canonical action
dispatchUIAction(
  { label: 'View Profile', action: 'view_profile' },
  commands,
  context
);

// Dispatch with custom context
dispatchUIAction(
  { label: 'Book Meeting', action: 'open_meeting_scheduler' },
  commands,
  { personData: lead, openMeetingBooker: handleMeetingBook }
);
```

### Action Mapping

The system maps these canonical actions:

| Action | Command ID | Description |
|--------|------------|-------------|
| `open_call_console` | `call.open` | Opens call console |
| `open_email_composer` | `email.compose` | Opens email composer |
| `open_meeting_scheduler` | `meeting.book` | Opens meeting scheduler |
| `view_profile` | `panel.properties` | Opens profile panel |

### Custom Action Handling

```typescript
// Listen for custom actions
window.addEventListener('custom_action', (event) => {
  const { action, data } = event.detail;
  console.log('Custom action:', action, data);
});

// Dispatch custom action
dispatchUIAction(
  { label: 'Custom Action', action: 'custom_action' },
  commands,
  context
);
```

## Email Prefill Workflow

### Complete Email Prefill Example

```typescript
// 1. User triggers email action
const handleEmailAction = () => {
  dispatchUIAction(
    { label: 'Send Email', action: 'open_email_composer' },
    commands,
    context
  );
};

// 2. EmailComposer listens for prefill event
useEffect(() => {
  const handlePrefill = (event: CustomEvent) => {
    const { subject, body } = event.detail;
    setEmailComposerData(prev => ({
      ...prev,
      subject: subject || prev.subject,
      body: body || prev.body
    }));
  };
  
  window.addEventListener('email.prefill', handlePrefill);
  return () => window.removeEventListener('email.prefill', handlePrefill);
}, []);

// 3. AI generates email content via JSON tool
// This happens automatically in dispatchUIAction for open_email_composer
```

### Manual JSON Tool Usage

```typescript
// Generate email content manually
const generateEmailContent = async (lead: Lead) => {
  const response = await apiFetch('/rag/query', {
    method: 'POST',
    body: JSON.stringify({
      query: '{"type":"email"}',
      context: { lead },
      json_mode: true
    })
  });
  
  const emailData = JSON.parse(response.answer);
  return {
    subject: emailData.subject,
    body: emailData.body
  };
};
```

## Suggestions Modal Usage

### Basic Modal Integration

```typescript
import SuggestionsModal from '@/components/SuggestionsModal';

// State management
const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
const [suggestionsData, setSuggestionsData] = useState<SuggestionsData | null>(null);

// Handle modal response
const handleModalResponse = (response: IvyModalResponse) => {
  setSuggestionsData(response.modal.payload);
  setShowSuggestionsModal(true);
};

// Modal component
<SuggestionsModal
  isOpen={showSuggestionsModal}
  onClose={() => setShowSuggestionsModal(false)}
  data={suggestionsData}
  onAction={handleSuggestionsAction}
/>
```

### Advanced Modal Props

```typescript
// Using individual props instead of data object
<SuggestionsModal
  isOpen={showSuggestionsModal}
  onClose={() => setShowSuggestionsModal(false)}
  modalTitle="AI Recommendations"
  summaryBullets={[
    "High conversion probability (85%)",
    "Recent engagement with course materials",
    "Ready for next steps"
  ]}
  keyMetrics={{
    conversionProbability: 0.85,
    engagementScore: 92,
    daysSinceLastContact: 2
  }}
  primaryCta={{
    label: "Book 1-1 Meeting",
    action: "open_meeting_scheduler"
  }}
  secondaryCta={{
    label: "Send Follow-up",
    action: "open_email_composer"
  }}
  chips={["High Priority", "Ready to Convert", "Follow Up"]}
  onAction={handleSuggestionsAction}
/>
```

### Action Handling in Modal

```typescript
const handleSuggestionsAction = (action: string, data?: any) => {
  console.log('Suggestions action:', action, data);
  
  // Dispatch to canonical action handler
  dispatchUIAction(
    { label: data?.label || action, action },
    commands,
    context
  );
  
  // Close modal after action
  setShowSuggestionsModal(false);
};
```

## Troubleshooting

### Common Issues

#### Modal Not Opening

**Symptoms**: `IvyModalResponse` received but modal doesn't appear

**Debug Steps**:
```typescript
// 1. Check response kind
console.log('Response kind:', response.kind);

// 2. Check modal data
if (response.kind === 'modal') {
  console.log('Modal data:', response.modal);
  console.log('Payload:', response.modal.payload);
}

// 3. Check state updates
useEffect(() => {
  console.log('Suggestions modal state:', showSuggestionsModal);
  console.log('Suggestions data:', suggestionsData);
}, [showSuggestionsModal, suggestionsData]);
```

**Solutions**:
- Ensure `setShowSuggestionsModal(true)` is called
- Check that `suggestionsData` is not null
- Verify modal component is rendered in DOM

#### JSON Parse Failures

**Symptoms**: Email prefill not working, console errors about JSON parsing

**Debug Steps**:
```typescript
// Check API response
const response = await apiFetch('/rag/query', {
  method: 'POST',
  body: JSON.stringify({
    query: '{"type":"email"}',
    context: { lead },
    json_mode: true
  })
});

console.log('Raw response:', response);
console.log('Answer field:', response.answer);

// Try parsing
try {
  const emailData = JSON.parse(response.answer);
  console.log('Parsed data:', emailData);
} catch (error) {
  console.error('JSON parse error:', error);
  console.log('Raw answer:', response.answer);
}
```

**Solutions**:
- Check that `json_mode: true` is set in request
- Verify backend is returning valid JSON
- Implement fallback for invalid JSON

#### Actions Not Dispatching

**Symptoms**: Action buttons don't work, no console logs

**Debug Steps**:
```typescript
// Check action object structure
console.log('Action object:', action);

// Check commands array
console.log('Available commands:', commands);

// Check context
console.log('Context:', context);

// Test dispatch directly
dispatchUIAction(
  { label: 'Test', action: 'view_profile' },
  commands,
  context
);
```

**Solutions**:
- Ensure action object has `label` and `action` properties
- Check that commands array contains matching command IDs
- Verify context has required properties

#### Rate Limiting Issues

**Symptoms**: 429 responses, requests being blocked

**Debug Steps**:
```typescript
// Check response status
const response = await fetch('/ai/router/v2', {
  method: 'POST',
  body: JSON.stringify(payload)
});

if (response.status === 429) {
  const error = await response.json();
  console.log('Rate limited:', error);
  console.log('Retry after:', response.headers.get('Retry-After'));
}
```

**Solutions**:
- Implement exponential backoff
- Add user feedback for rate limiting
- Consider reducing request frequency

### Debug Tools

#### Enable Debug Logging

```typescript
// Add to your component
useEffect(() => {
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    if (args[0]?.includes?.('Ivy') || args[0]?.includes?.('AI')) {
      originalConsoleLog('[IVY DEBUG]', ...args);
    } else {
      originalConsoleLog(...args);
    }
  };
}, []);
```

#### Test Action Dispatch

```typescript
// Test all canonical actions
const testActions = [
  'open_call_console',
  'open_email_composer', 
  'open_meeting_scheduler',
  'view_profile'
];

testActions.forEach(action => {
  dispatchUIAction(
    { label: `Test ${action}`, action },
    commands,
    context
  );
});
```

#### Validate Response Schema

```typescript
// Validate v2 response structure
const validateResponse = (response: any) => {
  const required = ['kind'];
  const missing = required.filter(field => !(field in response));
  
  if (missing.length > 0) {
    console.error('Missing required fields:', missing);
    return false;
  }
  
  if (response.kind === 'conversational') {
    return 'answer_markdown' in response && 'actions' in response;
  } else if (response.kind === 'modal') {
    return 'modal' in response && 'actions' in response;
  }
  
  return false;
};
```

## Best Practices

1. **Always handle both response types** - Check `response.kind` before processing
2. **Implement fallbacks** - Provide default actions if AI doesn't return any
3. **Cache responses** - Store recent responses to avoid duplicate API calls
4. **Handle errors gracefully** - Show user-friendly messages for API failures
5. **Monitor performance** - Track latency and success rates
6. **Test thoroughly** - Use the provided test cases and debug tools
