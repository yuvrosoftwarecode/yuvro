import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RoleSidebar from '../../components/common/RoleSidebar';
import PageHeader from '../../components/common/PageHeader';
import { getFacultyAssignments, SectionSubjectFaculty } from '../../services/subjectService';
import { BookOpen, Users, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Attendance: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                setLoading(true);
                // Passing empty string or null will trigger the backend 'faculty__user=request.user' filter for faculty role
                const data = await getFacultyAssignments(); 
                setAssignments(data);
            } catch (err) {
                console.error("Failed to fetch assignments", err);
                toast.error("Failed to load your assigned subjects");
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchAssignments();
        }
    }, [user]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex">
                <RoleSidebar />
                <div className="flex-1">

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <PageHeader 
                            title="Attendance Management" 
                            subtitle="Take and manage attendance for your assigned sections" 
                        />
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="h-10 w-10 text-orange-500 animate-spin mb-4" />
                                <p className="text-gray-500 font-medium">Loading your assignments...</p>
                            </div>
                        ) : assignments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {assignments.map((assignment) => (
                                    <Card 
                                        key={assignment.id} 
                                        className="hover:shadow-lg transition-all border-gray-100 hover:border-orange-200 group overflow-hidden relative flex flex-col h-full bg-white"
                                    >
                                        <CardContent className="p-6 flex flex-col flex-1">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-inner border border-orange-100/50">
                                                    <BookOpen className="h-6 w-6" />
                                                </div>
                                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                                                    {assignment.section_name || "Section"}
                                                </Badge>
                                            </div>

                                            {/* Subject Info */}
                                            <div className="mb-6 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors line-clamp-2 text-lg">
                                                        {assignment.semester_subject_details?.subject_details?.subject_name || "Unknown Subject"}
                                                    </h3>
                                                </div>
                                                
                                                <div className="space-y-1 mt-3">
                                                    <p className="text-xs text-gray-500 flex items-center gap-1.5 capitalize">
                                                        <span className="font-semibold text-gray-700">Branch:</span>
                                                        {assignment.semester_subject_details?.department_name || "N/A"}
                                                    </p>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                                            <span className="font-semibold text-gray-700">Batch:</span>
                                                            {assignment.semester_subject_details?.batch_name || "N/A"}
                                                        </p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                                            <span className="font-semibold text-gray-700">Sem:</span>
                                                            {assignment.semester_subject_details?.semester_number || "N/A"}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-3 pt-2 flex items-center gap-1.5 border-t border-gray-50">
                                                        <Users className="h-4 w-4 text-orange-400" />
                                                        <span className="font-medium">{assignment.student_count || 0}</span>
                                                        <span>Students enrolled</span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Footer/Action */}
                                            <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
                                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span>Last session: Today</span>
                                                </div>
                                                <Button 
                                                    className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm rounded-lg h-9 px-4 text-sm font-semibold group/btn"
                                                    onClick={() => navigate(`/faculty/attendance/${assignment.id}/take`)}
                                                >
                                                    Take Attendance
                                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                        
                                        {/* Bottom Decorator */}
                                        <div className="h-1 w-full bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0" />
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center max-w-2xl mx-auto">
                                <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <BookOpen className="h-10 w-10 text-gray-300" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Assignments Found</h3>
                                <p className="text-gray-500 mb-8">
                                    You don't have any subjects or sections assigned to you for attendance management yet. 
                                    Please contact your Department Administrator (HOD) for assignments.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
