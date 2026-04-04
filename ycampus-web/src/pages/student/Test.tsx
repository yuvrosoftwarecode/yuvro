import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  SquareFunction, Atom, Code, Database, Globe, Cpu, Layers,
  FlaskConical, BookMarked, PenLine, Sigma,
  Pencil, Binary, BrainCircuit, BookOpen, ClipboardCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSubjectsByCollege, Subject } from '@/services/subjectService';
import { fetchSkillTests } from '@/services/skillTestService';
import { toast } from 'sonner';

// ─── Icon mapping ─────────────────────────────────────────────────────────────

function getSubjectIcon(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('calculus') || n.includes('matrices') || n.includes('math')) return Sigma;
  if (n.includes('python') || n.includes('java') || n.includes('programming') || n.includes('problem solving')) return Code;
  if (n.includes('data') || n.includes('sql') || n.includes('database')) return Database;
  if (n.includes('physics')) return Atom;
  if (n.includes('chemistry')) return FlaskConical;
  if (n.includes('network') || n.includes('web') || n.includes('internet')) return Globe;
  if (n.includes('os') || n.includes('operating') || n.includes('computer') || n.includes('engineering')) return Cpu;
  if (n.includes('structure') || n.includes('algorithm') || n.includes('dsa')) return Layers;
  if (n.includes('english') || n.includes('communication')) return PenLine;
  if (n.includes('drawing') || n.includes('cad') || n.includes('design') || n.includes('graphics')) return Pencil;
  if (n.includes('digital') || n.includes('logic') || n.includes('circuit') || n.includes('electrical')) return Binary;
  if (n.includes('ai') || n.includes('machine') || n.includes('deep')) return BrainCircuit;
  if (n.includes('algebra') || n.includes('linear') || n.includes('discrete')) return SquareFunction;
  return BookOpen;
}

// India tricolor gradient bars (cycling through saffron, chakra-navy, green)
const accentGradients = [
  'from-[hsl(var(--saffron-dark))] to-[hsl(var(--saffron))]',
  'from-[hsl(var(--chakra-dark))] to-[hsl(var(--chakra))]',
  'from-[hsl(var(--success-dark))] to-[hsl(var(--success))]',
];

// ─── Skeleton card ────────────────────────────────────────────────────────────

const SubjectCardSkeleton = () => (
  <Card className="border-border bg-card overflow-hidden animate-pulse">
    <div className="h-1.5 bg-muted" />
    <CardContent className="p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const StudentTest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  // Map of subject ID → published practice test count
  const [testCounts, setTestCounts] = useState<Record<string, number>>({});

  // Load subjects
  useEffect(() => {
    const loadSubjects = async () => {
      if (!user?.college_id) { setLoading(false); return; }
      try {
        const data = await fetchSubjectsByCollege(user.college_id);
        setSubjects(data);
      } catch {
        toast.error('Failed to load subjects');
      } finally {
        setLoading(false);
      }
    };
    loadSubjects();
  }, [user]);

  // Fetch test counts for all subjects at once
  useEffect(() => {
    if (subjects.length === 0) return;

    const fetchCounts = async () => {
      try {
        const allTests = await fetchSkillTests({ test_type: 'practice', publish_status: 'active' });
        const counts: Record<string, number> = {};
        allTests.forEach(t => {
          const sid = String(t.subject);
          counts[sid] = (counts[sid] || 0) + 1;
        });
        setTestCounts(counts);
      } catch {
        // Non-critical — just don't show counts
      }
    };
    fetchCounts();
  }, [subjects]);

  const handleCardClick = (subjectId: string | number, subjectDisplayName: string) => {
    navigate(`/student/test/${subjectId}?name=${encodeURIComponent(subjectDisplayName)}`);
  };

  return (
    <StudentLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Practice Tests</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Choose a subject to explore and attempt practice tests.
            </p>
          </div>
          {!loading && subjects.length > 0 && (
            <Badge variant="secondary" className="font-semibold text-sm px-3 py-1">
              {subjects.length} Subject{subjects.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Subject grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SubjectCardSkeleton key={i} />)}
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <BookMarked className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold mb-1">No subjects assigned</p>
            <p className="text-muted-foreground text-sm">
              No subjects have been assigned to your college yet. Check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject, index) => {
              const Icon = getSubjectIcon(subject.subject_name);
              const gradient = accentGradients[index % accentGradients.length];
              const count = testCounts[String(subject.id)];
              const hasTests = typeof count === 'number' && count > 0;

              return (
                <Card
                  key={subject.id}
                  className="cursor-pointer border-border bg-card hover:shadow-md transition-all duration-200 group overflow-hidden"
                  onClick={() => handleCardClick(subject.id, subject.subject_name)}
                >
                  {/* Top accent bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon container */}
                      <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="font-semibold text-foreground leading-tight group-hover:text-primary transition-colors truncate">
                          {subject.subject_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          {hasTests ? (
                            <div className="flex items-center gap-1.5">
                              <ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                {count} test{count !== 1 ? 's' : ''} available
                              </span>
                            </div>
                          ) : typeof count === 'number' ? (
                            <span className="text-xs text-muted-foreground">No tests yet</span>
                          ) : (
                            <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
                          )}
                        </div>
                      </div>

                      {/* Arrow indicator */}
                      <div className="shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 mt-1">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentTest;