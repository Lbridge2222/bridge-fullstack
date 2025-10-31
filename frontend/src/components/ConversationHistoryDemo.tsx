import React from 'react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

// Sample responses showing the improvements
const sampleWithAppIds = `There are 31 applications considered at high risk. The top at-risk applications are: **Harper Martin** (application ID 550e8400-e29b-41d4-a716-446655440405) is in the "review_in_progress" stage with a probability of 0.0. **Marco Rossi** (application ID 550e8400-e29b-41d4-a716-446655440424) is at the "offer_withdrawn" stage with a probability of 0.0. **Amelia Walker** (application ID 550e8400-e29b-41d4-a716-446655441043) is at the "offer_declined" stage with a probability of 0.0.`;

const sampleWithoutAppIds = `There are 31 applications considered at high risk. The top at-risk applications are:

**Harper Martin** is in the "review_in_progress" stage with a probability of 0.0.

**Marco Rossi** is at the "offer_withdrawn" stage with a probability of 0.0.

**Amelia Walker** is at the "offer_declined" stage with a probability of 0.0.

**Key Actions:**
• Review Harper Martin's application materials
• Follow up with Marco Rossi regarding their decision
• Contact Amelia Walker to understand their concerns`;

export function ConversationHistoryDemo() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Ask Ivy Improvements</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Before */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-red-600">Before (Issues)</h3>
            <div className="bg-muted p-4 rounded-lg border">
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <strong>Issues:</strong>
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                  <li>Application IDs cluttering responses</li>
                  <li>Conversation history lost when dialog closes</li>
                  <li>Poor paragraph formatting</li>
                </ul>
                <div className="mt-3">
                  <MarkdownRenderer content={sampleWithAppIds} />
                </div>
              </div>
            </div>
          </div>
          
          {/* After */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-green-600">After (Fixed)</h3>
            <div className="bg-muted p-4 rounded-lg border">
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <strong>Improvements:</strong>
                </div>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-600">
                  <li>Application IDs removed from responses</li>
                  <li>Conversation history persists per session</li>
                  <li>Clean paragraph formatting</li>
                </ul>
                <div className="mt-3">
                  <MarkdownRenderer content={sampleWithoutAppIds} />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <h4 className="font-semibold mb-2">Key Features:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Session-based conversations:</strong> Your questions and AI responses persist during the session</li>
            <li><strong>Clean responses:</strong> No technical application IDs cluttering the answers</li>
            <li><strong>Manual clear option:</strong> Use the trash icon to clear conversation when needed</li>
            <li><strong>Better formatting:</strong> Proper paragraphs, bullet points, and spacing</li>
            <li><strong>UK English:</strong> Consistent British spelling and terminology</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
