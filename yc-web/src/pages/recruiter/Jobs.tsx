import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash, Filter, Settings, FileText, Building2, Users, X, Briefcase, MapPin, DollarSign, Copy, CheckCircle, RefreshCw, Eye } from "lucide-react";
import { jobService, Job, Company } from "../../services/jobService";
import { jobApplicationService } from "../../services/jobApplicationService";

import DashboardLayout from "../../components/common/DashboardLayout";
import QuestionBank from "../../components/common/QuestionBank";
import SearchBar from "../../components/common/SearchBar";
import { fetchQuestionById } from "../../services/questionService";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import StatusBadge from "../../components/common/StatusBadge";
import JobDetailsViewer from "../../components/common/recruiter/JobDetailsViewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "../../components/ui/dialog";
import { DataTable } from "../../components/common/DataTable";
import { StatsCard } from "../../components/common/StatsCard";

const Jobs: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

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





  const headerActions = (
    <>
      <Button className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm transition-all duration-200 flex items-center space-x-2">
        <Filter className="h-4 w-4" />
        <span>Filter</span>
      </Button>
      <Button
        onClick={() => navigate('/recruiter/jobs/companies')}
        className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white"
      >
        <Building2 className="h-4 w-4" />
        <span>Companies</span>
      </Button>
      <Button
        onClick={openAddForm}
        className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white"
      >
        <Plus className="h-4 w-4" />
        <span>Post New Job</span>
      </Button>
      <Button
        onClick={() => navigate('/recruiter/candidates')}
        className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
      >
        <Users className="h-4 w-4" />
        <span>Find Candidates</span>
      </Button>
    </>

  );

  return (
    <DashboardLayout
      title="Job Management Dashboard"
      subtitle="Manage your job recruitment pipeline"
      actions={headerActions}
    >
      <div className="px-6 py-6">
            {!showJobForm && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <StatsCard
                    label="Total Jobs"
                    value={jobs.length}
                    icon={Briefcase}
                    colorScheme="blue"
                    size="md"
                  />
                  <StatsCard
                    label="Active"
                    value={jobs.filter(j => j.status === 'active').length}
                    icon={CheckCircle}
                    colorScheme="green"
                    size="md"
                  />
                  <StatsCard
                    label="Draft"
                    value={jobs.filter(j => j.status === 'draft').length}
                    icon={FileText}
                    colorScheme="amber"
                    size="md"
                  />
                  <StatsCard
                    label="Total Applicants"
                    value={jobsWithApplications.reduce((acc, job) => acc + (job.applications_count || 0), 0)}
                    icon={Users}
                    colorScheme="purple"
                    size="md"
                  />
                </div>

                <div className="mb-6 flex items-center justify-between gap-4">
                  <div className="flex w-full items-center gap-4 h-12">
                    <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex items-center">
                      <TabsList className="inline-flex w-auto gap-1">
                        <TabsTrigger value="all" className="px-5">All Jobs</TabsTrigger>
                        <TabsTrigger value="active" className="px-5">Active</TabsTrigger>
                        <TabsTrigger value="draft" className="px-5">Draft</TabsTrigger>
                        <TabsTrigger value="paused" className="px-5">Paused</TabsTrigger>
                        <TabsTrigger value="closed" className="px-5">Closed</TabsTrigger>
                        <TabsTrigger value="Approved" className="px-5">
                          Approved
                          <span className="ml-1 text-xs opacity-70">
                            ({jobs.filter(j => j.status === 'active').length})
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="px-5">Rejected</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="group relative h-full flex items-center">
                      <SearchBar
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        placeholder="Search jobs, companies, skills..."
                      />
                    </div>
                  </div>
                </div>

                <DataTable
                  title="Job Listings"
                  description={`${filteredJobs.length} job(s) found`}
                  data={filteredJobs}
                  columns={[
                    {
                      header: 'Job Details',
                      cell: (job) => (
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
                      )
                    },
                    {
                      header: 'Company',
                      cell: (job) => (
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                          <div className="text-sm text-gray-900">{job.company.name}</div>
                        </div>
                      )
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
                      header: 'Experience',
                      cell: (job) => (
                        <div className="text-sm text-gray-900">
                          {job.experience_min_years > 0 || job.experience_max_years
                            ? `${job.experience_min_years}-${job.experience_max_years || '+'} years`
                            : 'Any'
                          }
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
                      cell: (job) => (
                        <StatusBadge
                          status={job.status}
                          label={job.status === 'active' && selectedTab === 'Approved' ? 'Approved' : undefined}
                        />
                      )
                    },
                    {
                      header: 'Applicants',
                      cell: (job) => (
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
                      )
                    },
                    {
                      header: 'Actions',
                      cell: (job) => (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => { setSelectedJob(job); setShowJobDetails(true); }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
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
                      ),
                      className: 'text-right'
                    }
                  ]}
                  keyExtractor={(item) => item.id}
                  emptyState={{
                    message: "No jobs found",
                    subMessage: searchQuery || selectedTab !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Get started by posting your first job',
                    action: !searchQuery && selectedTab === 'all' ? (
                      <button
                        onClick={openAddForm}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Post Your First Job
                      </button>
                    ) : undefined
                  }}
                />
              </>
            )}

            {showJobForm && (
              <div className="mb-8 bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {isEditing ? "Update Job" : "Post New Job"}
                    </h2>
                    {!isEditing && (
                      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="hidden md:flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-sm">
                            <Copy className="h-4 w-4" />
                            Import from Previous Job
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Import details from a previous job</DialogTitle>
                            <DialogDescription>
                              Select a job to auto-fill the form with its details, skills, and settings.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {jobs.map((job) => (
                                <div
                                  key={job.id}
                                  onClick={() => {
                                    fillFromPreviousJob(job);
                                    setShowImportModal(false);
                                  }}
                                  className="relative p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all group"
                                >
                                  <h4 className="font-semibold text-gray-900 mb-1 pr-6 truncate">{job.title}</h4>
                                  <p className="text-sm text-gray-600 mb-2 truncate">{job.company.name}</p>
                                  <div className="text-xs text-gray-500 mb-2 space-y-1">
                                    <div className="flex items-center">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {job.locations[0] || (job.is_remote ? 'Remote' : 'Not specified')}
                                      {job.locations.length > 1 && ` +${job.locations.length - 1}`}
                                    </div>
                                    <div className="flex items-center">
                                      <DollarSign className="h-3 w-3 mr-1" />
                                      {job.min_salary ? `${job.min_salary / 1000}k` : '0'} - {job.max_salary ? `${job.max_salary / 1000}k` : '0'} {job.currency}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
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
                                <div className="col-span-full text-center py-8 text-gray-500">
                                  No previous jobs found.
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  <button
                    onClick={() => setShowJobForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <Tabs value={currentFormTab} onValueChange={setCurrentFormTab} className="w-full">
                  {/* TabsList removed for wizard flow */}

                  <TabsContent value="details" className="space-y-6">
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                          <Briefcase className="h-5 w-5 mr-2 text-blue-500" />
                          Basic Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Job Title *</Label>
                            <Input
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              placeholder="e.g., Senior React Developer"
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Employment Type *</Label>
                            <Select
                              value={formData.employment_type}
                              onValueChange={(value) => setFormData({ ...formData, employment_type: value as any })}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full-time">Full Time</SelectItem>
                                <SelectItem value="part-time">Part Time</SelectItem>
                                <SelectItem value="contract">Contract</SelectItem>
                                <SelectItem value="internship">Internship</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Job Description *</Label>
                          <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe the role, responsibilities, and what you're looking for..."
                            rows={4}
                            className="bg-white resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Company *</Label>
                            <Select
                              value={selectedCompanyId}
                              onValueChange={(value) => {
                                setSelectedCompanyId(value);
                                handleCompanySelect(value);
                              }}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Select Company" />
                              </SelectTrigger>
                              <SelectContent>
                                {companies.map(company => (
                                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Remote Work</Label>
                            <div className="flex items-center space-x-2 pt-2">
                              <Checkbox
                                id="remote-work"
                                checked={formData.is_remote}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_remote: checked as boolean })}
                              />
                              <Label htmlFor="remote-work" className="font-normal cursor-pointer">
                                Remote Position
                              </Label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Locations (comma-separated)</Label>
                          <Input
                            value={formData.locations.join(', ')}
                            onChange={(e) => {
                              const locations = e.target.value.split(',').map(loc => loc.trim()).filter(loc => loc);
                              setFormData({ ...formData, locations });
                            }}
                            placeholder="e.g., Bangalore, Mumbai, Delhi"
                            className="bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Min Salary</Label>
                            <Input
                              type="number"
                              value={formData.min_salary || ''}
                              onChange={(e) => setFormData({ ...formData, min_salary: e.target.value ? Number(e.target.value) : undefined })}
                              placeholder="50000"
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Max Salary</Label>
                            <Input
                              type="number"
                              value={formData.max_salary || ''}
                              onChange={(e) => setFormData({ ...formData, max_salary: e.target.value ? Number(e.target.value) : undefined })}
                              placeholder="100000"
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Currency</Label>
                            <Select
                              value={formData.currency}
                              onValueChange={(value) => setFormData({ ...formData, currency: value as any })}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Currency" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INR">INR</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                              value={formData.status}
                              onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
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
                          <div className="space-y-2">
                            <Label>Min Experience (years)</Label>
                            <Input
                              type="number"
                              value={formData.experience_min_years}
                              onChange={(e) => setFormData({ ...formData, experience_min_years: Number(e.target.value) })}
                              min="0"
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Max Experience (years)</Label>
                            <Input
                              type="number"
                              value={formData.experience_max_years || ''}
                              onChange={(e) => setFormData({ ...formData, experience_max_years: e.target.value ? Number(e.target.value) : undefined })}
                              min="0"
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Education Level</Label>
                            <Select
                              value={formData.education_level}
                              onValueChange={(value) => setFormData({ ...formData, education_level: value as any })}
                            >
                              <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Select Education" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">Any</SelectItem>
                                <SelectItem value="high_school">High School</SelectItem>
                                <SelectItem value="diploma">Diploma</SelectItem>
                                <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                                <SelectItem value="master">Master's Degree</SelectItem>
                                <SelectItem value="phd">PhD</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                          <Settings className="h-5 w-5 mr-2 text-green-500" />
                          Skills & Requirements
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        <div className="space-y-2">
                          <Label>Required Skills (comma-separated)</Label>
                          <Input
                            value={formData.skills.join(', ')}
                            onChange={(e) => {
                              const skills = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill);
                              setFormData({ ...formData, skills });
                            }}
                            placeholder="e.g., React, Node.js, JavaScript, TypeScript"
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Notice Period (days)</Label>
                          <Input
                            type="number"
                            value={formData.notice_period || ''}
                            onChange={(e) => setFormData({ ...formData, notice_period: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder="30"
                            min="0"
                            className="bg-white"
                          />
                        </div>
                      </CardContent>
                    </Card>
                    <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
                      <Button
                        type="button"
                        onClick={() => setCurrentFormTab('screening')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Next: Screening Questions
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="screening" className="space-y-6">
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                          <Settings className="h-5 w-5 mr-2 text-orange-500" />
                          Random Questions Configuration
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>MCQ Single Choice</Label>
                            <Input
                              type="number"
                              min="0"
                              value={randomQuestionsConfig.mcq_single}
                              onChange={(e) => setRandomQuestionsConfig({
                                ...randomQuestionsConfig,
                                mcq_single: parseInt(e.target.value) || 0
                              })}
                              placeholder="0"
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>MCQ Multiple Choice</Label>
                            <Input
                              type="number"
                              min="0"
                              value={randomQuestionsConfig.mcq_multiple}
                              onChange={(e) => setRandomQuestionsConfig({
                                ...randomQuestionsConfig,
                                mcq_multiple: parseInt(e.target.value) || 0
                              })}
                              placeholder="0"
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Coding Questions</Label>
                            <Input
                              type="number"
                              min="0"
                              value={randomQuestionsConfig.coding}
                              onChange={(e) => setRandomQuestionsConfig({
                                ...randomQuestionsConfig,
                                coding: parseInt(e.target.value) || 0
                              })}
                              placeholder="0"
                              className="bg-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Descriptive Questions</Label>
                            <Input
                              type="number"
                              min="0"
                              value={randomQuestionsConfig.descriptive}
                              onChange={(e) => setRandomQuestionsConfig({
                                ...randomQuestionsConfig,
                                descriptive: parseInt(e.target.value) || 0
                              })}
                              placeholder="0"
                              className="bg-white"
                            />
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-3">
                          Specify how many questions of each type should be randomly selected from the question bank for this job screening.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-purple-500" />
                          Specific Question Selection
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <QuestionBank
                          mode="selection"
                          selectedQuestions={selectedQuestions}
                          onQuestionsChange={handleQuestionsChange}
                          allowMultipleSelection={true}
                          showSplitView={true}
                        />
                      </CardContent>
                    </Card>
                    <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-100">
                      <Button
                        variant="secondary"
                        onClick={() => setCurrentFormTab('details')}
                        className="bg-orange-500 hover:bg-orange-300 text-white"
                      >
                        ← Back to Details
                      </Button>

                      <div className="flex gap-3">
                        <Button
                          variant="secondary"
                          onClick={() => setShowJobForm(false)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSubmitJob}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isEditing ? 'Update Job' : 'Post Job'}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
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
                    <Button
                      variant="ghost"
                      onClick={closeDeleteModal}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
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
        {showJobDetails && selectedJob && (
          <JobDetailsViewer
            job={selectedJob}
            onClose={() => setShowJobDetails(false)}
            actions={
              <button
                onClick={() => { setShowJobDetails(false); openEditForm(selectedJob); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Job
              </button>
            }
          />
        )}
    </DashboardLayout>
  );
};

export default Jobs;
