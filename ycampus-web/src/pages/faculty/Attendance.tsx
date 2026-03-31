import React, { useState } from 'react';
import FacultyLayout from '@/components/layouts/FacultyLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, CalendarIcon, Users, Search, UserCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Mock data
const courses = [
  { id: '1', name: 'Mathematics 101', code: 'MATH101' },
  { id: '2', name: 'Physics 201', code: 'PHY201' },
  { id: '3', name: 'Chemistry 301', code: 'CHEM301' },
];

const batchesData: { [key: string]: Array<{ id: string, name: string, year: string }> } = {
  '1': [
    { id: 'b1', name: 'Batch A', year: '2024' },
    { id: 'b2', name: 'Batch B', year: '2024' },
  ],
  '2': [
    { id: 'b3', name: 'Batch C', year: '2024' },
    { id: 'b4', name: 'Batch D', year: '2023' },
  ],
  '3': [
    { id: 'b5', name: 'Batch E', year: '2024' },
    { id: 'b6', name: 'Batch F', year: '2023' },
  ]
};

const studentsData: { [key: string]: Array<{ id: string, rollNo: string, name: string, email: string }> } = {
  'b1': [
    { id: 's1', rollNo: 'MT001', name: 'John Smith', email: 'john@example.com' },
    { id: 's2', rollNo: 'MT002', name: 'Alice Johnson', email: 'alice@example.com' },
    { id: 's3', rollNo: 'MT003', name: 'Bob Wilson', email: 'bob@example.com' },
    { id: 's4', rollNo: 'MT004', name: 'Carol Davis', email: 'carol@example.com' },
  ],
  'b2': [
    { id: 's5', rollNo: 'MT005', name: 'David Brown', email: 'david@example.com' },
    { id: 's6', rollNo: 'MT006', name: 'Emma Taylor', email: 'emma@example.com' },
    { id: 's7', rollNo: 'MT007', name: 'Frank Miller', email: 'frank@example.com' },
  ],
  'b3': [
    { id: 's8', rollNo: 'PH001', name: 'Grace Lee', email: 'grace@example.com' },
    { id: 's9', rollNo: 'PH002', name: 'Henry Clark', email: 'henry@example.com' },
    { id: 's10', rollNo: 'PH003', name: 'Ivy Martinez', email: 'ivy@example.com' },
  ]
};

const Attendance = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [attendance, setAttendance] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedBatch('');
    setAttendance({});
  };

  const handleAttendanceChange = (studentId: string, present: boolean) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: present
    }));
  };

  const handleSubmitAttendance = async () => {
    if (!selectedCourse || !selectedBatch || !selectedDate) {
      toast({
        title: "Missing Information",
        description: "Please select Subject, Batch, and Date before submitting attendance.",
        variant: "destructive",
      });
      return;
    }

    // API call would go here - currently commented
    // try {
    //   const response = await fetch('/api/attendance', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       date: selectedDate,
    //       courseId: selectedCourse,
    //       batchId: selectedBatch,
    //       attendance: attendance
    //     })
    //   });
    // } catch (error) {
    //   console.error('Error submitting attendance:', error);
    // }

    toast({
      title: "Attendance Submitted",
      description: `Attendance recorded for ${format(selectedDate, 'PPP')}`,
    });

    // Reset attendance after submission
    setAttendance({});
  };

  const availableBatches = selectedCourse ? batchesData[selectedCourse] || [] : [];
  const availableStudents = selectedBatch ? studentsData[selectedBatch] || [] : [];
  
  const filteredStudents = availableStudents.filter(student =>
    student.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCourseData = courses.find(c => c.id === selectedCourse);
  const selectedBatchData = availableBatches.find(b => b.id === selectedBatch);

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalStudents = filteredStudents.length;

  return (
    <FacultyLayout>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Attendance Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Field */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Course Dropdown */}
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedCourse} onValueChange={handleCourseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch Dropdown */}
            <div className="space-y-2">
              <Label>Batch</Label>
              <Select 
                value={selectedBatch} 
                onValueChange={setSelectedBatch}
                disabled={!selectedCourse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {availableBatches.map(batch => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name} - {batch.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Field */}
            <div className="space-y-2">
              <Label>Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by roll no or name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={!selectedBatch}
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          {selectedCourseData && selectedBatchData && (
            <div className="flex flex-wrap items-center gap-4 p-4 bg-muted rounded-lg">
              <Badge variant="outline" className="text-sm">
                {selectedCourseData.name}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {selectedBatchData.name} - {selectedBatchData.year}
              </Badge>
              <Badge variant="outline" className="text-sm">
                {format(selectedDate, 'PPP')}
              </Badge>
              {totalStudents > 0 && (
                <Badge variant="secondary" className="text-sm">
                  Present: {presentCount}/{totalStudents}
                </Badge>
              )}
            </div>
          )}

          {/* Student List */}
          {filteredStudents.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Students ({filteredStudents.length})
                </h3>
                <Button onClick={handleSubmitAttendance} className="ml-auto">
                  Submit Attendance
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Roll No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[200px] text-center">Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map(student => (
                      <TableRow key={student.id}>
                        <TableCell className="font-mono">
                          {student.rollNo}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Label htmlFor={`attendance-${student.id}`} className="text-sm">
                              Present
                            </Label>
                            <Checkbox
                              id={`attendance-${student.id}`}
                              checked={attendance[student.id] || false}
                              onCheckedChange={(checked) => handleAttendanceChange(student.id, !!checked)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Empty States */}
          {!selectedBatch && selectedCourse && (
            <div className="text-center text-muted-foreground py-8">
              Please select a batch to view students
            </div>
          )}

          {!selectedCourse && (
            <div className="text-center text-muted-foreground py-8">
              Please select a Subject to get started
            </div>
          )}

          {filteredStudents.length === 0 && selectedBatch && searchTerm && (
            <div className="text-center text-muted-foreground py-8">
              No students found matching "{searchTerm}"
            </div>
          )}
        </CardContent>
      </Card>
    </FacultyLayout>
  );
};

export default Attendance;