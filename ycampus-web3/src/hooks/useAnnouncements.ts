import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Announcement {
  id: string;
  title: string;
  description: string;
  full_content: string | null;
  category: 'college' | 'department';
  department_id: string | null;
  priority: 'normal' | 'important' | 'urgent';
  posted_by: string;
  posted_date: string;
  expiry_date: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  is_read: boolean;
}

export type CategoryFilter = 'all' | 'college' | 'department';
export type PriorityFilter = 'all' | 'normal' | 'important' | 'urgent';
export type SortOrder = 'latest' | 'oldest';

export function useAnnouncements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch student's department
  const [studentDeptId, setStudentDeptId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchDept = async () => {
      const { data } = await supabase
        .from('student_semester_mapping')
        .select('department_id')
        .eq('student_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      setStudentDeptId(data?.department_id ?? null);
    };
    fetchDept();
  }, [user]);

  // Fetch announcements
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const [announcementsRes, readsRes] = await Promise.all([
        supabase.from('announcements').select('*').order('posted_date', { ascending: false }),
        supabase.from('announcement_reads').select('announcement_id').eq('user_id', user.id),
      ]);

      const readSet = new Set((readsRes.data ?? []).map((r: any) => r.announcement_id));
      setReadIds(readSet);

      const allAnnouncements: Announcement[] = (announcementsRes.data ?? []).map((a: any) => ({
        ...a,
        is_read: readSet.has(a.id),
      }));

      // Filter: hide expired, filter department visibility
      const visible = allAnnouncements.filter((a) => {
        if (a.expiry_date && new Date(a.expiry_date) < new Date()) return false;
        if (a.category === 'department' && a.department_id !== studentDeptId) return false;
        return true;
      });

      setAnnouncements(visible);
      setLoading(false);
    };
    fetchData();
  }, [user, studentDeptId]);

  // Mark as read
  const markAsRead = async (announcementId: string) => {
    if (!user || readIds.has(announcementId)) return;
    await supabase.from('announcement_reads').insert({
      announcement_id: announcementId,
      user_id: user.id,
    });
    setReadIds((prev) => new Set([...prev, announcementId]));
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === announcementId ? { ...a, is_read: true } : a))
    );
  };

  // Filtered & sorted
  const filtered = useMemo(() => {
    let result = [...announcements];

    if (categoryFilter !== 'all') {
      result = result.filter((a) => a.category === categoryFilter);
    }
    if (priorityFilter !== 'all') {
      result = result.filter((a) => a.priority === priorityFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const da = new Date(a.posted_date).getTime();
      const db = new Date(b.posted_date).getTime();
      return sortOrder === 'latest' ? db - da : da - db;
    });

    return result;
  }, [announcements, categoryFilter, priorityFilter, sortOrder, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const unreadCount = announcements.filter((a) => !a.is_read).length;

  return {
    announcements: paginated,
    allFiltered: filtered,
    loading,
    unreadCount,
    categoryFilter, setCategoryFilter,
    priorityFilter, setPriorityFilter,
    sortOrder, setSortOrder,
    searchQuery, setSearchQuery,
    page, setPage, totalPages,
    markAsRead,
  };
}
