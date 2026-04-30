import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, User } from 'lucide-react';
import { useCreateCompany, useUpdateCompany } from '@/hooks/usePlacement';
import type { CompanyRecord } from '@/hooks/usePlacement';

const VIOLET = 'hsl(249, 60%, 69%)';
const TEAL   = 'hsl(165, 64%, 50%)';

const EMPTY_FORM = {
  companyName:    '',
  domain:         '',
  website:        '',
  companySize:    '',
  location:       '',
  status:         'active' as 'active' | 'inactive' | 'blacklisted',
  companyType:    'Service' as 'Product' | 'Service' | 'Startup' | 'MNC' | 'IT Service & Consulting',
  description:    '',
  companyEmail:   '',
  companyPhone:   '',
  recruiterName:  '',
  designation:    '',
  recruiterEmail: '',
  recruiterPhone: '',
};

export type CompanyFormData = typeof EMPTY_FORM;

/** Map a backend CompanyRecord → dialog form shape */
export function recordToForm(c: CompanyRecord): CompanyFormData {
  return {
    companyName:    c.name        ?? '',
    domain:         c.domain      ?? '',
    website:        c.website     ?? '',
    companySize:    c.size        ?? '',
    location:       c.location    ?? '',
    status:         (c.status       ?? 'active') as CompanyFormData['status'],
    companyType:    (c.company_type || 'Service') as CompanyFormData['companyType'],
    description:    c.description   ?? '',
    companyEmail:   c.email       ?? '',
    companyPhone:   c.phone       ?? '',
    recruiterName:  c.recruiter_name        ?? '',
    designation:    c.recruiter_designation ?? '',
    recruiterEmail: c.recruiter_email       ?? '',
    recruiterPhone: c.recruiter_phone       ?? '',
  };
}

/** Map form data → payload for POST / PATCH */
function formToPayload(form: CompanyFormData) {
  return {
    name:                   form.companyName.trim(),
    domain:                 form.domain.trim(),
    website:                form.website.trim(),
    size:                   form.companySize,
    location:               form.location.trim(),
    status:                 form.status,
    company_type:           form.companyType,
    description:            form.description.trim(),
    email:                  form.companyEmail.trim(),
    phone:                  form.companyPhone.trim(),
    recruiter_name:         form.recruiterName.trim(),
    recruiter_designation:  form.designation.trim(),
    recruiter_email:        form.recruiterEmail.trim(),
    recruiter_phone:        form.recruiterPhone.trim(),
  };
}

interface AddCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass the existing record when in edit mode */
  editRecord?: CompanyRecord;
}

