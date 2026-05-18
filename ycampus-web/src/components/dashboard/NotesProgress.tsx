import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, TrendingUp, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentDashboardService } from '@/services/studentDashboardService';

export function NotesProgress() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['notesProgress'],
    queryFn: () => studentDashboardService.getNotesProgress()
  });

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const subjects = data || [];
  
  // Aggregate overall progress
  const totalPercent = subjects.reduce((acc, s) => acc + s.overall, 0);
  const overallProgress = subjects.length > 0 ? Math.round(totalPercent / subjects.length) : 0;
  
  // Highest streak among subjects (backend returns same global streak for all usually)
  const streak = subjects.length > 0 ? Math.max(...subjects.map(s => s.streak || 0)) : 0;

  // Take top 4 subjects for display
  const displaySubjects = subjects.slice(0, 4);

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col" onClick={() => navigate('/student/notes')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" style={{ color: 'hsl(var(--success-light))' }} />
            Learning Progress
          </CardTitle>
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--saffron-light))' }} />
            <span className="font-semibold">{streak} day streak</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Completion</span>
            <span className="font-bold" style={{ color: 'hsl(var(--success))' }}>{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        <div className="space-y-3">
          {displaySubjects.length > 0 ? (
            displaySubjects.map((subject, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[150px]">{subject.subjects[0].name}</span>
                  <span className="text-xs font-medium">{Math.round(subject.overall)}%</span>
                </div>
                <Progress 
                  value={subject.overall} 
                  className="h-1.5" 
                />
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No subjects enrolled yet.
            </div>
          )}
        </div>

        <div className="pt-2 text-xs text-muted-foreground mt-auto">
          Click to view all notes and continue learning
        </div>
      </CardContent>
    </Card>
  );
}
