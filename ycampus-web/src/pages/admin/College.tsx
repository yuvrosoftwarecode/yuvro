import React, { useState, useMemo, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, Building2, Search, MapPin, Globe, X, CheckCircle2, XCircle, Plus, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { collegeService, College, CollegeCreateData } from '@/services/collegeService';
import PageHeader from '@/components/common/PageHeader';

const EMPTY_FORM: CollegeCreateData = {
    name: "",
    short_form: "",
    location: "",
    website: "",
    college_type: "private",
    affiliated_university: "jntu",
    is_aicte_approved: false,
    is_ugc_approved: false,
};

const COLLEGE_TYPES = [
    { value: 'government', label: 'Government' },
    { value: 'autonomous', label: 'Autonomous' },
    { value: 'deemed', label: 'Deemed' },
    { value: 'private', label: 'Private' }
];

const UNIVERSITIES = [
    { value: 'jntu', label: 'JNTU' },
    { value: 'anna', label: 'Anna University' },
    { value: 'vtu', label: 'VTU' },
    { value: 'ou', label: 'Osmania University' }
];

const CollegePage = () => {
    const navigate = useNavigate();
    const [colleges, setColleges] = useState<College[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCollegeId, setEditingCollegeId] = useState<string | number | null>(null);
    const [deleteId, setDeleteId] = useState<string | number | null>(null);
    const [form, setForm] = useState<CollegeCreateData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        loadColleges();
    }, []);

    const loadColleges = async () => {
        try {
            setLoading(true);
            const data = await collegeService.getColleges();
            setColleges(data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load colleges");
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        return colleges.filter(c => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = !q || c.name.toLowerCase().includes(q) || (c.short_form || '').toLowerCase().includes(q) || (c.location || '').toLowerCase().includes(q);
            const matchesType = filterType === 'all' || c.college_type === filterType;
            return matchesSearch && matchesType;
        });
    }, [colleges, searchQuery, filterType]);

    const hasActiveFilters = searchQuery || filterType !== 'all';

    const clearFilters = () => {
        setSearchQuery('');
        setFilterType('all');
    };

    const openAdd = () => {
        setEditingCollegeId(null);
        setForm(EMPTY_FORM);
        setDialogOpen(true);
    };

    const openEdit = (c: College) => {
        setEditingCollegeId(c.id);
        const editData: CollegeCreateData = {
            name: c.name,
            short_form: c.short_form || "",
            location: c.location || "",
            website: c.website || "",
            college_type: c.college_type,
            affiliated_university: c.affiliated_university,
            is_aicte_approved: c.is_aicte_approved,
            is_ugc_approved: c.is_ugc_approved,
        };
        setForm(editData);
        setDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error("College Name is required");
            return;
        }

        try {
            setSaving(true);
            if (editingCollegeId) {
                await collegeService.updateCollege(editingCollegeId, form);
                toast.success('College updated successfully');
            } else {
                await collegeService.createCollege(form);
                toast.success('College created successfully');
            }
            setDialogOpen(false);
            loadColleges();
        } catch (err) {
            console.error(err);
            toast.error(`Failed to ${editingCollegeId ? 'update' : 'create'} college`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            setSaving(true);
            await collegeService.deleteCollege(deleteId);
            toast.success('College deleted successfully');
            setDeleteId(null);
            loadColleges();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete college');
        } finally {
            setSaving(false);
        }
    };

    const handleCollegeClick = (id: string | number) => {
        navigate(`/admin/college/${id}`);
    };

    const updateForm = (key: keyof typeof form, value: any) => setForm(prev => ({ ...prev, [key]: value }));

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full">
                <AdminSidebar />
                <div className="flex-1 flex flex-col">
                    <main className="flex-1 p-6 bg-background">
                        <PageHeader 
                            title="College Management" 
                            actions={
                                <Button onClick={openAdd}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add College
                                </Button>
                            }
                        />
                        
                        {/* Search & Filters */}
                        <Card className="mb-6">
                            <CardContent className="p-4">
                                <div className="flex flex-col md:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by name, code, or location..."
                                            className="pl-9"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <Select value={filterType} onValueChange={setFilterType}>
                                        <SelectTrigger className="w-full md:w-48">
                                            <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            {COLLEGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
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
                                            <TableHead className="w-[300px]">College</TableHead>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Affiliation</TableHead>
                                            <TableHead>Departments</TableHead>
                                            <TableHead>Approvals</TableHead>
                                            <TableHead className="text-right w-[120px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-10">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                                                        <p className="text-muted-foreground text-sm">Loading colleges...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filtered.length > 0 ? filtered.map(college => (
                                            <TableRow key={college.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleCollegeClick(college.id)}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                            <Building2 className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm leading-tight">{college.name}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                {college.short_form && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{college.short_form}</Badge>}
                                                                {college.website && (
                                                                    <a href={college.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-primary hover:underline" onClick={e => e.stopPropagation()}>
                                                                        <Globe className="h-3 w-3" />
                                                                        Website
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                        <MapPin className="h-3 w-3" />
                                                        {college.location || '—'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="text-xs capitalize">{college.college_type}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-medium uppercase">{college.affiliated_university}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                        {college.departments && college.departments.length > 0 ? (
                                                            college.departments.slice(0, 3).map((dept) => (
                                                                <Badge key={dept.id} variant="outline" className="text-[10px] bg-background">
                                                                    {dept.short_form || dept.name.split(' ').map(w => w[0]).join('')}
                                                                </Badge>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">None</span>
                                                        )}
                                                        {college.departments && college.departments.length > 3 && (
                                                            <Badge variant="outline" className="text-[10px] text-muted-foreground bg-muted">
                                                                +{college.departments.length - 3}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            {college.is_aicte_approved ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                                                            <span className={college.is_aicte_approved ? 'font-medium' : 'text-muted-foreground'}>AICTE</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            {college.is_ugc_approved ? <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                                                            <span className={college.is_ugc_approved ? 'font-medium' : 'text-muted-foreground'}>UGC</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); openEdit(college); }}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(college.id); }}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                                    {hasActiveFilters ? 'No colleges match your filters.' : 'No colleges added yet. Click "Add College" to get started.'}
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
                        <DialogTitle>{editingCollegeId ? 'Edit Institutional Profile' : 'Onboard New College'}</DialogTitle>
                        <DialogDescription>Provide the institutional identity and core details.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground border-b pb-1">Core Identity</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>College Name <span className="text-destructive">*</span></Label>
                                    <Input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="e.g. Stanford University" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Short Code</Label>
                                    <Input value={form.short_form} onChange={e => updateForm('short_form', e.target.value)} placeholder="e.g. SU" className="uppercase" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Location</Label>
                                    <Input value={form.location} onChange={e => updateForm('location', e.target.value)} placeholder="e.g. California, USA" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Website</Label>
                                    <Input value={form.website} onChange={e => updateForm('website', e.target.value)} placeholder="https://..." />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground border-b pb-1">Institutional Setup</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Institution Type</Label>
                                    <Select value={form.college_type} onValueChange={v => updateForm('college_type', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                        <SelectContent>
                                            {COLLEGE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>University Affiliation</Label>
                                    <Select value={form.affiliated_university} onValueChange={v => updateForm('affiliated_university', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select Affiliation" /></SelectTrigger>
                                        <SelectContent>
                                            {UNIVERSITIES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 pt-2">
                                <div className="flex items-center space-x-3 bg-muted/50 p-3 rounded-lg border flex-1">
                                    <Checkbox
                                        id="aicte"
                                        checked={form.is_aicte_approved}
                                        onCheckedChange={(checked) => updateForm('is_aicte_approved', checked)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="aicte" className="cursor-pointer font-semibold">AICTE Approved</Label>
                                        <p className="text-xs text-muted-foreground">Technical recognition</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 bg-muted/50 p-3 rounded-lg border flex-1">
                                    <Checkbox
                                        id="ugc"
                                        checked={form.is_ugc_approved}
                                        onCheckedChange={(checked) => updateForm('is_ugc_approved', checked)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="ugc" className="cursor-pointer font-semibold">UGC Approved</Label>
                                        <p className="text-xs text-muted-foreground">Grants commission</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : (editingCollegeId ? 'Update College' : 'Create College')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete College?</AlertDialogTitle>
                        <AlertDialogDescription>This action will permanently delete the college and its associated data. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {saving ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SidebarProvider>
    );
};

export default CollegePage;
