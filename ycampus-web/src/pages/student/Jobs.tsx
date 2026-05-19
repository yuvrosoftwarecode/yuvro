import React, { useState, useMemo } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JobCard } from '@/components/student/jobs/JobCard';
import { JobDetailView } from '@/components/student/jobs/JobDetailView';
import { JobFilters } from '@/components/student/jobs/JobFilters';
import { ApplyDialog } from '@/components/student/jobs/ApplyDialog';
import { Briefcase, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlacementJobs, useStudentApplications, useApplyToJob, PlacementJob } from '@/hooks/usePlacement';
import PageHeader from '@/components/common/PageHeader';

export interface StudentJob {
  id: string;
  companyName: string;
  companyType: 'Product' | 'Service' | 'Startup' | 'MNC' | 'IT Service & Consulting';
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
  bondDetails: string | null;
}

export interface StudentJobApplication {
  jobId: string;
  appliedDate: string;
  cgpa: number;
  previousOffers: boolean;
  highestCtc?: number;
  status: 'applied' | 'shortlisted' | 'interview' | 'selected' | 'rejected';
}

// Real data mapping
const mapToStudentJob = (j: PlacementJob): StudentJob => {
  const isDeadlinePassed = j.deadline ? new Date(j.deadline) < new Date() : false;
  const isExpiredStatus = j.status === 'closed' || j.status === 'expired';
  
  return {
    id:               j.id,
    companyName:      j.recruiter?.company_name || 'N/A',
    companyType:      (j.recruiter?.company_type || 'Product') as any, 
    role:             j.role_title,
    location:         j.location || 'N/A',
    ctcFixed:         j.ctc_fixed,
    ctcVariable:      j.ctc_variable,
    ctcTotal:         j.ctc_total,
    deadline:         j.deadline || new Date().toDateString(),
    eligibleBranches: j.eligible_branches || [],
    minCgpa:          j.min_cgpa,
    description:      j.role_description || '',
    requirements:     [`Minimum ${j.min_cgpa} CGPA`, `Eligible: ${j.eligible_branches?.join(', ')}`],
    skills:           j.skills_required || [],
    vacancies:        j.vacancies,
    selectionRounds:  j.selection_rounds || [],
    postedDate:       j.posted_date,
    status:           (j.status === 'approved' && !isDeadlinePassed) ? 'active' : 'expired',
    bondDetails:      j.bond_details || null,
  };
};

export default function StudentJobs() {
  const { user } = useAuth();
  const { data: allJobs = [], isLoading: jobsLoading } = usePlacementJobs();
  const { data: applications = [], isLoading: appsLoading } = useStudentApplications();
  const applyMutation = useApplyToJob();
  
  const [selectedJob, setSelectedJob] = useState<StudentJob | null>(null);
  const [applyJob, setApplyJob] = useState<StudentJob | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ctcRange, setCtcRange] = useState<[number, number]>([0, 5000000]);

  const studentDept = user?.department_name || '';

  // Helper to match abbreviations like 'CSE' to 'Computer Science'
  const isDeptMatch = (branch: string, studentDept: string) => {
    const b = branch.toLowerCase().trim();
    const s = studentDept.toLowerCase().trim();
    
    if (!b || !s) return false;
    if (b.includes(s) || s.includes(b)) return true;

    // Common abbreviations mapping
    const mappings: Record<string, string[]> = {
      'cse': ['computer science', 'software', 'cse'],
      'it': ['information technology', 'it'],
      'ece': ['electronics', 'communication', 'ece'],
      'eee': ['electrical', 'electronics', 'eee'],
      'me': ['mechanical', 'me'],
      'ce': ['civil', 'ce'],
      'aiml': ['machine learning', 'aiml', 'artificial intelligence'],
      'aids': ['data science', 'aids', 'artificial intelligence'],
    };

    // Check if any mapping for the branch matches the student dept
    for (const key in mappings) {
      if (b.includes(key)) {
        if (mappings[key].some(m => s.includes(m))) return true;
      }
    }
    
    return false;
  };

  // Filter jobs by student eligibility (Department)
  const eligibleJobsRaw = useMemo(() => {
    return allJobs
      .filter(j => {
        // Must be approved or closed/expired to be visible
        if (!['approved', 'closed', 'expired'].includes(j.status)) return false;

        // If no branches specified, assume all eligible
        if (!j.eligible_branches || j.eligible_branches.length === 0) return true;

        // Compare case-insensitive with student's department name
        return j.eligible_branches.some(b => isDeptMatch(b, studentDept));
      })
      .map(mapToStudentJob);
  }, [allJobs, studentDept]);

  // Deduplicate allJobs by ID to prevent count mismatches
  const uniqueAllJobs = useMemo(() => {
    const seen = new Set();
    return allJobs.filter(j => {
      if (seen.has(j.id)) return false;
      seen.add(j.id);
      return true;
    });
  }, [allJobs]);

  const isApplied = (jobId: string) => applications.some((a: any) => (a.job_id || a.job?.id) === jobId);

  // Applied jobs should be visible regardless of current status or eligibility
  const appliedJobs = uniqueAllJobs
    .filter(j => isApplied(j.id))
    .map(mapToStudentJob);

  const activeJobs = eligibleJobsRaw.filter(j => j.status === 'active' && !isApplied(j.id));
  const previousJobs = eligibleJobsRaw.filter(j => j.status === 'expired' && !isApplied(j.id));

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

  const handleApply = async (data: { cgpa: number; previousOffers: boolean; highestCtc?: number }) => {
    if (!applyJob) return;
    await applyMutation.mutateAsync({
      job_id: applyJob.id,
      cgpa: data.cgpa,
      status: 'applied'
    });
    setApplyJob(null);
  };

  const getApplication = (jobId: string): StudentJobApplication | undefined => {
    const app = applications.find((a: any) => (a.job_id || a.job?.id) === jobId);
    if (!app) return undefined;
    return {
      jobId: app.job_id || app.job?.id,
      appliedDate: app.created_at || app.applied_at,
      cgpa: app.cgpa || 0,
      previousOffers: false,
      status: app.status as any
    };
  };

  const isDeadlineApproaching = (deadline: string) => {
    try {
      const d = new Date(deadline);
      if (isNaN(d.getTime())) return false;
      const diff = d.getTime() - new Date().getTime();
      return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  };

  if (jobsLoading || appsLoading) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading opportunities...</p>
        </div>
      </StudentLayout>
    );
  }

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
        <ApplyDialog
          job={applyJob}
          open={!!applyJob}
          onClose={() => setApplyJob(null)}
          onSubmit={handleApply}
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Jobs" 
          subtitle="Discover opportunities and track your applications" 
        />

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
                {filterJobs(appliedJobs).length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="previous" className="data-[state=active]:bg-background">
              Previous Jobs
              <span className="ml-1.5 text-xs bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded-full">
                {filterJobs(previousJobs).length}
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
                {filterJobs(activeJobs).map((job, idx) => (
                  <JobCard
                    key={`${job.id}-${idx}`}
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
            {filterJobs(appliedJobs).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-medium">No applications yet</p>
                <p className="text-sm">Apply to active jobs to see them here</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filterJobs(appliedJobs).map((job, idx) => (
                  <JobCard
                    key={`${job.id}-${idx}`}
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
            {filterJobs(previousJobs).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-medium">No previous jobs</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filterJobs(previousJobs).map((job, idx) => (
                  <JobCard
                    key={`${job.id}-${idx}`}
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
