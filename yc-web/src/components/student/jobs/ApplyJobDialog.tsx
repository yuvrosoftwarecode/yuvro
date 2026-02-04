import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Job } from '@/services/jobService';
import { JobApplicationData } from '@/services/jobApplicationService';

interface ApplyJobDialogProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onSubmit: (data: JobApplicationData) => Promise<void>;
}

const ApplyJobDialog: React.FC<ApplyJobDialogProps> = ({ isOpen, onClose, job, onSubmit }) => {
  const [applicationData, setApplicationData] = useState<Omit<JobApplicationData, 'job_id'>>({
    cover_letter: '',
    portfolio_url: '',
    expected_salary: undefined,
    expected_currency: 'INR',
    available_from: '',
    notice_period_days: undefined
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!job) return;

    setIsSubmitting(true);
    try {
      const submitData: JobApplicationData = {
        job_id: job.id,
        cover_letter: applicationData.cover_letter,
        portfolio_url: applicationData.portfolio_url,
        expected_salary: applicationData.expected_salary,
        expected_currency: applicationData.expected_currency,
        available_from: applicationData.available_from || undefined,
        notice_period_days: applicationData.notice_period_days
      };

      await onSubmit(submitData);

      setApplicationData({
        cover_letter: '',
        portfolio_url: '',
        expected_salary: undefined,
        expected_currency: 'INR',
        available_from: '',
        notice_period_days: undefined
      });

      onClose();
    } catch (error) {
      console.error('Error submitting application:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-white border-0 shadow-xl rounded-2xl overflow-hidden p-0">
        <DialogHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
          <DialogTitle className="text-xl font-bold text-gray-900 leading-none">
            Apply to {job?.title}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1.5">Please provide your details to apply for this position.</p>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="cover_letter" className="text-sm font-semibold text-gray-700">Cover Letter</Label>
            <Textarea
              id="cover_letter"
              placeholder="Tell us why you're interested in this position..."
              value={applicationData.cover_letter}
              onChange={(e) => setApplicationData(prev => ({ ...prev, cover_letter: e.target.value }))}
              className="resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500/10 min-h-[120px] rounded-xl"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio_url" className="text-sm font-semibold text-gray-700">Portfolio URL (Optional)</Label>
            <Input
              id="portfolio_url"
              type="url"
              placeholder="https://your-portfolio.com"
              value={applicationData.portfolio_url}
              onChange={(e) => setApplicationData(prev => ({ ...prev, portfolio_url: e.target.value }))}
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/10 h-11 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="expected_salary" className="text-sm font-semibold text-gray-700">Expected Salary (Optional)</Label>
              <Input
                id="expected_salary"
                type="number"
                placeholder="50000"
                value={applicationData.expected_salary || ''}
                onChange={(e) => setApplicationData(prev => ({
                  ...prev,
                  expected_salary: e.target.value ? parseFloat(e.target.value) : undefined
                }))}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/10 h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_currency" className="text-sm font-semibold text-gray-700">Currency</Label>
              <div className="relative">
                <select
                  id="expected_currency"
                  value={applicationData.expected_currency}
                  onChange={(e) => setApplicationData(prev => ({ ...prev, expected_currency: e.target.value }))}
                  className="w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-sm transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="available_from" className="text-sm font-semibold text-gray-700">Available From (Optional)</Label>
              <Input
                id="available_from"
                type="date"
                value={applicationData.available_from}
                onChange={(e) => setApplicationData(prev => ({ ...prev, available_from: e.target.value }))}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/10 h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notice_period_days" className="text-sm font-semibold text-gray-700">Notice Period (Days)</Label>
              <Input
                id="notice_period_days"
                type="number"
                placeholder="30"
                value={applicationData.notice_period_days || ''}
                onChange={(e) => setApplicationData(prev => ({
                  ...prev,
                  notice_period_days: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/10 h-11 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="border-gray-200 hover:bg-gray-100 rounded-xl px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 shadow-md shadow-blue-500/20 transition-all font-semibold"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyJobDialog;