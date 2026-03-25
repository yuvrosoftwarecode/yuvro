import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, MapPin, Building2, Calendar, Target, ListCheck, Award, Clock, IndianRupee, Users, GraduationCap, ArrowRight } from 'lucide-react';
import { StudentJob, StudentJobApplication } from '@/pages/student/Jobs';

interface JobDetailViewProps {
  job: StudentJob;
  isApplied: boolean;
  application?: StudentJobApplication;
  onBack: () => void;
  onApply: () => void;
}

export const JobDetailView: React.FC<JobDetailViewProps> = ({
  job,
  isApplied,
  application,
  onBack,
  onApply,
}) => {
  const formatLPA = (amount: number) => {
    return `${(amount / 100000).toFixed(1)} LPA`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <button 
        onClick={onBack} 
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-[#1e293b] bg-[#f8fafc] border border-muted/20 rounded-lg hover:bg-[#f1f5f9] transition-colors mb-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Jobs
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-muted/20 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-4 flex-1">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-[#0f172a]">{job.role}</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-gray-600 font-medium">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span>{job.companyName}</span>
                </div>
                <Badge variant="outline" className="bg-[#f1f5f9] text-gray-900 border-none font-semibold text-[10px] py-0 px-2 h-5">
                  {job.companyType}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-1 text-gray-600">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                {job.location}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <IndianRupee className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-700">{formatLPA(job.ctcTotal)}</span>
                <span className="text-xs text-gray-500">(Fixed: {formatLPA(job.ctcFixed)} + Variable: {formatLPA(job.ctcVariable)})</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Deadline: {new Date(job.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>{job.vacancies} vacancies</span>
            </div>
          </div>

          <div className="shrink-0">
            {!isApplied ? (
              <Button 
                onClick={onApply} 
                className="bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold px-8 h-12 rounded-lg"
              >
                Apply Now
              </Button>
            ) : (
              <Badge className="bg-green-50 text-green-700 border-green-200 py-2 px-4 text-sm font-bold">Applied</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Content */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-xl border border-muted/20 p-6 md:p-8 shadow-sm space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-[#0f172a]">Job Description</h2>
              <p className="text-[#475569] leading-relaxed">
                {job.description}
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-bold text-[#0f172a]">Requirements</h3>
              <ul className="space-y-3">
                {job.requirements.map((req: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-[#475569]">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 shrink-0"></div>
                    <span className="text-sm">{req}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-bold text-[#0f172a]">Skills Required</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill: string, i: number) => (
                  <span key={i} className="bg-[#f1f5f9] text-gray-700 text-sm font-medium px-4 py-1.5 rounded-lg border border-muted/10">
                    {skill}
                  </span>
                ))}
              </div>
            </section>

            <section className="space-y-5">
              <h3 className="text-lg font-bold text-[#0f172a]">Selection Process</h3>
              <div className="flex flex-wrap items-center gap-3">
                {job.selectionRounds.map((round: string, i: number) => (
                  <React.Fragment key={i}>
                    <div className="bg-[#f1f5f9] text-gray-800 text-sm font-medium px-4 py-2 rounded-lg border border-muted/10">
                      {i + 1}. {round}
                    </div>
                    {i < job.selectionRounds.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-gray-300" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-muted/20 p-6 shadow-sm space-y-6">
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-[#0f172a]">Eligibility</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-sm text-gray-500 font-medium">Eligible Branches</span>
                  <div className="flex flex-wrap gap-2">
                    {job.eligibleBranches.map(branch => (
                      <span key={branch} className="bg-[#f1f5f9] text-gray-700 text-[11px] font-bold px-3 py-1 rounded-full uppercase">
                        {branch}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-gray-500 font-medium">Minimum CGPA</span>
                  <div className="flex items-center gap-2 text-[#0f172a] font-bold text-lg">
                    <GraduationCap className="h-5 w-5 text-gray-400" />
                    <span>{job.minCgpa}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-gray-500 font-medium font-semibold">Posted On</span>
                  <div className="text-[#0f172a] font-bold">
                    {new Date(job.postedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {!isApplied && (
            <Button 
              onClick={onApply} 
              className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold h-12 rounded-lg shadow-sm"
            >
              Apply Now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
