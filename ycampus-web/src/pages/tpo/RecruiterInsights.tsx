import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { CompanyRecord, ChatMessage } from '@/components/placement/recruiter/types';
import { initialCompanies } from '@/components/placement/recruiter/dummyData';
import CompanyCard from '@/components/placement/recruiter/CompanyCard';
import ConnectDialog from '@/components/placement/recruiter/ConnectDialog';

const RecruiterInsights = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyRecord[]>(initialCompanies);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [connectTarget, setConnectTarget] = useState<string | null>(null);

  const handleConnect = (id: string, note: string, attachment?: string) => {
    setCompanies(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'applied' as const, connectionNote: note, connectionAttachment: attachment } : c
    ));
  };

  const handleSimulateAccept = (id: string) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: 'connected' as const } : c));
  };

  const locations = useMemo(() => [...new Set(companies.map(c => c.location))], [companies]);

  const filterFn = (c: CompanyRecord) => {
    if (search && !c.companyName.toLowerCase().includes(search.toLowerCase()) && !c.recruiterName.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && c.companyType !== typeFilter) return false;
    if (locationFilter !== 'all' && c.location !== locationFilter) return false;
    return true;
  };

  const allFiltered = companies.filter(filterFn);
  const appliedFiltered = allFiltered.filter(c => c.status === 'applied');
  const connectedFiltered = allFiltered.filter(c => c.status === 'connected');

  const connectCompany = companies.find(c => c.id === connectTarget);

  const renderGrid = (list: CompanyRecord[]) => (
    list.length === 0 ? (
      <div className="text-center py-16 text-muted-foreground text-sm">No companies found</div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map(c => (
          <CompanyCard
            key={c.id}
            company={c}
            onConnect={(id) => setConnectTarget(id)}
            onChat={(id) => navigate(`/placement/recruiters/${id}?chat=true`)}
            onCardClick={(id) => navigate(`/placement/recruiters/${id}`)}
            onSimulateAccept={handleSimulateAccept}
          />
        ))}
      </div>
    )
  );

  return (
    <PlacementLayout title="">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Recruiter Connections</h1>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <div className="relative flex-1 min-w-[280px] max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search company or recruiter..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-10 h-11 bg-white border-slate-200 rounded-xl text-sm focus:ring-slate-200" 
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-11 bg-white border-slate-200 rounded-xl text-sm capitalize">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Product">Product</SelectItem>
              <SelectItem value="Service">Service</SelectItem>
              <SelectItem value="Startup">Startup</SelectItem>
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[160px] h-11 bg-white border-slate-200 rounded-xl text-sm capitalize">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="bg-white border-slate-100 shadow-sm rounded-xl py-6">
            <div className="text-center space-y-1">
              <p className="text-3xl font-bold text-slate-900">{companies.length}</p>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Companies</p>
            </div>
          </Card>
          <Card className="bg-white border-slate-100 shadow-sm rounded-xl py-6">
            <div className="text-center space-y-1">
              <p className="text-3xl font-bold text-[#F59E0B]">{companies.filter(c => c.status === 'applied').length}</p>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Applied</p>
            </div>
          </Card>
          <Card className="bg-white border-slate-100 shadow-sm rounded-xl py-6">
            <div className="text-center space-y-1">
              <p className="text-3xl font-bold text-[#10B981]">{companies.filter(c => c.status === 'connected').length}</p>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Connected</p>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-transparent h-auto p-0 gap-6 mb-8 border-none justify-start w-full overflow-x-auto scrollbar-hide">
            <TabsTrigger 
              value="all" 
              className="px-0 py-2 border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none text-sm font-bold text-slate-400 data-[state=active]:text-slate-900 transition-all"
            >
              All ({allFiltered.length})
            </TabsTrigger>
            <TabsTrigger 
              value="applied" 
              className="px-0 py-2 border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none text-sm font-bold text-slate-400 data-[state=active]:text-slate-900 transition-all"
            >
              Applied ({appliedFiltered.length})
            </TabsTrigger>
            <TabsTrigger 
              value="connected" 
              className="px-0 py-2 border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none text-sm font-bold text-slate-400 data-[state=active]:text-slate-900 transition-all"
            >
              Connected ({connectedFiltered.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-0 outline-none">{renderGrid(allFiltered)}</TabsContent>
          <TabsContent value="applied" className="mt-0 outline-none">{renderGrid(appliedFiltered)}</TabsContent>
          <TabsContent value="connected" className="mt-0 outline-none">{renderGrid(connectedFiltered)}</TabsContent>
        </Tabs>
      </div>

      {/* Connect Dialog */}
      {connectCompany && (
        <ConnectDialog
          open={!!connectTarget}
          onClose={() => setConnectTarget(null)}
          companyName={connectCompany.companyName}
          recruiterName={connectCompany.recruiterName}
          onSend={(note, attachment) => handleConnect(connectCompany.id, note, attachment)}
        />
      )}
    </PlacementLayout>
  );
};

export default RecruiterInsights;