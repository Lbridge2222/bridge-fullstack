import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, ApplicationCard, StageMoveRequest, PriorityUpdateRequest } from '@/services/api';

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
    refetchOnWindowFocus: true,
  });

  // Mutation for moving stage with optimistic updates
  const moveStageMutation = useMutation({
    mutationFn: ({ applicationId, payload }: { applicationId: string; payload: StageMoveRequest }) =>
      applicationsApi.moveStage(applicationId, payload),
    onMutate: async ({ applicationId, payload }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['applications', 'board'] });

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
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['applications', 'board'] });
    },
  });

  // Mutation for updating priority
  const updatePriorityMutation = useMutation({
    mutationFn: ({ applicationId, payload }: { applicationId: string; payload: PriorityUpdateRequest }) =>
      applicationsApi.updatePriority(applicationId, payload),
    onMutate: async ({ applicationId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['applications', 'board'] });
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
      queryClient.invalidateQueries({ queryKey: ['applications', 'board'] });
    },
  });

  // Mutation for refreshing board
  const refreshBoardMutation = useMutation({
    mutationFn: () => applicationsApi.refreshBoard(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'board'] });
    },
  });

  // Wrapper functions for easier use
  const moveStage = async (applicationId: string, payload: StageMoveRequest) => {
    try {
      await moveStageMutation.mutateAsync({ applicationId, payload });
      return true;
    } catch (error) {
      console.error('Failed to move application:', error);
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
