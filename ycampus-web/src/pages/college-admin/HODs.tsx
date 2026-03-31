import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Trash2, Edit } from 'lucide-react';
import { useHODs, HODWithDepartments } from '@/hooks/useHODs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AddHODDialog } from '@/components/college-admin/AddHODDialog';
import { EditHODDialog } from '@/components/college-admin/EditHODDialog';

const CollegeAdminHODs = () => {
  const { hods, isLoading, deleteHOD, updateHOD } = useHODs();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editHOD, setEditHOD] = useState<HODWithDepartments | null>(null);

  const filteredHODs = hods?.filter(h =>
    h.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.departments.some(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    h.reporting_principal?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">HODs Management</h1>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>HODs</CardTitle>
                <AddHODDialog />
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search HODs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : filteredHODs && filteredHODs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Departments</TableHead>
                          <TableHead>Subjects</TableHead>
                          <TableHead>Sections</TableHead>
                          <TableHead>Reporting Principal</TableHead>
                          <TableHead>Assigned Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHODs.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell className="font-medium">{h.full_name}</TableCell>
                            <TableCell className="text-muted-foreground">{h.email}</TableCell>
                            <TableCell>
                              {h.departments.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {h.departments.map(dept => (
                                    <Badge key={dept.id} variant="outline" className="font-mono">
                                      {dept.code}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {h.subjects && h.subjects.length > 0 ? (
                                <div className="text-sm">{h.subjects.join(', ')}</div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {h.sections && h.sections.length > 0 ? (
                                <div className="flex gap-1">
                                  {h.sections.map(section => (
                                    <Badge key={section} variant="secondary" className="text-xs">
                                      {section}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {h.reporting_principal || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {h.departments.length > 0 
                                ? new Date(h.departments[0].assigned_at).toLocaleDateString()
                                : new Date(h.created_at).toLocaleDateString()
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setEditHOD(h)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteId(h.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No HODs found</p>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this HOD.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteId) {
                deleteHOD(deleteId);
              }
              setDeleteId(null);
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditHODDialog
        hod={editHOD}
        open={!!editHOD}
        onOpenChange={(open) => !open && setEditHOD(null)}
        onUpdate={(id, data) => {
          updateHOD({ id, data: { full_name: data.full_name, email: data.email } });
        }}
      />
    </SidebarProvider>
  );
};

export default CollegeAdminHODs;
