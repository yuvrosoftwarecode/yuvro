import React from 'react';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, Award, Target } from 'lucide-react';

export default function InstructorAnalytics() {
    // Mock data for now, replace with API calls later
    const overviewStats = [
        { title: 'Total Students', value: '1,234', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
        { title: 'Active Courses', value: '12', icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-100' },
        { title: 'Certificates Issued', value: '456', icon: Award, color: 'text-green-600', bg: 'bg-green-100' },
        { title: 'Assessments Taken', value: '890', icon: Target, color: 'text-orange-600', bg: 'bg-orange-100' },
    ];

    const monthlyData = [
        { name: 'Jan', students: 400, assessments: 240, certificates: 24 },
        { name: 'Feb', students: 300, assessments: 139, certificates: 18 },
        { name: 'Mar', students: 200, assessments: 980, certificates: 29 },
        { name: 'Apr', students: 278, assessments: 390, certificates: 20 },
        { name: 'May', students: 189, assessments: 480, certificates: 28 },
        { name: 'Jun', students: 239, assessments: 380, certificates: 15 },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <RoleSidebar />
            <div className="flex-1 flex flex-col">
                <RoleHeader
                    title="Analytics Dashboard"
                    subtitle="Comprehensive insights into courses, students, and assessments"
                />

                <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {overviewStats.map((stat, i) => (
                            <Card key={i}>
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                                        <h3 className="text-2xl font-bold mt-1 text-gray-900">{stat.value}</h3>
                                    </div>
                                    <div className={`p-3 rounded-full ${stat.bg}`}>
                                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Charts */}
                    <Tabs defaultValue="overview" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="courses">Courses Performance</TabsTrigger>
                            <TabsTrigger value="students">Student Engagement</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Activity Overview</CardTitle>
                                </CardHeader>
                                <CardContent className="pl-2">
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={monthlyData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                                <Tooltip />
                                                <Bar dataKey="students" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Students" />
                                                <Bar dataKey="assessments" fill="#ea580c" radius={[4, 4, 0, 0]} name="Assessments" />
                                                <Bar dataKey="certificates" fill="#16a34a" radius={[4, 4, 0, 0]} name="Certificates" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="courses">
                            <div className="p-10 text-center text-gray-500">Course analytics coming soon.</div>
                        </TabsContent>

                        <TabsContent value="students">
                            <div className="p-10 text-center text-gray-500">Student engagement analytics coming soon.</div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
