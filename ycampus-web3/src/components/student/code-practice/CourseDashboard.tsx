import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Code2, Database, Cpu, FileCode, Braces, Terminal,
  Trophy, Brain, CheckCircle2, Zap, Layout, Monitor, Calculator
} from 'lucide-react';
import { fetchSubjects, type Subject as apiSubject } from '@/services/subjectService';
import type { Subject as CodePracticeSubject } from '@/types/codePractice';
import { toast } from 'sonner';
import ModernCard from '@/components/common/ModernCard';
import { cn } from '@/lib/utils';

interface SubjectDashboardProps {
  onSubjectSelect: (subject: CodePracticeSubject) => void;
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
    { bg: "bg-blue-50 text-blue-600", gradient: "from-blue-600" },
    { bg: "bg-purple-50 text-purple-600", gradient: "from-purple-600" },
    { bg: "bg-emerald-50 text-emerald-600", gradient: "from-emerald-600" },
    { bg: "bg-amber-50 text-amber-600", gradient: "from-amber-600" },
    { bg: "bg-rose-50 text-rose-600", gradient: "from-rose-600" },
    { bg: "bg-indigo-50 text-indigo-600", gradient: "from-indigo-600" },
    { bg: "bg-cyan-50 text-cyan-600", gradient: "from-cyan-600" },
  ];
  const index = String(id).charCodeAt(0) % styles.length;
  return styles[index];
};

const SubjectDashboard = ({ onSubjectSelect, onViewAnalytics }: SubjectDashboardProps) => {
  const [subjects, setSubjects] = useState<CodePracticeSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const fetchedSubjects = await fetchSubjects();
        const transformedSubjects: CodePracticeSubject[] = fetchedSubjects.map((s: apiSubject) => ({
          id: s.id.toString(),
          name: s.subject_name || s.name || s.title || 'Untitled Subject',
          icon: s.category || '',
          progress: Math.round(s.progress_percentage || 0),
          totalProblems: s.total_problems || 0,
          solvedProblems: s.solved_problems || 0,
          totalScore: s.total_score || 0,
          aiHelpUsed: s.ai_help_used || 0,
          iconColor: '', 
          category: s.category || '',
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
      <div className="w-full flex-1 overflow-hidden p-8 pt-0 space-y-10 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {[...Array(4)].map((_, i) => (
             <div key={i} className="h-24 bg-muted rounded-xl"></div>
           ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[...Array(6)].map((_, i) => (
             <div key={i} className="h-72 bg-muted rounded-2xl"></div>
           ))}
        </div>
      </div>
    );
  }

  const overallStats = [
    { icon: <CheckCircle2 className="h-5 w-5" />, label: 'Solved Problems', value: subjects.reduce((sum, c) => sum + c.solvedProblems, 0), color: 'emerald' },
    { icon: <Trophy className="h-5 w-5" />, label: 'Points Earned', value: subjects.reduce((sum, c) => sum + (c.totalScore || 0), 0), color: 'indigo' },
    { icon: <Brain className="h-5 w-5" />, label: 'AI Help Used', value: subjects.reduce((sum, c) => sum + (c.aiHelpUsed || 0), 0), color: 'rose' },
    { icon: <Layout className="h-5 w-5" />, label: 'Active Subjects', value: subjects.length, color: 'amber' },
  ];

  return (
    <div className="w-full flex-1 overflow-y-auto space-y-10 p-8 pt-0 custom-scrollbar max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary" />
             </div>
             <h2 className="text-2xl font-bold tracking-tight text-foreground">Practice Modules</h2>
          </div>
          <p className="text-sm text-muted-foreground pl-10">Select a subject to begin your coding practice session.</p>
        </div>
        <Button
          onClick={onViewAnalytics}
          variant="outline"
          className="rounded-lg font-semibold gap-2"
        >
          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> 
          Practice Insights
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {overallStats.map((stat, i) => (
          <Card key={i} className="group border-border/50 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden bg-card">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl shrink-0 transition-transform group-hover:scale-110",
                stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                stat.color === 'indigo' ? "bg-indigo-50 text-indigo-600" :
                stat.color === 'rose' ? "bg-rose-50 text-rose-600" :
                "bg-amber-50 text-amber-600"
              )}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
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
              description={`Master key concepts in ${subject.name} through targeted practice problems.`}
              icon={<Icon className="h-6 w-6" />}
              iconClassName={cn(style.bg, "shadow-sm")}
              gradientColor={style.gradient}
              progress={subject.progress}
              tags={[
                { text: subject.category.replace(/_/g, ' '), className: "bg-secondary text-secondary-foreground text-[10px] font-semibold uppercase tracking-wide px-2 shrink-0 max-w-[120px] truncate" }
              ]}
              footerItems={[
                { icon: <Monitor className="w-3.5 h-3.5" />, text: `${subject.totalProblems} Units` },
                { icon: <Calculator className="w-3.5 h-3.5" />, text: `${subject.solvedProblems} Solved` }
              ]}
              actionLabel="Get Started"
              onAction={() => onSubjectSelect(subject)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default SubjectDashboard;
