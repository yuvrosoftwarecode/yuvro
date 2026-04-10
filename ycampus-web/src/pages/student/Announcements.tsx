import React, { useState } from 'react';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { useAnnouncements, CategoryFilter, PriorityFilter, SortOrder } from '@/hooks/useAnnouncements';
import { AnnouncementCard } from '@/components/student/announcements/AnnouncementCard';
import { AnnouncementFilters } from '@/components/student/announcements/AnnouncementFilters';
import { AnnouncementDetailModal } from '@/components/student/announcements/AnnouncementDetailModal';
import { Button } from '@/components/ui/button';
import { Megaphone, Bell } from 'lucide-react';
import { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Announcement } from '@/hooks/useAnnouncements';

const Announcements = () => {
  const {
    announcements, loading, unreadCount,
    categoryFilter, setCategoryFilter,
    priorityFilter, setPriorityFilter,
    sortOrder, setSortOrder,
    searchQuery, setSearchQuery,
    page, setPage, totalPages,
    markAsRead, allFiltered,
  } = useAnnouncements();

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const handleOpenAnnouncement = (a: Announcement) => {
    setSelectedAnnouncement(a);
    markAsRead(a.id);
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30">
              <Megaphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
              <p className="text-sm text-muted-foreground">
                Stay updated with college & department news
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <div className={cn(badgeVariants({ variant: 'default' }), "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800 gap-1.5 px-3 py-1.5 text-sm")}>
              <Bell className="h-3.5 w-3.5" />
              {unreadCount} unread
            </div>
          )}
        </div>

        {/* Filters */}
        <AnnouncementFilters
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          Showing {allFiltered.length} announcement{allFiltered.length !== 1 ? 's' : ''}
        </p>

        {/* Cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 w-full rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No announcements found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a: Announcement) => (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                onOpen={handleOpenAnnouncement}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-3">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}

        {/* Detail Modal */}
        <AnnouncementDetailModal
          announcement={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
        />
      </div>
    </StudentLayout>
  );
};

export default Announcements;
