import React, { useState } from 'react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { BookOpen, Send, CheckCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock data
const courses = [
  { id: '1', name: 'Mathematics 101', code: 'MATH101' },
  { id: '2', name: 'Physics 201', code: 'PHY201' },
  { id: '3', name: 'Chemistry 301', code: 'CHEM301' },
];

const batches = [
  { id: '1', name: 'Batch A', year: '2024' },
  { id: '2', name: 'Batch B', year: '2024' },
  { id: '3', name: 'Batch C', year: '2023' },
];

const modulesData: { [key: string]: Array<{ id: string, name: string, topics: Array<{ id: string, name: string, status: 'pending' | 'sent' | 'finished' }> }> } = {
  '1': [
    {
      id: 'm1',
      name: 'Algebra Fundamentals',
      topics: [
        { id: 't1', name: 'Linear Equations', status: 'sent' },
        { id: 't2', name: 'Quadratic Equations', status: 'pending' },
        { id: 't3', name: 'Systems of Equations', status: 'pending' },
      ]
    },
    {
      id: 'm2',
      name: 'Calculus Basics',
      topics: [
        { id: 't4', name: 'Limits and Continuity', status: 'finished' },
        { id: 't5', name: 'Derivatives', status: 'pending' },
        { id: 't6', name: 'Integration', status: 'pending' },
      ]
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

  const handleTopicAction = async (topicId: string, currentStatus: 'pending' | 'sent' | 'finished') => {
    // API call would go here - currently commented
    // try {
    //   const response = await fetch(`/api/syllabus/topic/${topicId}/status`, {
    //     method: 'POST',
    //     body: JSON.stringify({ status: currentStatus === 'pending' ? 'finished' : 'pending' })
    //   });
    // } catch (error) {
    //   console.error('Error updating topic status:', error);
    // }

    const newStatus = currentStatus === 'pending' ? 'finished' : 'pending';
    setTopicStatuses(prev => ({
      ...prev,
      [topicId]: newStatus
    }));

    toast({
      title: "Topic Updated",
      description: `Topic status changed to ${newStatus}`,
    });
  };

  const handleFinishClick = (topic: { id: string; name: string; status: 'pending' | 'sent' | 'finished' }) => {
    const currentStatus = getTopicStatus(topic.id, topic.status);
    setTopicToConfirm({
      id: topic.id,
      name: topic.name,
      currentStatus
    });
  };

  const handleConfirmAction = () => {
    if (topicToConfirm) {
      handleTopicAction(topicToConfirm.id, topicToConfirm.currentStatus);
      setTopicToConfirm(null);
    }
  };

  const handleCancelAction = () => {
    setTopicToConfirm(null);
  };

  const getTopicStatus = (topicId: string, defaultStatus: 'pending' | 'sent' | 'finished') => {
    return topicStatuses[topicId] || defaultStatus;
  };

  const getButtonText = (status: 'pending' | 'sent' | 'finished') => {
    switch (status) {
      case 'pending': return 'Finish';
      case 'sent': return 'Finish';
      case 'finished': return 'Finished';
      default: return 'Finish';
    }
  };

  const getButtonIcon = (status: 'pending' | 'sent' | 'finished') => {
    switch (status) {
      case 'pending': return CheckCircle;
      case 'sent': return CheckCircle;
      case 'finished': return CheckCircle;
      default: return CheckCircle;
    }
  };

  const selectedCourseData = courses.find(c => c.id === selectedCourse);
  const availableModules = selectedCourse ? modulesData[selectedCourse] || [] : [];
  const selectedModuleData = availableModules.find(m => m.id === selectedModule);
  
  // Filter topics based on search query
  const filteredTopics = selectedModuleData?.topics.filter(topic =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <FacultyLayout>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Syllabus Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dependent Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Select value={selectedCourse} onValueChange={handleCourseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch">Batch</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(batch => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name} - {batch.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="module">Module</Label>
              <Select 
                value={selectedModule} 
                onValueChange={setSelectedModule}
                disabled={!selectedCourse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {availableModules.map(module => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Topics Display */}
          {selectedModuleData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Topics in {selectedModuleData.name}</h3>
                <Badge variant="outline">
                  {selectedCourseData?.name} - {selectedModuleData.name}
                </Badge>
              </div>

              {/* Search Filter */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-3">
                {filteredTopics.map(topic => {
                  const currentStatus = getTopicStatus(topic.id, topic.status);
                  const ButtonIcon = getButtonIcon(currentStatus);
                  
                  return (
                    <Card key={topic.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <span className="font-medium">{topic.name}</span>
                            <Badge 
                              variant={currentStatus === 'finished' ? 'default' : 'outline'}
                            >
                              {currentStatus}
                            </Badge>
                          </div>
                          
                          <AlertDialog open={topicToConfirm?.id === topic.id} onOpenChange={(open) => !open && setTopicToConfirm(null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                onClick={() => handleFinishClick(topic)}
                                variant={currentStatus === 'finished' ? 'outline' : 'default'}
                                size="sm"
                              >
                                <ButtonIcon className="h-4 w-4 mr-2" />
                                {getButtonText(currentStatus)}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Topic Status Change</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to mark "{topicToConfirm?.name}" as {topicToConfirm?.currentStatus === 'pending' ? 'finished' : 'pending'}?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={handleCancelAction}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleConfirmAction}>
                                  Confirm
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {filteredTopics.length === 0 && searchQuery && (
                <div className="text-center text-muted-foreground py-4">
                  No topics found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}

          {!selectedModule && selectedCourse && (
            <div className="text-center text-muted-foreground py-8">
              Please select a module to view topics
            </div>
          )}

          {!selectedCourse && (
            <div className="text-center text-muted-foreground py-8">
              Please select a course to get started
            </div>
          )}
        </CardContent>
      </Card>
    </FacultyLayout>
  );
};

export default Syllabus;