import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Search, X, Save } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface FilterState {
  search: string;
  location: string[];
  experienceLevel: string[];
  jobType: string[];
  salaryRange: number[];
  skills: string[];
  companySize: string[];
  postedDate: string[];
}

interface JobFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  location: [],
  experienceLevel: [],
  jobType: [],
  salaryRange: [0, 30],
  skills: [],
  companySize: [],
  postedDate: [],
};

const JobFilters: React.FC<JobFiltersProps> = ({ onFilterChange, initialFilters }) => {
  const [filters, setFilters] = useState<FilterState>(initialFilters ?? DEFAULT_FILTERS);
  const [savedFilters, setSavedFilters] = useState<FilterState[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const onSubmit = (e: Event) => {
      try {
        const container = containerRef.current;
        if (!container) return;
        const target = e.target as HTMLElement | null;
        const submitter = (e as any).submitter as HTMLElement | null;
        if (target && container.contains(target)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          console.info('Prevented form submit originating from JobFilters');
        }
        if (submitter && container.contains(submitter)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          console.info('Prevented form submit from a control inside JobFilters');
        }
      } catch (err) {
        // ignore
      }
    };

  document.addEventListener('submit', onSubmit, true);
  const onClickCapture = (e: MouseEvent) => {
      try {
        const container = containerRef.current;
        if (!container) return;
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const btn = target.closest && (target.closest('button') as HTMLButtonElement | null);
        if (btn && container.contains(btn)) {
          const t = btn.getAttribute('type');
          if (!t || t.toLowerCase() === 'submit') {
            e.preventDefault();
            e.stopImmediatePropagation();
            console.info('Prevented implicit submit from button inside JobFilters');
          }
        }
      } catch (err) {
        // ignore
      }
    };

    document.addEventListener('click', onClickCapture, true);
    return () => {
      try {
        document.removeEventListener('submit', onSubmit, true);
      } catch (err) {
        // ignore
      }
      try {
        document.removeEventListener('click', onClickCapture, true);
      } catch (err) {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current && initialFilters) {
      setFilters(initialFilters);
      mountedRef.current = true;
    }
  }, [initialFilters]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('yc_jobs_saved_filters_v1');
      if (raw) setSavedFilters(JSON.parse(raw));
    } catch (err) {
      // ignore
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => onFilterChange(filters), 180);
    return () => clearTimeout(t);
  }, [filters]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    console.debug('JobFilters.updateFilter', key, value);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value) ? currentArray.filter((v) => v !== value) : [...currentArray, value];
    console.debug('JobFilters.toggleArrayFilter', key, value, newArray);
    console.log(`[JobFilters] Toggling ${key}: ${value} -> ${newArray.length} items`);
    updateFilter(key, newArray);
  };

  const clearAllFilters = () => {
    console.debug('JobFilters.clearAllFilters');
    setFilters(DEFAULT_FILTERS);
    try {
      onFilterChange(DEFAULT_FILTERS);
    } catch (err) {
      // ignore
    }
  };

  const handleSaveFilters = () => {
    console.debug('JobFilters.handleSaveFilters', filters);
    setSavedFilters((s) => {
      const next = [...s, filters];
      try {
        localStorage.setItem('yc_jobs_saved_filters_v1', JSON.stringify(next));
      } catch (err) {
        // ignore
      }
      return next;
    });
  };

  const handleLoadSavedFilter = (f: FilterState) => {
    console.debug('JobFilters.handleLoadSavedFilter', f);
    setFilters(f);
    try {
      onFilterChange(f);
    } catch (err) {
      // ignore
    }
  };

  const handleRemoveSavedFilter = (index: number) => {
    setSavedFilters((s) => {
      const next = s.filter((_, i) => i !== index);
      try {
        localStorage.setItem('yc_jobs_saved_filters_v1', JSON.stringify(next));
      } catch (err) {
        // ignore
      }
      return next;
    });
  };

  const locationOptions = ['Remote', 'Hybrid', 'Onsite'];
  const experienceOptions = ['Fresher', '0-2 yrs', '2-5 yrs'];
  const jobTypeOptions = ['Full-time', 'Internship', 'Contract'];
  const skillOptions = ['React', 'Node.js', 'Python', 'Java', 'TypeScript', 'MongoDB', 'Spring Boot', 'Tailwind CSS'];
  const companySizeOptions = ['1-10', '10-50', '50-100', '100-500', '500+'];
  const postedDateOptions = ['Last 24 hours', 'Last 7 days', 'Last 30 days'];

  return (
    <div ref={containerRef} className="p-4 space-y-4">
      <div className="relative space-y-2">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, skill, or company..."
          value={filters.search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter('search', e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className="pl-9"
        />
      </div>

      {(filters.location.length || filters.experienceLevel.length || filters.skills.length) > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
          {[...filters.location, ...filters.experienceLevel, ...filters.skills].map((filter) => (
            <Badge key={filter} variant="secondary" className="gap-1">
              {filter}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  if (filters.location.includes(filter)) toggleArrayFilter('location', filter);
                  if (filters.experienceLevel.includes(filter)) toggleArrayFilter('experienceLevel', filter);
                  if (filters.skills.includes(filter)) toggleArrayFilter('skills', filter);
                }}
              />
            </Badge>
          ))}
        </div>
      )}

      <Collapsible defaultOpen>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center justify-between w-full">
            <Label className="text-sm font-semibold">Location</Label>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {locationOptions.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox id={`location-${option}`} checked={filters.location.includes(option)} onCheckedChange={() => toggleArrayFilter('location', option)} />
              <label htmlFor={`location-${option}`} className="text-sm cursor-pointer">{option}</label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible defaultOpen>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center justify-between w-full">
            <Label className="text-sm font-semibold">Experience Level</Label>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {experienceOptions.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox id={`exp-${option}`} checked={filters.experienceLevel.includes(option)} onCheckedChange={() => toggleArrayFilter('experienceLevel', option)} />
              <label htmlFor={`exp-${option}`} className="text-sm cursor-pointer">{option}</label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible defaultOpen>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center justify-between w-full">
            <Label className="text-sm font-semibold">Job Type</Label>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {jobTypeOptions.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox id={`type-${option}`} checked={filters.jobType.includes(option)} onCheckedChange={() => toggleArrayFilter('jobType', option)} />
              <label htmlFor={`type-${option}`} className="text-sm cursor-pointer">{option}</label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center justify-between w-full">
            <Label className="text-sm font-semibold">Salary Range</Label>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 mt-3">
          <Slider value={filters.salaryRange} onValueChange={(value: number[]) => updateFilter('salaryRange', value)} max={30} step={1} className="w-full" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>₹{filters.salaryRange[0]} LPA</span>
            <span>₹{filters.salaryRange[1]} LPA</span>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center justify-between w-full">
            <Label className="text-sm font-semibold">Tech Stack</Label>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {skillOptions.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox id={`skill-${option}`} checked={filters.skills.includes(option)} onCheckedChange={() => toggleArrayFilter('skills', option)} />
              <label htmlFor={`skill-${option}`} className="text-sm cursor-pointer">{option}</label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center justify-between w-full">
            <Label className="text-sm font-semibold">Company Size</Label>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {companySizeOptions.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox id={`size-${option}`} checked={filters.companySize.includes(option)} onCheckedChange={() => toggleArrayFilter('companySize', option)} />
              <label htmlFor={`size-${option}`} className="text-sm cursor-pointer">{option} employees</label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center justify-between w-full">
            <Label className="text-sm font-semibold">Posted Date</Label>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {postedDateOptions.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox id={`date-${option}`} checked={filters.postedDate.includes(option)} onCheckedChange={() => toggleArrayFilter('postedDate', option)} />
              <label htmlFor={`date-${option}`} className="text-sm cursor-pointer">{option}</label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-2 pt-4 border-t border-border">
        <Button type="button" variant="outline" className="w-full gap-2" size="sm" onClick={handleSaveFilters}>
          <Save className="h-4 w-4" /> Save Filters
        </Button>

        {savedFilters.length > 0 && (
          <div className="space-y-2 mt-3">
            <Label className="text-xs text-muted-foreground">Saved Filters</Label>
            {savedFilters.map((savedFilter, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-md bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <button type="button" onClick={() => handleLoadSavedFilter(savedFilter)} className="flex-1 text-left text-sm">
                  Filter {index + 1}
                  {savedFilter.skills.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">({savedFilter.skills.slice(0, 2).join(', ')})</span>
                  )}
                </button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveSavedFilter(index)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button type="button" variant="ghost" className="w-full" size="sm" onClick={clearAllFilters}>
          Clear All Filters
        </Button>
      </div>
    </div>
  );
};

export default JobFilters;
