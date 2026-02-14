import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleSidebar from '@/components/common/RoleSidebar';
import RoleHeader from '@/components/common/RoleHeader';
import { departmentService, Department } from '@/services/departmentService';
import DepartmentList from '@/components/college-admin/departments/DepartmentList';
import DepartmentDetail from '@/components/college-admin/departments/DepartmentDetail';
import { toast } from 'sonner';

const DepartmentsScreen: React.FC = () => {
    const { user } = useAuth();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDept, setSelectedDept] = useState<Department | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        try {
            setLoading(true);
            // Assuming user has college_id from the profile
            const collegeId = (user as any)?.college_id;
            const data = await departmentService.getDepartments(collegeId);
            setDepartments(data);
        } catch (err) {
            console.error("Failed to load departments", err);
            toast.error("Failed to load departments");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <RoleHeader
                        title="Departments"
                        subtitle="Overview of all academic departments"
                    />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                            </div>
                        ) : selectedDept ? (
                            <DepartmentDetail 
                                department={selectedDept} 
                                onBack={() => setSelectedDept(null)} 
                            />
                        ) : (
                            <DepartmentList 
                                departments={departments} 
                                onSelectDepartment={setSelectedDept} 
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepartmentsScreen;
