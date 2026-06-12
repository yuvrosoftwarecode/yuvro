import React, { useState, useEffect, useMemo } from 'react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BookOpen, CheckCircle, Search, Loader2, Sparkles, ChevronDown, ChevronRight, Lock, Unlock, Paperclip, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import subjectService, { SectionSubjectFaculty, UnitBasic, SubUnit } from '@/services/subjectService';
import AttachmentHistoryModal from '@/components/faculty/AttachmentHistoryModal';
import SyllabusAttachModal from '@/components/faculty/SyllabusAttachModal';

interface UnitWithExpansion extends UnitBasic {
  subUnits: (SubUnit & { is_unlocked?: boolean })[];
  isExpanded: boolean;
  isLoadingSubUnits: boolean;
}

const Syllabus = () => {
  const [loading, setLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [allAssignments, setAllAssignments] = useState<SectionSubjectFaculty[]>([]);
  
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  const [units, setUnits] = useState<UnitWithExpansion[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [subUnitToConfirm, setSubUnitToConfirm] = useState<{ subUnit: SubUnit; is_unlocked: boolean } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Unit / Sub-Unit / Subject attachment target
  const [attachTarget, setAttachTarget] = useState<{
    type: 'subject' | 'unit' | 'subunit';
    label: string;
    unitId?: string;
    subUnitId?: string;
  } | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const data = await subjectService.getFacultyAssignments();
      setAllAssignments(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load faculty assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 1. Batch filter — deduplicate by NAME (each Batch record = dept+year, same year → same name)
  const uniqueBatches = useMemo(() => {
    const names = new Set<string>();
    allAssignments.forEach(a => {
      const name = a.semester_subject_details?.batch_name;
      if (name) names.add(name);
    });
    return Array.from(names)
      .sort()
      .map(name => ({ id: name, name })); // id === name (the year range string)
  }, [allAssignments]);

  // 2. Department filter — filter by batch_name to get ALL depts for that year
  const uniqueDepartments = useMemo(() => {
    if (!selectedBatch) return [];
    const depts = new Map<string, string>();
    allAssignments
      .filter(a => a.semester_subject_details?.batch_name === selectedBatch)
      .forEach(a => {
        if (a.semester_subject_details?.department_id && a.semester_subject_details?.department_name) {
          depts.set(String(a.semester_subject_details.department_id), a.semester_subject_details.department_name);
        }
      });
    return Array.from(depts.entries()).map(([id, name]) => ({ id, name }));
  }, [allAssignments, selectedBatch]);

  // 3. Subject filter
  const uniqueSubjects = useMemo(() => {
    if (!selectedBatch || !selectedDepartment) return [];
    const subs = new Map<string, { name: string; code?: string }>();
    allAssignments
      .filter(a => 
        a.semester_subject_details?.batch_name === selectedBatch && 
        String(a.semester_subject_details?.department_id) === selectedDepartment
      )
      .forEach(a => {
        const details = a.semester_subject_details?.subject_details;
        if (details) {
          subs.set(String(details.id), { 
            name: details.subject_name || details.name || 'Unknown', 
            code: details.short_code 
          });
        }
      });
    return Array.from(subs.entries()).map(([id, info]) => ({ id, ...info }));
  }, [allAssignments, selectedBatch, selectedDepartment]);

  // 4. Section filter
  const uniqueSections = useMemo(() => {
    if (!selectedBatch || !selectedDepartment || !selectedSubject) return [];
    return allAssignments
      .filter(a => 
        a.semester_subject_details?.batch_name === selectedBatch && 
        String(a.semester_subject_details?.department_id) === selectedDepartment &&
        String(a.semester_subject_details?.subject_details?.id) === selectedSubject
      )
      .map(a => ({ 
        id: String(a.id), 
        sectionId: String(a.section),
        name: a.section_name || `Section ${a.section}`
      }));
  }, [allAssignments, selectedBatch, selectedDepartment, selectedSubject]);

  useEffect(() => {
    if (selectedSubject) {
      loadUnits(selectedSubject);
    } else {
      setUnits([]);
    }
  }, [selectedSubject, selectedSection]);

  const loadUnits = async (subjectId: string) => {
    try {
      setUnitsLoading(true);
      const unitsData = await subjectService.getUnits(subjectId);
      // Sort units by order_index
      const sortedUnits = [...unitsData].sort((a, b) => a.order_index - b.order_index);
      
      setUnits(sortedUnits.map(u => ({
        ...u,
        subUnits: [],
        isExpanded: false,
        isLoadingSubUnits: false
      })));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load units",
        variant: "destructive",
      });
    } finally {
      setUnitsLoading(false);
    }
  };

  const toggleUnit = async (unitId: string) => {
    const unitIndex = units.findIndex(u => u.id === unitId);
    if (unitIndex === -1) return;

    const unit = units[unitIndex];
    
    // Toggle collapse
    if (unit.isExpanded) {
      setUnits(prev => prev.map(u => u.id === unitId ? { ...u, isExpanded: false } : u));
      return;
    }

    // Expand and load sub-units if needed
    if (unit.subUnits.length === 0) {
      try {
        setUnits(prev => prev.map(u => u.id === unitId ? { ...u, isLoadingSubUnits: true, isExpanded: true } : u));
        
        // Find the actual section ID from the selection
        const sectionAssignment = uniqueSections.find(s => s.id === selectedSection);
        const sectionId = sectionAssignment?.sectionId;

        const subUnitsData = await subjectService.getSubUnits(unitId, sectionId);

        // Sort sub-units by order_index
        const sortedSubUnits = [...subUnitsData].sort((a, b) => a.order_index - b.order_index);

        setUnits(prev => prev.map(u => u.id === unitId ? { 
          ...u, 
          subUnits: sortedSubUnits, 
          isLoadingSubUnits: false 
        } : u));
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load sub-units",
          variant: "destructive",
        });
        setUnits(prev => prev.map(u => u.id === unitId ? { ...u, isLoadingSubUnits: false, isExpanded: false } : u));
      }
    } else {
      setUnits(prev => prev.map(u => u.id === unitId ? { ...u, isExpanded: true } : u));
    }
  };

  const handleToggleUnlock = async () => {
    if (!subUnitToConfirm || !selectedSection) return;

    const sectionAssignment = uniqueSections.find(s => s.id === selectedSection);
    const sectionId = sectionAssignment?.sectionId;

    if (!sectionId) return;

    try {
      const { subUnit, is_unlocked } = subUnitToConfirm;
      const targetStatus = !is_unlocked;

      await subjectService.unlockSubUnit(subUnit.id, sectionId, targetStatus);

      // Update local state
      setUnits(prev => prev.map(u => ({
        ...u,
        subUnits: u.subUnits.map(su => su.id === subUnit.id ? { ...su, is_unlocked: targetStatus } : su)
      })));

      toast({
        title: targetStatus ? "Sub-unit Unlocked" : "Sub-unit Locked",
        description: `Successfully ${targetStatus ? 'unlocked' : 'locked'} "${subUnit.name}" for section ${sectionAssignment.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update sub-unit status",
        variant: "destructive",
      });
    } finally {
      setSubUnitToConfirm(null);
    }
  };

  const filteredUnits = units.filter(unit =>
    unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.subUnits.some(su => su.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">Syllabus Management</h1>
            </div>
            <p className="text-muted-foreground">Manage and track unit/sub-unit coverage for your assigned sections.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full text-amber-700 text-xs font-medium animate-pulse">
              <Sparkles className="w-3 h-3" />
              Live Coverage Tracking
            </div>
            <Button
              variant="outline"
              onClick={() => setHistoryOpen(true)}
              className="h-9 px-4 rounded-xl font-semibold text-sm border-gray-200 hover:border-primary/40 hover:bg-primary/5 active:scale-95 transition-all"
            >
              <FolderOpen className="w-4 h-4 mr-1.5 text-amber-500" />
              Attachment History
            </Button>
          </div>
        </div>

        {/* Filters Card */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-gray-50/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wider">Batch</Label>
                <Select value={selectedBatch} onValueChange={(val) => {
                  setSelectedBatch(val);
                  setSelectedDepartment('');
                  setSelectedSubject('');
                  setSelectedSection('');
                }}>
                  <SelectTrigger className="bg-white/50 border-gray-200">
                    <SelectValue placeholder="Identify Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueBatches.map(batch => (
                      <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wider">Department</Label>
                <Select 
                  value={selectedDepartment} 
                  onValueChange={(val) => {
                    setSelectedDepartment(val);
                    setSelectedSubject('');
                    setSelectedSection('');
                  }}
                  disabled={!selectedBatch}
                >
                  <SelectTrigger className="bg-white/50 border-gray-200">
                    <SelectValue placeholder="Choose Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueDepartments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wider">Subject</Label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={(val) => {
                    setSelectedSubject(val);
                    setSelectedSection('');
                  }}
                  disabled={!selectedDepartment}
                >
                  <SelectTrigger className="bg-white/50 border-gray-200">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueSubjects.map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name} {sub.code ? `(${sub.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold tracking-wider">Section</Label>
                <Select 
                  value={selectedSection} 
                  onValueChange={setSelectedSection}
                  disabled={!selectedSubject}
                >
                  <SelectTrigger className="bg-white/50 border-gray-200">
                    <SelectValue placeholder="Target Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueSections.map(sec => (
                      <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Syllabus Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Course Structure
              {selectedSubject && (
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px]">
                  {uniqueSubjects.find(s => s.id === selectedSubject)?.name}
                </Badge>
              )}
            </h3>
            <div className="flex items-center gap-3">
              {selectedBatch && selectedDepartment && selectedSubject && selectedSection && (
                <Button
                  onClick={() => setAttachTarget({
                    type: 'subject',
                    label: `General Attachment`,
                  })}
                  className="h-9 px-4 rounded-xl font-semibold text-sm bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20 active:scale-95 transition-all"
                >
                  <Paperclip className="w-4 h-4 mr-1.5" />
                  Add Attachment
                </Button>
              )}
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search units or sub-units..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-white border-gray-200 shadow-none"
                />
              </div>
            </div>
          </div>

          {unitsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
              <Loader2 className="w-10 h-10 text-primary/40 animate-spin mb-4" />
              <p className="text-muted-foreground font-medium">Loading units...</p>
            </div>
          ) : !selectedSection ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-dashed border-gray-200 group transition-all duration-500 hover:border-primary/30 hover:bg-primary/5">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
                <div className="relative p-5 bg-white shadow-xl rounded-2xl border border-gray-100 group-hover:scale-110 transition-transform duration-500">
                  <BookOpen className="w-10 h-10 text-primary/40 group-hover:text-primary transition-colors duration-500" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900 mb-2">Selection Required</p>
              <p className="text-muted-foreground max-w-sm text-center">
                Select a Batch, Department, Subject, and Section to manage the syllabus.
              </p>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {filteredUnits.length > 0 ? (
                filteredUnits.map((unit) => (
                  <div key={unit.id} className="space-y-2">
                    {/* Unit Row */}
                    <Card 
                      className={`cursor-pointer transition-all border-l-4 ${unit.isExpanded ? 'border-l-primary shadow-sm' : 'border-l-gray-200 hover:border-l-primary/50'}`}
                      onClick={() => toggleUnit(unit.id)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {unit.isExpanded ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                          <div>
                            <p className="font-bold text-foreground">Unit {unit.order_index + 1}: {unit.name}</p>
                            <p className="text-xs text-muted-foreground">{unit.subUnits.length || '...'} Sub-units</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {unit.isLoadingSubUnits && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-3 rounded-lg text-xs font-semibold border-gray-200 hover:border-primary/40 hover:bg-primary/5 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAttachTarget({
                                type: 'unit',
                                label: `Unit ${unit.order_index + 1}: ${unit.name}`,
                                unitId: unit.id,
                              });
                            }}
                          >
                            <Paperclip className="w-3 h-3 mr-1" />
                            Attach
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sub-units Accordion Content */}
                    {unit.isExpanded && !unit.isLoadingSubUnits && (
                      <div className="ml-8 space-y-2 animate-in slide-in-from-top-2 duration-200">
                        {unit.subUnits.map((su) => (
                          <Card key={su.id} className={`group border-none shadow-sm transition-all duration-300 ${su.is_unlocked ? 'bg-emerald-50/30' : 'bg-white'}`}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  {su.is_unlocked ? <Unlock className="w-4 h-4 text-emerald-500" /> : <Lock className="w-4 h-4 text-gray-300" />}
                                  <p className={`font-semibold text-sm truncate ${su.is_unlocked ? 'text-emerald-900' : 'text-gray-900'}`}>
                                    {su.name}
                                  </p>
                                </div>
                                
                              <div className="flex items-center gap-3">
                                  {/* Attach button — placed first, before badge */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-3 rounded-lg text-xs font-semibold border-gray-200 hover:border-primary/40 hover:bg-primary/5 transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAttachTarget({
                                        type: 'subunit',
                                        label: su.name,
                                        unitId: unit.id,
                                        subUnitId: su.id,
                                      });
                                    }}
                                  >
                                    <Paperclip className="w-3 h-3 mr-1" />
                                    Attach
                                  </Button>

                                  <Badge 
                                    variant={su.is_unlocked ? 'default' : 'outline'}
                                    className={`rounded-full px-3 py-0.5 text-[10px] font-bold tracking-wider transition-all duration-300 ${
                                      su.is_unlocked 
                                        ? 'bg-emerald-500 hover:bg-emerald-600 border-none' 
                                        : 'text-gray-400 border-gray-200'
                                    }`}
                                  >
                                    {su.is_unlocked ? 'Unlocked' : 'Locked'}
                                  </Badge>
                                  
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSubUnitToConfirm({ subUnit: su, is_unlocked: !!su.is_unlocked });
                                    }}
                                    variant={su.is_unlocked ? 'outline' : 'default'}
                                    size="sm"
                                    className={`h-8 px-4 rounded-lg font-bold transition-all duration-300 ${
                                      su.is_unlocked
                                        ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                        : 'bg-primary hover:bg-primary/90'
                                    }`}
                                  >
                                    <CheckCircle className={`w-3.5 h-3.5 mr-1.5 ${su.is_unlocked ? 'text-emerald-500' : 'text-white'}`} />
                                    {su.is_unlocked ? 'Revert' : 'Finish'}
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                  <p className="text-muted-foreground font-medium">No units found matching your query.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!subUnitToConfirm} onOpenChange={(open) => !open && setSubUnitToConfirm(null)}>
          <AlertDialogContent className="max-w-md rounded-2xl border-none shadow-2xl p-6 bg-white">
            <AlertDialogHeader className="space-y-3">
              <AlertDialogTitle className="text-xl font-bold text-gray-900">
                Confirm Status Change
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium text-gray-500 leading-relaxed">
                Are you sure you want to mark "{subUnitToConfirm?.subUnit.name}" as {' '}
                <span className="font-bold text-primary italic">
                  {subUnitToConfirm?.is_unlocked ? 'locked' : 'unlocked/completed'}
                </span>?
                {subUnitToConfirm?.is_unlocked 
                  ? " This will hide the sub-unit from students." 
                  : " This will make the sub-unit visible to students of the selected section."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-3 mt-8">
              <AlertDialogCancel className="bg-transparent border-none text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl px-6 font-bold transition-all">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleToggleUnlock}
                className="bg-primary hover:bg-primary/90 text-white px-8 h-11 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                Confirm
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
        <div className="mt-8 opacity-0 pointer-events-none"></div>

        {/* Attachment Modals */}
        <AttachmentHistoryModal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          batches={uniqueBatches}
          allAssignments={allAssignments}
        />

        {/* Unit / Sub-Unit Attach Modal */}
        {attachTarget && (() => {
          // Resolve the batch UUID from allAssignments using the selected batch name
          const assignment = allAssignments.find(a =>
            a.semester_subject_details?.batch_name === selectedBatch &&
            String(a.semester_subject_details?.department_id) === selectedDepartment &&
            String(a.semester_subject_details?.subject_details?.id) === selectedSubject
          );
          const batchId = assignment?.semester_subject_details?.batch_id ||
                          allAssignments.find(a => a.semester_subject_details?.batch_name === selectedBatch)
                            ?.semester_subject_details?.batch_id || selectedBatch;
          const sectionAssignment = uniqueSections.find(s => s.id === selectedSection);
          const sectionId = sectionAssignment?.sectionId || selectedSection;

          return (
            <SyllabusAttachModal
              open={!!attachTarget}
              onClose={() => setAttachTarget(null)}
              onSuccess={() => setHistoryOpen(true)}
              context={{
                type: attachTarget.type,
                label: attachTarget.label,
                unitId: attachTarget.unitId,
                subUnitId: attachTarget.subUnitId,
                subjectId: selectedSubject,
                batchId,
                departmentId: selectedDepartment,
                sectionId,
              }}
            />
          );
        })()}
      </div>
    </FacultyLayout>
  );
};

export default Syllabus;