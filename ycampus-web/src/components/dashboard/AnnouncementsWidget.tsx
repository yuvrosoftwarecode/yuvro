import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { studentDashboardService } from '@/services/studentDashboardService';
import { useNavigate } from 'react-router-dom';

export function AnnouncementsWidget() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => studentDashboardService.getAnnouncements()
  });

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'college': return 'hsl(var(--success))';
      case 'department': return 'hsl(var(--saffron))';
      case 'system': return 'hsl(var(--muted-foreground))';
      case 'reminder': return 'hsl(var(--primary))';
      default: return 'hsl(var(--foreground))';
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" style={{ color: 'hsl(var(--saffron-light))' }} />
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const announcements = data || [];
  const unreadCount = announcements.filter(a => !a.is_read).length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" style={{ color: 'hsl(var(--saffron-light))' }} />
            Announcements
          </CardTitle>
          {unreadCount > 0 && (
            <div className={cn(badgeVariants({ variant: 'secondary' }))}>
              {unreadCount} new
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {announcements.length > 0 ? (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  onClick={() => navigate(`/student/announcements?id=${announcement.id}`)}
                  className={cn(
                    "p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 border-l-4",
                    !announcement.is_read ? 'bg-muted/30' : ''
                  )}
                  style={{
                    borderLeftColor: getTypeColor(announcement.category)
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{announcement.title}</h4>
                    {!announcement.is_read && (
                      <div className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: 'hsl(var(--saffron))' }} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {announcement.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                    </span>
                    <div 
                      className={cn(badgeVariants({ variant: 'outline' }), "px-1.5 py-0 text-[10px] uppercase font-bold")}
                      style={{ 
                        color: getTypeColor(announcement.category),
                        borderColor: `${getTypeColor(announcement.category)}30`
                      }}
                    >
                      {announcement.category}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No active announcements
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
