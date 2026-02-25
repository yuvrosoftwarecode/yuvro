import React from 'react';
import RoleHeader from '../../components/common/RoleHeader';
import RoleSidebar from '../../components/common/RoleSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Users, UserCheck, CalendarClock, CheckCircle2, MoreHorizontal } from 'lucide-react';

const jobData = [
    { id: 1, company: 'Infosys', role: 'Systems Engineer', apps: 78, shortlisted: 25, interview: 0, selected: 8, location: 'Bangalore' },
    { id: 2, company: 'Wipro', role: 'Junior Developer', apps: 55, shortlisted: 18, interview: 0, selected: 5, location: 'Hyderabad' },
    { id: 3, company: 'TCS', role: 'Software Engineer', apps: 45, shortlisted: 12, interview: 0, selected: 0, location: 'Mumbai' },
    { id: 4, company: 'Google', role: 'SDE Intern', apps: 120, shortlisted: 30, interview: 0, selected: 0, location: 'Bangalore' },
    { id: 5, company: 'TechStartup Inc', role: 'Full Stack Developer', apps: 12, shortlisted: 0, interview: 0, selected: 0, location: 'Delhi' },
];

const LiveJobs: React.FC = () => {
    return (
        <div className="flex h-screen bg-gray-50">
            <RoleSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <RoleHeader title="Live Jobs" subtitle="" />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <div className="flex justify-between items-center">
                            <h1 className="text-[20px] font-bold text-gray-900">Live Jobs</h1>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="pl-10 pr-4 py-1.5 bg-white border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 w-64 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {jobData.map((job) => (
                                <Card key={job.id} className="bg-white hover:shadow-lg transition-all border-none shadow-sm rounded-2xl overflow-hidden group">
                                    <CardContent className="p-5 space-y-5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors font-bold text-xl h-12 w-12 flex items-center justify-center">
                                                    {job.company[0]}
                                                </div>
                                                <div className="flex flex-col">
                                                    <h3 className="font-bold text-sm text-gray-900 leading-tight">{job.company}</h3>
                                                    <p className="text-[10px] text-gray-400 font-semibold">{job.role} • {job.location}</p>
                                                </div>
                                            </div>
                                            <button className="text-gray-300 hover:text-gray-600">
                                                <MoreHorizontal className="h-5 w-5" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-50/50 p-2.5 rounded-xl flex flex-col justify-center">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Users className="h-3.5 w-3.5 text-blue-500" />
                                                    <span className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">Applications</span>
                                                </div>
                                                <span className="text-lg font-bold text-gray-900 leading-none">{job.apps}</span>
                                            </div>
                                            <div className="bg-gray-50/50 p-2.5 rounded-xl flex flex-col justify-center">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <UserCheck className="h-3.5 w-3.5 text-orange-500" />
                                                    <span className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">Shortlisted</span>
                                                </div>
                                                <span className="text-lg font-bold text-gray-900 leading-none">{job.shortlisted}</span>
                                            </div>
                                            <div className="bg-gray-50/50 p-2.5 rounded-xl flex flex-col justify-center">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <CalendarClock className="h-3.5 w-3.5 text-indigo-500" />
                                                    <span className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">Interview</span>
                                                </div>
                                                <span className="text-lg font-bold text-gray-900 leading-none">{job.interview}</span>
                                            </div>
                                            <div className="bg-gray-50/50 p-2.5 rounded-xl flex flex-col justify-center">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
                                                    <span className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">Selected</span>
                                                </div>
                                                <span className="text-lg font-bold text-gray-900 leading-none">{job.selected}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LiveJobs;
