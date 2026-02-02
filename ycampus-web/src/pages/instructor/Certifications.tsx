import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCertificationExams, CertificationExam, deleteCertificationExam } from '@/services/certificationService';
import { fetchCourses, Course } from '@/services/courseService';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import SearchBar from '@/components/common/SearchBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Award, BarChart2, Edit, Loader2, Plus, BookOpen, Trophy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InstructorCertifications() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [exams, setExams] = useState<CertificationExam[]>([]);
    const [allExams, setAllExams] = useState<CertificationExam[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState<'courses' | 'exams'>('courses');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState('fundamentals');

    const CATEGORY_LABELS: Record<string, string> = {
        fundamentals: "Fundamentals",
        programming_languages: "Programming Languages",
        databases: "Databases",
        ai_tools: "AI Tools",
    };

    const CATEGORY_GRADIENTS: Record<string, string> = {
        fundamentals: "from-blue-900 to-blue-700",
        programming_languages: "from-purple-900 to-purple-700",
        databases: "from-green-900 to-green-700",
        ai_tools: "from-orange-900 to-orange-700",
    };

    useEffect(() => {
        fetchData();
        // Check for courseId in URL to auto-select
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('courseId');
        if (courseId) {
            // We need courses loaded first to find this course, handled in fetchData/useEffect logic
        }
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [examsData, coursesData] = await Promise.all([
                getCertificationExams(),
                fetchCourses()
            ]);

            setAllExams(Array.isArray(examsData) ? examsData : examsData.results || []);
            setCourses(Array.isArray(coursesData) ? coursesData : coursesData.results || []);

        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCourseSelect = (course: Course) => {
        setSelectedCourse(course);
        // Filter exams for this course
        const courseExams = allExams.filter(e => String(e.course) === String(course.id));
        setExams(courseExams);
        setCurrentView('exams');
    };

    const handleBackToCourses = () => {
        setSelectedCourse(null);
        setCurrentView('courses');
        setExams([]);
    };

    const handleCreateExam = () => {
        if (!selectedCourse) return;
        navigate(`/instructor/certifications/create?courseId=${selectedCourse.id}`);
    };

    const handleDeleteExam = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this exam?')) return;
        try {
            await deleteCertificationExam(id);
            toast.success('Exam deleted successfully');
            fetchData();
        } catch (error) {
            console.error('Failed to delete exam:', error);
            toast.error('Failed to delete exam');
        }
    };

    const filteredCourses = courses.filter(course => course.category === selectedTab);

    const filteredExams = exams.filter(exam =>
        exam.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const courseCounts = courses.reduce((acc: any, course) => {
        acc[course.category] = (acc[course.category] || 0) + 1;
        return acc;
    }, {});

    const getHeaderTitle = () => {
        return currentView === 'courses' ? 'Certifications Management' : `${selectedCourse?.name} - Exams`;
    };

    const getHeaderSubtitle = () => {
        return currentView === 'courses'
            ? 'Select a course to manage its certification exams'
            : 'Manage certification exams for this course';
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <RoleSidebar />
            <div className="flex-1 flex flex-col">
                <RoleHeader
                    title={getHeaderTitle()}
                    subtitle={getHeaderSubtitle()}
                    actions={
                        currentView === 'exams' ? (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleBackToCourses} className="bg-white text-gray-700 hover:bg-gray-100">
                                    ← Back to Courses
                                </Button>
                                <Button onClick={handleCreateExam}>
                                    <Plus className="mr-2 h-4 w-4" /> Create Exam
                                </Button>
                            </div>
                        ) : null
                    }
                />

                <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Loading...</span>
                        </div>
                    ) : (
                        <>
                            {currentView === 'courses' && (
                                <>
                                    {/* Tabs */}
                                    <div className="mb-6">
                                        <nav className="flex space-x-8">
                                            {[
                                                { key: 'fundamentals', label: 'Fundamentals', count: courseCounts.fundamentals || 0 },
                                                { key: 'programming_languages', label: 'Programming Languages', count: courseCounts.programming_languages || 0 },
                                                { key: 'databases', label: 'Databases', count: courseCounts.databases || 0 },
                                                { key: 'ai_tools', label: 'AI Tools', count: courseCounts.ai_tools || 0 }
                                            ].map((tab) => (
                                                <button
                                                    key={tab.key}
                                                    onClick={() => setSelectedTab(tab.key)}
                                                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${selectedTab === tab.key
                                                        ? 'border-blue-500 text-blue-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <span>{tab.label}</span>
                                                    <span className={`rounded-full px-2 py-1 text-xs ${selectedTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {tab.count}
                                                    </span>
                                                </button>
                                            ))}
                                        </nav>
                                    </div>

                                    {filteredCourses.length === 0 ? (
                                        <div className="bg-white shadow rounded-lg p-12 text-center">
                                            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                                            <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
                                            <p className="mt-1 text-sm text-gray-500">
                                                No {CATEGORY_LABELS[selectedTab]} courses available.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {filteredCourses.map((course) => (
                                                <Card
                                                    key={course.id}
                                                    className="group relative overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-200 hover:border-gray-300 bg-white rounded-xl cursor-pointer"
                                                    onClick={() => handleCourseSelect(course)}
                                                >
                                                    <CardContent className="p-0">
                                                        <div className={`bg-gradient-to-r ${CATEGORY_GRADIENTS[course.category]} p-4 text-white relative overflow-hidden`}>
                                                            <div className="absolute inset-0 opacity-10">
                                                                <div className="absolute inset-0" style={{
                                                                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                                                                }} />
                                                            </div>

                                                            <div className="flex items-start justify-between relative z-10">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <BookOpen className="h-4 w-4 text-white/70" />
                                                                        <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                                                                            {CATEGORY_LABELS[course.category]}
                                                                        </span>
                                                                    </div>
                                                                    <h3 className="font-bold text-lg leading-tight mb-2 text-white">
                                                                        {course.name}
                                                                    </h3>
                                                                </div>
                                                                {course.short_code && (
                                                                    <div className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/30">
                                                                        <span className="text-xs font-bold text-white">
                                                                            {course.short_code}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="p-5">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                                    <Award className="h-3.5 w-3.5" />
                                                                    <span>
                                                                        {allExams.filter(e => String(e.course) === String(course.id)).length} Exams
                                                                    </span>
                                                                </div>
                                                                <div className="text-blue-600 font-semibold text-sm">
                                                                    Manage →
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {currentView === 'exams' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
                                    </div>

                                    <Card>
                                        <CardContent className="p-0">
                                            {filteredExams.length === 0 ? (
                                                <div className="text-center py-12 text-muted-foreground">
                                                    <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                                                    <p>No certification exams found for this course.</p>
                                                    <Button variant="link" onClick={handleCreateExam} className="mt-2">
                                                        Create your first exam
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                                            <TableHead className="w-[30%]">Title</TableHead>
                                                            <TableHead>Difficulty</TableHead>
                                                            <TableHead>Duration</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead>Participants</TableHead>
                                                            <TableHead className="text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredExams.map((exam) => (
                                                            <TableRow key={exam.id} className="hover:bg-gray-50/50 transition-colors">
                                                                <TableCell className="font-medium">
                                                                    <div className="text-sm font-semibold text-gray-900">{exam.title}</div>
                                                                    {exam.start_datetime && (
                                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                                            {new Date(exam.start_datetime).toLocaleDateString()}
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className={`capitalize ${exam.difficulty === 'easy' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                                                                            exam.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' :
                                                                                'bg-red-100 text-red-700 hover:bg-red-100'
                                                                            }`}
                                                                    >
                                                                        {exam.difficulty}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-gray-600 font-medium">
                                                                    {exam.duration} min
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        variant={exam.publish_status === 'active' ? 'default' : 'secondary'}
                                                                        className={exam.publish_status === 'active'
                                                                            ? 'bg-green-100 text-green-700 hover:bg-green-100 shadow-none font-medium'
                                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-100 font-medium'}
                                                                    >
                                                                        {exam.publish_status}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-gray-600 pl-8">
                                                                    {exam.participants_count || 0}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex justify-end items-center gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                                                            onClick={() => navigate(`/instructor/certifications/${exam.id}/analytics`)}
                                                                            title="View Analytics"
                                                                        >
                                                                            <BarChart2 className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-gray-500 hover:text-gray-600 hover:bg-gray-100"
                                                                            onClick={() => navigate(`/instructor/certifications/${exam.id}/edit`)}
                                                                            title="Edit Exam"
                                                                        >
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                            onClick={() => handleDeleteExam(exam.id)}
                                                                            title="Delete Exam"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
