import React from 'react';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Card, CardContent } from '@/components/ui/card';
import { usePlacementNotifications, useMarkNotificationRead } from '@/hooks/usePlacement';
import { Bell, CheckCircle2, Briefcase, Users, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

const iconMap: Record<string, any> = { info: Bell, success: CheckCircle2, job: Briefcase, student: Users, warning: AlertTriangle };

const Notifications = () => {
  const { data: notifications, isLoading } = usePlacementNotifications();
  const markRead = useMarkNotificationRead();

  return (
    <PlacementLayout title="Notifications">
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : !notifications?.length ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-w-2xl">
          {notifications.map(n => {
            const Icon = iconMap[n.type] || Bell;
            return (
              <Card key={n.id} className={`border-0 shadow-sm rounded-xl transition-colors ${n.is_read ? 'opacity-60' : ''}`}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[hsl(249,60%,95%)] flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-[hsl(249,60%,69%)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(n.created_at), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                  {!n.is_read && (
                    <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => markRead.mutate(n.id)}>
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PlacementLayout>
  );
};

export default Notifications;
