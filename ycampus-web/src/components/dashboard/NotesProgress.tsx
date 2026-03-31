import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function NotesProgress() {
  const navigate = useNavigate();

  const topics = [
    { name: 'Python Basics', completed: 85, total: 100 },
    { name: 'Data Structures', completed: 60, total: 80 },
    { name: 'JavaScript Fundamentals', completed: 45, total: 75 },
    { name: 'SQL Queries', completed: 90, total: 90 }
  ];

  const overallProgress = Math.round(
    (topics.reduce((acc, t) => acc + t.completed, 0) / 
    topics.reduce((acc, t) => acc + t.total, 0)) * 100
  );

  const streak = 12;

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/student/notes')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" style={{ color: 'hsl(var(--success-light))' }} />
            Notes Progress
          </CardTitle>
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--saffron-light))' }} />
            <span className="font-semibold">{streak} day streak</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Overall Completion</span>
            <span className="font-bold" style={{ color: 'hsl(var(--success))' }}>{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        <div className="space-y-3">
          {topics.map((topic, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{topic.name}</span>
                <span className="text-xs font-medium">{topic.completed}/{topic.total}</span>
              </div>
              <Progress 
                value={(topic.completed / topic.total) * 100} 
                className="h-1.5" 
              />
            </div>
          ))}
        </div>

        <div className="pt-2 text-xs text-muted-foreground">
          Click to view all notes and continue learning
        </div>
      </CardContent>
    </Card>
  );
}
