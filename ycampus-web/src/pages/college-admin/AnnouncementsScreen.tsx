import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import announcementService, { Announcement, AnnouncementFilters } from '@/services/announcementService';
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
  Card, 
  CardContent
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Bell
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    level: 'college' as 'college' | 'department',
    priority: 'normal' as 'normal' | 'important' | 'urgent',
    is_active: true,
    publish_date: '',
    expiry_date: '',
  });

  const collegeId = (user as any)?.college_id;
  const pageSize = 25;

  useEffect(() => {
    loadAnnouncements(1);
  }, [filterLevel, filterPriority]);

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
      
      setAnnouncements(announcementsData);
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
      const payload = {
        ...formData,
        college: collegeId,
      };
      
      if (editingAnnouncement) {
        await announcementService.updateAnnouncement(editingAnnouncement.id, payload);
        toast.success('Announcement updated successfully');
      } else {
        await announcementService.createAnnouncement(payload);
        toast.success('Announcement created successfully');
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadAnnouncements(currentPage);
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
    setFormData({
      title: announcement.title,
      content: announcement.content,
      level: announcement.level,
      priority: announcement.priority,
      is_active: announcement.is_active,
      publish_date: announcement.publish_date ? announcement.publish_date.split('T')[0] : '',
      expiry_date: announcement.expiry_date ? announcement.expiry_date.split('T')[0] : '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      content: '',
      level: 'college',
      priority: 'normal',
      is_active: true,
      publish_date: '',
      expiry_date: '',
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" className="text-[11px] uppercase px-1.5 py-0 font-bold">Urgent</Badge>;
      case 'important':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[11px] uppercase px-1.5 py-0 font-bold">Important</Badge>;
      default:
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] uppercase px-1.5 py-0 font-bold">Normal</Badge>;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'college':
        return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px] uppercase px-1.5 py-0 font-bold">College</Badge>;
      default:
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] uppercase px-1.5 py-0 font-bold">Department</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge className="bg-green-50 text-green-700 border-green-200 text-[11px] uppercase px-1.5 py-0 font-bold">Active</Badge>;
    }
    return <Badge variant="secondary" className="text-[11px] uppercase px-1.5 py-0 font-bold">Inactive</Badge>;
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="flex">
        <RoleSidebar />
        <div className="flex-1">
          <RoleHeader
            title="Announcements"
            subtitle="Manage college and department level announcements"
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search announcements..."
                  className="pl-10 pr-10 border-gray-200 focus:border-orange-300 focus:ring-orange-200"
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
                  className={`text-gray-600 border-gray-200 ${(filterLevel !== 'all' || filterPriority !== 'all') ? 'bg-orange-50 border-orange-200 text-orange-600' : ''}`}
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {(filterLevel !== 'all' || filterPriority !== 'all') ? 'Filtered' : 'Filter'}
                </Button>

                {isFilterMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-100 rounded-lg shadow-xl z-50 p-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Level</label>
                      <div className="flex flex-wrap gap-2">
                        {(['all', 'college', 'department'] as const).map((level) => (
                          <button
                            key={level}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filterLevel === level ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
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
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filterPriority === priority ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
                            onClick={() => setFilterPriority(priority)}
                          >
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
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
                        }}
                      >
                        Reset Filters
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => setIsFilterMenuOpen(false)}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                )}
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white"
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
              </div>
            ) : announcements.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-100 shadow-none bg-transparent">
                <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-20 w-20 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                    <Bell className="h-10 w-10 text-orange-200" />
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
              <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                    <TableRow>
                      <TableHead className="w-[60px] text-center">Sl. No</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right px-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((announcement, index) => (
                      <TableRow
                        key={announcement.id}
                        className="group hover:bg-orange-50/30 transition-colors"
                      >
                        <TableCell className="text-center font-medium text-gray-500">{(currentPage - 1) * pageSize + index + 1}</TableCell>
                        <TableCell>
                          <span className="font-semibold text-gray-900">{announcement.title}</span>
                        </TableCell>
                        <TableCell className="text-gray-700 text-xs max-w-[200px] truncate" title={announcement.content}>
                          {announcement.content}
                        </TableCell>
                        <TableCell>{getLevelBadge(announcement.level)}</TableCell>
                        <TableCell>{getPriorityBadge(announcement.priority)}</TableCell>
                        <TableCell>{getStatusBadge(announcement.is_active)}</TableCell>
                        <TableCell className="text-gray-700 text-xs">{announcement.created_by_name || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-3.5 w-3.5 mr-1" />
                            {new Date(announcement.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-4">
                          <div className="flex items-center justify-end gap-1 transition-all duration-300">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                              onClick={() => handleEdit(announcement)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(announcement)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

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
                            className="rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
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
                                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${currentPage === page ? 'bg-orange-600 text-white shadow-md' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}
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
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
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
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
            </DialogTitle>
            <DialogDescription>
              {editingAnnouncement 
                ? 'Update the announcement details below' 
                : 'Create a new college or department level announcement'}
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
                className="border-gray-200 focus:border-orange-300 focus:ring-orange-200"
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
                className="border-gray-200 focus:border-orange-300 focus:ring-orange-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="level" className="text-sm font-medium text-gray-700">Announcement Level</label>
                <Select
                  value={formData.level}
                  onValueChange={(value: 'college' | 'department') => 
                    setFormData({...formData, level: value})
                  }
                >
                  <SelectTrigger className="border-gray-200 focus:border-orange-300">
                    <SelectValue placeholder="Select level" />
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
                  <SelectTrigger className="border-gray-200 focus:border-orange-300">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="publish_date" className="text-sm font-medium text-gray-700">Publish Date</label>
                <Input
                  id="publish_date"
                  type="date"
                  value={formData.publish_date}
                  onChange={(e) => setFormData({...formData, publish_date: e.target.value})}
                  className="border-gray-200 focus:border-orange-300"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="expiry_date" className="text-sm font-medium text-gray-700">Expiry Date</label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                  className="border-gray-200 focus:border-orange-300"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-gray-200">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-orange-600 hover:bg-orange-700">
              {editingAnnouncement ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementsScreen;
