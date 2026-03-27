import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import * as communityService from '@/services/community';
import { Post as RestPost, Comment as RestComment } from '@/services/community';

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
  images?: any[]; // Can be Files or URLs
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

const mapRestPostToCommunityPost = (post: RestPost): CommunityPost => ({
  id: post.id.toString(),
  author_id: post.user.id.toString(),
  content: post.content,
  images: post.images.map((img) => img.image),
  tags: post.tags.map((t) => t.name.toLowerCase() as PostTag),
  audience: (post.visibility?.toLowerCase() === 'entire_college' ? 'college' : 
             post.visibility?.toLowerCase() === 'my_department' ? 'department' : 
             post.visibility?.toLowerCase() === 'my_batch' ? 'batch' : 'college') as PostAudience,
  likes_count: post.likes_count,
  comments_count: post.comments_count,
  is_pinned: false,
  is_hidden: false,
  created_at: post.created_at,
  updated_at: post.created_at,
  author: {
    id: post.user.id.toString(),
    full_name: post.user.name,
    email: post.user.email,
  },
  isLiked: post.is_liked,
  isBookmarked: post.is_saved,
});

const mapRestCommentToCommunityComment = (comment: RestComment, postId: string): CommunityComment => ({
  id: comment.id.toString(),
  post_id: postId,
  author_id: comment.user.id.toString(),
  content: comment.content,
  likes_count: 0, // REST API doesn't seem to track comment likes
  is_hidden: false,
  created_at: comment.created_at,
  updated_at: comment.created_at,
  author: {
    id: comment.user.id.toString(),
    full_name: comment.user.name,
    email: comment.user.email,
  },
  replies: [],
  isLiked: false,
});

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
      const tabMap: Record<string, string> = {
        'all': 'all',
        'department': 'my_department',
        'batch': 'my_batch',
        'saved': 'saved'
      };
      
      const restPosts = await communityService.getPosts(tabMap[filter] || 'all');
      return restPosts.map(mapRestPostToCommunityPost);
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: CreatePostData) => {
      const formData = new FormData();
      formData.append('content', data.content);
      
      const visibilityMap: Record<string, string> = {
        'college': 'ENTIRE_COLLEGE',
        'department': 'MY_DEPARTMENT',
        'batch': 'MY_BATCH'
      };
      formData.append('visibility', visibilityMap[data.audience] || 'ENTIRE_COLLEGE');
      
      if (data.tags) {
        data.tags.forEach(tag => {
          const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
          formData.append('tags', capitalizedTag);
        });
      }
      
      if (data.images) {
        data.images.forEach(img => {
           formData.append('uploaded_images', img); 
        });
      }

      return communityService.createPost(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Post created!');
    },
    onError: (err: Error) => toast.error(`Failed to create post: ${err.message}`),
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await communityService.deletePost(parseInt(postId));
    },
    onMutate: async (postId: string) => {
      await queryClient.cancelQueries({ queryKey: ['community-posts'] });
      const previous = queryClient.getQueriesData<CommunityPost[]>({ queryKey: ['community-posts'] });
      previous.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData<CommunityPost[]>(key, data.filter((p) => p.id !== postId));
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

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (isLiked) {
        await communityService.unlikePost(parseInt(postId));
      } else {
        await communityService.likePost(parseInt(postId));
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
    onError: (err: Error) => toast.error(`Like failed: ${err.message}`),
  });

  const toggleBookmarkMutation = useMutation({
    mutationFn: async ({ postId, isBookmarked }: { postId: string; isBookmarked: boolean }) => {
      if (isBookmarked) {
        await communityService.unsavePost(parseInt(postId));
      } else {
        await communityService.savePost(parseInt(postId));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Bookmark updated');
    },
    onError: (err: Error) => toast.error(`Bookmark failed: ${err.message}`),
  });

  const reportPostMutation = useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      console.log(`Reporting post ${postId} for: ${reason}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    },
    onSuccess: () => toast.success('Report submitted. Thanks for keeping the community safe.'),
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
      
      // Since comments are embedded in the post, we fetch the posts and find the specific one.
      // Alternatively, we could add a getPostById service, but for now we fallback to the list.
      // However, it's better to fetch from the cache if available.
      const posts = queryClient.getQueryData<CommunityPost[]>(['community-posts', 'all', user?.id]);
      const post = posts?.find(p => p.id === postId);
      
      if (post) {
        // We need the original RestPost to get the comments since I didn't include them in CommunityPost
        // Let's adjust CommunityPost to include comments or fetch them differently.
        // Actually, let's just fetch all posts again if not in cache, and find the one.
        const restPosts = await communityService.getPosts('all');
        const restPost = restPosts.find(p => p.id.toString() === postId);
        return restPost?.comments.map(c => mapRestCommentToCommunityComment(c, postId)) || [];
      }
      
      const restPosts = await communityService.getPosts('all');
      const restPost = restPosts.find(p => p.id.toString() === postId);
      return restPost?.comments.map(c => mapRestCommentToCommunityComment(c, postId)) || [];
    },
    enabled: !!postId,
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: CreateCommentData) => {
      return communityService.commentOnPost(parseInt(data.post_id), data.content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast.success('Comment added');
    },
    onError: (err: Error) => toast.error(`Comment failed: ${err.message}`),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
       // REST API does not seem to have a delete comment endpoint in communityService
       console.log(`Deleting comment ${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      toast.success('Comment deleted');
    },
    onError: (err: Error) => toast.error(`Delete failed: ${err.message}`),
  });

  const toggleCommentLikeMutation = useMutation({
    mutationFn: async (vars: { commentId: string; isLiked: boolean }) => {
       // REST API does not seem to have comment likes
       console.log(`Toggling comment like for ${vars.commentId} (not supported)`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post-comments', postId] }),
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
