import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Layers, Calendar, ArrowLeft, User, Loader2, UserPlus, UserCheck } from "lucide-react";
import { batchService, Batch } from "@/services/batchService";
import { Department, departmentService } from "@/services/departmentService";
import { Button } from "@/components/ui/button";
import { semesterService } from '@/services/semesterService';
import { Badge } from "@/components/ui/badge";
import BatchDetailSection from './BatchDetailSection';
import AssignHODDialog from './AssignHODDialog';
import CreateHODDialog from './CreateHODDialog';

interface DepartmentDetailViewProps {
  departmentId: string | number;
  onBack: () => void;
}

const BatchCard: React.FC<{ batch: Batch; onClick: () => void }> = ({ batch, onClick }) => {
    const [currentSemester, setCurrentSemester] = useState<string>("Semester info...");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSemesters = async () => {
            try {
                setLoading(true);
                const semesters = await semesterService.getSemesters(batch.id);
                const current = semesters.find(s => s.is_current);
                if (current) {
                    const suffix = getOrdinal(current.number);
                    setCurrentSemester(`${current.number}${suffix} semester`);
                } else {
                    setCurrentSemester("No active semester");
                }
            } catch (err) {
                console.error("Failed to load semesters for batch", batch.id);
            } finally {
                setLoading(false);
            }
        };
        loadSemesters();
    }, [batch.id]);

    const getOrdinal = (num: number) => {
        const j = num % 10, k = num % 100;
        if (j === 1 && k !== 11) return "st";
        if (j === 2 && k !== 12) return "nd";
        if (j === 3 && k !== 13) return "rd";
        return "th";
    };

    return (
        <Card 
            className="group hover:shadow-md transition-all border-gray-100 cursor-pointer hover:border-gray-200 overflow-hidden relative rounded-xl bg-white ring-1 ring-gray-100/50"
            onClick={onClick}
        >
            <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 transition-colors">
                    <Calendar className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 text-sm truncate">{batch.name}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                        {loading ? "..." : currentSemester}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

const DepartmentDetailView: React.FC<DepartmentDetailViewProps> = ({ departmentId, onBack }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  
  const [isAssignHODOpen, setIsAssignHODOpen] = useState(false);
  const [isCreateHODOpen, setIsCreateHODOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchesData, deptData] = await Promise.all([
          batchService.getBatches(departmentId),
          departmentService.getDepartment(departmentId)
      ]);
      setBatches(batchesData);
      setDepartment(deptData);
    } catch (err) {
      console.error("Failed to load department data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [departmentId]);

  if (loading || !department) {
    return (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">Initializing overview...</p>
        </div>
    );
  }

  if (selectedBatch) {
      return (
          <BatchDetailSection 
            batch={selectedBatch} 
            onBack={() => setSelectedBatch(null)} 
          />
      );
  }

  const hod = department.hod_details;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onBack} 
          className="h-10 w-10 rounded-xl border-gray-200 hover:bg-muted transition-all shadow-sm"
        >
            <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
            <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground">{department.name}</h2>
                <Badge variant="outline" className="bg-muted/30 text-muted-foreground border-gray-200 font-medium rounded-lg">
                    {department.short_form || "dept"}
                </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-medium italic">Overview of all academic departments</p>
        </div>
      </div>

      {/* Grid Layout for Stats & HOD */}
      <div className="grid grid-cols-1 gap-6">
          {/* HOD Card */}
          <Card className="overflow-hidden border-gray-100 shadow-sm bg-white rounded-2xl ring-1 ring-gray-100/50">
            <CardContent className="p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-gray-100 overflow-hidden shadow-inner font-bold">
                            {hod?.user_details.profile?.profile_image ? (
                                <img src={hod.user_details.profile.profile_image} alt="HOD" className="h-full w-full object-cover" />
                            ) : (
                                <User className="h-10 w-10" />
                            )}
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-1 block">
                                Head of department
                            </span>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {hod ? `${hod.user_details.first_name} ${hod.user_details.last_name}` : "Not Assigned"}
                            </h3>
                            {hod && (
                                <p className="text-sm text-muted-foreground mt-1 font-medium">{hod.user_details.email}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button 
                            variant="outline" 
                            className="rounded-xl font-bold text-xs h-10 border-gray-200 hover:bg-muted flex items-center gap-2"
                            onClick={() => setIsAssignHODOpen(true)}
                        >
                            <UserCheck className="h-4 w-4" />
                            Assign faculty as HOD
                        </Button>
                        <Button 
                            className="bg-foreground text-background hover:bg-foreground/90 rounded-xl font-bold text-xs h-10 flex items-center gap-2 shadow-sm"
                            onClick={() => setIsCreateHODOpen(true)}
                        >
                            <UserPlus className="h-4 w-4" />
                            Create new HOD
                        </Button>
                    </div>
                </div>
            </CardContent>
          </Card>
      </div>

      {/* Batches Section */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <Layers className="h-5 w-5 text-muted-foreground" />
                Department batches
            </h3>
            <Badge variant="secondary" className="bg-muted text-muted-foreground font-bold border-none rounded-lg">
                {batches.length} batches
            </Badge>
        </div>
        
        {batches.length === 0 ? (
            <div className="text-center py-16 bg-muted/5 rounded-2xl border border-dashed border-gray-100 flex flex-col items-center">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground/30 mb-4 shadow-inner ring-1 ring-gray-100">
                    <Layers className="h-8 w-8" />
                </div>
                <h4 className="text-lg font-bold text-muted-foreground italic">No batches found for this department.</h4>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {batches.map((batch) => (
                    <BatchCard 
                        key={batch.id} 
                        batch={batch} 
                        onClick={() => setSelectedBatch(batch)} 
                    />
                ))}
            </div>
        )}
      </div>

      <AssignHODDialog 
        isOpen={isAssignHODOpen}
        onClose={() => setIsAssignHODOpen(false)}
        departmentId={departmentId}
        departmentName={department.name}
        onAssigned={loadData}
      />

      <CreateHODDialog 
        isOpen={isCreateHODOpen}
        onClose={() => setIsCreateHODOpen(false)}
        departmentId={departmentId}
        departmentName={department.name}
        onCreated={loadData}
      />
    </div>
  );
};

export default DepartmentDetailView;
