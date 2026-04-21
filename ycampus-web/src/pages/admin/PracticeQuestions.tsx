import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { QuestionSetup } from '@/components/admin/practice-questions/QuestionSetup';
import { QuestionManager } from '@/components/admin/practice-questions/QuestionManager';
import PageHeader from '@/components/common/PageHeader';

const PracticeQuestions = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6 bg-background">
            <PageHeader 
              title="Practice Questions" 
            />
            <Card>
              <CardContent className="p-6">
                <QuestionSetup />
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PracticeQuestions;