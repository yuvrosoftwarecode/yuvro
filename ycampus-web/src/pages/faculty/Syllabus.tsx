import React, { useState, useEffect, useMemo } from 'react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BookOpen, CheckCircle, Search, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFacultyAssignments, SectionSubjectFaculty, fetchUnitsBySubject, fetchSubUnitsByUnit } from '@/services/subjectService';

interface Topic {
  id: string;
  name: string;
  unitName?: string;
  status: 'pending' | 'finished';
}

const Syllabus = () => {
  const [loading, setLoading] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [allAssignments, setAllAssignments] = useState<SectionSubjectFaculty[]>([]);
  
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [topicToConfirm, setTopicToConfirm] = useState<Topic | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const data = await getFacultyAssignments();
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
  ],
  '2': [
    {
      id: 'm3',
      name: 'Classical Mechanics',
      topics: [
        { id: 't7', name: 'Newton\'s Laws', status: 'sent' },
        { id: 't8', name: 'Motion in 2D', status: 'pending' },
        { id: 't9', name: 'Energy and Work', status: 'pending' },
      ]
    }
  ],
  '3': [
    {
      id: 'm4',
      name: 'Organic Chemistry',
      topics: [
        { id: 't10', name: 'Hydrocarbons', status: 'finished' },
        { id: 't11', name: 'Functional Groups', status: 'pending' },
        { id: 't12', name: 'Reaction Mechanisms', status: 'pending' },
      ]
    }
  ]
};

