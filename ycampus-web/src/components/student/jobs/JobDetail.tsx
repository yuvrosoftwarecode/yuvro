import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  X, ExternalLink, MapPin, Briefcase, DollarSign,
  HelpCircle, TrendingUp
} from 'lucide-react';
import { Job } from '@/pages/student/Jobs';
import { useState, useEffect } from 'react';
import ApplyModal from './ApplyModal';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface JobDetailProps {
  job: Job;
  onClose: () => void;
  onApply: (jobId: string) => void;
  isApplied: boolean;
  similarJobs: Job[];
  onSelectSimilar: (job: Job) => void;
}

const JobDetail = ({
  job, onClose, onApply, isApplied, similarJobs, onSelectSimilar
}: JobDetailProps) => {

  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    console.log('[JobDetail] Rendering job:', job.title);
    console.log('[JobDetail] job.company_info:', job.company_info);
    console.log('[JobDetail] job.companyInfo:', (job as any).companyInfo);
    console.log('[JobDetail] Full job object:', job);
  }, [job]);

  const handleApply = () => {
    if (!isApplied) setShowApplyModal(true);
  };

  const handleConfirmApply = () => {
    onApply(job.id);
    setShowApplyModal(false);
  };

  const safeArr = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") return val.split(',').map((x) => x.trim());
    return [];
  };

  const safeResponsibilities = safeArr(job.responsibilities);
  const safeRequiredSkills = safeArr(job.required_skills || job.requiredSkills);
  const safePreferredSkills = safeArr(job.preferred_skills || job.preferredSkills);
  const safeBenefits = safeArr(job.benefits);

  const safeSkills =
    Array.isArray(job.skills)
      ? job.skills
      : typeof job.skills === "string"
        ? job.skills.split(',').map(s => s.trim())
        : [];


  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">

        <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold truncate">Job Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          <div className="space-y-4">

            
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center text-3xl">
                {job.logo}
              </div>

              <div className="flex-1">
                <h1 className="text-xl font-bold">{job.title}</h1>
                <p className="text-muted-foreground">{job.company}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {job.location} • {job.work_type || job.workType}
              </div>
              <div className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                {job.experience_level || job.experienceLevel} • {job.job_type || job.jobType}
              </div>
              {job.salaryRange && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  {job.salaryRange}
                </div>
              )}
            </div>

            <Card className="p-4 bg-secondary/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Match Score</p>
                    <p className="text-2xl font-bold text-primary">{job.matchPercentage}%</p>
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">Based on your skills: {safeSkills.slice(0, 3).join(', ')}</p>
                    <p className="text-xs mt-1">Missing: TypeScript, Docker</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </Card>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleApply} disabled={isApplied}>
                  {isApplied ? "Applied" : "Apply Now"}
                </Button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Share</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Share this job</p>
                  </TooltipContent>
                </Tooltip>
              </div>

          </div>

          <Separator />

          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="description" className="flex-1">Description</TabsTrigger>
              <TabsTrigger value="company" className="flex-1">Company</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="space-y-6 mt-4">

              <div>
                <h3 className="font-semibold mb-2">About the Role</h3>
                <p className="text-sm text-muted-foreground">{job.description}</p>
              </div>


              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2">Responsibilities</h3>
                {safeResponsibilities.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{item}</li>
                ))}
              </div>


              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2">Required Skills</h3>
                {safeRequiredSkills.map((skill, i) => (
                  <span key={i} className="px-2 py-1 bg-secondary rounded text-xs mr-2">{skill}</span>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2">Preferred Skills</h3>
                {safePreferredSkills.map((skill, i) => (
                  <span key={i} className="px-2 py-1 bg-secondary rounded text-xs mr-2">{skill}</span>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2">Benefits</h3>
                {safeBenefits.map((b, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{b}</li>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="company" className="space-y-4 mt-4">
              <div>
                <h3 className="font-semibold mb-2">About {job.company}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {job.company_info?.about || "No company information available."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <p><strong>Company Size:</strong> {job.company_info?.size || "N/A"}</p>
                <p><strong>Domain:</strong> {job.company_info?.domain || "N/A"}</p>
                <p>
                  <strong>Website:</strong>{" "}
                  {job.company_info?.website ? (
                    <a
                      href={job.company_info.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      {job.company_info.website}
                    </a>
                  ) : "https://example.com"}
                </p>
              </div>

              <Button variant="outline" className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                Visit Website
              </Button>
            </TabsContent>
          </Tabs>

          {similarJobs.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Similar Jobs</h3>

                <div className="space-y-3">
                  {similarJobs.map((similarJob) => (
                    <Card
                      key={similarJob.id}
                      className="p-3 cursor-pointer hover:border-primary"
                      onClick={() => onSelectSimilar(similarJob)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center text-lg">
                          {similarJob.logo}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate">{similarJob.title}</p>
                          <p className="text-xs text-muted-foreground">{similarJob.company}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {similarJob.matchPercentage}% Match
                            </Badge>
                            <span className="text-xs text-muted-foreground">{similarJob.location}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      <ApplyModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onConfirm={handleConfirmApply}
        job={job}
      />
    </TooltipProvider>
  );
};

export default JobDetail;
