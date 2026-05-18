import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Loader2,
  ArrowLeft,
  Pin,
} from 'lucide-react';
import { CommunityPost, usePostComments } from '@/hooks/useCommunity';
import { cn } from '@/lib/utils';
import { ImageCarousel } from './ImageCarousel';
import { CommentThread } from './CommentThread';
import { useIsMobile } from '@/hooks/use-mobile';
import { CommentComposer } from './CommentComposer';

interface PostDetailPanelProps {
  post: CommunityPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLike: () => void;
  onBookmark: () => void;
}

const tagColors: Record<string, string> = {
  exam: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  event: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  doubt: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  placement: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function PostDetailPanel({
  post,
  open,
  onOpenChange,
  onLike,
  onBookmark,
}: PostDetailPanelProps) {
  const isMobile = useIsMobile();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);

  const {
    comments,
    isLoading: commentsLoading,
    createComment,
    isCreatingComment,
    deleteComment,
    toggleCommentLike,
  } = usePostComments(post?.id || null);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const handleSubmitComment = async () => {
    if (!post || !newComment.trim()) return;
    try {
      await createComment({
        post_id: post.id,
        content: newComment.trim(),
        parent_id: replyingTo?.id || undefined,
      });
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  if (!post) return null;

  const content = (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Author Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(post.author?.full_name || 'U')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {post.author?.full_name || 'Unknown User'}
                </span>
                {post.is_pinned && <Pin className="h-3 w-3 text-primary" />}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {post.department && (
                  <>
                    <span>{post.department.name}</span>
                    <span>•</span>
                  </>
                )}
                <span>
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className={cn('text-xs font-normal', tagColors[tag])}
                >
                  {tag.charAt(0).toUpperCase() + tag.slice(1)}
                </Badge>
              ))}
            </div>
          )}

          {/* Content */}
          <p className="text-foreground whitespace-pre-wrap text-base leading-relaxed">
            {post.content}
          </p>

          {/* Images */}
          {post.images && post.images.length > 0 && <ImageCarousel images={post.images} />}

          {/* Actions */}
          <div className="flex items-center gap-2 py-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn('flex items-center gap-1.5', post.isLiked && 'text-primary')}
              onClick={onLike}
            >
              <Heart className={cn('h-4 w-4', post.isLiked && 'fill-current')} />
              <span>{post.likes_count}</span>
            </Button>

            <Button variant="ghost" size="sm" className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              <span>{post.comments_count}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'flex items-center gap-1.5 ml-auto',
                post.isBookmarked && 'text-primary'
              )}
              onClick={onBookmark}
            >
              <Bookmark className={cn('h-4 w-4', post.isBookmarked && 'fill-current')} />
            </Button>
          </div>

          <Separator />

          {/* Comments Section */}
          <div className="space-y-4">
            <h3 className="font-medium">Comments ({post.comments_count})</h3>

            {commentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : comments && comments.length > 0 ? (
              <div className="space-y-4 pb-4">
                {comments.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    onReply={(id, name) => setReplyingTo({ id, name })}
                    onDelete={deleteComment}
                    onLike={(id, isLiked) => toggleCommentLike({ commentId: id, isLiked })}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to share your thoughts!
              </p>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Comment Input - fixed at bottom */}
      <div className="shrink-0 border-t bg-background">
        <CommentComposer
          value={newComment}
          onChange={setNewComment}
          onSubmit={handleSubmitComment}
          isSubmitting={isCreatingComment}
          replyingToName={replyingTo?.name}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>
    </div>
  );

  const sheetProps = {
    onOpenAutoFocus: (e: Event) => e.preventDefault(),
    onCloseAutoFocus: (e: Event) => e.preventDefault(),
    onInteractOutside: (e: Event) => e.preventDefault(),
    onPointerDownOutside: (e: Event) => e.preventDefault(),
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-full flex flex-col" {...sheetProps}>
          <div className="flex items-center gap-2 p-4 border-b shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-medium">Post Details</span>
          </div>
          <div className="flex-1 min-h-0">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col" {...sheetProps}>
        <SheetHeader className="p-4 border-b shrink-0">
          <SheetTitle>Post Details</SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
