import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import announcementService, { Announcement, AnnouncementFilters } from '@/services/announcementService';
import { 
  Card, 
  CardContent
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnnouncementsList } from '@/components/college-admin/announcements/AnnouncementsList';
import { 
  Search, 
  Bell,
  User,
  Calendar as CalendarIcon,
  Paperclip,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const StudentAnnouncementsScreen: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewAnnouncement, setViewAnnouncement] = useState<Announcement | null>(null);

  const studentCollegeId = (user as any)?.college_id;
  const studentDepartmentId = (user as any)?.department_id;
  const pageSize = 25;

  const getAttachmentUrl = (url: string | null | undefined) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    const baseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    loadAnnouncements(1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAnnouncements(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadAnnouncements = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const params: AnnouncementFilters = {
        college: studentCollegeId,
        page: page,
        search: searchQuery
      };
      
      // The backend should handle filtering based on the student's role/context,
      // but if we need to filter on frontend:
      const data = await announcementService.getAnnouncements(params);
      
      let announcementsData: Announcement[] = [];
      let count = 0;
      
      if (Array.isArray(data)) {
        announcementsData = data;
        count = data.length;
      } else if (data && typeof data === 'object') {
        announcementsData = data.results || data.data || [];
        count = data.count || announcementsData.length;
      }
      
      // Apply visibility rules for the student:
      // 1. College level: All students in the college
      // 2. Department level: Only students in that specific department
      const visibleAnnouncements = announcementsData.filter(ann => {
        if (ann.level === 'college') return true;
        if (ann.level === 'department') {
          return ann.department?.toString() === studentDepartmentId?.toString();
        }
        return false;
      });

      setAnnouncements(visibleAnnouncements.map(ann => ({
        ...ann,
        attachment: getAttachmentUrl(ann.attachment)
      })));
      setTotalCount(count);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading announcements:', error);
      setAnnouncements([]);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <RoleSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <RoleHeader 
          title="Announcements" 
          subtitle="Stay updated with the latest news from your college and department"
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-gray-200 focus:border-orange-300 focus:ring-orange-200"
                />
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
                    {searchQuery ? "No announcements match your search criteria." : "There are no active announcements at this time."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                <AnnouncementsList 
                  announcements={announcements} 
                  onView={(ann) => setViewAnnouncement(ann)} 
                />

                {totalPages(totalCount, pageSize) > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-lg shadow-sm">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={() => loadAnnouncements(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => loadAnnouncements(currentPage + 1)}
                        disabled={currentPage === totalPages(totalCount, pageSize)}
                        className="ml-3 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                          <span className="font-medium">{totalCount}</span> results
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadAnnouncements(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => loadAnnouncements(currentPage + 1)}
                          disabled={currentPage === totalPages(totalCount, pageSize)}
                          className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* View Announcement Modal */}
      <Dialog open={!!viewAnnouncement} onOpenChange={(open) => !open && setViewAnnouncement(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white">
          <div className="bg-orange-50 border-b border-orange-100 px-6 py-4 flex flex-wrap gap-2 items-center">
             <Badge className="bg-white text-orange-700 border-orange-200">
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
          <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{viewAnnouncement?.created_by_name?.includes('@') ? 'College Admin' : (viewAnnouncement?.created_by_name || 'College Admin')}</span>
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
                    className="flex items-center gap-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-3 py-1.5 rounded-md transition-colors font-medium border border-orange-100 bg-white shadow-sm w-fit"
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

const totalPages = (total: number, size: number) => Math.ceil(total / size);

export default StudentAnnouncementsScreen;
