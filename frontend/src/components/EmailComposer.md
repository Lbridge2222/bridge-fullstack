# EmailComposer Component

A sophisticated, AI-powered email composition tool designed for CRM lead management. Features rich text editing, AI strategy suggestions, email history tracking, and seamless integration with existing ML models.

## 🚀 Features

### Core Functionality
- **Rich Text Editor** - Full WYSIWYG editing with markdown support
- **AI-Powered Strategy** - Dynamic email suggestions based on ML triage data
- **Email History** - Track conversation history to prevent duplicate outreach
- **Drag & Resize** - Movable, resizable modal interface
- **Multiple View Modes** - Edit, Preview, HTML, and Rich Text modes
- **Merge Fields** - Dynamic lead data insertion
- **Grammar Check** - Built-in writing assistance

### AI Integration
- **Ask Ivy** - RAG-powered assistant for lead insights
- **ML Triage Integration** - Real conversion probability and strategy suggestions
- **Quick Actions** - Pre-built email templates (Nurture, Interview, Re-engage)
- **Smart Suggestions** - Context-aware email recommendations

### User Experience
- **Professional UI** - Clean, modern interface matching CallConsole design
- **Keyboard Shortcuts** - Power user efficiency
- **Auto-save** - Draft preservation
- **Responsive Design** - Works across different screen sizes

## 📁 File Structure

```
EmailComposer.tsx          # Main component (2,033 lines)
├── Rich Text Editor        # ContentEditable with formatting
├── AI Tools Section        # Ask Ivy + Quick Actions
├── Email History          # Recent activity tracking
├── Email Strategy         # ML-powered suggestions
├── Merge Fields           # Dynamic data insertion
└── Send/Preview Logic     # Email composition flow
```

## 🎯 Key Components

### 1. Rich Text Editor
- **ContentEditable** implementation with formatting controls
- **Markdown Support** - Converts markdown to HTML
- **Formatting Tools** - Bold, italic, underline, lists, alignment
- **Live Preview** - Real-time rendering

### 2. AI Tools Section
```typescript
// Ask Ivy Integration
const askIvy = async (query: string, lead: Lead) => {
  const context = {
    lead: { id, uid, name, email, courseInterest },
    transcriptWindow: [],
    selection: '',
    consentGranted: false
  };
  return await ragApi.queryRag(query, context);
};
```

**Quick Actions:**
- **Nurture** - Generate nurturing email
- **Interview** - Generate meeting booking email
- **Re-engage** - Generate re-engagement email
- **About Lead** - Get lead information

### 3. Email History
- **Recent Emails** - Last 3 sent emails with metadata
- **Activity Timeline** - Recent lead activities
- **Conversation Status** - New vs ongoing conversations
- **Duplicate Prevention** - Prevents redundant outreach

### 4. Email Strategy (AI-Powered)
- **Conversion Probability** - ML-based conversion chance
- **Email Approach** - Personalized strategy recommendations
- **Follow-up Actions** - Next steps based on lead profile
- **UK English** - Localized content generation

## 🔧 Technical Implementation

### State Management
```typescript
interface EmailComposerData {
  lead: Lead;
  subject: string;
  body: string;
  htmlBody?: string;
  aiSuggestions: Array<{
    type: 'template' | 'content';
    title: string;
    description: string;
    confidence: number;
    action: string;
    mlScore?: number;
    conversionProb?: number;
    escalate?: boolean;
  }>;
}
```

### API Integration
- **Email Logging** - `/crm/emails/log` - Tracks sent emails
- **Email History** - `/crm/emails/history/{lead_id}` - Fetches conversation history
- **AI Triage** - `/ai/leads/triage` - Gets ML insights for strategy
- **RAG Query** - `/rag/query` - Ask Ivy functionality

### Drag & Resize System
- **Pointer Events API** - Modern drag implementation
- **Boundary Detection** - Prevents off-screen positioning
- **Smooth Animations** - 60fps drag performance
- **Mode Switching** - Handles view mode changes

## 🎨 UI/UX Design

