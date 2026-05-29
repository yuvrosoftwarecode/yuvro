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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash2, Building2, Search, MapPin, Globe, X, CheckCircle2, XCircle, Plus, Layers, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { collegeService, College, CollegeCreateData } from '@/services/collegeService';
import PageHeader from '@/components/common/PageHeader';

const CAMPUS_TABS = [
    { title: 'Dashboard', key: 'dashboard' },
    { title: 'Learning', key: 'learning' },
    { title: 'Practice Test', key: 'practice_test' },
    { title: 'Task', key: 'task' },
    { title: 'Assessment', key: 'assessment' },
    { title: 'Interview Preparation', key: 'interview_preparation' },
    { title: 'AI Interview Planner', key: 'ai_interview_planner' },
    { title: 'Jobs', key: 'jobs' },
    { title: 'Announcements', key: 'announcements' },
    { title: 'Community', key: 'community' },
    { title: 'Contest', key: 'contest' },
];

const ASSESSMENT_TABS = [
    { title: 'Dashboard', key: 'dashboard' },
    { title: 'Learning', key: 'learning' },
    { title: 'Code Practice', key: 'code_practice' },
    { title: 'Skill Test', key: 'skill_test' },
    { title: 'Aptitude & Reasoning', key: 'aptitude_reasoning' },
    { title: 'Mock Interviews', key: 'mock_interviews' },
    { title: 'AI Interview Planner', key: 'ai_interview_planner' },
    { title: 'Jobs', key: 'jobs' },
    { title: 'Announcements', key: 'announcements' },
    { title: 'Contest', key: 'contest' },
    { title: 'Leaderboard', key: 'leaderboard' },
];

const EMPTY_FORM: CollegeCreateData = {
    name: "",
    short_form: "",
    location: "",
    website: "",
    college_type: "private",
    university: "",
    product_type: "campus",
    is_aicte_approved: false,
    is_ugc_approved: false,
    sidebar_config: {},
};

const EMPTY_UNI_FORM = {
    name: "",
    short_form: "",
    location: ""
};


const COLLEGE_TYPES = [
    { value: 'government', label: 'Government' },
    { value: 'autonomous', label: 'Autonomous' },
    { value: 'deemed', label: 'Deemed' },
    { value: 'private', label: 'Private' }
];


const PRODUCT_TYPES = [
    { value: 'campus', label: 'Yuvro Campus' },
    { value: 'assessments', label: 'Yuvro Assessments' }
];

