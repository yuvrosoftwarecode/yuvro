import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Award, TrendingUp, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { studentDashboardService } from '@/services/studentDashboardService';
import { useAuth } from '@/contexts/AuthContext';

import { useLocation } from 'react-router-dom';

export function AssessmentsPerformance() {
  const { user } = useAuth();
  const location = useLocation();

  const isAssessmentsPath = location.pathname.includes('/student/assessments');
  const effectiveProductType = isAssessmentsPath || user?.college_product_type === 'assessments' ? 'assessments' : 'campus';

  const { data, isLoading } = useQuery({
    queryKey: ['assessmentsPerformance', effectiveProductType],
    queryFn: () => studentDashboardService.getAssessments(effectiveProductType)
  });

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const stats = data || {
    completed: 0,
    inProgress: 0,
    pending: 0,
    total: 0,
    avgScore: 0,
    highestScore: 0,
    lowestScore: 0,
    recentStatus: 0
  };

  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            {effectiveProductType === 'assessments' ? 'Assessments Performance' : 'Internal Tests Performance'}
          </CardTitle>
          <Award className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-foreground">
              {stats.completed} <span className="text-sm font-normal text-muted-foreground">/ 50</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Completed</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-foreground">
              {stats.avgScore}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">Average Score</div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Highest Score</span>
            <Badge variant="outline" className="border-muted/50">
              {stats.highestScore}%
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Lowest Score</span>
            <Badge variant="outline" className="border-muted/50">
              {stats.lowestScore}%
            </Badge>
          </div>
        </div>

        <div className="pt-2 border-t mt-auto">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {effectiveProductType === 'assessments' ? 'Last Assessment Performance' : 'Last Internal Test Performance'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 rounded bg-muted/30">
              <div className="font-bold text-foreground">{stats.recentStatus > 0 ? `${stats.recentStatus}%` : '—'}</div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/30 col-span-2">
              <div className="font-bold text-foreground">
                {stats.recentStatus > 0 ? 'Evaluated' : '—'}
              </div>
              <div className="text-xs text-muted-foreground">Status</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-2">
          {effectiveProductType === 'assessments' 
            ? 'Assessments are subject level. Keep aiming for higher scores!'
            : 'Internal tests are subject level. Keep aiming for higher scores!'}
        </div>
      </CardContent>
    </Card>
  );
}
