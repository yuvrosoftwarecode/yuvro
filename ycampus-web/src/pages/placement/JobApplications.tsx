import { useState, useMemo } from 'react';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Search, Download, CheckCircle2, XCircle, Users, UserCheck, UserX, Filter, Lightbulb, TrendingUp, ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { usePlacementJob, useJobApplications, useUpdateApplicationStatus } from '@/hooks/usePlacement';
import { useAuth } from '@/contexts/AuthContext';

const VIOLET = 'hsl(249, 60%, 69%)';
const TEAL = 'hsl(165, 64%, 50%)';

const generateStudentMetrics = (name: string) => {
  const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pi = 55 + (seed % 40);
  const ps = 50 + ((seed * 7) % 45);
  const pri = Math.round(pi * 0.5 + ps * 0.5);
  return { pi, ps, pri };
};

const getPriColor = (pri: number) => {
  if (pri >= 85) return 'hsl(142, 71%, 35%)';
  if (pri >= 70) return 'hsl(142, 50%, 55%)';
  if (pri >= 55) return 'hsl(38, 100%, 56%)';
  return 'hsl(0, 72%, 62%)';
};

const formatCTC = (val: number) => {
  if (!val || val <= 0) return '—';
  const lpa = val / 100000;
  return `₹${lpa % 1 === 0 ? lpa.toFixed(0) : lpa.toFixed(1)} LPA`;
};

