import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Calendar, DollarSign, FileText, ExternalLink, User, MapPin, Clock, Building2, Filter, Download, Search, Eye, X, AlertTriangle } from 'lucide-react';
import { jobService, Job } from '../../services/jobService';
import { jobApplicationService, JobApplication } from '../../services/jobApplicationService';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import { toast } from 'sonner';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('JobApplicants Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              We encountered an error while loading the applicants. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const JobApplicants: React.FC = () => {
  return (
    <ErrorBoundary>
      <JobApplicantsContent />
    </ErrorBoundary>
  );
};

const JobApplicantsContent: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadJobDetails();
      loadApplications();
    }
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      const jobData = await jobService.getJob(jobId!);
      setJob(jobData);
    } catch (error) {
      console.error('Error fetching job details:', error);
      toast.error('Failed to load job details');
    }
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      const applicationsData = await jobApplicationService.getJobApplications(jobId!);
      console.log('Applications data received:', applicationsData);
      
      // Ensure we have a valid array of applications
      const apps = applicationsData?.applications || applicationsData || [];
      setApplications(Array.isArray(apps) ? apps : []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
      setApplications([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId: string, newStatus: string) => {
    try {
      await jobApplicationService.updateApplicationStatus(applicationId, newStatus);
      toast.success('Application status updated');
      loadApplications(); // Refresh the list
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-700 border-gray-200';
    
    switch (status) {
      case 'under_review': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'shortlisted': return 'bg-green-100 text-green-700 border-green-200';
      case 'interview_scheduled': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'selected': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string | null | undefined) => {
    if (!status) return 'Unknown';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredApplications = applications.filter(app => {
    const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;
    const matchesSearch = searchQuery === '' || 
      (app.applicant_name && app.applicant_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.applicant_email && app.applicant_email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const statusOptions = [
    { value: 'under_review', label: 'Under Review' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'interview_scheduled', label: 'Interview Scheduled' },
    { value: 'selected', label: 'Selected' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const headerActions = (
    <>
      <button
        onClick={() => navigate('/recruiter/jobs')}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Jobs</span>
      </button>
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader
              title="Job Applicants"
              subtitle="Loading..."
              actions={headerActions}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading applications...</p>
              </div>
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
            title={`Applicants for ${job?.title || 'Job'}`}
            subtitle={`${job?.company?.name || 'Company'} • ${filteredApplications.length} applications`}
            actions={headerActions}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Job Summary Card */}
            {job && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{job.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-1" />
                        {job.company?.name || 'Unknown Company'}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {(job.locations && job.locations.length > 0) ? job.locations.join(', ') : (job.is_remote ? 'Remote' : 'Not specified')}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {job.employment_type ? job.employment_type.charAt(0).toUpperCase() + job.employment_type.slice(1).replace('-', ' ') : 'Not specified'}
                      </div>
                    </div>
                    {job.skills && job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {job.skills.map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{applications.length}</div>
                    <div className="text-sm text-gray-600">Total Applications</div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters and Search */}
            <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filter by status:</span>
                  </div>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Applications</option>
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search applicants..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    {filteredApplications.length} of {applications.length} applications
                  </div>
                </div>
              </div>
            </div>

            {/* Applications List */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {filteredApplications.length === 0 ? (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
                  <p className="text-gray-600">
                    {selectedStatus === 'all'
                      ? 'No one has applied to this job yet.'
                      : `No applications with status "${getStatusText(selectedStatus)}".`
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredApplications.map((application) => (
                    <div key={application.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {(application.applicant_name && application.applicant_name.charAt(0)) || '?'}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{application.applicant_name || 'Unknown Applicant'}</h3>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Mail className="h-4 w-4 mr-1" />
                                  {application.applicant_email || 'No email provided'}
                                </div>
                                {application.applied_at && (
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    Applied {new Date(application.applied_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            {application.expected_salary && (
                              <div className="flex items-center text-sm text-gray-600">
                                <DollarSign className="h-4 w-4 mr-2" />
                                <span>Expected: {application.expected_salary} {application.expected_currency}</span>
                              </div>
                            )}
                            {application.available_from && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="h-4 w-4 mr-2" />
                                <span>Available: {new Date(application.available_from).toLocaleDateString()}</span>
                              </div>
                            )}
                            {application.notice_period_days && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 mr-2" />
                                <span>Notice: {application.notice_period_days} days</span>
                              </div>
                            )}
                            {application.portfolio_url && (
                              <div className="flex items-center text-sm text-gray-600">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                <a
                                  href={application.portfolio_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  Portfolio
                                </a>
                              </div>
                            )}
                          </div>

                          {application.cover_letter && (
                            <div className="mb-4">
                              <div className="flex items-center mb-2">
                                <FileText className="h-4 w-4 mr-2 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Cover Letter</span>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-sm text-gray-700 line-clamp-3">{application.cover_letter}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-3 ml-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(application.status || '')}`}>
                            {getStatusText(application.status)}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedApplication(application);
                                setShowApplicationModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                const email = application.applicant_email;
                                if (email) {
                                  window.open(`mailto:${email}`, '_blank');
                                } else {
                                  toast.error('No email address available');
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Send Email"
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                          </div>

                          <select
                            value={application.status || 'under_review'}
                            onChange={(e) => handleStatusUpdate(application.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {statusOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Application Details Modal */}
      {showApplicationModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Application Details</h2>
              <button
                onClick={() => setShowApplicationModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Applicant Info */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                  {(selectedApplication.applicant_name && selectedApplication.applicant_name.charAt(0)) || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedApplication.applicant_name || 'Unknown Applicant'}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {selectedApplication.applicant_email || 'No email provided'}
                    </div>
                    {selectedApplication.applied_at && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Applied {new Date(selectedApplication.applied_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Application Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {selectedApplication.expected_salary && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Expected Salary</span>
                    </div>
                    <p className="text-gray-900">{selectedApplication.expected_salary} {selectedApplication.expected_currency}</p>
                  </div>
                )}
                
                {selectedApplication.available_from && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Available From</span>
                    </div>
                    <p className="text-gray-900">{new Date(selectedApplication.available_from).toLocaleDateString()}</p>
                  </div>
                )}
                
                {selectedApplication.notice_period_days && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Notice Period</span>
                    </div>
                    <p className="text-gray-900">{selectedApplication.notice_period_days} days</p>
                  </div>
                )}
                
                {selectedApplication.portfolio_url && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <ExternalLink className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Portfolio</span>
                    </div>
                    <a
                      href={selectedApplication.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 break-all"
                    >
                      {selectedApplication.portfolio_url}
                    </a>
                  </div>
                )}
              </div>

              {/* Cover Letter */}
              {selectedApplication.cover_letter && (
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <FileText className="h-5 w-5 mr-2 text-gray-500" />
                    <span className="text-lg font-medium text-gray-900">Cover Letter</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedApplication.cover_letter}</p>
                  </div>
                </div>
              )}

              {/* Status Update */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Current Status:</span>
                    <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedApplication.status || '')}`}>
                      {getStatusText(selectedApplication.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedApplication.status || 'under_review'}
                      onChange={(e) => {
                        handleStatusUpdate(selectedApplication.id, e.target.value);
                        setSelectedApplication({...selectedApplication, status: e.target.value as any});
                      }}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const email = selectedApplication.applicant_email;
                        if (email) {
                          window.open(`mailto:${email}`, '_blank');
                        } else {
                          toast.error('No email address available');
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      Send Email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobApplicants;