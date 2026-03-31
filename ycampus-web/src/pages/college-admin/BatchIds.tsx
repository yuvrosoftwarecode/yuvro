import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, FolderOpen, Building } from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartments';
import { useBatchIds, BatchId } from '@/hooks/useBatchIds';
import { BatchIdCard } from '@/components/college-admin/batch-management/BatchIdCard';
import { BatchIdDetailView } from '@/components/college-admin/batch-management/BatchIdDetailView';
import { AddBatchIdDialog } from '@/components/college-admin/batch-management/AddBatchIdDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function BatchIds() {
  const { departments, isLoading: loadingDepts } = useDepartments();
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<BatchId | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { batchIds, isLoading, createBatchId, updateBatchId, deleteBatchId } = useBatchIds(
    selectedDeptId || undefined
  );

  // Filter batch IDs by search query
  const filteredBatchIds = batchIds?.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDepartmentName = (deptId: string) => {
    const dept = departments?.find(d => d.id === deptId);
    return dept ? `${dept.name} (${dept.code})` : 'Unknown';
  };

  const handleCreateBatchId = (data: { department_id: string; name: string; description?: string }) => {
    createBatchId.mutate(data, {
      onSuccess: () => setShowAddDialog(false),
    });
  };

  const handleArchive = (batchId: BatchId) => {
    updateBatchId.mutate({ id: batchId.id, is_archived: !batchId.is_archived });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteBatchId.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  // If a batch ID is selected, show the detail view
  if (selectedBatchId) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <CollegeAdminSidebar />
          <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
              <BatchIdDetailView
                batchId={selectedBatchId}
                departmentName={getDepartmentName(selectedBatchId.department_id)}
                onBack={() => setSelectedBatchId(null)}
              />
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Batch Management</h1>
              {/* Page Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Batch IDs</h2>
                  <p className="text-muted-foreground mt-1">
                    Manage batch containers across departments
                  </p>
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Batch ID
                </Button>
              </div>

              {/* Filters */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search batch IDs..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="w-full sm:w-64">
                      <Select 
                        value={selectedDeptId || "all"} 
                        onValueChange={(val) => setSelectedDeptId(val === "all" ? "" : val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Departments" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-lg z-50">
                          <SelectItem value="all">All Departments</SelectItem>
                          {departments?.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Batch IDs Grid */}
              {isLoading || loadingDepts ? (
                <div className="py-12 text-center text-muted-foreground">
                  Loading batch IDs...
                </div>
              ) : filteredBatchIds && filteredBatchIds.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredBatchIds.map((batchId) => (
                    <BatchIdCard
                      key={batchId.id}
                      batchId={batchId}
                      departmentName={getDepartmentName(batchId.department_id)}
                      onSelect={setSelectedBatchId}
                      onEdit={() => {}}
                      onDelete={(b) => setDeleteId(b.id)}
                      onArchive={handleArchive}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Batch IDs Found</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {searchQuery || selectedDeptId
                          ? 'Try adjusting your filters'
                          : 'Create your first Batch ID to get started'}
                      </p>
                      {!searchQuery && !selectedDeptId && (
                        <Button onClick={() => setShowAddDialog(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Batch ID
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Add Dialog */}
      <AddBatchIdDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        departments={departments || []}
        selectedDepartmentId={selectedDeptId}
        onSubmit={handleCreateBatchId}
        isSubmitting={createBatchId.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch ID?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this Batch ID and all associated batches and semesters. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
