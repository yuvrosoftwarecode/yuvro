import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import { collegeService, College } from "@/services/collegeService";
import { toast } from "sonner";
import { ArrowLeft, GraduationCap, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import Management from "@/components/admin/colleges/Management";
import Academics from "@/components/admin/colleges/Academics";

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
            navigate(`/admin/college/${collegeId}/management`, { replace: true });
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
                navigate("/admin/college");
            } finally {
                setLoading(false);
            }
        };
        loadCollege();
    }, [collegeId, navigate]);

    const handleTabChange = (tab: "management" | "academics") => {
        setActiveTab(tab);
        if (tab === "academics") {
            navigate(`/admin/college/${collegeId}/academic`);
        } else {
            navigate(`/admin/college/${collegeId}/management`);
        }
    };

    if (loading) {
        return (
            <SidebarProvider>
                <div className="min-h-screen flex w-full">
                    <AdminSidebar />
                    <div className="flex-1 flex flex-col items-center justify-center bg-background">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                        <p className="text-muted-foreground font-medium">Loading college details...</p>
                    </div>
                </div>
            </SidebarProvider>
        );
    }

    if (!college) return null;

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full">
                <AdminSidebar />
                <div className="flex-1 flex flex-col">
                    <main className="flex-1 p-6 md:p-8 bg-background max-w-7xl mx-auto w-full">
                        {/* Page Header Area */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">{college.name}</h1>
                                <p className="text-muted-foreground text-sm mt-1">Institutional Management & Academics</p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => navigate("/admin/college")}
                                className="h-10 text-xs flex items-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Colleges
                            </Button>
                        </div>

                        {/* Top Nav Bar / Tabs */}
                        <div className="flex items-center gap-1 bg-background p-1 rounded-xl border shadow-sm w-fit mb-8">
                            <button
                                onClick={() => handleTabChange("management")}
                                className={`
                                    flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-300
                                    ${activeTab === "management"
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }
                                `}
                            >
                                <Settings className="h-4 w-4" />
                                MANAGEMENT
                            </button>
                            <button
                                onClick={() => handleTabChange("academics")}
                                className={`
                                    flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-300
                                    ${activeTab === "academics"
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }
                                `}
                            >
                                <GraduationCap className="h-4 w-4" />
                                ACADEMICS
                            </button>
                        </div>

                        {/* Content Sub-Route Mapping */}
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Routes>
                                <Route path="/" element={<Navigate to="management" replace />} />
                                <Route path="management" element={<Management college={college} />} />
                                <Route path="academic" element={<Academics college={college} />} />
                            </Routes>
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
};

export default CollegeDetails;
