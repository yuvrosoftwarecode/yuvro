import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatusBadge from '@/components/common/StatusBadge';
import { ArrowLeft, Mail, Calendar, DollarSign, FileText, ExternalLink, User, MapPin, Clock, Building2, Filter, Download, Search, Eye, X, AlertTriangle, Award, CheckCircle2, XCircle, Code, ShieldAlert, Check, Loader2, Link as LinkIcon } from 'lucide-react';
import ProctoringSessionViewer from '../../components/common/instructor/ProctoringSessionViewer';
import { jobService, Job } from '../../services/jobService';
import { jobApplicationService, JobApplication } from '../../services/jobApplicationService';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import SearchBar from '../../components/common/SearchBar';
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
  const [activeTab, setActiveTab] = useState<'info' | 'assessment'>('info');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [invitingAppId, setInvitingAppId] = useState<string | null>(null);
  const [copiedAppId, setCopiedAppId] = useState<string | null>(null);

  const [showProctoringViewer, setShowProctoringViewer] = useState(false);
  const [testSubmission, setTestSubmission] = useState<any>(null);

  // Mirrors the URL the backend emails out: {origin}/job-test/{application.id}
  const buildAssessmentUrl = (applicationId: string) =>
    `${window.location.origin}/job-test/${applicationId}`;

  const handleCopyAssessmentLink = async (applicationId: string) => {
    const url = buildAssessmentUrl(applicationId);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedAppId(applicationId);
      toast.success('Assessment link copied to clipboard');
      setTimeout(() => {
        setCopiedAppId(prev => (prev === applicationId ? null : prev));
      }, 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopiedAppId(applicationId);
        toast.success('Assessment link copied to clipboard');
        setTimeout(() => {
          setCopiedAppId(prev => (prev === applicationId ? null : prev));
        }, 2000);
      } catch {
        toast.error('Failed to copy link');
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const handleSendInvitations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAppIds.length === 0 && !inviteEmails.trim()) {
      toast.error('Please select at least one applicant or enter at least one email address.');
      return;
    }

    setIsInviting(true);
    try {
      const emailList = inviteEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      const response = await jobService.inviteAssessment(jobId!, selectedAppIds, emailList);
      toast.success(response.message || 'Invitations sent successfully!');
      setShowInviteModal(false);
      setInviteEmails('');
      setSelectedAppIds([]);
      loadApplications();
    } catch (error: any) {
      console.error('Error sending invitations:', error);
      toast.error(error.response?.data?.error || 'Failed to send invitations.');
    } finally {
      setIsInviting(false);
    }
  };

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

  const fetchSubmissionData = async (applicationId: string) => {
    try {
      // Create an endpoint in backend to fetch job test submission details for this application
      // Using jobApplicationService to fetch the test_submission
      const response = await jobApplicationService.getTestSubmission(applicationId);
      setTestSubmission(response.submission);
    } catch (error) {
      console.error('Error fetching test submission:', error);
      toast.error('Failed to load test submission details');
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

  const handleSendIndividualInvitation = async (applicationId: string) => {
    setInvitingAppId(applicationId);
    try {
      const response = await jobService.inviteAssessment(jobId!, [applicationId], []);
      toast.success(response.message || 'Invitation sent successfully!');
      loadApplications(); // Refresh the list
    } catch (error: any) {
      console.error('Error sending individual invitation:', error);
      toast.error(error.response?.data?.error || 'Failed to send invitation.');
    } finally {
      setInvitingAppId(null);
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
    { value: 'screening_test_completed', label: 'Screening Test Completed' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'interview_scheduled', label: 'Interview Scheduled' },
    { value: 'selected', label: 'Selected' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const headerActions = (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setShowInviteModal(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-semibold shadow-sm text-sm"
      >
        <Mail className="h-4 w-4" />
        <span>Invite Candidates</span>
      </button>
      <button
        onClick={() => navigate('/recruiter/jobs')}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Jobs</span>
      </button>
    </div>
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
            <div className="px-6 py-6">
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
      <div className="flex overflow-hidden">
        <RoleSidebar />
      {showProctoringViewer && selectedApplication ? (
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
          <RoleHeader
            title={`${selectedApplication.applicant_name || 'Candidate'} - Analytics`}
            subtitle={job?.title || 'Job Test'}
            actions={
              <button onClick={() => setShowProctoringViewer(false)} className="flex items-center gap-2 px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            }
          />
          <div className="flex-1 overflow-y-auto p-6 relative">
            <div className="max-w-7xl mx-auto h-full">
              {testSubmission ? (
                <ProctoringSessionViewer submission={testSubmission} />
              ) : (
                <div className="flex items-center justify-center h-full min-h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  <span className="ml-3 text-gray-500">Loading session details...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 h-screen overflow-y-auto">
          <RoleHeader
            title={`Applicants for ${job?.title || 'Job'}`}
            subtitle={`${job?.company?.name || 'Company'} • ${filteredApplications.length} applications`}
            actions={headerActions}
          />

          <div className="px-6 py-6">
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

            {/* Header Metrics Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Total Candidates */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Candidates</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">{applications.length}</div>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                  <User className="w-5 h-5" />
                </div>
              </div>

              {/* Invitations Sent */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Invitations Sent</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {applications.filter(app => app.screening_responses?.invited_at || app.screening_responses?.submitted_at).length}
                  </div>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                  <Mail className="w-5 h-5" />
                </div>
              </div>

              {/* Assessments Completed */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {applications.filter(app => app.screening_responses?.submitted_at).length}
                  </div>
                </div>
                <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              {/* Pending Assessments */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending (Not Started)</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {applications.filter(app => app.screening_responses?.invited_at && !app.screening_responses?.submitted_at).length}
                  </div>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

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
                  <SearchBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    placeholder="Search applicants..."
                  />
                  <div className="text-sm text-gray-600">
                    {filteredApplications.length} of {applications.length} applications
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Candidates Action Bar */}
            {selectedAppIds.length > 0 && (
              <div className="mb-6 bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top duration-200">
                <div className="text-sm font-semibold text-orange-850">
                  {selectedAppIds.length} candidate(s) selected
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedAppIds([])}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    Invite to Job Assessment
                  </button>
                </div>
              </div>
            )}            {/* Applications Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-gray-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4 w-12">
                          <input
                            type="checkbox"
                            checked={filteredApplications.length > 0 && selectedAppIds.length === filteredApplications.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAppIds(filteredApplications.map(app => app.id));
                              } else {
                                setSelectedAppIds([]);
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-6 py-4">Candidate</th>
                        <th className="px-6 py-4">Applied Date</th>
                        <th className="px-6 py-4">Job Assessment</th>
                        <th className="px-6 py-4">Mock Interview</th>
                        <th className="px-6 py-4">Application Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm text-slate-700">
                      {filteredApplications.map((application) => {
                        const invitedAt = application.screening_responses?.invited_at;
                        const submittedAt = application.screening_responses?.submitted_at;
                        const score = application.screening_responses?.score;
                        const totalMarks = application.screening_responses?.total_marks;

                        return (
                          <tr key={application.id} className="hover:bg-slate-50/50 transition-colors">
                            {/* Checkbox column */}
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedAppIds.includes(application.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAppIds(prev => [...prev, application.id]);
                                  } else {
                                    setSelectedAppIds(prev => prev.filter(id => id !== application.id));
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                              />
                            </td>

                            {/* Candidate column */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                                  {(application.applicant_name && application.applicant_name.charAt(0)) || '?'}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-800 block">
                                    {application.applicant_name || 'Unknown Applicant'}
                                  </span>
                                  <span className="text-xs text-slate-400 block font-mono">
                                    {application.applicant_email || 'No email'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Applied Date column */}
                            <td className="px-6 py-4 text-slate-500">
                              {application.applied_at ? new Date(application.applied_at).toLocaleDateString() : '—'}
                            </td>

                            {/* Job Assessment (Test) column */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2.5">
                                {submittedAt ? (
                                  <button
                                    onClick={() => {
                                      setSelectedApplication(application);
                                      setActiveTab('assessment');
                                      setShowApplicationModal(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors shadow-sm cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Completed ({score ?? 0}/{totalMarks ?? 0})
                                  </button>
                                ) : !invitedAt ? (
                                  <>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                      Not Sent
                                    </span>
                                    <button
                                      onClick={() => handleSendIndividualInvitation(application.id)}
                                      disabled={invitingAppId !== null}
                                      className="px-2 py-1 text-xs font-bold text-orange-600 border border-orange-200 hover:bg-orange-50 rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-60 flex items-center gap-1"
                                    >
                                      {invitingAppId === application.id ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin text-orange-600" />
                                          <span>Sending...</span>
                                        </>
                                      ) : (
                                        <span>Send Test</span>
                                      )}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      <Clock className="w-3.5 h-3.5" />
                                      Pending
                                    </span>
                                    <button
                                      onClick={() => handleSendIndividualInvitation(application.id)}
                                      disabled={invitingAppId !== null}
                                      className="text-xs font-semibold text-orange-600 hover:underline cursor-pointer disabled:opacity-60 flex items-center gap-1"
                                    >
                                      {invitingAppId === application.id ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin text-orange-600" />
                                          <span>Resending...</span>
                                        </>
                                      ) : (
                                        <span>Resend</span>
                                      )}
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleCopyAssessmentLink(application.id)}
                                  title={buildAssessmentUrl(application.id)}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                >
                                  {copiedAppId === application.id ? (
                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                  ) : (
                                    <LinkIcon className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Mock Interview column */}
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Not Scheduled
                              </span>
                            </td>

                            {/* Status dropdown column */}
                            <td className="px-6 py-4">
                              <select
                                value={application.status || 'under_review'}
                                onChange={(e) => handleStatusUpdate(application.id, e.target.value)}
                                className="text-xs font-medium border border-gray-300 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-700 shadow-sm"
                              >
                                {statusOptions.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Actions column */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedApplication(application);
                                    setShowApplicationModal(true);
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 shadow-sm"
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                {(application.status === 'screening_test_completed' || 
                                  (application.screening_responses && 
                                   application.screening_responses.score !== undefined)) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedApplication(application);
                                      setTestSubmission(null);
                                      setShowProctoringViewer(true);
                                      fetchSubmissionData(application.id);
                                    }}
                                    className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-100 shadow-sm"
                                    title="View Assessment"
                                  >
                                    <Award className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    const email = application.applicant_email;
                                    if (email) {
                                      window.open(`mailto:${email}`, '_blank');
                                    } else {
                                      toast.error('No email address available');
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100 shadow-sm cursor-pointer"
                                  title="Send Email"
                                >
                                  <Mail className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Application Details Modal */}
      {showApplicationModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-[90%] max-h-[90vh] overflow-y-auto">
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

              {/* Tab Selector */}
              {selectedApplication.screening_responses && selectedApplication.screening_responses.submitted_at && (
                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 ${
                      activeTab === 'info' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Candidate Info
                  </button>
                  <button
                    onClick={() => setActiveTab('assessment')}
                    className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 ${
                      activeTab === 'assessment' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Job Assessment
                  </button>
                </div>
              )}

              {(!selectedApplication.screening_responses?.submitted_at || activeTab === 'info') ? (
                <>
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
                </>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Assessment Score</span>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-2xl font-bold text-orange-905">
                          {selectedApplication.screening_responses?.score ?? 0}
                        </span>
                        <span className="text-sm text-orange-750">
                          / {selectedApplication.screening_responses?.total_marks ?? 0}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-xs font-semibold text-slate-505 uppercase tracking-wider">Test Status</span>
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Completed
                        </span>
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Proctoring Flags</span>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-2xl font-bold text-red-905">
                          {(selectedApplication.screening_responses?.proctoring_events ?? []).filter(
                            (e: any) => e.activity_type.includes('switched') || e.activity_type.includes('blur') || e.activity_type.includes('detected')
                          ).length}
                        </span>
                        <span className="text-sm text-red-700">switches / blurs</span>
                      </div>
                    </div>
                  </div>

                  {/* Submission Breakdown */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 border-b border-gray-100 pb-2">Questions & Candidate Answers</h3>
                    {Object.keys(selectedApplication.screening_responses?.graded_results || {}).length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No answer results found.</p>
                    ) : (
                      Object.keys(selectedApplication.screening_responses.graded_results).map((key, index) => {
                        const qResult = selectedApplication.screening_responses.graded_results[key];
                        return (
                          <div key={key} className="border border-slate-150 rounded-xl p-5 bg-white space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <span className="text-sm font-bold text-slate-800">Q{index + 1}: {qResult.question_title || 'Question'}</span>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{qResult.question_type?.replace('_', ' ') || 'Screening'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {qResult.is_correct ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                    <Check className="w-3 h-3" /> Correct
                                  </span>
                                ) : qResult.question_type?.startsWith('mcq') ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <XCircle className="w-3 h-3" /> Incorrect
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    Submitted
                                  </span>
                                )}
                                <span className="text-xs font-semibold text-slate-505">
                                  {qResult.score} / {qResult.max_marks} Marks
                                </span>
                              </div>
                            </div>

                            {qResult.question_content && (
                              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 prose prose-sm max-w-none">
                                <span className="font-semibold block mb-1">Description:</span>
                                <div dangerouslySetInnerHTML={{ __html: qResult.question_content }} />
                              </div>
                            )}

                            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto relative">
                              <span className="text-[10px] uppercase font-bold text-slate-400 absolute top-2 right-3">Candidate Response</span>
                              <pre className="mt-2 whitespace-pre-wrap">
                                {typeof qResult.user_answer === 'object' 
                                  ? JSON.stringify(qResult.user_answer, null, 2) 
                                  : qResult.user_answer || 'No response recorded.'}
                              </pre>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Proctoring Logs Section */}
                  <div className="space-y-4 pt-4 border-t border-gray-150">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                      Proctoring Violation Log
                    </h3>
                    <div className="border border-slate-150 rounded-xl overflow-hidden">
                      {!(selectedApplication.screening_responses?.proctoring_events) || selectedApplication.screening_responses.proctoring_events.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-500 italic bg-slate-50">
                          No proctoring violation logs recorded. The candidate remained fully on the exam page.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-150 max-h-60 overflow-y-auto bg-white">
                          {selectedApplication.screening_responses.proctoring_events
                            .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                            .map((event: any, idx: number) => {
                              const isViolation = event.activity_type.includes('switched') || event.activity_type.includes('blur') || event.activity_type.includes('detected');
                              return (
                                <div key={idx} className={`p-3 text-xs flex justify-between items-center ${isViolation ? 'bg-rose-50/50' : ''}`}>
                                  <div className="space-y-1">
                                    <span className={`font-semibold ${isViolation ? 'text-red-700' : 'text-slate-700'}`}>
                                      {event.activity_type.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                    {event.meta_data?.key && (
                                      <span className="block text-[10px] text-slate-400">Action Key: {event.meta_data.key}</span>
                                    )}
                                    {event.meta_data?.copied_text && (
                                      <span className="block text-[10px] text-red-600 bg-red-50 p-1.5 rounded font-mono mt-1 max-w-md break-all">
                                        Copied: "{event.meta_data.copied_text}"
                                      </span>
                                    )}
                                    {event.meta_data?.pasted_text && (
                                      <span className="block text-[10px] text-red-600 bg-red-50 p-1.5 rounded font-mono mt-1 max-w-md break-all">
                                        Pasted: "{event.meta_data.pasted_text}"
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-slate-400">
                                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status Update */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Current Status:</span>
                    <StatusBadge status={selectedApplication.status || ''} className="ml-2" />
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedApplication.status || 'under_review'}
                      onChange={(e) => {
                        handleStatusUpdate(selectedApplication.id, e.target.value);
                        setSelectedApplication({ ...selectedApplication, status: e.target.value as any });
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

      {/* Invite Candidates Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full relative overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Top decorative bar */}
            <div className="h-1.5 bg-orange-600 w-full" />
            
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-slate-900">Invite Candidates to Job Assessment</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"
                disabled={isInviting}
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSendInvitations} className="p-6 space-y-6">
              {selectedAppIds.length > 0 && (
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-sm text-orange-800">
                  <span className="font-semibold">{selectedAppIds.length}</span> candidate(s) currently selected from the list.
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Enter candidate email(s)
                </label>
                <textarea
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  placeholder="candidate1@example.com, candidate2@example.com"
                  className="w-full h-32 p-3 text-sm rounded-xl border border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all resize-none"
                  disabled={isInviting}
                />
                <span className="text-xs text-slate-400 block mt-2">
                  Separate multiple emails with commas. If a candidate doesn't have an account, one will be created and temporary password credentials sent.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium"
                  disabled={isInviting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-md transition-all text-sm flex items-center gap-2 disabled:opacity-60"
                  disabled={isInviting}
                >
                  Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobApplicants;