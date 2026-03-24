import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { StudentJob } from './JobCard';

interface ApplyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  job: StudentJob | null;
  onSubmit: (data: { cgpa: string; hasPreviousOffer: string }) => void;
}

export const ApplyDialog: React.FC<ApplyDialogProps> = ({
  isOpen,
  onClose,
  job,
  onSubmit,
}) => {
  const [cgpa, setCgpa] = useState('');
  const [hasPreviousOffer, setHasPreviousOffer] = useState('no');

  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-bold text-gray-900">Apply for Job</DialogTitle>
          <div className="text-sm text-gray-500">
            {job.role} at <span className="text-blue-600 font-medium">{job.companyName}</span> • {job.location}
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="cgpa" className="text-sm font-semibold text-gray-700">
              B.Tech CGPA <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cgpa"
              placeholder="Ex: 8.5"
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
              className="h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">
              Do you have any previous offer? <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={hasPreviousOffer}
              onValueChange={setHasPreviousOffer}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="yes" className="border-gray-300 text-blue-600" />
                <Label htmlFor="yes" className="text-sm font-medium text-gray-600 cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="no" className="border-gray-300 text-blue-600" />
                <Label htmlFor="no" className="text-sm font-medium text-gray-600 cursor-pointer">No</Label>
              </div>
            </RadioGroup>
          </div>

          <Button
            onClick={() => onSubmit({ cgpa, hasPreviousOffer })}
            disabled={!cgpa}
            className="w-full h-11 bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold rounded-lg mt-2 transition-all"
          >
            Submit Application
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyDialog;
