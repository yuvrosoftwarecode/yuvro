import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AddBatchForm } from '@/components/admin/batches/AddBatchForm';
import { EditBatchForm } from '@/components/admin/batches/EditBatchForm';
import { DeleteBatchForm } from '@/components/admin/batches/DeleteBatchForm';
import PageHeader from '@/components/common/PageHeader';

const Batches = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6 bg-background">
            <PageHeader 
              title="Batch Management" 
            />
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="add" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="add">Add Batch</TabsTrigger>
                    <TabsTrigger value="edit">Edit Batch</TabsTrigger>
                    <TabsTrigger value="delete">Delete Batch</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="add" className="mt-6">
                    <AddBatchForm />
                  </TabsContent>
                  
                  <TabsContent value="edit" className="mt-6">
                    <EditBatchForm />
                  </TabsContent>
                  
                  <TabsContent value="delete" className="mt-6">
                    <DeleteBatchForm />
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

export default Batches;