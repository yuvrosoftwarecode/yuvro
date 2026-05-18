import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Paperclip, ChevronRight } from 'lucide-react';
import type { Announcement } from '@/hooks/useAnnouncements';

interface Props {
  announcement: Announcement;
  onOpen: (a: Announcement) => void;
}

const categoryStyles: Record<string, { border: string; badge: string; text: string }> = {
  college: {
    border: 'border-l-blue-400',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    text: 'College Level',
  },
  department: {
    border: 'border-l-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    text: 'Department',
  },
  batch: {
    border: 'border-l-purple-400',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    text: 'Batch',
  },
};

const priorityStyles: Record<string, { badge: string }> = {
  normal: { badge: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700' },
  important: { badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
  urgent: { badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800' },
};

export function AnnouncementCard({ announcement, onOpen }: Props) {
  const cat = categoryStyles[announcement.category] || categoryStyles.department;
  const pri = priorityStyles[announcement.priority] || priorityStyles.normal;

  return (
    <Card
      className={`border-l-4 ${cat.border} transition-all duration-200 hover:shadow-md cursor-pointer ${
        !announcement.is_read ? 'bg-card' : 'bg-muted/20'
      }`}
      onClick={() => onOpen(announcement)}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* Unread dot */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {!announcement.is_read && (
              <div className="mt-2 w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
            )}
            <div className="flex-1 min-w-0">
              {/* Title + badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3
                  className={`text-base ${
                    !announcement.is_read ? 'font-bold' : 'font-medium'
                  } truncate max-w-md`}
                >
                  {announcement.title}
                </h3>
                <Badge variant="outline" className={`text-xs ${cat.badge}`}>
                  {announcement.category === 'batch' && announcement.batch_name ? `Batch: ${announcement.batch_name}` : cat.text}
                </Badge>
                <Badge variant="outline" className={`text-xs capitalize ${pri.badge}`}>
                  {announcement.priority}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {announcement.description}
              </p>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {announcement.posted_by}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(announcement.posted_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                {announcement.attachment_url && (
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <Paperclip className="h-3.5 w-3.5" />
                    Attachment
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action */}
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(announcement);
            }}
          >
            View <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
