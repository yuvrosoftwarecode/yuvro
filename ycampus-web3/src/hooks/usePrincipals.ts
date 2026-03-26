import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PrincipalWithDepartments {
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
}

const DUMMY_PRINCIPALS: PrincipalWithDepartments[] = [
  {
    id: '1',
    full_name: 'Vamshi Krishna',
    email: 'vamshi@sid.com',
    created_at: '2025-02-10T00:00:00Z',
    departments: [
      { id: 'd1', name: 'Computer Science', code: 'CS', assigned_at: '2025-02-10T00:00:00Z' },
      { id: 'd2', name: 'Information Technology', code: 'IT', assigned_at: '2025-02-10T00:00:00Z' }
    ],
    subjects: ['Data Structures', 'Algorithms', 'Database Systems'],
    sections: ['A', 'B']
  },
  {
    id: '2',
    full_name: 'Krishna',
    email: 'rohith@principal.com',
    created_at: '2025-02-10T00:00:00Z',
    departments: [
      { id: 'd3', name: 'Electronics and Communication', code: 'ECE', assigned_at: '2025-02-10T00:00:00Z' }
    ],
    subjects: ['Digital Electronics', 'Communication Systems'],
    sections: ['A']
  },
  {
    id: '3',
    full_name: 'Principal User',
    email: 'principal@test.com',
    created_at: '2025-02-10T00:00:00Z',
    departments: [
      { id: 'd4', name: 'Mechanical Engineering', code: 'ME', assigned_at: '2025-02-10T00:00:00Z' },
      { id: 'd5', name: 'Civil Engineering', code: 'CE', assigned_at: '2025-02-10T00:00:00Z' }
    ],
    subjects: ['Thermodynamics', 'Fluid Mechanics', 'Structural Analysis'],
    sections: ['A', 'B', 'C']
  }
];

export const usePrincipals = () => {
  const queryClient = useQueryClient();

  const { data: principals, isLoading } = useQuery({
    queryKey: ['principals'],
    queryFn: async () => {
      // Fetch principals
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'principal');

      if (profilesError) throw profilesError;

      // If no data, return dummy data
      if (!profilesData || profilesData.length === 0) {
        return DUMMY_PRINCIPALS;
      }

      // Fetch department mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('principal_department_mapping')
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
      const principalsWithDepts: PrincipalWithDepartments[] = profilesData.map(profile => {
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

      return principalsWithDepts;
    }
  });

  const deletePrincipalMutation = useMutation({
    mutationFn: async (principalId: string) => {
      // Delete department mappings first
      const { error: mappingError } = await supabase
        .from('principal_department_mapping')
        .delete()
        .eq('user_id', principalId);

      if (mappingError) throw mappingError;

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', principalId);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principals'] });
      toast({
        title: 'Success',
        description: 'Principal deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete principal: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const updatePrincipalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { full_name: string; email: string } }) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principals'] });
      toast({
        title: 'Success',
        description: 'Principal updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update principal: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  return {
    principals: principals || [],
    isLoading,
    deletePrincipal: deletePrincipalMutation.mutate,
    updatePrincipal: updatePrincipalMutation.mutate
  };
};
