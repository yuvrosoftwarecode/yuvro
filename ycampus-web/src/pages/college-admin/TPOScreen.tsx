import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { tpoService, TPOProfile } from '@/services/tpoService';
import TPOList from '@/components/college-admin/tpo/TPOList';
import TPOForm from '@/components/college-admin/tpo/TPOForm';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TPOScreen: React.FC = () => {
    const { user } = useAuth();
    const [tpos, setTPOs] = useState<TPOProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedTPO, setSelectedTPO] = useState<TPOProfile | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadTPOs();
    }, []);

    const loadTPOs = async () => {
        try {
            setLoading(true);
            const collegeId = (user as any)?.college_id;
            const data = await tpoService.getTPOs(collegeId);
            setTPOs(data);
        } catch (err) {
            console.error("Failed to load TPOs", err);
            toast.error("Failed to load TPOs");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setSelectedTPO(null);
        setIsFormOpen(true);
    };

    const handleEdit = (tpo: TPOProfile) => {
        setSelectedTPO(tpo);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this TPO member? This will also delete their user account permanently.")) {
            return;
        }

        try {
            await tpoService.deleteTPO(id);
            toast.success("TPO record removed successfully");
            loadTPOs();
        } catch (err) {
            console.error("Failed to delete TPO", err);
            toast.error("Failed to remove TPO member");
        }
    };

    const handleSubmit = async (data: any) => {
        try {
            setSaving(true);
            if (selectedTPO) {
                await tpoService.updateTPO(selectedTPO.id, data);
                toast.success("TPO member updated successfully");
            } else {
                await tpoService.createTPO(data);
                toast.success("New TPO member onboarded");
            }
            setIsFormOpen(false);
            loadTPOs();
        } catch (err: any) {
            console.error("Failed to save TPO", err);
            const message = err.response?.data?.error || "An error occurred while saving the record";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const headerActions = [
        <Button key="add-tpo" onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 gap-2 px-8 py-6 h-auto rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] font-black uppercase text-[11px] tracking-widest border-none">
            <Plus className="h-5 w-5" />
            Onboard TPO
        </Button>
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1 flex flex-col h-screen overflow-hidden">
                    <RoleHeader
                        title="TPO Management"
                        subtitle="Maintain records and directory of all TPO staff"
                        actions={headerActions}
                    />

                    <main className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                            <TPOList
                                tpos={tpos}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                loading={loading}
                            />
                        </div>
                    </main>
                </div>
            </div>

            <TPOForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSubmit}
                tpo={selectedTPO}
                loading={saving}
            />
        </div>
    );
};

export default TPOScreen;
