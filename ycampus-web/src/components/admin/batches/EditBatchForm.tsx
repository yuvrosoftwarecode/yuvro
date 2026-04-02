import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useBatchManagement } from '@/hooks/useBatchManagement';
import { useCourseManagement } from '@/hooks/useCourseManagement';
import { BatchSelector } from './BatchSelector';
import { BatchFormFields } from './BatchFormFields';
import { CourseAssignment } from './CourseAssignment';
import apiService from '@/services/api';





export function EditBatchForm() {
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [unassignedCourses, setUnassignedCourses] = useState([]);
  const [batchData, setBatchData] = useState({
    name: '',
    title: '',
    description: '',
  });
  
  const { batches, loading: batchLoading, updateBatch } = useBatchManagement();
  const { availableCourses, loading: courseLoading } = useCourseManagement();

  // Calculate unassigned courses when courses or assigned courses change
  useEffect(() => {
    if (availableCourses.length > 0) {
      const assignedCourseIds = assignedCourses.map(course => String(course.courseId));
      const unassigned = availableCourses
        .map(course => ({ courseId: course.value, courseName: course.label }))
        .filter(course => !assignedCourseIds.includes(String(course.courseId)));
      setUnassignedCourses(unassigned);
    }
  }, [availableCourses, assignedCourses]);

  const handleBatchSelect = async (batchId: string) => {
    setSelectedBatchId(batchId);
    const batch = batches.find(b => b.batchId === batchId);
    if (batch) {
      setBatchData({
        name: batch.batchName || '',
        title: batch.batchTitle || '',
        description: batch.description || '',
      });
    }
    
    try {
      const response = await apiService.getCoursesByBatch(batchId);
      const batchCoursesResponse = response._embedded?.courses || [];

      const batchCourses = batchCoursesResponse.map((course: any) => {
        const id = String(course?._links?.self?.href?.split('/')?.pop() ?? '');
        return { ...course, courseId: course.courseId ?? id };
      });
      setAssignedCourses(batchCourses);
    } catch (error) {
      console.error('Error fetching batch courses:', error);
      toast.error('Failed to fetch batch courses');
    }
  };

  const handleRemoveCourse = (courseId: string) => {
    const courseToRemove = assignedCourses.find(course => String(course.courseId) === String(courseId));
    if (courseToRemove) {
      setAssignedCourses(prev => prev.filter(course => String(course.courseId) !== String(courseId)));
      setUnassignedCourses(prev => [...prev, courseToRemove]);
      // Here you would typically call an API to remove the course from the batch
      // toast.success(`Removed ${courseToRemove.courseName} from batch`);
    }
  };

  const handleAssignCourse = (courseId: string) => {
    const courseToAssign = unassignedCourses.find(course => String(course.courseId) === String(courseId));
    if (courseToAssign) {
      setUnassignedCourses(prev => prev.filter(course => String(course.courseId) !== String(courseId)));
      setAssignedCourses(prev => [...prev, courseToAssign]);
      // Here you would typically call an API to assign the course to the batch
      // toast.success(`Assigned ${courseToAssign.courseName} to batch`);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setBatchData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBatchId) {
      toast.error('Please select a batch to edit');
      return;
    }

    if (!batchData.name || !batchData.title) {
      toast.error('Please fill in all required fields');
      return;
    }

    const payload = {
      batchName: batchData.name,
      batchTitle: batchData.title,
      description: batchData.description,
      courses: assignedCourses.map(course => `http://localhost:9090/courses/${course.courseId}`)
    };
    
    const success = await updateBatch(selectedBatchId, payload);
    if (success) {
      setBatchData({ name: '', title: '', description: '' });
      setSelectedBatchId('');
      setAssignedCourses([]);
      setUnassignedCourses([]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Batch</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <BatchSelector 
            batches={batches}
            selectedBatchId={selectedBatchId}
            onBatchSelect={handleBatchSelect}
            label="Select Batch to Edit"
          />

          {selectedBatchId && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <BatchFormFields 
                batchData={batchData} 
                onInputChange={handleInputChange} 
              />

              <CourseAssignment
                assignedCourses={assignedCourses}
                unassignedCourses={unassignedCourses}
                onRemoveCourse={handleRemoveCourse}
                onAssignCourse={handleAssignCourse}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={batchLoading || courseLoading}
              >
                Update Batch
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}