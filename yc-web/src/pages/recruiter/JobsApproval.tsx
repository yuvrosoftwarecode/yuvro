import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Eye, Briefcase, MapPin, Clock } from "lucide-react";
import { jobService, Job } from "../../services/jobService";
import StatusBadge from "../../components/common/StatusBadge";
import JobDetailsViewer from "../../components/common/recruiter/JobDetailsViewer";
import RoleSidebar from "../../components/common/RoleSidebar";
import RoleHeader from "../../components/common/RoleHeader";
import SearchBar from "../../components/common/SearchBar";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { DataTable } from "../../components/common/DataTable";
import { StatsCard } from "../../components/common/StatsCard";

const JobsApproval: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [approvedJobs, setApprovedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved'>('pending');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [jobToReject, setJobToReject] = useState<Job | null>(null);

  const allowedEmails = ['recruiter@yuvro.com', 'recruiter_admin@yuvro.com', 'admin@yuvro.com'];
  const hasJobsApprovalAccess = user?.email && allowedEmails.includes(user.email);

  if (!hasJobsApprovalAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader
              title="Jobs Approval"
              subtitle="Review and approve job postings"
            />
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-red-600 mb-4">
                  <XCircle className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-lg font-medium">Access Denied</p>
                  <p className="text-sm text-gray-600 mt-1">
                    You don't have permission to access Jobs Approval.
                  </p>
                </div>
                <button
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    console.log('Jobs state updated:', jobs.length, 'jobs');
  }, [jobs]);

  useEffect(() => {
    console.log('Approved jobs state updated:', approvedJobs.length, 'approved jobs');
  }, [approvedJobs]);

  useEffect(() => {
    console.log('Selected tab changed to:', selectedTab);
  }, [selectedTab]);

  const loadApprovedJobs = useCallback(async () => {
    console.log('=== loadApprovedJobs called ===');

    try {
      setError(null);

      console.log('About to call jobService.getAllJobs() for approved jobs');
      const data = await jobService.getAllJobs();
      console.log('API call completed. Data received:', data);

      if (Array.isArray(data)) {
        const activeJobs = data.filter(job => job.status === 'active');
        console.log('Setting approved jobs state with data:', activeJobs);
        setApprovedJobs(activeJobs);
        console.log('Approved jobs state set successfully');
      } else {
        console.error('API returned non-array data:', data);
        setError('Invalid data format received from server');
      }

    } catch (error) {
      console.error('=== ERROR in loadApprovedJobs ===');
      console.error('Error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');

      const errorMessage = error instanceof Error ? error.message : 'Failed to load approved jobs';
      setError(errorMessage);
      toast.error('Failed to load approved jobs: ' + errorMessage);
    }
  }, []);

  const loadPendingJobs = useCallback(async () => {
    console.log('=== loadPendingJobs called ===');

    try {
      setError(null);

      console.log('About to call jobService.getPendingJobs()');
      const data = await jobService.getPendingJobs();
      console.log('API call completed. Data received:', data);
      console.log('Number of jobs:', data?.length || 0);

      if (Array.isArray(data)) {
        console.log('Setting jobs state with data:', data);
        setJobs(data);
        console.log('Jobs state set successfully');
      } else {
        console.error('API returned non-array data:', data);
        setError('Invalid data format received from server');
      }

    } catch (error) {
      console.error('=== ERROR in loadPendingJobs ===');
      console.error('Error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      const errorMessage = error instanceof Error ? error.message : 'Failed to load pending jobs';
      setError(errorMessage);
      toast.error('Failed to load pending jobs: ' + errorMessage);
    }
  }, []);

  const handleTabChange = async (tab: 'pending' | 'approved') => {
    setSelectedTab(tab);
    setLoading(true);
    setSearchQuery('');

    try {
      if (tab === 'pending') {
        await loadPendingJobs();
      } else {
        await loadApprovedJobs();
      }
    } catch (error) {
      console.error('Error changing tab:', error);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    console.log('=== JobsApproval useEffect triggered ===');

    const loadInitialData = async () => {
      setLoading(true);
      try {
        if (selectedTab === 'pending') {
          await loadPendingJobs();
        } else {
          await loadApprovedJobs();
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleApproveJob = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    try {
      setActionLoading(jobId);
      const response = await jobService.approveJob(jobId);

      toast.success(response.message || 'Job approved and published successfully');

      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));

      await loadApprovedJobs();

      setTimeout(() => {
        toast.info('The approved job is now available in the "Approved Jobs" tab and in the main Jobs page under "Active" status.');
      }, 1000);

      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(null);
        setShowJobDetails(false);
      }

    } catch (error: any) {
      console.error('Error approving job:', error);

      const errorMessage = error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to approve job';
      toast.error(errorMessage);

      if (selectedTab === 'pending') {
        loadPendingJobs();
      } else {
        loadApprovedJobs();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectJob = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    setJobToReject(job);
    setShowRejectModal(true);
  };

  const confirmRejectJob = async () => {
    if (!jobToReject) return;

    try {
      setActionLoading(jobToReject.id);
      const response = await jobService.rejectJob(jobToReject.id);

      toast.success(response.message || 'Job rejected successfully');

      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobToReject.id));

      if (selectedJob && selectedJob.id === jobToReject.id) {
        setSelectedJob(null);
        setShowJobDetails(false);
      }

      setShowRejectModal(false);
      setJobToReject(null);

    } catch (error: any) {
      console.error('Error rejecting job:', error);

      const errorMessage = error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to reject job';
      toast.error(errorMessage);

      if (selectedTab === 'pending') {
        loadPendingJobs();
      } else {
        loadApprovedJobs();
      }
    } finally {
      setActionLoading(null);
    }
  };

  const cancelRejectJob = () => {
    setShowRejectModal(false);
    setJobToReject(null);
  };

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  const currentJobs = selectedTab === 'pending' ? jobs : approvedJobs;

  const filteredJobs = currentJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedTab === 'pending') {
      const isPendingApproval = job.status === 'draft' || job.status === 'paused';
      return isPendingApproval && matchesSearch;
    } else {
      const isApproved = job.status === 'active';
      return isApproved && matchesSearch;
    }
  });




  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader
              title="Jobs Approval"
              subtitle="Review and approve job postings"
            />
            <div className="flex items-center justify-center h-64">
              {error ? (
                <div className="text-center">
                  <div className="text-red-600 mb-4">
                    <XCircle className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-lg font-medium">Failed to load Jobs Approval</p>
                    <p className="text-sm text-gray-600 mt-1">{error}</p>
                  </div>
                  <button
                    onClick={() => {
                      setLoading(true);
                      if (selectedTab === 'pending') {
                        loadPendingJobs().finally(() => setLoading(false));
                      } else {
                        loadApprovedJobs().finally(() => setLoading(false));
                      }
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="text-gray-600">Loading jobs approval...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader
            title="Jobs Approval"
            subtitle="Review and approve job postings before they go live"
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Tabs value={selectedTab} onValueChange={(v: any) => handleTabChange(v)} className="mb-6">
              <TabsList className="inline-flex w-auto gap-1">
                <TabsTrigger value="pending" className="px-5">
                  Pending Approval
                  {jobs.length > 0 && (
                    <span className="ml-2 py-0.5 px-2 rounded-full text-xs opacity-70">
                      {jobs.filter(j => j.status === 'draft' || j.status === 'paused').length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="px-5">
                  Approved Jobs
                  {approvedJobs.length > 0 && (
                    <span className="ml-2 py-0.5 px-2 rounded-full text-xs opacity-70">
                      {approvedJobs.filter(j => j.status === 'active').length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {selectedTab === 'pending' ? (
                <>
                  <StatsCard
                    label="Pending Approval"
                    value={filteredJobs.length}
                    icon={Clock}
                    colorScheme="amber"
                    size="md"
                  />
                  <StatsCard
                    label="Draft Jobs"
                    value={jobs.filter(j => j.status === 'draft').length}
                    icon={Briefcase}
                    colorScheme="blue"
                    size="md"
                  />
                  <StatsCard
                    label="Paused Jobs"
                    value={jobs.filter(j => j.status === 'paused').length}
                    icon={Clock}
                    colorScheme="orange"
                    size="md"
                  />
                </>
              ) : (
                <div className="col-span-3 grid grid-cols-2 gap-4">
                  <StatsCard
                    label="Total Approved"
                    value={approvedJobs.length}
                    icon={CheckCircle}
                    colorScheme="green"
                    size="md"
                  />
                  <StatsCard
                    label="Active Jobs"
                    value={approvedJobs.filter(j => j.status === 'active').length}
                    icon={Briefcase}
                    colorScheme="orange"
                    size="md"
                  />
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <SearchBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  placeholder="Search jobs by title, company, or skills..."
                />
              </div>
            </div>

            {/* Jobs List */}
            <DataTable
              title={selectedTab === 'pending' ? 'Pending Jobs' : 'Approved Jobs'}
              description={`${filteredJobs.length} job(s) found`}
              data={filteredJobs}
              columns={[
                {
                  header: 'Job Details',
                  cell: (job) => (
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900">{job.title}</div>
                      </div>
                      <div className="text-sm text-gray-500">{job.employment_type.charAt(0).toUpperCase() + job.employment_type.slice(1).replace('-', ' ')}</div>
                      {job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {job.skills.slice(0, 3).map((skill, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              +{job.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  header: 'Company',
                  cell: (job) => <div className="text-sm text-gray-900">{job.company.name}</div>
                },
                {
                  header: 'Location',
                  cell: (job) => (
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {job.locations.join(', ') || (job.is_remote ? 'Remote' : 'Not specified')}
                    </div>
                  )
                },
                {
                  header: 'Salary',
                  cell: (job) => (
                    <div className="text-sm text-gray-900">
                      {job.min_salary && job.max_salary
                        ? `${job.min_salary}-${job.max_salary} ${job.currency}`
                        : job.min_salary
                          ? `${job.min_salary}+ ${job.currency}`
                          : job.max_salary
                            ? `Up to ${job.max_salary} ${job.currency}`
                            : 'Not specified'
                      }
                    </div>
                  )
                },
                {
                  header: 'Status',
                  cell: (job) => <StatusBadge status={job.status} />
                },
                {
                  header: 'Actions',
                  cell: (job) => (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewJob(job)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {selectedTab === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApproveJob(job.id)}
                            disabled={actionLoading === job.id}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Approve Job"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRejectJob(job.id)}
                            disabled={actionLoading === job.id}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Reject Job"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center text-sm text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="font-medium">Approved & Active</span>
                        </div>
                      )}
                    </div>
                  )
                }
              ]}
              keyExtractor={(item) => item.id}
              emptyState={{
                message: selectedTab === 'pending' ? 'No jobs pending approval' : 'No approved jobs found',
                subMessage: searchQuery
                  ? 'No jobs match your search criteria.'
                  : selectedTab === 'pending'
                    ? 'All jobs have been reviewed.'
                    : 'No jobs have been approved yet.'
              }}
            />
          </div>
        </div>
      </div>

      {showJobDetails && selectedJob && (
        <JobDetailsViewer
          job={selectedJob}
          onClose={() => setShowJobDetails(false)}
          actions={
            selectedTab === 'pending' ? (
              <>
                <button
                  onClick={() => handleRejectJob(selectedJob.id)}
                  disabled={actionLoading === selectedJob.id}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === selectedJob.id ? 'Rejecting...' : 'Reject Job'}
                </button>
                <button
                  onClick={() => handleApproveJob(selectedJob.id)}
                  disabled={actionLoading === selectedJob.id}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === selectedJob.id ? 'Approving...' : 'Approve & Publish'}
                </button>
              </>
            ) : (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">This job is approved and active</span>
              </div>
            )
          }
        />
      )}

      {/* Custom Rejection Confirmation Modal */}
      {showRejectModal && jobToReject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Reject Job</h3>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  Are you sure you want to reject "<span className="font-medium">{jobToReject.title}</span>"?
                  This action cannot be undone and the job will be moved to the rejected status.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="ghost"
                  onClick={cancelRejectJob}
                >
                  Cancel
                </Button>
                <button
                  onClick={confirmRejectJob}
                  disabled={actionLoading === jobToReject.id}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === jobToReject.id ? 'Rejecting...' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobsApproval;