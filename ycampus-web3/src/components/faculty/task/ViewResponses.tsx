import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Users, CheckCircle, Clock, XCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TaskSubmission } from '@/services/taskService';

interface Task {
  id: string;
  title: string;
  description: string;
}

interface ViewResponsesProps {
  task: Task;
  submissions: TaskSubmission[];
  onBack: () => void;
  onViewStudentResponse: (submissionId: string) => void;
}

const ViewResponses: React.FC<ViewResponsesProps> = ({
  task,
  submissions,
  onBack,
  onViewStudentResponse
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSubmissions = submissions.filter(s => {
    const student = s.student_details || {};
    const user = student.user_details || {};
    const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const roll = (student.roll_number || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || roll.includes(query);
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusCounts = () => {
    return {
      total: submissions.length,
      accepted: submissions.filter(s => s.status === 'accepted').length,
      pending: submissions.filter(s => s.status === 'pending').length,
      rejected: submissions.filter(s => s.status === 'rejected').length,
    };
  };

  const counts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
            <p className="text-muted-foreground text-sm">Review student submissions across all sections</p>
          </div>
        </div>
      </div>

      {/* Task Info Summary */}
      <Card className="bg-slate-50/50 border-slate-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-slate-500">
                <Users className="h-4 w-4" />
                <span className="text-xs font-bold">Total</span>
              </div>
              <div className="text-2xl font-black">{counts.total}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-bold">Accepted</span>
              </div>
              <div className="text-2xl font-black text-emerald-600">{counts.accepted}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-500">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-bold">Pending</span>
              </div>
              <div className="text-2xl font-black text-amber-500">{counts.pending}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-rose-500">
                <XCircle className="h-4 w-4" />
                <span className="text-xs font-bold">Rejected</span>
              </div>
              <div className="text-2xl font-black text-rose-500">{counts.rejected}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg font-bold">Student Submissions</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or roll no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 border-slate-200 focus:ring-primary/20"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold py-4">Roll No</TableHead>
                <TableHead className="font-bold">Student Name</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold text-right px-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((s) => {
                  const student = s.student_details || {};
                  const user = student.user_details || {};
                  return (
                    <TableRow key={s.id} className="hover:bg-slate-50 group">
                      <TableCell className="font-bold text-slate-600 py-4 italic">
                        {student.roll_number || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800">
                          {user.first_name} {user.last_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(s.status)} className="capitalize px-3">
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-bold text-primary hover:text-primary/80 hover:bg-primary/5 transition-all"
                          onClick={() => onViewStudentResponse(s.id)}
                        >
                          Review Submission
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-400 italic font-medium">
                    No matching submissions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewResponses;