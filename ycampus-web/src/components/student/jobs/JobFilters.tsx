import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Building2 } from 'lucide-react';

interface JobFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  locationFilter: string;
  onLocationChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
}

export const JobFilters: React.FC<JobFiltersProps> = ({
  searchQuery,
  onSearchChange,
  locationFilter,
  onLocationChange,
  typeFilter,
  onTypeChange,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-3 items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by company or role..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10 border-muted/20 shadow-sm focus-visible:ring-primary/20"
        />
      </div>
      
      <div className="w-full md:w-48">
        <Select value={locationFilter} onValueChange={onLocationChange}>
          <SelectTrigger className="h-10 border-gray-200">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="Mumbai">Mumbai</SelectItem>
            <SelectItem value="Bangalore">Bangalore</SelectItem>
            <SelectItem value="Remote">Remote</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-48">
        <Select value={locationFilter} onValueChange={onLocationChange}>
          <SelectTrigger className="h-10 border-muted/20 shadow-sm">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="bangalore">Bangalore</SelectItem>
            <SelectItem value="mumbai">Mumbai</SelectItem>
            <SelectItem value="chennai">Chennai</SelectItem>
            <SelectItem value="hyderabad">Hyderabad</SelectItem>
            <SelectItem value="remote">Remote</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full md:w-48">
        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger className="h-10 border-muted/20 shadow-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Product">Product</SelectItem>
            <SelectItem value="Service">Service</SelectItem>
            <SelectItem value="Startup">Startup</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
