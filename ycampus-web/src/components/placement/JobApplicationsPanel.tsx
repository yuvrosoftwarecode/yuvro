import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlacementJob } from '@/hooks/usePlacement';
import jobApplicationService from '@/services/jobApplicationService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Search, Download, CheckCircle2, XCircle, Users, UserCheck, UserX, Filter, Lightbulb, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const VIOLET = 'hsl(249, 60%, 69%)';
const TEAL = 'hsl(165, 64%, 50%)';

interface JobApplicationsPanelProps {
  job: PlacementJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Generate dummy PRI data for demo
const generateStudentMetrics = (name: string) => {
  const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pi = 55 + (seed % 40);
  const ps = 50 + ((seed * 7) % 45);
  const pri = Math.round(pi * 0.5 + ps * 0.5);
  const attendance = 65 + (seed % 30);
  const taskCompletion = 50 + ((seed * 3) % 45);
  return { pi, ps, pri, attendance, taskCompletion };
};

const getPriColor = (pri: number) => {
  if (pri >= 85) return 'hsl(142, 71%, 35%)';
  if (pri >= 70) return 'hsl(142, 50%, 55%)';
  if (pri >= 55) return 'hsl(38, 100%, 56%)';
  return 'hsl(0, 72%, 62%)';
};

const getPriLabel = (pri: number) => {
  if (pri >= 85) return 'Ready';
  if (pri >= 70) return 'Almost Ready';
  if (pri >= 55) return 'Needs Work';
  return 'Not Ready';
};

const JobApplicationsPanel = ({ job, open, onOpenChange }: JobApplicationsPanelProps) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'pri' | 'cgpa' | 'name'>('pri');

  const { data: applications, isLoading } = useQuery({
    queryKey: ['job-applications', job?.id],
    queryFn: async () => {
      if (!job) return [];
      const data = await jobApplicationService.getJobApplications(job.id);
      return (data || []).map((app: any) => ({
        id: app.id,
        student_name: app.applicant_name || app.applicant_details?.full_name || 'Unknown',
        student_id: app.applicant_details?.roll_number || app.applicant || '',
        branch: app.applicant_details?.department_name || '',
        cgpa: app.applicant_details?.cgpa || 0,
        status: app.status,
        created_at: app.created_at,
        email: app.applicant_email,
      }));
    },
    enabled: !!job?.id && open,
  });

  const enrichedApps = useMemo(() => {
    if (!applications) return [];
    return applications.map((app: any) => {
      const metrics = generateStudentMetrics(app.student_name);
      return { ...app, ...metrics };
    });
  }, [applications]);

