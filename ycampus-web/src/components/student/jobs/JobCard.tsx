import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, Calendar, Clock, IndianRupee } from 'lucide-react';
import { StudentJob, StudentJobApplication } from '@/pages/student/Jobs';

interface JobCardProps {
  job: StudentJob;
  variant: 'active' | 'applied' | 'previous';
  application?: StudentJobApplication;
  deadlineApproaching?: boolean;
  onViewDetails: () => void;
  onApply?: () => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  variant,
  application,
  deadlineApproaching,
  onViewDetails,
  onApply,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50/50">Applied</Badge>;
      case 'shortlisted': return <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50/50">Shortlisted</Badge>;
      case 'interview': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50/50">Interview</Badge>;
      case 'selected': return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50/50">Selected</Badge>;
      case 'rejected': return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50/50">Rejected</Badge>;
      default: return null;
    }
  };

  const formatLPA = (amount: number) => {
    return `${(amount / 100000).toFixed(1)} LPA`;
  };

  return (
    <Card className={`p-6 border-muted/20 shadow-sm transition-all hover:shadow-md ${variant === 'previous' ? 'opacity-70 bg-muted/5' : ''}`}>
      <div className="flex flex-row justify-between items-start gap-2">
        {/* Left Content */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-medium text-gray-900">{job.role}</h3>
            <Badge variant="outline" className="bg-[#f0fdf4] text-[#15803d] border-[#dcfce7] font-medium text-[11px] py-0 px-2 h-5">
              {job.companyType}
            </Badge>
            {variant === 'applied' && application && getStatusBadge(application.status)}
            {variant === 'active' && deadlineApproaching && (
                <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-100 text-[10px] py-0 h-5">
                  <Clock className="h-3 w-3 mr-1" /> Deadline Soon
                </Badge>
              )}
          </div>
          
          <div className="flex items-center gap-2 text-gray-800">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">{job.companyName}</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-gray-600">
            <div className="flex items-center gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              {job.location}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <IndianRupee className="h-3 w-3" />
              {formatLPA(job.ctcTotal)}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              Deadline: {new Date(job.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-3">
            {job.eligibleBranches.map(branch => (
              <span key={branch} className="bg-[#f1f5f9] text-gray-900 text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase">
                {branch}
              </span>
            ))}
            {job.skills.length > 3 && (
              <span className="px-3 py-1 bg-white text-gray-500 rounded-full text-sm">
                +{job.skills.length - 3} more
              </span>
            )}
          </div>

        </div>

        {/* Right Actions */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          {variant === 'active' && onApply && (
            <Button 
              onClick={onApply} 
              className="bg-[#0f172a] hover:bg-[#1e293b] text-white font-medium px-6 h-10 rounded-lg min-w-[80px]"
            >
              Apply
            </Button>
          )}
          <button 
            onClick={onViewDetails}
            className="text-gray-600 font-medium hover:text-gray-900 hover:bg-gray-100 text-sm transition-colors pr-1"
          >
            View Details
          </button>
        </div>
      </div>
    </Card>
  );
};