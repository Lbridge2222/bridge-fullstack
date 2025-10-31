import React from 'react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

// Sample AI response with poor formatting (before)
const samplePoorFormatting = `Based on the analysis of this student's application, I can see several key areas that need attention. The student has shown interest in the MA Music Performance programme but there are some concerns about their readiness for the course. Their previous experience in music is limited and they may need additional preparation before starting the programme. The application shows potential but there are gaps in their portfolio that need to be addressed. I recommend scheduling a call to discuss their specific needs and provide guidance on how to strengthen their application. The next steps should include reviewing their portfolio materials and providing feedback on areas for improvement.`;

// Sample AI response with improved formatting (after)
const sampleGoodFormatting = `Based on the analysis of this student's application, I can see several key areas that need attention.

**Key Observations:**

The student has shown interest in the MA Music Performance programme, but there are some concerns about their readiness for the course. Their previous experience in music is limited, and they may need additional preparation before starting the programme.

**Recommendations:**

• **Immediate:** Schedule a call to discuss their specific needs and provide guidance on strengthening their application
• **Follow-up:** Review their portfolio materials and provide detailed feedback on areas for improvement  
• **Next steps:** Develop a personalised preparation plan to address identified gaps

The application shows potential, but addressing these areas will significantly improve their chances of success.`;

export function MarkdownFormattingDemo() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Markdown Formatting Improvements</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Before */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-red-600">Before (Poor Formatting)</h3>
            <div className="bg-muted p-4 rounded-lg border">
              <MarkdownRenderer content={samplePoorFormatting} />
            </div>
          </div>
          
          {/* After */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-green-600">After (Improved Formatting)</h3>
            <div className="bg-muted p-4 rounded-lg border">
              <MarkdownRenderer content={sampleGoodFormatting} />
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <h4 className="font-semibold mb-2">Key Improvements:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Proper paragraph breaks:</strong> Long blocks of text are split into readable paragraphs</li>
            <li><strong>Consistent bullet formatting:</strong> All bullet points use the same style (•) with proper spacing</li>
            <li><strong>Clear headings:</strong> Important sections are marked with bold headings</li>
            <li><strong>Better spacing:</strong> Proper line breaks between sections and bullet points</li>
            <li><strong>UK English:</strong> Consistent use of British spelling and terminology</li>
            <li><strong>Actionable structure:</strong> Clear next steps with proper formatting</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
