import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { HODSidebar } from '@/components/hod/HODSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { batchService, Batch } from '@/services/batchService';
import { semesterService, Semester } from '@/services/semesterService';
import { Section } from '@/services/sectionService';
import subjectService, { SemesterSubject } from '@/services/subjectService';
import { facultyService, FacultyProfile } from '@/services/facultyService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, Layers, BookOpen, 
  ChevronRight, Calendar, Users, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Faculty = () => {
  const { user } = useAuth();
  
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [currentSemester, setCurrentSemester] = useState<Semester | null>(null);
  const [loadingSemester, setLoadingSemester] = useState(false);
  
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [semesterSubjects, setSemesterSubjects] = useState<SemesterSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  
  const [collegeFaculties, setCollegeFaculties] = useState<FacultyProfile[]>([]);
  
  // Track assigning state per subject assignment
  const [assigningState, setAssigningState] = useState<Record<string, boolean>>({});

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
        const [batchesData, facultiesData] = await Promise.all([
          batchService.getBatches(departmentId),
          facultyService.getFaculties(collegeId)
        ]);
        setBatches(batchesData);
        setCollegeFaculties(facultiesData);
      } catch (error) {
        console.error("Failed to fetch initial data", error);
        toast.error("Failed to load department batches");
      } finally {
        setLoadingBatches(false);
      }
    };
    
    fetchInitialData();
  }, [user]);

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

  const handleSectionClick = async (section: Section) => {
    if (!currentSemester) return;
    
    setSelectedSection(section);
    setLoadingSubjects(true);
    
    try {
      // Fetch subjects assigned to this semester
      const subjects = await subjectService.getSubjectsForSemester(currentSemester.id);
      setSemesterSubjects(subjects);
    } catch (error) {
      console.error("Failed to fetch subjects", error);
      toast.error("Failed to load section subjects");
    } finally {
      setLoadingSubjects(false);
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
    } catch (error) {
      console.error("Failed to remove assignment", error);
      toast.error("Failed to remove assignment");
    } finally {
      setAssigningState(prev => ({ ...prev, [semesterSubjectId]: false }));
    }
  };

  const renderBatches = () => {
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

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.map(batch => (
          <Card 
            key={batch.id} 
            className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${selectedBatch?.id === batch.id ? 'border-primary ring-1 ring-primary shadow-sm bg-primary/5' : ''}`}
            onClick={() => handleBatchClick(batch)}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${selectedBatch?.id === batch.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{batch.name}</h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    Department batch
                  </p>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 ${selectedBatch?.id === batch.id ? 'text-primary' : 'text-muted-foreground/50'}`} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderSections = () => {
    if (!selectedBatch) return null;

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

    return (
      <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              Sections for {selectedBatch.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Semester {currentSemester.number} {currentSemester.is_current ? '(Current)' : ''}
            </p>
          </div>
          <Badge variant="secondary" className="font-mono">{sections.length} Sections</Badge>
        </div>

        {sections.length === 0 ? (
          <div className="text-center py-8 bg-muted/5 rounded-xl border border-dashed">
            <p className="text-muted-foreground font-medium">No sections found in this semester.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {sections.map((section: any) => (
              <Button
                key={section.id}
                variant={selectedSection?.id === section.id ? "default" : "outline"}
                className={`h-14 px-6 rounded-xl font-bold text-base shadow-sm ${selectedSection?.id === section.id ? 'ring-2 ring-primary/20 ring-offset-2' : ''}`}
                onClick={() => handleSectionClick(section)}
              >
                Section {section.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSubjects = () => {
    if (!selectedSection) return null;

    if (loadingSubjects) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium">Loading subjects...</p>
        </div>
      );
    }

    return (
      <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-2 mb-6 border-b pb-4">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-bold">Faculty Assignment</h2>
            <p className="text-sm text-muted-foreground">
              Assign faculty members to subjects for Section {selectedSection.name}
            </p>
          </div>
        </div>

        {semesterSubjects.length === 0 ? (
          <div className="text-center py-12 bg-muted/5 rounded-xl border border-dashed">
            <p className="text-muted-foreground font-medium">No subjects found for this semester.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 border-b border-gray-200 text-xs tracking-wider text-muted-foreground font-bold">
                <tr>
                  <th className="px-6 py-4">Subject Code</th>
                  <th className="px-6 py-4 w-1/3">Subject Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Assigned Faculty</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {semesterSubjects.map(subject => {
                  const assignmentId = subject.assignment_id || subject.id;
                  const currentAssignment = subject.section_faculties?.find(sf => 
                    sf.section.toString() === selectedSection.id.toString()
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
                        <span className="font-bold text-gray-900 whitespace-normal">
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
                            <span className="font-bold text-gray-900">
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
        )}
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <HODSidebar />
        <div className="flex-1 flex flex-col bg-gray-50/50">
          <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Faculty Management</h1>
              <p className="text-muted-foreground text-lg">
                Assign and manage faculty members for batches and sections in your department.
              </p>
            </div>

            {renderBatches()}
            
            {renderSections()}
            
            {renderSubjects()}

          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Faculty;
