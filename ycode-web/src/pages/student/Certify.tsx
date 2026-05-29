import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCertificationExams, getMyCertificates, CertificationExam } from '@/services/certificationService';
import { fetchCourses, Course } from '@/services/courseService';
import DashboardLayout from "@/components/common/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Clock, Award, BookOpen, Search } from "lucide-react";
import { toast } from 'sonner';

interface PaginatedResponse<T> {
    results: T[];
    count?: number;
    next?: string | null;
    previous?: string | null;
}

const Certify: React.FC = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [allExams, setAllExams] = useState<CertificationExam[]>([]);
    const [exams, setExams] = useState<CertificationExam[]>([]);
    const [myCertificates, setMyCertificates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [currentView, setCurrentView] = useState<'courses' | 'exams'>('courses');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState('fundamentals');

    const CATEGORY_LABELS: Record<string, string> = {
        fundamentals: "Fundamentals",
        advanced: "Advanced",
        programming_languages: "Programming Languages",
        databases: "Databases",
        ai_tools: "AI Tools",
    };

    const CATEGORY_GRADIENTS: Record<string, string> = {
        fundamentals: "from-blue-900 to-blue-700",
        advanced: "from-indigo-900 to-indigo-700",
        programming_languages: "from-purple-900 to-purple-700",
        databases: "from-green-900 to-green-700",
        ai_tools: "from-orange-900 to-orange-700",
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [examsData, coursesData, certificatesData] = await Promise.all([
                getCertificationExams() as Promise<CertificationExam[] | PaginatedResponse<CertificationExam>>,
                fetchCourses() as Promise<Course[] | PaginatedResponse<Course>>,
                getMyCertificates() as Promise<any[] | PaginatedResponse<any>>
            ]);
            setAllExams(Array.isArray(examsData) ? examsData : examsData.results || []);
            setCourses(Array.isArray(coursesData) ? coursesData : coursesData.results || []);
            setMyCertificates(Array.isArray(certificatesData) ? certificatesData : (certificatesData as any).results || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCourseSelect = (course: Course) => {
        setSelectedCourse(course);
        const courseExams = allExams.filter(e => String(e.course) === String(course.id) && e.publish_status === 'active');
        setExams(courseExams);
        setCurrentView('exams');
        window.scrollTo(0, 0);
    };

    const handleBackToCourses = () => {
        setSelectedCourse(null);
        setCurrentView('courses');
        setExams([]);
    };

    const handleStartExam = (examId: number) => {
        navigate(`/student/certifications/exam/${examId}`);
    };

    const filteredCourses = courses.filter(course => course.category === selectedTab);

    const courseCounts = courses.reduce((acc: any, course) => {
        acc[course.category] = (acc[course.category] || 0) + 1;
        return acc;
    }, {});

    if (loading) {
        return (
            <DashboardLayout hideHeader={true} hideFooter={true}>
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            hideHeader={true}
            hideFooter={true}
            contentClassName="bg-gray-50/50"
        >
            <div className="flex-1 px-8 py-1 pb-12">
                <div className="max-w-[1600px] mx-auto space-y-8">
                    {/* Header */}
                    <div className="space-y-6 pt-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                    {currentView === 'courses' ? 'Certifications' : `${selectedCourse?.name} Certifications`}
                                </h1>
                                <p className="text-gray-600 py-2 text-sm">
                                    {currentView === 'courses'
                                        ? 'Validate your skills with official certifications.'
                                        : 'Select an exam to get certified.'}
                                </p>
                            </div>
                            {currentView === 'exams' && (
                                <Button variant="outline" onClick={handleBackToCourses} className="bg-white">
                                    ← Back to Courses
                                </Button>
                            )}
                        </div>
                    </div>

                    {currentView === 'courses' && myCertificates.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <span>🎓</span> My Earned Certificates
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {myCertificates.map((cert) => (
                                    <Card key={cert.id} className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border-none text-white overflow-hidden shadow-lg shadow-indigo-950/20 relative group hover:scale-[1.02] transition-transform duration-300">
                                        <div className="absolute top-0 right-0 p-4 opacity-15 text-6xl pointer-events-none group-hover:scale-110 transition-transform duration-500">
                                            🏆
                                        </div>
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <Badge className="bg-amber-500 text-black font-bold text-[10px] tracking-wide hover:bg-amber-600">
                                                    ACCREDITED
                                                </Badge>
                                                <span className="text-[10px] font-mono text-gray-400">
                                                    {cert.certificate_id}
                                                </span>
                                            </div>
                                            <CardTitle className="text-lg font-bold text-white mt-2 line-clamp-1">{cert.course_name}</CardTitle>
                                            <CardDescription className="text-indigo-200/70 text-xs">
                                                Issued on {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pb-4 pt-1">
                                            <p className="text-xs text-indigo-100/60 font-medium">Recipient</p>
                                            <p className="text-sm font-bold text-white">{cert.user_name}</p>
                                        </CardContent>
                                        <CardFooter className="pt-2 border-t border-indigo-900/50 flex justify-between gap-3">
                                            <a 
                                                href={(() => {
                                                    const apiBase = import.meta.env.VITE_BACKEND_API_BASE_URL || 'http://localhost:8000/api';
                                                    const host = apiBase.replace(/\/api\/?$/, '');
                                                    return `${host}${cert.certificate_url}`;
                                                })()}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full text-center py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl shadow-md transition-colors active:scale-[0.98]"
                                            >
                                                View & Download
                                            </a>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentView === 'courses' && (
                        <>
                            {/* Tabs */}
                            <div className="mb-6">
                                <nav className="flex space-x-8">
                                    {[
                                        { key: 'fundamentals', label: 'Fundamentals', count: courseCounts.fundamentals || 0 },
                                        { key: 'advanced', label: 'Advanced', count: courseCounts.advanced || 0 },
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

                            {/* Courses Grid */}
                            {filteredCourses.length === 0 ? (
                                <div className="py-12 text-center text-gray-600 bg-white rounded-lg shadow-sm border">
                                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-lg font-medium">No Courses Available</h3>
                                    <p className="max-w-md mx-auto mt-2 text-sm text-gray-500">
                                        No courses found in this category.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredCourses.map((course) => (
                                        <div
                                            key={course.id}
                                            className="group relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                                            onClick={() => handleCourseSelect(course)}
                                        >
                                            {/* Course Header with gradient */}
                                            <div className={`bg-gradient-to-r ${CATEGORY_GRADIENTS[course.category]} p-6 text-white relative overflow-hidden h-32`}>
                                                <div className="absolute inset-0 opacity-10">
                                                    <div className="absolute inset-0" style={{
                                                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                                                    }} />
                                                </div>
                                                <div className="relative z-10 flex flex-col justify-between h-full">
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="h-4 w-4 text-white/80" />
                                                        <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
                                                            {CATEGORY_LABELS[course.category]}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-xl leading-tight text-white mb-1">
                                                        {course.name}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="p-5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                        <Award className="h-4 w-4 text-blue-500" />
                                                        <span>
                                                            {allExams.filter(e => String(e.course) === String(course.id) && e.publish_status === 'active').length} Exams Available
                                                        </span>
                                                    </div>
                                                    <div className="text-blue-600 font-semibold text-sm group-hover:underline">
                                                        Get Certified →
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {currentView === 'exams' && (
                        <>
                            {exams.length === 0 ? (
                                <div className="py-12 text-center text-gray-600 bg-white rounded-lg shadow-sm border">
                                    <Award className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-lg font-medium">No Active Exams</h3>
                                    <p className="max-w-md mx-auto mt-2 text-sm text-gray-500">
                                        There are currently no active certification exams for this course.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {exams.map((exam) => (
                                        <Card key={exam.id} className="flex flex-col h-full hover:shadow-md transition-shadow border-t-4 border-t-blue-500">
                                            <CardHeader>
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                                        Certificate Exam
                                                    </Badge>
                                                    <div className="flex flex-col gap-1 items-end">
                                                        <Badge variant={exam.difficulty === 'hard' ? 'destructive' : exam.difficulty === 'medium' ? 'default' : 'secondary'} className="text-[10px] capitalize px-1.5 py-0.5 h-5">
                                                            {exam.difficulty || 'Medium'}
                                                        </Badge>
                                                        <span className="text-xs font-medium text-gray-500">
                                                            {exam.my_submissions?.length || 0} / {exam.max_attempts} Attempts
                                                        </span>
                                                    </div>
                                                </div>
                                                <CardTitle className="line-clamp-2 text-lg">{exam.title}</CardTitle>
                                                <CardDescription className="line-clamp-2 mt-2">{exam.description}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="flex-1 space-y-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Clock className="h-4 w-4 text-gray-400" />
                                                    <span>{exam.duration} Minutes</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    <span>
                                                        Ends: {exam.end_datetime ? new Date(exam.end_datetime).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <Button
                                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                                    onClick={() => handleStartExam(exam.id)}
                                                >
                                                    Start Exam
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Certify;
