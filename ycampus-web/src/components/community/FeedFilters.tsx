import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeedFilter } from '@/hooks/useCommunity';

interface FeedFiltersProps {
  activeFilter: FeedFilter;
  onFilterChange: (filter: FeedFilter) => void;
}

const filters: { value: FeedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'department', label: 'My Department' },
  { value: 'batch', label: 'My Batch' },
  { value: 'saved', label: 'Saved' },
];

export function FeedFilters({ activeFilter, onFilterChange }: FeedFiltersProps) {
  return (
    <Tabs value={activeFilter} onValueChange={(v) => onFilterChange(v as FeedFilter)}>
      <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 overflow-x-auto">
        {filters.map((filter) => (
          <TabsTrigger
            key={filter.value}
            value={filter.value}
            className="text-sm px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            {filter.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
