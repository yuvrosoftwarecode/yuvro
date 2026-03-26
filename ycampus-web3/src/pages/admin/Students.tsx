import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AddStudentForm } from '@/components/admin/students/AddStudentForm';
import { EditStudentForm } from '@/components/admin/students/EditStudentForm';
import { DeleteStudentForm } from '@/components/admin/students/DeleteStudentForm';

const Students = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">Student Management</h1>
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="add" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="add">Add Student</TabsTrigger>
                    <TabsTrigger value="edit">Edit Student</TabsTrigger>
                    <TabsTrigger value="delete">Delete Student</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="add" className="mt-6">
                    <AddStudentForm />
                  </TabsContent>
                  
                  <TabsContent value="edit" className="mt-6">
                    <EditStudentForm />
                  </TabsContent>
                  
                  <TabsContent value="delete" className="mt-6">
                    <DeleteStudentForm />
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

export default Students;