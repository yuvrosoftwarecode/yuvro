import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Eye, Briefcase, MapPin, Clock } from "lucide-react";
import { jobService, Job } from "../../services/jobService";
import RoleSidebar from "../../components/common/RoleSidebar";
import RoleHeader from "../../components/common/RoleHeader";
import SearchBar from "../../components/common/SearchBar";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'paused': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };


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
            {/* Tab Navigation */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => handleTabChange('pending')}
                    disabled={loading}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      selectedTab === 'pending'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Pending Approval
                    {jobs.length > 0 && (
                      <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        selectedTab === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {jobs.filter(j => j.status === 'draft' || j.status === 'paused').length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleTabChange('approved')}
                    disabled={loading}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      selectedTab === 'approved'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Approved Jobs
                    {approvedJobs.length > 0 && (
                      <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        selectedTab === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {approvedJobs.filter(j => j.status === 'active').length}
                      </span>
                    )}
                  </button>
                </nav>
              </div>
            </div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {selectedTab === 'pending' ? (
                <>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Pending Approval</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-yellow-600">{filteredJobs.length}</div>
                      <Clock className="h-8 w-8 text-yellow-600" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Draft Jobs</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-blue-600">{jobs.filter(j => j.status === 'draft').length}</div>
                      <Briefcase className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Paused Jobs</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-orange-600">{jobs.filter(j => j.status === 'paused').length}</div>
                      <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-full">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Total Approved</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-green-600">{approvedJobs.length}</div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Active Jobs</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-orange-600">{approvedJobs.filter(j => j.status === 'active').length}</div>
                      <Briefcase className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
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
            {filteredJobs.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedTab === 'pending' ? 'No jobs pending approval' : 'No approved jobs found'}
                </h3>
                <p className="text-gray-600">
                  {searchQuery 
                    ? 'No jobs match your search criteria.' 
                    : selectedTab === 'pending' 
                      ? 'All jobs have been reviewed.' 
                      : 'No jobs have been approved yet.'
                  }
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Job Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Salary
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
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
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{job.company.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-900">
                              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                              {job.locations.join(', ') || (job.is_remote ? 'Remote' : 'Not specified')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {job.min_salary && job.max_salary
                              ? `${job.min_salary}-${job.max_salary} ${job.currency}`
                              : job.min_salary
                                ? `${job.min_salary}+ ${job.currency}`
                                : job.max_salary
                                  ? `Up to ${job.max_salary} ${job.currency}`
                                  : 'Not specified'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showJobDetails && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedJob.title}</h2>
                  <p className="text-sm text-gray-600">{selectedJob.company.name}</p>
                </div>
                <button
                  onClick={() => setShowJobDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <XCircle className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Job Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Job Description</h3>
                <div className="prose max-w-none text-gray-700">
                  {selectedJob.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-2">{paragraph}</p>
                  ))}
                </div>
              </div>

              {/* Job Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Employment Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Type:</span> {selectedJob.employment_type}</div>
                    <div><span className="font-medium">Experience:</span> {selectedJob.experience_min_years}-{selectedJob.experience_max_years || '+'} years</div>
                    <div><span className="font-medium">Education:</span> {selectedJob.education_level}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Location & Compensation</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Location:</span> {selectedJob.locations.join(', ') || 'Not specified'}</div>
                    <div><span className="font-medium">Remote:</span> {selectedJob.is_remote ? 'Yes' : 'No'}</div>
                    <div><span className="font-medium">Salary:</span> {selectedJob.min_salary && selectedJob.max_salary
                      ? `${selectedJob.min_salary}-${selectedJob.max_salary} ${selectedJob.currency}`
                      : 'Not specified'}</div>
                  </div>
                </div>
              </div>

              {selectedJob.skills.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.map((skill, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => setShowJobDetails(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {selectedTab === 'pending' ? (
                <>
                  <button
                    onClick={() => handleRejectJob(selectedJob.id)}
                    disabled={actionLoading === selectedJob.id}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    {actionLoading === selectedJob.id ? 'Rejecting...' : 'Reject Job'}
                  </button>
                  <button
                    onClick={() => handleApproveJob(selectedJob.id)}
                    disabled={actionLoading === selectedJob.id}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {actionLoading === selectedJob.id ? 'Approving...' : 'Approve & Publish'}
                  </button>
                </>
              ) : (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">This job is approved and active</span>
                </div>
              )}
            </div>
          </div>
        </div>
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
                <button
                  onClick={cancelRejectJob}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
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