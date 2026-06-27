import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Trophy, Calendar, Settings, FileText, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import QuestionBank from '@/components/common/QuestionBank';
import { contestService, ContestFormModel, mapContestFromBackend } from '@/services/contestService';
import { fetchQuestionById, Question } from '@/services/questionService';
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import ProctoringSettingsCard from '@/components/instructor/shared/ProctoringSettingsCard';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

import { collegeService } from "@/services/collegeService"

interface Option { label: string; value: string; }
export default function ContestForm() {
  const navigate = useNavigate();
  const { contestId } = useParams<{ contestId: string }>();
  const isEditMode = !!contestId;

  const [contest, setContest] = useState<ContestFormModel | null>(null);
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
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    organizer: '',
    description: '',
    type: 'company' as 'company' | 'college' | 'weekly' | 'monthly',
    startDate: '',
    endDate: '',
    duration: '',
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    instructions: '',
    totalMarks: '100',
    passingMarks: '60',
    enableProctoring: true,
    tabSwitchThreshold: 3,
    violationThreshold: 5,
    publishStatus: 'draft' as 'draft' | 'active' | 'inactive' | 'archived',
    prize: '',
    registrationStartDate: '',
    registrationEndDate: '',
    allowLateEntry: false,
    openForAllColleges: true,
    allowedColleges: [] as string[],
    openForAllDepartments: true,
    allowedDepartments: [] as string[],
    requireStudentId: false,
  });

  const [collegeOptions, setCollegeOptions] = useState<Option[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<Option[]>([]);
  const [minDateTime, setMinDateTime] = useState('');

  useEffect(() => {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60000;
    setMinDateTime(new Date(date.getTime() - offset).toISOString().slice(0, 16));
  }, []);

  useEffect(() => {
    const fetchSelectOptions = async () => {
      try {
        const [colleges, departments] = await Promise.all([
          collegeService.getColleges('approved'),
          collegeService.getDepartments('approved')
        ]);
        setCollegeOptions(colleges.map(c => ({ label: c.name, value: c.id.toString() })));
        setDepartmentOptions(departments.map(d => ({ label: d.name, value: d.id.toString() })));
      } catch (error) {
        console.error("Failed to load select options", error);
      }
    };
    fetchSelectOptions();
  }, []);

  // Clean stale college/department IDs that no longer exist
  useEffect(() => {
    if (collegeOptions.length === 0 && departmentOptions.length === 0) return;
    const validCollegeIds = new Set(collegeOptions.map(o => o.value));
    const validDeptIds = new Set(departmentOptions.map(o => o.value));
    const cleanedColleges = formData.allowedColleges.filter(id => validCollegeIds.has(id));
    const cleanedDepts = formData.allowedDepartments.filter(id => validDeptIds.has(id));
    if (cleanedColleges.length !== formData.allowedColleges.length || cleanedDepts.length !== formData.allowedDepartments.length) {
      setFormData(prev => ({ ...prev, allowedColleges: cleanedColleges, allowedDepartments: cleanedDepts }));
    }
  }, [collegeOptions, departmentOptions]);

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

  // Helper function to format datetime for HTML datetime-local input
  const formatDateTimeForInput = (dateString: string) => {
    if (!dateString) return '';

    // If it's already in the correct format (YYYY-MM-DDTHH:mm), return it
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateString)) {
      return dateString.slice(0, 16);
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return ''; // Invalid date

      // Create a date string in local time: YYYY-MM-DDTHH:MM
      const offset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
      return localISOTime;
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const fetchContest = async () => {
    if (!contestId) return;

    setLoading(true);
    try {
      const data = await contestService.getContest(contestId);
      const mappedContest = mapContestFromBackend(data);
      setContest(mappedContest);

      // Populate form with contest data
      setFormData({
        title: mappedContest.title,
        organizer: mappedContest.organizer,
        type: mappedContest.type,
        startDate: formatDateTimeForInput(mappedContest.startDate),
        endDate: formatDateTimeForInput(mappedContest.endDate),
        duration: mappedContest.duration.replace(' min', ''),
        prize: mappedContest.prize || '',
        difficulty: mappedContest.difficulty,
        description: mappedContest.description,
        registrationStartDate: formatDateTimeForInput(mappedContest.registrationStartDate || ''),
        registrationEndDate: formatDateTimeForInput(mappedContest.registrationEndDate || ''),
        allowLateEntry: mappedContest.allowLateEntry ?? false,
        openForAllColleges: mappedContest.open_for_all_colleges ?? true,
        allowedColleges: mappedContest.allowed_colleges ?? [],
        openForAllDepartments: mappedContest.open_for_all_departments ?? true,
        allowedDepartments: mappedContest.allowed_departments ?? [],
        requireStudentId: mappedContest.require_student_id ?? false,
        instructions: mappedContest.instructions || '',
        totalMarks: mappedContest.total_marks ? String(mappedContest.total_marks) : '100',
        passingMarks: mappedContest.passing_marks ? String(mappedContest.passing_marks) : '60',
        enableProctoring: mappedContest.enable_proctoring ?? false,
        tabSwitchThreshold: mappedContest.tabSwitchThreshold ?? 3,
        violationThreshold: mappedContest.violationThreshold ?? 5,
        publishStatus: (mappedContest.publish_status as 'draft' | 'active' | 'inactive' | 'archived') ?? 'draft',
      });

      const allQuestions = [
        ...(mappedContest.questions_config?.mcq_single || []),
        ...(mappedContest.questions_config?.mcq_multiple || []),
        ...(mappedContest.questions_config?.coding || []),
        ...(mappedContest.questions_config?.descriptive || [])
      ];
      setSelectedQuestions(allQuestions);
      setSelectedQuestionsByType(mappedContest.questions_config || {
        mcq_single: [],
        mcq_multiple: [],
        coding: [],
        descriptive: []
      });
      setRandomQuestionsConfig(mappedContest.questions_random_config || {
        mcq_single: 0,
        mcq_multiple: 0,
        coding: 0,
        descriptive: 0
      });
    } catch (error) {
      console.error('Failed to fetch contest:', error);
      toast.error('Failed to load contest');
      navigate('/instructor/contests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEditMode) {
      fetchContest();
    }
  }, [contestId]);

  const handleSubmit = async () => {
    const totalQuestionCount = Object.values(selectedQuestionsByType).flat().length
      + Object.values(randomQuestionsConfig).reduce((sum, count) => sum + count, 0);

    if (totalQuestionCount === 0) {
      setCurrentFormTab('questions');
      toast.error('Please add at least one question (selected or random) before saving.');
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Validate End Date
    if (formData.endDate) {
      const endDateObj = new Date(formData.endDate);
      const isDateChanged = !contest || formatDateTimeForInput(contest.endDate) !== formData.endDate;
      if ((!isEditMode || isDateChanged) && endDateObj < todayStart) {
        toast.error("End Date cannot be yesterday's date or past dates.");
        return;
      }
    }

    // Validate Registration End Date
    if (formData.registrationEndDate) {
      const regEndDateObj = new Date(formData.registrationEndDate);
      const isRegDateChanged = !contest || formatDateTimeForInput(contest.registrationEndDate || '') !== formData.registrationEndDate;
      if ((!isEditMode || isRegDateChanged) && regEndDateObj < todayStart) {
        toast.error("Registration End Date cannot be yesterday's date or past dates.");
        return;
      }
    }

    // Validate Date Ranges
    if (formData.startDate && formData.endDate) {
      const startDateObj = new Date(formData.startDate);
      const endDateObj = new Date(formData.endDate);
      if (endDateObj <= startDateObj) {
        toast.error("End Date must be after Start Date.");
        return;
      }
    }

    if (formData.registrationStartDate && formData.registrationEndDate) {
      const regStartDateObj = new Date(formData.registrationStartDate);
      const regEndDateObj = new Date(formData.registrationEndDate);
      if (regEndDateObj <= regStartDateObj) {
        toast.error("Registration End Date must be after Registration Start Date.");
        return;
      }
    }

    const payload = {
      title: formData.title,
      organizer: formData.organizer,
      type: formData.type,
      publish_status: formData.publishStatus,
      start_datetime: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
      end_datetime: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
      duration: formData.duration ? parseInt(formData.duration) : undefined,
      prize: formData.prize,
      difficulty: formData.difficulty.toLowerCase(),
      description: formData.description,
      instructions: formData.instructions,
      total_marks: formData.totalMarks ? parseInt(formData.totalMarks) : undefined,
      passing_marks: formData.passingMarks ? parseInt(formData.passingMarks) : undefined,
      registration_start_datetime: formData.registrationStartDate ? new Date(formData.registrationStartDate).toISOString() : undefined,
      registration_end_datetime: formData.registrationEndDate ? new Date(formData.registrationEndDate).toISOString() : undefined,
      allow_late_entry: formData.allowLateEntry,

      enable_proctoring: formData.enableProctoring,
      tab_switch_threshold: formData.tabSwitchThreshold,
      violation_threshold: formData.violationThreshold,
      open_for_all_colleges: formData.openForAllColleges,
      allowed_colleges: formData.allowedColleges.map(String),
      open_for_all_departments: formData.openForAllDepartments,
      allowed_departments: formData.allowedDepartments.map(String),
      require_student_id: formData.requireStudentId,

      questions_config: selectedQuestionsByType,
      questions_random_config: randomQuestionsConfig,
    };

    try {
      if (isEditMode && contestId) {
        await contestService.updateContest(contestId, payload);
        toast.success('Contest updated successfully');
      } else {
        await contestService.createContest(payload);
        toast.success('Contest created successfully');
      }
      navigate('/instructor/contests');
    } catch (error: any) {
      console.error('Contest save error:', error);
      console.error('Payload sent:', payload);
      // Extract the most useful error message from the backend response
      const responseData = error?.response?.data;
      let errorMsg = isEditMode ? 'Failed to update contest' : 'Failed to create contest';
      if (responseData) {
        if (typeof responseData === 'string') {
          errorMsg = responseData;
        } else if (responseData.detail) {
          errorMsg = responseData.detail;
        } else {
          // Flatten DRF field-level validation errors like { field: ["error"] }
          const fieldErrors = Object.entries(responseData)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          if (fieldErrors) errorMsg = fieldErrors;
        }
      }
      toast.error(errorMsg, { duration: 8000 });
    }
  };

  const handlePrimaryAction = () => {
    if (currentFormTab === 'details') {
      setCurrentFormTab('questions');
      return;
    }
    handleSubmit();
  };

  const getHeaderTitle = () => {
    return isEditMode ? `Edit Contest: ${contest?.title || 'Loading...'}` : 'Add New Contest';
  };

  const getHeaderSubtitle = () => {
    return isEditMode ? 'Modify contest details and settings' : 'Create a new coding contest for students';
  };

  if (loading && isEditMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader
              title="Loading..."
              subtitle="Please wait while we load the contest details"
              actions={null}
            />
            <div className="px-6 py-6">
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316]"></div>
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
            title={getHeaderTitle()}
            subtitle={getHeaderSubtitle()}
            actions={
              <button
                onClick={() => navigate('/instructor/contests')}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                ← Back to List
              </button>
            }
          />
          <div className="px-6 py-6">
            <div className="bg-white shadow rounded-lg mb-6 p-6">
              <Tabs value={currentFormTab} onValueChange={setCurrentFormTab} className="w-full">
                <TabsContent value="details" className="space-y-6">
                  {/* Basic Information Card */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                        <Trophy className="h-5 w-5 mr-2 text-[#F97316]" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Contest Title *</label>
                          <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Weekly Coding Challenge"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Organizer *</label>
                          <Input
                            value={formData.organizer}
                            onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                            placeholder="e.g., Yuvro Platform"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Describe the contest focus and topics..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Contest Type *</label>
                          <Select
                            value={formData.type}
                            onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="company">Company Contest</SelectItem>
                              <SelectItem value="college">College Contest</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level *</label>
                          <Select
                            value={formData.difficulty}
                            onValueChange={(value) => setFormData({ ...formData, difficulty: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Easy">Easy</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Publish Status *</label>
                          <Select
                            value={formData.publishStatus}
                            onValueChange={(value) => setFormData({ ...formData, publishStatus: value as any })}
                          >
                            <SelectTrigger className="bg-orange-50/50 border-orange-200">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft (Hidden)</SelectItem>
                              <SelectItem value="active">Active (Published)</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Schedule & Duration Card */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-[#F97316]" />
                        Schedule & Duration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                          <Input
                            type="datetime-local"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            min={isEditMode ? undefined : minDateTime}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                          <Input
                            type="datetime-local"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            min={isEditMode ? undefined : minDateTime}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes) *</label>
                          <Input
                            type="number"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            placeholder="e.g., 120"
                            min={1}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Registration Start Date</label>
                          <Input
                            type="datetime-local"
                            value={formData.registrationStartDate}
                            onChange={(e) => setFormData({ ...formData, registrationStartDate: e.target.value })}
                            min={isEditMode ? undefined : minDateTime}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Registration End Date</label>
                          <Input
                            type="datetime-local"
                            value={formData.registrationEndDate}
                            onChange={(e) => setFormData({ ...formData, registrationEndDate: e.target.value })}
                            min={isEditMode ? undefined : minDateTime}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Allow Late Entry</p>
                          <p className="text-xs text-gray-500">Permit registrations after the registration end date.</p>
                        </div>
                        <Checkbox
                          checked={formData.allowLateEntry}
                          onCheckedChange={(checked) => setFormData({ ...formData, allowLateEntry: Boolean(checked) })}
                          className="data-[state=checked]:bg-[#F97316] data-[state=checked]:border-[#F97316]"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Eligibility & Proctoring Card */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                        <Settings className="h-5 w-5 mr-2 text-[#F97316]" />
                        Eligibility & Proctoring
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Open For All Colleges</p>
                          <p className="text-xs text-gray-500">Allow students from any college to register.</p>
                        </div>
                        <Checkbox
                          checked={formData.openForAllColleges}
                          onCheckedChange={(checked) => {
                            setFormData({ ...formData, openForAllColleges: Boolean(checked), allowedColleges: checked ? [] : formData.allowedColleges });
                          }}
                          className="data-[state=checked]:bg-[#F97316] data-[state=checked]:border-[#F97316]"
                        />
                      </div>

                      {!formData.openForAllColleges && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Select Allowed Colleges</label>
                          {collegeOptions.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No colleges available.</p>
                          ) : (
                            <div className="max-h-48 overflow-y-auto space-y-2">
                              {collegeOptions.map(college => (
                                <label key={college.value} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-100 cursor-pointer hover:border-[#F97316]/30 transition-colors">
                                  <Checkbox
                                    checked={formData.allowedColleges.includes(college.value)}
                                    onCheckedChange={(checked) => {
                                      const updated = checked
                                        ? [...formData.allowedColleges, college.value]
                                        : formData.allowedColleges.filter(id => id !== college.value);
                                      setFormData({ ...formData, allowedColleges: updated });
                                    }}
                                    className="data-[state=checked]:bg-[#F97316] data-[state=checked]:border-[#F97316]"
                                  />
                                  <span className="text-sm font-medium text-gray-900">{college.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Open For All Departments</p>
                          <p className="text-xs text-gray-500">Allow students from any department to register.</p>
                        </div>
                        <Checkbox
                          checked={formData.openForAllDepartments}
                          onCheckedChange={(checked) => {
                            setFormData({ ...formData, openForAllDepartments: Boolean(checked), allowedDepartments: checked ? [] : formData.allowedDepartments });
                          }}
                          className="data-[state=checked]:bg-[#F97316] data-[state=checked]:border-[#F97316]"
                        />
                      </div>

                      {!formData.openForAllDepartments && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Select Allowed Departments</label>
                          {departmentOptions.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No departments available.</p>
                          ) : (
                            <div className="max-h-48 overflow-y-auto space-y-2">
                              {departmentOptions.map(dept => (
                                <label key={dept.value} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-100 cursor-pointer hover:border-[#F97316]/30 transition-colors">
                                  <Checkbox
                                    checked={formData.allowedDepartments.includes(dept.value)}
                                    onCheckedChange={(checked) => {
                                      const updated = checked
                                        ? [...formData.allowedDepartments, dept.value]
                                        : formData.allowedDepartments.filter(id => id !== dept.value);
                                      setFormData({ ...formData, allowedDepartments: updated });
                                    }}
                                    className="data-[state=checked]:bg-[#F97316] data-[state=checked]:border-[#F97316]"
                                  />
                                  <span className="text-sm font-medium text-gray-900">{dept.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Require Student ID</p>
                          <p className="text-xs text-gray-500">Students must upload their college ID card to register.</p>
                        </div>
                        <Checkbox
                          checked={formData.requireStudentId}
                          onCheckedChange={(checked) => setFormData({ ...formData, requireStudentId: Boolean(checked) })}
                          className="data-[state=checked]:bg-[#F97316] data-[state=checked]:border-[#F97316]"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Proctoring Settings */}
                  <ProctoringSettingsCard
                    enableProctoring={formData.enableProctoring}
                    onEnableProctoringChange={(val) => setFormData({ ...formData, enableProctoring: val })}
                    tabSwitchThreshold={formData.tabSwitchThreshold}
                    onTabSwitchThresholdChange={(val) => setFormData({ ...formData, tabSwitchThreshold: val })}
                    violationThreshold={formData.violationThreshold}
                    onViolationThresholdChange={(val) => setFormData({ ...formData, violationThreshold: val })}
                    className="border border-gray-200 shadow-sm"
                  />

                  {/* Prize Information Card */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900">Prize Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prize (Optional)</label>
                        <Input
                          value={formData.prize}
                          onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                          placeholder="e.g., $500 Cash Prize"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="questions" className="space-y-6">
                  {/* Random Questions Configuration */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                        <Settings className="h-5 w-5 mr-2 text-orange-500" />
                        Random Questions Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">MCQ Single Choice</label>
                          <Input
                            type="number"
                            min={0}
                            value={randomQuestionsConfig.mcq_single}
                            onChange={(e) => setRandomQuestionsConfig({
                              ...randomQuestionsConfig,
                              mcq_single: Number(e.target.value) || 0
                            })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">MCQ Multiple Choice</label>
                          <Input
                            type="number"
                            min={0}
                            value={randomQuestionsConfig.mcq_multiple}
                            onChange={(e) => setRandomQuestionsConfig({
                              ...randomQuestionsConfig,
                              mcq_multiple: Number(e.target.value) || 0
                            })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Coding Questions</label>
                          <Input
                            type="number"
                            min={0}
                            value={randomQuestionsConfig.coding}
                            onChange={(e) => setRandomQuestionsConfig({
                              ...randomQuestionsConfig,
                              coding: Number(e.target.value) || 0
                            })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Descriptive Questions</label>
                          <Input
                            type="number"
                            min={0}
                            value={randomQuestionsConfig.descriptive}
                            onChange={(e) => setRandomQuestionsConfig({
                              ...randomQuestionsConfig,
                              descriptive: Number(e.target.value) || 0
                            })}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-3">
                        Specify how many questions of each type should be randomly selected from the question bank for this contest.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Specific Question Selection */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-purple-500" />
                        Specific Question Selection
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <QuestionBank
                        mode="selection"
                        selectedQuestions={selectedQuestions}
                        onQuestionsChange={handleQuestionsChange}
                        allowMultipleSelection={true}
                        showSplitView={true}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-100">
                  {currentFormTab === 'questions' ? (
                    <Button
                      variant="secondary"
                      onClick={() => setCurrentFormTab('details')}
                      className="bg-orange-500 hover:bg-orange-300 text-white"
                    >
                      ← Back to Details
                    </Button>
                  ) : (
                    <div></div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => navigate('/instructor/contests')}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                    >
                      Cancel
                    </Button>

                    <Button
                      onClick={handlePrimaryAction}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {currentFormTab === 'details'
                        ? 'Next: Add Questions'
                        : (isEditMode ? 'Update Contest' : 'Create Contest')}
                    </Button>
                  </div>
                </div>

              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
