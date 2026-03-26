import React from 'react';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Card, CardContent } from '@/components/ui/card';
import { usePlacementJobs } from '@/hooks/usePlacement';
import { Building2, Users, UserCheck, Clock, CheckCircle2 } from 'lucide-react';

const LiveJobs = () => {
  const { data: jobs, isLoading } = usePlacementJobs('approved');

  return (
    <PlacementLayout title="Live Jobs">
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : !jobs?.length ? (
        <p className="text-muted-foreground text-center py-12">No live jobs currently</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map(job => (
            <Card key={job.id} className="border-0 shadow-sm rounded-xl hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-[hsl(165,64%,94%)] flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-[hsl(165,64%,50%)]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{(job.recruiter as any)?.company_name || 'Company'}</p>
                    <p className="text-xs text-muted-foreground">{job.role_title}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Applications', value: job.total_applications, icon: Users, color: 'hsl(249,60%,69%)' },
                    { label: 'Shortlisted', value: job.shortlisted_count, icon: UserCheck, color: 'hsl(38,100%,56%)' },
                    { label: 'Interview', value: 0, icon: Clock, color: 'hsl(200,70%,55%)' },
                    { label: 'Selected', value: job.selected_count, icon: CheckCircle2, color: 'hsl(165,64%,50%)' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(240,20%,97%)]">
                      <s.icon className="h-4 w-4" style={{ color: s.color }} />
                      <div>
                        <p className="text-lg font-bold leading-none">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PlacementLayout>
  );
};

export default LiveJobs;
