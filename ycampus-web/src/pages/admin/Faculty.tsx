import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AddFacultyForm } from '@/components/admin/faculty/AddFacultyForm';
import { EditFacultyForm } from '@/components/admin/faculty/EditFacultyForm';
import { DeleteFacultyForm } from '@/components/admin/faculty/DeleteFacultyForm';
import PageHeader from '@/components/common/PageHeader';

const Faculty = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6 bg-background">
            <PageHeader 
              title="Faculty Management" 
            />
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="add" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="add">Add Faculty</TabsTrigger>
                    <TabsTrigger value="edit">Edit Faculty</TabsTrigger>
                    <TabsTrigger value="delete">Delete Faculty</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="add" className="mt-6">
                    <AddFacultyForm />
                  </TabsContent>
                  
                  <TabsContent value="edit" className="mt-6">
                    <EditFacultyForm />
                  </TabsContent>
                  
                  <TabsContent value="delete" className="mt-6">
                    <DeleteFacultyForm />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Faculty;