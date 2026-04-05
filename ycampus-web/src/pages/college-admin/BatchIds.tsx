import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, FolderOpen, Building, Calendar, ArrowRight, Layers, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { collegeService } from '@/services/collegeService';
import { batchService, Batch } from '@/services/batchService';
import { departmentService, Department } from '@/services/departmentService';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

// Re-implementing BatchIdCard and BatchIdDetailView patterns to match the user's styling request
const BatchIdCard = ({ name, onSelect }: { name: string; onSelect: (name: string) => void }) => (
  <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onSelect(name)}>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
            <Calendar className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{name}</h3>
            <p className="text-sm text-muted-foreground">Academic Cycle</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
      </div>
    </CardContent>
  </Card>
);

const BatchIdDetailView = ({ batchName, batches, onBack }: { batchName: string; batches: Batch[]; onBack: () => void }) => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowRight className="h-4 w-4 rotate-180 mr-2" />
        Back
      </Button>
      <h2 className="text-2xl font-bold">{batchName} Details</h2>
    </div>
    
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {batches.map((batch) => (
        <Card key={batch.id} className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-4 bg-muted/30 border-b">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{batch.department_name || 'N/A'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
               <span className="text-xs font-bold text-muted-foreground uppercase">Status</span>
               <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">Initialized</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <Layers className="h-4 w-4" />
               <span>Standard 8-Semester Container</span>
            </div>
          </CardContent>
        </Card>
      ))}
      {batches.length === 0 && (
        <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-xl">
           <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
           <p>No department batches found for this year.</p>
        </div>
      )}
    </div>
  </div>
);

export default function BatchIds() {
  const { user: currentUser } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batchNames, setBatchNames] = useState<string[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatchName, setSelectedBatchName] = useState<string | null>(null);
  const [batchesForYear, setBatchesForYear] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const collegeId = (currentUser as any)?.college_id;
        if (!collegeId) return;

        const [depts, names] = await Promise.all([
          departmentService.getDepartments(),
          selectedDeptId === 'all' 
            ? collegeService.getUniqueBatches(collegeId)
            : batchService.getBatches(selectedDeptId).then(batches => Array.from(new Set(batches.map(b => b.name))))
        ]);

        setDepartments(depts);
        setBatchNames(names.sort().reverse());
      } catch (err) {
        console.error("Failed to fetch data", err);
        toast.error("Failed to load batches");
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchData();
    }
  }, [currentUser, selectedDeptId]);

  const fetchBatchesForYear = async (name: string) => {
    try {
      setLoadingDetail(true);
      const collegeId = (currentUser as any)?.college_id;
      if (!collegeId) return;

      const detail = await batchService.getBatchesByCollegeAndName(collegeId, name);
      setBatchesForYear(detail);
      setSelectedBatchName(name);
    } catch (err) {
      console.error("Failed to fetch year detail", err);
      toast.error("Failed to load batch details");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Filter batch IDs by search query (years)
  const filteredBatchNames = batchNames.filter(name =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If a batch year is selected, show the detail view
  if (selectedBatchName) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <CollegeAdminSidebar />
          <div className="flex-1 flex flex-col">
            <main className="flex-1 p-6 bg-background">
              {loadingDetail ? (
                <div className="flex items-center justify-center h-64">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <BatchIdDetailView
                  batchName={selectedBatchName}
                  batches={batchesForYear}
                  onBack={() => setSelectedBatchName(null)}
                />
              )}
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6 bg-background">
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Batch Management</h1>
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Batch IDs</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Manage batch containers across departments
                  </p>
                </div>
                {/* Add Batch Button Removed as per user request */}
              </div>

              {/* Filters */}
              <Card className="border shadow-none bg-white">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search batch IDs (e.g. 2021)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-10 border-muted-foreground/20"
                        />
                      </div>
                    </div>
                    <div className="w-full sm:w-64">
                      
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Batch IDs Grid */}
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="h-24 animate-pulse bg-muted" />
                  ))}
                </div>
              ) : filteredBatchNames.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredBatchNames.map((name) => (
                    <BatchIdCard
                      key={name}
                      name={name}
                      onSelect={(n) => fetchBatchesForYear(n)}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-none bg-muted/20">
                  <CardContent className="py-12">
                    <div className="text-center">
                      <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Batch IDs Found</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {searchQuery 
                          ? 'Try adjusting your filters'
                          : 'No batches initialized for this college yet'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
