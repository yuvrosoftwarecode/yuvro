import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import apiService from '@/services/api';
import { useCourseManagement } from '@/hooks/useCourseManagement';

export const DeleteCourseForm = () => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const { courses, availableCourses, refetch } = useCourseManagement();

  const selectedCourse = courses.find(course => course.courseId === selectedCourseId);

  const handleDelete = async () => {
    if (!selectedCourseId) return;
    
    try {
      await apiService.deleteCourse(selectedCourseId);
      toast.success('Course deleted successfully!');
      setSelectedCourseId('');
      await refetch(); // Refresh the courses list
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="text-xl font-semibold text-foreground">Delete Course</h3>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Select Course to Delete <span className="text-destructive">*</span>
          </Label>
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a course to delete" />
            </SelectTrigger>
            <SelectContent>
              {availableCourses.map(course => (
                <SelectItem key={course.value} value={course.value}>
                  {course.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCourse && (
          <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-destructive">Warning</h4>
                <p className="text-sm text-muted-foreground">
                  You are about to delete the course "<strong>{selectedCourse.courseName}</strong>". 
                  This action will permanently remove:
                </p>
                <ul className="text-sm text-muted-foreground ml-4 space-y-1">
                  <li>• All modules associated with this course</li>
                  <li>• All topics within those modules</li>
                  <li>• Any student progress data for this course</li>
                  <li>• Any assessments or assignments related to this course</li>
                </ul>
                <p className="text-sm font-medium text-destructive">
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive"
                disabled={!selectedCourseId}
                className="bg-destructive hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Course
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Confirm Course Deletion
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you absolutely sure you want to delete the course "{selectedCourse?.courseName}"? 
                  This action cannot be undone and will permanently remove all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Yes, Delete Course
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};