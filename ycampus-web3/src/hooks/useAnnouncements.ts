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

      const dbAnnouncements = (announcementsRes.data ?? []).map((a: any) => ({
        ...a,
        is_read: readSet.has(a.id),
      }));

      // Mock data for demonstration
      const mockAnnouncements: Announcement[] = [
        {
          id: 'mock-1',
          title: 'Campus Recruitment Drive: Techflow Solutions',
          description: 'Techflow Solutions is visiting for a campus recruitment drive for final year students.',
          full_content: 'We are pleased to announce that Techflow Solutions will be visiting our campus on April 15th for a recruitment drive. Eligibility: CSE & ECE with 7.5 CGPA and above. Register at the placement cell by April 10th.',
          category: 'college',
          department_id: null,
          priority: 'important',
          posted_by: 'Placement Officer',
          posted_date: new Date().toISOString(),
          expiry_date: new Date(Date.now() + 86400000 * 20).toISOString(),
          attachment_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_read: readSet.has('mock-1'),
        },
        {
          id: 'mock-2',
          title: 'Internal Assessment - II Schedule Out',
          description: 'The schedule for the second internal assessment has been released for all semesters.',
          full_content: 'Students are advised to check the departmental notice board for the detailed schedule of Mid-Term exams starting from next Monday.',
          category: 'department',
          department_id: studentDeptId,
          priority: 'urgent',
          posted_by: 'HOD Office',
          posted_date: new Date(Date.now() - 86400000).toISOString(),
          expiry_date: new Date(Date.now() + 86400000 * 5).toISOString(),
          attachment_url: null,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          is_read: readSet.has('mock-2'),
        },
        {
          id: 'mock-3',
          title: 'Upcoming Holiday: Ambedkar Jayanti',
          description: 'The college will remain closed on April 14th on account of Ambedkar Jayanti.',
          full_content: 'All academic and administrative activities will be suspended for the day.',
          category: 'college',
          department_id: null,
          priority: 'normal',
          posted_by: 'Administration',
          posted_date: new Date(Date.now() - 86400000 * 2).toISOString(),
          expiry_date: new Date(Date.now() + 86400000 * 10).toISOString(),
          attachment_url: null,
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          is_read: readSet.has('mock-3'),
        }
      ];

      const allAnnouncements: Announcement[] = [...dbAnnouncements, ...mockAnnouncements];

      // Filter: hide expired, filter department visibility
      const visible = allAnnouncements.filter((a) => {
        if (a.expiry_date && new Date(a.expiry_date) < new Date()) return false;
        if (a.category === 'department' && a.department_id && a.department_id !== studentDeptId) return false;
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
