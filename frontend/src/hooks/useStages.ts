import { useEffect, useState } from 'react';
import { applicationsApi } from '@/services/api';

export interface Stage {
  id: string;
  label: string;
}

export function useStages() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchStages = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await applicationsApi.getStages();
        if (mounted) {
          setStages(data || []);
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Failed to load stages');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStages();
    
    return () => { 
      mounted = false; 
    };
  }, []);

  return { stages, loading, error };
}
