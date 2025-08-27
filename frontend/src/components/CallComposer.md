# CallComposer Component

A comprehensive, AI-powered call management component for lead interactions in the Ivy system.

## Overview

The CallComposer provides a complete solution for managing phone calls with leads, including:
- **Call Outcomes**: Track call results with detailed classification
- **Smart Notes**: Add contextual notes with timestamps and categorization
- **Recording & Transcription**: Record calls with AI-powered analysis
- **AI Scripts**: Get personalized conversation scripts based on lead context
- **Real-time Analytics**: Monitor call duration, quality scores, and conversion probability
- **Follow-up Planning**: AI-powered recommendations for optimal next steps

## Features

### 🎯 Call Outcomes
- **Outcome Types**: Successful, Needs Follow-up, Escalated, Resolved, No Answer, Voicemail, Wrong Number
- **Priority Levels**: Low, Medium, High, Urgent
- **Description & Next Actions**: Detailed tracking of call results and required follow-up

### 📝 Smart Notes
- **Real-time Note Taking**: Add notes during or after calls
- **Note Types**: General, Action Item, Follow-up, Escalation, Positive, Negative
- **Timestamps**: Automatic timestamping for all notes
- **Tagging System**: Categorize notes for better organization

### 🎙️ Recording & Transcription
- **Call Recording**: Start/stop recording during calls
- **AI Transcription**: Automatic speech-to-text conversion
- **Quality Assessment**: AI-powered call quality scoring
- **Sentiment Analysis**: Analyze call tone and engagement

### 🤖 AI Scripts
- **Contextual Scripts**: Personalized based on lead profile and course interest
- **Script Types**: Opening, Qualification, Objection Handling, Closing, Follow-up
- **Confidence Scoring**: AI confidence levels for each script
- **Timing Recommendations**: Optimal timing for script delivery

### 📊 Real-time Analytics
- **Call Duration**: Live timer during calls
- **Quality Metrics**: AI-generated call quality scores
- **Conversion Probability**: Real-time conversion likelihood updates
- **Performance Tracking**: Monitor call effectiveness over time

### 🔄 Follow-up Planning
- **AI Recommendations**: Smart suggestions for next actions
- **Timing Optimization**: Best times for follow-up based on lead behavior
- **Risk Assessment**: AI-powered risk evaluation for each lead
- **Strategy Development**: Personalized call strategies based on lead context

## Usage

### Basic Integration

```tsx
import CallComposer, { type Lead } from "@/components/CallComposer";

const MyComponent = () => {
  const [showCallComposer, setShowCallComposer] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleCallSave = async (callData: any) => {
    // Save call data to your CRM system
    console.log("Call saved:", callData);
  };

  return (
    <>
      <button onClick={() => setShowCallComposer(true)}>
        Start Call
      </button>

      <CallComposer
        isOpen={showCallComposer}
        onClose={() => setShowCallComposer(false)}
        lead={selectedLead}
        onSaveCall={handleCallSave}
      />
    </>
  );
};
```

### Integration with Leads Management

The CallComposer is already integrated into the LeadsManagement component. Click the phone icon on any lead row to open the call interface.

## Props

### CallComposerProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls visibility of the modal |
| `onClose` | `() => void` | Yes | Function called when modal is closed |
| `lead` | `Lead \| null` | Yes | Lead data for the call |
| `onSaveCall` | `(callData: CallComposerData) => Promise<void>` | No | Callback when call is saved |

### Lead Interface

```tsx
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

### CallComposerData Interface

```tsx
interface CallComposerData {
  lead: Lead | null;
  callType: "incoming" | "outgoing";
  callOutcome: CallOutcome;
  notes: CallNote[];
  recording: CallRecording | null;
  scripts: CallScript[];
  duration: number; // seconds
  timestamp: string;
  aiInsights: {
    suggestedScripts: CallScript[];
    callStrategy: string;
    followUpRecommendations: string[];
    riskAssessment: string;
    conversionProbability: number;
  };
}
```

## AI Features

### Script Generation
The AI analyzes lead data to generate personalized conversation scripts:
- **Opening Scripts**: Based on lead score and conversion probability
- **Qualification Scripts**: Tailored to course interest and academic year
- **Objection Handling**: Common objections for specific course types
- **Closing Scripts**: Next steps based on call engagement

### Call Strategy
AI provides strategic guidance for each call:
- Focus areas based on lead characteristics
- Campus-specific advantages to highlight
- Risk assessment and mitigation strategies
- Optimal follow-up timing recommendations

### Sentiment Analysis
For recorded calls, AI analyzes:
- Call sentiment (positive, neutral, negative, mixed)
- Key topics discussed
- Action items identified
- Call quality scoring
- Summary generation

## Styling

The component follows the Ivy design system:
- **Color Palette**: Slate theme with professional grays and blacks
- **Typography**: Clean, readable fonts with proper hierarchy
- **Spacing**: Consistent spacing using Tailwind CSS utilities
- **Responsiveness**: Mobile-first design with responsive breakpoints
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Dependencies

- **React**: Core framework
- **Lucide React**: Icon library
- **Tailwind CSS**: Styling framework
- **shadcn/ui**: UI component library
- **TypeScript**: Type safety

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- **Virtual Scrolling**: Efficient rendering of large note lists
- **Debounced Updates**: Optimized state updates during calls
- **Memoized Components**: React.memo for performance optimization
- **Lazy Loading**: AI features load on-demand

## Future Enhancements

- **Integration with Phone Systems**: Direct phone system integration
- **Advanced Analytics**: Call performance dashboards
- **Team Collaboration**: Share call insights with team members
- **Automated Follow-ups**: AI-powered follow-up scheduling
- **Voice Recognition**: Real-time voice-to-text during calls
- **Call Coaching**: AI-powered call improvement suggestions

## Contributing

When contributing to the CallComposer:

1. Follow the existing code style and patterns
2. Add proper TypeScript types for new features
3. Include comprehensive error handling
4. Add unit tests for new functionality
5. Update this documentation for new features
6. Ensure accessibility compliance
7. Test across different screen sizes and browsers

## Support

For questions or issues with the CallComposer component:
- Check the component documentation
- Review the TypeScript interfaces
- Test with the demo component
- Consult the Ivy development team
