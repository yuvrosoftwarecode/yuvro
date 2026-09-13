import { createFileRoute } from "@tanstack/react-router";
import { AdminShell, KpiCard, Panel, Badge } from "@/components/admin/AdminShell";
import { Briefcase, Plus, Loader2, Edit2, Trash2, Eye, EyeOff, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { recruiterApi, Company, CompanyRecruiter } from "@/lib/recruiter-api";

export const Route = createFileRoute("/admin/recruiters")({ component: RecruitersPage });

function AddCompanyDialog({ onAdd, companies }: { onAdd: () => void; companies: Company[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Company>>({});

  useEffect(() => {
    if (!open) {
      setFormData({});
      setLoading(false);
    }
  }, [open]);

  const isDuplicate = formData.name
    ? companies.some((c) => c.name.toLowerCase() === formData.name?.toLowerCase())
    : false;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Company name is required");

    setLoading(true);
    try {
      await recruiterApi.createCompany(formData);
      toast.success("Company created successfully");
      setOpen(false);
      setFormData({});
      onAdd();
    } catch (err: any) {
      toast.error(err.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant="outline">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogDescription>Enter the details for the new company.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          {isDuplicate && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              A company with this name already exists.
            </div>
          )}
          <div className="space-y-2">
            <Label>
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              required
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                value={formData.domain || ""}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="e.g. Finance"
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                type="url"
                value={formData.website || ""}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Size</Label>
              <Select
                value={formData.size || ""}
                onValueChange={(val) => setFormData({ ...formData, size: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="501-1000">501-1000 employees</SelectItem>
                  <SelectItem value="1000+">1000+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location || ""}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. New York, USA"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name || isDuplicate}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Company
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditCompanyDialog({
  onUpdate,
  companies,
  company,
}: {
  onUpdate: () => void;
  companies: Company[];
  company: Company;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Company>>({
    name: company.name,
    domain: company.domain || "",
    website: company.website || "",
    size: company.size || "",
    location: company.location || "",
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        name: company.name,
        domain: company.domain || "",
        website: company.website || "",
        size: company.size || "",
        location: company.location || "",
      });
      setLoading(false);
    }
  }, [open, company]);

  const isDuplicate = formData.name
    ? companies.some(
        (c) => c.id !== company.id && c.name.toLowerCase() === formData.name?.toLowerCase(),
      )
    : false;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Company name is required");

    setLoading(true);
    try {
      await recruiterApi.updateCompany(company.id, formData);
      toast.success("Company updated successfully");
      setOpen(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || "Failed to update company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
          <DialogDescription>Update the details for the company.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          {isDuplicate && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              A company with this name already exists.
            </div>
          )}
          <div className="space-y-2">
            <Label>
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              required
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input
                value={formData.domain || ""}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                placeholder="e.g. Finance"
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                type="url"
                value={formData.website || ""}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Size</Label>
              <Select
                value={formData.size || ""}
                onValueChange={(val) => setFormData({ ...formData, size: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="501-1000">501-1000 employees</SelectItem>
                  <SelectItem value="1000+">1000+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location || ""}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. New York, USA"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name || isDuplicate}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManageCompaniesDialog({
  onUpdate,
  companies,
}: {
  onUpdate: () => void;
  companies: Company[];
}) {
  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this company? All associated recruiters may be affected.",
      )
    )
      return;
    try {
      await recruiterApi.deleteCompany(id);
      toast.success("Company deleted successfully");
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || "Failed to delete company");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2" variant="outline">
          <Building2 className="h-4 w-4" /> Companies
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Companies</DialogTitle>
          <DialogDescription>View, edit, and manage all registered companies.</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 mt-4 border rounded-md">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="text-left font-medium px-4 py-3">Company Name</th>
                <th className="text-left font-medium px-4 py-3">Domain</th>
                <th className="text-left font-medium px-4 py-3">Location</th>
                <th className="text-left font-medium px-4 py-3 w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground">
                    No companies found
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id} className="border-t border-border/40 hover:bg-accent/30">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{c.domain || "-"}</td>
                    <td className="px-4 py-3">{c.location || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <EditCompanyDialog onUpdate={onUpdate} companies={companies} company={c} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddRecruiterDialog({
  onAdd,
  companies,
  recruiters,
}: {
  onAdd: () => void;
  companies: Company[];
  recruiters: CompanyRecruiter[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    company_id: "",
  });

  useEffect(() => {
    if (!open) {
      setFormData({ first_name: "", last_name: "", email: "", password: "", company_id: "" });
      setLoading(false);
      setShowPassword(false);
    }
  }, [open]);

  const isDuplicate =
    formData.first_name && formData.company_id
      ? recruiters.some(
          (r) =>
            r.company?.id === formData.company_id &&
            r.user.first_name.toLowerCase() === formData.first_name.toLowerCase() &&
            (r.user.last_name || "").toLowerCase() === formData.last_name.toLowerCase(),
        )
      : false;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.email || !formData.company_id) {
      return toast.error("Please fill in all required fields");
    }

    setLoading(true);
    try {
      await recruiterApi.createRecruiter(formData);
      toast.success("Recruiter added successfully");
      setOpen(false);
      setFormData({ first_name: "", last_name: "", email: "", password: "", company_id: "" });
      onAdd();
    } catch (err: any) {
      toast.error(err.message || "Failed to add recruiter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Recruiter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Recruiter</DialogTitle>
          <DialogDescription>
            Create a recruiter account and assign them to a company.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          {isDuplicate && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              A recruiter with this name already exists for the selected company.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Leave blank to auto-generate"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              Company <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.company_id}
              onValueChange={(val) => setFormData({ ...formData, company_id: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.first_name ||
                !formData.email ||
                !formData.company_id ||
                isDuplicate
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Recruiter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditRecruiterDialog({
  onUpdate,
  companies,
  recruiter,
  recruiters,
}: {
  onUpdate: () => void;
  companies: Company[];
  recruiter: CompanyRecruiter;
  recruiters: CompanyRecruiter[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: recruiter.user.first_name,
    last_name: recruiter.user.last_name,
    email: recruiter.user.email,
    company_id: recruiter.company?.id || "",
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        first_name: recruiter.user.first_name,
        last_name: recruiter.user.last_name,
        email: recruiter.user.email,
        company_id: recruiter.company?.id || "",
      });
      setLoading(false);
    }
  }, [open, recruiter]);

  const isDuplicate =
    formData.first_name && formData.company_id
      ? recruiters.some(
          (r) =>
            r.id !== recruiter.id &&
            r.company?.id === formData.company_id &&
            r.user.first_name.toLowerCase() === formData.first_name.toLowerCase() &&
            (r.user.last_name || "").toLowerCase() === (formData.last_name || "").toLowerCase(),
        )
      : false;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await recruiterApi.updateRecruiter(recruiter.id, formData);
      toast.success("Recruiter updated successfully");
      setOpen(false);
      onUpdate();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update recruiter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Recruiter</DialogTitle>
          <DialogDescription>Update the recruiter's details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          {isDuplicate && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              A recruiter with this name already exists for the selected company.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>
              Company <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.company_id}
              onValueChange={(val) => setFormData({ ...formData, company_id: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !formData.first_name ||
                !formData.email ||
                !formData.company_id ||
                isDuplicate
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecruitersPage() {
  const [recruiters, setRecruiters] = useState<CompanyRecruiter[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const [recs, comps] = await Promise.all([
        recruiterApi.fetchRecruiters(),
        recruiterApi.fetchCompanies(),
      ]);
      setRecruiters(Array.isArray(recs) ? recs : []);
      setCompanies(Array.isArray(comps) ? comps : []);
    } catch (err: any) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recruiter?")) return;
    try {
      await recruiterApi.deleteRecruiter(id);
      toast.success("Recruiter deleted successfully");
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete recruiter");
    }
  };

  const totalPages = Math.max(1, Math.ceil(recruiters.length / pageSize));
  const paginatedRecruiters = recruiters.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AdminShell
      title="Recruiters"
      breadcrumb={["People", "Recruiters"]}
      right={
        <div className="flex items-center gap-2">
          <ManageCompaniesDialog onUpdate={loadData} companies={companies} />
          <AddCompanyDialog onAdd={loadData} companies={companies} />
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Active recruiters"
          value={recruiters.length.toString()}
          color="primary"
          icon={Briefcase}
        />
        <KpiCard 
          label="Self Signups" 
          value={recruiters.filter(r => r.is_self_signup).length.toString()} 
          color="ui" 
        />
        <KpiCard 
          label="Admin Invited" 
          value={recruiters.filter(r => !r.is_self_signup).length.toString()} 
          color="success" 
        />
        <KpiCard 
          label="Companies" 
          value={companies.length.toString()} 
          color="warning" 
        />
      </div>

      <Panel
        title="Recruiters list"
        action={
          <AddRecruiterDialog onAdd={loadData} companies={companies} recruiters={recruiters} />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/20">
              <tr>
                {[
                  "Recruiter",
                  "Company",
                  "Signup Source",
                  "Role",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="text-left font-medium px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : recruiters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No recruiters found
                  </td>
                </tr>
              ) : (
                paginatedRecruiters.map((r) => (
                  <tr key={r.id} className="border-t border-border/40 hover:bg-accent/30">
                    <td className="px-3 py-2.5 font-medium">
                      {r.user.first_name} {r.user.last_name}
                      <div className="text-xs text-muted-foreground font-normal">{r.user.email}</div>
                    </td>
                    <td className="px-3 py-2.5">{r.company?.name || "-"}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={r.is_self_signup ? "ui" : "muted"}>
                        {r.is_self_signup ? "Website" : "Admin"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="capitalize">{r.user.role}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={r.user.is_active ? "success" : "muted"}>
                        {r.user.is_active ? "verified" : "pending"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <EditRecruiterDialog
                          onUpdate={loadData}
                          companies={companies}
                          recruiter={r}
                          recruiters={recruiters}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && recruiters.length > 0 && (
          <div className="flex items-center justify-between p-3 text-xs text-muted-foreground border-t border-border/60">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 rounded border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 rounded border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Panel>
    </AdminShell>
  );
}
