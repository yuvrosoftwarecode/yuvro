import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
      
      const { data, error } = await supabase
        .from('subtopic_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('subject_id', subjectId);

      if (error) throw error;
      return data as SubtopicProgress[];
    },
    enabled: !!user && !!subjectId,
  });

  const toggleCompletion = useMutation({
    mutationFn: async ({ topicId, subtopicId }: { topicId: string; subtopicId: string }) => {
      if (!user) throw new Error('User not authenticated');

      const existing = progressData.find(
        (p) => p.topic_id === topicId && p.subtopic_id === subtopicId
      );

      if (existing) {
        const { error } = await supabase
          .from('subtopic_progress')
          .update({ completed: !existing.completed })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subtopic_progress')
          .insert({
            user_id: user.id,
            subject_id: subjectId,
            topic_id: topicId,
            subtopic_id: subtopicId,
            completed: true,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtopic-progress', subjectId, user?.id] });
    },
  });

  const isCompleted = (topicId: string, subtopicId: string) => {
    return progressData.some(
      (p) => p.topic_id === topicId && p.subtopic_id === subtopicId && p.completed
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