  const filtered = useMemo(() => {
    let list = enrichedApps;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a: any) => a.student_name.toLowerCase().includes(q) || a.student_id.toLowerCase().includes(q));
    }
    if (deptFilter !== 'all') list = list.filter((a: any) => a.branch === deptFilter);
    if (statusFilter !== 'all') list = list.filter((a: any) => a.status === statusFilter);
    list.sort((a: any, b: any) => {
      if (sortBy === 'pri') return b.pri - a.pri;
      if (sortBy === 'cgpa') return (b.cgpa || 0) - (a.cgpa || 0);
      return a.student_name.localeCompare(b.student_name);
    });
    return list;
  }, [enrichedApps, search, deptFilter, statusFilter, sortBy]);

  const stats = useMemo(() => {
    if (!enrichedApps.length) return { total: 0, eligible: 0, shortlisted: 0, rejected: 0, avgPri: 0 };
    const shortlisted = enrichedApps.filter((a: any) => ['shortlisted', 'interview_scheduled', 'selected'].includes(a.status)).length;
    const rejected = enrichedApps.filter((a: any) => ['rejected'].includes(a.status)).length;
    const eligible = enrichedApps.filter((a: any) => a.pri >= 70).length;
    const avgPri = Math.round(enrichedApps.reduce((s: number, a: any) => s + a.pri, 0) / enrichedApps.length);
    return { total: enrichedApps.length, eligible, shortlisted, rejected, avgPri };
  }, [enrichedApps]);

  const insights = useMemo(() => {
    if (!enrichedApps.length) return [];
    const msgs: string[] = [];
    const eligiblePct = Math.round((stats.eligible / stats.total) * 100);
    msgs.push(`${eligiblePct}% students meet eligibility criteria (PRI ≥ 70).`);
    const avgPri = stats.avgPri;
    if (avgPri < 70) msgs.push(`Average PRI is ${avgPri} — most applicants need improvement.`);
    const highPri = enrichedApps.filter((a: any) => a.pri >= 85).length;
    msgs.push(`${highPri} students are placement-ready (PRI ≥ 85).`);
    return msgs;
  }, [enrichedApps, stats]);

  const toggleSelect = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map((a: any) => a.id));
  };

  const updateAppStatus = async (ids: string[], status: string) => {
    try {
      await Promise.all(ids.map(id => jobApplicationService.updateApplicationStatus(id, status)));
      toast({ title: `${ids.length} student(s) status updated to ${status}` });
      qc.invalidateQueries({ queryKey: ['job-applications', job?.id] });
      setSelectedIds([]);
    } catch (error: any) {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    }
  };

  const downloadExcel = () => {
    const rows = filtered.map((a: any) => ({
      'Student Name': a.student_name,
      'Student ID': a.student_id,
      'Department': a.branch || 'N/A',
      'CGPA': a.cgpa || 'N/A',
      'PI': a.pi,
      'PS': a.ps,
      'PRI': a.pri,
      'Attendance %': a.attendance,
      'Task Completion %': a.taskCompletion,
      'CTC Offered': a.ctc_offered || 'N/A',
      'Status': a.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Applications');
    XLSX.writeFile(wb, `${job?.role_title || 'Job'}_Applications_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const uniqueDepts = [...new Set(enrichedApps.map((a: any) => a.branch).filter(Boolean))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5" style={{ color: VIOLET }} />
            Applications — {job?.role_title}
          </DialogTitle>
          <DialogDescription>
            {(job?.recruiter as any)?.company_name} • {job?.location || 'Remote'}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: stats.total, icon: Users, color: VIOLET },
              { label: 'Eligible', value: stats.eligible, icon: UserCheck, color: TEAL },
              { label: 'Shortlisted', value: stats.shortlisted, icon: CheckCircle2, color: 'hsl(142,71%,35%)' },
              { label: 'Rejected', value: stats.rejected, icon: UserX, color: 'hsl(0,72%,62%)' },
              { label: 'Avg PRI', value: stats.avgPri, icon: TrendingUp, color: getPriColor(stats.avgPri) },
            ].map(s => (
              <Card key={s.label} className="border-0 shadow-sm rounded-xl">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15` }}>
                    <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="bg-[hsl(249,60%,97%)] border border-[hsl(249,60%,90%)] rounded-xl p-3">
              <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5" style={{ color: VIOLET }}>
                <Lightbulb className="h-3.5 w-3.5" /> Smart Insights
              </p>
              <div className="space-y-1">
                {insights.map((m, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {m}</p>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..." className="pl-9 rounded-lg" />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[130px] rounded-lg"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depts</SelectItem>
                {uniqueDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="selected">Selected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
              <SelectTrigger className="w-[120px] rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pri">Sort: PRI</SelectItem>
                <SelectItem value="cgpa">Sort: CGPA</SelectItem>
                <SelectItem value="name">Sort: Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 bg-[hsl(240,20%,96%)] rounded-xl p-3">
              <span className="text-xs font-medium">{selectedIds.length} selected</span>
              <Button size="sm" className="rounded-lg text-xs h-7" style={{ background: TEAL }}
                onClick={() => updateAppStatus(selectedIds, 'shortlisted')}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Bulk Accept
              </Button>
              <Button size="sm" variant="destructive" className="rounded-lg text-xs h-7"
                onClick={() => updateAppStatus(selectedIds, 'rejected')}>
                <XCircle className="h-3 w-3 mr-1" /> Bulk Reject
              </Button>
              <Button size="sm" variant="outline" className="rounded-lg text-xs h-7" onClick={downloadExcel}>
                <Download className="h-3 w-3 mr-1" /> Download
              </Button>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading applications...</p>
          ) : !filtered.length ? (
            <p className="text-muted-foreground text-center py-8">No applications found</p>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[hsl(240,20%,96%)]">
                    <TableHead className="w-10">
                      <Checkbox checked={selectedIds.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead className="text-xs font-semibold">Student</TableHead>
                    <TableHead className="text-xs font-semibold">Dept</TableHead>
                    <TableHead className="text-xs font-semibold text-center">CGPA</TableHead>
                    <TableHead className="text-xs font-semibold text-center">PI</TableHead>
                    <TableHead className="text-xs font-semibold text-center">PS</TableHead>
                    <TableHead className="text-xs font-semibold text-center">PRI</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((app: any) => (
                    <TableRow key={app.id} className="hover:bg-muted/30">
                      <TableCell>
                        <Checkbox checked={selectedIds.includes(app.id)} onCheckedChange={() => toggleSelect(app.id)} />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{app.student_name}</p>
                        <p className="text-[10px] text-muted-foreground">{app.student_id.slice(0, 8)}</p>
                      </TableCell>
                      <TableCell className="text-xs">{app.branch || 'N/A'}</TableCell>
                      <TableCell className="text-xs text-center font-medium">{app.cgpa || 'N/A'}</TableCell>
                      <TableCell className="text-xs text-center">{app.pi}</TableCell>
                      <TableCell className="text-xs text-center">{app.ps}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${getPriColor(app.pri)}15`, color: getPriColor(app.pri) }}>
                          {app.pri}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] capitalize rounded-lg">{app.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {app.status === 'applied' && (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                                onClick={() => updateAppStatus([app.id], 'shortlisted')}>
                                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: TEAL }} />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                                onClick={() => updateAppStatus([app.id], 'rejected')}>
                                <XCircle className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Job Performance */}
          <div className="bg-[hsl(240,20%,97%)] rounded-xl p-4">
            <p className="text-xs font-semibold mb-2">Job Performance Metrics</p>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div><p className="text-lg font-bold">{stats.total}</p><p className="text-[10px] text-muted-foreground">Applications</p></div>
              <div><p className="text-lg font-bold">{stats.shortlisted}</p><p className="text-[10px] text-muted-foreground">Shortlisted</p></div>
              <div><p className="text-lg font-bold">{stats.total > 0 ? Math.round((stats.shortlisted / stats.total) * 100) : 0}%</p><p className="text-[10px] text-muted-foreground">Selection Rate</p></div>
              <div><p className="text-lg font-bold">{stats.avgPri}</p><p className="text-[10px] text-muted-foreground">Avg PRI</p></div>
            </div>
          </div>

          {/* Download */}
          <div className="flex justify-end">
            <Button variant="outline" className="rounded-lg text-xs" onClick={downloadExcel}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export to Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobApplicationsPanel;
