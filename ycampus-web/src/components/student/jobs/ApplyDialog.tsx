import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import type { StudentJob } from '@/pages/student/Jobs';

interface ApplyDialogProps {
  job: StudentJob | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { cgpa: number; previousOffers: boolean; highestCtc?: number }) => void;
}

export function ApplyDialog({ job, open, onClose, onSubmit }: ApplyDialogProps) {
  const [cgpa, setCgpa] = useState('');
  const [previousOffers, setPreviousOffers] = useState('no');
  const [highestCtc, setHighestCtc] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    const cgpaNum = parseFloat(cgpa);
    if (!cgpa || isNaN(cgpaNum)) errs.cgpa = 'CGPA is required';
    else if (cgpaNum < 0 || cgpaNum > 10) errs.cgpa = 'CGPA must be between 0 and 10';
    else if (job && cgpaNum < job.minCgpa) errs.cgpa = `Minimum CGPA required is ${job.minCgpa}`;
    if (previousOffers === 'yes' && (!highestCtc || isNaN(parseFloat(highestCtc)))) {
      errs.highestCtc = 'Highest CTC is required when you have previous offers';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      cgpa: parseFloat(cgpa),
      previousOffers: previousOffers === 'yes',
      highestCtc: previousOffers === 'yes' ? parseFloat(highestCtc) : undefined,
    });
    setCgpa('');
    setPreviousOffers('no');
    setHighestCtc('');
    setErrors({});
  };

  const handleClose = () => {
    setCgpa('');
    setPreviousOffers('no');
    setHighestCtc('');
    setErrors({});
    onClose();
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply to {job.companyName}</DialogTitle>
          <DialogDescription>{job.role} · {job.location}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cgpa">B.Tech CGPA <span className="text-destructive">*</span></Label>
            <Input
              id="cgpa"
              type="number"
              step="0.01"
              min="0"
              max="10"
              placeholder="e.g. 7.85"
              value={cgpa}
              onChange={e => setCgpa(e.target.value)}
            />
            {errors.cgpa && <p className="text-xs text-destructive">{errors.cgpa}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Previous Offers <span className="text-destructive">*</span></Label>
            <RadioGroup value={previousOffers} onValueChange={setPreviousOffers} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes" className="font-normal cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no" className="font-normal cursor-pointer">No</Label>
              </div>
            </RadioGroup>
          </div>

          {previousOffers === 'yes' && (
            <div className="space-y-1.5">
              <Label htmlFor="ctc">Highest CTC (₹) <span className="text-destructive">*</span></Label>
              <Input
                id="ctc"
                type="number"
                placeholder="e.g. 400000"
                value={highestCtc}
                onChange={e => setHighestCtc(e.target.value)}
              />
              {errors.highestCtc && <p className="text-xs text-destructive">{errors.highestCtc}</p>}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit Application</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
