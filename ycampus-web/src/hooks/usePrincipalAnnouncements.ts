import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { announcementService, Announcement } from '@/services/announcementService';
import { toast } from 'sonner';

export interface AnnouncementRow {
  id: string;
  title: string;
  description: string;
  full_content: string | null;
  category: 'college' | 'department' | 'batch';
  department_id: string | null;
  department_name?: string;
  batch_id?: string | null;
  batch_name?: string;
  priority: 'normal' | 'important' | 'urgent';
  posted_by: string;
  posted_date: string;
  expiry_date: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  created_by_id?: string | number;
}

export interface CreateAnnouncementInput {
  title: string;
  description: string;
  full_content?: string;
  category: 'college' | 'department' | 'batch';
  department_id?: string | null;
  department_name?: string;
  batch_id?: string | null;
  batch_name?: string;
  priority: 'normal' | 'important' | 'urgent';
  expiry_date?: string | null;
  attachment_url?: string | null;
  attachment_file?: File;
  is_active: boolean;
  college_id?: string;
}

// Helper to map API Announcement to UI AnnouncementRow
const mapToUI = (a: Announcement): AnnouncementRow => ({
  id: a.id,
  title: a.title,
  description: a.content || '',
  full_content: null,
  category: a.level as 'college' | 'department' | 'batch',
  department_id: a.department,
  department_name: a.department_name ?? undefined,
  batch_id: a.batch,
  batch_name: a.batch_name ?? undefined,
  priority: a.priority,
  posted_by: a.created_by_name || 'Principal',
  posted_date: a.publish_date || a.created_at,
  expiry_date: a.expiry_date || null,
  attachment_url: a.attachment || null,
  created_at: a.created_at,
  updated_at: a.updated_at,
  created_by_id: a.created_by,
});

export function usePrincipalAnnouncements() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const collegeId = (user as any)?.college_id;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'college' | 'department' | 'batch'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'normal' | 'important' | 'urgent'>('all');
  const [filterAuthorship, setFilterAuthorship] = useState<'all' | 'self' | 'others'>('all');

  const { data: rawAnnouncements = [], isLoading } = useQuery({
    queryKey: ['principal-announcements', collegeId],
    queryFn: async () => {
      const response = await announcementService.getAnnouncements({ college: collegeId });
      // Handle array or object response (sometimes DRF returns {results: [...]})
      const results = Array.isArray(response) ? response : (response as any).results || [];
      return results as Announcement[];
    },
  });

  const announcements = (rawAnnouncements as Announcement[]).map(mapToUI);

  const createMutation = useMutation({
    mutationFn: async (input: CreateAnnouncementInput) => {
      let parsedExpiryDate = null;
      if (input.expiry_date) {
        const parts = input.expiry_date.split('-');
        if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
          parsedExpiryDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          parsedExpiryDate = input.expiry_date;
        }
      }

      if (input.attachment_file || true) { // Always use FormData to match backup safely
        const payload = new FormData();
        payload.append('title', input.title);
        payload.append('content', input.description);
        payload.append('level', input.category);
        if (input.category === 'department' && input.department_id) {
          payload.append('department', input.department_id);
        } else if (input.category === 'batch' && input.batch_id) {
          if (input.department_id) payload.append('department', input.department_id);
          payload.append('batch', input.batch_id);
        }
        payload.append('priority', input.priority);
        payload.append('is_active', input.is_active.toString());
        if (collegeId) payload.append('college', collegeId);
        if (parsedExpiryDate) {
          payload.append('expiry_date', parsedExpiryDate);
        }
        
        if (input.attachment_file) {
          payload.append('attachment', input.attachment_file);
        }
        
        return await announcementService.createAnnouncement(payload);
      } else {
        const payload: Partial<Announcement> = {
          title: input.title,
          content: input.description,
          level: input.category,
          department: input.category !== 'college' ? input.department_id : null,
          batch: input.category === 'batch' ? input.batch_id : null,
          priority: input.priority,
          expiry_date: input.expiry_date || null,
        };
        return await announcementService.createAnnouncement(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principal-announcements'] });
      toast.success('Announcement created successfully');
    },
    onError: (err: Error) => {
      toast.error(`Failed to create announcement: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await announcementService.deleteAnnouncement(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principal-announcements'] });
      toast.success('Announcement deleted');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateAnnouncementInput> }) => {
      let parsedExpiryDate = null;
      if (updates.expiry_date) {
        const parts = updates.expiry_date.split('-');
        if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
          parsedExpiryDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          parsedExpiryDate = updates.expiry_date;
        }
      }

      if (updates.attachment_file || true) {
        const payload = new FormData();
        if (updates.title) payload.append('title', updates.title);
        if (updates.description) payload.append('content', updates.description);
        if (updates.category) {
          payload.append('level', updates.category);
          // When level changes, clear irrelevant secondary fields if not provided
          if (updates.category === 'college') {
            payload.append('department', '');
            payload.append('batch', '');
          } else if (updates.category === 'department' && updates.department_id) {
            payload.append('department', updates.department_id);
            payload.append('batch', '');
          } else if (updates.category === 'batch' && updates.batch_id) {
            if (updates.department_id) payload.append('department', updates.department_id);
            payload.append('batch', updates.batch_id);
          }
        } else {
          // If category didn't change, still append fields if provided
          if (updates.department_id !== undefined) payload.append('department', updates.department_id || '');
          if (updates.batch_id !== undefined) payload.append('batch', updates.batch_id || '');
        }
        if (updates.priority) payload.append('priority', updates.priority);
        if (updates.is_active !== undefined) payload.append('is_active', updates.is_active.toString());
        if (parsedExpiryDate) payload.append('expiry_date', parsedExpiryDate);
        
        if (updates.attachment_file) {
          payload.append('attachment', updates.attachment_file);
        }
        
        return await announcementService.updateAnnouncement(id, payload);
      } else {
        const payload: Partial<Announcement> = {
          title: updates.title,
          content: updates.description,
          level: updates.category,
          department: updates.category === 'department' ? updates.department_id : null,
          priority: updates.priority,
          expiry_date: updates.expiry_date,
        };
        return await announcementService.updateAnnouncement(id, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['principal-announcements'] });
      toast.success('Announcement updated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  // Filtered list
  const filtered = announcements.filter((a) => {
    if (filterCategory !== 'all' && a.category !== filterCategory) return false;
    if (filterPriority !== 'all' && a.priority !== filterPriority) return false;
    if (filterAuthorship === 'self' && a.created_by_id?.toString() !== user?.id?.toString()) return false;
    if (filterAuthorship === 'others' && a.created_by_id?.toString() === user?.id?.toString()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return {
    announcements: filtered,
    allAnnouncements: announcements,
    isLoading,
    searchQuery, setSearchQuery,
    filterCategory, setFilterCategory,
    filterPriority, setFilterPriority,
    filterAuthorship, setFilterAuthorship,
    createAnnouncement: createMutation.mutateAsync,
    deleteAnnouncement: deleteMutation.mutate,
    updateAnnouncement: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

