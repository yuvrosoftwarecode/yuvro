import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MultiSelect } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCourseManagement } from '@/hooks/useCourseManagement';
import { useBatchManagement } from '@/hooks/useBatchManagement';
import { BatchFormFields } from './BatchFormFields';
export function AddBatchForm() {
  const [batchData, setBatchData] = useState({
    name: '',
    title: '',
    description: '',
    courseIds: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { availableCourses, loading } = useCourseManagement();
  const { addBatch } = useBatchManagement();

  const handleInputChange = (field: string, value: string) => {
    setBatchData(prev => ({ ...prev, [field]: value }));
  };

  const handleCourseChange = (selectedCourses: string[]) => {
    setBatchData(prev => ({ ...prev, courseIds: selectedCourses }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!batchData.name || !batchData.title || batchData.courseIds.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    const batchPayload = {
      batchName: batchData.name,
      batchTitle: batchData.title,
      description: batchData.description,
      courses: batchData.courseIds.map(id => `http://localhost:9090/courses/${id}`)
    };
    
    const success = await addBatch(batchPayload);
    if (success) {
      setBatchData({
        name: '',
        title: '',
        description: '',
        courseIds: [],
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Batch</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <BatchFormFields 
            batchData={batchData} 
            onInputChange={handleInputChange} 
          />

          <div className="space-y-2">
            <Label htmlFor="course">Select Courses *</Label>
            <MultiSelect
              options={availableCourses}
              selected={batchData.courseIds}
              onChange={handleCourseChange}
              placeholder="Choose courses..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
            {isSubmitting ? 'Creating...' : 'Add Batch'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}