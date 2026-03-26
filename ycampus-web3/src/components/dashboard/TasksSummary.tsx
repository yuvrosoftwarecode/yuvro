import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, AlertCircle, ListTodo } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TasksSummary() {
  const navigate = useNavigate();

  const tasks = {
    total: 24,
    completed: 18,
    inProgress: 4,
    pending: 2
  };

  const completionRate = Math.round((tasks.completed / tasks.total) * 100);

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/student/task')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5" style={{ color: 'hsl(var(--success-light))' }} />
          Tasks Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="font-bold" style={{ color: 'hsl(var(--success))' }}>{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <CheckCircle2 className="h-5 w-5" style={{ color: 'hsl(var(--success))' }} />
            <div>
              <div className="text-2xl font-bold">{tasks.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Clock className="h-5 w-5" style={{ color: 'hsl(var(--saffron))' }} />
            <div>
              <div className="text-2xl font-bold">{tasks.inProgress}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <div className="text-2xl font-bold">{tasks.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <ListTodo className="h-5 w-5 text-foreground" />
            <div>
              <div className="text-2xl font-bold">{tasks.total}</div>
              <div className="text-xs text-muted-foreground">Total Tasks</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Click to view all tasks and submissions
        </div>
      </CardContent>
    </Card>
  );
}
