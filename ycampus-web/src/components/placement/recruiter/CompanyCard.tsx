import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building2, 
  MapPin, 
  User, 
  Mail, 
  MessageSquare, 
  Globe, 
  Plus,
  Clock,
  ExternalLink,
  MoreVertical
} from 'lucide-react';
import { CompanyRecord } from './types';
import { Button } from '@/components/ui/button';

interface CompanyCardProps {
  company: CompanyRecord;
  onConnect: (id: string) => void;
  onChat: (id: string) => void;
  onCardClick: (id: string) => void;
  onSimulateAccept: (id: string) => void;
}

const CompanyCard: React.FC<CompanyCardProps> = ({ 
  company, 
  onConnect, 
  onChat, 
  onCardClick,
  onSimulateAccept
}) => {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]';
      case 'applied': return 'bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7]';
      default: return 'bg-[#F9FAFB] text-[#6B7280] border-[#F3F4F6]';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'applied': return 'Applied';
      default: return 'Not Connected';
    }
  };

  return (
    <Card 
      className="group hover:shadow-md transition-all border-slate-100 overflow-hidden cursor-pointer"
      onClick={() => onCardClick(company.id)}
    >
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold shrink-0 group-hover:scale-105 transition-transform">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">{company.companyName}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>{company.companyType}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{company.headcount}</span>
                </div>
              </div>
            </div>
          </div>
          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(company.status)}`}>
            {getStatusLabel(company.status)}
          </span>
        </div>

        <div className="space-y-2.5 pt-2">
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="text-sm font-medium">{company.location}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <User className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="text-sm leading-tight">
              <span className="font-bold">{company.recruiterName}</span>
              <span className="text-slate-400 font-medium ml-1">— {company.recruiterDesignation}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400 truncate">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">{company.recruiterEmail}</span>
          </div>
        </div>

        <div className="pt-4 flex items-center gap-3" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          {company.status === 'connected' ? (
            <Button 
              size="sm"
              className="flex-1 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold gap-2 h-10 border-none shadow-none"
              onClick={() => onChat(company.id)}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </Button>
          ) : company.status === 'applied' ? (
            <div className="flex-1 flex items-center gap-2 text-slate-400 text-[11px] font-medium py-2.5">
              <Clock className="h-4 w-4" />
              Waiting for recruiter to accept
            </div>
          ) : (
            <Button 
              size="sm"
              className="flex-1 rounded-xl bg-slate-900 hover:bg-black text-white font-bold gap-2 h-10 border-none shadow-none"
              onClick={() => onConnect(company.id)}
            >
              <Plus className="h-4 w-4" />
              Connect
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-xl h-10 flex items-center gap-2 px-3 text-slate-600 hover:bg-slate-50 transition-all font-bold text-xs"
            onClick={() => company.website && window.open(company.website, '_blank')}
          >
            <Globe className="h-4 w-4" />
            <span>Website</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyCard;
