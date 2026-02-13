import React from 'react';
import { useNavigate } from 'react-router-dom';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';

interface AssessmentAnalyticsLayoutProps {
    title: string;
    subtitle: string;
    onBack?: () => void;
    backLabel?: string;
    children: React.ReactNode;
}

export default function AssessmentAnalyticsLayout({
    title,
    subtitle,
    onBack,
    backLabel = 'Back',
    children
}: AssessmentAnalyticsLayoutProps) {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <RoleHeader
                        title={title}
                        subtitle={subtitle}
                        actions={
                            onBack ? (
                                <button
                                    onClick={onBack}
                                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                                >
                                    ← {backLabel}
                                </button>
                            ) : undefined
                        }
                    />
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
