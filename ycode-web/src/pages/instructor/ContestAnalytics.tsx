import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contestService } from '@/services/contestService';
import { toast } from 'sonner';
import AssessmentAnalyticsLayout from '@/components/instructor/analytics/AssessmentAnalyticsLayout';
import AnalyticsStats from '@/components/instructor/analytics/AnalyticsStats';
import CandidatesTable from '@/components/instructor/analytics/CandidatesTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from '@/components/common/DataTable';

export default function ContestAnalytics() {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
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
      const [contestData, submissionsData, participantsData] = await Promise.all([
        contestService.getContest(id),
        contestService.getContestSubmissions(id),
        contestService.getContestParticipants(id)
      ]);
      setContest(contestData);
      setSubmissions(submissionsData);
      setParticipants(participantsData);
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

  // Use backend metrics if available, otherwise fallback to local data length
  const registeredCount = contest?.participants_count || participants.length;

  // Calculate specific metrics for stats card
  const uniqueCandidates = contest?.unique_candidates_count ||
    new Set([...submissions.map(s => s.user), ...participants.map(p => p.user)]).size ||
    participants.length;

  const attemptedCount = contest?.attempted_count ||
    new Set(submissions.map(s => s.user)).size;

  const completedCount = contest?.completed_count ||
    submissions.filter((s: any) => ['submitted', 'completed'].includes(s.status)).length;


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

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => navigate(`/instructor/contests/${contestId}/report`)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Generate Report
        </button>
      </div>

      <Tabs defaultValue="attempted" className="mt-8">
        <TabsList className="mb-4">
          <TabsTrigger value="attempted">Attempted Candidates</TabsTrigger>
          <TabsTrigger value="registered">Registered Participants ({participants.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="attempted">
          <CandidatesTable
            submissions={submissions}
            onViewDetails={(id) => navigate(`/instructor/contests/submissions/${id}`)}
            onViewAnalytics={(userId) => navigate(`/instructor/contests/${contestId}/student-analytics/${userId}`)}
            showProctoring={true}
          />
        </TabsContent>
        <TabsContent value="registered">
          <Card className="border border-gray-200">
            <CardContent className="p-0">
              <DataTable
                data={participants}
                columns={[
                  {
                    header: 'Student',
                    cell: (p) => (
                      <div>
                        <div className="font-medium text-gray-900">{p.user_name}</div>
                        <div className="text-xs text-gray-500">{p.user_email}</div>
                      </div>
                    )
                  },
                  {
                    header: 'College',
                    cell: (p) => <div className="text-gray-700">{p.college_name || 'N/A'}</div>
                  },
                  {
                    header: 'Department',
                    cell: (p) => <div className="text-gray-700">{p.department_name || 'N/A'}</div>
                  },
                  {
                    header: 'Registered On',
                    cell: (p) => <div className="text-sm text-gray-500">{p.registered_at ? new Date(p.registered_at).toLocaleString() : '-'}</div>
                  }
                ]}
                keyExtractor={(p) => p.id}
                emptyState={{ message: "No registered participants yet.", subMessage: "Students who register for this contest will appear here." }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AssessmentAnalyticsLayout>
  );
}
