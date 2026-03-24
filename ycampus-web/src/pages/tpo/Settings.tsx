import React from 'react';
import PageHeader from '../../components/common/PageHeader';
import RoleSidebar from '../../components/common/RoleSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Search, Settings as SettingsIcon, Bell, Monitor } from 'lucide-react';

const Settings: React.FC = () => {
    return (
        <div className="flex h-screen bg-white">
            <RoleSidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full overflow-y-auto">
                    <PageHeader title="Settings" subtitle="Manage your account preferences and application settings." />
                    <div className="space-y-8">
                        <div className="flex justify-between items-center">
                            <div className="relative group ml-auto">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="pl-10 pr-4 py-1.5 bg-white border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-400 w-64 shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2">
                                        <Bell className="h-4 w-4 text-purple-600" />
                                        <CardTitle className="text-sm font-bold text-gray-700">Notifications</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-gray-700">Email Notifications</p>
                                            <p className="text-[10px] text-gray-500 font-medium">Receive daily digest of job applications</p>
                                        </div>
                                        <Switch defaultChecked className="data-[state=checked]:bg-purple-600" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-gray-700">Browser Notifications</p>
                                            <p className="text-[10px] text-gray-500 font-medium">Get real-time updates for student shortlisting</p>
                                        </div>
                                        <Switch defaultChecked className="data-[state=checked]:bg-purple-600" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2">
                                        <SettingsIcon className="h-4 w-4 text-purple-600" />
                                        <CardTitle className="text-sm font-bold text-gray-700">Display Settings</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-gray-700">Compact Mode</p>
                                            <p className="text-[10px] text-gray-500 font-medium">Show more data in student tracking tables</p>
                                        </div>
                                        <Switch className="data-[state=checked]:bg-purple-600" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-gray-700">AI Recommendations</p>
                                            <p className="text-[10px] text-gray-500 font-medium">Show automated insights on dashboard</p>
                                        </div>
                                        <Switch defaultChecked className="data-[state=checked]:bg-purple-600" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
