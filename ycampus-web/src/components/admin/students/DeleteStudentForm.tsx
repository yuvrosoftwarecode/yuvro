import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import apiService from '@/services/api';


interface StudentDetails {
  name?: string;
  candidateName?: string;
  email?: string;
  candidateEmail?: string;
  phone?: string;
  candidatePhone?: string;
  type?: string;
}

export const DeleteStudentForm: React.FC = () => {
  const [studentId, setStudentId] = useState<string>('');
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!studentId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a student ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.getCandidate(studentId);
      setStudentDetails(response);
      setShowConfirmation(false);
    } catch (error) {
      console.error('Error fetching student:', error);
      toast({
        title: "Error",
        description: "Student not found or failed to fetch student details",
        variant: "destructive",
      });
      setStudentDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!studentId) return;

    try {
      console.log({studentId});
      await apiService.deleteCandidate(studentId);
      toast({
        title: "Student Deleted",
        description: "Student has been successfully removed from the system.",
        variant: "destructive",
      });
      setStudentId('');
      setStudentDetails(null);
      setShowConfirmation(false);
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete Student</CardTitle>
        <CardDescription>
          Remove a student from the system. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Student ID</label>
              <div className="flex gap-2">
                <Input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Enter student ID"
                  className="flex-1"
                />
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !studentId.trim()}
                  variant="outline"
                >
                  {isLoading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
          </div>

          {studentDetails && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <h3 className="font-medium text-lg">{studentDetails.name || studentDetails.candidateName}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <span className="font-medium">Email:</span> {studentDetails.email || studentDetails.candidateEmail}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {studentDetails.phone || studentDetails.candidatePhone}
                  </div>
                  <div>
                    <span className="font-medium">Student ID:</span> {studentId}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {studentDetails.type || 'Student'}
                  </div>
                </div>
              </div>

              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Warning</span>
                </div>
                <p className="text-red-700 mt-2 text-sm">
                  Deleting this student will permanently remove their record and all associated 
                  course enrollments and batch assignments. This action cannot be undone.
                </p>
              </div>

              {!showConfirmation ? (
                <Button
                  onClick={() => setShowConfirmation(true)}
                  variant="destructive"
                  className="w-full"
                >
                  Delete Student
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-center text-sm font-medium">
                    Are you sure you want to delete this student?
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