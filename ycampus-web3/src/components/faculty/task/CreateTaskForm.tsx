import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Calendar } from 'lucide-react';
import { fetchUnitsBySubject, fetchSubUnitsByUnit, UnitBasic, SubUnit } from '@/services/subjectService';

interface CreateTaskFormProps {
  subjectId: string;
  sections: string[];
  onSubmit: (taskData: any) => void;
  onCancel: () => void;
}

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ subjectId, sections, onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taskType, setTaskType] = useState<'descriptive' | 'coding'>('descriptive');
  const [units, setUnits] = useState<UnitBasic[]>([]);
  const [subUnits, setSubUnits] = useState<SubUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedSubUnit, setSelectedSubUnit] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (subjectId) {
      fetchUnitsBySubject(subjectId).then(setUnits).catch(console.error);
    }
  }, [subjectId]);

  useEffect(() => {
    if (selectedUnit) {
      fetchSubUnitsByUnit(selectedUnit).then(setSubUnits).catch(console.error);
    } else {
      setSubUnits([]);
    }
  }, [selectedUnit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && description.trim() && selectedUnit && selectedSubUnit) {
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate,
        task_type: taskType,
        unit: selectedUnit,
        sub_unit: selectedSubUnit,
        sections: sections,
        question_source: 'manual'
      });
    }
  };

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="pb-3 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Create New Task</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Task Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Intro to React Hooks"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Due Date</label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="pl-10"
                  required
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Unit</label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Sub Unit</label>
              <Select value={selectedSubUnit} onValueChange={setSelectedSubUnit} disabled={!selectedUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Sub Unit" />
                </SelectTrigger>
                <SelectContent>
                  {subUnits.map(su => (
                    <SelectItem key={su.id} value={su.id}>{su.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Task Type</label>
            <Select value={taskType} onValueChange={(v: any) => setTaskType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="descriptive">Descriptive</SelectItem>
                <SelectItem value="coding">Coding</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Task Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter detailed task description and requirements"
              rows={5}
              required
            />
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/95">
              Create Task
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateTaskForm;