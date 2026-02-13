import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contestService } from '@/services/contestService';
import { toast } from 'sonner';
import AssessmentAnalyticsLayout from '@/components/instructor/analytics/AssessmentAnalyticsLayout';
import AnalyticsStats from '@/components/instructor/analytics/AnalyticsStats';
import CandidatesTable from '@/components/instructor/analytics/CandidatesTable';

export default function ContestAnalytics() {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [contest, setContest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contestId) {
      fetchData(contestId);
    }
  }, [contestId]);

  const fetchData = async (id: string) => {
    try {
      setLoading(true);
      const [contestData, submissionsData] = await Promise.all([
        contestService.getContest(id),
        contestService.getContestSubmissions(id)
      ]);
      setContest(contestData);
      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Failed to fetch contest analytics:', error);
      toast.error('Failed to load contest analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Use backend metrics if available, otherwise fallback (for backward compatibility during migration)
  const registeredCount = contest?.participants_count || 0;

  // Calculate specific metrics for stats card (if not provided by backend yet)
  const uniqueCandidates = contest?.unique_candidates_count !== undefined
    ? contest.unique_candidates_count
    : submissions.reduce((acc, curr) => {
      if (!acc.includes(curr.user)) acc.push(curr.user);
      return acc;
    }, []).length;

  const attemptedCount = contest?.attempted_count !== undefined
    ? contest.attempted_count
    : submissions.length;

  const completedCount = contest?.completed_count !== undefined
    ? contest.completed_count
    : submissions.filter((s: any) => ['submitted', 'completed'].includes(s.status)).length;


  return (
    <AssessmentAnalyticsLayout
      title={contest?.title || 'Contest Analytics'}
      subtitle="Registration, attempts, and submissions overview"
      onBack={() => navigate('/instructor/contests')}
      backLabel="Back to Contests"
    >
      <AnalyticsStats
        uniqueCandidates={uniqueCandidates}
        registeredCount={registeredCount}
        attemptedCount={attemptedCount}
        completedCount={completedCount}
        showRegistered={true}
      />

      <CandidatesTable
        submissions={submissions}
        onViewDetails={(id) => navigate(`/instructor/contests/submissions/${id}`)}
        showProctoring={true}
      />
    </AssessmentAnalyticsLayout>
  );
}
