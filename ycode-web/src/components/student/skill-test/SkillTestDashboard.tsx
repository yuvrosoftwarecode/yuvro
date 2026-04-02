import { Course } from '@/pages/student/SkillTest';
import ModernCard from '@/components/common/ModernCard';
import { getCourseIconConfig } from '@/utils/CourseIcons';
import { Book } from 'lucide-react';

interface SkillTestDashboardProps {
  courses: Course[];
  onCourseSelect: (course: Course) => void;
}

  // Removed manual styles, using getCourseIconConfig instead

const SkillTestDashboard = ({ courses, onCourseSelect }: SkillTestDashboardProps) => {
  return (
    <div className="px-8 py-6 animate-fade-in max-w-[1600px] mx-auto min-h-full bg-background">
      <div className="mb-10 text-left">
        <h1 className="text-3xl font-bold text-gray-900">
          Skill Test
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          Choose a course to start testing your knowledge
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.map((course) => {
          const config = getCourseIconConfig(course.name, course.category);
          const Icon = config.Icon;

          return (
            <ModernCard
              key={course.id}
              title={course.name}
              description={course.description}
              icon={<Icon className="w-6 h-6 text-white" />}
              iconClassName={`${config.bg} p-2 rounded-lg`}
              gradientColor={config.gradient || "from-blue-500"}
              actionLabel="Select Course"
              onAction={() => onCourseSelect(course)}
              tags={[
                { text: course.category || "General", variant: "secondary" }
              ]}
              footerItems={[
                { icon: <Book className="w-5 h-5" />, text: `${course.topicCount || 0} Topics` }
              ]}
            />
          );
        })}
      </div>
    </div>
  );
};

export default SkillTestDashboard;
