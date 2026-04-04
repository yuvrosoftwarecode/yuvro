import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { announcementService, Announcement as APIAnnouncement } from '@/services/announcementService';
import { studentService } from '@/services/studentService';

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

// Helper to map API Announcement to UI Announcement
const mapToUI = (a: APIAnnouncement, readSet: Set<string>): Announcement => ({
  id: a.id,
  title: a.title,
  description: a.content || '',
  full_content: a.content || null,
  category: a.level,
  department_id: a.department,
  priority: a.priority,
  posted_by: a.created_by_name || 'Admin',
  posted_date: a.publish_date || a.created_at,
  expiry_date: a.expiry_date,
  attachment_url: a.attachment || null,
  created_at: a.created_at,
  updated_at: a.updated_at,
  is_read: readSet.has(a.id),
});

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

  // Fetch student's department info
  const [studentDeptId, setStudentDeptId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'student') return;
    const fetchStudentProfile = async () => {
      try {
        const response = await studentService.getStudents({ user: user.id });
        if (response.results.length > 0) {
          const studentProfile = response.results[0];
          setStudentDeptId(studentProfile.department?.toString() || null);
        }
      } catch (err) {
        console.error('Error fetching student profile:', err);
      }
    };
    fetchStudentProfile();
  }, [user]);

  // Fetch announcements
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch announcements from REST API
        const response = await announcementService.getAnnouncements({
          is_active: true,
          ordering: '-publish_date'
        });

        // For now, we'll use local state for read status as the backend doesn't have a direct "read" endpoint yet
        // or we could use a local storage based approach if needed.
        const readSet = new Set<string>(); // In a real app, this might come from another API call or localStorage
        setReadIds(readSet);

        const apiAnnouncements = (response.results || []).map((a: APIAnnouncement) => 
          mapToUI(a, readSet)
        );

        // Filter: hide expired, filter department visibility
        const now = new Date();
        const visible = apiAnnouncements.filter((a: Announcement) => {
          if (a.expiry_date && new Date(a.expiry_date) < now) return false;
          // For students, show college announcements or those specifically for their department
          if (user.role === 'student' && a.category === 'department' && a.department_id && a.department_id !== studentDeptId) {
            return false;
          }
          return true;
        });

        setAnnouncements(visible);
      } catch (err) {
        console.error('Error fetching announcements:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, studentDeptId]);

  // Mark as read (local state for now)
  const markAsRead = async (announcementId: string) => {
    if (readIds.has(announcementId)) return;
    
    // If backend supports marking as read, add API call here
    // await announcementService.markAsRead(announcementId);
    
    setReadIds((prev: Set<string>) => new Set([...prev, announcementId]));
    setAnnouncements((prev: Announcement[]) =>
      prev.map((a: Announcement) => (a.id === announcementId ? { ...a, is_read: true } : a))
    );
  };


  // Filtered & sorted
  const filtered = useMemo(() => {
    let result = [...announcements];

    if (categoryFilter !== 'all') {
      result = result.filter((a: Announcement) => a.category === categoryFilter);
    }
    if (priorityFilter !== 'all') {
      result = result.filter((a: Announcement) => a.priority === priorityFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a: Announcement) => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
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
