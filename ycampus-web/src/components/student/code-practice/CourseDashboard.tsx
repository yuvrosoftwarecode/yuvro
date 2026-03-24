import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Code2, Database, Cpu, FileCode, Braces, Terminal,
  Trophy, Target, Brain, CheckCircle2
} from 'lucide-react';
import { fetchSubjects } from '@/services/subjectService';
import type { Subject } from '@/pages/student/CodePractice';
import { toast } from 'sonner';
import ModernCard from '@/components/common/ModernCard';

interface SubjectDashboardProps {
  onSubjectSelect: (subject: Subject) => void;
  onViewAnalytics: () => void;
}

const getIcon = (category: string) => {
  const icons = {
    databases: Database,
    programming_languages: Code2,
    fundamentals: Cpu,
    ai_tools: Brain,
    FileCode,
    Braces,
    Terminal,
  };
  return icons[category as keyof typeof icons] || Code2;
};

const getSubjectStyle = (id: string | number) => {
  const styles = [
    { bg: "bg-blue-50", text: "text-blue-600", gradient: "from-blue-500 to-indigo-600" },
    { bg: "bg-purple-50", text: "text-purple-600", gradient: "from-purple-500 to-violet-600" },
    { bg: "bg-emerald-50", text: "text-emerald-600", gradient: "from-emerald-500 to-teal-600" },
    { bg: "bg-amber-50", text: "text-amber-600", gradient: "from-amber-500 to-orange-600" },
    { bg: "bg-rose-50", text: "text-rose-600", gradient: "from-rose-500 to-pink-600" },
    { bg: "bg-indigo-50", text: "text-indigo-600", gradient: "from-indigo-500 to-blue-600" },
    { bg: "bg-cyan-50", text: "text-cyan-600", gradient: "from-cyan-500 to-sky-600" },
  ];

  // Simple hash to ensuring consistent color for the same subject ID
  const index = String(id).charCodeAt(0) % styles.length;
  return styles[index];
};

const SubjectDashboard = ({ onSubjectSelect, onViewAnalytics }: SubjectDashboardProps) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const fetchedSubjects = await fetchSubjects();

        const transformedSubjects: Subject[] = fetchedSubjects.map(subject => ({
          id: subject.id.toString(),
          name: subject.name || subject.title || 'Untitled Subject',
          icon: (subject as any).category || 'programming_languages',
          progress: Math.round(subject.progress_percentage || 0),
          totalProblems: subject.total_problems || 0,
          solvedProblems: subject.solved_problems || 0,
          totalScore: subject.total_score || 0,
          aiHelpUsed: subject.ai_help_used || 0,
          iconColor: '', // Will be handled dynamically by getSubjectStyle
          category: (subject as any).category || 'programming_languages',
        }));

        setSubjects(transformedSubjects);
      } catch (error) {
        console.error('Failed to load subjects:', error);
        toast.error('Failed to load subjects');
      } finally {
        setLoading(false);
      }
    };

    loadSubjects();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-6 py-8">
        <div className="animate-pulse space-y-8">
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
    <div className="min-h-screen bg-white px-6 py-8">
      <div className="space-y-8">
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

          {/* Problems Solved (Green) */}
          <Card className="group border-0 shadow-sm bg-gradient-to-br from-white to-green-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 text-green-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-green-600 transition-colors">Problems Solved</p>
                  <p className="text-3xl font-bold tracking-tight text-slate-900">
                    {subjects.reduce((sum: number, c: any) => sum + c.solvedProblems, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Score (Purple) */}
          <Card className="group border-0 shadow-sm bg-gradient-to-br from-white to-purple-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-purple-600 transition-colors">Total Score</p>
                  <p className="text-3xl font-bold tracking-tight text-slate-900">
                    {subjects.reduce((sum: number, c: any) => sum + (c.totalScore || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Help (Blue) */}
          <Card className="group border-0 shadow-sm bg-gradient-to-br from-white to-blue-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">AI Help Used</p>
                  <p className="text-3xl font-bold tracking-tight text-slate-900">
                    {subjects.reduce((sum: number, c: any) => sum + (c.aiHelpUsed || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subjects Available (Amber) */}
          <Card className="group border-0 shadow-sm bg-gradient-to-br from-white to-amber-50/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
            <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 group-hover:text-amber-600 transition-colors">Subjects Available</p>
                  <p className="text-3xl font-bold tracking-tight text-slate-900">{subjects.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Subject Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subjects.map(subject => {
            const Icon = getIcon(subject.category);
            const style = getSubjectStyle(subject.id);

            return (
              <ModernCard
                key={subject.id}
                title={subject.name}
                description={`Master ${subject.name} concepts with hands-on coding challenges and real-world scenarios.`}
                icon={<Icon className="h-6 w-6" />}
                iconClassName={`${style.bg} ${style.text}`}
                gradientColor={style.gradient}
                progress={subject.progress}
                tags={[
                  { text: subject.category.replace('_', ' '), variant: "secondary" }
                ]}
                footerItems={[
                  { icon: <Target className="w-3.5 h-3.5" />, text: `${subject.totalProblems} Problems` },
                  { icon: <CheckCircle2 className="w-3.5 h-3.5" />, text: `${subject.solvedProblems} Solved` }
                ]}
                actionLabel="Start Practice"
                onAction={() => onSubjectSelect(subject)}
              />
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default SubjectDashboard;