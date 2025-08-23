# Email Composer Component

A modern, AI-powered email composition component for the Bridge CRM system. This component integrates with the LangChain backend to provide intelligent email generation, user prompt assistance, and grammar/spelling correction.

## Features

- **AI-Powered Generation**: Generates personalized emails using LangChain and OpenAI
- **User Prompt Interface**: Custom AI assistance for specific writing needs
- **Grammar & Spelling Check**: AI-powered text correction and improvement
- **Intent-Based Templates**: Generate emails for nurture, interview booking, and re-engagement
- **Smart Merge Fields**: Dynamic content insertion using lead data
- **Professional Design**: Uses the Bridge CRM color system from `index.css` for consistent theming
- **Responsive Layout**: Optimized for both desktop and mobile use

## AI Integration

The component is fully integrated with the LangChain backend:

### 1. **Intent-Based Generation**
- **Nurture**: AI generates nurturing emails based on lead context
- **Book Interview**: Creates interview scheduling emails
- **Re-engage**: Generates re-engagement content for cold leads
- **Custom**: User-defined prompts for specific needs

### 2. **User Prompt Interface**
Users can ask the AI for specific assistance:
- "Make this more professional"
- "Add a call to action"
- "Improve the tone"
- "Make it more concise"
- "Add urgency to the message"

### 3. **Grammar & Spelling Check**
- AI-powered text correction
- Grammar improvement suggestions
- Spelling error detection
- Tone and style enhancements

### 4. **Real-Time AI Status**
- Loading indicators during AI processing
- Success/error feedback
- AI response display

## Props

```typescript
interface EmailComposerProps {
  isOpen: boolean;           // Controls modal visibility
  onClose: () => void;       // Callback when modal closes
  lead: Lead | null;         // Lead data for personalization
  onSendEmail?: (emailData: EmailComposerData) => Promise<void>; // Custom send handler
}
```

## Lead Interface

```typescript
interface Lead {
  id: number;
  uid: string;
  name: string;
  email: string;
  phone: string;
  courseInterest: string;
  academicYear: string;
  campusPreference: string;
  enquiryType: string;
  leadSource: string;
  status: string;
  statusType: "new" | "contacted" | "qualified" | "nurturing" | "cold";
  leadScore: number;
  createdDate: string;
  lastContact: string;
  nextAction: string;
  slaStatus: "urgent" | "warning" | "within_sla" | "met";
  contactAttempts: number;
  tags: string[];
  colorTag?: string;
  avatar?: string;
  aiInsights: {
    conversionProbability: number;
    bestContactTime: string;
    recommendedAction: string;
    urgency: "high" | "medium" | "low";
  };
}
```

## AI Workflow

### 1. **Intent Selection**
- Choose from predefined intents (nurture, interview, re-engage)
- AI automatically generates appropriate content
- Custom prompt option for specific needs

### 2. **Content Generation**
- AI analyzes lead data and context
- Generates personalized subject and body
- Applies best practices for email composition

### 3. **User Refinement**
- Edit AI-generated content manually
- Use custom prompts for specific improvements
- Grammar and spelling correction

### 4. **Final Review**
- Preview the complete email
- Check merge fields and personalization
- Send or make further adjustments

## Backend Integration

The component integrates with these AI endpoints:

- **`POST /ai/leads/compose/outreach`**: Main email generation endpoint
- **Intent Support**: nurture, book_interview, reengage, custom, grammar_check
- **Lead Context**: Uses lead data for personalization
- **User Prompts**: Custom instructions for AI assistance

## Color System

The component uses the Bridge CRM color system defined in `index.css`:

- **Primary Colors**: Uses `--foreground`, `--background`, `--card` for main elements
- **Accent Colors**: Uses `--accent`, `--info` for interactive elements and highlights
- **Status Colors**: Uses `--muted`, `--border` for secondary elements
- **Semantic Colors**: Uses `--success`, `--warning`, `--destructive` for feedback states

All colors automatically adapt to light/dark themes and maintain accessibility standards.

## Usage Example

```tsx
import EmailComposer from "@/components/EmailComposer";

function LeadsPage() {
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleEmailSend = async (emailData: EmailComposerData) => {
    // Custom email sending logic
    await sendEmail(emailData);
  };

  return (
    <div>
      <button onClick={() => setShowEmailComposer(true)}>
        Compose Email with AI
      </button>
      
      <EmailComposer
        isOpen={showEmailComposer}
        onClose={() => setShowEmailComposer(false)}
        lead={selectedLead}
        onSendEmail={handleEmailSend}
      />
    </div>
  );
}
```

## AI Features in Detail

### **Intent-Based Generation**
- **Nurture**: Builds relationships and provides value
- **Interview**: Converts interest to action
- **Re-engage**: Reconnects with cold leads
- **Custom**: User-defined assistance

### **User Prompt Examples**
- "Make this sound more urgent"
- "Add a professional closing"
- "Simplify the language"
- "Include a clear next step"
- "Make it more conversational"

### **Grammar & Spelling**
- Real-time text analysis
- Context-aware corrections
- Style and tone improvements
- Professional language suggestions

## Styling

The component follows the Bridge CRM design system:

- **Liquid Glass Effect**: Uses `backdrop-blur` and transparent backgrounds
- **Consistent Spacing**: Follows the 4px grid system
- **Professional Typography**: Uses the Satoshi font family
- **Accessible Colors**: High contrast ratios and semantic color usage
- **Responsive Design**: Adapts to different screen sizes

## Customization

### 1. **Extend AI capabilities** with new intents and prompts
### 2. **Customize email sending** logic with your email service
### 3. **Add new AI endpoints** for specialized assistance
### 4. **Modify merge fields** to include additional lead data
### 5. **Adjust styling** using CSS custom properties from `index.css`

## Dependencies

- React 18+
- Lucide React (for icons)
- shadcn/ui components (Button, Input, Badge)
- Bridge CRM color system (`index.css`)
- LangChain backend integration

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support
- Reduced motion support
- AI status indicators for all users
