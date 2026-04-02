import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface BatchData {
  name: string;
  title: string;
  description: string;
}

interface BatchFormFieldsProps {
  batchData: BatchData;
  onInputChange: (field: string, value: string) => void;
  readonly?: boolean;
}

export function BatchFormFields({ batchData, onInputChange, readonly = false }: BatchFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="batchName">Batch Name *</Label>
          <Input
            id="batchName"
            value={batchData.name}
            onChange={(e) => onInputChange('name', e.target.value)}
            placeholder="Enter batch name"
            required
            readOnly={readonly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="batchTitle">Batch Title *</Label>
          <Input
            id="batchTitle"
            value={batchData.title}
            onChange={(e) => onInputChange('title', e.target.value)}
            placeholder="Enter batch title"
            required
            readOnly={readonly}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={batchData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          placeholder="Enter batch description"
          rows={4}
          readOnly={readonly}
        />
      </div>
    </>
  );
}