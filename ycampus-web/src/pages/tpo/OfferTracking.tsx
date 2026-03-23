import React, { useState } from 'react';
import RoleHeader from '../../components/common/RoleHeader';
import RoleSidebar from '../../components/common/RoleSidebar';
import { Search, ChevronDown, Upload, Download, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OfferData {
  rollNo: string;
  name: string;
  branch: string;
  cgpa: string;
  company: string;
  role: string;
  ctc: string;
  status: 'Accepted' | 'Pending' | 'Declined';
  joining: string;
}

const dummyOffers: OfferData[] = [
  { rollNo: 'CSE2021001', name: 'Aarav Sharma', branch: 'CSE', cgpa: '8.5', company: 'TCS', role: 'SDE Intern', ctc: '₹4.5L', status: 'Accepted', joining: '01 Jul 25' },
  { rollNo: 'CSE2021002', name: 'Priya Mehta', branch: 'CSE', cgpa: '9.1', company: 'Infosys', role: 'Systems Engineer', ctc: '₹3.6L', status: 'Accepted', joining: '15 Jun 25' },
  { rollNo: 'ECE2021003', name: 'Rohan Gupta', branch: 'ECE', cgpa: '7.8', company: 'Wipro', role: 'Project Engineer', ctc: '₹3.8L', status: 'Pending', joining: '-' },
  { rollNo: 'CSE2021004', name: 'Sneha Reddy', branch: 'CSE', cgpa: '9.4', company: 'Google', role: 'SDE I', ctc: '₹18.0L', status: 'Accepted', joining: '01 Aug 25' },
  { rollNo: 'ME2021005', name: 'Vikram Patel', branch: 'ME', cgpa: '7.2', company: 'L&T', role: 'Graduate Trainee', ctc: '₹5.0L', status: 'Accepted', joining: '10 Jul 25' },
  { rollNo: 'CSE2021006', name: 'Ananya Iyer', branch: 'CSE', cgpa: '8.9', company: 'Microsoft', role: 'SDE Intern', ctc: '₹15.0L', status: 'Pending', joining: '-' },
  { rollNo: 'ECE2021007', name: 'Karthik Nair', branch: 'ECE', cgpa: '8', company: 'Cognizant', role: 'Programmer Analyst', ctc: '₹4.0L', status: 'Declined', joining: '-' },
  { rollNo: 'CSE2021008', name: 'Divya Joshi', branch: 'CSE', cgpa: '8.7', company: 'Amazon', role: 'SDE I', ctc: '₹16.0L', status: 'Accepted', joining: '01 Sep 25' },
  { rollNo: 'IT2021009', name: 'Arjun Singh', branch: 'IT', cgpa: '7.5', company: 'Accenture', role: 'Associate SE', ctc: '₹4.5L', status: 'Accepted', joining: '20 Jun 25' },
  { rollNo: 'CSE2021010', name: 'Meera Kulkarni', branch: 'CSE', cgpa: '9', company: 'Flipkart', role: 'SDE I', ctc: '₹14L', status: 'Accepted', joining: '15 Aug 25' },
  { rollNo: 'ME2021011', name: 'Rahul Verma', branch: 'ME', cgpa: '7.9', company: 'Tata Motors', role: 'Associate SE', ctc: '₹4.5L', status: 'Accepted', joining: '20 Jun 25' },
  { rollNo: 'ECE2021012', name: 'Sanya Kapoor', branch: 'ECE', cgpa: '8.3', company: 'Samsung', role: 'Associate SE', ctc: '₹4.5L', status: 'Accepted', joining: '20 Jun 25' },
];

const OfferTracking: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted': return 'bg-[#29a35a] text-white';
      case 'Pending': return 'bg-[#f59e0b] text-white';
      case 'Declined': return 'bg-[#f43f5e] text-white';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusStyle = (status) => {
  switch (status) {
    case 'Accepted':
      return { backgroundColor: 'hsl(145, 60%, 40%)', color: 'white' };
    case 'Pending':
      return { backgroundColor: 'hsl(38, 100%, 50%)', color: 'white' };
    case 'Declined':
      return { backgroundColor: 'hsl(0, 72%, 55%)', color: 'white' };
    default:
      return {};
  }
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name or roll no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 w-full shadow-sm transition-all"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-all shadow-sm">
                  <span className="text-sm text-gray-900">All Branches</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border-2 border-gray-900 cursor-pointer hover:bg-gray-50 transition-all shadow-sm">
                  <span className="text-sm text-gray-900">All Batches</span>
                  <ChevronDown className="h-4 w-4 text-gray-900" />
                </div>
                <Button variant="outline" className="flex items-center gap-2 border-gray-200 bg-white text-gray-900 h-10 rounded-xl shadow-sm hover:bg-gray-50 transition-all">
                  <Upload className="h-4 w-4" />
                  <span className="font-semibold">Import CSV</span>
                </Button>
                <Button variant="outline" className="flex items-center gap-2 border-gray-200 bg-white text-gray-900 h-10 rounded-xl shadow-sm hover:bg-gray-50 transition-all">
                  <Download className="h-4 w-4" />
                  <span className="font-semibold">Export CSV</span>
                </Button>
              </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                    {dummyOffers.map((offer, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{offer.rollNo}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{offer.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{offer.branch}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{offer.cgpa}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{offer.company}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{offer.role}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{offer.ctc}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-medium ${getStatusColor(offer.status)} shadow-sm`}>
                            {offer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{offer.joining}</td>
                      </tr>
                    ))}
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
