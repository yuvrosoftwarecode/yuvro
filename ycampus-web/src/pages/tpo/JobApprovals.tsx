import React, { useState, useEffect } from "react";
import RoleHeader from "../../components/common/RoleHeader";
import RoleSidebar from "../../components/common/RoleSidebar";
import { Building2, MapPin, Search, AlertTriangle, Star, CheckCircle2, XCircle, ExternalLink, Globe, Layout, Clock, User, Phone, Mail, CheckCircle, Pause } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { jobApplicationService, JobApplication } from "@/services/jobApplicationService";

const VIOLET = 'hsl(249, 60%, 69%)';
const TEAL = 'hsl(165, 64%, 50%)';

const APPROVAL_JOBS = [
    {
        id: "1",
        status: "pending",
        role_title: "Systems Engineer",
        role_description: "Backend development and systems scaling. Responsible for maintaining infrastructure and optimizing cloud resource usage.",
        location: "Pune",
        ctc_total: 500000,
        ctc_fixed: 450000,
        ctc_variable: 50000,
        deadline: "2026-03-04T00:00:00Z",
        vacancies: 20,
        min_cgpa: 6.5,
        ai_risk_level: "low",
        eligible_branches: ["CSE", "IT", "ECE"],
        skills_required: ["Python", "Django", "SQL"],
        selection_rounds: ["Online Test", "Interview"],
        bond_details: "2 Years",
        recruiter: {
            name: "Priya Patel",
            company_name: "Infosys",
            company_industry: "IT Services",
            company_location: "Bangalore",
            email: "priya@infosys.com",
            phone: "+91 98765 43211",
            designation: "Campus Lead",
            is_verified: true,
            trust_score: 78,
            rating: 3.8,
            company_website: "https://www.infosys.com",
        },
    },
    {
        id: "2",
        status: "approved",
        role_title: "Junior Developer",
        role_description: "Frontend development focusing on React and modern UI libraries. Creating responsive and performant user interfaces.",
        location: "Hyderabad",
        ctc_total: 450000,
        ctc_fixed: 400000,
        ctc_variable: 50000,
        deadline: "2026-03-09T00:00:00Z",
        vacancies: 15,
        min_cgpa: 7.0,
        ai_risk_level: "medium",
        eligible_branches: ["CSE", "IT", "ECE"],
        skills_required: ["React", "Tailwind", "JS"],
        selection_rounds: ["Coding Test", "Technical Round"],
        bond_details: "None",
        recruiter: { 
            name: "Rahul Singh", 
            company_name: "Wipro",
            company_industry: "IT Services",
            company_location: "Chennai",
            email: "rahul@wipro.com",
            phone: "+91 98765 43212",
            designation: "HR Manager",
            is_verified: true,
            trust_score: 82,
            rating: 4.1,
            company_website: "https://www.wipro.com",
        },
    },
    {
        id: "3",
        status: "approved",
        role_title: "Software Engineer",
        role_description: "Full stack development across distributed systems. Solving complex algorithmic problems and building scalable cloud services.",
        location: "Mumbai",
        ctc_total: 600000,
        ctc_fixed: 550000,
        ctc_variable: 50000,
        deadline: "2026-03-14T00:00:00Z",
        vacancies: 10,
        min_cgpa: 6.0,
        ai_risk_level: "low",
        eligible_branches: ["CSE", "IT", "ECE", "MECH"],
        skills_required: ["Java", "Spring Boot", "AWS"],
        selection_rounds: ["Aptitude", "Technical", "HR"],
        bond_details: "1 Year",
        recruiter: { 
            name: "Amit Kumar", 
            company_name: "TCS",
            company_industry: "Consulting",
            company_location: "Mumbai",
            email: "amit.k@tcs.com",
            phone: "+91 98765 43213",
            designation: "Talent Acquisition",
            is_verified: true,
            trust_score: 85,
            rating: 4.0,
            company_website: "https://www.tcs.com",
        },
    },
    {
        id: "4",
        status: "approved",
        role_title: "SDE Intern",
        role_description: "Work on cutting-edge features in search and advertising algorithms. Mentorship from senior engineering staff.",
        location: "Bangalore",
        ctc_total: 2000000,
        ctc_fixed: 1800000,
        ctc_variable: 200000,
        deadline: "2026-02-27T00:00:00Z",
        vacancies: 5,
        min_cgpa: 8.5,
        ai_risk_level: "low",
        eligible_branches: ["CSE", "IT"],
        skills_required: ["C++", "Data Structures", "Algorithms"],
        selection_rounds: ["Coding Challenge", "3x Technical Interview"],
        bond_details: "None",
        recruiter: { 
            name: "Sarah Chen", 
            company_name: "Google",
            company_industry: "Technology",
            company_location: "Hyderabad",
            email: "schen@google.com",
            phone: "+1 650 253 0001",
            designation: "University Recruiter",
            is_verified: true,
            trust_score: 98,
            rating: 4.9,
            company_website: "https://careers.google.com",
        },
    },
    {
        id: "5",
        status: "approved",
        role_title: "Cloud Consultant",
        role_description: "Architecting enterprise solutions for Azure environments. Driving digital transformation for global clients.",
        location: "Hyderabad",
        ctc_total: 1200000,
        ctc_fixed: 1000000,
        ctc_variable: 200000,
        deadline: "2026-03-20T00:00:00Z",
        vacancies: 12,
        min_cgpa: 7.5,
        ai_risk_level: "medium",
        eligible_branches: ["CSE", "IT", "ECE"],
        skills_required: ["Azure", "Kubernetes", "DevOps"],
        selection_rounds: ["Cloud Quiz", "Technical Deep-dive", "Values Round"],
        bond_details: "None",
        recruiter: { 
            name: "John Smith", 
            company_name: "Microsoft",
            company_industry: "Technology",
            company_location: "Gurugram",
            email: "jsmith@microsoft.com",
            phone: "+1 425 882 8080",
            designation: "HR Lead",
            is_verified: true,
            trust_score: 95,
            rating: 4.8,
            company_website: "https://microsoft.com",
        },
    },
    {
        id: "6",
        status: "approved",
        role_title: "Full Stack Developer",
        role_description: "Build web applications using Next.js, Tailwind, and Supabase. Fast-paced startup environment with high ownership.",
        location: "Delhi",
        ctc_total: 800000,
        ctc_fixed: 750000,
        ctc_variable: 50000,
        deadline: "2026-02-22T00:00:00Z",
        vacancies: 8,
        min_cgpa: 6.5,
        ai_risk_level: "high",
        eligible_branches: ["CSE", "IT"],
        skills_required: ["Next.js", "TypeScript", "Prisma"],
        selection_rounds: ["Take-home Assignment", "Review Call"],
        bond_details: "None",
        recruiter: { 
            name: "Karan Johar", 
            company_name: "TechStartup Inc",
            company_industry: "Fintech",
            company_location: "Noida",
            email: "karan@techstartup.io",
            phone: "+91 99999 88888",
            designation: "CTO",
            is_verified: false,
            trust_score: 65,
            rating: 3.5,
            company_website: "https://techstartup.io",
        },
    }
];

