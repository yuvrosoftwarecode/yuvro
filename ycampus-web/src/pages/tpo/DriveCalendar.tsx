import React, { useState } from 'react';
import RoleHeader from '../../components/common/RoleHeader';
import RoleSidebar from '../../components/common/RoleSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Search, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const upcomingDrives = [
    { id: 1, title: 'TechStartup Hiring', company: 'TechStartup Inc', date: '12 Feb 2026', status: 'ongoing', statusColor: 'bg-teal-50 text-teal-600' },
    { id: 2, title: 'TCS Campus Recruitment', company: 'TCS', date: '17 Feb 2026', status: 'upcoming', statusColor: 'bg-purple-50 text-purple-600' },
    { id: 3, title: 'Infosys Pool Drive', company: 'Infosys', date: '24 Feb 2026', status: 'upcoming', statusColor: 'bg-purple-50 text-purple-600' },
    { id: 4, title: 'Google SDE Hiring', company: 'Google', date: '04 Mar 2026', status: 'upcoming', statusColor: 'bg-purple-50 text-purple-600' },
];

const DriveCalendar: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState('February 2026');

    // Simple calendar generator for Feb 2026 (starts on Sunday)
    const days = Array.from({ length: 28 }, (_, i) => i + 1);
    const activeDays = [7, 12, 17, 24, 25]; // Mock active dates

    return (
        <div className="flex h-screen bg-gray-50">
            <RoleSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <RoleHeader title="" subtitle="" />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-[20px] font-bold text-gray-900">Drive Calendar</h1>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="pl-10 pr-4 py-1.5 bg-white border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 w-64 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Calendar Section */}
                            <Card className="lg:col-span-5 border-none shadow-sm h-fit rounded-2xl overflow-hidden bg-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-8">
                                        <button className="p-2 hover:bg-gray-50 rounded-full text-gray-300 hover:text-purple-600 transition-all">
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <h2 className="text-sm font-bold text-gray-700">{currentMonth}</h2>
                                        <button className="p-2 hover:bg-gray-50 rounded-full text-gray-300 hover:text-purple-600 transition-all">
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-7 gap-2 text-center mb-6">
                                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                            <span key={day} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{day}</span>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7 gap-y-4 text-center">
                                        {days.map(day => (
                                            <div key={day} className="flex items-center justify-center relative">
                                                <div className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer
                           ${day === 25 ? 'bg-purple-600 text-white shadow-lg' :
                                                        activeDays.includes(day) ? 'text-purple-600 bg-purple-50' : 'text-gray-500 hover:bg-gray-50'}
                        `}>
                                                    {day}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Drives List Section */}
                            <div className="lg:col-span-7 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                                        Drives on 25 February 2026
                                    </h3>
                                    <div className="flex flex-col items-center justify-center py-10 border-none bg-white/50 rounded-2xl">
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">No drives scheduled for this date</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">All Upcoming Drives</h3>
                                    <div className="space-y-3">
                                        {upcomingDrives.map(drive => (
                                            <Card key={drive.id} className="border-none shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden bg-white group">
                                                <CardContent className="p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-gray-50 rounded-xl text-gray-300 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                                            <CalendarIcon className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-gray-800 leading-tight">{drive.title} — {drive.company}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-1">{drive.date}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${drive.statusColor}`}>
                                                        {drive.status}
                                                    </span>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DriveCalendar;
