import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import RoleSidebar from "../../components/common/RoleSidebar";
import RoleHeader from "../../components/common/RoleHeader";
import CollegeList from "../../components/instructor/colleges/CollegeList";

const Colleges: React.FC = () => {
    const { user } = useAuth();

    if (user?.role !== 'admin') {
        return <div className="p-8 text-center text-red-500 font-bold">Access Denied: Admin role required</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <RoleHeader
                        title="Colleges"
                        subtitle="Manage institutional profiles and their departments"
                    />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <CollegeList />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Colleges;
