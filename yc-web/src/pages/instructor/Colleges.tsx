import React, { useEffect, useState } from 'react';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { collegeService, College, Department } from '@/services/collegeService';
import { StatsCard } from '@/components/common/StatsCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Building2, GraduationCap, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Colleges() {
    const navigate = useNavigate();
    
    // -- College state --
    const [colleges, setColleges] = useState<College[]>([]);
    const [loadingColleges, setLoadingColleges] = useState(true);
    const [showAddCollegeDialog, setShowAddCollegeDialog] = useState(false);
    const [newCollegeName, setNewCollegeName] = useState('');
    const [addingCollege, setAddingCollege] = useState(false);

    // -- Department state --
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loadingDepts, setLoadingDepts] = useState(true);
    const [showAddDeptDialog, setShowAddDeptDialog] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    const [addingDept, setAddingDept] = useState(false);

    // -- Top-level tab --
    const [activeTab, setActiveTab] = useState('colleges');

    useEffect(() => {
        fetchColleges();
        fetchDepartments();
    }, []);

    // ===================== COLLEGE HANDLERS =====================
    const fetchColleges = async () => {
        try {
            setLoadingColleges(true);
            const data = await collegeService.getColleges();
            setColleges(data);
        } catch (error) {
            console.error('Failed to load colleges', error);
            toast.error('Failed to load colleges');
        } finally {
            setLoadingColleges(false);
        }
    };

    const handleApproveCollege = async (id: string | number) => {
        try {
            await collegeService.approveCollege(id);
            toast.success('College approved');
            fetchColleges();
        } catch { toast.error('Failed to approve college'); }
    };

    const handleRejectCollege = async (id: string | number) => {
        try {
            await collegeService.rejectCollege(id);
            toast.success('College rejected');
            fetchColleges();
        } catch { toast.error('Failed to reject college'); }
    };

    const handleAddCollege = async () => {
        if (!newCollegeName.trim()) { toast.error('Please enter a college name'); return; }
        try {
            setAddingCollege(true);
            await collegeService.createCollege({ name: newCollegeName.trim() });
            toast.success('College added successfully');
            setNewCollegeName('');
            setShowAddCollegeDialog(false);
            fetchColleges();
        } catch { toast.error('Failed to add college'); }
        finally { setAddingCollege(false); }
    };

    const handleDeleteCollege = async (id: string | number) => {
        try {
            await collegeService.deleteCollege(id);
            toast.success('College deleted');
            fetchColleges();
        } catch { toast.error('Failed to delete college'); }
    };

    // ===================== DEPARTMENT HANDLERS =====================
    const fetchDepartments = async () => {
        try {
            setLoadingDepts(true);
            const data = await collegeService.getDepartments();
            setDepartments(data);
        } catch (error) {
            console.error('Failed to load departments', error);
            toast.error('Failed to load departments');
        } finally {
            setLoadingDepts(false);
        }
    };

    const handleApproveDept = async (id: string | number) => {
        try {
            await collegeService.approveDepartment(id);
            toast.success('Department approved');
            fetchDepartments();
        } catch { toast.error('Failed to approve department'); }
    };

    const handleRejectDept = async (id: string | number) => {
        try {
            await collegeService.rejectDepartment(id);
            toast.success('Department rejected');
            fetchDepartments();
        } catch { toast.error('Failed to reject department'); }
    };

    const handleAddDept = async () => {
        if (!newDeptName.trim()) { toast.error('Please enter a department name'); return; }
        try {
            setAddingDept(true);
            await collegeService.createDepartment({ name: newDeptName.trim() });
            toast.success('Department added successfully');
            setNewDeptName('');
            setShowAddDeptDialog(false);
            fetchDepartments();
        } catch { toast.error('Failed to add department'); }
        finally { setAddingDept(false); }
    };

    const handleDeleteDept = async (id: string | number) => {
        try {
            await collegeService.deleteDepartment(id);
            toast.success('Department deleted');
            fetchDepartments();
        } catch { toast.error('Failed to delete department'); }
    };

    // ===================== COMPUTED =====================
    const pendingColleges = colleges.filter(c => c.verification_status === 'pending');
    const approvedColleges = colleges.filter(c => c.verification_status === 'approved');
    const pendingDepts = departments.filter(d => d.verification_status === 'pending');
    const approvedDepts = departments.filter(d => d.verification_status === 'approved');

    // ===================== RENDER HELPERS =====================
    const renderCollegeRow = (college: College) => (
        <div key={college.id} className="flex items-center justify-between px-5 py-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50">
                    <Building2 className="h-4 w-4 text-[#F97316]" />
                </div>
                <div className="flex items-center gap-2">
                    <div>
                        <div className="font-semibold text-gray-900">{college.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Added {new Date(college.created_at).toLocaleDateString()}</div>
                    </div>
                    {college.verification_status === 'approved' && <Badge className="bg-emerald-100 text-emerald-700 border-0">Approved</Badge>}
                    {college.verification_status === 'pending' && <Badge className="bg-orange-100 text-orange-700 border-0">Pending</Badge>}
                    {college.verification_status === 'rejected' && <Badge className="bg-red-100 text-red-700 border-0">Rejected</Badge>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {college.verification_status === 'pending' && (
                    <>
                        <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleApproveCollege(college.id)}>Approve</Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRejectCollege(college.id)}>Reject</Button>
                    </>
                )}
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-500" onClick={() => handleDeleteCollege(college.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );

    const renderDeptRow = (dept: Department) => (
        <div key={dept.id} className="flex items-center justify-between px-5 py-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                    <GraduationCap className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex items-center gap-2">
                    <div>
                        <div className="font-semibold text-gray-900">{dept.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Added {new Date(dept.created_at).toLocaleDateString()}</div>
                    </div>
                    {dept.verification_status === 'approved' && <Badge className="bg-emerald-100 text-emerald-700 border-0">Approved</Badge>}
                    {dept.verification_status === 'pending' && <Badge className="bg-orange-100 text-orange-700 border-0">Pending</Badge>}
                    {dept.verification_status === 'rejected' && <Badge className="bg-red-100 text-red-700 border-0">Rejected</Badge>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {dept.verification_status === 'pending' && (
                    <>
                        <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleApproveDept(dept.id)}>Approve</Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRejectDept(dept.id)}>Reject</Button>
                    </>
                )}
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-500" onClick={() => handleDeleteDept(dept.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );

    const renderEmptyState = (icon: React.ElementType, title: string, subtitle: string) => {
        const Icon = icon;
        return (
            <Card className="border border-gray-200">
                <CardContent className="py-12 text-center">
                    <Icon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">{title}</p>
                    <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <RoleHeader
                        title="Colleges & Departments"
                        subtitle="Manage colleges and departments for contest eligibility"
                        actions={
                            <div className="flex gap-2">
                                <Button onClick={() => setShowAddDeptDialog(true)} variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Department
                                </Button>
                                <Button onClick={() => setShowAddCollegeDialog(true)} className="bg-[#F97316] hover:bg-[#EA580C] text-white shadow-sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add College
                                </Button>
                            </div>
                        }
                    />
                    <div className="px-6 py-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <StatsCard label="Total Colleges" value={colleges.length} icon={Building2} colorScheme="blue" />
                            <StatsCard label="Approved Colleges" value={approvedColleges.length} icon={CheckCircle} colorScheme="green" />
                            <StatsCard label="Total Departments" value={departments.length} icon={GraduationCap} colorScheme="purple" />
                            <StatsCard label="Pending Review" value={pendingColleges.length + pendingDepts.length} icon={Clock} colorScheme="orange" />
                        </div>

                        {/* Top-level tabs: Colleges | Departments */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="mb-6">
                                <TabsTrigger value="colleges" className="gap-1.5">
                                    <Building2 className="h-4 w-4" />
                                    Colleges ({colleges.length})
                                </TabsTrigger>
                                <TabsTrigger value="departments" className="gap-1.5">
                                    <GraduationCap className="h-4 w-4" />
                                    Departments ({departments.length})
                                    {pendingDepts.length > 0 && (
                                        <span className="ml-1 bg-orange-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 inline-flex items-center justify-center px-1.5">
                                            {pendingDepts.length}
                                        </span>
                                    )}
                                </TabsTrigger>
                            </TabsList>

                            {/* ========== COLLEGES TAB ========== */}
                            <TabsContent value="colleges">
                                {loadingColleges ? (
                                    <div className="flex items-center justify-center py-16">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316]"></div>
                                    </div>
                                ) : colleges.length === 0 ? (
                                    renderEmptyState(Building2, 'No colleges yet', 'Add a college to get started')
                                ) : (
                                    <div className="space-y-2">{colleges.map(renderCollegeRow)}</div>
                                )}
                            </TabsContent>

                            {/* ========== DEPARTMENTS TAB ========== */}
                            <TabsContent value="departments">
                                {loadingDepts ? (
                                    <div className="flex items-center justify-center py-16">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                                    </div>
                                ) : departments.length === 0 ? (
                                    renderEmptyState(GraduationCap, 'No departments yet', 'Add a department to get started')
                                ) : (
                                    <div className="space-y-2">{departments.map(renderDeptRow)}</div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Add College Dialog */}
            <Dialog open={showAddCollegeDialog} onOpenChange={setShowAddCollegeDialog}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Add New College</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            The college will be added as verified and immediately available for contest restrictions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="College / University name"
                            value={newCollegeName}
                            onChange={(e) => setNewCollegeName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddCollege(); }}
                            className="h-11"
                            autoFocus
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => { setShowAddCollegeDialog(false); setNewCollegeName(''); }}>Cancel</Button>
                        <Button onClick={handleAddCollege} disabled={addingCollege || !newCollegeName.trim()} className="bg-[#F97316] hover:bg-[#EA580C] text-white">
                            {addingCollege ? 'Adding...' : 'Add College'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Department Dialog */}
            <Dialog open={showAddDeptDialog} onOpenChange={setShowAddDeptDialog}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Add New Department</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            The department will be added as verified and available for contest restrictions and student profiles.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="e.g. Computer Science & Engineering"
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddDept(); }}
                            className="h-11"
                            autoFocus
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => { setShowAddDeptDialog(false); setNewDeptName(''); }}>Cancel</Button>
                        <Button onClick={handleAddDept} disabled={addingDept || !newDeptName.trim()} className="bg-purple-600 hover:bg-purple-700 text-white">
                            {addingDept ? 'Adding...' : 'Add Department'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
