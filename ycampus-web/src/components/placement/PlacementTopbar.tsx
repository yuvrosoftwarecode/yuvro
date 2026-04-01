import React from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { usePlacementNotifications } from '@/hooks/usePlacement';
import { Badge } from '@/components/ui/badge';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const PlacementTopbar = () => {
  const { user, logout } = useAuth();
  const { data: notifications } = usePlacementNotifications();
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <header className="h-16 border-b border-[hsl(250,20%,92%)] bg-white/80 backdrop-blur-sm flex items-center justify-between px-4 gap-4 sticky top-0 z-10">
      <div className="flex items-center">
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 text-[9px] bg-[hsl(0,72%,62%)] text-white px-1">{unreadCount}</Badge>
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 text-sm font-medium">
              <div className="h-7 w-7 rounded-full bg-[hsl(249,60%,69%)] text-white flex items-center justify-center text-xs font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'P'}
              </div>
              <span className="hidden sm:inline">{user?.name || 'Officer'}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default PlacementTopbar;
