import React, { useState } from 'react';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePlacementJobs, useUpdateJobStatus, useDeleteJob, useCompanies, PlacementJob } from '@/hooks/usePlacement';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Building2, MapPin, Calendar, AlertTriangle, CheckCircle2, XCircle, Pause, ExternalLink, Star, Plus, MoreVertical, Users, Trash2, FileText, Pencil } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import CreateJobDialog from '@/components/placement/CreateJobDialog';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import jobService from '@/services/jobService';

const VIOLET = 'hsl(249, 60%, 69%)';
const TEAL = 'hsl(165, 64%, 50%)';

const riskColors = { low: TEAL, medium: 'hsl(38,100%,56%)', high: 'hsl(0,72%,62%)' };
const statusColors: Record<string, string> = { pending: 'hsl(38,100%,56%)', approved: TEAL, rejected: 'hsl(0,72%,62%)', hold: 'hsl(220,15%,60%)' };

const tabLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Live Jobs',
  rejected: 'Rejected',
  hold: 'Hold',
  all: 'All',
};

const JobApprovals = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('pending');
  const { data: jobs, isLoading, isError, error } = usePlacementJobs(filter);
  const updateStatus = useUpdateJobStatus();
  const deleteJob = useDeleteJob();
  const qc = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<PlacementJob | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'hold' | null>(null);
  const [reason, setReason] = useState('');
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [editTarget, setEditTarget] = useState<PlacementJob | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<PlacementJob | null>(null);
  const { data: companies = [] } = useCompanies();

  /** Find the company linked to a job via company_name on the recruiter */
  const linkedCompany = (job: PlacementJob | null) => {
    if (!job) return undefined;
    const name = (job.recruiter as any)?.company_name;
    return companies.find(c => c.name === name);
  };

  const handleAction = () => {
    if (!selectedJob || !actionType) return;
    if (actionType === 'reject' && !reason.trim()) return;
    updateStatus.mutate(
      { jobId: selectedJob.id, status: actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'hold', reason: reason.trim() || undefined },
      { onSuccess: () => { setSelectedJob(null); setActionType(null); setReason(''); } }
    );
  };

  const openEdit = (job: PlacementJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTarget(job);
    setShowCreateJob(true);
  };

  const openDelete = (job: PlacementJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(job);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteJob.mutate(deleteTarget.id, {
        onSuccess: () => setDeleteTarget(null)
      });
    }
  };

  return (
    <PlacementLayout title="Job Management">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="bg-white border rounded-xl">
            {Object.entries(tabLabels).map(([key, label]) => (
              <TabsTrigger key={key} value={key} className="rounded-lg text-sm data-[state=active]:bg-[hsl(249,60%,69%)] data-[state=active]:text-white">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button 
          className="rounded-xl gap-2 text-sm" 
          style={{ background: VIOLET }} 
          onClick={() => { setEditTarget(undefined); setShowCreateJob(true); }}
        >
          <Plus className="h-4 w-4" /> Create Job
        </Button>
      </div>

      {isError ? (
        <div className="text-center py-12">
          <p className="text-destructive font-medium">Failed to load jobs</p>
          <p className="text-sm text-muted-foreground mt-1">{(error as any)?.message || 'Please check your connection'}</p>
        </div>
      ) : isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !jobs?.length ? (
        <p className="text-muted-foreground text-center py-12">No jobs found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map(job => (
            <Card key={job.id} className="border-0 shadow-sm rounded-xl hover:shadow-md transition-shadow group relative">
              <CardContent className="p-5">
                {/* Actions dropdown */}
                <div className="absolute top-3 right-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={() => setSelectedJob(job)}>
                        <FileText className="h-3.5 w-3.5" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={(e) => openEdit(job, e)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit Job
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2 cursor-pointer text-destructive" onClick={(e) => openDelete(job, e)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="cursor-pointer" onClick={() => setSelectedJob(job)}>
                  <div className="flex items-start justify-between mb-3 pr-8">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-[hsl(240,20%,96%)] flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{(job.recruiter as any)?.company_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{job.role_title}</p>
                      </div>
                    </div>
                    <Badge className="text-[10px] capitalize" style={{ background: (job.status === 'approved' && job.deadline && new Date(job.deadline) < new Date()) ? 'hsl(220,15%,60%)' : statusColors[job.status], color: '#fff' }}>
                      {(job.status === 'approved' && job.deadline && new Date(job.deadline) < new Date()) ? 'Expired' : job.status === 'approved' ? 'Live' : job.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location || 'Remote'}</span>
                    <span>₹{((job.ctc_total || 0) / 100000).toFixed(1)}L</span>
                    {job.deadline && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(job.deadline), 'dd MMM')}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${riskColors[job.ai_risk_level]}20`, color: riskColors[job.ai_risk_level] }}>
                        <AlertTriangle className="h-3 w-3 inline mr-0.5" />{job.ai_risk_level} risk
                      </span>
                      {job.eligible_branches?.slice(0, 2).map(b => <span key={b} className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(240,20%,96%)]">{b}</span>)}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Users className="h-3 w-3" /> {job.total_applications || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Job Detail Modal */}
      <Dialog open={!!selectedJob && !actionType} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" style={{ color: VIOLET }} />
              {selectedJob?.role_title}
            </DialogTitle>
            <DialogDescription>{(selectedJob?.recruiter as any)?.company_name}</DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-5 mt-2">
              <section>
                <h3 className="font-semibold text-sm mb-2" style={{ color: VIOLET }}>Company Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-muted-foreground">Company:</span> {(selectedJob.recruiter as any)?.company_name}</p>
                  <p><span className="text-muted-foreground">Industry:</span> {(selectedJob.recruiter as any)?.company_industry || 'N/A'}</p>
                  <p><span className="text-muted-foreground">Location:</span> {(selectedJob.recruiter as any)?.company_location || 'N/A'}</p>
                  <p><span className="text-muted-foreground">Trust Score:</span> {(selectedJob.recruiter as any)?.trust_score || 0}/100</p>
                  <p className="flex items-center gap-1"><span className="text-muted-foreground">Rating:</span> <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {(selectedJob.recruiter as any)?.rating || 0}</p>
                  {(selectedJob.recruiter as any)?.company_website && (
                    <a href={(selectedJob.recruiter as any).company_website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline" style={{ color: VIOLET }}>
                      <ExternalLink className="h-3 w-3" /> Website
                    </a>
                  )}
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2" style={{ color: VIOLET }}>Recruiter Information</h3>
                {(() => {
                  const company = linkedCompany(selectedJob);
                  const rec = selectedJob.recruiter as any;
                  const name        = company?.recruiter_name        || rec?.name;
                  const designation = company?.recruiter_designation || rec?.designation;
                  const email       = company?.recruiter_email       || rec?.email;
                  const phone       = company?.recruiter_phone       || rec?.phone;
                  const hasAny = name || email || phone;
                  if (!hasAny) return (
                    <p className="text-sm text-muted-foreground italic">No recruiter details available</p>
                  );
                  return (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {name        && <p><span className="text-muted-foreground">Name:</span> {name}</p>}
                      {designation && <p><span className="text-muted-foreground">Designation:</span> {designation}</p>}
                      {email       && <p><span className="text-muted-foreground">Email:</span> {email}</p>}
                      {phone       && <p><span className="text-muted-foreground">Phone:</span> {phone}</p>}
                      {rec?.is_verified && <Badge variant="outline" className="w-fit" style={{ color: TEAL, borderColor: TEAL }}>✓ Verified</Badge>}
                    </div>
                  );
                })()}
              </section>

              <section>
                <h3 className="font-semibold text-sm mb-2" style={{ color: VIOLET }}>Job Details</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-muted-foreground">Description:</span> {selectedJob.role_description || 'No description'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <p><span className="text-muted-foreground">CTC Fixed:</span> ₹{((selectedJob.ctc_fixed || 0) / 100000).toFixed(1)}L</p>
                    <p><span className="text-muted-foreground">CTC Variable:</span> ₹{((selectedJob.ctc_variable || 0) / 100000).toFixed(1)}L</p>
                    <p><span className="text-muted-foreground">Total CTC:</span> ₹{((selectedJob.ctc_total || 0) / 100000).toFixed(1)}L</p>
                    <p><span className="text-muted-foreground">Vacancies:</span> {selectedJob.vacancies}</p>
                    <p><span className="text-muted-foreground">Location:</span> {selectedJob.location || 'N/A'}</p>
                    <p><span className="text-muted-foreground">Min CGPA:</span> {selectedJob.min_cgpa}</p>
                    {selectedJob.deadline && (
                      <p><span className="text-muted-foreground">Deadline:</span> {format(new Date(selectedJob.deadline), 'dd MMM yyyy')}</p>
                    )}
                  </div>
                  {selectedJob.skills_required?.length ? (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedJob.skills_required.map(s => <Badge key={s} variant="secondary" className="text-[10px] rounded-lg">{s}</Badge>)}
                    </div>
                  ) : null}
                  {selectedJob.bond_details && <p><span className="text-muted-foreground">Bond:</span> {selectedJob.bond_details}</p>}
                  {selectedJob.selection_rounds?.length ? <p><span className="text-muted-foreground">Rounds:</span> {selectedJob.selection_rounds.join(' → ')}</p> : null}
                </div>
              </section>

              {/* View Applications Button */}
              <Button variant="outline" className="w-full rounded-xl gap-2" onClick={() => { setSelectedJob(null); navigate(`/placement/job-applications/${selectedJob.id}`); }}>
                <Users className="h-4 w-4" /> View Applications ({selectedJob.total_applications || 0})
              </Button>

              {selectedJob.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1 rounded-xl" style={{ background: TEAL }} onClick={() => setActionType('approve')}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                  </Button>
                  <Button className="flex-1 rounded-xl" variant="destructive" onClick={() => setActionType('reject')}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button className="flex-1 rounded-xl" variant="outline" onClick={() => setActionType('hold')}>
                    <Pause className="h-4 w-4 mr-1" /> Hold
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation */}
      <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setReason(''); }}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="capitalize">{actionType} Job</DialogTitle>
            <DialogDescription>
              {actionType === 'approve' && 'This will publish the job to eligible students.'}
              {actionType === 'reject' && 'Please provide a reason for rejection.'}
              {actionType === 'hold' && 'Add internal remarks (optional).'}
            </DialogDescription>
          </DialogHeader>
          {(actionType === 'reject' || actionType === 'hold') && (
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={actionType === 'reject' ? 'Reason for rejection (required)...' : 'Internal remarks...'} className="rounded-lg" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionType(null); setReason(''); }} className="rounded-lg">Cancel</Button>
            <Button onClick={handleAction} disabled={actionType === 'reject' && !reason.trim()} className="rounded-lg" style={{ background: actionType === 'approve' ? TEAL : actionType === 'reject' ? 'hsl(0,72%,62%)' : VIOLET }}>
              Confirm {actionType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Job Dialog */}
      <CreateJobDialog 
        open={showCreateJob} 
        onOpenChange={(open) => {
          setShowCreateJob(open);
          if (!open) setEditTarget(undefined);
        }} 
        editRecord={editTarget}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="rounded-xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{deleteTarget?.role_title}</span>?{' '}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-lg" disabled={deleteJob.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} className="rounded-lg" disabled={deleteJob.isPending}>
              {deleteJob.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlacementLayout>
  );
};

export default JobApprovals;
