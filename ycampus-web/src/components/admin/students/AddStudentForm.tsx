import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { MultiSelect } from '@/components/ui/multi-select';
import { useToast } from '@/hooks/use-toast';
import { useCourseManagement } from '@/hooks/useCourseManagement';
import apiService from '@/services/api';

const addStudentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  courses: z.array(z.string()).min(1, 'Select at least one course'),
  batches: z.array(z.string()).min(1, 'Select at least one batch'),
});

type AddStudentForm = z.infer<typeof addStudentSchema>;



export const AddStudentForm: React.FC = () => {
  const [availableBatches, setAvailableBatches] = useState<{batchId: string, batchName: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const { toast } = useToast();
  const { availableCourses, loading: coursesLoading } = useCourseManagement();

  const form = useForm<AddStudentForm>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      courses: [],
      batches: [],
    },
  });

  

  // Update available batches when courses change
  const watchedCourses = form.watch('courses');
  const selectedCourses = React.useMemo(() => watchedCourses || [], [watchedCourses]);
  
  // Fetch batches for selected courses
  const getBatchesForCourses = React.useCallback(async (courseIds: string[]) => {
    if (courseIds.length === 0) {
      setAvailableBatches([]);
      form.setValue('batches', []);
      return;
    }

    setLoadingBatches(true);
    try {
      const batchPromises = courseIds.map(courseId => 
        apiService.getBatchesByCourse(String(courseId))
      );
      
      const batchResponses = await Promise.all(batchPromises);
      console.log({batchResponses});
      
      // Flatten and normalize all batches from all courses
      const allCourseBatches = batchResponses.flatMap(response => 
        response._embedded.batches.map((batch: {batchId?: string, batchName?: string, _links?: {self?: {href?: string}}}) => {
          const id = String(batch?._links?.self?.href?.split('/')?.pop() ?? '');
          return {
            batchId: batch.batchId ?? id,
            batchName: batch.batchName ?? ''
          };
        })
      );
      
      // Filter out duplicate batches based on batchId
      const uniqueBatches = allCourseBatches.filter((batch, index, self) => 
        index === self.findIndex(b => b.batchId === batch.batchId)
      );
      
      console.log({allCourseBatches, uniqueBatches});
      
      setAvailableBatches(uniqueBatches);
      
      // Clear selected batches that are no longer available
      const currentBatches = form.watch('batches') || [];
      const validBatches = currentBatches.filter(batchId =>
        uniqueBatches.some(batch => batch.batchId === batchId)
      );
      form.setValue('batches', validBatches);
      
    } catch (error) {
      console.error('Error fetching batches for courses:', error);
      toast({
        description: "Failed to fetch batches for selected courses"
      });
    } finally {
      setLoadingBatches(false);
    }
  }, [form, toast]);

  useEffect(() => {
    console.log({selectedCourses})
    getBatchesForCourses(selectedCourses);
  }, [selectedCourses, getBatchesForCourses]);

  const onSubmit = async (data: AddStudentForm) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        courses: data.courses.map(courseId => `http://localhost:9090/courses/${courseId}`),
        batches: data.batches.map(batchId => `http://localhost:9090/courses/${batchId}`),
        type: 'student'
      };
      console.log({batc:data.batches})
      const response = await apiService.addCandidate(payload);
      const candidateId = response._links.self.href.split('/').pop();
      console.log({batc:data.batches,candidateId})
      data.batches.map(async (batch)=>{
        const payload2 = {
          batchId: batch.split('/')?.pop(),
          candidateIds: [candidateId],
        }
        await apiService.addCandidateToBatches(payload2);
      })
      
      toast({
        title: "Student Added",
        description: "New student has been successfully registered.",
      });
      form.reset();
    } catch (error) {
      console.error('Error adding student:', error);
      toast({
        title: "Error",
        description: "Failed to add student",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCourseChange = (selectedCourses: string[]) => {
    form.setValue('courses', selectedCourses);
  };

  const handleBatchChange = (selectedBatches: string[]) => {
    form.setValue('batches', selectedBatches);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Student</CardTitle>
        <CardDescription>
          Fill in the student details and assign them to courses and batches.
        </CardDescription>
      </CardHeader>
      <CardContent>
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

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="courses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Enrollment</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={availableCourses || []}
                        selected={field.value}
                        onChange={handleCourseChange}
                        placeholder="Choose courses..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="batches"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Enrollment</FormLabel>
                    <FormControl>
                      <div className={selectedCourses.length === 0 ? "opacity-50 pointer-events-none" : ""}>
                        <MultiSelect
                          options={availableBatches.map(batch => ({
                            value: String(batch.batchId),
                            label: batch.batchName
                          }))}
                          selected={field.value}
                          onChange={handleBatchChange}
                          placeholder={
                            selectedCourses.length === 0 
                              ? "Select courses first..." 
                              : loadingBatches 
                                ? "Loading batches..." 
                                : "Choose batches..."
                          }
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                    {selectedCourses.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Please select courses to enable batch enrollment
                      </p>
                    )}
                    {selectedCourses.length > 0 && loadingBatches && (
                      <p className="text-sm text-muted-foreground">
                        Loading batches for selected courses...
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || coursesLoading || loadingBatches}>
              {isSubmitting ? 'Adding Student...' : 'Add Student'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};