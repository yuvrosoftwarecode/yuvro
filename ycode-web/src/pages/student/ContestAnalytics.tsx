import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contestService } from '@/services/contestService';
import DashboardLayout from '@/components/common/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, AlertCircle } from 'lucide-react';
import ContestReportContent from '@/components/contest/ContestReportContent';

const ContestAnalytics = () => {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contestId) return;
    setLoading(true);
    contestService.getStudentAnalytics(contestId, true)
      .then(setAnalytics)
      .catch((err: any) => setError(err.response?.data?.error || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [contestId]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <DashboardLayout hideHeader={true} hideFooter={true} contentClassName="bg-slate-50">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F97316] mx-auto mb-4"></div>
            <p className="text-slate-600">Loading your analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout hideHeader={true} hideFooter={true} contentClassName="bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">Error Loading Analytics</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
              <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
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

      <DashboardLayout hideHeader={true} hideFooter={true} contentClassName="bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-6 report-container">
          {/* Header Actions */}
          <div className="flex justify-between items-center mb-6 no-print">
            <button
              onClick={() => navigate(-1)}
              className="bg-slate-500 text-white px-4 py-2 rounded-md hover:bg-slate-600 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handlePrint}
              className="bg-[#F97316] text-white px-4 py-2 rounded-md hover:bg-[#EA580C] transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Download PDF
            </button>
          </div>

          <ContestReportContent analytics={analytics} />
        </div>
      </DashboardLayout>
    </>
  );
};

export default ContestAnalytics;
