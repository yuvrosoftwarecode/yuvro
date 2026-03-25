import React, { useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JobCard } from '@/components/student/jobs/JobCard';
import { JobDetailView } from '@/components/student/jobs/JobDetailView';
import { JobFilters } from '@/components/student/jobs/JobFilters';
import { ApplyDialog } from '@/components/student/jobs/ApplyDialog';
import { Briefcase } from 'lucide-react';

export interface StudentJob {
  id: string;
  companyName: string;
  companyType: 'Product' | 'Service' | 'Startup';
  role: string;
  location: string;
  ctcFixed: number;
  ctcVariable: number;
  ctcTotal: number;
  deadline: string;
  eligibleBranches: string[];
  minCgpa: number;
  description: string;
  requirements: string[];
  skills: string[];
  vacancies: number;
  selectionRounds: string[];
  postedDate: string;
  status: 'active' | 'expired';
}

export interface StudentJobApplication {
  jobId: string;
  appliedDate: string;
  cgpa: number;
  previousOffers: boolean;
  highestCtc?: number;
  status: 'applied' | 'shortlisted' | 'interview' | 'selected' | 'rejected';
}

const dummyJobs: StudentJob[] = [
  {
    id: '1', companyName: 'TCS', companyType: 'Service', role: 'Software Developer',
    location: 'Mumbai, India', ctcFixed: 350000, ctcVariable: 50000, ctcTotal: 400000,
    deadline: '2026-04-15', eligibleBranches: ['CSE', 'IT', 'ECE'], minCgpa: 6.5,
    description: 'Join TCS as a Software Developer and work on cutting-edge enterprise solutions for global clients. You will be part of an agile team delivering high-quality software.',
    requirements: ['B.Tech in CSE/IT/ECE', 'No active backlogs', 'Min 6.5 CGPA'],
    skills: ['Java', 'Python', 'SQL', 'Problem Solving'],
    vacancies: 50, selectionRounds: ['Aptitude', 'Technical', 'HR'],
    postedDate: '2026-03-10', status: 'active',
  },
  {
    id: '2', companyName: 'Infosys', companyType: 'Service', role: 'Systems Engineer',
    location: 'Bangalore, India', ctcFixed: 320000, ctcVariable: 30000, ctcTotal: 350000,
    deadline: '2026-04-20', eligibleBranches: ['CSE', 'IT', 'ECE', 'EEE'], minCgpa: 6.0,
    description: 'Infosys is hiring Systems Engineers for their digital transformation projects. Work with latest technologies and grow your career.',
    requirements: ['B.Tech any branch', 'No active backlogs'],
    skills: ['C++', 'Java', 'Cloud Computing'],
    vacancies: 100, selectionRounds: ['Online Test', 'Technical Interview', 'HR'],
    postedDate: '2026-03-12', status: 'active',
  },
  {
    id: '3', companyName: 'Razorpay', companyType: 'Product', role: 'Backend Engineer',
    location: 'Bangalore, India', ctcFixed: 1200000, ctcVariable: 300000, ctcTotal: 1500000,
    deadline: '2026-04-05', eligibleBranches: ['CSE', 'IT'], minCgpa: 7.5,
    description: 'Build payment infrastructure that powers millions of businesses. Work on high-scale distributed systems at Razorpay.',
    requirements: ['B.Tech CSE/IT', 'Strong DSA skills', 'Min 7.5 CGPA'],
    skills: ['Go', 'Python', 'Distributed Systems', 'Microservices'],
    vacancies: 5, selectionRounds: ['Coding Round', 'System Design', 'Technical', 'HR'],
    postedDate: '2026-03-08', status: 'active',
  },
  {
    id: '4', companyName: 'Zoho', companyType: 'Product', role: 'Member Technical Staff',
    location: 'Chennai, India', ctcFixed: 600000, ctcVariable: 100000, ctcTotal: 700000,
    deadline: '2026-04-10', eligibleBranches: ['CSE', 'IT', 'ECE'], minCgpa: 7.0,
    description: 'Join Zoho to build world-class SaaS products used by millions of businesses worldwide.',
    requirements: ['B.Tech CSE/IT/ECE', 'Strong programming fundamentals'],
    skills: ['Java', 'JavaScript', 'Problem Solving', 'Data Structures'],
    vacancies: 20, selectionRounds: ['Programming Round', 'Advanced Coding', 'Technical', 'HR'],
    postedDate: '2026-03-05', status: 'active',
  },
  {
    id: '5', companyName: 'Wipro', companyType: 'Service', role: 'Project Engineer',
    location: 'Hyderabad, India', ctcFixed: 300000, ctcVariable: 60000, ctcTotal: 360000,
    deadline: '2026-03-01', eligibleBranches: ['CSE', 'IT', 'ECE', 'ME'], minCgpa: 6.0,
    description: 'Wipro is hiring Project Engineers for their technology division.',
    requirements: ['B.Tech any branch', 'Min 6.0 CGPA'],
    skills: ['Java', '.NET', 'SQL'],
    vacancies: 80, selectionRounds: ['Aptitude', 'Technical', 'HR'],
    postedDate: '2026-02-15', status: 'expired',
  },
  {
    id: '6', companyName: 'Freshworks', companyType: 'Product', role: 'SDE Intern',
    location: 'Chennai, India', ctcFixed: 500000, ctcVariable: 100000, ctcTotal: 600000,
    deadline: '2026-02-20', eligibleBranches: ['CSE', 'IT'], minCgpa: 7.0,
    description: 'Freshworks is looking for talented interns to join their engineering team.',
    requirements: ['B.Tech CSE/IT', 'Min 7.0 CGPA'],
    skills: ['React', 'Node.js', 'Ruby on Rails'],
    vacancies: 10, selectionRounds: ['Coding', 'Technical', 'Cultural Fit'],
    postedDate: '2026-02-01', status: 'expired',
  },
];

