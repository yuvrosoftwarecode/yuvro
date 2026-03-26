import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'Draft' | 'Sent';
  createdDate: string;
  courseId: string;
}

interface Student {
  id: string;
  rollNo: string;
  name: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

interface ViewResponsesProps {
  task: Task;
  students: Student[];
  onBack: () => void;
  onViewStudentResponse: (studentId: string) => void;
}

const ViewResponses: React.FC<ViewResponsesProps> = ({
  task,
  students,
  onBack,
  onViewStudentResponse
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = students.filter(student =>
    student.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadgeVariant = (status: Student['status']) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const isRowClickable = (status: Student['status']) => {
    return status === 'In Progress' || status === 'Completed';
  };

  const handleDownloadReport = () => {
    // TODO: Implement API call to download report
    console.log('Downloading report for task:', task.id);
    // Mock download functionality
    const element = document.createElement('a');
    const file = new Blob(['Task Response Report'], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${task.title}_responses.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getStatusCounts = () => {
    const counts = students.reduce((acc, student) => {
      acc[student.status] = (acc[student.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: students.length,
      completed: counts['Completed'] || 0,
      inProgress: counts['In Progress'] || 0,
      pending: counts['Pending'] || 0
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">View student responses</p>
        </div>
        <Button onClick={handleDownloadReport}>
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </div>

      {/* Task Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{task.description}</p>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{statusCounts.total}</div>
            <div className="text-sm text-muted-foreground">Total Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.inProgress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{statusCounts.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Student Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Student Responses</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by roll no or name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roll No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow
                  key={student.id}
                  className={isRowClickable(student.status) ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={isRowClickable(student.status) ? () => onViewStudentResponse(student.id) : undefined}
                >
                  <TableCell className="font-medium">{student.rollNo}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(student.status)}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isRowClickable(student.status) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewStudentResponse(student.id);
                        }}
                      >
                        View Details
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not available</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredStudents.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No students found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewResponses;