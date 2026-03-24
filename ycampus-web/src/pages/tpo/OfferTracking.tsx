import React, { useState, useMemo, useRef } from 'react';
import RoleHeader from '../../components/common/RoleHeader';
import RoleSidebar from '../../components/common/RoleSidebar';
import { Search, ChevronDown, Upload, Download, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface OfferData {
  id?: string;
  rollNo: string;
  name: string;
  branch: string;
  batch: string;
  cgpa: string;
  company: string;
  role: string;
  ctc: string;
  status: 'Accepted' | 'Pending' | 'Declined';
  joining: string;
}

const dummyOffers: OfferData[] = [
  { rollNo: 'CSE2021001', name: 'Aarav Sharma', branch: 'CSE', batch: '2021-25', cgpa: '8.5', company: 'TCS', role: 'SDE Intern', ctc: '₹4.5L', status: 'Accepted', joining: '2025-07-01' },
  { rollNo: 'CSE2021002', name: 'Priya Mehta', branch: 'CSE', batch: '2021-25', cgpa: '9.1', company: 'Infosys', role: 'Systems Engineer', ctc: '₹3.6L', status: 'Accepted', joining: '2025-06-15' },
  { rollNo: 'ECE2021003', name: 'Rohan Gupta', branch: 'ECE', batch: '2021-25', cgpa: '7.8', company: 'Wipro', role: 'Project Engineer', ctc: '₹3.8L', status: 'Pending', joining: '' },
  { rollNo: 'CSE2021004', name: 'Sneha Reddy', branch: 'CSE', batch: '2022-26', cgpa: '9.4', company: 'Google', role: 'SDE I', ctc: '₹18.0L', status: 'Accepted', joining: '2025-08-01' },
  { rollNo: 'ME2021005', name: 'Vikram Patel', branch: 'ME', batch: '2021-25', cgpa: '7.2', company: 'L&T', role: 'Graduate Trainee', ctc: '₹5.0L', status: 'Accepted', joining: '2025-07-10' },
  { rollNo: 'CSE2021006', name: 'Ananya Iyer', branch: 'CSE', batch: '2022-26', cgpa: '8.9', company: 'Microsoft', role: 'SDE Intern', ctc: '₹15.0L', status: 'Pending', joining: '' },
  { rollNo: 'ECE2021007', name: 'Karthik Nair', branch: 'ECE', batch: '2021-25', cgpa: '8', company: 'Cognizant', role: 'Programmer Analyst', ctc: '₹4.0L', status: 'Declined', joining: '' },
  { rollNo: 'CSE2021008', name: 'Divya Joshi', branch: 'CSE', batch: '2021-25', cgpa: '8.7', company: 'Amazon', role: 'SDE I', ctc: '₹16.0L', status: 'Accepted', joining: '2025-09-01' },
  { rollNo: 'IT2021009', name: 'Arjun Singh', branch: 'IT', batch: '2022-26', cgpa: '7.5', company: 'Accenture', role: 'Associate SE', ctc: '₹4.5L', status: 'Accepted', joining: '2025-06-20' },
  { rollNo: 'CSE2021010', name: 'Meera Kulkarni', branch: 'CSE', batch: '2021-25', cgpa: '9', company: 'Flipkart', role: 'SDE I', ctc: '₹14L', status: 'Accepted', joining: '2025-08-15' },
  { rollNo: 'ME2021011', name: 'Rahul Verma', branch: 'ME', batch: '2022-26', cgpa: '7.9', company: 'Tata Motors', role: 'Design Engineer', ctc: '₹5.5L', status: 'Pending', joining: '' },
  { rollNo: 'ECE2021012', name: 'Sanya Kapoor', branch: 'ECE', batch: '2021-25', cgpa: '8.3', company: 'Samsung', role: 'R&D Engineer', ctc: '₹9L', status: 'Accepted', joining: '2025-07-20' },
];

const OfferTracking: React.FC = () => {
  const [records, setRecords] = useState<OfferData[]>(dummyOffers);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const branches = useMemo(() => Array.from(new Set(records.map(r => r.branch))), [records]);
  const batches = useMemo(() => Array.from(new Set(records.map(r => r.batch))), [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(offer => {
      const matchesSearch = offer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           offer.rollNo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch = branchFilter === 'all' || offer.branch === branchFilter;
      const matchesBatch = batchFilter === 'all' || offer.batch === batchFilter;
      return matchesSearch && matchesBranch && matchesBatch;
    });
  }, [records, searchTerm, branchFilter, batchFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted': return 'bg-[#29a35a] text-white';
      case 'Pending': return 'bg-[#f59e0b] text-white';
      case 'Declined': return 'bg-[#f43f5e] text-white';
      default: return 'bg-gray-100 text-gray-600';
    }
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
          toast.error('Invalid CSV: File must have a header row and data rows.');
          return;
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const findCol = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));
        
        const colRoll = findCol(['roll']);
        const colName = findCol(['name', 'student']);
        const colBranch = findCol(['branch', 'dept']);
        const colBatch = findCol(['batch']);
        const colCgpa = findCol(['cgpa', 'gpa']);
        const colCompany = findCol(['company']);
        const colRole = findCol(['role', 'position']);
        const colCtc = findCol(['ctc', 'package', 'salary']);
        const colStatus = findCol(['status', 'offer']);
        const colJoining = findCol(['joining', 'join']);

        const newRecords: OfferData[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length < 3) continue;

          newRecords.push({
            rollNo: colRoll >= 0 ? cols[colRoll] : `IMP${i}`,
            name: colName >= 0 ? cols[colName] : `Student ${i}`,
            branch: colBranch >= 0 ? cols[colBranch] : 'CSE',
            batch: colBatch >= 0 ? cols[colBatch] : '2021-25',
            cgpa: colCgpa >= 0 ? cols[colCgpa] : '0',
            company: colCompany >= 0 ? cols[colCompany] : '-',
            role: colRole >= 0 ? cols[colRole] : '-',
            ctc: colCtc >= 0 ? cols[colCtc] : '-',
            status: (colStatus >= 0 ? cols[colStatus] : 'Pending') as any,
            joining: colJoining >= 0 ? cols[colJoining] : '',
          });
        }

        if (newRecords.length > 0) {
          setRecords(prev => [...prev, ...newRecords]);
          toast.success(`${newRecords.length} records imported successfully.`);
        }
      } catch (error) {
        toast.error('Import Failed: Could not parse the CSV file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportCSV = () => {
    const header = 'Roll No,Student Name,Branch,Batch,CGPA,Company,Role,CTC,Status,Joining\n';
    const rows = filteredRecords.map(r => 
      `${r.rollNo},${r.name},${r.branch},${r.batch},${r.cgpa},${r.company},${r.role},${r.ctc},${r.status},${r.joining}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `offer_tracking_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully.');
  };

  return (
    <div className="flex h-screen bg-gray-50/50">
      <RoleSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <RoleHeader title="" subtitle="" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                <LayoutDashboard className="h-5 w-5 text-gray-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Offer Tracking</h1>
            </div>

            {/* Controls Section */}
            <div className="flex flex-wrap items-center justify-between gap-4 shadow-none">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search by name or roll no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-white border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="w-[140px] h-11 bg-white border-gray-200 rounded-xl text-sm">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger className="w-[140px] h-11 bg-white border-gray-200 rounded-xl text-sm">
                    <SelectValue placeholder="Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {batches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>

                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleImportCSV} />
                
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 border-gray-200 bg-white text-gray-900 h-11 px-4 rounded-xl hover:bg-gray-100"
                >
                  <Upload className="h-4 w-4" />
                  <span className="font-semibold">Import CSV</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={exportCSV}
                  className="flex items-center gap-2 border-gray-200 bg-white text-gray-900 h-11 px-4 rounded-xl hover:bg-gray-100"
                >
                  <Download className="h-4 w-4" />
                  <span className="font-semibold">Export CSV</span>
                </Button>
              </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-50">
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500">Roll No</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500">Student Name</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500">Branch</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500">CGPA</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500">Company</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500">Role</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500">CTC</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500">Offer</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500">Joining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRecords.length > 0 ? (
                      filteredRecords.map((offer, index) => (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{offer.rollNo}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{offer.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{offer.branch}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{offer.cgpa}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{offer.company}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{offer.role}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{offer.ctc}</td>
                          <td className="px-6 py-4">
                            <Badge className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(offer.status)} shadow-sm border-none`}>
                              {offer.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {offer.joining && offer.joining !== '-' ? format(new Date(offer.joining), 'dd MMM yy') : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-gray-500 text-sm">
                          No offer records found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default OfferTracking;

