import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, IndianRupee, Calendar, Building2, Users, GraduationCap, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import type { StudentJob, StudentJobApplication } from '@/pages/student/Jobs';

interface JobDetailViewProps {
  job: StudentJob;
  isApplied: boolean;
  application?: StudentJobApplication;
  onBack: () => void;
  onApply: () => void;
}

export function JobDetailView({ job, isApplied, application, onBack, onApply }: JobDetailViewProps) {
  const formatCTC = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} LPA`;
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Jobs
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left - Job Details */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{job.role}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium text-foreground/80">{job.companyName}</span>
                    <Badge variant="outline" className="text-[10px]">{job.companyType}</Badge>
                  </div>
                </div>
                {isApplied ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Applied
                  </Badge>
                ) : job.status === 'active' ? (
                  <Button onClick={onApply}>Apply Now</Button>
                ) : (
                  <Badge variant="secondary" className="text-muted-foreground italic">Closed</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {job.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <IndianRupee className="h-4 w-4" /> {formatCTC(job.ctcTotal)}
                  <span className="text-xs">(Fixed: {formatCTC(job.ctcFixed)} + Variable: {formatCTC(job.ctcVariable)})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Deadline: {format(new Date(job.deadline), 'dd MMM yyyy')}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> {job.vacancies} vacancies
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Job Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{job.description}</p>

              <div>
                <h4 className="text-sm font-medium mb-2">Requirements</h4>
                <ul className="space-y-1">
                  {job.requirements.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Skills Required</h4>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills.map(s => (
                    <Badge key={s} variant="secondary" className="text-xs bg-muted/80">{s}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Selection Process</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {job.selectionRounds.map((round, i) => (
                    <React.Fragment key={round}>
                      <span className="text-xs bg-primary/5 text-primary border border-primary/10 px-2.5 py-1 rounded-full font-medium">
                        {i + 1}. {round}
                      </span>
                      {i < job.selectionRounds.length - 1 && (
                        <span className="text-muted-foreground/40">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right - Quick Info */}
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Eligibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Eligible Branches</p>
                <div className="flex flex-wrap gap-1">
                  {job.eligibleBranches.map(b => (
                    <Badge key={b} variant="secondary" className="text-[10px] bg-muted/80">{b}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Minimum CGPA</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" /> {job.minCgpa}
                </p>
              </div>
              {job.bondDetails && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Bond/Contract</p>
                  <p className="text-sm font-medium flex items-start gap-1">
                    <span className="mt-0.5 shrink-0">📜</span> {job.bondDetails}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Posted On</p>
                <p className="text-sm font-medium">{format(new Date(job.postedDate), 'dd MMM yyyy')}</p>
              </div>
            </CardContent>
          </Card>

          {isApplied && application && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-emerald-800">Your Application</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied</span>
                  <span className="font-medium">{format(new Date(application.appliedDate), 'dd MMM yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGPA</span>
                  <span className="font-medium">{application.cgpa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="secondary" className="text-[10px] capitalize">{application.status}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {!isApplied && job.status === 'active' && (
            <Button className="w-full" onClick={onApply}>Apply Now</Button>
          )}
        </div>
      </div>
    </div>
  );
}
