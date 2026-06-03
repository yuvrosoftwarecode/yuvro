import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Users, CheckCircle, Clock, XCircle, ArrowUpDown } from 'lucide-react';
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
  const [sortField, setSortField] = useState<'name' | 'roll' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredSubmissions = submissions.filter(s => {
    const student = s.student_details || {};
    const user = student.user_details || {};
    const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const roll = (student.roll_number || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || roll.includes(query);
  });

  let sortedSubmissions = [...filteredSubmissions];
  if (sortField) {
    sortedSubmissions.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortField === 'name') {
        valA = `${a.student_details?.user_details?.first_name || ''} ${a.student_details?.user_details?.last_name || ''}`.trim().toLowerCase();
        valB = `${b.student_details?.user_details?.first_name || ''} ${b.student_details?.user_details?.last_name || ''}`.trim().toLowerCase();
      } else if (sortField === 'roll') {
        valA = (a.student_details?.roll_number || '').toLowerCase();
        valB = (b.student_details?.roll_number || '').toLowerCase();
      } else if (sortField === 'status') {
        valA = (a.status || '').toLowerCase();
        valB = (b.status || '').toLowerCase();
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handleSort = (field: 'name' | 'roll' | 'status') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const totalPages = Math.ceil(sortedSubmissions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentSubmissions = sortedSubmissions.slice(startIndex, endIndex);

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
                <span className="text-xs ">Total</span>
              </div>
              <div className="text-xl font-black">{counts.total}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs ">Accepted</span>
              </div>
              <div className="text-xl font-black text-emerald-600">{counts.accepted}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-500">
                <Clock className="h-4 w-4" />
                <span className="text-xs ">Pending</span>
              </div>
              <div className="text-xl font-black text-amber-500">{counts.pending}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-rose-500">
                <XCircle className="h-4 w-4" />
                <span className="text-xs ">Rejected</span>
              </div>
              <div className="text-xl font-black text-rose-500">{counts.rejected}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-lg font-bold">Student Submissions</CardTitle>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or roll no..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 h-10 border-slate-200 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold py-4 cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => handleSort('roll')}>
                  <div className="flex items-center gap-2">
                    Roll No
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === 'roll' ? 'text-primary' : 'text-slate-400'}`} />
                  </div>
                </TableHead>
                <TableHead className="font-bold cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">
                    Student Name
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === 'name' ? 'text-primary' : 'text-slate-400'}`} />
                  </div>
                </TableHead>
                <TableHead className="font-bold cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-2">
                    Status
                    <ArrowUpDown className={`h-3.5 w-3.5 ${sortField === 'status' ? 'text-primary' : 'text-slate-400'}`} />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-center px-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentSubmissions.length > 0 ? (
                currentSubmissions.map((s) => {
                  const student = s.student_details || {};
                  const user = student.user_details || {};
                  return (
                    <TableRow key={s.id} className="hover:bg-slate-50 group">
                      <TableCell className=" text-600 py-4">
                        {student.roll_number || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className=" text-slate-800">
                          {user.first_name} {user.last_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(s.status)} className="capitalize px-3">
                          {s.status || "In review"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center px-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className=" text-primary hover:text-primary/80 hover:bg-primary/5 transition-all"
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
                  <TableCell colSpan={4} className="h-32 text-center text-slate-400  font-medium">
                    No matching submissions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          {filteredSubmissions.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50/50">
              <div className="text-sm text-slate-500 font-medium">
                Showing <span className="text-slate-800">{startIndex + 1}</span> to <span className="text-slate-800">{Math.min(endIndex, filteredSubmissions.length)}</span> of <span className="text-slate-800">{filteredSubmissions.length}</span> entries
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="font-bold shadow-sm"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="font-bold shadow-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewResponses;