import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { Department, Semester, Section } from '@/hooks/useDepartments';

interface DepartmentFormProps {
  onSubmit: (data: Omit<Department, 'id' | 'created_at' | 'updated_at'>) => void;
  initialData?: Department;
}

export function DepartmentForm({ onSubmit, initialData }: DepartmentFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    numSemesters: 0,
  });
  
  const [semesters, setSemesters] = useState<Semester[]>([]);

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        code: initialData.code || '',
        description: initialData.description || '',
        numSemesters: initialData.semesters?.length || 0,
      });
      setSemesters(initialData.semesters || []);
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        numSemesters: 0,
      });
      setSemesters([]);
    }
  }, [initialData]);

  const handleNumSemestersChange = (num: number) => {
    setFormData({ ...formData, numSemesters: num });
    
    const newSemesters: Semester[] = [];
    for (let i = 1; i <= num; i++) {
      const existing = semesters.find(s => s.number === i);
      newSemesters.push(existing || {
        id: `temp-${i}`,
        number: i,
        sections: []
      });
    }
    setSemesters(newSemesters);
  };

  const addSection = (semesterIndex: number) => {
    const newSemesters = [...semesters];
    const sectionLetter = String.fromCharCode(65 + newSemesters[semesterIndex].sections.length);
    newSemesters[semesterIndex].sections.push({
      id: `temp-${semesterIndex}-${sectionLetter}`,
      name: sectionLetter
    });
    setSemesters(newSemesters);
  };

  const removeSection = (semesterIndex: number, sectionIndex: number) => {
    const newSemesters = [...semesters];
    newSemesters[semesterIndex].sections.splice(sectionIndex, 1);
    setSemesters(newSemesters);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      code: formData.code,
      description: formData.description,
      semesters: semesters
    });
    
    // Reset form after submit if not editing
    if (!initialData) {
      setFormData({
        name: '',
        code: '',
        description: '',
        numSemesters: 0,
      });
      setSemesters([]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Department Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Computer Science Engineering"
          required
        />
      </div>

      <div>
        <Label htmlFor="code">Department Code *</Label>
        <Input
          id="code"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          placeholder="e.g., CSE"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Department description..."
        />
      </div>

      <div>
        <Label htmlFor="numSemesters">Number of Semesters *</Label>
        <Input
          id="numSemesters"
          type="number"
          min="0"
          max="12"
          value={formData.numSemesters}
          onChange={(e) => handleNumSemestersChange(parseInt(e.target.value) || 0)}
        />
      </div>

      {semesters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Semester Sections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {semesters.map((semester, semIdx) => (
              <div key={semester.id || `sem-${semIdx}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Semester {semester.number}</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addSection(semIdx)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Section
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {semester.sections.map((section, secIdx) => (
                    <div key={section.id || `sec-${secIdx}`} className="flex items-center gap-1 bg-secondary px-3 py-1 rounded">
                      <span>Section {section.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0"
                        onClick={() => removeSection(semIdx, secIdx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {semester.sections.length === 0 && (
                    <span className="text-sm text-muted-foreground">No sections added</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          {initialData ? 'Update Department' : 'Create Department'}
        </Button>
      </div>
    </form>
  );
}
