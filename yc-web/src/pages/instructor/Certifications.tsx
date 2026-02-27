import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCertificationExams, CertificationExam, deleteCertificationExam } from '@/services/certificationService';
import { fetchCourses, Course } from '@/services/courseService';
import DashboardLayout from '@/components/common/DashboardLayout';
import SearchBar from '@/components/common/SearchBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Award, BarChart2, Edit, Loader2, Plus, BookOpen, Trophy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TOPIC_CATEGORY_LABELS } from '@/lib/instructorConstants';
import InstructorCourseCard from '@/components/common/instructor/InstructorCourseCard';
import InstructorCategoryTabs from '@/components/common/instructor/InstructorCategoryTabs';

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

            const exams = examsData as any;
            const courses = coursesData as any;
            setAllExams(Array.isArray(exams) ? exams : exams.results || []);
            setCourses(Array.isArray(courses) ? courses : courses.results || []);

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
        <DashboardLayout
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
        >

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
                                <InstructorCategoryTabs
                                    selectedTab={selectedTab}
                                    onTabChange={(v) => setSelectedTab(v)}
                                    counts={courseCounts}
                                />

                                {filteredCourses.length === 0 ? (
                                    <div className="bg-white shadow rounded-lg p-12 text-center">
                                        <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            No {TOPIC_CATEGORY_LABELS[selectedTab]} courses available.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {filteredCourses.map((course) => (
                                            <InstructorCourseCard
                                                key={course.id}
                                                course={course as any}
                                                onClick={() => handleCourseSelect(course)}
                                                actionLabel="Manage"
                                                statsLabel="Exams"
                                                statsCount={allExams.filter(e => String(e.course) === String(course.id)).length}
                                            />
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
                                                <Button onClick={handleCreateExam} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                                                    <Plus className="mr-2 h-4 w-4" />
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
        </DashboardLayout>
    );
}
