import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Code2, Database, Cpu, FileCode, Braces, Terminal,
  Trophy, Brain, CheckCircle2, Zap, Layout, Monitor, Calculator, Play
} from 'lucide-react';
import { fetchSubjects, type Subject as apiSubject } from '@/services/subjectService';
import type { Subject as CodePracticeSubject } from '@/types/codePractice';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
    { bg: "bg-blue-500/10 text-blue-600", border: "border-blue-100", icon: "text-blue-600" },
    { bg: "bg-purple-500/10 text-purple-600", border: "border-purple-100", icon: "text-purple-600" },
    { bg: "bg-emerald-500/10 text-emerald-600", border: "border-emerald-100", icon: "text-emerald-600" },
    { bg: "bg-amber-500/10 text-amber-600", border: "border-amber-100", icon: "text-amber-600" },
    { bg: "bg-rose-500/10 text-rose-600", border: "border-rose-100", icon: "text-rose-600" },
    { bg: "bg-indigo-500/10 text-indigo-600", border: "border-indigo-100", icon: "text-indigo-600" },
  ];
  const index = Math.abs(String(id).split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % styles.length;
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
          unitCount: (s as any).unit_count || 0,
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
    <div className="w-full flex-1 overflow-y-auto space-y-8 p-6 custom-scrollbar max-w-7xl mx-auto">
      <PageHeader
        title="Practice Modules"
        subtitle="Select a subject to begin your coding practice session."
        actions={
          <Button
            onClick={onViewAnalytics}
            variant="outline"
            className="rounded-xl font-semibold gap-2 border-border/60 hover:bg-muted/50"
          >
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            Practice Insights
          </Button>
        }
      />


      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {overallStats.map((stat, i) => (
          <Card key={i} className="border-border hover:shadow-md transition-all duration-200">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl shrink-0",
                stat.color === 'emerald' ? "bg-emerald-500/10 text-emerald-600" :
                  stat.color === 'indigo' ? "bg-indigo-500/10 text-indigo-600" :
                    stat.color === 'rose' ? "bg-rose-500/10 text-rose-600" :
                      "bg-amber-500/10 text-amber-600"
              )}>
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>



      {/* Subject Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {subjects.map(subject => {
          const Icon = getIcon(subject.category);
          const style = getSubjectStyle(subject.id);
          return (
            <Card
              key={subject.id}
              className="group cursor-pointer border-border hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden"
              onClick={() => onSubjectSelect(subject)}
            >
              <div className="p-6 flex-1 space-y-6">
                <div className="flex items-start justify-between">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", style.bg)}>
                    <Icon className={cn("h-6 w-6", style.icon)} />
                  </div>
                  <Badge variant="secondary" className="capitalize text-[10px] font-bold tracking-wide px-2.5 py-0.5 rounded-full bg-muted/40 border-none text-muted-foreground">
                    {subject.category.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {subject.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    Master key concepts in {subject.name} through targeted practice problems.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-end mb-1.5 px-0.5">
                    <span className="text-[11px] font-medium text-muted-foreground tracking-wider">progress</span>
                    <span className="text-xs font-bold text-primary">{subject.progress}%</span>
                  </div>
                  <Progress value={subject.progress} className="h-1.5" />
                </div>
              </div>


              <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-5 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{subject.unitCount} Units</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{subject.solvedProblems} Solved</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <Play className="h-3.5 w-3.5 text-primary fill-primary" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>


    </div>
  );
};

export default SubjectDashboard;
