import React, { useState } from 'react';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardCheck, Briefcase, Users, TrendingUp, IndianRupee, Award } from 'lucide-react';
import { usePlacementStats } from '@/hooks/usePlacement';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, FunnelChart } from 'recharts';
import { FixRoleTool } from '@/components/placement/FixRoleTool';
import { AssessmentDashboard } from '@/components/dashboard/AssessmentDashboard';
import { collegeService, College } from '@/services/collegeService';
import { useAuth } from '@/contexts/AuthContext';

const DEPARTMENTS = ['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT'];
const SECTIONS = ['A', 'B', 'C'];
const VIOLET = 'hsl(249, 60%, 69%)';
const TEAL = 'hsl(165, 64%, 50%)';
const DANGER = 'hsl(0, 72%, 62%)';
const WARNING = 'hsl(38, 100%, 56%)';
const VIOLET_LIGHT = 'hsl(249, 60%, 95%)';

const PlacementDashboard = () => {
  const [filters, setFilters] = useState({
    academicYear: '2025-26', department: 'all', semester: 'all', batch: 'all',
    section: 'all', priRange: 'all', piRange: 'all', psRange: 'all',
  });
  const updateFilter = (key: string, value: string) => setFilters(prev => ({ ...prev, [key]: value }));

  const { data: stats, isLoading } = usePlacementStats();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAssessments = user?.college_product_type === 'assessments';

  const statCards = [
    { title: 'Pending Approvals', value: stats?.pendingCount || 0, icon: ClipboardCheck, color: WARNING, bg: 'hsl(38,100%,95%)' },
    { title: 'Live Jobs', value: stats?.liveCount || 0, icon: Briefcase, color: VIOLET, bg: VIOLET_LIGHT },
    { title: 'Students Selected', value: stats?.totalSelected || 0, icon: Users, color: TEAL, bg: 'hsl(165,64%,94%)' },
    { title: 'Avg CTC', value: `₹${((stats?.avgCTC || 0) / 100000).toFixed(1)}L`, icon: IndianRupee, color: TEAL, bg: 'hsl(165,64%,94%)' },
    { title: 'Highest CTC', value: `₹${((stats?.highestCTC || 0) / 100000).toFixed(1)}L`, icon: Award, color: VIOLET, bg: VIOLET_LIGHT },
    { title: 'Placement %', value: `${stats?.placementPct || 0}%`, icon: TrendingUp, color: TEAL, bg: 'hsl(165,64%,94%)' },
  ];

  const funnelData = [
    { name: 'Applicants', value: stats?.totalApps || 0 },
    { name: 'Shortlisted', value: stats?.totalShortlisted || 0 },
    { name: 'Selected', value: stats?.totalSelected || 0 },
  ];

  const deptData = [
    { name: 'CSE', pct: 85 }, { name: 'ECE', pct: 72 }, { name: 'ME', pct: 58 },
    { name: 'CE', pct: 45 }, { name: 'EEE', pct: 62 }, { name: 'IT', pct: 78 },
  ];

  const monthlyData = [
    { month: 'Sep', hires: 12 }, { month: 'Oct', hires: 28 }, { month: 'Nov', hires: 45 },
    { month: 'Dec', hires: 62 }, { month: 'Jan', hires: 85 }, { month: 'Feb', hires: 98 },
  ];

  const salaryData = [
    { range: '3-5L', count: 45 }, { range: '5-8L', count: 78 }, { range: '8-12L', count: 42 },
    { range: '12-20L', count: 18 }, { range: '20L+', count: 6 },
  ];

  const COLORS = [VIOLET, TEAL, WARNING, DANGER, 'hsl(200,70%,55%)'];

  return (
    <PlacementLayout title="Dashboard">
      <FixRoleTool />

      {isAssessments ? (
        <div className="mt-4">
          <AssessmentDashboard />
        </div>
      ) : (
        <>
          {/* FILTERS */}
      <Card className="mb-6 border-0 shadow-sm rounded-xl">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-3">
            
            <Select value={filters.department} onValueChange={v => updateFilter('department', v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs border-[hsl(249,60%,69%)]/20"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
           
            <Select value={filters.batch} onValueChange={v => updateFilter('batch', v)}>
              <SelectTrigger className="w-[120px] h-8 text-xs border-[hsl(249,60%,69%)]/20"><SelectValue placeholder="Batch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                <SelectItem value="2021-2025">2021–25</SelectItem>
                <SelectItem value="2022-2026">2022–26</SelectItem>
                <SelectItem value="2023-2027">2023–27</SelectItem>
              </SelectContent>
            </Select>

          </div>
        </CardContent>
      </Card>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {statCards.map((s) => (
          <Card key={s.title} className="border-0 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg" style={{ background: s.bg }}>
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{isLoading ? '...' : s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <Button onClick={() => navigate('/placement/job-approvals')} className="rounded-xl text-sm" style={{ background: VIOLET }}>
          Review Pending Jobs
        </Button>
        <Button onClick={() => navigate('/placement/students')} variant="outline" className="rounded-xl text-sm border-[hsl(249,60%,69%)] text-[hsl(249,60%,69%)]">
          View Selected Students
        </Button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Selection Funnel */}
        <Card className="border-0 shadow-sm rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Selection Funnel</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill={VIOLET} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Placement % */}
        <Card className="border-0 shadow-sm rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Department-wise Placement %</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="pct" fill={TEAL} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Hiring Trend */}
        <Card className="border-0 shadow-sm rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Hiring Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="hires" stroke={VIOLET} strokeWidth={2.5} dot={{ fill: VIOLET, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Salary Distribution */}
        <Card className="border-0 shadow-sm rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Salary Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={salaryData} cx="50%" cy="50%" outerRadius={80} dataKey="count" label={({ name, percent }) => `${name}`}>
                  {salaryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </PlacementLayout>
  );
};

export default PlacementDashboard;
