import React, { useState, useMemo } from 'react';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Building2, MapPin, Globe, Phone, Mail, Search, Plus,
  Star, Users, TrendingUp, MoreVertical,
  CheckCircle2, Clock, XCircle, ExternalLink, Pencil, Trash2, Loader2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AddCompanyDialog from '@/components/placement/AddCompanyDialog';
import {
  useCompanies, useDeleteCompany,
} from '@/hooks/usePlacement';
import type { CompanyRecord } from '@/hooks/usePlacement';
import companyService from '@/services/companyService';

// ── Design tokens ────────────────────────────────────────────────────────────
const VIOLET = 'hsl(249, 60%, 69%)';
const TEAL   = 'hsl(165, 64%, 50%)';

// ── Status config ────────────────────────────────────────────────────────────
type CompanyStatus = 'active' | 'inactive' | 'blacklisted';

const statusConfig: Record<CompanyStatus, { label: string; color: string; icon: React.ElementType }> = {
  active:      { label: 'Active',      color: TEAL,              icon: CheckCircle2 },
  inactive:    { label: 'Inactive',    color: 'hsl(220,15%,60%)', icon: Clock },
  blacklisted: { label: 'Blacklisted', color: 'hsl(0,72%,62%)',   icon: XCircle },
};

// ── Type helpers ─────────────────────────────────────────────────────────────
type CompanyType = 'Product' | 'Service' | 'Startup' | 'MNC';
const typeColors: Record<CompanyType, string> = {
  Product: 'hsl(249,60%,85%)', Service: 'hsl(200,70%,85%)',
  Startup: 'hsl(38,100%,85%)',  MNC:    'hsl(142,50%,85%)',
};
const typeTextColors: Record<CompanyType, string> = {
  Product: 'hsl(249,60%,40%)', Service: 'hsl(200,70%,35%)',
  Startup: 'hsl(38,90%,35%)',  MNC:    'hsl(142,50%,30%)',
};

/** Derive company type from domain string for display badge */
function inferType(domain?: string, explicitType?: string): CompanyType {
  if (explicitType) return explicitType as CompanyType;
  if (!domain) return 'Service';
  const d = domain.toLowerCase();
  if (d.includes('product') || d.includes('tech') || d.includes('saas')) return 'Product';
  if (d.includes('startup') || d.includes('commerce') || d.includes('fintech')) return 'Startup';
  if (d.includes('mnc') || d.includes('consulting') || d.includes('it services')) return 'MNC';
  return 'Service';
}

// ── Component ─────────────────────────────────────────────────────────────────
const CompanyPage: React.FC = () => {
  const { data: companies = [], isLoading, isError, error } = useCompanies();
  const deleteCompany = useDeleteCompany();

  const [search, setSearch]               = useState('');
  const [typeFilter, setTypeFilter]       = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selected, setSelected]           = useState<CompanyRecord | null>(null);
  const [showDialog, setShowDialog]       = useState(false);
  const [editRecord, setEditRecord]       = useState<CompanyRecord | undefined>(undefined);
  const [deleteTarget, setDeleteTarget]   = useState<CompanyRecord | null>(null);

  const locations = useMemo(() => [...new Set(companies.map(c => c.location).filter(Boolean))].sort() as string[], [companies]);

  const filter = (list: CompanyRecord[]) =>
    list.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.domain ?? '').toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'all' && inferType(c.domain, c.company_type) !== typeFilter) return false;
      if (locationFilter !== 'all' && c.location !== locationFilter) return false;
      return true;
    });

  const allFiltered       = filter(companies);
  const activeFiltered    = filter(companies.filter(c => (c.status ?? 'active') === 'active'));
  const inactiveFiltered  = filter(companies.filter(c => c.status === 'inactive'));
  const blacklistFiltered = filter(companies.filter(c => c.status === 'blacklisted'));

  // ── KPI stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => companyService.deriveStats(companies), [companies]);

  const openAdd  = () => { setEditRecord(undefined); setShowDialog(true); };
  const openEdit = (c: CompanyRecord) => { setEditRecord(c); setShowDialog(true); };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteCompany.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  // ── Card renderer ────────────────────────────────────────────────────────
  const renderGrid = (list: CompanyRecord[]) => {
    if (!list.length) return (
      <div className="col-span-3 text-center py-16 text-muted-foreground text-sm">No companies found</div>
    );
    return (
      <>
        {list.map(c => {
          const status = (c.status ?? 'active') as CompanyStatus;
          const scfg = statusConfig[status];
          const StatusIcon = scfg.icon;
          const ctype = inferType(c.domain, c.company_type);

          return (
            <Card
              key={c.id}
              className="border-0 shadow-sm rounded-xl hover:shadow-md transition-shadow group relative cursor-pointer"
              onClick={() => setSelected(c)}
            >
              <CardContent className="p-5">
                {/* Kebab menu */}
                <div className="absolute top-3 right-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost"
                        className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setSelected(c); }}>
                        <Building2 className="h-3.5 w-3.5" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); setEditRecord(c); setShowDialog(true); }}>
                        <Pencil className="h-3.5 w-3.5" /> Edit Company
                      </DropdownMenuItem>
                      {c.website && (
                        <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={e => { e.stopPropagation(); window.open(c.website, '_blank'); }}>
                          <ExternalLink className="h-3.5 w-3.5" /> Open Website
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-xs gap-2 cursor-pointer text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(c); }}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Header */}
                <div className="flex items-start gap-3 mb-3 pr-8">
                  <div className="h-11 w-11 rounded-xl bg-[hsl(240,20%,96%)] flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.domain || '—'}</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: typeColors[ctype], color: typeTextColors[ctype] }}>
                    {ctype}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-0.5"
                    style={{ background: `${scfg.color}20`, color: scfg.color }}>
                    <StatusIcon className="h-3 w-3" /> {scfg.label}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                  {c.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</span>}
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{c.rating ?? 4.2}</span>
                </div>

                {/* Stats + Actions */}
                <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-1">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-xs font-bold text-foreground">{c.total_hires ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">Hires</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold" style={{ color: VIOLET }}>
                        ₹{c.avg_ctc ?? 5.0}L
                      </p>
                      <p className="text-[10px] text-muted-foreground">Avg CTC</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button size="icon" variant="ghost"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={e => { e.stopPropagation(); openEdit(c); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(c); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </>
    );
  };

  // ── Loading / Error states ───────────────────────────────────────────────
  const bodyContent = isLoading ? (
    <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading companies…
    </div>
  ) : isError ? (
    <div className="text-center py-16">
      <p className="text-destructive font-medium">Failed to load companies</p>
      <p className="text-sm text-muted-foreground mt-1">{(error as any)?.message || 'Check your connection'}</p>
    </div>
  ) : null;

  return (
    <PlacementLayout title="Companies">

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Companies', value: stats.totalCompanies,   icon: Building2,   color: 'text-foreground'  },
          { label: 'Active Partners', value: stats.activePartners,   icon: CheckCircle2,color: 'text-emerald-600' },
          { label: 'Total Hires',     value: stats.totalHires,       icon: Users,       color: 'text-indigo-600'  },
          { label: 'Avg CTC (LPA)',   value: `₹${stats.avgCTC}L`,   icon: TrendingUp,  color: 'text-amber-600'   },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border/60 shadow-sm rounded-xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold leading-tight ${color}`}>{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters + Add ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search company or domain…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm rounded-xl" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Product">Product</SelectItem>
            <SelectItem value="Service">Service</SelectItem>
            <SelectItem value="Startup">Startup</SelectItem>
            <SelectItem value="MNC">MNC</SelectItem>
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs rounded-xl"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button className="rounded-xl gap-2 text-sm" style={{ background: VIOLET }} onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Company
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      {bodyContent ?? (
        <Tabs defaultValue="all">
          <TabsList className="bg-white border rounded-xl mb-5">
            {[
              { value: 'all',         label: `All (${allFiltered.length})` },
              { value: 'active',      label: `Active (${activeFiltered.length})` },
              { value: 'inactive',    label: `Inactive (${inactiveFiltered.length})` },
              { value: 'blacklisted', label: `Blacklisted (${blacklistFiltered.length})` },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value}
                className="rounded-lg text-sm data-[state=active]:bg-[hsl(249,60%,69%)] data-[state=active]:text-white">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {[
            { value: 'all',         list: allFiltered },
            { value: 'active',      list: activeFiltered },
            { value: 'inactive',    list: inactiveFiltered },
            { value: 'blacklisted', list: blacklistFiltered },
          ].map(({ value, list }) => (
            <TabsContent key={value} value={value}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {renderGrid(list)}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* ── Company Detail Dialog ── */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg rounded-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-[hsl(240,20%,96%)] flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-base">{selected.name}</DialogTitle>
                  <DialogDescription className="text-xs">{selected.domain || '—'} · {selected.location || '—'}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              {/* Status badge */}
              {(() => {
                const st = (selected.status ?? 'active') as CompanyStatus;
                const scfg = statusConfig[st];
                const SI = scfg.icon;
                return (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: `${scfg.color}20`, color: scfg.color }}>
                    <SI className="h-3.5 w-3.5" /> {scfg.label}
                  </span>
                );
              })()}
              {/* Contact */}
              <section>
                <h3 className="font-semibold text-sm mb-2" style={{ color: VIOLET }}>Contact Information</h3>
                <div className="space-y-2 text-sm">
                  {selected.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{selected.email}</p>}
                  {selected.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{selected.phone}</p>}
                  {selected.website && (
                    <a href={selected.website} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 hover:underline" style={{ color: VIOLET }}>
                      <Globe className="h-3.5 w-3.5" />{selected.website} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </section>
              {/* Recruiter */}
              {(selected.recruiter_name || selected.recruiter_email) && (
                <section>
                  <h3 className="font-semibold text-sm mb-2" style={{ color: TEAL }}>Recruiter</h3>
                  <div className="space-y-1 text-sm">
                    {selected.recruiter_name && <p><span className="text-muted-foreground">Name: </span>{selected.recruiter_name}</p>}
                    {selected.recruiter_designation && <p><span className="text-muted-foreground">Designation: </span>{selected.recruiter_designation}</p>}
                    {selected.recruiter_email && <p><span className="text-muted-foreground">Email: </span>{selected.recruiter_email}</p>}
                    {selected.recruiter_phone && <p><span className="text-muted-foreground">Phone: </span>{selected.recruiter_phone}</p>}
                  </div>
                </section>
              )}
              {/* Stats */}
              <section>
                <h3 className="font-semibold text-sm mb-3" style={{ color: VIOLET }}>Placement Statistics</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Rating',     value: selected.rating     != null ? `${selected.rating}/5` : '—' },
                    { label: 'Total Hires',value: selected.total_hires ?? 0 },
                    { label: 'Avg CTC',    value: selected.avg_ctc    != null ? `₹${selected.avg_ctc}L` : '—' },
                  ].map(({ label, value }) => (
                    <Card key={label} className="border-border/60 rounded-xl">
                      <CardContent className="p-3 text-center">
                        <p className="text-base font-bold text-foreground">{value}</p>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Add / Edit Dialog ── */}
      <AddCompanyDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        editRecord={editRecord}
      />

      {/* ── Delete Confirmation ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="rounded-xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?{' '}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-lg" disabled={deleteCompany.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} className="rounded-lg" disabled={deleteCompany.isPending}>
              {deleteCompany.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </PlacementLayout>
  );
};

export default CompanyPage;
