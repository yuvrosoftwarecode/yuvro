import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCommunity, FeedFilter, CommunityPost } from '@/hooks/useCommunity';
import { CreatePostComposer } from './CreatePostComposer';
import { FeedFilters } from './FeedFilters';
import { PostCard } from './PostCard';
import { PostDetailPanel } from './PostDetailPanel';
import { MessageSquare, Users, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import PageHeader from '@/components/common/PageHeader';

export function CommunityFeed() {
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    posts,
    postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    toggleLike,
    toggleBookmark,
    deletePost,
    reportPost,
  } = useCommunity(activeFilter);

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handlePostClick = (post: CommunityPost) => {
    setSelectedPost(post);
    setDetailOpen(true);
  };

  const handleLike = (post: CommunityPost) => {
    toggleLike({ postId: post.id, isLiked: post.isLiked || false });
  };

  const handleBookmark = (post: CommunityPost) => {
    toggleBookmark({ postId: post.id, isBookmarked: post.isBookmarked || false });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <PageHeader 
        title="Community" 
        subtitle="Connect, collaborate, and share with your campus community" 
      />

      {/* Create Post */}
      <CreatePostComposer onPostCreated={() => {}} />

      {/* Filters */}
      <div className="mb-4">
        <FeedFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {postsLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-card rounded-lg border space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </>
        ) : posts && posts.length > 0 ? (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={() => handleLike(post)}
                onBookmark={() => handleBookmark(post)}
                onDelete={() => deletePost(post.id)}
                onReport={(reason) => reportPost({ postId: post.id, reason })}
                onClick={() => handlePostClick(post)}
              />
            ))}
            
            {/* Infinite Scroll Sentinel */}
            <div ref={observerTarget} className="h-10 flex items-center justify-center">
              {isFetchingNextPage && (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16 px-4">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {activeFilter === 'saved'
                ? 'No saved posts yet'
                : 'No posts yet'}
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {activeFilter === 'saved'
                ? 'Bookmark posts to find them here later.'
                : 'Be the first to share something with your community!'}
            </p>
          </div>
        )}
      </div>

      {/* Post Detail Panel */}
      <PostDetailPanel
        post={selectedPost}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onLike={() => selectedPost && handleLike(selectedPost)}
        onBookmark={() => selectedPost && handleBookmark(selectedPost)}
      />
    </div>
  );
}
