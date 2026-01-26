import { Course } from '@/pages/student/SkillTest';
import ModernCard from '@/components/common/ModernCard';

interface CourseSelectionProps {
  courses: Course[];
  onCourseSelect: (course: Course) => void;
}

const getCourseStyle = (id: string | number) => {
  const styles = [
    { bg: "bg-blue-50", text: "text-blue-600", gradient: "from-blue-500 to-indigo-600" },
    { bg: "bg-purple-50", text: "text-purple-600", gradient: "from-purple-500 to-violet-600" },
    { bg: "bg-emerald-50", text: "text-emerald-600", gradient: "from-emerald-500 to-teal-600" },
    { bg: "bg-amber-50", text: "text-amber-600", gradient: "from-amber-500 to-orange-600" },
    { bg: "bg-rose-50", text: "text-rose-600", gradient: "from-rose-500 to-pink-600" },
    { bg: "bg-indigo-50", text: "text-indigo-600", gradient: "from-indigo-500 to-blue-600" },
    { bg: "bg-cyan-50", text: "text-cyan-600", gradient: "from-cyan-500 to-sky-600" },
  ];

  // Simple hash to ensuring consistent color for the same course ID
  const index = String(id).charCodeAt(0) % styles.length;
  return styles[index];
};

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
          const style = getCourseStyle(course.id);

          return (
            <ModernCard
              key={course.id}
              title={course.name}
              description={course.description}
              icon={<span className="text-3xl">{course.icon}</span>}
              iconClassName={`${style.bg} ${style.text}`}
              gradientColor={style.gradient}
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
