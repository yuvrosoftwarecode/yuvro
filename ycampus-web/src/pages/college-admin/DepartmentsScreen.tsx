import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import RoleSidebar from '@/components/common/RoleSidebar';
import PageHeader from '@/components/common/PageHeader';
import { departmentService, Department } from '@/services/departmentService';
import DepartmentList from '@/components/college-admin/departments/DepartmentList';
import DepartmentDetail from '@/components/college-admin/departments/DepartmentDetail';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';

const DepartmentsScreen: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDept, setSelectedDept] = useState<Department | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        try {
            setLoading(true);
            const collegeId = (user as any)?.college_id;
            const data = await departmentService.getDepartments(collegeId);
            setDepartments(data);
            
            // If ID in URL, select that department
            if (id) {
                const dept = data.find(d => String(d.id) === id);
                if (dept) {
                    setSelectedDept(dept);
                } else {
                    // If ID not found, load specific department
                    try {
                        const specificDept = await departmentService.getDepartment(id);
                        setSelectedDept(specificDept);
                    } catch (e) {
                        toast.error("Department not found");
                        navigate('/college-admin/departments');
                    }
                }
            } else {
                setSelectedDept(null);
            }
        } catch (err) {
            console.error("Failed to load departments", err);
            toast.error("Failed to load departments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id && departments.length > 0) {
            const dept = departments.find(d => String(d.id) === id);
            if (dept) {
                setSelectedDept(dept);
            }
        } else if (!id) {
            setSelectedDept(null);
        }
    }, [id, departments]);

    const handleSelectDepartment = (dept: Department) => {
        setSelectedDept(dept);
        navigate(`/college-admin/departments/${dept.id}`);
    };

    const handleBack = () => {
        setSelectedDept(null);
        navigate('/college-admin/departments');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <PageHeader
                            title="Departments"
                            subtitle="Overview of all academic departments"
                        />
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                            </div>
                        ) : selectedDept ? (
                            <DepartmentDetail 
                                department={selectedDept} 
                                onBack={handleBack} 
                            />
                        ) : (
                            <DepartmentList 
                                departments={departments} 
                                onSelectDepartment={handleSelectDepartment} 
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepartmentsScreen;
