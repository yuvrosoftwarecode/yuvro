import React, { useState, useEffect, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { HODSidebar } from '@/components/hod/HODSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { batchService, Batch } from '@/services/batchService';
import { semesterService, Semester } from '@/services/semesterService';
import { Section } from '@/services/sectionService';
import subjectService, { SemesterSubject, SectionSubjectFaculty } from '@/services/subjectService';
import { facultyService, FacultyProfile } from '@/services/facultyService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Layers, BookOpen,
  ChevronRight, Calendar, Users, Briefcase, GraduationCap, Building2, Trash2, Eye, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const Faculty = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('faculty');
  const [activeFacultyTab, setActiveFacultyTab] = useState('our');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [currentSemester, setCurrentSemester] = useState<Semester | null>(null);
  const [loadingSemester, setLoadingSemester] = useState(false);

  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [semesterSubjects, setSemesterSubjects] = useState<SemesterSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [collegeFaculties, setCollegeFaculties] = useState<FacultyProfile[]>([]);
  const [allAssignments, setAllAssignments] = useState<SectionSubjectFaculty[]>([]);

  const [expandedFacultyId, setExpandedFacultyId] = useState<string | number | null>(null);

  const toggleExpand = (id: string | number) => {
    setExpandedFacultyId(prev => prev === id ? null : id);
  };

  // Track assigning state per subject assignment
  const [assigningState, setAssigningState] = useState<Record<string, boolean>>({});

  // Dialog States
  const [isFacultyDialogOpen, setIsFacultyDialogOpen] = useState(false);
  const [selectedFacultyDialog, setSelectedFacultyDialog] = useState<FacultyProfile | null>(null);
  const [isDeletingAssignment, setIsDeletingAssignment] = useState<string | number | null>(null);

  const [reassignSubjectTrigger, setReassignSubjectTrigger] = useState<SectionSubjectFaculty | null>(null);
  const [reassignFacultyId, setReassignFacultyId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      const departmentId = user?.department_id;
      const collegeId = user?.college_id;

      if (!departmentId || !collegeId) {
        setLoadingBatches(false);
        return;
      }

      try {
        setLoadingBatches(true);
        const [batchesData, facultiesData, assignmentsData] = await Promise.all([
          batchService.getBatches(departmentId),
          facultyService.getFaculties(collegeId),
          subjectService.getFacultyAssignments()
        ]);
        setBatches(batchesData);
        setCollegeFaculties(facultiesData);
        setAllAssignments(assignmentsData);
      } catch (error) {
        console.error("Failed to fetch initial data", error);
        toast.error("Failed to load department data");
      } finally {
        setLoadingBatches(false);
      }
    };

    fetchInitialData();
  }, [user]);

  useEffect(() => {
    if (batches.length > 0 && !selectedBatch) {
      handleBatchClick(batches[0]);
    }
  }, [batches, selectedBatch]);

  const handleBatchClick = async (batch: Batch) => {
    setSelectedBatch(batch);
    setSelectedSection(null);
    setSemesterSubjects([]);
    setLoadingSemester(true);

    try {
      const semesters = await semesterService.getSemesters(batch.id);
      const active = semesters.find(s => s.is_current) || semesters[0]; // fallback to first if none active

      if (active) {
        // Fetch full semester details to get sections
        const fullSemester = await semesterService.getSemester(active.id);
        setCurrentSemester(fullSemester);
        if (fullSemester.sections && fullSemester.sections.length > 0) {
          handleSectionClick(fullSemester.sections[0], fullSemester.id);
        }
      } else {
        setCurrentSemester(null);
      }
    } catch (error) {
      console.error("Failed to fetch batch semesters", error);
      toast.error("Failed to load semester details");
    } finally {
      setLoadingSemester(false);
    }
  };

  const handleSectionClick = async (section: Section, overrideSemesterId?: string | number) => {
    const sId = overrideSemesterId || currentSemester?.id;
    if (!sId) return;

    setSelectedSection(section);
    setLoadingSubjects(true);

    try {
      const subjects = await subjectService.getSubjectsForSemester(sId);
      setSemesterSubjects(subjects);
    } catch (error) {
      console.error("Failed to fetch subjects", error);
      toast.error("Failed to load section subjects");
    } finally {
      setLoadingSubjects(false);
    }
  };

  const reloadAssignments = async () => {
    try {
      const data = await subjectService.getFacultyAssignments();
      setAllAssignments(data);
    } catch (error) {
      console.error("Failed to reload assignments", error);
    }
  };

  const handleAssignFaculty = async (semesterSubjectId: string | number, facultyId: string) => {
    if (!selectedSection) return;

    setAssigningState(prev => ({ ...prev, [semesterSubjectId]: true }));
    try {
      await subjectService.assignFacultyToSectionSubject({
        semester_subject: semesterSubjectId,
        section: selectedSection.id,
        faculty: facultyId
      });

      toast.success("Faculty member assigned successfully");

      // Reload subjects to reflect the change
      const subjects = await subjectService.getSubjectsForSemester(currentSemester!.id);
      setSemesterSubjects(subjects);
      await reloadAssignments();
    } catch (error: any) {
      console.error("Failed to assign faculty", error);
      toast.error(error.response?.data?.error || "Failed to assign faculty member");
    } finally {
      setAssigningState(prev => ({ ...prev, [semesterSubjectId]: false }));
    }
  };

  const handleRemoveAssignment = async (assignmentId: string | number, semesterSubjectId: string | number) => {
    setAssigningState(prev => ({ ...prev, [semesterSubjectId]: true }));
    try {
      await subjectService.removeFacultyFromSectionSubject(assignmentId);
      toast.success("Assignment removed");

      // Reload subjects
      const subjects = await subjectService.getSubjectsForSemester(currentSemester!.id);
      setSemesterSubjects(subjects);
      await reloadAssignments();
    } catch (error) {
      console.error("Failed to remove assignment", error);
      toast.error("Failed to remove assignment");
    } finally {
      setAssigningState(prev => ({ ...prev, [semesterSubjectId]: false }));
    }
  };

  const handleRemoveAssignmentFromDialog = async (assignment: SectionSubjectFaculty) => {
    setIsDeletingAssignment(assignment.id);
    try {
      await subjectService.removeFacultyFromSectionSubject(assignment.id);
      toast.success("Assignment removed successfully");

      await reloadAssignments();
      if (currentSemester) {
        const subjects = await subjectService.getSubjectsForSemester(currentSemester.id);
        setSemesterSubjects(subjects);
      }

      setIsFacultyDialogOpen(false);
      setReassignSubjectTrigger(assignment);
      setReassignFacultyId('');
    } catch (error) {
      console.error("Failed to remove assignment", error);
      toast.error("Failed to remove assignment");
    } finally {
      setIsDeletingAssignment(null);
    }
  };

  const submitReassign = async () => {
    if (!reassignSubjectTrigger || !reassignFacultyId) return;

    setIsReassigning(true);
    try {
      await subjectService.assignFacultyToSectionSubject({
        semester_subject: reassignSubjectTrigger.semester_subject,
        section: reassignSubjectTrigger.section,
        faculty: reassignFacultyId
      });
      toast.success("Faculty member reassigned successfully");

      await reloadAssignments();
      if (currentSemester) {
        const subjects = await subjectService.getSubjectsForSemester(currentSemester.id);
        setSemesterSubjects(subjects);
      }

      setReassignSubjectTrigger(null);
    } catch (error: any) {
      console.error("Failed to reassign faculty", error);
      toast.error(error.response?.data?.error || "Failed to reassign faculty member");
    } finally {
      setIsReassigning(false);
    }
  };

  const renderSubjects = () => {
    if (loadingSubjects) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium">Loading subjects...</p>
        </div>
      );
    }

    if (semesterSubjects.length === 0) {
      return (
        <div className="text-center py-12 bg-muted/5 rounded-xl border border-dashed mt-4">
          <p className="text-muted-foreground font-medium">No subjects found for this semester.</p>
        </div>
      );
    }

    const filteredSubjects = semesterSubjects.filter(subject => {
      if (!subjectSearchQuery) return true;
      const q = subjectSearchQuery.toLowerCase();
      const code = (subject.subject_details?.short_code || '').toLowerCase();
      const name = (subject.subject_details?.subject_name || '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });

    if (filteredSubjects.length === 0 && semesterSubjects.length > 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground font-medium">No subjects match your search.</p>
        </div>
      );
    }

    return (
      <div className="w-full overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50/50 border-b border-gray-200 text-s tracking-wider font-semibold">
            <tr>
              <th className="px-6 py-4">Subject Code</th>
              <th className="px-6 py-4">Subject Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Assigned Faculty</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSubjects.map(subject => {
              const assignmentId = subject.assignment_id || subject.id;
              const currentAssignment = subject.section_faculties?.find(sf =>
                sf.section.toString() === selectedSection?.id?.toString()
              );
              const isAssigning = assigningState[assignmentId.toString()];

              return (
                <tr key={subject.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="bg-white font-mono text-xs border-gray-200 text-gray-700">
                      {subject.subject_details?.short_code || "SUBJ"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900 whitespace-normal">
                      {subject.subject_details?.subject_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {subject.is_lab && <Badge variant="secondary" className="text-[10px] h-5">Lab</Badge>}
                      {subject.is_elective && <Badge variant="secondary" className="text-[10px] h-5">Elective</Badge>}
                      {!subject.is_lab && !subject.is_elective && <span className="text-muted-foreground text-xs italic">Core</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {currentAssignment ? (
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Briefcase className="h-3 w-3" />
                        </div>
                        <span className="font-semibold text-gray-900">
                          {currentAssignment.faculty_details?.user_details?.first_name} {currentAssignment.faculty_details?.user_details?.last_name}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full max-w-[250px]">
                        <Select
                          onValueChange={(val) => handleAssignFaculty(assignmentId, val)}
                          disabled={isAssigning}
                        >
                          <SelectTrigger className="h-9 bg-white border-gray-200">
                            <SelectValue placeholder="Select faculty..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {collegeFaculties.map(faculty => (
                              <SelectItem key={faculty.id} value={faculty.id.toString()}>
                                <div className="flex justify-between w-full">
                                  <span>{faculty.user_details.first_name} {faculty.user_details.last_name}</span>
                                  <span className="text-[10px] text-muted-foreground ml-2">
                                    {faculty.department_name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isAssigning ? (
                      <div className="flex items-center justify-end text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </div>
                    ) : currentAssignment ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 px-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveAssignment(currentAssignment.id, assignmentId)}
                        disabled={isAssigning}
                      >
                        Remove
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground italic px-3 hidden md:inline-block">Unassigned</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSectionTabs = () => {
    if (loadingSemester) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium">Loading sections...</p>
        </div>
      );
    }

    if (!currentSemester) {
      return (
        <div className="text-center py-12 bg-muted/5 rounded-xl border border-dashed mt-6">
          <p className="text-muted-foreground font-medium">No active semester found for this batch.</p>
        </div>
      );
    }

    const sections = currentSemester.sections || [];

    if (sections.length === 0) {
      return (
        <div className="text-center py-8 bg-muted/5 rounded-xl border border-dashed mt-6">
          <p className="text-muted-foreground font-medium">No sections found in this semester.</p>
        </div>
      );
    }

    const selectedValue = selectedSection?.id?.toString() || sections[0]?.id?.toString() || "";

    return (
      <Card className="mt-4">
        <CardContent className="p-0">
          <Tabs
            value={selectedValue}
            onValueChange={(val) => {
              const section = sections.find((s: any) => s.id.toString() === val);
              if (section) handleSectionClick(section);
            }}
            className="w-full"
          >
            <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/30">
              <div className="w-full max-w-sm">
                <TabsList
                  className="flex w-full"
                >
                  {sections.map((section: any) => (
                    <TabsTrigger
                      key={section.id}
                      value={section.id.toString()}
                      className="flex-1 font-semibold"
                    >
                      {section.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="relative w-full max-w-sm shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search a subject..."
                  className="pl-9 bg-white"
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {sections.map((section: any) => (
                <TabsContent key={section.id} value={section.id.toString()} className="mt-0 outline-none">
                  {selectedValue === section.id.toString() && renderSubjects()}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    );
  };

  const renderBatchesContent = () => {
    if (loadingBatches) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium">Loading batches...</p>
        </div>
      );
    }

    if (batches.length === 0) {
      return (
        <div className="text-center py-16 bg-muted/5 rounded-2xl border border-dashed flex flex-col items-center">
          <Layers className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-bold text-gray-800">No batches found</h3>
          <p className="text-sm text-muted-foreground">There are no batches in your department yet.</p>
        </div>
      );
    }

    return renderSectionTabs();
  };

  const renderFacultyTable = () => {
    const departmentId = user?.department_id;
    const departmentFaculties = collegeFaculties.filter(f => String(f.department) === String(departmentId));
    const crossDepartmentFaculties = collegeFaculties.filter(f =>
      String(f.department) !== String(departmentId) &&
      allAssignments.some(a => String(a.faculty) === String(f.id) && String(a.semester_subject_details?.department_id) === String(departmentId))
    );
    const activeList = activeFacultyTab === 'our' ? departmentFaculties : crossDepartmentFaculties;

    const filteredFaculties = activeList.filter(faculty => {
      const searchLower = searchQuery.toLowerCase();
      const fullName = `${faculty.user_details.first_name} ${faculty.user_details.last_name}`.toLowerCase();
      return fullName.includes(searchLower) || faculty.user_details.email?.toLowerCase().includes(searchLower);
    });

    return (
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/30">
            <Tabs value={activeFacultyTab} onValueChange={setActiveFacultyTab} className="w-full max-w-sm">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="our" className="font-semibold">Department Faculty</TabsTrigger>
                <TabsTrigger value="other" className="font-semibold">Associated Faculty</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search faculty by name or email..."
                className="pl-9 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 border-b border-gray-200 text-s tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4 w-16 text-center">S.No</th>
                  <th className="px-6 py-4">Faculty Name</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingBatches ? (
                  <tr>
                    <td colSpan={4} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                        <p className="text-muted-foreground font-medium">Loading faculties...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredFaculties.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="h-32 text-center text-muted-foreground">
                      {searchQuery ? "No faculties found matching your search." : "No faculties found in your department."}
                    </td>
                  </tr>
                ) : (
                  filteredFaculties.map((faculty, idx) => {
                    // Check if active
                    const allFacultyAssignments = allAssignments.filter(a => String(a.faculty) === String(faculty.id));
                    const assignments = activeFacultyTab === 'other'
                      ? allFacultyAssignments.filter(a => String(a.semester_subject_details?.department_id) === String(departmentId))
                      : allFacultyAssignments;

                    const isActive = allFacultyAssignments.length > 0;
                    const isExpanded = expandedFacultyId === faculty.id;

                    return (
                      <React.Fragment key={faculty.id}>
                        <tr
                          className={`hover:bg-gray-50/50 transition-colors group cursor-pointer ${isExpanded ? 'bg-gray-50/50' : ''}`}
                          onClick={() => toggleExpand(faculty.id)}
                        >
                          <td className="px-6 py-4 text-center text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <span className="font-semibold text-xs">
                                  {faculty.user_details.first_name?.charAt(0)}{faculty.user_details.last_name?.charAt(0)}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900">
                                  {faculty.user_details.first_name} {faculty.user_details.last_name}
                                </span>
                                <span className="text-xs text-muted-foreground">{faculty.user_details.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : ""}>
                              {isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50/30 border-b border-gray-100">
                            <td colSpan={4} className="p-0">
                              <div className="px-16 py-4">
                                <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                                  Current Teaching Assignments
                                </h4>
                                {assignments.length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic">This faculty member is currently not assigned to any subjects.</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 whitespace-normal">
                                    {assignments.map((assignment, i) => {
                                      const subjectName = assignment.semester_subject_details?.subject_details?.subject_name;
                                      const subjectCode = assignment.semester_subject_details?.subject_details?.short_code;
                                      const sectionName = assignment.section_name || assignment.semester_subject_details?.batch_name;
                                      const batchName = assignment.semester_subject_details?.batch_name;
                                      const semesterNum = assignment.semester_subject_details?.semester_number;
                                      const departmentShortForm = assignment.semester_subject_details?.department_short_form;

                                      return (
                                        <div key={i} className="bg-white border rounded-lg p-3 shadow-sm flex flex-col relative group/card">
                                          <div className="flex items-start justify-between mb-2 gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                              {departmentShortForm && (
                                                <Badge variant="secondary" className="font-mono text-[10px] shrink-0 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                                                  {departmentShortForm}
                                                </Badge>
                                              )}
                                              <Badge variant="outline" className="font-mono text-[10px] shrink-0">{subjectCode || 'SUBJ'}</Badge>
                                              <span className="font-semibold text-sm truncate" title={subjectName}>{subjectName || 'Unknown Subject'}</span>
                                            </div>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveAssignmentFromDialog(assignment);
                                              }}
                                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-md transition-colors shrink-0"
                                              title="Remove Assignment"
                                              disabled={isDeletingAssignment === assignment.id}
                                            >
                                              {isDeletingAssignment === assignment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </button>
                                          </div>
                                          <div className="mt-auto pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                            <div>
                                              <span className="block font-semibold text-gray-700">Batch</span>
                                              <span className="truncate block" title={batchName}>{batchName || 'Unknown'}</span>
                                            </div>
                                            <div>
                                              <span className="block font-semibold text-gray-700">Section</span>
                                              {sectionName || 'Unknown'} (Sem {semesterNum})
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const selectedFacultyAssignments = useMemo(() => {
    if (!selectedFacultyDialog) return [];
    return allAssignments.filter(a => String(a.faculty) === String(selectedFacultyDialog.id));
  }, [allAssignments, selectedFacultyDialog]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <HODSidebar />
        <div className="flex-1 flex flex-col bg-gray-50/50">
          <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Faculty Management</h1>
              <p className="text-muted-foreground text-lg">
                Assign and manage faculty members for batches and sections in your department.
              </p>
            </div>

            <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 mb-8">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-[400px]">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="faculty" className="font-semibold">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Faculty
                  </TabsTrigger>
                  <TabsTrigger value="batch" className="font-semibold">
                    <Layers className="h-4 w-4 mr-2" />
                    Batches
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {activeTab === 'batch' && batches.length > 0 && !loadingBatches && (
                <div className="flex-1 w-full overflow-x-auto scrollbar-hide">
                  <Tabs
                    value={selectedBatch?.id?.toString() || batches[0]?.id?.toString() || ""}
                    onValueChange={(val) => {
                      const batch = batches.find(b => b.id.toString() === val);
                      if (batch) handleBatchClick(batch);
                    }}
                    className="w-full min-w-max"
                  >
                    <div className="flex w-full items-center justify-between bg-muted p-1 rounded-md">
                      <TabsList className="inline-flex h-auto p-0 bg-transparent">
                        {batches.map(batch => (
                          <TabsTrigger
                            key={batch.id}
                            value={batch.id.toString()}
                            className="font-semibold px-6 py-2"
                          >
                            {batch.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {currentSemester && (
                        <div className="px-4 text-sm font-bold text-gray-800 whitespace-nowrap">
                          Semester {currentSemester.number} {currentSemester.is_current ? '(Current)' : ''}
                        </div>
                      )}
                    </div>
                  </Tabs>
                </div>
              )}
            </div>

            <div className="animate-in fade-in duration-500">
              {activeTab === 'batch' && renderBatchesContent()}
              {activeTab === 'faculty' && renderFacultyTable()}
            </div>

          </main>
        </div>
      </div>

      {/* Faculty Details / Delete Dialog */}
      <Dialog open={isFacultyDialogOpen} onOpenChange={setIsFacultyDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Faculty Assignments</DialogTitle>
            <DialogDescription>
              {selectedFacultyDialog?.user_details?.first_name} {selectedFacultyDialog?.user_details?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {selectedFacultyAssignments.length === 0 ? (
              <div className="text-center py-8 bg-muted/5 rounded-xl border border-dashed">
                <p className="text-muted-foreground font-medium">This faculty is not assigned to any subjects.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedFacultyAssignments.map(assignment => {
                  const subjectName = assignment.semester_subject_details?.subject_details?.subject_name;
                  const subjectCode = assignment.semester_subject_details?.subject_details?.short_code;
                  const sectionName = assignment.section_name || assignment.semester_subject_details?.batch_name;

                  return (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm hover:border-gray-300 transition-colors">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-[10px]">{subjectCode || 'SUBJ'}</Badge>
                          <span className="font-bold text-sm">{subjectName || 'Unknown Subject'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          {assignment.semester_subject_details?.batch_name} • Section {assignment.section_name || 'Unknown'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200"
                        disabled={isDeletingAssignment === assignment.id}
                        onClick={() => handleRemoveAssignmentFromDialog(assignment)}
                      >
                        {isDeletingAssignment === assignment.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsFacultyDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={!!reassignSubjectTrigger} onOpenChange={(open) => !open && setReassignSubjectTrigger(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reassign Subject</DialogTitle>
            <DialogDescription>
              You just removed a faculty from <strong>{reassignSubjectTrigger?.semester_subject_details?.subject_details?.subject_name}</strong>. Do you want to assign a new faculty immediately?
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <Select
              value={reassignFacultyId}
              onValueChange={setReassignFacultyId}
              disabled={isReassigning}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a new faculty..." />
              </SelectTrigger>
              <SelectContent>
                {collegeFaculties.map(faculty => (
                  <SelectItem key={faculty.id} value={faculty.id.toString()}>
                    {faculty.user_details.first_name} {faculty.user_details.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignSubjectTrigger(null)} disabled={isReassigning}>Skip</Button>
            <Button onClick={submitReassign} disabled={!reassignFacultyId || isReassigning}>
              {isReassigning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Assign Faculty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </SidebarProvider>
  );
};

export default Faculty;
