import { Subject } from '@/pages/student/PracticeTest';
import { cn } from '@/lib/utils';

interface SubjectSelectionProps {
  subjects: Subject[];
  onSubjectSelect: (subject: Subject) => void;
  title?: string;
  subtitle?: string;
}

const SubjectSelection = ({ subjects, onSubjectSelect, title = "Skill Test", subtitle = "Choose a subject to start testing your knowledge" }: SubjectSelectionProps) => {
  return (
    <div className="p-8 animate-fade-in max-w-[1400px] mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
          {title}
        </h1>
        <p className="text-sm md:text-base text-slate-500">
          {subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {subjects.map((subject) => {
          return (
            <button
              key={subject.id}
              onClick={() => onSubjectSelect(subject)}
              className={cn(
                "group flex items-center gap-4 p-5 rounded-xl transition-all duration-200 text-left w-full",
                "bg-white hover:bg-slate-50",
                "border border-slate-300 hover:border-blue-400 shadow-[0_2px_4px_rgba(0,0,0,0.05)] hover:shadow-md"
              )}
            >
              <div className="flex items-center justify-center w-6 h-6 text-slate-800 group-hover:text-black transition-colors flex-shrink-0">
                {subject.icon}
              </div>
              <span className="font-medium text-sm md:text-base text-slate-800 group-hover:text-black transition-colors line-clamp-2 leading-tight">
                {subject.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubjectSelection;
