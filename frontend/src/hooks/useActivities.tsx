import { useState, useEffect, useCallback } from 'react';
import { activitiesApi, ActivityOut, ActivityCreate } from '@/services/api';
import { Mail, Phone, Video, Globe, RefreshCw, Edit } from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'website' | 'workflow' | 'property_updated';
  title: string;
  subtitle?: string;
  when: string;
  ts?: number;
  icon: React.ReactNode;
  tintClass: string;
}

export const useActivities = (personId: string | null) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load activities from API
  const loadActivities = useCallback(async () => {
    if (!personId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Loading activities for person:', personId);
      const apiActivities = await activitiesApi.getByPerson(personId);
      console.log('📡 API response:', apiActivities);
      
      // Handle case where API returns undefined or null
      if (!apiActivities || !Array.isArray(apiActivities)) {
        console.warn('⚠️ API returned invalid data:', apiActivities);
        setActivities([]);
        return;
      }
      
      // Convert API activities to UI format
      const convertedActivities: ActivityItem[] = apiActivities.map(activity => {
        // Map activity types to UI types and icons
        let type: ActivityItem['type'] = 'workflow';
        let icon: React.ReactNode = null;
        let tintClass = 'bg-muted/10 text-muted-foreground';
        let subtitle = activity.activity_description || '';
        
        switch (activity.activity_type.toLowerCase()) {
          case 'email':
            type = 'email';
            icon = <Mail className="h-3.5 w-3.5" />;
            tintClass = 'bg-accent/10 text-accent';
            // For emails, show subject in subtitle
            if (activity.metadata?.subject) {
              subtitle = `Subject: ${activity.metadata.subject}`;
            }
            break;
          case 'call':
            type = 'call';
            icon = <Phone className="h-3.5 w-3.5" />;
            tintClass = 'bg-info/10 text-info';
            // For calls, show duration and outcome
            if (activity.metadata?.duration !== undefined) {
              const duration = activity.metadata.duration;
              const outcome = activity.metadata.call_outcome || 'Unknown';
              subtitle = `${duration}s • ${outcome.replace('_', ' ')}`;
            }
            break;
          case 'meeting':
            type = 'meeting';
            icon = <Video className="h-3.5 w-3.5" />;
            tintClass = 'bg-success/10 text-success';
            // For meetings, show location and time
            if (activity.metadata?.location) {
              subtitle = `${activity.metadata.location} • ${activity.metadata.mode || 'In-person'}`;
            }
            break;
          case 'website':
            type = 'website';
            icon = <Globe className="h-3.5 w-3.5" />;
            tintClass = 'bg-success/10 text-success';
            break;
          case 'property_updated':
            type = 'property_updated';
            icon = <Edit className="h-3.5 w-3.5" />;
            tintClass = 'bg-success/10 text-success';
            break;
          default:
            type = 'workflow';
            icon = <RefreshCw className="h-3.5 w-3.5" />;
            tintClass = 'bg-warning/10 text-warning';
        }
        
        return {
          id: activity.id.toString(),
          type,
          title: activity.activity_title,
          subtitle: subtitle || undefined,
          when: new Date(activity.created_at).toLocaleDateString(),
          ts: new Date(activity.created_at).getTime(),
          icon,
          tintClass
        };
      });
      
      setActivities(convertedActivities);
    } catch (err) {
      console.error('Failed to load activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [personId]);

  // Add a new activity
  const addActivity = useCallback(async (activityData: ActivityCreate) => {
    try {
      const newActivity = await activitiesApi.create(activityData);
      
      // Convert to UI format and add to state
      let icon: React.ReactNode = <RefreshCw className="h-3.5 w-3.5" />;
      let tintClass = 'bg-warning/10 text-warning';
      
      switch (activityData.activity_type.toLowerCase()) {
        case 'email':
          icon = <Mail className="h-3.5 w-3.5" />;
          tintClass = 'bg-accent/10 text-accent';
          break;
        case 'call':
          icon = <Phone className="h-3.5 w-3.5" />;
          tintClass = 'bg-info/10 text-info';
          break;
        case 'meeting':
          icon = <Video className="h-3.5 w-3.5" />;
          tintClass = 'bg-success/10 text-success';
          break;
        case 'website':
          icon = <Globe className="h-3.5 w-3.5" />;
          tintClass = 'bg-success/10 text-success';
          break;
        case 'property_updated':
          icon = <Edit className="h-3.5 w-3.5" />;
          tintClass = 'bg-success/10 text-success';
          break;
      }
      
      const convertedActivity: ActivityItem = {
        id: newActivity.id.toString(),
        type: activityData.activity_type as ActivityItem['type'],
        title: activityData.activity_title,
        subtitle: activityData.activity_description,
        when: 'just now',
        ts: Date.now(),
        icon,
        tintClass
      };
      
      setActivities(prev => [convertedActivity, ...prev]);
      return newActivity;
    } catch (err) {
      console.error('Failed to create activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to create activity');
      throw err;
    }
  }, []);

  // Load activities when personId changes
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  return {
    activities,
    loading,
    error,
    addActivity,
    loadActivities
  };
};
