import React, { useState, useMemo, useRef } from 'react';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface OfferRecord {
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

const DUMMY_DATA: OfferRecord[] = [
  { id: '1', rollNo: 'CSE2021001', studentName: 'Aarav Sharma', branch: 'CSE', batch: '2021-25', cgpa: 8.5, company: 'TCS', role: 'SDE Intern', ctc: 450000, offer: 'Accepted', joining: '2025-07-01' },
  { id: '2', rollNo: 'CSE2021002', studentName: 'Priya Mehta', branch: 'CSE', batch: '2021-25', cgpa: 9.1, company: 'Infosys', role: 'Systems Engineer', ctc: 360000, offer: 'Accepted', joining: '2025-06-15' },
  { id: '3', rollNo: 'ECE2021003', studentName: 'Rohan Gupta', branch: 'ECE', batch: '2021-25', cgpa: 7.8, company: 'Wipro', role: 'Project Engineer', ctc: 380000, offer: 'Pending', joining: '' },
  { id: '4', rollNo: 'CSE2021004', studentName: 'Sneha Reddy', branch: 'CSE', batch: '2022-26', cgpa: 9.4, company: 'Google', role: 'SDE I', ctc: 1800000, offer: 'Accepted', joining: '2025-08-01' },
  { id: '5', rollNo: 'ME2021005', studentName: 'Vikram Patel', branch: 'ME', batch: '2021-25', cgpa: 7.2, company: 'L&T', role: 'Graduate Trainee', ctc: 500000, offer: 'Accepted', joining: '2025-07-10' },
  { id: '6', rollNo: 'CSE2021006', studentName: 'Ananya Iyer', branch: 'CSE', batch: '2022-26', cgpa: 8.9, company: 'Microsoft', role: 'SDE Intern', ctc: 1500000, offer: 'Pending', joining: '' },
  { id: '7', rollNo: 'ECE2021007', studentName: 'Karthik Nair', branch: 'ECE', batch: '2021-25', cgpa: 8.0, company: 'Cognizant', role: 'Programmer Analyst', ctc: 400000, offer: 'Declined', joining: '' },
  { id: '8', rollNo: 'CSE2021008', studentName: 'Divya Joshi', branch: 'CSE', batch: '2021-25', cgpa: 8.7, company: 'Amazon', role: 'SDE I', ctc: 1600000, offer: 'Accepted', joining: '2025-09-01' },
  { id: '9', rollNo: 'IT2021009', studentName: 'Arjun Singh', branch: 'IT', batch: '2022-26', cgpa: 7.5, company: 'Accenture', role: 'Associate SE', ctc: 450000, offer: 'Accepted', joining: '2025-06-20' },
  { id: '10', rollNo: 'CSE2021010', studentName: 'Meera Kulkarni', branch: 'CSE', batch: '2021-25', cgpa: 9.0, company: 'Flipkart', role: 'SDE I', ctc: 1400000, offer: 'Accepted', joining: '2025-08-15' },
  { id: '11', rollNo: 'ME2021011', studentName: 'Rahul Verma', branch: 'ME', batch: '2022-26', cgpa: 7.9, company: 'Tata Motors', role: 'Design Engineer', ctc: 550000, offer: 'Pending', joining: '' },
  { id: '12', rollNo: 'ECE2021012', studentName: 'Sanya Kapoor', branch: 'ECE', batch: '2021-25', cgpa: 8.3, company: 'Samsung', role: 'R&D Engineer', ctc: 900000, offer: 'Accepted', joining: '2025-07-20' },
];

const offerColors: Record<string, string> = {
  Accepted: 'hsl(145, 60%, 40%)',
  Pending: 'hsl(38, 100%, 50%)',
  Declined: 'hsl(0, 72%, 55%)',
};

const StudentsTracking = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<OfferRecord[]>(DUMMY_DATA);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');

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

        const newRecords: OfferRecord[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length < 3) continue;

          newRecords.push({
            id: `imported-${Date.now()}-${i}`,
            rollNo: colRoll >= 0 ? cols[colRoll] : `IMP${i.toString().padStart(3, '0')}`,
            studentName: colName >= 0 ? cols[colName] : `Student ${i}`,
            branch: colBranch >= 0 ? cols[colBranch] : 'CSE',
            batch: colBatch >= 0 ? cols[colBatch] : '2021-25',
            cgpa: colCgpa >= 0 ? parseFloat(cols[colCgpa]) || 0 : 0,
            company: colCompany >= 0 ? cols[colCompany] : '-',
            role: colRole >= 0 ? cols[colRole] : '-',
            ctc: colCtc >= 0 ? parseFloat(cols[colCtc]) || 0 : 0,
            offer: colOffer >= 0 ? cols[colOffer] : 'Pending',
            joining: colJoining >= 0 ? cols[colJoining] : '',
          });
        }

        if (newRecords.length > 0) {
          setRecords(prev => [...prev, ...newRecords]);
          toast({ title: 'CSV Imported', description: `${newRecords.length} records added successfully.` });
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
        <Button variant="outline" className="rounded-lg" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1" /> Import CSV
        </Button>
        <Button variant="outline" className="rounded-lg" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[hsl(240,20%,97%)]">
              <TableHead className="text-xs font-semibold">Roll No</TableHead>
              <TableHead className="text-xs font-semibold">Student Name</TableHead>
              <TableHead className="text-xs font-semibold">Branch</TableHead>
              <TableHead className="text-xs font-semibold">CGPA</TableHead>
              <TableHead className="text-xs font-semibold">Company</TableHead>
              <TableHead className="text-xs font-semibold">Role</TableHead>
              <TableHead className="text-xs font-semibold">CTC</TableHead>
              <TableHead className="text-xs font-semibold">Offer</TableHead>
              <TableHead className="text-xs font-semibold">Joining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filtered.length ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>
            ) : filtered.map(r => (
              <TableRow key={r.id} className="hover:bg-muted/30">
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
                <TableCell className="text-sm">{r.joining ? format(new Date(r.joining), 'dd MMM yy') : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PlacementLayout>
  );
};

export default StudentsTracking;
