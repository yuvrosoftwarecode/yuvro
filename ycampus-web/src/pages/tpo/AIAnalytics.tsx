import React from 'react';
import RoleHeader from '../../components/common/RoleHeader';
import RoleSidebar from '../../components/common/RoleSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, AlertTriangle, Lightbulb } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const rejectionData = [
    { name: 'Weak DSA', count: 42 },
    { name: 'Communication', count: 35 },
    { name: 'Low CGPA', count: 28 },
    { name: 'No Projects', count: 20 },
    { name: 'Resume Issues', count: 18 },
];

const skillGapData = [
    { name: 'Technical', value: 45, color: '#8b5cf6' },
    { name: 'Communication', value: 30, color: '#10b981' },
    { name: 'Aptitude', value: 15, color: '#f59e0b' },
    { name: 'Domain', value: 10, color: '#ef4444' },
];

const deptInsights = [
    { name: 'CSE', placed: 85, ctc: '8.5L', color: 'bg-white' },
    { name: 'ECE', placed: 72, ctc: '6.2L', color: 'bg-white' },
    { name: 'ME', placed: 58, ctc: '5.1L', underperforming: true, color: 'bg-white' },
    { name: 'CE', placed: 45, ctc: '4.8L', underperforming: true, color: 'bg-white' },
    { name: 'IT', placed: 78, ctc: '7.8L', color: 'bg-white' },
    { name: 'EEE', placed: 62, ctc: '5.9L', color: 'bg-white' },
];

const AIAnalytics: React.FC = () => {
    return (
        <div className="flex h-screen bg-gray-50">
            <RoleSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <RoleHeader title="AI Analytics" subtitle="" />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-[20px] font-bold text-gray-900">AI Analytics</h1>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="pl-10 pr-4 py-1.5 bg-white border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 w-64 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Rejection Analysis */}
                            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                                <CardHeader className="pb-2 flex flex-row items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    <CardTitle className="text-sm font-bold text-gray-700">Rejection Analysis</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[260px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={rejectionData} margin={{ bottom: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#9ca3af" />
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fontSize: 9, fontWeight: 700, fill: '#9ca3af' }}
                                                />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#9ca3af' }} />
                                                <Tooltip />
                                                <Bar
                                                    dataKey="count"
                                                    fill="#f87171"
                                                    radius={[4, 4, 0, 0]}
                                                    barSize={45}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Skill Gap Breakdown */}
                            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold text-gray-700">Skill Gap Breakdown</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center">
                                    <div className="h-[220px] w-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={skillGapData}
                                                    innerRadius={0}
                                                    outerRadius={80}
                                                    paddingAngle={0}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={true}
                                                >
                                                    {skillGapData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Department Insights */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-gray-700 pl-1">Department Insights</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                {deptInsights.map((dept) => (
                                    <Card key={dept.name} className={`border-none shadow-sm hover:shadow-md transition-shadow rounded-2xl flex flex-col justify-center h-28 ${dept.color}`}>
                                        <CardContent className="p-4 text-center space-y-1">
                                            <p className="text-lg font-bold text-gray-900">{dept.placed}%</p>
                                            <div className="flex flex-col">
                                                <span className="text-[12px] text-gray-400 tracking-tight">{dept.name} Placed</span>
                                                <span className="text-[12px] text-teal-500 font-bold">Avg ₹{dept.ctc}</span>
                                            </div>
                                            {dept.underperforming && (
                                                <div className="flex items-center justify-center gap-1 text-[10px] text-red-500 tracking-wider mt-1">
                                                    <AlertTriangle className="h-2.5 w-2.5" />
                                                    <span>Underperforming</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* AI Recommendations */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pl-1">
                                <Lightbulb className="h-4 w-4 text-purple-600" />
                                <h2 className="text-sm font-bold text-gray-700">AI Recommendations</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                <Card className="bg-purple-50/50 border-none shadow-none rounded-2xl">
                                    <CardContent className="p-4">
                                        <p className="text-[11px] font-semibold text-purple-900/70 leading-relaxed">Conduct extra DSA mock tests for 3rd year CSE students as rejection rate is high in technical rounds.</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-blue-50/50 border-none shadow-none rounded-2xl">
                                    <CardContent className="p-4">
                                        <p className="text-[11px] font-semibold text-blue-900/70 leading-relaxed">Focus on improving communication skills for ME and CE departments to increase placement rates.</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AIAnalytics;
