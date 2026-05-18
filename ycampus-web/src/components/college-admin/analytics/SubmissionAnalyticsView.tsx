import React, { useState, useEffect } from 'react';
import { getSkillTestSubmission } from '@/services/skillTestService';
import ProctoringSessionViewer from './ProctoringSessionViewer';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubmissionAnalyticsViewProps {
    submissionId: string;
    onBack: () => void;
}

export default function SubmissionAnalyticsView({ submissionId, onBack }: SubmissionAnalyticsViewProps) {
    const [submission, setSubmission] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubmission = async () => {
            try {
                setLoading(true);
                const data = await getSkillTestSubmission(submissionId);
                setSubmission(data);
            } catch (error) {
                console.error('Failed to fetch submission:', error);
            } finally {
                setLoading(false);
            }
        };

        if (submissionId) {
            fetchSubmission();
        }
    }, [submissionId]);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">Retrieving analytics payload...</p>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="py-20 text-center pb-20">
                <p className="text-muted-foreground mb-4">Failed to load submission data.</p>
                <Button variant="outline" onClick={onBack}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-20">
            <div className="flex flex-col gap-2 mb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={onBack}
                            className="rounded-full h-9 w-9 border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground">{submission.user_name}</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Performance & Proctoring Detail</p>
                        </div>
                    </div>
                </div>
            </div>

            <ProctoringSessionViewer submission={submission} />
        </div>
    );
}
