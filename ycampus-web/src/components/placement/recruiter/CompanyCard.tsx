import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Users, Mail, UserPlus, MessageCircle, Globe, Clock } from 'lucide-react';
import { CompanyRecord, statusColors, statusLabels } from './types';

interface CompanyCardProps {
  company: CompanyRecord;
  onConnect: (id: string) => void;
  onChat: (id: string) => void;
  onCardClick: (id: string) => void;
  onSimulateAccept: (id: string) => void;
}

const CompanyCard = ({ company, onConnect, onChat, onCardClick, onSimulateAccept }: CompanyCardProps) => (
  <Card className="border border-border/60 hover:shadow-md transition-shadow">
    <CardContent className="p-5">
      <div
        className="cursor-pointer"
        onClick={() => onCardClick(company.id)}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">{company.companyName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">{company.companyType}</Badge>
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><Users className="h-3 w-3" />{company.headcount}</span>
              </div>
            </div>
          </div>
          <Badge className={`text-[10px] px-2 py-0.5 border-0 ${statusColors[company.status]}`}>
            {statusLabels[company.status]}
          </Badge>
        </div>

        <div className="space-y-1.5 mb-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{company.location}</p>
          <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{company.recruiterName} — {company.recruiterDesignation}</p>
          <p className="flex items-center gap-1.5 text-[11px]">{company.recruiterEmail}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {company.status === 'not_connected' && (
          <Button size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); onConnect(company.id); }}>
            <UserPlus className="h-3 w-3" /> Connect
          </Button>
        )}

        {company.status === 'applied' && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Waiting for recruiter to accept
          </span>
        )}

        {company.status === 'connected' && (
          <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={(e) => { e.stopPropagation(); onChat(company.id); }}>
            <MessageCircle className="h-3 w-3" /> Chat
          </Button>
        )}

        {company.website && (
          <a href={company.website} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
              <Globe className="h-3 w-3" /> Website
            </Button>
          </a>
        )}
      </div>
    </CardContent>
  </Card>
);

export default CompanyCard;
