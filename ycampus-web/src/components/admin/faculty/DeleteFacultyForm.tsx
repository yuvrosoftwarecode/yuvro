import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock data - replace with actual API calls
const mockFaculty = [
  { 
    id: '1', 
    name: 'Dr. Smith', 
    email: 'smith@example.com', 
    phone: '1234567890',
    courses: ['React Development'],
    batches: ['Batch A', 'Batch D']
  },
  { 
    id: '2', 
    name: 'Prof. Johnson', 
    email: 'johnson@example.com', 
    phone: '0987654321',
    courses: ['Node.js Backend', 'Full Stack Development'],
    batches: ['Batch B', 'Batch C']
  },
];

export const DeleteFacultyForm: React.FC = () => {
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { toast } = useToast();

  const handleDelete = () => {
    console.log('Deleting faculty:', selectedFaculty);
    toast({
      title: "Faculty Deleted",
      description: "Faculty member has been successfully removed from the system.",
      variant: "destructive",
    });
    setSelectedFaculty('');
    setShowConfirmation(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete Faculty</CardTitle>
        <CardDescription>
          Remove a faculty member from the system. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium">Select Faculty</label>
            <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a faculty member to delete" />
              </SelectTrigger>
              <SelectContent>
                {mockFaculty.map((faculty) => (
                  <SelectItem key={faculty.id} value={faculty.id}>
                    {faculty.name} ({faculty.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFaculty && (
            <div className="space-y-4">
              {(() => {
                const faculty = mockFaculty.find(f => f.id === selectedFaculty);
                return faculty ? (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h3 className="font-medium text-lg">{faculty.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                      <div>
                        <span className="font-medium">Email:</span> {faculty.email}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span> {faculty.phone}
                      </div>
                      <div>
                        <span className="font-medium">Courses:</span> {faculty.courses.join(', ')}
                      </div>
                      <div>
                        <span className="font-medium">Batches:</span> {faculty.batches.join(', ')}
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Warning</span>
                </div>
                <p className="text-red-700 mt-2 text-sm">
                  Deleting this faculty member will permanently remove their record and all associated 
                  course assignments and batch allocations. This action cannot be undone.
                </p>
              </div>

              {!showConfirmation ? (
                <Button
                  onClick={() => setShowConfirmation(true)}
                  variant="destructive"
                  className="w-full"
                >
                  Delete Faculty
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-center text-sm font-medium">
                    Are you sure you want to delete this faculty member?
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleDelete}
                      variant="destructive"
                      className="flex-1"
                    >
                      Yes, Delete Permanently
                    </Button>
                    <Button
                      onClick={() => setShowConfirmation(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};