import React, { useState, useEffect } from "react";
import PageHeader from '../../components/common/PageHeader';
import RoleSidebar from "../../components/common/RoleSidebar";
import { Building2, MapPin, Search, AlertTriangle, Star, CheckCircle2, XCircle, ExternalLink, Globe, Layout, Clock, User, Phone, Mail, CheckCircle, Pause } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
const VIOLET = 'hsl(249, 60%, 69%)';
const TEAL = 'hsl(165, 64%, 50%)';

import { mockJobService, MockJob } from "@/services/mockJobService";

const JobApprovals: React.FC = () => {
    const [activeTab, setActiveTab] = useState("approved");
    const [selectedJob, setSelectedJob] = useState<MockJob | null>(null);
    const [applications, setApplications] = useState<any[]>([]);
    const [loadingApps, setLoadingApps] = useState(false);
    const [actionType, setActionType] = useState<string | null>(null);
    const [jobs, setJobs] = useState<MockJob[]>([]);

    const tabs = ["pending", "approved", "rejected", "hold", "all"];

    const loadJobs = () => {
        setJobs(mockJobService.getApprovalJobs());
    };

    useEffect(() => {
        loadJobs();
    }, []);

    const filteredJobs =
        activeTab === "all"
            ? jobs
            : jobs.filter((j) => j.status === activeTab);

    useEffect(() => {
        if (selectedJob) {
            fetchApplications(selectedJob.id);
        }
    }, [selectedJob]);

    const fetchApplications = (jobId: string) => {
        setLoadingApps(true);
        try {
            const data = mockJobService.getApplications(jobId);
            setApplications(data || []);
        } catch (error) {
            console.error("Error fetching applications:", error);
        } finally {
            setLoadingApps(false);
        }
    };

    const handleUpdateAppStatus = async (appId: string, status: string) => {
        if (!selectedJob) return;
        try {
            await mockJobService.updateApplicationStatus(selectedJob.id, appId, status);
            toast.success(`Application ${status === 'shortlisted' ? 'approved' : 'rejected'} successfully`);
            fetchApplications(selectedJob.id);
            loadJobs(); // Refresh jobs to update counts if necessary
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleJobAction = async (status: string) => {
        if (!selectedJob) return;
        try {
            await mockJobService.updateJobStatus(selectedJob.id, status);
            toast.success(`Job ${status} successfully`);
            setSelectedJob(null);
            loadJobs();
        } catch (error) {
            toast.error(`Failed to update job status to ${status}`);
        }
    };

    return (
        <div className="flex h-screen bg-[hsl(240,20%,98.5%)]">
            <RoleSidebar />

            <div className="flex-1 flex flex-col overflow-hidden">

                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <PageHeader
                            title="Job Approvals"
                            subtitle="Review and manage job postings and student applications"
                        />
                        {/* Header */}
                        <div className="flex items-center justify-between">

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
                                    className={`px-4 py-1.5 rounded-full text-[13px] font-medium capitalize transition-all ${activeTab === tab
                                        ? "bg-[#8B5CF6] text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredJobs.map((job) => (
                                <Card
                                    key={job.id}
                                    className="bg-white rounded-2xl border border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer"
                                    onClick={() => setSelectedJob(job)}
                                >
                                    <CardContent className="p-4 relative">
                                        <div className="absolute top-4 right-4 text-[10px] font-bold">
                                            <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full capitalize tracking-tight">
                                                {job.status}
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                                <Building2 className="h-5 w-5 text-slate-400" />
                                            </div>

                                            <div className="min-w-0 pr-8">
                                                <h3 className="text-[15px] font-semibold text-slate-800 truncate">
                                                    {(job.recruiter as any).company_name}
                                                </h3>
                                                <p className="text-[12px] text-slate-500 truncate">
                                                    {job.role_title}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 text-[12px] text-slate-500 mb-4 whitespace-nowrap overflow-hidden">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                                {job.location}
                                            </div>
                                            <div className="font-bold text-slate-700">
                                                ₹{(job.ctc_total / 100000).toFixed(1)}L
                                            </div>
                                            <div>
                                                {format(new Date(job.deadline), "dd MMM")}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-auto">
                                            <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-bold ${job.ai_risk_level === "low" ? "text-emerald-600 bg-emerald-50" : job.ai_risk_level === "medium" ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50"}`}>
                                                <AlertTriangle className="h-3 w-3" />
                                                {job.ai_risk_level}
                                            </div>
                                            <div className="flex gap-1.5">
                                                {job.eligible_branches?.slice(0, 2).map((tag: string) => (
                                                    <span key={tag} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md font-medium">
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

            {/* Job Detail Modal */}
            <Dialog open={!!selectedJob && !actionType} onOpenChange={() => setSelectedJob(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" style={{ color: VIOLET }} />
                            {selectedJob?.role_title}
                        </DialogTitle>
                        <DialogDescription>{(selectedJob?.recruiter as any)?.company_name}</DialogDescription>
                    </DialogHeader>
                    {selectedJob && (
                        <div className="space-y-5 mt-2">
                            {/* Company Info */}
                            <section>
                                <h3 className="font-semibold text-sm mb-2 text-[hsl(249,60%,69%)]">Company Information</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <p><span className="text-muted-foreground">Company:</span> {(selectedJob.recruiter as any)?.company_name}</p>
                                    <p><span className="text-muted-foreground">Industry:</span> {(selectedJob.recruiter as any)?.company_industry || 'N/A'}</p>
                                    <p><span className="text-muted-foreground">Location:</span> {(selectedJob.recruiter as any)?.company_location || 'N/A'}</p>
                                    <p><span className="text-muted-foreground">Trust Score:</span> {(selectedJob.recruiter as any)?.trust_score || 0}/100</p>
                                    <p className="flex items-center gap-1"><span className="text-muted-foreground">Rating:</span> <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {(selectedJob.recruiter as any)?.rating || 0}</p>
                                    {(selectedJob.recruiter as any)?.company_website && (
                                        <a href={(selectedJob.recruiter as any).company_website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[hsl(249,60%,69%)] hover:underline">
                                            <ExternalLink className="h-3 w-3" /> Website
                                        </a>
                                    )}
                                </div>
                            </section>

                            {/* Recruiter Info */}
                            <section>
                                <h3 className="font-semibold text-sm mb-2 text-[hsl(249,60%,69%)]">Recruiter Information</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <p><span className="text-muted-foreground">Name:</span> {(selectedJob.recruiter as any)?.name}</p>
                                    <p><span className="text-muted-foreground">Designation:</span> {(selectedJob.recruiter as any)?.designation || 'N/A'}</p>
                                    <p><span className="text-muted-foreground">Email:</span> {(selectedJob.recruiter as any)?.email}</p>
                                    <p><span className="text-muted-foreground">Phone:</span> {(selectedJob.recruiter as any)?.phone || 'N/A'}</p>
                                    {(selectedJob.recruiter as any)?.is_verified && <Badge variant="outline" className="w-fit text-[hsl(165,64%,50%)] border-[hsl(165,64%,50%)]">✓ Verified</Badge>}
                                </div>
                            </section>

                            {/* Job Info */}
                            <section>
                                <h3 className="font-semibold text-sm mb-2 text-[hsl(249,60%,69%)]">Job Details</h3>
                                <div className="space-y-2 text-sm">
                                    <p><span className="text-muted-foreground">Description:</span> {selectedJob.role_description || 'No description'}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <p><span className="text-muted-foreground">CTC Fixed:</span> ₹{((selectedJob.ctc_fixed || 0) / 100000).toFixed(1)}L</p>
                                        <p><span className="text-muted-foreground">CTC Variable:</span> ₹{((selectedJob.ctc_variable || 0) / 100000).toFixed(1)}L</p>
                                        <p><span className="text-muted-foreground">Total CTC:</span> ₹{((selectedJob.ctc_total || 0) / 100000).toFixed(1)}L</p>
                                        <p><span className="text-muted-foreground">Vacancies:</span> {selectedJob.vacancies}</p>
                                        <p><span className="text-muted-foreground">Location:</span> {selectedJob.location || 'N/A'}</p>
                                        <p><span className="text-muted-foreground">Min CGPA:</span> {selectedJob.min_cgpa}</p>
                                    </div>
                                    {selectedJob.skills_required?.length ? (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {selectedJob.skills_required.map((s: string) => <Badge key={s} variant="secondary" className="text-[10px] rounded-lg">{s}</Badge>)}
                                        </div>
                                    ) : null}
                                    {selectedJob.bond_details && <p><span className="text-muted-foreground">Bond:</span> {selectedJob.bond_details}</p>}
                                    {selectedJob.selection_rounds?.length ? <p><span className="text-muted-foreground">Rounds:</span> {selectedJob.selection_rounds.join(' → ')}</p> : null}
                                </div>
                            </section>

                            {/* Actions */}
                            {(selectedJob.status === 'pending' || selectedJob.status === 'hold') && (
                                <div className="flex gap-3 pt-2">
                                    <Button className="flex-1 rounded-xl" style={{ background: TEAL }} onClick={() => handleJobAction('approved')}>
                                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                                    </Button>
                                    <Button className="flex-1 rounded-xl" variant="destructive" onClick={() => handleJobAction('rejected')}>
                                        <XCircle className="h-4 w-4 mr-1" /> Reject
                                    </Button>
                                    <Button className="flex-1 rounded-xl" variant="outline" onClick={() => handleJobAction('hold')}>
                                        <Pause className="h-4 w-4 mr-1" /> Hold
                                    </Button>
                                </div>
                            )}

                            {/* Student Applications Section (Added merge) */}
                            <section className="pt-5 border-t">
                                <h3 className="font-semibold text-sm mb-4 text-[hsl(249,60%,69%)]">Student Applications</h3>
                                {loadingApps ? (
                                    <div className="py-4 text-center text-slate-400 text-sm italic">Fetching applications...</div>
                                ) : applications.length === 0 ? (
                                    <div className="py-4 text-center text-slate-400 text-sm italic">No applications received yet.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {applications.map((app) => (
                                            <div key={app.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-white border border-slate-100 flex items-center justify-center font-bold text-[hsl(249,60%,69%)] text-xs">
                                                        {app.applicant_name ? app.applicant_name[0] : 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{app.applicant_name}</p>
                                                        <p className="text-[11px] text-slate-400">{app.applicant_email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {app.status === 'under_review' ? (
                                                        <div className="flex gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                className="h-7 px-3 rounded-lg bg-[hsl(165,64%,50%)] hover:bg-[hsl(165,64%,45%)] text-white font-bold text-[10px]"
                                                                onClick={(e) => { e.stopPropagation(); handleUpdateAppStatus(app.id, 'shortlisted'); }}
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-3 rounded-lg border-red-100 text-red-500 bg-white hover:bg-red-50 font-bold text-[10px]"
                                                                onClick={(e) => { e.stopPropagation(); handleUpdateAppStatus(app.id, 'rejected'); }}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Badge className={`px-2 py-0.5 rounded-full font-bold text-[9px] tracking-wider ${app.status === 'shortlisted' || app.status === 'selected'
                                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                            : 'bg-red-50 text-red-600 border-red-100'
                                                            }`}>
                                                            {app.status === 'shortlisted' ? 'Approved' : app.status}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default JobApprovals;