import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { useBatchManagement } from '@/hooks/useBatchManagement';
import { BatchSelector } from './BatchSelector';



export function DeleteBatchForm() {
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { batches, loading, deleteBatch } = useBatchManagement();

  const selectedBatch = batches.find(batch => batch.batchId === selectedBatchId);

  const handleDelete = async () => {
    if (!selectedBatchId) return;
    
    const success = await deleteBatch(selectedBatchId);
    if (success) {
      setSelectedBatchId('');
      setIsDialogOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Delete Batch
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <BatchSelector 
            batches={batches}
            selectedBatchId={selectedBatchId}
            onBatchSelect={setSelectedBatchId}
            label="Select Batch to Delete"
            placeholder="Choose a batch to delete"
          />

          {selectedBatch && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4">
                <h4 className="font-medium text-destructive mb-2">Batch Details</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {selectedBatch.batchName}</p>
                  <p><strong>Title:</strong> {selectedBatch.batchTitle}</p>
                  <p><strong>Description:</strong> {selectedBatch.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full" 
                disabled={!selectedBatchId || loading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Batch
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the batch
                  "{selectedBatch?.batchName}" and remove all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}