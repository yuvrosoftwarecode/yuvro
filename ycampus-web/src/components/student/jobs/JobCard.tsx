import React from 'react';
import { MapPin, Building2, IndianRupee, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface StudentJob {
  id: string;
  companyName: string;
  companyType: 'Product' | 'Service' | 'Startup';
  role: string;
  location: string;
  ctcTotal: number;
  deadline: string;
  skills: string[];
}

interface JobCardProps {
  job: StudentJob;
  onViewDetails: (job: StudentJob) => void;
  onApply: (job: StudentJob) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onViewDetails, onApply }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow mb-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-900">{job.role}</h3>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-medium">
              {job.companyType}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-gray-600 font-medium">
            <Building2 className="h-4 w-4" />
            <span>{job.companyName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <IndianRupee className="h-4 w-4" />
              <span>₹ {job.ctcTotal} LPA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>Deadline: {job.deadline}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-full border border-gray-100"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end justify-between py-1">
          <Button 
            onClick={() => onApply(job)}
            className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-8 h-10 rounded-lg font-semibold"
          >
            Apply
          </Button>
          <button 
            onClick={() => onViewDetails(job)}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;