const CollegePage = () => {
    const navigate = useNavigate();
    const [colleges, setColleges] = useState<College[]>([]);
    const [universities, setUniversities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingUniversities, setLoadingUniversities] = useState(false);

    const [activeTab, setActiveTab] = useState('colleges');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCollegeId, setEditingCollegeId] = useState<string | number | null>(null);
    const [deleteId, setDeleteId] = useState<string | number | null>(null);
    const [form, setForm] = useState<CollegeCreateData>(EMPTY_FORM);

    const [uniDialogOpen, setUniDialogOpen] = useState(false);
    const [editingUniId, setEditingUniId] = useState<string | number | null>(null);
    const [uniForm, setUniForm] = useState(EMPTY_UNI_FORM);
    const [uniDeleteId, setUniDeleteId] = useState<string | number | null>(null);

    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!form.name.trim()) {
            errors.name = "College Name is required";
        } else if (form.name.trim().length < 3) {
            errors.name = "Name must be at least 3 characters";
        }

        if (form.website && form.website.trim() !== '') {
            try {
                new URL(form.website);
            } catch (_) {
                errors.website = "Enter a valid URL (e.g. https://example.com)";
            }
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [uniSearchQuery, setUniSearchQuery] = useState('');


    useEffect(() => {
        loadColleges();
        loadUniversities();
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

    const loadUniversities = async () => {
        try {
            setLoadingUniversities(true);
            const data = await collegeService.getUniversities();
            setUniversities(data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load universities");
        } finally {
            setLoadingUniversities(false);
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

    const filteredUniversities = useMemo(() => {
        return universities.filter(u => {
            const q = uniSearchQuery.toLowerCase();
            return !q || u.name.toLowerCase().includes(q) || (u.short_form || '').toLowerCase().includes(q) || (u.location || '').toLowerCase().includes(q);
        });
    }, [universities, uniSearchQuery]);


    const hasActiveFilters = searchQuery || filterType !== 'all';

    const clearFilters = () => {
        setSearchQuery('');
        setFilterType('all');
    };

    const openAdd = () => {
        setEditingCollegeId(null);
        setForm(EMPTY_FORM);
        setFormErrors({});
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
            university: c.university || "",
            product_type: c.product_type || "campus",
            is_aicte_approved: c.is_aicte_approved,
            is_ugc_approved: c.is_ugc_approved,
            sidebar_config: c.sidebar_config || {},
        };
        setForm(editData);
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            toast.error("Please fix the validation errors");
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

    const saveUniversity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uniForm.name.trim()) {
            toast.error("University Name is required");
            return;
        }

        try {
            setSaving(true);
            if (editingUniId) {
                await collegeService.updateUniversity(editingUniId, uniForm);
                toast.success('University updated successfully');
            } else {
                await collegeService.createUniversity(uniForm);
                toast.success('University added successfully');
            }
            setUniDialogOpen(false);
            loadUniversities();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save university");
        } finally {
            setSaving(false);
        }
    };

    const confirmDeleteUni = async () => {
        if (!uniDeleteId) return;
        try {
            setSaving(true);
            await collegeService.deleteUniversity(uniDeleteId);
            toast.success('University deleted successfully');
            loadUniversities();
            setUniDeleteId(null);
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete university");
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
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => {
                                        setEditingUniId(null);
                                        setUniForm(EMPTY_UNI_FORM);
                                        setUniDialogOpen(true);
                                    }}>
                                        <GraduationCap className="h-4 w-4 mr-2" />
                                        Add University
                                    </Button>
                                    <Button onClick={openAdd}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add College
                                    </Button>
                                </div>
                            }
                        />


                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-6">
                                <TabsTrigger value="colleges">
                                    <Building2 className="h-4 w-4 mr-2" />
                                    Colleges
                                </TabsTrigger>
                                <TabsTrigger value="universities">
                                    <GraduationCap className="h-4 w-4 mr-2" />
                                    Universities
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="colleges">
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

                                <Card>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[300px]">College</TableHead>
                                                    <TableHead>Location</TableHead>
                                                    <TableHead>University</TableHead>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loading ? (
                                                    Array.from({ length: 5 }).map((_, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell colSpan={6} className="h-16 animate-pulse bg-muted/20" />
                                                        </TableRow>
                                                    ))
                                                ) : filtered.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                            No colleges found. Try adding one or adjusting filters.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filtered.map(c => (
                                                        <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleCollegeClick(c.id)}>
                                                            <TableCell>
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-foreground">{c.name}</span>
                                                                    <span className="text-xs text-muted-foreground">{c.short_form || 'No code'}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center text-sm text-muted-foreground">
                                                                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                                                                    {c.location || 'N/A'}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">{c.university_details?.name || 'N/A'}</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={c.product_type === 'campus' ? 'default' : 'secondary'}>
                                                                    {c.product_type === 'campus' ? 'Campus' : 'Assessments'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="capitalize">{c.college_type}</TableCell>
                                                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                                                <div className="flex justify-end gap-1">
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="universities">
                                <Card className="mb-6">
                                    <CardContent className="p-4">
                                        <div className="flex flex-col md:flex-row gap-4 items-center">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search universities by name, code, or location..."
                                                    value={uniSearchQuery}
                                                    onChange={(e) => setUniSearchQuery(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                            {uniSearchQuery && (
                                                <Button variant="ghost" size="sm" onClick={() => setUniSearchQuery('')}>
                                                    Clear Filters
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="secondary" className="px-2 py-0.5 font-medium">
                                                {filteredUniversities.length} {filteredUniversities.length === 1 ? 'university' : 'universities'}
                                            </Badge>
                                            {uniSearchQuery && <span className="text-xs text-muted-foreground">Filtered results</span>}
                                        </div>
                                    </CardContent>
                                </Card>


                                <Card>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[300px]">University Name</TableHead>
                                                    <TableHead>Short Form</TableHead>
                                                    <TableHead>Location</TableHead>
                                                    <TableHead className="text-center">Colleges</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loadingUniversities ? (
                                                    Array.from({ length: 5 }).map((_, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell colSpan={4} className="h-16 animate-pulse bg-muted/20" />
                                                        </TableRow>
                                                    ))
                                                ) : filteredUniversities.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                                            {uniSearchQuery ? "No universities match your search criteria." : "No universities found. Add one to get started."}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredUniversities.map(u => (
                                                        <TableRow key={u.id}>
                                                            <TableCell className="font-medium">{u.name}</TableCell>
                                                            <TableCell>{u.short_form || 'N/A'}</TableCell>
                                                            <TableCell>{u.location || 'N/A'}</TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge variant="secondary" className="font-semibold">
                                                                    {u.college_count || 0}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-1">
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                                                        setEditingUniId(u.id);
                                                                        setUniForm({
                                                                            name: u.name,
                                                                            short_form: u.short_form || "",
                                                                            location: u.location || ""
                                                                        });
                                                                        setUniDialogOpen(true);
                                                                    }}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setUniDeleteId(u.id)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                        </Tabs>
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
                                    <Input 
                                        value={form.name} 
                                        onChange={e => updateForm('name', e.target.value)} 
                                        placeholder="e.g. Stanford University" 
                                        className={formErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Short Code</Label>
                                    <Input 
                                        value={form.short_form} 
                                        onChange={e => updateForm('short_form', e.target.value)} 
                                        placeholder="e.g. SU" 
                                        className={formErrors.short_form ? "border-destructive focus-visible:ring-destructive" : ""} 
                                    />
                                    {formErrors.short_form && <p className="text-xs text-destructive">{formErrors.short_form}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Location</Label>
                                    <Input 
                                        value={form.location} 
                                        onChange={e => updateForm('location', e.target.value)} 
                                        placeholder="e.g. California, USA" 
                                        className={formErrors.location ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {formErrors.location && <p className="text-xs text-destructive">{formErrors.location}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Website</Label>
                                    <Input 
                                        value={form.website} 
                                        onChange={e => updateForm('website', e.target.value)} 
                                        placeholder="https://..." 
                                        className={formErrors.website ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {formErrors.website && <p className="text-xs text-destructive">{formErrors.website}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-muted-foreground border-b pb-1">Institutional Setup</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Product Subscription <span className="text-destructive">*</span></Label>
                                    <Select value={form.product_type} onValueChange={v => updateForm('product_type', v as any)}>
                                        <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                                        <SelectContent>
                                            {PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                    <Label htmlFor="university">Affiliated University</Label>
                                    <Select value={form.university?.toString()} onValueChange={v => updateForm('university', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select University" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {universities.map(u => (
                                                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                            ))}
                                            {universities.length === 0 && <SelectItem value="none" disabled>No universities added</SelectItem>}
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

            {/* University Dialog */}
            <Dialog open={uniDialogOpen} onOpenChange={setUniDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUniId ? 'Edit University' : 'Add New University'}</DialogTitle>
                        <DialogDescription>
                            Configure university details for college affiliations.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={saveUniversity}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="uni-name">University Name</Label>
                                <Input
                                    id="uni-name"
                                    value={uniForm.name}
                                    onChange={e => setUniForm({ ...uniForm, name: e.target.value })}
                                    placeholder="e.g. Jawaharlal Nehru Technological University"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="uni-short">Short Form</Label>
                                    <Input
                                        id="uni-short"
                                        value={uniForm.short_form}
                                        onChange={e => setUniForm({ ...uniForm, short_form: e.target.value })}
                                        placeholder="e.g. JNTU"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="uni-location">Location</Label>
                                    <Input
                                        id="uni-location"
                                        value={uniForm.location}
                                        onChange={e => setUniForm({ ...uniForm, location: e.target.value })}
                                        placeholder="e.g. Hyderabad"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setUniDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : (editingUniId ? 'Update' : 'Create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Uni Dialog */}
            <AlertDialog open={!!uniDeleteId} onOpenChange={(open) => !open && setUniDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this university. Colleges affiliated with it will have their affiliation cleared.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteUni} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete University
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


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
