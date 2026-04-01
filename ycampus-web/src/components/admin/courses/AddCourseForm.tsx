import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import apiService from "@/services/api";
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface Topic {
  id: string;
  name: string;
}

interface Module {
  id: string;
  name: string;
  topics: Topic[];
}

export const AddCourseForm = () => {
  const [courseName, setCourseName] = useState('');
  const [modules, setModules] = useState<Module[]>([
    { id: '1', name: '', topics: [{ id: '1', name: '' }] }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addModule = () => {
    const newModule: Module = {
      id: Date.now().toString(),
      name: '',
      topics: [{ id: Date.now().toString(), name: '' }]
    };
    setModules([...modules, newModule]);
  };

  const removeModule = (moduleId: string) => {
    if (modules.length === 1) return;
    setModules(modules.filter(module => module.id !== moduleId));
  };

  const updateModuleName = (moduleId: string, name: string) => {
    setModules(modules.map(module => 
      module.id === moduleId ? { ...module, name } : module
    ));
  };

  const addTopic = (moduleId: string) => {
    setModules(modules.map(module => 
      module.id === moduleId 
        ? { 
            ...module, 
            topics: [...module.topics, { id: Date.now().toString(), name: '' }] 
          }
        : module
    ));
  };

  const removeTopic = (moduleId: string, topicId: string) => {
    setModules(modules.map(module => 
      module.id === moduleId 
        ? { 
            ...module, 
            topics: module.topics.length > 1 
              ? module.topics.filter(topic => topic.id !== topicId)
              : module.topics
          }
        : module
    ));
  };

  const updateTopicName = (moduleId: string, topicId: string, name: string) => {
    setModules(modules.map(module => 
      module.id === moduleId 
        ? { 
            ...module, 
            topics: module.topics.map(topic => 
              topic.id === topicId ? { ...topic, name } : topic
            ) 
          }
        : module
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courseName.trim()) {
      toast.error('Please enter a course name');
      return;
    }

    if (modules.some(module => !module.name.trim())) {
      toast.error('Please fill in all module names');
      return;
    }

    if (modules.some(module => module.topics.some(topic => !topic.name.trim()))) {
      toast.error('Please fill in all topic names');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create Course
      const coursePayload = {
        courseName: courseName.trim(),
        moduleNames: modules.map(module => module.name.trim())
      };
      const courseResponse = await apiService.addCourse(coursePayload);
      console.log('Course Payload:', coursePayload);
      console.log('Course Response:', courseResponse);
      
      if (!courseResponse) {
        throw new Error('Failed to create course');
      }

      // Step 2: Create Modules
      for (const module of modules) {
        const modulePayload = {
          moduleName: module.name.trim(),
          course: courseResponse._links.course.href
        };
        
        const moduleResponse = await apiService.addModule(modulePayload);
        console.log('Module Payload:', modulePayload);
        console.log('Module Response:', moduleResponse);
        
        if (!moduleResponse) {
          throw new Error(`Failed to create module: ${module.name}`);
        }

        // Step 3: Create Topics for each Module
        for (const topic of module.topics) {
          const topicPayload = {
            topicName: topic.name.trim(),
            module: moduleResponse._links.module.href,
            topicLocked: true
          };
          
          const topicResponse = await apiService.addTopic(topicPayload);
          console.log('Topic Payload:', topicPayload);
          console.log('Topic Response:', topicResponse);
          
          if (!topicResponse) {
            throw new Error(`Failed to create topic: ${topic.name}`);
          }
        }
      }

      toast.success('Course syllabus created successfully!');
      
      // Reset form
      setCourseName('');
      setModules([{ id: '1', name: '', topics: [{ id: '1', name: '' }] }]);
      
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create course');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setCourseName('');
    setModules([{ id: '1', name: '', topics: [{ id: '1', name: '' }] }]);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-foreground">Add Syllabus</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="courseName" className="text-sm font-medium">
            Course Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="courseName"
            placeholder="Enter course name"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            required
            className="w-full"
          />
        </div>

        <div className="space-y-4">
          {modules.map((module, moduleIndex) => (
            <Card key={module.id} className="border-2 border-dashed border-muted-foreground/20">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">
                      Module Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="Enter module name"
                      value={module.name}
                      onChange={(e) => updateModuleName(module.id, e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  {modules.length > 1 && (
                    <ConfirmDeleteDialog
                      title="Remove Module"
                      description="Are you sure you want to remove the module '{itemName}'?"
                      itemName={module.name || 'Untitled Module'}
                      onConfirm={() => removeModule(module.id)}
                      variant="outline"
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="mt-6"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      }
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Topics for this module <span className="text-destructive">*</span>
                  </Label>
                  
                  {module.topics.map((topic, topicIndex) => (
                    <div key={topic.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Enter topic name"
                        value={topic.name}
                        onChange={(e) => updateTopicName(module.id, topic.id, e.target.value)}
                        required
                        className="flex-1"
                      />
                      {module.topics.length > 1 && (
                        <ConfirmDeleteDialog
                          title="Remove Topic"
                          description="Are you sure you want to remove the topic '{itemName}'?"
                          itemName={topic.name || 'Untitled Topic'}
                          onConfirm={() => removeTopic(module.id, topic.id)}
                          variant="outline"
                        />
                      )}
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addTopic(module.id)}
                    className="w-full border-2 border-gray-200 text-primary hover:background-color: #eceef2;"
                  >
                    Add Another Topic
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addModule}
            className="w-full border-2 border-gray-200 text-primary hover:background-color: #eceef2;"
          >
            Add Another Module
          </Button>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-primary hover:bg-primary/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Add Syllabus'}
          </Button>
        </div>
      </form>
    </div>
  );
};