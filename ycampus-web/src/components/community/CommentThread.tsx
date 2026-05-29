import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, Reply, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { CommunityComment } from '@/hooks/useCommunity';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { FormattedContent } from './FormattedContent';

interface CommentThreadProps {
  comment: CommunityComment;
  onReply: (commentId: string, authorName: string) => void;
  onDelete: (commentId: string) => void;
  onLike: (commentId: string, isLiked: boolean) => void;
  depth?: number;
}

export function CommentThread({
  comment,
  onReply,
  onDelete,
  onLike,
  depth = 0,
}: CommentThreadProps) {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(true);
  const isOwner = user?.id === comment.author_id;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const maxDepth = 3;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn('relative', depth > 0 && 'ml-6 pl-4 border-l-2 border-border')}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {getInitials(comment.author?.full_name || 'U')}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {comment.author?.full_name || 'Unknown User'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>

          <div className="mt-1">
            <FormattedContent content={comment.content} />
          </div>

          <div className="flex items-center gap-1 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 px-2 text-xs text-muted-foreground hover:text-primary',
                comment.isLiked && 'text-primary'
              )}
              onClick={() => onLike(comment.id, comment.isLiked || false)}
            >
              <Heart
                className={cn(
                  'h-3.5 w-3.5 mr-1',
                  comment.isLiked && 'fill-current'
                )}
              />
              {comment.likes_count > 0 && comment.likes_count}
            </Button>

            {depth < maxDepth && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                onClick={() => onReply(comment.id, comment.author?.full_name || 'User')}
              >
                <Reply className="h-3.5 w-3.5 mr-1" />
                Reply
              </Button>
            )}

            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(comment.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}

            {hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground ml-auto"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5 mr-1" />
                    Hide replies
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                    Show {comment.replies?.length} replies
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Nested Replies */}
          {showReplies && hasReplies && (
            <div className="mt-3 space-y-3">
              {comment.replies?.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onDelete={onDelete}
                  onLike={onLike}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
