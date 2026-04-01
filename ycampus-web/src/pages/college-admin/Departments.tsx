import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, Building2, ChevronRight, LayoutGrid
} from 'lucide-react';
import { departmentService, Department } from '@/services/departmentService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import DepartmentDetailView from '@/components/college-admin/DepartmentDetailView';
import { Badge } from '@/components/ui/badge';

const Departments = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const collegeId = (user as any)?.college_id;
      const data = await departmentService.getDepartments(collegeId);
      setDepartments(data);
    } catch (error) {
      console.error('Failed to load departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, [user]);

  const filteredDepartments = useMemo(() => {
    return departments.filter(dept => 
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.short_form?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [departments, searchQuery]);

  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
  <CollegeAdminSidebar />
  <div className="flex-1 flex flex-col">
    <main className="flex-1 p-6 bg-background overflow-y-auto">
                    <h1 className="text-2xl font-bold text-foreground">Departments</h1>
    
            {id ? (
              <DepartmentDetailView 
                departmentId={id} 
                onBack={() => navigate('/college-admin/departments')} 
              />
            ) : (
              <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                
                {/* Search Bar */}
                <Card className="border-none shadow-sm bg-white/80 backdrop-blur-md sticky top-0 z-10 transition-all rounded-2xl">
                  <CardContent className="p-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input 
                        placeholder="Search by department name or code..."
                        className="pl-12 h-12 bg-muted/50 border-none focus:ring-2 focus:ring-foreground/5 text-lg rounded-xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : filteredDepartments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 bg-muted/5 rounded-2xl border border-dashed border-gray-200">
                    <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center text-muted-foreground/30 mb-6 shadow-inner ring-1 ring-gray-100">
                      <Building2 className="h-12 w-12" />
                    </div>
                    <h3 className="text-xl font-bold text-muted-foreground italic">No departments located.</h3>
                    <p className="text-muted-foreground/60 mt-2 text-sm">Try adjusting your search query.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDepartments.map((dept) => (
                      <Card 
                        key={dept.id} 
                        className="group border-gray-100 hover:border-gray-200 shadow-sm transition-all duration-300 cursor-pointer overflow-hidden rounded-2xl bg-white ring-1 ring-gray-50"
                        onClick={() => navigate(`/college-admin/departments/${dept.id}`)}
                      >
                        <CardContent className="p-0">
                          <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-all duration-300 shadow-sm ring-1 ring-gray-100">
                                <LayoutGrid className="h-7 w-7" />
                              </div>
                            </div>
                            
                            <h3 className="text-xl font-bold text-foreground transition-colors line-clamp-1">{dept.name}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-gray-200 font-medium rounded-lg">
                                {dept.short_form || "dept"}
                              </Badge>
                              <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                              <span className="text-xs text-muted-foreground font-medium tracking-tight">Department oversight</span>
                            </div>
                          </div>
                          
                          <div className="bg-muted/30 p-4 border-t border-gray-50 flex items-center justify-between group-hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                              <span className="text-[11px] font-bold text-muted-foreground tracking-tighter">View details</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground/50 group-hover:translate-x-1 transition-all" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Departments;
