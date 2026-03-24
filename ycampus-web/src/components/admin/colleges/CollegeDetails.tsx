import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { collegeService, College } from "@/services/collegeService";
import { toast } from "sonner";
import { ArrowLeft, GraduationCap, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import Academics from "./Academics";
import Management from "./Management";
import RoleSidebar from "../../common/RoleSidebar";
import PageHeader from "../../common/PageHeader";

const CollegeDetails: React.FC = () => {
    const { collegeId } = useParams<{ collegeId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Determine active tab based on URL
    const isAcademics = location.pathname.endsWith("/academic");
    const [activeTab, setActiveTab] = useState<"management" | "academics">(isAcademics ? "academics" : "management");

    const [college, setCollege] = useState<College | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!collegeId) return;
        
        if (location.pathname.endsWith("/academic")) {
            setActiveTab("academics");
        } else if (location.pathname.endsWith("/management")) {
            setActiveTab("management");
        } else if (location.pathname.endsWith(`/${collegeId}`) || location.pathname.endsWith(`/${collegeId}/`)) {
            // Redirect root college detail to management by default, maintaining specific URL
            navigate(`/admin/colleges/${collegeId}/management`, { replace: true });
        }
    }, [location.pathname, collegeId, navigate]);

    useEffect(() => {
        const loadCollege = async () => {
            if (!collegeId) return;
            try {
                setLoading(true);
                const data = await collegeService.getCollege(collegeId);
                setCollege(data);
            } catch (err) {
                console.error("Failed to load college", err);
                toast.error("Failed to load college details");
                navigate("/admin/colleges");
            } finally {
                setLoading(false);
            }
        };
        loadCollege();
    }, [collegeId, navigate]);

    const handleTabChange = (tab: "management" | "academics") => {
        setActiveTab(tab);
        if (tab === "academics") {
            navigate(`/admin/colleges/${collegeId}/academic`);
        } else {
            navigate(`/admin/colleges/${collegeId}/management`);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50 flex">
                <RoleSidebar />
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <PageHeader title="Loading..." actions={null} />
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                            <p className="text-gray-500 font-medium">Loading college details...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!college) return null;

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-0">
                        <PageHeader
                            title={college.name}
                            subtitle="Institutional Management & Academics"
                            actions={
                                <Button
                                    variant="outline"
                                    onClick={() => navigate("/admin/colleges")}
                                    className="h-10 px-4 border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 rounded-lg hover:bg-slate-50"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to Colleges
                                </Button>
                            }
                        />
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-0">
                        {/* Sleek Nav Bar */}
                        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/60 shadow-sm w-fit mb-8">
                            <button
                                onClick={() => handleTabChange("management")}
                                className={`
                                    flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all duration-300
                                    ${activeTab === "management"
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    }
                                `}
                            >
                                <Settings className="h-4 w-4" />
                                MANAGEMENT
                            </button>
                            <button
                                onClick={() => handleTabChange("academics")}
                                className={`
                                    flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all duration-300
                                    ${activeTab === "academics"
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    }
                                `}
                            >
                                <GraduationCap className="h-4 w-4" />
                                ACADEMICS
                            </button>
                        </div>

                        {/* Content Area */}
                        {activeTab === "management" ? (
                            <Management college={college} />
                        ) : (
                            <Academics college={college} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CollegeDetails;
