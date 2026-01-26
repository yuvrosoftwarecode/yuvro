import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash, Filter, Settings, FileText, Building2, Users, X, Briefcase, MapPin, DollarSign, Copy, CheckCircle, RefreshCw } from "lucide-react";
import { jobService, Job, Company } from "../../services/jobService";
import { jobApplicationService } from "../../services/jobApplicationService";

import RoleSidebar from "../../components/common/RoleSidebar";
import RoleHeader from "../../components/common/RoleHeader";
import QuestionBank from "../../components/common/QuestionBank";
import SearchBar from "../../components/common/SearchBar";
import { fetchQuestionById } from "../../services/questionService";
import { toast } from "sonner";

const Jobs: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [currentFormTab, setCurrentFormTab] = useState('details');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedQuestionsByType, setSelectedQuestionsByType] = useState({
    mcq_single: [] as string[],
    mcq_multiple: [] as string[],
    coding: [] as string[],
    descriptive: [] as string[]
  });
  const [randomQuestionsConfig, setRandomQuestionsConfig] = useState({
    mcq_single: 0,
    mcq_multiple: 0,
    coding: 0,
    descriptive: 0
  });
  const [formData, setFormData] = useState({
    title: "",
    company_id: "",
    description: "",
    employment_type: "full-time" as const,
    experience_min_years: 0,
    experience_max_years: undefined as number | undefined,
    locations: [] as string[],
    is_remote: false,
    min_salary: undefined as number | undefined,
    max_salary: undefined as number | undefined,
    currency: "INR" as const,
    skills: [] as string[],
    notice_period: undefined as number | undefined,
    education_level: "any" as const,
    status: "draft" as const,
    posted_at: undefined as string | undefined,
    expires_at: undefined as string | undefined,
  });



  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');

  const [jobsWithApplications, setJobsWithApplications] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);



  useEffect(() => {
    loadJobs();
    loadCompanies();
    loadJobsWithApplications();

    const interval = setInterval(() => {
      loadJobsWithApplications(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await jobService.getAllCompanies();
      setCompanies(data);
    } catch (error) {
      console.error("Error fetching companies:", error);
      setCompanies([]);
    }
  };

  const handleCompanySelect = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setFormData(prev => ({
        ...prev,
        company_id: company.id,
      }));
    }
  };

  const categorizeQuestionsByType = async (questionIds: string[]) => {
    if (questionIds.length === 0) {
      return {
        mcq_single: [],
        mcq_multiple: [],
        coding: [],
        descriptive: []
      };
    }

    try {
      const questionPromises = questionIds.map(id => fetchQuestionById(id));
      const questions = await Promise.all(questionPromises);

      const categorized = {
        mcq_single: [] as string[],
        mcq_multiple: [] as string[],
        coding: [] as string[],
        descriptive: [] as string[]
      };

      questions.forEach(question => {
        if (question.type === 'mcq_single') {
          categorized.mcq_single.push(question.id);
        } else if (question.type === 'mcq_multiple') {
          categorized.mcq_multiple.push(question.id);
        } else if (question.type === 'coding') {
          categorized.coding.push(question.id);
        } else if (question.type === 'descriptive') {
          categorized.descriptive.push(question.id);
        }
      });

      return categorized;
    } catch (error) {
      console.error('Failed to categorize questions:', error);
      return {
        mcq_single: questionIds,
        mcq_multiple: [],
        coding: [],
        descriptive: []
      };
    }
  };

  const handleQuestionsChange = async (questions: string[]) => {
    setSelectedQuestions(questions);
    const categorizedQuestions = await categorizeQuestionsByType(questions);
    setSelectedQuestionsByType(categorizedQuestions);
  };

  const loadJobs = async () => {
    try {
      const data = await jobService.getAllJobs();
      setJobs(data);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const loadJobsWithApplications = async (showLoading = false) => {
    try {
      if (showLoading) setIsRefreshing(true);
      const data = await jobApplicationService.getJobsWithApplications();
      setJobsWithApplications(data);
      console.log('Loaded jobs with applications:', data);
    } catch (error) {
      console.error("Error fetching jobs with applications:", error);
      toast.error("Failed to load application counts");
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  };

  const handleRefreshApplications = () => {
    loadJobsWithApplications(true);
    toast.success("Application data refreshed");
  };



  const getApplicationsCount = (jobId: string) => {
    const jobWithApps = jobsWithApplications.find(j => j.id === jobId);
    return jobWithApps?.applications_count || 0;
  };

  const openAddForm = () => {
    setIsEditing(false);
    setCurrentFormTab('details');
    setSelectedCompanyId("");
    setFormData({
      title: "",
      company_id: "",
      description: "",
      employment_type: "full-time",
      experience_min_years: 0,
      experience_max_years: undefined,
      locations: [],
      is_remote: false,
      min_salary: undefined,
      max_salary: undefined,
      currency: "INR",
      skills: [],
      notice_period: undefined,
      education_level: "any",
      status: "draft",
      posted_at: undefined,
      expires_at: undefined,
    });
    setSelectedQuestions([]);
    setSelectedQuestionsByType({
      mcq_single: [],
      mcq_multiple: [],
      coding: [],
      descriptive: []
    });
    setRandomQuestionsConfig({
      mcq_single: 0,
      mcq_multiple: 0,
      coding: 0,
      descriptive: 0
    });
    setShowJobForm(true);
  };

  const fillFromPreviousJob = (job: Job) => {
    setSelectedCompanyId(job.company.id);
    setFormData({
      title: job.title,
      company_id: job.company.id,
      description: job.description,
      employment_type: job.employment_type as "full-time",
      experience_min_years: job.experience_min_years,
      experience_max_years: job.experience_max_years,
      locations: job.locations,
      is_remote: job.is_remote,
      min_salary: job.min_salary,
      max_salary: job.max_salary,
      currency: job.currency as "INR",
      skills: job.skills,
      notice_period: job.notice_period,
      education_level: job.education_level as "any",
      status: "draft", 
      posted_at: undefined,
      expires_at: undefined,
    });

    const allQuestions = [
      ...(job.screening_questions_config?.mcq_single || []),
      ...(job.screening_questions_config?.mcq_multiple || []),
      ...(job.screening_questions_config?.coding || []),
      ...(job.screening_questions_config?.descriptive || [])
    ];
    setSelectedQuestions(allQuestions);
    setSelectedQuestionsByType(job.screening_questions_config || {
      mcq_single: [],
      mcq_multiple: [],
      coding: [],
      descriptive: []
    });
    setRandomQuestionsConfig(job.screening_questions_random_config || {
      mcq_single: 0,
      mcq_multiple: 0,
      coding: 0,
      descriptive: 0
    });

    toast.success(`Form filled with details from "${job.title}"`);
  };

  const openEditForm = (job: Job) => {
    setIsEditing(true);
    setSelectedJobId(job.id);
    setCurrentFormTab('details');
    setSelectedCompanyId(job.company.id);
    setFormData({
      title: job.title,
      company_id: job.company.id,
      description: job.description,
      employment_type: job.employment_type as "full-time",
      experience_min_years: job.experience_min_years,
      experience_max_years: job.experience_max_years,
      locations: job.locations,
      is_remote: job.is_remote,
      min_salary: job.min_salary,
      max_salary: job.max_salary,
      currency: job.currency as "INR",
      skills: job.skills,
      notice_period: job.notice_period,
      education_level: job.education_level as "any",
      status: job.status as "draft",
      posted_at: job.posted_at,
      expires_at: job.expires_at,
    });

    const allQuestions = [
      ...(job.screening_questions_config?.mcq_single || []),
      ...(job.screening_questions_config?.mcq_multiple || []),
      ...(job.screening_questions_config?.coding || []),
      ...(job.screening_questions_config?.descriptive || [])
    ];
    setSelectedQuestions(allQuestions);
    setSelectedQuestionsByType(job.screening_questions_config || {
      mcq_single: [],
      mcq_multiple: [],
      coding: [],
      descriptive: []
    });
    setRandomQuestionsConfig(job.screening_questions_random_config || {
      mcq_single: 0,
      mcq_multiple: 0,
      coding: 0,
      descriptive: 0
    });

    setShowJobForm(true);
  };

  const handleSubmitJob = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a job title');
      return;
    }

    if (!formData.company_id.trim()) {
      toast.error('Please select a company');
      return;
    }

    const payload = {
      ...formData,
      screening_questions_config: selectedQuestionsByType,
      screening_questions_random_config: randomQuestionsConfig,
    };

    try {
      if (isEditing && selectedJobId) {
        const originalJob = jobs.find(job => job.id === selectedJobId);
        const wasActive = originalJob?.status === 'active';
        
        const updatedJob = await jobService.updateJob(selectedJobId, payload);
        
        if (wasActive && updatedJob.status === 'draft') {
          toast.success('Job updated successfully! Since this was an active job, it has been moved to Jobs Approval for re-approval before going live again.', {
            duration: 6000
          });
        } else {
          toast.success('Job updated successfully');
        }
      } else {
        await jobService.createJob(payload);
        toast.success('Job posted successfully');
      }
      loadJobs();
      loadJobsWithApplications();
      setShowJobForm(false);
      setIsEditing(false);
      setSelectedJobId(null);
    } catch (err) {
      console.error("Error saving job:", err);
      toast.error(isEditing ? 'Failed to update job' : 'Failed to post job');
    }
  };



  const openDeleteModal = (id: string) => {
    setDeleteJobId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteJob = async () => {
    if (!deleteJobId) return;
    try {
      setIsDeleting(true);
      await jobService.deleteJob(deleteJobId);
      setJobs(prev => prev.filter(job => job.id !== deleteJobId));
      loadJobsWithApplications();
      setIsDeleteModalOpen(false);
      setDeleteJobId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteJobId(null);
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    
    let matchesTab = false;
    if (selectedTab === 'all') {
      matchesTab = true;
    } else if (selectedTab === 'Approved') {
      matchesTab = job.status === 'active';
    } else {
      matchesTab = job.status === selectedTab;
    }
    
    return matchesSearch && matchesTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'paused': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'closed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };



  const headerActions = (
    <>
      <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
        <Filter className="h-4 w-4" />
        <span>Filter</span>
      </button>
      <button
        onClick={() => navigate('/recruiter/jobs/companies')}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        <Building2 className="h-4 w-4" />
        <span>Companies</span>
      </button>
      <button
        onClick={openAddForm}
        className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
      >
        <Plus className="h-4 w-4" />
        <span>Post New Job</span>
      </button>
      <button
        onClick={() => navigate('/recruiter/candidates')}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
      >
        <Users className="h-4 w-4" />
        <span>Find Candidates</span>
      </button>
    </>
    
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />

        <div className="flex-1">
          <RoleHeader
            title="Job Management Dashboard"
            subtitle="Manage your job recruitment pipeline"
            actions={headerActions}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {!showJobForm && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Total Jobs</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold">{jobs.length}</div>
                      <Briefcase className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Active</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-green-600">{jobs.filter(j => j.status === 'active').length}</div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Draft</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-yellow-600">{jobs.filter(j => j.status === 'draft').length}</div>
                      <FileText className="h-8 w-8 text-yellow-600" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="pb-3">
                      <h3 className="text-md font-medium text-gray-600">Total Applicants</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold">
                        {jobsWithApplications.reduce((acc, job) => acc + (job.applications_count || 0), 0)}
                      </div>
                      <Users className="h-8 w-8 text-gray-600" />
                    </div>
                  </div>
                </div>

                <div className="mb-6 flex items-center justify-between gap-4">
                  <div className="flex w-full items-center gap-4 h-12">
                    <div className="h-full flex items-center border border-gray-200 rounded-lg">
                      <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white px-4 gap-4 h-full items-center">
                        <button
                          onClick={() => setSelectedTab('all')}
                          className={`px-5 h-8 text-sm font-medium rounded-lg transition-colors duration-150 ${selectedTab === 'all' ? 'bg-gray-200 text-gray-900 shadow-sm' : 'bg-white text-gray-600'
                            }`}
                        >
                          All Jobs
                        </button>
                        <button
                          onClick={() => setSelectedTab('active')}
                          className={`px-5 h-8 text-sm font-medium rounded-lg transition-colors duration-150 ${selectedTab === 'active' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'bg-white text-gray-600'
                            }`}
                        >
                          Active
                        </button>
                        <button
                          onClick={() => setSelectedTab('draft')}
                          className={`px-5 h-8 text-sm font-medium rounded-lg transition-colors duration-150 ${selectedTab === 'draft' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'bg-white text-gray-600'
                            }`}
                        >
                          Draft
                        </button>
                        <button
                          onClick={() => setSelectedTab('paused')}
                          className={`px-5 h-8 text-sm font-medium rounded-lg transition-colors duration-150 ${selectedTab === 'paused' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'bg-white text-gray-600'
                            }`}
                        >
                          Paused
                        </button>
                        <button
                          onClick={() => setSelectedTab('closed')}
                          className={`px-5 h-8 text-sm font-medium rounded-lg transition-colors duration-150 ${selectedTab === 'closed' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'bg-white text-gray-600'
                            }`}
                        >
                          Closed
                        </button>
                        <button
                          onClick={() => setSelectedTab('Approved')}
                          className={`px-5 h-8 text-sm font-medium rounded-lg transition-colors duration-150 ${selectedTab === 'Approved' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'bg-white text-gray-600'
                            }`}
                        >
                          Approved
                          <span className={`ml-1 text-xs ${selectedTab === 'Approved' ? 'text-gray-700' : 'text-gray-500'}`}>
                            ({jobs.filter(j => j.status === 'active').length})
                          </span>
                        </button>
                        <button
                          onClick={() => setSelectedTab('rejected')}
                          className={`px-5 h-8 text-sm font-medium rounded-lg transition-colors duration-150 ${selectedTab === 'rejected' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'bg-white text-gray-600'
                            }`}
                        >
                          Rejected
                        </button>
                      </div>
                    </div>

                    <div className="group relative h-full flex items-center">
                      <SearchBar
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        placeholder="Search jobs, companies, skills..."
                      />
                    </div>
                  </div>
                </div>

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
                            Experience
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Salary
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Applicants
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
                                <div className="text-sm font-medium text-gray-900">{job.title}</div>
                                <div className="text-sm text-gray-500">{job.employment_type.charAt(0).toUpperCase() + job.employment_type.slice(1).replace('-', ' ')}</div>
                                {job.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {job.skills.slice(0, 2).map((skill, idx) => (
                                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                                        {skill}
                                      </span>
                                    ))}
                                    {job.skills.length > 2 && (
                                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                                        +{job.skills.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                                <div className="text-sm text-gray-900">{job.company.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center text-sm text-gray-900">
                                <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                {job.locations.join(', ') || (job.is_remote ? 'Remote' : 'Not specified')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {job.experience_min_years > 0 || job.experience_max_years
                                ? `${job.experience_min_years}-${job.experience_max_years || '+'} years`
                                : 'Any'
                              }
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
                                {job.status === 'active' && selectedTab === 'Approved' 
                                  ? 'Approved' 
                                  : job.status.charAt(0).toUpperCase() + job.status.slice(1)
                                }
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => navigate(`/recruiter/jobs/${job.id}/applicants`)}
                                  className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors group"
                                >
                                  <Users className="h-4 w-4 mr-1" />
                                  <span className="font-medium">{getApplicationsCount(job.id)}</span>
                                  <span className="ml-1">applicant{getApplicationsCount(job.id) !== 1 ? 's' : ''}</span>
                                  {getApplicationsCount(job.id) > 0 && (
                                    <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                  )}
                                </button>
                                {getApplicationsCount(job.id) === 0 && (
                                  <button
                                    onClick={handleRefreshApplications}
                                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Refresh application count"
                                  >
                                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEditForm(job)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit Job"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => openDeleteModal(job.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Job"
                                >
                                  <Trash className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {filteredJobs.length === 0 && (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchQuery || selectedTab !== 'all'
                        ? 'Try adjusting your search or filters'
                        : 'Get started by posting your first job'
                      }
                    </p>
                    {!searchQuery && selectedTab === 'all' && (
                      <button
                        onClick={openAddForm}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Post Your First Job
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {showJobForm && (
              <div className="mb-8 bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {isEditing ? "Update Job" : "Post New Job"}
                  </h2>
                  <button
                    onClick={() => setShowJobForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {!isEditing && (
                  <div className="mb-6 border border-gray-200 shadow-sm rounded-lg">
                    <div className="pb-4 p-6 border-b">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-purple-500" />
                        Use Previous Post
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Click on any previous job to auto-fill the form</p>
                    </div>
                    <div className="p-6">
                      <div className={`grid gap-4 ${jobs.length === 1 ? 'grid-cols-1 md:grid-cols-1' :
                        jobs.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                          'grid-cols-1 md:grid-cols-3'
                        }`}>
                        {jobs.slice(0, 3).map((job) => (
                          <div
                            key={job.id}
                            onClick={() => fillFromPreviousJob(job)}
                            className="relative p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group"
                          >
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Copy className="h-4 w-4 text-blue-500" />
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-1 pr-6">{job.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{job.company.name}</p>
                            <div className="text-xs text-gray-500 mb-2 space-y-1">
                              <div className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                {job.locations.join(', ') || (job.is_remote ? 'Remote' : 'Not specified')}
                              </div>
                              {(job.experience_min_years > 0 || job.experience_max_years) && (
                                <div className="flex items-center">
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  {job.experience_min_years}-{job.experience_max_years || '+'} years exp
                                </div>
                              )}
                              {(job.min_salary || job.max_salary) && (
                                <div className="flex items-center">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  {job.min_salary && job.max_salary
                                    ? `${job.min_salary}-${job.max_salary} ${job.currency}`
                                    : job.min_salary
                                      ? `${job.min_salary}+ ${job.currency}`
                                      : `Up to ${job.max_salary} ${job.currency}`
                                  }
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-1 rounded text-xs ${job.status === 'active' ? 'bg-green-100 text-green-700' :
                                job.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                {job.status}
                              </span>
                              {job.posted_at && (
                                <span className="text-xs text-gray-400">
                                  {new Date(job.posted_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {jobs.length === 0 && (
                          <div className="col-span-3 text-center py-8 text-gray-500">
                            No previous jobs found. Create your first job posting!
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="w-full">
                  <div className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1 rounded-lg">
                    <button
                      onClick={() => setCurrentFormTab('details')}
                      className={`flex items-center gap-2 rounded-md py-2 px-4 transition-all ${currentFormTab === 'details' ? 'bg-white shadow-sm' : ''
                        }`}
                    >
                      <Briefcase className="h-4 w-4" />
                      Job Details
                    </button>
                    <button
                      onClick={() => setCurrentFormTab('screening')}
                      className={`flex items-center gap-2 rounded-md py-2 px-4 transition-all ${currentFormTab === 'screening' ? 'bg-white shadow-sm' : ''
                        }`}
                    >
                      <FileText className="h-4 w-4" />
                      Screening Questions ({Object.values(selectedQuestionsByType).flat().length + Object.values(randomQuestionsConfig).reduce((sum, count) => sum + count, 0)})
                    </button>
                  </div>

                  {currentFormTab === 'details' && (
                    <div className="space-y-6">
                      <div className="border border-gray-200 shadow-sm rounded-lg">
                        <div className="pb-4 p-6 border-b">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Briefcase className="h-5 w-5 mr-2 text-blue-500" />
                            Basic Information
                          </h3>
                        </div>
                        <div className="space-y-4 p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
                              <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Senior React Developer"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type *</label>
                              <select
                                value={formData.employment_type}
                                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as any })}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="full-time">Full Time</option>
                                <option value="part-time">Part Time</option>
                                <option value="contract">Contract</option>
                                <option value="internship">Internship</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Job Description *</label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              placeholder="Describe the role, responsibilities, and what you're looking for..."
                              rows={4}
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Company *</label>
                              <select
                                value={selectedCompanyId}
                                onChange={(e) => {
                                  setSelectedCompanyId(e.target.value);
                                  handleCompanySelect(e.target.value);
                                }}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="">Select Company</option>
                                {companies.map(company => (
                                  <option key={company.id} value={company.id}>{company.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Remote Work</label>
                              <div className="flex items-center space-x-4 pt-2">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={formData.is_remote}
                                    onChange={(e) => setFormData({ ...formData, is_remote: e.target.checked })}
                                    className="mr-2"
                                  />
                                  Remote Position
                                </label>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Locations (comma-separated)</label>
                            <input
                              type="text"
                              value={formData.locations.join(', ')}
                              onChange={(e) => {
                                const locations = e.target.value.split(',').map(loc => loc.trim()).filter(loc => loc);
                                setFormData({ ...formData, locations });
                              }}
                              placeholder="e.g., Bangalore, Mumbai, Delhi"
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Min Salary</label>
                              <input
                                type="number"
                                value={formData.min_salary || ''}
                                onChange={(e) => setFormData({ ...formData, min_salary: e.target.value ? Number(e.target.value) : undefined })}
                                placeholder="50000"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Max Salary</label>
                              <input
                                type="number"
                                value={formData.max_salary || ''}
                                onChange={(e) => setFormData({ ...formData, max_salary: e.target.value ? Number(e.target.value) : undefined })}
                                placeholder="100000"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                              <select
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="INR">INR</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                              <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                                <option value="paused">Paused</option>
                                <option value="closed">Closed</option>
                              </select>
                              {isEditing && jobs.find(job => job.id === selectedJobId)?.status === 'active' && (
                                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                  <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                      <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <div className="ml-3">
                                      <h3 className="text-sm font-medium text-amber-800">
                                        Editing Active Job
                                      </h3>
                                      <div className="mt-1 text-sm text-amber-700">
                                        <p>This job is currently active. Any content changes will move it to draft status and require re-approval before going live again.</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Min Experience (years)</label>
                              <input
                                type="number"
                                value={formData.experience_min_years}
                                onChange={(e) => setFormData({ ...formData, experience_min_years: Number(e.target.value) })}
                                min="0"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Max Experience (years)</label>
                              <input
                                type="number"
                                value={formData.experience_max_years || ''}
                                onChange={(e) => setFormData({ ...formData, experience_max_years: e.target.value ? Number(e.target.value) : undefined })}
                                min="0"
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Education Level</label>
                              <select
                                value={formData.education_level}
                                onChange={(e) => setFormData({ ...formData, education_level: e.target.value as any })}
                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                              >
                                <option value="any">Any</option>
                                <option value="high_school">High School</option>
                                <option value="diploma">Diploma</option>
                                <option value="bachelor">Bachelor's Degree</option>
                                <option value="master">Master's Degree</option>
                                <option value="phd">PhD</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border border-gray-200 shadow-sm rounded-lg">
                        <div className="pb-4 p-6 border-b">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Settings className="h-5 w-5 mr-2 text-green-500" />
                            Skills & Requirements
                          </h3>
                        </div>
                        <div className="space-y-4 p-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Required Skills (comma-separated)</label>
                            <input
                              type="text"
                              value={formData.skills.join(', ')}
                              onChange={(e) => {
                                const skills = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill);
                                setFormData({ ...formData, skills });
                              }}
                              placeholder="e.g., React, Node.js, JavaScript, TypeScript"
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Notice Period (days)</label>
                            <input
                              type="number"
                              value={formData.notice_period || ''}
                              onChange={(e) => setFormData({ ...formData, notice_period: e.target.value ? Number(e.target.value) : undefined })}
                              placeholder="30"
                              min="0"
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentFormTab === 'screening' && (
                    <div className="space-y-6">
                      <div className="border border-gray-200 shadow-sm rounded-lg">
                        <div className="pb-4 p-6 border-b">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Settings className="h-5 w-5 mr-2 text-orange-500" />
                            Random Questions Configuration
                          </h3>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">MCQ Single Choice</label>
                              <input
                                type="number"
                                min="0"
                                value={randomQuestionsConfig.mcq_single}
                                onChange={(e) => setRandomQuestionsConfig({
                                  ...randomQuestionsConfig,
                                  mcq_single: parseInt(e.target.value) || 0
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">MCQ Multiple Choice</label>
                              <input
                                type="number"
                                min="0"
                                value={randomQuestionsConfig.mcq_multiple}
                                onChange={(e) => setRandomQuestionsConfig({
                                  ...randomQuestionsConfig,
                                  mcq_multiple: parseInt(e.target.value) || 0
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Coding Questions</label>
                              <input
                                type="number"
                                min="0"
                                value={randomQuestionsConfig.coding}
                                onChange={(e) => setRandomQuestionsConfig({
                                  ...randomQuestionsConfig,
                                  coding: parseInt(e.target.value) || 0
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Descriptive Questions</label>
                              <input
                                type="number"
                                min="0"
                                value={randomQuestionsConfig.descriptive}
                                onChange={(e) => setRandomQuestionsConfig({
                                  ...randomQuestionsConfig,
                                  descriptive: parseInt(e.target.value) || 0
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="0"
                              />
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-3">
                            Specify how many questions of each type should be randomly selected from the question bank for this job screening.
                          </p>
                        </div>
                      </div>

                      <div className="border border-gray-200 shadow-sm rounded-lg">
                        <div className="pb-4 p-6 border-b">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <FileText className="h-5 w-5 mr-2 text-purple-500" />
                            Specific Question Selection
                          </h3>
                        </div>
                        <div className="p-6">
                          <QuestionBank
                            mode="selection"
                            selectedQuestions={selectedQuestions}
                            onQuestionsChange={handleQuestionsChange}
                            allowMultipleSelection={true}
                            showSplitView={true}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-4 mt-6 pt-6 border-t">
                    <button
                      onClick={() => setShowJobForm(false)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitJob}
                      className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      {isEditing ? 'Update Job' : 'Post Job'}
                    </button>
                  </div>
                </div>
              </div>
            )}



            {isDeleteModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to delete this job? This action cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={closeDeleteModal}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteJob}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  );
};

export default Jobs;