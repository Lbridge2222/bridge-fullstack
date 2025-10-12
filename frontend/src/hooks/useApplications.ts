import { useState, useEffect, useCallback, useRef } from 'react';
import { applicationsApi, ApplicationCard, StageMoveRequest, PriorityUpdateRequest } from '@/services/api';

export interface ApplicationsFilters {
  stage?: string;
  assignee?: string;
  priority?: string;
  urgency?: string;
  limit?: number;
}

export function useApplications(filters: ApplicationsFilters = {}) {
  const [applications, setApplications] = useState<ApplicationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const { stage, assignee, priority, urgency, limit } = filters;

  const fetchApplications = useCallback(async () => {
    try {
      if (!mountedRef.current) return;
      setLoading(true);
      setError(null);
      const data = await applicationsApi.getBoard({ stage, assignee, priority, urgency, limit });
      if (!mountedRef.current) return;
      setApplications(data);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch applications');
      console.error('Error fetching applications:', err);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
    }
  }, [stage, assignee, priority, urgency, limit]);

  const moveStage = useCallback(async (applicationId: string, payload: StageMoveRequest) => {
    try {
      await applicationsApi.moveStage(applicationId, payload);
      await fetchApplications();
      return true;
    } catch (err) {
      if (!mountedRef.current) return false;
      setError(err instanceof Error ? err.message : 'Failed to move application');
      console.error('Error moving application:', err);
      return false;
    }
  }, [fetchApplications]);

  const updatePriority = useCallback(async (applicationId: string, payload: PriorityUpdateRequest) => {
    try {
      await applicationsApi.updatePriority(applicationId, payload);
      await fetchApplications();
      return true;
    } catch (err) {
      if (!mountedRef.current) return false;
      setError(err instanceof Error ? err.message : 'Failed to update priority');
      console.error('Error updating priority:', err);
      return false;
    }
  }, [fetchApplications]);

  const refreshBoard = useCallback(async () => {
    try {
      await applicationsApi.refreshBoard();
      await fetchApplications();
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to refresh board');
      console.error('Error refreshing board:', err);
    }
  }, [fetchApplications]);

  useEffect(() => {
    mountedRef.current = true;
    fetchApplications();
    return () => { mountedRef.current = false; };
  }, [fetchApplications]);

  const getApplicationsByStage = useCallback((stageName: string) => {
    return applications.filter(app => app.stage === stageName);
  }, [applications]);

  const getUniqueStages = useCallback(() => {
    return [...new Set(applications.map(app => app.stage))];
  }, [applications]);

  const getPriorityDistribution = useCallback(() => {
    return applications.reduce((acc, app) => {
      const p = app.priority || 'medium';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [applications]);

  const getUrgencyDistribution = useCallback(() => {
    return applications.reduce((acc, app) => {
      const u = app.urgency || 'medium';
      acc[u] = (acc[u] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [applications]);

  return {
    applications,
    loading,
    error,
    fetchApplications,
    moveStage,
    updatePriority,
    refreshBoard,
    getApplicationsByStage,
    getUniqueStages,
    getPriorityDistribution,
    getUrgencyDistribution,
  };
}
