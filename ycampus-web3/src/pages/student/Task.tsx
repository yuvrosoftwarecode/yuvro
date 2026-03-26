import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { StudentLayout } from '@/components/layouts/StudentLayout';
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
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface Course {
  id: string;
  name: string;
}

interface Batch {
  id: string;
  name: string;
  courseId: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Submitted';
  createdDate: string;
  courseId: string;
  batchId: string;
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

interface UploadedFile {
  name: string;
  timestamp: string;
  content: string;
}

const StudentTask: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Debug authentication
  console.log('StudentTask component loaded, user:', user);
  
  // State management
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [taskContent, setTaskContent] = useState<string>('');
  const [newComment, setNewComment] = useState<string>('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [showTaskView, setShowTaskView] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  // Initialize state from URL parameters
  useEffect(() => {
    const view = searchParams.get('view');
    const taskId = searchParams.get('taskId');
    
    if (view === 'task' && taskId) {
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
        
        // Set the course for the task
        setSelectedCourse(task.courseId);
      }
    }
    
    // Scroll to top on page load
    window.scrollTo(0, 0);
  }, []);

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

  const batches: Batch[] = [
    { id: '1', name: 'Batch A - Morning', courseId: '1' },
    { id: '2', name: 'Batch B - Evening', courseId: '1' },
    { id: '3', name: 'Batch A - Morning', courseId: '2' },
    { id: '4', name: 'Batch B - Afternoon', courseId: '2' },
    { id: '5', name: 'Batch A - Morning', courseId: '3' },
  ];

  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Database Design Assignment',
      description: 'Design a normalized database schema for an e-commerce system. Include entity-relationship diagrams and explain your design choices.',
      status: 'Not Started',
      createdDate: '2024-01-15',
      courseId: '1',
      batchId: '1',
    },
    {
      id: '2',
      title: 'Algorithm Analysis Report',
      description: 'Analyze the time and space complexity of different sorting algorithms. Provide implementation examples and performance comparisons.',
      status: 'In Progress',
      createdDate: '2024-01-10',
      courseId: '1',
      batchId: '1',
    },
    {
      id: '3',
      title: 'Web Development Project',
      description: 'Create a responsive web application using React and Node.js. Include user authentication and data persistence.',
      status: 'Submitted',
      createdDate: '2024-01-05',
      courseId: '1',
      batchId: '1',
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
    let filteredTasks = mockTasks;
    
    // Filter by course if not "all"
    if (selectedCourse && selectedCourse !== 'all') {
      filteredTasks = filteredTasks.filter(
        task => task.courseId === selectedCourse
      );
    }
    
    // Filter by status if selected and not "all"
    if (selectedStatus && selectedStatus !== 'all') {
      const statusMapping = {
        'pending': 'Not Started',
        'in-progress': 'In Progress',
        'completed': 'Submitted'
      };
      filteredTasks = filteredTasks.filter(task => task.status === statusMapping[selectedStatus as keyof typeof statusMapping]);
    }
    
    setTasks(filteredTasks);
  }, [selectedCourse, selectedStatus]);

  // Handlers
  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
  };

  const handleTaskClick = (task: Task) => {
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
    
    // Update URL to persist state
    setSearchParams({ view: 'task', taskId: task.id });
  };

  const handleBackToTasks = () => {
    setShowTaskView(false);
    setCurrentTask(null);
    setTaskContent('');
    setComments([]);
    setNewComment('');
    // Clear URL parameters
    setSearchParams({});
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const supportedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/pdf'
      ];
      
      if (!supportedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document (.pdf, .doc, .docx).",
          variant: "destructive",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      try {
        let extractedText = '';
        
        if (file.type === 'application/pdf') {
          // Handle PDF files
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            fullText += pageText + '\n';
          }
          
          extractedText = fullText.trim();
        } else {
          // Handle Word documents
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value;
        }
        
        if (extractedText.trim()) {
          const fileInfo: UploadedFile = {
            name: file.name,
            timestamp: new Date().toISOString(),
            content: extractedText
          };
          
          setUploadedFile(fileInfo);
          setTaskContent(extractedText);
          
          toast({
            title: "Document uploaded successfully",
            description: `Text extracted from ${file.name}`,
          });
        } else {
          toast({
            title: "No content found",
            description: "The uploaded document appears to be empty or unreadable.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error extracting text from document:', error);
        toast({
          title: "Extraction error",
          description: "Failed to extract text from the document.",
          variant: "destructive",
        });
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
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
      // Update task status to submitted
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
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={handleBackToTasks}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tasks
            </Button>
            <h1 className="text-2xl font-bold text-foreground">{currentTask.title}</h1>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
              <CardDescription>{currentTask.description}</CardDescription>
            </CardHeader>
          </Card>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          {/* File upload info */}
          {uploadedFile && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Uploaded: {uploadedFile.name}</span>
                  </div>
                  <span>{new Date(uploadedFile.timestamp).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Side - Content Area */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Your Work
                    {currentTask?.status !== 'Submitted' && (
                      <Button onClick={handleUploadClick} variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Task
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[520px] w-full rounded-md border">
                    <Textarea
                      value={taskContent}
                      onChange={(e) => setTaskContent(e.target.value)}
                      placeholder={currentTask?.status === 'Submitted' 
                        ? 'No content available for this task.' 
                        : 'Upload a document or start writing your solution here...'
                      }
                      className="h-full resize-none border-0 focus-visible:ring-0 text-sm"
                      disabled={currentTask?.status === 'Submitted'}
                    />
                  </div>
                  
                  {currentTask?.status !== 'Submitted' && (
                    <div className="flex justify-end mt-4">
                      <Button onClick={handleSubmitTask}>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Task
                      </Button>
                    </div>
                  )}
                  {currentTask?.status === 'Submitted' && (
                    <div className="flex justify-end mt-4">
                      <p className="text-sm text-muted-foreground">Task has been submitted</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Comments */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Discussion</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea ref={scrollAreaRef} className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className={`p-3 rounded-lg ${
                          comment.type === 'faculty' 
                            ? 'bg-blue-50 border-l-4 border-blue-400' 
                            : 'bg-green-50 border-l-4 border-green-400'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
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
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-3">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment or ask a question..."
                      className="min-h-[80px]"
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                        <Send className="h-4 w-4 mr-2" />
                        Add Comment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Tasks</h1>
          <p className="text-muted-foreground">View and complete your assigned tasks</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Subjects
                </label>
                <Select value={selectedCourse} onValueChange={handleCourseChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Status
                </label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
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

        {tasks.length > 0 ? (
            <div className="grid gap-4">
              {tasks.map((task) => (
                <Card 
                  key={task.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleTaskClick(task)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {task.description}
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusBadgeVariant(task.status)}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(task.createdDate).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No tasks found for the selected filters.</p>
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </StudentLayout>
  );
};

export default StudentTask;