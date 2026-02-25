import React, { useState } from 'react';
import RoleHeader from '../../components/common/RoleHeader';
import RoleSidebar from '../../components/common/RoleSidebar';
import { Search } from 'lucide-react';

const JobApprovals: React.FC = () => {
    const [activeTab, setActiveTab] = useState('Pending');
    const tabs = ['Pending', 'Approved', 'Rejected', 'Hold', 'All'];

    return (
        <div className="flex h-screen bg-gray-50">
            <RoleSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <RoleHeader title="Job Approvals" subtitle="" />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <div className="flex justify-between items-center">
                            <h1 className="text-[20px] font-bold text-gray-900">Job Approvals</h1>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="pl-10 pr-4 py-1.5 bg-white border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 w-64 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 p-1.5 bg-white/80 w-fit rounded-full border border-gray-100 shadow-sm">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase transition-all tracking-wider ${activeTab === tab
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'text-gray-500 hover:text-purple-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col items-center justify-center py-32 border-none rounded-2xl bg-transparent">
                            <div className="p-10 mb-6 flex items-center justify-center">
                                {/* Placeholder for no jobs icon if needed, otherwise just text */}
                                <p className="text-gray-400 font-medium text-sm">No jobs found</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default JobApprovals;
