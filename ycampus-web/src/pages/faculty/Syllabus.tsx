import React, { useMemo, useState, useEffect } from 'react';
import RoleSidebar from '../../components/common/RoleSidebar';
import PageHeader from '../../components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { getFacultyAssignments, SectionSubjectFaculty, fetchUnitsBySubject, fetchSubUnitsByUnit, SubUnit, UnitBasic } from '../../services/subjectService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Search,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';

interface Topic {
  id: string;
  title: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  unitName?: string;
}

const Syllabus: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const data = await getFacultyAssignments();
      setAssignments(data);
    } catch (err) {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const uniqueDepartments = useMemo(() => {
    const acc: { id: string; name: string }[] = [];
    assignments.forEach((curr) => {
      const deptId = curr.semester_subject_details?.department_id;
      const deptName = curr.semester_subject_details?.department_name;
      if (deptId && deptName && !acc.find((d) => d.id === String(deptId))) {
        acc.push({ id: String(deptId), name: deptName });
      }
    });
    return acc;
  }, [assignments]);

  const uniqueSubjects = useMemo(() => {
    if (!selectedDepartment) return [];
    const acc: { id: string; name: string }[] = [];
    assignments
      .filter((a) => String(a.semester_subject_details?.department_id) === selectedDepartment)
      .forEach((curr) => {
        const subjectId = String(curr.semester_subject_details?.subject_details?.id);
        if (!acc.find((s) => s.id === subjectId)) {
          acc.push({
            id: subjectId,
            name: curr.semester_subject_details?.subject_details?.subject_name || 'Unknown Subject',
          });
        }
      });
    return acc;
  }, [assignments, selectedDepartment]);

  const availableSections = useMemo(() => {
    if (!selectedDepartment || !selectedSubject) return [];
    return assignments.filter(
      (a) =>
        String(a.semester_subject_details?.department_id) === selectedDepartment &&
        String(a.semester_subject_details?.subject_details?.id) === selectedSubject
    );
  }, [assignments, selectedDepartment, selectedSubject]);

  useEffect(() => {
    if (selectedSubject) {
      loadTopics(selectedSubject);
    } else {
      setTopics([]);
    }
  }, [selectedSubject]);

  const loadTopics = async (subjectId: string) => {
    try {
      setLoading(true);
      const units = await fetchUnitsBySubject(subjectId);
      let allTopics: Topic[] = [];
      
      for (const unit of units) {
        const subUnits = await fetchSubUnitsByUnit(unit.id);
        const unitTopics: Topic[] = subUnits.map((su) => ({
          id: su.id,
          title: su.name,
          description: su.content || '',
          status: 'Pending',
          unitName: unit.name,
        }));
        allTopics = [...allTopics, ...unitTopics];
      }
      setTopics(allTopics);
    } catch (err) {
      toast.error('Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const filteredTopics = useMemo(() => {
    return topics.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [topics, searchQuery]);

  const [topicToFinish, setTopicToFinish] = useState<string | null>(null);

  const handleFinishTopic = () => {
    if (!topicToFinish) return;
    
    // Optimistically update topic status locally
    setTopics(prev => prev.map(t => t.id === topicToFinish ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } : t));
    toast.success('Topic status updated successfully!');
    setTopicToFinish(null);
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <RoleSidebar />
      <div className="flex flex-1 flex-col h-screen overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar min-h-0 bg-white">
          <div className="mx-auto max-w-7xl space-y-6">
            <PageHeader title="Syllabus Management" subtitle="Take and manage attendance for your assigned sections" />

            <div className="bg-white rounded-xl border border-gray-300 p-6 flex flex-col space-y-8 min-h-[500px]">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Department</label>
                  <Select
                    value={selectedDepartment}
                    onValueChange={(value) => {
                      setSelectedDepartment(value);
                      setSelectedSubject('');
                      setSelectedSection('');
                    }}
                  >
                    <SelectTrigger className="h-10 border-gray-300 rounded-lg">
                      <SelectValue placeholder="Choose Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Subject</label>
                  <Select
                    value={selectedSubject}
                    onValueChange={(value) => {
                      setSelectedSubject(value);
                      setSelectedSection('');
                    }}
                    disabled={!selectedDepartment}
                  >
                    <SelectTrigger className="h-10 border-gray-300 rounded-lg">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Section</label>
                  <Select
                    value={selectedSection}
                    onValueChange={setSelectedSection}
                    disabled={!selectedSubject}
                  >
                    <SelectTrigger className="h-10 border-gray-900 rounded-lg ring-1 ring-gray-900 shadow-sm font-medium">
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSections.map((sec) => (
                        <SelectItem key={String(sec.section)} value={String(sec.section)}>
                          {sec.section_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedDepartment && selectedSubject && selectedSection ? (
                <div className="space-y-6 mt-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">
                      Topics
                    </h2>
                    <span className="text-sm font-medium text-muted-foreground border border-gray-300 rounded-full px-4 py-1.5">
                      {uniqueSubjects.find(s => s.id === selectedSubject)?.name || 'Subject'}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 border-gray-300 rounded-xl bg-white"
                    />
                  </div>

                  {loading ? (
                    <div className="flex justify-center items-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTopics.length > 0 ? filteredTopics.map((topic) => (
                        <div
                          key={topic.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-gray-300 bg-white"
                        >
                        <div className="flex items-center gap-4">
                          <div className="h-2 w-2 rounded-full bg-gray-900" />
                          <span className="font-semibold text-base text-foreground">
                            {topic.title}
                            {topic.unitName && <span className="ml-2 text-xs font-normal text-gray-400">({topic.unitName})</span>}
                          </span>
                          <Badge
                            variant={topic.status === 'Completed' ? 'secondary' : 'outline'}
                            className={`rounded-full px-3 font-medium ${
                              topic.status === 'Completed' 
                                ? 'bg-white text-gray-700 hover:bg-gray-100' 
                                : 'text-gray-500 border-gray-200'
                            }`}
                          >
                            {topic.status === 'Completed' ? 'sent' : 'pending'}
                          </Badge>
                        </div>
                        <Button
                          onClick={() => setTopicToFinish(topic.id)}
                          className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white gap-2 font-medium px-6"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Finish
                        </Button>
                      </div>
                    )) : (
                      <div className="text-center py-10 text-gray-400 border border-dashed border-gray-300 rounded-xl">
                         No topics found for this subject.
                      </div>
                    )}
                  </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 min-h-[300px]">
                  <BookOpen className="h-12 w-12 mb-4 text-gray-200" />
                  <p className="text-lg font-medium text-gray-900">Please complete selection</p>
                  <p className="text-sm">Select department, subject, and section to view topics</p>
                </div>
              )}
            </div>

            <Dialog open={!!topicToFinish} onOpenChange={(open) => !open && setTopicToFinish(null)}>
              <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl p-6 bg-white">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-xl font-bold text-gray-900">Confirm Status Change</DialogTitle>
                  <DialogDescription className="text-sm font-medium text-gray-500 leading-relaxed">
                    Are you sure you want to mark this topic as{' '}
                    <span className="text-gray-900 font-bold">
                      {topics.find(t => t.id === topicToFinish)?.status === 'Completed' ? 'pending' : 'completed'}
                    </span>
                    ? This status will be visible to students in this section.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setTopicToFinish(null)}
                    className="rounded-xl h-11 px-6 font-bold text-gray-400 border-gray-100 hover:bg-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleFinishTopic}
                    className="bg-orange-500 text-white px-8 h-11 rounded-xl font-bold shadow-lg shadow-orange-100 transition-all"
                  >
                    Confirm Change
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Syllabus;
