import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Info, Paperclip, Send } from 'lucide-react';

interface ConnectDialogProps {
  open: boolean;
  onClose: () => void;
  companyName: string;
  recruiterName: string;
  onSend: (note: string, attachment?: string) => void;
}

const ConnectDialog: React.FC<ConnectDialogProps> = ({
  open,
  onClose,
  companyName,
  recruiterName,
  onSend,
}) => {
  const [note, setNote] = useState('');
  const [attachment, setAttachment] = useState<string | undefined>(undefined);

  const handleSend = () => {
    onSend(note, attachment);
    onClose();
    setNote('');
    setAttachment(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-3xl overflow-hidden p-0">
        <div className="bg-slate-900 p-8 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              Request Connection
            </DialogTitle>
            <p className="text-slate-400 text-sm mt-2">
              Send a personalized message to <span className="text-white font-bold">{recruiterName}</span> from <span className="text-white font-bold">{companyName}</span> to initiate a placement drive.
            </p>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <Label htmlFor="note" className="text-sm font-bold text-slate-700 flex items-center gap-2">
              Personalized Note
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">(Recommended)</span>
            </Label>
            <Textarea
              id="note"
              placeholder="Hi Priya, I'm the TPO from Yuvro Campus. We have some excellent candidates for the upcoming hiring cycle..."
              className="min-h-[150px] resize-none border-slate-200 rounded-2xl focus:ring-purple-500/20 focus:border-purple-500 text-sm p-4"
              value={note}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 px-1">
              <Info className="h-3 w-3" />
              Mention your college name and the specific roles you're interested in.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-700">Attach College Brochure</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                type="button"
                className="w-full justify-start gap-3 rounded-2xl border-dashed border-2 border-slate-200 text-slate-500 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all h-12"
                onClick={() => setAttachment('College_Brochure_2024.pdf')}
              >
                <Paperclip className="h-4 w-4" />
                {attachment || 'Click to upload PDF...'}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-white border-t border-slate-100 flex sm:justify-between items-center gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-xl text-slate-500 font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 px-6 h-11 shadow-lg shadow-purple-100"
            disabled={!note.trim()}
          >
            <Send className="h-4 w-4" />
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectDialog;
