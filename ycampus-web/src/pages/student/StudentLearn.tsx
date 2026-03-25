import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RoleSidebar from '@/components/common/RoleSidebar';
import SubjectDetail from '@/components/student/SubjectDetail';
import { fetchSubjects } from '@/services/subjectService';
import {
  BookOpen, Code, Database,
  Globe, Cpu, Layers, FlaskConical,
  BookMarked, PenLine, Sigma, Atom,
  Pencil, Binary, BrainCircuit, SquareFunction,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubjectItem {
  id: string;
  subject_name: string;
  short_code?: string;
  category?: string;
}

const COLORS = [
  "blue",
  "green",
  "orange",
  "yellow",
  "purple",
  "cyan",
  "pink",
  "indigo",
];

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

function getSubjectIcon(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('calculus') || n.includes('matrices') || n.includes('math')) return Sigma;
  if (n.includes('python') || n.includes('java') || n.includes('programming') || n.includes('problem solving')) return Code;
  if (n.includes('data') || n.includes('sql') || n.includes('database')) return Database;
  if (n.includes('physics')) return Atom;
  if (n.includes('chemistry')) return FlaskConical;
  if (n.includes('network') || n.includes('web') || n.includes('internet')) return Globe;
  if (n.includes('os') || n.includes('operating') || n.includes('computer')) return Cpu;
  if (n.includes('structure') || n.includes('algorithm') || n.includes('dsa')) return Layers;
  if (n.includes('english') || n.includes('communication')) return PenLine;
  if (n.includes('drawing') || n.includes('cad') || n.includes('design')) return Pencil;
  if (n.includes('digital') || n.includes('logic') || n.includes('circuit')) return Binary;
  if (n.includes('ai') || n.includes('machine') || n.includes('deep')) return BrainCircuit;
  if (n.includes('algebra') || n.includes('linear') || n.includes('discrete')) return SquareFunction;
  return BookOpen;
}

export default function StudentLearn() {
  const navigate = useNavigate();
  const { subjectId } = useParams<{ subjectId: string }>();

  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchSubjects()
      .then((subs: any[]) =>
        setSubjects(
          subs.map(s => ({
            id: s.id,
            subject_name: s.subject_name || s.name || 'Untitled',
            short_code: s.short_code,
            category: s.category,
          }))
        )
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Subject detail — collapsed RoleSidebar + SubjectDetail with its own sidebar (Switch Subject)
  if (subjectId) {
    return (
      <div className="h-screen flex overflow-hidden">
        {!isSidebarCollapsed && <RoleSidebar collapsed={true} />}
        <div className="flex-1 overflow-hidden">
          <SubjectDetail 
            hideNavigation 
            onSwitchSubject={() => navigate('/student/notes')} 
            onCollapseChange={setIsSidebarCollapsed}
          />
        </div>
      </div>
    );
  }

  // Subject grid
  return (
    <div className="h-screen bg-white flex overflow-hidden">
      <RoleSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 pt-8 pb-2">
          <h1 className="text-2xl font-bold text-gray-900">Learning</h1>
          <p className="text-sm text-gray-500 mt-1">Select a subject to access your notes and study materials.</p>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-400" />
            </div>
          )}

          {!loading && subjects.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <BookMarked className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No subjects assigned yet.</p>
            </div>
          )}

          {!loading && subjects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map(subject => {
                const Icon = getSubjectIcon(subject.subject_name);
                return (
                  <button
                    key={subject.id}
                    onClick={() => navigate(`/student/notes/${subject.id}`)}
                    className="flex items-center gap-4 px-5 py-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 text-left group"
                  >
                    <div className={cn(
                      "w-11 h-11 flex items-center justify-center rounded-xl flex-shrink-0 text-white",
                      COLOR_MAP[COLORS[subjects.indexOf(subject) % COLORS.length]] || 'bg-gray-600'
                    )}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-bold text-gray-800 group-hover:text-gray-900 leading-snug">
                      {subject.subject_name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
