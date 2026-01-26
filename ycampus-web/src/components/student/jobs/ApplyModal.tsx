import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Job } from '@/pages/student/Jobs';
import { FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  job: Job;
}

const ApplyModal = ({ isOpen, onClose, onConfirm, job }: ApplyModalProps) => {
  const [coverLetter, setCoverLetter] = useState('');
  const [portfolio, setPortfolio] = useState('');

  const generateAICoverLetter = () => {
    const aiGenerated = `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. With my skills in ${job.skills.slice(0, 3).join(', ')}, I am confident that I would be a valuable addition to your team.

I am particularly excited about this opportunity because of your company's work in ${job.companyInfo.domain}. My experience aligns well with your requirements, and I am eager to contribute to your team's success.

Thank you for considering my application. I look forward to discussing how I can contribute to ${job.company}.

Best regards`;
    
    setCoverLetter(aiGenerated);
    toast.success('AI-generated cover letter created!');
  };

  const handleConfirm = () => {
    onConfirm();
    toast.success('Application submitted successfully!');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for {job.title}</DialogTitle>
          <DialogDescription>
            Complete the form below to submit your application for the position at {job.company}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Resume</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 border border-border rounded-md flex items-center gap-2 bg-secondary/30">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">My_Resume.pdf</span>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Cover Letter</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateAICoverLetter}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate with AI
              </Button>
            </div>
            <Textarea
              placeholder="Write your cover letter or use AI to generate one..."
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio">GitHub / Portfolio Link (Optional)</Label>
            <Input
              id="portfolio"
              placeholder="https://github.com/yourusername"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
            />
          </div>

          <div className="p-3 bg-secondary/30 rounded-md space-y-1">
            <p className="text-sm font-medium">Application Summary</p>
            <p className="text-xs text-muted-foreground">
              Applying for: {job.title} at {job.company}
            </p>
            <p className="text-xs text-muted-foreground">
              Match Score: {job.matchPercentage}%
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm & Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyModal;
