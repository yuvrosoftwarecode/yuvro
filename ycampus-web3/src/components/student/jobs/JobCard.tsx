import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, IndianRupee, Calendar, Building2, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import type { StudentJob, StudentJobApplication } from '@/pages/student/Jobs';

interface JobCardProps {
  job: StudentJob;
  variant: 'active' | 'applied' | 'previous';
  deadlineApproaching?: boolean;
  application?: StudentJobApplication;
  onViewDetails: () => void;
  onApply?: () => void;
}

const typeColors: Record<string, string> = {
  Product: 'bg-blue-50 text-blue-700 border-blue-200',
  Service: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Startup: 'bg-amber-50 text-amber-700 border-amber-200',
};

export function JobCard({ job, variant, deadlineApproaching, application, onViewDetails, onApply }: JobCardProps) {
  const formatCTC = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} LPA`;
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer border-border/60"
      onClick={onViewDetails}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground text-base">{job.role}</h3>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeColors[job.companyType] || ''}`}>
                {job.companyType}
              </Badge>
              {deadlineApproaching && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse">
                  <Clock className="h-3 w-3 mr-0.5" /> Deadline Soon
                </Badge>
              )}
              {variant === 'previous' && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  Expired
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground/80">{job.companyName}</span>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {job.location}
              </span>
              <span className="flex items-center gap-1">
                <IndianRupee className="h-3 w-3" /> {formatCTC(job.ctcTotal)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {variant === 'applied' && application
                  ? `Applied ${format(new Date(application.appliedDate), 'dd MMM yyyy')}`
                  : `Deadline: ${format(new Date(job.deadline), 'dd MMM yyyy')}`
                }
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {job.eligibleBranches.slice(0, 4).map(b => (
                <Badge key={b} variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted/80">
                  {b}
                </Badge>
              ))}
              {job.eligibleBranches.length > 4 && (
                <span className="text-[10px] text-muted-foreground">+{job.eligibleBranches.length - 4} more</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {variant === 'active' && onApply && (
              <Button
                size="sm"
                className="text-xs"
                onClick={(e) => { e.stopPropagation(); onApply(); }}
              >
                Apply
              </Button>
            )}
            {variant === 'applied' && application && (
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-0.5" />
                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            >
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
