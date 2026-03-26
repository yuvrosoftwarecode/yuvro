import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { CategoryFilter, PriorityFilter, SortOrder } from '@/hooks/useAnnouncements';

interface Props {
  categoryFilter: CategoryFilter;
  setCategoryFilter: (v: CategoryFilter) => void;
  priorityFilter: PriorityFilter;
  setPriorityFilter: (v: PriorityFilter) => void;
  sortOrder: SortOrder;
  setSortOrder: (v: SortOrder) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}

export function AnnouncementFilters({
  categoryFilter, setCategoryFilter,
  priorityFilter, setPriorityFilter,
  sortOrder, setSortOrder,
  searchQuery, setSearchQuery,
}: Props) {
  return (
    <div className="flex flex-col lg:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search announcements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Category */}
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="college">College Level</SelectItem>
            <SelectItem value="department">Department</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="important">Important</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
