import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, Send, Eye, Users } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Task {
  id: string;
  title: string;
  description: string;
  is_sent: boolean;
  created_at: string;
  task_type: 'descriptive' | 'coding';
  due_date?: string;
  unit?: string;
  sub_unit?: string;
}

interface TaskCardProps {
  task: Task;
  onEdit: (taskId: string, updatedData: { title: string; description: string }) => void;
  onDelete: (taskId: string) => void;
  onSend: (taskId: string, sectionIds?: string[]) => void;
  onViewResponses: (taskId: string) => void;
  availableSections?: { id: string; name: string }[];
  currentSectionId?: string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onSend,
  onViewResponses,
  availableSections = [],
  currentSectionId
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description);
  const [showSendOptions, setShowSendOptions] = useState(false);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>(currentSectionId ? [currentSectionId] : []);

  const handleSaveEdit = () => {
    onEdit(task.id, { title: editTitle, description: editDescription });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditDescription(task.description);
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all border-slate-200 group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="font-semibold"
              placeholder="Task title"
            />
          ) : (
            <CardTitle className="text-lg leading-tight">{task.title}</CardTitle>
          )}
          <Badge variant={!task.is_sent ? 'secondary' : 'default'}>
            {task.is_sent ? 'Sent' : 'Draft'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 space-y-3">
          {isEditing ? (
            <Textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Task description"
              rows={4}
            />
          ) : (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {task.description}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Created: {formatDate(task.created_at)}
          </p>
        </div>

        <div className="pt-4 space-y-2">
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} className="flex-1">
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit} className="flex-1">
                Cancel
              </Button>
            </div>
          ) : (
            <>
              {!task.is_sent ? (
                <>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Task</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{task.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(task.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full font-bold shadow-sm" 
                    onClick={() => setShowSendOptions(true)}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Send Task
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onViewResponses(task.id)}
                  className="w-full"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Responses
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>

      {/* Step 1: Send Options Dialog */}
      <Dialog open={showSendOptions} onOpenChange={setShowSendOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send "{task.title}"</DialogTitle>
            <DialogDescription>
              Choose how you want to distribute this task to students.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button 
              className="w-full h-12 justify-start px-4 font-bold" 
              onClick={() => {
                onSend(task.id, currentSectionId ? [currentSectionId] : undefined);
                setShowSendOptions(false);
              }}
            >
              <Send className="h-4 w-4 mr-3" />
              Send to this section only
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-12 justify-start px-4 font-bold border-slate-200" 
              onClick={() => {
                setShowSendOptions(false);
                setShowMultiModal(true);
                // Preselect current section
                if (currentSectionId) setSelectedSections([currentSectionId]);
              }}
            >
              <Users className="h-4 w-4 mr-3" />
              Send to additional sections
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2: Multi-Section Modal */}
      <Dialog open={showMultiModal} onOpenChange={setShowMultiModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Target Sections</DialogTitle>
            <DialogDescription>
              Select the sections where you want to publish this task.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-sm font-bold text-slate-500">Available Sections</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-[11px] font-bold text-primary hover:text-primary/80"
                onClick={() => {
                  if (selectedSections.length === availableSections?.length) {
                    setSelectedSections(currentSectionId ? [currentSectionId] : []);
                  } else {
                    setSelectedSections(availableSections?.map(s => s.id) || []);
                  }
                }}
              >
                {selectedSections.length === availableSections?.length ? 'Unselect All' : 'Select All Sections'}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2">
              {availableSections?.map((section) => (
                <div 
                  key={section.id} 
                  className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                    selectedSections.includes(section.id) ? 'bg-primary/5 border-primary/20' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    const isSelected = selectedSections.includes(section.id);
                    setSelectedSections(prev => {
                      if (isSelected) {
                        return prev.filter(id => id !== section.id);
                      }
                      // Ensure uniqueness
                      return prev.includes(section.id) ? prev : [...prev, section.id];
                    });
                  }}
                >
                  <Checkbox 
                    id={`section-${section.id}`} 
                    checked={selectedSections.includes(section.id)}
                    tabIndex={-1} // Prevent double focus/tab
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={`section-${section.id}`} 
                      className="text-sm font-bold text-slate-700 cursor-pointer block"
                    >
                      {section.name}
                    </Label>
                    {section.id === currentSectionId && (
                      <span className="text-[10px] font-bold text-primary/60">Current Selection</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowMultiModal(false)} className="font-bold border-slate-200">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                onSend(task.id, selectedSections);
                setShowMultiModal(false);
              }}
              disabled={selectedSections.length === 0}
              className="font-bold shadow-md h-10 px-6"
            >
              Send to {selectedSections.length} {selectedSections.length === 1 ? 'Section' : 'Sections'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TaskCard;