const Syllabus = () => {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [topicStatuses, setTopicStatuses] = useState<{ [key: string]: 'pending' | 'sent' | 'finished' }>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [topicToConfirm, setTopicToConfirm] = useState<{ id: string; name: string; currentStatus: 'pending' | 'sent' | 'finished' } | null>(null);
  const { toast } = useToast();

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedModule('');
  };

  // 1. Batch filter
  const uniqueBatches = useMemo(() => {
    const batches = new Set<string>();
    allAssignments.forEach(a => {
      if (a.semester_subject_details?.batch_name) {
        batches.add(a.semester_subject_details.batch_name);
      }
    });
    return Array.from(batches).sort();
  }, [allAssignments]);

  // 2. Department filter (Integrated with Batch)
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

  // 3. Subject filter (Integrated with Batch + Department)
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

  // 4. Section filter (Integrated with Batch + Department + Subject)
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
      loadSyllabus(selectedSubject);
    } else {
      setTopics([]);
    }
  }, [selectedSubject]);

  const loadSyllabus = async (subjectId: string) => {
    try {
      setTopicsLoading(true);
      const units = await fetchUnitsBySubject(subjectId);
      let allTopics: Topic[] = [];
      
      for (const unit of units) {
        const subUnits = await fetchSubUnitsByUnit(unit.id);
        const unitTopics: Topic[] = subUnits.map((su) => ({
          id: su.id,
          name: su.name,
          unitName: unit.name,
          status: 'pending' as const, // Default to pending
        }));
        allTopics = [...allTopics, ...unitTopics];
      }
      setTopics(allTopics);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load syllabus content",
        variant: "destructive",
      });
    } finally {
      setTopicsLoading(false);
    }
  };

  const handleFinishTopic = (topicId: string) => {
    // MOCK: Update local state only as requested
    setTopics(prev => prev.map(t => 
      t.id === topicId ? { ...t, status: t.status === 'finished' ? 'pending' : 'finished' } : t
    ));
    
    const topic = topics.find(t => t.id === topicId);
    const wasFinished = topic?.status === 'finished';
    
    toast({
      title: wasFinished ? "Topic Reverted" : "Topic Completed",
      description: `Successfully updated status for "${topic?.name}"`,
    });
    setTopicToConfirm(null);
  };

  const filteredTopics = topics.filter(topic =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.unitName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <FacultyLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              
              <h1 className="text-2xl font-bold tracking-tight">Syllabus Management</h1>
            </div>
            <p className="">Manage and track course coverage for your assigned sections.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full text-amber-700 text-xs font-medium animate-pulse">
            <Sparkles className="w-3 h-3" />
            Live Coverage Tracking
          </div>
        </div>

        {/* Filters Card */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-gray-50/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold  tracking-wider ">Batch</Label>
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
                      <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold  tracking-wider ">Department</Label>
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
                <Label className="text-xs font-semibold  tracking-wider ">Subject</Label>
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
                <Label className="text-xs font-semibold  tracking-wider ">Section</Label>
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
          {topicsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
              <Loader2 className="w-10 h-10 text-primary/40 animate-spin mb-4" />
              <p className=" font-medium">Extracting syllabus structure...</p>
            </div>
          ) : selectedSection ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Sub Units Coverage
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100  text-[10px]">
                    {uniqueSubjects.find(s => s.id === selectedSubject)?.name}
                  </Badge>
                </h3>
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 " />
                  <Input
                    placeholder="Quick search topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-white border-gray-200 shadow-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {filteredTopics.length > 0 ? (
                  filteredTopics.map((topic) => (
                    <Card key={topic.id} className={`group border-none shadow-sm transition-all duration-300 hover:shadow-md ${topic.status === 'finished' ? 'bg-emerald-50/30' : 'bg-white'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`flex-shrink-0 w-1.5 h-10 rounded-full transition-colors duration-300 ${topic.status === 'finished' ? 'bg-emerald-500' : 'bg-gray-200 group-hover:bg-primary/40'}`} />
                            <div className="min-w-0">
                              <p className={`font-semibold text-sm sm:text-base truncate transition-colors duration-300 ${topic.status === 'finished' ? 'text-emerald-900' : 'text-gray-900'}`}>
                                {topic.name}
                              </p>
                              {topic.unitName && (
                                <p className="text-xs /80 font-medium">Unit: {topic.unitName}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={topic.status === 'finished' ? 'default' : 'outline'}
                              className={`rounded-full px-3 py-0.5 text-[10px] font-bold  tracking-wider transition-all duration-300 ${
                                topic.status === 'finished' 
                                  ? 'bg-emerald-500 hover:bg-emerald-600 border-none shadow-sm shadow-emerald-200' 
                                  : 'text-gray-400 border-gray-200'
                              }`}
                            >
                              {topic.status === 'finished' ? 'Completed' : 'Pending'}
                            </Badge>
                            
                            <Button
                              onClick={() => setTopicToConfirm(topic)}
                              variant={topic.status === 'finished' ? 'outline' : 'default'}
                              size="sm"
                              className={`h-9 px-4 rounded-lg font-bold transition-all duration-300 ${
                                topic.status === 'finished'
                                  ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                                  : 'bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20'
                              }`}
                            >
                              <CheckCircle className={`w-4 h-4 mr-1.5 ${topic.status === 'finished' ? 'text-emerald-500' : 'text-white'}`} />
                              {topic.status === 'finished' ? 'Revert' : 'Finish'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                    <p className=" font-medium">No topics found matching your query.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-dashed border-gray-200 group transition-all duration-500 hover:border-primary/30 hover:bg-primary/5">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
                <div className="relative p-5 bg-white shadow-xl rounded-2xl border border-gray-100 group-hover:scale-110 transition-transform duration-500">
                  <BookOpen className="w-10 h-10 text-primary/40 group-hover:text-primary transition-colors duration-500" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900 mb-2">Selection Required</p>
              <p className=" max-w-sm text-center">
                Use the filters above to select highly specific Batch, Department, Subject, and Section to load the syllabus topics.
              </p>
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!topicToConfirm} onOpenChange={(open) => !open && setTopicToConfirm(null)}>
          <AlertDialogContent className="max-w-md rounded-2xl border-none shadow-2xl p-6 bg-white">
            <AlertDialogHeader className="space-y-3">
              <AlertDialogTitle className="text-xl font-bold text-gray-900">
                Confirm Status Change
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium text-gray-500 leading-relaxed">
                Are you sure you want to mark "{topicToConfirm?.name}" as {' '}
                <span className="font-bold text-primary italic">
                  {topicToConfirm?.status === 'finished' ? 'pending' : 'completed'}
                </span>?
                This status tracking is used for internal coverage reports.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-3 mt-8">
              <AlertDialogCancel className="bg-transparent border-none text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl px-6 font-bold transition-all">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => topicToConfirm && handleFinishTopic(topicToConfirm.id)}
                className="bg-primary hover:bg-primary/90 text-white px-8 h-11 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                Confirm
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </FacultyLayout>
  );
};

export default Syllabus;