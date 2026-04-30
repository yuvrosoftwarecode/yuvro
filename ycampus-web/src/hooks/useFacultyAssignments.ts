import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { userService } from '@/services/userService';
import subjectService from '@/services/subjectService';

export interface FacultyAssignment {
  id: string;
  faculty_id: string;
  course_id: string;
  department_id: string;
  semester: number;
  section?: string;
  academic_year: string;
  is_active: boolean;
  assigned_at: string;
  semester_subject_id?: string; // Added for backend compatibility
}

export interface FacultyWithAssignments {
  id: string;
  full_name: string;
  email: string;
  department_ids: string[];
  reporting_to?: string;
  assignments: Array<{
    id: string;
    course_id: string;
    course_name: string;
    course_code: string;
    department_id: string;
    department_name: string;
    semester: number;
    section?: string;
  }>;
}

export function useFacultyAssignments() {
  const queryClient = useQueryClient();

  const { data: facultyWithAssignments, isLoading } = useQuery({
    queryKey: ['faculty-with-assignments'],
    queryFn: async () => {
      // Get all faculty profiles
      const [usersRes, assignments] = await Promise.all([
        userService.getUsers({ role: 'faculty', page_size: 100 }),
        subjectService.getFacultyAssignments()
      ]);
      
      const facultyProfiles = usersRes.results || [];

      // Combine the data
      let facultyWithAssignments: FacultyWithAssignments[] = facultyProfiles.map(faculty => {
        const facultyAssignments = assignments.filter(a => String(a.faculty) === String(faculty.id));
        
        return {
          id: String(faculty.id),
          full_name: `${faculty.first_name} ${faculty.last_name}`.trim() || faculty.username,
          email: faculty.email,
          department_ids: [...new Set(facultyAssignments.map(a => String(a.semester_subject_details?.department_id)).filter(Boolean))],
          assignments: facultyAssignments.map(a => ({
            id: String(a.id),
            course_id: String(a.semester_subject_details?.subject_details.id || ''),
            course_name: a.semester_subject_details?.subject_details.subject_name || '',
            course_code: a.semester_subject_details?.subject_details.short_code || '',
            department_id: String(a.semester_subject_details?.department_id || ''),
            department_name: a.semester_subject_details?.department_name || '',
            semester: a.semester_subject_details?.semester_number || 1,
            section: a.section_name
          }))
        };
      });

      return facultyWithAssignments;
    }
  });

  const addAssignment = useMutation({
    mutationFn: async (assignment: any) => {
      // In the backend, we need semester_subject, section, and faculty IDs.
      // The UI might pass section as a string name or ID.
      // For now, assuming the UI provides what we need or we have a way to resolve it.
      // If semester_subject_id is provided directly:
      if (assignment.semester_subject_id && assignment.section_id) {
        return await subjectService.assignFacultyToSectionSubject({
          semester_subject: assignment.semester_subject_id,
          section: assignment.section_id,
          faculty: assignment.faculty_id
        });
      }
      
      throw new Error('Semester Subject ID and Section ID are required for backend assignment');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty-with-assignments'] });
      toast.success('Assignment added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add assignment');
    }
  });

  const deleteAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      await subjectService.removeFacultyFromSectionSubject(assignmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty-with-assignments'] });
      toast.success('Assignment deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete assignment');
    }
  });

  return {
    facultyWithAssignments,
    isLoading,
    addAssignment: addAssignment.mutate,
    deleteAssignment: deleteAssignment.mutate
  };
}