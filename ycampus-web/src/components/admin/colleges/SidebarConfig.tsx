import React, { useState, useEffect } from 'react';
import { College, collegeService } from '@/services/collegeService';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sliders } from 'lucide-react';
import { toast } from 'sonner';

const CAMPUS_TABS = [
    { title: 'Dashboard', key: 'dashboard' },
    { title: 'Learning', key: 'learning' },
    { title: 'Practice Test', key: 'practice_test' },
    { title: 'Task', key: 'task' },
    { title: 'Assessment', key: 'assessment' },
    { title: 'Interview Preparation', key: 'interview_preparation' },
    { title: 'AI Interview Planner', key: 'ai_interview_planner' },
    { title: 'Jobs', key: 'jobs' },
    { title: 'Announcements', key: 'announcements' },
    { title: 'Community', key: 'community' },
    { title: 'Contest', key: 'contest' },
];

const ASSESSMENT_TABS = [
    { title: 'Dashboard', key: 'dashboard' },
    { title: 'Learning', key: 'learning' },
    { title: 'Code Practice', key: 'code_practice' },
    { title: 'Skill Test', key: 'skill_test' },
    { title: 'Assessments', key: 'assessments' },
    { title: 'Aptitude & Reasoning', key: 'aptitude_reasoning' },
    { title: 'Mock Interviews', key: 'mock_interviews' },
    { title: 'AI Interview Planner', key: 'ai_interview_planner' },
    { title: 'Jobs', key: 'jobs' },
    { title: 'Announcements', key: 'announcements' },
    { title: 'Contest', key: 'contest' },
    { title: 'Leaderboard', key: 'leaderboard' },
];

interface SidebarConfigProps {
    college: College;
}

const SidebarConfig: React.FC<SidebarConfigProps> = ({ college }) => {
    const [sidebarConfig, setSidebarConfig] = useState<Record<string, boolean>>(college.sidebar_config || {});

    useEffect(() => {
        if (college) {
            setSidebarConfig(college.sidebar_config || {});
        }
    }, [college]);

    const isAssessments = college.product_type === 'assessments';

    const handleToggleTab = async (key: string, checked: boolean) => {
        const updatedConfig = {
            ...sidebarConfig,
            [key]: checked
        };
        setSidebarConfig(updatedConfig);
        
        try {
            await collegeService.updateCollege(college.id, {
                sidebar_config: updatedConfig
            });
            toast.success(`Updated tab visibility successfully!`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update sidebar configuration.");
            // Revert state on failure
            setSidebarConfig(sidebarConfig);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12 w-full">
            <div className="flex items-center gap-2 px-1">
                <Sliders className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                    Student Sidebar Customization
                </h3>
            </div>

            <Card className="border border-border shadow-sm rounded-2xl overflow-hidden bg-card">
                <CardContent className="p-6 space-y-6">
                    <div>
                        <h4 className="font-semibold text-sm text-foreground">Configure Navigation Tabs</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                            Select which navigation items are visible to students of <strong>{college.name}</strong>. Disabled items will be hidden from their sidebar navigation.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {(isAssessments ? ASSESSMENT_TABS : CAMPUS_TABS).map((tab) => {
                            const isChecked = sidebarConfig[tab.key] !== false;
                            return (
                                <div key={tab.key} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/30 transition-all">
                                    <Label htmlFor={`tab-${tab.key}`} className="cursor-pointer font-semibold text-xs truncate mr-2 text-foreground">
                                        {tab.title}
                                    </Label>
                                    <Switch
                                        id={`tab-${tab.key}`}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => handleToggleTab(tab.key, checked)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SidebarConfig;
