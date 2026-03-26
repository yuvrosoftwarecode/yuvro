import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Users, Globe, Mail, User, Briefcase } from 'lucide-react';
import { CompanyRecord, statusColors, statusLabels } from './types';

interface CompanyDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  company: CompanyRecord | undefined;
}

const CompanyDetailsDialog = ({ open, onClose, company }: CompanyDetailsDialogProps) => {
  if (!company) return null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">{company.companyName}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">{company.companyType}</Badge>
                <Badge className={`text-[10px] px-2 py-0.5 border-0 ${statusColors[company.status]}`}>
                  {statusLabels[company.status]}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Company Info */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Company Information</h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /> {company.location}</p>
              <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5 shrink-0" /> {company.headcount} employees</p>
              {company.website && (
                <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <Globe className="h-3.5 w-3.5 shrink-0" /> {company.website}
                </a>
              )}
            </div>
          </div>

          {/* About */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">About Company</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{company.about}</p>
          </div>

          {/* Hiring Focus */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Hiring Focus</h4>
            <p className="text-xs text-muted-foreground">{company.hiringFocus}</p>
          </div>

          {/* Roles */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Roles Offered</h4>
            <div className="flex flex-wrap gap-1.5">
              {company.rolesOffered.map(role => (
                <Badge key={role} variant="secondary" className="text-[10px] px-2 py-0.5 font-normal">
                  <Briefcase className="h-2.5 w-2.5 mr-1" />{role}
                </Badge>
              ))}
            </div>
          </div>

          {/* Recruiter */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">Recruiter Details</h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 shrink-0" /> {company.recruiterName}</p>
              <p className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 shrink-0" /> {company.recruiterDesignation}</p>
              <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /> {company.recruiterEmail}</p>
            </div>
          </div>

          {/* Connection Note */}
          {company.connectionNote && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">Connection Note</h4>
              <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">{company.connectionNote}</p>
              {company.connectionAttachment && (
                <p className="text-[11px] text-primary mt-1.5">📎 {company.connectionAttachment}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyDetailsDialog;
