import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, Briefcase, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Company, 
  Role, 
  fetchCompanies, 
  createCompany, 
  updateCompany, 
  deleteCompany,
  createRole,
  fetchRoles
} from '@/services/plannerService';

const PlannerCompaniesTab = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCompanies, setExpandedCompanies] = useState<string[]>([]);
  
  // Company Modal State
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', description: '' });

  // Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [targetCompanyId, setTargetCompanyId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState<{title: string, difficulty: 'Medium' | 'Easy' | 'Hard', required_skills: string}>({ 
    title: '', 
    difficulty: 'Medium', 
    required_skills: '' 
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchCompanies();
      // Fetch roles for each company to populate the UI
      const companiesWithRoles = await Promise.all(data.map(async (company) => {
        const roles = await fetchRoles(company.id);
        return { ...company, roles };
      }));
      setCompanies(companiesWithRoles);
    } catch (error) {
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCompanies(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSaveCompany = async () => {
    if (!companyForm.name) {
      toast.error("Company name is required");
      return;
    }

    try {
      if (editingCompany) {
        const updated = await updateCompany(editingCompany.id, companyForm);
        setCompanies(prev => prev.map(c => 
          c.id === editingCompany.id ? { ...c, ...updated } : c
        ));
        toast.success("Company updated successfully");
      } else {
        const newCompany = await createCompany(companyForm);
        setCompanies(prev => [...prev, { ...newCompany, roles: [] }]);
        toast.success("Company added successfully");
      }
      setIsCompanyModalOpen(false);
      setEditingCompany(null);
      setCompanyForm({ name: '', description: '' });
    } catch (error) {
      toast.error("Failed to save company");
    }
  };

  const handleDeleteCompany = async (id: string) => {
    try {
      await deleteCompany(id);
      setCompanies(prev => prev.filter(c => c.id !== id));
      toast.success("Company removed");
    } catch (error) {
      toast.error("Failed to delete company");
    }
  };

  const handleSaveRole = async () => {
    if (!roleForm.title) {
      toast.error("Role title is required");
      return;
    }

    const skills = roleForm.required_skills.split(',').map(s => s.trim()).filter(s => s);

    try {
      if (editingRole && targetCompanyId) {
        // We will implement updateRole if needed, for now just focus on create
        toast.info("Update role via API pending implementation");
      } else if (targetCompanyId) {
        const newRole = await createRole({
          company: targetCompanyId,
          title: roleForm.title,
          difficulty: roleForm.difficulty,
          required_skills: skills
        });
        
        setCompanies(prev => prev.map(c => 
          c.id === targetCompanyId ? { ...c, roles: [...(c.roles || []), newRole] } : c
        ));
        toast.success("Role added successfully");
      }
      setIsRoleModalOpen(false);
      setEditingRole(null);
      setTargetCompanyId(null);
      setRoleForm({ title: '', difficulty: 'Medium', required_skills: '' });
    } catch (error) {
      toast.error("Failed to save role");
    }
  };

  const handleDeleteRole = (companyId: string, roleId: string) => {
    // Delete role from backend pending implementation in plannerService
    setCompanies(prev => prev.map(c => 
      c.id === companyId ? { ...c, roles: (c.roles || []).filter(r => r.id !== roleId) } : c
    ));
    toast.success("Role removed");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Companies & Roles</h2>
          <p className="text-muted-foreground">Define target companies and job roles for interview preparation.</p>
        </div>
        <Button onClick={() => { setEditingCompany(null); setCompanyForm({ name: '', description: '' }); setIsCompanyModalOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground italic">Syncing catalogue...</div>
        ) : companies.length === 0 ? (
          <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No Companies Defined</h3>
            <p className="text-sm text-muted-foreground mb-6">Start by adding a target company to the catalogue.</p>
            <Button variant="outline" onClick={() => setIsCompanyModalOpen(true)}>Add First Company</Button>
          </Card>
        ) : (
          companies.map(company => (
            <Card key={company.id} className="overflow-hidden border-border/60">
              <div 
                className="flex items-center justify-between p-5 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => toggleExpand(company.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                     <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{company.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{company.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="hidden sm:inline-flex">{(company.roles || []).length} Roles</Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingCompany(company); setCompanyForm({ name: company.name, description: company.description }); setIsCompanyModalOpen(true); }}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteCompany(company.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {expandedCompanies.includes(company.id) ? <ChevronDown className="h-5 w-5 ml-2 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 ml-2 text-muted-foreground" />}
                  </div>
                </div>
              </div>

              {expandedCompanies.includes(company.id) && (
                <CardContent className="bg-muted/10 border-t pt-5 pb-5">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Job Roles</h4>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { setTargetCompanyId(company.id); setEditingRole(null); setRoleForm({ title: '', difficulty: 'Medium', required_skills: '' }); setIsRoleModalOpen(true); }}>
                      <Plus className="h-3.5 w-3.5" /> Add Role
                    </Button>
                  </div>

                  {(!company.roles || company.roles.length === 0) ? (
                    <div className="text-center py-6 text-sm text-muted-foreground bg-background/50 rounded-lg border border-dashed">
                      No roles defined for {company.name} yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(company.roles || []).map(role => (
                        <Card key={role.id} className="bg-background hover:shadow-sm transition-all group">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{role.title}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  <Badge variant="outline" className={`text-[10px] py-0 h-4 border-none ${
                                    role.difficulty === 'Hard' ? 'bg-red-100 text-red-700' : 
                                    role.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {role.difficulty}
                                  </Badge>
                                  {Array.isArray(role.required_skills) ? role.required_skills.map(skill => (
                                    <span key={skill} className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded-sm">{skill}</span>
                                  )) : (
                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded-sm">{role.required_skills}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { 
                                setTargetCompanyId(company.id); 
                                setEditingRole(role); 
                                const skillsString = Array.isArray(role.required_skills) ? role.required_skills.join(', ') : role.required_skills;
                                setRoleForm({ title: role.title, difficulty: role.difficulty, required_skills: skillsString }); 
                                setIsRoleModalOpen(true); 
                              }}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteRole(company.id, role.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Company Modal */}
      <Dialog open={isCompanyModalOpen} onOpenChange={setIsCompanyModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
            <DialogDescription>
              Enter the details for the target company in the interview planner.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Company Name</Label>
              <Input id="name" value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} placeholder="e.g. Google, Amazon" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={companyForm.description} onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })} placeholder="Brief overview of the company" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompanyModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCompany}>Save Company</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Modal */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Add Job Role'}</DialogTitle>
            <DialogDescription>
              Configure the specific job role and requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role-title">Job Title</Label>
              <Input id="role-title" value={roleForm.title} onChange={(e) => setRoleForm({ ...roleForm, title: e.target.value })} placeholder="e.g. SDE-1, Full Stack Developer" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select value={roleForm.difficulty} onValueChange={(val: any) => setRoleForm({ ...roleForm, difficulty: val })}>
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="skills">Required Skills (comma separated)</Label>
              <Input id="skills" value={roleForm.required_skills} onChange={(e) => setRoleForm({ ...roleForm, required_skills: e.target.value })} placeholder="e.g. DSA, React, Python" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRole}>Save Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlannerCompaniesTab;
