import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { X, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useCompanies, useCreateCompany } from '@/hooks/usePlacement';
import jobService from '@/services/jobService';
import { useQueryClient } from '@tanstack/react-query';
import type { PlacementJob } from '@/hooks/usePlacement';

const VIOLET = 'hsl(249, 60%, 69%)';
const TEAL = 'hsl(165, 64%, 50%)';

const DEPARTMENTS = ['CSE', 'ECE', 'ME', 'CE', 'EEE', 'IT', 'AIDS', 'AIML'];

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRecord?: PlacementJob;
}

const CreateJobDialog = ({ open, onOpenChange, editRecord }: CreateJobDialogProps) => {
  const isEditMode = !!editRecord;
  const qc = useQueryClient();
  const { data: companyList = [], isLoading: companiesLoading } = useCompanies();
  const activeCompanies = companyList.filter(c => (c.status ?? 'active') === 'active');
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [form, setForm] = useState({
    roleTitle: '', jobType: 'full_time', location: '',
    ctcFixed: '', ctcVariable: '', deadline: '', minCgpa: '0',
    description: '', bondDetails: '', skillInput: '', vacancies: '1',
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectionRounds, setSelectionRounds] = useState<string[]>([]);
  const [roundInput, setRoundInput] = useState('');

  React.useEffect(() => {
    if (open) {
      if (editRecord) {
        setCompanyId(editRecord.recruiter_id);
        setForm({
          roleTitle: editRecord.role_title,
          jobType: editRecord.job_type || 'full_time',
          location: editRecord.location || '',
          ctcFixed: (editRecord.ctc_fixed / 100000).toString(),
          ctcVariable: ((editRecord.ctc_total - editRecord.ctc_fixed) / 100000).toString(),
          deadline: editRecord.deadline || '',
          minCgpa: editRecord.min_cgpa.toString(),
          description: editRecord.role_description || '',
          bondDetails: editRecord.bond_details || '',
          skillInput: '',
          vacancies: editRecord.vacancies.toString(),
        });
        setSkills(editRecord.skills_required || []);
        setSelectedDepts(editRecord.eligible_branches || []);
        setSelectionRounds(editRecord.selection_rounds || []);
      } else {
        setForm({ roleTitle: '', jobType: 'full_time', location: '', ctcFixed: '', ctcVariable: '', deadline: '', minCgpa: '0', description: '', bondDetails: '', skillInput: '', vacancies: '1' });
        setCompanyId('');
        setSkills([]); setSelectedDepts([]); setSelectionRounds([]); setRoundInput('');
      }
    }
  }, [open, editRecord]);

  const update = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const addSkill = () => {
    if (form.skillInput.trim() && !skills.includes(form.skillInput.trim())) {
      setSkills(p => [...p, form.skillInput.trim()]);
      update('skillInput', '');
    }
  };

  const addRound = () => {
    if (roundInput.trim() && !selectionRounds.includes(roundInput.trim())) {
      setSelectionRounds(p => [...p, roundInput.trim()]);
      setRoundInput('');
    }
  };

  const toggleDept = (d: string) => setSelectedDepts(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);

  const handleSubmit = async () => {
    if (!companyId || !form.roleTitle.trim()) {
      toast({ title: 'Company and role title are required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const ctcFixed    = parseFloat(form.ctcFixed)    || 0;   // in LPA
      const ctcVariable = parseFloat(form.ctcVariable) || 0;

      if (isEditMode && editRecord) {
        await jobService.updateJob(editRecord.id, {
          company_id:               companyId,
          title:                    form.roleTitle.trim(),
          description:              form.description || '',
          employment_type:          form.jobType === 'intern' ? 'internship' : form.jobType === 'contract' ? 'contract' : 'full-time',
          experience_min_years:     0,
          locations:                form.location ? [form.location] : [],
          min_salary:               ctcFixed   * 100000 || undefined,
          max_salary:               (ctcFixed + ctcVariable) * 100000 || undefined,
          currency:                 'INR',
          skills:                   skills.length ? skills : undefined,
          status:                   'active',
          expires_at:               form.deadline || undefined,
          vacancies:                parseInt(form.vacancies) || 1,
          min_cgpa:                 parseFloat(form.minCgpa) || 0,
          bond_details:             form.bondDetails || '',
          eligible_branches:        selectedDepts,
          selection_rounds:         selectionRounds || [],
        });
        toast({ title: 'Job updated successfully' });
      } else {
        await jobService.createJob({
          company_id:               companyId,
          title:                    form.roleTitle.trim(),
          description:              form.description || '',
          employment_type:          form.jobType === 'intern' ? 'internship' : form.jobType === 'contract' ? 'contract' : 'full-time',
          experience_min_years:     0,
          locations:                form.location ? [form.location] : [],
          min_salary:               ctcFixed   * 100000 || undefined,
          max_salary:               (ctcFixed + ctcVariable) * 100000 || undefined,
          currency:                 'INR',
          skills:                   skills.length ? skills : undefined,
          status:                   'active',
          expires_at:               form.deadline || undefined,
          vacancies:                parseInt(form.vacancies) || 1,
          min_cgpa:                 parseFloat(form.minCgpa) || 0,
          bond_details:             form.bondDetails || '',
          eligible_branches:        selectedDepts,
          selection_rounds:         selectionRounds || [],
        });
        toast({ title: 'Job created and published' });
      }

      qc.invalidateQueries({ queryKey: ['placement-jobs'] });
      qc.invalidateQueries({ queryKey: ['placement-stats'] });
      onOpenChange(false);
      setForm({ roleTitle: '', jobType: 'full_time', location: '', ctcFixed: '', ctcVariable: '', deadline: '', minCgpa: '0', description: '', bondDetails: '', skillInput: '', vacancies: '1' });
      setCompanyId('');
      setSkills([]); setSelectedDepts([]); setSelectionRounds([]); setRoundInput('');
    } catch (e: any) {
      toast({ title: 'Error creating job', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{isEditMode ? 'Edit Job' : 'Create New Job'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the job details for candidates.' : 'Jobs created by Placement Officer go directly to Live Jobs.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Company *</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="rounded-lg mt-1">
                  {companiesLoading ? (
                    <span className="flex items-center gap-1 text-muted-foreground text-sm"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</span>
                  ) : (
                    <SelectValue placeholder="Select company" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {activeCompanies.length === 0 && (
                    <SelectItem value="__none" disabled>No active companies</SelectItem>
                  )}
                  {activeCompanies.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Role / Job Title *</Label>
              <Input value={form.roleTitle} onChange={e => update('roleTitle', e.target.value)} className="rounded-lg mt-1" placeholder="e.g. SDE Intern" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Job Type</Label>
              <Select value={form.jobType} onValueChange={v => update('jobType', v)}>
                <SelectTrigger className="rounded-lg mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Input value={form.location} onChange={e => update('location', e.target.value)} className="rounded-lg mt-1" placeholder="e.g. Bangalore" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">CTC Fixed (LPA)</Label>
              <Input type="number" value={form.ctcFixed} onChange={e => update('ctcFixed', e.target.value)} className="rounded-lg mt-1" placeholder="e.g. 6" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">CTC Variable (LPA)</Label>
              <Input type="number" value={form.ctcVariable} onChange={e => update('ctcVariable', e.target.value)} className="rounded-lg mt-1" placeholder="e.g. 2" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Vacancies</Label>
              <Input type="number" value={form.vacancies} onChange={e => update('vacancies', e.target.value)} className="rounded-lg mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Application Deadline</Label>
              <Input type="date" value={form.deadline} onChange={e => update('deadline', e.target.value)} className="rounded-lg mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Minimum CGPA</Label>
              <Input type="number" step="0.1" value={form.minCgpa} onChange={e => update('minCgpa', e.target.value)} className="rounded-lg mt-1" />
            </div>
          </div>

          {/* Eligible Departments */}
          <div>
            <Label className="text-xs text-muted-foreground">Eligible Departments</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {DEPARTMENTS.map(d => (
                <Badge key={d} variant={selectedDepts.includes(d) ? 'default' : 'outline'}
                  className="cursor-pointer rounded-lg text-xs"
                  style={selectedDepts.includes(d) ? { background: VIOLET } : {}}
                  onClick={() => toggleDept(d)}>{d}</Badge>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div>
            <Label className="text-xs text-muted-foreground">Skills Required</Label>
            <div className="flex gap-2 mt-1">
              <Input value={form.skillInput} onChange={e => update('skillInput', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                className="rounded-lg" placeholder="Add skill & press Enter" />
              <Button type="button" size="icon" variant="outline" className="rounded-lg shrink-0" onClick={addSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {skills.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs rounded-lg gap-1">
                    {s} <X className="h-3 w-3 cursor-pointer" onClick={() => setSkills(p => p.filter(x => x !== s))} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Selection Rounds */}
          <div>
            <Label className="text-xs text-muted-foreground">Selection Rounds</Label>
            <div className="flex gap-2 mt-1">
              <Input value={roundInput} onChange={e => setRoundInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRound())}
                className="rounded-lg" placeholder="e.g. Aptitude Test" />
              <Button type="button" size="icon" variant="outline" className="rounded-lg shrink-0" onClick={addRound}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {selectionRounds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectionRounds.map((r, i) => (
                  <Badge key={i} variant="outline" className="text-xs rounded-lg gap-1">
                    {i + 1}. {r} <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectionRounds(p => p.filter((_, j) => j !== i))} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Job Description</Label>
            <Textarea value={form.description} onChange={e => update('description', e.target.value)} className="rounded-lg mt-1" rows={3} placeholder="Describe the role..." />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Bond Details (if any)</Label>
            <Input value={form.bondDetails} onChange={e => update('bondDetails', e.target.value)} className="rounded-lg mt-1" placeholder="e.g. 2 years bond" />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="rounded-lg" style={{ background: isEditMode ? VIOLET : TEAL }}>
            {loading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create & Publish')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateJobDialog;
