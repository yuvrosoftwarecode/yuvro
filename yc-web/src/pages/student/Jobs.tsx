import { useState, useEffect } from 'react';
import { Search, Filter, BookmarkIcon, FileText, Eye, TrendingUp, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import Navigation from '@/components/common/Navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Footer from '@/components/common/Footer';
import SearchBar from '@/components/common/SearchBar';

import { jobService, Job } from '@/services/jobService';
import { JobApplicationData } from '@/services/jobApplicationService';
import JobCard from '@/components/student/jobs/JobCard';
import ApplicationCard from '@/components/student/jobs/ApplicationCard';
import ApplyJobDialog from '@/components/student/jobs/ApplyJobDialog';
import EmptyState from '@/components/student/jobs/EmptyState';
import useJobApplications from '@/hooks/useJobApplications';

interface JobFilters {
  location: string[];
  experienceLevel: string[];
  jobType: string[];
  salaryRange: string[];
}

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 9;

  // Use the custom hook for job applications
  const {
    myApplications,
    bookmarks,
    bookmarkedJobs,
    appliedJobs,
    userJobStatus,
    bookmarkLoading,
    handleBookmarkJob,
    handleApplyToJob
  } = useJobApplications();

  const [filters, setFilters] = useState<JobFilters>({
    location: [],
    experienceLevel: [],
    jobType: [],
    salaryRange: [],
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [jobs, searchQuery, filters]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const jobsData = await jobService.getAllJobs();
      const activeJobs = (jobsData || []).filter(job => job && job.status === 'active');
      setJobs(activeJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = jobs;

    if (searchQuery) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (filters.location.length > 0) {
      filtered = filtered.filter(job => {
        if (filters.location.includes('Remote') && job.is_remote) return true;
        if (filters.location.includes('Hybrid') && job.locations.length > 0 && job.is_remote) return true;
        if (filters.location.includes('Onsite') && job.locations.length > 0 && !job.is_remote) return true;
        return job.locations.some(loc =>
          filters.location.some(filterLoc =>
            loc.toLowerCase().includes(filterLoc.toLowerCase())
          )
        );
      });
    }

    if (filters.experienceLevel.length > 0) {
      filtered = filtered.filter(job => {
        if (filters.experienceLevel.includes('Fresher') && job.experience_min_years === 0) return true;
        if (filters.experienceLevel.includes('0-2 yrs') && job.experience_min_years <= 2) return true;
        if (filters.experienceLevel.includes('2-5 yrs') && job.experience_min_years >= 2 && job.experience_min_years <= 5) return true;
        if (filters.experienceLevel.includes('5+ yrs') && job.experience_min_years >= 5) return true;
        return false;
      });
    }

    if (filters.jobType.length > 0) {
      filtered = filtered.filter(job =>
        filters.jobType.some(type =>
          job.employment_type.toLowerCase().replace('-', ' ') === type.toLowerCase()
        )
      );
    }

    if (filters.salaryRange.length > 0) {
      filtered = filtered.filter(job => {
        if (!job.min_salary) return false;
        return filters.salaryRange.some(range => {
          switch (range) {
            case '0-5':
              return job.min_salary! <= 500000;
            case '5-10':
              return job.min_salary! >= 500000 && job.min_salary! <= 1000000;
            case '10-15':
              return job.min_salary! >= 1000000 && job.min_salary! <= 1500000;
            case '15-25':
              return job.min_salary! >= 1500000 && job.min_salary! <= 2500000;
            case '25+':
              return job.min_salary! >= 2500000;
            default:
              return true;
          }
        });
      });
    }

    setFilteredJobs(filtered);
    setFilteredJobs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

  const toggleFilter = (filterType: keyof JobFilters, value: string) => {
    setFilters(prev => {
      const currentFilter = prev[filterType];
      if (Array.isArray(currentFilter)) {
        const newFilter = currentFilter.includes(value)
          ? currentFilter.filter(item => item !== value)
          : [...currentFilter, value];
        return { ...prev, [filterType]: newFilter };
      }
      return prev;
    });
  };

  const clearAllFilters = () => {
    setFilters({
      location: [],
      experienceLevel: [],
      jobType: [],
      salaryRange: [],
    });
  };

  const handleApplyClick = (job: Job) => {
    setSelectedJob(job);
    setApplyDialogOpen(true);
  };

  const handleApplySubmit = async (applicationData: JobApplicationData) => {
    try {
      await handleApplyToJob(applicationData);
      setApplyDialogOpen(false);
      toast.success(`Successfully applied to ${selectedJob?.title}`);
    } catch (error) {
      toast.error('Failed to apply to job. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading job opportunities...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="min-h-screen bg-gray-50/50">
        <div className="px-6 py-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar - Hidden by default on large screens */}
            <div className={`lg:w-80 ${showFilters ? 'block' : 'hidden'}`}>
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Clear All Filters
                  </button>
                </div>

                {/* Location Filter */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Location</h4>
                  <div className="space-y-2">
                    {['Remote', 'Hybrid', 'Onsite'].map(location => (
                      <label key={location} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.location.includes(location)}
                          onChange={() => toggleFilter('location', location)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{location}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Experience Level Filter */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Experience Level</h4>
                  <div className="space-y-2">
                    {['Fresher', '0-2 yrs', '2-5 yrs', '5+ yrs'].map(level => (
                      <label key={level} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.experienceLevel.includes(level)}
                          onChange={() => toggleFilter('experienceLevel', level)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Job Type Filter */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Job Type</h4>
                  <div className="space-y-2">
                    {['Full-time', 'Part-time', 'Contract', 'Internship'].map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.jobType.includes(type)}
                          onChange={() => toggleFilter('jobType', type)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Salary Range Filter */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Salary Range (LPA)</h4>
                  <div className="space-y-2">
                    {[
                      { value: '0-5', label: '0-5 LPA' },
                      { value: '5-10', label: '5-10 LPA' },
                      { value: '10-15', label: '10-15 LPA' },
                      { value: '15-25', label: '15-25 LPA' },
                      { value: '25+', label: '25+ LPA' }
                    ].map(range => (
                      <label key={range.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.salaryRange.includes(range.value)}
                          onChange={() => toggleFilter('salaryRange', range.value)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{range.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Save Filters Button */}
                <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                  <BookmarkIcon className="h-4 w-4" />
                  Save Filters
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <TabsList className="inline-flex w-auto gap-1">
                    <TabsTrigger value="all" className="px-5">All Jobs</TabsTrigger>
                    <TabsTrigger value="bookmarks" className="px-5">Bookmarks ({bookmarks.length})</TabsTrigger>
                    <TabsTrigger value="applications" className="px-5">Applications ({myApplications.length})</TabsTrigger>
                  </TabsList>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Filter className="h-4 w-4" />
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </button>
                </div>

                {/* All Jobs Tab */}
                <TabsContent value="all" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentJobs.map((job) => {
                      const jobStatus = userJobStatus[job.id] || { is_bookmarked: false, is_applied: false };
                      const isBookmarked = jobStatus.is_bookmarked || bookmarkedJobs.has(job.id);
                      const isApplied = jobStatus.is_applied || appliedJobs.has(job.id);

                      return (
                        <div key={job.id} className="relative">
                          {/* Bookmarked indicator for recently bookmarked jobs */}
                          {isBookmarked && (
                            <div className="absolute top-4 right-4 z-10">
                              <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 animate-pulse">
                                <BookmarkIcon className="h-3 w-3 fill-current" />
                                Saved
                              </div>
                            </div>
                          )}
                          <JobCard
                            job={job}
                            isBookmarked={isBookmarked}
                            isApplied={isApplied}
                            onBookmark={handleBookmarkJob}
                            onApply={handleApplyClick}
                            bookmarkLoading={bookmarkLoading.has(job.id)}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Premium Pagination Controls */}
                  {filteredJobs.length > jobsPerPage && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 py-6 border-t border-gray-100">
                      <div className="text-sm text-gray-500 font-medium order-2 sm:order-1">
                        Showing <span className="text-gray-900">{indexOfFirstJob + 1}</span> to <span className="text-gray-900">{Math.min(indexOfLastJob, filteredJobs.length)}</span> of <span className="text-gray-900">{filteredJobs.length}</span> jobs
                      </div>

                      <div className="flex items-center gap-1 order-1 sm:order-2">
                        <Button
                          variant="ghost"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="h-9 w-9 p-0 rounded-xl hover:bg-white hover:shadow-sm"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {/* Page Numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                          // Shorthand for simple pagination
                          const isNear = pageNum >= currentPage - 1 && pageNum <= currentPage + 1;
                          const isEnds = pageNum === 1 || pageNum === totalPages;

                          if (totalPages <= 7 || isNear || isEnds) {
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "ghost"}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`h-9 w-9 p-0 rounded-xl transition-all duration-200 font-semibold ${currentPage === pageNum
                                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
                                  : "text-gray-600 hover:bg-white hover:shadow-sm"
                                  }`}
                              >
                                {pageNum}
                              </Button>
                            );
                          } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                            return <span key={pageNum} className="text-gray-400 px-1 select-none">...</span>;
                          }
                          return null;
                        })}

                        <Button
                          variant="ghost"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="h-9 w-9 p-0 rounded-xl hover:bg-white hover:shadow-sm"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {filteredJobs.length === 0 && !loading && (
                    <EmptyState
                      title="No jobs found"
                      description="Try adjusting your search criteria or filters to find more opportunities."
                      actionText="Clear Filters"
                      onAction={clearAllFilters}
                    />
                  )}
                </TabsContent>

                {/* Bookmarks Tab */}
                <TabsContent value="bookmarks" className="space-y-4">
                  {bookmarks.map((application) => (
                    <div key={application.id} className="relative">
                      {/* Bookmarked indicator */}
                      <div className="absolute top-4 right-4 z-10">
                        <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <BookmarkIcon className="h-3 w-3 fill-current" />
                          Saved
                        </div>
                      </div>
                      <JobCard
                        job={application.job}
                        isBookmarked={application.is_bookmarked}
                        isApplied={application.is_applied}
                        onBookmark={handleBookmarkJob}
                        onApply={handleApplyClick}
                        showBookmarkDate={true}
                        bookmarkDate={application.created_at}
                        bookmarkLoading={bookmarkLoading.has(application.job.id)}
                      />
                    </div>
                  ))}
                  {bookmarks.length === 0 && (
                    <EmptyState
                      title="No bookmarked jobs"
                      description="Start bookmarking jobs you're interested in to see them here."
                      actionText="Browse Jobs"
                      onAction={() => setActiveTab('all')}
                    />
                  )}
                </TabsContent>

                {/* Applications Tab */}
                <TabsContent value="applications" className="space-y-4">
                  {myApplications.map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                    />
                  ))}
                  {myApplications.length === 0 && (
                    <EmptyState
                      title="No applications yet"
                      description="Start applying to jobs to track your applications here."
                      actionText="Browse Jobs"
                      onAction={() => setActiveTab('all')}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Dialog */}
      <ApplyJobDialog
        isOpen={applyDialogOpen}
        onClose={() => setApplyDialogOpen(false)}
        job={selectedJob}
        onSubmit={handleApplySubmit}
      />
      {/* <Footer /> */}
    </div>
  );
};

export default Jobs;