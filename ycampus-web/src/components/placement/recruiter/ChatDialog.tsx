import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, Send } from 'lucide-react';
import { CompanyRecord, ChatMessage } from './types';

interface ChatDialogProps {
  open: boolean;
  onClose: () => void;
  company: CompanyRecord | undefined;
  onSendMessage: (companyId: string, text: string) => void;
}

const ChatDialog = ({ open, onClose, company, onSendMessage }: ChatDialogProps) => {
  const [chatInput, setChatInput] = useState('');

  const handleSend = () => {
    if (!chatInput.trim() || !company) return;
    onSendMessage(company.id, chatInput.trim());
    setChatInput('');
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b">
          <DialogTitle className="text-sm flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{company?.companyName}</p>
              <p className="text-[11px] text-muted-foreground font-normal">{company?.recruiterName}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[320px] p-4">
          {company?.chatMessages.length === 0 && (
            <p className="text-center  text-xs py-10">No messages yet. Start the conversation!</p>
          )}
          <div className="space-y-3">
            {company?.chatMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'placement_officer' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                  msg.sender === 'placement_officer'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}>
                  <p>{msg.text}</p>
                  <p className={`text-[9px] mt-1 ${msg.sender === 'placement_officer' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{msg.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t flex gap-2">
          <Input
            placeholder="Type a message..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="h-9 text-xs"
          />
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={!chatInput.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatDialog;
