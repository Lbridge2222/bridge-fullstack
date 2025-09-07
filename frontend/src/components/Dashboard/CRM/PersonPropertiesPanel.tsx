import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { peopleApi, type PersonEnriched } from '@/services/api';
import { Search, ChevronDown, ChevronRight, Plus, User, Phone, GraduationCap, RefreshCw, BarChart3, Target, BookOpen, Briefcase, Shield, Settings, Loader2, Brain } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

import PropertyRow from './PropertyRow';
import PropertyHistoryDrawer from './PropertyHistoryDrawer';

// Real property structure from our API
interface ProgressiveProperty {
  id: string;
  name: string;
  label: string;
  data_type: string;
  group_key: string;
  lifecycle_stages: string[];
  display_order: number;
  is_required_at_stage: boolean;
  is_system_managed: boolean;
  data_source: string;
  options: any;
  validation_rules: any;
  default_value: any;
  is_ai_enhanced: boolean;
  value: any; // Added for actual value from API
  last_changed_at: string; // Added for last changed timestamp
}

interface PropertyGroup {
  id: string;
  name: string;
  icon: React.ReactNode;
  properties: ProgressiveProperty[];
  property_count: number;
}

interface PersonPropertiesPanelProps {
  person: any; // PersonEnriched type
  onPersonPatched?: (updates: Partial<PersonEnriched>) => void;
}

