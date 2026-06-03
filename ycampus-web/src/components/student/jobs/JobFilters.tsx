import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface JobFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  locationFilter: string;
  onLocationChange: (val: string) => void;
  typeFilter: string;
  onTypeChange: (val: string) => void;
}

export function JobFilters({ searchQuery, onSearchChange, locationFilter, onLocationChange, typeFilter, onTypeChange }: JobFiltersProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by company or role..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="flex items-center gap-3">
        <Select value={locationFilter} onValueChange={onLocationChange}>
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          <SelectItem value="mumbai">Mumbai</SelectItem>
          <SelectItem value="bangalore">Bangalore</SelectItem>
          <SelectItem value="chennai">Chennai</SelectItem>
          <SelectItem value="hyderabad">Hyderabad</SelectItem>
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="Product">Product</SelectItem>
          <SelectItem value="Service">Service</SelectItem>
          <SelectItem value="MNC">MNC</SelectItem>
          <SelectItem value="IT Service & Consulting">IT Service & Consulting</SelectItem>
        </SelectContent>
      </Select>
      </div>
    </div>
  );
}
