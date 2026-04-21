import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Calendar, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { studentDashboardService } from '@/services/studentDashboardService';

export function AttendanceOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['attendanceAggregate'],
    queryFn: () => studentDashboardService.getAttendanceAggregate()
  });

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const stats = data || {
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0
  };

  const chartData = [
    { name: 'Present', value: stats.present, fill: 'hsl(142 76% 50%)' },
    { name: 'Absent', value: stats.absent, fill: 'hsl(45 93% 60%)' }
  ];

  const chartConfig = {
    present: { label: 'Present', color: 'hsl(142 76% 50%)' },
    absent: { label: 'Absent', color: 'hsl(45 93% 60%)' }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" style={{ color: 'hsl(var(--success-light))' }} />
          Attendance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t mt-auto">
          <div className="text-center">
            <div className="text-xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Classes</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: 'hsl(var(--success))' }}>
              {stats.present}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Present</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: 'hsl(var(--saffron))' }}>
              {stats.absent}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Absent</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
