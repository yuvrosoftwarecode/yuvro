import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Code2, Database, Cpu, FileCode, Braces, Terminal,
  Trophy, Target, Brain, CheckCircle2
} from 'lucide-react';
import { fetchCourses } from '@/services/courseService';
import type { Course } from '@/pages/student/CodePractice';
import { toast } from 'sonner';
import ModernCard from '@/components/common/ModernCard';
import { getCourseIconConfig } from '@/utils/CourseIcons';
import { StatsCard } from '@/components/common/StatsCard';

interface CourseDashboardProps {
  onCourseSelect: (course: Course) => void;
  onViewAnalytics: () => void;
}

const CourseDashboard = ({ onCourseSelect, onViewAnalytics }: CourseDashboardProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const fetchedCourses = await fetchCourses();

        const transformedCourses: Course[] = fetchedCourses.map(course => ({
          id: course.id.toString(),
          name: course.name || course.title || 'Untitled Course',
          icon: course.category,
          progress: Math.round(course.progress_percentage || 0),
          totalProblems: course.total_problems || 0,
          solvedProblems: course.solved_problems || 0,
          totalScore: course.total_score || 0,
          aiHelpUsed: course.ai_help_used || 0,
          iconColor: '', // Will be handled dynamically
          category: course.category,
        }));

        setCourses(transformedCourses);
      } catch (error) {
        console.error('Failed to load courses:', error);
        toast.error('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 px-6 py-8">
        <div className="max-w-[1600px] mx-auto animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 px-6 py-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Code Practice</h1>
            <p className="text-gray-600 text-sm mt-1">
              Sharpen your coding skills with hands-on practice
            </p>
          </div>

          <Button
            onClick={onViewAnalytics}
            className="bg-gradient-to-r from-blue-500 to-teal-500 text-white border-0 hover:opacity-90 shadow-md transition-transform hover:scale-105"
          >
            View Analytics
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          <StatsCard
            label="Problems Solved"
            value={courses.reduce((sum, c) => sum + c.solvedProblems, 0)}
            icon={CheckCircle2}
            colorScheme="green"
            className="z-40 h-full"
          />

          <StatsCard
            label="Total Score"
            value={courses.reduce((sum, c) => sum + (c.totalScore || 0), 0)}
            icon={Trophy}
            colorScheme="purple"
            className="z-40 h-full"
          />

          <StatsCard
            label="AI Help Used"
            value={courses.reduce((sum, c) => sum + (c.aiHelpUsed || 0), 0)}
            icon={Brain}
            colorScheme="blue"
            className="z-40 h-full"
          />

          <StatsCard
            label="Courses Available"
            value={courses.length}
            icon={Target}
            colorScheme="amber"
            className="z-40 h-full"
          />

        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map(course => {
            const config = getCourseIconConfig(course.name, course.category);
            const IconComponent = config.Icon;

            return (
              <ModernCard
                key={course.id}
                title={course.name}
                description={`Master ${course.name} concepts with hands-on coding challenges and real-world scenarios.`}
                icon={<IconComponent className="h-6 w-6 text-white" />}
                iconClassName={`${config.bg} p-2 rounded-lg`}
                gradientColor={config.gradient || "from-blue-500"}
                progress={course.progress}
                tags={[
                  { text: course.category.replace('_', ' '), variant: "secondary" }
                ]}
                footerItems={[
                  { icon: <Target className="w-3.5 h-3.5" />, text: `${course.totalProblems} Problems` },
                  { icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: `${course.solvedProblems} Solved` }
                ]}
                actionLabel="Start Practice"
                onAction={() => onCourseSelect(course)}
              />
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default CourseDashboard;