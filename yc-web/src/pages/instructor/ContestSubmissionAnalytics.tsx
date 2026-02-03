import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { toast } from 'sonner';
import ProctoringSessionViewer from '@/components/common/instructor/ProctoringSessionViewer';
import { contestService } from '@/services/contestService';

export default function ContestSubmissionAnalytics() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (submissionId) {
      fetchSubmission(submissionId);
    }
  }, [submissionId]);

  const fetchSubmission = async (id: string) => {
    try {
      setLoading(true);
      const data = await contestService.getContestSubmission(id);
      setSubmission(data);
    } catch (error) {
      console.error('Failed to fetch submission:', error);
      toast.error('Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !submission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader
            title={`${submission.user_name} - Analytics`}
            subtitle={submission.contest_title || 'Contest Submission'}
            actions={
              <button
                onClick={() => navigate(-1)}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                â† Back
              </button>
            }
          />

          <ProctoringSessionViewer submission={submission} title={submission.contest_title} />
        </div>
      </div>
    </div>
  );
}
