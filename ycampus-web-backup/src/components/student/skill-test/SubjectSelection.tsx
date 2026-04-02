import { Subject } from '@/pages/student/PracticeTest';
import { cn } from '@/lib/utils';
import RoleHeader from '@/components/common/RoleHeader';

interface SubjectSelectionProps {
  subjects: Subject[];
  onSubjectSelect: (subject: Subject) => void;
  title?: string;
  subtitle?: string;
}

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-600',
  green: 'bg-emerald-600',
  orange: 'bg-orange-600',
  yellow: 'bg-amber-500',
  purple: 'bg-purple-600',
  cyan: 'bg-cyan-600',
  pink: 'bg-pink-600',
  indigo: 'bg-indigo-600',
};

const SubjectSelection = ({ subjects, onSubjectSelect, title = "Skill Test", subtitle = "Choose a subject to start testing your knowledge" }: SubjectSelectionProps) => {
  return (
    <div className="p-0 animate-fade-in px-6 lg:px-8 py-6">
      <RoleHeader
        title={title}
        subtitle={subtitle}
        noPadding
        className="py-0 pb-8"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject) => {
          return (
            <button
              key={subject.id}
              onClick={() => onSubjectSelect(subject)}
              className="flex items-center gap-4 px-5 py-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 text-left group"
            >
              <div className={cn(
                "w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 flex-shrink-0 text-white",
                COLOR_MAP[subject.color as keyof typeof COLOR_MAP] || 'bg-slate-600'
              )}>
                {(() => {
                  const Icon = subject.icon as any;
                  return <Icon className="w-6 h-6 text-white" />;
                })()}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800 group-hover:text-slate-900 leading-snug">
                  {subject.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubjectSelection;
