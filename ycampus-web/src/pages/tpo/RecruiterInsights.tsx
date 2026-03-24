import React from 'react';
import RoleHeader from '../../components/common/RoleHeader';
import RoleSidebar from '../../components/common/RoleSidebar';
import { Search, Star, ExternalLink } from 'lucide-react';

const recruiterData = [
    { id: 1, company: 'TCS', location: 'Mumbai', recruiter: 'Rahul Sharma', email: 'rahul@tcs.com', industry: 'IT Services', trust: 85, rating: 4.2, status: 'Verified', statusColor: 'bg-teal-50 text-teal-600' },
    { id: 2, company: 'Infosys', location: 'Bangalore', recruiter: 'Priya Patel', email: 'priya@infosys.com', industry: 'IT Services', trust: 78, rating: 3.8, status: 'Verified', statusColor: 'bg-teal-50 text-teal-600' },
    { id: 3, company: 'Wipro', location: 'Hyderabad', recruiter: 'Amit Kumar', email: 'amit@wipro.com', industry: 'IT Services', trust: 65, rating: 3.5, status: 'Unverified', statusColor: 'bg-gray-50 text-gray-500' },
    { id: 4, company: 'Google', location: 'Bangalore', recruiter: 'Sarah Johnson', email: 'sarah@google.com', industry: 'Technology', trust: 95, rating: 4.9, status: 'Verified', statusColor: 'bg-teal-50 text-teal-600' },
    { id: 5, company: 'TechStartup Inc', location: 'Delhi', recruiter: 'Deepak Verma', email: 'deepak@startup.com', industry: 'Fintech', trust: 35, rating: 2.1, status: 'Flagged', statusColor: 'bg-red-50 text-red-600' },
];

const RecruiterInsights: React.FC = () => {
    return (
        <div className="flex h-screen bg-gray-50">
            <RoleSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <RoleHeader title="" subtitle="" />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <div className="flex justify-between items-center">
                            <h1 className="text-[20px] font-bold text-gray-900">Recruiter Insights</h1>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="pl-10 pr-4 py-1.5 bg-white border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 w-64 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border-none shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-b border-gray-50">
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recruiter</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Industry</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trust Score</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rating</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recruiterData.map((row) => (
                                            <tr key={row.id} className="border-b border-gray-50/50 hover:bg-gray-50/30 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold text-lg border border-gray-100">
                                                            {row.company[0]}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-gray-900 leading-tight">{row.company}</span>
                                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight">{row.location}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-800 leading-tight">{row.recruiter}</span>
                                                        <span className="text-[10px] font-semibold text-gray-400">{row.email}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">{row.industry}</span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3 min-w-[100px]">
                                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${row.trust > 80 ? 'bg-teal-500' : row.trust > 50 ? 'bg-orange-500' : 'bg-red-500'
                                                                    }`}
                                                                style={{ width: `${row.trust}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-700">{row.trust}%</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-1 bg-gray-50 w-fit px-2 py-1 rounded-lg">
                                                        <Star className="h-3 w-3 text-orange-400 fill-orange-400" />
                                                        <span className="text-[11px] font-bold text-gray-700">{row.rating}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${row.statusColor}`}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button className="inline-flex items-center gap-1.5 text-purple-600 hover:text-purple-800 text-[10px] font-bold uppercase transition-colors bg-purple-50 px-3 py-1.5 rounded-full">
                                                        <ExternalLink className="h-3 w-3" />
                                                        Site
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
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

export default RecruiterInsights;
