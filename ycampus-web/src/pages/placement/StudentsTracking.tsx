import React, { useState, useMemo, useRef, useEffect } from 'react';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Download, Search, Upload, Trash2, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useOfferRecords, useBulkUploadOffers, useBulkDeleteOffers, useDeleteOffer } from '@/hooks/usePlacement';

interface OfferRecordFrontend {
  id: string;
  rollNo: string;
  studentName: string;
  branch: string;
  batch: string;
  cgpa: number;
  company: string;
  role: string;
  ctc: number;
  offer: string;
  joining: string;
}

const offerColors: Record<string, string> = {
  Accepted: 'hsl(145, 60%, 40%)',
  Pending: 'hsl(38, 100%, 50%)',
  Declined: 'hsl(0, 72%, 55%)',
};

const StudentsTracking = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: rawRecords = [] } = useOfferRecords();
  const bulkUpload = useBulkUploadOffers();
  const bulkDelete = useBulkDeleteOffers();
  const deleteOne = useDeleteOffer();

  const records: OfferRecordFrontend[] = useMemo(() => {
    return rawRecords.map(r => ({
      id: r.id,
      rollNo: r.roll_number,
      studentName: r.student_name,
      branch: r.branch,
      batch: r.batch,
      cgpa: parseFloat(r.cgpa) || 0,
      company: r.company,
      role: r.role,
      ctc: parseFloat(r.ctc) || 0,
      offer: r.offer_status,
      joining: r.joining_date
    }));
  }, [rawRecords]);

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, branchFilter, batchFilter]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(currentRecords.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const handleDeleteSelected = () => {
    bulkDelete.mutate(Array.from(selectedIds), {
      onSuccess: () => setSelectedIds(new Set())
    });
  };

  const handleDeleteOne = (id: string) => {
    deleteOne.mutate(id, {
      onSuccess: () => {
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  };

  const branches = useMemo(() => [...new Set(records.map(r => r.branch))], [records]);
  const batches = useMemo(() => [...new Set(records.map(r => r.batch))], [records]);

  const filtered = useMemo(() => {
    let list = records;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.studentName.toLowerCase().includes(q) || r.rollNo.toLowerCase().includes(q));
    }
    if (branchFilter !== 'all') list = list.filter(r => r.branch === branchFilter);
    if (batchFilter !== 'all') list = list.filter(r => r.batch === batchFilter);
    return list;
  }, [records, search, branchFilter, batchFilter]);

  const currentRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, currentPage, pageSize]);

  const exportCSV = () => {
    const header = 'Roll No,Student Name,Branch,Batch,CGPA,Company,Role,CTC,Offer,Joining\n';
    const rows = filtered.map(r =>
      `${r.rollNo},${r.studentName},${r.branch},${r.batch},${r.cgpa},${r.company},${r.role},${r.ctc},${r.offer},${r.joining}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'offer_tracking.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          toast({ title: 'Invalid CSV', description: 'File must have a header row and data rows.', variant: 'destructive' });
          return;
        }

        const headerLine = lines[0].toLowerCase();
        const headers = headerLine.split(',').map(h => h.trim());

        const findCol = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));
        const colRoll = findCol(['roll']);
        const colName = findCol(['name', 'student']);
        const colBranch = findCol(['branch', 'dept']);
        const colBatch = findCol(['batch']);
        const colCgpa = findCol(['cgpa', 'gpa']);
        const colCompany = findCol(['company']);
        const colRole = findCol(['role', 'position']);
        const colCtc = findCol(['ctc', 'package', 'salary']);
        const colOffer = findCol(['offer', 'status']);
        const colJoining = findCol(['joining', 'join']);

        const parseCTC = (ctcStr: string) => {
          if (!ctcStr) return 0;
          let str = ctcStr.toLowerCase().replace(/[^0-9.l]/g, '');
          let multiplier = 1;
          if (str.endsWith('l')) {
            multiplier = 100000;
            str = str.replace('l', '');
          }
          const val = parseFloat(str);
          return isNaN(val) ? 0 : val * multiplier;
        };

        const newRecords: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length < 3) continue;

          newRecords.push({
            rollNo: colRoll >= 0 ? cols[colRoll] : `IMP${i.toString().padStart(3, '0')}`,
            studentName: colName >= 0 ? cols[colName] : `Student ${i}`,
            branch: colBranch >= 0 ? cols[colBranch] : 'CSE',
            batch: colBatch >= 0 ? cols[colBatch] : '2021-25',
            cgpa: colCgpa >= 0 ? parseFloat(cols[colCgpa]) || 0 : 0,
            company: colCompany >= 0 ? cols[colCompany] : '-',
            role: colRole >= 0 ? cols[colRole] : '-',
            ctc: colCtc >= 0 ? parseCTC(cols[colCtc]) : 0,
            offer: colOffer >= 0 ? cols[colOffer] : 'Pending',
            joining: colJoining >= 0 ? cols[colJoining] : '',
          });
        }

        if (newRecords.length > 0) {
          bulkUpload.mutate(newRecords, {
            onSuccess: () => setIsImportModalOpen(false)
          });
        }
      } catch {
        toast({ title: 'Import Failed', description: 'Could not parse the CSV file.', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatCTC = (ctc: number) => {
    if (!ctc) return '-';
    if (ctc >= 100000) return `₹${(ctc / 100000).toFixed(1)}L`;
    return `₹${ctc.toLocaleString()}`;
  };

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    try {
      return format(d, 'dd MMM yy');
    } catch {
      return dateStr;
    }
  };

  return (
    <PlacementLayout title="Offer Tracking">
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or roll no..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg" />
        </div>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-36 rounded-lg"><SelectValue placeholder="Branch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={batchFilter} onValueChange={setBatchFilter}>
          <SelectTrigger className="w-36 rounded-lg"><SelectValue placeholder="Batch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {batches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleImportCSV} />
        
        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="rounded-lg">
              <Upload className="h-4 w-4 mr-1" /> Import CSV
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Import Offer Records</DialogTitle>
              <DialogDescription>
                Ensure your CSV file contains a header row and follows this exact format.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <div className="bg-muted p-3 rounded-md text-xs mb-4 border font-mono flex items-start">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="whitespace-normal break-words leading-relaxed">
                  Roll No, Student Name, Branch, Batch, CGPA, Company, Role, CTC, Offer, Joining
                </span>
              </div>
              <ul className="text-[13px] text-muted-foreground list-disc pl-4 space-y-1 mb-6">
                <li><strong className="font-medium text-foreground">CTC:</strong> Can include numbers and 'L' for Lakhs (e.g. 12.5L).</li>
                <li><strong className="font-medium text-foreground">Offer:</strong> Should be Accepted, Pending, or Declined.</li>
                <li><strong className="font-medium text-foreground">Joining:</strong> Should be a valid date (e.g. 15 Jun 26).</li>
              </ul>
              <Button onClick={() => fileInputRef.current?.click()} className="w-full">
                <Upload className="h-4 w-4 mr-2" /> Select CSV File
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" className="rounded-lg" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
        {selectedIds.size > 0 && (
          <Button variant="destructive" className="rounded-lg" onClick={handleDeleteSelected}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete Selected ({selectedIds.size})
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[hsl(240,20%,97%)]">
              <TableHead className="w-12 text-center">
                <Checkbox 
                  checked={currentRecords.length > 0 && currentRecords.every(r => selectedIds.has(r.id))} 
                  onCheckedChange={handleSelectAll} 
                  aria-label="Select all" 
                />
              </TableHead>
              <TableHead className="text-xs font-semibold">Roll No</TableHead>
              <TableHead className="text-xs font-semibold">Student Name</TableHead>
              <TableHead className="text-xs font-semibold">Branch</TableHead>
              <TableHead className="text-xs font-semibold">CGPA</TableHead>
              <TableHead className="text-xs font-semibold">Company</TableHead>
              <TableHead className="text-xs font-semibold">Role</TableHead>
              <TableHead className="text-xs font-semibold">CTC</TableHead>
              <TableHead className="text-xs font-semibold">Offer</TableHead>
              <TableHead className="text-xs font-semibold">Joining</TableHead>
              <TableHead className="w-12 text-center"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!currentRecords.length ? (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>
            ) : currentRecords.map(r => (
              <TableRow key={r.id} className="hover:bg-muted/30">
                <TableCell className="text-center">
                  <Checkbox 
                    checked={selectedIds.has(r.id)} 
                    onCheckedChange={(checked) => handleSelectOne(r.id, !!checked)} 
                    aria-label={`Select ${r.studentName}`} 
                  />
                </TableCell>
                <TableCell className="text-sm font-medium">{r.rollNo}</TableCell>
                <TableCell className="text-sm font-medium">{r.studentName}</TableCell>
                <TableCell className="text-sm">{r.branch}</TableCell>
                <TableCell className="text-sm">{r.cgpa || '-'}</TableCell>
                <TableCell className="text-sm">{r.company || '-'}</TableCell>
                <TableCell className="text-sm">{r.role || '-'}</TableCell>
                <TableCell className="text-sm font-medium">{formatCTC(r.ctc)}</TableCell>
                <TableCell>
                  <Badge className="text-[10px]" style={{ background: offerColors[r.offer] || 'hsl(220,15%,60%)', color: '#fff' }}>
                    {r.offer}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{formatDateStr(r.joining)}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600" onClick={() => handleDeleteOne(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Show</span>
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                </SelectContent>
              </Select>
              <span>entries</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3" 
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage * pageSize >= filtered.length}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PlacementLayout>
  );
};

export default StudentsTracking;
