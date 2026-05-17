import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';


import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookMarked } from 'lucide-react';
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

// ─── Main page ────────────────────────────────────────────────────────────────

const StudentTest = () => {
  const navigate = useNavigate();

  const location = useLocation();
  const { user } = useAuth();

  const isSkillTest = location.pathname.includes('skill-test');
  const pageTitle = isSkillTest ? "Skill Test" : "Practice Test";
  const pageSubtitle = isSkillTest ? "Master your skills with these comprehensive tests." : "Select a subject to start your practice tests.";
  const baseUrl = isSkillTest ? "/student/skill-test" : "/student/test";


  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  // Map of subject ID → published practice test count
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

  // Fetch test counts for all subjects at once
  useEffect(() => {
    if (subjects.length === 0) return;

    const fetchCounts = async () => {
      try {
        const allTests = await fetchSkillTests({ test_type: 'practice', publish_status: 'active' });
        // Initialize all subjects with 0 first
        const counts: Record<string, number> = {};
        subjects.forEach(s => { counts[String(s.id)] = 0; });
        
        allTests.forEach(t => {
          const sid = String(t.subject);
          if (sid in counts) {
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
    navigate(`${baseUrl}/${subjectId}?name=${encodeURIComponent(subjectDisplayName)}`);
  };


  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader 
          title={pageTitle} 
          subtitle={pageSubtitle} 
        />


        {/* Subject grid */}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {subjects.map((subject, index) => {
              const Icon = getSubjectIconComponent(subject.subject_name);
              const count = testCounts[String(subject.id)];
              const hasTests = typeof count === 'number' && count > 0;

              return (
                <div
                  key={subject.id}
                  className="group cursor-pointer border-0 rounded-2xl p-6 transition-all duration-200 hover:shadow-md flex items-center gap-5 h-auto min-h-[7rem]"
                  style={{ backgroundColor: 'hsl(var(--notes-card-bg))' }}
                  onClick={() => handleCardClick(subject.id, subject.subject_name)}
                >
                  {/* Icon */}
                  <Icon className="h-7 w-7 shrink-0 text-slate-700" />

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="font-semibold text-lg leading-tight transition-colors"
                      style={{ color: 'hsl(var(--notes-card-fg))' }}
                    >
                      {subject.subject_name}
                    </h3>
                    <div className="mt-1">
                      {hasTests ? (
                        <p className="text-sm font-medium text-slate-500/80">
                          {count} {count === 1 ? 'test' : 'tests'} available
                        </p>
                      ) : typeof count === 'number' ? (
                        <p className="text-sm text-slate-400">No tests</p>
                      ) : (
                        <div className="h-3 w-16 bg-slate-200/50 animate-pulse rounded mt-1" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentTest;