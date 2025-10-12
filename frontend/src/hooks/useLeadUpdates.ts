import { useState, useCallback } from 'react';
import { peopleApi, type PersonEnriched } from '@/services/api';

interface LeadUpdateData {
  lead_score?: number;
  conversion_probability?: number;
  notes?: string;
  assigned_to?: string;
  status?: string;
  next_follow_up?: string;
}

interface PersonUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  lifecycle_state?: string;
}

interface LeadNoteData {
  note: string;
  note_type?: string;
  created_by?: string;
}

export const useLeadUpdates = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLead = useCallback(async (
    personId: string, 
    updates: LeadUpdateData,
    onSuccess?: (updatedLead: any) => void,
    onError?: (error: string) => void
  ) => {
    setIsUpdating(true);
    setError(null);
    
    try {
      const result = await peopleApi.updateLead(personId, updates);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update lead';
      setError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const updatePerson = useCallback(async (
    personId: string,
    updates: PersonUpdateData,
    onSuccess?: (updatedPerson: any) => void,
    onError?: (error: string) => void
  ) => {
    setIsUpdating(true);
    setError(null);
    
    try {
      const result = await peopleApi.updatePerson(personId, updates);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update person';
      setError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const addLeadNote = useCallback(async (
    personId: string,
    note: LeadNoteData,
    onSuccess?: (addedNote: any) => void,
    onError?: (error: string) => void
  ) => {
    setIsUpdating(true);
    setError(null);
    
    try {
      const result = await peopleApi.addLeadNote(personId, note);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add note';
      setError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    updateLead,
    updatePerson,
    addLeadNote,
    isUpdating,
    error,
    clearError,
  };
};

// Hook for optimistic updates in lists
export const useOptimisticLeadUpdates = () => {
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Partial<PersonEnriched>>>(new Map());

  const applyOptimisticUpdate = useCallback((personId: string, updates: Partial<PersonEnriched>) => {
    setOptimisticUpdates(prev => new Map(prev).set(personId, updates));
  }, []);

  const clearOptimisticUpdate = useCallback((personId: string) => {
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(personId);
      return newMap;
    });
  }, []);

  const getOptimisticData = useCallback((personId: string, originalData: PersonEnriched): PersonEnriched => {
    const updates = optimisticUpdates.get(personId);
    if (!updates) return originalData;
    
    return { ...originalData, ...updates };
  }, [optimisticUpdates]);

  const clearAllOptimisticUpdates = useCallback(() => {
    setOptimisticUpdates(new Map());
  }, []);

  return {
    applyOptimisticUpdate,
    clearOptimisticUpdate,
    getOptimisticData,
    clearAllOptimisticUpdates,
    hasOptimisticUpdates: optimisticUpdates.size > 0,
  };
};
