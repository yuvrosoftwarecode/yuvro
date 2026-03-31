import React, { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Building2, Search, MapPin, Phone, Mail, Globe, X } from 'lucide-react';
import { toast } from 'sonner';

interface CollegeData {
  id: string;
  name: string;
  code: string;
  type: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  established: string;
  affiliation: string;
  description: string;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Puducherry',
];

const COLLEGE_TYPES = ['Engineering', 'Medical', 'Arts & Science', 'Management', 'Law', 'Pharmacy', 'Polytechnic', 'Other'];

const EMPTY_FORM: Omit<CollegeData, 'id'> = {
  name: '', code: '', type: '', city: '', state: '', pincode: '', address: '',
  phone: '', email: '', website: '', established: '', affiliation: '', description: '',
};

const DUMMY_COLLEGES: CollegeData[] = [
  {
    id: '1', name: 'Yuvro Institute of Technology', code: 'YIT', type: 'Engineering',
    city: 'Hyderabad', state: 'Telangana', pincode: '500081', address: 'HITEC City, Madhapur',
    phone: '+91 40 2345 6789', email: 'info@yit.edu.in', website: 'www.yit.edu.in',
    established: '2005', affiliation: 'JNTUH',
    description: 'Premier engineering institute offering cutting-edge technology programs with state-of-the-art labs.',
  },
  {
    id: '2', name: 'Yuvro College of Sciences', code: 'YCS', type: 'Arts & Science',
    city: 'Bangalore', state: 'Karnataka', pincode: '560001', address: 'MG Road, Central Bangalore',
    phone: '+91 80 9876 5432', email: 'admin@ycs.edu.in', website: 'www.ycs.edu.in',
    established: '2010', affiliation: 'Bangalore University',
    description: 'Leading science college with research-focused curriculum and modern infrastructure.',
  },
  {
    id: '3', name: 'Yuvro School of Management', code: 'YSM', type: 'Management',
    city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', address: 'Anna Salai, T. Nagar',
    phone: '+91 44 1234 5678', email: 'contact@ysm.edu.in', website: 'www.ysm.edu.in',
    established: '2012', affiliation: 'Anna University',
    description: 'Top-tier management school with strong industry partnerships and placement record.',
  },
  {
    id: '4', name: 'Yuvro Medical College', code: 'YMC', type: 'Medical',
    city: 'Pune', state: 'Maharashtra', pincode: '411001', address: 'Shivaji Nagar, Pune',
    phone: '+91 20 5678 1234', email: 'info@ymc.edu.in', website: 'www.ymc.edu.in',
    established: '2008', affiliation: 'MUHS Nashik',
    description: 'Renowned medical college with attached 800-bed teaching hospital.',
  },
  {
    id: '5', name: 'Yuvro Law Academy', code: 'YLA', type: 'Law',
    city: 'Delhi', state: 'Delhi', pincode: '110001', address: 'Connaught Place, New Delhi',
    phone: '+91 11 4567 8901', email: 'admissions@yla.edu.in', website: 'www.yla.edu.in',
    established: '2015', affiliation: 'BCI / Delhi University',
    description: 'Progressive law academy with moot court facilities and legal aid clinics.',
  },
];

