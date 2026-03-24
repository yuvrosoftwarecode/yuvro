import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  User, 
  Globe, 
  Mail, 
  Send,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { initialCompanies } from '@/components/placement/recruiter/dummyData';
import { CompanyRecord, ChatMessage } from '@/components/placement/recruiter/types';

const RecruiterDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  const company = initialCompanies.find(c => c.id === id);
  const isChatAutoFocused = new URLSearchParams(location.search).get('chat') === 'true';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      senderId: 'tpo',
      text: "Hi Priya, we would like to invite TCS for campus placement this year.",
      timestamp: '2024-03-18 10:00',
      isMe: true
    },
    {
      id: '2',
      senderId: 'recruiter',
      text: "Sure! We are interested. Please share the student data.",
      timestamp: '2024-03-18 10:30',
      isMe: false
    }
  ]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (isChatAutoFocused && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [isChatAutoFocused]);

  if (!company) {
    return (
      <PlacementLayout title="Company Not Found">
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
          <Building2 className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-xl font-bold">Company not found</p>
          <Button variant="link" onClick={() => navigate('/placement/recruiters')}>
            Back to Connections
          </Button>
        </div>
      </PlacementLayout>
    );
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'tpo',
      text: newMessage,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      isMe: true
    };
    
    setMessages([...messages, msg]);
    setNewMessage('');
  };

  return (
    <PlacementLayout>
      <div className="space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/placement/recruiters')}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900">{company.companyName}</h2>
                  <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    company.status === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {company.status === 'connected' ? 'Connected' : 'Applied'}
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-500">{company.companyType}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Info Card */}
            <Card className="border-slate-100 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Company Information</h3>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Location</p>
                      <p className="text-sm font-bold text-slate-700">{company.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Employees</p>
                      <p className="text-sm font-bold text-slate-700">{company.employees}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Type</p>
                      <p className="text-sm font-bold text-slate-700">{company.companyType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Website</p>
                      <button 
                        className="text-sm font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        onClick={() => window.open(company.website, '_blank')}
                      >
                        Visit Website <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About Card */}
            <Card className="border-slate-100 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">About Company</h3>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {company.companyName === 'TCS' 
                      ? "Tata Consultancy Services is an Indian multinational IT services and consulting company. Part of the Tata Group, TCS operates in 150+ locations across 46 countries."
                      : `Leading ${company.companyType} company specializing in innovative solutions and digital transformation across multiple industries.`}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900">Hiring Focus</h4>
                  <p className="text-sm text-slate-600">
                    Full-stack development, Cloud computing, Data Science
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900">Roles Offered</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Software Engineer', 'Data Analyst', 'Cloud Architect', 'Business Analyst'].map(role => (
                      <Badge key={role} variant="secondary" className="bg-slate-100 text-slate-600 border-none px-3 py-1 font-medium">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recruiter Details Card */}
            <Card className="border-slate-100 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recruiter Details</h3>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-700">{company.recruiterName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">{company.recruiterRole}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">{company.recruiterEmail}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Chat */}
          <div className="lg:col-span-1 border-l border-slate-100 bg-white min-h-[500px] flex flex-col rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900">Chat</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Active</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm ${
                    msg.isMe 
                      ? 'bg-slate-900 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-medium px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
              <div className="flex gap-2 relative">
                <Input 
                  ref={chatInputRef}
                  placeholder="Type a message..."
                  className="rounded-xl border-slate-200 pr-12 focus:ring-purple-500/20 focus:border-purple-500 h-11"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button 
                  size="icon"
                  className="absolute right-1 top-1 h-9 w-9 rounded-lg bg-slate-900 hover:bg-slate-800 transition-all"
                  onClick={handleSendMessage}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PlacementLayout>
  );
};

export default RecruiterDetail;
