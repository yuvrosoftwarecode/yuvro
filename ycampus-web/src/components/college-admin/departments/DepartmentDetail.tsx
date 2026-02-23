import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Layers, Calendar, ArrowLeft, User, UserPlus, UserCheck } from "lucide-react";
import { batchService, Batch } from "@/services/batchService";
import { Department, departmentService } from "@/services/departmentService";
import { Button } from "@/components/ui/button";
import { AssignHODModal, CreateHODModal } from './HODModals';
import { semesterService, Semester } from '@/services/semesterService';
import BatchDetailView from './BatchDetailView';

interface DepartmentDetailProps {
  department: Department;
  onBack?: () => void;
}

const BatchCard: React.FC<{ batch: Batch; onClick: () => void }> = ({ batch, onClick }) => {
    const [currentSemester, setCurrentSemester] = useState<string>("1st Semester");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSemesters = async () => {
            try {
                const semesters = await semesterService.getSemesters(batch.id);
                const current = semesters.find(s => s.is_current);
                if (current) {
                    setCurrentSemester(`${current.number}${getOrdinalSuffix(current.number)} Semester`);
                } else if (semesters.length > 0) {
                   // If no semester is marked current, but some exist, we could show the first or stay with default
                   // The request says "initially it should show 1st semester"
                }
            } catch (err) {
                console.error("Failed to load semesters for batch", batch.id);
            } finally {
                setLoading(false);
            }
        };
        loadSemesters();
    }, [batch.id]);

    const getOrdinalSuffix = (num: number) => {
        const j = num % 10, k = num % 100;
        if (j === 1 && k !== 11) return "st";
        if (j === 2 && k !== 12) return "nd";
        if (j === 3 && k !== 13) return "rd";
        return "th";
    };

    return (
        <Card 
            className="hover:shadow-md transition-shadow border-orange-100 cursor-pointer hover:border-orange-300"
            onClick={onClick}
        >
            <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Calendar className="h-5 w-5" />
                </div>
                <div>
                    <h4 className="font-semibold text-gray-800">{batch.name}</h4>
                    <p className="text-xs text-orange-600 font-medium">
                        {loading ? "Loading..." : currentSemester}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

const DepartmentDetail: React.FC<DepartmentDetailProps> = ({ department, onBack }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignHOD, setShowAssignHOD] = useState(false);
  const [showCreateHOD, setShowCreateHOD] = useState(false);
  const [currentDept, setCurrentDept] = useState<Department>(department);
  const [selectedBatchId, setSelectedBatchId] = useState<string | number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [batchesData, deptData] = await Promise.all([
            batchService.getBatches(department.id),
            departmentService.getDepartment(department.id)
        ]);
        setBatches(batchesData);
        setCurrentDept(deptData);
      } catch (err) {
        console.error("Failed to load department data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [department.id]);

  const reloadDepartment = async () => {
    try {
        const data = await departmentService.getDepartment(department.id);
        setCurrentDept(data);
    } catch (err) {
        console.error(err);
    }
  };

  const hod = currentDept.hod_details;

  if (selectedBatchId) {
    return (
        <BatchDetailView 
            batchId={selectedBatchId} 
            collegeId={currentDept.college}
            onBack={() => setSelectedBatchId(null)} 
        />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-orange-50 hover:text-orange-600">
                <ArrowLeft className="h-5 w-5" />
            </Button>
            )}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{currentDept.name}</h2>
                <p className="text-sm text-gray-500">{currentDept.short_form}</p>
            </div>
        </div>
      </div>

      {/* HOD Section */}
      <Card className="bg-gradient-to-r from-orange-50 to-white border-orange-100">
        <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 overflow-hidden border-2 border-white shadow-sm">
                        {hod?.user_details.profile?.profile_image ? (
                            <img src={hod.user_details.profile.profile_image} alt="HOD" className="h-full w-full object-cover" />
                        ) : (
                            <User className="h-8 w-8" />
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Head of Department</p>
                        <h3 className="text-xl font-bold text-gray-900">
                            {hod ? `${hod.user_details.first_name} ${hod.user_details.last_name}` : "Not Assigned"}
                        </h3>
                        {hod && <p className="text-sm text-gray-500">{hod.user_details.email}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-white hover:bg-orange-50"
                        onClick={() => setShowAssignHOD(true)}
                    >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Assign Faculty as HOD
                    </Button>
                    <Button 
                        variant="default" 
                        size="sm" 
                        className="bg-orange-600 hover:bg-orange-700"
                        onClick={() => setShowCreateHOD(true)}
                    >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create New HOD
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Layers className="h-5 w-5 text-orange-500" />
            Department Batches
        </h3>
        
        {loading ? (
            <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
        ) : batches.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No batches found for this department.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((batch) => (
                <BatchCard 
                    key={batch.id} 
                    batch={batch} 
                    onClick={() => setSelectedBatchId(batch.id)} 
                />
            ))}
            </div>
        )}
      </div>

      <AssignHODModal 
        isOpen={showAssignHOD} 
        onClose={() => setShowAssignHOD(false)} 
        departmentId={currentDept.id}
        onSuccess={reloadDepartment}
      />
      <CreateHODModal 
        isOpen={showCreateHOD} 
        onClose={() => setShowCreateHOD(false)} 
        departmentId={currentDept.id}
        onSuccess={reloadDepartment}
      />
    </div>
  );
};

export default DepartmentDetail;
