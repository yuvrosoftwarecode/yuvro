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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply to {job?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="cover_letter">Cover Letter</Label>
            <Textarea
              id="cover_letter"
              placeholder="Tell us why you're interested in this position..."
              value={applicationData.cover_letter}
              onChange={(e) => setApplicationData(prev => ({ ...prev, cover_letter: e.target.value }))}
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="portfolio_url">Portfolio URL (Optional)</Label>
            <Input
              id="portfolio_url"
              type="url"
              placeholder="https://your-portfolio.com"
              value={applicationData.portfolio_url}
              onChange={(e) => setApplicationData(prev => ({ ...prev, portfolio_url: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expected_salary">Expected Salary (Optional)</Label>
              <Input
                id="expected_salary"
                type="number"
                placeholder="50000"
                value={applicationData.expected_salary || ''}
                onChange={(e) => setApplicationData(prev => ({
                  ...prev,
                  expected_salary: e.target.value ? parseFloat(e.target.value) : undefined
                }))}
              />
            </div>
            <div>
              <Label htmlFor="expected_currency">Currency</Label>
              <select
                id="expected_currency"
                value={applicationData.expected_currency}
                onChange={(e) => setApplicationData(prev => ({ ...prev, expected_currency: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="available_from">Available From (Optional)</Label>
              <Input
                id="available_from"
                type="date"
                value={applicationData.available_from}
                onChange={(e) => setApplicationData(prev => ({ ...prev, available_from: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="notice_period_days">Notice Period (Days)</Label>
              <Input
                id="notice_period_days"
                type="number"
                placeholder="30"
                value={applicationData.notice_period_days || ''}
                onChange={(e) => setApplicationData(prev => ({
                  ...prev,
                  notice_period_days: e.target.value ? parseInt(e.target.value) : undefined
                }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyJobDialog;