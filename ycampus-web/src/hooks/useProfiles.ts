import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { userService, UserRole as BackendUserRole } from '@/services/userService';

export type UserRole = 'admin' | 'faculty' | 'student' | 'hod' | 'principal' | 'college_admin' | 'placement_officer';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id?: string;
  semester?: string;
  section?: string;
  batch_id?: string;
  created_at: string;
  updated_at: string;
}

export function useProfiles(role?: UserRole) {
  const queryClient = useQueryClient();

  const { data: profiles, isLoading, error } = useQuery({
    queryKey: ['profiles', role],
    queryFn: async () => {
      const response = await userService.getUsers({
        role: role as BackendUserRole,
        page_size: 100, // Fetch more if needed, or handle pagination
      });
      
      const data = response.results || [];
      
      return data.map((u: any) => ({
        id: String(u.id),
        email: u.email,
        full_name: u.full_name || `${u.first_name} ${u.last_name}`.strip(),
        role: u.role as UserRole,
        department_id: u.department_id ? String(u.department_id) : undefined,
        semester: u.semester_id ? String(u.semester_id) : undefined,
        section: u.section_id ? String(u.section_id) : undefined,
        batch_id: u.batch_id ? String(u.batch_id) : undefined,
        created_at: u.date_joined || '',
        updated_at: u.date_joined || '', // Backend User doesn't have updated_at in serializer
      })) as Profile[];
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
      const userData: any = {};
      if (updates.full_name) {
        const parts = updates.full_name.split(' ');
        userData.first_name = parts[0];
        userData.last_name = parts.slice(1).join(' ');
      }
      if (updates.email) userData.email = updates.email;
      if (updates.role) userData.role = updates.role;

      return await userService.updateUser(id, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      await userService.deleteUser(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete profile: ${error.message}`);
    },
  });

  const addProfileMutation = useMutation({
    mutationFn: async (newProfile: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => {
      const parts = newProfile.full_name.split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');

      return await userService.createUser({
        username: newProfile.email,
        email: newProfile.email,
        first_name: firstName,
        last_name: lastName,
        role: newProfile.role as any,
        is_active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add profile: ${error.message}`);
    },
  });

  return {
    profiles,
    isLoading,
    error,
    updateProfile: updateProfileMutation.mutate,
    deleteProfile: deleteProfileMutation.mutate,
    addProfile: addProfileMutation.mutateAsync,
  };
}
