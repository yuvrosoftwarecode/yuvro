import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import apiService from '@/services/api';

const editStudentSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  courses: z.array(z.string()),
  batches: z.array(z.string()),
});

type EditStudentForm = z.infer<typeof editStudentSchema>;

interface StudentDetails {
  id?: string;
  name?: string;
  candidateName?: string;
  email?: string;
  candidateEmail?: string;
  phone?: string;
  candidatePhone?: string;
  type?: string;
}

export const EditStudentForm: React.FC = () => {
  const [studentId, setStudentId] = useState<string>('');
  const [studentDetails, setStudentDetails] = useState<StudentDetails | null>(null);
  const [assignedBatches, setAssignedBatches] = useState<{batchId: string, batchName: string}[]>([]);
  const [unassignedBatches, setUnassignedBatches] = useState<{batchId: string, batchName: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditStudentForm>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      id: '',
      name: '',
      email: '',
      phone: '',
      courses: [],
      batches: [],
    },
  });

  // Fetch student details
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
      
      // Reset form with student data
      form.reset({
        id: studentId,
        name: response.name || response.candidateName || '',
        email: response.email || response.candidateEmail || '',
        phone: response.phone || response.candidatePhone || '',
        courses: [],
        batches: [],
      });

      // Get assigned batches from student's batches
      if (response.batches && response.batches.length > 0) {
        const assignedBatchesData = response.batches.map((batch: {batchId?: string, batchName?: string, name?: string, _links?: {self?: {href?: string}}}) => {
          const batchId = String(batch._links?.self?.href?.split('/')?.pop() ?? '');
          return {
            batchId: batchId,
            batchName: batch.batchName || batch.name || 'Unknown Batch'
          };
        });
        setAssignedBatches(assignedBatchesData);
      } else {
        setAssignedBatches([]);
      }

      // Fetch all batches to calculate unassigned ones
      await getAllBatches();
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

  // Fetch all batches and calculate unassigned ones
  const getAllBatches = React.useCallback(async () => {
    try {
      const response = await apiService.getBatches();
      const allBatches = response.content.map((batch: {batchId?: string, batchName?: string, _links?: {self?: {href?: string}}}) => {
        const id = String(batch?._links?.self?.href?.split('/')?.pop() ?? '');
        return {
          batchId: batch.batchId ?? id,
          batchName: batch.batchName ?? ''
        };
      });
      
      // Calculate unassigned batches (all batches - assigned batches)
      const assignedBatchIds = assignedBatches.map(batch => batch.batchId);
      const unassignedBatchesData = allBatches.filter(batch => 
        !assignedBatchIds.includes(batch.batchId)
      );
      
      setUnassignedBatches(unassignedBatchesData);
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast({
        description: "Failed to fetch batches"
      });
    }
  }, [toast, assignedBatches]);

  // Update unassigned batches when assigned batches change
  useEffect(() => {
    if (assignedBatches.length > 0 || unassignedBatches.length > 0) {
      getAllBatches();
    }
  }, [assignedBatches, unassignedBatches.length, getAllBatches]);

  const onSubmit = async (data: EditStudentForm) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        courses: [],
        batches: assignedBatches.map(batch => `http://localhost:9090/batches/${batch.batchId}`),
        type: 'student'
      };
      
      await apiService.updateCandidate(data.id, payload);
      
      toast({
        title: "Student Updated",
        description: "Student information has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating student:', error);
      toast({
        title: "Error",
        description: "Failed to update student",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignBatch = (batchId: string) => {
    const batchToAssign = unassignedBatches.find(batch => batch.batchId === batchId);
    if (batchToAssign) {
      setUnassignedBatches(prev => prev.filter(batch => batch.batchId !== batchId));
      setAssignedBatches(prev => [...prev, batchToAssign]);
      form.setValue('batches', [...assignedBatches, batchToAssign].map(b => b.batchId));
    }
  };

  const handleRemoveBatch = (batchId: string) => {
    const batchToRemove = assignedBatches.find(batch => batch.batchId === batchId);
    if (batchToRemove) {
      setAssignedBatches(prev => prev.filter(batch => batch.batchId !== batchId));
      setUnassignedBatches(prev => [...prev, batchToRemove]);
      form.setValue('batches', assignedBatches.filter(b => b.batchId !== batchId).map(b => b.batchId));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Student</CardTitle>
        <CardDescription>
          Update student information and manage their course enrollments and batch assignments.
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter student's full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter email address" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  {/* Batch Assignment */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Batch Assignment</h3>
                    
                    {/* Assigned Batches */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Assigned Batches</h4>
                      <div className="min-h-[60px] p-3 border rounded-lg bg-muted/20">
                        <div className="flex flex-wrap gap-2">
                          {assignedBatches.map((batch) => (
                            <Badge key={batch.batchId} variant="secondary" className="flex items-center gap-1">
                              {batch.batchName}
                              <X
                                className="h-3 w-3 cursor-pointer hover:text-destructive"
                                onClick={() => handleRemoveBatch(batch.batchId)}
                              />
                            </Badge>
                          ))}
                          {assignedBatches.length === 0 && (
                            <p className="text-sm text-muted-foreground">No batches assigned</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Available Batches */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Available Batches</h4>
                      <div className="min-h-[60px] p-3 border rounded-lg">
                        <div className="flex flex-wrap gap-2">
                          {unassignedBatches.map((batch) => (
                            <Badge 
                              key={batch.batchId} 
                              variant="outline" 
                              className="flex items-center gap-1 cursor-pointer hover:bg-primary/10"
                              onClick={() => handleAssignBatch(batch.batchId)}
                            >
                              {batch.batchName}
                              <Plus className="h-3 w-3" />
                            </Badge>
                          ))}
                          {unassignedBatches.length === 0 && (
                            <p className="text-sm text-muted-foreground">All batches assigned</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating Student...' : 'Update Student'}
                </Button>
              </form>
            </Form>
          )}
        </div>
      </CardContent>
    </Card>
  );
};