import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface HODWithDepartments {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  departments: {
    id: string;
    name: string;
    code: string;
    assigned_at: string;
  }[];
  subjects?: string[];
  sections?: string[];
  reporting_principal?: string;
}

const DUMMY_HODS: HODWithDepartments[] = [
  {
    id: 'h1',
    full_name: 'Sunitha',
    email: 'sunitha@sid.com',
    created_at: '2025-02-10T00:00:00Z',
    departments: [
      { id: 'd1', name: 'Computer Science', code: 'CS', assigned_at: '2025-02-10T00:00:00Z' }
    ],
    subjects: ['Data Structures', 'Algorithms', 'Operating Systems'],
    sections: ['A', 'B'],
    reporting_principal: 'Vamshi Krishna'
  },
  {
    id: 'h2',
    full_name: 'Hodtest',
    email: 'hodtest@testing.com',
    created_at: '2025-02-10T00:00:00Z',
    departments: [
      { id: 'd2', name: 'Information Technology', code: 'IT', assigned_at: '2025-02-10T00:00:00Z' },
      { id: 'd3', name: 'Electronics and Communication', code: 'ECE', assigned_at: '2025-02-10T00:00:00Z' }
    ],
    subjects: ['Network Security', 'Web Technologies', 'Digital Signal Processing'],
    sections: ['A', 'B', 'C'],
    reporting_principal: 'Vamshi Krishna'
  },
  {
    id: 'h3',
    full_name: 'HOD User',
    email: 'hod@test.com',
    created_at: '2025-02-10T00:00:00Z',
    departments: [
      { id: 'd4', name: 'Mechanical Engineering', code: 'ME', assigned_at: '2025-02-10T00:00:00Z' }
    ],
    subjects: ['Thermodynamics', 'Heat Transfer', 'Machine Design'],
    sections: ['A'],
    reporting_principal: 'Principal User'
  }
];

export const useHODs = () => {
  const queryClient = useQueryClient();

  const { data: hods, isLoading } = useQuery({
    queryKey: ['hods'],
    queryFn: async () => {
      // Fetch HODs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'hod');

      if (profilesError) throw profilesError;

      // If no data, return dummy data
      if (!profilesData || profilesData.length === 0) {
        return DUMMY_HODS;
      }

      // Fetch department mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('hod_department_mapping')
        .select(`
          user_id,
          assigned_at,
          departments:department_id (
            id,
            name,
            code
          )
        `);

      if (mappingsError) throw mappingsError;

      // Combine data
      const hodsWithDepts: HODWithDepartments[] = profilesData.map(profile => {
        const deptMappings = mappingsData.filter(m => m.user_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          created_at: profile.created_at,
          departments: deptMappings.map(m => ({
            id: m.departments.id,
            name: m.departments.name,
            code: m.departments.code,
            assigned_at: m.assigned_at
          }))
        };
      });

      return hodsWithDepts;
    }
  });

  const deleteHODMutation = useMutation({
    mutationFn: async (hodId: string) => {
      // Delete department mappings first
      const { error: mappingError } = await supabase
        .from('hod_department_mapping')
        .delete()
        .eq('user_id', hodId);

      if (mappingError) throw mappingError;

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', hodId);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hods'] });
      toast({
        title: 'Success',
        description: 'HOD deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete HOD: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const updateHODMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { full_name: string; email: string } }) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hods'] });
      toast({
        title: 'Success',
        description: 'HOD updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update HOD: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  return {
    hods: hods || [],
    isLoading,
    deleteHOD: deleteHODMutation.mutate,
    updateHOD: updateHODMutation.mutate
  };
};