const CollegePage = () => {
  const [colleges, setColleges] = useState<CollegeData[]>(DUMMY_COLLEGES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState<CollegeData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<CollegeData, 'id'>>(EMPTY_FORM);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('all');
  const [filterState, setFilterState] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const uniqueCities = useMemo(() => [...new Set(colleges.map(c => c.city))].sort(), [colleges]);
  const uniqueStates = useMemo(() => [...new Set(colleges.map(c => c.state))].sort(), [colleges]);

  const filtered = useMemo(() => {
    return colleges.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.affiliation.toLowerCase().includes(q);
      const matchesCity = filterCity === 'all' || c.city === filterCity;
      const matchesState = filterState === 'all' || c.state === filterState;
      const matchesType = filterType === 'all' || c.type === filterType;
      return matchesSearch && matchesCity && matchesState && matchesType;
    });
  }, [colleges, searchQuery, filterCity, filterState, filterType]);

  const hasActiveFilters = searchQuery || filterCity !== 'all' || filterState !== 'all' || filterType !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCity('all');
    setFilterState('all');
    setFilterType('all');
  };

  const openAdd = () => {
    setEditingCollege(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (c: CollegeData) => {
    setEditingCollege(c);
    const { id, ...rest } = c;
    setForm(rest);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) return;
    if (editingCollege) {
      setColleges(prev => prev.map(c => c.id === editingCollege.id ? { ...c, ...form } : c));
      toast.success('College updated successfully');
    } else {
      setColleges(prev => [...prev, { ...form, id: Date.now().toString() }]);
      toast.success('College added successfully');
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setColleges(prev => prev.filter(c => c.id !== id));
    setDeleteId(null);
    toast.success('College deleted successfully');
  };

  const updateForm = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">

          <main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">College Management</h1>
            {/* Search & Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, code, city, or affiliation..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={filterState} onValueChange={setFilterState}>
                    <SelectTrigger className="w-full md:w-44">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50 max-h-60">
                      <SelectItem value="all">All States</SelectItem>
                      {uniqueStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterCity} onValueChange={setFilterCity}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50 max-h-60">
                      <SelectItem value="all">All Cities</SelectItem>
                      {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">
                      <SelectItem value="all">All Types</SelectItem>
                      {COLLEGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="icon" onClick={clearFilters} className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{filtered.length} college{filtered.length !== 1 ? 's' : ''}</Badge>
                  {hasActiveFilters && <span className="text-xs text-muted-foreground">Filtered results</span>}
                </div>
              </CardContent>
            </Card>

            {/* List View Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[280px]">College</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Established</TableHead>
                      <TableHead>Affiliation</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length > 0 ? filtered.map(college => (
                      <TableRow key={college.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm leading-tight">{college.name}</p>
                              <Badge variant="outline" className="mt-0.5 text-[10px] px-1.5 py-0">{college.code}</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{college.type || '—'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {college.city || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{college.state || '—'}</TableCell>
                        <TableCell className="text-sm">{college.established || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{college.affiliation || '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                            {college.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{college.phone}</span>}
                            {college.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{college.email}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(college)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(college.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                          {hasActiveFilters ? 'No colleges match your filters.' : 'No colleges added yet. Click "Add New College" to get started.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCollege ? 'Edit College' : 'Add New College'}</DialogTitle>
            <DialogDescription>Fill in the college details below. Fields marked with * are required.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>College Name *</Label>
                  <Input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="e.g., ABC Institute of Technology" required />
                </div>
                <div className="space-y-1.5">
                  <Label>College Code *</Label>
                  <Input value={form.code} onChange={e => updateForm('code', e.target.value)} placeholder="e.g., ABIT" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => updateForm('type', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">
                      {COLLEGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Year Established</Label>
                  <Input value={form.established} onChange={e => updateForm('established', e.target.value)} placeholder="e.g., 2005" />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Location</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={e => updateForm('city', e.target.value)} placeholder="e.g., Hyderabad" />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Select value={form.state} onValueChange={v => updateForm('state', v)}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50 max-h-60">
                      {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Pincode</Label>
                  <Input value={form.pincode} onChange={e => updateForm('pincode', e.target.value)} placeholder="e.g., 500081" />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <Label>Full Address</Label>
                <Input value={form.address} onChange={e => updateForm('address', e.target.value)} placeholder="Street address, area, landmark" />
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="+91 XX XXXX XXXX" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="info@college.edu.in" type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={e => updateForm('website', e.target.value)} placeholder="www.college.edu.in" />
                </div>
              </div>
            </div>

            {/* Affiliation & Description */}
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">Additional Details</h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Affiliation / University</Label>
                  <Input value={form.affiliation} onChange={e => updateForm('affiliation', e.target.value)} placeholder="e.g., JNTUH, Anna University" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder="Brief description of the college..." rows={3} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingCollege ? 'Update College' : 'Create College'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete College?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. All associated data will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default CollegePage;
