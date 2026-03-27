import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Building2, MapPin, Users, Globe, Mail, User, Briefcase, Send, MessageCircle, UserPlus, Clock } from 'lucide-react';
import { CompanyRecord, ChatMessage, statusColors, statusLabels } from '@/components/placement/recruiter/types';
import { initialCompanies } from '@/components/placement/recruiter/dummyData';
import ConnectDialog from '@/components/placement/recruiter/ConnectDialog';

const RecruiterCompanyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusChat = searchParams.get('chat') === 'true';

  const [companies, setCompanies] = useState<CompanyRecord[]>(initialCompanies);
  const [chatInput, setChatInput] = useState('');
  const [connectOpen, setConnectOpen] = useState(false);

  const company = companies.find(c => c.id === id);

  const handleSendMessage = () => {
    if (!chatInput.trim() || !company) return;
    const msg: ChatMessage = { id: Date.now().toString(), sender: 'placement_officer', text: chatInput.trim(), timestamp: new Date().toLocaleString() };
    setCompanies(prev => prev.map(c =>
      c.id === company.id ? { ...c, chatMessages: [...c.chatMessages, msg] } : c
    ));
    setChatInput('');
  };

  const handleConnect = (note: string, attachment?: string) => {
    if (!company) return;
    setCompanies(prev => prev.map(c =>
      c.id === company.id ? { ...c, status: 'applied' as const, connectionNote: note, connectionAttachment: attachment } : c
    ));
  };

  const chatRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusChat && chatRef.current) {
      chatRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [focusChat]);

  if (!company) {
    return (
      <PlacementLayout title="Company Not Found">
        <div className="text-center py-20">
          <p className="text-muted-foreground">Company not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/placement/recruiters')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Connections
          </Button>
        </div>
      </PlacementLayout>
    );
  }

  const statusColor = company.status === 'connected' ? 'text-emerald-600' : company.status === 'applied' ? 'text-amber-600' : 'text-muted-foreground';

  return (
    <PlacementLayout title="">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/placement/recruiters')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{company.companyName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">{company.companyType}</Badge>
              <Badge className={`text-[10px] px-2 py-0.5 border-0 ${statusColors[company.status]}`}>
                {statusLabels[company.status]}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* LEFT: Company Details ~65% */}
        <div className="lg:col-span-3 space-y-4">
          {/* Company Info */}
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Company Information</h3>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" /> {company.location}</p>
                <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5 shrink-0 text-primary/60" /> {company.headcount} employees</p>
                <p className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 shrink-0 text-primary/60" /> {company.companyType}</p>
                {company.website && (
                  <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                    <Globe className="h-3.5 w-3.5 shrink-0" /> Website
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">About Company</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{company.about}</p>
              <div>
                <h4 className="text-xs font-medium text-foreground mb-1.5">Hiring Focus</h4>
                <p className="text-xs text-muted-foreground">{company.hiringFocus}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-foreground mb-1.5">Roles Offered</h4>
                <div className="flex flex-wrap gap-1.5">
                  {company.rolesOffered.map(role => (
                    <Badge key={role} variant="secondary" className="text-[10px] px-2 py-0.5 font-normal">
                      <Briefcase className="h-2.5 w-2.5 mr-1" />{role}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recruiter Details */}
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Recruiter Details</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 shrink-0 text-primary/60" /> {company.recruiterName}</p>
                <p className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 shrink-0 text-primary/60" /> {company.recruiterDesignation}</p>
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0 text-primary/60" /> {company.recruiterEmail}</p>
              </div>
            </CardContent>
          </Card>

          {/* Connection Note */}
          {company.connectionNote && (
            <Card className="border-border/60">
              <CardContent className="p-5 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Connection Note</h3>
                <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">{company.connectionNote}</p>
                {company.connectionAttachment && (
                  <p className="text-[11px] text-primary">📎 {company.connectionAttachment}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: Chat Panel ~35% */}
        <div className="lg:col-span-2" ref={chatRef}>
          <Card className="border-border/60 sticky top-4">
            <div className="p-4 border-b flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Chat</h3>
              <span className={`text-[10px] ml-auto ${statusColor} font-medium`}>
                {company.status === 'connected' ? '● Active' : company.status === 'applied' ? '● Pending' : '● Inactive'}
              </span>
            </div>

            {company.status === 'connected' ? (
              <>
                <ScrollArea className="h-[360px] p-4">
                  {company.chatMessages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-xs py-10">No messages yet. Start the conversation!</p>
                  ) : (
                    <div className="space-y-3">
                      {company.chatMessages.map(msg => (
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
                  )}
                </ScrollArea>
                <div className="p-3 border-t flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    className="h-9 text-xs"
                  />
                  <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSendMessage} disabled={!chatInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : company.status === 'applied' ? (
              <div className="p-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-xs text-muted-foreground">Waiting for recruiter to accept connection</p>
                <p className="text-[10px] text-muted-foreground/70">Chat will be enabled once the recruiter accepts your request.</p>
              </div>
            ) : (
              <div className="p-8 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <UserPlus className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Connect with recruiter to start conversation</p>
                <Button size="sm" className="h-8 text-xs gap-1 mt-2" onClick={() => setConnectOpen(true)}>
                  <UserPlus className="h-3 w-3" /> Connect
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Connect Dialog */}
      <ConnectDialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        companyName={company.companyName}
        recruiterName={company.recruiterName}
        onSend={(note, attachment) => handleConnect(note, attachment)}
      />
    </PlacementLayout>
  );
};

export default RecruiterCompanyDetail;
