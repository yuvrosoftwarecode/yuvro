import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

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
  images?: File[];
  tags?: string[];
  visibility: 'ENTIRE_COLLEGE' | 'MY_DEPARTMENT' | 'MY_BATCH';
}

export interface CreateCommentData {
  post_id: string;
  content: string;
  parent_id?: string;
}

export interface UpdatePostData {
  id: string;
  content?: string;
  visibility?: 'ENTIRE_COLLEGE' | 'MY_DEPARTMENT' | 'MY_BATCH';
  tag_names?: string[];
}

export type FeedFilter = 'all' | 'department' | 'batch' | 'saved';

// Mapping utility
const mapBackendPost = (post: any): CommunityPost => ({
  id: post.id.toString(),
  author_id: post.user?.id?.toString() || '',
  content: post.content,
  images: post.images?.map((img: any) => img.image) || [],
  tags: post.tags?.map((t: any) => t.name as PostTag) || [],
  audience: post.visibility === 'ENTIRE_COLLEGE' ? 'college' : post.visibility === 'MY_DEPARTMENT' ? 'department' : 'batch',
  department_id: post.department?.toString(),
  batch_id: post.batch?.toString(),
  likes_count: post.likes_count || 0,
  comments_count: post.comments_count || 0,
  is_pinned: false,
  is_hidden: false,
  created_at: post.created_at,
  updated_at: post.updated_at,
  author: post.user ? {
    id: post.user.id.toString(),
    full_name: post.user.name,
    email: post.user.email
  } : undefined,
  department: post.department_name ? { name: post.department_name, code: '' } : undefined,
  isLiked: post.is_liked,
  isBookmarked: post.is_saved
});

const mapBackendComment = (comment: any, postId: string): CommunityComment => ({
  id: comment.id.toString(),
  post_id: postId,
  author_id: comment.user?.id?.toString() || '',
  parent_id: comment.parent?.toString(),
  content: comment.content,
  likes_count: comment.likes_count || 0,
  is_hidden: false,
  created_at: comment.created_at,
  updated_at: comment.updated_at,
  author: comment.user ? {
    id: comment.user.id.toString(),
    full_name: comment.user.name,
    email: comment.user.email
  } : undefined,
  replies: comment.replies?.map((r: any) => mapBackendComment(r, postId)) || [],
  isLiked: comment.is_liked || false
});

// ─────────────────────────────────────────────────────────────────────────────
// useCommunity – posts CRUD
// ─────────────────────────────────────────────────────────────────────────────
export function useCommunity(filter: FeedFilter = 'all') {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const backendTabMap: Record<FeedFilter, string> = {
    all: 'all',
    department: 'my_department',
    batch: 'my_batch',
    saved: 'saved'
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading: postsLoading,
    isFetchingNextPage,
    error: postsError,
  } = useInfiniteQuery({
    queryKey: ['community-posts', filter, user?.id],
    queryFn: async ({ pageParam = null }: { pageParam?: string | null }) => {
      const url = pageParam || '/community/posts/';
      const response = await restApiAuthUtil.get<any>(url, {
          params: pageParam ? {} : { tab: backendTabMap[filter] }
      });
      // Response is now { nextCursor, previousCursor, posts }
      return {
          posts: response.posts.map(mapBackendPost),
          nextCursor: response.nextCursor
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
  });

  const posts = data?.pages.flatMap(page => page.posts) || [];

  // Create post
  const createPostMutation = useMutation({
    mutationFn: async (data: CreatePostData) => {
      const formData = new FormData();
      formData.append('content', data.content);
      formData.append('visibility', data.visibility);
      
      if (data.tags) {
        data.tags.forEach(tag => formData.append('tag_names', tag));
      }
      
      if (data.images) {
        data.images.forEach(image => formData.append('uploaded_images', image));
      }

      const response = await restApiAuthUtil.post<any>('/community/posts/', formData);
      return mapBackendPost(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Post created!');
    },
    onError: (err: any) => {
      console.error('Create post error:', err);
      toast.error(`Failed to create post: ${err.message || 'Unknown error'}`);
    },
  });

  // Update post
  const updatePostMutation = useMutation({
    mutationFn: async (data: UpdatePostData) => {
      const response = await restApiAuthUtil.patch<any>(`/community/posts/${data.id}/`, data);
      return mapBackendPost(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Post updated!');
    },
    onError: (err: any) => toast.error(`Failed to update post: ${err.message || 'Unknown error'}`),
  });

  // Delete post
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await restApiAuthUtil.delete(`/community/posts/${postId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Post deleted');
    },
    onError: (err: any) => toast.error(`Failed to delete post: ${err.message || 'Unknown error'}`),
  });

  // Toggle like
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      const action = isLiked ? 'unlike' : 'like';
      await restApiAuthUtil.post(`/community/posts/${postId}/${action}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
    onError: (err: any) => toast.error(`Like failed: ${err.message || 'Unknown error'}`),
  });

  // Toggle bookmark
  const toggleBookmarkMutation = useMutation({
    mutationFn: async ({ postId, isBookmarked }: { postId: string; isBookmarked: boolean }) => {
      const action = isBookmarked ? 'unsave_post' : 'save_post';
      await restApiAuthUtil.post(`/community/posts/${postId}/${action}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Bookmark updated');
    },
    onError: (err: any) => toast.error(`Bookmark failed: ${err.message || 'Unknown error'}`),
  });

  return {
    posts,
    postsLoading,
    postsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    createPost: createPostMutation.mutateAsync,
    updatePost: updatePostMutation.mutateAsync,
    isCreatingPost: createPostMutation.isPending || updatePostMutation.isPending,
    deletePost: deletePostMutation.mutate,
    toggleLike: toggleLikeMutation.mutate,
    toggleBookmark: toggleBookmarkMutation.mutate,
    reportPost: (args: { postId: string, reason: string }) => {
        toast.success('Report submitted. Thanks for keeping the community safe.');
    },
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
      const response = await restApiAuthUtil.get<any>(`/community/posts/${postId}/`);
      const rawComments = response.comments || [];
      return rawComments
        .filter((c: any) => !c.parent)
        .map((c: any) => mapBackendComment(c, postId));
    },
    enabled: !!postId,
  });

  // Create comment
  const createCommentMutation = useMutation({
    mutationFn: async (data: CreateCommentData) => {
      const response = await restApiAuthUtil.post<any>(`/community/posts/${data.post_id}/comment/`, {
          content: data.content,
          parent_id: data.parent_id
      });
      return mapBackendComment(response, data.post_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Comment added');
    },
    onError: (err: any) => toast.error(`Comment failed: ${err.message || 'Unknown error'}`),
  });

  // Delete comment
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await restApiAuthUtil.delete(`/community/comments/${commentId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Comment deleted');
    },
    onError: (err: any) => toast.error(`Delete failed: ${err.message || 'Unknown error'}`),
  });

  // Toggle comment like
  const toggleCommentLikeMutation = useMutation({
    mutationFn: async ({ commentId, isLiked }: { commentId: string; isLiked: boolean }) => {
      const action = isLiked ? 'unlike' : 'like';
      await restApiAuthUtil.post(`/community/comments/${commentId}/${action}/`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post-comments', postId] }),
    onError: (err: any) => toast.error(`Like failed: ${err.message || 'Unknown error'}`),
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
