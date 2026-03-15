import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TOPIC_CATEGORIES } from '@/lib/instructorConstants';

interface InstructorCategoryTabsProps {
    selectedTab: string;
    onTabChange: (value: string) => void;
    counts: Record<string, number>;
}

const InstructorCategoryTabs: React.FC<InstructorCategoryTabsProps> = ({
    selectedTab,
    onTabChange,
    counts
}) => {
    return (
        <Tabs value={selectedTab} onValueChange={onTabChange} className="mb-6">
            <TabsList className="inline-flex w-auto gap-1">
                {TOPIC_CATEGORIES.map((category) => (
                    <TabsTrigger key={category.key} value={category.key} className="px-5">
                        <span className="mr-2">{category.label}</span>
                        <span className="opacity-70 text-xs py-0.5 px-2 rounded-full">
                            {counts[category.key] || 0}
                        </span>
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
};

export default InstructorCategoryTabs;
