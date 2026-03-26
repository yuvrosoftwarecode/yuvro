import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Calendar } from 'lucide-react';

const attendanceData = [
  { name: 'Present', value: 85, fill: 'hsl(142 76% 50%)' },
  { name: 'Absent', value: 15, fill: 'hsl(45 93% 60%)' }
];

const chartConfig = {
  present: {
    label: 'Present',
    color: 'hsl(142 76% 50%)'
  },
  absent: {
    label: 'Absent',
    color: 'hsl(45 93% 60%)'
  }
};

export function AttendanceOverview() {
  const totalDays = 100;
  const presentDays = 85;
  const absentDays = 15;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" style={{ color: 'hsl(var(--success-light))' }} />
          Attendance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={attendanceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                {attendanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{totalDays}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>
              {presentDays}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Present</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: 'hsl(var(--saffron))' }}>
              {absentDays}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Absent</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
