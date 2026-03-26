import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Batch {
  batchId: string;
  batchName: string;
  batchTitle: string;
  description: string;
}

interface BatchSelectorProps {
  batches: Batch[];
  selectedBatchId: string;
  onBatchSelect: (batchId: string) => void;
  placeholder?: string;
  label?: string;
}

export function BatchSelector({ 
  batches, 
  selectedBatchId, 
  onBatchSelect, 
  placeholder = "Choose a batch",
  label = "Select Batch"
}: BatchSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={selectedBatchId} onValueChange={onBatchSelect}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {batches.map((batch) => (
            <SelectItem key={batch.batchId} value={batch.batchId}>
              {batch.batchName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}