import React, { useState } from "react";
import RoleHeader from "../../components/common/RoleHeader";
import RoleSidebar from "../../components/common/RoleSidebar";
import { Building2, MapPin, Search, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

const APPROVAL_JOBS = [
  {
    id: "1",
    status: "approved",
    role_title: "Systems Engineer",
    location: "Pune",
    ctc_total: 500000,
    deadline: "2026-03-04T00:00:00Z",
    ai_risk_level: "low",
    eligible_branches: ["CSE", "IT", "ECE"],
    recruiter: { company_name: "Infosys" },
  },
  {
    id: "2",
    status: "approved",
    role_title: "Junior Developer",
    location: "Hyderabad",
    ctc_total: 450000,
    deadline: "2026-03-09T00:00:00Z",
    ai_risk_level: "medium",
    eligible_branches: ["CSE", "IT", "ECE"],
    recruiter: { company_name: "Wipro" },
  },
  {
    id: "3",
    status: "approved",
    role_title: "Software Engineer",
    location: "Mumbai",
    ctc_total: 600000,
    deadline: "2026-03-14T00:00:00Z",
    ai_risk_level: "low",
    eligible_branches: ["CSE", "IT", "ECE"],
    recruiter: { company_name: "TCS" },
  },
  {
    id: "4",
    status: "approved",
    role_title: "SDE Intern",
    location: "Bangalore",
    ctc_total: 2000000,
    deadline: "2026-02-27T00:00:00Z",
    ai_risk_level: "low",
    eligible_branches: ["CSE", "IT"],
    recruiter: { company_name: "Google" },
  },
  {
    id: "5",
    status: "approved",
    role_title: "Full Stack Developer",
    location: "Delhi",
    ctc_total: 800000,
    deadline: "2026-02-22T00:00:00Z",
    ai_risk_level: "high",
    eligible_branches: ["CSE", "IT"],
    recruiter: { company_name: "TechStartup Inc" },
  },
];

const JobApprovals: React.FC = () => {
  const [activeTab, setActiveTab] = useState("approved");
  const tabs = ["pending", "approved", "rejected", "hold", "all"];

  const filteredJobs =
    activeTab === "all"
      ? APPROVAL_JOBS
      : APPROVAL_JOBS.filter((j) => j.status === activeTab);

  return (
    <div className="flex h-screen bg-hsl(240, 20%, 98.5%)">
      <RoleSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <RoleHeader title="Job Approvals" subtitle="" />

        <main className="flex-1 overflow-y-auto p-10">
          <div className="max-w-7xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] font-semibold text-slate-800 tracking-tight">
                Job Approvals
              </h1>

              {/* Search */}
              <div className="relative w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 p-1 bg-white w-fit rounded-full border border-slate-200 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                    activeTab === tab
                      ? "bg-[#8B5CF6] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

              {filteredJobs.map((job) => (
                <Card
                  key={job.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <CardContent className="p-6 relative">

                    {/* Status Badge */}
                    <div className="absolute top-6 right-6">
                      <span className="bg-emerald-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                        Approved
                      </span>
                    </div>

                    {/* Company + Role */}
                    <div className="flex items-start gap-4 mb-5">
                      <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-slate-400" />
                      </div>

                      <div>
                        <h3 className="text-[16px] font-semibold text-slate-800">
                          {job.recruiter.company_name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {job.role_title}
                        </p>
                      </div>
                    </div>

                    {/* Info Row */}
                    <div className="flex items-center gap-5 text-sm text-slate-500 mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {job.location}
                      </div>

                      <div>
                        ₹{(job.ctc_total / 100000).toFixed(1)}L
                      </div>

                      <div>
                        {format(new Date(job.deadline), "dd MMM")}
                      </div>
                    </div>

                    {/* Risk + Tags */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
                          job.ai_risk_level === "low"
                            ? "text-emerald-600 bg-emerald-50"
                            : job.ai_risk_level === "medium"
                            ? "text-amber-600 bg-amber-50"
                            : "text-red-600 bg-red-50"
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {job.ai_risk_level} risk
                      </div>

                      <div className="flex gap-2">
                        {job.eligible_branches
                          ?.slice(0, 3)
                          .map((tag: string) => (
                            <span
                              key={tag}
                              className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-md"
                            >
                              {tag}
                            </span>
                          ))}
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

export default JobApprovals;