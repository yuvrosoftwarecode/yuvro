import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { skillTestService } from '@/services/skillTestService';
import { toast } from 'sonner';
import AssessmentAnalyticsLayout from '@/components/instructor/analytics/AssessmentAnalyticsLayout';
import AnalyticsStats from '@/components/instructor/analytics/AnalyticsStats';
import CandidatesTable from '@/components/instructor/analytics/CandidatesTable';

export default function SkillTestAnalytics() {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [skillTest, setSkillTest] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (testId) {
            fetchData(testId);
        }
    }, [testId]);

    const fetchData = async (id: string) => {
        try {
            setLoading(true);

            // We might need to enhance skillTestService to support these parallel calls cleanly
            // Assuming getSkillTest and getSubmissions exist similar to contests
            const [testData, submissionsData] = await Promise.all([
                skillTestService.getSkillTest(id),
                // Need to ensure this endpoint returns ALL submissions for the test
                skillTestService.getSkillTestSubmissions(id)
            ]);

            setSkillTest(testData);
            setSubmissions(submissionsData);
        } catch (error) {
            console.error('Failed to fetch skill test analytics:', error);
            toast.error('Failed to load skill test analytics');
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

    // Calculate metrics
    // Skill Tests don't have explicit registration, so Registered count isn't shown
    // Instead we rely on Unique Candidates vs Total Attempts

    // Use backend metrics if available
    const uniqueCandidates = skillTest?.unique_candidates_count !== undefined
        ? skillTest.unique_candidates_count
        : submissions.reduce((acc, curr) => {
            if (!acc.includes(curr.user)) acc.push(curr.user);
            return acc;
        }, []).length;

    const attemptedCount = skillTest?.attempted_count !== undefined
        ? skillTest.attempted_count
        : submissions.length;

    const completedCount = skillTest?.completed_count !== undefined
        ? skillTest.completed_count
        : submissions.filter((s: any) => ['submitted', 'completed'].includes(s.status)).length;

    const handleBack = () => {
        if (skillTest?.course && skillTest?.topic) {
            navigate(`/instructor/skill-tests/courses/${skillTest.course}/manage?topicId=${skillTest.topic}`);
        } else {
            navigate('/instructor/skill-tests');
        }
    };

    return (
        <AssessmentAnalyticsLayout
            title={skillTest?.title || 'Skill Test Analytics'}
            subtitle="Attempts and performance overview"
            onBack={handleBack}
            backLabel="Back to Skill Tests"
        >
            <AnalyticsStats
                uniqueCandidates={uniqueCandidates}
                registeredCount={0} // Not used when showRegistered is false
                attemptedCount={attemptedCount}
                completedCount={completedCount}
                showRegistered={false} // Hide "Registered" card for Skill Tests
            />

            <CandidatesTable
                submissions={submissions}
                onViewDetails={(id) => navigate(`/instructor/skill-tests/submissions/${id}`)}
                showProctoring={true} // Skill tests have proctoring too
            />
        </AssessmentAnalyticsLayout>
    );
}
