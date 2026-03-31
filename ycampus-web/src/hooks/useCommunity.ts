import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export type PostTag = 'exam' | 'event' | 'doubt' | 'placement' | 'general';
export type PostAudience = 'college' | 'department' | 'batch';

export interface CommunityPost {
  id: string;
  author_id: string;
  content: string;
  images: string[];
  tags: PostTag[];
  audience: PostAudience;
  department_id?: string;
  batch_id?: string;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  author?: { id: string; full_name: string; email: string };
  department?: { name: string; code: string };
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id?: string;
  content: string;
  likes_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  author?: { id: string; full_name: string; email: string };
  replies?: CommunityComment[];
  isLiked?: boolean;
}

export interface CreatePostData {
  content: string;
  images?: string[];
  tags?: PostTag[];
  audience: PostAudience;
  department_id?: string;
  batch_id?: string;
}

export interface CreateCommentData {
  post_id: string;
  content: string;
  parent_id?: string;
}

export type FeedFilter = 'all' | 'department' | 'batch' | 'saved';

const getTable = (name: string) => supabase.from(name as any);

// ─────────────────────────────────────────────────────────────────────────────
// useCommunity – posts CRUD
// ─────────────────────────────────────────────────────────────────────────────
export function useCommunity(filter: FeedFilter = 'all') {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: posts,
    isLoading: postsLoading,
    error: postsError,
  } = useQuery({
    queryKey: ['community-posts', filter, user?.id],
    queryFn: async () => {
      const { data: postsData, error } = await getTable('community_posts')
        .select('*, department:departments(name, code)')
        .eq('is_hidden', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const authorIds = [...new Set((postsData || []).map((p: any) => p.author_id))];
      let authorMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profiles } = await getTable('profiles')
          .select('id, full_name, email')
          .in('id', authorIds);
        (profiles || []).forEach((p: any) => {
          authorMap[p.id] = p;
        });
      }

      let userLikes: string[] = [];
      let userBookmarks: string[] = [];

      if (user?.id) {
        const [likesRes, bookmarksRes] = await Promise.all([
          getTable('community_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .not('post_id', 'is', null),
          getTable('community_bookmarks').select('post_id').eq('user_id', user.id),
        ]);

        userLikes = ((likesRes.data || []) as any[]).map((l) => l.post_id).filter(Boolean);
        userBookmarks = ((bookmarksRes.data || []) as any[]).map((b) => b.post_id);
      }

      let filtered = (postsData || []) as any[];
      if (filter === 'saved' && user?.id) {
        filtered = filtered.filter((p) => userBookmarks.includes(p.id));
      }

      return filtered.map((post) => ({
        ...post,
        author: authorMap[post.author_id] || {
          id: post.author_id,
          full_name: 'Unknown User',
          email: '',
        },
        isLiked: userLikes.includes(post.id),
        isBookmarked: userBookmarks.includes(post.id),
      })) as CommunityPost[];
    },
  });

  // Create post
  const createPostMutation = useMutation({
    mutationFn: async (data: CreatePostData) => {
      if (!user?.id) throw new Error('Must be logged in');

      const { data: post, error } = await getTable('community_posts')
        .insert({
          author_id: user.id,
          content: data.content,
          images: data.images || [],
          tags: data.tags || [],
          audience: data.audience,
          department_id: data.department_id,
          batch_id: data.batch_id,
        })
        .select()
        .single();

      if (error) throw error;
      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Post created!');
    },
    onError: (err: Error) => toast.error(`Failed to create post: ${err.message}`),
  });

  // Delete post – optimistic
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!user?.id) throw new Error('Must be logged in');
      const { error } = await getTable('community_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ['community-posts'] });

      const previous = queryClient.getQueriesData<CommunityPost[]>({
        queryKey: ['community-posts'],
      });

      previous.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData<CommunityPost[]>(
          key,
          data.filter((p) => p.id !== postId)
        );
      });

      return { previous };
    },
    onSuccess: () => toast.success('Post deleted'),
    onError: (err: Error, _postId, context) => {
      if (context?.previous) {
        context.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      toast.error(`Failed to delete post: ${err.message}`);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
  });

  // Toggle like
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (!user?.id) throw new Error('Must be logged in');

      if (isLiked) {
        await getTable('community_likes').delete().eq('user_id', user.id).eq('post_id', postId);
      } else {
        await getTable('community_likes').insert({ user_id: user.id, post_id: postId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
    onError: (err: Error) => toast.error(`Like failed: ${err.message}`),
  });

  // Toggle bookmark
  const toggleBookmarkMutation = useMutation({
    mutationFn: async ({ postId, isBookmarked }: { postId: string; isBookmarked: boolean }) => {
      if (!user?.id) throw new Error('Must be logged in');

      if (isBookmarked) {
        await getTable('community_bookmarks').delete().eq('user_id', user.id).eq('post_id', postId);
      } else {
        await getTable('community_bookmarks').insert({ user_id: user.id, post_id: postId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Bookmark updated');
    },
    onError: (err: Error) => toast.error(`Bookmark failed: ${err.message}`),
  });

  // Report post
  const reportPostMutation = useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      if (!user?.id) throw new Error('Must be logged in');

      const { error } = await getTable('community_reports').insert({
        reporter_id: user.id,
        post_id: postId,
        reason,
      });

      if (error) throw error;
    },
    onSuccess: () =>
      toast.success('Report submitted. Thanks for keeping the community safe.'),
    onError: (err: Error) => toast.error(`Report failed: ${err.message}`),
  });

  return {
    posts,
    postsLoading,
    postsError,
    createPost: createPostMutation.mutateAsync,
    isCreatingPost: createPostMutation.isPending,
    deletePost: deletePostMutation.mutate,
    toggleLike: toggleLikeMutation.mutate,
    toggleBookmark: toggleBookmarkMutation.mutate,
    reportPost: reportPostMutation.mutate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// usePostComments – comments CRUD
// ─────────────────────────────────────────────────────────────────────────────
export function usePostComments(postId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: comments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      if (!postId) return [];

      const { data, error } = await getTable('community_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const authorIds = [...new Set((data || []).map((c: any) => c.author_id))];
      let authorMap: Record<string, any> = {};

      if (authorIds.length > 0) {
        const { data: profiles } = await getTable('profiles')
          .select('id, full_name, email')
          .in('id', authorIds);
        (profiles || []).forEach((p: any) => {
          authorMap[p.id] = p;
        });
      }

      let userCommentLikes: string[] = [];
      if (user?.id) {
        const { data: likes } = await getTable('community_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .not('comment_id', 'is', null);
        userCommentLikes = ((likes || []) as any[]).map((l) => l.comment_id).filter(Boolean);
      }

      const commentMap = new Map<string, CommunityComment>();
      const rootComments: CommunityComment[] = [];

      ((data || []) as any[]).forEach((comment) => {
        const enriched: CommunityComment = {
          ...comment,
          author: authorMap[comment.author_id] || {
            id: comment.author_id,
            full_name: 'Unknown User',
            email: '',
          },
          isLiked: userCommentLikes.includes(comment.id),
          replies: [],
        };
        commentMap.set(comment.id, enriched);
      });

      commentMap.forEach((comment) => {
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      return rootComments;
    },
    enabled: !!postId,
  });

  // Create comment
  const createCommentMutation = useMutation({
    mutationFn: async (data: CreateCommentData) => {
      if (!user?.id) throw new Error('Must be logged in');

      const { data: comment, error } = await getTable('community_comments')
        .insert({
          post_id: data.post_id,
          author_id: user.id,
          content: data.content,
          parent_id: data.parent_id,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!comment) throw new Error('Comment could not be created');
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Comment added');
    },
    onError: (err: Error) => toast.error(`Comment failed: ${err.message}`),
  });

  // Delete comment – optimistic
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user?.id) throw new Error('Must be logged in');
      const { error } = await getTable('community_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onMutate: async (commentId: string) => {
      await queryClient.cancelQueries({ queryKey: ['post-comments', postId] });

      const previous = queryClient.getQueryData<CommunityComment[]>(['post-comments', postId]);

      const removeComment = (list: CommunityComment[]): CommunityComment[] =>
        list
          .filter((c) => c.id !== commentId)
          .map((c) => ({ ...c, replies: removeComment(c.replies || []) }));

      if (previous) {
        queryClient.setQueryData<CommunityComment[]>(
          ['post-comments', postId],
          removeComment(previous)
        );
      }

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Comment deleted');
    },
    onError: (err: Error, _commentId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['post-comments', postId], context.previous);
      }
      toast.error(`Delete failed: ${err.message}`);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['post-comments', postId] }),
  });

  // Toggle comment like
  const toggleCommentLikeMutation = useMutation({
    mutationFn: async ({ commentId, isLiked }: { commentId: string; isLiked: boolean }) => {
      if (!user?.id) throw new Error('Must be logged in');

      if (isLiked) {
        await getTable('community_likes').delete().eq('user_id', user.id).eq('comment_id', commentId);
      } else {
        await getTable('community_likes').insert({ user_id: user.id, comment_id: commentId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post-comments', postId] }),
    onError: (err: Error) => toast.error(`Like failed: ${err.message}`),
  });

  return {
    comments,
    isLoading,
    error,
    createComment: createCommentMutation.mutateAsync,
    isCreatingComment: createCommentMutation.isPending,
    deleteComment: deleteCommentMutation.mutate,
    toggleCommentLike: toggleCommentLikeMutation.mutate,
  };
}
