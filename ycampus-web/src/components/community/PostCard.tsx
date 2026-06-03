import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  Flag,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pin,
  Edit3,
} from 'lucide-react';
import { CommunityPost } from '@/hooks/useCommunity';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ImageCarousel } from './ImageCarousel';
import { ReportDialog } from './ReportDialog';
import { CreatePostDrawer } from './CreatePostDrawer';
import { FormattedContent } from './FormattedContent';

interface PostCardProps {
  post: CommunityPost;
  onLike: () => void;
  onBookmark: () => void;
  onDelete: () => void;
  onReport: (reason: string) => void;
  onClick: () => void;
}

const tagColors: Record<string, string> = {
  exam: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  event: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  doubt: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  placement: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function PostCard({
  post,
  onLike,
  onBookmark,
  onDelete,
  onReport,
  onClick,
}: PostCardProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);

  const isOwner = user?.id === post.author_id;
  const contentTruncateLength = 280;
  const shouldTruncate = post.content.length > contentTruncateLength;
  const displayContent = isExpanded
    ? post.content
    : post.content.slice(0, contentTruncateLength);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Card
        className={cn(
          'overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer',
          post.is_pinned && 'border-primary/50 bg-primary/5'
        )}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getInitials(post.author?.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {post.author?.full_name || 'Unknown User'}
                  </span>
                  {post.is_pinned && (
                    <Pin className="h-3 w-3 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {post.department && (
                    <>
                      <span>{post.department.name}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwner && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEditDrawer(true);
                      }}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
                {!isOwner && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReportDialog(true);
                    }}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
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
          <div className="mb-3" onClick={onClick}>
            <FormattedContent content={displayContent + (shouldTruncate && !isExpanded ? '...' : '')} />
            {shouldTruncate && (
              <Button
                variant="link"
                size="sm"
                className="px-0 h-auto font-normal text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? (
                  <>
                    Show less <ChevronUp className="h-3 w-3 ml-1" />
                  </>
                ) : (
                  <>
                    Read more <ChevronDown className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className="mb-3" onClick={(e) => e.stopPropagation()}>
              <ImageCarousel images={post.images} />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'flex items-center gap-1.5 text-muted-foreground hover:text-primary',
                post.isLiked && 'text-primary'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onLike();
              }}
            >
              <Heart
                className={cn('h-4 w-4', post.isLiked && 'fill-current')}
              />
              <span className="text-xs">{post.likes_count}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary"
              onClick={onClick}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{post.comments_count}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'flex items-center gap-1.5 text-muted-foreground hover:text-primary ml-auto',
                post.isBookmarked && 'text-primary'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onBookmark();
              }}
            >
              <Bookmark
                className={cn('h-4 w-4', post.isBookmarked && 'fill-current')}
              />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        onSubmit={(reason) => {
          onReport(reason);
          setShowReportDialog(false);
        }}
      />

      <CreatePostDrawer
        open={showEditDrawer}
        onOpenChange={setShowEditDrawer}
        post={post}
        onPostCreated={() => {
          setShowEditDrawer(false);
        }}
      />
    </>
  );
}
