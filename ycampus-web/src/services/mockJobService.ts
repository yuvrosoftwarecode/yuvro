import { JobApplication } from "./jobApplicationService";

export interface MockJob {
    id: string;
    status: string;
    role_title: string;
    role_description: string;
    location: string;
    ctc_total: number;
    ctc_fixed: number;
    ctc_variable: number;
    deadline: string;
    vacancies: number;
    min_cgpa: number;
    ai_risk_level: string;
    eligible_branches: string[];
    skills_required: string[];
    selection_rounds: string[];
    bond_details: string;
    recruiter: {
        name: string;
        company_name: string;
        company_industry: string;
        company_location: string;
        email: string;
        phone: string;
        designation: string;
        is_verified: boolean;
        trust_score: number;
        rating: number;
        company_website: string;
    };
    apps: {
        count: number;
        shortlisted: number;
        interview: number;
        selected: number;
    };
}

const STORAGE_KEY = 'ycampus_mock_jobs_v4';

const DEFAULT_JOBS: MockJob[] = [
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
        apps: { count: 0, shortlisted: 0, interview: 0, selected: 0 },
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
        apps: { count: 18, shortlisted: 18, interview: 0, selected: 5 },
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
        apps: { count: 12, shortlisted: 12, interview: 0, selected: 0 },
    },
    {
        id: "4",
        status: "hold",
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
        apps: { count: 0, shortlisted: 0, interview: 0, selected: 0 },
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
        apps: { count: 22, shortlisted: 22, interview: 0, selected: 10 },
    },
    {
        id: "6",
        status: "pending",
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
        apps: { count: 0, shortlisted: 0, interview: 0, selected: 0 },
    }
];

const DEFAULT_APPLICATIONS: Record<string, any[]> = {
    "1": [],
    "2": [
        { id: "app2_1", applicant_name: "Aditya Verma", applicant_email: "aditya.v@student.edu", status: "under_review", applied_at: new Date().toISOString() },
        { id: "app2_2", applicant_name: "Sneha Reddy", applicant_email: "sneha.r@student.edu", status: "under_review", applied_at: new Date().toISOString() },
    ],
    "3": [
        { id: "app3_1", applicant_name: "Vikram Shah", applicant_email: "vikram@student.edu", status: "under_review", applied_at: new Date().toISOString() },
    ],
    "4": [],
    "5": [
        { id: "app5_1", applicant_name: "Arjun Rao", applicant_email: "arjun@student.edu", status: "under_review", applied_at: new Date().toISOString() },
    ],
    "6": []
};

class MockJobService {
    private jobs: MockJob[] = [];
    private applications: Record<string, any[]> = {};

    constructor() {
        this.loadData();
    }

    private loadData() {
        if (typeof window === 'undefined') return;

        const savedJobs = localStorage.getItem(STORAGE_KEY + '_jobs');
        const savedApps = localStorage.getItem(STORAGE_KEY + '_apps');

        if (savedJobs && savedApps) {
            this.jobs = JSON.parse(savedJobs);
            this.applications = JSON.parse(savedApps);
        } else {
            this.jobs = JSON.parse(JSON.stringify(DEFAULT_JOBS));
            this.applications = JSON.parse(JSON.stringify(DEFAULT_APPLICATIONS));
            this.saveData();
        }
    }

    private saveData() {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEY + '_jobs', JSON.stringify(this.jobs));
        localStorage.setItem(STORAGE_KEY + '_apps', JSON.stringify(this.applications));
    }

    public getJobs(): MockJob[] {
        return this.jobs;
    }

    public getApprovalJobs(): MockJob[] {
        return this.jobs;
    }

    public getLiveJobs(): MockJob[] {
        return this.jobs.filter(j => j.status === 'approved');
    }

    public getJobById(id: string): MockJob | null {
        return this.jobs.find(j => j.id === id) || null;
    }

    public mapToJob(mockJob: MockJob): any {
        return {
            id: mockJob.id,
            title: mockJob.role_title,
            description: mockJob.role_description,
            company: {
                id: mockJob.id + "_comp",
                name: mockJob.recruiter.company_name,
                website: mockJob.recruiter.company_website,
                description: mockJob.recruiter.company_industry,
            },
            locations: [mockJob.location],
            is_remote: mockJob.location.toLowerCase().includes('remote'),
            min_salary: mockJob.ctc_total / 100000,
            max_salary: (mockJob.ctc_total + mockJob.ctc_variable) / 100000,
            currency: 'INR',
            skills: mockJob.skills_required,
            employment_type: 'full-time',
            experience_min_years: 0,
            status: mockJob.status === 'approved' ? 'active' : 'inactive',
            posted_at: new Date().toISOString(),
        };
    }

    public getApplications(jobId: string): any[] {
        return this.applications[jobId] || [];
    }

    public async updateApplicationStatus(jobId: string, appId: string, status: string): Promise<void> {
        const jobApps = this.applications[jobId];
        if (!jobApps) return;

        const appIdx = jobApps.findIndex(a => a.id === appId);
        if (appIdx === -1) return;

        const oldStatus = jobApps[appIdx].status;
        jobApps[appIdx].status = status;

        // If newly shortlisted (Placement Officer Approved), increment the count in the job object
        if (status === 'shortlisted' && oldStatus !== 'shortlisted') {
            const jobIdx = this.jobs.findIndex(j => j.id === jobId);
            if (jobIdx !== -1) {
                this.jobs[jobIdx].apps.count += 1;
            }
        } else if (oldStatus === 'shortlisted' && status !== 'shortlisted') {
            const jobIdx = this.jobs.findIndex(j => j.id === jobId);
            if (jobIdx !== -1) {
                this.jobs[jobIdx].apps.count -= 1;
            }
        }

        this.saveData();
    }

    public async updateJobStatus(jobId: string, status: string): Promise<void> {
        const jobIdx = this.jobs.findIndex(j => j.id === jobId);
        if (jobIdx === -1) return;

        this.jobs[jobIdx].status = status;
        this.saveData();
    }
}

export const mockJobService = new MockJobService();
