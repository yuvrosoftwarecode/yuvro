import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';

interface Course {
  courseId: string;
  courseName: string;
}

interface CourseAssignmentProps {
  assignedCourses: Course[];
  unassignedCourses: Course[];
  onRemoveCourse: (courseId: string) => void;
  onAssignCourse: (courseId: string) => void;
  readonly?: boolean;
}

export function CourseAssignment({ 
  assignedCourses, 
  unassignedCourses, 
  onRemoveCourse, 
  onAssignCourse,
  readonly = false
}: CourseAssignmentProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Assigned Courses</Label>
        <div className="min-h-[100px] p-3 border rounded-md bg-muted/50">
          {assignedCourses.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {assignedCourses.map((course) => (
                <Badge key={course.courseId} variant="default" className="flex items-center gap-1">
                  {course.courseName}
                  {!readonly && (
                    <button
                      type="button"
                      onClick={() => onRemoveCourse(course.courseId)}
                      className="ml-1 hover:bg-destructive/10 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No courses assigned to this batch</p>
          )}
        </div>
      </div>

      {!readonly && (
        <div className="space-y-2">
          <Label>Available Courses</Label>
          <div className="min-h-[100px] p-3 border rounded-md">
            {unassignedCourses.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {unassignedCourses.map((course) => (
                  <Badge 
                    key={course.courseId} 
                    variant="outline" 
                    className="flex items-center gap-1 cursor-pointer hover:bg-primary/10" 
                    onClick={() => onAssignCourse(course.courseId)}
                  >
                    {course.courseName}
                    <Plus className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">All courses are assigned to this batch</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}