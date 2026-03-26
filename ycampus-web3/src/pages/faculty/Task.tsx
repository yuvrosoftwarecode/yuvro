import React, { useState, useEffect, useMemo } from 'react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { taskService, Task as BackendTask, TaskSubmission } from '@/services/taskService';
import { getFacultyAssignments, SectionSubjectFaculty } from '@/services/subjectService';
import TaskCard from '@/components/faculty/task/TaskCard';
import CreateTaskForm from '@/components/faculty/task/CreateTaskForm';
import ViewResponses from '@/components/faculty/task/ViewResponses';
import StudentResponseDetail from '@/components/faculty/task/StudentResponseDetail';

const TaskPage: React.FC = () => {
  const { toast } = useToast();
  
  // Core Data State
  const [assignments, setAssignments] = useState<SectionSubjectFaculty[]>([]);
  const [tasks, setTasks] = useState<BackendTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Filter State
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [currentSubmission, setCurrentSubmission] = useState<TaskSubmission | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const data = await getFacultyAssignments();
      setAssignments(data);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load assignments.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (selectedDept === 'all' || selectedSubject === 'all') {
      setTasks([]);
      return;
    }
    
    try {
      setIsLoading(true);
      const params = {
        department: selectedDept,
        subject: selectedSubject,
      };
      const data = await taskService.getTasks(params);
      
      // Filter by batch if selected
      let filtered = data;
      if (selectedBatch !== 'all') {
        const batchSectionIds = assignments
          .filter(a => a.semester_subject_details?.batch_name === selectedBatch)
          .map(a => String(a.section));
        filtered = filtered.filter(t => t.sections.some(s => batchSectionIds.includes(String(s))));
      }

      // Filter by section if selected
      if (selectedSection !== 'all') {
        filtered = filtered.filter(t => t.sections.some(s => String(s) === selectedSection));
      }
        
      setTasks(filtered);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch tasks.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedDept, selectedSubject, selectedBatch, selectedSection]);

  // Derived filter options
  const uniqueDepts = useMemo(() => {
    const depts = new Map();
    assignments.forEach(a => {
      const deptId = a.semester_subject_details?.department_id;
      const deptName = a.semester_subject_details?.department_name;
      if (deptId) depts.set(String(deptId), deptName || 'Unknown Department');
    });
    return Array.from(depts.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments]);

  const availableSubjects = useMemo(() => {
    if (selectedDept === 'all') return [];
    const subs = new Map();
    assignments
      .filter(a => String(a.semester_subject_details?.department_id) === selectedDept)
      .forEach(a => {
        const sub = a.semester_subject_details?.subject_details;
        if (sub) subs.set(String(sub.id), sub.subject_name || sub.name);
      });
    return Array.from(subs.entries()).map(([id, name]) => ({ id, name }));
  }, [assignments, selectedDept]);

  const uniqueBatches = useMemo(() => {
    if (selectedDept === 'all' || selectedSubject === 'all') return [];
    const batches = new Set<string>();
    assignments
      .filter(a => 
        String(a.semester_subject_details?.department_id) === selectedDept &&
        String(a.semester_subject_details?.subject_details?.id) === selectedSubject
      )
      .forEach(a => {
        if (a.semester_subject_details?.batch_name) {
          batches.add(a.semester_subject_details.batch_name);
        }
      });
    return Array.from(batches).map(name => ({ id: name, name }));
  }, [assignments, selectedDept, selectedSubject]);

  const availableSections = useMemo(() => {
    if (selectedDept === 'all' || selectedSubject === 'all') return [];
    return assignments
      .filter(a => 
        String(a.semester_subject_details?.department_id) === selectedDept &&
        String(a.semester_subject_details?.subject_details?.id) === selectedSubject &&
        (selectedBatch === 'all' || a.semester_subject_details?.batch_name === selectedBatch)
      )
      .map(a => ({ id: String(a.section), name: a.section_name || `Section ${a.section}` }));
  }, [assignments, selectedDept, selectedSubject, selectedBatch]);

  // Handlers
  const handleCreateTask = async (payload: any) => {
    try {
      setIsActionLoading(true);
      await taskService.createTask({
        ...payload,
        department: selectedDept,
        subject: selectedSubject,
      });
      toast({ title: 'Success', description: 'Task created successfully!' });
      setShowCreateForm(false);
      fetchTasks();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create task.', variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendTask = async (taskId: string) => {
    try {
      setIsActionLoading(true);
      await taskService.sendTask(taskId);
      toast({ title: 'Success', description: 'Task sent to students!' });
      fetchTasks();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to send task.', variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      setIsActionLoading(true);
      await taskService.deleteTask(taskId);
      toast({ title: 'Success', description: 'Task deleted.' });
      fetchTasks();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete task.', variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEditTask = async (taskId: string, data: any) => {
    try {
      setIsActionLoading(true);
      await taskService.updateTask(taskId, data);
      toast({ title: 'Success', description: 'Task updated.' });
      fetchTasks();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update task.', variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleViewResponses = async (taskId: string) => {
    try {
      setIsLoading(true);
      const data = await taskService.getTaskSubmissions(taskId);
      setSubmissions(data);
      setViewingTaskId(taskId);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load submissions.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewStudentDetail = async (submissionId: string) => {
    try {
      setIsLoading(true);
      const data = await taskService.getSubmissionDetail(submissionId);
      setCurrentSubmission(data);
      setSelectedSubmissionId(submissionId);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load details.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async (comment: string) => {
    if (!selectedSubmissionId) return;
    try {
      const newComment = await taskService.addCommentToSubmission(selectedSubmissionId, comment);
      setCurrentSubmission(prev => prev ? {
        ...prev,
        comments: [...prev.comments, newComment]
      } : null);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add comment.', variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async (status: 'accepted' | 'rejected') => {
    if (!selectedSubmissionId) return;
    try {
      setIsActionLoading(true);
      await taskService.updateSubmissionStatus(selectedSubmissionId, status);
      toast({ title: 'Success', description: `Task ${status}!` });
      // Refresh details
      const data = await taskService.getSubmissionDetail(selectedSubmissionId);
      setCurrentSubmission(data);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Polling for comments
  useEffect(() => {
    let interval: any;
    if (selectedSubmissionId && !isLoading) {
      interval = setInterval(async () => {
        try {
          const data = await taskService.getSubmissionDetail(selectedSubmissionId);
          if (JSON.stringify(data.comments) !== JSON.stringify(currentSubmission?.comments)) {
            setCurrentSubmission(data);
          }
        } catch (err) {
          console.error("Polling failed", err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [selectedSubmissionId, isLoading]);

  // UI helpers
  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const currentTask = tasks.find(t => t.id === viewingTaskId);

  if (currentSubmission) {
    return (
      <FacultyLayout>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <StudentResponseDetail
            response={currentSubmission}
            onAddComment={handleAddComment}
            onUpdateStatus={handleUpdateStatus}
            submitting={isActionLoading}
            onBack={() => {
              setCurrentSubmission(null);
              setSelectedSubmissionId(null);
            }}
          />
        </div>
      </FacultyLayout>
    );
  }

  if (viewingTaskId && currentTask) {
    return (
      <FacultyLayout>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <ViewResponses
            task={currentTask as any}
            submissions={submissions}
            onBack={() => setViewingTaskId(null)}
            onViewStudentResponse={handleViewStudentDetail}
          />
        </div>
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Task Management</h1>
            <p className="text-muted-foreground font-medium mt-1">Assign, track, and review student progress</p>
          </div>
          {selectedDept !== 'all' && selectedSubject !== 'all' && (
            <Button onClick={() => setShowCreateForm(true)} className="shadow-lg hover:shadow-xl transition-all h-11 px-6 font-bold bg-primary">
              <Plus className="h-5 w-5 mr-1" />
              Create New Task
            </Button>
          )}
        </div>

        {/* Create Task Form Overflow */}
        {showCreateForm && (
          <CreateTaskForm
            subjectId={selectedSubject}
            sections={selectedSection === 'all' ? availableSections.map(s => s.id) : [selectedSection]}
            onSubmit={handleCreateTask}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {/* Global Filters */}
        <Card className="border-slate-200 shadow-sm bg-slate-50/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block px-1">Department</label>
                <Select value={selectedDept} onValueChange={(v) => { setSelectedDept(v); setSelectedSubject('all'); setSelectedBatch('all'); setSelectedSection('all'); }}>
                  <SelectTrigger className="bg-white h-11 border-slate-200 hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {uniqueDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block px-1">Subject</label>
                <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedBatch('all'); setSelectedSection('all'); }} disabled={selectedDept === 'all'}>
                  <SelectTrigger className="bg-white h-11 border-slate-200 hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {availableSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block px-1">Batch</label>
                <Select value={selectedBatch} onValueChange={(v) => { setSelectedBatch(v); setSelectedSection('all'); }} disabled={selectedSubject === 'all'}>
                  <SelectTrigger className="bg-white h-11 border-slate-200 hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="All Batches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {uniqueBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block px-1">Section (Optional)</label>
                <Select value={selectedSection} onValueChange={setSelectedSection} disabled={selectedSubject === 'all'}>
                  <SelectTrigger className="bg-white h-11 border-slate-200 hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {availableSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task List Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-lg">
                <Filter className="h-5 w-5 text-primary" />
             </div>
             <h2 className="text-xl font-bold text-slate-800">Assigned Tasks ({filteredTasks.length})</h2>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tasks by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 border-slate-200 focus-visible:ring-primary/20"
            />
          </div>
        </div>

        {/* Task Display */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-2xl border border-dashed">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading tasks...</p>
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task as any}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                onSend={handleSendTask}
                onViewResponses={handleViewResponses}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-slate-50/50">
            <CardContent className="py-20 text-center">
              <div className="bg-slate-200/50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No tasks found</h3>
              <p className="text-slate-500 max-w-xs mx-auto mt-2">
                {selectedDept === 'all' || selectedSubject === 'all' 
                  ? 'Please select a department and subject to view tasks.' 
                  : 'Start by creating your first task for this subject.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </FacultyLayout>
  );
};

export default TaskPage;