const JobApprovals: React.FC = () => {
    const [activeTab, setActiveTab] = useState("approved");
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [loadingApps, setLoadingApps] = useState(false);
    const [actionType, setActionType] = useState<string | null>(null);

    const tabs = ["pending", "approved", "rejected", "hold", "all"];

    const filteredJobs =
        activeTab === "all"
            ? APPROVAL_JOBS
            : APPROVAL_JOBS.filter((j) => j.status === activeTab);

    useEffect(() => {
        if (selectedJob) {
            fetchApplications(selectedJob.id);
        }
    }, [selectedJob]);

    const fetchApplications = async (jobId: string) => {
        setLoadingApps(true);
        try {
            const data = await jobApplicationService.getJobApplications(jobId);
            setApplications(data || []);
        } catch (error) {
            console.error("Error fetching applications:", error);
            setApplications([
                { id: "app_1", applicant_name: "Aditya Verma", applicant_email: "aditya.v@student.edu", status: "under_review", applied_at: new Date().toISOString() } as any,
                { id: "app_2", applicant_name: "Sneha Reddy", applicant_email: "sneha.r@student.edu", status: "under_review", applied_at: new Date().toISOString() } as any,
            ]);
        } finally {
            setLoadingApps(false);
        }
    };

    const handleUpdateAppStatus = async (appId: string, status: string) => {
        try {
            await jobApplicationService.updateApplicationStatus(appId, status);
            toast.success(`Application ${status === 'shortlisted' ? 'approved' : 'rejected'} successfully`);
            if (selectedJob) fetchApplications(selectedJob.id);
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    return (
        <div className="flex h-screen bg-[hsl(240,20%,98.5%)]">
            <RoleSidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <RoleHeader title="Job Approvals" subtitle="" />

                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                                Job Approvals
                            </h1>

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
                                            <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tight">
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
                            {selectedJob.status === 'pending' && (
                                <div className="flex gap-3 pt-2">
                                    <Button className="flex-1 rounded-xl" style={{ background: TEAL }} onClick={() => setActionType('approve')}>
                                        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                                    </Button>
                                    <Button className="flex-1 rounded-xl" variant="destructive" onClick={() => setActionType('reject')}>
                                        <XCircle className="h-4 w-4 mr-1" /> Reject
                                    </Button>
                                    <Button className="flex-1 rounded-xl" variant="outline" onClick={() => setActionType('hold')}>
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
                                                        <Badge className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${app.status === 'shortlisted' || app.status === 'selected'
                                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                : 'bg-red-50 text-red-600 border-red-100'
                                                            }`}>
                                                            {app.status}
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