### Design System
- **Shadcn/UI Components** - Consistent design language
- **Brand Colors** - Candy Apple Red (#FF0800), Brighter Ivy Green (#11694A)
- **Typography** - Consistent font sizing and weights
- **Spacing** - Harmonious padding and margins

### Responsive Behavior
- **Modal Positioning** - Smart initial placement
- **Resize Constraints** - Minimum/maximum size limits
- **Scroll Handling** - Proper overflow management
- **Mobile Support** - Touch-friendly interactions

## 🔄 Data Flow

### Email Composition Flow
1. **Lead Selection** → Load lead data and history
2. **AI Analysis** → Generate strategy suggestions
3. **Content Creation** → Rich text editing with merge fields
4. **Preview & Send** → Final review and delivery
5. **Logging** → Record email in database

### AI Strategy Generation
```typescript
const generateEmailSuggestions = async (lead: Lead) => {
  // 1. Get ML triage insights
  const triageResponse = await aiLeadsApi.triageLeads([lead.uid], {});
  
  // 2. Extract conversion probability
  const leadInsights = triageResponse.items[0];
  
  // 3. Generate contextual suggestions
  const suggestions = [
    {
      title: "Email Approach",
      description: isHighConversion 
        ? `Send personalised welcome email for ${lead.courseInterest}`
        : `Send nurturing email to build engagement`,
      action: isHighConversion
        ? "Include application timeline and clear call-to-action"
        : "Focus on value and gentle progression"
    }
  ];
};
```

## 🛠️ Usage Examples

### Basic Email Composition
```typescript
<EmailComposer
  isOpen={isEmailOpen}
  onClose={() => setIsEmailOpen(false)}
  lead={selectedLead}
  onSend={handleEmailSend}
/>
```

### AI-Powered Strategy
```typescript
// Ask Ivy for lead insights
const askIvy = async (query: string, lead: Lead) => {
  const response = await ragApi.queryRag(query, {
    lead: { id: lead.id, uid: lead.uid, name: lead.name },
    transcriptWindow: [],
    selection: '',
    consentGranted: false
  });
  return response.answer;
};
```

### Email History Integration
```typescript
// Load conversation history
const loadEmailHistory = async (lead: Lead) => {
  const history = await aiLeadsApi.getEmailHistory(lead.uid, 5);
  setEmailHistory(history);
};
```

## 🔒 Security & Privacy

### Data Protection
- **Environment Variables** - Sensitive data in `.env` files
- **API Security** - Proper authentication and validation
- **PII Handling** - Secure lead data management
- **Email Logging** - Audit trail for compliance

### Error Handling
- **Graceful Degradation** - Fallbacks for API failures
- **User Feedback** - Clear error messages
- **Retry Logic** - Automatic retry for transient failures
- **Logging** - Comprehensive error tracking

## 🚀 Performance

### Optimization Strategies
- **Debounced Queries** - Reduced API calls
- **Response Caching** - Faster repeated queries
- **Lazy Loading** - On-demand data fetching
- **Efficient Rendering** - Optimized React patterns

### Memory Management
- **Cleanup Effects** - Proper component unmounting
- **Abort Controllers** - Cancel in-flight requests
- **Cache Limits** - Prevent memory leaks
- **Event Listeners** - Proper cleanup

## 🧪 Testing

### Component Testing
- **Unit Tests** - Individual function testing
- **Integration Tests** - API interaction testing
- **E2E Tests** - Full user workflow testing
- **Accessibility Tests** - WCAG compliance

### Test Coverage
- **Core Functions** - Email composition logic
- **AI Integration** - Strategy generation
- **UI Interactions** - Drag, resize, editing
- **Error Scenarios** - Failure handling

## 📚 Dependencies

### Core Libraries
- **React** - Component framework
- **TypeScript** - Type safety
- **Shadcn/UI** - Component library
- **Lucide React** - Icon system

### AI/ML Integration
- **LangChain** - AI orchestration
- **RAG API** - Knowledge retrieval
- **ML Pipeline** - Lead scoring and triage

### Utilities
- **React Textarea Autosize** - Dynamic textarea sizing
- **Marked** - Markdown parsing
- **Date-fns** - Date manipulation

## 🔮 Future Enhancements

### Planned Features
- **Email Templates** - Pre-built template library
- **A/B Testing** - Email variant testing
- **Analytics Integration** - Open/click tracking
- **Advanced AI** - More sophisticated suggestions

### Technical Improvements
- **Offline Support** - Local draft storage
- **Real-time Collaboration** - Multi-user editing
- **Advanced Formatting** - More rich text options
- **Performance Optimization** - Faster rendering

## 📖 Related Documentation

- [CallConsole Component](./CallConsole/README.md) - Similar modal interface
- [AI Integration Guide](../../AI_IMPLEMENTATION_GOSPEL.md) - AI system overview
- [ML Documentation](../../ML_DOCUMENTATION_INDEX.md) - Machine learning setup
- [API Reference](../../ML_API_REFERENCE.md) - Backend API documentation

## 🤝 Contributing

### Development Guidelines
- **Code Style** - Follow existing patterns
- **TypeScript** - Maintain type safety
- **Testing** - Add tests for new features
- **Documentation** - Update this README

### Pull Request Process
1. **Feature Branch** - Create from main
2. **Implementation** - Follow coding standards
3. **Testing** - Ensure all tests pass
4. **Documentation** - Update relevant docs
5. **Review** - Request team review

---

**Last Updated:** September 2025  
**Version:** 1.0.0  
**Maintainer:** Bridge CRM Team