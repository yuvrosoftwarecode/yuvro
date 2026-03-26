import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Upload, Send, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import mammoth from 'mammoth';

interface Course {
  id: string;
  name: string;
}


interface Task {
  id: string;
  title: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Submitted';
  createdDate: string;
  courseId: string;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  type: 'faculty' | 'student';
}

interface TaskSubmission {
  id: string;
  taskId: string;
  content: string;
  comments: Comment[];
}

const TaskContent: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [taskContent, setTaskContent] = useState<string>('');
  const [newComment, setNewComment] = useState<string>('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [showTaskView, setShowTaskView] = useState<boolean>(false);

  // Initialize state from URL parameters on mount
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    const course = searchParams.get('course') || '';
    const status = searchParams.get('status') || '';

    setSelectedCourse(course);
    setSelectedStatus(status);

    if (taskId) {
      const task = mockTasks.find(t => t.id === taskId);
      if (task) {
        setCurrentTask(task);
        setShowTaskView(true);
        setComments(mockComments);
        
        // Load existing content based on task status
        if (task.status === 'In Progress') {
          setTaskContent('This is my current work on the ' + task.title + '...');
        } else if (task.status === 'Submitted') {
          setTaskContent('This is my submitted work for ' + task.title + '.\n\nI have completed the database design with the following entities:\n1. Users\n2. Products\n3. Orders\n4. Categories\n\nThe normalized schema follows 3NF principles and includes proper relationships between entities.');
        } else {
          setTaskContent('');
        }
      }
    }

    // Scroll to top on component mount
    window.scrollTo(0, 0);
  }, [searchParams]);

  const updateUrlParams = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  // Auto-scroll to bottom when comments change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [comments]);

  // Mock data
  const courses: Course[] = [
    { id: '1', name: 'Computer Science' },
    { id: '2', name: 'Mathematics' },
    { id: '3', name: 'Physics' },
  ];



  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Database Design Assignment',
      description: 'Design a normalized database schema for an e-commerce system. Include entity-relationship diagrams and explain your design choices.',
      status: 'Not Started',
      createdDate: '2024-01-15',
      courseId: '1',
    },
    {
      id: '2',
      title: 'Algorithm Analysis Report',
      description: 'Analyze the time and space complexity of different sorting algorithms. Provide implementation examples and performance comparisons.',
      status: 'In Progress',
      createdDate: '2024-01-10',
      courseId: '1',
    },
    {
      id: '3',
      title: 'Web Development Project',
      description: 'Create a responsive web application using React and Node.js. Include user authentication and data persistence.',
      status: 'Submitted',
      createdDate: '2024-01-05',
      courseId: '1',
    },
  ];

  const mockComments: Comment[] = [
    {
      id: '1',
      text: 'Good start! Consider adding more details about the normalization process.',
      author: 'Dr. Smith',
      timestamp: '2024-01-16T10:30:00Z',
      type: 'faculty',
    },
    {
      id: '2',
      text: 'Thank you for the feedback. I will revise the section on 3NF.',
      author: 'Student',
      timestamp: '2024-01-16T14:15:00Z',
      type: 'student',
    },
  ];

  // Effects
  useEffect(() => {
    if (selectedCourse) {
      let filteredTasks = mockTasks.filter(
        task => task.courseId === selectedCourse
      );
      
      // Filter by status if selected
      if (selectedStatus && selectedStatus !== 'all') {
        const statusMapping = {
          'pending': 'Not Started',
          'in-progress': 'In Progress',
          'completed': 'Submitted'
        };
        filteredTasks = filteredTasks.filter(task => task.status === statusMapping[selectedStatus as keyof typeof statusMapping]);
      }
      
      setTasks(filteredTasks);
    } else {
      setTasks([]);
    }
  }, [selectedCourse, selectedStatus]);

  // Handlers
  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedStatus('');
    setTasks([]);
  };

  const handleTaskClick = (task: Task) => {
    setCurrentTask(task);
    setShowTaskView(true);
    setComments(mockComments);
    updateUrlParams({ taskId: task.id, course: selectedCourse, status: selectedStatus });
    
    // Load existing content based on task status
    if (task.status === 'In Progress') {
      setTaskContent('This is my current work on the ' + task.title + '...');
    } else if (task.status === 'Submitted') {
      setTaskContent('This is my submitted work for ' + task.title + '.\n\nI have completed the database design with the following entities:\n1. Users\n2. Products\n3. Orders\n4. Categories\n\nThe normalized schema follows 3NF principles and includes proper relationships between entities.');
    } else {
      setTaskContent('');
    }
  };

  const handleBackToTasks = () => {
    setShowTaskView(false);
    setCurrentTask(null);
    setTaskContent('');
    setComments([]);
    setNewComment('');
    updateUrlParams({ taskId: null });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
          file.type === 'application/msword') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          const extractedText = result.value;
          
          if (extractedText.trim()) {
            setTaskContent(extractedText);
            toast({
              title: "Document uploaded",
              description: "Text has been extracted from the Word document.",
            });
          } else {
            setTaskContent(`Document: ${file.name}\n\nNo readable text content found in the document.`);
            toast({
              title: "Document uploaded",
              description: "Document uploaded but no readable text was found.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('Error extracting text from document:', error);
          setTaskContent(`Document: ${file.name}\n\nError extracting text from document.`);
          toast({
            title: "Extraction error",
            description: "Failed to extract text from the document.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a Word document (.doc or .docx).",
          variant: "destructive",
        });
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        text: newComment,
        author: 'Student',
        timestamp: new Date().toISOString(),
        type: 'student',
      };
      setComments(prev => [...prev, comment]);
      setNewComment('');
      toast({
        title: "Comment added",
        description: "Your comment has been added to the discussion.",
      });
    }
  };

  const handleSubmitTask = () => {
    if (currentTask && taskContent.trim()) {
      setTasks(prev => prev.map(task => 
        task.id === currentTask.id 
          ? { ...task, status: 'Submitted' as const }
          : task
      ));
      
      toast({
        title: "Task submitted",
        description: "Your task has been submitted successfully.",
      });
      
      handleBackToTasks();
    } else {
      toast({
        title: "Cannot submit",
        description: "Please add content to your task before submitting.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Not Started':
        return 'secondary';
      case 'In Progress':
        return 'default';
      case 'Submitted':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Not Started':
        return 'Pending';
      case 'In Progress':
        return 'In Progress';
      case 'Submitted':
        return 'Completed';
      default:
        return status;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };


  if (showTaskView && currentTask) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 mb-6 flex-shrink-0">
          <Button variant="outline" onClick={handleBackToTasks}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{currentTask.title}</h1>
        </div>

        <Card className="mb-6 flex-shrink-0">
          <CardHeader>
            <CardDescription>{currentTask.description}</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          {/* Left Side - Content Area */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <Card className="flex flex-col h-full">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center justify-between">
                  My Work
                  {currentTask?.status !== 'Submitted' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".doc,.docx"
                        className="hidden"
                      />
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 min-h-0">
                <ScrollArea className="flex-1">
                  <Textarea
                    value={taskContent}
                    onChange={(e) => setTaskContent(e.target.value)}
                    placeholder="Start writing your solution here or upload a Word document..."
                    className="min-h-[400px] resize-none border-none p-0 focus-visible:ring-0"
                    readOnly={currentTask?.status === 'Submitted'}
                  />
                </ScrollArea>
                {currentTask?.status !== 'Submitted' && (
                  <div className="flex justify-end mt-4 flex-shrink-0">
                    <Button onClick={handleSubmitTask}>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Task
                    </Button>
                  </div>
                )}
                {currentTask?.status === 'Submitted' && (
                  <div className="flex justify-end mt-4 flex-shrink-0">
                    <p className="text-sm text-muted-foreground">Task has been submitted</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Comments */}
          <div className="flex flex-col min-h-0">
            <Card className="flex flex-col h-full">
              <CardHeader className="flex-shrink-0">
                <CardTitle>AI Assistant</CardTitle>
                <CardDescription>Comments and feedback</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 min-h-0">
                <ScrollArea 
                  ref={scrollAreaRef}
                  className="flex-1 mb-4"
                >
                  <div className="space-y-4 p-1">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-lg ${
                          comment.type === 'faculty'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                            : 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">
                            {comment.author}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(comment.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator className="my-4 flex-shrink-0" />

                <div className="space-y-3 flex-shrink-0">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment or question..."
                    className="min-h-[80px]"
                  />
                  <Button onClick={handleAddComment} className="w-full" disabled={!newComment.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Add Comment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Tasks</h1>
        <p className="text-muted-foreground">Complete your assigned tasks and interact with faculty.</p>
      </div>

      {/* Course and Status Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Course and Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="w-full">
              <label className="text-sm font-medium mb-2 block">Course</label>
              <Select value={selectedCourse} onValueChange={handleCourseChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select 
                value={selectedStatus} 
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Cards */}
      {tasks.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">Available Tasks</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <Card key={task.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(task.status)}>
                      {getStatusLabel(task.status)}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-3">
                    {task.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Created: {new Date(task.createdDate).toLocaleDateString()}
                    </span>
                    <Button
                      onClick={() => handleTaskClick(task)}
                      variant={task.status === 'Submitted' ? 'outline' : 'default'}
                    >
                      {task.status === 'Submitted' ? (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          View Task
                        </>
                      ) : (
                        'Take Task'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty States */}
      {!selectedCourse && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Please select a course to view available tasks.</p>
          </CardContent>
        </Card>
      )}


      {selectedCourse && tasks.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No tasks available for this course and batch.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TaskContent;
