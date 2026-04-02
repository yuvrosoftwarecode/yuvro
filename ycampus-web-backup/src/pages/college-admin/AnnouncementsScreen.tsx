import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleSidebar from '@/components/common/RoleSidebar';
import PageHeader from '@/components/common/PageHeader';
import announcementService, { Announcement, AnnouncementFilters } from '@/services/announcementService';
import departmentService, { Department } from '@/services/departmentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse, isValid } from 'date-fns';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnnouncementsList } from '@/components/college-admin/announcements/AnnouncementsList';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar as CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  Building2,
  Paperclip,
  User,
  Download,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const AnnouncementsScreen: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterSort, setFilterSort] = useState<string>('-created_at');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [viewAnnouncement, setViewAnnouncement] = useState<Announcement | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    level: '' as 'college' | 'department' | '',
    priority: '' as 'normal' | 'important' | 'urgent' | '',
    is_active: true,
    department: '',
    expiry_date: '',
  });

  const collegeId = (user as any)?.college_id;
  const pageSize = 25;

  const getAttachmentUrl = (url: string | null | undefined) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    loadAnnouncements(1);
    
    if (collegeId) {
      loadDepartments();
    }
  }, [filterLevel, filterPriority, filterSort, collegeId]);

  const loadDepartments = async () => {
    try {
      const data = await departmentService.getDepartments(collegeId);
      setDepartments(data);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== '' || searchQuery === '') {
        loadAnnouncements(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadAnnouncements = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const params: AnnouncementFilters = {
        college: collegeId,
        page: page,
        search: searchQuery
      };
      if (filterLevel !== 'all') {
        params.level = filterLevel;
      }
      if (filterPriority !== 'all') {
        params.priority = filterPriority;
      }
      if (filterSort) {
        params.ordering = filterSort;
      }
      
      const data = await announcementService.getAnnouncements(params);
      
      // Handle different response structures
      let announcementsData: Announcement[] = [];
      let count = 0;
      
      if (Array.isArray(data)) {
        announcementsData = data;
        count = data.length;
      } else if (data && typeof data === 'object') {
        announcementsData = data.results || data.data || [];
        count = data.count || announcementsData.length;
      }
      
      setAnnouncements(announcementsData.map(ann => ({
        ...ann,
        attachment: getAttachmentUrl(ann.attachment)
      })));
      setTotalCount(count);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading announcements:', error);
      setAnnouncements([]);
      setTotalCount(0);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.title || !formData.content || !formData.level || !formData.priority) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (formData.level === 'department' && !formData.department) {
        toast.error('Please select at least one department');
        return;
      }

      let parsedExpiryDate = null;
      if (formData.expiry_date) {
        const parts = formData.expiry_date.split('-');
        if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
          // It's in DD-MM-YYYY format, save it as YYYY-MM-DD for the backend
          parsedExpiryDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          parsedExpiryDate = formData.expiry_date;
        }
      }

      const payloadFormData = new FormData();
      payloadFormData.append('title', formData.title);
      payloadFormData.append('content', formData.content);
      payloadFormData.append('level', formData.level);
      payloadFormData.append('priority', formData.priority);
      payloadFormData.append('is_active', formData.is_active.toString());
      payloadFormData.append('college', collegeId);
      payloadFormData.append('publish_date', new Date().toISOString());
      
      if (formData.level === 'department' && formData.department) {
        payloadFormData.append('department', formData.department);
      }
      
      if (parsedExpiryDate) {
        payloadFormData.append('expiry_date', parsedExpiryDate);
      }
      
      if (attachmentFile) {
        payloadFormData.append('attachment', attachmentFile);
      }

      if (editingAnnouncement) {
        await announcementService.updateAnnouncement(editingAnnouncement.id, payloadFormData);
        toast.success('Announcement updated successfully');
        loadAnnouncements(currentPage);
      } else {
        await announcementService.createAnnouncement(payloadFormData);
        toast.success('Announcement created successfully');
        loadAnnouncements(1);
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving announcement:', error);
      toast.error(error.response?.data?.detail || 'Failed to save announcement');
    }
  };

  const handleDelete = async (announcement: Announcement) => {
    if (!window.confirm(`Are you sure you want to delete "${announcement.title}"?`)) return;
    
    try {
      await announcementService.deleteAnnouncement(announcement.id);
      toast.success('Announcement deleted successfully');
      loadAnnouncements(currentPage);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    
    let formattedExpiryDate = '';
    if (announcement.expiry_date) {
      const datePart = announcement.expiry_date.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        // Convert YYYY-MM-DD to DD-MM-YYYY
        formattedExpiryDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    setFormData({
      title: announcement.title,
      content: announcement.content,
      level: announcement.level,
      priority: announcement.priority,
      is_active: announcement.is_active,
      department: announcement.department || '',
      expiry_date: formattedExpiryDate,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAnnouncement(null);
    setAttachmentFile(null);
    setFormData({
      title: '',
      content: '',
      level: '',
      priority: '',
      is_active: true,
      department: '',
      expiry_date: '',
    });
  };



  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <PageHeader
              title="Announcements"
              subtitle="Manage college and department level announcements"
            />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search announcements..."
                  className="pl-10 pr-10 border-gray-200 focus:border-slate-300 focus:ring-slate-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 relative">
                <Button
                  variant="outline"
                  className={`text-gray-600 border-gray-200 ${(filterLevel !== 'all' || filterPriority !== 'all' || filterSort !== '-created_at') ? 'bg-slate-50 border-slate-200 text-slate-900' : ''}`}
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {(filterLevel !== 'all' || filterPriority !== 'all' || filterSort !== '-created_at') ? 'Filtered' : 'Filter'}
                </Button>

                {isFilterMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-100 rounded-lg shadow-xl z-50 p-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Level</label>
                      <div className="flex flex-wrap gap-2">
                        {(['all', 'college', 'department'] as const).map((level) => (
                          <button
                            key={level}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filterLevel === level ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-gray-600 hover:bg-white border border-transparent'}`}
                            onClick={() => setFilterLevel(level)}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</label>
                      <div className="flex flex-wrap gap-2">
                        {(['all', 'normal', 'important', 'urgent'] as const).map((priority) => (
                          <button
                            key={priority}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filterPriority === priority ? 'bg-slate-100 text-slate-900 border border-slate-200' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
                            onClick={() => setFilterPriority(priority)}
                          >
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">View / Sort</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: '-created_at', label: 'Latest First' },
                          { value: 'created_at', label: 'Oldest First' }
                        ].map((sortOption) => (
                          <button
                            key={sortOption.value}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filterSort === sortOption.value ? 'bg-slate-100 text-slate-900 border border-slate-200' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
                            onClick={() => setFilterSort(sortOption.value)}
                          >
                            {sortOption.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-50 flex justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-gray-500 hover:text-gray-700"
                        onClick={() => {
                          setFilterLevel('all');
                          setFilterPriority('all');
                          setFilterSort('-created_at');
                        }}
                      >
                        Reset Filters
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-slate-900 hover:bg-slate-950 text-white"
                        onClick={() => setIsFilterMenuOpen(false)}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                )}
                <Button
                  className="bg-slate-900 hover:bg-slate-950 text-white shadow-sm"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Announcement
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
              </div>
            ) : announcements.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-100 shadow-none bg-transparent">
                <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Bell className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700">No announcements found</h3>
                  <p className="text-gray-400 text-sm max-w-sm mt-1">
                    {searchQuery ? "No announcements match your current search criteria." : "Start by adding your first announcement to the system."}
                  </p>
                  {!searchQuery && (
                    <Button
                      className="mt-6 bg-orange-600 hover:bg-orange-700"
                      onClick={() => setIsDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Announcement
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                <AnnouncementsList 
                  announcements={announcements} 
                  onView={(ann) => setViewAnnouncement(ann)} 
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <Button
                        onClick={() => loadAnnouncements(currentPage - 1)}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={() => loadAnnouncements(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                          <span className="font-medium">{totalCount}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                          <Button
                            onClick={() => loadAnnouncements(currentPage - 1)}
                            disabled={currentPage === 1}
                            variant="outline"
                            className="rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-white focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-5 w-5" />
                          </Button>

                          {[...Array(totalPages)].map((_, i) => {
                            const page = i + 1;
                            if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                              return (
                                <Button
                                  key={page}
                                  onClick={() => loadAnnouncements(page)}
                                  variant={currentPage === page ? "default" : "outline"}
                                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${currentPage === page ? 'bg-orange-600 text-white shadow-md' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-white'}`}
                                >
                                  {page}
                                </Button>
                              );
                            }
                            if (page === currentPage - 2 || page === currentPage + 2) {
                              return <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">...</span>;
                            }
                            return null;
                          })}

                          <Button
                            onClick={() => loadAnnouncements(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            variant="outline"
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-white focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                          >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          resetForm();
          setIsCalendarOpen(false);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="px-6 py-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editingAnnouncement ? 'Edit Announcement' : 'Add New Announcement'}
            </DialogTitle>
            <DialogDescription>
              {editingAnnouncement ? 'Update the announcement details below' : 'Fill in the information to create a new announcement'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium text-gray-700">Title</label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter announcement title"
                  className="border-gray-200 focus:border-slate-400 focus:ring-slate-300"
                />
            </div>
            <div className="grid gap-2">
              <label htmlFor="content" className="text-sm font-medium text-gray-700">Content</label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Enter announcement content"
                  rows={5}
                  className="border-gray-200 focus:border-slate-400 focus:ring-slate-300"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Row 1: Level and Priority */}
              <div className="grid gap-2">
                <label htmlFor="level" className="text-sm font-medium text-gray-700">Announcement Level</label>
                <Select
                  value={formData.level}
                  onValueChange={(value: 'college' | 'department') => 
                    setFormData({...formData, level: value})
                  }
                >
                  <SelectTrigger className="border-gray-200 focus:border-slate-400">
                    <SelectValue placeholder="-select-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="college">College Level</SelectItem>
                    <SelectItem value="department">Department Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="priority" className="text-sm font-medium text-gray-700">Priority</label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'normal' | 'important' | 'urgent') => 
                    setFormData({...formData, priority: value})
                  }
                >
                  <SelectTrigger className="border-gray-200 focus:border-slate-400">
                    <SelectValue placeholder="-select-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Row 2: Dynamic Column positioning */}
              {/* Col 1: Department (if level=dept) OR Expiry Date (if level=college) */}
              <div className="grid gap-2">
                {formData.level === 'department' ? (
                  <>
                    <label htmlFor="department" className="text-sm font-medium text-gray-700">Department</label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => 
                        setFormData({...formData, department: value})
                      }
                    >
                      <SelectTrigger className="border-gray-200 focus:border-slate-400 bg-white">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {departments.map((dept) => (
                          <SelectItem 
                            key={dept.id} 
                            value={dept.id.toString()}
                            className="cursor-pointer font-medium"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
                              {dept.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <>
                    <label htmlFor="expiry_date" className="text-sm font-medium text-gray-700">Expiry Date</label>
                    <div className="relative">
                      <Input
                        id="expiry_date"
                        value={formData.expiry_date}
                        onChange={(e) => {
                          setFormData({...formData, expiry_date: e.target.value});
                        }}
                        placeholder="DD-MM-YYYY"
                        className="border-gray-200 focus:border-slate-400 pr-10"
                      />
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <button 
                            type="button"
                            className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-400 hover:text-slate-600 transition-colors"
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[10005]" align="end">
                          <Calendar
                            mode="single"
                            selected={
                              formData.expiry_date && /^\d{2}-\d{2}-\d{4}$/.test(formData.expiry_date) 
                                ? parse(formData.expiry_date, 'dd-MM-yyyy', new Date()) 
                                : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                setFormData({...formData, expiry_date: format(date, 'dd-MM-yyyy')});
                              } else {
                                setFormData({...formData, expiry_date: ''});
                              }
                              setIsCalendarOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                )}
              </div>

              {/* Col 2: Expiry Date (if level=dept) OR empty (if level=college) */}
              <div className="grid gap-2">
                {formData.level === 'department' && (
                  <>
                    <label htmlFor="expiry_date" className="text-sm font-medium text-gray-700">Expiry Date</label>
                    <div className="relative">
                      <Input
                        id="expiry_date"
                        value={formData.expiry_date}
                        onChange={(e) => {
                          setFormData({...formData, expiry_date: e.target.value});
                        }}
                        placeholder="DD-MM-YYYY"
                        className="border-gray-200 focus:border-slate-400 pr-10"
                      />
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <button 
                            type="button"
                            className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-gray-400 hover:text-slate-600 transition-colors"
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[10005]" align="end">
                          <Calendar
                            mode="single"
                            selected={
                              formData.expiry_date && /^\d{2}-\d{2}-\d{4}$/.test(formData.expiry_date) 
                                ? parse(formData.expiry_date, 'dd-MM-yyyy', new Date()) 
                                : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                setFormData({...formData, expiry_date: format(date, 'dd-MM-yyyy')});
                              } else {
                                setFormData({...formData, expiry_date: ''});
                              }
                              setIsCalendarOpen(false);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="grid gap-2 mb-2">
              <label htmlFor="attachment" className="text-sm font-medium text-gray-700">Attachment (Optional)</label>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.zip,.rar,.txt,.py,.js,.ts,.java,.cpp,.c,.cs,.html,.css,.json,.xml,.sh"
                    onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                  />

                  <label
                    htmlFor="file-upload"
                    className={`flex items-center gap-4 w-full p-6 rounded-3xl cursor-pointer border-2 border-dashed transition-all font-bold ${
                      attachmentFile
                        ? 'bg-slate-50 border-slate-200 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <Paperclip className="w-5 h-5 text-slate-500" />

                    {attachmentFile ? (
                      <span className="text-slate-900 truncate">{attachmentFile.name}</span>
                    ) : (
                      'Add Attachment (PDF / Image / ZIP / RAR / Code Files)'
                    )}
                  </label>
                  
                  {attachmentFile && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setAttachmentFile(null);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
              className="border-gray-300 text-gray-700 font-medium"
            >
              Cancel
            </Button>
            <Button
              className="bg-slate-900 hover:bg-slate-950 text-white font-medium px-8"
              onClick={handleSubmit}
            >
              {editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* View Announcement Modal */}
      <Dialog open={!!viewAnnouncement} onOpenChange={(open) => !open && setViewAnnouncement(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white">
          <div className="bg-blue-50 border-b border-blue-100 px-6 py-4 flex flex-wrap gap-2 items-center">
             <Badge className={`bg-white border-blue-200 ${viewAnnouncement?.level === 'college' ? 'text-blue-600' : 'text-purple-600 border-purple-200'}`}>
                {viewAnnouncement?.level === 'college' 
                  ? 'College Level' 
                  : (viewAnnouncement?.department_name ? `${viewAnnouncement.department_name} Department` : 'Department Level')}
             </Badge>
             <Badge className={`bg-white ${viewAnnouncement?.priority === 'urgent' ? 'text-red-600 border-red-200' : viewAnnouncement?.priority === 'important' ? 'text-orange-600 border-orange-200' : 'text-blue-600 border-blue-200'}`}>
                {viewAnnouncement?.priority ? viewAnnouncement.priority.charAt(0).toUpperCase() + viewAnnouncement.priority.slice(1) : 'Normal'}
             </Badge>
          </div>
          <div className="px-6 py-6 pb-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{viewAnnouncement?.title}</h2>
            <div className="prose max-w-none text-gray-700 text-[15px] leading-relaxed mb-6 whitespace-pre-wrap">
              {viewAnnouncement?.content}
            </div>
          </div>
          <div className="bg-white border-t border-gray-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{viewAnnouncement?.created_by_name?.split('@')[0] || 'Admin'}</span>
                </div>
                {viewAnnouncement?.expiry_date && (
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    <span>
                      {new Date(viewAnnouncement.expiry_date).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })} (Expiry)
                    </span>
                  </div>
                )}
             </div>
             {viewAnnouncement?.attachment && (
                <div className="flex items-center gap-2 shrink-0">
                  <a 
                    href={viewAnnouncement.attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors font-medium border border-blue-100 bg-white shadow-sm w-fit"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Attachment</span>
                  </a>
                  <a 
                    href={viewAnnouncement.attachment}
                    download={viewAnnouncement.attachment.split('/').pop() || 'attachment'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors font-medium border border-blue-100 bg-white shadow-sm w-fit"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                </div>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementsScreen;
