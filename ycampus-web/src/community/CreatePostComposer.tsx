import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { CreatePostDrawer } from './CreatePostDrawer';
import { PenLine } from 'lucide-react';

interface CreatePostComposerProps {
  onPostCreated: () => void;
}

export function CreatePostComposer({ onPostCreated }: CreatePostComposerProps) {
  const { user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(user?.name || 'U')}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex-1 h-10 px-4 text-left text-muted-foreground bg-muted/50 hover:bg-muted rounded-full transition-colors"
            >
              Share something with your community...
            </button>
            <Button
              onClick={() => setIsDrawerOpen(true)}
              size="sm"
              className="hidden sm:flex gap-2"
            >
              <PenLine className="h-4 w-4" />
              Create Post
            </Button>
          </div>
        </CardContent>
      </Card>

      <CreatePostDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onPostCreated={() => {
          setIsDrawerOpen(false);
          onPostCreated();
        }}
      />
    </>
  );
}
