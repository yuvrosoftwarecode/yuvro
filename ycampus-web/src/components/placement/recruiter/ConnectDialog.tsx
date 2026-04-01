import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Send, Paperclip } from 'lucide-react';

interface ConnectDialogProps {
  open: boolean;
  onClose: () => void;
  companyName: string;
  recruiterName: string;
  onSend: (note: string, attachment?: string) => void;
}

const ConnectDialog = ({ open, onClose, companyName, recruiterName, onSend }: ConnectDialogProps) => {
  const [note, setNote] = useState('');
  const [fileName, setFileName] = useState('');

  const handleSend = () => {
    onSend(note, fileName || undefined);
    setNote('');
    setFileName('');
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Connect with {recruiterName}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">Send a connection request to {companyName}</p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Message / Note</label>
            <Textarea
              placeholder="Write a message to recruiter…"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="text-sm min-h-[100px]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Attachment (PDF / DOC)</label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <div className="flex items-center gap-1.5 px-3 py-2 border rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors">
                  <Paperclip className="h-3.5 w-3.5" />
                  {fileName || 'Choose file'}
                </div>
                <Input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileChange} />
              </label>
              {fileName && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{fileName}</span>}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="gap-1" onClick={handleSend}>
              <Send className="h-3.5 w-3.5" /> Send Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectDialog;
