import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import Header from '@/components/common/Header';
import { usePrincipalAnnouncements, AnnouncementRow } from '@/hooks/usePrincipalAnnouncements';
import { usePrincipalDepartments } from '@/hooks/usePrincipalDepartments';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Filter, Plus, Pencil, Trash2, ChevronRight, User, CalendarDays, Paperclip, Megaphone } from 'lucide-react';
import { format } from 'date-fns';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { batchService } from '@/services/batchService';
import { useQuery } from '@tanstack/react-query';

const priorityStyles: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  important: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
  normal: 'bg-muted text-muted-foreground border-border',
};

const categoryStyles: Record<string, string> = {
  college: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  department: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
  batch: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800',
};

const emptyForm: {
  title: string; description: string; full_content: string;
  category: 'college' | 'department' | 'batch' | ''; 
  department_id: string;
  batch_id: string;
  priority: string; expiry_date: string; attachment_url: string; is_active: boolean;
  attachment_file?: File;
} = {
  title: '', description: '', full_content: '',
  category: '', 
  department_id: '',
  batch_id: '',
  priority: '', expiry_date: '', attachment_url: '', is_active: true,
};

interface AnnouncementManagerProps {
  SidebarComponent: React.ComponentType;
  defaultDepartmentId?: string;
}

