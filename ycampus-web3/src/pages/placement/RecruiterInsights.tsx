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
    <PlacementLayout title="Recruiter Connections">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search company or recruiter..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Company Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Product">Product</SelectItem>
            <SelectItem value="Service">Service</SelectItem>
            <SelectItem value="Startup">Startup</SelectItem>
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Card className="border-border/60"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{companies.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Companies</p>
        </CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{companies.filter(c => c.status === 'applied').length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Applied</p>
        </CardContent></Card>
        <Card className="border-border/60"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{companies.filter(c => c.status === 'connected').length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Connected</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all" className="text-xs">All ({allFiltered.length})</TabsTrigger>
          <TabsTrigger value="applied" className="text-xs">Applied ({appliedFiltered.length})</TabsTrigger>
          <TabsTrigger value="connected" className="text-xs">Connected ({connectedFiltered.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderGrid(allFiltered)}</TabsContent>
        <TabsContent value="applied">{renderGrid(appliedFiltered)}</TabsContent>
        <TabsContent value="connected">{renderGrid(connectedFiltered)}</TabsContent>
      </Tabs>

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
