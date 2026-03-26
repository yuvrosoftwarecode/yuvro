import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Edit, Trash2, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import apiService from '@/services/api';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface Topic {
  id: string;
  name: string;
  topicName?: string;
  _links?: {
    self: {
      href: string;
    };
  };
}

interface Module {
  id: string;
  name: string;
  moduleName?: string;
  topics: Topic[];
  isOpen: boolean;
  _links?: {
    self: {
      href: string;
    };
  };
}

interface Course {
  id: string;
  name: string;
  courseName?: string;
  courseId?: string;
  modules: Module[];
}

export const EditCourseForm = () => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCourseName, setSelectedCourseName] = useState<string>('');
  const [isEditingCourseName, setIsEditingCourseName] = useState<boolean>(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [newTopicNames, setNewTopicNames] = useState<{[moduleId: string]: string}>({});
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editModuleName, setEditModuleName] = useState('');
  const [editTopicName, setEditTopicName] = useState('');
  const [courseOptions, setCourseOptions] = useState<Course[]>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [moduleTopics, setModuleTopics] = useState<{[moduleId: string]: Topic[]}>({});
  const [moduleExpandStates, setModuleExpandStates] = useState<{[moduleId: string]: boolean}>({});
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleNameState, setEditingModuleNameState] = useState('');
  const [editedTopics, setEditedTopics] = useState<{[topicId: string]: string}>({});

  // Fetch courses from API
  const getCourses = async () => {
    try {
      const response = await apiService.getCourses();
      setCourseOptions(response.content || []);
      console.log(response.content);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
    }
  };

  // Handle course selection
  const handleCourseSelect = async (courseId: string) => {
    setSelectedCourseId(courseId);
    const selectedCourse = courseOptions.find(course => course.courseId === courseId);
    setSelectedCourseName(selectedCourse?.courseName || '');
    setIsEditingCourseName(false);
    setEditingModuleId(null);
    setEditingModuleNameState('');
    setEditedTopics({});
    setAvailableModules([]);
    setModuleTopics({});
    setModuleExpandStates({});
    
    if (courseId) {
      try {
        // Fetch modules for the selected course
        const modules = await apiService.getModulesByCourse(courseId);
        const modulesList = modules?._embedded?.modules || [];
        setAvailableModules(modulesList);
        
        // Initialize expand states for modules
        const expandStates: {[moduleId: string]: boolean} = {};
        modulesList.forEach((module: Module) => {
          const moduleId = module._links.self.href.split('/').pop();
          expandStates[moduleId] = false;
        });
        setModuleExpandStates(expandStates);
        
        // Fetch topics for each module
        modulesList.forEach(async (module: Module) => {
          const moduleId = module._links.self.href.split('/').pop();
          const topics = await apiService.getTopicsByModule(moduleId);
          setModuleTopics(prev => ({
            ...prev,
            [moduleId]: topics?._embedded?.topics || []
          }));
        });
      } catch (error) {
        console.error('Error fetching course details:', error);
        toast.error('Failed to fetch course details');
      }
    }
  };

  // Available courses for dropdown
  const availableCourses = useMemo(() => 
    (courseOptions || []).map(course => ({
      value: course.courseId,
      label: course.courseName
    }))
  , [courseOptions]);

  // Load courses on component mount
  useEffect(() => {
    getCourses();
  }, []);

  const toggleModule = (moduleId: string) => {
    setModuleExpandStates(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const addModule = async () => {
    if (!selectedCourseId || !newModuleName.trim()) return;

    try {
      await apiService.addModule({
        moduleName: newModuleName,
        course: `http://localhost:9090/courses/${selectedCourseId}`
      });
      setNewModuleName('');
      await handleCourseSelect(selectedCourseId);
      toast.success('Module added successfully!');
    } catch (error) {
      console.error('Error adding module:', error);
      toast.error('Failed to add module');
    }
  };

  const deleteModule = async (moduleId: string) => {
    try {
      await apiService.deleteModule(moduleId);
      await handleCourseSelect(selectedCourseId);
      toast.success('Module deleted successfully!');
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Failed to delete module');
    }
  };

  const addTopic = async (moduleId: string) => {
    const topicName = newTopicNames[moduleId];
    if (!topicName || !topicName.trim()) return;

    try {
      await apiService.addTopic({
        topicName,
        module: `http://localhost:9090/modules/${moduleId}`,
        topicLocked: true
      });
      setNewTopicNames(prev => ({ ...prev, [moduleId]: '' }));
      const topics = await apiService.getTopicsByModule(moduleId);
      setModuleTopics(prev => ({
        ...prev,
        [moduleId]: topics?._embedded?.topics || []
      }));
      toast.success('Topic added successfully!');
    } catch (error) {
      console.error('Error adding topic:', error);
      toast.error('Failed to add topic');
    }
  };

  const deleteTopic = async (topicId: string, moduleId: string) => {
    try {
      await apiService.deleteTopic(topicId);
      const topics = await apiService.getTopicsByModule(moduleId);
      setModuleTopics(prev => ({
        ...prev,
        [moduleId]: topics?._embedded?.topics || []
      }));
      toast.success('Topic deleted successfully!');
    } catch (error) {
      console.error('Error deleting topic:', error);
      toast.error('Failed to delete topic');
    }
  };

  const startEditingModule = (moduleId: string, currentName: string) => {
    setEditingModuleId(moduleId);
    setEditingModuleNameState(currentName);
  };

  const saveModuleEdit = async (moduleId: string) => {
    if (editingModuleId === moduleId && editingModuleNameState) {
      try {
        await apiService.updateModule(moduleId, { moduleName: editingModuleNameState });
      } catch (error) {
        console.error('Error updating module:', error);
        toast.error('Failed to update module');
        return;
      }
    }
    
    const topics = moduleTopics[moduleId] || [];
    for (const topic of topics) {
      const topicId = topic._links?.self.href.split('/').pop();
      if (
        topicId &&
        editedTopics[topicId] !== undefined &&
        editedTopics[topicId] !== topic.topicName
      ) {
        try {
          await apiService.updateTopic(topicId, { topicName: editedTopics[topicId] });
        } catch (error) {
          console.error('Error updating topic:', error);
          toast.error('Failed to update topic');
        }
      }
    }
    
    await handleCourseSelect(selectedCourseId);
    setEditingModuleId(null);
    setEditingModuleNameState('');
    setEditedTopics({});
    toast.success('Changes saved successfully!');
  };

  const cancelModuleEdit = () => {
    setEditingModuleId(null);
    setEditingModuleNameState('');
  };

  const startEditingTopic = (topicId: string, currentName: string) => {
    console.log('Starting topic edit:', { topicId, currentName });
    setEditingTopic(topicId);
    setEditTopicName(currentName);
  };

  const saveTopicEdit = async (moduleId: string, topicId: string) => {
    if (!editTopicName.trim()) return;
    
    console.log('Saving topic edit:', { moduleId, topicId, editTopicName });
    
    try {
      const updatePayload = { topicName: editTopicName };
      console.log('Update payload:', updatePayload);
      
      await apiService.updateTopic(topicId, updatePayload);
      
      // Refresh the topics for this module
      const topics = await apiService.getTopicsByModule(moduleId);
      setModuleTopics(prev => ({
        ...prev,
        [moduleId]: topics?._embedded?.topics || []
      }));
      
      setEditingTopic(null);
      setEditTopicName('');
      toast.success('Topic name updated successfully!');
    } catch (error) {
      console.error('Error updating topic:', error);
      toast.error('Failed to update topic');
    }
  };

  const cancelTopicEdit = () => {
    setEditingTopic(null);
    setEditTopicName('');
  };

  const saveCourseNameEdit = async () => {
    if (!selectedCourseId || !selectedCourseName.trim()) return;
    
    try {
      await apiService.updateCourse(selectedCourseId, { courseName: selectedCourseName.trim() });
      setIsEditingCourseName(false);
      await getCourses(); // Refresh courses list
      toast.success('Course name updated successfully!');
    } catch (error) {
      console.error('Error updating course name:', error);
      toast.error('Failed to update course name');
    }
  };

  const cancelCourseNameEdit = () => {
    const selectedCourse = courseOptions.find(course => course.courseId === selectedCourseId);
    setSelectedCourseName(selectedCourse?.courseName || '');
    setIsEditingCourseName(false);
  };

  const handleClose = () => {
    setSelectedCourseId('');
    setSelectedCourse(null);
    setSelectedCourseName('');
    setIsEditingCourseName(false);
    setNewModuleName('');
    setNewTopicNames({});
    setEditingModuleId(null);
    setEditingTopic(null);
    setEditingModuleNameState('');
    setEditTopicName('');
    setAvailableModules([]);
    setModuleTopics({});
    setModuleExpandStates({});
    setEditedTopics({});
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-foreground">Edit Syllabus</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Select Course <span className="text-destructive">*</span>
          </Label>
          <Select value={selectedCourseId} onValueChange={handleCourseSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {availableCourses.map(course => (
                <SelectItem key={course.value} value={course.value}>
                  {course.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCourseId && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
                <Label className="text-sm font-medium">Course Name:</Label>
                {isEditingCourseName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={selectedCourseName}
                      onChange={(e) => setSelectedCourseName(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={saveCourseNameEdit}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelCourseNameEdit}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{selectedCourseName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingCourseName(true)}
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="New module name"
                value={newModuleName}
                onChange={(e) => setNewModuleName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={addModule} disabled={!newModuleName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            </div>

            <div className="space-y-4">
              {availableModules.map((module) => {
                const moduleId = module._links.self.href.split('/').pop();
                return (
                <Card key={moduleId} className="border">
                  <Collapsible open={moduleExpandStates[moduleId]} onOpenChange={() => toggleModule(moduleId)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          {moduleExpandStates[moduleId] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {editingModuleId === moduleId ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingModuleNameState}
                                onChange={(e) => setEditingModuleNameState(e.target.value)}
                                className="font-medium"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveModuleEdit(moduleId);
                                }}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelModuleEdit();
                                }}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <span className="font-medium">{module.moduleName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {editingModuleId !== moduleId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingModule(moduleId, module.moduleName);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <ConfirmDeleteDialog
                            title="Delete Module"
                            description="Are you sure you want to delete the module '{itemName}'? This will also delete all topics within this module. This action cannot be undone."
                            itemName={module.moduleName}
                            onConfirm={() => deleteModule(moduleId)}
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 px-4">
                        <div className="space-y-3">
                          {(moduleTopics[moduleId] || []).map((topic) => {
                            const topicId = topic._links?.self.href.split('/').pop();
                            return (
                            <div key={topicId} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                              {editingTopic === topicId ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <Input
                                    value={editTopicName}
                                    onChange={(e) => setEditTopicName(e.target.value)}
                                    className="flex-1"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => saveTopicEdit(moduleId, topicId)}
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelTopicEdit}
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <span>{topic.topicName}</span>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditingTopic(topicId, topic.topicName)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <ConfirmDeleteDialog
                                      title="Delete Topic"
                                      description="Are you sure you want to delete the topic '{itemName}'? This action cannot be undone."
                                      itemName={topic.topicName}
                                      onConfirm={() => deleteTopic(topicId, moduleId)}
                                      variant="ghost"
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                            );
                          })}
                          
                          <div className="flex gap-2">
                            <Input
                              placeholder="New topic name"
                              value={newTopicNames[moduleId] || ''}
                              onChange={(e) => setNewTopicNames({
                                ...newTopicNames,
                                [moduleId]: e.target.value
                              })}
                              className="flex-1"
                            />
                            <Button 
                              onClick={() => addTopic(moduleId)}
                              disabled={!newTopicNames[moduleId]?.trim()}
                            >
                              Add Topic
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};