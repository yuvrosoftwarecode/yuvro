import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import subjectService from '@/services/subjectService';

export interface SubtopicProgress {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string;
  subtopic_id: string;
  completed: boolean;
  completed_at: string | null;
}

export const useSubtopicProgress = (subjectId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: progressData = [], isLoading } = useQuery({
    queryKey: ['subtopic-progress', subjectId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const response = await subjectService.fetchUserSubjectProgress(subjectId, user.id);
      
      // Map backend progress details to the frontend interface
      // Backend returns details about units/subunits completion
      const details = response.details || [];
      const mappedProgress: SubtopicProgress[] = [];
      
      details.forEach((unit: any) => {
        (unit.sub_units || []).forEach((su: any) => {
          if (su.is_completed) {
            mappedProgress.push({
              id: String(su.id),
              user_id: user.id,
              subject_id: subjectId,
              topic_id: String(unit.id),
              subtopic_id: String(su.id),
              completed: true,
              completed_at: su.completed_at || null,
            });
          }
        });
      });

      return mappedProgress;
    },
    enabled: !!user && !!subjectId,
  });

  const toggleCompletion = useMutation({
    mutationFn: async ({ subtopicId }: { topicId: string; subtopicId: string }) => {
      if (!user) throw new Error('User not authenticated');

      const existing = progressData.find((p) => p.subtopic_id === subtopicId);

      if (existing) {
        // Backend might not support unmarking as easily or might need a different endpoint
        // For now, if it's already completed, we keep it completed or add a logic if backend supports it.
        // Assuming mark_complete just ensures it's completed.
        await subjectService.markSubUnitComplete(subtopicId);
      } else {
        await subjectService.markSubUnitComplete(subtopicId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtopic-progress', subjectId, user?.id] });
    },
  });

  const isCompleted = (topicId: string, subtopicId: string) => {
    return progressData.some(
      (p) => p.subtopic_id === subtopicId && p.completed
    );
  };

  const getTopicProgress = (topicId: string, subtopicCount: number) => {
    const completed = progressData.filter(
      (p) => p.topic_id === topicId && p.completed
    ).length;
    return subtopicCount > 0 ? Math.round((completed / subtopicCount) * 100) : 0;
  };

  return {
    progressData,
    isLoading,
    toggleCompletion,
    isCompleted,
    getTopicProgress,
  };
};
