import React from 'react';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, TrendingDown, Lightbulb, BookOpen } from 'lucide-react';

const VIOLET = 'hsl(249, 60%, 69%)';
const TEAL = 'hsl(165, 64%, 50%)';

const rejectionReasons = [
  { reason: 'Weak DSA', count: 42 }, { reason: 'Communication', count: 35 },
  { reason: 'Low CGPA', count: 28 }, { reason: 'No Projects', count: 22 }, { reason: 'Resume Issues', count: 18 },
];

const deptInsights = [
  { dept: 'CSE', pct: 85, avgCTC: 8.5 }, { dept: 'ECE', pct: 72, avgCTC: 6.2 },
  { dept: 'ME', pct: 58, avgCTC: 5.1 }, { dept: 'CE', pct: 45, avgCTC: 4.8 },
  { dept: 'IT', pct: 78, avgCTC: 7.8 }, { dept: 'EEE', pct: 62, avgCTC: 5.9 },
];

const weaknessData = [
  { name: 'Technical', value: 45 }, { name: 'Communication', value: 30 },
  { name: 'Aptitude', value: 15 }, { name: 'Domain', value: 10 },
];

const recommendations = [
  { icon: BookOpen, text: 'Increase DSA workshops for CSE students – 42% rejection due to weak DSA skills', priority: 'high' },
  { icon: Lightbulb, text: 'Mechanical students need resume improvement – 35% have poor project presentation', priority: 'medium' },
  { icon: TrendingDown, text: 'Civil engineering placement rate dropped 12% YoY – consider industry partnerships', priority: 'high' },
  { icon: AlertTriangle, text: 'Communication skills training needed across ECE department', priority: 'medium' },
];

const COLORS = [VIOLET, TEAL, 'hsl(38,100%,56%)', 'hsl(0,72%,62%)', 'hsl(200,70%,55%)'];

const Analytics = () => (
  <PlacementLayout title="AI Analytics">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Rejection Analysis */}
      <Card className="border-0 shadow-sm rounded-xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[hsl(38,100%,56%)]" /> Rejection Analysis</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rejectionReasons}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="reason" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(0,72%,62%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weakness Breakdown */}
      <Card className="border-0 shadow-sm rounded-xl">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Skill Gap Breakdown</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={weaknessData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {weaknessData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>

    {/* Department Insights */}
    <Card className="border-0 shadow-sm rounded-xl mb-6">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Department Insights</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {deptInsights.map(d => (
            <div key={d.dept} className="p-3 rounded-xl bg-[hsl(240,20%,97%)] text-center">
              <p className="font-bold text-lg">{d.pct}%</p>
              <p className="text-xs text-muted-foreground">{d.dept} Placed</p>
              <p className="text-xs font-medium mt-1" style={{ color: TEAL }}>Avg ₹{d.avgCTC}L</p>
              {d.pct < 60 && <p className="text-[10px] text-[hsl(0,72%,62%)] mt-1">⚠ Underperforming</p>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* AI Recommendations */}
    <Card className="border-0 shadow-sm rounded-xl">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4" style={{ color: VIOLET }} /> AI Recommendations</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((r, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[hsl(240,20%,97%)]">
            <r.icon className="h-5 w-5 mt-0.5 shrink-0" style={{ color: r.priority === 'high' ? 'hsl(0,72%,62%)' : VIOLET }} />
            <p className="text-sm">{r.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  </PlacementLayout>
);

export default Analytics;
