import React, { useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JobCard, StudentJob } from '@/components/student/jobs/JobCard';
import { JobDetailView } from '@/components/student/jobs/JobDetailView';
import { JobFilters } from '@/components/student/jobs/JobFilters';
import { ApplyDialog } from '@/components/student/jobs/ApplyDialog';
import { Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const dummyJobs: StudentJob[] = [
  {
    id: '1',
    companyName: 'TCS',
    companyType: 'Service',
    role: 'Software Developer',
    location: 'Mumbai, India',
    ctcTotal: 4.0,
    deadline: '15 Apr 2026',
    skills: ['CSE', 'IT', 'ECE']
  },
  {
    id: '2',
    companyName: 'Google',
    companyType: 'Product',
    role: 'SDE-1',
    location: 'Bangalore, India',
    ctcTotal: 24.0,
    deadline: '20 Apr 2026',
    skills: ['React', 'Node.js', 'System Design']
  },
  {
    id: '3',
    companyName: 'Zomato',
    companyType: 'Startup',
    role: 'Frontend Developer',
    location: 'Remote',
    ctcTotal: 18.0,
    deadline: '10 Apr 2026',
    skills: ['React', 'TypeScript', 'Tailwind']
  }
];

export const Jobs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [selectedJob, setSelectedJob] = useState<StudentJob | null>(null);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredJobs = dummyJobs.filter(job => {
    const matchesSearch = job.role.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         job.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = locationFilter === 'all' || job.location.includes(locationFilter);
    const matchesType = typeFilter === 'all' || job.companyType === typeFilter;
    return matchesSearch && matchesLocation && matchesType;
  });

  const handleApply = (job: StudentJob) => {
    setSelectedJob(job);
    setIsApplyDialogOpen(true);
  };

  const handleViewDetails = (job: StudentJob) => {
    setSelectedJob(job);
    setShowDetail(true);
  };

  const handleApplySubmit = (data: any) => {
    console.log('Application submitted:', data);
    toast.success('Application submitted successfully!');
    setIsApplyDialogOpen(false);
  };

  if (showDetail && selectedJob) {
    return (
      <StudentLayout>
        <JobDetailView 
          job={selectedJob} 
          onApply={handleApply} 
          onBack={() => setShowDetail(false)} 
        />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Opportunities</h1>
          <p className="text-gray-500">Find and apply for the best jobs curated for your profile.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b border-gray-200 w-full justify-start rounded-none h-auto p-0 mb-8">
            <TabsTrigger 
              value="active" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent text-gray-500 data-[state=active]:text-blue-600 px-8 py-4 font-semibold text-base transition-all"
            >
              Active Jobs
            </TabsTrigger>
            <TabsTrigger 
              value="applied" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent text-gray-500 data-[state=active]:text-blue-600 px-8 py-4 font-semibold text-base transition-all"
            >
              Applied Jobs
            </TabsTrigger>
            <TabsTrigger 
              value="previous" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent text-gray-500 data-[state=active]:text-blue-600 px-8 py-4 font-semibold text-base transition-all"
            >
              Previous Jobs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-0">
            <JobFilters 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              locationFilter={locationFilter}
              onLocationChange={setLocationFilter}
              typeFilter={typeFilter}
              onTypeChange={setTypeFilter}
            />

            <div className="mt-6">
              {filteredJobs.length > 0 ? (
                filteredJobs.map(job => (
                  <JobCard 
                    key={job.id} 
                    job={job} 
                    onViewDetails={handleViewDetails}
                    onApply={handleApply}
                  />
                ))
              ) : (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">No jobs found</h3>
                  <p className="text-gray-500">Try adjusting your filters or search query.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="applied" className="mt-0">
            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No applications yet</h3>
              <p className="text-gray-500">Start applying to jobs to track them here.</p>
            </div>
          </TabsContent>

          <TabsContent value="previous" className="mt-0">
            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No previous jobs</h3>
              <p className="text-gray-500">Your past job history will appear here.</p>
            </div>
          </TabsContent>
        </Tabs>

        <ApplyDialog 
          isOpen={isApplyDialogOpen}
          onClose={() => setIsApplyDialogOpen(false)}
          job={selectedJob}
          onSubmit={handleApplySubmit}
        />
      </div>
    </StudentLayout>
  );
};

export default Jobs;