const AddCompanyDialog = ({ open, onOpenChange, editRecord }: AddCompanyDialogProps) => {
  const isEditMode = !!editRecord;
  const [form, setForm] = React.useState<CompanyFormData>(EMPTY_FORM);

  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const loading = createCompany.isPending || updateCompany.isPending;

  // Sync form whenever the dialog opens (reset for add, pre-fill for edit)
  React.useEffect(() => {
    if (open) setForm(editRecord ? recordToForm(editRecord) : EMPTY_FORM);
  }, [open, editRecord]);

  const update = (key: keyof CompanyFormData, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleClose = () => onOpenChange(false);

  const handleSubmit = () => {
    if (!form.companyName.trim()) return;

    const payload = formToPayload(form);

    if (isEditMode && editRecord) {
      updateCompany.mutate(
        { id: editRecord.id, data: payload },
        { onSuccess: handleClose },
      );
    } else {
      createCompany.mutate(payload, { onSuccess: handleClose });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEditMode ? 'Edit Company' : 'Add Company'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the company details and recruiter contact information.'
              : 'Fill in the company details and recruiter contact information.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">

          {/* ── Section A: Basic Information ─────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: `${VIOLET}20` }}>
                <Building2 className="h-3.5 w-3.5" style={{ color: VIOLET }} />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: VIOLET }}>Basic Information</h3>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="companyName" className="text-xs text-muted-foreground">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={form.companyName}
                    onChange={e => update('companyName', e.target.value)}
                    className="rounded-lg mt-1"
                    placeholder="e.g. Google India"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="companyType" className="text-xs text-muted-foreground">Company Type</Label>
                  <Select value={form.companyType} onValueChange={v => update('companyType', v)}>
                    <SelectTrigger id="companyType" className="rounded-lg mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Product">Product</SelectItem>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="Startup">Startup</SelectItem>
                      <SelectItem value="MNC">MNC</SelectItem>
                      <SelectItem value="IT Service & Consulting">IT Service & Consulting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="domain" className="text-xs text-muted-foreground">Primary Domain</Label>
                  <Input
                    id="domain"
                    value={form.domain}
                    onChange={e => update('domain', e.target.value)}
                    className="rounded-lg mt-1"
                    placeholder="e.g. Technology, FinTech"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="location" className="text-xs text-muted-foreground">Headquarters / Location</Label>
                  <Input
                    id="location"
                    value={form.location}
                    onChange={e => update('location', e.target.value)}
                    className="rounded-lg mt-1"
                    placeholder="e.g. Bangalore, Hyderabad"
                  />
                </div>
                <div>
                  <Label htmlFor="website" className="text-xs text-muted-foreground">Website URL</Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={e => update('website', e.target.value)}
                    className="rounded-lg mt-1"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="companySize" className="text-xs text-muted-foreground">Company Size</Label>
                  <Select value={form.companySize} onValueChange={v => update('companySize', v)}>
                    <SelectTrigger id="companySize" className="rounded-lg mt-1"><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-50">1 – 50 employees</SelectItem>
                      <SelectItem value="51-200">51 – 200 employees</SelectItem>
                      <SelectItem value="201-500">201 – 500 employees</SelectItem>
                      <SelectItem value="501-1000">501 – 1,000 employees</SelectItem>
                      <SelectItem value="1001-5000">1,001 – 5,000 employees</SelectItem>
                      <SelectItem value="5000+">5,000+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status" className="text-xs text-muted-foreground">Company Status</Label>
                  <Select value={form.status} onValueChange={v => update('status', v)}>
                    <SelectTrigger id="status" className="rounded-lg mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Verified)</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="blacklisted">Blacklisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-xs text-muted-foreground">About Company</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={e => update('description', e.target.value)}
                  className="rounded-lg mt-1"
                  rows={2}
                  placeholder="Brief description about the company…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="companyEmail" className="text-xs text-muted-foreground">Company Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={form.companyEmail}
                    onChange={e => update('companyEmail', e.target.value)}
                    className="rounded-lg mt-1"
                    placeholder="hr@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="companyPhone" className="text-xs text-muted-foreground">Contact Number</Label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={form.companyPhone}
                    onChange={e => update('companyPhone', e.target.value)}
                    className="rounded-lg mt-1"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/60" />

          {/* ── Section B: Recruiter Information ─────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: `${TEAL}20` }}>
                <User className="h-3.5 w-3.5" style={{ color: TEAL }} />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: TEAL }}>Recruiter Information</h3>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="recruiterName" className="text-xs text-muted-foreground">Recruiter Name</Label>
                  <Input
                    id="recruiterName"
                    value={form.recruiterName}
                    onChange={e => update('recruiterName', e.target.value)}
                    className="rounded-lg mt-1"
                    placeholder="e.g. Priya Sharma"
                  />
                </div>
                <div>
                  <Label htmlFor="designation" className="text-xs text-muted-foreground">Designation</Label>
                  <Input
                    id="designation"
                    value={form.designation}
                    onChange={e => update('designation', e.target.value)}
                    className="rounded-lg mt-1"
                    placeholder="e.g. HR Manager"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="recruiterEmail" className="text-xs text-muted-foreground">Email</Label>
                  <Input
                    id="recruiterEmail"
                    type="email"
                    value={form.recruiterEmail}
                    onChange={e => update('recruiterEmail', e.target.value)}
                    className="rounded-lg mt-1"
                    placeholder="recruiter@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="recruiterPhone" className="text-xs text-muted-foreground">Contact Number</Label>
                  <Input
                    id="recruiterPhone"
                    type="tel"
                    value={form.recruiterPhone}
                    onChange={e => update('recruiterPhone', e.target.value)}
                    className="rounded-lg mt-1"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} className="rounded-lg" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !form.companyName.trim()}
            className="rounded-lg"
            style={{ background: VIOLET }}
          >
            {loading
              ? (isEditMode ? 'Saving…' : 'Adding…')
              : (isEditMode ? 'Save Changes' : 'Add Company')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddCompanyDialog;
