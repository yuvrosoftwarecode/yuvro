import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, Calendar as CalendarIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AnnouncementsWidget() {
  const announcements = [
    {
      id: 1,
      title: 'New Python Course Available',
      type: 'course',
      description: 'Advanced Python programming course is now live',
      timestamp: '2 hours ago',
      read: false
    },
    {
      id: 2,
      title: 'Contest Registration Open',
      type: 'event',
      description: 'Register for the upcoming coding contest by March 15',
      timestamp: '5 hours ago',
      read: false
    },
    {
      id: 3,
      title: 'System Maintenance Notice',
      type: 'system',
      description: 'Platform will be under maintenance on Sunday',
      timestamp: '1 day ago',
      read: true
    },
    {
      id: 4,
      title: 'Assignment Deadline Reminder',
      type: 'reminder',
      description: 'Data Structures assignment due in 3 days',
      timestamp: '1 day ago',
      read: true
    }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'course': return 'hsl(var(--success))';
      case 'event': return 'hsl(var(--saffron))';
      case 'system': return 'hsl(var(--muted-foreground))';
      case 'reminder': return 'hsl(var(--primary))';
      default: return 'hsl(var(--foreground))';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" style={{ color: 'hsl(var(--saffron-light))' }} />
            Announcements
          </CardTitle>
          <Badge variant="secondary">
            {announcements.filter(a => !a.read).length} new
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {announcements.map((announcement) => (
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
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ 
                      color: getTypeColor(announcement.type),
                      borderColor: `${getTypeColor(announcement.type)}30`
                    }}
                  >
                    {announcement.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
