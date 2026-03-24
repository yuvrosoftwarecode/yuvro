import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import RoleSidebar from '../../components/common/RoleSidebar';
import { Search, Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StudentsTracking: React.FC = () => {
    return (
        <div className="flex h-screen bg-gray-50">
            <RoleSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <PageHeader
                            title="Students Tracking"
                            subtitle="Track student placement status and performance"
                        />
                        <div className="flex justify-between items-center">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="pl-10 pr-4 py-1.5 bg-white border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 w-64 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border-none shadow-sm">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search student..."
                                    className="pl-9 pr-4 py-1.5 bg-gray-50/50 border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 w-full"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/50 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                                    <span className="text-xs font-semibold text-gray-500">All Branches</span>
                                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/50 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-200 transition-colors">
                                    <span className="text-xs font-semibold text-gray-500">All Status</span>
                                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                </div>
                                <Button variant="outline" className="flex items-center gap-2 border-gray-100 text-[10px] font-bold uppercase h-8 rounded-lg shadow-sm hover:bg-gray-50">
                                    <Download className="h-3.5 w-3.5" />
                                    Export CSV
                                </Button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border-none shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-b border-gray-50">
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Branch</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">CGPA</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Role</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">CTC</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Offer</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Joining</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td colSpan={9} className="p-32 text-center">
                                                <p className="text-gray-400 font-medium text-sm">No records found</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default StudentsTracking;
