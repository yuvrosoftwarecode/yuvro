import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { BookMarked, Brain, Code2, Compass, FolderOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSubjectsByCollege, Subject } from '@/services/subjectService';
import { fetchSkillTests } from '@/services/skillTestService';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import { getSubjectIconComponent } from '@/utils/subjectIcon';

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

// ─── Category Meta configuration (Minimalist Dashboard Style) ────────────────

const categoryMeta: Record<string, {
  label: string;
  icon: React.ComponentType<any>;
  desc: string;
}> = {
  'Foundation': {
    label: 'Foundation',
    icon: Brain,
    desc: 'Aptitude & Reasoning, Data Structures, and SQL'
  },
  'Web dev': {
    label: 'Web Dev',
    icon: Code2,
    desc: 'HTML, CSS, JavaScript, and React'
  },
  'Tracks': {
    label: 'Tracks',
    icon: Compass,
    desc: 'Python, Data Science, and AI'
  },
  'General': {
    label: 'General',
    icon: FolderOpen,
    desc: 'Other assigned subjects'
  }
};

// ─── Main page ────────────────────────────────────────────────────────────────

const StudentAssessments = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [testCounts, setTestCounts] = useState<Record<string, number>>({});

  // Load subjects
  useEffect(() => {
    const loadSubjects = async () => {
      if (!user?.college_id) {
        setLoading(false);
        return;
      }
      try {
        let data = await fetchSubjectsByCollege(user.college_id);
        if (user.college_product_type) {
            data = data.filter(s => s.product_type === user.college_product_type);
        }
        // Sort subjects alphabetically
        data.sort((a, b) => a.subject_name.localeCompare(b.subject_name));
        setSubjects(data);
      } catch {
        toast.error('Failed to load subjects');
      } finally {
        setLoading(false);
      }
    };
    loadSubjects();
  }, [user]);

  // Fetch subject-level assessment counts for all subjects at once
  useEffect(() => {
    if (subjects.length === 0) return;

    const fetchCounts = async () => {
      try {
        // Query for assessments
        const allTests = await fetchSkillTests({ 
          test_type: 'assessment', 
          publish_status: 'active' 
        });
        
        // Initialize all subjects with 0 first
        const counts: Record<string, number> = {};
        subjects.forEach(s => { counts[String(s.id)] = 0; });
        
        allTests.forEach(t => {
          const sid = String(t.subject);
          // ONLY count tests where unit is null (subject-level assessments)!
          if (sid in counts && !t.unit) {
            counts[sid] = (counts[sid] || 0) + 1;
          }
        });
        setTestCounts(counts);
      } catch {
        // Non-critical
      }
    };
    fetchCounts();
  }, [subjects]);

  const handleCardClick = (subjectId: string | number, subjectDisplayName: string) => {
    navigate(`/student/assessments/${subjectId}?name=${encodeURIComponent(subjectDisplayName)}`);
  };

  // Group subjects by category
  const groupedSubjects: Record<string, Subject[]> = {
    'Foundation': [],
    'Web dev': [],
    'Tracks': [],
  };
  const uncategorizedSubjects: Subject[] = [];

  subjects.forEach(subject => {
    const cat = subject.category;
    if (cat === 'Foundation') {
      groupedSubjects['Foundation'].push(subject);
    } else if (cat === 'Web dev') {
      groupedSubjects['Web dev'].push(subject);
    } else if (cat === 'Tracks') {
      groupedSubjects['Tracks'].push(subject);
    } else {
      uncategorizedSubjects.push(subject);
    }
  });

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader 
          title="Subject Assessments" 
          subtitle="Complete your subject-level assessments to demonstrate your conceptual mastery." 
        />

        {/* Subject grid grouped by categories */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
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
          <div className="space-y-10">
            {/* Render defined categories */}
            {Object.entries(groupedSubjects).map(([categoryKey, categorySubjects]) => {
              if (categorySubjects.length === 0) return null;
              const meta = categoryMeta[categoryKey];
              const CategoryIcon = meta.icon;

              return (
                <div key={categoryKey} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <CategoryIcon className="h-5 w-5 text-slate-650 dark:text-slate-400" />
                      <div className="flex items-baseline gap-2">
                        <h2 className="text-lg font-bold tracking-tight">
                          {meta.label}
                        </h2>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                          ({meta.desc})
                        </span>
                      </div>
                    </div>
                    
                    <span className="text-xs font-semibold text-slate-550 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 px-2.5 py-0.5 rounded-full">
                      {categorySubjects.length} {categorySubjects.length === 1 ? 'subject' : 'subjects'}
                    </span>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {categorySubjects.map((subject) => {
                      const Icon = getSubjectIconComponent(subject.subject_name);
                      const count = testCounts[String(subject.id)];
                      const hasTests = typeof count === 'number' && count > 0;

                      return (
                        <div
                          key={subject.id}
                          className="group cursor-pointer border border-slate-100/80 dark:border-slate-800/30 rounded-2xl p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center gap-5 h-auto min-h-[7rem]"
                          style={{ backgroundColor: 'hsl(var(--notes-card-bg))' }}
                          onClick={() => handleCardClick(subject.id, subject.subject_name)}
                        >
                          {/* Icon Container with smooth hover transition */}
                          <div className="p-3 rounded-xl bg-slate-100/40 dark:bg-slate-800/40 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors duration-200">
                            <Icon className="h-6 w-6 shrink-0 text-slate-700 dark:text-slate-300" />
                          </div>

                          {/* Text Content */}
                          <div className="flex-1 min-w-0">
                            <h3 
                              className="font-semibold text-lg leading-tight transition-colors text-slate-800 dark:text-slate-100"
                            >
                              {subject.subject_name}
                            </h3>
                            <div className="mt-1">
                              {hasTests ? (
                                <p className="text-sm font-medium text-slate-500/80 dark:text-slate-400">
                                  {count} {count === 1 ? 'assessment' : 'assessments'} available
                                </p>
                              ) : typeof count === 'number' ? (
                                <p className="text-sm text-slate-400 dark:text-slate-500">No assessments available</p>
                              ) : (
                                <div className="h-3 w-16 bg-slate-200/50 dark:bg-slate-850 animate-pulse rounded mt-1" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Render Uncategorized Subjects if any */}
            {uncategorizedSubjects.length > 0 && (
              <div className="space-y-4">
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <FolderOpen className="h-5 w-5 text-slate-500 dark:text-slate-450" />
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-lg font-bold tracking-tight">
                        {categoryMeta['General'].label}
                      </h2>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        ({categoryMeta['General'].desc})
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-550 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 px-2.5 py-0.5 rounded-full">
                    {uncategorizedSubjects.length} {uncategorizedSubjects.length === 1 ? 'subject' : 'subjects'}
                  </span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                  {uncategorizedSubjects.map((subject) => {
                    const Icon = getSubjectIconComponent(subject.subject_name);
                    const count = testCounts[String(subject.id)];
                    const hasTests = typeof count === 'number' && count > 0;

                    return (
                      <div
                        key={subject.id}
                        className="group cursor-pointer border border-slate-100/80 dark:border-slate-800/30 rounded-2xl p-6 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center gap-5 h-auto min-h-[7rem]"
                        style={{ backgroundColor: 'hsl(var(--notes-card-bg))' }}
                        onClick={() => handleCardClick(subject.id, subject.subject_name)}
                      >
                        <div className="p-3 rounded-xl bg-slate-100/40 dark:bg-slate-800/40 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors duration-200">
                          <Icon className="h-6 w-6 shrink-0 text-slate-700 dark:text-slate-300" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 
                            className="font-semibold text-lg leading-tight text-slate-800 dark:text-slate-100"
                          >
                            {subject.subject_name}
                          </h3>
                          <div className="mt-1">
                            {hasTests ? (
                              <p className="text-sm font-medium text-slate-500/80 dark:text-slate-400">
                                {count} {count === 1 ? 'assessment' : 'assessments'} available
                              </p>
                            ) : typeof count === 'number' ? (
                              <p className="text-sm text-slate-400 dark:text-slate-500">No assessments available</p>
                            ) : (
                              <div className="h-3 w-16 bg-slate-200/50 dark:bg-slate-850 animate-pulse rounded mt-1" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentAssessments;