const PersonPropertiesPanel: React.FC<PersonPropertiesPanelProps> = ({ person, onPersonPatched }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<string[]>(['personal', 'contactability']);
  const [properties, setProperties] = useState<ProgressiveProperty[]>([]);
  const [propertyGroups, setPropertyGroups] = useState<PropertyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [historyDrawer, setHistoryDrawer] = useState<{
    isOpen: boolean;
    property: ProgressiveProperty | null;
  }>({ isOpen: false, property: null });

  // Icon mapping for property groups
  const groupIcons: Record<string, React.ReactNode> = {
    personal: <User className="h-4 w-4" />,
    contactability: <Phone className="h-4 w-4" />,
    academic: <GraduationCap className="h-4 w-4" />,
    engagement: <BarChart3 className="h-4 w-4" />,
    scoring: <Target className="h-4 w-4" />,
    attribution: <BookOpen className="h-4 w-4" />,
    ai_insights: <Brain className="h-4 w-4" />,
    ucas: <Briefcase className="h-4 w-4" />,
    other: <Settings className="h-4 w-4" />
  };

  // Map ProgressiveProperty to PropertyRowProps
  const mapPropertyToRowProps = useCallback((prop: ProgressiveProperty) => {
    // Map data_type to PropertyRow type
    const typeMap: Record<string, 'text' | 'email' | 'phone' | 'date' | 'select' | 'multi-select' | 'number'> = {
      'text': 'text',
      'email': 'email',
      'phone': 'phone',
      'date': 'date',
      'datetime': 'date',
      'select': 'select',
      'multi-select': 'multi-select',
      'number': 'number',
      'decimal': 'number',
      'boolean': 'select'
    };

    // Map data_source to PropertyRow source
    const sourceMap: Record<string, 'HS' | 'SYS' | 'USR'> = {
      'etl': 'HS',
      'manual': 'USR',
      'calculated': 'SYS',
      'ai': 'SYS',
      'system': 'SYS'
    };

    const standardNames = new Set(['first_name','last_name','email','phone','lifecycle_state','lead_score','conversion_probability']);
    // Prefer live person object for standard fields; fallback to property value
    let raw: any = (prop as any).value ?? prop.default_value ?? null;
    if (person && standardNames.has(prop.name)) {
      const fromPerson = (person as any)[prop.name];
      raw = fromPerson !== undefined && fromPerson !== null ? fromPerson : raw;
    }
    const display = raw === null ? null : typeof raw === 'object' ? JSON.stringify(raw) : String(raw);

    return {
      id: prop.id,
      label: prop.label,
      value: display, // coerce to display string
      type: typeMap[prop.data_type] || 'text',
      source: sourceMap[prop.data_source] || 'SYS',
      hasHistory: prop.is_system_managed,
      lastChangedAt: (prop as any).last_changed_at,
      lastChangedBy: undefined,
      options: (prop as any).options || []
    };
  }, [person]);

  // Fetch progressive properties based on person's lifecycle stage
  const fetchProgressiveProperties = useCallback(async () => {
    if (!person?.lifecycle_state || !person?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get properties for the person's current lifecycle stage WITH their actual values
      const response = await fetch(`http://localhost:8000/people/${person.id}/properties/progressive`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch properties: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('API Response:', data);
      console.log('Properties data:', data.properties);
      console.log('Total properties:', data.total_properties);
      
      // Transform the API response to our component structure
      const transformedGroups: PropertyGroup[] = Object.entries(data.properties).map(([groupKey, groupProps]: [string, any]) => ({
        id: groupKey,
        name: groupKey.charAt(0).toUpperCase() + groupKey.slice(1).replace('_', ' '),
        icon: groupIcons[groupKey] || groupIcons.other,
        properties: groupProps,
        property_count: groupProps.length
      }));
      
      console.log('Transformed groups:', transformedGroups);
      console.log('Number of groups:', transformedGroups.length);
      
      // Flatten all properties into a single array for easy searching
      const allProperties = Object.values(data.properties).flat() as ProgressiveProperty[];
      console.log('Flattened properties:', allProperties);
      
      setProperties(allProperties);
      setPropertyGroups(transformedGroups);
      
      // Auto-open the first few groups
      setOpenGroups(transformedGroups.slice(0, 3).map(g => g.id));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch properties');
      console.error('Error fetching progressive properties:', err);
    } finally {
      setLoading(false);
    }
  }, [person?.lifecycle_state, person?.id]);

  // Fetch properties when person changes
  useEffect(() => {
    fetchProgressiveProperties();
  }, [fetchProgressiveProperties]);

  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return propertyGroups;
    
    return propertyGroups.map(group => ({
      ...group,
      properties: group.properties.filter(prop => 
        prop.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(group => group.properties.length > 0);
  }, [propertyGroups, searchQuery]);

  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

    const handlePropertySave = useCallback(async (propertyId: string, value: any) => {
    try {
      console.log('Saving property:', propertyId, value);
      
      // Debug: Find the property details to understand what we're updating
      const property = properties.find(p => p.id === propertyId);
      console.log('Property details:', property);
      
      // Get the person ID from the person prop
      const personId = person?.id || window.location.pathname.split('/').pop();
      if (!personId) {
        console.error('No person ID found for property save');
        return;
      }
      
      // Determine if this is a standard person field or a custom property
      const standardFields = ['first_name', 'last_name', 'email', 'phone', 'lead_score', 'status'];
      const isStandardField = standardFields.includes(propertyId);
      
      // Also check if the property name matches a standard field
      const isStandardFieldByName = property && standardFields.includes(property.name);
      
      console.log('Property ID check:', { propertyId, isStandardField, propertyName: property?.name, isStandardFieldByName });
      
      if (isStandardField || isStandardFieldByName) {
        // Use the property name if it's a standard field, otherwise use the ID
        const fieldName = property?.name || propertyId;
        const updateData: any = {};
        updateData[fieldName] = value;
        
        console.log('Updating standard person field via API:', updateData);
        
        const result = await peopleApi.updatePerson(String(personId), updateData);
        console.log('Person update successful:', result);
        
        // Optimistically patch parent person state so identity block updates immediately
        onPersonPatched?.(updateData);
        
        // Refresh the properties to show the updated value
        await fetchProgressiveProperties();
        
      } else {
        // Handle custom properties via API upsert
        if (!property) throw new Error('Unknown property');
        console.log('Updating custom property via API:', { propertyId, name: property.name, data_type: property.data_type, value });
        await peopleApi.updatePersonProperty(String(personId), {
          property_id: property.id,
          property_name: property.name,
          data_type: (property as any).data_type as any,
          value,
        });
        await fetchProgressiveProperties();
      }
      
    } catch (error) {
      console.error('Failed to save property:', error);
      // You might want to show a toast notification here
    }
  }, [person?.id, fetchProgressiveProperties, properties]);

  const handleHistoryClick = useCallback((property: ProgressiveProperty) => {
    setHistoryDrawer({ isOpen: true, property });
  }, []);

  const handleHistoryClose = useCallback(() => {
    setHistoryDrawer({ isOpen: false, property: null });
  }, []);

  const handleRefresh = useCallback(() => {
    fetchProgressiveProperties();
  }, [fetchProgressiveProperties]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading properties...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load properties</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

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
            const filledCount = group.properties.filter(p => (p as any).value ?? p.default_value).length;
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
                          {...mapPropertyToRowProps(property)}
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
              {propertyGroups.length === 0 ? (
                <div>
                  <p className="text-sm font-medium mb-2">No properties found</p>
                  <p className="text-xs text-muted-foreground">
                    No properties match lifecycle stage: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{person?.lifecycle_state || 'unknown'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    API returned {properties ? Object.keys(properties).length : 0} property groups
                  </p>
                </div>
              ) : (
                <p className="text-sm">No properties match the current search and filters</p>
              )}
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
          currentValue={historyDrawer.property.default_value}
          changes={[
            // Mock history data - replace with real data later
            {
              id: '1',
              timestamp: '2024-08-22T10:00:00Z',
              value: historyDrawer.property.default_value || 'Not set',
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
