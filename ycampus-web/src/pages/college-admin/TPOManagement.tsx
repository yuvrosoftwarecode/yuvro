import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Edit, Plus, AlertCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AddTPODialog } from '@/components/college-admin/AddTPODialog';
import { EditTPODialog } from '@/components/college-admin/EditTPODialog';
import { placementOfficerService, PlacementOfficerProfile } from '@/services/placementOfficerService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const TPOManagement = () => {
  const { user: currentUser } = useAuth();
  const [tpos, setTPOs] = useState<PlacementOfficerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editTPO, setEditTPO] = useState<PlacementOfficerProfile | null>(null);
  
  const fetchTPOs = async () => {
    try {
      setLoading(true);
      const collegeId = (currentUser as any)?.college_id;
      if (!collegeId || collegeId === 'undefined') {
        setLoading(false);
        return;
      }

      const response = await placementOfficerService.getPlacementOfficers(collegeId);
      setTPOs(response);
    } catch (err) {
      console.error("Failed to fetch TPOs", err);
      toast.error("Failed to load TPO list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTPOs();
    }
  }, [currentUser]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await placementOfficerService.deletePlacementOfficer(deleteId);
      toast.success("TPO removed successfully");
      fetchTPOs();
    } catch (err) {
      console.error("Failed to delete TPO", err);
      toast.error("Failed to delete TPO");
    } finally {
      setDeleteId(null);
    }
  };

  const filteredTPOs = tpos.filter(t => 
    t.user_details.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.user_details.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.user_details.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.user_details.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">TPO Management</h1>
            
            <Card className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle >All TPO Profiles</CardTitle>
                <div className="flex gap-2">
                    <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 h-10 px-4 bg-black text-white hover:bg-black/90">
                        <Plus className="h-4 w-4" />
                        Add TPO
                    </Button>
                    <AddTPODialog 
                      open={isAddDialogOpen} 
                      onOpenChange={setIsAddDialogOpen}
                      onSuccess={fetchTPOs} 
                    />
                </div>
              </CardHeader>

              <CardContent>
                <div className="mb-6">
                  <div className="flex-1 max-w-sm relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or username..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 h-10 border-muted-foreground/20 focus-visible:ring-black"
                    />
                  </div>
                </div>

                <div className="rounded-md border border-muted-foreground/10 overflow-hidden shadow-sm bg-white">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="w-[60px] text-center text-muted-foreground text-[11px] uppercase tracking-wider font-bold">Sl. No</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Name</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Email</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">Username</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider font-bold">College</TableHead>
                        <TableHead className="text-right pr-4 text-[11px] uppercase tracking-wider font-bold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={6} className="py-4">
                              <div className="h-4 bg-muted animate-pulse rounded"></div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filteredTPOs.length > 0 ? (
                        filteredTPOs.map((t, index) => (
                          <TableRow key={t.id} className="group hover:bg-muted/20 transition-colors">
                            <TableCell className="text-center font-medium text-muted-foreground text-xs">
                                {(index + 1).toString().padStart(2, '0')}
                            </TableCell>
                            <TableCell className="py-3 font-medium text-sm">
                                {t.user_details.first_name} {t.user_details.last_name}
                            </TableCell>
                            <TableCell className="text-sm">{t.user_details.email}</TableCell>
                            <TableCell>
                                <code className="text-[11px] bg-muted/50 px-1.5 py-0.5 rounded font-mono uppercase tracking-tighter text-foreground">
                                    {t.user_details.username}
                                </code>
                            </TableCell>
                            <TableCell className="text-xs font-medium text-muted-foreground">{t.college_name}</TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex justify-end gap-1 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                  onClick={() => setEditTPO(t)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-50"
                                  onClick={() => setDeleteId(t.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-40 text-center text-muted-foreground text-sm">
                            <div className="flex flex-col items-center justify-center gap-2">
                                <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
                                <p>No TPO profiles found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      <EditTPODialog 
        tpo={editTPO} 
        open={!!editTPO} 
        onOpenChange={(open) => !open && setEditTPO(null)} 
        onSuccess={fetchTPOs}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Remove TPO Officer?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              This will permanently delete this TPO profile and their associated user account. This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 border-gray-100">Keep Profile</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl font-bold text-xs uppercase tracking-widest px-6 bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default TPOManagement;
