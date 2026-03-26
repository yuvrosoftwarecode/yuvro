import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, FolderOpen, GraduationCap, Trash2, Power } from 'lucide-react';
import { BatchId, useBatchSemesters } from '@/hooks/useBatchIds';
import { AddSemesterDialog } from './AddSemesterDialog';
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

interface BatchIdDetailViewProps {
  batchId: BatchId;
  departmentName: string;
  onBack: () => void;
}

export function BatchIdDetailView({ batchId, departmentName, onBack }: BatchIdDetailViewProps) {
  const { semesters, isLoading, createSemester, updateSemester, deleteSemester } = useBatchSemesters(batchId.id);
  const [showAddSemesterDialog, setShowAddSemesterDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreateSemester = (data: { semester_number: number; name?: string }) => {
    createSemester.mutate(
      { batch_id_ref: batchId.id, ...data },
      { onSuccess: () => setShowAddSemesterDialog(false) }
    );
  };

  const handleToggleActive = (semester: { id: string; is_active: boolean }) => {
    updateSemester.mutate({ id: semester.id, is_active: !semester.is_active });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteSemester.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>College</span>
            <span>→</span>
            <span>{departmentName}</span>
            <span>→</span>
            <span className="text-foreground font-medium">{batchId.name}</span>
          </div>
          <h2 className="text-2xl font-semibold mt-1">{batchId.name}</h2>
          {batchId.description && (
            <p className="text-muted-foreground mt-1">{batchId.description}</p>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {semesters?.length || 0} semester{(semesters?.length || 0) !== 1 ? 's' : ''} configured
        </p>
        <Button onClick={() => setShowAddSemesterDialog(true)} disabled={batchId.is_archived}>
          <Plus className="h-4 w-4 mr-2" />
          Add Semester
        </Button>
      </div>

      {/* Semesters list */}
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading semesters...</div>
      ) : semesters && semesters.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {semesters.map((semester) => (
            <Card 
              key={semester.id} 
              className={`transition-all ${!semester.is_active ? 'opacity-60 bg-muted/30' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${semester.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                      <GraduationCap className={`h-5 w-5 ${semester.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h4 className="font-medium">Semester {semester.semester_number}</h4>
                      {semester.name && (
                        <p className="text-sm text-muted-foreground">{semester.name}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={semester.is_active ? 'default' : 'secondary'} className="text-xs">
                    {semester.is_active ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8"
                    onClick={() => handleToggleActive(semester)}
                  >
                    <Power className="h-3.5 w-3.5 mr-1.5" />
                    {semester.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(semester.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Semesters Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add semesters to this Batch ID to organize your academic structure.
              </p>
              <Button onClick={() => setShowAddSemesterDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Semester
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Semester Dialog */}
      <AddSemesterDialog
        open={showAddSemesterDialog}
        onOpenChange={setShowAddSemesterDialog}
        batchName={batchId.name}
        existingSemesters={semesters?.map(s => s.semester_number) || []}
        onSubmit={handleCreateSemester}
        isSubmitting={createSemester.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Semester?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this semester. This action cannot be undone.
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
    </div>
  );
}
