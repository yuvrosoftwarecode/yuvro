import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AddCourseForm } from '@/components/admin/courses/AddCourseForm';
import { EditCourseForm } from '@/components/admin/courses/EditCourseForm';
import { DeleteCourseForm } from '@/components/admin/courses/DeleteCourseForm';

const Courses = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">Course Management</h1>
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="add" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="add">Add Course</TabsTrigger>
                    <TabsTrigger value="edit">Edit Course</TabsTrigger>
                    <TabsTrigger value="delete">Delete Course</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="add" className="mt-6">
                    <AddCourseForm />
                  </TabsContent>
                  
                  <TabsContent value="edit" className="mt-6">
                    <EditCourseForm />
                  </TabsContent>
                  
                  <TabsContent value="delete" className="mt-6">
                    <DeleteCourseForm />
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

export default Courses;