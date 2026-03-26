import React, { useState, useEffect } from 'react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import TaskCard from '@/components/faculty/task/TaskCard';
import CreateTaskForm from '@/components/faculty/task/CreateTaskForm';
import ViewResponses from '@/components/faculty/task/ViewResponses';
import StudentResponseDetail from '@/components/faculty/task/StudentResponseDetail';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'Draft' | 'Sent';
  createdDate: string;
  courseId: string;
  batchId: string;
}

interface Student {
  id: string;
  rollNo: string;
  name: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

interface StudentResponse {
  studentId: string;
  student: Student;
  answer: string;
  comments: Array<{
    id: string;
    author: 'faculty' | 'student';
    message: string;
    timestamp: string;
    selectedText?: string;
  }>;
}

const Task: React.FC = () => {
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [viewingResponses, setViewingResponses] = useState<string | null>(null);
  const [selectedStudentResponse, setSelectedStudentResponse] = useState<StudentResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mock data
  const courses = [
    { id: '1', name: 'React Development' },
    { id: '2', name: 'Node.js Backend' },
    { id: '3', name: 'Database Design' }
  ];

  const batches = selectedCourse ? [
    { id: '1', name: 'Batch A', courseId: selectedCourse },
    { id: '2', name: 'Batch B', courseId: selectedCourse },
    { id: '3', name: 'Batch C', courseId: selectedCourse }
  ] : [];


  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Build a Todo App',
      description: 'Create a todo application using React with CRUD operations',
      status: 'Sent',
      createdDate: '2024-01-15',
      courseId: '1',
      batchId: '1',
    },
    {
      id: '2',
      title: 'API Integration Task',
      description: 'Integrate REST APIs in your React application',
      status: 'Draft',
      createdDate: '2024-01-20',
      courseId: '1',
      batchId: '1',
    },
    {
      id: '3',
      title: 'Database Design Project',
      description: 'Design and implement a database schema for an e-commerce application',
      status: 'Sent',
      createdDate: '2024-01-25',
      courseId: '1',
      batchId: '2',
    },
    {
      id: '4',
      title: 'Authentication System',
      description: 'Implement user authentication and authorization system',
      status: 'Draft',
      createdDate: '2024-01-30',
      courseId: '1',
      batchId: '2',
    },
    {
      id: '5',
      title: 'Frontend Testing Assignment',
      description: 'Write unit tests and integration tests for React components',
      status: 'Sent',
      createdDate: '2024-02-01',
      courseId: '1',
      batchId: '3',
    }
  ];

  const mockStudents: Student[] = [
    { id: '1', rollNo: 'CS001', name: 'John Doe', status: 'Completed' },
    { id: '2', rollNo: 'CS002', name: 'Jane Smith', status: 'In Progress' },
    { id: '3', rollNo: 'CS003', name: 'Mike Johnson', status: 'Pending' }
  ];

  const mockResponses: StudentResponse[] = [
    {
      studentId: '1',
      student: mockStudents[0],
      answer: 'I have created a todo app with the following features:\n\n1. Add new todos\n2. Mark as complete\n3. Delete todos\n4. Filter by status\n\nThe app uses React hooks and localStorage for persistence.',
      comments: [
        {
          id: '1',
          author: 'faculty',
          message: 'Great work on implementing all the required features!',
          timestamp: '2024-01-16T10:30:00Z'
        },
        {
          id: '2',
          author: 'student',
          message: 'Thank you! Should I add any additional features?',
          timestamp: '2024-01-16T11:00:00Z'
        }
      ]
    },
    {
      studentId: '2',
      student: mockStudents[1],
      answer: 'I am currently working on the todo app. So far I have implemented:\n\n1. Basic component structure\n2. State management for todos\n3. Add functionality\n\nStill working on:\n- Delete functionality\n- Mark as complete\n- Styling improvements',
      comments: [
        {
          id: '3',
          author: 'faculty',
          message: 'Good progress! Keep working on the remaining features.',
          timestamp: '2024-01-17T09:15:00Z'
        }
      ]
    }
  ];

  useEffect(() => {
    if (selectedCourse && selectedBatch) {
      // Mock API call to fetch tasks
      setTasks(mockTasks.filter(task => 
        task.courseId === selectedCourse && task.batchId === selectedBatch
      ));
    } else {
      setTasks([]);
    }
  }, [selectedCourse, selectedBatch]);

  // Filter tasks based on search query
  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCourseSelect = (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedBatch('');
    setTasks([]);
  };

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatch(batchId);
  };

  const handleCreateTask = (taskData: { title: string; description: string }) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskData.title,
      description: taskData.description,
      status: 'Draft',
      createdDate: new Date().toISOString().split('T')[0],
      courseId: selectedCourse,
      batchId: selectedBatch,
    };
    
    setTasks(prev => [...prev, newTask]);
    setShowCreateForm(false);
  };

  const handleEditTask = (taskId: string, updatedData: { title: string; description: string }) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, title: updatedData.title, description: updatedData.description }
        : task
    ));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleSendTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: 'Sent' as const } : task
    ));
  };

  const handleViewResponses = (taskId: string) => {
    setViewingResponses(taskId);
  };

  const handleViewStudentResponse = (studentId: string) => {
    const response = mockResponses.find(r => r.studentId === studentId);
    if (response) {
      setSelectedStudentResponse(response);
    }
  };

  const handleAddComment = (comment: string, selectedText?: string) => {
    if (!selectedStudentResponse) return;

    const newComment = {
      id: Date.now().toString(),
      author: 'faculty' as const,
      message: comment,
      timestamp: new Date().toISOString(),
      selectedText
    };

    setSelectedStudentResponse(prev => prev ? {
      ...prev,
      comments: [...prev.comments, newComment]
    } : null);
  };

  const handleBackToResponses = () => {
    setSelectedStudentResponse(null);
  };

  const handleBackToTasks = () => {
    setViewingResponses(null);
    setSelectedStudentResponse(null);
  };

  if (selectedStudentResponse) {
    return (
      <FacultyLayout>
        <StudentResponseDetail
          response={selectedStudentResponse}
          onAddComment={handleAddComment}
          onBack={handleBackToResponses}
        />
      </FacultyLayout>
    );
  }

  if (viewingResponses) {
    const task = tasks.find(t => t.id === viewingResponses);
    return (
      <FacultyLayout>
        <ViewResponses
          task={task!}
          students={mockStudents}
          onBack={handleBackToTasks}
          onViewStudentResponse={handleViewStudentResponse}
        />
      </FacultyLayout>
    );
  }

  return (
    <FacultyLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Task Management</h1>
          {selectedCourse && selectedBatch && (
            <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Task
            </Button>
          )}
        </div>

        {/* Course and Batch Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Course & Batch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Course</label>
                <Select value={selectedCourse} onValueChange={handleCourseSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Batch</label>
                <Select 
                  value={selectedBatch} 
                  onValueChange={handleBatchSelect}
                  disabled={!selectedCourse}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map(batch => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Task Form */}
        {showCreateForm && (
          <CreateTaskForm
            onSubmit={handleCreateTask}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {/* Task Cards */}
        {tasks.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">Tasks</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onSend={handleSendTask}
                  onViewResponses={handleViewResponses}
                />
              ))}
            </div>
            
            {filteredTasks.length === 0 && searchQuery && (
              <div className="text-center text-muted-foreground py-4">
                No tasks found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}

        {selectedCourse && selectedBatch && tasks.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No tasks found for this course and batch.</p>
              <p className="text-sm text-muted-foreground mt-2">Click "Create New Task" to add your first task.</p>
            </CardContent>
          </Card>
        )}

        {!selectedCourse && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Please select a course and batch to view tasks.</p>
            </CardContent>
          </Card>
        )}

        {selectedCourse && !selectedBatch && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Please select a batch to view tasks.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </FacultyLayout>
  );
};

export default Task;