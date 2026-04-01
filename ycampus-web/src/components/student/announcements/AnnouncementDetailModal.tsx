import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, User, Download, ExternalLink } from 'lucide-react';
import type { Announcement } from '@/hooks/useAnnouncements';

interface Props {
  announcement: Announcement | null;
  onClose: () => void;
}

const categoryLabel: Record<string, { label: string; cls: string }> = {
  college: { label: 'College Level', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' },
  department: { label: 'Department', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
};

const priorityLabel: Record<string, { cls: string }> = {
  normal: { cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700' },
  important: { cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
  urgent: { cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800' },
};

export function AnnouncementDetailModal({ announcement, onClose }: Props) {
  if (!announcement) return null;

  const cat = categoryLabel[announcement.category];
  const pri = priorityLabel[announcement.priority];

  return (
    <Dialog open={!!announcement} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="outline" className={cat.cls}>{cat.label}</Badge>
            <Badge variant="outline" className={`capitalize ${pri.cls}`}>{announcement.priority}</Badge>
          </div>
          <DialogTitle className="text-xl leading-tight">{announcement.title}</DialogTitle>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {announcement.posted_by}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(announcement.posted_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </DialogHeader>

        <ScrollArea className="mt-4 max-h-[50vh] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {(announcement.full_content || announcement.description).split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>

        {announcement.attachment_url && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" asChild>
              <a href={announcement.attachment_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                <Download className="h-4 w-4" />
                Download Attachment
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
