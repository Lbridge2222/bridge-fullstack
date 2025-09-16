// Integration Example: How to use CallConsole in LeadsManagement
// This shows how to replace CallComposer with CallConsole

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import CallConsole from './CallConsole';
import { type Lead, type CallConsoleData } from '@/services/callConsoleApi';

// Example usage in LeadsManagement component
export const LeadsManagementWithCallConsole: React.FC = () => {
  const [isCallConsoleOpen, setIsCallConsoleOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Example lead data (this would come from your existing data)
  const exampleLead: Lead = {
    id: 1,
    uid: "lead-123",
    name: "Arthur Smith",
    email: "arthur.smith@email.com",
    phone: "+44 7700 900123",
    courseInterest: "Foundation Certificate in Marketing",
    statusType: "contacted",
    nextAction: "Schedule portfolio review",
    followUpDate: "2024-01-15T10:00:00Z",
    aiInsights: {
      conversionProbability: 0.78,
      callStrategy: "Focus on practical elements and career outcomes",
      recommendedAction: "Schedule portfolio review within 48 hours"
    }
  };

  const handleStartCall = (lead: Lead) => {
    setSelectedLead(lead);
    setIsCallConsoleOpen(true);
  };

  const handleSaveCall = (callData: CallConsoleData) => {
    console.log('Call saved:', callData);
    
    // The CallConsole already saves to the backend via API
    // You can also trigger additional actions here like:
    // - Refresh the leads list
    // - Update UI state
    // - Show success notifications
    // - Move to next lead in queue
    
    // Example: Refresh leads or update local state
    // refetchLeads();
  };

  const handleStartNextCall = () => {
    // Example: Move to next lead in queue
    console.log('Starting next call in queue');
    // setSelectedLead(nextLeadInQueue);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Leads Management</h1>
      
      {/* Example lead card */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{exampleLead.name}</h3>
            <p className="text-sm text-gray-600">{exampleLead.email}</p>
            <p className="text-sm text-gray-600">{exampleLead.phone}</p>
            <p className="text-sm text-blue-600">{exampleLead.courseInterest}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {Math.round(exampleLead.aiInsights?.conversionProbability * 100)}% conversion
            </span>
            <Button
              onClick={() => handleStartCall(exampleLead)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-4 w-4 mr-2" />
              Start Call
            </Button>
          </div>
        </div>
      </div>

      {/* CallConsole Modal */}
      <CallConsole
        isOpen={isCallConsoleOpen}
        onClose={() => {
          setIsCallConsoleOpen(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        onSaveCall={handleSaveCall}
        mode="compact"
        hasQueue={true} // Enable "Save & Next" button
        onStartNextCall={handleStartNextCall}
      />
    </div>
  );
};

// Alternative: Replace existing CallComposer usage
export const ReplaceCallComposerExample: React.FC = () => {
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // This is how you would replace existing CallComposer usage
  const handleCallClick = (lead: any) => {
    // Transform existing lead data to CallConsole format
    const callConsoleLead: Lead = {
      id: lead.id,
      uid: lead.uid || lead.id.toString(),
      name: lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      email: lead.email || '',
      phone: lead.phone || '',
      courseInterest: lead.courseInterest || lead.programme_name,
      statusType: lead.statusType || lead.lifecycle_state,
      nextAction: lead.nextAction || lead.last_activity_title,
      followUpDate: lead.followUpDate || lead.last_activity_at,
      aiInsights: {
        conversionProbability: lead.conversion_probability || 0,
        callStrategy: 'standard',
        recommendedAction: lead.last_activity_title || 'Follow up'
      }
    };

    setSelectedLead(callConsoleLead);
    setIsCallOpen(true);
  };

  return (
    <div>
      {/* Your existing leads list */}
      <div className="space-y-2">
        {/* Example lead item */}
        <div 
          className="p-3 border rounded cursor-pointer hover:bg-gray-50"
          onClick={() => handleCallClick({
            id: 1,
            uid: "lead-123",
            name: "Arthur Smith",
            email: "arthur@email.com",
            phone: "+44 7700 900123",
            courseInterest: "Marketing",
            lifecycle_state: "contacted",
            conversion_probability: 0.78
          })}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">Arthur Smith</span>
            <Button size="sm" variant="outline">
              <Phone className="h-4 w-4 mr-1" />
              Call
            </Button>
          </div>
        </div>
      </div>

      {/* CallConsole replaces CallComposer */}
      <CallConsole
        isOpen={isCallOpen}
        onClose={() => {
          setIsCallOpen(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        onSaveCall={(data) => {
          console.log('Call completed:', data);
          // Handle call completion
        }}
        mode="compact"
        hasQueue={false}
      />
    </div>
  );
};

export default LeadsManagementWithCallConsole;
