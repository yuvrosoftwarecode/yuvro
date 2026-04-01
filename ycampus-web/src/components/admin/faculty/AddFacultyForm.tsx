import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const addFacultySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  courses: z.array(z.string()).min(1, 'Select at least one course'),
  batches: z.array(z.string()).min(1, 'Select at least one batch'),
});

type AddFacultyForm = z.infer<typeof addFacultySchema>;

// Mock data - replace with actual API calls
const mockCourses = [
  { id: '1', name: 'React Development' },
  { id: '2', name: 'Node.js Backend' },
  { id: '3', name: 'Full Stack Development' },
];

const mockBatches = [
  { id: '1', name: 'Batch A', courseId: '1' },
  { id: '2', name: 'Batch B', courseId: '2' },
  { id: '3', name: 'Batch C', courseId: '3' },
  { id: '4', name: 'Batch D', courseId: '1' },
];

export const AddFacultyForm: React.FC = () => {
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [availableBatches, setAvailableBatches] = useState(mockBatches);
  const { toast } = useToast();

  const form = useForm<AddFacultyForm>({
    resolver: zodResolver(addFacultySchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      courses: [],
      batches: [],
    },
  });

  // Update available batches when courses change
  useEffect(() => {
    if (selectedCourses.length === 0) {
      setAvailableBatches([]);
    } else {
      const filteredBatches = mockBatches.filter(batch =>
        selectedCourses.includes(batch.courseId)
      );
      setAvailableBatches(filteredBatches);
      
      // Clear selected batches that are no longer available
      const currentBatches = form.watch('batches') || [];
      const validBatches = currentBatches.filter(batchId =>
        filteredBatches.some(batch => batch.id === batchId)
      );
      form.setValue('batches', validBatches);
    }
  }, [selectedCourses, form]);

  const onSubmit = (data: AddFacultyForm) => {
    console.log('Adding faculty:', data);
    toast({
      title: "Faculty Added",
      description: "New faculty member has been successfully registered.",
    });
    form.reset();
    setSelectedCourses([]);
  };

  const removeCourse = (courseId: string) => {
    const newSelectedCourses = selectedCourses.filter(id => id !== courseId);
    setSelectedCourses(newSelectedCourses);
    form.setValue('courses', newSelectedCourses);
  };

  const removeBatch = (batchId: string) => {
    const currentBatches = form.watch('batches') || [];
    const newBatches = currentBatches.filter(id => id !== batchId);
    form.setValue('batches', newBatches);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Faculty</CardTitle>
        <CardDescription>
          Fill in the faculty details and assign them to courses and batches.
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
                      <Input placeholder="Enter faculty's full name" {...field} />
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
                render={() => (
                  <FormItem>
                    <FormLabel>Course Assignments</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        if (value && !selectedCourses.includes(value)) {
                          const newSelectedCourses = [...selectedCourses, value];
                          setSelectedCourses(newSelectedCourses);
                          form.setValue('courses', newSelectedCourses);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select courses to teach" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mockCourses
                          .filter(course => !selectedCourses.includes(course.id))
                          .map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedCourses.map((courseId) => {
                        const course = mockCourses.find(c => c.id === courseId);
                        return (
                          <Badge key={courseId} variant="secondary" className="flex items-center gap-1">
                            {course?.name}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeCourse(courseId)}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {availableBatches.length > 0 && (
                <FormField
                  control={form.control}
                  name="batches"
                  render={() => (
                    <FormItem>
                      <FormLabel>Batch Assignments</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const currentBatches = form.watch('batches') || [];
                          if (value && !currentBatches.includes(value)) {
                            const newBatches = [...currentBatches, value];
                            form.setValue('batches', newBatches);
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select batches to teach" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableBatches
                            .filter(batch => !(form.watch('batches') || []).includes(batch.id))
                            .map((batch) => (
                              <SelectItem key={batch.id} value={batch.id}>
                                {batch.name} ({mockCourses.find(c => c.id === batch.courseId)?.name})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(form.watch('batches') || []).map((batchId) => {
                          const batch = availableBatches.find(b => b.id === batchId);
                          const course = mockCourses.find(c => c.id === batch?.courseId);
                          return (
                            <Badge key={batchId} variant="secondary" className="flex items-center gap-1">
                              {batch?.name} ({course?.name})
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => removeBatch(batchId)}
                              />
                            </Badge>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Button type="submit" className="w-full">
              Add Faculty
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};