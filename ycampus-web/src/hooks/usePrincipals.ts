import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { userService } from '@/services/userService';

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

export const usePrincipals = () => {
  const queryClient = useQueryClient();

  const { data: principals, isLoading } = useQuery({
    queryKey: ['principals'],
    queryFn: async () => {
      const response = await userService.getUsers({ role: 'principal' });
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
          assigned_at: u.date_joined || '', // Backend doesn't store assignment date separately in ManyToMany join currently
        })),
      })) as PrincipalWithDepartments[];
    }
  });

  const deletePrincipalMutation = useMutation({
    mutationFn: async (principalId: string) => {
      await userService.deleteUser(principalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principals'] });
      toast({
        title: 'Success',
        description: 'Principal deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to delete principal: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const updatePrincipalMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['principals'] });
      toast({
        title: 'Success',
        description: 'Principal updated successfully',
      });
    },
    onError: (error: any) => {
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