const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({ 
  SidebarComponent, 
  defaultDepartmentId 
}) => {
  const { user } = useAuth();
  const {
    announcements, isLoading, searchQuery, setSearchQuery,
    filterCategory, setFilterCategory, filterPriority, setFilterPriority,
    filterAuthorship, setFilterAuthorship,
    createAnnouncement, deleteAnnouncement, updateAnnouncement, isCreating,
  } = usePrincipalAnnouncements();

  const { departments = [] } = usePrincipalDepartments();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const isHOD = user?.role === 'hod';

  const targetDeptId = isHOD ? defaultDepartmentId : form.department_id;
  const { data: batches = [] } = useQuery({
    queryKey: ['batches', targetDeptId],
    queryFn: async () => {
      if (!targetDeptId) return [];
      return await batchService.getBatches(targetDeptId);
    },
    enabled: !!targetDeptId && (isHOD || form.category === 'department' || form.category === 'batch'),
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewAnnouncement, setViewAnnouncement] = useState<AnnouncementRow | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);


  const openCreate = () => {
    setForm({
      ...emptyForm,
      department_id: defaultDepartmentId || '',
      category: isHOD ? 'batch' : '',
      batch_id: isHOD ? 'all' : '',
    });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (a: AnnouncementRow) => {
    const isHODAllBatches = isHOD && a.category === 'department';
    
    setForm({
      title: a.title,
      description: a.description,
      full_content: a.full_content || '',
      category: isHODAllBatches ? 'batch' : a.category,
      department_id: a.department_id || '',
      batch_id: isHODAllBatches ? 'all' : (a.batch_id || ''),
      priority: a.priority,
      expiry_date: a.expiry_date ? a.expiry_date.split('T')[0] : '',
      attachment_url: a.attachment_url || '',
      is_active: true,
    });
    setEditingId(a.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.priority) return;
    if (form.category === 'department' && !form.department_id) return;

    const isAllBatches = form.category === 'batch' && form.batch_id === 'all';
    
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      full_content: form.full_content.trim() || undefined,
      category: isAllBatches ? 'department' : (form.category === 'department' && form.batch_id && form.batch_id !== 'all' ? 'batch' : form.category),
      department_id: form.category !== 'college' ? (form.department_id || defaultDepartmentId || null) : null,
      batch_id: (form.category === 'batch' || (form.category === 'department' && form.batch_id !== 'all')) ? (form.batch_id || null) : null,
      priority: form.priority as 'normal' | 'important' | 'urgent',
      expiry_date: form.expiry_date || null,
      attachment_url: form.attachment_url.trim() || null,
      attachment_file: form.attachment_file,
      is_active: form.is_active,
    };

    if (editingId) {
      await updateAnnouncement({ id: editingId, updates: payload });
    } else {
      await createAnnouncement(payload);
    }
    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const getDeptName = (id: string | null) => {
    if (!id) return 'College Level';
    const d = departments.find((dep: any) => dep.id === id);
    return d?.name || 'Unknown';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <SidebarComponent />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 space-y-6 overflow-auto">
            {/* Page header */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
              <p className="text-sm text-muted-foreground">Manage college and department level announcements</p>
            </div>

            {/* Search + Filter + Add */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search announcements..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Filter className="h-4 w-4" />
                      Filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 space-y-4" align="end">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Category</Label>
                      <Select value={filterCategory} onValueChange={(v: any) => setFilterCategory(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="college">College Level</SelectItem>
                          <SelectItem value="department">Department Level</SelectItem>
                          <SelectItem value="batch">Batch Level</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Priority</Label>
                      <Select value={filterPriority} onValueChange={(v: any) => setFilterPriority(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="important">Important</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Authorship</Label>
                      <Select value={filterAuthorship} onValueChange={(v: any) => setFilterAuthorship(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Announcements</SelectItem>
                          <SelectItem value="self">My Announcements</SelectItem>
                          <SelectItem value="others">Others' Announcements</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button onClick={openCreate} className="gap-1.5 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
                  <Plus className="h-4 w-4" />
                  Add Announcement
                </Button>
              </div>
            </div>

            {/* List */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-36 w-full rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No announcements found</p>
                <p className="text-sm mt-1">Create your first announcement to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className="border rounded-xl p-5 bg-card hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold">{a.title}</h3>
                          <div className={cn(badgeVariants({ variant: 'outline' }), categoryStyles[a.category])}>
                            {a.category === 'college' ? 'College Level' : a.category === 'batch' && a.batch_name ? `Batch: ${a.batch_name}` : getDeptName(a.department_id)}
                          </div>
                          <div className={cn(badgeVariants({ variant: 'outline' }), priorityStyles[a.priority])}>
                            {a.priority.charAt(0).toUpperCase() + a.priority.slice(1)}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{a.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{a.posted_by}</span>
                          <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(a.posted_date), 'd MMM yyyy')}</span>
                          {a.attachment_url && (
                            <a href={a.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline transition-colors dark:text-blue-400">
                              <Paperclip className="h-3.5 w-3.5" />Attachment
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {user?.id?.toString() === a.created_by_id?.toString() && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(a.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setViewAnnouncement(a)}>
                          View <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Announcement' : 'Add New Announcement'}</DialogTitle>
            <p className="text-sm text-muted-foreground">Fill in the information to {editingId ? 'update the' : 'create a new'} announcement</p>
          </DialogHeader>
          <Separator />
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="Enter announcement title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea placeholder="Enter announcement content" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isHOD ? 'Batch' : 'Announcement Level'}</Label>
                <Select 
                  value={isHOD ? (form.batch_id || 'all') : (form.category === 'batch' ? 'department' : form.category)} 
                  onValueChange={(v) => {
                    if (isHOD) {
                      setForm({ ...form, category: 'batch', batch_id: v });
                    } else {
                      setForm({ ...form, category: v as 'college' | 'department', batch_id: 'all' });
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="-select level-" /></SelectTrigger>
                  <SelectContent>
                    {isHOD ? (
                      <>
                        <SelectItem value="all">All Batches</SelectItem>
                        {batches.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </>
                    ) : (
                      <>
                        <SelectItem value="college">College Level</SelectItem>
                        <SelectItem value="department">Department Level</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue placeholder="-select-" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!isHOD && (form.category === 'department' || form.category === 'batch') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(form.category === 'department' || form.category === 'batch') && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label>Batch (Optional)</Label>
                    <Select value={form.batch_id || 'all'} onValueChange={(v) => setForm({ ...form, batch_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batches (Entire Department)</SelectItem>
                        {batches.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Attachment (Optional)</Label>
              <label htmlFor="attachment-upload" className="border-2 border-dashed rounded-lg p-4 flex items-center justify-between gap-2 text-muted-foreground cursor-pointer hover:border-primary/40 transition-colors w-full">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {form.attachment_file 
                      ? form.attachment_file.name 
                      : form.attachment_url 
                        ? 'Attachment Added' 
                        : 'Add Attachment (PDF / Image / ZIP / RAR / Code Files)'}
                  </span>
                </div>
                {(form.attachment_file || form.attachment_url) && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 z-10 relative" 
                    onClick={(e: React.MouseEvent) => { 
                      e.preventDefault(); 
                      setForm({ ...form, attachment_file: undefined, attachment_url: '' }); 
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <input
                  id="attachment-upload"
                  type="file"
                  className="hidden"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) setForm({ ...form, attachment_file: file });
                  }}
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: !!c })} />
              <Label htmlFor="active" className="text-sm">Active</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={isCreating || !form.title.trim() || !form.description.trim() || !form.priority}
              className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            >
              {editingId ? 'Update Announcement' : 'Create Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewAnnouncement} onOpenChange={() => setViewAnnouncement(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewAnnouncement?.title}</DialogTitle>
          </DialogHeader>
          <Separator />
          {viewAnnouncement && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className={cn(badgeVariants({ variant: 'outline' }), categoryStyles[viewAnnouncement.category])}>
                  {viewAnnouncement.category === 'college' ? 'College Level' : viewAnnouncement.category === 'batch' && viewAnnouncement.batch_name ? `Batch: ${viewAnnouncement.batch_name}` : getDeptName(viewAnnouncement.department_id)}
                </div>
                <div className={cn(badgeVariants({ variant: 'outline' }), priorityStyles[viewAnnouncement.priority])}>
                  {viewAnnouncement.priority.charAt(0).toUpperCase() + viewAnnouncement.priority.slice(1)}
                </div>
              </div>
              <p className="text-sm leading-relaxed">{viewAnnouncement.description}</p>
              {viewAnnouncement.full_content && (
                <p className="text-sm leading-relaxed text-muted-foreground">{viewAnnouncement.full_content}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{viewAnnouncement.posted_by}</span>
                <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{format(new Date(viewAnnouncement.posted_date), 'd MMM yyyy')}</span>
              </div>
              {viewAnnouncement.expiry_date && (
                <p className="text-xs text-muted-foreground">Expires: {format(new Date(viewAnnouncement.expiry_date), 'd MMM yyyy')}</p>
              )}
              {viewAnnouncement.attachment_url && (
                <div className="pt-2">
                  <a href={viewAnnouncement.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline dark:text-blue-400">
                    <Paperclip className="h-4 w-4" /> View Attachment
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The announcement will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteAnnouncement(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default AnnouncementManager;
