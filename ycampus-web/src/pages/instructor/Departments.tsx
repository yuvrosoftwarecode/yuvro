import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { departmentService, Department } from "@/services/departmentService";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import RoleSidebar from "../../components/common/RoleSidebar";
import RoleHeader from "../../components/common/RoleHeader";

const Departments: React.FC = () => {
    const { user } = useAuth();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals state
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editDeptId, setEditDeptId] = useState<string | number | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | number | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        description: ""
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        try {
            setLoading(true);
            const data = await departmentService.getDepartments();
            setDepartments(data);
        } catch (err) {
            console.error("Failed to load departments", err);
            toast.error("Failed to load departments");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.name.trim()) {
            toast.error("Department name is required");
            return;
        }
        try {
            setSaving(true);
            await departmentService.createDepartment(formData);
            toast.success("Department created successfully");
            setIsAddOpen(false);
            setFormData({ name: "", slug: "", description: "" });
            loadDepartments();
        } catch (err) {
            console.error(err);
            toast.error("Failed to create department");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!editDeptId) return;
        if (!formData.name.trim()) {
            toast.error("Department name is required");
            return;
        }
        try {
            setSaving(true);
            await departmentService.updateDepartment(editDeptId.toString(), formData);
            toast.success("Department updated successfully");
            setIsEditOpen(false);
            setEditDeptId(null);
            setFormData({ name: "", slug: "", description: "" });
            loadDepartments();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update department");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            setDeleting(true);
            await departmentService.deleteDepartment(confirmDelete.toString());
            toast.success("Department deleted successfully");
            setConfirmDelete(null);
            loadDepartments();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete department");
        } finally {
            setDeleting(false);
        }
    };

    const openEditModal = (dept: Department) => {
        setEditDeptId(dept.id);
        setFormData({
            name: dept.name,
            slug: dept.slug || "",
            description: dept.description || ""
        });
        setIsEditOpen(true);
    };

    const headerActions = (
        <Button
            onClick={() => {
                setFormData({ name: "", slug: "", description: "" });
                setIsAddOpen(true);
            }}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
            <Plus className="h-4 w-4 mr-2" />
            Add Department
        </Button>
    );

    if (user?.role !== 'admin') {
        return <div className="p-8 text-center">Access Denied</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <RoleHeader
                        title="Departments"
                        subtitle="Manage academic departments and their organization"
                        actions={headerActions}
                    />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                            </div>
                        ) : departments.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-lg border border-dashed text-gray-500">
                                No departments found. Create one to get started.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {departments.map((dept) => (
                                    <Card key={dept.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                                        <Building2 className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">{dept.name}</h3>
                                                        <p className="text-xs text-gray-500 font-mono">{dept.slug || 'no-slug'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditModal(dept)} className="h-8 w-8">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(dept.id)} className="h-8 w-8 text-red-500">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {dept.description && (
                                                <p className="mt-4 text-sm text-gray-600 line-clamp-2">{dept.description}</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add Modal */}
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Department</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Computer Science"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Slug</Label>
                                    <Input
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                        placeholder="e.g. computer-science"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <textarea
                                        className="w-full border rounded-md p-2 min-h-[100px]"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                <Button disabled={saving} onClick={handleCreate}>
                                    {saving ? "Creating..." : "Create"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Modal */}
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Department</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Slug</Label>
                                    <Input
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <textarea
                                        className="w-full border rounded-md p-2 min-h-[100px]"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                                <Button disabled={saving} onClick={handleUpdate}>
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation */}
                    <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Delete Department</DialogTitle>
                            </DialogHeader>
                            <div className="py-4 text-gray-600">
                                Are you sure you want to delete this department? This will NOT delete subjects associated with it, but they will no longer be linked to this department.
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                                <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
                                    {deleting ? "Deleting..." : "Delete"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
};

export default Departments;
