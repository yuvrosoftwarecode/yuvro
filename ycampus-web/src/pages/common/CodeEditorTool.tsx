import React, { useRef } from 'react';
import { CodeEditorWithAI, CodeEditorWithAIHandle } from '@/components/code-editor';
import type { Course, Topic, CodingProblem } from '@/pages/student/CodePractice';
import { useNavigate } from 'react-router-dom';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { BookOpen } from 'lucide-react';

const CodeEditorPage: React.FC = () => {
    const navigate = useNavigate();
    const problemSolvingRef = useRef<CodeEditorWithAIHandle>(null);

    const dummyCourse: Course = {
        id: 'playground-course',
        name: 'Practice Arena',
        icon: 'code',
        progress: 0,
        totalProblems: 0,
        solvedProblems: 0,
        category: 'fundamentals'
    };

    const dummyTopic: Topic = {
        id: 'playground-topic',
        name: 'General Programming',
        problemCount: 0,
        order_index: 1
    };

    const dummyProblem: CodingProblem = {
        id: 'playground',
        title: 'Code Playground',
        difficulty: 'Easy',
        score: 0,
        description: 'Write, test, and debug your code in multiple languages.',
        test_cases_basic: [],
        test_cases_advanced: []
    };

    const headerActions = (
        <button
            onClick={() => problemSolvingRef.current?.openExampleGallery()}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors font-medium shadow-sm transition-all active:scale-95"
        >
            <BookOpen className="h-4 w-4" />
            Examples
        </button>
    );

    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-50">
            <RoleSidebar />
            <div className="flex-1 flex flex-col relative overflow-hidden">
                <RoleHeader
                    title="Code Editor"
                    subtitle="A versatile playground for testing algorithms and code snippets."
                />
                <div className="flex-1 relative overflow-hidden">
                    <CodeEditorWithAI
                        ref={problemSolvingRef}
                        problem={dummyProblem}
                        course={dummyCourse}
                        topic={dummyTopic}
                        onBack={() => navigate('/dashboard')}
                        initialFullscreen={false}
                        initialEditorOpen={true}
                        initialAiChatOpen={false}
                        initialSidebarCollapsed={true}
                        showBreadcrumb={false}
                        isEmbedded={true}
                        showAiBuddy={true}
                        showProblemDescription={false}
                        codeSubmissionType="practice"
                    />
                </div>
            </div>
        </div>
    );
};

export default CodeEditorPage;
