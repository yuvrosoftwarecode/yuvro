import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

export interface FacultyWithAssignments {
  id: string;
  full_name: string;
  email: string;
  department_ids: string[];
  reporting_to?: string;
  assignments: Array<{
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
      const { data: facultyProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'faculty');

      if (profilesError) throw profilesError;

      // Get all faculty assignments with course and department details
      const { data: assignments, error: assignmentsError } = await supabase
        .from('faculty_subject_mapping')
        .select(`
          id,
          faculty_id,
          course_id,
          department_id,
          semester,
          section,
          academic_year,
          is_active,
          assigned_at,
          courses!faculty_subject_mapping_course_id_fkey (name, code),
          departments!faculty_subject_mapping_department_id_fkey (name)
        `)
        .eq('is_active', true);

      if (assignmentsError) throw assignmentsError;

      // Combine the data
      let facultyWithAssignments: FacultyWithAssignments[] = facultyProfiles?.map(faculty => {
        const facultyAssignments = assignments?.filter(a => a.faculty_id === faculty.id) || [];
        
        return {
          id: faculty.id,
          full_name: faculty.full_name,
          email: faculty.email,
          department_ids: [...new Set(facultyAssignments.map(a => a.department_id))],
          assignments: facultyAssignments.map(a => ({
            course_id: a.course_id,
            course_name: a.courses?.name || '',
            course_code: a.courses?.code || '',
            department_id: a.department_id,
            department_name: a.departments?.name || '',
            semester: a.semester,
            section: a.section
          }))
        };
      }) || [];

      return facultyWithAssignments;
    }
  });

  const addAssignment = useMutation({
    mutationFn: async (assignment: Omit<FacultyAssignment, 'id' | 'assigned_at' | 'is_active'>) => {
      const { data, error } = await supabase
        .from('faculty_subject_mapping')
        .insert({
          faculty_id: assignment.faculty_id,
          course_id: assignment.course_id,
          department_id: assignment.department_id,
          semester: assignment.semester,
          section: assignment.section,
          academic_year: assignment.academic_year,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('faculty_subject_mapping')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
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