import React, { useState, useEffect } from "react";
import RoleHeader from "../../components/common/RoleHeader";
import RoleSidebar from "../../components/common/RoleSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Users, UserCheck, Clock, CheckCircle2, Building2 } from "lucide-react";
import { mockJobService, MockJob } from "@/services/mockJobService";

const LiveJobs: React.FC = () => {
    const [jobs, setJobs] = useState<MockJob[]>([]);

    useEffect(() => {
        setJobs(mockJobService.getLiveJobs());
    }, []);

    return (
        <div className="flex h-screen bg-[hsl(240,20%,98.5%)]">
            <RoleSidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <RoleHeader title="" subtitle="" />

                <main className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-7xl mx-auto space-y-8">

                        {/* Top Bar */}
                        <div className="flex items-center justify-between">
                            <h1 className="text-3xl font-bold text-slate-900">Live Jobs</h1>

                            <div className="relative w-[280px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                            </div>
                        </div>

                        {/* Job Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {jobs.map((job) => (
                                <Card
                                    key={job.id}
                                    className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <CardContent className="p-6">

                                        {/* Header */}
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-10 w-10 rounded-xl bg-[hsl(165,64%,94%)] flex items-center justify-center">
                                                <Building2 className="h-5 w-5 text-[hsl(165,64%,50%)]" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-slate-800">
                                                    {job.recruiter.company_name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {job.role_title}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                {
                                                    label: "Applications",
                                                    value: job.apps.count,
                                                    icon: Users,
                                                    color: "hsl(249,60%,69%)",
                                                },
                                                {
                                                    label: "Shortlisted",
                                                    value: job.apps.shortlisted,
                                                    icon: UserCheck,
                                                    color: "hsl(38,100%,56%)",
                                                },
                                                {
                                                    label: "Interview",
                                                    value: job.apps.interview,
                                                    icon: Clock,
                                                    color: "hsl(200,70%,55%)",
                                                },
                                                {
                                                    label: "Selected",
                                                    value: job.apps.selected,
                                                    icon: CheckCircle2,
                                                    color: "hsl(165,64%,50%)",
                                                },
                                            ].map((stat) => (
                                                <div
                                                    key={stat.label}
                                                    className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(240,20%,97%)]"
                                                >
                                                    <stat.icon
                                                        className="h-4 w-4"
                                                        style={{ color: stat.color }}
                                                    />
                                                    <div>
                                                        <p className="text-lg font-bold leading-none">
                                                            {stat.value}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">
                                                            {stat.label}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
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
