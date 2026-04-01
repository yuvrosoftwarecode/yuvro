import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Video, FileText } from 'lucide-react';

export function ProgressSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress (Notes)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Video className="h-5 w-5 text-primary" />
              <span className="font-medium">Video Notes</span>
              <span className="text-sm text-muted-foreground ml-auto">65%</span>
            </div>
            <Progress value={65} className="h-3" />
            <div className="text-xs text-muted-foreground">
              13 out of 20 video notes completed
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-secondary-foreground" />
              <span className="font-medium">Text Notes</span>
              <span className="text-sm text-muted-foreground ml-auto">82%</span>
            </div>
            <Progress value={82} className="h-3" />
            <div className="text-xs text-muted-foreground">
              41 out of 50 text notes completed
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}