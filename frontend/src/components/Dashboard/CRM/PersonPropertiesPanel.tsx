import React, { useState, useMemo, useCallback } from 'react';
import { Search, ChevronDown, ChevronRight, Plus, User, Phone, GraduationCap, RefreshCw, BarChart3, Target, BookOpen, Briefcase, Shield, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import PropertyRow from './PropertyRow';
import PropertyHistoryDrawer from './PropertyHistoryDrawer';

// Mock data structure for properties
interface Property {
  id: string;
  label: string;
  group: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'multi-select' | 'number';
  source: 'HS' | 'SYS' | 'USR';
  value: string | null;
  lastChangedAt?: string;
  lastChangedBy?: string;
  hasHistory: boolean;
  options?: string[];
}

interface PropertyGroup {
  id: string;
  name: string;
  icon: React.ReactNode;
  properties: Property[];
}

interface PersonPropertiesPanelProps {
  person: any; // PersonEnriched type
}

const PersonPropertiesPanel: React.FC<PersonPropertiesPanelProps> = ({ person }) => {
         const [searchQuery, setSearchQuery] = useState('');
       const [openGroups, setOpenGroups] = useState<string[]>(['personal', 'contactability']);
  const [historyDrawer, setHistoryDrawer] = useState<{
    isOpen: boolean;
    property: Property | null;
  }>({ isOpen: false, property: null });

  // Mock property data - replace with real data later
  const propertyGroups: PropertyGroup[] = useMemo(() => [
    {
      id: 'personal',
      name: 'Personal',
                   icon: <User className="h-4 w-4" />,
      properties: [
        {
          id: 'first-name',
          label: 'First Name',
          group: 'personal',
          type: 'text',
          source: 'SYS',
          value: person?.first_name || null,
          lastChangedAt: person?.created_at,
          lastChangedBy: 'System',
          hasHistory: false
        },
        {
          id: 'last-name',
          label: 'Last Name',
          group: 'personal',
          type: 'text',
          source: 'SYS',
          value: person?.last_name || null,
          lastChangedAt: person?.created_at,
          lastChangedBy: 'System',
          hasHistory: false
        },
        {
          id: 'date-of-birth',
          label: 'Date of Birth',
          group: 'personal',
          type: 'date',
          source: 'USR',
          value: null,
          hasHistory: false
        },
        {
          id: 'gender',
          label: 'Gender',
          group: 'personal',
          type: 'select',
          source: 'USR',
          value: null,
          options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
          hasHistory: false
        }
      ]
    },
    {
      id: 'contactability',
      name: 'Contactability',
                   icon: <Phone className="h-4 w-4" />,
      properties: [
        {
          id: 'email',
          label: 'Email Address',
          group: 'contactability',
          type: 'email',
          source: 'SYS',
          value: person?.email || null,
          lastChangedAt: person?.created_at,
          lastChangedBy: 'System',
          hasHistory: false
        },
        {
          id: 'phone',
          label: 'Phone Number',
          group: 'contactability',
          type: 'phone',
          source: 'SYS',
          value: person?.phone || null,
          lastChangedAt: person?.created_at,
          lastChangedBy: 'System',
          hasHistory: false
        },
        {
          id: 'preferred-contact',
          label: 'Preferred Contact Method',
          group: 'contactability',
          type: 'select',
          source: 'USR',
          value: person?.preferred_contact_method || null,
          options: ['Email', 'Phone', 'SMS', 'Post'],
          hasHistory: false
        },
        {
          id: 'address',
          label: 'Address',
          group: 'contactability',
          type: 'text',
          source: 'USR',
          value: null,
          hasHistory: false
        }
      ]
    },
    {
      id: 'program',
      name: 'Program/Course',
                   icon: <GraduationCap className="h-4 w-4" />,
      properties: [
        {
          id: 'course-applied',
          label: 'Course Applied For',
          group: 'program',
          type: 'text',
          source: 'SYS',
          value: person?.latest_programme_name || null,
          hasHistory: false
        },
        {
          id: 'level-of-study',
          label: 'Level of Study',
          group: 'program',
          type: 'select',
          source: 'SYS',
          value: person?.latest_academic_year || null,
          options: ['Foundation', 'Undergraduate', 'Postgraduate', 'PhD'],
          hasHistory: false
        },
        {
          id: 'campus',
          label: 'Campus',
          group: 'program',
          type: 'select',
          source: 'SYS',
          value: person?.latest_campus_name || null,
          options: ['Main Campus', 'City Centre', 'Business School', 'Online'],
          hasHistory: false
        },
        {
          id: 'start-date',
          label: 'Start Date',
          group: 'program',
          type: 'date',
          source: 'SYS',
          value: person?.latest_application_date || null,
          hasHistory: false
        }
      ]
    },
    {
      id: 'lifecycle',
      name: 'Lifecycle & Offer',
                   icon: <RefreshCw className="h-4 w-4" />,
      properties: [
        {
          id: 'lifecycle-stage',
          label: 'Lifecycle Stage',
          group: 'lifecycle',
          type: 'select',
          source: 'SYS',
          value: person?.lifecycle_state || null,
          options: ['Enquiry', 'Applicant', 'Enrolled', 'Alumni'],
          hasHistory: true
        },
        {
          id: 'application-status',
          label: 'Application Status',
          group: 'lifecycle',
          type: 'select',
          source: 'SYS',
          value: person?.latest_application_stage || null,
          options: ['Draft', 'Submitted', 'Under Review', 'Conditional Offer', 'Unconditional Offer', 'Accepted', 'Rejected'],
          hasHistory: true
        },
        {
          id: 'offer-amount',
          label: 'Offer Amount',
          group: 'lifecycle',
          type: 'number',
          source: 'USR',
          value: null,
          hasHistory: false
        }
      ]
    },
    {
      id: 'engagement',
      name: 'Engagement',
                   icon: <BarChart3 className="h-4 w-4" />,
      properties: [
        {
          id: 'lead-score',
          label: 'Lead Score',
          group: 'engagement',
          type: 'number',
          source: 'SYS',
          value: person?.lead_score?.toString() || null,
          hasHistory: true
        },
        {
          id: 'conversion-probability',
          label: 'Conversion Probability',
          group: 'engagement',
          type: 'number',
          source: 'SYS',
          value: person?.conversion_probability ? `${Math.round(person.conversion_probability * 100)}%` : null,
          hasHistory: true
        },
        {
          id: 'last-engagement',
          label: 'Last Engagement',
          group: 'engagement',
          type: 'date',
          source: 'SYS',
          value: person?.last_engagement_date || null,
          hasHistory: true
        },
        {
          id: 'touchpoint-count',
          label: 'Touchpoint Count',
          group: 'engagement',
          type: 'number',
          source: 'SYS',
          value: person?.touchpoint_count?.toString() || null,
          hasHistory: true
        }
      ]
    },
    {
      id: 'attribution',
      name: 'Attribution',
                   icon: <Target className="h-4 w-4" />,
      properties: [
        {
          id: 'source',
          label: 'Lead Source',
          group: 'attribution',
          type: 'select',
          source: 'SYS',
          value: person?.source || null,
          options: ['Website', 'Referral', 'Social Media', 'Email Campaign', 'Event', 'Direct'],
          hasHistory: true
        },
        {
          id: 'campaign',
          label: 'Campaign',
          group: 'attribution',
          type: 'text',
          source: 'USR',
          value: null,
          hasHistory: false
        },
        {
          id: 'referrer',
          label: 'Referrer',
          group: 'attribution',
          type: 'text',
          source: 'USR',
          value: null,
          hasHistory: false
        }
      ]
    },
    {
      id: 'education',
      name: 'Education',
                   icon: <BookOpen className="h-4 w-4" />,
      properties: [
        {
          id: 'current-college',
          label: 'Current/Previous College',
          group: 'education',
          type: 'text',
          source: 'USR',
          value: null,
          hasHistory: false
        },
        {
          id: 'expected-ucas',
          label: 'Expected UCAS Points',
          group: 'education',
          type: 'number',
          source: 'USR',
          value: null,
          hasHistory: false
        },
        {
          id: 'achieved-ucas',
          label: 'Achieved UCAS Points',
          group: 'education',
          type: 'number',
          source: 'USR',
          value: null,
          hasHistory: false
        },
        {
          id: 'a-level-subjects',
          label: 'A-Level Subjects',
          group: 'education',
          type: 'text',
          source: 'USR',
          value: null,
          hasHistory: false
        }
      ]
    },
    {
      id: 'portfolio',
      name: 'Portfolio',
                   icon: <Briefcase className="h-4 w-4" />,
      properties: [
        {
          id: 'work-experience',
          label: 'Work Experience',
          group: 'portfolio',
          type: 'text',
          source: 'USR',
          value: null,
          hasHistory: false
        },
        {
          id: 'skills',
          label: 'Skills',
          group: 'portfolio',
          type: 'text',
          source: 'USR',
          value: null,
          hasHistory: false
        },
        {
          id: 'languages',
          label: 'Languages',
          group: 'portfolio',
          type: 'text',
          source: 'USR',
          value: null,
          hasHistory: false
        }
      ]
    },
    {
      id: 'compliance',
      name: 'Compliance',
                   icon: <Shield className="h-4 w-4" />,
      properties: [
        {
          id: 'gdpr-consent',
          label: 'GDPR Consent',
          group: 'compliance',
          type: 'select',
          source: 'SYS',
          value: 'Yes',
          options: ['Yes', 'No', 'Pending'],
          hasHistory: true
        },
        {
          id: 'marketing-consent',
          label: 'Marketing Consent',
          group: 'compliance',
          type: 'select',
          source: 'SYS',
          value: 'No',
          options: ['Yes', 'No', 'Pending'],
          hasHistory: true
        },
        {
          id: 'data-retention',
          label: 'Data Retention Until',
          group: 'compliance',
          type: 'date',
          source: 'SYS',
          value: '2026-08-22',
          hasHistory: false
        }
      ]
    },
    {
      id: 'custom',
      name: 'Custom',
                   icon: <Settings className="h-4 w-4" />,
      properties: [
        {
          id: 'custom-field-1',
          label: 'Custom Field 1',
          group: 'custom',
          type: 'text',
          source: 'USR',
          value: null,
          hasHistory: false
        },
        {
          id: 'custom-field-2',
          label: 'Custom Field 2',
          group: 'custom',
          type: 'text',
          source: 'USR',
          value: null,
          hasHistory: false
        }
      ]
    }
  ], [person]);

           // Filter properties based on search criteria
         const filteredGroups = useMemo(() => {
           return propertyGroups.map(group => ({
             ...group,
             properties: group.properties.filter(property => {
               const matchesSearch = searchQuery === '' ||
                 property.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 (property.value && property.value.toLowerCase().includes(searchQuery.toLowerCase()));

               return matchesSearch;
             })
           })).filter(group => group.properties.length > 0);
         }, [propertyGroups, searchQuery]);

  // Handle property save
  const handlePropertySave = useCallback((propertyId: string, value: string) => {
    console.log('Saving property:', propertyId, value);
    // TODO: Implement actual save logic
  }, []);

  // Handle history drawer open
  const handleHistoryClick = useCallback((property: Property) => {
    setHistoryDrawer({ isOpen: true, property });
  }, []);

  // Handle history drawer close
  const handleHistoryClose = useCallback(() => {
    setHistoryDrawer({ isOpen: false, property: null });
  }, []);

  // Toggle group open/closed
  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

  

  return (
    <div className="h-full flex flex-col">
                   {/* Search Bar */}
             <div className="p-4 bg-slate-50/50">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                   placeholder="Search properties..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="pl-10 bg-white border-slate-200"
                 />
               </div>
             </div>

      {/* Properties List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {filteredGroups.map((group) => {
            const filledCount = group.properties.filter(p => p.value).length;
            const totalCount = group.properties.length;
            
            return (
              <div key={group.id} className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full p-3 flex items-center justify-between hover:bg-slate-100 transition-colors text-left bg-slate-50/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{group.icon}</span>
                    <div>
                      <h3 className="font-medium text-foreground">{group.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {filledCount}/{totalCount} fields filled
                      </p>
                    </div>
                  </div>
                  {openGroups.includes(group.id) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {/* Group Content */}
                {openGroups.includes(group.id) && (
                  <div className="border-t p-3 space-y-1">
                    {group.properties.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">No fields match the current filters</p>
                      </div>
                    ) : (
                      group.properties.map((property) => (
                        <PropertyRow
                          key={property.id}
                          {...property}
                          onSave={(value) => handlePropertySave(property.id, value)}
                          onHistoryClick={() => handleHistoryClick(property)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredGroups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No properties match the current search and filters</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* History Drawer */}
      {historyDrawer.property && (
        <PropertyHistoryDrawer
          isOpen={historyDrawer.isOpen}
          onClose={handleHistoryClose}
          propertyLabel={historyDrawer.property.label}
          currentValue={historyDrawer.property.value}
          changes={[
            // Mock history data - replace with real data later
            {
              id: '1',
              timestamp: '2024-08-22T10:00:00Z',
              value: historyDrawer.property.value || 'Not set',
              changedBy: 'Sarah Wilson',
              changeType: 'updated' as const
            },
            {
              id: '2',
              timestamp: '2024-08-20T14:30:00Z',
              value: 'Previous value',
              changedBy: 'System',
              changeType: 'created' as const
            }
          ]}
        />
      )}
    </div>
  );
};

export default PersonPropertiesPanel;