const initialApplications: StudentJobApplication[] = [
  { jobId: '2', appliedDate: '2026-03-14', cgpa: 7.8, previousOffers: false, status: 'applied' },
];

export default function StudentJobs() {
  const [applications, setApplications] = useState<StudentJobApplication[]>(initialApplications);
  const [selectedJob, setSelectedJob] = useState<StudentJob | null>(null);
  const [applyJob, setApplyJob] = useState<StudentJob | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ctcRange, setCtcRange] = useState<[number, number]>([0, 2000000]);

  const isApplied = (jobId: string) => applications.some(a => a.jobId === jobId);

  const activeJobs = dummyJobs.filter(j => j.status === 'active' && !isApplied(j.id));
  const appliedJobs = dummyJobs.filter(j => isApplied(j.id));
  const previousJobs = dummyJobs.filter(j => j.status === 'expired');

  const filterJobs = (jobs: StudentJob[]) => {
    return jobs.filter(j => {
      const matchSearch = j.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchLocation = locationFilter === 'all' || j.location.toLowerCase().includes(locationFilter.toLowerCase());
      const matchType = typeFilter === 'all' || j.companyType === typeFilter;
      const matchCtc = j.ctcTotal >= ctcRange[0] && j.ctcTotal <= ctcRange[1];
      return matchSearch && matchLocation && matchType && matchCtc;
    });
  };

  const handleApply = (data: { cgpa: number; previousOffers: boolean; highestCtc?: number }) => {
    if (!applyJob) return;
    const newApp: StudentJobApplication = {
      jobId: applyJob.id,
      appliedDate: new Date().toISOString().split('T')[0],
      cgpa: data.cgpa,
      previousOffers: data.previousOffers,
      highestCtc: data.highestCtc,
      status: 'applied',
    };
    setApplications(prev => [...prev, newApp]);
    setApplyJob(null);
  };

  const getApplication = (jobId: string) => applications.find(a => a.jobId === jobId);

  const isDeadlineApproaching = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
  };

  if (selectedJob) {
    return (
      <StudentLayout>
        <JobDetailView
          job={selectedJob}
          isApplied={isApplied(selectedJob.id)}
          application={getApplication(selectedJob.id)}
          onBack={() => setSelectedJob(null)}
          onApply={() => setApplyJob(selectedJob)}
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">Discover opportunities and track your applications</p>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="active" className="data-[state=active]:bg-background">
              Active Jobs
              <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {filterJobs(activeJobs).length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="applied" className="data-[state=active]:bg-background">
              Applied Jobs
              <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {appliedJobs.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="previous" className="data-[state=active]:bg-background">
              Previous Jobs
              <span className="ml-1.5 text-xs bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded-full">
                {previousJobs.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <JobFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            locationFilter={locationFilter}
            onLocationChange={setLocationFilter}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
          />

          <TabsContent value="active" className="space-y-3">
            {filterJobs(activeJobs).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No active jobs found</p>
                <p className="text-sm">Check back later for new opportunities</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filterJobs(activeJobs).map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    variant="active"
                    deadlineApproaching={isDeadlineApproaching(job.deadline)}
                    onViewDetails={() => setSelectedJob(job)}
                    onApply={() => setApplyJob(job)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applied" className="space-y-3">
            {appliedJobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-medium">No applications yet</p>
                <p className="text-sm">Apply to active jobs to see them here</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {appliedJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    variant="applied"
                    application={getApplication(job.id)}
                    onViewDetails={() => setSelectedJob(job)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="previous" className="space-y-3">
            {previousJobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-medium">No previous jobs</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {previousJobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    variant="previous"
                    onViewDetails={() => setSelectedJob(job)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ApplyDialog
        job={applyJob}
        open={!!applyJob}
        onClose={() => setApplyJob(null)}
        onSubmit={handleApply}
      />
    </StudentLayout>
  );
}
