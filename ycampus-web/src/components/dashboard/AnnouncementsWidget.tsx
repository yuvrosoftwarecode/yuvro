import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, Calendar as CalendarIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { formatDistanceToNow } from 'date-fns';

export function AnnouncementsWidget() {
  const { announcements, loading } = useAnnouncements();

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'college': return 'hsl(var(--success))';
      case 'department': return 'hsl(var(--saffron))';
      case 'system': return 'hsl(var(--muted-foreground))';
      case 'reminder': return 'hsl(var(--primary))';
      default: return 'hsl(var(--foreground))';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" style={{ color: 'hsl(var(--saffron-light))' }} />
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 w-full bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Take top 5 latest announcements
  const displayAnnouncements = announcements.slice(0, 5).map(a => ({
    id: a.id,
    title: a.title,
    type: a.category,
    description: a.description,
    timestamp: formatDistanceToNow(new Date(a.posted_date), { addSuffix: true }),
    read: a.is_read
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" style={{ color: 'hsl(var(--saffron-light))' }} />
            Announcements
          </CardTitle>
          <div className={cn(badgeVariants({ variant: 'secondary' }))}>
            {displayAnnouncements.filter(a => !a.read).length} new
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {displayAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                  !announcement.read ? 'bg-muted/30 border-l-4' : 'border-l-4'
                }`}
                style={{
                  borderLeftColor: getTypeColor(announcement.type)
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{announcement.title}</h4>
                  {!announcement.read && (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(var(--saffron))' }} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {announcement.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {announcement.timestamp}
                  </span>
                  <div 
                    className={cn(badgeVariants({ variant: 'outline' }), "text-xs")}
                    style={{ 
                      color: getTypeColor(announcement.type),
                      borderColor: `${getTypeColor(announcement.type)}30`
                    }}
                  >
                    {announcement.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
