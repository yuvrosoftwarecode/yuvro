import React from 'react';
import RoleHeader from '../../components/common/RoleHeader';
import RoleSidebar from '../../components/common/RoleSidebar';
import { Search, Bell } from 'lucide-react';

const Notifications: React.FC = () => {
    return (
        <div className="flex h-screen bg-gray-50">
            <RoleSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <RoleHeader title="" subtitle="" />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <div className="flex justify-between items-center">
                            <h1 className="text-[20px] font-bold text-gray-900">Notifications</h1>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="pl-10 pr-4 py-1.5 bg-white border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 w-64 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center py-40 border-none bg-white rounded-2xl shadow-sm">
                            <div className="p-8 bg-gray-50 rounded-3xl mb-6 flex items-center justify-center">
                                <Bell className="h-12 w-12 text-gray-200" />
                            </div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">No notifications yet</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Notifications;
