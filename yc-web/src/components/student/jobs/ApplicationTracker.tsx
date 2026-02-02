import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Briefcase, Calendar, ExternalLink } from 'lucide-react';
import StatusBadge from '@/components/common/StatusBadge';

interface ApplicationTrackerProps {
  appliedJobs: any[];
}

type ApplicationStatus = 'Applied' | 'Viewed' | 'Interview' | 'Offer' | 'Rejected';

interface Application {
  id: string;
  title: string;
  company: string;
  location: string;
  logo: string;
  matchPercentage: number;
  appliedDate: string;
  status: string;
}

const ApplicationTracker = ({ appliedJobs }: ApplicationTrackerProps) => {
  // Mock application data with statuses
  const applications: Application[] = appliedJobs.map((job, idx) => ({
    id: job.id || String(idx),
    title: job.title || 'Unknown Position',
    company: typeof job.company === 'string' ? job.company : (job.company?.name || 'Unknown Company'),
    location: (Array.isArray(job.locations) ? job.locations[0] : job.location) || 'Remote',
    logo: job.logo || (typeof job.company !== 'string' ? job.company?.name?.charAt(0) : job.company?.charAt(0)) || '?',
    matchPercentage: job.matchPercentage || 85,
    appliedDate: new Date(Date.now() - idx * 86400000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    status: (['Applied', 'Viewed', 'Interview'] as ApplicationStatus[])[idx % 3] || 'Applied'
  }));

  const activeApplications = applications.filter(app =>
    !['Rejected', 'Offer'].includes(app.status)
  );

  const closedApplications = applications.filter(app =>
    ['Rejected', 'Offer'].includes(app.status)
  );

  const ApplicationCard = ({ application }: { application: Application }) => (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
          {application.logo}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground">{application.title}</h3>
              <p className="text-sm text-muted-foreground">{application.company}</p>
            </div>
            <StatusBadge status={application.status} />
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {application.location}
            </div>
            <div className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {application.matchPercentage}% Match
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Applied on {application.appliedDate}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-3 w-3" />
              View Details
            </Button>
            {application.status === 'Applied' && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                Withdraw
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-6">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex-1">
            Active ({activeApplications.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex-1">
            Closed ({closedApplications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeApplications.length > 0 ? (
            activeApplications.map(app => (
              <ApplicationCard key={app.id} application={app} />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No active applications</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-4 mt-4">
          {closedApplications.length > 0 ? (
            closedApplications.map(app => (
              <ApplicationCard key={app.id} application={app} />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No closed applications</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApplicationTracker;
