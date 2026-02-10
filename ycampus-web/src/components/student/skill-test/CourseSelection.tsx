import { Course } from '@/pages/student/SkillTest';
import ModernCard from '@/components/common/ModernCard';

interface CourseSelectionProps {
  courses: Course[];
  onCourseSelect: (course: Course) => void;
}

const CourseSelection = ({ courses, onCourseSelect }: CourseSelectionProps) => {
  return (
    <div className="p-8 animate-fade-in max-w-[1600px] mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Skill Test
        </h1>
        <p className="text-muted-foreground">
          Choose a course to start testing your knowledge
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.map((course) => {
          return (
            <ModernCard
              key={course.id}
              title={course.name}
              description={course.description}
              icon={course.icon}
              iconClassName={`${course.iconBg} p-2 rounded-lg`}
              gradientColor={course.gradient || "from-blue-500"}
              actionLabel="Select Course"
              onAction={() => onCourseSelect(course)}
              tags={[
                { text: course.category || "General", variant: "secondary" }
              ]}
              footerItems={[
                { icon: <span className="text-lg">📚</span>, text: `${course.topicCount || 0} Topics` }
              ]}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CourseSelection;
