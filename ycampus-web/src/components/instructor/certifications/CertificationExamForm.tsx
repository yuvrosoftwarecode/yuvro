import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Calendar, Settings, FileText } from 'lucide-react';
import { toast } from 'sonner';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import QuestionBank from '@/components/common/QuestionBank';
import { getCertificationExam, createCertificationExam, updateCertificationExam, CertificationExam } from '@/services/certificationService';
import courseService, { Course, TopicBasic } from '@/services/courseService';
import { fetchQuestionById } from '@/services/questionService';

export default function CertificationExamForm() {
    const navigate = useNavigate();
    const { examId } = useParams<{ examId: string }>();
    const isEditMode = !!examId;

    // Get URL parameters for course
    const urlParams = new URLSearchParams(window.location.search);
    const courseIdFromUrl = urlParams.get('courseId');

    const [exam, setExam] = useState<CertificationExam | null>(null);
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
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        instructions: '',
        difficulty: 'medium' as 'easy' | 'medium' | 'hard',
        duration: 60,
        total_marks: 100,
        passing_marks: 60,
        max_attempts: 3,
        enable_proctoring: false,
        publish_status: 'draft' as 'draft' | 'active' | 'inactive' | 'archived',
        course: courseIdFromUrl || '',
        start_datetime: '',
        end_datetime: '',
    });

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

    const fetchCoursesList = async () => {
        try {
            const data = await courseService.getCourses();
            setCourses(data);
        } catch (error) {
            console.error('Failed to fetch courses:', error);
            toast.error('Failed to load courses');
        }
    };

    const fetchExamDetails = async () => {
        if (!examId) return;

        setLoading(true);
        try {
            const data = await getCertificationExam(examId);
            setExam(data);

            // Populate form with exam data
            setFormData({
                title: data.title,
                description: data.description,
                instructions: data.instructions,
                difficulty: data.difficulty || 'medium',
                duration: data.duration,
                total_marks: data.total_marks || 100, // Handle optional field if newly added
                passing_marks: data.passing_marks,
                max_attempts: data.max_attempts || 3,
                enable_proctoring: data.enable_proctoring || false,
                publish_status: data.publish_status,
                course: String(data.course),
                start_datetime: data.start_datetime ? new Date(data.start_datetime).toISOString().slice(0, 16) : '',
                end_datetime: data.end_datetime ? new Date(data.end_datetime).toISOString().slice(0, 16) : '',
            });

            setSelectedCourse(String(data.course));

            // Handle questions config which might be null/undefined initially
            const questionsConfig = data.questions_config || {};
            const allQuestions = [
                ...(questionsConfig.mcq_single || []),
                ...(questionsConfig.mcq_multiple || []),
                ...(questionsConfig.coding || []),
                ...(questionsConfig.descriptive || [])
            ];
            setSelectedQuestions(allQuestions);
            setSelectedQuestionsByType({
                mcq_single: questionsConfig.mcq_single || [],
                mcq_multiple: questionsConfig.mcq_multiple || [],
                coding: questionsConfig.coding || [],
                descriptive: questionsConfig.descriptive || []
            });
            setRandomQuestionsConfig(data.questions_random_config || {
                mcq_single: 0,
                mcq_multiple: 0,
                coding: 0,
                descriptive: 0
            });
        } catch (error) {
            console.error('Failed to fetch certification exam:', error);
            toast.error('Failed to load certification exam');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoursesList();
        if (isEditMode) {
            fetchExamDetails();
        } else {
            if (courseIdFromUrl) {
                setSelectedCourse(courseIdFromUrl);
                setFormData(prev => ({ ...prev, course: courseIdFromUrl }));
            }
        }
    }, [examId, courseIdFromUrl]);

    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            toast.error('Please enter an exam title');
            return;
        }
        if (!formData.course) {
            toast.error('Please select a course');
            return;
        }
        if (!formData.start_datetime || !formData.end_datetime) {
            toast.error('Please set start and end dates');
            return;
        }

        if (new Date(formData.end_datetime) <= new Date(formData.start_datetime)) {
            toast.error('End time must be after start time');
            return;
        }

        const payload = {
            title: formData.title,
            description: formData.description,
            instructions: formData.instructions,
            difficulty: formData.difficulty,
            duration: formData.duration,
            total_marks: formData.total_marks,
            passing_marks: formData.passing_marks,
            max_attempts: formData.max_attempts,
            enable_proctoring: formData.enable_proctoring,
            publish_status: formData.publish_status,
            course: formData.course,
            start_datetime: formData.start_datetime,
            end_datetime: formData.end_datetime,
            questions_config: selectedQuestionsByType,
            questions_random_config: randomQuestionsConfig,
        };

        try {
            if (isEditMode && examId) {
                await updateCertificationExam(examId, payload);
                toast.success('Certification Exam updated successfully');
            } else {
                await createCertificationExam(payload);
                toast.success('Certification Exam created successfully');
            }

            navigate('/instructor/certifications');
        } catch (error: any) {
            toast.error(isEditMode ? 'Failed to update exam' : 'Failed to create exam');
        }
    };

    const getHeaderTitle = () => {
        return isEditMode ? `Edit Certification Exam: ${exam?.title || 'Loading...'}` : 'Create New Certification Exam';
    };

    if (loading && isEditMode) {
        return (
            <div className="min-h-screen bg-gray-50 flex">
                <RoleSidebar />
                <div className="flex-1">
                    <RoleHeader title="Loading..." actions={null} />
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <RoleSidebar />
            <div className="flex-1 flex flex-col">
                <RoleHeader
                    title={getHeaderTitle()}
                    subtitle="Configure certification exam details, schedule and questions"
                    actions={
                        <button
                            onClick={() => navigate('/instructor/certifications')}
                            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                        >
                            ← Back to List
                        </button>
                    }
                />

                <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
                    <div className="bg-white shadow rounded-lg mb-6 p-6">
                        <Tabs value={currentFormTab} onValueChange={setCurrentFormTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1 rounded-lg">
                                <TabsTrigger value="details" className="flex items-center gap-2">
                                    <Settings className="h-4 w-4" /> Exam Details & Schedule
                                </TabsTrigger>
                                <TabsTrigger value="questions" className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Questions ({Object.values(selectedQuestionsByType).flat().length + Object.values(randomQuestionsConfig).reduce((sum, count) => sum + count, 0)})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="space-y-6">
                                {/* Basic Information Card */}
                                <Card className="border border-gray-200 shadow-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                                            <Trophy className="h-5 w-5 mr-2 text-blue-500" />
                                            Basic Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Exam Title *</label>
                                                <input
                                                    type="text"
                                                    value={formData.title}
                                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                    placeholder="e.g., Final Certification Exam"
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
                                                <select
                                                    value={formData.course}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, course: e.target.value });
                                                        setSelectedCourse(e.target.value);
                                                    }}
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    disabled={isEditMode || !!courseIdFromUrl}
                                                >
                                                    <option value="">Select a Course</option>
                                                    {courses.map(course => (
                                                        <option key={course.id} value={course.id}>{course.name || course.title}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                rows={3}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                                            <textarea
                                                value={formData.instructions}
                                                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                                                rows={3}
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Schedule & Config Card */}
                                <Card className="border border-gray-200 shadow-sm">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                                            <Calendar className="h-5 w-5 mr-2 text-green-500" />
                                            Schedule & Configuration
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date/Time *</label>
                                                <input
                                                    type="datetime-local"
                                                    value={formData.start_datetime}
                                                    onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">End Date/Time *</label>
                                                <input
                                                    type="datetime-local"
                                                    value={formData.end_datetime}
                                                    onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (mins) *</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formData.duration}
                                                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks *</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formData.total_marks}
                                                    onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) || 100 })}
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Passing Marks *</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formData.passing_marks}
                                                    onChange={(e) => setFormData({ ...formData, passing_marks: parseInt(e.target.value) || 60 })}
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Max Attempts</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formData.max_attempts}
                                                    onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 1 })}
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                                                <select
                                                    value={formData.difficulty}
                                                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="easy">Easy</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="hard">Hard</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Publish Status</label>
                                                <select
                                                    value={formData.publish_status}
                                                    onChange={(e) => setFormData({ ...formData, publish_status: e.target.value as any })}
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="draft">Draft</option>
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                    <option value="archived">Archived</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex items-center mt-2">
                                            <input
                                                type="checkbox"
                                                id="enable_proctoring"
                                                checked={formData.enable_proctoring}
                                                onChange={(e) => setFormData({ ...formData, enable_proctoring: e.target.checked })}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="enable_proctoring" className="ml-2 block text-sm text-gray-900">
                                                Enable Proctoring (Camera, Tab monitoring)
                                            </label>
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
                                        <p className="text-sm text-gray-500 mb-4">
                                            Auto-select questions from the Question Bank based on type. These will be randomized for each student.
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">MCQ Single</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={randomQuestionsConfig.mcq_single}
                                                    onChange={(e) => setRandomQuestionsConfig({
                                                        ...randomQuestionsConfig,
                                                        mcq_single: parseInt(e.target.value) || 0
                                                    })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">MCQ Multiple</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={randomQuestionsConfig.mcq_multiple}
                                                    onChange={(e) => setRandomQuestionsConfig({
                                                        ...randomQuestionsConfig,
                                                        mcq_multiple: parseInt(e.target.value) || 0
                                                    })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Coding</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={randomQuestionsConfig.coding}
                                                    onChange={(e) => setRandomQuestionsConfig({
                                                        ...randomQuestionsConfig,
                                                        coding: parseInt(e.target.value) || 0
                                                    })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Descriptive</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={randomQuestionsConfig.descriptive}
                                                    onChange={(e) => setRandomQuestionsConfig({
                                                        ...randomQuestionsConfig,
                                                        descriptive: parseInt(e.target.value) || 0
                                                    })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
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
                                        <p className="text-sm text-gray-500 mb-4">
                                            Manually select specific questions that MUST appear in the exam.
                                        </p>
                                        <QuestionBank
                                            mode="selection"
                                            selectedQuestions={selectedQuestions}
                                            onQuestionsChange={handleQuestionsChange}
                                            allowMultipleSelection={true}
                                            showSplitView={true}
                                        // Removing courseFilter and categoryFilter to allow selecting ALL questions
                                        // courseFilter={selectedCourse} 
                                        // categoryFilter="certification"
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                                <button
                                    onClick={() => navigate('/instructor/certifications')}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                    {isEditMode ? 'Update Exam' : 'Create Exam'}
                                </button>
                            </div>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
