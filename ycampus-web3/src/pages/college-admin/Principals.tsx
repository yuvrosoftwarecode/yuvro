import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CollegeAdminSidebar } from '@/components/college-admin/CollegeAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Trash2, Edit } from 'lucide-react';
import { usePrincipals, PrincipalWithDepartments } from '@/hooks/usePrincipals';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AddPrincipalDialog } from '@/components/college-admin/AddPrincipalDialog';
import { EditPrincipalDialog } from '@/components/college-admin/EditPrincipalDialog';

const CollegeAdminPrincipals = () => {
  const { principals, isLoading, deletePrincipal, updatePrincipal } = usePrincipals();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editPrincipal, setEditPrincipal] = useState<PrincipalWithDepartments | null>(null);

  const filteredPrincipals = principals?.filter(p =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.departments.some(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CollegeAdminSidebar />
        <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">Principals Management</h1>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Principals</CardTitle>
                <AddPrincipalDialog />
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search principals..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : filteredPrincipals && filteredPrincipals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Departments</TableHead>
                          <TableHead>Subjects</TableHead>
                          <TableHead>Sections</TableHead>
                          <TableHead>Assigned Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPrincipals.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.full_name}</TableCell>
                            <TableCell className="text-muted-foreground">{p.email}</TableCell>
                            <TableCell>
                              {p.departments.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {p.departments.map(dept => (
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
                              {p.subjects && p.subjects.length > 0 ? (
                                <div className="text-sm">{p.subjects.join(', ')}</div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {p.sections && p.sections.length > 0 ? (
                                <div className="flex gap-1">
                                  {p.sections.map(section => (
                                    <Badge key={section} variant="secondary" className="text-xs">
                                      {section}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {p.departments.length > 0 
                                ? new Date(p.departments[0].assigned_at).toLocaleDateString()
                                : new Date(p.created_at).toLocaleDateString()
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setEditPrincipal(p)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteId(p.id)}
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
                  <p className="text-muted-foreground">No principals found</p>
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
              This will permanently delete this user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deleteId) {
                deletePrincipal(deleteId);
              }
              setDeleteId(null);
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditPrincipalDialog
        principal={editPrincipal}
        open={!!editPrincipal}
        onOpenChange={(open) => !open && setEditPrincipal(null)}
        onUpdate={(id, data) => {
          updatePrincipal({ id, data: { full_name: data.full_name, email: data.email } });
        }}
      />
    </SidebarProvider>
  );
};

export default CollegeAdminPrincipals;
