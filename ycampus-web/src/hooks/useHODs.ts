import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { userService } from '@/services/userService';

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

export const useHODs = () => {
  const queryClient = useQueryClient();

  const { data: hods, isLoading } = useQuery({
    queryKey: ['hods'],
    queryFn: async () => {
      const response = await userService.getUsers({ role: 'hod' });
      const data = response.results || [];

      return data.map((u: any) => ({
        id: String(u.id),
        full_name: u.full_name || `${u.first_name} ${u.last_name}`.trim(),
        email: u.email,
        created_at: u.date_joined || '',
        departments: (u.linked_departments || []).map((d: any) => ({
          id: String(d.id),
          name: d.name,
          code: d.code,
          assigned_at: u.date_joined || '',
        })),
      })) as HODWithDepartments[];
    }
  });

  const deleteHODMutation = useMutation({
    mutationFn: async (hodId: string) => {
      await userService.deleteUser(hodId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hods'] });
      toast({
        title: 'Success',
        description: 'HOD deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete HOD: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const updateHODMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { full_name: string; email: string } }) => {
      const parts = data.full_name.split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');

      await userService.updateUser(id, {
        first_name: firstName,
        last_name: lastName,
        email: data.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hods'] });
      toast({
        title: 'Success',
        description: 'HOD updated successfully',
      });
    },
    onError: (error: any) => {
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
