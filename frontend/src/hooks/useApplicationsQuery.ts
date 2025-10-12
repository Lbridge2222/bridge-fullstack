import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi } from '@/services/api';
import type { ApplicationCard, StageMoveRequest, PriorityUpdateRequest } from '@/services/api';

export interface ApplicationsFilters {
  stage?: string;
  assignee?: string;
  priority?: string;
  urgency?: string;
  limit?: number;
}

export function useApplicationsQuery(filters: ApplicationsFilters = {}) {
  const queryClient = useQueryClient();

  // Query for applications
  const {
    data: applications = [],
    isLoading: loading,
    error,
    refetch: fetchApplications
  } = useQuery({
    queryKey: ['applications', 'board', filters],
    queryFn: () => applicationsApi.getBoard(filters),
    staleTime: 30000, // 30 seconds
    // Reduce noisy refetches that can look like "backend loops"
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (applications) {
      console.log('📊 Applications data updated:', applications.length, 'applications');
    }
  }, [applications?.length]);

  // Mutation for moving stage with optimistic updates
  const moveStageMutation = useMutation({
    mutationFn: ({ applicationId, payload }: { applicationId: string; payload: StageMoveRequest }) =>
      applicationsApi.moveStage(applicationId, payload),
    onMutate: async ({ applicationId, payload }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['applications', 'board', filters] });

      // Snapshot the previous value
      const previousApplications = queryClient.getQueryData<ApplicationCard[]>(['applications', 'board', filters]);

      // Optimistically update to the new value
      queryClient.setQueryData<ApplicationCard[]>(['applications', 'board', filters], (old) =>
        old?.map(app => 
          app.application_id === applicationId 
            ? { ...app, stage: payload.to_stage }
            : app
        ) || []
      );

      // Return a context object with the snapshotted value
      return { previousApplications };
    },
    onError: (err, { applicationId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousApplications) {
        queryClient.setQueryData(['applications', 'board', filters], context.previousApplications);
      }
      
      // Show error message
      console.error('Failed to move application:', err);
    },
    onSettled: () => {
      // Invalidate once; let React Query refetch as needed
      console.log('🔄 Invalidating queries with key:', ['applications', 'board', filters]);
      queryClient.invalidateQueries({ queryKey: ['applications', 'board', filters] });
    },
  });

  // Mutation for updating priority
  const updatePriorityMutation = useMutation({
    mutationFn: ({ applicationId, payload }: { applicationId: string; payload: PriorityUpdateRequest }) =>
      applicationsApi.updatePriority(applicationId, payload),
    onMutate: async ({ applicationId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['applications', 'board', filters] });
      const previousApplications = queryClient.getQueryData<ApplicationCard[]>(['applications', 'board', filters]);

      queryClient.setQueryData<ApplicationCard[]>(['applications', 'board', filters], (old) =>
        old?.map(app => 
          app.application_id === applicationId 
            ? { ...app, priority: payload.priority, urgency_reason: payload.urgency_reason }
            : app
        ) || []
      );

      return { previousApplications };
    },
    onError: (err, { applicationId }, context) => {
      if (context?.previousApplications) {
        queryClient.setQueryData(['applications', 'board', filters], context.previousApplications);
      }
      console.error('Failed to move application:', err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'board', filters] });
    },
  });

  // Mutation for refreshing board
  const refreshBoardMutation = useMutation({
    mutationFn: () => applicationsApi.refreshBoard(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'board', filters] });
    },
  });

  // Wrapper functions for easier use
  const moveStage = async (applicationId: string, payload: StageMoveRequest) => {
    try {
      await moveStageMutation.mutateAsync({ applicationId, payload });
      return true;
    } catch (error: any) {
      console.error('Failed to move application:', error);
      // Check if it's a validation error (422) - these are expected and should be handled by the UI
      if (error?.message?.includes('Blockers:') || error?.message?.includes('HTTP 422')) {
        // This is a validation error, not a system failure
        return false;
      }
      // For other errors, also return false but log them differently
      console.error('System error moving application:', error);
      return false;
    }
  };

  const updatePriority = async (applicationId: string, payload: PriorityUpdateRequest) => {
    try {
      await updatePriorityMutation.mutateAsync({ applicationId, payload });
      return true;
    } catch (error) {
      console.error('Failed to update priority:', error);
      return false;
    }
  };

  const refreshBoard = async () => {
    try {
      await refreshBoardMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to refresh board:', error);
    }
  };

  const refreshProgressionInsights = async (applicationIds: string[]) => {
    if (!applicationIds || applicationIds.length === 0) {
      return false;
    }

    try {
      await applicationsApi.predictProgressionBatch(applicationIds);
      await refreshBoardMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ['applications', 'board'], exact: false });
      return true;
    } catch (error) {
      console.error('Failed to refresh progression insights:', error);
      return false;
    }
  };

  // Helper functions
  const getApplicationsByStage = (stageName: string) => {
    return applications.filter(app => app.stage === stageName);
  };

  const getUniqueStages = () => {
    return [...new Set(applications.map(app => app.stage))];
  };

  const getPriorityDistribution = () => {
    return applications.reduce((acc, app) => {
      const p = app.priority || 'medium';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const getUrgencyDistribution = () => {
    return applications.reduce((acc, app) => {
      const u = app.urgency || 'medium';
      acc[u] = (acc[u] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  return {
    applications,
    loading,
    error: error?.message || null,
    fetchApplications,
    moveStage,
    updatePriority,
    refreshBoard,
    refreshProgressionInsights,
    getApplicationsByStage,
    getUniqueStages,
    getPriorityDistribution,
    getUrgencyDistribution,
    // Expose mutation states for UI feedback
    isMovingStage: moveStageMutation.isPending,
    isUpdatingPriority: updatePriorityMutation.isPending,
    isRefreshing: refreshBoardMutation.isPending,
  };
}
