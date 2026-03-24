import React from 'react';
import RoleHeader from '../../components/common/RoleHeader';
import RoleSidebar from '../../components/common/RoleSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Briefcase,
  GraduationCap,
  FileCheck,
  Banknote,
  TrendingUp,
  Search
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';

const funnelData = [
  { name: 'Applicants', value: 320 },
  { name: 'Shortlisted', value: 85 },
  { name: 'Selected', value: 25 },
];

const deptData = [
  { name: 'CSE', pct: 85 },
  { name: 'ECE', pct: 72 },
  { name: 'ME', pct: 58 },
  { name: 'CE', pct: 45 },
  { name: 'EEE', pct: 62 },
  { name: 'IT', pct: 78 },
];

const trendData = [
  { name: 'Aug', hires: 10 },
  { name: 'Sep', hires: 25 },
  { name: 'Oct', hires: 45 },
  { name: 'Nov', hires: 30 },
  { name: 'Dec', hires: 60 },
  { name: 'Jan', hires: 85 },
  { name: 'Feb', hires: 100 },
];

const salaryData = [
  { name: '2-4L', value: 45, color: '#8b5cf6' },
  { name: '4-6L', value: 85, color: '#10b981' },
  { name: '6-8L', value: 65, color: '#f59e0b' },
  { name: '8-10L', value: 35, color: '#ef4444' },
  { name: '10L+', value: 15, color: '#3b82f6' },
];

const Dashboard: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <RoleSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <RoleHeader
          title=""
          subtitle=""
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center bg-transparent">
              <h1 className="text-[20px] font-bold text-gray-900">Dashboard</h1>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-1.5 bg-white border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 w-64 shadow-sm"
                />
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow h-28 flex flex-col justify-center rounded-2xl">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="p-2 bg-orange-50 rounded-lg mb-2">
                    <FileCheck className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="text-xl font-bold text-gray-900 leading-none">0</div>
                  <p className="text-[10px] font-bold text-gray-400 mt-2 tracking-wider">Pending Approvals</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow h-28 flex flex-col justify-center rounded-2xl">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="p-2 bg-purple-50 rounded-lg mb-2">
                    <Briefcase className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-xl font-bold text-gray-900 leading-none">5</div>
                  <p className="text-[10px] font-bold text-gray-400 mt-2 tracking-wider">Live Jobs</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow h-28 flex flex-col justify-center rounded-2xl">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="p-2 bg-green-50 rounded-lg mb-2">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-xl font-bold text-gray-900 leading-none">0</div>
                  <p className="text-[10px] font-bold text-gray-400 mt-2 tracking-wider">Students Selected</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow h-28 flex flex-col justify-center rounded-2xl">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="p-2 bg-blue-50 rounded-lg mb-2">
                    <Banknote className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-xl font-bold text-gray-900 leading-none">₹0.0L</div>
                  <p className="text-[10px] font-bold text-gray-400 mt-2 tracking-wider">Avg CTC</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow h-28 flex flex-col justify-center rounded-2xl">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="p-2 bg-indigo-50 rounded-lg mb-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="text-xl font-bold text-gray-900 leading-none">₹0.0L</div>
                  <p className="text-[10px] font-bold text-gray-400 mt-2 tracking-wider">Highest CTC</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow h-28 flex flex-col justify-center rounded-2xl">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className="p-2 bg-teal-50 rounded-lg mb-2">
                    <GraduationCap className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="text-xl font-bold text-gray-900 leading-none">0%</div>
                  <p className="text-[10px] font-bold text-gray-400 mt-2 tracking-wider">Placement %</p>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8 text-xs font-semibold h-10">
                Review Pending Jobs
              </Button>
              <Button variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50 rounded-full px-8 text-xs font-semibold h-10 shadow-sm">
                View Selected Students
              </Button>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Selection Funnel */}
              <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-700">Selection Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={funnelData}
                        margin={{ top: 5, right: 30, left: 40, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                          type="number"
                          domain={[0, 320]}
                          ticks={[0, 80, 160, 240, 320]}
                          axisLine={{ stroke: '#9ca3af' }}
                          tickLine={{ stroke: '#9ca3af' }}
                          tick={{ fontSize: 13, fontWeight: 400, fill: 'gray' }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          axisLine={{ stroke: '#9ca3af' }}
                          tickLine={{ stroke: '#9ca3af' }}
                          tick={{ fontSize: 13, fontWeight: 400, fill: 'gray' }}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="value"
                          fill="hsl(249, 60%, 69%)"
                          radius={[0, 8, 8, 0]}
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Department-wise Placement */}
              <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-700">Department-wise Placement %</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="name"
                          axisLine={{ stroke: '#9ca3af' }}
                          tickLine={{ stroke: '#9ca3af' }}
                          tick={{ fontSize: 13, fontWeight: 400, fill: 'gray' }}
                        />
                        <YAxis
                          axisLine={{ stroke: '#9ca3af' }}
                          tickLine={{ stroke: '#9ca3af' }}
                          tick={{ fontSize: 13, fontWeight: 400, fill: 'gray' }}
                          domain={[0, 100]}
                          ticks={[0, 25, 50, 75, 100]}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="pct"
                          fill="hsl(165, 64%, 50%)"
                          radius={[8, 8, 0, 0]}
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Hiring Trend */}
              <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-700">Monthly Hiring Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          axisLine={{ stroke: '#9ca3af' }}
                          tickLine={{ stroke: '#9ca3af' }}
                          tick={{ fontSize: 10, fontWeight: 500, fill: '#9ca3af' }}
                        />
                        <YAxis
                          axisLine={{ stroke: '#9ca3af' }}
                          tickLine={{ stroke: '#9ca3af' }}
                          tick={{ fontSize: 10, fontWeight: 500, fill: '#9ca3af' }}
                          domain={[0, 100]}
                          ticks={[0, 25, 50, 75, 100]}
                        />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="hires"
                          stroke="hsl(249, 60%, 69%)"
                          strokeWidth={2.5}
                          dot={{ fill: "hsl(249, 60%, 69%)", r: 4 }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Salary Distribution */}
              <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-700">Salary Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={salaryData}
                          innerRadius={0}
                          outerRadius={80}
                          paddingAngle={0}
                          dataKey="value"
                          label={({ name, index }) => index}
                          labelLine={true}
                        >
                          <Cell fill="hsl(249, 60%, 69%)" stroke="#fff" strokeWidth={2} />
                          <Cell fill="hsl(165, 64%, 50%)" stroke="#fff" strokeWidth={2} />
                          <Cell fill="hsl(38, 100%, 56%)" stroke="#fff" strokeWidth={2} />
                          <Cell fill="hsl(0, 72%, 62%)" stroke="#fff" strokeWidth={2} />
                          <Cell fill="hsl(201, 89%, 60%)" stroke="#fff" strokeWidth={2} />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
