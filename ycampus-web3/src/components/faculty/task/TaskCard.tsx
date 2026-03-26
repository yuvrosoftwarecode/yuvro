import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, Send, Eye } from 'lucide-react';
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
  onSend: (taskId: string) => void;
  onViewResponses: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onSend,
  onViewResponses
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description);

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
    <Card className="h-full flex flex-col">
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

              {!task.is_sent && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" className="w-full">
                      <Send className="h-3 w-3 mr-1" />
                      Send Task
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Send Task</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to send "{task.title}" to students? Once sent, you won't be able to edit the task.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onSend(task.id)}>
                        Send Task
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskCard;