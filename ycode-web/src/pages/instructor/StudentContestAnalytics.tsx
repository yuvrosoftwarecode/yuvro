import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contestService } from '@/services/contestService';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Download, AlertCircle } from 'lucide-react';
import ContestReportContent from '@/components/contest/ContestReportContent';

const StudentContestAnalytics = () => {
  const { contestId, userId } = useParams<{ contestId: string; userId: string }>();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contestId || !userId) return;
    setLoading(true);
    contestService.getStudentAnalytics(contestId, true, userId)
      .then(setAnalytics)
      .catch((err: any) => setError(err.response?.data?.error || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [contestId, userId]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1 px-8 py-12">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-slate-200 rounded w-1/3"></div>
              <div className="h-64 bg-slate-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1 px-8 py-12">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-900">Error Loading Analytics</h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(-1)}
                  className="mt-4 bg-slate-500 text-white px-4 py-2 rounded-md hover:bg-slate-600 transition-colors"
                >
                  Go Back
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <>
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-break { page-break-before: always; }
          .report-container { padding: 0 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50">
        <div className="flex">
          <RoleSidebar />
          <div className="flex-1">
            <RoleHeader
              title="Student Analytics"
              subtitle="Detailed performance analysis and insights"
              actions={
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(-1)}
                    className="bg-slate-500 text-white px-4 py-2 rounded-md hover:bg-slate-600 transition-colors"
                  >
                    ← Back to Report
                  </button>
                  <button
                    onClick={handlePrint}
                    className="bg-[#F97316] text-white px-4 py-2 rounded-md hover:bg-[#EA580C] transition-colors flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" /> Download PDF
                  </button>
                </div>
              }
            />

            <div className="report-container px-6 py-6">
              <ContestReportContent analytics={analytics} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudentContestAnalytics;