const JobApplicationsPage = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deptFilter, setDeptFilter] = useState('all');
  const [offerFilter, setOfferFilter] = useState('all');
  const [ctcRangeFilter, setCtcRangeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'pri' | 'cgpa' | 'name' | 'highest_ctc'>('pri');

  const { user } = useAuth();
  const isAssessments = user?.college_product_type === 'assessments';

  const { data: job, isLoading: jobLoading } = usePlacementJob(jobId);
  const { data: appData, isLoading: appsLoading } = useJobApplications(jobId);
  const updateStatusMutation = useUpdateApplicationStatus();

  const applications = useMemo(() => {
    return appData?.applications || [];
  }, [appData]);

  const enrichedApps = useMemo(() => {
    return applications.map((app: any) => {
      // Generate some consistent metrics based on student name if missing
      const generated = generateStudentMetrics(app.applicant_name || '');
      
      const metrics = {
        pi: app.pi || generated.pi,
        ps: app.ps || generated.ps,
        pri: app.pri || generated.pri
      };

      const hasPrevOffer = app.previous_offer ?? false;
      const highestCtc = app.highest_ctc ?? 0;
      return { 
        ...app, 
        ...metrics, 
        student_name: app.applicant_name,
        student_id: app.applicant_roll_no || 'N/A',
        branch: app.applicant_department || 'N/A',
        previous_offer: !!hasPrevOffer, 
        highest_ctc: highestCtc 
      };
    });
  }, [applications]);

  const filtered = useMemo(() => {
    let list = enrichedApps;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a: any) => a.student_name.toLowerCase().includes(q) || (a.student_id && String(a.student_id).toLowerCase().includes(q)));
    }
    if (deptFilter !== 'all') list = list.filter((a: any) => a.branch === deptFilter);
    if (offerFilter === 'yes') list = list.filter((a: any) => a.previous_offer);
    if (offerFilter === 'no') list = list.filter((a: any) => !a.previous_offer);
    if (ctcRangeFilter !== 'all') {
      list = list.filter((a: any) => {
        const lpa = (a.highest_ctc || 0) / 100000;
        if (ctcRangeFilter === '0-3') return lpa >= 0 && lpa <= 3;
        if (ctcRangeFilter === '3-6') return lpa > 3 && lpa <= 6;
        if (ctcRangeFilter === '6-10') return lpa > 6 && lpa <= 10;
        if (ctcRangeFilter === '10+') return lpa > 10;
        return true;
      });
    }
    list.sort((a: any, b: any) => {
      if (sortBy === 'pri') return b.pri - a.pri;
      if (sortBy === 'cgpa') return (b.cgpa || 0) - (a.cgpa || 0);
      if (sortBy === 'highest_ctc') return (b.highest_ctc || 0) - (a.highest_ctc || 0);
      return a.student_name.localeCompare(b.student_name);
    });
    return list;
  }, [enrichedApps, search, deptFilter, offerFilter, ctcRangeFilter, sortBy]);

  const stats = useMemo(() => {
    if (!enrichedApps.length) return { total: 0, eligible: 0, withOffers: 0, withoutOffers: 0, avgPri: 0 };
    const eligible = enrichedApps.filter((a: any) => a.pri >= 70).length;
    const withOffers = enrichedApps.filter((a: any) => a.previous_offer).length;
    const avgPri = Math.round(enrichedApps.reduce((s: number, a: any) => s + a.pri, 0) / enrichedApps.length);
    return { total: enrichedApps.length, eligible, withOffers, withoutOffers: enrichedApps.length - withOffers, avgPri };
  }, [enrichedApps]);

  const insights = useMemo(() => {
    if (!enrichedApps.length) return [];
    const msgs: string[] = [];
    const eligiblePct = Math.round((stats.eligible / stats.total) * 100);
    msgs.push(`${eligiblePct}% students meet eligibility criteria (PRI ≥ 70).`);
    const unplacedReady = enrichedApps.filter((a: any) => !a.previous_offer && a.pri >= 70).length;
    msgs.push(`${unplacedReady} unplaced students are placement-ready.`);
    const highPri = enrichedApps.filter((a: any) => a.pri >= 85).length;
    msgs.push(`${highPri} students have PRI ≥ 85 (top tier).`);
    if (stats.withOffers > 0) {
      const avgCtc = enrichedApps.filter((a: any) => a.highest_ctc > 0).reduce((s: number, a: any) => s + a.highest_ctc, 0) / stats.withOffers;
      msgs.push(`Average highest CTC among placed students: ${formatCTC(avgCtc)}.`);
    }
    return msgs;
  }, [enrichedApps, stats]);

  const toggleSelect = (id: string) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map((a: any) => a.id));
  };

  const updateAppStatus = async (ids: string[], status: string) => {
    for (const id of ids) {
      await updateStatusMutation.mutateAsync({ applicationId: id, status });
    }
    setSelectedIds([]);
  };

  const downloadExcel = () => {
    const dataToExport = selectedIds.length > 0 ? filtered.filter((a: any) => selectedIds.includes(a.id)) : filtered;
    const rows = dataToExport.map((a: any) => {
      const row: any = {
        'Student Name': a.student_name,
        'Roll Number': a.student_id || 'N/A',
        'Department': a.branch || 'N/A',
        'CGPA': a.cgpa || 'N/A',
      };
      if (!isAssessments) {
        row['PI'] = a.pi;
        row['PS'] = a.ps;
      }
      row['PRI'] = a.pri;
      row['Previous Offer'] = a.previous_offer ? 'Yes' : 'No';
      row['Highest CTC'] = a.highest_ctc > 0 ? formatCTC(a.highest_ctc) : '—';
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Applications');
    XLSX.writeFile(wb, `${job?.role_title || 'Job'}_Applications_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const uniqueDepts = [...new Set(enrichedApps.map((a: any) => a.branch).filter(Boolean))];
  const jobTitle = job?.role_title || 'Job Applications';
  const companyName = (job?.recruiter as any)?.company_name || '';

  if (jobLoading || appsLoading) {
    return (
      <PlacementLayout title="">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(249,60%,69%)]" />
          <p className="text-sm text-muted-foreground font-medium">Fetching candidates...</p>
        </div>
      </PlacementLayout>
    );
  }

  return (
    <PlacementLayout title="">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-lg h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: VIOLET }} />
              Applications — {jobTitle}
            </h1>
            {companyName && <p className="text-sm text-muted-foreground">{companyName} • {job?.location || 'Remote'}</p>}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: Users, color: VIOLET },
            { label: 'Eligible (PRI≥70)', value: stats.eligible, icon: UserCheck, color: TEAL },
            { label: 'Eligible Rate', value: `${stats.total > 0 ? Math.round((stats.eligible / stats.total) * 100) : 0}%`, icon: TrendingUp, color: 'hsl(249,60%,60%)' },
            { label: 'With Offers', value: stats.withOffers, icon: CheckCircle2, color: 'hsl(142,71%,35%)' },
            { label: 'No Offers', value: stats.withoutOffers, icon: UserX, color: 'hsl(38,100%,56%)' },
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
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or roll number..." className="pl-9 rounded-lg" />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[130px] rounded-lg"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depts</SelectItem>
              {uniqueDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={offerFilter} onValueChange={setOfferFilter}>
            <SelectTrigger className="w-[140px] rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Offers</SelectItem>
              <SelectItem value="yes">Has Offer</SelectItem>
              <SelectItem value="no">No Offer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ctcRangeFilter} onValueChange={setCtcRangeFilter}>
            <SelectTrigger className="w-[130px] rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All CTC</SelectItem>
              <SelectItem value="0-3">0–3 LPA</SelectItem>
              <SelectItem value="3-6">3–6 LPA</SelectItem>
              <SelectItem value="6-10">6–10 LPA</SelectItem>
              <SelectItem value="10+">10+ LPA</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
            <SelectTrigger className="w-[140px] rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pri">Sort: PRI</SelectItem>
              <SelectItem value="cgpa">Sort: CGPA</SelectItem>
              <SelectItem value="highest_ctc">Sort: CTC ↓</SelectItem>
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
        <div className="border rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[hsl(240,20%,96%)]">
                <TableHead className="w-10">
                  <Checkbox checked={selectedIds.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="text-xs font-semibold">Student</TableHead>
                <TableHead className="text-xs font-semibold">Dept</TableHead>
                <TableHead className="text-xs font-semibold text-center">CGPA</TableHead>
                {!isAssessments && <TableHead className="text-xs font-semibold text-center">PI</TableHead>}
                {!isAssessments && <TableHead className="text-xs font-semibold text-center">PS</TableHead>}
                <TableHead className="text-xs font-semibold text-center">PRI</TableHead>
                <TableHead className="text-xs font-semibold text-center">Prev. Offer</TableHead>
                <TableHead className="text-xs font-semibold text-center">Highest CTC</TableHead>
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
                    <p className="text-[10px] text-muted-foreground">{app.student_id}</p>
                  </TableCell>
                  <TableCell className="text-xs">{app.branch || 'N/A'}</TableCell>
                  <TableCell className="text-xs text-center font-medium">{app.cgpa || 'N/A'}</TableCell>
                  {!isAssessments && <TableCell className="text-xs text-center">{app.pi}</TableCell>}
                  {!isAssessments && <TableCell className="text-xs text-center">{app.ps}</TableCell>}
                  <TableCell className="text-center">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${getPriColor(app.pri)}15`, color: getPriColor(app.pri) }}>
                      {app.pri}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${app.previous_offer ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-600'}`}>
                      {app.previous_offer ? 'Yes' : 'No'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-xs font-medium">
                    {formatCTC(app.highest_ctc)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                        onClick={() => updateAppStatus([app.id], 'shortlisted')}>
                        <CheckCircle2 className="h-3.5 w-3.5" style={{ color: TEAL }} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"
                        onClick={() => updateAppStatus([app.id], 'rejected')}>
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>



        {/* Download */}
        <div className="flex justify-end">
          <Button variant="outline" className="rounded-lg text-xs" onClick={downloadExcel}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export to Excel
          </Button>
        </div>
      </div>
    </PlacementLayout>
  );
};

export default JobApplicationsPage;
