import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { facultyService, FacultyProfile } from '@/services/facultyService';
import FacultyList from '@/components/college-admin/faculty/FacultyList';
import FacultyForm from '@/components/college-admin/faculty/FacultyForm';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FacultyScreen: React.FC = () => {
    const { user } = useAuth();
    const [faculties, setFaculties] = useState<FacultyProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedFaculty, setSelectedFaculty] = useState<FacultyProfile | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadFaculties();
    }, []);

    const loadFaculties = async () => {
        try {
            setLoading(true);
            const collegeId = (user as any)?.college_id;
            const data = await facultyService.getFaculties(collegeId);
            setFaculties(data);
        } catch (err) {
            console.error("Failed to load faculties", err);
            toast.error("Failed to load faculties");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setSelectedFaculty(null);
        setIsFormOpen(true);
    };

    const handleEdit = (faculty: FacultyProfile) => {
        setSelectedFaculty(faculty);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this faculty member? This will also delete their user account permanently.")) {
            return;
        }

        try {
            await facultyService.deleteFaculty(id);
            toast.success("Faculty record removed successfully");
            loadFaculties();
        } catch (err) {
            console.error("Failed to delete faculty", err);
            toast.error("Failed to remove faculty member");
        }
    };

    const handleSubmit = async (data: any) => {
        try {
            setSaving(true);
            if (selectedFaculty) {
                await facultyService.updateFaculty(selectedFaculty.id, data);
                toast.success("Faculty member updated successfully");
            } else {
                await facultyService.createFaculty(data);
                toast.success("New faculty member onboarded");
            }
            setIsFormOpen(false);
            loadFaculties();
        } catch (err: any) {
            console.error("Failed to save faculty", err);
            const message = err.response?.data?.error || "An error occurred while saving the record";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const headerActions = [
        <Button key="add-faculty" onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 gap-2 px-8 py-6 h-auto rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] font-black uppercase text-[11px] tracking-widest border-none">
            <Plus className="h-5 w-5" />
            Onboard Faculty
        </Button>
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    <RoleHeader
                        title="Faculty Management"
                        subtitle="Maintain records and directory of all academic staff"
                        actions={headerActions}
                    />

                    <main className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                            <FacultyList 
                                faculties={faculties} 
                                onEdit={handleEdit} 
                                onDelete={handleDelete} 
                                loading={loading} 
                            />
                        </div>
                    </main>
                </div>
            </div>

            <FacultyForm 
                isOpen={isFormOpen} 
                onClose={() => setIsFormOpen(false)} 
                onSubmit={handleSubmit} 
                faculty={selectedFaculty} 
                loading={saving} 
            />
        </div>
    );
};

export default FacultyScreen;
