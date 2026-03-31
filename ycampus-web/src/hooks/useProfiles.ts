import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
      let query = supabase
        .from('profiles')
        .select('*');
      
      if (role) {
        query = query.eq('role', role);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Profile[];
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          email: newProfile.email,
          full_name: newProfile.full_name,
          role: newProfile.role
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Profile;
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
