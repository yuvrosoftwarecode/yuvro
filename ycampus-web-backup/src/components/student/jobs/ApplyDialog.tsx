import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { StudentJob } from '@/pages/student/Jobs';

interface ApplyDialogProps {
  job: StudentJob | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { cgpa: number; previousOffers: boolean; highestCtc?: number }) => void;
}

export const ApplyDialog: React.FC<ApplyDialogProps> = ({
  job,
  open,
  onClose,
  onSubmit,
}) => {
  const [cgpa, setCgpa] = useState('');
  const [previousOffers, setPreviousOffers] = useState('no');
  const [highestCtc, setHighestCtc] = useState('');

  if (!job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      cgpa: parseFloat(cgpa),
      previousOffers: previousOffers === 'yes',
      highestCtc: previousOffers === 'yes' ? parseFloat(highestCtc) : undefined,
    });
    // Reset state
    setCgpa('');
    setPreviousOffers('no');
    setHighestCtc('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-8 rounded-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-2xl font-bold text-[#0f172a]">
              Apply to {job.companyName}
            </DialogTitle>
            <p className="text-sm font-medium text-gray-500">
              {job.role} - {job.location}
            </p>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <Label htmlFor="cgpa" className="text-sm font-bold text-[#0f172a]">
                B.Tech CGPA <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cgpa"
                type="number"
                step="0.01"
                placeholder="e.g. 7.85"
                required
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                className="h-12 border-gray-300 rounded-xl focus-visible:ring-[#0f172a]"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-[#0f172a]">
                Previous Offers <span className="text-red-500">*</span>
              </Label>
              <RadioGroup 
                value={previousOffers} 
                onValueChange={setPreviousOffers}
                className="flex items-center gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="yes" className="border-gray-400 text-[#0f172a]" />
                  <Label htmlFor="yes" className="text-sm font-medium text-gray-700 cursor-pointer">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="no" className="border-gray-400 text-[#0f172a]" />
                  <Label htmlFor="no" className="text-sm font-medium text-gray-700 cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>

            {previousOffers === 'yes' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label htmlFor="highestCtc" className="text-sm font-bold text-[#0f172a]">
                  Highest CTC offered (LPA) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="highestCtc"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 12"
                  required={previousOffers === 'yes'}
                  value={highestCtc}
                  onChange={(e) => setHighestCtc(e.target.value)}
                  className="h-12 border-gray-300 rounded-xl focus-visible:ring-[#0f172a]"
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row justify-center gap-3 sm:justify-center p-0 pt-2">
            <Button 
              variant="outline" 
              type="button" 
              onClick={onClose}
              className="h-12 px-8 border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={parseFloat(cgpa) < job.minCgpa}
              className="h-12 px-8 bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold rounded-lg flex-1 sm:flex-auto"
            >
              Submit Application
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
