import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { X, Plus } from 'lucide-react';

const VIOLET = 'hsl(249, 60%, 69%)';
const TEAL = 'hsl(165, 64%, 50%)';

const DEPARTMENTS = ['CSE', 'ECE', 'ME', 'CE', 'EEE', 'IT', 'AIDS', 'AIML'];

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateJobDialog = ({ open, onOpenChange }: CreateJobDialogProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: '', roleTitle: '', jobType: 'full_time', location: '',
    ctcFixed: '', ctcVariable: '', deadline: '', minCgpa: '0',
    description: '', bondDetails: '', skillInput: '', vacancies: '1',
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectionRounds, setSelectionRounds] = useState<string[]>([]);
  const [roundInput, setRoundInput] = useState('');

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
    if (!form.companyName.trim() || !form.roleTitle.trim()) {
      toast({ title: 'Company name and role title are required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // Create or find recruiter
      let recruiterId: string;
      const { data: existing } = await supabase.from('recruiters').select('id').eq('company_name', form.companyName.trim()).limit(1);
      if (existing?.length) {
        recruiterId = existing[0].id;
      } else {
        const { data: newRec, error: recErr } = await supabase.from('recruiters').insert({
          name: 'Placement Officer Created', email: 'internal@campus.edu', company_name: form.companyName.trim(),
          company_location: form.location || null, is_verified: true, trust_score: 100,
        }).select('id').single();
        if (recErr) throw recErr;
        recruiterId = newRec.id;
      }

      const ctcFixed = parseFloat(form.ctcFixed) * 100000 || 0;
      const ctcVariable = parseFloat(form.ctcVariable) * 100000 || 0;

      const { error } = await supabase.from('placement_jobs').insert({
        recruiter_id: recruiterId,
        role_title: form.roleTitle.trim(),
        role_description: form.description || null,
        job_type: form.jobType,
        location: form.location || null,
        ctc_fixed: ctcFixed,
        ctc_variable: ctcVariable,
        ctc_total: ctcFixed + ctcVariable,
        deadline: form.deadline || null,
        min_cgpa: parseFloat(form.minCgpa) || 0,
        skills_required: skills.length ? skills : null,
        eligible_branches: selectedDepts.length ? selectedDepts : null,
        selection_rounds: selectionRounds.length ? selectionRounds : null,
        bond_details: form.bondDetails || null,
        vacancies: parseInt(form.vacancies) || 1,
        status: 'approved' as any,
        created_by: user?.id,
      });
      if (error) throw error;

      toast({ title: 'Job created and published to Live Jobs' });
      qc.invalidateQueries({ queryKey: ['placement-jobs'] });
      qc.invalidateQueries({ queryKey: ['placement-stats'] });
      onOpenChange(false);
      // Reset
      setForm({ companyName: '', roleTitle: '', jobType: 'full_time', location: '', ctcFixed: '', ctcVariable: '', deadline: '', minCgpa: '0', description: '', bondDetails: '', skillInput: '', vacancies: '1' });
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
          <DialogTitle className="text-lg font-bold">Create New Job</DialogTitle>
          <DialogDescription>Jobs created by Placement Officer go directly to Live Jobs.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Company Name *</Label>
              <Input value={form.companyName} onChange={e => update('companyName', e.target.value)} className="rounded-lg mt-1" placeholder="e.g. Google" />
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
          <Button onClick={handleSubmit} disabled={loading} className="rounded-lg" style={{ background: TEAL }}>
            {loading ? 'Creating...' : 'Create & Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateJobDialog;
