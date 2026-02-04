import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, DollarSign, Clock, GraduationCap, Building, Briefcase, RotateCcw, Sparkles, Eye, Mail, Download, Github, ExternalLink, User, Award, Calendar, ChevronDown, Code } from 'lucide-react';
import RoleSidebar from '../../components/common/RoleSidebar';
import RoleHeader from '../../components/common/RoleHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import candidateService, { 
  CandidateSearchFilters, 
  Candidate, 
  CandidateSearchResult, 
  FilterOptions 
} from '@/services/candidateService';

interface CandidateFilters {
  skills: string;
  experienceFrom: number;
  experienceTo: number;
  location: string;
  ctcFrom: number;
  ctcTo: number;
  noticePeriod: string[];
  education: string;
  domain: string;
  employmentType: string[];
  companyType: string;
  activeInDays: string;
}

const Candidates = () => {
  const DEFAULT_PAGE_SIZE = 1;
  const [filters, setFilters] = useState<CandidateFilters>({
    skills: '',
    experienceFrom: 0,
    experienceTo: 20,
    location: '',
    ctcFrom: 0,
    ctcTo: 200,  
    noticePeriod: [],
    education: '',
    domain: '',
    employmentType: [],
    companyType: 'any',
    activeInDays: ''
  });

  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CandidateSearchResult | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    loadFilterOptions();
    testBasicConnectivity();
  }, []);

  const testBasicConnectivity = async () => {
    try {
      console.log('Testing basic API connectivity...');
      
      const apiBaseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL;
      console.log('API Base URL:', apiBaseUrl);
      
      if (!apiBaseUrl) {
        throw new Error('VITE_BACKEND_API_BASE_URL is not configured');
      }
      
      console.log('Testing health endpoint...');
      const healthResult = await candidateService.healthCheck();
      console.log('Health check successful:', healthResult);
      
      const testResult = await candidateService.searchCandidates({ page: 1, page_size: DEFAULT_PAGE_SIZE });
      console.log('Basic connectivity test successful:', testResult);
    } catch (error: any) {
      console.error('Basic connectivity test failed:', error);
      
      let errorMsg = 'Unknown error';
      if (error?.message?.includes('VITE_BACKEND_API_BASE_URL')) {
        errorMsg = 'API URL not configured. Check environment variables.';
      } else if (error?.message?.includes('NetworkError') || error?.message?.includes('fetch')) {
        errorMsg = 'Cannot connect to backend server. Is it running?';
      } else if (error?.response?.status === 403) {
        errorMsg = 'Permission denied. Please login with a recruiter account.';
      } else if (error?.response?.status === 404) {
        errorMsg = 'API endpoint not found. Check backend configuration.';
      } else if (error?.response?.status >= 500) {
        errorMsg = 'Backend server error. Check server logs.';
      } else {
        errorMsg = error?.message || error?.response?.data?.error || 'Connection failed';
      }
      
      console.error('Connection error:', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      console.log('Loading filter options...');
      const options = await candidateService.getFilterOptions();
      console.log('Filter options loaded:', options);
      setFilterOptions(options);
    } catch (error: any) {
      console.error('Failed to load filter options:', error);
      console.error('Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data
      });
      toast.error('Failed to load filter options. Check console for details.');
    }
  };

  const handleSearch = async (page = 1) => {
    setIsSearching(true);
    try {
      const searchFilters: CandidateSearchFilters = {
        skills: filters.skills || undefined,
        experience_from: filters.experienceFrom || undefined,
        experience_to: filters.experienceTo || undefined,
        location: filters.location || undefined,
        ctc_from: filters.ctcFrom || undefined,
        ctc_to: filters.ctcTo || undefined,
        notice_period: filters.noticePeriod.length > 0 ? filters.noticePeriod : undefined,
        education: filters.education || undefined,
        domain: filters.domain || undefined,
        employment_type: filters.employmentType.length > 0 ? filters.employmentType : undefined,
        company_type: filters.companyType && filters.companyType !== 'any' ? filters.companyType : undefined,
        active_in_days: filters.activeInDays ? parseInt(filters.activeInDays) : undefined,
        page,
        page_size: DEFAULT_PAGE_SIZE
      };

      console.log('Sending search request with filters:', searchFilters);
      
      const results = await candidateService.searchCandidates(searchFilters);
      console.log('Search results received:', results);
      
      setSearchResults(results);
      setCurrentPage(page);
      
      if (results.total_count === 0) {
        toast.info('No candidates found matching your criteria. Try adjusting your filters.');
      } else {
        toast.success(`Found ${results.total_count} candidates`);
      }
    } catch (error: any) {
      console.error('Search failed:', error);
      console.error('Error response:', (error as any)?.response);
      console.error('Error data:', (error as any)?.response?.data);
      
      let errorMessage = 'Search failed. Please try again.';
      
      if (error?.response?.status === 403) {
        errorMessage = 'Permission denied. Please ensure you have recruiter access.';
      } else if (error?.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setFilters({
      skills: '',
      experienceFrom: 0,
      experienceTo: 20,
      location: '',
      ctcFrom: 0,
      ctcTo: 200,  
      noticePeriod: [],
      education: '',
      domain: '',
      employmentType: [],
      companyType: 'any',
      activeInDays: ''
    });
    // Clear search results to provide immediate visual feedback
    setSearchResults(null);
    setCurrentPage(1);
  };

  const toggleArrayFilter = (key: keyof Pick<CandidateFilters, 'noticePeriod' | 'employmentType'>, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value) 
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
  };

  const handleViewDetails = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedCandidate(null);
  };

  const handleDownloadResumeFromCard = (candidate: Candidate) => {
    if (candidate.resume_file) {
      try {
        window.open(candidate.resume_file, '_blank');
        toast.success('Opening resume in new tab...');
      } catch (error) {
        toast.error('Failed to open resume. Please try again.');
      }
    } else {
      toast.info('Resume not available for this candidate');
    }
  };

  const headerActions = (
    <>
      <Button
        onClick={() => handleSearch()}
        disabled={isSearching}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
      >
        {isSearching ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Searching...</span>
          </>
        ) : (
          <>
            <Search className="h-4 w-4" />
            <span>Search Candidates</span>
          </>
        )}
      </Button>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
       <RoleSidebar />

        <div className="flex-1">
          <RoleHeader
            title="Candidate Search Dashboard"
            subtitle="Find and connect with the best candidates for your positions"
            actions={headerActions}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800">Initializing candidate search system...</span>
              </div>
            </div>
          )}
          
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSearch();
            }}
            className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                  <Filter className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Search Filters</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 to-purple-200"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    <Label className="text-sm font-semibold text-gray-700">Skills & Keywords</Label>
                  </div>
                  <Input
                    placeholder="Enter a skill (e.g., Java, React, Python)"
                    value={filters.skills}
                    onChange={(e) => setFilters(prev => ({ ...prev, skills: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-purple-500" />
                    <Label className="text-sm font-semibold text-gray-700">Experience (Years)</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">From:</Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={filters.experienceFrom}
                        onChange={(e) => setFilters(prev => ({ ...prev, experienceFrom: parseInt(e.target.value) || 0 }))}
                        className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">To:</Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={filters.experienceTo}
                        onChange={(e) => setFilters(prev => ({ ...prev, experienceTo: parseInt(e.target.value) || 20 }))}
                        className="border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-pink-500" />
                    <Label className="text-sm font-semibold text-gray-700">Location</Label>
                  </div>
                  <Input
                    placeholder="Enter location"
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    className="border-gray-200 focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <Label className="text-sm font-semibold text-gray-700">CTC Range (LPA)</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">From:</Label>
                      <Input
                        type="number"
                        min="0"
                        value={filters.ctcFrom}
                        onChange={(e) => setFilters(prev => ({ ...prev, ctcFrom: parseInt(e.target.value) || 0 }))}
                        className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">To:</Label>
                      <Input
                        type="number"
                        min="0"
                        value={filters.ctcTo}
                        onChange={(e) => setFilters(prev => ({ ...prev, ctcTo: parseInt(e.target.value) || 100 }))}
                        className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <Label className="text-sm font-semibold text-gray-700">Notice Period</Label>
                  </div>
                  <div className="space-y-2">
                    {filterOptions?.notice_periods.map((period) => (
                      <div key={period.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={period.value}
                          checked={filters.noticePeriod.includes(period.value)}
                          onCheckedChange={() => toggleArrayFilter('noticePeriod', period.value)}
                          className="border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                        />
                        <Label htmlFor={period.value} className="text-sm text-gray-600 cursor-pointer">
                          {period.label}
                        </Label>
                      </div>
                    )) || (
                      [
                        { value: 'immediate', label: 'Immediate' },
                        { value: '15_days', label: '15 Days' },
                        { value: '30_days', label: '30 Days' },
                        { value: '60_days', label: '60 Days' },
                        { value: '90_days', label: '90 Days' }
                      ].map((period) => (
                        <div key={period.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={period.value}
                            checked={filters.noticePeriod.includes(period.value)}
                            onCheckedChange={() => toggleArrayFilter('noticePeriod', period.value)}
                            className="border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                          />
                          <Label htmlFor={period.value} className="text-sm text-gray-600 cursor-pointer">
                            {period.label}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-500" />
                    <Label className="text-sm font-semibold text-gray-700">Education</Label>
                  </div>
                  <Select value={filters.education} onValueChange={(value) => setFilters(prev => ({ ...prev, education: value }))}>
                    <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions?.education_levels.map((edu) => (
                        <SelectItem key={edu.value} value={edu.value}>{edu.label}</SelectItem>
                      )) || (
                        <>
                          <SelectItem value="high_school">High School</SelectItem>
                          <SelectItem value="diploma">Diploma</SelectItem>
                          <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                          <SelectItem value="master">Master's Degree</SelectItem>
                          <SelectItem value="phd">PhD</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-teal-500" />
                    <Label className="text-sm font-semibold text-gray-700">Domain</Label>
                  </div>
                  <Select value={filters.domain} onValueChange={(value) => setFilters(prev => ({ ...prev, domain: value }))}>
                    <SelectTrigger className="border-gray-200 focus:border-teal-500 focus:ring-teal-500">
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-violet-500" />
                    <Label className="text-sm font-semibold text-gray-700">Employment Type</Label>
                  </div>
                  <div className="space-y-2">
                    {[
                      { value: 'full_time', label: 'Full-Time' },
                      { value: 'part_time', label: 'Part-Time' },
                      { value: 'contract', label: 'Contract' },
                      { value: 'internship', label: 'Internship' },
                      { value: 'remote', label: 'Remote' }
                    ].map((type) => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={type.value}
                          checked={filters.employmentType.includes(type.value)}
                          onCheckedChange={() => toggleArrayFilter('employmentType', type.value)}
                          className="border-violet-300 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                        />
                        <Label htmlFor={type.value} className="text-sm text-gray-600 cursor-pointer">
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-rose-500" />
                    <Label className="text-sm font-semibold text-gray-700">Company Type</Label>
                  </div>
                  <Select value={filters.companyType} onValueChange={(value) => setFilters(prev => ({ ...prev, companyType: value }))}>
                    <SelectTrigger className="border-gray-200 focus:border-rose-500 focus:ring-rose-500">
                      <SelectValue placeholder="Select company type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="startup">Startup</SelectItem>
                      <SelectItem value="mid_size">Mid-size Company</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="non_profit">Non-profit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <Label className="text-sm font-semibold text-gray-700">Active in Last (Days)</Label>
                  </div>
                  <Select value={filters.activeInDays} onValueChange={(value) => setFilters(prev => ({ ...prev, activeInDays: value }))}>
                    <SelectTrigger className="border-gray-200 focus:border-amber-500 focus:ring-amber-500">
                      <SelectValue placeholder="Select activity period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="180">Last 6 months</SelectItem>
                      <SelectItem value="365">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-center gap-4">                  
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Searching all candidates...');
                      handleReset(); // Reset filters first
                      setTimeout(() => handleSearch(), 100); 
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Search All
                  </Button>

                  <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Resetting filters...');
                    handleReset(); // Reset filters first
                    setTimeout(() => handleSearch(), 100); // Then search with reset filters
                  }}
                  variant="outline"
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset Filters</span>
                </Button>
                  
                </div>
              </div>
            </div>
          </form>

          {searchResults && (
            <div className="mt-8 space-y-6">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Search Results</h3>
                    <p className="text-gray-600">
                      Found {searchResults.total_count} candidates • Page {searchResults.page} of {searchResults.total_pages}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSearch(currentPage - 1);
                      }}
                      disabled={!searchResults.has_previous || isSearching}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSearch(currentPage + 1);
                      }}
                      disabled={!searchResults.has_next || isSearching}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {searchResults.candidates.map((candidate) => (
                  <CandidateCard 
                    key={candidate.id} 
                    candidate={candidate} 
                    onViewDetails={handleViewDetails}
                    onDownloadResume={handleDownloadResumeFromCard}
                  />
                ))}
              </div>

              {searchResults.total_pages > 1 && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                  <div className="flex items-center justify-center gap-2">
                    {Array.from({ length: Math.min(5, searchResults.total_pages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSearch(pageNum);
                          }}
                          disabled={isSearching}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {isSearching && !searchResults && (
            <div className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-100 p-12">
              <div className="text-center">
                <div className="animate-pulse">
                  <div className="w-16 h-16 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      <Dialog open={isDetailsModalOpen} onOpenChange={handleCloseDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              {selectedCandidate?.full_name || selectedCandidate?.profile?.full_name || 'Candidate Profile'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCandidate && (
            <CandidateDetailsModal candidate={selectedCandidate} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CandidateCard = ({ candidate, onViewDetails, onDownloadResume }: { 
  candidate: Candidate; 
  onViewDetails: (candidate: Candidate) => void;
  onDownloadResume: (candidate: Candidate) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getExperienceText = (years: number, months: number) => {
    if (years === 0 && months === 0) return 'Fresher';
    if (years === 0) return `${months} months`;
    if (months === 0) return `${years} year${years > 1 ? 's' : ''}`;
    return `${years}.${Math.round(months / 12 * 10)} years`;
  };

  const getNoticePeriodText = (period: string) => {
    const periodMap: Record<string, string> = {
      'immediate': 'Immediate',
      '15_days': '15 Days',
      '30_days': '30 Days',
      '60_days': '60 Days',
      '90_days': '90 Days'
    };
    return periodMap[period] || period;
  };

  const candidateName = candidate.full_name || 
                       candidate.profile?.full_name || 
                       `${candidate.user?.first_name || ''} ${candidate.user?.last_name || ''}`.trim() || 
                       candidate.user?.username || 'Unknown';

  return (
    <Card className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-gray-50">
      {/* Header Section */}
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-2xl shadow-lg">
            {candidateName.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <div>
                <CardTitle className="text-xl text-gray-900 mb-1">{candidateName}</CardTitle>
                <p className="text-gray-600 font-medium text-base mb-2">
                  {candidate.title || candidate.profile?.title || 'Software Developer'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  {candidate.is_actively_looking && (
                    <Badge variant="default" className="text-xs bg-green-500 text-white">
                    Active
                    </Badge>
                  )}
                  {candidate.open_to_remote && (
                    <Badge variant="secondary" className="text-xs">
                      Remote OK
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => onViewDetails(candidate)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  <Button
                    onClick={() => onDownloadResume(candidate)}
                    size="sm"
                    variant="outline"
                    className={candidate.resume_file 
                      ? "border-blue-200 text-blue-600 hover:bg-blue-50 text-xs px-2 py-1" 
                      : "border-gray-200 text-gray-400 cursor-not-allowed text-xs px-2 py-1"
                    }
                    disabled={!candidate.resume_file}
                    title={candidate.resume_file ? "Download Resume" : "Resume not available"}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {(candidate.location || candidate.profile?.location) && (
                <div className="flex items-center gap-1 bg-blue-50 p-2 rounded">
                  <MapPin className="h-3 w-3 text-blue-600" />
                  <span className="truncate text-blue-800">{candidate.location || candidate.profile?.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1 bg-purple-50 p-2 rounded">
                <Briefcase className="h-3 w-3 text-purple-600" />
                <span className="text-purple-800">{getExperienceText(candidate.total_experience_years, candidate.total_experience_months)}</span>
              </div>
              {candidate.expected_ctc && (
                <div className="flex items-center gap-1 bg-green-50 p-2 rounded">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <span className="text-green-700 font-medium">{candidate.currency} {candidate.expected_ctc} LPA</span>
                </div>
              )}
              <div className="flex items-center gap-1 bg-orange-50 p-2 rounded">
                <Clock className="h-3 w-3 text-orange-600" />
                <span className="text-orange-800">{getNoticePeriodText(candidate.notice_period)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {candidate.skills_list && candidate.skills_list.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
              <Award className="h-4 w-4 text-indigo-500" />
              Core Skills
            </h4>
            <div className="flex flex-wrap gap-1">
              {candidate.skills_list.slice(0, isExpanded ? candidate.skills_list.length : 8).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors">
                  {skill}
                </Badge>
              ))}
              {candidate.skills_list.length > 8 && !isExpanded && (
                <Badge 
                  variant="outline" 
                  className="text-xs cursor-pointer hover:bg-indigo-50" 
                  onClick={() => setIsExpanded(true)}
                >
                  +{candidate.skills_list.length - 8} more
                </Badge>
              )}
            </div>
          </div>
        )}

       
      </CardContent>
    </Card>
  );
};

const CandidateDetailsModal = ({ candidate }: { candidate: Candidate }) => {
  const candidateName = candidate.full_name || 
                       `${candidate.user?.first_name || ''} ${candidate.user?.last_name || ''}`.trim() || 
                       candidate.user?.username || 'Unknown';

  const getExperienceText = (years: number, months: number) => {
    if (years === 0 && months === 0) return 'Fresher';
    if (years === 0) return `${months} months`;
    if (months === 0) return `${years} year${years > 1 ? 's' : ''}`;
    return `${years}.${Math.round(months / 12 * 10)} years`;
  };

  const getNoticePeriodText = (period: string) => {
    const periodMap: Record<string, string> = {
      'immediate': 'Immediate',
      '15_days': '15 Days',
      '30_days': '30 Days',
      '60_days': '60 Days',
      '90_days': '90 Days'
    };
    return periodMap[period] || period;
  };

  const handleDownloadResume = () => {
    if (candidate.resume_file) {
      try {
        window.open(candidate.resume_file, '_blank');
        toast.success('Opening resume in new tab...');
      } catch (error) {
        toast.error('Failed to open resume. Please try again.');
      }
    } else {
      toast.info('Resume not available for this candidate');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-3xl shadow-lg">
            {candidateName.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{candidateName}</h2>
            <p className="text-lg text-gray-600 font-medium mb-3">
              {candidate.title || candidate.profile?.title || 'Software Developer'}
            </p>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {(candidate.location || candidate.profile?.location) && (
                <div className="flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="text-gray-700">{candidate.location || candidate.profile?.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm">
                <Briefcase className="h-4 w-4 text-purple-600" />
                <span className="text-gray-700">{getExperienceText(candidate.total_experience_years, candidate.total_experience_months)}</span>
              </div>
              {candidate.expected_ctc && (
                <div className="flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700 font-medium">{candidate.currency} {candidate.expected_ctc} LPA</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-gray-700">{getNoticePeriodText(candidate.notice_period)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <div className="flex gap-2">
                {candidate.is_actively_looking && (
                  <Badge className="bg-green-500 text-white">
                     Actively Looking
                  </Badge>
                )}
                {candidate.open_to_remote && (
                  <Badge variant="secondary">
                     Open to Remote
                  </Badge>
                )}
              </div>
              
              <Button
                onClick={handleDownloadResume}
                className={candidate.resume_file 
                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                  : "bg-gray-400 hover:bg-gray-500 text-white cursor-not-allowed"
                }
                size="sm"
                disabled={!candidate.resume_file}
              >
                <Download className="h-4 w-4 mr-2" />
                {candidate.resume_file ? 'Download Resume' : 'Resume Not Available'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {candidate.user && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" />
                Contact Information
              </CardTitle>
              
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="text-gray-700">{candidate.user.email}</span>
            </div>
            {(candidate.location || candidate.profile?.location) && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">{candidate.location || candidate.profile?.location}</span>
              </div>
            )}
            
            {candidate.profile?.links && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-600 mb-2">Social Links</p>
                <div className="flex flex-wrap gap-3">
                  {candidate.profile.links.github && (
                    <a 
                      href={candidate.profile.links.github} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </a>
                  )}
                  {candidate.profile.links.linkedin && (
                    <a 
                      href={candidate.profile.links.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <User className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}
                  {candidate.profile.links.portfolio && (
                    <a 
                      href={candidate.profile.links.portfolio} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Portfolio
                    </a>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(candidate.about || candidate.profile?.about) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed">{candidate.about || candidate.profile?.about}</p>
          </CardContent>
        </Card>
      )}

      {candidate.skills_list && candidate.skills_list.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-500" />
              Core Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {candidate.skills_list.map((skill, index) => (
                <Badge key={index} variant="secondary" className="bg-indigo-100 text-indigo-800">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {candidate.job_skills && candidate.job_skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-purple-500" />
              Technical Expertise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidate.job_skills.map((skill, index) => (
                <div key={index} className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-purple-900">{skill.skill_name}</span>
                    <Badge variant="outline" className="text-purple-700 border-purple-300">
                      {skill.proficiency}
                    </Badge>
                  </div>
                  <p className="text-sm text-purple-600">
                    {skill.years_of_experience} year{skill.years_of_experience !== 1 ? 's' : ''} experience
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {candidate.profile?.experiences && candidate.profile.experiences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-green-500" />
              Work Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {candidate.profile.experiences.map((exp, index) => (
              <div key={index} className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-green-900 text-lg">{exp.role}</h3>
                    <p className="text-green-700 font-medium">{exp.company}</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {exp.duration}
                  </Badge>
                </div>
                {exp.description_list && exp.description_list.length > 0 && (
                  <ul className="text-green-800 mb-4 list-disc list-inside space-y-1">
                    {exp.description_list.map((desc, i) => (
                      <li key={i}>{desc}</li>
                    ))}
                  </ul>
                )}
                {exp.technologies && exp.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {exp.technologies.map((tech, i) => (
                      <Badge key={i} variant="outline" className="text-green-700 border-green-300">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {candidate.profile?.projects && candidate.profile.projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-500" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {candidate.profile.projects.map((project, index) => (
              <div key={index} className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
                <div className="mb-3">
                  <h3 className="font-semibold text-blue-900 text-lg">{project.title}</h3>
                  <p className="text-blue-700 font-medium">{project.role}</p>
                </div>
                <p className="text-blue-800 mb-4 leading-relaxed">{project.description}</p>
                {project.tech_stack && project.tech_stack.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tech_stack.map((tech, i) => (
                      <Badge key={i} variant="outline" className="text-blue-700 border-blue-300">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                )}
                {(project.github_link || project.live_link) && (
                  <div className="flex gap-3">
                    {project.github_link && (
                      <a 
                        href={project.github_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Github className="h-4 w-4" />
                        GitHub
                      </a>
                    )}
                    {project.live_link && (
                      <a 
                        href={project.live_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Live Demo
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {candidate.profile?.education && candidate.profile.education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-500" />
              Education
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {candidate.profile.education.map((edu, index) => (
              <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900">{edu.degree}</h3>
                <p className="text-blue-700">{edu.field}</p>
                <p className="text-blue-600 text-sm">{edu.institution}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-blue-600 text-sm">{edu.duration}</span>
                  {edu.cgpa && (
                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                      CGPA: {edu.cgpa}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {candidate.profile?.certifications && candidate.profile.certifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Certifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {candidate.profile.certifications.map((cert, index) => (
              <div key={index} className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-900">{cert.name}</h3>
                <p className="text-yellow-700">{cert.issuer}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-yellow-600 text-sm">{cert.completion_date}</span>
                  {cert.certificate_file && (
                    <a 
                      href={cert.certificate_file} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-yellow-600 hover:text-yellow-800 text-sm"
                    >
                      <Download className="h-4 w-4" />
                      Certificate
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-gray-500" />
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidate.current_ctc && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-sm text-gray-600">Current CTC</span>
                <p className="font-medium text-gray-900">{candidate.currency} {candidate.current_ctc} LPA</p>
              </div>
            )}
            {candidate.domain && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-sm text-gray-600">Domain</span>
                <p className="font-medium text-gray-900">{candidate.domain}</p>
              </div>
            )}
            {candidate.highest_education && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-sm text-gray-600">Highest Education</span>
                <p className="font-medium text-gray-900">{candidate.highest_education}</p>
              </div>
            )}
            {candidate.preferred_locations && candidate.preferred_locations.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-sm text-gray-600">Preferred Locations</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {candidate.preferred_locations.map((location, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {location}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {candidate.preferred_employment_types && candidate.preferred_employment_types.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-sm text-gray-600">Preferred Employment Types</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {candidate.preferred_employment_types.map((type, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {type.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {candidate.preferred_company_types && candidate.preferred_company_types.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-sm text-gray-600">Preferred Company Types</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {candidate.preferred_company_types.map((type, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {type.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Candidates;